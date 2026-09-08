import { useMemo } from "react";
import { formatRupiah } from "../../lib/utils";
import { Layers } from "lucide-react";
import type { Category, Bill, Goal } from "../../lib/types";

interface ZeroBasedEnvelopesCardProps {
  monthlyIncome: number;
  categories: Category[];
  bills: Bill[];
  goals: Goal[];
  categorySpendMap: Record<string, number>;
  hideBalance?: boolean;
}

export function ZeroBasedEnvelopesCard({
  monthlyIncome,
  categories,
  bills,
  goals,
  categorySpendMap,
  hideBalance = false,
}: ZeroBasedEnvelopesCardProps) {
  // 1. Calculate allocated amounts across 3 buckets:
  // A. Category Budget Envelopes
  const categoryEnvelopes = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense" && (c.budget_amount ?? 0) > 0)
      .map((c) => {
        const allocated = c.budget_amount || 0;
        const spent = categorySpendMap[c.id] || 0;
        const remaining = Math.max(0, allocated - spent);
        const percent = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
        return {
          id: c.id,
          name: c.name,
          emoji: c.emoji,
          allocated,
          spent,
          remaining,
          percent,
        };
      })
      .sort((a, b) => b.allocated - a.allocated);
  }, [categories, categorySpendMap]);

  const totalCategoryAllocated = useMemo(
    () => categoryEnvelopes.reduce((sum, c) => sum + c.allocated, 0),
    [categoryEnvelopes]
  );

  // B. Fixed Obligations & Bills
  const totalBillsAllocated = useMemo(() => {
    return bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [bills]);

  // C. Sinking Funds & Goal Contributions
  const totalGoalsAllocated = useMemo(() => {
    // Treat active goals needing funds as target monthly allocations
    return goals.reduce((sum, g) => {
      const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount);
      // Rough 1-year sinking fund monthly allocation if remainingTarget > 0
      const monthlyPace = remainingTarget > 0 ? Math.round(remainingTarget / 12) : 0;
      return sum + Math.min(remainingTarget, Math.max(monthlyPace, 250000));
    }, 0);
  }, [goals]);

  // Total allocated capital
  const totalAllocated = totalCategoryAllocated + totalBillsAllocated + totalGoalsAllocated;

  // Unallocated cash: Income minus all allocated envelopes
  const unallocatedCash = monthlyIncome - totalAllocated;
  const isOverallocated = unallocatedCash < -1000;
  const isBalanced = Math.abs(unallocatedCash) <= 1000;

  const mask = (val: string) => (hideBalance ? "••••••" : val);

  return (
    <div
      className="p-5 rounded-[24px] glass-surface space-y-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className="text-[14px] font-extrabold"
                style={{ color: "var(--text-primary)" }}
              >
                Zero-Based Envelopes
              </h3>
              <span
                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: isOverallocated
                    ? "rgba(255, 255, 255, 0.15)"
                    : isBalanced
                      ? "var(--accent)"
                      : "var(--glass-fill)",
                  color: isBalanced ? "var(--accent-ink)" : "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {isOverallocated ? "Overallocated" : isBalanced ? "Balanced" : "Surplus"}
              </span>
            </div>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Every Rupiah has a designated job
            </p>
          </div>
        </div>
      </div>

      {/* Unallocated Inflow Hero Card */}
      <div
        className="p-4 rounded-2xl space-y-2"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isOverallocated ? "Deficit to Rebalance" : "Unallocated Cashflow"}
            </span>
            <span
              className="text-[20px] font-black tracking-tight block mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {mask(formatRupiah(Math.abs(unallocatedCash)))}
            </span>
          </div>

          <div className="text-right">
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Monthly Inflow Base
            </span>
            <span
              className="text-[13px] font-black block mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {mask(formatRupiah(monthlyIncome))}
            </span>
          </div>
        </div>

        <p
          className="text-[11px] font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isOverallocated
            ? "Your envelopes exceed your monthly income. Trim discretionary categories to achieve zero-based balance."
            : isBalanced
              ? "All monthly income is fully assigned to bills, living envelopes, and future savings."
              : "This surplus can be assigned to sinking funds, debt acceleration, or investment goals."}
        </p>
      </div>

      {/* 3 Pillars of Allocation */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-3 rounded-xl border text-center"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-fill)",
          }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            Fixed Bills
          </span>
          <span
            className="text-[12px] font-black block mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {mask(formatRupiah(totalBillsAllocated))}
          </span>
        </div>

        <div
          className="p-3 rounded-xl border text-center"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-fill)",
          }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            Envelopes
          </span>
          <span
            className="text-[12px] font-black block mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {mask(formatRupiah(totalCategoryAllocated))}
          </span>
        </div>

        <div
          className="p-3 rounded-xl border text-center"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-fill)",
          }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sinking Funds
          </span>
          <span
            className="text-[12px] font-black block mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {mask(formatRupiah(totalGoalsAllocated))}
          </span>
        </div>
      </div>

      {/* Envelope Progress List */}
      {categoryEnvelopes.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span style={{ color: "var(--text-secondary)" }}>
              Active Category Envelopes ({categoryEnvelopes.length})
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>Spent / Assigned</span>
          </div>

          <div className="space-y-2">
            {categoryEnvelopes.slice(0, 5).map((env) => (
              <div
                key={env.id}
                className="p-3 rounded-xl space-y-1.5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">{env.emoji || "📁"}</span>
                    <span
                      className="font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {env.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="font-black"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {mask(formatRupiah(env.spent))}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      / {mask(formatRupiah(env.allocated))}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, env.percent)}%`,
                      background: env.percent >= 100 ? "var(--text-primary)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
