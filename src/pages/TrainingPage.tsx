import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import AudioRecorder from '../components/AudioRecorder'
import Countdown from '../components/Countdown'
import { mockTranscript, mockTranscriptImproved } from '../data/mockAnalysis'
import { isFreeTopic, isInterviewTopic } from '../data/topics'
import { analyzeWithAI, fetchPrepHints } from '../services/aiAnalysisService'
import type { AsrSegment, WordTimestamp } from '../services/analysisService'
import {
  SpeechTranscriber,
  checkAsrReady,
  isSpeechRecognitionSupported,
  transcribeAudio,
  type LiveSegment,
  type WhisperResult,
} from '../services/transcriptionService'
import type { TrainingPhase, TrainingSession } from '../types/training'
import { detectFillerWords } from '../utils/fillerWords'
import {
  clearSession,
  loadAttempts,
  loadSession,
  loadSettings,
  resolveTrainingSettings,
  saveAttempt,
  saveAudioBlob,
  saveHistoryEntry,
  saveSession,
} from '../utils/storage'
import { putAudio } from '../utils/audioStore'

const THINKING_TIPS = [
  '我的核心观点是什么?',
  '我准备说哪两点?',
  '有没有一个具体例子?',
  '最后如何总结?',
]

/** 准备阶段可选的三套表达框架(出自表达课视频13/16;文案见 courseConcepts.ts 对应卡片) */
const PREP_FRAMEWORKS = [
  {
    id: 'time',
    short: '过去—现在—未来',
    name: '过去—现在—未来',
    desc: '即兴谈看法的万能框架:过去问"为什么"(什么经历造就这感受),未来问"我希望"(希望听众如何行动),比例不必 1:1:1。',
  },
  {
    id: 'umbrella',
    short: '空雨伞',
    name: '空雨伞:事实—分析—行动',
    desc: '先摆事实背景(空),再指出问题(雨),最后给行动方案(伞);可换序、可调比例。',
  },
  {
    id: '3c',
    short: '3C',
    name: '3C:现状—冲突—行动',
    desc: '抛出现状问题,用"有人觉得"铺垫共识,再用"但我觉得"亮明主张、形成鲜明对比。',
  },
]

/** 公考面试题 subtype → 参考框架(与 server/app.py 的 INTERVIEW_SUBTYPE_FRAMEWORKS 同一份对照) */
const INTERVIEW_FRAMEWORKS: Record<string, string> = {
  社会现象: '九宫格:态度评价 / 背景影响 / 原因 / 问题对策',
  态度观点: '三板斧:先分析 a,再分析 b,最后辩证统一',
  计划组织: '明确目的 — 筹备 — 开展 — 总结',
  应急应变: '稳定局面 — 轻重缓急 — 逐一解决 — 复盘预防',
  人际关系: '理解尊重 — 沟通换位 — 解决 — 自省',
  情景模拟: '开场白 — 动之以情晓之以理 — 给出办法 — 自然收尾',
  其他: '是什么 — 为什么 — 怎么办',
}

/** 实时转写低于该字数时,降级使用内置文字稿,保证流程完整 */
const MIN_REAL_TRANSCRIPT_CHARS = 15

export default function TrainingPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<TrainingSession | null>(() => loadSession())
  // 公考面试题且用户未手动改过时间时,自动采用面试节奏(思考60秒/作答3分钟/场景=面试)
  const settings = useMemo(
    () => resolveTrainingSettings(loadSettings(), isInterviewTopic(loadSession()?.topic ?? {})),
    [],
  )
  // 刷新后 recording/analyzing 无法恢复(麦克风与音频都已释放),回到准备阶段重来
  const [phase, setPhase] = useState<TrainingPhase>('preparing')
  const [analyzingHint, setAnalyzingHint] = useState('正在分析你的表达……')
  const [resetKey, setResetKey] = useState(0)
  const [liveSegments, setLiveSegments] = useState<LiveSegment[]>([])
  const [interim, setInterim] = useState('')
  const [tips, setTips] = useState<string[]>(THINKING_TIPS)
  const [frameworkId, setFrameworkId] = useState<string | null>(null)
  const transcriberRef = useRef<SpeechTranscriber | null>(null)

  const improvementGoals = useMemo(() => {
    if (session?.attemptNumber !== 2) return []
    return loadAttempts().first?.analysis.improvements.map((i) => i.title) ?? []
  }, [session?.attemptNumber])

  const isFree = session ? isFreeTopic(session.topic) : false
  const isInterview = session ? isInterviewTopic(session.topic) : false
  const selectedFramework = PREP_FRAMEWORKS.find((f) => f.id === frameworkId) ?? null

  // 随心记:不出题不准备,直接进录音
  useEffect(() => {
    if (isFree && phase === 'preparing') setPhase('recording')
  }, [isFree, phase])

  // 准备阶段:先显示默认四条提示,后台请求 AI 的针对性提示,返回后静默替换。
  // 准备时间为 0 时直接进录音,不发请求。
  useEffect(() => {
    if (!session || phase !== 'preparing' || settings.prepareSeconds === 0) return
    setTips(THINKING_TIPS)
    let cancelled = false
    void fetchPrepHints({
      topic: session.topic.title,
      category: session.topic.category,
      subtype: session.topic.subtype,
      scenario: settings.scene,
      audience: settings.audience,
    }).then((hints) => {
      if (!cancelled && hints) setTips(hints)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.topic.id, phase, settings.prepareSeconds])

  // 准备时间为 0 时直接进录音
  useEffect(() => {
    if (session && phase === 'preparing' && settings.prepareSeconds === 0) {
      setPhase('recording')
    }
  }, [session, phase, settings.prepareSeconds])

  // 录音阶段管理实时转写;resetKey 变化(重新开始)时重建
  useEffect(() => {
    if (phase !== 'recording') return
    setLiveSegments([])
    setInterim('')
    if (!isSpeechRecognitionSupported()) return
    const transcriber = new SpeechTranscriber()
    transcriberRef.current = transcriber
    transcriber.start((segments, interimText) => {
      setLiveSegments(segments)
      setInterim(interimText)
    })
    return () => {
      transcriberRef.current = null
      transcriber.stop()
    }
  }, [phase, resetKey])

  // 阶段变化同步到 localStorage,刷新后可提示"继续上次训练"
  useEffect(() => {
    if (session) saveSession({ ...session, phase })
  }, [session, phase])

  if (!session) {
    return (
      <div className="page page-center">
        <p className="empty-notice">当前没有进行中的训练。</p>
        <Link to="/" className="btn btn-primary">
          回到首页
        </Link>
      </div>
    )
  }

  const startRecording = () => setPhase('recording')

  const liveText = liveSegments.map((s) => s.text).join('') + interim
  const fillerCounts = liveText
    ? detectFillerWords(liveText, 60).map(({ word, count }) => ({ word, count }))
    : []

  const handleFinish = (blob: Blob | null, durationSeconds: number) => {
    const liveSegs = transcriberRef.current?.stop() ?? liveSegments
    if (blob) saveAudioBlob(session.attemptNumber, blob)
    // 长录音(面试 3-5 分钟)CPU 转写要等一两分钟,文案提前打招呼,免得以为卡死
    setAnalyzingHint(
      durationSeconds >= 90
        ? `正在转写这段约 ${Math.round(durationSeconds / 60)} 分钟的录音,可能要等 1–2 分钟……`
        : '正在转写录音……',
    )
    setPhase('analyzing')

    void (async () => {
      // 1. 优先后端 faster-whisper(词级时间戳);不可用则静默继续降级链
      let whisper: WhisperResult | null = null
      if (blob && (await checkAsrReady())) {
        whisper = await transcribeAudio(blob)
      }

      // 2. 决定文字稿:Whisper > Web Speech 实时稿 > 内置 mock
      const webSpeechText = liveSegs.map((s) => s.text).join('')
      let transcriptText: string
      let useMock: boolean
      let liveForAnalysis: LiveSegment[] | undefined
      let words: WordTimestamp[] | undefined
      let asrSegments: AsrSegment[] | undefined
      if (whisper) {
        transcriptText = whisper.segments.map((s) => s.text).join('')
        useMock = false
        words = whisper.words
        asrSegments = whisper.segments
      } else if (webSpeechText.replace(/\s/g, '').length >= MIN_REAL_TRANSCRIPT_CHARS) {
        transcriptText = webSpeechText
        useMock = false
        liveForAnalysis = liveSegs
      } else {
        transcriptText = session.attemptNumber === 1 ? mockTranscript : mockTranscriptImproved
        useMock = true
      }

      // 3. 等 AI 分析返回再进结果页;AI 失败/超时自动回退本地启发式
      setAnalyzingHint('AI 正在分析你的表达,可能需要几十秒……')
      // 随心记:题目快照用文字稿第一句话截取约 20 字
      const topicTitle = isFree
        ? transcriptText.replace(/[\s，。!！？?、…,.!?]+/g, ' ').trim().slice(0, 20) || '随心记'
        : session.topic.title
      const topicForAnalysis = isFree ? { ...session.topic, title: topicTitle } : session.topic
      const analysis = await analyzeWithAI({
        transcriptText,
        durationSeconds: Math.max(durationSeconds, 1),
        topic: topicForAnalysis,
        limitSeconds: settings.answerSeconds,
        liveSegments: liveForAnalysis,
        words,
        asrSegments,
        scenario: settings.scene,
        audience: settings.audience,
        intendedFramework: !isInterview && selectedFramework ? selectedFramework.name : undefined,
      })
      const sessionId = session.sessionId ?? crypto.randomUUID()
      saveAttempt({
        attemptNumber: session.attemptNumber,
        topicId: session.topic.id,
        topicTitle,
        topicCategory: session.topic.category,
        transcriptText,
        usedMockTranscript: useMock,
        durationSeconds: Math.round(durationSeconds),
        analysis,
        createdAt: Date.now(),
        sessionId,
      })
      // 训练历史落盘;音频进 IndexedDB(历史详情可回放)
      const historyId = `${sessionId}:${session.attemptNumber}`
      saveHistoryEntry({
        id: historyId,
        savedAt: Date.now(),
        sessionId,
        attemptNumber: session.attemptNumber,
        topic: { ...session.topic, title: topicTitle },
        settings,
        analysis,
        transcriptText,
        durationSeconds: Math.round(durationSeconds),
        usedMockTranscript: useMock,
      })
      if (blob) void putAudio(historyId, blob)
      clearSession()
      setSession(null)
      navigate(session.attemptNumber === 1 ? '/result' : '/compare', { replace: true })
    })()
  }

  const handleRestart = () => {
    // 防误触:按钮就在「结束录音」旁边,点错一次就毁掉一段可能很好的录音
    if (!window.confirm('重新开始会丢弃当前这段录音,确定重录?')) return
    setResetKey((k) => k + 1)
  }

  if (phase === 'analyzing') {
    return (
      <div className="page page-center">
        <div className="spinner" />
        <p className="analyzing-text">{analyzingHint}</p>
        <p className="analyzing-sub">转写在你自己电脑上进行,完成后自动跳转,别刷新或关闭页面。停顿不是错误,这一次只要比上一次更具体。</p>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="page page-center">
        <AudioRecorder
          key={resetKey}
          topicTitle={isFree ? '随心记' : session.topic.title}
          limitSeconds={settings.answerSeconds}
          freeMode={isFree}
          liveText={liveText}
          fillerCounts={fillerCounts}
          timeLabel={isInterview ? '作答时间' : undefined}
          goals={improvementGoals}
          onFinish={handleFinish}
          onRestart={handleRestart}
        />
        {selectedFramework && !isInterview && (
          <p className="framework-note">框架:{selectedFramework.short}</p>
        )}
        {!isSpeechRecognitionSupported() && (
          <p className="recorder-asr-note">当前浏览器不支持实时字幕(建议用 Chrome/Edge);没有字幕不影响最终分析。</p>
        )}
      </div>
    )
  }

  return (
    <div className="page page-center preparing">
      <p className="preparing-label">
        {session.attemptNumber === 2
          ? isInterview
            ? '第二次作答 · 同一个题目'
            : '第二次回答 · 同一个题目'
          : isInterview
            ? '思考时间'
            : '准备一下'}
      </p>
      <h1 className="preparing-topic">{session.topic.title}</h1>
      <p className="preparing-meta">
        <span className="chip">{session.topic.category}</span>
        <span className="chip">{session.topic.difficulty}</span>
        <span className="chip">{settings.scene}</span>
        <span className="chip">{settings.audience}</span>
      </p>

      <Countdown seconds={settings.prepareSeconds} onComplete={startRecording} />
      <p className="preparing-autostart">
        到点自动开始{isInterview ? '作答' : '录音'},想好了就点下面按钮,不用等满
      </p>

      <div className="tips-box">
        <h2>
          用这 {settings.prepareSeconds >= 60 ? `${settings.prepareSeconds / 60} 分钟` : `${settings.prepareSeconds} 秒`} 只想这几件事
        </h2>
        <ol>
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      </div>

      {!isInterview ? (
        <div className="framework-box">
          <h2>搭个框架(可选)</h2>
          <div className="framework-cards">
            {PREP_FRAMEWORKS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`framework-card ${frameworkId === f.id ? 'framework-active' : ''}`}
                onClick={() => setFrameworkId((cur) => (cur === f.id ? null : f.id))}
              >
                <span className="framework-name">{f.name}</span>
                {frameworkId === f.id && <span className="framework-desc">{f.desc}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        session.topic.subtype && (
          <div className="framework-box">
            <h2>参考框架({session.topic.subtype})</h2>
            <p className="framework-interview">{INTERVIEW_FRAMEWORKS[session.topic.subtype]}</p>
          </div>
        )
      )}

      {improvementGoals.length > 0 && (
        <div className="goals-box">
          <h2>本次最重要的两个改进目标</h2>
          <ol>
            {improvementGoals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ol>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-lg" onClick={startRecording}>
        <Play size={18} /> 立即开始
      </button>
    </div>
  )
}
