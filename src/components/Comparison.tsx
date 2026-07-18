import type { ComparisonResult } from '../types/analysis'

interface ComparisonProps {
  comparison: ComparisonResult
}

/** 前后两次尝试的对比项展示 */
export default function Comparison({ comparison }: ComparisonProps) {
  return (
    <div className="comparison">
      {comparison.items.map((item) => (
        <div key={item.label} className="comparison-row">
          <span className="comparison-label">{item.label}</span>
          <span className="comparison-values">
            <span className="comparison-before">{item.before}</span>
            <span className="comparison-arrow">→</span>
            <span className="comparison-after">{item.after}</span>
          </span>
          {item.detail && (
            <span
              className={`comparison-delta ${
                item.improved === true
                  ? 'delta-better'
                  : item.improved === false
                    ? 'delta-worse'
                    : 'delta-flat'
              }`}
            >
              {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
