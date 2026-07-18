/**
 * 四项评分的启发式计算。
 * 所有函数输入为分析过程中提取的特征,输出 0-100 的整数分。
 */

export interface FluencyInput {
  fillerWordCount: number
  wordsPerMinute: number
  durationSeconds: number
  limitSeconds: number
  longestPauseSeconds: number
}

export function scoreFluency(input: FluencyInput): number {
  let score = 100
  // 口癖:每个 -2,最多扣 40
  score -= Math.min(input.fillerWordCount * 2, 40)
  // 语速:中文口头表达舒适区约 180-280 字/分钟
  const wpm = input.wordsPerMinute
  if (wpm < 120) score -= 15
  else if (wpm < 160) score -= 7
  else if (wpm > 340) score -= 12
  else if (wpm > 300) score -= 5
  // 时长:严重过短或超时
  if (input.durationSeconds < input.limitSeconds * 0.4) score -= 12
  if (input.durationSeconds > input.limitSeconds * 1.15) score -= 8
  // 长停顿
  if (input.longestPauseSeconds >= 4) score -= 8
  else if (input.longestPauseSeconds >= 3) score -= 4
  return clampScore(score)
}

export interface ViewpointInput {
  /** 核心观点首次出现时间(秒),null 表示未检测到 */
  viewpointFirstAppearedAt: number | null
  durationSeconds: number
  hasConclusion: boolean
}

export function scoreViewpoint(input: ViewpointInput): number {
  if (input.viewpointFirstAppearedAt === null) {
    return input.hasConclusion ? 50 : 42
  }
  const ratio = Math.min(input.viewpointFirstAppearedAt / Math.max(input.durationSeconds, 1), 1)
  // 越晚出现分越低:开头即观点 ≈ 92,拖到结尾 ≈ 50
  let score = 92 - ratio * 42
  if (input.hasConclusion) score += 6
  return clampScore(score)
}

export interface StructureInput {
  detectedStructure: string
  hasSequenceWords: boolean
  segmentTagVariety: number
}

export function scoreStructure(input: StructureInput): number {
  let score: number
  switch (input.detectedStructure) {
    case '观点—理由—例子—总结':
      score = 88
      break
    case '问题—原因—解决办法':
    case '背景—行动—结果':
      score = 82
      break
    case '现象—分析—结论':
      score = 72
      break
    default:
      score = 46
  }
  if (input.hasSequenceWords) score += 6
  if (input.segmentTagVariety >= 3) score += 4
  return clampScore(score)
}

export interface ContentInput {
  exampleCount: number
  hasReason: boolean
  hasNumbers: boolean
  hasConcreteDetail: boolean
  emptyPhraseCount: number
}

export function scoreContent(input: ContentInput): number {
  let score = 52
  score += Math.min(input.exampleCount, 2) * 11
  if (input.hasReason) score += 9
  if (input.hasNumbers) score += 8
  if (input.hasConcreteDetail) score += 6
  score -= Math.min(input.emptyPhraseCount * 4, 16)
  return clampScore(score)
}

export function overallScore(scores: {
  viewpoint: number
  structure: number
  content: number
  fluency: number
}): number {
  return Math.round(
    scores.viewpoint * 0.3 + scores.structure * 0.25 + scores.content * 0.25 + scores.fluency * 0.2,
  )
}

export function clampScore(n: number): number {
  return Math.max(20, Math.min(98, Math.round(n)))
}
