/**
 * Web Speech API (webkitSpeechRecognition, zh-CN) 封装。
 * 浏览器不支持时 isSpeechRecognitionSupported() 返回 false,
 * 上层应降级到 mockAnalysis 中的模拟文字稿,保证流程完整。
 */

export interface LiveSegment {
  id: string
  text: string
  startTime: number
  endTime: number
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultLike[]
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition as SpeechRecognitionCtor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionCtor | undefined) ??
    null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

export class SpeechTranscriber {
  private recognition: SpeechRecognitionLike | null = null
  private segments: LiveSegment[] = []
  private startedAt = 0
  private lastEnd = 0
  private running = false
  /** 用户主动 stop() 之前,意外 onend(浏览器空闲断流等)时自动重启识别 */
  private wantRunning = false

  /**
   * 开始实时转写。返回是否成功启动。
   * onUpdate 回调收到目前已确定的片段列表和临时(interim)文字。
   * 时间戳为估算值:以 start() 调用时刻为 0 点。
   */
  start(onUpdate: (segments: LiveSegment[], interim: string) => void): boolean {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return false

    this.recognition = new Ctor()
    this.recognition.lang = 'zh-CN'
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.segments = []
    this.lastEnd = 0
    this.startedAt = performance.now()

    this.recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (!text) continue
        if (result.isFinal) {
          const now = (performance.now() - this.startedAt) / 1000
          this.segments.push({
            id: `seg-${this.segments.length + 1}`,
            text,
            startTime: this.lastEnd,
            endTime: now,
          })
          this.lastEnd = now
        } else {
          interim += text
        }
      }
      onUpdate([...this.segments], interim)
    }
    this.recognition.onerror = () => {
      // 不中断:no-speech 等错误后浏览器会触发 onend,由那里负责重启
    }
    this.recognition.onend = () => {
      if (this.wantRunning) {
        try {
          this.recognition?.start()
          return
        } catch {
          // 重启失败则停止
        }
      }
      this.running = false
    }

    try {
      this.recognition.start()
      this.running = true
      this.wantRunning = true
      return true
    } catch {
      return false
    }
  }

  stop(): LiveSegment[] {
    this.wantRunning = false
    if (this.recognition && this.running) {
      try {
        this.recognition.stop()
      } catch {
        // ignore
      }
    }
    this.running = false
    return this.segments
  }

  getText(): string {
    return this.segments.map((s) => s.text).join('')
  }
}

/** 秒 → "mm:ss" */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const rest = s % 60
  return `${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/* ---------- 服务端 Whisper 转写(faster-whisper,词级时间戳) ---------- */

export interface WhisperSegment {
  start: number
  end: number
  text: string
}

export interface WhisperWord {
  w: string
  start: number
  end: number
}

export interface WhisperResult {
  segments: WhisperSegment[]
  words: WhisperWord[]
}

/** 查询后端 ASR 是否就绪;任何异常都返回 false(调用方静默降级) */
export async function checkAsrReady(): Promise<boolean> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return false
    const data: unknown = await res.json()
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as { asr?: unknown }).asr === 'ready'
    )
  } catch {
    return false
  }
}

/**
 * 把录音 Blob 上传到后端做 faster-whisper 转写。
 * 失败(超时、ok:false、结构不合法)返回 null,由调用方回退 Web Speech / mock。
 */
export async function transcribeAudio(
  blob: Blob,
  timeoutMs = 170_000,
): Promise<WhisperResult | null> {
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob,
        signal: controller.signal,
      })
    } finally {
      window.clearTimeout(timer)
    }
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isWhisperResponse(data)) return null
    return { segments: data.segments, words: data.words }
  } catch {
    return null
  }
}

function isWhisperResponse(
  data: unknown,
): data is { ok: true; segments: WhisperSegment[]; words: WhisperWord[] } {
  if (typeof data !== 'object' || data === null) return false
  const d = data as { ok?: unknown; segments?: unknown; words?: unknown }
  if (d.ok !== true || !Array.isArray(d.segments) || d.segments.length === 0) return false
  const first = d.segments[0] as Record<string, unknown>
  return (
    typeof first === 'object' &&
    first !== null &&
    typeof first.text === 'string' &&
    typeof first.start === 'number'
  )
}
