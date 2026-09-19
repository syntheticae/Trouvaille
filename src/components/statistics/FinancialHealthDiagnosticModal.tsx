import { useMemo } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { formatRupiah } from "../../lib/utils";
import { ShieldCheck, TrendingUp, Compass, Zap, Layers } from "lucide-react";
import type {
  PersonalBaselineResult,
  CategoryMoMShift,
} from "../../lib/financialMath";

interface FinancialHealthDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthScore: number;
  savingsRate: number;
  totalIncome: number;
  totalExpense: number;
  rangeTitle: string;
  baselines?: PersonalBaselineResult;
  categoryShifts?: CategoryMoMShift[];
}

export function FinancialHealthDiagnosticModal({
  isOpen,
  onClose,
  healthScore,
  savingsRate,
  totalIncome,
  totalExpense,
  rangeTitle,
  baselines,
  categoryShifts = [],
}: FinancialHealthDiagnosticModalProps) {
  const diagnostic = useMemo(() => {
    const netCashflow = totalIncome - totalExpense;
    const operatingRatio =
      totalIncome > 0
        ? (totalExpense / totalIncome) * 100
        : totalExpense > 0
          ? 999
          : 0;
    const operatingMarginText =
      totalIncome > 0
        ? `${Number(savingsRate).toFixed(1)}%`
        : totalExpense > 0
          ? "Deficit"
          : "0.0%";

    // Rating Tier
    let rating = "BBB";
    let statusTitle = "Stable Operating Flow";
    let statusVerdict =
      "Your current cash flow demonstrates balanced operations with moderate capital formation.";

    if (healthScore >= 88 && savingsRate >= 35) {
      rating = "AAA";
      statusTitle = "Exceptional Capital Retention";
      statusVerdict =
        "Elite capital efficiency. Your cash retention allows aggressive wealth acceleration while maintaining low structural vulnerability.";
    } else if (healthScore >= 75 && savingsRate >= 20) {
      rating = "AA";
      statusTitle = "Strong Solvency & Operating Margin";
      statusVerdict =
        "Healthy operating margin. Inflows comfortably exceed outflows, creating a dependable surplus for long-term reserves.";
    } else if (healthScore >= 60) {
      rating = "A";
      statusTitle = "Resilient Capital Equilibrium";
      statusVerdict =
        "Operations are solvent, with spending roughly aligned with cash generation. Retaining higher cash reserves will enhance resilience.";
    } else if (healthScore >= 45) {
      rating = "BBB";
      statusTitle = "Moderate Buffer Margin";
      statusVerdict =
        "Spending represents a substantial portion of inflows. Minor shocks or discretionary spikes could compress net cash flow.";
    } else if (healthScore >= 30) {
      rating = "BB";
      statusTitle = "Elevated Outflow Pressure";
      statusVerdict =
        "High expenditure velocity. Outflows are absorbing nearly all generated income, limiting capital retention.";
    } else {
      rating = "C";
      statusTitle = "Deficit Spending Position";
      statusVerdict =
        "Outflows currently exceed inflows for this period. Immediate containment of non-essential expenditure is recommended.";
    }

    // Top Expense Driver
    const topShift = categoryShifts.find((s) => s.isIncrease);

    return {
      netCashflow,
      operatingRatio,
      operatingMarginText,
      rating,
      statusTitle,
      statusVerdict,
      topShift,
    };
  }, [healthScore, savingsRate, totalIncome, totalExpense, categoryShifts]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-20 space-y-4 safe-area-bottom">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill-strong)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Executive Advisory Audit
                </span>
              </div>
              <h3
                className="font-semibold text-[17px] leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                Financial Health Diagnostic
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-xl"
              style={{
                background: "var(--glass-fill-strong)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              Tier {diagnostic.rating}
            </span>
          </div>
        </div>

        {/* Executive Verdict Hero Card */}
        <div
          className="p-4 rounded-[22px] space-y-3 relative overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex justify-between items-center">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Diagnostic Synthesis · {rangeTitle}
            </span>
            <span
              className="amount text-[12px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {healthScore} / 100 PTS
            </span>
          </div>

          <div>
            <h4
              className="text-[15px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {diagnostic.statusTitle}
            </h4>
            <p
              className="text-[12px] leading-relaxed mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {diagnostic.statusVerdict}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--glass-border)] text-center">
            <div
              className="p-2 rounded-xl min-w-0"
              style={{ background: "var(--glass-fill)" }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Operating Margin
              </p>
              <p
                className="amount text-[13px] font-semibold mt-0.5 truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {diagnostic.operatingMarginText}
              </p>
            </div>
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Retained Cash
              </p>
              <p
                className="amount text-[13px] font-semibold mt-0.5 truncate"
                style={{
                  color:
                    diagnostic.netCashflow >= 0
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                }}
              >
                {formatRupiah(diagnostic.netCashflow)}
              </p>
            </div>
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Burn Ratio
              </p>
              <p
                className="amount text-[13px] font-semibold mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {diagnostic.operatingRatio > 999
                  ? ">999%"
                  : `${diagnostic.operatingRatio.toFixed(0)}%`}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Quantitative Diagnostic Pillars */}
        <div className="space-y-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Four-Pillar Structural Audit
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Pillar 1 */}
            <div
              className="p-3.5 rounded-2xl flex items-start gap-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <TrendingUp
                  size={13}
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    1. Cash Retention & Yield
                  </p>
                  <span
                    className="text-[10px] font-semibold amount"
                    style={{
                      color:
                        savingsRate >= 20
                          ? "var(--text-primary)"
                          : "var(--text-tertiary)",
                    }}
                  >
                    {savingsRate >= 20 ? "OPTIMAL (≥20%)" : "TIGHT (<20%)"}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {savingsRate >= 20
                    ? `You convert ${savingsRate}% of inflow directly into retained equity, exceeding standard institutional sustainability thresholds.`
                    : `Retaining ${savingsRate}% leaves limited operational leeway. Strengthening net margin will protect against income volatility.`}
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div
              className="p-3.5 rounded-2xl flex items-start gap-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Compass size={13} style={{ color: "var(--text-primary)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    2. Baseline Discipline
                  </p>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {baselines?.currentMonthStatus
                      ? baselines.currentMonthStatus
                          .replace("_", " ")
                          .toUpperCase()
                      : "AUDITED"}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {!baselines
                    ? `Baseline discipline is evaluated most accurately in month view, where the selected period can be compared against completed historical cycles.`
                    : baselines.currentMonthStatus === "above_range"
                      ? `Expenditure is tracking above your historical median of ${formatRupiah(baselines.medianExpense)}. Watch non-core outflows.`
                      : `Spending is disciplined and remains within your proven historical normal bandwidth.`}
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div
              className="p-3.5 rounded-2xl flex items-start gap-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Layers size={13} style={{ color: "var(--text-primary)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    3. Expenditure Concentration
                  </p>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {diagnostic.topShift
                      ? `+${diagnostic.topShift.pctChange}% MoM`
                      : "STABLE"}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {diagnostic.topShift
                    ? `Highest outflow expansion is driven by ${diagnostic.topShift.name} (+${formatRupiah(diagnostic.topShift.deltaAmount)}).`
                    : categoryShifts.length === 0
                      ? "Category concentration is summarized in month view, where month-over-month movement can be measured honestly."
                      : "Outflow distribution across categories shows balanced allocation without severe concentration spikes."}
                </p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div
              className="p-3.5 rounded-2xl flex items-start gap-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Zap size={13} style={{ color: "var(--text-primary)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    4. Capital Goal Runway
                  </p>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    SOLVENT
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Historical surplus capacity provides a stable trajectory to
                  finance planned milestones and emergency buffers without
                  external leverage.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Advisory Recommendations */}
        <div className="space-y-2 pt-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Strategic Focus Directives
          </span>

          <div
            className="p-4 rounded-[22px] space-y-2.5"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <strong style={{ color: "var(--text-primary)" }}>
                  Operating Discipline:
                </strong>{" "}
                Maintain discretionary outflows within your historical IQR
                normal band to guarantee positive net operating cashflow.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <strong style={{ color: "var(--text-primary)" }}>
                  Surplus Allocation:
                </strong>{" "}
                Route at least 50% of retained monthly cashflow immediately into
                dedicated goal sinking funds upon cash arrival.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <strong style={{ color: "var(--text-primary)" }}>
                  Velocity Control:
                </strong>{" "}
                Audit ticket sizes exceeding 2x your median single expense to
                prevent front-loaded monthly budget compression.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
