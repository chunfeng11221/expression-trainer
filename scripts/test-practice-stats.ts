/**
 * 首页「今天已练 N 次 · 连续 M 天」计算的边界测试(node 直接跑,无需浏览器):
 *   node scripts/test-practice-stats.ts
 * 覆盖:空历史、只有今天、连续多天、今天 0 次但昨天有、断档、跨天边界(00:01 / 23:59)。
 */
import assert from 'node:assert'
import { computePracticeStats, practiceStatsText } from '../src/utils/practiceStats.ts'

// 固定"现在":2026-07-23 15:00(本地时区),所有用例相对它构造
const NOW = new Date(2026, 6, 23, 15, 0, 0).getTime()

/** n 天前的某个时刻(0 = 今天) */
function at(daysAgo: number, h: number, m: number): number {
  return new Date(2026, 6, 23 - daysAgo, h, m, 0).getTime()
}

let passed = 0
function check(name: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(actual, expected, `${name}: 期望 ${JSON.stringify(expected)},实际 ${JSON.stringify(actual)}`)
  passed += 1
  console.log(`ok - ${name}`)
}

// 1. 空历史:0 次 0 天,文案是"来一题"
{
  const s = computePracticeStats([], NOW)
  check('空历史 todayCount/streak', [s.todayCount, s.streakDays], [0, 0])
  check('空历史文案', practiceStatsText(s), '今天还没开口,来一题?')
}

// 2. 只有今天 2 次:连续 1 天不显示"连续"
{
  const s = computePracticeStats([at(0, 9, 0), at(0, 14, 30)], NOW)
  check('只有今天 2 次', [s.todayCount, s.streakDays], [2, 1])
  check('只有今天文案', practiceStatsText(s), '今天已练 2 次')
}

// 3. 今天+昨天+前天:连续 3 天
{
  const s = computePracticeStats([at(0, 10, 0), at(1, 10, 0), at(2, 10, 0)], NOW)
  check('连续 3 天', [s.todayCount, s.streakDays], [1, 3])
  check('连续 3 天文案', practiceStatsText(s), '今天已练 1 次 · 连续 3 天')
}

// 4. 今天 0 次,昨天+前天有:streak 从昨天往前数,文案提醒别断
{
  const s = computePracticeStats([at(1, 20, 0), at(2, 8, 0)], NOW)
  check('今天 0 次但连续 2 天', [s.todayCount, s.streakDays], [0, 2])
  check('今天 0 次连续 2 天文案', practiceStatsText(s), '今天还没开口,已连续 2 天,来一题?')
}

// 5. 只有昨天 1 次:连续 1 天不显示"连续"
{
  const s = computePracticeStats([at(1, 22, 0)], NOW)
  check('只有昨天', [s.todayCount, s.streakDays], [0, 1])
  check('只有昨天文案', practiceStatsText(s), '今天还没开口,来一题?')
}

// 6. 断档:3 天前练过,昨天没练 → streak 0
{
  const s = computePracticeStats([at(3, 12, 0), at(4, 12, 0)], NOW)
  check('断档后 streak 归零', [s.todayCount, s.streakDays], [0, 0])
}

// 7. 跨天边界:今天 00:01 算今天,昨天 23:59 算昨天,且正好连成 2 天
{
  const s = computePracticeStats([at(0, 0, 1), at(1, 23, 59)], NOW)
  check('跨天边界 00:01/23:59', [s.todayCount, s.streakDays], [1, 2])
}

// 8. 未来时间戳(时钟误差):不崩,不算今天
{
  const s = computePracticeStats([at(-1, 10, 0)], NOW)
  check('未来时间戳', [s.todayCount, s.streakDays], [0, 0])
}

console.log(`\n全部 ${passed} 条断言通过`)
