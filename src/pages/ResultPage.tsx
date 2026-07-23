import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Copy, Download, GitCompareArrows, Home, LayoutList, Mic, RotateCcw } from 'lucide-react'
import ResultSections from '../components/ResultSections'
import { getTopicById, isFreeTopic } from '../data/topics'
import { copyText, downloadTranscriptTxt, plainTranscript } from '../utils/transcriptText'
import { loadAttempts, loadAudioBlob, loadSettings, saveSession } from '../utils/storage'

export default function ResultPage() {
  const navigate = useNavigate()
  const stored = loadAttempts()
  const attempt = stored.second ?? stored.first ?? null
  const settings = useMemo(() => loadSettings(), [])
  const [copied, setCopied] = useState(false)

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
  const isFree = attempt.topicCategory === '随心记' || isFreeTopic({ id: attempt.topicId, category: attempt.topicCategory ?? '日常' })
  const canRetry = attempt.attemptNumber === 1 && !isFree

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

  const copyTranscript = async () => {
    if (await copyText(plainTranscript(analysis))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="page result">
      <header className="page-header">
        <span className="result-attempt-label">
          {isFree ? '随心记' : `第 ${attempt.attemptNumber} 次回答`} · {attempt.topicTitle}
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
        {isFree ? (
          <div className="result-actions-secondary">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => void copyTranscript()}>
              {copied ? (
                <>
                  <Check size={18} /> 已复制
                </>
              ) : (
                <>
                  <Copy size={18} /> 复制文字稿
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => downloadTranscriptTxt(analysis, attempt.createdAt)}
            >
              <Download size={18} /> 下载文字稿
            </button>
            <Link to="/" className="btn btn-ghost btn-lg">
              <Home size={16} /> 回到首页
            </Link>
          </div>
        ) : (
          <>
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
          </>
        )}
      </footer>
    </div>
  )
}
