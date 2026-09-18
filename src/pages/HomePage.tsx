import { GoalDetailModal } from "../components/goals/GoalDetailModal";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import { useGoals } from "../hooks/useGoals";
import { useWallets } from "../hooks/useWallets";
import { useBills } from "../hooks/useBills";
import { CalendarDays, Target } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { resolveTransactionCategory } from "../lib/categoryResolver";

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
} from "../lib/financialMath";

interface HomePageProps {
  onOpenAdd?: () => void;
  onOpenScan?: () => void;
}

export interface HomeWidgetSettings {
  showCashflowPulse: boolean;
  showSpendingStability: boolean;
  showActionCenter: boolean;
  showHeatmap: boolean;
  showGoals: boolean;
  showBills: boolean;
  showRecentTransactions: boolean;
  showTopCategories: boolean;
  showSavingsRate: boolean;
  showSplitBillTracker: boolean;
}

const DEFAULT_HOME_WIDGETS: HomeWidgetSettings = {
  showCashflowPulse: true,
  showSpendingStability: true,
  showActionCenter: true,
  showHeatmap: true,
  showGoals: true,
  showBills: true,
  showRecentTransactions: false,
  showTopCategories: false,
  showSavingsRate: false,
  showSplitBillTracker: false,
};

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

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 16) return "Good Afternoon";
  if (hour >= 16 && hour < 19) return "Good Evening";
  return "Good Night";
}

export function HomePage({ onOpenAdd: _onOpenAdd, onOpenScan: _onOpenScan }: HomePageProps) {
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

  const [homeWidgets, setHomeWidgets] = useState<HomeWidgetSettings>(() => {
    try {
      const saved = localStorage.getItem("trouvaille_home_widgets_v1");
      if (saved) return { ...DEFAULT_HOME_WIDGETS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_HOME_WIDGETS;
  });
  const [customizeHomeOpen, setCustomizeHomeOpen] = useState(false);

  const toggleWidget = (key: keyof HomeWidgetSettings) => {
    triggerHaptic("light");
    setHomeWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("trouvaille_home_widgets_v1", JSON.stringify(next));
      return next;
    });
  };

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
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold transition-all"
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
              className="text-[8px] font-extrabold tracking-tighter leading-none truncate max-w-[34px]"
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
                className="font-extrabold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p
              className="text-[14px] font-bold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {getTimeGreeting()}, {displayName}
            </p>
            <p
              className="text-[11px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Financial Overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic("light");
              setCustomizeHomeOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[var(--glass-border)] active:scale-95 transition-all cursor-pointer select-none"
            style={{
              background: "var(--glass-fill)",
            }}
            title="Atur Widget Dashboard"
          >
            <SlidersHorizontal
              size={12}
              style={{ color: "var(--text-primary)" }}
            />
            <span
              className="text-[11px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Widgets
            </span>
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

      {/* 1. TOTAL ASSETS HERO CARD — Refined Compact Apple Stocks Layout */}
      <section className="card-contrast-hero p-4 pb-3 relative overflow-hidden">
        {/* Title Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-extrabold tracking-wider text-white/90 leading-none">
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
          <span className="text-[28px] font-extrabold tracking-tight amount leading-tight text-white">
            {hideBalance
              ? "Rp ••••••••"
              : formatRupiah(assetData.currentBalance)}
          </span>
        </div>

        {/* Change Line + Time Label Side by Side */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div
            className="flex items-center gap-1 text-[12px] font-extrabold"
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
                  className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 transition-all"
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
            <p className="text-[9px] font-bold uppercase text-white/45">High</p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {hideBalance
                ? "••••"
                : assetData.highBalance >= 1000
                  ? "Rp " + formatAxisY(assetData.highBalance)
                  : formatRupiah(assetData.highBalance)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">Low</p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {hideBalance
                ? "••••"
                : assetData.lowBalance >= 1000
                  ? "Rp " + formatAxisY(assetData.lowBalance)
                  : formatRupiah(assetData.lowBalance)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">
              Inflow
            </p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {hideBalance
                ? "••••"
                : assetData.periodInflow > 0
                  ? "+Rp " + formatAxisY(assetData.periodInflow)
                  : "Rp 0"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">
              Outflow
            </p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {hideBalance
                ? "••••"
                : assetData.periodOutflow > 0
                  ? "-Rp " + formatAxisY(assetData.periodOutflow)
                  : "Rp 0"}
            </p>
          </div>
        </div>
      </section>

      {/* 2. PORTFOLIO & ACCOUNTS  */}
      <BalanceCard hideBalance={hideBalance} />

      {/* 2.5 FINANCIAL ACTION CENTER */}
      {homeWidgets.showActionCenter && intel.actionCenterInsight && (
        <ActionCenterCard
          insight={intel.actionCenterInsight}
          transactions={allTxs}
          budgetTarget={budgetTarget}
          dailyAverage={intel.dailyAvg}
          projectedMonthEnd={intel.projectedMonthEnd}
          totalExpense={intel.totalExpense}
          totalIncome={intel.totalIncome}
        />
      )}

      {/* 2.7 SPENDING STABILITY (EXPENSE VOLATILITY) */}
      {(homeWidgets.showSpendingStability ?? true) &&
        intel.expenseVolatility && (
          <ExpenseVolatilityCard
            volatility={intel.expenseVolatility}
            hideBalance={hideBalance}
          />
        )}

      {/* 3. CONSOLIDATED MONTHLY CASHFLOW PULSE WITH COMPACT BUDGET */}
      {homeWidgets.showCashflowPulse && (
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
      )}

      {/* 5. HEATMAP CALENDAR (Collapsible: Compact 7D vs Full Month) */}
      {homeWidgets.showHeatmap && (
        <section>
          <div className="flex justify-between items-center px-1 mb-2">
            <span
              className="text-[11px] font-bold  tracking-widest block"
              style={{ color: "var(--text-tertiary)" }}
            >
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
                  <div
                    key={i}
                    className="text-[9px] font-bold mb-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
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
                      color: isToday(d)
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
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
      )}

      {/* 5.5 FINANCIAL GOALS */}
      {homeWidgets.showGoals && goals.length > 0 && (
        <section className="mb-6">
          <div className="flex justify-between items-center px-1 mb-2.5">
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              Financial Goals
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: "var(--text-tertiary)" }}
            >
              {goals.length} Target
            </span>
          </div>

          <div className="space-y-2.5">
            {goals.map((g: any) => {
              const pct = Math.min(
                100,
                Math.round((g.currentAmount / (g.targetAmount || 1)) * 100),
              );
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
                        <Target
                          size={16}
                          style={{ color: "var(--text-primary)" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-[13px] font-bold leading-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {g.title}
                        </p>
                        <p
                          className="text-[11px] font-medium"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {formatRupiah(g.currentAmount)} of{" "}
                          {formatRupiah(g.targetAmount)}
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
                        className="amount text-[12px] font-extrabold px-2 py-0.5 rounded-full"
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
                      background: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
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
      )}

      {/* 6. UPCOMING BILLS (MOVED ABOVE CALENDAR) */}
      {homeWidgets.showBills && upcomingBills.length > 0 && (
        <section className="mb-6">
          <span
            className="text-[11px] font-bold uppercase tracking-widest px-1 mb-2 block"
            style={{ color: "var(--text-tertiary)" }}
          >
            Upcoming Bills
          </span>
          <div className="space-y-2">
            {upcomingBills.slice(0, 3).map((bill: any) => {
              const dueStatusLabel = getBillDueStatusLabel(bill.due_date);
              const isMarkingPaid =
                markBillPaid.isPending &&
                markBillPaid.variables?.bill.id === bill.id;
              return (
                <div
                  key={bill.id}
                  className="glass-surface flex items-center gap-3 px-4 py-3 rounded-2xl"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px]"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Bell size={16} />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[14px] font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {bill.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {dueStatusLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <p
                      className="amount text-[14px] font-extrabold"
                      style={{ color: "var(--text-primary)" }}
                    >
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
                              showToast(
                                `${bill.title} marked as paid`,
                                "add",
                                () => {},
                              );
                            },
                            onError: (error: any) => {
                              showToast(
                                error?.message ||
                                  `Failed to mark ${bill.title} as paid`,
                                "delete",
                                () => {},
                              );
                            },
                          },
                        );
                        triggerHaptic("medium");
                      }}
                      disabled={isMarkingPaid}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="p-3.5 rounded-2xl glass-surface flex items-center justify-between mt-2.5"
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
                <span
                  className="text-[12px] font-bold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Total Upcoming Bills
                </span>
              </div>
              <span
                className="amount text-[14px] font-extrabold"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(
                  upcomingBills.reduce(
                    (s: number, b: any) => s + Number(b.amount || 0),
                    0,
                  ),
                )}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 7. RECENT TRANSACTIONS FEED WIDGET */}
      {homeWidgets.showRecentTransactions !== false && allTxs.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Recent Transactions
            </h3>
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Latest 5
            </span>
          </div>
          <div className="space-y-2">
            {allTxs.slice(0, 5).map((tx) => {
              const resCat = resolveTransactionCategory(tx, categories);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-2xl glass-surface border border-[var(--glass-border)]"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06]">
                      <IconRenderer icon={resCat.emoji} size="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-[var(--text-primary)] leading-tight">
                        {resCat.name}
                      </p>
                      <p className="text-[10.5px] text-[var(--text-tertiary)] truncate max-w-[170px] mt-0.5">
                        {tx.note || tx.occurred_on}
                      </p>
                    </div>
                  </div>
                  <span
                    className="amount font-bold text-[13px]"
                    style={{
                      color:
                        tx.type === "income"
                          ? "#10b981"
                          : tx.type === "transfer"
                            ? "var(--text-secondary)"
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
              );
            })}
          </div>
        </section>
      )}

      {/* 8. TOP CATEGORIES BREAKDOWN WIDGET (Default OFF) */}
      {homeWidgets.showTopCategories &&
        currentMonthStats.topExpenseCategories &&
        currentMonthStats.topExpenseCategories.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3
                className="text-[13px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Top Spending Categories
              </h3>
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                This Month
              </span>
            </div>
            <div
              className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3"
              style={{ background: "var(--bg-elevated)" }}
            >
              {currentMonthStats.topExpenseCategories.slice(0, 3).map((cat) => {
                const pct =
                  currentMonthStats.expense > 0
                    ? Math.round((cat.total / currentMonthStats.expense) * 100)
                    : 0;
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                        <span
                          className="font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-bold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(cat.total)}
                        </span>
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "var(--text-tertiary)" }}
                        >
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
        )}

      {/* 9. SAVINGS RATE & VELOCITY WIDGET (Default OFF) */}
      {homeWidgets.showSavingsRate && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Savings Rate & Velocity
            </h3>
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Telemetry
            </span>
          </div>
          <div
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] grid grid-cols-2 gap-3"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <p
                className="text-[10.5px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Savings Rate
              </p>
              <p
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {currentMonthStats.income > 0
                  ? `${Math.max(0, Math.round(((currentMonthStats.income - currentMonthStats.expense) / currentMonthStats.income) * 100))}%`
                  : "0%"}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Net capital retained
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <p
                className="text-[10.5px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Runway
              </p>
              <p
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {currentMonthStats.expense > 0
                  ? `${(liquidAssets / currentMonthStats.expense).toFixed(1)} mo`
                  : "∞"}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Liquid reserves buffer
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 10. SPLIT BILL & PIUTANG TRACKER WIDGET (Default OFF) */}
      {homeWidgets.showSplitBillTracker && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Split Bill & Receivables
            </h3>
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Piutang
            </span>
          </div>
          <div
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] flex items-center justify-between"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div className="flex items-center gap-3">
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
              <div>
                <p
                  className="text-[12.5px] font-bold leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Shared Piutang Status
                </p>
                <p
                  className="text-[10.5px] mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
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
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-base)",
              }}
            >
              Split
            </button>
          </div>
        </section>
      )}

      {/* 11. CUSTOMIZE DASHBOARD — Minimalist Floating Capsule */}
      <div className="flex justify-center pt-2 pb-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setCustomizeHomeOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-surface border border-[var(--glass-border)] text-[11.5px] font-semibold tracking-wide transition-all active:scale-95 cursor-pointer hover:opacity-80"
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
            className="font-extrabold text-lg mb-4"
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
                        className="font-bold text-sm"
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
                    className="amount font-bold text-[14px]"
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
                  className="text-[15px] font-bold"
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

            {/* Grouped Feature Rows (No icons/symbols, Title + Description + Right Switch) */}
            <div className="space-y-2 max-h-[58vh] overflow-y-auto no-scrollbar pr-0.5">
              {[
                {
                  key: "showSpendingStability" as const,
                  label: "Spending Stability",
                  desc: "Expense volatility, daily variance & consistency telemetry",
                },
                {
                  key: "showCashflowPulse" as const,
                  label: "Cashflow Pulse & Budget",
                  desc: "Monthly income, expenses & spending pacing telemetry",
                },
                {
                  key: "showActionCenter" as const,
                  label: "AI Financial Insights",
                  desc: "Smart diagnostics & anomalous spending alerts",
                },
                {
                  key: "showHeatmap" as const,
                  label: "Activity Heatmap",
                  desc: "Daily transaction density & frequency calendar",
                },
                {
                  key: "showGoals" as const,
                  label: "Financial Goals",
                  desc: "Savings targets & milestone achievement progress",
                },
                {
                  key: "showBills" as const,
                  label: "Upcoming Bills",
                  desc: "Upcoming subscriptions & recurring bill schedule",
                },
                {
                  key: "showRecentTransactions" as const,
                  label: "Recent Transactions",
                  desc: "Quick ledger feed of your 5 latest transactions",
                },
                {
                  key: "showTopCategories" as const,
                  label: "Top Spending Categories",
                  desc: "Monthly breakdown of your largest expense drivers",
                },
                {
                  key: "showSavingsRate" as const,
                  label: "Savings Rate & Velocity",
                  desc: "Net capital retention & daily runway telemetry",
                },
                {
                  key: "showSplitBillTracker" as const,
                  label: "Split Bill & Receivables",
                  desc: "Track friend shares & pending shared receivables",
                },
              ].map((item) => {
                const isEnabled = homeWidgets[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleWidget(item.key)}
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
                      <p
                        className="text-[13px] font-semibold leading-snug"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="text-[11px] leading-relaxed mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {item.desc}
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

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  setHomeWidgets(DEFAULT_HOME_WIDGETS);
                  localStorage.removeItem("trouvaille_home_widgets_v1");
                }}
                className="flex-1 py-2 rounded-xl text-[11.5px] font-bold glass-surface active:scale-95 transition-transform cursor-pointer"
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
                className="flex-1 py-2 rounded-xl text-[11.5px] font-bold active:scale-95 transition-transform cursor-pointer"
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
    </div>
  );
}
