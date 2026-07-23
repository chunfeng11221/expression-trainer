/**
 * 首页「今天已练 N 次 · 连续 M 天」的纯计算逻辑。
 * 只依赖时间戳数组,与 localStorage 解耦,方便 node 脚本直接测边界。
 */

export interface PracticeStats {
  /** 今天(本地时区)的练习次数 */
  todayCount: number
  /**
   * 连续练习天数:今天练过 → 从今天往前数;今天还没练 → 从昨天往前数
   * (避免"昨天练了、今天刚打开就显示连续 0 天"的挫败感)。
   */
  streakDays: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 本地时区的当日 0 点时间戳 */
function dayStart(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function computePracticeStats(timestamps: number[], now: number = Date.now()): PracticeStats {
  const days = new Set<number>()
  for (const ts of timestamps) {
    if (typeof ts === 'number' && Number.isFinite(ts)) days.add(dayStart(ts))
  }
  const today = dayStart(now)
  const todayCount = timestamps.filter((ts) => dayStart(ts) === today).length

  let streakDays = 0
  let cursor = days.has(today) ? today : today - DAY_MS
  while (days.has(cursor)) {
    streakDays += 1
    cursor -= DAY_MS
  }
  return { todayCount, streakDays }
}

/** 首页副标题下那行小字;返回 null 表示没有任何记录时不显示 */
export function practiceStatsText(stats: PracticeStats): string {
  const { todayCount, streakDays } = stats
  if (todayCount > 0) {
    return streakDays > 1 ? `今天已练 ${todayCount} 次 · 连续 ${streakDays} 天` : `今天已练 ${todayCount} 次`
  }
  if (streakDays > 1) return `今天还没开口,已连续 ${streakDays} 天,来一题?`
  return '今天还没开口,来一题?'
}
