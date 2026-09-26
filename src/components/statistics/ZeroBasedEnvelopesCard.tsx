import { useMemo, useState } from "react";
import { formatRupiah } from "../../lib/utils";
import { Layers, ChevronDown, CheckCircle2 } from "lucide-react";
import type { Category, Bill, Goal } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";
import { motion } from "framer-motion";

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
  useCurrency();
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const [showAllEnvelopes, setShowAllEnvelopes] = useState(false);

  // 1. Calculate allocated amounts across 3 buckets
  const categoryEnvelopes = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense" && (c.budget_amount ?? 0) > 0)
      .map((c) => {
        const allocated = c.budget_amount || 0;
        const spent = categorySpendMap[c.id] || 0;
        const remaining = Math.max(0, allocated - spent);
        const percent =
          allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
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
    [categoryEnvelopes],
  );

  const totalBillsAllocated = useMemo(() => {
    return bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [bills]);

  const totalGoalsAllocated = useMemo(() => {
    return goals.reduce((sum, g) => {
      const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount);
      const monthlyPace = remainingTarget > 0 ? Math.round(remainingTarget / 12) : 0;
      return sum + Math.min(remainingTarget, Math.max(monthlyPace, 250000));
    }, 0);
  }, [goals]);

  const totalAllocated =
    totalCategoryAllocated + totalBillsAllocated + totalGoalsAllocated;
  const unallocatedCash = monthlyIncome - totalAllocated;
  const isOverallocated = unallocatedCash < -1000;
  const isBalanced = Math.abs(unallocatedCash) <= 1000;

  const incomeBase = Math.max(monthlyIncome, totalAllocated, 1);
  const billsPct = (totalBillsAllocated / incomeBase) * 100;
  const envelopesPct = (totalCategoryAllocated / incomeBase) * 100;
  const goalsPct = (totalGoalsAllocated / incomeBase) * 100;

  const mask = (val: string) => (hideBalance ? "••••••••" : val);

  return (
    <section
      className="glass-surface rounded-[24px] p-5 transition-all select-none space-y-4"
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Layers size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {isIndonesian ? "Alokasi Amplop Nol" : "Zero-Based Envelopes"}
            </h3>
            <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Setiap Rupiah Punya Peran" : "Every Unit Assigned"}
            </p>
          </div>
        </div>

        {/* Status Badge (Monochrome) */}
        <div
          className="text-right px-2.5 py-1 rounded-xl shrink-0"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.04)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="text-[9px] font-medium uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Status" : "Status"}
          </span>
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {isOverallocated
              ? isIndonesian
                ? "Defisit Alokasi"
                : "Overallocated"
              : isBalanced
                ? isIndonesian
                  ? "Teralokasi Pas"
                  : "Zero-Balanced"
                : isIndonesian
                  ? "Surplus Kas"
                  : "Surplus"}
          </span>
        </div>
      </div>

      {/* ── 2. Multi-Segment Allocation Meter Chart ────────────────────────── */}
      <div
        className="p-3.5 rounded-2xl space-y-2.5 border"
        style={{
          background: "var(--glass-fill)",
          borderColor: "var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian ? "Total Pemasukan Masuk" : "Monthly Income Base"}
          </span>
          <span className="tabular-nums font-bold" style={{ color: "var(--text-primary)" }}>
            {mask(formatRupiah(monthlyIncome))}
          </span>
        </div>

        {/* Stacked Allocation Bar */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-white/[0.06] p-0.5 gap-1">
          {billsPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(3, billsPct)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: isDark ? "#FFFFFF" : "#18181B" }}
              title={`Tagihan: ${billsPct.toFixed(0)}%`}
            />
          )}
          {envelopesPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(3, envelopesPct)}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
              className="h-full rounded-full"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.55)"
                  : "rgba(24, 24, 27, 0.55)",
              }}
              title={`Amplop: ${envelopesPct.toFixed(0)}%`}
            />
          )}
          {goalsPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(3, goalsPct)}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(24, 24, 27, 0.25)",
              }}
              title={`Celengan: ${goalsPct.toFixed(0)}%`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: isDark ? "#FFFFFF" : "#18181B" }}
            />
            <span className="truncate text-[var(--text-secondary)]">
              {isIndonesian ? "Tagihan" : "Bills"}
            </span>
            <span className="font-bold tabular-nums text-[var(--text-primary)] ml-auto">
              {billsPct.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.55)"
                  : "rgba(24, 24, 27, 0.55)",
              }}
            />
            <span className="truncate text-[var(--text-secondary)]">
              {isIndonesian ? "Amplop" : "Budgets"}
            </span>
            <span className="font-bold tabular-nums text-[var(--text-primary)] ml-auto">
              {envelopesPct.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(24, 24, 27, 0.25)",
              }}
            />
            <span className="truncate text-[var(--text-secondary)]">
              {isIndonesian ? "Tabungan" : "Goals"}
            </span>
            <span className="font-bold tabular-nums text-[var(--text-primary)] ml-auto">
              {goalsPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. 3-Bucket Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-3 rounded-2xl border"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider block text-[var(--text-tertiary)]">
            {isIndonesian ? "Tagihan Wajib" : "Fixed Bills"}
          </span>
          <span className="amount text-[12px] font-bold tabular-nums block mt-1 text-[var(--text-primary)]">
            {mask(formatRupiah(totalBillsAllocated))}
          </span>
        </div>

        <div
          className="p-3 rounded-2xl border"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider block text-[var(--text-tertiary)]">
            {isIndonesian ? "Amplop Belanja" : "Envelopes"}
          </span>
          <span className="amount text-[12px] font-bold tabular-nums block mt-1 text-[var(--text-primary)]">
            {mask(formatRupiah(totalCategoryAllocated))}
          </span>
        </div>

        <div
          className="p-3 rounded-2xl border"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider block text-[var(--text-tertiary)]">
            {isIndonesian ? "Sinking Funds" : "Goals/Funds"}
          </span>
          <span className="amount text-[12px] font-bold tabular-nums block mt-1 text-[var(--text-primary)]">
            {mask(formatRupiah(totalGoalsAllocated))}
          </span>
        </div>
      </div>

      {/* ── 4. Unallocated Balance Insight ──────────────────────────────────── */}
      <div
        className="p-3 rounded-2xl border flex items-center justify-between text-[11px]"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          borderColor: "var(--glass-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={13} className="text-[var(--text-primary)] shrink-0" />
          <span style={{ color: "var(--text-secondary)" }}>
            {isOverallocated
              ? isIndonesian
                ? `Alokasi melebihi pemasukan sebesar ${mask(formatRupiah(Math.abs(unallocatedCash)))}.`
                : `Allocations exceed income by ${mask(formatRupiah(Math.abs(unallocatedCash)))}.`
              : isBalanced
                ? isIndonesian
                  ? "Seluruh pemasukan bulan ini telah memiliki alokasi pos terencana."
                  : "All monthly income is fully assigned with zero left unassigned."
                : isIndonesian
                  ? `Sisa ${mask(formatRupiah(unallocatedCash))} siap dialokasikan ke pos tabungan ekstra.`
                  : `Surplus of ${mask(formatRupiah(unallocatedCash))} available to deploy to goals.`}
          </span>
        </div>
      </div>

      {/* ── 5. Top Active Envelopes Glance ──────────────────────────────────── */}
      {categoryEnvelopes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Status Amplop Kategori" : "Active Category Envelopes"}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {categoryEnvelopes.length} {isIndonesian ? "pos" : "envelopes"}
            </span>
          </div>

          <div className="space-y-1.5">
            {(showAllEnvelopes
              ? categoryEnvelopes
              : categoryEnvelopes.slice(0, 3)
            ).map((env) => (
              <div
                key={env.id}
                className="p-2.5 rounded-xl border space-y-1.5"
                style={{
                  background: "var(--glass-fill)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {env.name}
                    </span>
                    <span className="text-[9.5px] tabular-nums text-[var(--text-tertiary)]">
                      {env.percent}%
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="tabular-nums font-semibold text-[11.5px] text-[var(--text-primary)]">
                      {mask(formatRupiah(env.remaining))}{" "}
                      <span className="text-[9.5px] font-normal text-[var(--text-tertiary)]">
                        {isIndonesian ? "sisa" : "left"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, env.percent)}%`,
                      background: isDark ? "#ffffff" : "#18181b",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {categoryEnvelopes.length > 3 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setShowAllEnvelopes(!showAllEnvelopes);
              }}
              className="w-full pt-1 flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>
                {showAllEnvelopes
                  ? isIndonesian
                    ? "Tampilkan Lebih Sedikit"
                    : "Show Less"
                  : isIndonesian
                    ? `Lihat Semua (${categoryEnvelopes.length} Amplop)`
                    : `View All (${categoryEnvelopes.length} Envelopes)`}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${
                  showAllEnvelopes ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
