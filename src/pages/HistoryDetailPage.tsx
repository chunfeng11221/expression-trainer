import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import ResultSections from '../components/ResultSections'
import { deleteAudio, getAudio } from '../utils/audioStore'
import type { HistoryEntry } from '../types/training'
import { deleteHistoryEntry, formatDateTime, getHistoryEntry } from '../utils/storage'

export default function HistoryDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<HistoryEntry | null>(() =>
    attemptId ? getHistoryEntry(attemptId) : null,
  )
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // 录音从 IndexedDB 取;没有(旧数据/隐私模式)就不显示播放器
  useEffect(() => {
    if (!attemptId) return
    let revoked: string | null = null
    let cancelled = false
    void getAudio(attemptId).then((blob) => {
      if (cancelled || !blob) return
      revoked = URL.createObjectURL(blob)
      setAudioUrl(revoked)
    })
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [attemptId])

  if (!entry) {
    return (
      <div className="page page-center">
        <p className="empty-notice">这条训练记录不存在或已被删除。</p>
        <Link to="/history" className="btn btn-primary">
          返回历史
        </Link>
      </div>
    )
  }

  const remove = () => {
    if (!window.confirm('删除这条训练记录?录音和分析会一起删除,不可恢复。')) return
    deleteHistoryEntry(entry.id)
    void deleteAudio(entry.id)
    navigate('/history', { replace: true })
    setEntry(null)
  }

  return (
    <div className="page">
      <header className="page-header history-detail-header">
        <div>
          <Link to="/history" className="link-back">
            <ArrowLeft size={16} /> 训练历史
          </Link>
          <span className="result-attempt-label">
            {formatDateTime(entry.savedAt)} · 第 {entry.attemptNumber} 次回答 · {entry.topic.title}
          </span>
        </div>
        <span className="history-detail-actions">
          <span className="analysis-source">
            {entry.analysis.source === 'ai' ? 'AI 分析' : '本地分析'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
            <Trash2 size={14} /> 删除
          </button>
        </span>
      </header>

      <ResultSections
        analysis={entry.analysis}
        limitSeconds={entry.settings.answerSeconds}
        audioUrl={audioUrl}
        category={entry.topic.category}
      />
    </div>
  )
}
