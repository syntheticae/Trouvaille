import { useState } from "react"
import { ChevronDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { MonthlyFinancialReviewData } from "../../lib/financialMath"
import { formatRupiah } from "../../lib/utils"
import { triggerHaptic } from "../../lib/haptics"

interface MonthlyReviewSectionProps {
  review: MonthlyFinancialReviewData
  onCategoryClick?: (categoryName: string) => void
}

export function MonthlyReviewSection({ review, onCategoryClick }: MonthlyReviewSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <section
      className="glass-surface rounded-[24px] overflow-hidden transition-all"
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--bg-elevated)"
      }}
    >
      {/* Header (Expandable Trigger) */}
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
            <TrendingUp size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                Monthly Review
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}>
                {review.monthName} {review.year}
              </span>
            </div>
            <p className="text-[13px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {review.overview.netCashflow >= 0 ? "Surplus Cashflow Cycle" : "Deficit Spending Cycle"}
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

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-1 space-y-4 border-t border-[var(--glass-border)] text-[12px]">
              {/* 1. Overview Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl" style={{ background: "var(--glass-fill)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    Net Cashflow
                  </p>
                  <p className="amount text-[15px] font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {review.overview.netCashflow >= 0 ? "+" : ""}{formatRupiah(review.overview.netCashflow)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    Savings: {review.overview.savingsRate.toFixed(0)}% of Inflow
                  </p>
                </div>

                <div className="p-3 rounded-2xl" style={{ background: "var(--glass-fill)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    Activity
                  </p>
                  <p className="amount text-[15px] font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {review.overview.txCount} transactions
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    Avg {formatRupiah(review.overview.avgTransaction)} / tx
                  </p>
                </div>
              </div>

              {/* Baseline Historical Context Banner */}
              {review.baselineComparison && (
                <div
                  className="p-3 rounded-2xl flex items-center justify-between"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      Historical Baseline
                    </p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {review.baselineComparison.statusText}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--glass-border)"
                    }}
                  >
                    Band: {review.baselineComparison.typicalRangeText}
                  </span>
                </div>
              )}

              {/* 2. What Changed (MoM) */}
              {review.whatChanged.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider px-0.5" style={{ color: "var(--text-tertiary)" }}>
                    What Changed (Month-over-Month)
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {review.whatChanged.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => onCategoryClick?.(item.label)}
                        className="p-2.5 rounded-xl flex items-center justify-between active:bg-white/5 transition-colors cursor-pointer select-none"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <span className="font-bold text-[11px] truncate mr-1" style={{ color: "var(--text-primary)" }}>
                          {item.label}
                        </span>
                        <span className="text-[10px] font-extrabold amount shrink-0" style={{ color: item.isUp ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {item.changeText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. What Went Well */}
              {review.whatWentWell.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider px-0.5" style={{ color: "var(--text-tertiary)" }}>
                    What Went Well
                  </p>
                  <div className="space-y-1">
                    {review.whatWentWell.map((point, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl flex items-start gap-2 text-[11px] leading-snug"
                        style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
                      >
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-primary)" }} />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. What Needs Attention */}
              {review.whatNeedsAttention.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider px-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Points of Focus
                  </p>
                  <div className="space-y-1">
                    {review.whatNeedsAttention.map((point, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl flex items-start gap-2 text-[11px] leading-snug"
                        style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
                      >
                        <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-primary)" }} />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Next Month Outlook */}
              <div className="pt-2 border-t border-[var(--glass-border)]">
                <p className="text-[10px] font-bold uppercase tracking-wider px-0.5 mb-1" style={{ color: "var(--text-tertiary)" }}>
                  Run-Rate Trajectory
                </p>
                <p className="text-[11px] leading-relaxed italic" style={{ color: "var(--text-secondary)" }}>
                  "{review.nextMonthBaseline}"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
