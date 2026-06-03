'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 400): number {
  const [value, setValue] = useState(target)
  const prev = useRef(target)
  const raf = useRef<number>(0)

  useEffect(() => {
    const from = prev.current
    const to = target
    if (from === to) return

    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (to - from) * ease))
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        prev.current = to
      }
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}
