const fs = require("fs");

const syncScreenCode = `import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database } from "lucide-react"
import { preloadAllIcons } from "../../lib/assetPreloader"

interface InitialSyncScreenProps {
  onComplete?: () => void
  totalCount?: number
}

export function InitialSyncScreen({ onComplete, totalCount }: InitialSyncScreenProps) {
  const [progress, setProgress] = useState(25)
  const [statusText, setStatusText] = useState("Mengunduh aset & ikon...")

  useEffect(() => {
    // Preload all 50+ icons into memory cache
    preloadAllIcons().then(() => {
      setProgress(prev => Math.max(prev, 65))
      setStatusText("Sinkronisasi data cloud...")
    })

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.floor(Math.random() * 10) + 5
      })
    }, 140)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (totalCount && totalCount > 0) {
      setProgress(100)
      setStatusText(\`\${totalCount} transaksi & semua ikon siap!\`)
      const t = setTimeout(() => {
        onComplete?.()
      }, 300)
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
            Sinkronisasi Total
          </h3>
          <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
            {statusText}
          </p>
        </div>

        {/* Smooth Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-fill)" }}>
            <motion.div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: \`\${progress}%\`, background: "var(--text-primary)" }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold px-0.5" style={{ color: "var(--text-tertiary)" }}>
            <span>{totalCount ? \`\${totalCount} transaksi\` : "Mengunduh data..."}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
`;

fs.writeFileSync("src/components/ui/InitialSyncScreen.tsx", syncScreenCode, "utf8");
console.log("Updated InitialSyncScreen.tsx with full icon preloading & sync");
