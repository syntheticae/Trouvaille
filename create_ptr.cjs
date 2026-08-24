const fs = require("fs");

const ptrHook = `import { useState, useEffect, useCallback } from "react"
import { triggerHaptic } from "../lib/haptics"

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<any> | void
  threshold?: number
}

export function usePullToRefresh({ onRefresh, threshold = 65 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY <= 5) {
      setStartY(e.touches[0].clientY)
    } else {
      setStartY(0)
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY === 0 || isRefreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0 && window.scrollY <= 5) {
      const distance = Math.min(threshold * 1.4, Math.pow(diff, 0.85))
      setPullDistance(distance)

      if (distance >= threshold && pullDistance < threshold) {
        triggerHaptic("medium")
      }
    }
  }, [startY, isRefreshing, threshold, pullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold)
      triggerHaptic("light")
      try {
        await onRefresh()
      } finally {
        setTimeout(() => {
          setIsRefreshing(false)
          setPullDistance(0)
        }, 400)
      }
    } else {
      setPullDistance(0)
    }
    setStartY(0)
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing, threshold }
}
`;

fs.writeFileSync("src/hooks/usePullToRefresh.ts", ptrHook, "utf8");
console.log("Created src/hooks/usePullToRefresh.ts");
