import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database, CheckCircle2 } from "lucide-react"
import { preloadAllIcons } from "../../lib/assetPreloader"

interface InitialSyncScreenProps {
  onComplete?: () => void
  totalCount?: number
  isDataReady?: boolean
}

export function InitialSyncScreen({ onComplete, totalCount = 0, isDataReady = false }: InitialSyncScreenProps) {
  const [progress, setProgress] = useState(25)
  const [statusText, setStatusText] = useState("Downloading app icons & assets...")
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true

    preloadAllIcons().then(() => {
      if (!isMounted) return
      setIsAssetsLoaded(true)
      setProgress(prev => Math.max(prev, 85))
      setStatusText("Syncing cloud data & accounts...")
    }).catch(() => {
      if (!isMounted) return
      setIsAssetsLoaded(true)
      setProgress(prev => Math.max(prev, 85))
    })

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + 6
      })
    }, 120)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (isAssetsLoaded && (isDataReady || totalCount >= 0)) {
      setProgress(100)
      setStatusText("Setup complete! Entering Trouvaille...")
      const t = setTimeout(() => {
        onComplete?.()
      }, 450)
      return () => clearTimeout(t)
    }
  }, [isAssetsLoaded, isDataReady, totalCount, onComplete])

  // Safety fallback: maximum 2.5s display before entering
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setProgress(100)
      setStatusText("Ready!")
      setTimeout(() => {
        onComplete?.()
      }, 300)
    }, 2500)

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
          {progress === 100 ? <CheckCircle2 size={20} style={{ color: "var(--accent)" }} /> : <Database size={18} />}
        </div>

        <div>
          <h3 className="font-extrabold text-[15px] tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
            Initial Sync
          </h3>
          <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
            {statusText}
          </p>
        </div>

        {/* Smooth Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-fill)" }}>
            <motion.div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(5, progress))}%`,
                background: "var(--accent)",
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold" style={{ color: "var(--text-tertiary)" }}>
            <span>Progress</span>
            <span>{Math.min(100, Math.round(progress))}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
