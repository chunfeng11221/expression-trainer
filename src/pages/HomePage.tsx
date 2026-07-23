import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Feather, LayoutList, Shuffle } from 'lucide-react'
import AiSetupCard from '../components/AiSetupCard'
import { FREE_TOPIC, getRandomTopic } from '../data/topics'
import { fetchHealth } from '../services/aiAnalysisService'
import { loadAttempts, loadHistory, loadSession, loadSettings, saveSession, INTERVIEW_ANSWER_SECONDS, INTERVIEW_PREPARE_SECONDS } from '../utils/storage'
import { computePracticeStats, practiceStatsText } from '../utils/practiceStats'

function formatSeconds(seconds: number): string {
  return seconds >= 60 ? `${seconds / 60}分钟` : `${seconds}秒`
}

export default function HomePage() {
  const navigate = useNavigate()
  const settings = loadSettings()
  const session = loadSession()
  const attempts = loadAttempts()
  const [llmReady, setLlmReady] = useState<boolean | null>(null)

  useEffect(() => {
    void fetchHealth().then((h) => setLlmReady(h ? h.llm : null))
  }, [])

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

  const startFree = () => {
    saveSession({
      topic: FREE_TOPIC,
      phase: 'recording',
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
      <p className="home-today">{practiceStatsText(computePracticeStats(loadHistory().map((e) => e.savedAt)))}</p>

      <div className="home-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={startRandom}>
          <Shuffle size={18} /> 随机开始
        </button>
        <Link to="/topics" className="btn btn-ghost btn-lg">
          <LayoutList size={18} /> 选择题目
        </Link>
      </div>

      <div className="home-free">
        <button type="button" className="btn btn-ghost home-free-btn" onClick={startFree}>
          <Feather size={15} /> 随心记
        </button>
        <p className="home-free-note">想说什么都行,没有题目,不限时间</p>
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

      {llmReady === false && <AiSetupCard onSaved={() => setLlmReady(true)} />}

      <p className="home-settings">
        {settings.timeCustomized ? (
          <>
            当前默认:{formatSeconds(settings.answerSeconds)}表达 · {formatSeconds(settings.prepareSeconds)}
            准备 · {settings.scene} · {settings.audience} <Link to="/settings">修改</Link>
          </>
        ) : (
          <>
            当前默认:公考面试题 {formatSeconds(INTERVIEW_ANSWER_SECONDS)}作答 ·{' '}
            {formatSeconds(INTERVIEW_PREPARE_SECONDS)}思考 · 面试(自动);其他题{' '}
            {formatSeconds(settings.answerSeconds)}表达 · {formatSeconds(settings.prepareSeconds)}准备 ·{' '}
            {settings.scene} · {settings.audience} <Link to="/settings">修改</Link>
          </>
        )}
      </p>

      <p className="home-footer">
        <Link to="/history">训练历史</Link>
        <span className="home-footer-dot">·</span>
        <Link to="/progress">进步表格</Link>
      </p>
    </div>
  )
}
