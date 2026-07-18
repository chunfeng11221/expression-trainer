import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import AudioRecorder from '../components/AudioRecorder'
import Countdown from '../components/Countdown'
import { mockTranscript, mockTranscriptImproved } from '../data/mockAnalysis'
import { analyzeWithAI } from '../services/aiAnalysisService'
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

/** 实时转写低于该字数时,降级使用内置文字稿,保证流程完整 */
const MIN_REAL_TRANSCRIPT_CHARS = 15

export default function TrainingPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<TrainingSession | null>(() => loadSession())
  const settings = useMemo(() => loadSettings(), [])
  // 刷新后 recording/analyzing 无法恢复(麦克风与音频都已释放),回到准备阶段重来
  const [phase, setPhase] = useState<TrainingPhase>('preparing')
  const [analyzingHint, setAnalyzingHint] = useState('正在分析你的表达……')
  const [resetKey, setResetKey] = useState(0)
  const [liveSegments, setLiveSegments] = useState<LiveSegment[]>([])
  const [interim, setInterim] = useState('')
  const transcriberRef = useRef<SpeechTranscriber | null>(null)

  const improvementGoals = useMemo(() => {
    if (session?.attemptNumber !== 2) return []
    return loadAttempts().first?.analysis.improvements.map((i) => i.title) ?? []
  }, [session?.attemptNumber])

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
    setAnalyzingHint('正在转写录音……')
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
      const analysis = await analyzeWithAI({
        transcriptText,
        durationSeconds: Math.max(durationSeconds, 1),
        topic: session.topic,
        limitSeconds: settings.answerSeconds,
        liveSegments: liveForAnalysis,
        words,
        asrSegments,
        scenario: settings.scene,
        audience: settings.audience,
      })
      const sessionId = session.sessionId ?? crypto.randomUUID()
      saveAttempt({
        attemptNumber: session.attemptNumber,
        topicId: session.topic.id,
        topicTitle: session.topic.title,
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
        topic: session.topic,
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

  const handleRestart = () => setResetKey((k) => k + 1)

  if (phase === 'analyzing') {
    return (
      <div className="page page-center">
        <div className="spinner" />
        <p className="analyzing-text">{analyzingHint}</p>
        <p className="analyzing-sub">AI 正在逐句点评,请稍等。停顿不是错误,这一次只要比上一次更具体。</p>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="page page-center">
        <AudioRecorder
          key={resetKey}
          topicTitle={session.topic.title}
          limitSeconds={settings.answerSeconds}
          liveText={liveText}
          fillerCounts={fillerCounts}
          onFinish={handleFinish}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  return (
    <div className="page page-center preparing">
      <p className="preparing-label">
        {session.attemptNumber === 2 ? '第二次回答 · 同一个题目' : '准备一下'}
      </p>
      <h1 className="preparing-topic">{session.topic.title}</h1>
      <p className="preparing-meta">
        <span className="chip">{session.topic.category}</span>
        <span className="chip">{session.topic.difficulty}</span>
        <span className="chip">{settings.scene}</span>
        <span className="chip">{settings.audience}</span>
      </p>

      <Countdown seconds={settings.prepareSeconds} onComplete={startRecording} />

      <div className="tips-box">
        <h2>用这 15 秒只想四件事</h2>
        <ol>
          {THINKING_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      </div>

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
