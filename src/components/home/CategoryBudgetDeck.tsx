// ======================================================================
// TROUVAILLE CATEGORY BUDGET ENVELOPES DECK
// Interactive Category Envelope Cards with SVG Circular Ring Gauges
// Shows % of budget spent, remaining buffer, and active overspend alerts
// Strictly Apple Monochrome Luxury | Zero Native Emojis | Responsive
// ======================================================================

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useCategories } from "../../hooks/useCategories";
import { useAllTransactions } from "../../hooks/useTransactions";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useBudgetTarget } from "../../hooks/useBudgetTarget";
import { IconRenderer } from "../ui/IconRenderer";

interface CategoryBudgetDeckProps {
  onOpenManageCategories?: () => void;
  hideBalance?: boolean;
}

interface EnvelopeItem {
  id: string;
  name: string;
  emoji: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  remaining: number;
  isOverbudget: boolean;
}

export function CategoryBudgetDeck({
  onOpenManageCategories,
  hideBalance = false,
}: CategoryBudgetDeckProps) {
  const { data: categories = [] } = useCategories();
  const { data: allTxs = [] } = useAllTransactions();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();
  const { budgetTarget } = useBudgetTarget();

  // Current month prefix (YYYY-MM)
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Compute category spend vs budget amount
  const envelopes: EnvelopeItem[] = useMemo(() => {
    // Current month expenses grouped by category
    const spendMap = new Map<string, number>();

    allTxs.forEach((t) => {
      if (t.type !== "expense" || !t.occurred_on) return;
      if (!t.occurred_on.startsWith(currentMonthKey)) return;
      const isCorrection =
        t.note?.includes("[Correction]") ||
        t.note?.includes("Saldo Awal") ||
        t.note?.includes("Opening Balance");
      if (isCorrection) return;

      const amt = Number(t.amount || 0);
      const catId = t.category_id || "uncategorized";
      spendMap.set(catId, (spendMap.get(catId) || 0) + amt);
    });

    const expenseCategories = categories.filter((c) => c.type !== "income");

    const items: EnvelopeItem[] = [];

    expenseCategories.forEach((cat) => {
      const spent = spendMap.get(cat.id) || 0;
      // If category has explicit budget_amount, use it.
      // If not, assign a sensible envelope derived from overall budgetTarget
      let budgetAmount = cat.budget_amount || 0;

      // Smart envelope fallback for essential categories if user hasn't set explicit limits yet
      if (budgetAmount <= 0) {
        const lower = cat.name.toLowerCase();
        if (lower.includes("makan") || lower.includes("food")) {
          budgetAmount = Math.round(budgetTarget * 0.35);
        } else if (lower.includes("transport")) {
          budgetAmount = Math.round(budgetTarget * 0.15);
        } else if (lower.includes("belanja") || lower.includes("shop")) {
          budgetAmount = Math.round(budgetTarget * 0.2);
        } else if (lower.includes("tagihan") || lower.includes("bill")) {
          budgetAmount = Math.round(budgetTarget * 0.2);
        }
      }

      if (budgetAmount > 0 || spent > 0) {
        const percentage =
          budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 100;
        const remaining = budgetAmount - spent;

        items.push({
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji || "Tag",
          budgetAmount,
          spent,
          percentage,
          remaining,
          isOverbudget: budgetAmount > 0 && spent > budgetAmount,
        });
      }
    });

    // Sort: Overbudget first, then highest percentage
    return items.sort((a, b) => b.percentage - a.percentage);
  }, [categories, allTxs, currentMonthKey, budgetTarget]);

  // Top 8 active envelopes
  const displayedEnvelopes = useMemo(() => {
    return envelopes.slice(0, 8);
  }, [envelopes]);

  // SVG Ring Constants
  const radius = 20;
  const strokeWidth = 4.2;
  const circumference = 2 * Math.PI * radius;

  if (envelopes.length === 0) return null;

  return (
    <section className="space-y-3 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-[13.5px] font-bold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Budget Kategori" : "Category Budgets"}
          </h3>
          <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
            {isIndonesian
              ? "Amplop belanja & batas limit bulanan"
              : "Monthly envelope tracking & spending limits"}
          </p>
        </div>

        {onOpenManageCategories && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onOpenManageCategories();
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <span>{isIndonesian ? "Atur" : "Manage"}</span>
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* 2-Column Responsive Envelope Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {displayedEnvelopes.map((env) => {
          const clampedPct = Math.min(100, Math.max(0, env.percentage));
          const strokeDashoffset =
            circumference - (clampedPct / 100) * circumference;

          return (
            <div
              key={env.id}
              className="p-3.5 rounded-[22px] space-y-2.5 flex flex-col justify-between transition-all"
              style={{
                background: isDark
                  ? "var(--bg-elevated)"
                  : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
                border: isDark
                  ? env.isOverbudget
                    ? "1px solid rgba(255, 255, 255, 0.3)"
                    : "1px solid var(--glass-border)"
                  : env.isOverbudget
                    ? "1px solid rgba(24, 24, 27, 0.3)"
                    : "1px solid rgba(15,23,42,0.06)",
                boxShadow: isDark
                  ? "var(--shadow-card)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(15,23,42,0.04)",
              }}
            >
              {/* Top Row: Category Icon & Title */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={env.emoji} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                    {env.name}
                  </span>
                </div>

                {env.isOverbudget && (
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
                    style={{
                      background: isDark
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(0, 0, 0, 0.08)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    Over
                  </span>
                )}
              </div>

              {/* Center Row: Ring Gauge & Percent */}
              <div className="flex items-center justify-between gap-2 py-1">
                {/* Circular Ring Gauge */}
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 48 48">
                    {/* Track */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      stroke={
                        isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)"
                      }
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {/* Filled Arc */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      stroke={
                        env.isOverbudget
                          ? isDark
                            ? "#FFFFFF"
                            : "#18181B"
                          : isDark
                            ? "rgba(255, 255, 255, 0.85)"
                            : "rgba(24, 24, 27, 0.85)"
                      }
                      strokeWidth={env.isOverbudget ? strokeWidth + 0.8 : strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  {/* Inner Percentage */}
                  <span className="absolute font-mono text-[10px] font-bold text-[var(--text-primary)]">
                    {env.percentage}%
                  </span>
                </div>

                {/* Spent vs Limit */}
                <div className="text-right min-w-0 pr-0.5 font-mono">
                  <span className="text-[12.5px] font-bold text-[var(--text-primary)] block leading-tight">
                    {hideBalance ? "••••" : formatRupiah(env.spent)}
                  </span>
                  <span className="text-[9.5px] text-[var(--text-tertiary)] block mt-0.5 truncate">
                    {env.budgetAmount > 0
                      ? `/ ${formatRupiah(env.budgetAmount)}`
                      : isIndonesian ? "Tanpa limit" : "No limit"}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Remaining Status */}
              <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-tertiary)] truncate">
                  {env.isOverbudget
                    ? isIndonesian ? "Kelebihan:" : "Over by:"
                    : isIndonesian ? "Sisa kuota:" : "Remaining:"}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    env.isOverbudget
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {hideBalance
                    ? "••••"
                    : formatRupiah(Math.abs(env.remaining))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
