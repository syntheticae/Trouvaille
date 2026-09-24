import { useState } from "react";
import {
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import type { ActionCenterInsight } from "../../lib/financialMath";
import type { Transaction } from "../../lib/types";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { MonthForecastSheet } from "./MonthForecastSheet";

interface ActionCenterCardProps {
  insight: ActionCenterInsight;
  onOpenCategoryDetail?: (categoryId: string) => void;
  transactions?: Transaction[];
  budgetTarget?: number;
  dailyAverage?: number;
  projectedMonthEnd?: number;
  totalExpense?: number;
  totalIncome?: number;
}

export function ActionCenterCard({
  insight,
  onOpenCategoryDetail: _onOpenCategoryDetail,
  transactions = [],
  budgetTarget = 0,
  dailyAverage,
  projectedMonthEnd,
  totalExpense = 0,
  totalIncome = 0,
}: ActionCenterCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { isIndonesian } = useLanguage();

  const getIcon = () => {
    switch (insight.type) {
      case "projected_overrun":
      case "budget_risk":
        return (
          <ShieldAlert size={14} style={{ color: "var(--text-primary)" }} />
        );
      case "spending_pace":
        return (
          <TrendingUp size={14} style={{ color: "var(--text-primary)" }} />
        );
      case "category_spike":
        return (
          <AlertCircle size={14} style={{ color: "var(--text-primary)" }} />
        );
      case "safety_buffer":
        return (
          <AlertCircle size={14} style={{ color: "var(--text-primary)" }} />
        );
      default:
        return (
          <CheckCircle2 size={14} style={{ color: "var(--text-primary)" }} />
        );
    }
  };

  return (
    <>
      <section
        onClick={() => {
          setDetailOpen(true);
          triggerHaptic("light");
        }}
        className="glass-surface p-4 rounded-[24px] relative overflow-hidden active:scale-[0.99] transition-all cursor-pointer select-none mb-3"
        style={{
          border: "1px solid var(--glass-border)",
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill-strong)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {isIndonesian ? "Perlu Tindakan" : "Action Required"}
                </span>
                {insight.badge && (
                  <>
                    <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      {insight.badge}
                    </span>
                  </>
                )}
              </div>
              <h3
                className="text-[13px] font-bold leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {insight.title}
              </h3>
              <p
                className="text-[11px] font-medium mt-0.5 leading-tight truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {insight.subtitle}
              </p>
            </div>
          </div>

          <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
        </div>
      </section>

      {/* Interactive Month Forecast & Trajectory Sheet (Elevated Financial Summary) */}
      <MonthForecastSheet
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        transactions={transactions}
        budgetTarget={budgetTarget}
        dailyAverage={dailyAverage}
        projectedMonthEnd={projectedMonthEnd}
        totalExpense={totalExpense}
        totalIncome={totalIncome}
        actionInsight={insight}
      />
    </>
  );
}
