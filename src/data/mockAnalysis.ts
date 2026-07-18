/**
 * 内置模拟数据:当真实转写不可用(浏览器不支持 SpeechRecognition、权限受限等)时,
 * 用这里的文字稿跑同一套启发式分析,保证完整流程始终可以演示。
 * - mockTranscript:第一次尝试(工作汇报类题目,约 1 分钟,口癖较多、观点靠后、例子不具体)
 * - mockTranscriptImproved:第二次重练(口癖更少、观点前置、新增具体例子),
 *   保证对比页有正向变化可展示。
 * 分析结果通过 analysisService 实时计算,与真实转写走完全相同的分析管线。
 */
import { analyzeTranscript } from '../services/analysisService'
import type { AnalysisResult } from '../types/analysis'
import type { Topic } from '../types/training'

export const MOCK_TOPIC: Topic = {
  id: 'work-4',
  title: '汇报一个近期完成的项目',
  category: '工作',
  difficulty: '简单',
}

export const MOCK_DURATION_SECONDS = 62
export const MOCK_DURATION_IMPROVED_SECONDS = 58

export const mockTranscript =
  '嗯……大家好,我简单汇报一下,呃,最近这个项目的情况。' +
  '就是,我们那个客户管理系统,啊,整体上是完成了,然后,中间其实遇到了一些问题。' +
  '然后呢,团队沟通,就是,有点不足,然后导致了,呃,项目中间有一段时间延期。' +
  '其实这个问题吧,怎么说呢,还是挺重要的,非常重要,就是团队协作这个事情,真的很有意义。' +
  '然后我觉得吧,项目管理里面,最核心的其实是沟通。' +
  '嗯,然后我们后来也做了一些调整,比如说开了几次会。' +
  '所以说,整体来说项目还是上线了。' +
  '以后我们会注意,就是,加强沟通。'

export const mockTranscriptImproved =
  '我认为,这个项目能上线,最关键的是中后期把沟通机制建立起来了。' +
  '第一,前期我们需求确认不够,和客户对功能的理解有偏差,导致开发返工,进度延期了2周。' +
  '第二,我们做了调整:从第3周开始,每天站会同步进度,每周和客户开1次评审会。' +
  '举个例子,第5周评审时客户当场指出报表口径不对,我们两天内就改完了,避免了上线后返工。' +
  '最后项目比原计划晚了1周交付,但上线后1个月的故障数只有2次。' +
  '所以我的结论是,项目里最贵的成本是沟通成本,早同步比晚返工便宜得多。'

/** 第一次尝试的模拟分析结果 */
export const mockAnalysisFirst: AnalysisResult = analyzeTranscript({
  transcriptText: mockTranscript,
  durationSeconds: MOCK_DURATION_SECONDS,
  topic: MOCK_TOPIC,
  limitSeconds: 60,
})

/** 第二次重练的模拟分析结果(相对第一次有明确正向变化) */
export const mockAnalysisSecond: AnalysisResult = analyzeTranscript({
  transcriptText: mockTranscriptImproved,
  durationSeconds: MOCK_DURATION_IMPROVED_SECONDS,
  topic: MOCK_TOPIC,
  limitSeconds: 60,
})
