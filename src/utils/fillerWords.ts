/**
 * 口癖词表与检测工具。
 * 时间戳为估算值:按字符在全文中的相对位置 × 总时长换算。
 */

export const FILLER_WORDS = [
  '嗯',
  '啊',
  '呃',
  '然后',
  '就是',
  '那个',
  '其实',
  '所以说',
  '怎么说呢',
] as const

/** 长词优先,避免 "所以说" 被拆成 "所以" + "说" 之类误匹配 */
const fillerPattern = new RegExp(
  [...FILLER_WORDS].sort((a, b) => b.length - a.length).join('|'),
  'g',
)

export interface FillerStat {
  word: string
  count: number
  timestamps: number[]
}

/** 统计文字稿中各口癖词出现次数与估算时间戳(秒) */
export function detectFillerWords(text: string, durationSeconds: number): FillerStat[] {
  const total = Math.max(text.length, 1)
  return detectFillerWordsTimed(text, (index) => (index / total) * durationSeconds)
}

/**
 * 统计口癖词,时间戳由 timeAt(字符索引) 给出。
 * 用于 Whisper 词级时间戳场景:timeAt 把时间线映射到真实录音时间。
 */
export function detectFillerWordsTimed(
  text: string,
  timeAt: (charIndex: number) => number,
): FillerStat[] {
  const stats = new Map<string, { count: number; timestamps: number[] }>()
  for (const match of text.matchAll(fillerPattern)) {
    const word = match[0]
    const index = match.index ?? 0
    const entry = stats.get(word) ?? { count: 0, timestamps: [] }
    entry.count += 1
    entry.timestamps.push(Math.round(timeAt(index) * 10) / 10)
    stats.set(word, entry)
  }
  return [...stats.entries()]
    .map(([word, s]) => ({ word, count: s.count, timestamps: s.timestamps }))
    .sort((a, b) => b.count - a.count)
}

export function countFillers(text: string): number {
  let n = 0
  for (const _ of text.matchAll(fillerPattern)) n += 1
  return n
}

export interface TextPart {
  text: string
  isFiller: boolean
}

/** 把一段文字按口癖词切开,用于渲染波浪线标记 */
export function splitByFillers(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(fillerPattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push({ text: text.slice(last, index), isFiller: false })
    parts.push({ text: match[0], isFiller: true })
    last = index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), isFiller: false })
  return parts
}
