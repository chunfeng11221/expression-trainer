import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import AiSetupCard from '../components/AiSetupCard'
import type { Audience, Scene, TrainingSettings } from '../types/training'
import { loadSettings, saveSettings } from '../utils/storage'

const ANSWER_OPTIONS = [
  { value: 30, label: '30秒' },
  { value: 60, label: '1分钟' },
  { value: 120, label: '2分钟' },
]
const PREPARE_OPTIONS = [
  { value: 0, label: '0秒' },
  { value: 15, label: '15秒' },
  { value: 30, label: '30秒' },
]
const SCENE_OPTIONS: Scene[] = ['汇报', '即兴', '面试', '申论']
const AUDIENCE_OPTIONS: Audience[] = ['普通观众', '领导', '面试官', '专业人士']

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<TrainingSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  const save = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => navigate('/'), 500)
  }

  const renderGroup = <T extends string | number>(
    label: string,
    options: Array<{ value: T; label: string }>,
    current: T,
    onChange: (value: T) => void,
  ) => (
    <section className="settings-group">
      <h2>{label}</h2>
      <div className="settings-options">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={`settings-option ${current === opt.value ? 'option-active' : ''}`}
            onClick={() => {
              onChange(opt.value)
              setSaved(false)
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="link-back">
          <ArrowLeft size={16} /> 首页
        </Link>
        <h1>训练设置</h1>
      </header>

      {renderGroup(
        '回答时间',
        ANSWER_OPTIONS,
        settings.answerSeconds,
        (v) => setSettings((s) => ({ ...s, answerSeconds: v })),
      )}
      {renderGroup(
        '准备时间',
        PREPARE_OPTIONS,
        settings.prepareSeconds,
        (v) => setSettings((s) => ({ ...s, prepareSeconds: v })),
      )}
      {renderGroup(
        '场景',
        SCENE_OPTIONS.map((s) => ({ value: s as Scene, label: s })),
        settings.scene,
        (v) => setSettings((s) => ({ ...s, scene: v })),
      )}
      {renderGroup(
        '受众',
        AUDIENCE_OPTIONS.map((a) => ({ value: a as Audience, label: a })),
        settings.audience,
        (v) => setSettings((s) => ({ ...s, audience: v })),
      )}

      <button type="button" className="btn btn-primary btn-lg settings-save" onClick={save}>
        {saved ? (
          <>
            <Check size={18} /> 已保存
          </>
        ) : (
          '保存设置'
        )}
      </button>

      <section className="settings-group ai-section">
        <h2>AI 接入</h2>
        <AiSetupCard showStatus />
      </section>
    </div>
  )
}
