/**
 * API 地址抽象:
 * - 浏览器(同源部署):返回相对路径,/api/* 由当前站点同源托管
 * - Capacitor 安卓 App:页面在内置 WebView 里,API 在电脑上,
 *   从 localStorage 读「服务器地址」(默认占位 http://192.168.1.100:8788),
 *   设置页可修改并测试连通。
 */

const SERVER_URL_KEY = 'expression-trainer:server-url'
export const DEFAULT_SERVER_URL = 'http://192.168.1.100:8788'

interface CapacitorLike {
  isNativePlatform?: () => boolean
}

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: CapacitorLike }).Capacitor
  try {
    return cap?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function getServerUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY)
    if (saved && /^https?:\/\//.test(saved.trim())) return normalizeUrl(saved)
  } catch {
    // localStorage 不可用时用默认占位地址
  }
  return DEFAULT_SERVER_URL
}

export function setServerUrl(url: string): void {
  try {
    localStorage.setItem(SERVER_URL_KEY, normalizeUrl(url))
  } catch {
    // ignore
  }
}

/** 拼 API 地址:浏览器走同源相对路径;App 拼上电脑端服务器地址 */
export function apiUrl(path: string): string {
  if (!isNativeApp()) return path
  return getServerUrl() + path
}

/** 测试某个服务器地址的连通性(调 /api/health),8 秒超时 */
export async function testServerConnection(
  url: string,
): Promise<{ ok: boolean; reason?: string }> {
  const base = normalizeUrl(url)
  if (!/^https?:\/\//.test(base)) {
    return { ok: false, reason: '地址格式不对,应以 http:// 开头,如 http://192.168.1.3:8788' }
  }
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 8000)
    let res: Response
    try {
      res = await fetch(base + '/api/health', { signal: controller.signal })
    } finally {
      window.clearTimeout(timer)
    }
    if (!res.ok) return { ok: false, reason: `服务器返回 HTTP ${res.status}` }
    const data: unknown = await res.json()
    if (typeof data === 'object' && data !== null && (data as { ok?: unknown }).ok === true) {
      return { ok: true }
    }
    return { ok: false, reason: '连上了,但响应不对——确认该端口跑的是表达力训练器' }
  } catch {
    return { ok: false, reason: '连不上服务器' }
  }
}
