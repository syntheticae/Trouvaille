import { Layers3 } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import type { ExpenseStructureResult } from "../../hooks/useFinancialIntelligence";

interface ExpenseStructureCardProps {
  expenseStructure: ExpenseStructureResult;
  hideBalance?: boolean;
}

export function ExpenseStructureCard({
  expenseStructure,
  hideBalance = false,
}: ExpenseStructureCardProps) {
  const rows = [
    {
      key: "fixed",
      label: "Recurring / Fixed",
      amount: expenseStructure.fixedAmount,
      percentage: expenseStructure.fixedPercentage,
    },
    {
      key: "variable",
      label: "Variable",
      amount: expenseStructure.variableAmount,
      percentage: expenseStructure.variablePercentage,
    },
    {
      key: "discretionary",
      label: "Discretionary",
      amount: expenseStructure.discretionaryAmount,
      percentage: expenseStructure.discretionaryPercentage,
    },
    {
      key: "unclassified",
      label: "Unclassified",
      amount: expenseStructure.unclassifiedAmount,
      percentage: expenseStructure.unclassifiedPercentage,
    },
  ] as const;

  return (
    <section
      className="p-5 rounded-[24px] glass-surface"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers3 size={16} style={{ color: "var(--text-tertiary)" }} />
            <h2
              className="text-[13px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Expense Structure
            </h2>
          </div>
          <p
            className="text-[11px] mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Committed vs flexible spending composition
          </p>
        </div>
        <span
          className="text-[9px] font-extrabold px-2 py-1 rounded-full"
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
          {expenseStructure.reconciliationCheck ? "RECONCILED" : "CHECK DATA"}
        </span>
      </div>

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
                    background: ["#FFFFFF", "#D1D1D6", "#8E8E93", "#636366"][
                      index
                    ],
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
                  className="amount text-[12px] font-extrabold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hideBalance ? "Rp ••••••••" : formatRupiah(row.amount)}
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

      <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Committed vs Flexible
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
              Committed
            </p>
            <p
              className="amount text-[13px] font-extrabold mt-1"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance
                ? "Rp ••••••••"
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
              Flexible
            </p>
            <p
              className="amount text-[13px] font-extrabold mt-1"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance
                ? "Rp ••••••••"
                : formatRupiah(expenseStructure.flexibleAmount)}
            </p>
          </div>
        </div>
      </div>

      {expenseStructure.items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-2">
          <p
            className="text-[10px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Largest Components
          </p>
          {expenseStructure.items.slice(0, 4).map((item) => (
            <div
              key={item.categoryId + item.name}
              className="flex items-center justify-between px-1"
            >
              <div>
                <p
                  className="text-[12px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.name}
                </p>
                <p
                  className="text-[10px] font-medium capitalize"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {item.classification}
                </p>
              </div>
              <span
                className="amount text-[11px] font-extrabold"
                style={{ color: "var(--text-primary)" }}
              >
                {hideBalance ? "Rp ••••••••" : formatRupiah(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
