import { useState } from "react";
import { Activity, ChevronRight, Info } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { BottomSheet } from "../ui/BottomSheet";
import { triggerHaptic } from "../../lib/haptics";
import type { ExpenseVolatilityResult } from "../../lib/financialMath";

interface ExpenseVolatilityCardProps {
  volatility: ExpenseVolatilityResult;
  hideBalance?: boolean;
}

export function ExpenseVolatilityCard({
  volatility,
  hideBalance = false,
}: ExpenseVolatilityCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const getBadgeStyle = () => {
    switch (volatility.stability) {
      case "VOLATILE":
        return {
          background: "var(--text-primary)",
          color: "var(--bg-canvas)",
          border: "1px solid var(--text-primary)",
        };
      case "MODERATE":
        return {
          background: "var(--glass-fill-strong)",
          color: "var(--text-primary)",
          border: "1px solid var(--glass-border)",
        };
      case "STABLE":
      default:
        return {
          background: "var(--glass-fill-strong)",
          color: "var(--text-primary)",
          border: "1px solid var(--glass-border)",
        };
    }
  };

  return (
    <>
      <section
        onClick={() => {
          setDetailOpen(true);
          triggerHaptic("light");
        }}
        className="p-4 rounded-[24px] glass-surface cursor-pointer active:scale-[0.99] transition-transform select-none mb-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill-strong)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Activity size={14} />
            </div>
            <div>
              <p
                className="text-[10px] font-extrabold uppercase tracking-widest leading-none"
                style={{ color: "var(--text-tertiary)" }}
              >
                Spending Stability
              </p>
              <p
                className="text-[13px] font-bold mt-0.5 leading-none"
                style={{ color: "var(--text-primary)" }}
              >
                Expense Volatility
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              style={getBadgeStyle()}
            >
              {volatility.stability}
            </span>
            <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[var(--glass-border)]">
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Daily Average
            </p>
            <p
              className="amount text-[14px] font-extrabold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance
                ? "Rp ••••••••"
                : `${formatRupiah(volatility.meanDailyExpense)}/day`}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Peak Day Outlay
            </p>
            <p
              className="amount text-[14px] font-extrabold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance
                ? "Rp ••••••••"
                : formatRupiah(volatility.peakDailyExpense)}
            </p>
          </div>
        </div>

        {/* Volatility Indicator Bar */}
        <div className="mt-2.5">
          <div
            className="h-1.5 w-full rounded-full overflow-hidden flex gap-1 p-[1px]"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(10, volatility.score))}%`,
                background: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Micro-copy Reason */}
        <p
          className="text-[11px] font-medium mt-2 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {volatility.reason}
        </p>
      </section>

      {/* Volatility Analysis Drilldown BottomSheet */}
      <BottomSheet
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Spending Stability Analysis"
      >
        <div className="px-5 pb-10 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
            <Info size={16} className="shrink-0 mt-0.5" style={{ color: "var(--text-secondary)" }} />
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {volatility.explanation}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="p-3 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stability Status
              </p>
              <p
                className="text-[15px] font-extrabold mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {volatility.stability}
              </p>
            </div>
            <div
              className="p-3 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stability Score
              </p>
              <p
                className="amount text-[15px] font-extrabold mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {volatility.score} / 100
              </p>
            </div>
            <div
              className="p-3 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Daily Variation (Std Dev)
              </p>
              <p
                className="amount text-[15px] font-extrabold mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {hideBalance
                  ? "Rp ••••••••"
                  : `±${formatRupiah(volatility.standardDeviation)}`}
              </p>
            </div>
            <div
              className="p-3 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Active Days Ratio
              </p>
              <p
                className="amount text-[15px] font-extrabold mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {volatility.activeDaysCount} of {volatility.totalDaysInPeriod} days
              </p>
            </div>
          </div>

          <div
            className="p-3.5 rounded-2xl space-y-1.5"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <p
              className="text-[10px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Behavioral Takeaway
            </p>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            >
              {volatility.reason}
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
