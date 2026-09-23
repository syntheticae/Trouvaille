import { useState } from "react";
import { Layers3, ChevronDown } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import type { ExpenseStructureResult } from "../../hooks/useFinancialIntelligence";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";

interface ExpenseStructureCardProps {
  expenseStructure: ExpenseStructureResult;
  hideBalance?: boolean;
}

export function ExpenseStructureCard({
  expenseStructure,
  hideBalance = false,
}: ExpenseStructureCardProps) {
  useCurrency();
  const { isIndonesian } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const rows = [
    {
      key: "fixed",
      label: isIndonesian ? "Tetap / Rutin" : "Recurring / Fixed",
      amount: expenseStructure.fixedAmount,
      percentage: expenseStructure.fixedPercentage,
    },
    {
      key: "variable",
      label: isIndonesian ? "Variabel / Pokok" : "Variable",
      amount: expenseStructure.variableAmount,
      percentage: expenseStructure.variablePercentage,
    },
    {
      key: "discretionary",
      label: isIndonesian ? "Gaya Hidup / Fleksibel" : "Discretionary",
      amount: expenseStructure.discretionaryAmount,
      percentage: expenseStructure.discretionaryPercentage,
    },
    {
      key: "unclassified",
      label: isIndonesian ? "Lainnya" : "Unclassified",
      amount: expenseStructure.unclassifiedAmount,
      percentage: expenseStructure.unclassifiedPercentage,
    },
  ] as const;

  return (
    <section
      className="glass-surface rounded-3xl overflow-hidden transition-all"
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
        className="w-full p-4 flex items-center justify-between text-left select-none active:bg-white/5 transition-colors"
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
                {isIndonesian ? "Struktur Pengeluaran" : "Expense Structure"}
              </span>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: expenseStructure.reconciliationCheck
                    ? "var(--glass-fill-strong)"
                    : "var(--text-primary)",
                  color: expenseStructure.reconciliationCheck
                    ? "var(--text-primary)"
                    : "var(--bg-canvas)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {expenseStructure.reconciliationCheck
                  ? (isIndonesian ? "TERREKONSILIASI" : "RECONCILED")
                  : (isIndonesian ? "PERIKSA DATA" : "CHECK DATA")}
              </span>
            </div>
            <p
              className="text-[13px] font-bold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Komposisi komitmen vs fleksibel" : "Committed vs flexible composition"}
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
            <div className="p-4 pt-1 border-t border-(--glass-border) space-y-4">
              <div className="space-y-2.5">
                {rows.map((row, index) => (
                  <div
                    key={row.key}
                    className="p-3 rounded-2xl"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: [
                              "#FFFFFF",
                              "#D1D1D6",
                              "#8E8E93",
                              "#636366",
                            ][index],
                          }}
                        />
                        <p
                          className="text-[12px] font-bold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {row.label}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="amount text-[12px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {hideBalance
                            ? "••••••••"
                            : formatRupiah(row.amount)}
                        </p>
                        <p
                          className="text-[10px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {row.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Komitmen vs Fleksibel" : "Committed vs Flexible"}
                  </p>
                  <p
                    className="text-[11px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {expenseStructure.committedPercentage.toFixed(1)}% /{" "}
                    {expenseStructure.flexiblePercentage.toFixed(1)}%
                  </p>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, expenseStructure.committedPercentage)}%`,
                      background: "var(--text-primary)",
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div
                    className="p-3 rounded-2xl"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "Komitmen" : "Committed"}
                    </p>
                    <p
                      className="amount text-[13px] font-semibold mt-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance
                        ? "••••••••"
                        : formatRupiah(expenseStructure.committedAmount)}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-2xl"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "Fleksibel" : "Flexible"}
                    </p>
                    <p
                      className="amount text-[13px] font-semibold mt-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance
                        ? "••••••••"
                        : formatRupiah(expenseStructure.flexibleAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {expenseStructure.items.length > 0 && (
                <div className="pt-2">
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Komponen Terbesar" : "Largest Components"}
                  </p>
                  <div className="space-y-2">
                    {expenseStructure.items.slice(0, 5).map((item) => (
                      <div
                        key={item.categoryId + item.name}
                        className="flex items-center justify-between px-2 py-1"
                      >
                        <div>
                          <p
                            className="text-[11px] font-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {item.name}
                          </p>
                          <p
                            className="text-[9px] font-medium capitalize"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {item.classification}
                          </p>
                        </div>
                        <span
                          className="amount text-[11px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {hideBalance
                            ? "••••••••"
                            : formatRupiah(item.amount)}
                        </span>
                      </div>
                    ))}
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
