/**
 * 分析入口:输入文字稿 + 时长 + 题目,输出 AnalysisResult。
 * 全部为确定性启发式规则(非随机),未来的真实 AI 分析也应保持同样的输出类型,
 * 在 analyzeTranscript 内部替换/增强实现即可。
 */
import type {
  AnalysisResult,
  ComparisonItem,
  ComparisonResult,
  FeedbackItem,
  TranscriptSegment,
} from '../types/analysis'
import type { Topic } from '../types/training'
import { countFillers, detectFillerWords, detectFillerWordsTimed, FILLER_WORDS } from '../utils/fillerWords'
import {
  overallScore,
  scoreContent,
  scoreFluency,
  scoreStructure,
  scoreViewpoint,
} from '../utils/scoring'
import type { LiveSegment } from './transcriptionService'

const VIEWPOINT_RE = /我认为|我觉得|我相信|在我看来|我的观点|核心是|最关键的是|关键在于|不应该|应该/
const EXAMPLE_RE = /比如|例如|举个例子|比方说|有一次|我记得/
const REASON_RE = /因为|原因是|由于|导致/
const CONCLUSION_RE = /总之|综上|总的来说|整体来说|所以说|我的结论|以上|最后/
const CONCLUSION_STRONG_RE = /总之|综上|总的来说|整体来说|我的结论|以上/
const SEQUENCE_RE = /首先|第一|其次|第二|再次|第三|最后/
const PROBLEM_RE = /问题|困难|延期|失误|偏差|挑战|瓶颈/
const ACTION_RE = /调整|解决|办法|措施|改进|优化|应对|建立|做了|推动/
const RESULT_RE = /结果|最终|后来|上线|完成|交付|落地|效果/
const NUMBER_RE = /\d+|[一二两三四五六七八九十](?=次|天|周|月|年|倍|个|条|点|分钟|小时|周|步|版)/
const EMPTY_PHRASE_RE = /非常重要|很有意义|值得关注|引起重视|不可否认|意义重大|十分关键/g
const PAUSE_RE = /…+/g

export interface WordTimestamp {
  w: string
  start: number
  end: number
}

export interface AsrSegment {
  start: number
  end: number
  text: string
}

export interface AnalyzeInput {
  transcriptText: string
  durationSeconds: number
  /** category 可选:本地启发式不用它,AI 分析按题型适配 */
  topic: Pick<Topic, 'title'> & Partial<Pick<Topic, 'category'>>
  limitSeconds?: number
  /** 实时转写阶段拿到的片段(带估算时间),有则优先使用 */
  liveSegments?: LiveSegment[]
  /** Whisper 词级时间戳;有则口癖时间戳、观点出现时间、停顿用真实值 */
  words?: WordTimestamp[]
  /** Whisper 分段;有则文字稿按它分组(标点/约10秒切段) */
  asrSegments?: AsrSegment[]
}

export function analyzeTranscript(input: AnalyzeInput): AnalysisResult {
  const text = input.transcriptText.trim()
  const duration = Math.max(input.durationSeconds, 1)
  const limit = input.limitSeconds ?? 60

  const transcript = buildSegments(text, duration, input.liveSegments, input.asrSegments)
  // 有 Whisper 词级时间戳时,口癖/观点时间用真实值,否则按字符位置估算
  const timeline = input.words && input.words.length > 0 ? buildCharTimeline(input.words) : null
  const fillerWords = timeline
    ? detectFillerWordsTimed(timeline.text, (i) => timeline.charTime[i] ?? 0)
    : detectFillerWords(text, duration)
  const fillerWordCount = fillerWords.reduce((s, f) => s + f.count, 0)

  const totalCharacters = text.replace(/[\s，。！？；、：…,.!?;:—\-""'']/g, '').length
  const wordsPerMinute = Math.round((totalCharacters / duration) * 60)

  const viewpointText = timeline?.text ?? text
  const viewpointIndex = viewpointText.search(VIEWPOINT_RE)
  const viewpointFirstAppearedAt =
    viewpointIndex === -1
      ? null
      : timeline
        ? (timeline.charTime[viewpointIndex] ?? null)
        : Math.round(((viewpointIndex / Math.max(text.length, 1)) * duration) * 10) / 10

  const exampleCount = (text.match(new RegExp(EXAMPLE_RE.source, 'g')) ?? []).length
  const tailText = text.slice(Math.floor(text.length * 0.6))
  const hasConclusion = CONCLUSION_RE.test(tailText)

  const longestPauseSeconds = input.words?.length
    ? longestPauseFromWords(input.words)
    : estimateLongestPause(text)
  const detectedStructure = detectStructure(text, viewpointFirstAppearedAt, duration)
  const hasSequenceWords = SEQUENCE_RE.test(text)
  const hasReason = REASON_RE.test(text)
  const hasNumbers = NUMBER_RE.test(text)
  const emptyPhraseCount = (text.match(EMPTY_PHRASE_RE) ?? []).length
  const tagVariety = new Set(transcript.flatMap((s) => s.tags)).size

  const scores = {
    viewpoint: scoreViewpoint({ viewpointFirstAppearedAt, durationSeconds: duration, hasConclusion }),
    structure: scoreStructure({ detectedStructure, hasSequenceWords, segmentTagVariety: tagVariety }),
    content: scoreContent({
      exampleCount,
      hasReason,
      hasNumbers,
      hasConcreteDetail: hasNumbers,
      emptyPhraseCount,
    }),
    fluency: scoreFluency({
      fillerWordCount,
      wordsPerMinute,
      durationSeconds: duration,
      limitSeconds: limit,
      longestPauseSeconds,
    }),
  }

  const metrics = {
    durationSeconds: Math.round(duration),
    totalCharacters,
    wordsPerMinute,
    fillerWordCount,
    longestPauseSeconds,
    viewpointFirstAppearedAt,
    exampleCount,
    hasConclusion,
  }

  return {
    overallScore: overallScore(scores),
    scores,
    summary: buildSummary(text, scores, metrics, detectedStructure, fillerWords[0]?.word),
    strengths: buildStrengths(text, metrics, wordsPerMinute),
    improvements: buildImprovements(text, scores, metrics, fillerWords[0], duration),
    metrics,
    fillerWords,
    transcript,
    detectedStructure,
    improvedOutline: buildImprovedOutline(text, input.topic.title),
  }
}

/* ---------- 片段与标签 ---------- */

/** 把词级时间戳展开成"每个字符对应一个时间"的时间线 */
function buildCharTimeline(words: WordTimestamp[]): { text: string; charTime: number[] } {
  const chars: string[] = []
  const times: number[] = []
  for (const word of words) {
    const len = Math.max(word.w.length, 1)
    for (let i = 0; i < word.w.length; i += 1) {
      chars.push(word.w[i])
      times.push(word.start + ((word.end - word.start) * i) / len)
    }
  }
  return { text: chars.join(''), charTime: times }
}

/** 相邻词间隙 > 0.8s 计为停顿,取最长;无停顿返回 0 */
function longestPauseFromWords(words: WordTimestamp[]): number {
  let longest = 0
  for (let i = 1; i < words.length; i += 1) {
    const gap = words[i].start - words[i - 1].end
    if (gap > 0.8) longest = Math.max(longest, gap)
  }
  return Math.round(longest * 10) / 10
}

/** Whisper 分段按标点 / 约 10 秒合并成段落 */
function buildSegmentsFromAsr(segs: AsrSegment[], duration: number): TranscriptSegment[] {
  const groups: Array<{ start: number; end: number; text: string }> = []
  let cur: { start: number; end: number; text: string } | null = null
  for (const seg of segs) {
    if (!cur) {
      cur = { start: seg.start, end: seg.end, text: seg.text }
    } else {
      cur.text += seg.text
      cur.end = seg.end
    }
    if (/[。!！？?；;]$/.test(cur.text) || cur.end - cur.start >= 10) {
      groups.push(cur)
      cur = null
    }
  }
  if (cur) groups.push(cur)
  return groups.map((g, i) => ({
    id: `seg-${i + 1}`,
    startTime: g.start,
    endTime: Math.min(g.end, duration),
    text: g.text,
    tags: tagSegment(g.text, i, groups.length),
  }))
}

function buildSegments(
  text: string,
  duration: number,
  live?: LiveSegment[],
  asr?: AsrSegment[],
): TranscriptSegment[] {
  if (asr && asr.length > 0) return buildSegmentsFromAsr(asr, duration)
  if (live && live.length > 0) {
    return live.map((s, i) => ({
      id: s.id || `seg-${i + 1}`,
      startTime: Math.min(s.startTime, duration),
      endTime: Math.min(Math.max(s.endTime, s.startTime), duration),
      text: s.text,
      tags: tagSegment(s.text, i, live.length),
    }))
  }
  const sentences = splitSentences(text)
  const total = Math.max(
    sentences.reduce((s, x) => s + x.length, 0),
    1,
  )
  let cursorChars = 0
  return sentences.map((sentence, i) => {
    const startTime = (cursorChars / total) * duration
    cursorChars += sentence.length
    const endTime = (cursorChars / total) * duration
    return {
      id: `seg-${i + 1}`,
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      text: sentence,
      tags: tagSegment(sentence, i, sentences.length),
    }
  })
}

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length > 1) return parts
  // 没有标点时(实时转写常见)按约 40 字切分
  if (text.length <= 40) return [text]
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += 40) chunks.push(text.slice(i, i + 40))
  return chunks
}

function tagSegment(
  text: string,
  index: number,
  total: number,
): TranscriptSegment['tags'] {
  const tags: TranscriptSegment['tags'] = []
  if (VIEWPOINT_RE.test(text)) tags.push('viewpoint')
  if (REASON_RE.test(text)) tags.push('reason')
  if (EXAMPLE_RE.test(text)) tags.push('example')
  if (CONCLUSION_STRONG_RE.test(text) || (CONCLUSION_RE.test(text) && index >= total * 0.5)) {
    tags.push('conclusion')
  }
  if (countFillers(text) >= 2) tags.push('filler')
  return tags
}

function estimateLongestPause(text: string): number {
  let longest = 0
  for (const match of text.matchAll(PAUSE_RE)) {
    // 两个省略号字符 ≈ 2 秒停顿
    longest = Math.max(longest, match[0].length)
  }
  return longest > 0 ? Math.min(longest, 6) : 1
}

function detectStructure(
  text: string,
  viewpointAt: number | null,
  duration: number,
): string {
  const hasViewpoint = viewpointAt !== null
  const viewpointEarly = viewpointAt !== null && viewpointAt / Math.max(duration, 1) < 0.5
  const hasReason = REASON_RE.test(text)
  const hasExample = EXAMPLE_RE.test(text)
  const hasConclusion = CONCLUSION_RE.test(text.slice(Math.floor(text.length * 0.6)))
  const hasProblem = PROBLEM_RE.test(text)
  const hasAction = ACTION_RE.test(text)
  const hasResult = RESULT_RE.test(text)

  if (hasViewpoint && viewpointEarly && hasReason && hasExample && hasConclusion) {
    return '观点—理由—例子—总结'
  }
  if (hasProblem && hasReason && hasAction && hasResult) return '背景—行动—结果'
  if (hasProblem && hasReason && hasAction) return '问题—原因—解决办法'
  if (hasViewpoint && hasConclusion) return '现象—分析—结论'
  return '无明显结构'
}

/* ---------- 文案组装 ---------- */

function findSentence(text: string, re: RegExp): string | null {
  for (const sentence of splitSentences(text)) {
    if (re.test(sentence)) return sentence
  }
  return null
}

function shorten(sentence: string, max = 26): string {
  const clean = sentence.replace(/[。！？!?；;…]+$/, '')
  return clean.length > max ? `${clean.slice(0, max)}……` : clean
}

const FILLER_CLEAN_RE = new RegExp(
  [...FILLER_WORDS].sort((a, b) => b.length - a.length).join('|'),
  'g',
)

/** 引用用户原话用于提纲/建议时,先去掉口癖并清理开头,避免把"然后我觉得吧"写进提纲 */
function cleanQuote(sentence: string): string {
  return sentence
    .replace(FILLER_CLEAN_RE, '')
    .replace(/^[…\s，,、。]+/, '')
    .replace(/[，,]{2,}/g, ',')
    .trim()
}

function buildSummary(
  text: string,
  scores: AnalysisResult['scores'],
  metrics: AnalysisResult['metrics'],
  detectedStructure: string,
  topFiller?: string,
): string {
  const parts: string[] = []

  if (metrics.viewpointFirstAppearedAt === null) {
    parts.push('没有清晰的核心观点')
  } else {
    const ratio = metrics.viewpointFirstAppearedAt / Math.max(metrics.durationSeconds, 1)
    if (ratio > 0.5) {
      parts.push(`核心观点到第 ${Math.round(metrics.viewpointFirstAppearedAt)} 秒才出现,前面铺垫过多`)
    } else {
      parts.push('核心观点出现得比较早,立场清楚')
    }
  }

  if (detectedStructure === '无明显结构') {
    parts.push('整体缺少明确的结构线索')
  } else if (scores.structure >= 85) {
    parts.push(`「${detectedStructure}」的结构完整清晰`)
  } else {
    parts.push(`结构接近「${detectedStructure}」,但层次过渡不够明显`)
  }

  if (metrics.fillerWordCount >= 8 && topFiller) {
    parts.push(`口癖偏多(共 ${metrics.fillerWordCount} 次,以"${topFiller}"为主)`)
  } else if (metrics.fillerWordCount > 0) {
    parts.push(`有少量口癖(共 ${metrics.fillerWordCount} 次)`)
  } else {
    parts.push('表达干净,几乎没有口癖')
  }

  if (metrics.exampleCount === 0) {
    parts.push('没有使用具体例子')
  } else if (!NUMBER_RE.test(text)) {
    parts.push('例子有了但不够具体')
  } else {
    parts.push('例子具体、有细节')
  }

  if (!metrics.hasConclusion) parts.push('结尾没有收住')

  return `你的${parts.slice(0, 4).join(',')}。`
}

function buildStrengths(
  text: string,
  metrics: AnalysisResult['metrics'],
  wordsPerMinute: number,
): FeedbackItem[] {
  const candidates: FeedbackItem[] = []
  const viewpointSentence = findSentence(text, VIEWPOINT_RE)
  const exampleSentence = findSentence(text, EXAMPLE_RE)
  const conclusionSentence = findSentence(text, CONCLUSION_STRONG_RE)

  if (viewpointSentence && metrics.viewpointFirstAppearedAt !== null) {
    const early = metrics.viewpointFirstAppearedAt / Math.max(metrics.durationSeconds, 1) <= 0.5
    candidates.push({
      title: early ? '观点开门见山' : '有明确的核心观点',
      description: early
        ? `你在开头就给出了观点:"${shorten(viewpointSentence)}",听众一开始就知道你的立场。`
        : `你表达了明确的观点:"${shorten(viewpointSentence)}"。`,
      suggestion: '保持先给观点、再给理由的顺序,这是口头表达里最值得保留的习惯。',
      transcriptQuote: viewpointSentence,
      timestamp: metrics.viewpointFirstAppearedAt,
    })
  }
  if (exampleSentence) {
    candidates.push({
      title: '使用了具体例子',
      description: `你用"${shorten(exampleSentence)}"来支撑观点,比空讲道理更有说服力。`,
      suggestion: '下次可以给例子加上时间、数字等细节,可信度会再上一个台阶。',
      transcriptQuote: exampleSentence,
    })
  }
  if (conclusionSentence && metrics.hasConclusion) {
    candidates.push({
      title: '有完整的收尾',
      description: `结尾用"${shorten(conclusionSentence)}"收住了整段表达,没有戛然而止。`,
      suggestion: '结尾可以更进一步:用一句话重申核心观点,让听众带走一个明确的结论。',
      transcriptQuote: conclusionSentence,
    })
  }
  if (metrics.fillerWordCount <= 5) {
    candidates.push({
      title: '表达流畅,口癖少',
      description: `整段表达只出现 ${metrics.fillerWordCount} 次口癖,语言比较干净。`,
      suggestion: '继续保持;偶尔的停顿不是错误,不需要用口头词填满。',
    })
  }
  if (wordsPerMinute >= 160 && wordsPerMinute <= 300) {
    candidates.push({
      title: '语速控制得当',
      description: `平均语速 ${wordsPerMinute} 字/分钟,在听众舒适的区间内。`,
      suggestion: '保持这个语速,重点句前可以刻意放慢半拍。',
    })
  }
  candidates.push({
    title: '在规定时间内完成了表达',
    description: `你完整说完了 ${metrics.durationSeconds} 秒,没有中途放弃。`,
    suggestion: '下一步在完整的基础上追求"更具体":每说一个判断,就跟一个事实。',
  })

  return candidates.slice(0, 2)
}

function buildImprovements(
  text: string,
  scores: AnalysisResult['scores'],
  metrics: AnalysisResult['metrics'],
  topFiller: { word: string; count: number } | undefined,
  duration: number,
): FeedbackItem[] {
  const generators: Record<keyof AnalysisResult['scores'], () => FeedbackItem> = {
    viewpoint: () => {
      const sentence = findSentence(text, VIEWPOINT_RE)
      if (metrics.viewpointFirstAppearedAt === null || !sentence) {
        return {
          title: '缺少一句明确的核心观点',
          description:
            '整段表达里没有出现"我认为/我觉得/核心是"这类观点句,听众听完很难说出你的立场是什么。',
          suggestion:
            '开头 10 秒内用一句话给出判断,例如"我认为……"或"这件事的核心是……",然后再展开理由。',
        }
      }
      const ratio = metrics.viewpointFirstAppearedAt / Math.max(metrics.durationSeconds, 1)
      if (ratio <= 0.5) {
        return {
          title: '观点可以更锐利',
          description: `你的观点"${shorten(cleanQuote(sentence))}"出现得足够早,但句子偏长,判断感还可以更强。`,
          suggestion:
            '把观点句压缩到 20 字以内,只保留主语和判断,例如"我认为 X 比 Y 更重要",细节留给后面展开。',
          transcriptQuote: sentence,
          timestamp: metrics.viewpointFirstAppearedAt,
        }
      }
      return {
        title: '核心观点出现得太晚',
        description: `直到第 ${Math.round(metrics.viewpointFirstAppearedAt)} 秒你才说出"${shorten(cleanQuote(sentence))}"。前面的铺垫让听众在等待中丢掉了重点。`,
        suggestion: `把"${shorten(cleanQuote(sentence), 18)}"直接挪到开头第一句说,再用理由和例子去支撑它。`,
        transcriptQuote: sentence,
        timestamp: metrics.viewpointFirstAppearedAt,
      }
    },
    content: () => {
      const exampleSentence = findSentence(text, EXAMPLE_RE)
      const emptySentence = findSentence(text, /非常重要|很有意义|值得关注|引起重视|不可否认|意义重大|十分关键/)
      if (metrics.exampleCount === 0) {
        return {
          title: '缺少具体例子',
          description:
            '整段表达停留在抽象判断上,没有一个真实的事例,观点说服力不足。',
          suggestion:
            '补一个"时间+人物+经过+结果"的真实例子。比如用"有一次……"开头,讲清楚当时发生了什么、结果如何。',
        }
      }
      if (!NUMBER_RE.test(text) && exampleSentence) {
        return {
          title: '例子不够具体',
          description: `你提到"${shorten(exampleSentence)}",但没有说明具体发生了什么,听众无法判断这件事的分量。`,
          suggestion: `把"${shorten(exampleSentence, 16)}"展开讲:当时是什么情况?谁做了什么?结果如何?加一组数字(几次、几天、几个)会立刻更可信。`,
          transcriptQuote: exampleSentence,
        }
      }
      if (emptySentence) {
        return {
          title: '空话套话偏多',
          description: `"${shorten(emptySentence)}"这类评价性表达没有信息量,占用了说具体内容的时间。`,
          suggestion: '把评价换成事实:不说"非常重要",改说"重要在哪里、影响了什么"。',
          transcriptQuote: emptySentence,
        }
      }
      return {
        title: '细节密度可以提升',
        description: '观点、理由、例子都有了,但细节的密度还可以更高。',
        suggestion: '每个理由后面跟一个事实:一个数字、一个场景、一句原话,任选其一。',
      }
    },
    structure: () => ({
      title: '结构线索不够清晰',
      description:
        '内容之间的层次和过渡不明显,听众需要自己拼凑"你现在说到哪一层了"。',
      suggestion:
        '开口前先定一个框架,例如"观点—理由—例子—总结",并用"第一/第二/最后"这类路标词把层次说出来。',
    }),
    fluency: () => {
      if (topFiller && metrics.fillerWordCount >= 6) {
        const fillerSentence = findSentence(text, new RegExp(topFiller.word))
        return {
          title: `口癖"${topFiller.word}"出现了 ${topFiller.count} 次`,
          description: `比如你说"${fillerSentence ? shorten(fillerSentence) : topFiller.word}"。高频口癖会不断打断听众的注意力。`,
          suggestion:
            '想不起下一句时,允许自己安静停顿一两秒——停顿不是错误,比用口头词填满更专业。',
          transcriptQuote: fillerSentence ?? undefined,
        }
      }
      if (metrics.wordsPerMinute < 140) {
        return {
          title: '语速偏慢,内容量不足',
          description: `平均语速只有 ${metrics.wordsPerMinute} 字/分钟,${Math.round(duration)} 秒里传递的信息偏少。`,
          suggestion: '准备时多储备一个理由或例子,说的时候保持连贯,减少长时间冷场。',
        }
      }
      if (metrics.wordsPerMinute > 320) {
        return {
          title: '语速偏快',
          description: `平均语速 ${metrics.wordsPerMinute} 字/分钟,听众可能跟不上你的思路。`,
          suggestion: '重点句之间留半拍停顿,宁可少说一点,也要说清楚。',
        }
      }
      return {
        title: '流畅度仍有提升空间',
        description: '整体表达连贯,但局部仍有卡壳和填充词。',
        suggestion: '把最常用的开头句练到脱口而出,开头的顺畅会带动整段的节奏。',
      }
    },
  }

  const ordered = (Object.entries(scores) as Array<[keyof AnalysisResult['scores'], number]>)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key)

  const picked: FeedbackItem[] = []
  for (const key of ordered) {
    if (picked.length >= 2) break
    picked.push(generators[key]())
  }
  return picked
}

function buildImprovedOutline(text: string, topicTitle: string): string[] {
  const viewpointSentence = findSentence(text, VIEWPOINT_RE)
  const reasonSentence = findSentence(text, REASON_RE)
  const exampleSentence = findSentence(text, EXAMPLE_RE)

  const outline: string[] = []
  const viewpointQuote = viewpointSentence ? cleanQuote(viewpointSentence) : null
  const reasonQuote = reasonSentence ? cleanQuote(reasonSentence) : null
  const exampleQuote = exampleSentence ? cleanQuote(exampleSentence) : null
  outline.push(
    viewpointQuote
      ? `开头第一句直接亮出观点:"${shorten(viewpointQuote, 24)}",不要铺垫`
      : `开头第一句直接给出你对「${shorten(topicTitle, 16)}」的判断("我认为……")`,
  )
  outline.push(
    reasonQuote
      ? `紧接着给出核心理由:"${shorten(reasonQuote, 24)}"`
      : '用"因为……"给出一条最核心的理由,只讲一条,讲透',
  )
  outline.push(
    exampleQuote
      ? `把"${shorten(exampleQuote, 18)}"展开成完整例子:时间、人物、经过、结果,加一组数字`
      : '补充一个真实例子:交代时间、人物、经过和结果,最好带一组数字',
  )
  outline.push('用"第一/第二/最后"把层次标出来,每层只说一个意思')
  outline.push(
    viewpointQuote
      ? `结尾用一句话重申观点收住:"所以我的结论是,${shorten(viewpointQuote, 20)}"`
      : '结尾用"所以我的结论是……"重申观点,一句话收住',
  )
  return outline
}

/* ---------- 两次对比 ---------- */

export function compareAttempts(first: AnalysisResult, second: AnalysisResult): ComparisonResult {
  const items: ComparisonItem[] = []

  const scoreDelta = second.overallScore - first.overallScore
  items.push({
    label: '综合分',
    before: String(first.overallScore),
    after: String(second.overallScore),
    improved: scoreDelta === 0 ? null : scoreDelta > 0,
    detail: scoreDelta === 0 ? '持平' : `${scoreDelta > 0 ? '+' : ''}${scoreDelta} 分`,
  })

  const dimensionNames: Array<[keyof AnalysisResult['scores'], string]> = [
    ['viewpoint', '观点'],
    ['structure', '结构'],
    ['content', '内容'],
    ['fluency', '流畅度'],
  ]
  for (const [key, label] of dimensionNames) {
    const delta = second.scores[key] - first.scores[key]
    items.push({
      label,
      before: String(first.scores[key]),
      after: String(second.scores[key]),
      improved: delta === 0 ? null : delta > 0,
      detail: delta === 0 ? '持平' : `${delta > 0 ? '+' : ''}${delta}`,
    })
  }

  const fillerDelta = second.metrics.fillerWordCount - first.metrics.fillerWordCount
  items.push({
    label: '口癖总数',
    before: `${first.metrics.fillerWordCount} 次`,
    after: `${second.metrics.fillerWordCount} 次`,
    improved: fillerDelta === 0 ? null : fillerDelta < 0,
    detail: fillerDelta === 0 ? '持平' : `${fillerDelta > 0 ? '+' : ''}${fillerDelta} 次`,
  })

  const v1 = first.metrics.viewpointFirstAppearedAt
  const v2 = second.metrics.viewpointFirstAppearedAt
  items.push({
    label: '核心观点出现时间',
    before: v1 === null ? '未出现' : `第 ${Math.round(v1)} 秒`,
    after: v2 === null ? '未出现' : `第 ${Math.round(v2)} 秒`,
    improved:
      v2 === null ? null : v1 === null ? true : v2 < v1 ? true : v2 > v1 ? false : null,
    detail: v1 !== null && v2 !== null ? `${v2 < v1 ? '提前' : '推迟'} ${Math.abs(Math.round(v2 - v1))} 秒` : undefined,
  })

  const exampleDelta = second.metrics.exampleCount - first.metrics.exampleCount
  items.push({
    label: '具体例子',
    before: `${first.metrics.exampleCount} 处`,
    after: `${second.metrics.exampleCount} 处`,
    improved: exampleDelta === 0 ? null : exampleDelta > 0,
    detail: exampleDelta > 0 ? '新增例子' : exampleDelta === 0 ? '持平' : '减少了',
  })

  items.push({
    label: '明确结尾',
    before: first.metrics.hasConclusion ? '有' : '没有',
    after: second.metrics.hasConclusion ? '有' : '没有',
    improved:
      first.metrics.hasConclusion === second.metrics.hasConclusion
        ? null
        : second.metrics.hasConclusion,
    detail:
      !first.metrics.hasConclusion && second.metrics.hasConclusion ? '补上了结尾' : undefined,
  })

  return { summary: buildComparisonSummary(first, second), items }
}

function buildComparisonSummary(first: AnalysisResult, second: AnalysisResult): string {
  const parts: string[] = []

  const v1 = first.metrics.viewpointFirstAppearedAt
  const v2 = second.metrics.viewpointFirstAppearedAt
  if (v1 !== null && v2 !== null && v2 < v1 - 2) {
    parts.push(`你把核心观点从第 ${Math.round(v1)} 秒提前到了第 ${Math.round(v2)} 秒`)
  } else if (v1 === null && v2 !== null) {
    parts.push(`你这次在第 ${Math.round(v2)} 秒就给出了明确观点`)
  }

  const topFirst = first.fillerWords[0]
  if (topFirst) {
    const secondCount = second.fillerWords.find((f) => f.word === topFirst.word)?.count ?? 0
    if (secondCount < topFirst.count) {
      parts.push(`"${topFirst.word}"从 ${topFirst.count} 次减少到 ${secondCount} 次`)
    }
  } else if (second.metrics.fillerWordCount < first.metrics.fillerWordCount) {
    parts.push(`口癖从 ${first.metrics.fillerWordCount} 次减少到 ${second.metrics.fillerWordCount} 次`)
  }

  const firstText = first.transcript.map((s) => s.text).join('')
  const secondText = second.transcript.map((s) => s.text).join('')
  if (second.metrics.exampleCount > first.metrics.exampleCount) {
    parts.push(
      first.metrics.exampleCount === 0 ? '新增了一个具体例子' : '例子比上一次更充分',
    )
  } else if (
    second.metrics.exampleCount > 0 &&
    !NUMBER_RE.test(firstText) &&
    NUMBER_RE.test(secondText)
  ) {
    parts.push('例子比上一次更具体')
  }
  if (!first.metrics.hasConclusion && second.metrics.hasConclusion) {
    parts.push('补上了明确的结尾')
  }

  if (parts.length === 0) {
    const delta = second.overallScore - first.overallScore
    if (delta > 0) return `第二次回答综合分提高了 ${delta} 分,这一次比上一次更具体。`
    if (delta < 0) return `第二次回答综合分下降了 ${Math.abs(delta)} 分,别在意分数,再说一次就好。`
    return '两次回答整体持平,但再说一次本身就是进步。'
  }
  return `第二次回答中,${parts.join(',')}。`
}
