// ======================================================================
// TROUVAILLE CASHFLOW VELOCITY CARD
// Cadence, Daily Expense pace, Ticket size, & Sankey flow action
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme (No )
// ======================================================================

import React, { useMemo } from "react";
import { Zap, Layers, ChevronRight } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { useCurrency } from "../../contexts/CurrencyContext";

interface CashflowVelocityCardProps {
  savingsRate?: number;
  SavingsRing?: React.ComponentType<{ rate: number; size?: number }>;
  avgTransactionStats: {
    avgExpense: number;
    count: number;
    avgDelta?: { pct: number; isUp: boolean } | null;
  };
  range: string;
  totalExpense: number;
  walletUsageStats?: any[];
  rangeTitle?: string;
  walletFilterType?: "all" | "expense" | "income";
  setWalletFilterType?: (type: "all" | "expense" | "income") => void;
  maxWalletVolume?: number;
  hashtagStats?: any[];
  isDark: boolean;
  isIndonesian: boolean;
  onOpenSankey?: () => void;
  [key: string]: any;
}

export function CashflowVelocityCard({
  avgTransactionStats,
  range,
  totalExpense,
  isDark,
  isIndonesian,
  onOpenSankey,
}: CashflowVelocityCardProps) {
  const { formatWithPreferred } = useCurrency();

  const daysCount = useMemo(() => {
    if (range === "week") return 7;
    if (range === "month") return 30;
    if (range === "year") return 365;
    return 30;
  }, [range]);

  const dailyPace =
    totalExpense > 0 ? Math.round(totalExpense / daysCount) : 0;
  const dailyTxCount =
    avgTransactionStats?.count > 0
      ? (avgTransactionStats.count / daysCount).toFixed(1)
      : "0";

  return (
    <div
      className="relative overflow-hidden p-5 rounded-[24px] select-none space-y-4"
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

      {/* 1-Line Header with Vector Icon */}
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
            <Zap size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[13px] font-semibold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian
                ? "Kecepatan Transaksi & Alur Dana"
                : "Transaction Velocity & Flow"}
            </h2>
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Frekuensi pengeluaran & diagram transmisi arus kas"
                : "Spending cadence & fund transmission flow"}
            </p>
          </div>
        </div>

        <div
          className="px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isDark ? "#FFFFFF" : "#18181B" }}
          />
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {dailyTxCount} {isIndonesian ? "trx / hari" : "txs / day"}
          </span>
        </div>
      </div>

      {/* 2 Metric Boxes (Beban Harian & Rata-Rata Tiket) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="p-3.5 rounded-2xl"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.025)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.04)",
          }}
        >
          <span
            className="text-[10px] uppercase font-semibold block truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Beban Harian" : "Daily Expense"}
          </span>
          <span
            className="text-[15px] font-bold tabular-nums block mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {formatWithPreferred(dailyPace)}
          </span>
          <span
            className="text-[10px] block mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Laju ritme berkala" : "Active spending pace"}
          </span>
        </div>

        <div
          className="p-3.5 rounded-2xl"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.025)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.04)",
          }}
        >
          <span
            className="text-[10px] uppercase font-semibold block truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Rata-Rata Tiket" : "Avg Ticket Size"}
          </span>
          <span
            className="text-[15px] font-bold tabular-nums block mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {formatWithPreferred(avgTransactionStats?.avgExpense || 0)}
          </span>
          <span
            className="text-[10px] block mt-0.5 tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {avgTransactionStats?.count || 0}{" "}
            {isIndonesian ? "total transaksi" : "total transactions"}
          </span>
        </div>
      </div>

      {/* Full-Width Action Button to Open Sankey Diagram BottomSheet */}
      <button
        type="button"
        onClick={() => {
          if (onOpenSankey) {
            triggerHaptic("light");
            onOpenSankey();
          }
        }}
        className="w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] hover:opacity-90"
        style={{
          background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
          color: "var(--text-primary)",
        }}
      >
        <Layers size={14} strokeWidth={1.75} />
        <span>
          {isIndonesian
            ? "Eksplorasi Diagram Alur Dana (Sankey Flow)"
            : "Explore Cashflow Diagram (Sankey Flow)"}
        </span>
        <ChevronRight
          size={13}
          strokeWidth={2}
          style={{ color: "var(--text-tertiary)" }}
        />
      </button>
    </div>
  );
}
