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
  return readJson<TrainingSession>(KEYS.session)
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

export function loadAttempts(): StoredAttempts {
  return readJson<StoredAttempts>(KEYS.attempts) ?? {}
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

/** 覆盖更新已存在的 attempt 且保留另一次(用于 AI 分析结果回填) */
export function updateAttempt(attempt: Attempt): void {
  const stored = loadAttempts()
  writeJson(KEYS.attempts, {
    ...stored,
    [attempt.attemptNumber === 1 ? 'first' : 'second']: attempt,
  })
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
  return Array.isArray(list) ? list : []
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
