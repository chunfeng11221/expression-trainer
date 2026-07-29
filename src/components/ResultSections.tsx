import { useRef, type ReactNode } from 'react'
import type { AnalysisResult } from '../types/analysis'
import type { Category } from '../types/training'
import { normalizeCategory } from '../types/training'
import { Link } from 'react-router-dom'
import { getConceptById } from '../data/courseConcepts'
import { formatTime } from '../services/transcriptionService'
import { seekAudio } from '../utils/audioSeek'
import ScoreCard from './ScoreCard'
import Transcript from './Transcript'

/** 题型 → "观点"维度的含义提示(维度名不变,含义按题型解释) */
const VIEWPOINT_HINTS: Record<Category, string> = {
  观点: '立场是否明确',
  解释: '核心信息是否讲清',
  工作: '结论是否先行',
  日常: '答案是否明确',
  公考面试: '审题与立场',
  随心记: '中心是否讲清楚',
}

/** 公考面试额外给出"结构/内容"维度的含义(对齐结构化面试评分口径) */
const STRUCTURE_HINTS: Partial<Record<Category, string>> = {
  公考面试: '逻辑条理',
}
const CONTENT_HINTS: Partial<Record<Category, string>> = {
  公考面试: '分析与对策',
}

/** 最低分维度 → 「表达课」对应方法卡(确定性映射,不调 LLM;卡片出自 courseConcepts.ts) */
const DIMENSION_REMEDIES: Record<keyof AnalysisResult['scores'], string[]> = {
  viewpoint: ['motivation', 'audience-purposes'],
  structure: ['framework-time', 'transition'],
  content: ['core-sentence', 'concrete-expression'],
  fluency: ['practice-framework'],
}
const DIMENSION_LABELS: Record<keyof AnalysisResult['scores'], string> = {
  viewpoint: '观点',
  structure: '结构',
  content: '内容',
  fluency: '流畅度',
}
/** 四项分不低于该值时,认为没有明显短板 */
const NO_WEAKNESS_THRESHOLD = 85

interface ResultSectionsProps {
  analysis: AnalysisResult
  limitSeconds: number
  /** 有录音可回放时传入 objectURL;文字稿段落同时变得可点击跳播 */
  audioUrl?: string | null
  /** 题型;有则在评分下显示"观点"维度的题型化含义 */
  category?: Category
  /** 插在「最需要修改的两点」区块后的内容(结果页用来放主按钮,避免长页面底部才看到) */
  afterImprovements?: ReactNode
}

/**
 * 分析结果的全部内容区块(诊断/评分/数据/反馈/文字稿/提纲),
 * 结果页与历史详情页共用。
 */
export default function ResultSections({ analysis, limitSeconds, audioUrl, category, afterImprovements }: ResultSectionsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { metrics } = analysis
  const overtimeSeconds = metrics.durationSeconds - limitSeconds
  const isOvertime = overtimeSeconds > limitSeconds * 0.05
  const topFillers = analysis.fillerWords.slice(0, 3)
  // 历史数据里的旧分类「申论」按「公考面试」处理
  const cat = normalizeCategory(category)
  const viewpointHint = cat ? VIEWPOINT_HINTS[cat] : undefined

  // 表达课方法:四项分中的最低分维度(同分按 观点→结构→内容→流畅度 顺序取先)
  const dimKeys = Object.keys(DIMENSION_LABELS) as Array<keyof AnalysisResult['scores']>
  const weakestDim = dimKeys.reduce((a, b) => (analysis.scores[b] < analysis.scores[a] ? b : a))
  const weakestScore = analysis.scores[weakestDim]
  const remedyConcepts = DIMENSION_REMEDIES[weakestDim]
    .map((id) => getConceptById(id))
    .filter((c) => c !== undefined)

  return (
    <>
      {audioUrl && (
        <section className="result-section">
          <audio ref={audioRef} controls src={audioUrl} className="audio-player" />
        </section>
      )}

      <section className="result-section diagnosis">
        <h2>一句话诊断</h2>
        <p className="diagnosis-text">{analysis.summary}</p>
      </section>

      <section className="result-section">
        <h2>四项评分</h2>
        <ScoreCard scores={analysis.scores} overallScore={analysis.overallScore} />
        {cat && viewpointHint && (
          <p className="score-hint">
            {cat === '随心记'
              ? `没有题目,"观点"维度看:${viewpointHint}`
              : STRUCTURE_HINTS[cat]
                ? `本题是${cat}类:"观点"看${viewpointHint},"结构"看${STRUCTURE_HINTS[cat]},"内容"看${CONTENT_HINTS[cat]}`
                : `本题是${cat}类,"观点"维度看:${viewpointHint}`}
          </p>
        )}
      </section>

      <section className="result-section">
        <h2>基础数据</h2>
        <dl className="metrics-grid">
          <div>
            <dt>录音时长</dt>
            <dd>
              {formatTime(metrics.durationSeconds)} / 限时 {formatTime(limitSeconds)}
            </dd>
          </div>
          <div>
            <dt>总字数</dt>
            <dd>{metrics.totalCharacters} 字</dd>
          </div>
          <div>
            <dt>平均语速</dt>
            <dd>{metrics.wordsPerMinute} 字/分钟</dd>
          </div>
          <div>
            <dt>口癖总数</dt>
            <dd>{metrics.fillerWordCount} 次</dd>
          </div>
          <div>
            <dt>高频口癖</dt>
            <dd>
              {topFillers.length > 0
                ? topFillers.map((f) => `${f.word} × ${f.count}`).join('、')
                : '无'}
            </dd>
          </div>
          <div>
            <dt>最长停顿</dt>
            <dd>{metrics.longestPauseSeconds} 秒</dd>
          </div>
          <div>
            <dt>是否超时</dt>
            <dd>{isOvertime ? `超时 ${Math.round(overtimeSeconds)} 秒` : '未超时'}</dd>
          </div>
          <div>
            <dt>明确结尾</dt>
            <dd>{metrics.hasConclusion ? '有' : '没有'}</dd>
          </div>
          <div>
            <dt>识别结构</dt>
            <dd>{analysis.detectedStructure}</dd>
          </div>
        </dl>
      </section>

      <section className="result-section">
        <h2>最好的两点</h2>
        <div className="feedback-cards">
          {analysis.strengths.map((item) => (
            <div key={item.title} className="feedback-card strength">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="result-section">
        <h2>最需要修改的两点</h2>
        <div className="feedback-cards">
          {analysis.improvements.map((item) => (
            <div key={item.title} className="feedback-card improvement">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.transcriptQuote && (
                <blockquote className="feedback-quote">
                  你说:"{item.transcriptQuote}"
                  {item.timestamp !== undefined && (
                    <span> (约第 {Math.round(item.timestamp)} 秒)</span>
                  )}
                </blockquote>
              )}
              <p className="feedback-suggestion">建议:{item.suggestion}</p>
            </div>
          ))}
        </div>
      </section>

      {afterImprovements}

      <section className="result-section">
        <h2>完整文字稿</h2>
        <Transcript
          segments={analysis.transcript}
          onSeek={audioUrl ? (seconds) => seekAudio(audioRef.current, seconds) : undefined}
        />
      </section>

      <section className="result-section">
        <h2>改进提纲(第二次这么说)</h2>
        <ol className="outline-list">
          {analysis.improvedOutline.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="outline-note">提纲保留了你的原观点,不追求完美,只需要再说一次。</p>
      </section>

      <section className="result-section">
        <h2>表达课方法</h2>
        {weakestScore >= NO_WEAKNESS_THRESHOLD ? (
          <p className="course-more">
            这次没有明显短板,去<Link to="/course">「表达课」</Link>挑一个方法继续精进。
          </p>
        ) : (
          <>
            <p className="course-more">「{DIMENSION_LABELS[weakestDim]}」是相对短板,表达课里有对应的方法:</p>
            <div className="concept-grid">
              {remedyConcepts.map((c) => (
                <div key={c.id} className="concept-card compact">
                  <h3>{c.name}</h3>
                  <p>{c.oneLiner}</p>
                  <p className="concept-usage">{c.howToUse}</p>
                  <p className="concept-source">{c.source}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  )
}
