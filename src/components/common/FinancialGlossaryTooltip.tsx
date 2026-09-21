import { useState } from "react";
import { Info, X, BookOpen } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

export type GlossaryKey =
  | "solvency_runway"
  | "zero_based"
  | "monte_carlo"
  | "operating_cashflow"
  | "free_cashflow"
  | "savings_rate"
  | "volatility_score"
  | "fire_number";

export interface GlossaryDefinition {
  title: string;
  simpleExplanation: string;
  tip?: string;
}

export const FINANCIAL_GLOSSARY: Record<GlossaryKey, GlossaryDefinition> = {
  solvency_runway: {
    title: "Solvency Runway",
    simpleExplanation:
      "Estimated number of months your liquid cash reserves can support your baseline lifestyle if all income ceased today.",
    tip: "Safe benchmark: at least 3–6 months of essential living expenses.",
  },
  zero_based: {
    title: "Zero-Based Budgeting",
    simpleExplanation:
      "An intentional allocation method where every unit of income is assigned to spending, savings, or investment until unallocated cash equals zero.",
    tip: "Does not mean zero in your account, but that all capital has a designated purpose.",
  },
  monte_carlo: {
    title: "Monte Carlo Simulation",
    simpleExplanation:
      "Stress-tests long-term financial durability across thousands of randomized economic scenarios (inflation spikes, market downturns, expense variance).",
    tip: "A probability score above 85% denotes high durability against unexpected shocks.",
  },
  operating_cashflow: {
    title: "Operating Cash Flow (OCF)",
    simpleExplanation:
      "Net cash generated purely from core daily life activities (recurring income minus living expenses, food, transit, bills).",
    tip: "A consistently positive OCF indicates sound financial foundations without reliance on debt or liquidation.",
  },
  free_cashflow: {
    title: "Free Cash Flow (FCF)",
    simpleExplanation:
      "Net discretionary surplus remaining after all essential living commitments and mandatory savings goals are fully funded.",
  },
  savings_rate: {
    title: "Savings Rate",
    simpleExplanation:
      "The percentage of total monthly income retained and compounded rather than consumed.",
    tip: "The golden CFP benchmark recommends retaining at least 20% of net monthly income.",
  },
  volatility_score: {
    title: "Spending Volatility Score",
    simpleExplanation:
      "Measures how frequently daily outlays fluctuate or spike relative to your baseline average run-rate.",
    tip: "A lower volatility score reflects predictable, controlled spending habits.",
  },
  fire_number: {
    title: "FIRE Target Number",
    simpleExplanation:
      "The total accumulated portfolio required to sustain your lifestyle indefinitely without active employment.",
    tip: "Calculated based on 25x annual expenditure following the standard 4% Rule.",
  },
};

export interface FinancialGlossaryTooltipProps {
  term: GlossaryKey;
  label?: string;
  showIconOnly?: boolean;
}

export function FinancialGlossaryTooltip({
  term,
  label,
  showIconOnly = false,
}: FinancialGlossaryTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const info = FINANCIAL_GLOSSARY[term];

  if (!info) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic("light");
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 cursor-pointer text-left group"
        title="Click to view term definition"
      >
        {!showIconOnly && label && (
          <span className="border-b border-dashed border-[var(--text-tertiary)] group-hover:border-[var(--text-primary)] transition-colors">
            {label}
          </span>
        )}
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors"
          style={{ background: "var(--glass-fill)" }}
        >
          <Info size={10} strokeWidth={1.5} />
        </span>
      </button>

      {/* Popover Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-5 glass-surface select-none shadow-2xl relative"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-secondary)]"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <BookOpen size={12} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Financial Glossary
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <X size={12} />
                </button>
              </div>

              <div className="pt-3.5 space-y-2">
                <h4 className="text-[14px] font-semibold leading-snug">
                  {info.title}
                </h4>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  {info.simpleExplanation}
                </p>

                {info.tip && (
                  <div
                    className="p-3 rounded-2xl text-[11px] text-[var(--text-tertiary)] leading-relaxed mt-3"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <span className="font-semibold text-[var(--text-primary)]">
                      Financial Tip:{" "}
                    </span>
                    {info.tip}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
