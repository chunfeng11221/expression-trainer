import { useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Square } from 'lucide-react'
import { isRecordingSupported, RecordingService } from '../services/recordingService'
import { formatTime } from '../services/transcriptionService'
import FillerWordMark from './FillerWordMark'

interface AudioRecorderProps {
  topicTitle: string
  limitSeconds: number
  /** 实时转写文字(确定部分 + 临时部分) */
  liveText: string
  /** 实时口癖统计,页面角落轻量展示 */
  fillerCounts: Array<{ word: string; count: number }>
  /** 随心记模式:正计时、无倒计时、无自动停止 */
  freeMode?: boolean
  /** 倒计时区域的时间含义标注,如面试模式的「作答时间」 */
  timeLabel?: string
  onFinish: (blob: Blob | null, durationSeconds: number) => void
  /** 点击「重新开始」:父组件负责重置转写并以 key 重挂载本组件 */
  onRestart: () => void
}

/** 录音 + 音量条 + 计时,封装 MediaRecorder */
export default function AudioRecorder({
  topicTitle,
  limitSeconds,
  liveText,
  fillerCounts,
  freeMode = false,
  timeLabel,
  onFinish,
  onRestart,
}: AudioRecorderProps) {
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const serviceRef = useRef<RecordingService | null>(null)
  const finishingRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (!isRecordingSupported()) {
      setError('当前浏览器不支持录音,请使用最新版 Chrome 或 Edge。')
      return
    }
    const service = new RecordingService()
    serviceRef.current = service
    const startedAt = Date.now()
    service.start(setLevel).catch(() => {
      setError(
        '麦克风被拦住了。点一下浏览器地址栏左侧的小锁(或设置)图标,把"麦克风"改成"允许",然后点下面的重试。',
      )
    })
    const timer = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000)
    }, 200)
    return () => {
      clearInterval(timer)
      service.cancel()
      serviceRef.current = null
    }
  }, [])

  const finish = async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    const service = serviceRef.current
    const duration = freeMode ? elapsed : Math.min(elapsed, limitSeconds)
    if (!service) {
      onFinishRef.current(null, duration)
      return
    }
    const blob = await service.stop()
    onFinishRef.current(blob.size > 0 ? blob : null, duration)
  }

  useEffect(() => {
    if (!freeMode && elapsed >= limitSeconds) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, limitSeconds, freeMode])

  const retry = () => {
    setError(null)
    const service = new RecordingService()
    serviceRef.current = service
    service.start(setLevel).catch(() => {
      setError('还是连不上麦克风。请确认电脑插着麦克风、没被其他软件(如会议软件)独占,然后在浏览器设置里允许本站点使用麦克风。')
    })
  }

  if (error) {
    return (
      <div className="recorder recorder-error">
        <p className="recorder-error-text">{error}</p>
        <button type="button" className="btn btn-primary" onClick={retry}>
          <RotateCcw size={16} /> 重试
        </button>
      </div>
    )
  }
  const remaining = Math.max(0, limitSeconds - elapsed)

  return (
    <div className="recorder">
      <p className="recorder-topic">{topicTitle}</p>

      <div className="recorder-time">
        <span className="recorder-elapsed">{formatTime(elapsed)}</span>
        {!freeMode && (
          <span className="recorder-remaining">
            {timeLabel ? `${timeLabel} · ` : ''}剩余 {formatTime(remaining)}
          </span>
        )}
        {freeMode && <span className="recorder-remaining">不限时,说完点结束</span>}
      </div>

      <div className="volume-track" aria-label="音量">
        <div className="volume-bar" style={{ width: `${Math.round(level * 100)}%` }} />
      </div>

      {liveText ? (
        <div className="live-transcript">
          <FillerWordMark text={liveText} />
        </div>
      ) : (
        <p className="live-hint">
          <Mic size={14} /> 正在录音,自然地说就好。停顿不是错误。
        </p>
      )}

      {fillerCounts.length > 0 && (
        <div className="filler-corner">
          {fillerCounts.slice(0, 3).map((f) => (
            <span key={f.word} className="filler-chip">
              {f.word} × {f.count}
            </span>
          ))}
        </div>
      )}

      <div className="recorder-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => void finish()}>
          <Square size={16} /> 结束录音
        </button>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>
          <RotateCcw size={16} /> 重新开始
        </button>
      </div>
    </div>
  )
}
