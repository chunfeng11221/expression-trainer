import { useEffect, useState } from 'react'
import { Check, PlugZap } from 'lucide-react'
import {
  fetchAiConfig,
  saveAiConfig,
  testAiConfig,
  type AiConfigInfo,
} from '../services/aiAnalysisService'

type Preset = 'deepseek' | 'moonshot' | 'kimi' | 'custom'

const PRESETS: Array<{
  key: Preset
  label: string
  tag?: string
  baseUrl: string
  model: string
}> = [
  { key: 'deepseek', label: 'DeepSeek', tag: '推荐', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { key: 'moonshot', label: 'Moonshot', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
  { key: 'kimi', label: 'Kimi(agent-gw)', baseUrl: '', model: '' },
  { key: 'custom', label: '自定义', baseUrl: '', model: '' },
]

/** 把后端报错翻译成小白能懂的话 */
function translateError(reason: string): string {
  if (/401|Unauthorized|Incorrect API key|invalid.?api.?key|Authentication/i.test(reason)) {
    return 'Key 不正确。请检查是否复制完整(以 sk- 开头,前后没有空格)。'
  }
  if (/402|Insufficient|余额|balance|欠费/i.test(reason)) {
    return '账户余额不足。去对应平台充几块钱,就能用很久。'
  }
  if (/429|rate.?limit/i.test(reason)) {
    return '请求太频繁了,稍等几秒再试。'
  }
  if (/404|Not Found|does not exist|no such model/i.test(reason)) {
    return '服务地址或模型名不对。换个预设,或检查自定义填写的两项。'
  }
  if (/timeout|timed out|ECONNREFUSED|URLError|10061|10060|NetworkError|Failed to fetch|无法连接/i.test(reason)) {
    return '连不上服务器。检查网络(或代理)后再试一次。'
  }
  return reason.length > 80 ? `${reason.slice(0, 80)}……` : reason
}

interface AiSetupCardProps {
  /** 保存成功后回调(例如让首页刷新 AI 状态) */
  onSaved?: () => void
  /** 是否显示"当前接入状态"行(设置页用) */
  showStatus?: boolean
}

/**
 * AI 接入卡片:预设服务商 + 一个 key 输入框 + 「保存并测试」。
 * 首页(未接入时)与设置页共用。自定义预设才展开地址/模型输入框。
 */
export default function AiSetupCard({ onSaved, showStatus = false }: AiSetupCardProps) {
  const [configInfo, setConfigInfo] = useState<AiConfigInfo | null>(null)
  const [preset, setPreset] = useState<Preset>('deepseek')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void fetchAiConfig().then((info) => {
      if (!info) return
      setConfigInfo(info)
      if (info.provider === 'kimi-agent-gw') setPreset('kimi')
      else if (info.base_url?.includes('deepseek')) setPreset('deepseek')
      else if (info.base_url?.includes('moonshot')) setPreset('moonshot')
      else if (info.provider === 'openai-compatible') setPreset('custom')
      if (info.base_url && !info.base_url.includes('deepseek') && !info.base_url.includes('moonshot')) {
        setBaseUrl(info.base_url)
        if (info.model) setModel(info.model)
      }
    })
  }, [])

  const current = PRESETS.find((p) => p.key === preset) ?? PRESETS[0]
  const effectiveBaseUrl = preset === 'custom' ? baseUrl.trim() : current.baseUrl
  const effectiveModel = preset === 'custom' ? model.trim() : current.model

  const submit = async () => {
    setPhase('working')
    setMessage(null)

    if (preset === 'kimi') {
      // agent-gw 用本机配置,无需 key,直接保存(保存时会做构造探测)
      const result = await saveAiConfig({ provider: 'kimi' })
      if (result.ok) {
        setPhase('done')
        setConfigInfo(await fetchAiConfig())
        onSaved?.()
      } else {
        setPhase('idle')
        setMessage(translateError(result.reason ?? 'agent-gw 不可用'))
      }
      return
    }

    // 先测试,通过才保存
    const test = await testAiConfig({
      base_url: effectiveBaseUrl,
      model: effectiveModel,
      api_key: apiKey || undefined,
    })
    if (!test.ok) {
      setPhase('idle')
      setMessage(translateError(test.reason ?? '连接失败'))
      return
    }
    const saved = await saveAiConfig({
      provider: 'openai',
      base_url: effectiveBaseUrl,
      model: effectiveModel,
      api_key: apiKey,
    })
    if (saved.ok) {
      setPhase('done')
      setApiKey('')
      setConfigInfo(await fetchAiConfig())
      onSaved?.()
    } else {
      setPhase('idle')
      setMessage(translateError(saved.reason ?? '保存失败'))
    }
  }

  if (phase === 'done') {
    return (
      <p className="ai-setup-done">
        <Check size={15} /> AI 已接入,去练一次试试完整的反馈吧。
      </p>
    )
  }

  const canSubmit =
    phase !== 'working' &&
    (preset === 'kimi' ||
      (effectiveBaseUrl !== '' && effectiveModel !== '' && (apiKey !== '' || !!configInfo?.key_tail)))

  return (
    <div className="ai-setup-card">
      <p className="ai-setup-title">接入 AI,获得完整反馈</p>

      {showStatus && (
        <p className="ai-status">
          {configInfo
            ? configInfo.provider
              ? `当前:${configInfo.base_url ?? 'Kimi agent-gw'}${configInfo.key_tail ? `(key ${configInfo.key_tail})` : ''}`
              : '当前:未配置,使用本地分析'
            : '当前:检测中……'}
        </p>
      )}

      <div className="ai-setup-presets">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`settings-option ${preset === p.key ? 'option-active' : ''}`}
            onClick={() => {
              setPreset(p.key)
              setMessage(null)
            }}
          >
            {p.label}
            {p.tag && <span className="preset-tag">{p.tag}</span>}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="ai-form">
          <label className="ai-field">
            <span>服务地址(Base URL)</span>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com 或 http://localhost:11434/v1"
            />
          </label>
          <label className="ai-field">
            <span>模型名</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如 gpt-4o-mini、qwen2.5:7b"
            />
          </label>
        </div>
      )}

      {preset !== 'kimi' && (
        <label className="ai-field ai-setup-key">
          <span>
            API Key
            {configInfo?.key_tail ? `(已保存 ${configInfo.key_tail},换个 key 直接粘贴覆盖)` : '(去服务商平台复制,以 sk- 开头)'}
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </label>
      )}
      {preset === 'kimi' && (
        <p className="ai-note">使用本机 agent-gw 配置(KIMI_API_KEY 或 ~/.kimi/agent-gw.json),不需要填 key。</p>
      )}

      {message && <p className="ai-setup-error">{message}</p>}

      <button
        type="button"
        className="btn btn-primary btn-lg ai-setup-submit"
        onClick={() => void submit()}
        disabled={!canSubmit}
      >
        <PlugZap size={17} /> {phase === 'working' ? '正在测试并保存……' : '保存并测试'}
      </button>
    </div>
  )
}
