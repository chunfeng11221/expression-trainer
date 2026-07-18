/**
 * MediaRecorder 封装:开始/停止录音、获取音频 Blob、实时音量电平回调。
 * 音量电平通过 Web Audio AnalyserNode 计算时域振幅均值。
 */

export type LevelCallback = (level: number) => void

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== 'undefined' &&
    'MediaRecorder' in window
  )
}

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private rafId: number | null = null

  /** 申请麦克风并开始录音;权限被拒绝或设备不可用时抛错 */
  async start(onLevel?: LevelCallback): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.chunks = []

    this.mediaRecorder = new MediaRecorder(this.stream)
    this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.audioContext = new AudioContext()
    // 部分浏览器要求用户手势后才能运行 AudioContext,这里主动恢复
    this.audioContext.resume().catch(() => undefined)
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    source.connect(this.analyser)

    const data = new Uint8Array(this.analyser.frequencyBinCount)
    const tick = () => {
      if (!this.analyser) return
      this.analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) sum += Math.abs(data[i] - 128)
      // 归一化到 0-1,50 为经验增益系数
      const level = Math.min(1, (sum / data.length / 128) * 3.2)
      onLevel?.(level)
      this.rafId = requestAnimationFrame(tick)
    }
    tick()

    this.mediaRecorder.start(250)
  }

  /** 停止录音并返回音频 Blob */
  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = this.mediaRecorder
      if (!recorder || recorder.state === 'inactive') {
        const blob = new Blob(this.chunks, { type: recorder?.mimeType || 'audio/webm' })
        this.cleanup()
        resolve(blob)
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' })
        this.cleanup()
        resolve(blob)
      }
      recorder.stop()
    })
  }

  /** 放弃当前录音(重新开始),不返回数据 */
  cancel(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = null
        this.mediaRecorder.stop()
      }
    } catch {
      // ignore
    }
    this.chunks = []
    this.cleanup()
  }

  private cleanup(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.analyser = null
    if (this.audioContext) {
      this.audioContext.close().catch(() => undefined)
      this.audioContext = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    this.mediaRecorder = null
  }
}
