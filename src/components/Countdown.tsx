import { useEffect, useRef, useState } from 'react'

interface CountdownProps {
  seconds: number
  onComplete: () => void
}

/** 通用倒计时:每秒减一,归零时触发 onComplete */
export default function Countdown({ seconds, onComplete }: CountdownProps) {
  const [left, setLeft] = useState(seconds)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (left <= 0) {
      onCompleteRef.current()
      return
    }
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])

  return (
    <div className="countdown" aria-label={`倒计时 ${left} 秒`}>
      {left}
    </div>
  )
}
