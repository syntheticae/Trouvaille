import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, ChevronRight, AlertCircle, TrendingUp, ShieldAlert, CheckCircle2 } from "lucide-react"
import type { ActionCenterInsight } from "../../lib/financialMath"
import { triggerHaptic } from "../../lib/haptics"
import { BottomSheet } from "../ui/BottomSheet"

interface ActionCenterCardProps {
  insight: ActionCenterInsight
  onOpenCategoryDetail?: (categoryId: string) => void
}

export function ActionCenterCard({ insight, onOpenCategoryDetail }: ActionCenterCardProps) {
  const navigate = useNavigate()
  const [detailOpen, setDetailOpen] = useState(false)

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic("light")

    if (insight.actionType === "statistics") {
      navigate("/statistics")
    } else if (insight.actionType === "budget") {
      navigate("/settings")
    } else if (insight.actionType === "bills") {
      navigate("/settings")
    } else if (insight.actionType === "transactions") {
      navigate("/transactions")
    } else if (insight.actionType === "category_detail" && insight.actionParam) {
      if (onOpenCategoryDetail) {
        onOpenCategoryDetail(insight.actionParam)
      } else {
        navigate("/statistics")
      }
    } else {
      setDetailOpen(true)
    }
  }

  const getIcon = () => {
    switch (insight.type) {
      case "projected_overrun":
      case "budget_risk":
        return <ShieldAlert size={14} className="text-white" />
      case "spending_pace":
        return <TrendingUp size={14} className="text-white" />
      case "category_spike":
        return <AlertCircle size={14} className="text-white" />
      case "safety_buffer":
        return <AlertCircle size={14} className="text-white" />
      default:
        return <CheckCircle2 size={14} className="text-white" />
    }
  }

  return (
    <>
      <section
        onClick={() => { setDetailOpen(true); triggerHaptic("light"); }}
        className="glass-surface p-4 rounded-[24px] relative overflow-hidden active:scale-[0.99] transition-all cursor-pointer select-none"
        style={{
          border: "1px solid var(--glass-border)",
          background: "var(--bg-elevated)"
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255, 255, 255, 0.12)" }}
            >
              {getIcon()}
            </div>
            <span
              className="text-[10px] font-extrabold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              {insight.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleActionClick}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-transform"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)"
            }}
          >
            <span>{insight.actionLabel}</span>
            <ChevronRight size={12} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <h3 className="text-[14px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          {insight.title}
        </h3>
        <p className="text-[11px] font-medium mt-1 leading-normal" style={{ color: "var(--text-secondary)" }}>
          {insight.subtitle}
        </p>
      </section>

      {/* Drill-down BottomSheet */}
      <BottomSheet
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={insight.drillDownDetails?.headline || "Financial Insight"}
      >
        <div className="space-y-4 pb-6">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {insight.drillDownDetails?.explanation}
          </p>

          {insight.drillDownDetails?.bulletPoints && insight.drillDownDetails.bulletPoints.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Key Contributors & Run-Rate
              </p>
              {insight.drillDownDetails.bulletPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl flex items-center justify-between text-[12px] font-bold"
                  style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
                >
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full py-3.5 rounded-2xl text-[13px] font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-transform"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)"
              }}
            >
              <span>{insight.actionLabel}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
