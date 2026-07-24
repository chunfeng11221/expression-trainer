import { useState } from 'react'
import { Check, PlugZap } from 'lucide-react'
import { getServerUrl, setServerUrl, testServerConnection } from '../services/apiBase'

/**
 * 安卓 App 专用:电脑端服务器地址配置 + 连通测试。
 * 浏览器同源部署用不到(设置页只在 isNativeApp() 时渲染本卡片)。
 */
export default function ServerUrlCard() {
  const [url, setUrl] = useState(getServerUrl)
  const [phase, setPhase] = useState<'idle' | 'working'>('idle')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const save = () => {
    setServerUrl(url)
    setUrl(getServerUrl())
    setMessage({ ok: true, text: '已保存。' })
  }

  const test = async () => {
    setPhase('working')
    setMessage(null)
    const result = await testServerConnection(url)
    setPhase('idle')
    if (result.ok) {
      // 测试通过顺手保存,省一步操作
      setServerUrl(url)
      setUrl(getServerUrl())
      setMessage({ ok: true, text: '已连上服务器,转写和 AI 分析都可用。' })
    } else {
      setMessage({
        ok: false,
        text:
          `${result.reason ?? '连不上服务器'}。请按顺序检查:` +
          '1) 电脑上双击了「启动训练器-手机联机.bat」;' +
          '2) 手机和电脑连同一个 Wi-Fi;' +
          '3) 地址与电脑联机窗口里显示的一致(如 http://192.168.1.3:8788);' +
          '4) 电脑防火墙已允许 Python 访问网络。',
      })
    }
  }

  return (
    <div className="ai-form">
      <label className="ai-field">
        <span>服务器地址(电脑联机窗口里显示的那个)</span>
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setMessage(null)
          }}
          placeholder="http://192.168.1.3:8788"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </label>
      {message && <p className={message.ok ? 'ai-message' : 'ai-setup-error'}>{message.text}</p>}
      <div className="ai-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void test()}
          disabled={phase === 'working'}
        >
          <PlugZap size={16} /> {phase === 'working' ? '正在连接……' : '测试连接'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={save}>
          <Check size={16} /> 保存
        </button>
      </div>
      <p className="ai-note">
        录音在手机上完成,转写和 AI 分析在电脑上;连不上服务器时也能练,分析会自动降级为本地规则。
      </p>
    </div>
  )
}
