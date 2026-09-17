import type { Transaction } from "./types";
import { getDaysInMonth, parseISO, getDay } from "date-fns";

export interface CascadeCategory {
  rank: number;
  name: string;
  total: number;
  percentage: number;
  emoji?: string;
  count: number;
}

export interface HeatmapDay {
  day: number;
  dateStr: string;
  weekday: number;
  amount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isPeak: boolean;
}

export interface RunwayProjectionPoint {
  periodLabel: string;
  amount: number;
  isProjected: boolean;
}

/**
 * Builds the top 5 cascade categories formatted with relative percentages
 * exactly for the Stacked Cascade Chart layout.
 */
export function buildCascadeCategories(
  sortedCategories: Array<{
    name: string;
    total: number;
    count: number;
    emoji?: string;
  }>,
  totalExpense: number,
  limit = 5,
): CascadeCategory[] {
  if (totalExpense <= 0 || sortedCategories.length === 0) {
    return [];
  }

  const top = sortedCategories.slice(0, limit);
  return top.map((cat, idx) => {
    const rawPct = Math.round((cat.total / totalExpense) * 100);
    return {
      rank: idx + 1,
      name: cat.name,
      total: cat.total,
      percentage: Math.max(1, rawPct),
      emoji: cat.emoji,
      count: cat.count,
    };
  });
}

/**
 * Builds day-by-day intensity matrix for the Temporal Spending Heatmap.
 */
export function buildSpendingHeatmap(
  transactions: Transaction[],
  year: number,
  month: number, // 1-12
): {
  days: HeatmapDay[];
  peakDay: HeatmapDay | null;
  zeroSpendDaysCount: number;
  activeSpendDaysCount: number;
} {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const dailySpend = new Map<number, number>();

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  for (const t of transactions) {
    if (t.type !== "expense" || !t.occurred_on) continue;
    if (!t.occurred_on.startsWith(monthPrefix)) continue;
    const isCorrection =
      t.note?.includes("[Correction]") ||
      t.note?.includes("Saldo Awal") ||
      t.note?.includes("Opening Balance");
    if (isCorrection) continue;

    const dayNum = parseInt(t.occurred_on.slice(8, 10), 10);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= daysInMonth) {
      dailySpend.set(dayNum, (dailySpend.get(dayNum) || 0) + Number(t.amount || 0));
    }
  }

  let maxDaySpend = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const val = dailySpend.get(d) || 0;
    if (val > maxDaySpend) maxDaySpend = val;
  }

  const days: HeatmapDay[] = [];
  let peakDay: HeatmapDay | null = null;
  let zeroSpendDaysCount = 0;
  let activeSpendDaysCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const amt = dailySpend.get(d) || 0;
    const dateStr = `${monthPrefix}-${String(d).padStart(2, "0")}`;
    let weekday = 0;
    try {
      weekday = getDay(parseISO(dateStr));
    } catch {
      weekday = 0;
    }

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (amt <= 0) {
      intensity = 0;
      zeroSpendDaysCount++;
    } else {
      activeSpendDaysCount++;
      if (maxDaySpend <= 0) {
        intensity = 1;
      } else {
        const ratio = amt / maxDaySpend;
        if (ratio > 0.75) intensity = 4;
        else if (ratio > 0.45) intensity = 3;
        else if (ratio > 0.2) intensity = 2;
        else intensity = 1;
      }
    }

    const isPeak = amt > 0 && amt === maxDaySpend;
    const dayItem: HeatmapDay = {
      day: d,
      dateStr,
      weekday,
      amount: amt,
      intensity,
      isPeak,
    };

    if (isPeak && !peakDay) {
      peakDay = dayItem;
    }

    days.push(dayItem);
  }

  return {
    days,
    peakDay,
    zeroSpendDaysCount,
    activeSpendDaysCount,
  };
}

/**
 * Builds multi-horizon wealth accumulation projection curve.
 * Extrapolates current period savings rate over the next 6 months.
 */
export function buildRunwayProjection(
  totalIncome: number,
  totalExpense: number,
  baseSurplusMultiplier = 1,
): {
  points: RunwayProjectionPoint[];
  terminalProjectedSurplus: number;
  monthlyPace: number;
} {
  const monthlyNet = Math.max(0, totalIncome - totalExpense) * baseSurplusMultiplier;
  const points: RunwayProjectionPoint[] = [
    { periodLabel: "Present", amount: 0, isProjected: false },
    { periodLabel: "+1 Mo", amount: Math.round(monthlyNet * 1), isProjected: true },
    { periodLabel: "+2 Mo", amount: Math.round(monthlyNet * 2.05), isProjected: true },
    { periodLabel: "+3 Mo (Qtr)", amount: Math.round(monthlyNet * 3.15), isProjected: true },
    { periodLabel: "+4 Mo", amount: Math.round(monthlyNet * 4.28), isProjected: true },
    { periodLabel: "+5 Mo", amount: Math.round(monthlyNet * 5.45), isProjected: true },
    { periodLabel: "+6 Mo (H2)", amount: Math.round(monthlyNet * 6.68), isProjected: true },
  ];

  const terminalProjectedSurplus = points[points.length - 1].amount;

  return {
    points,
    terminalProjectedSurplus,
    monthlyPace: monthlyNet,
  };
}
