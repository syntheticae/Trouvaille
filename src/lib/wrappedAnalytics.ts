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

export interface AnnualHeatmapDay {
  dayOfYear: number;
  dateStr: string;
  month: number; // 1-12
  dayOfMonth: number;
  weekday: number; // 0=Mon, 1=Tue, ..., 6=Sun (Monday-first)
  weekIndex: number; // 0-52
  amount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isPeak: boolean;
}

export interface MonthIntensitySummary {
  month: number; // 1-12
  monthName: string; // "Jan", "Feb", ...
  amount: number;
  activeDaysCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isPeak: boolean;
}

export interface AnnualHeatmapResult {
  days: AnnualHeatmapDay[];
  weeksCount: number;
  monthSummaries: MonthIntensitySummary[];
  peakDay: AnnualHeatmapDay | null;
  peakMonth: MonthIntensitySummary | null;
  zeroSpendDaysCount: number;
  activeSpendDaysCount: number;
  totalAnnualExpense: number;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Builds full 365/366-day matrix across 52 weeks and 12-month summaries for Annual Wrapped.
 */
export function buildAnnualSpendingHeatmap(
  transactions: Transaction[],
  year: number,
): AnnualHeatmapResult {
  const dailySpend = new Map<string, number>();
  const monthlySpend = new Array(12).fill(0);
  const monthlyActiveDays = new Array(12).fill(0);

  const yearPrefix = `${year}-`;

  for (const t of transactions) {
    if (t.type !== "expense" || !t.occurred_on) continue;
    if (!t.occurred_on.startsWith(yearPrefix)) continue;
    const isCorrection =
      t.note?.includes("[Correction]") ||
      t.note?.includes("Saldo Awal") ||
      t.note?.includes("Opening Balance");
    if (isCorrection) continue;

    const dStr = t.occurred_on.slice(0, 10);
    const amt = Number(t.amount || 0);
    dailySpend.set(dStr, (dailySpend.get(dStr) || 0) + amt);

    const m = parseInt(dStr.slice(5, 7), 10);
    if (m >= 1 && m <= 12) {
      monthlySpend[m - 1] += amt;
    }
  }

  // Determine leap year
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

  let maxDaySpend = 0;
  for (const amt of dailySpend.values()) {
    if (amt > maxDaySpend) maxDaySpend = amt;
  }

  const maxMonthSpend = Math.max(...monthlySpend, 0);

  const days: AnnualHeatmapDay[] = [];
  let peakDay: AnnualHeatmapDay | null = null;
  let zeroSpendDaysCount = 0;
  let activeSpendDaysCount = 0;
  let totalAnnualExpense = 0;

  const startDate = new Date(year, 0, 1);
  // Monday-first weekday: Sunday=6, Monday=0, Tuesday=1 ...
  const startDayRaw = getDay(startDate);
  const startWeekday = (startDayRaw + 6) % 7;

  let maxWeekIndex = 0;

  for (let d = 0; d < totalDays; d++) {
    const curDate = new Date(year, 0, d + 1);
    const m = curDate.getMonth() + 1;
    const dayOfMonth = curDate.getDate();
    const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

    const amt = dailySpend.get(dateStr) || 0;
    totalAnnualExpense += amt;

    const rawWeekday = getDay(curDate);
    const weekday = (rawWeekday + 6) % 7; // 0=Mon, 6=Sun
    const weekIndex = Math.floor((d + startWeekday) / 7);
    if (weekIndex > maxWeekIndex) maxWeekIndex = weekIndex;

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (amt <= 0) {
      intensity = 0;
      zeroSpendDaysCount++;
    } else {
      activeSpendDaysCount++;
      if (m >= 1 && m <= 12) {
        monthlyActiveDays[m - 1]++;
      }
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
    const dayItem: AnnualHeatmapDay = {
      dayOfYear: d + 1,
      dateStr,
      month: m,
      dayOfMonth,
      weekday,
      weekIndex,
      amount: amt,
      intensity,
      isPeak,
    };

    if (isPeak && !peakDay) {
      peakDay = dayItem;
    }

    days.push(dayItem);
  }

  // Build Month Intensity Summaries
  let peakMonth: MonthIntensitySummary | null = null;
  const monthSummaries: MonthIntensitySummary[] = [];

  for (let m = 0; m < 12; m++) {
    const amt = monthlySpend[m];
    const isPeak = amt > 0 && amt === maxMonthSpend;
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;

    if (amt > 0 && maxMonthSpend > 0) {
      const ratio = amt / maxMonthSpend;
      if (ratio > 0.75) intensity = 4;
      else if (ratio > 0.45) intensity = 3;
      else if (ratio > 0.2) intensity = 2;
      else intensity = 1;
    }

    const item: MonthIntensitySummary = {
      month: m + 1,
      monthName: MONTH_NAMES[m],
      amount: amt,
      activeDaysCount: monthlyActiveDays[m],
      intensity,
      isPeak,
    };

    if (isPeak && !peakMonth) {
      peakMonth = item;
    }

    monthSummaries.push(item);
  }

  return {
    days,
    weeksCount: maxWeekIndex + 1,
    monthSummaries,
    peakDay,
    peakMonth,
    zeroSpendDaysCount,
    activeSpendDaysCount,
    totalAnnualExpense,
  };
}

export interface PeriodicCashflowPoint {
  label: string;
  subLabel?: string;
  inflow: number;
  outflow: number;
  net: number;
  isPeakOutflow?: boolean;
  isPeakInflow?: boolean;
}

/**
 * Builds periodic multi-series cashflow breakdown (Month-by-Month for Year mode, Week-by-Week for Month mode).
 */
export function buildPeriodicCashflowData(
  transactions: Transaction[],
  mode: "month" | "year",
  targetYear: number,
  targetMonth: number,
): PeriodicCashflowPoint[] {
  if (mode === "year") {
    const yearPrefix = `${targetYear}-`;
    const inflows = new Array(12).fill(0);
    const outflows = new Array(12).fill(0);

    for (const t of transactions) {
      if (!t.occurred_on || !t.occurred_on.startsWith(yearPrefix)) continue;
      const isCorrection =
        t.note?.includes("[Correction]") ||
        t.note?.includes("Saldo Awal") ||
        t.note?.includes("Opening Balance");
      if (isCorrection) continue;

      const m = parseInt(t.occurred_on.slice(5, 7), 10);
      if (m < 1 || m > 12) continue;

      const amt = Number(t.amount || 0);
      if (t.type === "income") {
        inflows[m - 1] += amt;
      } else if (t.type === "expense") {
        outflows[m - 1] += amt;
      }
    }

    const maxInflow = Math.max(...inflows, 0);
    const maxOutflow = Math.max(...outflows, 0);

    return MONTH_NAMES.map((mName, idx) => {
      const inf = inflows[idx];
      const outf = outflows[idx];
      return {
        label: mName,
        subLabel: `${targetYear}`,
        inflow: inf,
        outflow: outf,
        net: inf - outf,
        isPeakInflow: inf > 0 && inf === maxInflow,
        isPeakOutflow: outf > 0 && outf === maxOutflow,
      };
    });
  }

  // Month Mode: Split into 4-5 weekly buckets
  const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const daysInMonth = getDaysInMonth(new Date(targetYear, targetMonth - 1, 1));

  // Buckets: Days 1-7, 8-14, 15-21, 22-28, 29-end
  const buckets = [
    { label: "W1", range: "1-7", start: 1, end: 7, inflow: 0, outflow: 0 },
    { label: "W2", range: "8-14", start: 8, end: 14, inflow: 0, outflow: 0 },
    { label: "W3", range: "15-21", start: 15, end: 21, inflow: 0, outflow: 0 },
    { label: "W4", range: "22-28", start: 22, end: 28, inflow: 0, outflow: 0 },
  ];

  if (daysInMonth > 28) {
    buckets.push({
      label: "W5",
      range: `29-${daysInMonth}`,
      start: 29,
      end: daysInMonth,
      inflow: 0,
      outflow: 0,
    });
  }

  for (const t of transactions) {
    if (!t.occurred_on || !t.occurred_on.startsWith(monthPrefix)) continue;
    const isCorrection =
      t.note?.includes("[Correction]") ||
      t.note?.includes("Saldo Awal") ||
      t.note?.includes("Opening Balance");
    if (isCorrection) continue;

    const day = parseInt(t.occurred_on.slice(8, 10), 10);
    if (isNaN(day)) continue;

    const amt = Number(t.amount || 0);
    const targetBucket = buckets.find((b) => day >= b.start && day <= b.end);
    if (!targetBucket) continue;

    if (t.type === "income") {
      targetBucket.inflow += amt;
    } else if (t.type === "expense") {
      targetBucket.outflow += amt;
    }
  }

  const maxInflow = Math.max(...buckets.map((b) => b.inflow), 0);
  const maxOutflow = Math.max(...buckets.map((b) => b.outflow), 0);

  return buckets.map((b) => ({
    label: b.label,
    subLabel: b.range,
    inflow: b.inflow,
    outflow: b.outflow,
    net: b.inflow - b.outflow,
    isPeakInflow: b.inflow > 0 && b.inflow === maxInflow,
    isPeakOutflow: b.outflow > 0 && b.outflow === maxOutflow,
  }));
}

