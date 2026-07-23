import type { AnalysisResult } from '../types/analysis'

/** 把分析里的分段文字稿拼成纯文本(每段一行) */
export function plainTranscript(analysis: AnalysisResult): string {
  return analysis.transcript.map((seg) => seg.text).join('\n')
}

/** 复制到剪贴板;返回是否成功 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级:临时 textarea(老浏览器/权限受限)
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

/** 时间戳 → "20260721-2130" 用于文件名 */
function fileDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** 下载文字稿为 .txt(文件名带日期) */
export function downloadTranscriptTxt(analysis: AnalysisResult, timestamp: number, prefix = '随心记'): void {
  const blob = new Blob([plainTranscript(analysis)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}-${fileDateTime(timestamp)}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
