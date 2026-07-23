import type { AnalysisResult } from './analysis'

export type Category = '日常' | '观点' | '工作' | '解释' | '公考面试' | '随心记'
export type Difficulty = '简单' | '普通' | '困难'

/** 公考面试题的子题型(结构化面试题型) */
export type InterviewSubtype =
  | '社会现象'
  | '态度观点'
  | '计划组织'
  | '应急应变'
  | '人际关系'
  | '情景模拟'
  | '其他'

export interface Topic {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
  /** 仅「公考面试」题有:结构化面试子题型 */
  subtype?: InterviewSubtype
}

/**
 * 历史数据兼容:旧版本分类叫「申论」,读取时一律按「公考面试」处理。
 * 新数据只写「公考面试」。
 */
export function normalizeCategory(category: string | null | undefined): Category | undefined {
  if (!category) return undefined
  if (category === '申论') return '公考面试'
  return category as Category
}

export type Scene = '汇报' | '即兴' | '面试' | '公考面试'
export type Audience = '普通观众' | '领导' | '面试官' | '专业人士'

export interface TrainingSettings {
  answerSeconds: number
  prepareSeconds: number
  scene: Scene
  audience: Audience
  /**
   * 用户是否在设置里手动改过回答/准备时间。
   * 未改过时,选中「公考面试」题自动采用面试节奏(思考60秒、作答3分钟)。
   */
  timeCustomized?: boolean
}

export type TrainingPhase = 'preparing' | 'recording' | 'analyzing'

export interface TrainingSession {
  topic: Topic
  phase: TrainingPhase
  attemptNumber: 1 | 2
  startedAt: number
  /** 同一次训练(两次 attempt)共享的 id,用于历史归组 */
  sessionId?: string
}

export interface Attempt {
  attemptNumber: 1 | 2
  topicId: string
  topicTitle: string
  topicCategory?: Category
  transcriptText: string
  usedMockTranscript: boolean
  durationSeconds: number
  analysis: AnalysisResult
  createdAt: number
  sessionId?: string
}

/** 训练历史条目(localStorage 列表,上限 100 条,超出淘汰最旧) */
export interface HistoryEntry {
  /** 稳定 id:`${sessionId}:${attemptNumber}` */
  id: string
  savedAt: number
  sessionId: string
  attemptNumber: 1 | 2
  topic: Topic
  settings: TrainingSettings
  analysis: AnalysisResult
  transcriptText: string
  durationSeconds: number
  usedMockTranscript: boolean
}
