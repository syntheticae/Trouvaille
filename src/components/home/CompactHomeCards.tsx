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
  badge,
  onOpenDetail,
  children,
}: CompactShellProps) {
  return (
    <section className="glass-surface p-3.5 rounded-[22px] flex flex-col justify-between h-full min-h-[136px] relative overflow-hidden select-none">
      {/* Top Header with Title and Info Button */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
            {title}
          </span>
          {badge && (
            <span
              className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md shrink-0"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-tertiary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        {onOpenDetail && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              onOpenDetail();
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
            title="View Details"
          >
            <Info size={12} />
          </button>
        )}
      </div>

      {/* Center & Bottom Content */}
      <div className="flex-1 flex flex-col justify-between">{children}</div>
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
    <CompactShell title="Stability" badge={level} onOpenDetail={onOpenDetail}>
      <div>
        <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
          Daily Outlay
        </span>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-0.5">
          {formatRupiah(dailyAvg)}
        </p>
      </div>

      <div className="mt-2.5">
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
    <CompactShell
      title="Cashflow"
      badge={isAheadOfPace ? "Over Pace" : "On Track"}
      onOpenDetail={onOpenDetail}
    >
      <div>
        <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
          Net Retention
        </span>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-0.5">
          {isSurplus ? "+" : ""}
          {formatRupiah(netCashflow)}
        </p>
      </div>

      <div className="mt-2.5">
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
    <CompactShell
      title="AI Insight"
      badge={insightCategory || "Alert"}
      onOpenDetail={onOpenDetail}
    >
      <div className="my-auto">
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
          {insightTitle}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-tertiary)] mt-2">
        <Zap size={11} />
        <span>Diagnostic Available</span>
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
    <CompactShell title="Top Goal" badge={`${progressPct.toFixed(0)}%`} onOpenDetail={onOpenDetail}>
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
          {goalTitle}
        </p>
        <p className="text-[11px] amount text-[var(--text-tertiary)] mt-0.5">
          {formatRupiah(currentAmount)} / {formatRupiah(targetAmount)}
        </p>
      </div>

      <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10 mt-2.5">
        <div
          className="h-full rounded-full bg-[var(--text-primary)] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
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
    <CompactShell title="Next Bill" badge={badgeLabel} onOpenDetail={onOpenDetail}>
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
          {nextBillName}
        </p>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-0.5">
          {formatRupiah(nextBillAmount)}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)] mt-2">
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
    <CompactShell
      title="Top Expense"
      badge={`${topCategoryPct.toFixed(0)}%`}
      onOpenDetail={onOpenDetail}
    >
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
          {topCategoryName}
        </p>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-0.5">
          {formatRupiah(topCategoryAmount)}
        </p>
      </div>

      <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10 mt-2.5">
        <div
          className="h-full rounded-full bg-[var(--text-primary)] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, topCategoryPct))}%` }}
        />
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
    <CompactShell
      title="Split Bills"
      badge={`${pendingCount} Pending`}
      onOpenDetail={onOpenDetail}
    >
      <div>
        <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
          Receivables
        </span>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-0.5">
          {formatRupiah(totalPending)}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)] mt-2">
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
  const radius = size === "half" ? 28 : 36;
  const strokeWidth = 6;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (boundedRate / 100) * circ;

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
        <span className="text-[14px] font-bold amount text-[var(--text-primary)] leading-none">
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
      <CompactShell title="Savings Ring" badge="Monthly" onOpenDetail={onOpenDetail}>
        <div className="flex items-center justify-center py-1">{ringSvg}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5">
          <span>Retained</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(Math.max(0, inflow - outflow))}
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-[var(--text-tertiary)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Savings Velocity & Retention
          </h3>
        </div>
        {onOpenDetail && (
          <button
            type="button"
            onClick={onOpenDetail}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <Info size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {ringSvg}
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-tertiary)]">Gross Inflow:</span>
            <span className="font-semibold amount text-[var(--text-primary)]">
              {formatRupiah(inflow)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-tertiary)]">Total Outflow:</span>
            <span className="font-semibold amount text-[var(--text-primary)]">
              {formatRupiah(outflow)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] pt-1 border-t border-white/5 font-bold">
            <span className="text-[var(--text-secondary)]">Net Capital Saved:</span>
            <span className="amount text-[var(--text-primary)]">
              {formatRupiah(Math.max(0, inflow - outflow))}
            </span>
          </div>
        </div>
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
  dailyOutlays: { dayLabel: string; amount: number }[];
  dailyAverage: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const maxAmount = Math.max(1, ...dailyOutlays.map((d) => d.amount));

  const bars = (
    <div className="flex items-end justify-between gap-1.5 h-12 w-full pt-1">
      {dailyOutlays.map((d, i) => {
        const heightPct = Math.min(100, Math.max(8, (d.amount / maxAmount) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full rounded-sm bg-white/20 hover:bg-white transition-all"
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
      <CompactShell title="7-Day Velocity" badge="Pacing" onOpenDetail={onOpenDetail}>
        <div className="py-0.5">{bars}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5">
          <span>Avg Pace</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(dailyAverage)}/d
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-[var(--text-tertiary)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            7-Day Spending Velocity
          </h3>
        </div>
        <span className="text-[11px] font-semibold amount text-[var(--text-primary)]">
          {formatRupiah(dailyAverage)}/day
        </span>
      </div>
      <div className="pt-2">{bars}</div>
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
  categories: { name: string; amount: number; pct: number }[];
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
      <CompactShell title="Category Donut" badge="Top Share" onOpenDetail={onOpenDetail}>
        <div className="flex items-center justify-center py-1">{donutSvg}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5">
          <span className="truncate max-w-[70px]">{topCat.name}</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(topCat.amount)}
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PieChart size={15} className="text-[var(--text-tertiary)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Expense Allocation Donut
          </h3>
        </div>
        <span className="text-[11px] font-semibold amount text-[var(--text-primary)]">
          {formatRupiah(totalExpense)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {donutSvg}
        <div className="flex-1 space-y-1.5">
          {categories.slice(0, 3).map((c, i) => (
            <div key={i} className="flex justify-between items-center text-[11px]">
              <span className="text-[var(--text-tertiary)] truncate max-w-[100px]">
                {c.name}
              </span>
              <span className="font-semibold text-[var(--text-primary)] amount">
                {c.pct.toFixed(0)}% ({formatRupiah(c.amount)})
              </span>
            </div>
          ))}
        </div>
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
  size = "half",
  onOpenDetail,
}: {
  daysWithSpend: { day: number; hasSpend: boolean; intensity: number }[];
  activeDaysCount: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  // Show 28 dots (4 rows of 7 columns)
  const dots = daysWithSpend.slice(0, 28);

  const grid = (
    <div className="grid grid-cols-7 gap-1.5 py-1">
      {dots.map((d, i) => (
        <div
          key={i}
          className="w-full aspect-square rounded-full transition-all"
          style={{
            background:
              d.intensity > 0.6
                ? "#FFFFFF"
                : d.intensity > 0.2
                  ? "rgba(255,255,255,0.45)"
                  : d.hasSpend
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(255,255,255,0.05)",
          }}
          title={`Day ${d.day}: ${d.hasSpend ? "Active" : "Quiet"}`}
        />
      ))}
    </div>
  );

  if (size === "half") {
    return (
      <CompactShell
        title="Activity Heatmap"
        badge={`${activeDaysCount}d Active`}
        onOpenDetail={onOpenDetail}
      >
        <div className="py-1">{grid}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5">
          <span>28-Day Cluster</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {28 - activeDaysCount} Quiet Days
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[var(--text-tertiary)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Monthly Activity Matrix
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
          {activeDaysCount} active days
        </span>
      </div>
      {grid}
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
  if (size === "half") {
    return (
      <CompactShell title="Health Meter" badge={grade} onOpenDetail={onOpenDetail}>
        <div className="flex items-center justify-center py-2">
          <div className="text-center">
            <span className="text-[26px] font-bold amount text-[var(--text-primary)] leading-none">
              {healthScore}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] block mt-0.5">
              / 100 Index
            </span>
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10 mt-1">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
          />
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award size={15} className="text-[var(--text-tertiary)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Executive Financial Health Index
          </h3>
        </div>
        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white">
          {grade}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-[32px] font-bold amount text-[var(--text-primary)] leading-none">
            {healthScore}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] ml-1">
            pts / 100
          </span>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>Overall Diagnostic Score</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {healthScore >= 75 ? "High Efficiency" : "Moderate Risk"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }}
            />
          </div>
        </div>
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
    runwayMonths >= 6 ? "Comfort" : runwayMonths >= 3 ? "Safe Buffer" : "Critical";

  if (size === "half") {
    return (
      <CompactShell title="Runway Buffer" badge={status} onOpenDetail={onOpenDetail}>
        <div>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            Survival Horizon
          </span>
          <p className="text-[20px] font-bold amount text-[var(--text-primary)] leading-tight mt-0.5">
            {runwayMonths.toFixed(1)}{" "}
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              Mos
            </span>
          </p>
        </div>

        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5">
          <span>Burn Rate</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(monthlyBurn)}/m
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[var(--text-tertiary)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Liquid Reserve & Emergency Runway
          </h3>
        </div>
        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white">
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="text-[10px] text-[var(--text-tertiary)]">Runway</span>
          <p className="text-[18px] font-bold amount text-[var(--text-primary)] mt-0.5">
            {runwayMonths.toFixed(1)} Mos
          </p>
        </div>
        <div>
          <span className="text-[10px] text-[var(--text-tertiary)]">Liquid Assets</span>
          <p className="text-[14px] font-semibold amount text-[var(--text-primary)] mt-0.5 truncate">
            {formatRupiah(liquidAssets)}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-[var(--text-tertiary)]">Monthly Burn</span>
          <p className="text-[14px] font-semibold amount text-[var(--text-primary)] mt-0.5 truncate">
            {formatRupiah(monthlyBurn)}
          </p>
        </div>
      </div>
    </section>
  );
}
