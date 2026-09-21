import { useMemo, useState } from "react";
import { ArrowDown, ChevronDown, Layers3 } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../../lib/haptics";

export type ModelLayer = "actual" | "baseline" | "scenario";
export interface ModelFlowValues {
  income: number;
  committedExpenses: number;
  variableExpenses: number;
  retainedCash: number;
  savingsInvestment: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}
export interface PersonalFinancialModelInsights {
  currentNetWorth: number;
  historicalTrendLabel: string;
  historicalTrendValue: string;
  currentCashflow: number;
  personalBaseline: string;
  upcomingCommitments: number;
  goalTrajectory: string;
  scenarioImpact: string;
}

interface PersonalFinancialModelCardProps {
  hideBalance?: boolean;
  actual: ModelFlowValues;
  baseline: ModelFlowValues;
  scenario: ModelFlowValues;
  insights: PersonalFinancialModelInsights;
  onOpenDetails?: () => void;
}

function amountLabel(amount: number, hide: boolean) {
  if (hide) return "Rp ••••••••";
  return formatRupiah(amount);
}

export function PersonalFinancialModelCard({
  hideBalance = false,
  actual,
  baseline,
  scenario,
  insights,
  onOpenDetails,
}: PersonalFinancialModelCardProps) {
  const [layer, setLayer] = useState<ModelLayer>("actual");
  const [isExpanded, setIsExpanded] = useState(false);

  const active = useMemo(() => {
    if (layer === "baseline") return baseline;
    if (layer === "scenario") return scenario;
    return actual;
  }, [actual, baseline, layer, scenario]);

  const rows: Array<{ key: keyof ModelFlowValues; label: string }> = [
    { key: "income", label: "Income" },
    { key: "committedExpenses", label: "Committed Expenses" },
    { key: "variableExpenses", label: "Variable Expenses" },
    { key: "retainedCash", label: "Retained Cash" },
    { key: "savingsInvestment", label: "Savings / Investment" },
    { key: "assets", label: "Assets" },
    { key: "liabilities", label: "Liabilities" },
    { key: "netWorth", label: "Net Worth" },
  ];

  const layerLabel =
    layer === "actual"
      ? "Actual"
      : layer === "baseline"
        ? "Baseline"
        : "Scenario";

  return (
    <section
      className="glass-surface rounded-3xl overflow-hidden transition-all mb-3 select-none"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        type="button"
        onClick={() => {
          setIsExpanded(!isExpanded);
          triggerHaptic("light");
        }}
        className="w-full p-4 flex items-center justify-between text-left select-none active:bg-black/5 dark:active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill-strong)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Layers3 size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Financial Model
              </span>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {layerLabel} Layer
              </span>
            </div>
            <p
              className="text-[13px] font-semibold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              Actual · Baseline · Scenario
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

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-1 border-t border-[var(--glass-border)] space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["actual", "baseline", "scenario"] as ModelLayer[]).map(
                  (item) => {
                    const isActive = item === layer;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setLayer(item);
                          triggerHaptic("light");
                        }}
                        className="py-2 rounded-2xl text-[11px] font-semibold active:scale-95 transition-all"
                        style={{
                          background: isActive
                            ? "var(--accent)"
                            : "var(--glass-fill)",
                          color: isActive
                            ? "var(--accent-ink)"
                            : "var(--text-secondary)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </button>
                    );
                  },
                )}
              </div>

              <div
                className="p-3.5 rounded-[20px]"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="space-y-1.5">
                  {rows.map((row, idx) => {
                    const value = active[row.key];
                    const isNegative = row.key === "liabilities" || value < 0;
                    return (
                      <div key={row.key}>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-[11px] font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {row.label}
                          </p>
                          <p
                            className="text-[11px] font-semibold amount"
                            style={{
                              color: isNegative
                                ? "var(--text-secondary)"
                                : "var(--text-primary)",
                            }}
                          >
                            {isNegative && !hideBalance
                              ? `-${formatRupiah(Math.abs(value))}`
                              : amountLabel(value, hideBalance)}
                          </p>
                        </div>
                        {idx < rows.length - 1 && (
                          <div className="flex justify-center py-0.5">
                            <ArrowDown
                              size={11}
                              style={{ color: "var(--text-tertiary)" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p style={{ color: "var(--text-tertiary)" }}>
                    Current Net Worth
                  </p>
                  <p
                    className="font-bold amount mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {amountLabel(insights.currentNetWorth, hideBalance)}
                  </p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p style={{ color: "var(--text-tertiary)" }}>
                    {insights.historicalTrendLabel}
                  </p>
                  <p
                    className="font-bold mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {insights.historicalTrendValue}
                  </p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p style={{ color: "var(--text-tertiary)" }}>
                    Current Cashflow
                  </p>
                  <p
                    className="font-bold amount mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {hideBalance
                      ? "Rp ••••••••"
                      : `${insights.currentCashflow >= 0 ? "+" : "-"}${formatRupiah(Math.abs(insights.currentCashflow))}`}
                  </p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p style={{ color: "var(--text-tertiary)" }}>
                    Upcoming Commitments
                  </p>
                  <p
                    className="font-bold amount mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {amountLabel(insights.upcomingCommitments, hideBalance)}
                  </p>
                </div>
              </div>

              <div
                className="p-3 rounded-2xl text-[11px] space-y-1.5"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Personal Baseline:
                  </strong>{" "}
                  {insights.personalBaseline}
                </p>
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Goal Trajectory:
                  </strong>{" "}
                  {insights.goalTrajectory}
                </p>
                <p>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Scenario Impact:
                  </strong>{" "}
                  {insights.scenarioImpact}
                </p>
              </div>

              {onOpenDetails && (
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="w-full py-2.5 rounded-2xl text-[11px] font-semibold active:scale-95 transition-transform"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  View Model Details
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
