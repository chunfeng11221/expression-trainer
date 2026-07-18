import { Link, useNavigate } from 'react-router-dom'
import { LayoutList, Shuffle } from 'lucide-react'
import { getRandomTopic } from '../data/topics'
import { loadAttempts, loadSession, loadSettings, saveSession } from '../utils/storage'

function formatSeconds(seconds: number): string {
  return seconds >= 60 ? `${seconds / 60}分钟` : `${seconds}秒`
}

export default function HomePage() {
  const navigate = useNavigate()
  const settings = loadSettings()
  const session = loadSession()
  const attempts = loadAttempts()

  const startRandom = () => {
    saveSession({
      topic: getRandomTopic(),
      phase: 'preparing',
      attemptNumber: 1,
      startedAt: Date.now(),
      sessionId: crypto.randomUUID(),
    })
    navigate('/train')
  }

  return (
    <div className="page page-center home">
      <p className="home-brand">表达力训练器</p>
      <h1 className="home-title">先说出来,再说清楚。</h1>
      <p className="home-sub">一分钟口头表达训练:拿到题目,准备 15 秒,说 1 分钟,拿到具体反馈,再说一次。</p>

      <div className="home-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={startRandom}>
          <Shuffle size={18} /> 随机开始
        </button>
        <Link to="/topics" className="btn btn-ghost btn-lg">
          <LayoutList size={18} /> 选择题目
        </Link>
      </div>

      {session && (
        <p className="home-resume">
          你有未完成的训练:「{session.topic.title}」 <Link to="/train">继续</Link>
        </p>
      )}
      {!session && attempts.first && (
        <p className="home-resume">
          <Link to="/result">查看上次的分析结果</Link>
        </p>
      )}

      <p className="home-settings">
        当前默认:{formatSeconds(settings.answerSeconds)}表达 · {formatSeconds(settings.prepareSeconds)}
        准备 · {settings.scene} · {settings.audience} <Link to="/settings">修改</Link>
      </p>

      <p className="home-footer">
        <Link to="/history">训练历史</Link>
        <span className="home-footer-dot">·</span>
        <Link to="/progress">进步表格</Link>
      </p>
    </div>
  )
}
