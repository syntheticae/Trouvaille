import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database } from "lucide-react"

interface InitialSyncScreenProps {
  onComplete?: () => void
  totalCount?: number
}

export function InitialSyncScreen({ onComplete, totalCount }: InitialSyncScreenProps) {
  const [progress, setProgress] = useState(15)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.floor(Math.random() * 15) + 5
      })
    }, 180)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (totalCount && totalCount > 0) {
      setProgress(100)
      const t = setTimeout(() => {
        onComplete?.()
      }, 400)
      return () => clearTimeout(t)
    }
  }, [totalCount, onComplete])

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
          <Database size={18} />
        </div>

        <div>
          <h3 className="font-extrabold text-[15px] tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
            Menyinkronkan Data
          </h3>
          <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
            Mengunduh transaksi, akun & kategori...
          </p>
        </div>

        {/* Smooth Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-fill)" }}>
            <motion.div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "var(--text-primary)" }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold px-0.5" style={{ color: "var(--text-tertiary)" }}>
            <span>{totalCount ? `${totalCount} transaksi siap` : "Memuat data dari cloud..."}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
