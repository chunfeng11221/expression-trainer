import type { AnalysisResult } from '../types/analysis'

interface ScoreCardProps {
  scores: AnalysisResult['scores']
  overallScore: number
}

const DIMENSIONS: Array<{ key: keyof AnalysisResult['scores']; label: string }> = [
  { key: 'viewpoint', label: '观点' },
  { key: 'structure', label: '结构' },
  { key: 'content', label: '内容' },
  { key: 'fluency', label: '流畅度' },
]

/** 四项评分展示(100 分制),综合分弱化显示 */
export default function ScoreCard({ scores, overallScore }: ScoreCardProps) {
  return (
    <div className="score-card">
      <div className="score-rows">
        {DIMENSIONS.map(({ key, label }) => (
          <div key={key} className="score-row">
            <span className="score-label">{label}</span>
            <div className="score-bar-track">
              <div className="score-bar" style={{ width: `${scores[key]}%` }} />
            </div>
            <span className="score-value">{scores[key]}</span>
          </div>
        ))}
      </div>
      <div className="score-overall">
        综合分 <strong>{overallScore}</strong>
      </div>
    </div>
  )
}
