export type FeedbackItem = {
  title: string
  description: string
  suggestion: string
  transcriptQuote?: string
  timestamp?: number
}

export type TranscriptSegment = {
  id: string
  startTime: number
  endTime: number
  text: string
  tags: Array<'viewpoint' | 'reason' | 'example' | 'filler' | 'conclusion'>
}

export type AnalysisResult = {
  overallScore: number
  scores: { viewpoint: number; structure: number; content: number; fluency: number }
  summary: string
  strengths: FeedbackItem[]
  improvements: FeedbackItem[]
  metrics: {
    durationSeconds: number
    totalCharacters: number
    wordsPerMinute: number
    fillerWordCount: number
    longestPauseSeconds: number
    viewpointFirstAppearedAt: number | null
    exampleCount: number
    hasConclusion: boolean
  }
  fillerWords: { word: string; count: number; timestamps: number[] }[]
  transcript: TranscriptSegment[]
  detectedStructure: string
  improvedOutline: string[]
  /** 质性部分来源:'ai' = LLM,'local'/undefined = 本地启发式 */
  source?: 'ai' | 'local'
}

export type ComparisonItem = {
  label: string
  before: string
  after: string
  /** true = 变好, false = 变差, null = 无明显变化或不可比较 */
  improved: boolean | null
  detail?: string
}

export type ComparisonResult = {
  summary: string
  items: ComparisonItem[]
}
