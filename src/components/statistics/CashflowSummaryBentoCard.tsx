import { Wallet } from "lucide-react";

interface DeltaInfo {
  pct: number;
  isUp: boolean;
  diff?: number;
}

interface CashflowSummaryBentoCardProps {
  isIndonesian: boolean;
  isDark: boolean;
  range: string;
  rangeTitle: string;
  totalIncome: number;
  totalExpense: number;
  incomeDelta: DeltaInfo | null;
  expenseDelta: DeltaInfo | null;
  netDelta: DeltaInfo | null;
  hideBalance: boolean;
  formatWithPreferred: (amount: number) => string;
  formatCompactWithPreferred: (amount: number) => string;
}

export function CashflowSummaryBentoCard({
  isIndonesian,
  isDark,
  range,
  rangeTitle,
  totalIncome,
  totalExpense,
  incomeDelta,
  expenseDelta,
  netDelta,
  hideBalance,
  formatWithPreferred,
  formatCompactWithPreferred,
}: CashflowSummaryBentoCardProps) {
  const netValue = totalIncome - totalExpense;
  const retentionRate =
    totalIncome > 0 ? Math.max(0, (netValue / totalIncome) * 100) : 0;
  const totalVolume = totalIncome + totalExpense;

  const maskFull = (amount: number) =>
    hideBalance ? "••••••••" : formatWithPreferred(amount);
  const maskCompact = (amount: number) =>
    hideBalance ? "••••••" : formatCompactWithPreferred(amount);

  return (
    <div
      className="p-5 rounded-[24px] select-none space-y-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* 1-Line Header with Vector Icon */}
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
            <Wallet size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3
              className="text-[13px] font-semibold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Ringkasan Arus Kas" : "Cashflow Summary"}
            </h3>
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Retensi kas bersih & pacing likuiditas"
                : "Net cash retention & pacing"}{" "}
              · {rangeTitle}
            </p>
          </div>
        </div>

        <div
          className="px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isDark ? "#FFFFFF" : "#18181B",
            }}
          />
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {netValue >= 0
              ? isIndonesian
                ? `Tersimpan ${retentionRate.toFixed(0)}%`
                : `Retained ${retentionRate.toFixed(0)}%`
              : isIndonesian
                ? `Defisit ${((Math.abs(netValue) / (totalIncome || 1)) * 100).toFixed(0)}%`
                : `Deficit ${((Math.abs(netValue) / (totalIncome || 1)) * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>

      {/* Large Hero Number & Context Narrative */}
      <div className="space-y-1">
        <div
          className="text-[34px] sm:text-[38px] font-light tracking-tight leading-none tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {hideBalance
            ? "••••••••"
            : netValue < 0
              ? `-${formatWithPreferred(Math.abs(netValue))}`
              : `+${formatWithPreferred(netValue)}`}
        </div>
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {netValue < 0
            ? isIndonesian
              ? `Arus kas keluar sebesar ${maskFull(totalExpense)} sedikit melampaui pemasukan ${maskFull(totalIncome)} pada periode ini.`
              : `Outflow of ${maskFull(totalExpense)} exceeded inflow of ${maskFull(totalIncome)} for this period.`
            : isIndonesian
              ? `Surplus bersih sebesar ${maskFull(netValue)} berhasil dipertahankan (${retentionRate.toFixed(0)}% retensi) pada periode ini.`
              : `Net surplus of ${maskFull(netValue)} retained (${retentionRate.toFixed(0)}% retention) for this period.`}
        </p>
      </div>

      {/* Segmented Dual Proportion Bar */}
      <div className="space-y-1.5 pt-1">
        <div
          className="h-2 w-full rounded-full overflow-hidden flex gap-0.5 p-0.5"
          style={{ background: "var(--glass-fill)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalVolume > 0 ? (totalIncome / totalVolume) * 100 : 50}%`,
              background: isDark ? "#FFFFFF" : "#18181B",
            }}
          />
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalVolume > 0 ? (totalExpense / totalVolume) * 100 : 50}%`,
              background: isDark
                ? "rgba(255,255,255,0.4)"
                : "rgba(24,24,27,0.4)",
            }}
          />
        </div>
        <div
          className="flex items-center justify-between text-[10px] tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isDark ? "#FFFFFF" : "#18181B" }}
            />
            <span>
              {isIndonesian ? "Masuk" : "Inflow"}:{" "}
              {maskCompact(totalIncome)} (
              {totalVolume > 0
                ? ((totalIncome / totalVolume) * 100).toFixed(0)
                : 0}
              %)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(24,24,27,0.4)",
              }}
            />
            <span>
              {isIndonesian ? "Keluar" : "Outflow"}:{" "}
              {maskCompact(totalExpense)} (
              {totalVolume > 0
                ? ((totalExpense / totalVolume) * 100).toFixed(0)
                : 0}
              %)
            </span>
          </div>
        </div>
      </div>

      {/* 3-Pillar Micro Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div
          className="p-2.5 rounded-2xl text-center"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="text-[9.5px] uppercase font-semibold block truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Total Masuk" : "Total In"}
          </span>
          <span
            className="text-[13px] font-semibold tabular-nums block mt-0.5 truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {maskCompact(totalIncome)}
          </span>
          <span
            className="text-[9px] block mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {range === "month" && incomeDelta
              ? `${incomeDelta.isUp ? "↑" : "↓"} ${incomeDelta.pct}% ${isIndonesian ? "vs lalu" : "vs prev"}`
              : isIndonesian
                ? "Arus positif"
                : "Positive inflow"}
          </span>
        </div>

        <div
          className="p-2.5 rounded-2xl text-center"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="text-[9.5px] uppercase font-semibold block truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Total Keluar" : "Total Out"}
          </span>
          <span
            className="text-[13px] font-semibold tabular-nums block mt-0.5 truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {maskCompact(totalExpense)}
          </span>
          <span
            className="text-[9px] block mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {range === "month" && expenseDelta
              ? `${expenseDelta.isUp ? "↑" : "↓"} ${expenseDelta.pct}% ${isIndonesian ? "vs lalu" : "vs prev"}`
              : isIndonesian
                ? "Beban transaksi"
                : "Total outflows"}
          </span>
        </div>

        <div
          className="p-2.5 rounded-2xl text-center"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="text-[9.5px] uppercase font-semibold block truncate"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Saldo Bersih" : "Net Balance"}
          </span>
          <span
            className="text-[13px] font-semibold tabular-nums block mt-0.5 truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {hideBalance
              ? "••••••"
              : netValue < 0
                ? `-${formatCompactWithPreferred(Math.abs(netValue))}`
                : `+${formatCompactWithPreferred(netValue)}`}
          </span>
          <span
            className="text-[9px] block mt-0.5 font-medium truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {range === "month" && netDelta
              ? `${netDelta.isUp ? "↑" : "↓"} ${netDelta.pct}% ${isIndonesian ? "vs lalu" : "vs prev"}`
              : netValue >= 0
                ? isIndonesian
                  ? "Surplus Terjaga"
                  : "Surplus Retained"
                : isIndonesian
                  ? "Defisit Terkendali"
                  : "Deficit Controlled"}
          </span>
        </div>
      </div>
    </div>
  );
}
