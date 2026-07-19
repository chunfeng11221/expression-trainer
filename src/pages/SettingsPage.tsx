import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, PlugZap } from 'lucide-react'
import {
  fetchAiConfig,
  saveAiConfig,
  testAiConfig,
  type AiConfigInfo,
} from '../services/aiAnalysisService'
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

type ProviderChoice = 'deepseek' | 'kimi' | 'custom'

const PROVIDER_PRESETS: Record<ProviderChoice, { label: string; baseUrl: string; model: string }> = {
  deepseek: { label: 'DeepSeek(推荐)', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  kimi: { label: 'Kimi(agent-gw)', baseUrl: '', model: '' },
  custom: { label: '自定义 OpenAI 兼容', baseUrl: '', model: '' },
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<TrainingSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  // ── AI 接入 ──
  const [configInfo, setConfigInfo] = useState<AiConfigInfo | null>(null)
  const [provider, setProvider] = useState<ProviderChoice>('deepseek')
  const [baseUrl, setBaseUrl] = useState(PROVIDER_PRESETS.deepseek.baseUrl)
  const [model, setModel] = useState(PROVIDER_PRESETS.deepseek.model)
  const [apiKey, setApiKey] = useState('')
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetchAiConfig().then((info) => {
      if (!info) return
      setConfigInfo(info)
      if (info.provider === 'kimi-agent-gw') setProvider('kimi')
      if (info.base_url) {
        setBaseUrl(info.base_url)
        if (info.base_url.includes('deepseek')) setProvider('deepseek')
        else if (info.provider === 'openai-compatible') setProvider('custom')
      }
      if (info.model) setModel(info.model)
    })
  }, [])

  const save = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => navigate('/'), 500)
  }

  const pickProvider = (choice: ProviderChoice) => {
    setProvider(choice)
    setAiMessage(null)
    const preset = PROVIDER_PRESETS[choice]
    if (choice === 'deepseek') {
      setBaseUrl(preset.baseUrl)
      setModel(preset.model)
    } else if (choice === 'custom' && baseUrl === PROVIDER_PRESETS.deepseek.baseUrl) {
      setBaseUrl('')
      setModel('')
    }
  }

  const saveAi = async () => {
    setBusy(true)
    setAiMessage(null)
    const result = await saveAiConfig(
      provider === 'kimi'
        ? { provider: 'kimi' }
        : { provider: 'openai', base_url: baseUrl, model, api_key: apiKey },
    )
    setBusy(false)
    if (result.ok) {
      setAiMessage('已保存,AI 分析已启用。')
      setApiKey('')
      setConfigInfo(await fetchAiConfig())
    } else {
      setAiMessage(`保存失败:${result.reason ?? '未知错误'}`)
    }
  }

  const testAi = async () => {
    setBusy(true)
    setAiMessage(null)
    const result = await testAiConfig(
      provider === 'kimi' ? {} : { base_url: baseUrl, model, api_key: apiKey || undefined },
    )
    setBusy(false)
    setAiMessage(
      result.ok
        ? `连接成功(模型 ${result.model})`
        : `连接失败:${result.reason ?? '未知错误'}`,
    )
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

  const statusText = (() => {
    if (!configInfo) return '检测中……(后端未启动时显示此状态)'
    if (configInfo.provider === 'openai-compatible') {
      return `已接入 ${configInfo.base_url}(模型 ${configInfo.model}${configInfo.key_tail ? `,key ${configInfo.key_tail}` : ''})`
    }
    if (configInfo.provider === 'kimi-agent-gw') return '已接入 Kimi agent-gw'
    return '未配置,使用本地分析'
  })()

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
        <p className="ai-status">{statusText}</p>

        <div className="settings-options">
          {(Object.keys(PROVIDER_PRESETS) as ProviderChoice[]).map((choice) => (
            <button
              key={choice}
              type="button"
              className={`settings-option ${provider === choice ? 'option-active' : ''}`}
              onClick={() => pickProvider(choice)}
            >
              {PROVIDER_PRESETS[choice].label}
            </button>
          ))}
        </div>

        {provider !== 'kimi' && (
          <div className="ai-form">
          <label className="ai-field">
            <span>Base URL</span>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
            />
          </label>
          <label className="ai-field">
            <span>模型</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
            />
          </label>
          <label className="ai-field">
            <span>API Key{configInfo?.key_tail ? `(已保存 ${configInfo.key_tail},留空不修改)` : ''}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
          </div>
        )}
        {provider === 'kimi' && (
          <p className="ai-note">使用本机 agent-gw 配置(KIMI_API_KEY 或 ~/.kimi/agent-gw.json)。</p>
        )}
        {configInfo?.env_override && (
          <p className="ai-note">检测到环境变量 AI/OPENAI_*,优先级高于此处保存的配置。</p>
        )}

        {aiMessage && <p className="ai-message">{aiMessage}</p>}

        <div className="ai-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void testAi()} disabled={busy}>
            <PlugZap size={16} /> 测试连接
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void saveAi()} disabled={busy}>
            保存 AI 配置
          </button>
        </div>
      </section>
    </div>
  )
}
