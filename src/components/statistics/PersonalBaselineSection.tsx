import { useState } from "react";
import { Compass, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PersonalBaselineResult } from "../../lib/financialMath";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { IconRenderer } from "../ui/IconRenderer";

interface PersonalBaselineSectionProps {
  baselines: PersonalBaselineResult;
  onCategoryClick?: (categoryName: string) => void;
}

export function PersonalBaselineSection({
  baselines,
  onCategoryClick,
}: PersonalBaselineSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (baselines.status === "insufficient") {
    return (
      <section
        className="glass-surface rounded-[24px] p-4"
        style={{
          border: "1px solid var(--glass-border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: "var(--glass-fill-strong)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Compass size={13} />
          </div>
          <div>
            <span
              className="text-[10px] font-extrabold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              Personal Baseline
            </span>
            <p
              className="text-[13px] font-bold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              Awaiting Historical Cycles
            </p>
          </div>
        </div>
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {baselines.message ||
            "Build more history across at least two full monthly cycles to establish your personal historical baseline."}
        </p>
      </section>
    );
  }

  const minRangeStr = `Rp ${(baselines.typicalExpenseRange[0] / 1000000).toFixed(1)}M`;
  const maxRangeStr = `Rp ${(baselines.typicalExpenseRange[1] / 1000000).toFixed(1)}M`;
  const isAbove = baselines.currentMonthStatus === "above_range";
  const isBelow = baselines.currentMonthStatus === "below_range";

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
          setIsExpanded(!isExpanded);
          triggerHaptic("light");
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
            <Compass size={13} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-extrabold uppercase tracking-widest"
                style={{ color: "var(--text-tertiary)" }}
              >
                Personal Baseline
              </span>
              <span
                className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {baselines.historicalMonthsCount} Cycles Active
              </span>
            </div>
            <p
              className="text-[13px] font-bold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              Typical Range: {minRangeStr} – {maxRangeStr}
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

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-1 space-y-3.5 border-t border-[var(--glass-border)] text-[12px]">
              {/* Status Banner */}
              <div
                className="p-3 rounded-2xl flex items-start gap-2.5"
                style={{
                  background: isAbove
                    ? "rgba(255, 255, 255, 0.08)"
                    : "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {isAbove ? (
                  <AlertCircle
                    size={15}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "var(--text-primary)" }}
                  />
                ) : (
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "var(--text-primary)" }}
                  />
                )}
                <div className="space-y-0.5">
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isAbove
                      ? "Above your usual monthly range"
                      : isBelow
                        ? "Below your typical monthly range"
                        : "Within your historical normal band"}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Selected month outflow (
                    {formatRupiah(baselines.currentMonthExpense)}) is{" "}
                    {Math.abs(baselines.currentMonthDeviationPct)}%{" "}
                    {baselines.currentMonthDeviationPct >= 0
                      ? "above"
                      : "below"}{" "}
                    your historical median of{" "}
                    {formatRupiah(baselines.medianExpense)}.
                  </p>
                </div>
              </div>

              {/* Baseline Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Median Outflow
                  </p>
                  <p
                    className="amount text-[14px] font-extrabold mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(baselines.medianExpense)}
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    ~{baselines.monthlyTxFrequency} transactions / mo
                  </p>
                </div>

                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Typical Ticket Size
                  </p>
                  <p
                    className="amount text-[14px] font-extrabold mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(baselines.medianTxSize)}
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Median single expense
                  </p>
                </div>
              </div>

              {/* Category Baselines */}
              {baselines.categoryBaselines.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div
                    className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider px-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <span>Category Normal Bands</span>
                    <span>Current vs Normal</span>
                  </div>

                  <div className="space-y-1.5">
                    {baselines.categoryBaselines.slice(0, 4).map((cat) => {
                      const isCatAbove = cat.currentStatus === "above_range";
                      const catMin = `Rp ${(cat.typicalMonthlyRange[0] / 1000).toFixed(0)}K`;
                      const catMax = `Rp ${(cat.typicalMonthlyRange[1] / 1000).toFixed(0)}K`;

                      return (
                        <div
                          key={cat.categoryId}
                          onClick={() => onCategoryClick?.(cat.name)}
                          className="p-2 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: "rgba(255, 255, 255, 0.06)",
                                border: "1px solid var(--glass-border)",
                              }}
                            >
                              <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                            </div>
                            <div>
                              <p
                                className="text-[11px] font-bold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {cat.name}
                              </p>
                              <p
                                className="text-[9px]"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                Typical: {catMin} – {catMax}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p
                              className="amount text-[11px] font-extrabold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {formatRupiah(cat.currentMonthTotal)}
                            </p>
                            <span
                              className="text-[9px] font-bold"
                              style={{
                                color: isCatAbove
                                  ? "var(--text-primary)"
                                  : "var(--text-tertiary)",
                              }}
                            >
                              {isCatAbove ? "↑ Above normal" : "Within normal"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
