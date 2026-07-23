/**
 * 文字稿点段跳转的组件级断言:
 * - 有 onSeek 时段落可点(角色/提示/回调参数 = 该段 startTime)
 * - 无 onSeek 时不出现可点样式
 * - ResultSections 有 audioUrl 时,点击段落真正把 <audio> 定位到对应秒数并播放;
 *   无 audioUrl(刷新后音频不存在)时段落不可点
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisResult } from '../types/analysis'
import Transcript from './Transcript'
import ResultSections from './ResultSections'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SEGMENTS: AnalysisResult['transcript'] = [
  { id: 's1', startTime: 0, endTime: 10, text: '第一段内容', tags: ['viewpoint'] },
  { id: 's2', startTime: 12.5, endTime: 25, text: '第二段内容', tags: ['example'] },
]

function makeAnalysis(): AnalysisResult {
  return {
    overallScore: 80,
    scores: { viewpoint: 80, structure: 75, content: 82, fluency: 78 },
    summary: '主干清楚,口癖偏多。',
    strengths: [{ title: '观点前置', description: '第一句就给了结论。', suggestion: '继续保持。' }],
    improvements: [
      { title: '口癖偏多', description: '「然后」出现 8 次。', suggestion: '换成「接下来」。' },
    ],
    metrics: {
      durationSeconds: 60,
      totalCharacters: 200,
      wordsPerMinute: 200,
      fillerWordCount: 8,
      longestPauseSeconds: 1.5,
      viewpointFirstAppearedAt: 2,
      exampleCount: 1,
      hasConclusion: true,
    },
    fillerWords: [],
    transcript: SEGMENTS,
    detectedStructure: '观点—理由—例子—总结',
    improvedOutline: ['先表态', '补一个例子', '一句话收尾'],
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('Transcript onSeek', () => {
  it('有 onSeek:段落可点,回调收到该段 startTime,带 hover 提示', () => {
    const onSeek = vi.fn()
    act(() => {
      root.render(<Transcript segments={SEGMENTS} onSeek={onSeek} />)
    })
    const segs = container.querySelectorAll('.transcript-segment')
    expect(segs).toHaveLength(2)
    const second = segs[1]
    expect(second.getAttribute('role')).toBe('button')
    expect(second.classList.contains('transcript-segment-seekable')).toBe(true)
    expect(second.getAttribute('title')).toContain('00:13')
    click(second)
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(12.5)
  })

  it('无 onSeek:段落不可点,无可点样式与角色', () => {
    act(() => {
      root.render(<Transcript segments={SEGMENTS} />)
    })
    const segs = container.querySelectorAll('.transcript-segment')
    expect(segs[0].getAttribute('role')).toBeNull()
    expect(segs[0].classList.contains('transcript-segment-seekable')).toBe(false)
    expect(segs[0].getAttribute('title')).toBeNull()
  })
})

describe('ResultSections 音频跳播', () => {
  it('有 audioUrl:点击段落把播放器定位到该段 startTime 并播放', () => {
    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())
    act(() => {
      root.render(
        <ResultSections analysis={makeAnalysis()} limitSeconds={60} audioUrl="blob:fake" />,
      )
    })
    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    const segs = container.querySelectorAll('.transcript-segment-seekable')
    expect(segs).toHaveLength(2)
    click(segs[1])
    expect(audio!.currentTime).toBe(12.5)
    expect(playSpy).toHaveBeenCalled()
    playSpy.mockRestore()
  })

  it('无 audioUrl(刷新后音频不存在):不渲染播放器,段落不可点', () => {
    act(() => {
      root.render(<ResultSections analysis={makeAnalysis()} limitSeconds={60} />)
    })
    expect(container.querySelector('audio')).toBeNull()
    expect(container.querySelectorAll('.transcript-segment-seekable')).toHaveLength(0)
  })
})
