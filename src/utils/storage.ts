import type { Attempt, HistoryEntry, TrainingSession, TrainingSettings } from '../types/training'

const KEYS = {
  settings: 'expression-trainer:settings',
  session: 'expression-trainer:session',
  attempts: 'expression-trainer:attempts',
  history: 'expression-trainer:history',
} as const

const HISTORY_LIMIT = 100

export const DEFAULT_SETTINGS: TrainingSettings = {
  answerSeconds: 60,
  prepareSeconds: 15,
  scene: '汇报',
  audience: '普通观众',
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage 不可用(隐私模式等)时静默降级,训练流程不中断
  }
}

export function loadSettings(): TrainingSettings {
  const saved = readJson<Partial<TrainingSettings>>(KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) }
}

export function saveSettings(settings: TrainingSettings): void {
  writeJson(KEYS.settings, settings)
}

export function loadSession(): TrainingSession | null {
  const session = readJson<TrainingSession>(KEYS.session)
  // 数据损坏(合法 JSON 但形状不对)时当作没有 session,避免页面崩溃
  if (
    !session ||
    typeof session !== 'object' ||
    typeof session.topic !== 'object' ||
    session.topic === null ||
    typeof session.topic.title !== 'string'
  ) {
    return null
  }
  return session
}

export function saveSession(session: TrainingSession): void {
  writeJson(KEYS.session, session)
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEYS.session)
  } catch {
    // ignore
  }
}

export interface StoredAttempts {
  first?: Attempt
  second?: Attempt
}

function isValidAttempt(value: unknown): value is Attempt {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Partial<Attempt>
  return (
    typeof a.transcriptText === 'string' &&
    typeof a.analysis === 'object' &&
    a.analysis !== null &&
    typeof a.analysis.overallScore === 'number'
  )
}

export function loadAttempts(): StoredAttempts {
  const raw = readJson<StoredAttempts>(KEYS.attempts)
  if (typeof raw !== 'object' || raw === null) return {}
  return {
    first: isValidAttempt(raw.first) ? raw.first : undefined,
    second: isValidAttempt(raw.second) ? raw.second : undefined,
  }
}

/** 保存一次尝试;保存第一次时会清掉旧的第二次,开启新一轮对比 */
export function saveAttempt(attempt: Attempt): void {
  const stored = loadAttempts()
  if (attempt.attemptNumber === 1) {
    writeJson(KEYS.attempts, { first: attempt })
  } else {
    writeJson(KEYS.attempts, { ...stored, second: attempt })
  }
}

export function clearAttempts(): void {
  try {
    localStorage.removeItem(KEYS.attempts)
  } catch {
    // ignore
  }
}

/* ---------- 训练历史 ---------- */

export function loadHistory(): HistoryEntry[] {
  const list = readJson<HistoryEntry[]>(KEYS.history)
  if (!Array.isArray(list)) return []
  // 过滤损坏条目,避免历史页/表格页渲染崩溃
  return list.filter(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      typeof e.id === 'string' &&
      typeof e.topic?.title === 'string' &&
      typeof e.analysis?.overallScore === 'number',
  )
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  return loadHistory().find((e) => e.id === id) ?? null
}

/** 追加历史条目(同 id 覆盖),按时间倒序保存,上限 100 条;存储满则淘汰最旧再试 */
export function saveHistoryEntry(entry: HistoryEntry): void {
  const list = [entry, ...loadHistory().filter((e) => e.id !== entry.id)]
  while (list.length > HISTORY_LIMIT) list.pop()
  // QuotaExceededError 时持续淘汰最旧,直到能写入为止
  while (list.length > 0) {
    try {
      localStorage.setItem(KEYS.history, JSON.stringify(list))
      return
    } catch {
      list.pop()
    }
  }
  try {
    localStorage.setItem(KEYS.history, '[]')
  } catch {
    // ignore
  }
}

export function deleteHistoryEntry(id: string): void {
  writeJson(
    KEYS.history,
    loadHistory().filter((e) => e.id !== id),
  )
}

/** 时间戳 → "MM-DD HH:mm" */
export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ---- 音频 Blob:内存缓存(当前训练即时回放)+ IndexedDB 持久(历史回放,见 audioStore.ts) ---- */

const audioCache = new Map<number, Blob>()

export function saveAudioBlob(attemptNumber: number, blob: Blob): void {
  audioCache.set(attemptNumber, blob)
}

export function loadAudioBlob(attemptNumber: number): Blob | null {
  return audioCache.get(attemptNumber) ?? null
}
