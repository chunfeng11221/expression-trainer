/**
 * 混合分析入口:
 * 1. 本地启发式 analyzeTranscript() 算出 baseline(metrics、口癖、分段标签永远本地算)。
 * 2. 请求后端 /api/analyze 拿 LLM 质性结果(scores/summary/strengths/improvements/outline),
 *    成功则合并覆盖(source='ai')。
 * 3. LLM 失败、超时、ok:false、JSON 不合法 → 静默返回 baseline(source='local')。
 */
import type { AnalysisResult, FeedbackItem } from '../types/analysis'
import { overallScore } from '../utils/scoring'
import { analyzeTranscript, type AnalyzeInput } from './analysisService'
import { apiUrl } from './apiBase'
import { formatTime } from './transcriptionService'

const REQUEST_TIMEOUT_MS = 95_000

export interface AIAnalyzeInput extends AnalyzeInput {
  scenario: string
  audience: string
}

interface LlmResult {
  scores: AnalysisResult['scores']
  summary: string
  strengths: FeedbackItem[]
  improvements: FeedbackItem[]
  improvedOutline: string[]
  detectedStructure: string
}

export async function analyzeWithAI(input: AIAnalyzeInput): Promise<AnalysisResult> {
  const baseline: AnalysisResult = { ...analyzeTranscript(input), source: 'local' }
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(apiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest(input, baseline)),
        signal: controller.signal,
      })
    } finally {
      window.clearTimeout(timer)
    }
    if (!res.ok) return baseline
    const data: unknown = await res.json()
    if (!isAnalyzeResponse(data)) return baseline
    return mergeResult(baseline, data.result, input.transcriptText) ?? baseline
  } catch {
    return baseline
  }
}

/**
 * 准备阶段:请求 AI 生成针对题目的 3-4 条思考提示。
 * 只给思考角度/切入方向;失败返回 null,调用方保持默认提示。
 */export async function fetchPrepHints(input: {
  topic: string
  category?: string
  subtype?: string
  scenario: string
  audience: string
}): Promise<string[] | null> {
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 30_000)
    let res: Response
    try {
      res = await fetch(apiUrl('/api/prep-hints'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
    } finally {
      window.clearTimeout(timer)
    }
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return null
    const d = data as { ok?: unknown; hints?: unknown }
    if (d.ok !== true || !Array.isArray(d.hints)) return null
    const hints = d.hints.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 4)
    return hints.length >= 3 ? hints : null
  } catch {
    return null
  }
}

function isAnalyzeResponse(data: unknown): data is { ok: true; result: LlmResult } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { ok?: unknown }).ok === true &&
    typeof (data as { result?: unknown }).result === 'object' &&
    (data as { result?: unknown }).result !== null
  )
}

/** 把分段文字稿转成带时间标记的纯文本,如 "[00:05] 我认为……" */
function buildTimedTranscript(baseline: AnalysisResult): string {
  return baseline.transcript.map((seg) => `[${formatTime(seg.startTime)}] ${seg.text}`).join('\n')
}

function buildRequest(input: AIAnalyzeInput, baseline: AnalysisResult) {
  const m = baseline.metrics
  const topFillers = baseline.fillerWords
    .slice(0, 3)
    .map((f) => `${f.word}×${f.count}`)
    .join('、')
  return {
    topic: input.topic.title,
    category: input.topic.category ?? '通用',
    subtype: input.topic.subtype,
    scenario: input.scenario,
    audience: input.audience,
    durationSeconds: m.durationSeconds,
    transcript: buildTimedTranscript(baseline),
    metrics: {
      totalCharacters: m.totalCharacters,
      wordsPerMinute: m.wordsPerMinute,
      fillerWordCount: m.fillerWordCount,
      topFillers: topFillers || '无',
      longestPauseSeconds: m.longestPauseSeconds,
      viewpointFirstAppearedAt: m.viewpointFirstAppearedAt,
      exampleCount: m.exampleCount,
      hasConclusion: m.hasConclusion,
    },
  }
}

const SCORE_KEYS = ['viewpoint', 'structure', 'content', 'fluency'] as const

function sanitizeScores(raw: unknown): AnalysisResult['scores'] | null {
  if (typeof raw !== 'object' || raw === null) return null
  const scores = {} as AnalysisResult['scores']
  for (const key of SCORE_KEYS) {
    const value = Number((raw as Record<string, unknown>)[key])
    if (!Number.isFinite(value)) return null
    scores[key] = Math.max(0, Math.min(100, Math.round(value)))
  }
  return scores
}

function sanitizeFeedback(raw: unknown, transcriptText: string): FeedbackItem[] | null {
  if (!Array.isArray(raw)) return null
  const items: FeedbackItem[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as Record<string, unknown>
    const title = typeof e.title === 'string' ? e.title.trim() : ''
    const description = typeof e.description === 'string' ? e.description.trim() : ''
    const suggestion = typeof e.suggestion === 'string' ? e.suggestion.trim() : ''
    if (!title || !description) continue
    const item: FeedbackItem = { title, description, suggestion }
    // transcriptQuote 必须是文字稿原文子串,否则丢弃该字段(保留条目)
    if (typeof e.transcriptQuote === 'string' && e.transcriptQuote.trim()) {
      const quote = e.transcriptQuote.trim()
      if (transcriptText.includes(quote)) item.transcriptQuote = quote
    }
    items.push(item)
    if (items.length >= 2) break
  }
  return items.length > 0 ? items : null
}

/** LLM 字段合并到 baseline;任何关键字段不合法则整体放弃(返回 null) */
function mergeResult(
  baseline: AnalysisResult,
  result: LlmResult,
  transcriptText: string,
): AnalysisResult | null {
  const scores = sanitizeScores(result.scores)
  const summary = typeof result.summary === 'string' ? result.summary.trim() : ''
  const strengths = sanitizeFeedback(result.strengths, transcriptText)
  const improvements = sanitizeFeedback(result.improvements, transcriptText)
  const outline = Array.isArray(result.improvedOutline)
    ? result.improvedOutline.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 5)
    : []
  if (!scores || !summary || !strengths || !improvements || outline.length < 3) return null

  const detectedStructure =
    typeof result.detectedStructure === 'string' && result.detectedStructure.trim()
      ? result.detectedStructure.trim()
      : baseline.detectedStructure

  return {
    ...baseline,
    scores,
    overallScore: overallScore(scores),
    summary,
    strengths,
    improvements,
    improvedOutline: outline,
    detectedStructure,
    source: 'ai',
  }
}

/* ---------- AI 接入配置(设置页) ---------- */

export interface AiConfigInfo {
  provider: string | null
  source: string | null
  base_url: string | null
  model: string | null
  key_tail: string | null
  env_override: boolean
}

export async function fetchAiConfig(): Promise<AiConfigInfo | null> {
  try {
    const res = await fetch(apiUrl('/api/config'))
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null || (data as { ok?: unknown }).ok !== true) {
      return null
    }
    return data as AiConfigInfo
  } catch {
    return null
  }
}

export interface HealthInfo {
  llm: boolean
  provider: string | null
}

export async function fetchHealth(): Promise<HealthInfo | null> {
  try {
    const res = await fetch(apiUrl('/api/health'))
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return null
    const d = data as { llm?: unknown; provider?: unknown }
    return { llm: d.llm === true, provider: typeof d.provider === 'string' ? d.provider : null }
  } catch {
    return null
  }
}

export interface AiConfigSavePayload {
  provider: 'openai' | 'kimi'
  base_url?: string
  api_key?: string
  model?: string
}

async function postJson(path: string, payload: unknown): Promise<{ ok: boolean; reason?: string; model?: string }> {
  try {
    const res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return { ok: false, reason: '响应格式错误' }
    const d = data as { ok?: unknown; reason?: unknown; model?: unknown }
    return {
      ok: d.ok === true,
      reason: typeof d.reason === 'string' ? d.reason : undefined,
      model: typeof d.model === 'string' ? d.model : undefined,
    }
  } catch {
    return { ok: false, reason: '无法连接后端服务' }
  }
}

export function saveAiConfig(payload: AiConfigSavePayload) {
  return postJson('/api/config', payload)
}

export function testAiConfig(payload: { base_url?: string; api_key?: string; model?: string }) {
  return postJson('/api/config/test', payload)
}
