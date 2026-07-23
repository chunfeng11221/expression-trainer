import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitCompareArrows, Home } from 'lucide-react'
import type { Category, HistoryEntry } from '../types/training'
import { normalizeCategory } from '../types/training'
import { formatDateTime, loadHistory } from '../utils/storage'

function truncate(text: string, max = 16): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** 同一次训练的两次 attempt 归为一组,组内按第 1→2 次排序,组间按最新时间倒序 */
function groupBySession(history: HistoryEntry[]): HistoryEntry[][] {
  const map = new Map<string, HistoryEntry[]>()
  for (const e of history) {
    const arr = map.get(e.sessionId) ?? []
    arr.push(e)
    map.set(e.sessionId, arr)
  }
  return [...map.values()]
    .map((arr) => arr.sort((a, b) => a.attemptNumber - b.attemptNumber))
    .sort(
      (g1, g2) =>
        Math.max(...g2.map((e) => e.savedAt)) - Math.max(...g1.map((e) => e.savedAt)),
    )
}

function ScoreDelta({ before, after }: { before: number; after: number }) {
  if (after === before) return null
  const better = after > before
  return (
    <span className={`delta ${better ? 'delta-better' : 'delta-worse'}`}>
      {better ? '↑' : '↓'}
      {Math.abs(after - before)}
    </span>
  )
}

export default function HistoryPage() {
  const history = useMemo(() => loadHistory(), [])
  const [filter, setFilter] = useState<Category | '全部'>('全部')

  // 只展示历史里真实出现过的分类;旧数据「申论」按「公考面试」归并
  const presentCategories = useMemo(() => {
    const ORDER: Category[] = ['公考面试', '日常', '观点', '工作', '解释', '随心记']
    const seen = new Set<Category>()
    for (const e of history) {
      const c = normalizeCategory(e.topic?.category)
      if (c) seen.add(c)
    }
    return ORDER.filter((c) => seen.has(c))
  }, [history])

  const filtered =
    filter === '全部'
      ? history
      : history.filter((e) => normalizeCategory(e.topic?.category) === filter)
  const groups = useMemo(() => groupBySession(filtered), [filtered])

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
        <>
          {presentCategories.length > 1 && (
            <div className="tabs history-filter">
              {(['全部', ...presentCategories] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tab ${filter === c ? 'tab-active' : ''}`}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="history-list">
          {groups.map((group) => {
            const latest = group[group.length - 1]
            return (
              <div key={group[0].sessionId} className="history-row-wrapper">
                <div className="history-row history-group">
                  <span className="history-date">{formatDateTime(latest.savedAt)}</span>
                  <span className="history-topic" title={latest.topic.title}>
                    {truncate(latest.topic.title)}
                  </span>
                  <span className="history-attempts">
                    {group.map((entry, i) => (
                      <Link key={entry.id} to={`/history/${entry.id}`} className="history-attempt-chip">
                        {entry.topic.category === '随心记' ? (
                          <span className="free-chip">随心记</span>
                        ) : (
                          <>第{entry.attemptNumber}次</>
                        )}{' '}
                        <strong>{entry.analysis.overallScore}</strong>
                        {i > 0 && (
                          <ScoreDelta
                            before={group[i - 1].analysis.overallScore}
                            after={entry.analysis.overallScore}
                          />
                        )}
                      </Link>
                    ))}
                  </span>
                  <span className="history-fillers">
                    口癖 {latest.analysis.metrics.fillerWordCount}
                  </span>
                  <span className="history-source">
                    {latest.analysis.source === 'ai' ? 'AI' : '本地'}
                  </span>
                </div>
                {group.length === 2 && (
                  <Link to={`/history/compare/${group[0].sessionId}`} className="history-compare-link">
                    <GitCompareArrows size={13} /> 查看对比
                  </Link>
                )}
              </div>
            )
          })}
          </div>
        </>
      )}
    </div>
  )
}
