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
}

/** 文字稿渲染:口癖波浪线 + 段落标签 + 大致时间段 */
export default function Transcript({ segments }: TranscriptProps) {
  return (
    <div className="transcript">
      {segments.map((seg) => (
        <div key={seg.id} className="transcript-segment">
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
      ))}
    </div>
  )
}
