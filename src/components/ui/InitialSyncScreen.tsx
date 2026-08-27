import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database, CheckCircle2 } from "lucide-react"
import { preloadAllIcons } from "../../lib/assetPreloader"

interface InitialSyncScreenProps {
  onComplete?: () => void
  totalCount?: number
  isDataReady?: boolean
  progress?: number
  statusText?: string
}

export function InitialSyncScreen({
  onComplete,
  totalCount: _totalCount = 0,
  isDataReady = false,
  progress: externalProgress,
  statusText: externalStatusText,
}: InitialSyncScreenProps) {
  const [internalProgress, setInternalProgress] = useState(20)
  const [internalStatusText, setInternalStatusText] = useState("Downloading app icons & assets...")
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false)

  const displayProgress = externalProgress !== undefined ? externalProgress : internalProgress
  const displayStatus = externalStatusText || internalStatusText

  useEffect(() => {
    let isMounted = true

    preloadAllIcons().then(() => {
      if (!isMounted) return
      setIsAssetsLoaded(true)
      setInternalProgress(prev => Math.max(prev, 35))
      setInternalStatusText("Syncing cloud data & accounts...")
    }).catch(() => {
      if (!isMounted) return
      setIsAssetsLoaded(true)
      setInternalProgress(prev => Math.max(prev, 35))
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (displayProgress >= 100 && isAssetsLoaded && isDataReady) {
      const t = setTimeout(() => {
        onComplete?.()
      }, 500)
      return () => clearTimeout(t)
    }
  }, [displayProgress, isAssetsLoaded, isDataReady, onComplete])

  // Safety fallback: 25s timeout guarantee in case of catastrophic network disconnect
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      onComplete?.()
    }, 25000)

    return () => clearTimeout(safetyTimer)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none px-8"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Wave Dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <motion.div
          animate={{ y: [0, -10, 0], opacity: [0.35, 1, 0.35], scale: [0.88, 1.12, 0.88] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0 }}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--text-primary)" }}
        />
        <motion.div
          animate={{ y: [0, -10, 0], opacity: [0.35, 1, 0.35], scale: [0.88, 1.12, 0.88] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.18 }}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--text-primary)" }}
        />
        <motion.div
          animate={{ y: [0, -10, 0], opacity: [0.35, 1, 0.35], scale: [0.88, 1.12, 0.88] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.36 }}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--text-primary)" }}
        />
      </div>

      {/* Sync Card */}
      <div
        className="w-full max-w-[320px] p-5 rounded-[24px] text-center glass-surface space-y-3.5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 8px 32px var(--shadow-strength)",
        }}
      >
        <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
          {displayProgress >= 100 ? <CheckCircle2 size={20} style={{ color: "var(--accent)" }} /> : <Database size={18} />}
        </div>

        <div>
          <h3 className="font-extrabold text-[15px] tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
            Initial Sync
          </h3>
          <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
            {displayStatus}
          </p>
        </div>

        {/* Smooth Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-fill)" }}>
            <motion.div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(5, displayProgress))}%`,
                background: "var(--accent)",
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold" style={{ color: "var(--text-tertiary)" }}>
            <span>Progress</span>
            <span>{Math.min(100, Math.round(displayProgress))}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
