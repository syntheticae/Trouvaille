// ======================================================================
// TROUVAILLE CASHFLOW VELOCITY CARD
// Savings Rate ring, Avg Transaction volume, Active Accounts gauge, & Hashtags
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import React from "react";
import { CreditCard } from "lucide-react";
import { IconRenderer } from "../ui/IconRenderer";
import { formatRupiah } from "../../lib/utils";
import { useCurrency } from "../../contexts/CurrencyContext";

interface CashflowVelocityCardProps {
  savingsRate: number;
  SavingsRing: React.ComponentType<{ rate: number; size?: number }>;
  avgTransactionStats: any;
  range: string;
  totalExpense: number;
  walletUsageStats: any[];
  rangeTitle: string;
  walletFilterType: "all" | "expense" | "income";
  setWalletFilterType: (type: "all" | "expense" | "income") => void;
  maxWalletVolume: number;
  hashtagStats: any[];
  isDark: boolean;
  isIndonesian: boolean;
}

export function CashflowVelocityCard({
  savingsRate,
  SavingsRing,
  avgTransactionStats,
  range,
  totalExpense,
  walletUsageStats,
  rangeTitle,
  walletFilterType,
  setWalletFilterType,
  maxWalletVolume,
  hashtagStats,
  isDark,
  isIndonesian,
}: CashflowVelocityCardProps) {
  useCurrency();

  return (
    <div className="space-y-4">
      {/* 2-column mini stat cards (Savings Rate & Average Expense) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Savings Ring card */}
        <div className="p-4 rounded-[22px] glass-surface flex flex-col items-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Tingkat Tabungan" : "Savings Rate"}
          </p>
          <SavingsRing rate={savingsRate} size={110} />
        </div>
        {/* Average Transaction Size & Count Card */}
        <div className="p-4 rounded-[22px] glass-surface flex flex-col justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Rata-rata Keluar" : "Avg Expense"}
            </p>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <p
                className="amount text-[17px]"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(avgTransactionStats.avgExpense)}
              </p>
              {avgTransactionStats.avgDelta && range === "month" && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {avgTransactionStats.avgDelta.isUp ? "↑" : "↓"}{" "}
                  {avgTransactionStats.avgDelta.pct}%
                </span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--glass-border)]">
            <div className="flex justify-between items-center text-[10px]">
              <span style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Aktivitas:" : "Activity:"}
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {avgTransactionStats.count} {isIndonesian ? "transaksi" : "txs"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] mt-1">
              <span style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Total Keluar:" : "Total Out:"}
              </span>
              <span
                className="amount"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Apple macOS Style: Most Active Accounts & Volume Distribution */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} style={{ color: "var(--text-tertiary)" }} />
              <h2
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Akun Paling Aktif" : "Most Active Accounts"}
              </h2>
            </div>
            <p
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {walletUsageStats.length} {isIndonesian ? "akun" : "accounts"} · {rangeTitle}
            </p>
          </div>
          <div
            className="flex p-1 rounded-full"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {(["all", "expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setWalletFilterType(t)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-all"
                style={{
                  background:
                    walletFilterType === t ? "var(--accent)" : "transparent",
                  color:
                    walletFilterType === t
                      ? "var(--accent-ink)"
                      : "var(--text-secondary)",
                }}
              >
                {t === "all" ? (isIndonesian ? "Semua" : "All") : t === "expense" ? (isIndonesian ? "Keluar" : "Out") : (isIndonesian ? "Masuk" : "In")}
              </button>
            ))}
          </div>
        </div>

        {walletUsageStats.length > 0 ? (
          <div className="space-y-2.5">
            {walletUsageStats.slice(0, 6).map((w, idx) => {
              const activeVal =
                walletFilterType === "expense"
                  ? w.totalExpense
                  : walletFilterType === "income"
                    ? w.totalIncome
                    : w.totalExpense + w.totalIncome;
              const pct =
                maxWalletVolume > 0
                  ? Math.min(
                      100,
                      Math.max(8, (activeVal / maxWalletVolume) * 100),
                    )
                  : 0;

              return (
                <div
                  key={w.name}
                  className="p-3.5 rounded-2xl transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--glass-fill)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <IconRenderer icon={w.icon} size="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="font-semibold text-[13px] truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {w.name}
                          </p>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "var(--glass-fill-strong)",
                              color: "var(--text-tertiary)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {w.count} {isIndonesian ? "trx" : "txs"}
                          </span>
                        </div>
                        <p
                          className="text-[10px] font-medium mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {walletFilterType === "all"
                            ? `${isIndonesian ? "Masuk" : "In"}: ${formatRupiah(w.totalIncome)} · ${isIndonesian ? "Keluar" : "Out"}: ${formatRupiah(w.totalExpense)}`
                            : `Total ${walletFilterType === "expense" ? (isIndonesian ? "Pengeluaran" : "Expense") : (isIndonesian ? "Pemasukan" : "Income")}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="amount text-[14px]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(activeVal)}
                      </span>
                    </div>
                  </div>

                  {/* macOS Sleek Progress Gauge */}
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{
                      background: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background:
                          idx === 0
                            ? "var(--accent)"
                            : idx === 1
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                        opacity: idx === 0 ? 1 : idx === 1 ? 0.75 : 0.45,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="py-8 text-center rounded-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <p
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {isIndonesian ? "Tidak ada aktivitas akun tercatat" : "No account activity recorded"}
            </p>
            <p
              className="text-[10px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Coba pilih periode waktu lain" : "Try selecting another timeframe"}
            </p>
          </div>
        )}
      </div>

      {/* Hashtag Summary */}
      {hashtagStats.length > 0 && (
        <div
          className="p-5 rounded-[24px]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Pelacakan Acara & Tagar" : "Event & Hashtag Tracking"}
            </h2>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {rangeTitle}
            </span>
          </div>
          <div className="space-y-2">
            {hashtagStats.slice(0, 5).map((h) => (
              <div
                key={h.tag}
                className="flex justify-between items-center p-2 rounded-xl"
                style={{ background: "var(--glass-fill)" }}
              >
                <div>
                  <p
                    className="text-[12px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {h.tag}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {h.count} {isIndonesian ? "trx" : "txs"}
                  </p>
                </div>
                <p
                  className="text-[13px] amount"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(h.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
