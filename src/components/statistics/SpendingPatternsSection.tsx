import { useState } from "react"
import { Activity, ChevronDown, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { BehavioralPattern } from "../../lib/financialMath"
import { triggerHaptic } from "../../lib/haptics"

interface SpendingPatternsSectionProps {
  patterns: BehavioralPattern[]
}

export function SpendingPatternsSection({ patterns }: SpendingPatternsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!patterns || patterns.length === 0) {
    return null
  }

  return (
    <section
      className="glass-surface rounded-[24px] overflow-hidden transition-all"
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--bg-elevated)",
      }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setIsExpanded(!isExpanded)
          triggerHaptic("light")
        }}
        className="w-full p-4 flex items-center justify-between text-left select-none active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "var(--glass-fill-strong)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Activity size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                Spending Patterns
              </span>
              <span
                className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {patterns.length} Verified
              </span>
            </div>
            <p className="text-[13px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {patterns[0].title}
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      {/* Expandable Pattern Cards */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-1 space-y-2.5 border-t border-[var(--glass-border)] text-[12px]">
              {patterns.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl space-y-1.5"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      {p.badge}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                      Historical Pattern
                    </span>
                  </div>

                  <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                    {p.title}
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {p.subtitle}
                  </p>
                  <div className="pt-1 border-t border-[var(--glass-border)] flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    <CheckCircle2 size={11} className="flex-shrink-0" style={{ color: "var(--text-primary)" }} />
                    <span>{p.evidence}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
