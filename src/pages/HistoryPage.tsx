import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitCompareArrows, Home } from 'lucide-react'
import { formatDateTime, loadHistory } from '../utils/storage'

function truncate(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default function HistoryPage() {
  const history = useMemo(() => loadHistory(), [])

  // 同一 sessionId 下凑齐两次回答的,允许从历史直接看对比
  const pairedSessionIds = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const e of history) {
      const set = map.get(e.sessionId) ?? new Set<number>()
      set.add(e.attemptNumber)
      map.set(e.sessionId, set)
    }
    return new Set([...map.entries()].filter(([, s]) => s.has(1) && s.has(2)).map(([id]) => id))
  }, [history])

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="link-back">
          <ArrowLeft size={16} /> 首页
        </Link>
        <h1>训练历史</h1>
      </header>

      {history.length === 0 ? (
        <div className="history-empty">
          <p>还没有训练记录。先说出来,再说清楚。</p>
          <Link to="/" className="btn btn-primary">
            <Home size={16} /> 去练一次
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.id} className="history-row-wrapper">
              <Link to={`/history/${entry.id}`} className="history-row">
                <span className="history-date">{formatDateTime(entry.savedAt)}</span>
                <span className="history-topic" title={entry.topic.title}>
                  {truncate(entry.topic.title)}
                </span>
                <span className="history-attempt">第{entry.attemptNumber}次</span>
                <span className="history-score">{entry.analysis.overallScore}</span>
                <span className="history-fillers">口癖 {entry.analysis.metrics.fillerWordCount}</span>
                <span className="history-source">
                  {entry.analysis.source === 'ai' ? 'AI' : '本地'}
                </span>
              </Link>
              {entry.attemptNumber === 1 && pairedSessionIds.has(entry.sessionId) && (
                <Link to={`/history/compare/${entry.sessionId}`} className="history-compare-link">
                  <GitCompareArrows size={13} /> 查看对比
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
