import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GitCompareArrows, Home, LayoutList, Mic, RotateCcw } from 'lucide-react'
import ResultSections from '../components/ResultSections'
import { getTopicById } from '../data/topics'
import { loadAttempts, loadAudioBlob, loadSettings, saveSession } from '../utils/storage'

export default function ResultPage() {
  const navigate = useNavigate()
  const stored = loadAttempts()
  const attempt = stored.second ?? stored.first ?? null
  const settings = useMemo(() => loadSettings(), [])

  const blob = attempt ? loadAudioBlob(attempt.attemptNumber) : null
  const audioUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  if (!attempt) {
    return (
      <div className="page page-center">
        <p className="empty-notice">还没有分析结果,先完成一次训练吧。</p>
        <Link to="/" className="btn btn-primary">
          回到首页
        </Link>
      </div>
    )
  }

  const { analysis } = attempt
  const canRetry = attempt.attemptNumber === 1

  const startSecondAttempt = () => {
    const first = loadAttempts().first
    if (!first) return
    const topic = getTopicById(first.topicId) ?? {
      id: first.topicId,
      title: first.topicTitle,
      category: '日常' as const,
      difficulty: '普通' as const,
    }
    saveSession({
      topic,
      phase: 'preparing',
      attemptNumber: 2,
      startedAt: Date.now(),
      // 沿用第一次的 sessionId,历史里两次回答归为一组
      sessionId: first.sessionId ?? crypto.randomUUID(),
    })
    navigate('/train')
  }

  return (
    <div className="page result">
      <header className="page-header">
        <span className="result-attempt-label">
          第 {attempt.attemptNumber} 次回答 · {attempt.topicTitle}
        </span>
        <span className="analysis-source">
          {analysis.source === 'ai' ? 'AI 分析' : '本地分析'}
        </span>
      </header>

      <ResultSections
        analysis={analysis}
        limitSeconds={settings.answerSeconds}
        audioUrl={audioUrl}
        category={attempt.topicCategory ?? getTopicById(attempt.topicId)?.category}
      />

      <footer className="result-actions">
        {canRetry ? (
          <button type="button" className="btn btn-primary btn-xl" onClick={startSecondAttempt}>
            <Mic size={20} /> 根据建议再说一次
          </button>
        ) : (
          <Link to="/compare" className="btn btn-primary btn-xl">
            <GitCompareArrows size={20} /> 查看前后对比
          </Link>
        )}
        <div className="result-actions-secondary">
          <button type="button" className="btn btn-ghost" onClick={startSecondAttempt}>
            <RotateCcw size={16} /> 同题再练一次
          </button>
          <Link to="/topics" className="btn btn-ghost">
            <LayoutList size={16} /> 换个题目
          </Link>
          <Link to="/" className="btn btn-ghost">
            <Home size={16} /> 回到首页
          </Link>
        </div>
      </footer>
    </div>
  )
}
