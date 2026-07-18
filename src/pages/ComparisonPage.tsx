import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Home, LayoutList } from 'lucide-react'
import Comparison from '../components/Comparison'
import { compareAttempts } from '../services/analysisService'
import { loadAttempts, loadAudioBlob } from '../utils/storage'

function useAudioUrl(attemptNumber: number): string | null {
  const blob = loadAudioBlob(attemptNumber)
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

export default function ComparisonPage() {
  const { first, second } = loadAttempts()
  const firstAudio = useAudioUrl(1)
  const secondAudio = useAudioUrl(2)

  if (!first || !second) {
    return (
      <div className="page page-center">
        <p className="empty-notice">完成两次同题回答后,这里会显示前后对比。</p>
        <Link to="/" className="btn btn-primary">
          回到首页
        </Link>
      </div>
    )
  }

  const comparison = compareAttempts(first.analysis, second.analysis)

  return (
    <div className="page">
      <header className="page-header">
        <span className="result-attempt-label">同题重练 · {first.topicTitle}</span>
      </header>

      <section className="result-section diagnosis">
        <h2>这一次比上一次</h2>
        <p className="diagnosis-text">{comparison.summary}</p>
      </section>

      {(firstAudio || secondAudio) && (
        <section className="result-section compare-audios">
          {firstAudio && (
            <div>
              <p className="compare-audio-label">第一次</p>
              <audio controls src={firstAudio} className="audio-player" />
            </div>
          )}
          {secondAudio && (
            <div>
              <p className="compare-audio-label">第二次</p>
              <audio controls src={secondAudio} className="audio-player" />
            </div>
          )}
        </section>
      )}

      <section className="result-section">
        <h2>逐项对比</h2>
        <Comparison comparison={comparison} />
      </section>

      <footer className="result-actions">
        <div className="result-actions-secondary">
          <Link to="/topics" className="btn btn-ghost">
            <LayoutList size={16} /> 换个题目再练
          </Link>
          <Link to="/" className="btn btn-ghost">
            <Home size={16} /> 回到首页
          </Link>
        </div>
      </footer>
    </div>
  )
}
