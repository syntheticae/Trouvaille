import { GoalDetailModal } from "../components/goals/GoalDetailModal";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import { useGoals } from "../hooks/useGoals";
import { useWallets } from "../hooks/useWallets";
import { useBills, getDaysUntilDue } from "../hooks/useBills";
import { triggerHaptic } from "../lib/haptics";
import { SplitBillSheet } from "../components/tools/SplitBillSheet";
import { syncDailyStreakReminder } from "../lib/notifications";
import { resolveTransactionCategory } from "../lib/categoryResolver";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useWidgetLayout } from "../hooks/useWidgetLayout";
import {
  ReorderableWidgetGrid,
  WidgetCustomizationBar,
} from "../components/common";
import type { WidgetSize } from "../lib/widgetLayoutTypes";
import { HOME_PRESETS } from "../lib/widgetLayoutTypes";
import {
  CompactSpendingStabilityHalf,
  CompactCashflowPulseHalf,
  CompactAIInsightsHalf,
  CompactGoalsHalf,
  CompactBillsHalf,
  CompactTopCategoriesHalf,
  CompactSplitBillHalf,
  SavingsRingCard,
  SpendingVelocityBarCard,
  CategoryDonutCard,
  MiniHeatmapCard,
  HealthMeterCard,
  LiquidRunwayCard,
  CalendarCard,
} from "../components/home/CompactHomeCards";
import { BillManagementSheets } from "../components/settings/BillManagementSheets";
import { ProfileMenuModal } from "../components/home/ProfileMenuModal";
import { ProfileSheet } from "../components/settings/ProfileSheet";
import { WebDashboardLinkModal } from "../components/settings/WebDashboardLinkModal";
import { CategoryBudgetDeck } from "../components/home/CategoryBudgetDeck";
import { InvestmentPulseCard } from "../components/home/InvestmentPulseCard";

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

import { useState, useMemo, useEffect } from "react";
import {
  Bell,
  ArrowUpRight,
  Eye,
  EyeOff,
  Check,
  SlidersHorizontal,
  X,
  Users,
  CalendarDays,
  Target,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import { useSpace } from "../contexts/SpaceContext";
import { SpaceSwitcherSheet } from "../components/spaces/SpaceSwitcherSheet";
import { NfcCardReaderModal } from "../components/nfc/NfcCardReaderModal";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  useAllTransactions,
  useAddTransaction,
} from "../hooks/useTransactions";
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
  startOfDay,
} from "date-fns";
import { BottomSheet } from "../components/ui/BottomSheet";
import { BalanceCard } from "../components/ui/BalanceCard";
import { NotificationSheet } from "../components/ui/NotificationSheet";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
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

export function HomePage({
  onOpenAdd: _onOpenAdd,
  onOpenScan: _onOpenScan,
}: HomePageProps) {
  const navigate = useNavigate();
  const { t, isIndonesian } = useLanguage();
  useCurrency();
  const [todayDate, setTodayDate] = useState(() => startOfDay(new Date()));
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const checkDateAndHour = () => {
      const current = new Date();
      const h = current.getHours();
      setCurrentHour((prev) => (prev !== h ? h : prev));

      const dayMidnight = startOfDay(current);
      setTodayDate((prev) =>
        prev.getTime() !== dayMidnight.getTime() ? dayMidnight : prev,
      );
    };

    const timer = setInterval(checkDateAndHour, 60000);
    const handleVis = () => {
      if (!document.hidden) checkDateAndHour();
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, []);

  // `now` maintains stable date reference throughout the day to prevent invalidating useMemos
  const now = todayDate;
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme !== "light";
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [stockRange, setStockRange] = useState<StockRange>("1W");
  const { isStealthMode: hideBalance, toggleStealthMode: toggleHideBalance } =
    usePrivacy();

  const { showToast } = useToast();
  const markBillPaid = useMarkBillPaid();
  const upcomingBills = useUpcomingBills();
  const { budgetTarget, budgetPeriodStart } = useBudgetTarget();
  const {
    data: rawAllTxs = [],
    refetch: refetchAllTxs,
    isLoading: isTxsLoading,
  } = useAllTransactions();
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const {
    data: _walletsData = [],
    refetch: refetchWallets,
    isLoading: isWalletsLoading,
  } = useWallets();
  const { data: allBills = [], refetch: refetchBills } = useBills();
  const isColdLoading =
    (isTxsLoading || isWalletsLoading) && rawAllTxs.length === 0;
  const { goals, depositToGoal, updateGoal, deleteGoal } = useGoals();
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const { netWorth, liquidAssets, liquidAccounts } = useWalletBalances();

  const [metricDrillDown, setMetricDrillDown] = useState<{
    type: "expense" | "income" | "budget_risk" | "snapshot";
    data: any;
  } | null>(null);

  const [billManagementOpen, setBillManagementOpen] = useState(false);
  const {
    activeSpace,
    activeSpaceId,
    setActiveSpaceId,
    filterTransactionsBySpace,
  } = useSpace();
  const allTxs = useMemo(() => {
    return filterTransactionsBySpace(rawAllTxs, activeSpaceId);
  }, [rawAllTxs, activeSpaceId, filterTransactionsBySpace]);
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [splitBillSheetOpen, setSplitBillSheetOpen] = useState(false);
  const [webDashboardOpen, setWebDashboardOpen] = useState(false);
  const addTx = useAddTransaction();

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
    activePresetKey,
    setActivePresetKey,
  } = useWidgetLayout();

  const [customizeHomeOpen, setCustomizeHomeOpen] = useState(false);

  const intel = useFinancialIntelligence({
    transactions: allTxs,
    budgetTarget,
    budgetPeriodStart,
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

  // 1. Liquid Position and Apple Stocks Layout Data Calculation
  const assetData = useMemo(() => {
    const liquidAccountIds = new Set(liquidAccounts.map((a: any) => a.id));
    const liquidTxs = allTxs.filter(
      (t: any) =>
        !t.wallet_id ||
        liquidAccountIds.has(t.wallet_id) ||
        (t.destination_wallet_id &&
          liquidAccountIds.has(t.destination_wallet_id)),
    );
    return calculateAssetTrend(liquidTxs, liquidAssets, stockRange);
  }, [allTxs, liquidAssets, liquidAccounts, stockRange]);

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

  const currentMonthKey = format(now, "yyyy-MM");
  const monthTxs = useMemo(() => {
    return allTxs.filter(
      (t) => t.occurred_on && t.occurred_on.startsWith(currentMonthKey),
    );
  }, [allTxs, currentMonthKey]);

  useEffect(() => {
    syncDailyStreakReminder(intel.loggedToday);
  }, [intel.loggedToday]);

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
        (t) =>
          t.occurred_on === dStr && t.type === "expense" && !isCorrectionTx(t),
      );
      const amount = dayTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return { dayLabel: format(d, "EEE"), amount };
    });
  }, [allTxs, now]);

  const categoryDonutData = useMemo(() => {
    const list = currentMonthStats.topExpenseCategories || [];
    const top4 = list.slice(0, 4);
    const top4Total = top4.reduce((s, c) => s + c.total, 0);
    const otherTotal = Math.max(0, totalExpense - top4Total);

    const res = top4.map((c) => ({
      name: c.name,
      amount: c.total,
      pct: totalExpense > 0 ? (c.total / totalExpense) * 100 : 0,
      count: c.count,
    }));

    if (otherTotal > 0 && list.length > 4) {
      res.push({
        name: "Lainnya",
        amount: otherTotal,
        pct: totalExpense > 0 ? (otherTotal / totalExpense) * 100 : 0,
        count: list.slice(4).reduce((s, c) => s + c.count, 0),
      });
    }
    return res;
  }, [currentMonthStats.topExpenseCategories, totalExpense]);

  const { heatmapDaysData, activeSpendDaysCount } = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });
    const todayStr = format(now, "yyyy-MM-dd");
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
        date: d,
        hasSpend: exp > 0,
        amount: exp,
        intensity: exp / maxDaySpend,
        isToday: dStr === todayStr,
        dayOfWeek: d.getDay(),
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

  const [displayName, setDisplayName] = useState(() => {
    return (
      session?.user?.user_metadata?.display_name ||
      session?.user?.email?.split("@")[0] ||
      "User"
    );
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return (
      session?.user?.user_metadata?.avatar_url ||
      localStorage.getItem("trouvaille_avatar") ||
      ""
    );
  });

  useEffect(() => {
    if (session?.user) {
      setDisplayName(
        session.user.user_metadata?.display_name ||
          session.user.email?.split("@")[0] ||
          "User",
      );
      setAvatarUrl(
        session.user.user_metadata?.avatar_url ||
          localStorage.getItem("trouvaille_avatar") ||
          "",
      );
    }
  }, [session]);

  const hour = currentHour;
  const greetingPrefix = isIndonesian
    ? hour >= 4 && hour < 12
      ? "Selamat Pagi"
      : hour >= 12 && hour < 15
        ? "Selamat Siang"
        : hour >= 15 && hour < 19
          ? "Selamat Sore"
          : "Selamat Malam"
    : hour >= 4 && hour < 12
      ? "Good Morning"
      : hour >= 12 && hour < 17
        ? "Good Afternoon"
        : hour >= 17 && hour < 21
          ? "Good Evening"
          : "Good Night";

  const greetingTitle = `${greetingPrefix}, ${displayName}`;

  const stockRangeLabels: Record<StockRange, string> = {
    "1D": isIndonesian ? "Hari Ini" : "Past Day",
    "1W": isIndonesian ? "7 Hari Terakhir" : "Past Week",
    "1M": isIndonesian ? "1 Bulan Terakhir" : "Past Month",
    "6M": isIndonesian ? "6 Bulan Terakhir" : "Past 6 Months",
    YTD: isIndonesian ? "Tahun Berjalan" : "Year to Date",
    "1Y": isIndonesian ? "1 Tahun Terakhir" : "Past 1 Year",
    ALL: isIndonesian ? "Sepanjang Waktu" : "All Time",
  };

  const renderCardContent = (cardId: string, size: WidgetSize) => {
    switch (cardId) {
      case "net_portfolio":
        return (
          <section className="card-contrast-hero p-4 pb-3 relative overflow-hidden">
            {/* Title Header */}
            <div className="flex items-center justify-between mb-1">
              <h2
                className={`text-[12px] font-semibold uppercase tracking-wider leading-none ${
                  isDark ? "text-white/80" : "text-[var(--text-secondary)]"
                }`}
              >
                {isIndonesian ? "Posisi Kas Likuid" : "Liquid Position"}
              </h2>
              <button
                onClick={toggleHideBalance}
                className={`p-1 -mr-1 cursor-pointer active:scale-90 transition-all ${
                  isDark
                    ? "text-white/60 hover:text-white"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                title={hideBalance ? "Show Balance" : "Hide Balance"}
              >
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Amount */}
            <div className="mb-1.5">
              {isColdLoading ? (
                <div
                  className={`h-8 w-44 rounded-xl animate-pulse my-1 ${
                    isDark ? "bg-white/10" : "bg-black/10"
                  }`}
                />
              ) : (
                <span
                  className={`text-[28px] font-bold tracking-tight amount leading-tight ${
                    isDark ? "text-white" : "text-[var(--text-primary)]"
                  }`}
                >
                  {hideBalance
                    ? "Rp ••••••••"
                    : formatRupiah(assetData.currentBalance)}
                </span>
              )}
            </div>

            {/* Change Line + Time Label Side by Side */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              {isColdLoading ? (
                <div
                  className={`h-4 w-28 rounded-lg animate-pulse ${
                    isDark ? "bg-white/10" : "bg-black/10"
                  }`}
                />
              ) : (
                <div
                  className="flex items-center gap-1 text-[12px] font-semibold"
                  style={{
                    color: isDark
                      ? assetData.diff >= 0
                        ? "#FFFFFF"
                        : "#A1A1AA"
                      : assetData.diff >= 0
                        ? "#121214"
                        : "#71717a",
                  }}
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
              )}
              <span
                className={`text-[11px] font-semibold shrink-0 ${
                  isDark ? "text-white/50" : "text-[var(--text-tertiary)]"
                }`}
              >
                {stockRangeLabels[stockRange]} · IDR
              </span>
            </div>

            {/* Range Pill Selector (1D, 1W, 1M, 6M, YTD, 1Y, ALL) */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 mb-1.5">
              {(
                ["1D", "1W", "1M", "6M", "YTD", "1Y", "ALL"] as StockRange[]
              ).map((r) => {
                const isActive = stockRange === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setStockRange(r);
                      triggerHaptic("light");
                    }}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-all cursor-pointer select-none"
                    style={{
                      background: isActive
                        ? isDark
                          ? "rgba(255,255,255,0.25)"
                          : "#18181b"
                        : isDark
                          ? "transparent"
                          : "#f4f4f7",
                      color: isActive
                        ? "#FFFFFF"
                        : isDark
                          ? "rgba(255,255,255,0.55)"
                          : "#52525b",
                      border: isActive
                        ? isDark
                          ? "1px solid rgba(255,255,255,0.35)"
                          : "1px solid #18181b"
                        : isDark
                          ? "1px solid transparent"
                          : "1px solid rgba(0,0,0,0.04)",
                      boxShadow: isActive
                        ? isDark
                          ? "none"
                          : "0 2px 6px rgba(0,0,0,0.18)"
                        : "none",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {/* Chart with Right Y-Axis & Dotted Grid */}
            <div className="h-[120px] w-full mt-0.5">
              {isColdLoading ? (
                <div
                  className={`h-full w-full rounded-2xl animate-pulse ${
                    isDark ? "bg-white/5" : "bg-black/5"
                  }`}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={assetData.chartData}
                    margin={{ top: 4, right: 0, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="heroGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={isDark ? "#FFFFFF" : "#18181b"}
                          stopOpacity={isDark ? 0.25 : 0.12}
                        />
                        <stop
                          offset="100%"
                          stopColor={isDark ? "#FFFFFF" : "#18181b"}
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 3"
                      stroke={
                        isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"
                      }
                      vertical={true}
                      horizontal={true}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 9,
                        fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
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
                        fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
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
                      stroke={isDark ? "#FFFFFF" : "#18181b"}
                      strokeWidth={2}
                      fill="url(#heroGradient)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: isDark ? "#FFFFFF" : "#18181b",
                        stroke: isDark
                          ? "rgba(0,0,0,0.5)"
                          : "rgba(255,255,255,0.9)",
                        strokeWidth: 1.5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Stocks-Style Summary Footer (High, Low, Inflow, Outflow) */}
            <div
              className={`grid grid-cols-4 gap-1.5 pt-2.5 mt-1 border-t text-center ${
                isDark ? "border-white/10" : "border-black/[0.06]"
              }`}
            >
              <div>
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {isIndonesian ? "Tertinggi" : "High"}
                </p>
                <p
                  className={`text-[11px] font-semibold amount mt-0.5 ${
                    isDark ? "text-white" : "text-[var(--text-primary)]"
                  }`}
                >
                  {hideBalance
                    ? "••••"
                    : assetData.highBalance >= 1000
                      ? "Rp " + formatAxisY(assetData.highBalance)
                      : formatRupiah(assetData.highBalance)}
                </p>
              </div>
              <div>
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {isIndonesian ? "Terendah" : "Low"}
                </p>
                <p
                  className={`text-[11px] font-semibold amount mt-0.5 ${
                    isDark ? "text-white" : "text-[var(--text-primary)]"
                  }`}
                >
                  {hideBalance
                    ? "••••"
                    : assetData.lowBalance >= 1000
                      ? "Rp " + formatAxisY(assetData.lowBalance)
                      : formatRupiah(assetData.lowBalance)}
                </p>
              </div>
              <div>
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {isIndonesian ? "Masuk" : "Inflow"}
                </p>
                <p
                  className={`text-[11px] font-semibold amount mt-0.5 ${
                    isDark ? "text-white" : "text-[var(--text-primary)]"
                  }`}
                >
                  {hideBalance
                    ? "••••"
                    : assetData.periodInflow > 0
                      ? "+Rp " + formatAxisY(assetData.periodInflow)
                      : "Rp 0"}
                </p>
              </div>
              <div>
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {isIndonesian ? "Keluar" : "Outflow"}
                </p>
                <p
                  className={`text-[11px] font-semibold amount mt-0.5 ${
                    isDark ? "text-white" : "text-[var(--text-primary)]"
                  }`}
                >
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

      case "investment_pulse":
        return <InvestmentPulseCard />;

      case "spending_stability":
        if (!intel.expenseVolatility) return null;
        if (size === "half") {
          return (
            <CompactSpendingStabilityHalf
              level={
                intel.expenseVolatility.stability === "VOLATILE"
                  ? "High"
                  : intel.expenseVolatility.stability === "MODERATE"
                    ? "Moderate"
                    : "Low"
              }
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
                    title:
                      intel.actionCenterInsight?.title || "Financial Alert",
                    subtitle:
                      intel.actionCenterInsight?.subtitle ||
                      "Anomalous spending detected",
                    badge: intel.actionCenterInsight?.badge || "Insight",
                    ctaLabel:
                      intel.actionCenterInsight?.actionLabel ||
                      "Open Action Center",
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
              <span
                className="text-[11px] font-bold tracking-wider block"
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

            <div
              className="glass-surface p-3.5 rounded-[22px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
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
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Financial Goals
              </span>
              <span
                className="text-[11px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {goals.length} {goals.length === 1 ? "Goal" : "Goals"}
              </span>
            </div>

            <div className="space-y-2.5">
              {goals.slice(0, 3).map((g: any) => {
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
                      boxShadow: "var(--shadow-card)",
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
        );

      case "upcoming_bills":
        if (upcomingBills.length === 0) return null;
        if (size === "half") {
          const nextBill: any = upcomingBills[0];
          const days = getDaysUntilDue(nextBill.due_date);
          return (
            <CompactBillsHalf
              nextBillName={nextBill.title || "Bill"}
              nextBillAmount={Number(nextBill.amount || 0)}
              daysLeft={days}
              onOpenDetail={() => {
                triggerHaptic("light");
                setBillManagementOpen(true);
              }}
            />
          );
        }
        return (
          <section className="space-y-2">
            <div
              className="flex items-center justify-between px-1 cursor-pointer select-none"
              onClick={() => {
                triggerHaptic("light");
                setBillManagementOpen(true);
              }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Upcoming Bills
              </span>
              <span
                className="text-[11px] font-medium hover:underline flex items-center gap-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Manage Bills
              </span>
            </div>
            <div className="space-y-2">
              {upcomingBills.slice(0, 3).map((bill: any) => {
                const dueStatusLabel = getBillDueStatusLabel(bill.due_date);
                const isMarkingPaid =
                  markBillPaid.isPending &&
                  markBillPaid.variables?.bill.id === bill.id;
                return (
                  <div
                    key={bill.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setBillManagementOpen(true);
                    }}
                    className="glass-surface flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-transform"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] shrink-0"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Bell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-semibold truncate"
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
                        className="amount text-[14px] font-semibold"
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
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        style={{
                          background: "var(--glass-fill-strong)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                        title="Mark as paid"
                      >
                        <Check size={11} />
                        <span>{isMarkingPaid ? "Saving..." : "Paid"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Total Recurring Bills Runway & Calendar Link */}
              <div
                onClick={() => {
                  triggerHaptic("light");
                  navigate("/calendar");
                }}
                className="p-3.5 rounded-2xl glass-surface flex items-center justify-between mt-2.5 cursor-pointer active:scale-[0.99] transition-transform"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "var(--shadow-card)",
                }}
                title="View Calendar & Bill Runway"
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
                    className="text-[12px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Total Upcoming Bills · View Calendar
                  </span>
                </div>
                <span
                  className="amount text-[14px] font-semibold"
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
        );

      case "category_budgets":
        return (
          <CategoryBudgetDeck
            onOpenManageCategories={() => navigate("/categories")}
            hideBalance={hideBalance}
          />
        );

      case "recent_transactions":
        if (allTxs.length === 0) return null;
        return (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3
                className="text-[13px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Transactions
              </h3>
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
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
                    style={{
                      background: "var(--bg-elevated)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--glass-fill)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
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
        );

      case "top_categories":
        if (
          !currentMonthStats.topExpenseCategories ||
          currentMonthStats.topExpenseCategories.length === 0
        )
          return null;
        if (size === "half") {
          const topCat = currentMonthStats.topExpenseCategories[0];
          const pct =
            currentMonthStats.expense > 0
              ? Math.round((topCat.total / currentMonthStats.expense) * 100)
              : 0;
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
              <h3
                className="text-[13px] font-semibold tracking-tight"
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
              style={{
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {currentMonthStats.topExpenseCategories.slice(0, 3).map((cat) => {
                const pct =
                  currentMonthStats.expense > 0
                    ? Math.round((cat.total / currentMonthStats.expense) * 100)
                    : 0;
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                        <span
                          className="font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="font-semibold amount"
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
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                      }}
                    >
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
              <h3
                className="text-[13px] font-semibold tracking-tight"
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
              className={`p-4 rounded-3xl glass-surface border border-[var(--glass-border)] grid ${size === "half" ? "grid-cols-1" : "grid-cols-2"} gap-3`}
              style={{
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="p-3 rounded-2xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Savings Rate
                </p>
                <p
                  className="text-[20px] font-semibold tracking-tight"
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
              <div
                className="p-3 rounded-2xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Runway
                </p>
                <p
                  className="text-[20px] font-semibold tracking-tight"
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
        );

      case "split_bill":
        if (size === "half") {
          return (
            <CompactSplitBillHalf
              onOpenDetail={() => {
                triggerHaptic("light");
                setSplitBillSheetOpen(true);
              }}
            />
          );
        }
        return (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3
                className="text-[13px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Split Bill & Receivables
              </h3>
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Shared Balances
              </span>
            </div>
            <div
              className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
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
                  <p
                    className="text-[13px] font-semibold leading-tight truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Shared Settlements
                  </p>
                  <p
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Track friend shares & pending settlements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSplitBillSheetOpen(true);
                }}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 ml-2"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                Split Bill
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
              const netRetention =
                currentMonthStats.income - currentMonthStats.expense;
              const isSurplus = netRetention >= 0;
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: Math.abs(netRetention),
                  totalPrevious: 0,
                  delta: netRetention,
                  pctChange: 0,
                  displayValue: `${isSurplus ? "+" : "-"}${formatRupiah(Math.abs(netRetention))}`,
                  title: "Savings Telemetry",
                  subtitle: isSurplus
                    ? `Net capital retention is ${intel.savingsRate.toFixed(1)}% of total monthly inflow (${formatRupiah(currentMonthStats.income)}). Retained capital: ${formatRupiah(netRetention)}.`
                    : `Outflow (${formatRupiah(currentMonthStats.expense)}) exceeds inflow (${formatRupiah(currentMonthStats.income)}) this month by a deficit of ${formatRupiah(Math.abs(netRetention))}.`,
                  badge: isSurplus
                    ? `${intel.savingsRate.toFixed(0)}% Saved`
                    : "Cash Deficit",
                  hideGrid: true,
                  items: [
                    {
                      label: "Gross Inflow",
                      amount: currentMonthStats.income,
                      detail: "All earnings and incoming transfers",
                    },
                    {
                      label: "Gross Outflow",
                      amount: currentMonthStats.expense,
                      detail: "All spending and asset allocations",
                    },
                    {
                      label: isSurplus
                        ? "Net Capital Retained"
                        : "Net Cash Deficit",
                      amount: Math.abs(netRetention),
                      valueText: `${isSurplus ? "+" : "-"}${formatRupiah(Math.abs(netRetention))}`,
                      detail: isSurplus
                        ? "Capital retained in period"
                        : "Additional capital required",
                    },
                  ],
                  ctaLabel: "View Financial Report",
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
              const total7d = last7DaysOutlays.reduce(
                (sum, d) => sum + d.amount,
                0,
              );
              const peak7d = last7DaysOutlays.reduce(
                (max, d) => (d.amount > max.amount ? d : max),
                last7DaysOutlays[0] || { dayLabel: "-", amount: 0 },
              );
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: total7d,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  displayValue: formatRupiah(total7d),
                  title: "7-Day Spending Velocity",
                  subtitle: `Total outflow over the last 7 days is ${formatRupiah(total7d)} with a daily average of ${formatRupiah(Math.round(total7d / 7))}. Peak spending was on ${peak7d.dayLabel} (${formatRupiah(peak7d.amount)}).`,
                  badge: "Last 7 Days",
                  hideGrid: true,
                  items: last7DaysOutlays.map((d) => ({
                    label: `${d.dayLabel} Outflow`,
                    amount: d.amount,
                    pct: total7d > 0 ? (d.amount / total7d) * 100 : 0,
                    detail:
                      d.amount > dailyAverage
                        ? "Above daily average"
                        : "Within pace",
                  })),
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
                  delta: -currentMonthStats.expense,
                  pctChange: 0,
                  displayValue: formatRupiah(currentMonthStats.expense),
                  title: "Category Expense Allocation",
                  subtitle: `Total gross outflow this month is ${formatRupiah(currentMonthStats.expense)}. Inflow is recorded at ${formatRupiah(currentMonthStats.income)}, resulting in a net monthly balance of ${formatRupiah(currentMonthStats.income - currentMonthStats.expense)}.`,
                  badge: "Gross Outflow",
                  hideGrid: true,
                  items: categoryDonutData.map((c) => ({
                    label: c.name,
                    amount: c.amount,
                    pct: c.pct,
                    detail: `${c.pct.toFixed(0)}% of total outflow${c.count ? ` (${c.count} txs)` : ""}`,
                  })),
                  ctaLabel: "View Analytics in Statistics",
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
            totalMonthSpend={currentMonthStats.expense}
            dailyAverage={dailyAverage}
            onOpenDetail={() => {
              const peak = heatmapDaysData.reduce(
                (max, d) => ((d.amount || 0) > (max.amount || 0) ? d : max),
                heatmapDaysData[0] || { day: 1, amount: 0 },
              );
              setMetricDrillDown({
                type: "snapshot",
                data: {
                  totalCurrent: currentMonthStats.expense,
                  totalPrevious: 0,
                  delta: 0,
                  pctChange: 0,
                  displayValue: `${activeSpendDaysCount} Active Days`,
                  title: "Monthly Activity Matrix",
                  subtitle: `You recorded transactions on ${activeSpendDaysCount} out of ${heatmapDaysData.length} days this month (${Math.round((activeSpendDaysCount / heatmapDaysData.length) * 100)}% active frequency). Total outflow reached ${formatRupiah(currentMonthStats.expense)} with peak daily spend on Day ${peak.day} (${formatRupiah(peak.amount || 0)}).`,
                  badge: `${activeSpendDaysCount} Active Days`,
                  hideGrid: true,
                  items: [
                    {
                      label: "Total Outflow This Month",
                      amount: currentMonthStats.expense,
                      detail: "Cumulative spending across all wallets",
                    },
                    {
                      label: "Daily Average Outflow",
                      amount: Math.round(dailyAverage),
                      detail: `Based on ${daysInMonth} elapsed days`,
                    },
                    {
                      label: "Active Day Average",
                      amount:
                        activeSpendDaysCount > 0
                          ? Math.round(
                              currentMonthStats.expense / activeSpendDaysCount,
                            )
                          : 0,
                      detail: "Average spending on active transaction days",
                    },
                    {
                      label: `Peak Outflow (Day ${peak.day})`,
                      amount: peak.amount || 0,
                      detail: "Highest spending day of the month",
                    },
                  ],
                  ctaLabel: "View Activity Patterns in Statistics",
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
              triggerHaptic("light");
              navigate("/calendar?view=runway");
            }}
          />
        );

      case "calendar_activity":
        return (
          <CalendarCard
            size={size}
            monthTransactionsCount={monthTxs.length}
            activeDaysCount={activeSpendDaysCount}
            onOpenDetail={() => {
              triggerHaptic("light");
              navigate("/calendar");
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-5 pt-6 space-y-4 pb-36 relative max-w-full overflow-x-clip">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={threshold}
      />
      {/* HEADER */}
      <header className="flex justify-between items-center relative z-40 gap-3">
        <div className="relative flex-1 min-w-0 mr-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setProfileMenuOpen((prev) => !prev);
            }}
            className="flex items-center gap-3 group text-left cursor-pointer select-none transition-transform active:scale-[0.98] min-w-0 max-w-full"
          >
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative shrink-0 transition-shadow group-hover:shadow-md"
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
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                <h1 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                  {greetingTitle}
                </h1>
                <span className="text-[10px] text-[var(--text-tertiary)] opacity-60 shrink-0">
                  ▾
                </span>
              </div>
              <p className="text-[11px] font-normal text-[var(--text-tertiary)] leading-none mt-1 truncate">
                {t("home.financialOverview", "Financial Overview")}
              </p>
            </div>
          </button>

          {/* Apple Luxury Dynamic Island Profile Capsule */}
          <ProfileMenuModal
            isOpen={profileMenuOpen}
            onClose={() => setProfileMenuOpen(false)}
            onOpenProfileSettings={() => {
              setProfileMenuOpen(false);
              setProfileSheetOpen(true);
            }}
            onOpenManageLedgers={() => {
              setProfileMenuOpen(false);
              setSpaceSwitcherOpen(true);
            }}
            onOpenWebDashboard={() => {
              setProfileMenuOpen(false);
              setWebDashboardOpen(true);
            }}
            onOpenNotifications={() => {
              setProfileMenuOpen(false);
              setNotifOpen(true);
            }}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              triggerHaptic("light");
              toggleTheme();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer select-none"
            title={
              theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"
            }
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--text-primary)" }}
              />
            ) : (
              <Sun
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--text-primary)" }}
              />
            )}
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setCustomizeHomeOpen(true);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer select-none"
            title="Customize Dashboard Widgets"
          >
            <SlidersHorizontal
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--text-primary)" }}
            />
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              navigate("/settings");
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer"
            title={t("settings.title", "Settings")}
            aria-label="Settings"
          >
            <Settings
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--text-primary)" }}
            />
          </button>
        </div>
      </header>

      {/* Active Ledger Segregation Notice */}
      {activeSpaceId !== "all" && activeSpaceId !== "personal" && (
        <div
          className="px-3.5 py-2 rounded-2xl flex items-center justify-between text-[11px] font-medium animate-fadeIn"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>
              Active Ledger:{" "}
              <strong className="text-[var(--text-primary)]">
                {activeSpace.name}
              </strong>{" "}
              ({activeSpace.tag})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSpaceId("personal")}
            className="text-[10px] font-semibold text-[var(--text-primary)] hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* Dynamic Reorderable iOS-Style Card Springboard */}
      <ReorderableWidgetGrid
        cards={visibleCards}
        isEditMode={isEditMode}
        onReorder={reorderCards}
        onEnterEditMode={() => setIsEditMode(true)}
        onCycleSize={cycleCardSize}
        onHide={toggleCardVisibility}
        renderCard={(card) => renderCardContent(card.id, card.size)}
      />

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
      <SpaceSwitcherSheet
        isOpen={spaceSwitcherOpen}
        onClose={() => setSpaceSwitcherOpen(false)}
      />
      <NfcCardReaderModal
        isOpen={nfcModalOpen}
        onClose={() => setNfcModalOpen(false)}
      />

      {/* CUSTOMIZE HOME WIDGETS MODAL (Compact 2-Column Minimalist Grid) */}
      {customizeHomeOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl p-5 space-y-3.5 text-left transition-all max-h-[88dvh] flex flex-col pb-[max(calc(env(safe-area-inset-bottom,0px)+12px),20px)] sm:pb-5"
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

            {/* Quick Layout Preset Segment Control (4-Preset Capsule Pill Bar) */}
            <div className="space-y-1.5 pt-0.5 pb-1">
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Dashboard Presets
                </span>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] truncate max-w-[200px]">
                  {t(
                    `home.presets.${activePresetKey}Desc`,
                    HOME_PRESETS.find((p) => p.key === activePresetKey)
                      ?.description || "",
                  )}
                </span>
              </div>

              <div
                className="flex items-center p-1 rounded-full w-full"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.04)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {HOME_PRESETS.map((preset) => {
                  const isActive = activePresetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        triggerHaptic("medium");
                        setActivePresetKey(preset.key);
                        applyPreset(preset.key);
                      }}
                      className={`flex-1 py-1.5 px-1 text-center rounded-full text-[12px] transition-all duration-200 cursor-pointer select-none ${
                        isActive
                          ? isDark
                            ? "bg-white text-zinc-950 font-semibold shadow-sm"
                            : "bg-black text-white font-semibold shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                      }`}
                    >
                      {t(`home.presets.${preset.key}`, preset.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grouped Feature Rows for All Dashboard Cards */}
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
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
                      className="shrink-0 ml-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ToggleSwitch
                        checked={isEnabled}
                        onChange={() => toggleCardVisibility(w.id)}
                        size="sm"
                        ariaLabel={`Toggle ${w.title}`}
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

      {/* Gen Z Social Split Bill Sheet */}
      <SplitBillSheet
        isOpen={splitBillSheetOpen}
        onClose={() => setSplitBillSheetOpen(false)}
        onRecordTransaction={(data) => {
          addTx.mutate({
            type: "expense",
            amount: data.myShare,
            note: data.note,
            occurred_on: format(new Date(), "yyyy-MM-dd"),
            created_at: new Date().toISOString(),
            category_id: categories.length > 0 ? categories[0].id : null,
            wallet_id: _walletsData.length > 0 ? _walletsData[0].id : null,
            to_wallet_id: null,
          });
        }}
      />

      {/* Profile Sheet */}
      <ProfileSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        displayName={displayName}
        setDisplayName={setDisplayName}
        onOpenDeleteAccount={() => {
          setProfileSheetOpen(false);
          navigate("/settings");
        }}
      />

      <WebDashboardLinkModal
        isOpen={webDashboardOpen}
        onClose={() => setWebDashboardOpen(false)}
      />
    </div>
  );
}
