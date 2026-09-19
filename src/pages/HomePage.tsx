import { GoalDetailModal } from "../components/goals/GoalDetailModal";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import { useGoals } from "../hooks/useGoals";
import { useWallets } from "../hooks/useWallets";
import { useBills } from "../hooks/useBills";
import { CalendarDays, Target, Sparkles } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { resolveTransactionCategory } from "../lib/categoryResolver";
import { useNavigate } from "react-router-dom";
import { Reorder } from "framer-motion";
import { useWidgetLayout } from "../hooks/useWidgetLayout";
import { WidgetCardWrapper, WidgetCustomizationBar } from "../components/common";
import type { WidgetSize } from "../lib/widgetLayoutTypes";
import { HOME_PRESETS } from "../lib/widgetLayoutTypes";
import {
  CompactSpendingStabilityHalf,
  CompactCashflowPulseHalf,
  CompactAIInsightsHalf,
  CompactGoalsHalf,
  CompactTopCategoriesHalf,
  CompactSplitBillHalf,
  SavingsRingCard,
  SpendingVelocityBarCard,
  CategoryDonutCard,
  MiniHeatmapCard,
  HealthMeterCard,
  LiquidRunwayCard,
} from "../components/home/CompactHomeCards";
import { BillManagementSheets } from "../components/settings/BillManagementSheets";

function formatNetAmount(net: number): string {
  const abs = Math.abs(net);
  let val = "";
  if (abs >= 1000000) {
    val = (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  } else if (abs >= 1000) {
    val = Math.round(abs / 1000) + "k";
  } else {
    val = abs.toString();
  }
  return net < 0 ? `-${val}` : `+${val}`;
}

import { useState, useMemo } from "react";
import {
  Bell,
  ArrowUpRight,
  Eye,
  EyeOff,
  Check,
  SlidersHorizontal,
  X,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAllTransactions } from "../hooks/useTransactions";
import {
  useUpcomingBills,
  useMarkBillPaid,
  getBillDueStatusLabel,
} from "../hooks/useBills";
import { useToast } from "../contexts/ToastContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { formatRupiah } from "../lib/utils";
import { IconRenderer } from "../components/ui/IconRenderer";
import {
  format,
  isToday,
  isSameDay,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  subDays,
} from "date-fns";
import { BottomSheet } from "../components/ui/BottomSheet";
import { BalanceCard } from "../components/ui/BalanceCard";
import { NotificationSheet } from "../components/ui/NotificationSheet";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useCategories } from "../hooks/useCategories";
import { ActionCenterCard } from "../components/home/ActionCenterCard";
import { MetricDrillDownSheet } from "../components/home/MetricDrillDownSheet";
import { CashflowPulseCard } from "../components/home/CashflowPulseCard";
import { ExpenseVolatilityCard } from "../components/home/ExpenseVolatilityCard";
import { useBudgetTarget } from "../hooks/useBudgetTarget";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { useFinancialIntelligence } from "../hooks/useFinancialIntelligence";
import {
  calculateAssetTrend,
  calculatePersonalBaselines,
  calculateDynamicGoalMilestones,
  isCorrectionTx,
} from "../lib/financialMath";

interface HomePageProps {
  onOpenAdd?: () => void;
  onOpenScan?: () => void;
}

type StockRange = "1D" | "1W" | "1M" | "6M" | "YTD" | "1Y" | "ALL";

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: "6px 10px",
        boxShadow: "0 8px 24px var(--shadow-strength)",
      }}
    >
      <p
        style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 700 }}
      >
        {label}
      </p>
      <p
        style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}
      >
        {formatRupiah(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
};

function formatAxisY(val: number): string {
  if (Math.abs(val) >= 1000000000) return (val / 1000000000).toFixed(1) + "B";
  if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + "M";
  if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + "K";
  return String(val);
}


export function HomePage({ onOpenAdd: _onOpenAdd, onOpenScan: _onOpenScan }: HomePageProps) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const { session } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [stockRange, setStockRange] = useState<StockRange>("1W");
  const { isStealthMode: hideBalance, toggleStealthMode: toggleHideBalance } = usePrivacy();

  const { showToast } = useToast();
  const markBillPaid = useMarkBillPaid();
  const upcomingBills = useUpcomingBills();
  const { budgetTarget } = useBudgetTarget();
  const { data: allTxs = [], refetch: refetchAllTxs } = useAllTransactions();
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const { refetch: refetchWallets } = useWallets();
  const { data: allBills = [], refetch: refetchBills } = useBills();
  const { goals, depositToGoal, updateGoal, deleteGoal } = useGoals();
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const {
    netWorth,
    liquidAssets,
    liquidAccounts,
  } = useWalletBalances();

  const [metricDrillDown, setMetricDrillDown] = useState<{
    type: "expense" | "income" | "budget_risk" | "snapshot";
    data: any;
  } | null>(null);

  const [billManagementOpen, setBillManagementOpen] = useState(false);

  const {
    widgets,
    visibleCards,
    hiddenCards,
    isEditMode,
    setIsEditMode,
    reorderCards,
    cycleCardSize,
    toggleCardVisibility,
    resetLayout,
    applyPreset,
  } = useWidgetLayout();

  const [customizeHomeOpen, setCustomizeHomeOpen] = useState(false);

  const intel = useFinancialIntelligence({
    transactions: allTxs,
    budgetTarget,
    totalAssets: netWorth,
    liquidAssets,
    liquidAccounts,
    bills: allBills,
    categories,
  });

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetchAllTxs(),
        refetchWallets(),
        refetchCategories(),
        refetchBills(),
      ]);
    },
  });

  // 1. Total Balance and Apple Stocks Layout Data Calculation
  const assetData = useMemo(() => {
    return calculateAssetTrend(allTxs, netWorth, stockRange);
  }, [allTxs, netWorth, stockRange]);

  // Personal Baselines & Dynamic Goal Milestones (Innovation 10)
  const baselines = useMemo(() => calculatePersonalBaselines(allTxs), [allTxs]);

  const goalMilestonesMap = useMemo(() => {
    const map = new Map<string, { label: string; isComplete: boolean }>();
    goals.forEach((g) => {
      const res = calculateDynamicGoalMilestones(g, baselines, now);
      if (res.isAlreadyCompleted) {
        map.set(g.id, { label: "Completed", isComplete: true });
      } else {
        const est = res.velocityPaces.current.projectedCompletion;
        map.set(g.id, {
          label: est ? `Est. ${est}` : "In Progress",
          isComplete: false,
        });
      }
    });
    return map;
  }, [goals, baselines, now]);

  // 2. Current Month Financial Calculations
  const currentMonthStats = useMemo(() => {
    const currentMonthKey = format(now, "yyyy-MM");
    let income = 0;
    let expense = 0;
    const expCatMap = new Map<
      string,
      { name: string; emoji: string; total: number; count: number }
    >();
    const incCatMap = new Map<
      string,
      { name: string; emoji: string; total: number; count: number }
    >();

    allTxs.forEach((t) => {
      if (!t.occurred_on || !t.occurred_on.startsWith(currentMonthKey)) return;
      const amt = Number(t.amount || 0);
      const resCat = resolveTransactionCategory(t, categories);
      const catName = resCat.name;
      if (t.type === "income") {
        income += amt;
        const emoji = resCat.emoji || "/icons/gaji.png";
        const ex = incCatMap.get(catName) || {
          name: catName,
          emoji,
          total: 0,
          count: 0,
        };
        ex.total += amt;
        ex.count += 1;
        incCatMap.set(catName, ex);
      } else if (t.type === "expense") {
        expense += amt;
        const emoji = resCat.emoji || "/icons/lainnya.png";
        const ex = expCatMap.get(catName) || {
          name: catName,
          emoji,
          total: 0,
          count: 0,
        };
        ex.total += amt;
        ex.count += 1;
        expCatMap.set(catName, ex);
      }
    });

    const topExpList = Array.from(expCatMap.values()).sort(
      (a, b) => b.total - a.total,
    );
    const topIncList = Array.from(incCatMap.values()).sort(
      (a, b) => b.total - a.total,
    );
    return {
      income,
      expense,
      topExpense: topExpList[0] || null,
      topIncome: topIncList[0] || null,
      topExpenseCategories: topExpList,
    };
  }, [allTxs, categories, now]);

  const totalExpense = currentMonthStats.expense;

  const daysInMonth = now.getDate();
  const dailyAverage = daysInMonth > 0 ? totalExpense / daysInMonth : 0;

  // 3. Calendar heatmap calculations
  const { calDays, calPad } = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return {
      calDays: eachDayOfInterval({ start, end }),
      calPad: getDay(start),
    };
  }, [now]);
  const compactDays = useMemo(() => {
    return eachDayOfInterval({
      start: subDays(now, 6),
      end: now,
    });
  }, [now]);

  const monthlyStats = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    allTxs.forEach((tx) => {
      const dStr = tx.occurred_on;
      if (!dStr) return;
      const existing = map.get(dStr) || { income: 0, expense: 0 };
      if (tx.type === "income") existing.income += Number(tx.amount || 0);
      else if (tx.type === "expense")
        existing.expense += Number(tx.amount || 0);
      map.set(dStr, existing);
    });
    let maxSurplus = 0,
      maxDeficit = 0;
    map.forEach(({ income, expense }) => {
      const net = income - expense;
      if (net > 0 && net > maxSurplus) maxSurplus = net;
      if (net < 0 && Math.abs(net) > maxDeficit) maxDeficit = Math.abs(net);
    });
    return { map, maxSurplus, maxDeficit };
  }, [allTxs]);

  // Telemetry computations for compact visual widgets
  const last7DaysOutlays = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    return days.map((d) => {
      const dStr = format(d, "yyyy-MM-dd");
      const dayTxs = allTxs.filter(
        (t) => t.occurred_on === dStr && t.type === "expense" && !isCorrectionTx(t),
      );
      const amount = dayTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return { dayLabel: format(d, "EEE"), amount };
    });
  }, [allTxs, now]);

  const categoryDonutData = useMemo(() => {
    return (currentMonthStats.topExpenseCategories || []).slice(0, 4).map((c) => ({
      name: c.name,
      amount: c.total,
      pct: totalExpense > 0 ? (c.total / totalExpense) * 100 : 0,
    }));
  }, [currentMonthStats.topExpenseCategories, totalExpense]);

  const { heatmapDaysData, activeSpendDaysCount } = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });
    let active = 0;
    const maxDaySpend = Math.max(
      1,
      ...days.map((d) => {
        const dStr = format(d, "yyyy-MM-dd");
        const stat = monthlyStats.map.get(dStr);
        return stat ? stat.expense : 0;
      }),
    );
    const list = days.map((d) => {
      const dStr = format(d, "yyyy-MM-dd");
      const stat = monthlyStats.map.get(dStr);
      const exp = stat ? stat.expense : 0;
      if (exp > 0) active++;
      return {
        day: d.getDate(),
        hasSpend: exp > 0,
        intensity: exp / maxDaySpend,
      };
    });
    return { heatmapDaysData: list, activeSpendDaysCount: active };
  }, [now, monthlyStats.map]);

  const healthScore = useMemo(() => {
    const inc = currentMonthStats.income;
    const exp = currentMonthStats.expense;
    if (inc === 0 && exp === 0) return 75;
    if (inc > 0 && exp === 0) return 100;
    if (inc === 0 && exp > 0) {
      if (exp < 1000000) return 65;
      if (exp < 5000000) return 50;
      return 35;
    }
    const ratio = exp / inc;
    if (ratio >= 2.0) return 20;
    if (ratio >= 1.5) return Math.max(20, Math.round(35 - (ratio - 1.5) * 30));
    if (ratio > 1.0) return Math.round(55 - (ratio - 1.0) * 40);
    if (ratio >= 0.8) return Math.round(65 + (1.0 - ratio) * 50);
    if (ratio >= 0.4) return Math.round(75 + (0.8 - ratio) * 35);
    return Math.min(100, Math.round(90 + (0.4 - ratio) * 25));
  }, [currentMonthStats.income, currentMonthStats.expense]);

  const runwayMonths = useMemo(() => {
    if (totalExpense <= 0) return 99;
    return liquidAssets / totalExpense;
  }, [liquidAssets, totalExpense]);

  const dayData = (d: Date) => {
    const dStr = format(d, "yyyy-MM-dd");
    const data = monthlyStats.map.get(dStr) || { income: 0, expense: 0 };
    return {
      income: data.income,
      expense: data.expense,
      hasTx: monthlyStats.map.has(dStr),
    };
  };

  const lerpHex = (
    from: [number, number, number],
    to: [number, number, number],
    t: number,
  ): string => {
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    return `rgb(${r},${g},${b})`;
  };

  const renderCalendarDay = (d: Date) => {
    const { income, expense, hasTx } = dayData(d);
    const isT = isToday(d);
    const isSel = selectedDate && isSameDay(d, selectedDate);
    const net = income - expense;
    const isSurplus = hasTx && net >= 0;
    const isDeficit = hasTx && net < 0;

    let bg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
    let textColor = "var(--text-tertiary)";
    let border = "1px solid transparent";

    if (isSurplus && monthlyStats.maxSurplus > 0) {
      const intensity = Math.min(1, net / monthlyStats.maxSurplus);
      if (isDark) {
        bg = lerpHex(
          [160, 160, 175],
          [255, 255, 255],
          Math.max(0.2, intensity),
        );
        textColor = "#121212";
      } else {
        bg = lerpHex([85, 85, 95], [24, 24, 27], Math.max(0.2, intensity));
        textColor = "#FFFFFF";
      }
    } else if (isDeficit && monthlyStats.maxDeficit > 0) {
      const intensity = Math.min(1, Math.abs(net) / monthlyStats.maxDeficit);
      if (isDark) {
        bg = lerpHex([82, 82, 91], [30, 30, 34], Math.max(0.2, intensity));
        textColor = "#FFFFFF";
        border = "1px solid rgba(255,255,255,0.18)";
      } else {
        bg = lerpHex(
          [225, 225, 230],
          [180, 180, 190],
          Math.max(0.2, intensity),
        );
        textColor = "#18181B";
        border = "1px solid rgba(0,0,0,0.14)";
      }
    }

    if (isT && !hasTx) {
      border = "1px solid var(--glass-border)";
      textColor = "var(--text-primary)";
    }
    if (isSel) {
      border = "2px solid var(--text-primary)";
    }

    return (
      <button
        key={d.toISOString()}
        onClick={() => {
          triggerHaptic("light");
          setSelectedDate(d);
        }}
        className="flex flex-col items-center justify-center rounded-lg active:scale-90 transition-transform py-0.5"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all"
          style={{
            background: bg,
            color: textColor,
            border,
            boxShadow: isSel ? "0 0 0 2px var(--text-primary)" : "none",
          }}
        >
          {format(d, "d")}
        </div>
        <div className="h-[10px] flex items-center justify-center mt-0.5">
          {hasTx && net !== 0 ? (
            <span
              className="text-[9px] font-semibold tracking-tight leading-none truncate max-w-[34px]"
              style={{
                color: isSurplus
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
                opacity: isSurplus ? 0.95 : 0.65,
              }}
            >
              {formatNetAmount(net)}
            </span>
          ) : (
            <span className="text-[8px] opacity-0 select-none">-</span>
          )}
        </div>
      </button>
    );
  };

  const selectedDayTxs = useMemo(() => {
    if (!selectedDate) return [];
    const dStr = format(selectedDate, "yyyy-MM-dd");
    return allTxs.filter((t) => t.occurred_on === dStr);
  }, [selectedDate, allTxs]);

  const displayName =
    session?.user?.user_metadata?.display_name ||
    session?.user?.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    localStorage.getItem("trouvaille_avatar") ||
    "";

  const stockRangeLabels: Record<StockRange, string> = {
    "1D": "Past Day",
    "1W": "Past Week",
    "1M": "Past Month",
    "6M": "Past 6 Months",
    YTD: "Year to Date",
    "1Y": "Past 1 Year",
    ALL: "All Time",
  };

  const renderCardContent = (cardId: string, size: WidgetSize) => {
    switch (cardId) {
      case "net_portfolio":
        return (
          <section className="card-contrast-hero p-4 pb-3 relative overflow-hidden">
            {/* Title Header */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-white/80 leading-none">
                Net Portfolio
              </h2>
              <button
                onClick={toggleHideBalance}
                className="text-white/60 hover:text-white active:scale-90 transition-all p-1 -mr-1 cursor-pointer"
                title={hideBalance ? "Show Balance" : "Hide Balance"}
              >
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Amount */}
            <div className="mb-1.5">
              <span className="text-[28px] font-bold tracking-tight amount leading-tight text-white">
                {hideBalance
                  ? "Rp ••••••••"
                  : formatRupiah(assetData.currentBalance)}
              </span>
            </div>

            {/* Change Line + Time Label Side by Side */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div
                className="flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: assetData.diff >= 0 ? "#FFFFFF" : "#A1A1AA" }}
              >
                <ArrowUpRight
                  size={13}
                  className={assetData.diff < 0 ? "rotate-90" : ""}
                />
                <span>
                  {hideBalance
                    ? "••••"
                    : `${assetData.diff >= 0 ? "+" : ""}${formatRupiah(assetData.diff)}`}
                </span>
                <span className="opacity-80">
                  (
                  {hideBalance
                    ? "••••"
                    : `${assetData.percent > 0 ? "+" : ""}${assetData.percent.toFixed(2)}%`}
                  )
                </span>
              </div>
              <span className="text-[11px] font-semibold text-white/50 shrink-0">
                {stockRangeLabels[stockRange]} · IDR
              </span>
            </div>

            {/* Range Pill Selector (1D, 1W, 1M, 6M, YTD, 1Y, ALL) */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 mb-1.5">
              {(["1D", "1W", "1M", "6M", "YTD", "1Y", "ALL"] as StockRange[]).map(
                (r) => {
                  const isActive = stockRange === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setStockRange(r);
                        triggerHaptic("light");
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-all cursor-pointer"
                      style={{
                        background: isActive
                          ? "rgba(255,255,255,0.25)"
                          : "transparent",
                        color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                        border: isActive
                          ? "1px solid rgba(255,255,255,0.35)"
                          : "1px solid transparent",
                      }}
                    >
                      {r}
                    </button>
                  );
                },
              )}
            </div>

            {/* Chart with Right Y-Axis & Dotted Grid */}
            <div className="h-[120px] w-full mt-0.5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={assetData.chartData}
                  margin={{ top: 4, right: 0, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 3"
                    stroke="rgba(255,255,255,0.09)"
                    vertical={true}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                      fill: "rgba(255,255,255,0.5)",
                      fontFamily: "Urbanist",
                      fontWeight: 600,
                    }}
                    axisLine={false}
                    tickLine={false}
                    dy={3}
                  />
                  <YAxis
                    orientation="right"
                    width={34}
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 9,
                      fill: "rgba(255,255,255,0.5)",
                      fontFamily: "Urbanist",
                      fontWeight: 700,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatAxisY}
                    dx={-2}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fill="url(#heroGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#FFFFFF",
                      stroke: "rgba(0,0,0,0.5)",
                      strokeWidth: 1.5,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stocks-Style Summary Footer (High, Low, Inflow, Outflow) */}
            <div className="grid grid-cols-4 gap-1.5 pt-2.5 mt-1 border-t border-white/10 text-center">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">High</p>
                <p className="text-[11px] font-semibold amount text-white mt-0.5">
                  {hideBalance
                    ? "••••"
                    : assetData.highBalance >= 1000
                      ? "Rp " + formatAxisY(assetData.highBalance)
                      : formatRupiah(assetData.highBalance)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Low</p>
                <p className="text-[11px] font-semibold amount text-white mt-0.5">
                  {hideBalance
                    ? "••••"
                    : assetData.lowBalance >= 1000
                      ? "Rp " + formatAxisY(assetData.lowBalance)
                      : formatRupiah(assetData.lowBalance)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Inflow</p>
                <p className="text-[11px] font-semibold amount text-white mt-0.5">
                  {hideBalance
                    ? "••••"
                    : assetData.periodInflow > 0
                      ? "+Rp " + formatAxisY(assetData.periodInflow)
                      : "Rp 0"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Outflow</p>
                <p className="text-[11px] font-semibold amount text-white mt-0.5">
                  {hideBalance
                    ? "••••"
                    : assetData.periodOutflow > 0
                      ? "-Rp " + formatAxisY(assetData.periodOutflow)
                      : "Rp 0"}
                </p>
              </div>
            </div>
          </section>
        );

      case "portfolio_account":
        return <BalanceCard hideBalance={hideBalance} />;

      case "spending_stability":
        if (!intel.expenseVolatility) return null;
        if (size === "half") {
          return (
            <CompactSpendingStabilityHalf
              level={intel.expenseVolatility.stability === "VOLATILE" ? "High" : intel.expenseVolatility.stability === "MODERATE" ? "Moderate" : "Low"}
              dailyAvg={dailyAverage}
              volatilityScore={(intel.expenseVolatility.score ?? 80) / 100}
              onOpenDetail={() => {
                setMetricDrillDown({
                  type: "snapshot",
                  data: {
                    totalCurrent: dailyAverage,
                    totalPrevious: 0,
                    delta: 0,
                    pctChange: 0,
                    title: "Spending Stability",
                    subtitle: `Your spending consistency is evaluated as ${intel.expenseVolatility.stability} with a daily average outlay of ${formatRupiah(dailyAverage)}/day.`,
                    badge: intel.expenseVolatility.stability,
                    ctaLabel: "View Analytics Breakdown",
                  },
                });
              }}
            />
          );
        }
        return (
          <ExpenseVolatilityCard
            volatility={intel.expenseVolatility}
            hideBalance={hideBalance}
          />
        );

      case "cashflow_pulse":
        if (size === "half") {
          return (
            <CompactCashflowPulseHalf
              netCashflow={intel.netCashflow}
              consumedPct={intel.consumedPct}
              isAheadOfPace={intel.isAheadOfPace}
              onOpenDetail={() => {
                setMetricDrillDown({
                  type: "snapshot",
                  data: {
                    totalCurrent: intel.netCashflow,
                    totalPrevious: 0,
                    delta: intel.netCashflow,
                    pctChange: 0,
                    title: "Net Cashflow",
                    subtitle: `This month closes at ${intel.netCashflow >= 0 ? "a surplus" : "a deficit"} after ${formatRupiah(intel.totalIncome)} inflow and ${formatRupiah(intel.totalExpense)} outflow.`,
                    badge: "Current Month",
                    ctaLabel: "View Full Analytics Breakdown",
                  },
                });
              }}
            />
          );
        }
        return (
          <CashflowPulseCard
            netCashflow={intel.netCashflow}
            totalIncome={intel.totalIncome}
            totalExpense={intel.totalExpense}
            dailyAverage={dailyAverage}
            daysElapsed={daysInMonth}
            savingsRate={intel.savingsRate}
            momentum={intel.momentum}
            momentumReason={intel.momentumReason}
            hideBalance={hideBalance}
            budgetTarget={budgetTarget}
            budgetRisk={intel.budgetRisk}
            consumedPct={intel.consumedPct}
            isAheadOfPace={intel.isAheadOfPace}
            paceDiff={intel.paceDiff}
            onOpenDrillDown={(mode) => {
              if (mode === "budget") {
                setMetricDrillDown({
                  type: "budget_risk",
                  data: {
                    totalCurrent: totalExpense,
                    totalPrevious: 0,
                    delta: 0,
                    pctChange: 0,
                    budget: budgetTarget,
                    consumedPct: intel.consumedPct,
                    timePct: intel.timePct,
                    budgetRisk: intel.budgetRisk,
                    budgetRiskReason: intel.budgetRiskReason,
                  },
                });
              } else if (mode === "net") {
                setMetricDrillDown({
                  type: "snapshot",
                  data: {
                    totalCurrent: intel.netCashflow,
                    totalPrevious: 0,
                    delta: intel.netCashflow,
                    pctChange: 0,
                    title: "Net Cashflow",
                    subtitle: `This month closes at ${intel.netCashflow >= 0 ? "a surplus" : "a deficit"} after ${formatRupiah(intel.totalIncome)} inflow and ${formatRupiah(intel.totalExpense)} outflow.`,
                    badge: "Current Month",
                    ctaLabel: "View Full Analytics Breakdown",
                  },
                });
              } else {
                const exp = intel.explainExpenseChange();
                setMetricDrillDown({
                  type: "snapshot",
                  data: {
                    totalCurrent: intel.totalExpense,
                    totalPrevious: exp.totalPrevious,
                    delta: exp.delta,
                    pctChange: exp.pctChange,
                    title: "Total Outflow",
                    subtitle: `Current-month spending is ${formatRupiah(intel.totalExpense)}. Compared with the previous month, the change is ${exp.delta >= 0 ? "an increase" : "a decrease"} of ${formatRupiah(Math.abs(exp.delta))}.`,
                    badge: "Current Month",
                    ctaLabel: "View Analytics Breakdown",
                  },
                });
              }
            }}
          />
        );

      case "ai_insights":
        if (!intel.actionCenterInsight) return null;
        if (size === "half") {
          return (
            <CompactAIInsightsHalf
              insightTitle={intel.actionCenterInsight.title}
              insightCategory={intel.actionCenterInsight.badge}
              onOpenDetail={() => {
                setMetricDrillDown({
                  type: "snapshot",
                  data: {
                    totalCurrent: 0,
                    totalPrevious: 0,
                    delta: 0,
                    pctChange: 0,
                    title: intel.actionCenterInsight?.title || "Financial Alert",
                    subtitle: intel.actionCenterInsight?.subtitle || "Anomalous spending detected",
                    badge: intel.actionCenterInsight?.badge || "Insight",
                    ctaLabel: intel.actionCenterInsight?.actionLabel || "Open Action Center",
                  },
                });
              }}
            />
          );
        }
        return (
          <ActionCenterCard
            insight={intel.actionCenterInsight}
            transactions={allTxs}
            budgetTarget={budgetTarget}
            dailyAverage={intel.dailyAvg}
            projectedMonthEnd={intel.projectedMonthEnd}
            totalExpense={intel.totalExpense}
            totalIncome={intel.totalIncome}
          />
        );

      case "activity_heatmap":
        return (
          <section className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
                {calendarExpanded ? "Monthly Activity" : "Past 7 Days Activity"}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setCalendarExpanded((prev) => !prev);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all active:scale-95 cursor-pointer select-none flex items-center gap-1"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <CalendarDays size={12} />
                <span>{calendarExpanded ? "Compact (7D)" : "Full Month"}</span>
              </button>
            </div>

            <div className="glass-surface p-3.5 rounded-[22px]">
              {calendarExpanded ? (
                <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
                  {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                    <div key={i} className="text-[9px] font-bold mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {w}
                    </div>
                  ))}
                  {Array.from({ length: calPad }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {calDays.map((d) => renderCalendarDay(d))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
                  {compactDays.map((d) => (
                    <div
                      key={`h-${d.toISOString()}`}
                      className="text-[9px] font-bold mb-0.5"
                      style={{
                        color: isToday(d) ? "var(--text-primary)" : "var(--text-tertiary)",
                      }}
                    >
                      {format(d, "EEE")}
                    </div>
                  ))}
                  {compactDays.map((d) => renderCalendarDay(d))}
                </div>
              )}
            </div>
          </section>
        );

      case "financial_goals":
        if (goals.length === 0) return null;
        if (size === "half") {
          const g: any = goals[0];
          const curr = Number(g.currentAmount || g.current_amount || 0);
          const tgt = Number(g.targetAmount || g.target_amount || 1);
          const pct = Math.min(100, Math.round((curr / tgt) * 100));
          return (
            <CompactGoalsHalf
              goalTitle={g.title || g.name || "Savings Goal"}
              progressPct={pct}
              currentAmount={curr}
              targetAmount={tgt}
              onOpenDetail={() => setSelectedGoal(g)}
            />
          );
        }
        return (
          <section className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Financial Goals
              </span>
              <span className="text-[11px] font-bold" style={{ color: "var(--text-tertiary)" }}>
                {goals.length} Target
              </span>
            </div>

            <div className="space-y-2.5">
              {goals.slice(0, 3).map((g: any) => {
                const pct = Math.min(100, Math.round((g.currentAmount / (g.targetAmount || 1)) * 100));
                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      setSelectedGoal(g);
                      triggerHaptic("light");
                    }}
                    className="p-4 rounded-[22px] glass-surface cursor-pointer active:scale-[0.98] transition-transform"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[15px]"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <Target size={16} style={{ color: "var(--text-primary)" }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                            {g.title}
                          </p>
                          <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                            {formatRupiah(g.currentAmount)} of {formatRupiah(g.targetAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {goalMilestonesMap.get(g.id) && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full truncate"
                            style={{
                              background: "var(--glass-fill)",
                              color: goalMilestonesMap.get(g.id)?.isComplete
                                ? "var(--accent)"
                                : "var(--text-secondary)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {goalMilestonesMap.get(g.id)?.label}
                          </span>
                        )}
                        <span
                          className="amount text-[12px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--glass-fill)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      className="h-2 w-full rounded-full overflow-hidden mt-2"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: "var(--text-primary)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "upcoming_bills":
        if (upcomingBills.length === 0) return null;
        return (
          <section className="space-y-2">
            <div
              className="flex items-center justify-between px-1 cursor-pointer select-none"
              onClick={() => {
                triggerHaptic("light");
                setBillManagementOpen(true);
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
                Upcoming Bills
              </span>
              <span className="text-[11px] font-medium hover:underline flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                Manage Bills
              </span>
            </div>
            <div className="space-y-2">
              {upcomingBills.slice(0, 3).map((bill: any) => {
                const dueStatusLabel = getBillDueStatusLabel(bill.due_date);
                const isMarkingPaid = markBillPaid.isPending && markBillPaid.variables?.bill.id === bill.id;
                return (
                  <div
                    key={bill.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setBillManagementOpen(true);
                    }}
                    className="glass-surface flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Bell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {bill.title}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {dueStatusLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <p className="amount text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(Number(bill.amount))}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markBillPaid.mutate(
                            { bill, paid: true },
                            {
                              onSuccess: () => {
                                showToast(`${bill.title} marked as paid`, "add", () => {});
                              },
                              onError: (error: any) => {
                                showToast(error?.message || `Failed to mark ${bill.title} as paid`, "delete", () => {});
                              },
                            },
                          );
                          triggerHaptic("medium");
                        }}
                        disabled={isMarkingPaid}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        style={{
                          background: "var(--glass-fill-strong)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                        title="Tandai Sudah Bayar"
                      >
                        <Check size={11} />
                        <span>{isMarkingPaid ? "Saving..." : "Paid"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Total Kebutuhan Tagihan */}
              <div
                onClick={() => {
                  triggerHaptic("light");
                  setBillManagementOpen(true);
                }}
                className="p-3.5 rounded-2xl glass-surface flex items-center justify-between mt-2.5 cursor-pointer active:scale-[0.99] transition-transform"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <CalendarDays size={13} />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    Total Upcoming Bills
                  </span>
                </div>
                <span className="amount text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(
                    upcomingBills.reduce((s: number, b: any) => s + Number(b.amount || 0), 0),
                  )}
                </span>
              </div>
            </div>
          </section>
        );

      case "recent_transactions":
        if (allTxs.length === 0) return null;
        return (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Recent Transactions
              </h3>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                Latest {size === "half" ? "3" : "5"}
              </span>
            </div>
            <div className="space-y-2">
              {allTxs.slice(0, size === "half" ? 3 : 5).map((tx) => {
                const resCat = resolveTransactionCategory(tx, categories);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-2xl glass-surface border border-[var(--glass-border)]"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] shrink-0">
                        <IconRenderer icon={resCat.emoji} size="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                          {resCat.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[170px] mt-0.5">
                          {tx.note || tx.occurred_on}
                        </p>
                      </div>
                    </div>
                    <span
                      className="amount font-semibold text-[13px] shrink-0 ml-2"
                      style={{
                        color:
                          tx.type === "income"
                            ? "#10b981"
                            : tx.type === "transfer"
                              ? "var(--text-secondary)"
                              : "var(--text-primary)",
                      }}
                    >
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                      {formatRupiah(Number(tx.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "top_categories":
        if (!currentMonthStats.topExpenseCategories || currentMonthStats.topExpenseCategories.length === 0) return null;
        if (size === "half") {
          const topCat = currentMonthStats.topExpenseCategories[0];
          const pct = currentMonthStats.expense > 0 ? Math.round((topCat.total / currentMonthStats.expense) * 100) : 0;
          return (
            <CompactTopCategoriesHalf
              topCategoryName={topCat.name}
              topCategoryAmount={topCat.total}
              topCategoryPct={pct}
              onOpenDetail={() => {
                setMetricDrillDown({
                  type: "snapshot",
                  data: {
                    totalCurrent: topCat.total,
                    totalPrevious: 0,
                    delta: 0,
                    pctChange: 0,
                    title: `Top Category: ${topCat.name}`,
                    subtitle: `${topCat.name} is your highest expense driver this month (${formatRupiah(topCat.total)}), making up ${pct}% of total monthly spending.`,
                    badge: `${pct}% of Total`,
                    ctaLabel: "View All Categories",
                    onCta: () => navigate("/statistics"),
                  },
                });
              }}
            />
          );
        }
        return (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Top Spending Categories
              </h3>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                This Month
              </span>
            </div>
            <div
              className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3"
              style={{ background: "var(--bg-elevated)" }}
            >
              {currentMonthStats.topExpenseCategories.slice(0, 3).map((cat) => {
                const pct = currentMonthStats.expense > 0 ? Math.round((cat.total / currentMonthStats.expense) * 100) : 0;
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold amount" style={{ color: "var(--text-primary)" }}>
                          {formatRupiah(cat.total)}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(4, pct))}%`,
                          background: "var(--text-primary)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "savings_rate_velocity":
        return (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Savings Rate & Velocity
              </h3>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                Telemetry
              </span>
            </div>
            <div
              className={`p-4 rounded-3xl glass-surface border border-[var(--glass-border)] grid ${size === "half" ? "grid-cols-1" : "grid-cols-2"} gap-3`}
              style={{ background: "var(--bg-elevated)" }}
            >
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Savings Rate
                </p>
                <p className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {currentMonthStats.income > 0
                    ? `${Math.max(0, Math.round(((currentMonthStats.income - currentMonthStats.expense) / currentMonthStats.income) * 100))}%`
                    : "0%"}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  Net capital retained
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Runway
                </p>
                <p className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {currentMonthStats.expense > 0
                    ? `${(liquidAssets / currentMonthStats.expense).toFixed(1)} mo`
                    : "∞"}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  Liquid reserves buffer
                </p>
              </div>
            </div>
          </section>
        );

      case "split_bill":
        if (size === "half") {
          return (
            <CompactSplitBillHalf
              onOpenDetail={() => {
                _onOpenAdd?.();
              }}
            />
          );
        }
        return (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Split Bill & Receivables
              </h3>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                Piutang
              </span>
            </div>
            <div
              className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] flex items-center justify-between"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Users size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                    Shared Piutang Status
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                    Track friend shares from split transactions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  _onOpenAdd?.();
                }}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 ml-2"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                Split
              </button>
            </div>
          </section>
        );

      case "savings_ring":
        return (
          <SavingsRingCard
            size={size}
            rate={intel.savingsRate}
            inflow={currentMonthStats.income}
            outflow={currentMonthStats.expense}
            onOpenDetail={() => {
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: Math.max(0, currentMonthStats.income - currentMonthStats.expense),
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  displayValue: `${intel.savingsRate.toFixed(1)}%`,
                  title: "Savings Telemetry",
                  subtitle: `Net retention rate is ${intel.savingsRate.toFixed(1)}% of total monthly inflow (${formatRupiah(currentMonthStats.income)}). Retained capital: ${formatRupiah(Math.max(0, currentMonthStats.income - currentMonthStats.expense))}.`,
                  badge: `${intel.savingsRate.toFixed(0)}% Saved`,
                  ctaLabel: "View Financial Statistics",
                  onCta: () => navigate("/statistics"),
                },
              });
            }}
          />
        );

      case "spending_velocity_bar":
        return (
          <SpendingVelocityBarCard
            size={size}
            dailyOutlays={last7DaysOutlays}
            dailyAverage={dailyAverage}
            onOpenDetail={() => {
              const total7d = last7DaysOutlays.reduce((sum, d) => sum + d.amount, 0);
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: total7d,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  title: "7-Day Outlay Velocity",
                  subtitle: `Total outflow over the past 7 days reached ${formatRupiah(total7d)} with a daily average of ${formatRupiah(Math.round(total7d / 7))}.`,
                  badge: "Past 7 Days",
                  ctaLabel: "View All Transactions",
                  onCta: () => navigate("/transactions"),
                },
              });
            }}
          />
        );

      case "category_donut":
        return (
          <CategoryDonutCard
            size={size}
            categories={categoryDonutData}
            totalExpense={currentMonthStats.expense}
            onOpenDetail={() => {
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: currentMonthStats.expense,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  title: "Outflow Allocation",
                  subtitle: `Visual distribution across ${categoryDonutData.length} key expense sectors for this month.`,
                  badge: "Allocation",
                  ctaLabel: "Explore Statistics",
                  onCta: () => navigate("/statistics"),
                },
              });
            }}
          />
        );

      case "mini_heatmap":
        return (
          <MiniHeatmapCard
            size={size}
            daysWithSpend={heatmapDaysData}
            activeDaysCount={activeSpendDaysCount}
            onOpenDetail={() => {
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: currentMonthStats.expense,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  displayValue: `${activeSpendDaysCount} Days`,
                  title: "Monthly Activity Matrix",
                  subtitle: `You recorded spending on ${activeSpendDaysCount} days this month out of ${heatmapDaysData.length} days total. Total outflow is ${formatRupiah(currentMonthStats.expense)}.`,
                  badge: `${activeSpendDaysCount} Active Days`,
                  ctaLabel: "View Spending Patterns",
                  onCta: () => navigate("/statistics"),
                },
              });
            }}
          />
        );

      case "financial_health_gauge":
        return (
          <HealthMeterCard
            size={size}
            healthScore={healthScore}
            onOpenDetail={() => {
              const score = healthScore;
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: score,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  displayValue: `${score}/100`,
                  title: "Executive Health Telemetry",
                  subtitle: `Your financial health score is rated at ${score}/100 based on savings pace, debt servicing, and liquidity buffer ratios.`,
                  badge: `${score}/100 Score`,
                  ctaLabel: "Health Diagnostics",
                  onCta: () => navigate("/statistics"),
                },
              });
            }}
          />
        );

      case "liquid_runway":
        return (
          <LiquidRunwayCard
            size={size}
            runwayMonths={runwayMonths}
            liquidAssets={liquidAssets}
            monthlyBurn={totalExpense || 1}
            onOpenDetail={() => {
              const runwayMo = runwayMonths >= 99 ? "∞" : runwayMonths.toFixed(1);
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: liquidAssets,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  displayValue: `${runwayMo} mo`,
                  title: "Liquid Buffer Runway",
                  subtitle: `With current liquid assets of ${formatRupiah(liquidAssets)} and a monthly burn of ${formatRupiah(totalExpense)}, your buffer provides ${runwayMo} months of financial runway.`,
                  badge: `${runwayMo} Months`,
                  ctaLabel: "View Asset Allocations",
                  onCta: () => navigate("/statistics"),
                },
              });
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-5 pt-6 space-y-4 pb-36 relative">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={threshold}
      />
      {/* HEADER */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="font-semibold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] block leading-none">
              Welcome back,
            </span>
            <h1 className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight mt-0.5">
              {displayName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic("light");
              setCustomizeHomeOpen(true);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer select-none"
            title="Atur Widget Dashboard"
          >
            <SlidersHorizontal
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--text-primary)" }}
            />
          </button>
          <button
            onClick={() => setNotifOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer"
            title="Notifikasi"
          >
            <Bell size={14} style={{ color: "var(--text-primary)" }} />
          </button>
        </div>
      </header>

      {/* Dynamic Reorderable iOS-Style Card Springboard */}
      <Reorder.Group
        axis="y"
        values={visibleCards.map((c) => c.id)}
        onReorder={reorderCards}
        className="grid grid-cols-2 gap-4 pb-4"
      >
        {visibleCards.map((card) => {
          const content = renderCardContent(card.id, card.size);
          if (!content) return null;
          return (
            <Reorder.Item
              key={card.id}
              value={card.id}
              dragListener={isEditMode}
              className={card.size === "half" ? "col-span-1" : "col-span-2"}
            >
              <WidgetCardWrapper
                card={card}
                isEditMode={isEditMode}
                onEnterEditMode={() => setIsEditMode(true)}
                onCycleSize={cycleCardSize}
                onHide={toggleCardVisibility}
              >
                {content}
              </WidgetCardWrapper>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* 11. CUSTOMIZE DASHBOARD — Minimalist Floating Capsule */}
      <div className="flex justify-center pt-2 pb-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setCustomizeHomeOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-surface border border-[var(--glass-border)] text-[11px] font-semibold tracking-wide transition-all active:scale-95 cursor-pointer hover:opacity-80"
          style={{
            background: "var(--glass-fill)",
            color: "var(--text-secondary)",
          }}
        >
          <SlidersHorizontal
            size={12}
            style={{ color: "var(--text-primary)" }}
          />
          <span>Customize Dashboard</span>
        </button>
      </div>

      {/* Day Transactions Sheet */}
      <BottomSheet
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
      >
        <div className="px-5 pb-10">
          <h3
            className="font-semibold text-base mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {selectedDate ? format(selectedDate, "dd MMMM yyyy") : ""}
          </h3>
          {selectedDayTxs.length === 0 ? (
            <p
              className="text-sm text-center py-6"
              style={{ color: "var(--text-tertiary)" }}
            >
              No transactions on this date.
            </p>
          ) : (
            <div className="space-y-2.5">
              {selectedDayTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-3.5 rounded-2xl"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer
                        icon={
                          tx.categories?.emoji ||
                          categories.find((c) => c.id === tx.category_id)
                            ?.emoji ||
                          "/icons/lainnya.png"
                        }
                        size="w-6 h-6"
                      />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-[13px]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tx.categories?.name ||
                          categories.find((c) => c.id === tx.category_id)
                            ?.name ||
                          "Transfer"}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {tx.note || "No note"}
                      </p>
                    </div>
                  </div>
                  <span
                    className="amount text-[13px]"
                    style={{
                      color:
                        tx.type === "income"
                          ? "var(--accent)"
                          : "var(--text-primary)",
                    }}
                  >
                    {tx.type === "income"
                      ? "+"
                      : tx.type === "expense"
                        ? "-"
                        : ""}
                    {formatRupiah(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      <NotificationSheet
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
      <GoalDetailModal
        goal={selectedGoal}
        isOpen={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        onDeposit={depositToGoal}
        onUpdate={updateGoal}
        onDelete={deleteGoal}
      />
      <MetricDrillDownSheet
        isOpen={!!metricDrillDown}
        onClose={() => setMetricDrillDown(null)}
        type={metricDrillDown?.type || null}
        data={metricDrillDown?.data || null}
      />
      <BillManagementSheets
        isOpen={billManagementOpen}
        onClose={() => setBillManagementOpen(false)}
      />

      {/* CUSTOMIZE HOME WIDGETS MODAL (Compact 2-Column Minimalist Grid) */}
      {customizeHomeOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl p-5 space-y-3.5 text-left transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 20px 50px var(--shadow-strength)",
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--glass-border)]">
              <div>
                <h3
                  className="text-[15px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Customize Dashboard
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Toggle Bento cards on your Home screen
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizeHomeOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center glass-surface active:scale-90 cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <X size={14} style={{ color: "var(--text-primary)" }} />
              </button>
            </div>

            {/* Quick Layout Preset Segment Control (Simple to Advanced) */}
            <div className="space-y-1.5 pt-0.5">
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Dashboard Presets
              </span>
              <div
                className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {HOME_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      applyPreset(preset.key);
                    }}
                    className="py-2 px-1 rounded-xl text-center transition-all duration-200 active:scale-95 cursor-pointer select-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      boxShadow: "0 2px 8px var(--shadow-strength)",
                    }}
                  >
                    <p className="text-[12px] font-semibold leading-tight text-[var(--text-primary)]">
                      {preset.label}
                    </p>
                    <p className="text-[9px] mt-0.5 truncate text-[var(--text-tertiary)] px-1">
                      {preset.key === "simple"
                        ? "Essentials"
                        : preset.key === "balanced"
                          ? "Optimal"
                          : "Power"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Launcher for on-screen Jiggle / Drag & Drop Mode */}
            <button
              type="button"
              onClick={() => {
                setCustomizeHomeOpen(false);
                setIsEditMode(true);
              }}
              className="w-full py-2.5 mb-3 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2 bg-white text-black active:scale-95 transition-transform cursor-pointer shadow-lg"
            >
              <Sparkles size={13} />
              <span>Customize & Reorder on Screen</span>
            </button>

            {/* Grouped Feature Rows for All Dashboard Cards */}
            <div className="space-y-2 max-h-[52vh] overflow-y-auto no-scrollbar pr-0.5">
              {widgets.map((w) => {
                const isEnabled = w.isVisible;
                return (
                  <div
                    key={w.id}
                    onClick={() => toggleCardVisibility(w.id)}
                    className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer active:scale-[0.99] transition-all duration-200 select-none"
                    style={{
                      background: isEnabled
                        ? isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.035)"
                        : "var(--glass-fill)",
                      border: isEnabled
                        ? isDark
                          ? "1px solid rgba(255, 255, 255, 0.14)"
                          : "1px solid rgba(0, 0, 0, 0.12)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isEnabled
                        ? isDark
                          ? "0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
                          : "0 2px 10px rgba(0, 0, 0, 0.04)"
                        : "none",
                      opacity: isEnabled ? 1 : 0.6,
                    }}
                  >
                    <div className="min-w-0 pr-3 text-left">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-[13px] font-semibold leading-snug"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {w.title}
                        </p>
                        <span
                          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
                          style={{
                            background: "var(--glass-fill)",
                            color: "var(--text-tertiary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {w.size}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-relaxed mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {w.subtitle}
                      </p>
                    </div>
                    <div
                      className="w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center p-0.5 shrink-0 ml-3"
                      style={{
                        background: isEnabled
                          ? "var(--text-primary)"
                          : isDark
                            ? "rgba(255, 255, 255, 0.12)"
                            : "rgba(0, 0, 0, 0.12)",
                      }}
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-full shadow-md transition-transform duration-200 ${
                          isEnabled ? "translate-x-4.5" : "translate-x-0"
                        }`}
                        style={{
                          background: isEnabled
                            ? "var(--bg-base)"
                            : isDark
                              ? "rgba(255, 255, 255, 0.6)"
                              : "rgba(0, 0, 0, 0.4)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  resetLayout();
                }}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold glass-surface active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setCustomizeHomeOpen(false);
                }}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating iOS Springboard Customization Pill */}
      <WidgetCustomizationBar
        isEditMode={isEditMode}
        onDone={() => setIsEditMode(false)}
        onReset={resetLayout}
        hiddenCards={hiddenCards}
        onUnhideCard={toggleCardVisibility}
      />
    </div>
  );
}
