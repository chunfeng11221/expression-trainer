import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CATEGORIES, TOPICS } from '../data/topics'
import type { Category, Topic } from '../types/training'
import { saveSession } from '../utils/storage'

const DIFFICULTY_CLASS: Record<Topic['difficulty'], string> = {
  简单: 'difficulty-easy',
  普通: 'difficulty-normal',
  困难: 'difficulty-hard',
}

export default function TopicPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category>('日常')
  const topics = TOPICS.filter((t) => t.category === category)

  const pick = (topic: Topic) => {
    saveSession({
      topic,
      phase: 'preparing',
      attemptNumber: 1,
      startedAt: Date.now(),
      sessionId: crypto.randomUUID(),
    })
    navigate('/train')
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="link-back">
          <ArrowLeft size={16} /> 首页
        </Link>
        <h1>选择题目</h1>
      </header>

      <nav className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`tab ${c === category ? 'tab-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </nav>

      <div className="topic-list">
        {topics.map((topic) => (
          <button key={topic.id} type="button" className="topic-card" onClick={() => pick(topic)}>
            <span className="topic-title">{topic.title}</span>
            <span className="topic-meta">
              <span className="chip">{topic.category}</span>
              {topic.subtype && <span className="chip chip-subtype">{topic.subtype}</span>}
              <span className={`chip ${DIFFICULTY_CLASS[topic.difficulty]}`}>{topic.difficulty}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
