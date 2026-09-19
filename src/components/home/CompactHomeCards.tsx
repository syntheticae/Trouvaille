// ======================================================================
// TROUVAILLE COMPACT MICRO-WIDGETS & VISUAL CARDS
// Sleek Apple Luxury micro-widgets for 2-column Half & Full layouts
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme, No Colored Emojis
// ======================================================================

import React from "react";
import {
  Info,
  TrendingUp,
  ShieldCheck,
  Zap,
  Calendar,
  ArrowUpRight,
  Clock,
  PieChart,
  Activity,
  Award,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import type { WidgetSize } from "../../lib/widgetLayoutTypes";

// ----------------------------------------------------------------------
// Reusable Compact Half Card Shell with Header & Info (i) Trigger
// ----------------------------------------------------------------------
interface CompactShellProps {
  title: string;
  badge?: string;
  onOpenDetail?: () => void;
  children: React.ReactNode;
}

export function CompactShell({
  title,
  onOpenDetail,
  children,
}: CompactShellProps) {
  return (
    <section className="glass-surface p-3.5 rounded-[22px] flex flex-col justify-between h-[154px] min-h-[154px] max-h-[154px] w-full relative overflow-hidden select-none box-border">
      {/* Top Header with Title and Info Button */}
      <div className="flex items-center justify-between gap-1.5 shrink-0 mb-1">
        <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)] truncate flex-1 leading-snug">
          {title}
        </span>

        {onOpenDetail && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              onOpenDetail();
            }}
            className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
            title="View Details"
          >
            <Info size={11} />
          </button>
        )}
      </div>

      {/* Center & Bottom Content */}
      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// Compact Half Micro-Layouts for Existing Dense Cards
// ----------------------------------------------------------------------

export function CompactSpendingStabilityHalf({
  level,
  dailyAvg,
  volatilityScore,
  onOpenDetail,
}: {
  level: "Low" | "Moderate" | "High";
  dailyAvg: number;
  volatilityScore: number;
  onOpenDetail?: () => void;
}) {
  return (
    <CompactShell title="Stability" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            Daily Outlay
          </span>
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {level}
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(dailyAvg)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
          <span>Variance</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {(volatilityScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(10, volatilityScore * 100))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactCashflowPulseHalf({
  netCashflow,
  consumedPct,
  isAheadOfPace,
  onOpenDetail,
}: {
  netCashflow: number;
  consumedPct: number;
  isAheadOfPace: boolean;
  onOpenDetail?: () => void;
}) {
  const isSurplus = netCashflow >= 0;
  return (
    <CompactShell title="Cashflow" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            Net Retention
          </span>
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: isAheadOfPace ? "var(--text-secondary)" : "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {isAheadOfPace ? "Over Pace" : "On Track"}
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {isSurplus ? "+" : ""}
          {formatRupiah(netCashflow)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
          <span>Budget Used</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {consumedPct.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, consumedPct))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactAIInsightsHalf({
  insightTitle,
  insightCategory,
  onOpenDetail,
}: {
  insightTitle: string;
  insightCategory?: string;
  onOpenDetail?: () => void;
}) {
  return (
    <CompactShell title="AI Insight" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex items-center py-1">
        <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-3">
          {insightTitle}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] font-medium text-[var(--text-tertiary)] shrink-0">
        <div className="flex items-center gap-1">
          <Zap size={11} />
          <span>Diagnostic</span>
        </div>
        {insightCategory && (
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {insightCategory}
          </span>
        )}
      </div>
    </CompactShell>
  );
}

export function CompactGoalsHalf({
  goalTitle,
  progressPct,
  currentAmount,
  targetAmount,
  onOpenDetail,
}: {
  goalTitle: string;
  progressPct: number;
  currentAmount: number;
  targetAmount: number;
  onOpenDetail?: () => void;
}) {
  return (
    <CompactShell title="Top Goal" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[85px]">
            {goalTitle}
          </p>
          <span
            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {progressPct.toFixed(0)}%
          </span>
        </div>
        <p className="text-[11px] amount text-[var(--text-tertiary)] mt-1 truncate">
          {formatRupiah(currentAmount)} / {formatRupiah(targetAmount)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactBillsHalf({
  nextBillName,
  nextBillAmount,
  daysLeft,
  onOpenDetail,
}: {
  nextBillName: string;
  nextBillAmount: number;
  daysLeft: number;
  onOpenDetail?: () => void;
}) {
  const badgeLabel = daysLeft <= 0 ? "Due Today" : `In ${daysLeft}d`;
  return (
    <CompactShell title="Next Bill" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[85px]">
            {nextBillName}
          </p>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {badgeLabel}
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(nextBillAmount)}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
        <Clock size={11} />
        <span>Upcoming cycle</span>
      </div>
    </CompactShell>
  );
}

export function CompactTopCategoriesHalf({
  topCategoryName,
  topCategoryAmount,
  topCategoryPct,
  onOpenDetail,
}: {
  topCategoryName: string;
  topCategoryAmount: number;
  topCategoryPct: number;
  onOpenDetail?: () => void;
}) {
  return (
    <CompactShell title="Top Category" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[85px]">
            {topCategoryName}
          </span>
          <span
            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {topCategoryPct.toFixed(0)}%
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(topCategoryAmount)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, topCategoryPct))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactSplitBillHalf({
  totalPending = 0,
  pendingCount = 0,
  onOpenDetail,
}: {
  totalPending?: number;
  pendingCount?: number;
  onOpenDetail?: () => void;
}) {
  return (
    <CompactShell title="Split Bills" onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            Receivables
          </span>
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {pendingCount} Pending
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(totalPending)}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
        <ArrowUpRight size={11} />
        <span>Tap to settle shares</span>
      </div>
    </CompactShell>
  );
}

// ----------------------------------------------------------------------
// 1. Savings Rate Ring Card (Half & Full Views)
// ----------------------------------------------------------------------
export function SavingsRingCard({
  rate,
  inflow,
  outflow,
  size = "half",
  onOpenDetail,
}: {
  rate: number;
  inflow: number;
  outflow: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const boundedRate = Math.min(100, Math.max(0, rate));
  const radius = size === "half" ? 26 : 38;
  const strokeWidth = size === "half" ? 5 : 6.5;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (boundedRate / 100) * circ;

  const netRetention = inflow - outflow;
  const isSurplus = netRetention >= 0;
  const targetSavings = Math.max(0, inflow * 0.2); // 20% savings rule benchmark
  const ruleProgress =
    targetSavings > 0
      ? Math.min(100, Math.max(0, (netRetention / targetSavings) * 100))
      : 0;

  const ringSvg = (
    <div className="relative flex items-center justify-center shrink-0">
      <svg
        width={(radius + strokeWidth) * 2}
        height={(radius + strokeWidth) * 2}
        className="rotate-[-90deg]"
      >
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={isNaN(offset) ? circ : offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[13px] font-bold amount text-[var(--text-primary)] leading-none">
          {boundedRate.toFixed(0)}%
        </span>
        <span className="text-[8px] font-semibold text-[var(--text-tertiary)] mt-0.5">
          Saved
        </span>
      </div>
    </div>
  );

  if (size === "half") {
    return (
      <CompactShell title="Savings Ring" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex items-center justify-center py-0.5">{ringSvg}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span>{isSurplus ? "Retained" : "Deficit"}</span>
          <span
            className={`font-semibold amount ${
              isSurplus ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {formatRupiah(Math.abs(netRetention))}
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Activity size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              Savings Velocity & Retention
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Capital retention rate vs monthly turnover
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: isSurplus ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {boundedRate.toFixed(1)}% Saved
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        {ringSvg}
        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Inflow
              </span>
              <span className="text-[12px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
                +{formatRupiah(inflow)}
              </span>
            </div>
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Outflow
              </span>
              <span className="text-[12px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
                -{formatRupiah(outflow)}
              </span>
            </div>
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Net Position
              </span>
              <span
                className={`text-[12px] font-semibold amount block mt-0.5 ${
                  isSurplus ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {isSurplus ? "+" : "-"}
                {formatRupiah(Math.abs(netRetention))}
              </span>
            </div>
          </div>

          {/* 20% Target Benchmark */}
          <div className="pt-1">
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
              <span>Standard 20% Savings Rule Target</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatRupiah(targetSavings)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
                style={{ width: `${ruleProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>
          {isSurplus
            ? `Net capital surplus of ${formatRupiah(netRetention)} preserved.`
            : `Outflow exceeds inflow this month by ${formatRupiah(Math.abs(netRetention))}.`}
        </span>
        <span className="font-semibold text-[var(--text-secondary)]">
          {isSurplus ? "Accumulating" : "Capital Deficit"}
        </span>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 2. 7-Day Outflow Velocity Bar Card (Half & Full Views)
// ----------------------------------------------------------------------
export function SpendingVelocityBarCard({
  dailyOutlays,
  dailyAverage,
  size = "half",
  onOpenDetail,
}: {
  dailyOutlays: { dayLabel: string; amount: number; dateStr?: string }[];
  dailyAverage: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const maxAmount = Math.max(1, ...dailyOutlays.map((d) => d.amount));
  const total7d = dailyOutlays.reduce((sum, d) => sum + d.amount, 0);
  const peakDay = dailyOutlays.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    dailyOutlays[0] || { dayLabel: "-", amount: 0 },
  );
  const aboveAvgDays = dailyOutlays.filter((d) => d.amount > dailyAverage).length;

  const bars = (
    <div className="flex items-end justify-between gap-1.5 h-11 w-full pt-1">
      {dailyOutlays.map((d, i) => {
        const heightPct = Math.min(100, Math.max(8, (d.amount / maxAmount) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${heightPct}%`,
                background:
                  d.amount > dailyAverage * 1.3
                    ? "var(--text-primary)"
                    : "rgba(255,255,255,0.25)",
              }}
              title={`${d.dayLabel}: ${formatRupiah(d.amount)}`}
            />
            <span className="text-[8px] font-semibold text-[var(--text-tertiary)]">
              {d.dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (size === "half") {
    return (
      <CompactShell title="7D Velocity" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex items-center py-0.5">{bars}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span>Avg Pace</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(dailyAverage)}/d
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <TrendingUp size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              7-Day Outflow Velocity
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Daily spending run rate vs monthly average benchmark
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full amount"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            Avg: {formatRupiah(dailyAverage)}/day
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3 Summary Metric Pills */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            7-Day Total Outflow
          </span>
          <span className="text-[13px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(total7d)}
          </span>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            7-Day Daily Run Rate
          </span>
          <span className="text-[13px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(Math.round(total7d / 7))}/d
          </span>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Peak Outlay Day
          </span>
          <span className="text-[13px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {peakDay.dayLabel} ({formatRupiah(peakDay.amount)})
          </span>
        </div>
      </div>

      {/* Taller Enhanced Bars with Exact Amounts */}
      <div className="pt-2">
        <div className="flex items-end justify-between gap-2 h-20 w-full relative">
          {/* Average Benchmark Guide Line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-white/20 pointer-events-none z-10"
            style={{
              bottom: `${Math.min(95, Math.max(10, (dailyAverage / maxAmount) * 100))}%`,
            }}
          >
            <span className="text-[8px] font-mono text-[var(--text-tertiary)] absolute right-0 -top-3.5 px-1 bg-black/40 rounded">
              Avg: {formatRupiah(dailyAverage)}
            </span>
          </div>

          {dailyOutlays.map((d, i) => {
            const heightPct = Math.min(100, Math.max(6, (d.amount / maxAmount) * 100));
            const isPeak = d.amount === peakDay.amount && d.amount > 0;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end z-20 group relative cursor-pointer"
              >
                {/* Amount Label Above Bar */}
                <span className="text-[8.5px] font-mono font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                  {d.amount > 0
                    ? `${Math.round(d.amount / 1000)}k`
                    : "0"}
                </span>

                <div
                  className="w-full rounded-md transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    background: isPeak
                      ? "var(--text-primary)"
                      : d.amount > dailyAverage
                        ? "rgba(255, 255, 255, 0.6)"
                        : d.amount > 0
                          ? "rgba(255, 255, 255, 0.22)"
                          : "rgba(255, 255, 255, 0.06)",
                    boxShadow: isPeak
                      ? "0 0 10px rgba(255, 255, 255, 0.35)"
                      : "none",
                  }}
                  title={`${d.dayLabel}: ${formatRupiah(d.amount)}`}
                />

                <span className="text-[9px] font-semibold text-[var(--text-tertiary)]">
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>
          {aboveAvgDays > 0
            ? `${aboveAvgDays} of 7 days exceeded daily average allowance.`
            : "All 7 days maintained below daily average allowance."}
        </span>
        <span className="font-semibold text-[var(--text-secondary)]">
          Pacing: {Math.round(total7d / 7) <= dailyAverage ? "Controlled" : "Elevated"}
        </span>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 3. Category Donut Distribution Card (Half & Full Views)
// ----------------------------------------------------------------------
export function CategoryDonutCard({
  categories,
  totalExpense,
  size = "half",
  onOpenDetail,
}: {
  categories: { name: string; amount: number; pct: number; count?: number }[];
  totalExpense: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const topCat = categories[0] || { name: "No expenses", amount: 0, pct: 0 };

  const donutSvg = (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width="68" height="68" className="rotate-[-90deg]">
        <circle
          cx="34"
          cy="34"
          r="26"
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth="6"
          opacity={0.3}
        />
        <circle
          cx="34"
          cy="34"
          r="26"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="6"
          strokeDasharray={`${(topCat.pct / 100) * 163.3} 163.3`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[12px] font-bold text-[var(--text-primary)]">
          {topCat.pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );

  if (size === "half") {
    return (
      <CompactShell title="Categories" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex items-center justify-center py-0.5">{donutSvg}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span className="truncate max-w-[70px]">{topCat.name}</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(topCat.amount)}
          </span>
        </div>
      </CompactShell>
    );
  }

  // Multi-Segment SVG Donut calculations for Full Mode
  const fullRadius = 38;
  const fullStroke = 8.5;
  const fullCirc = 2 * Math.PI * fullRadius; // ~238.7
  const segmentShades = [
    "rgba(255, 255, 255, 0.95)",
    "rgba(255, 255, 255, 0.68)",
    "rgba(255, 255, 255, 0.42)",
    "rgba(255, 255, 255, 0.24)",
    "rgba(255, 255, 255, 0.12)",
  ];

  let cumulativeOffset = 0;
  const donutSegments = categories.slice(0, 5).map((cat, idx) => {
    const strokeDash = (Math.max(0, cat.pct) / 100) * fullCirc;
    const currentOffset = cumulativeOffset;
    cumulativeOffset += strokeDash;
    return {
      ...cat,
      strokeDash,
      offset: currentOffset,
      color: segmentShades[idx % segmentShades.length],
    };
  });

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <PieChart size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              Expense Allocation Donut
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Sector-by-sector outflow distribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full amount"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            Total: {formatRupiah(totalExpense)}
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 pt-1">
        {/* Multi-Segment Full Donut */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={(fullRadius + fullStroke) * 2}
            height={(fullRadius + fullStroke) * 2}
            className="rotate-[-90deg]"
          >
            <circle
              cx={fullRadius + fullStroke}
              cy={fullRadius + fullStroke}
              r={fullRadius}
              fill="none"
              stroke="var(--glass-border)"
              strokeWidth={fullStroke}
              opacity={0.3}
            />
            {donutSegments.map((seg, idx) => (
              <circle
                key={idx}
                cx={fullRadius + fullStroke}
                cy={fullRadius + fullStroke}
                r={fullRadius}
                fill="none"
                stroke={seg.color}
                strokeWidth={fullStroke}
                strokeDasharray={`${seg.strokeDash} ${fullCirc - seg.strokeDash}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                style={{ transition: "all 0.6s ease-in-out" }}
              />
            ))}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[11px] font-bold amount text-[var(--text-primary)] leading-tight">
              {categories.length}
            </span>
            <span className="text-[8px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Sectors
            </span>
          </div>
        </div>

        {/* Detailed Category Rows with Progress Bars */}
        <div className="flex-1 space-y-2">
          {categories.slice(0, 4).map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: segmentShades[i % segmentShades.length] }}
                  />
                  <span className="text-[var(--text-primary)] font-medium truncate max-w-[110px]">
                    {c.name}
                  </span>
                  {c.count && (
                    <span className="text-[9px] text-[var(--text-tertiary)] font-mono">
                      ({c.count} tx)
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold amount text-[var(--text-primary)]">
                    {formatRupiah(c.amount)}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] ml-1 font-mono">
                    {c.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(2, c.pct))}%`,
                    background: segmentShades[i % segmentShades.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>
          {topCat.name} is your largest expense category ({topCat.pct.toFixed(0)}% of total).
        </span>
        <span className="font-semibold text-[var(--text-secondary)]">
          {categories.length} Active Categories
        </span>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 4. Activity Dot Matrix Heatmap Card (Half & Full Views)
// ----------------------------------------------------------------------
export function MiniHeatmapCard({
  daysWithSpend,
  activeDaysCount,
  totalMonthSpend = 0,
  dailyAverage = 0,
  size = "half",
  onOpenDetail,
}: {
  daysWithSpend: {
    day: number;
    date?: Date;
    hasSpend: boolean;
    amount?: number;
    intensity: number;
    isToday?: boolean;
    dayOfWeek?: number;
  }[];
  activeDaysCount: number;
  totalMonthSpend?: number;
  dailyAverage?: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const dots = daysWithSpend.slice(0, 28);
  const totalDays = daysWithSpend.length;
  const zeroSpendDays = Math.max(0, totalDays - activeDaysCount);
  const activeFrequency =
    totalDays > 0 ? Math.round((activeDaysCount / totalDays) * 100) : 0;
  const avgOnActiveDays =
    activeDaysCount > 0 ? Math.round(totalMonthSpend / activeDaysCount) : 0;
  const effectiveDailyAvg =
    dailyAverage > 0 ? dailyAverage : Math.round(totalMonthSpend / Math.max(1, totalDays));
  const peakDay = daysWithSpend.reduce(
    (max, d) => ((d.amount || 0) > (max.amount || 0) ? d : max),
    daysWithSpend[0] || { day: 1, amount: 0 },
  );

  const halfGrid = (
    <div className="grid grid-cols-7 gap-1.5 py-0.5 w-full max-w-[130px] mx-auto">
      {dots.map((d, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full mx-auto transition-all"
          style={{
            background:
              d.intensity > 0.6
                ? "#FFFFFF"
                : d.intensity > 0.2
                  ? "rgba(255,255,255,0.45)"
                  : d.hasSpend
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.06)",
          }}
          title={`Day ${d.day}: ${d.hasSpend ? `Active (${formatRupiah(d.amount || 0)})` : "Quiet"}`}
        />
      ))}
    </div>
  );

  if (size === "half") {
    return (
      <CompactShell title="Activity Matrix" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex items-center justify-center py-0.5">
          {halfGrid}
        </div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span>Active Days</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {activeDaysCount} of {totalDays}d
          </span>
        </div>
      </CompactShell>
    );
  }

  // Full Month Weekday Labels
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Calendar size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              Monthly Activity Matrix
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Daily transaction frequency & spending density
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {activeDaysCount} Active Days ({activeFrequency}%)
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Key Metrics Bento */}
      <div className="grid grid-cols-4 gap-2">
        <div
          className="p-2 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Total Outflow
          </span>
          <span className="text-[12px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(totalMonthSpend)}
          </span>
        </div>
        <div
          className="p-2 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Run Rate/d
          </span>
          <span className="text-[12px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(effectiveDailyAvg)}
          </span>
        </div>
        <div
          className="p-2 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Active Day Avg
          </span>
          <span className="text-[12px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(avgOnActiveDays)}
          </span>
        </div>
        <div
          className="p-2 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Peak Outlay
          </span>
          <span className="text-[12px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {peakDay.amount ? formatRupiah(peakDay.amount) : "Rp 0"}
          </span>
        </div>
      </div>

      {/* Full Month Calendar Matrix with Weekday Headers and Numbers */}
      <div className="pt-1">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 gap-1.5 pb-1 text-center">
          {weekDays.map((wd, i) => (
            <span
              key={i}
              className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"
            >
              {wd}
            </span>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {daysWithSpend.map((d, i) => {
            const hasSpend = Boolean(d.hasSpend && d.amount && d.amount > 0);
            return (
              <div
                key={i}
                className={`flex flex-col items-center justify-between py-1.5 px-0.5 rounded-lg border transition-all cursor-pointer ${
                  d.isToday
                    ? "ring-1 ring-white/50 border-white/30"
                    : "border-white/5"
                }`}
                style={{
                  background: hasSpend
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(255, 255, 255, 0.01)",
                  minHeight: "44px",
                }}
                title={`Day ${d.day}: ${
                  hasSpend ? formatRupiah(d.amount || 0) : "No spend recorded"
                }`}
              >
                {/* Day Number */}
                <span
                  className={`text-[9px] font-medium leading-none ${
                    d.isToday
                      ? "font-bold text-[var(--text-primary)] underline"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {d.day}
                </span>

                {/* Dot with Intensity */}
                <div
                  className="w-2 h-2 rounded-full my-0.5 transition-all"
                  style={{
                    background:
                      d.intensity > 0.6
                        ? "#FFFFFF"
                        : d.intensity > 0.25
                          ? "rgba(255,255,255,0.65)"
                          : hasSpend
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(255,255,255,0.06)",
                    boxShadow:
                      d.intensity > 0.6
                        ? "0 0 6px rgba(255, 255, 255, 0.4)"
                        : "none",
                  }}
                />

                {/* Amount or Quiet Indicator */}
                <span
                  className={`text-[7.5px] font-mono leading-none truncate max-w-full px-0.5 ${
                    hasSpend
                      ? "text-[var(--text-secondary)] font-semibold"
                      : "text-[var(--text-tertiary)] opacity-30"
                  }`}
                >
                  {hasSpend
                    ? d.amount && d.amount >= 1000
                      ? `${Math.round(d.amount / 1000)}k`
                      : `${d.amount}`
                    : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Analytical Insight Footer */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          <span>Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <span className="text-[9px]">0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span className="text-[9px]">&lt;50k</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/65" />
            <span className="text-[9px]">Mid</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <span className="text-[9px] font-semibold text-[var(--text-primary)]">
              Peak
            </span>
          </div>
        </div>

        <span className="font-medium text-[var(--text-secondary)]">
          {zeroSpendDays} zero-spend days recorded this month
        </span>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 5. Executive Financial Health Meter Card (Half & Full Views)
// ----------------------------------------------------------------------
export function HealthMeterCard({
  healthScore,
  grade = "Optimal",
  size = "half",
  onOpenDetail,
}: {
  healthScore: number;
  grade?: string;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const statusLabel =
    grade ||
    (healthScore >= 80
      ? "Optimal"
      : healthScore >= 60
        ? "Good"
        : healthScore >= 40
          ? "Fair"
          : "Attention");

  if (size === "half") {
    return (
      <CompactShell title="Health Score" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex flex-col justify-center items-center py-1">
          <div className="text-center">
            <span className="text-[26px] font-bold amount text-[var(--text-primary)] leading-none">
              {healthScore}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] block mt-0.5">
              / 100 Index
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
            <span>Status</span>
            <span className="font-semibold text-[var(--text-secondary)]">
              {statusLabel}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--text-primary)] transition-all"
              style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
            />
          </div>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Award size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              Executive Financial Health Index
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Comprehensive telemetry across liquidity, budgeting & savings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {statusLabel} ({healthScore}/100)
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="text-center shrink-0 pr-2">
          <span className="text-[34px] font-bold amount text-[var(--text-primary)] leading-none">
            {healthScore}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mt-1">
            Score / 100
          </span>
        </div>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Savings Pace
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] block mt-0.5">
                {healthScore >= 70 ? "Optimal" : "Attention"}
              </span>
            </div>
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Budget Control
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] block mt-0.5">
                {healthScore >= 50 ? "Safe Track" : "Watch"}
              </span>
            </div>
            <div
              className="p-2 rounded-xl"
              style={{ background: "var(--glass-fill)" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Liquid Cushion
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] block mt-0.5">
                {healthScore >= 60 ? "Resilient" : "Moderate"}
              </span>
            </div>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>Overall health diagnostic indicates controlled cashflow.</span>
        <span className="font-semibold text-[var(--text-secondary)]">
          {healthScore >= 75 ? "High Efficiency" : "Moderate Action Needed"}
        </span>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 6. Liquid Buffer & Runway Card (Half & Full Views)
// ----------------------------------------------------------------------
export function LiquidRunwayCard({
  runwayMonths,
  liquidAssets,
  monthlyBurn,
  size = "half",
  onOpenDetail,
}: {
  runwayMonths: number;
  liquidAssets: number;
  monthlyBurn: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const status =
    runwayMonths >= 6
      ? "Comfort"
      : runwayMonths >= 3
        ? "Safe Buffer"
        : "Critical";

  const targetRunwayMonths = 6;
  const targetCoveragePct = Math.min(
    100,
    Math.round((runwayMonths / targetRunwayMonths) * 100),
  );

  if (size === "half") {
    return (
      <CompactShell title="Runway" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex flex-col justify-center py-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
              Survival Horizon
            </span>
            <span
              className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {status}
            </span>
          </div>
          <p className="text-[20px] font-bold amount text-[var(--text-primary)] leading-tight mt-0.5">
            {runwayMonths.toFixed(1)}{" "}
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              Mos
            </span>
          </p>
        </div>

        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span>Burn Rate</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(monthlyBurn)}/m
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <ShieldCheck size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              Liquid Reserve & Emergency Runway
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Capital survival horizon based on average monthly burn rate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {status} ({runwayMonths.toFixed(1)} Mos)
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Survival Runway
          </span>
          <p className="text-[16px] font-bold amount text-[var(--text-primary)] mt-0.5">
            {runwayMonths.toFixed(1)} Mos
          </p>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Liquid Assets
          </span>
          <p className="text-[13px] font-semibold amount text-[var(--text-primary)] mt-0.5 truncate">
            {formatRupiah(liquidAssets)}
          </p>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Monthly Burn
          </span>
          <p className="text-[13px] font-semibold amount text-[var(--text-primary)] mt-0.5 truncate">
            {formatRupiah(monthlyBurn)}/m
          </p>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="pt-1">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
          <span>Target: 6 Months Emergency Reserve</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {targetCoveragePct}% Funded
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
            style={{ width: `${targetCoveragePct}%` }}
          />
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>
          Liquid capital provides {runwayMonths.toFixed(1)} months of continuous survival runway.
        </span>
        <span className="font-semibold text-[var(--text-secondary)]">
          Target: {formatRupiah(monthlyBurn * targetRunwayMonths)}
        </span>
      </div>
    </section>
  );
}
