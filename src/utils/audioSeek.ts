/**
 * 文字稿点段跳转:把播放器定位到 seconds 并继续播放。
 * 播放被浏览器自动播放策略拒绝时,定位依然生效(用户已在播放或手动点播放)。
 */
export function seekAudio(audio: HTMLMediaElement | null, seconds: number): void {
  if (!audio || !Number.isFinite(seconds)) return
  audio.currentTime = Math.max(0, seconds)
  const p = audio.play()
  if (p) p.catch(() => {})
}
