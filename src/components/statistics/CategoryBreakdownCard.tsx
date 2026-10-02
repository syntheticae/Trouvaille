// ======================================================================
// TROUVAILLE CATEGORY BREAKDOWN CARD
// Minimalist clean row list for top categories with fine dividers & percentage
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme (No font-mono)
// ======================================================================

import { useMemo } from "react";
import { Layers, ChevronRight } from "lucide-react";
import { IconRenderer } from "../ui/IconRenderer";
import { triggerHaptic } from "../../lib/haptics";
import { useCurrency } from "../../contexts/CurrencyContext";

interface CategoryBreakdownCardProps {
  breakdownType: "expense" | "income";
  setBreakdownType: (type: "expense" | "income") => void;
  categoryStats: Array<{
    name: string;
    emoji: string;
    total: number;
    count: number;
    budget_amount?: number | null;
  }>;
  totalBreakdownAmount: number;
  isDark: boolean;
  isIndonesian: boolean;
  setAllDetailsOpen: (open: boolean) => void;
  [key: string]: any;
}

export function CategoryBreakdownCard({
  breakdownType,
  setBreakdownType,
  categoryStats,
  totalBreakdownAmount,
  isDark,
  isIndonesian,
  setAllDetailsOpen,
}: CategoryBreakdownCardProps) {
  const { formatWithPreferred } = useCurrency();

  const topCategories = useMemo(() => {
    return (categoryStats || []).slice(0, 3);
  }, [categoryStats]);

  const topItemsTotal = useMemo(() => {
    return topCategories.reduce((acc, cat) => acc + (cat.total || 0), 0);
  }, [topCategories]);

  const topShare =
    totalBreakdownAmount > 0
      ? Math.round((topItemsTotal / totalBreakdownAmount) * 100)
      : 0;

  return (
    <div
      className="relative overflow-hidden p-5 rounded-[24px] select-none space-y-3"
      style={{
        background: isDark
          ? "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)"
          : "linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 247, 250, 0.90) 100%)",
        border: isDark
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(0, 0, 0, 0.06)",
        boxShadow: isDark
          ? "0 18px 44px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
          : "0 10px 30px -8px rgba(31, 36, 48, 0.06), inset 0 1px 0 #ffffff",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Specular Rim Light Reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] right-[12%] top-[1px] h-[1.5px] rounded-full"
        style={{
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), rgba(255,255,255,0.45), rgba(255,255,255,0.25), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(255,255,255,1), rgba(255,255,255,0.8), transparent)",
        }}
      />

      {/* 1-Line Header with Vector Icon and All Categories action */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
              color: "var(--text-primary)",
            }}
          >
            <Layers size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[13px] font-semibold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {breakdownType === "expense"
                ? isIndonesian
                  ? "Alokasi Kategori Terbesar"
                  : "Top Category Allocations"
                : isIndonesian
                  ? "Alokasi Pemasukan Terbesar"
                  : "Top Income Allocations"}
            </h2>
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {topCategories.length > 0
                ? isIndonesian
                  ? `${topCategories.length} pos mendominasi ${topShare}% total ${breakdownType === "expense" ? "pengeluaran" : "pemasukan"}`
                  : `${topCategories.length} categories represent ${topShare}% of ${breakdownType === "expense" ? "outflows" : "inflows"}`
                : isIndonesian
                  ? "Rincian alokasi pos kas"
                  : "Cashflow category distribution"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setAllDetailsOpen(true);
          }}
          className="text-xs font-semibold flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80 shrink-0"
          style={{ color: "var(--text-primary)" }}
        >
          <span>{isIndonesian ? "Semua Pos" : "All Categories"}</span>
          <ChevronRight
            size={13}
            strokeWidth={2}
            style={{ color: "var(--text-tertiary)" }}
          />
        </button>
      </div>

      {/* Segmented Mode Switcher (Keluar / Masuk) */}
      <div
        className="flex p-0.5 rounded-xl self-start w-fit"
        style={{
          background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setBreakdownType("expense");
          }}
          className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
          style={{
            background:
              breakdownType === "expense"
                ? isDark
                  ? "#FFFFFF"
                  : "#18181B"
                : "transparent",
            color:
              breakdownType === "expense"
                ? isDark
                  ? "#09090c"
                  : "#FFFFFF"
                : "var(--text-secondary)",
          }}
        >
          {isIndonesian ? "Pengeluaran" : "Expense"}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setBreakdownType("income");
          }}
          className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
          style={{
            background:
              breakdownType === "income"
                ? isDark
                  ? "#FFFFFF"
                  : "#18181B"
                : "transparent",
            color:
              breakdownType === "income"
                ? isDark
                  ? "#09090c"
                  : "#FFFFFF"
                : "var(--text-secondary)",
          }}
        >
          {isIndonesian ? "Pemasukan" : "Income"}
        </button>
      </div>

      {/* Clean Minimalist Category Rows */}
      {topCategories.length > 0 ? (
        <div className="space-y-2 pt-1">
          {topCategories.map((cat, idx) => {
            const pct =
              totalBreakdownAmount > 0
                ? (cat.total / totalBreakdownAmount) * 100
                : 0;
            const isLast = idx === topCategories.length - 1;
            return (
              <div
                key={cat.name}
                onClick={() => {
                  triggerHaptic("light");
                  setAllDetailsOpen(true);
                }}
                className={`py-2 cursor-pointer transition-colors active:opacity-75 ${
                  !isLast ? "border-b border-[var(--glass-border)]" : ""
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                    </div>
                    <span
                      className="font-medium text-[13px] truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="font-semibold text-[13px] tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatWithPreferred(cat.total)}
                    </span>
                    <span
                      className="font-normal text-[11px] tabular-nums ml-1.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(4, pct))}%`,
                      background:
                        idx === 0
                          ? isDark
                            ? "#FFFFFF"
                            : "#18181B"
                          : idx === 1
                            ? isDark
                              ? "rgba(255,255,255,0.7)"
                              : "rgba(24,24,27,0.7)"
                            : isDark
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(24,24,27,0.4)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="py-6 text-center text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isIndonesian
            ? "Belum ada transaksi pada periode ini."
            : "No transactions recorded for this period."}
        </div>
      )}
    </div>
  );
}
