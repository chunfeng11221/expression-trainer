import type { TranscriptSegment } from '../types/analysis'
import { formatTime } from '../services/transcriptionService'
import FillerWordMark from './FillerWordMark'

const TAG_LABELS: Record<TranscriptSegment['tags'][number], string> = {
  viewpoint: '观点',
  reason: '理由',
  example: '例子',
  filler: '口癖密集',
  conclusion: '总结',
}

interface TranscriptProps {
  segments: TranscriptSegment[]
  /**
   * 有录音可回放时传入:点击某段从该段的 startTime(秒)继续播放。
   * 不传(音频不存在,如刷新后)则段落不显示可点样式。
   */
  onSeek?: (seconds: number) => void
}

/** 文字稿渲染:口癖波浪线 + 段落标签 + 大致时间段;有 onSeek 时段落可点击跳播 */
export default function Transcript({ segments, onSeek }: TranscriptProps) {
  return (
    <div className="transcript">
      {segments.map((seg) => {
        const seekable = onSeek !== undefined
        return (
          <div
            key={seg.id}
            className={`transcript-segment${seekable ? ' transcript-segment-seekable' : ''}`}
            {...(seekable
              ? {
                  role: 'button' as const,
                  tabIndex: 0,
                  title: `点击从 ${formatTime(seg.startTime)} 继续听`,
                  onClick: () => onSeek(seg.startTime),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSeek(seg.startTime)
                    }
                  },
                }
              : {})}
          >
            <div className="transcript-meta">
              <span className="transcript-time">
                {formatTime(seg.startTime)}–{formatTime(seg.endTime)}
              </span>
              {seg.tags.map((tag) => (
                <span key={tag} className={`tag tag-${tag}`}>
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
            <p className="transcript-text">
              <FillerWordMark text={seg.text} />
            </p>
          </div>
        )
      })}
    </div>
  )
}
