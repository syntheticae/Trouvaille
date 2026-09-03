import { useState } from "react";
import { Camera, History, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { formatRupiah } from "../../lib/utils";
import type { FinancialSnapshot } from "../../hooks/useFinancialSnapshots";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../../lib/haptics";

interface FinancialSnapshotCardProps {
  currentPreview: {
    periodLabel: string;
    totalLiquidAssets: number;
    netWorth: number;
    monthlyExpense: number;
    savingsRate: number;
    committedAmount: number;
    debtBalance: number;
  };
  snapshots: FinancialSnapshot[];
  hideBalance?: boolean;
  onSaveSnapshot: () => void;
}

export function FinancialSnapshotCard({
  currentPreview,
  snapshots,
  hideBalance = false,
  onSaveSnapshot,
}: FinancialSnapshotCardProps) {
  const visibleSnapshots = snapshots.slice(0, 3);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="glass-surface rounded-3xl overflow-hidden transition-all">
      <div
        className="w-full p-4 flex items-center justify-between text-left select-none active:bg-white/5 transition-colors cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          triggerHaptic("light");
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: "rgba(255, 255, 255, 0.12)" }}
          >
            <History size={13} />
          </div>
          <div>
            <span
              className="text-[10px] font-extrabold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              Financial Snapshot
            </span>
            <p
              className="text-[13px] font-bold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              Save clean monthly state
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSaveSnapshot();
              triggerHaptic("medium");
            }}
            className="px-3 py-1.5 rounded-2xl text-[10px] font-extrabold flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Camera size={12} />
            <span>Save</span>
          </button>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-1 border-t border-(--glass-border) space-y-4">
              <div
                className="p-3.5 rounded-[20px]"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {currentPreview.periodLabel}
                  </p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    Live Preview
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <p style={{ color: "var(--text-tertiary)" }}>Net Worth</p>
                    <p
                      className="amount font-extrabold mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance
                        ? "Rp ••••••••"
                        : formatRupiah(currentPreview.netWorth)}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <p style={{ color: "var(--text-tertiary)" }}>
                      Liquid Assets
                    </p>
                    <p
                      className="amount font-extrabold mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance
                        ? "Rp ••••••••"
                        : formatRupiah(currentPreview.totalLiquidAssets)}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <p style={{ color: "var(--text-tertiary)" }}>
                      Monthly Expense
                    </p>
                    <p
                      className="amount font-extrabold mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance
                        ? "Rp ••••••••"
                        : formatRupiah(currentPreview.monthlyExpense)}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <p style={{ color: "var(--text-tertiary)" }}>
                      Savings Rate
                    </p>
                    <p
                      className="amount font-extrabold mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance
                        ? "••%"
                        : `${currentPreview.savingsRate.toFixed(0)}%`}
                    </p>
                  </div>
                </div>
                {(currentPreview.committedAmount > 0 ||
                  currentPreview.debtBalance > 0) && (
                  <div
                    className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold mt-2.5 pt-2.5"
                    style={{
                      color: "var(--text-secondary)",
                      borderTop: "1px solid var(--glass-border)",
                    }}
                  >
                    {currentPreview.committedAmount > 0 && (
                      <span>
                        Commitments:{" "}
                        {hideBalance
                          ? "Rp ••••••"
                          : formatRupiah(currentPreview.committedAmount)}
                      </span>
                    )}
                    {currentPreview.debtBalance > 0 && (
                      <span>
                        Negative Balances:{" "}
                        {hideBalance
                          ? "Rp ••••••"
                          : formatRupiah(currentPreview.debtBalance)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p
                  className="text-[11px] font-bold uppercase tracking-wider px-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Saved States
                </p>
                {visibleSnapshots.length === 0 ? (
                  <div
                    className="p-3.5 rounded-2xl text-[12px]"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No snapshot saved yet. Save one at month-end so you can
                    compare cleanly later.
                  </div>
                ) : (
                  visibleSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p
                            className="text-[12px] font-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {snapshot.periodLabel}
                          </p>
                          <p
                            className="text-[10px] mt-0.5"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Saved{" "}
                            {format(
                              new Date(snapshot.capturedAt),
                              "dd MMM yyyy, HH:mm",
                            )}
                          </p>
                        </div>
                        <span
                          className="text-[9px] font-extrabold px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--glass-fill)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          Snapshot
                        </span>
                      </div>
                      <p
                        className="text-[11px] mt-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Net Worth{" "}
                        {hideBalance
                          ? "Rp ••••••••"
                          : formatRupiah(snapshot.netWorth)}{" "}
                        · Expense{" "}
                        {hideBalance
                          ? "Rp ••••••••"
                          : formatRupiah(snapshot.monthlyExpense)}{" "}
                        · Savings{" "}
                        {hideBalance
                          ? "••%"
                          : `${snapshot.savingsRate.toFixed(0)}%`}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
