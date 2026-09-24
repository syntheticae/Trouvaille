import { motion } from "framer-motion"
import { RefreshCw } from "lucide-react"

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold?: number
}

export function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 65 }: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null

  const progress = Math.min(1, pullDistance / threshold)
  const rotation = isRefreshing ? undefined : progress * 360

  return (
    <div
      className="fixed left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-transform duration-200"
      style={{
        top: "max(calc(env(safe-area-inset-top, 0px) + 8px), 16px)",
        transform: `translateY(${Math.max(0, pullDistance - 20)}px)`,
        opacity: Math.min(1, progress * 1.2),
      }}
    >
      <div
        className="px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 4px 16px var(--shadow-strength)",
        }}
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: rotation }}
          transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
          style={{ color: "var(--text-primary)" }}
        >
          <RefreshCw size={14} />
        </motion.div>
        <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
          {isRefreshing ? "Menyinkronkan..." : progress >= 1 ? "Lepas untuk refresh" : "Tarik untuk refresh"}
        </span>
      </div>
    </div>
  )
}
