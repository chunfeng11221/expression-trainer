import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Comparison from '../components/Comparison'
import { compareAttempts } from '../services/analysisService'
import { loadHistory } from '../utils/storage'

/** 从历史进入的对比视图:渲染同一 sessionId 下的两次回答 */
export default function HistoryComparePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const entries = loadHistory().filter((e) => e.sessionId === sessionId)
  const first = entries.find((e) => e.attemptNumber === 1)
  const second = entries.find((e) => e.attemptNumber === 2)

  if (!first || !second) {
    return (
      <div className="page page-center">
        <p className="empty-notice">这组对比不完整(可能有一次回答已被删除)。</p>
        <Link to="/history" className="btn btn-primary">
          返回历史
        </Link>
      </div>
    )
  }

  const comparison = compareAttempts(first.analysis, second.analysis)

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/history" className="link-back">
          <ArrowLeft size={16} /> 训练历史
        </Link>
        <span className="result-attempt-label">同题重练 · {first.topic.title}</span>
      </header>

      <section className="result-section diagnosis">
        <h2>这一次比上一次</h2>
        <p className="diagnosis-text">{comparison.summary}</p>
      </section>

      <section className="result-section">
        <h2>逐项对比</h2>
        <Comparison comparison={comparison} />
      </section>
    </div>
  )
}
