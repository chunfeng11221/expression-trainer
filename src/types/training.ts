import type { AnalysisResult } from './analysis'

export type Category = '日常' | '观点' | '工作' | '解释' | '申论'
export type Difficulty = '简单' | '普通' | '困难'

export interface Topic {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
}

export type Scene = '汇报' | '即兴' | '面试' | '申论'
export type Audience = '普通观众' | '领导' | '面试官' | '专业人士'

export interface TrainingSettings {
  answerSeconds: number
  prepareSeconds: number
  scene: Scene
  audience: Audience
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
