import { useState, useEffect, useCallback } from "react"
import { triggerHaptic } from "../lib/haptics"

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<any> | void
  threshold?: number
}

export function usePullToRefresh({ onRefresh, threshold = 65 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState(0)

  const getScrollTop = () => {
    const el = document.getElementById("app-scroll-container")
    return el ? el.scrollTop : (window.scrollY || 0)
  }

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (getScrollTop() <= 2) {
      setStartY(e.touches[0].clientY)
    } else {
      setStartY(0)
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY === 0 || isRefreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 5 && getScrollTop() <= 2) {
      const distance = Math.min(threshold * 1.4, Math.pow(diff, 0.85))
      setPullDistance(distance)

      if (distance >= threshold && pullDistance < threshold) {
        triggerHaptic("medium")
      }
    } else if (pullDistance > 0) {
      setPullDistance(0)
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
    const el = document.getElementById("app-scroll-container") || window
    el.addEventListener("touchstart", handleTouchStart as any, { passive: true })
    el.addEventListener("touchmove", handleTouchMove as any, { passive: true })
    el.addEventListener("touchend", handleTouchEnd as any)

    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any)
      el.removeEventListener("touchmove", handleTouchMove as any)
      el.removeEventListener("touchend", handleTouchEnd as any)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing, threshold }
}
