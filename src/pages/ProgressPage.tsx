import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import type { HistoryEntry } from '../types/training'
import { formatDateTime, loadHistory } from '../utils/storage'

function truncate(text: string, max = 14): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function avg(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length)
}

/** 升降指示;invert=true 表示数值降低为好(口癖、观点出现时间) */
function Delta({ value, prev, invert = false }: { value: number; prev?: number; invert?: boolean }) {
  if (prev === undefined || value === prev) return <span className="delta delta-flat">—</span>
  const up = value > prev
  const better = invert ? !up : up
  return (
    <span className={`delta ${better ? 'delta-better' : 'delta-worse'}`}>{up ? '↑' : '↓'}</span>
  )
}

const SERIES = [
  { key: 'overallScore', label: '综合', color: '#0f766e' },
  { key: 'viewpoint', label: '观点', color: '#5b54a6' },
  { key: 'structure', label: '结构', color: '#b45309' },
  { key: 'content', label: '内容', color: '#3f7a4e' },
  { key: 'fluency', label: '流畅', color: '#8a97a5' },
] as const

type SeriesKey = (typeof SERIES)[number]['key']

function seriesValue(entry: HistoryEntry, key: SeriesKey): number {
  return key === 'overallScore' ? entry.analysis.overallScore : entry.analysis.scores[key]
}

/** 五维度折线图:纯 SVG,图例点击切换显隐,Y 轴 0-100 带刻度 */
function TrendChart({ entries }: { entries: HistoryEntry[] }) {
  const [hidden, setHidden] = useState<ReadonlySet<SeriesKey>>(new Set())
  if (entries.length < 2) {
    return <p className="progress-trend-empty">练满两次后,这里会出现趋势线。</p>
  }
  const width = 640
  const height = 170
  const padL = 32
  const padR = 12
  const padT = 10
  const padB = 20
  const x = (i: number) => padL + (i / (entries.length - 1)) * (width - padL - padR)
  const y = (v: number) => padT + (1 - Math.max(0, Math.min(100, v)) / 100) * (height - padT - padB)

  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div>
      <div className="trend-legend">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`trend-legend-item ${hidden.has(s.key) ? 'legend-off' : ''}`}
            onClick={() => toggle(s.key)}
          >
            <span className="legend-dot" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img" aria-label="五维度分数趋势">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} className="trend-grid" />
            <text x={padL - 6} y={y(v) + 4} className="trend-axis-label" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
          <g key={s.key}>
            <polyline
              points={entries.map((e, i) => `${x(i)},${y(seriesValue(e, s.key))}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={s.key === 'overallScore' ? 2.5 : 1.5}
            />
            {entries.map((e, i) => (
              <circle key={e.id} cx={x(i)} cy={y(seriesValue(e, s.key))} r={s.key === 'overallScore' ? 3.5 : 2.5} fill={s.color}>
                <title>{`${formatDateTime(e.savedAt)} ${s.label}:${seriesValue(e, s.key)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function ProgressPage() {
  const navigate = useNavigate()
  const history = useMemo(() => loadHistory(), [])
  // 时间正序用于趋势与"与上一次相比"
  const asc = useMemo(() => [...history].sort((a, b) => a.savedAt - b.savedAt), [history])

  if (history.length === 0) {
    return (
      <div className="page page-center">
        <p className="empty-notice">还没有训练记录。先说出来,再说清楚。</p>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> 去练一次
        </Link>
      </div>
    )
  }

  const recent5 = asc.slice(-5)
  const prior5 = asc.slice(-10, -5)
  const recentAvg = avg(recent5.map((e) => e.analysis.overallScore))
  const priorAvg = avg(prior5.map((e) => e.analysis.overallScore))
  const recentFillers = avg(recent5.map((e) => e.analysis.metrics.fillerWordCount))
  const priorFillers = avg(prior5.map((e) => e.analysis.metrics.fillerWordCount))
  const best = Math.max(...asc.map((e) => e.analysis.overallScore))

  const trendText = (() => {
    if (recentAvg === null || priorAvg === null) return '数据还少,继续练'
    if (recentAvg > priorAvg) return `上升 +${recentAvg - priorAvg}`
    if (recentAvg < priorAvg) return `回落 ${recentAvg - priorAvg}`
    return '持平'
  })()

  // 每条记录的上一条(时间更早),用于升降指示
  const prevOf = new Map<string, HistoryEntry>()
  asc.forEach((entry, i) => {
    if (i > 0) prevOf.set(entry.id, asc[i - 1])
  })

  return (
    <div className="page page-wide">
      <header className="page-header">
        <Link to="/" className="link-back">
          <ArrowLeft size={16} /> 首页
        </Link>
        <h1>表达力提升表格</h1>
      </header>

      <section className="progress-summary">
        <div className="summary-item">
          <span className="summary-value">{asc.length}</span>
          <span className="summary-label">总练习次数</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">
            {recentAvg ?? '—'}
            <small> / {priorAvg ?? '—'}</small>
          </span>
          <span className="summary-label">近5次 / 前5次均分({trendText})</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{best}</span>
          <span className="summary-label">最佳综合分</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">
            {recentFillers ?? '—'}
            <small> / {priorFillers ?? '—'}</small>
          </span>
          <span className="summary-label">近5次 / 前5次场均口癖</span>
        </div>
        <p className="summary-tagline">不需要完美,只需要再说一次。</p>
      </section>

      <section className="result-section">
        <h2>五维度趋势</h2>
        <TrendChart entries={asc} />
      </section>

      <section className="result-section">
        <h2>逐次记录</h2>
        <div className="progress-table-wrapper">
          <table className="progress-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>题目</th>
                <th>次数</th>
                <th>观点</th>
                <th>结构</th>
                <th>内容</th>
                <th>流畅</th>
                <th>综合</th>
                <th>口癖</th>
                <th>语速</th>
                <th>观点出现</th>
                <th>例子</th>
                <th>结尾</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const a = entry.analysis
                const prev = prevOf.get(entry.id)?.analysis
                const viewpointAt = a.metrics.viewpointFirstAppearedAt
                const prevViewpointAt = prev?.metrics.viewpointFirstAppearedAt
                return (
                  <tr key={entry.id} onClick={() => navigate(`/history/${entry.id}`)}>
                    <td className="cell-date">{formatDateTime(entry.savedAt)}</td>
                    <td className="cell-topic" title={entry.topic.title}>
                      {truncate(entry.topic.title)}
                    </td>
                    <td>{entry.attemptNumber}</td>
                    <td>
                      {a.scores.viewpoint} <Delta value={a.scores.viewpoint} prev={prev?.scores.viewpoint} />
                    </td>
                    <td>
                      {a.scores.structure} <Delta value={a.scores.structure} prev={prev?.scores.structure} />
                    </td>
                    <td>
                      {a.scores.content} <Delta value={a.scores.content} prev={prev?.scores.content} />
                    </td>
                    <td>
                      {a.scores.fluency} <Delta value={a.scores.fluency} prev={prev?.scores.fluency} />
                    </td>
                    <td className="cell-overall">
                      {a.overallScore} <Delta value={a.overallScore} prev={prev?.overallScore} />
                    </td>
                    <td>
                      {a.metrics.fillerWordCount}{' '}
                      <Delta value={a.metrics.fillerWordCount} prev={prev?.metrics.fillerWordCount} invert />
                    </td>
                    <td>{a.metrics.wordsPerMinute}</td>
                    <td>
                      {viewpointAt === null ? '—' : `${Math.round(viewpointAt)}s`}{' '}
                      {viewpointAt !== null && prevViewpointAt != null && (
                        <Delta value={viewpointAt} prev={prevViewpointAt} invert />
                      )}
                    </td>
                    <td>
                      {a.metrics.exampleCount}{' '}
                      <Delta value={a.metrics.exampleCount} prev={prev?.metrics.exampleCount} />
                    </td>
                    <td>{a.metrics.hasConclusion ? '有' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
