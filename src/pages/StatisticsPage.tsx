import { triggerHaptic } from "../lib/haptics";
import {
  useWallets,
  getWalletIcon,
  resolveTransactionWallets,
} from "../hooks/useWallets";
import { resolveTransactionCategory } from "../lib/categoryResolver";
import {
  useCategories,
  getCategoryParent,
  getParentIcon,
} from "../hooks/useCategories";
import {
  Layers,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  Info,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAllTransactions } from "../hooks/useTransactions";
import { formatRupiah } from "../lib/utils";
import { BottomSheet } from "../components/ui/BottomSheet";
import { IconRenderer } from "../components/ui/IconRenderer";
import { useTheme } from "../contexts/ThemeContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useBudgetTarget } from "../hooks/useBudgetTarget";
import { useBills } from "../hooks/useBills";
import { useGoals } from "../hooks/useGoals";
import { useFinancialIntelligence } from "../hooks/useFinancialIntelligence";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { MonthlyReviewSection } from "../components/statistics/MonthlyReviewSection";
import { PersonalBaselineSection } from "../components/statistics/PersonalBaselineSection";
import { SpendingPatternsSection } from "../components/statistics/SpendingPatternsSection";
import { ExpenseStructureCard } from "../components/statistics/ExpenseStructureCard";
import { DebtPayoffSimulatorCard } from "../components/statistics/DebtPayoffSimulatorCard";
import { ZeroBasedEnvelopesCard } from "../components/statistics/ZeroBasedEnvelopesCard";
import { CashflowOutlookCard } from "../components/home/CashflowOutlookCard";
import { LiquidityHorizonCard } from "../components/home/LiquidityHorizonCard";
import { WhatIfSimulatorCard } from "../components/home/WhatIfSimulatorCard";
import { PersonalFinancialModelCard } from "../components/home/PersonalFinancialModelCard";
import { FinancialReportSection } from "../components/statistics/FinancialReportSection";
import { AssetAnalyticsSection } from "../components/statistics/AssetAnalyticsSection";
import { CashflowSankeySection } from "../components/statistics/CashflowSankeySection";
import { MonteCarloCard } from "../components/statistics/MonteCarloCard";
import { FirePlannerCard } from "../components/statistics/FirePlannerCard";
import { CategoryBreakdownCard } from "../components/statistics/CategoryBreakdownCard";
import { NetCapitalTrajectoryCard } from "../components/statistics/NetCapitalTrajectoryCard";
import { InflowOutflowTrendCard } from "../components/statistics/InflowOutflowTrendCard";
import { CashflowVelocityCard } from "../components/statistics/CashflowVelocityCard";

// Code-split heavy analytics modals and simulators
const CategoryDrillDownSheet = lazy(() =>
  import("../components/statistics/CategoryDrillDownSheet").then((m) => ({
    default: m.CategoryDrillDownSheet,
  }))
);
const FinancialHealthDiagnosticModal = lazy(() =>
  import("../components/statistics/FinancialHealthDiagnosticModal").then((m) => ({
    default: m.FinancialHealthDiagnosticModal,
  }))
);
const FinancialWrappedModal = lazy(() =>
  import("../components/statistics/FinancialWrappedModal").then((m) => ({
    default: m.FinancialWrappedModal,
  }))
);
const PersonalFinancialModelSheet = lazy(() =>
  import("../components/home/PersonalFinancialModelSheet").then((m) => ({
    default: m.PersonalFinancialModelSheet,
  }))
);
const AssetValuationSheet = lazy(() =>
  import("../components/settings/AssetValuationSheet").then((m) => ({
    default: m.AssetValuationSheet,
  }))
);
const MonteCarloSimulatorSheet = lazy(() =>
  import("../components/statistics/MonteCarloSimulatorSheet").then((m) => ({
    default: m.MonteCarloSimulatorSheet,
  }))
);
const FirePlannerSheet = lazy(() =>
  import("../components/statistics/FirePlannerSheet").then((m) => ({
    default: m.FirePlannerSheet,
  }))
);
import { ReorderableWidgetGrid, WidgetCustomizationBar } from "../components/common";
import { CustomizeStatisticsModal } from "../components/statistics/CustomizeStatisticsModal";
import { useWidgetLayout } from "../hooks/useWidgetLayout";
import { STATS_STORAGE_KEY } from "../lib/widgetLayoutEngine";
import { DEFAULT_STATISTICS_WIDGETS } from "../lib/widgetLayoutTypes";
import type { WidgetSize, StatisticsPresetKey } from "../lib/widgetLayoutTypes";
import {
  calculateAssetTrend,
  calculateWhatIfScenario,
  isCorrectionTx,
} from "../lib/financialMath";
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  isToday,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Range = "week" | "month" | "year" | "all";
type BreakdownType = "expense" | "income";
type GroupMode = "category" | "parent";
type AnalyticsSubTab = "report" | "intelligence" | "cashflow" | "assets";

const isTxCorrection = isCorrectionTx;

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: "8px 12px",
        boxShadow: "0 8px 24px var(--shadow-strength)",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <p
        style={{
          color: "var(--text-tertiary)",
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <p
          key={i}
          style={{
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              color: "var(--text-tertiary)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {p.name === "income"
              ? "Inflow: "
              : p.name === "expense"
                ? "Outflow: "
                : p.name === "net"
                  ? "Net Growth: "
                  : ""}
          </span>
          {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
};

function SavingsRing({ rate, size = 130 }: { rate: number; size?: number }) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (Math.min(100, Math.max(0, rate)) / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={isNaN(strokeDashoffset) ? circ : strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="amount text-[20px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {rate.toFixed(0)}%
        </span>
        <span
          className="text-[10px] font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          Saved
        </span>
      </div>
    </div>
  );
}

function useChartColors() {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  return useMemo(
    () => ({
      donut: isDark
        ? [
            "#FFFFFF",
            "#D1D1D6",
            "#AEAEB2",
            "#8E8E93",
            "#636366",
            "#48484A",
            "#3A3A3C",
          ]
        : [
            "#121212",
            "#2C2C2E",
            "#3A3A3C",
            "#636366",
            "#8E8E93",
            "#AEAEB2",
            "#D1D1D6",
          ],
      barHigh: isDark ? "#FFFFFF" : "#121212",
      barMid: isDark ? "#AEAEB2" : "#636366",
      barLow: isDark ? "#3A3A3C" : "#D1D1D6",
      lineStroke: isDark ? "#FFFFFF" : "#121212",
      cursorFill: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
    }),
    [isDark],
  );
}

export function StatisticsPage() {
  const { theme } = useTheme();
  const { isIndonesian } = useLanguage();
  useCurrency();
  const isDark = theme !== "light";
  const [range, setRange] = useState<Range>("month");
  const [breakdownType, setBreakdownType] = useState<BreakdownType>("expense");
  const [groupMode, setGroupMode] = useState<GroupMode>("category");
  const [allDetailsOpen, setAllDetailsOpen] = useState(false);
  const [timeframeMenuOpen, setTimeframeMenuOpen] = useState(false);
  const [analyticsSubTab, setAnalyticsSubTab] =
    useState<AnalyticsSubTab>("report");
  const now = useMemo(() => new Date(), []);
  const { data: allTxs = [] } = useAllTransactions();
  const { data: wallets = [] } = useWallets();
  const { totalAssets, liquidAssets, liquidAccounts, netWorth, zeroAccounts } =
    useWalletBalances();
  const { data: categories = [] } = useCategories();
  const { data: bills = [] } = useBills();
  const { goals } = useGoals();
  const { budgetTarget } = useBudgetTarget();
  const [walletFilterType, setWalletFilterType] = useState<
    "all" | "expense" | "income"
  >("all");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedCategoryShift, setSelectedCategoryShift] = useState<
    any | null
  >(null);
  const [healthDiagnosticOpen, setHealthDiagnosticOpen] = useState(false);
  const [personalModelOpen, setPersonalModelOpen] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const [assetValuationOpen, setAssetValuationOpen] = useState(false);
  const [monteCarloOpen, setMonteCarloOpen] = useState(false);
  const [firePlannerOpen, setFirePlannerOpen] = useState(false);
  // Collapsible card states (Default: false / folded to keep page clean & compact)
  const [categoryBreakdownExpanded, setCategoryBreakdownExpanded] = useState(false);
  const [netTrajectoryExpanded, setNetTrajectoryExpanded] = useState(false);
  const [inflowOutflowExpanded, setInflowOutflowExpanded] = useState(false);
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  const { isStealthMode: hideBalance } = usePrivacy();
  const colors = useChartColors();

  // Extract all available years from transactions + current year
  const availableYears = useMemo(() => {
    const currentYear = now.getFullYear();
    const yearSet = new Set<number>();
    yearSet.add(currentYear);

    for (let i = 0; i < allTxs.length; i++) {
      const dateStr = allTxs[i]?.occurred_on;
      if (dateStr && dateStr.length >= 4) {
        const y = parseInt(dateStr.slice(0, 4), 10);
        if (!isNaN(y) && y >= 2000 && y <= currentYear + 1) {
          yearSet.add(y);
        }
      }
    }

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [allTxs, now]);

  // iOS-Style Springboard Widget Layout for Intelligence cards
  const {
    widgets: statsWidgets,
    visibleCards: visibleStatsCards,
    hiddenCards: hiddenStatsCards,
    isEditMode: isStatsEditMode,
    setIsEditMode: setIsStatsEditMode,
    reorderCards: reorderStatsCards,
    cycleCardSize: cycleStatsCardSize,
    toggleCardVisibility: toggleStatsCardVisibility,
    resetLayout: resetStatsLayout,
    applyPreset: applyStatsPreset,
  } = useWidgetLayout({
    storageKey: STATS_STORAGE_KEY,
    defaultWidgets: DEFAULT_STATISTICS_WIDGETS,
  });

  const [customizeStatsOpen, setCustomizeStatsOpen] = useState(false);
  const [activeStatsPresetKey, setActiveStatsPresetKey] = useState<StatisticsPresetKey | null>("executive");

  const visibleReportCards = useMemo(() => {
    const reportIds = new Set([
      "financial_report",
      "monthly_review",
      "personal_baseline",
      "expense_structure",
    ]);
    return visibleStatsCards.filter((c) => reportIds.has(c.id));
  }, [visibleStatsCards]);

  const visibleIntelligenceCards = useMemo(() => {
    const intelligenceIds = new Set([
      "health_score",
      "cashflow_outlook",
      "liquidity_horizon",
      "monte_carlo",
      "fire_planner",
      "spending_patterns",
      "spending_density_heatmap",
      "zero_based_envelopes",
      "debt_payoff",
      "what_if_simulator",
      "personal_financial_model",
    ]);
    return visibleStatsCards.filter((c) => intelligenceIds.has(c.id));
  }, [visibleStatsCards]);

  const visibleCashflowCards = useMemo(() => {
    const cashflowIds = new Set([
      "cashflow_summary",
      "category_breakdown",
      "cashflow_sankey",
      "net_capital_trajectory",
      "inflow_outflow_trend",
      "cashflow_velocity",
    ]);
    return visibleStatsCards.filter((c) => cashflowIds.has(c.id));
  }, [visibleStatsCards]);

  const visibleAssetCards = useMemo(() => {
    const assetIds = new Set(["asset_analytics"]);
    return visibleStatsCards.filter((c) => assetIds.has(c.id));
  }, [visibleStatsCards]);

  const analyticsTabs = useMemo<{ key: AnalyticsSubTab; label: string }[]>(
    () => {
      const all = [
        { key: "report" as AnalyticsSubTab, label: isIndonesian ? "Laporan" : "Report", count: visibleReportCards.length },
        { key: "intelligence" as AnalyticsSubTab, label: isIndonesian ? "Kecerdasan" : "Intelligence", count: visibleIntelligenceCards.length },
        { key: "cashflow" as AnalyticsSubTab, label: isIndonesian ? "Arus Kas" : "Cashflow", count: visibleCashflowCards.length },
        { key: "assets" as AnalyticsSubTab, label: isIndonesian ? "Aset & Kekayaan" : "Net Worth", count: visibleAssetCards.length },
      ];
      return all.filter((tab) => tab.count > 0);
    },
    [isIndonesian, visibleReportCards.length, visibleIntelligenceCards.length, visibleCashflowCards.length, visibleAssetCards.length],
  );

  // Auto-switch to first available tab if current active tab is collapsed
  useEffect(() => {
    if (analyticsTabs.length > 0 && !analyticsTabs.some((t) => t.key === analyticsSubTab)) {
      setAnalyticsSubTab(analyticsTabs[0].key);
    }
  }, [analyticsTabs, analyticsSubTab]);

  const activeMonthDate = useMemo(
    () => subMonths(now, monthOffset),
    [now, monthOffset],
  );
  const intel = useFinancialIntelligence({
    transactions: allTxs,
    budgetTarget,
    totalAssets,
    liquidAssets,
    liquidAccounts,
    bills,
    categories,
    activeMonthDate,
  });

  // Phase II: Longitudinal Timeline Trajectory
  const longitudinal = useMemo(() => {
    const rangeParam =
      range === "year" ? "12M" : range === "all" ? "ALL" : "6M";
    return intel.getLongitudinalTimeline(rangeParam);
  }, [intel, range]);

  // 1. Filter by range with exact ISO string boundaries
  const rangeTxs = useMemo(() => {
    let startStr: string;
    let endStr: string;
    if (range === "week") {
      startStr = format(subDays(now, 6), "yyyy-MM-dd");
      endStr = format(now, "yyyy-MM-dd");
    } else if (range === "month") {
      const targetMonth = subMonths(now, monthOffset);
      startStr = format(startOfMonth(targetMonth), "yyyy-MM-dd");
      endStr = format(endOfMonth(targetMonth), "yyyy-MM-dd");
    } else if (range === "year") {
      const targetYearDate = new Date(selectedYear, 0, 1);
      startStr = format(startOfYear(targetYearDate), "yyyy-MM-dd");
      endStr = format(endOfYear(targetYearDate), "yyyy-MM-dd");
    } else {
      return allTxs;
    }
    return allTxs.filter((t) => {
      if (!t.occurred_on) return false;
      return t.occurred_on >= startStr && t.occurred_on <= endStr;
    });
  }, [allTxs, range, monthOffset, selectedYear, now]);

  const currentPeriodLabel = useMemo(() => {
    if (range === "week") return isIndonesian ? "7 Hari Terakhir" : "Last 7 Days";
    if (range === "month")
      return format(subMonths(now, monthOffset), "MMMM yyyy", {
        locale: isIndonesian ? idLocale : undefined,
      });
    if (range === "year") return `${selectedYear}`;
    return isIndonesian ? "Semua Waktu" : "All Time";
  }, [range, monthOffset, selectedYear, now, isIndonesian]);

  const currentPeriodBounds = useMemo(() => {
    if (range === "week") {
      return {
        start: format(subDays(now, 6), "yyyy-MM-dd"),
        end: format(now, "yyyy-MM-dd"),
      };
    } else if (range === "month") {
      const targetMonth = subMonths(now, monthOffset);
      return {
        start: format(startOfMonth(targetMonth), "yyyy-MM-dd"),
        end: format(endOfMonth(targetMonth), "yyyy-MM-dd"),
      };
    } else if (range === "year") {
      const targetYearDate = new Date(selectedYear, 0, 1);
      return {
        start: format(startOfYear(targetYearDate), "yyyy-MM-dd"),
        end: format(endOfYear(targetYearDate), "yyyy-MM-dd"),
      };
    }
    return { start: undefined, end: undefined };
  }, [range, monthOffset, selectedYear, now]);

  const { totalIncome, totalExpense } = useMemo(
    () => ({
      totalIncome: rangeTxs
        .filter((t) => t.type === "income" && !isTxCorrection(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
      totalExpense: rangeTxs
        .filter((t) => t.type === "expense" && !isTxCorrection(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    }),
    [rangeTxs],
  );

  const savingsRate =
    totalIncome > 0
      ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

  // Month-over-Month Delta Calculation (comparing to previous month)
  const { prevIncome, prevExpense } = useMemo(() => {
    const prevDate = subMonths(now, monthOffset + 1);
    const start = format(startOfMonth(prevDate), "yyyy-MM-dd");
    const end = format(endOfMonth(prevDate), "yyyy-MM-dd");
    const pTxs = allTxs.filter(
      (t) => t.occurred_on && t.occurred_on >= start && t.occurred_on <= end,
    );
    return {
      prevIncome: pTxs
        .filter((t) => t.type === "income" && !isTxCorrection(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
      prevExpense: pTxs
        .filter((t) => t.type === "expense" && !isTxCorrection(t))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    };
  }, [allTxs, now, monthOffset]);

  const getDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? { pct: 100, isUp: true } : null;
    const diff = curr - prev;
    const pct = Math.round((Math.abs(diff) / prev) * 100);
    return { pct, isUp: diff >= 0, diff };
  };

  const incomeDelta = useMemo(
    () => getDelta(totalIncome, prevIncome),
    [totalIncome, prevIncome],
  );
  const expenseDelta = useMemo(
    () => getDelta(totalExpense, prevExpense),
    [totalExpense, prevExpense],
  );
  const netDelta = useMemo(
    () => getDelta(totalIncome - totalExpense, prevIncome - prevExpense),
    [totalIncome, totalExpense, prevIncome, prevExpense],
  );

  const modelRange =
    range === "week" ? "1W" : range === "month" ? "1M" : range === "year" ? "1Y" : "ALL";

  const assetTrend = useMemo(
    () => calculateAssetTrend(allTxs, totalAssets, modelRange),
    [allTxs, modelRange, totalAssets],
  );

  const debtBalance = useMemo(() => {
    return zeroAccounts.reduce(
      (sum: number, account: { balance: number }) =>
        account.balance < 0 ? sum + Math.abs(account.balance) : sum,
      0,
    );
  }, [zeroAccounts]);

  const modelScenario = useMemo(
    () =>
      calculateWhatIfScenario({
        monthlyIncome: intel.totalIncome,
        monthlyExpense: intel.totalExpense,
        type: "expense_cut",
        value: 500000,
      }),
    [intel.totalExpense, intel.totalIncome],
  );

  const goalTrajectoryText = useMemo(() => {
    if (!goals.length) return "Add a goal to simulate timeline scenarios.";
    const primaryGoal = goals[0];
    const planning = intel.getGoalPlanning(primaryGoal);
    const required =
      planning.requiredMonthlyContribution.toLocaleString("id-ID");
    return `${primaryGoal.title}: need ~Rp ${required}/month (${planning.trajectoryStatus}).`;
  }, [goals, intel]);

  const personalBaselineText = useMemo(() => {
    const baseline = intel.personalBaselines;
    if (baseline.status === "insufficient") {
      return (
        baseline.message ||
        "Not enough history yet for a stable personal baseline."
      );
    }
    return `Typical expense ${formatRupiah(baseline.medianExpense)}/month with median retained cash ${formatRupiah(Math.max(0, baseline.medianNetCashflow))}/month.`;
  }, [intel.personalBaselines]);

  const personalFinancialModel = useMemo(() => {
    const actualCommitted = Math.max(0, intel.committedAmount);
    const actualVariable = Math.max(0, intel.totalExpense - actualCommitted);
    const actualRetained = intel.netCashflow;

    const baselineCommitted = Math.max(
      0,
      intel.liquidityHorizon.typicalCommittedOutflow,
    );
    const baselineExpense = Math.max(0, intel.personalBaselines.medianExpense);
    const baselineVariable = Math.max(0, baselineExpense - baselineCommitted);
    const baselineRetained = intel.personalBaselines.medianNetCashflow;

    const scenarioCommitted = actualCommitted;
    const scenarioVariable = Math.max(
      0,
      modelScenario.adjustedMonthlyExpense - scenarioCommitted,
    );
    const scenarioRetained =
      modelScenario.adjustedMonthlyIncome -
      modelScenario.adjustedMonthlyExpense;

    return {
      actual: {
        income: Math.max(0, intel.totalIncome),
        committedExpenses: actualCommitted,
        variableExpenses: actualVariable,
        retainedCash: actualRetained,
        savingsInvestment: Math.max(0, actualRetained),
        assets: Math.max(0, totalAssets),
        liabilities: debtBalance,
        netWorth,
      },
      baseline: {
        income: Math.max(0, intel.personalBaselines.medianIncome),
        committedExpenses: baselineCommitted,
        variableExpenses: baselineVariable,
        retainedCash: baselineRetained,
        savingsInvestment: Math.max(0, baselineRetained),
        assets: Math.max(0, totalAssets),
        liabilities: debtBalance,
        netWorth,
      },
      scenario: {
        income: Math.max(0, modelScenario.adjustedMonthlyIncome),
        committedExpenses: scenarioCommitted,
        variableExpenses: scenarioVariable,
        retainedCash: scenarioRetained,
        savingsInvestment: Math.max(0, scenarioRetained),
        assets: Math.max(0, totalAssets + modelScenario.monthlyDifference),
        liabilities: debtBalance,
        netWorth: netWorth + modelScenario.monthlyDifference,
      },
      insights: {
        currentNetWorth: netWorth,
        historicalTrendLabel: `Historical Trend (${modelRange})`,
        historicalTrendValue: `${assetTrend.diff >= 0 ? "+" : "-"}${formatRupiah(Math.abs(assetTrend.diff))} (${assetTrend.percent.toFixed(1)}%)`,
        currentCashflow: intel.netCashflow,
        personalBaseline: personalBaselineText,
        upcomingCommitments: intel.committedAmount,
        goalTrajectory: goalTrajectoryText,
        scenarioImpact: `If expense drops Rp500K/month, retained cash changes by ${modelScenario.annualDifference >= 0 ? "+" : "-"}${formatRupiah(Math.abs(modelScenario.annualDifference))}/year.`,
      },
    };
  }, [
    assetTrend.diff,
    assetTrend.percent,
    debtBalance,
    goalTrajectoryText,
    intel,
    modelRange,
    modelScenario.adjustedMonthlyExpense,
    modelScenario.adjustedMonthlyIncome,
    modelScenario.annualDifference,
    modelScenario.monthlyDifference,
    netWorth,
    personalBaselineText,
    totalAssets,
  ]);

  const healthScore = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return 75;
    if (totalIncome > 0 && totalExpense === 0) return 100;
    if (totalIncome === 0 && totalExpense > 0) {
      if (totalExpense < 1000000) return 65;
      if (totalExpense < 5000000) return 50;
      return 35;
    }
    const ratio = totalExpense / totalIncome;
    if (ratio >= 2.0) return 20;
    if (ratio >= 1.5) return Math.max(20, Math.round(35 - (ratio - 1.5) * 30));
    if (ratio > 1.0) return Math.round(55 - (ratio - 1.0) * 40);
    if (ratio >= 0.8) return Math.round(65 + (1.0 - ratio) * 50);
    if (ratio >= 0.4) return Math.round(75 + (0.8 - ratio) * 35);
    return Math.min(100, Math.round(90 + (0.4 - ratio) * 25));
  }, [totalIncome, totalExpense]);

  // Single-pass Pre-aggregated Monthly Map for ultra-fast All-Time and Year rendering
  const monthlyAggregates = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (let i = 0; i < allTxs.length; i++) {
      const t = allTxs[i];
      if (!t.occurred_on || t.type === "transfer" || isTxCorrection(t))
        continue;
      const key = t.occurred_on.slice(0, 7);
      let entry = map.get(key);
      if (!entry) {
        entry = { income: 0, expense: 0 };
        map.set(key, entry);
      }
      const amt = Number(t.amount || 0);
      if (t.type === "income") entry.income += amt;
      else if (t.type === "expense") entry.expense += amt;
    }
    return map;
  }, [allTxs]);

  // 2. Trend bar chart data with high performance O(1) monthly lookups
  const trendData = useMemo(() => {
    if (range === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        const dStr = format(d, "yyyy-MM-dd");
        const txs = allTxs.filter((t) => t.occurred_on === dStr);
        return {
          label: format(d, "EEE"),
          income: txs
            .filter((t) => t.type === "income" && !isTxCorrection(t))
            .reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs
            .filter((t) => t.type === "expense" && !isTxCorrection(t))
            .reduce((s, t) => s + Number(t.amount || 0), 0),
        };
      });
    } else if (range === "month") {
      const targetMonthDate = subMonths(now, monthOffset);
      const currentYear = targetMonthDate.getFullYear();
      const currentMonth = targetMonthDate.getMonth();
      const weeks = [
        { label: "W1 (1-7)", startDay: 1, endDay: 7 },
        { label: "W2 (8-14)", startDay: 8, endDay: 14 },
        { label: "W3 (15-21)", startDay: 15, endDay: 21 },
        { label: "W4 (22-28)", startDay: 22, endDay: 28 },
        { label: "W5 (29+)", startDay: 29, endDay: 31 },
      ];
      return weeks.map((w) => {
        const txs = allTxs.filter((t) => {
          if (!t.occurred_on) return false;
          const [y, m, d] = t.occurred_on.split("-").map(Number);
          if (y !== currentYear || m - 1 !== currentMonth) return false;
          return d >= w.startDay && d <= w.endDay;
        });
        return {
          label: w.label,
          income: txs
            .filter((t) => t.type === "income" && !isTxCorrection(t))
            .reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs
            .filter((t) => t.type === "expense" && !isTxCorrection(t))
            .reduce((s, t) => s + Number(t.amount || 0), 0),
        };
      });
    } else if (range === "year") {
      return Array.from({ length: 12 }, (_, m) => {
        const d = new Date(selectedYear, m, 1);
        const key = format(d, "yyyy-MM");
        const agg = monthlyAggregates.get(key) || { income: 0, expense: 0 };
        return {
          label: format(d, "MMM", { locale: isIndonesian ? idLocale : undefined }),
          income: agg.income,
          expense: agg.expense,
        };
      });
    } else {
      const datedTxs = allTxs.filter((t) => !!t.occurred_on);
      if (datedTxs.length === 0) return [];

      const earliestDate = datedTxs.reduce(
        (min, tx) => (tx.occurred_on < min ? tx.occurred_on : min),
        datedTxs[0].occurred_on,
      );
      const startMonth = new Date(`${earliestDate.slice(0, 7)}-01T00:00:00`);
      const totalMonths =
        (now.getFullYear() - startMonth.getFullYear()) * 12 +
        (now.getMonth() - startMonth.getMonth()) +
        1;

      return Array.from({ length: totalMonths }, (_, i) => {
        const d = new Date(
          startMonth.getFullYear(),
          startMonth.getMonth() + i,
          1,
        );
        const key = format(d, "yyyy-MM");
        const agg = monthlyAggregates.get(key) || { income: 0, expense: 0 };
        return {
          label: totalMonths > 12 ? format(d, "MMM yy") : format(d, "MMM"),
          income: agg.income,
          expense: agg.expense,
        };
      });
    }
  }, [allTxs, range, monthOffset, selectedYear, monthlyAggregates, now, isIndonesian]);

  // 3. Cumulative Net Worth trend
  const netWorthData = useMemo(() => {
    let cumulative = 0;
    return trendData.map((d) => {
      cumulative += d.income - d.expense;
      return { label: d.label, net: cumulative };
    });
  }, [trendData]);

  // Most Active Accounts Calculation (Apple macOS Style)
  const walletUsageStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        icon: string;
        count: number;
        totalExpense: number;
        totalIncome: number;
      }
    >();

    rangeTxs.forEach((tx) => {
      if (tx.type === "transfer") return;
      const resolved = resolveTransactionWallets(tx, wallets);
      const walletName = resolved.from || "Cash";
      const amt = Number(tx.amount || 0);

      const entry = map.get(walletName) || {
        name: walletName,
        icon: getWalletIcon(walletName),
        count: 0,
        totalExpense: 0,
        totalIncome: 0,
      };

      entry.count += 1;
      if (tx.type === "expense") entry.totalExpense += amt;
      else if (tx.type === "income") entry.totalIncome += amt;

      map.set(walletName, entry);
    });

    const list = Array.from(map.values());
    if (walletFilterType === "expense") {
      return list
        .filter((w) => w.totalExpense > 0)
        .sort((a, b) => b.totalExpense - a.totalExpense);
    }
    if (walletFilterType === "income") {
      return list
        .filter((w) => w.totalIncome > 0)
        .sort((a, b) => b.totalIncome - a.totalIncome);
    }
    return list.sort(
      (a, b) =>
        b.totalExpense + b.totalIncome - (a.totalExpense + a.totalIncome),
    );
  }, [rangeTxs, wallets, walletFilterType]);

  const maxWalletVolume = useMemo(() => {
    if (walletUsageStats.length === 0) return 1;
    return Math.max(
      ...walletUsageStats.map((w) =>
        walletFilterType === "expense"
          ? w.totalExpense
          : walletFilterType === "income"
            ? w.totalIncome
            : w.totalExpense + w.totalIncome,
      ),
    );
  }, [walletUsageStats, walletFilterType]);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
    if (percent < 0.05) return null;
    const isDark =
      document.documentElement.getAttribute("data-theme") !== "light";
    return (
      <text
        x={x}
        y={y}
        fill={isDark ? "#121212" : "#FFFFFF"}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight="800"
        fontFamily="Urbanist"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // 4. Category breakdown (Detailed) with Envelope Budget metadata
  const categoryStats = useMemo(() => {
    const catMap = new Map<
      string,
      {
        name: string;
        emoji: string;
        total: number;
        count: number;
        budget_amount: number | null;
      }
    >();
    const userCatMap = new Map<
      string,
      { emoji: string; budget_amount: number | null }
    >();
    categories.forEach((c) =>
      userCatMap.set(c.name.trim().toLowerCase(), {
        emoji: c.emoji,
        budget_amount: c.budget_amount ?? null,
      }),
    );

    rangeTxs
      .filter((t) => t.type === breakdownType)
      .forEach((t) => {
        const resolved = resolveTransactionCategory(t, categories);
        const name = resolved.name;
        const meta = userCatMap.get(name.trim().toLowerCase());
        const emoji =
          resolved.emoji ||
          meta?.emoji ||
          (breakdownType === "income"
            ? "/icons/gaji.png"
            : "/icons/lainnya.png");
        const budget_amount =
          t.categories?.budget_amount ?? meta?.budget_amount ?? null;
        const amt = Number(t.amount || 0);
        const ex = catMap.get(name);
        if (ex) {
          ex.total += amt;
          ex.count++;
        } else
          catMap.set(name, {
            name,
            emoji,
            total: amt,
            count: 1,
            budget_amount,
          });
      });
    return Array.from(catMap.values()).sort((a, b) => b.total - a.total);
  }, [rangeTxs, breakdownType, categories]);

  const categorySpendMap = useMemo(() => {
    const map: Record<string, number> = {};
    rangeTxs
      .filter((t) => t.type === "expense" && !isTxCorrection(t))
      .forEach((t) => {
        if (t.category_id) {
          map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount || 0);
        }
      });
    return map;
  }, [rangeTxs]);

  // 4b. Macro Parent (Induk) breakdown
  const parentCategoryStats = useMemo(() => {
    const parentMap = new Map<
      string,
      {
        name: string;
        emoji: string;
        total: number;
        count: number;
        categoriesList: Array<{
          name: string;
          emoji: string;
          total: number;
          count: number;
        }>;
      }
    >();

    const userCatMap = new Map<
      string,
      { emoji: string; budget_amount: number | null }
    >();
    categories.forEach((c) =>
      userCatMap.set(c.name.trim().toLowerCase(), {
        emoji: c.emoji,
        budget_amount: c.budget_amount ?? null,
      }),
    );

    rangeTxs
      .filter((t) => t.type === breakdownType)
      .forEach((t) => {
        const resolved = resolveTransactionCategory(t, categories);
        const catName = resolved.name;
        const parentName = getCategoryParent(catName);
        const meta = userCatMap.get(catName.trim().toLowerCase());
        const emoji =
          resolved.emoji ||
          meta?.emoji ||
          (breakdownType === "income"
            ? "/icons/gaji.png"
            : "/icons/lainnya.png");
        const amt = Number(t.amount || 0);

        let parentEntry = parentMap.get(parentName);
        if (!parentEntry) {
          parentEntry = {
            name: parentName,
            emoji: getParentIcon(parentName),
            total: 0,
            count: 0,
            categoriesList: [],
          };
          parentMap.set(parentName, parentEntry);
        }

        parentEntry.total += amt;
        parentEntry.count++;

        let subCat = parentEntry.categoriesList.find((c) => c.name === catName);
        if (!subCat) {
          subCat = { name: catName, emoji, total: 0, count: 0 };
          parentEntry.categoriesList.push(subCat);
        }
        subCat.total += amt;
        subCat.count++;
      });

    return Array.from(parentMap.values())
      .map((p) => ({
        ...p,
        categoriesCount: p.categoriesList.length,
        categoriesList: p.categoriesList.sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [rangeTxs, breakdownType, categories]);

  const activeBreakdownData =
    groupMode === "parent" ? parentCategoryStats : categoryStats;
  const totalBreakdownAmount = activeBreakdownData.reduce(
    (s, c) => s + c.total,
    0,
  );

  // 5. Hashtag breakdown
  const hashtagStats = useMemo(() => {
    const hashMap = new Map<string, { total: number; count: number }>();
    rangeTxs.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.note) {
        const matches = t.note.match(/#\w+/g);
        if (matches) {
          matches.forEach((m) => {
            const tag = m.toLowerCase();
            const ex = hashMap.get(tag);
            if (ex) {
              ex.total += amt;
              ex.count++;
            } else hashMap.set(tag, { total: amt, count: 1 });
          });
        }
      }
    });
    return Array.from(hashMap.entries())
      .map(([tag, data]) => ({ tag, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [rangeTxs]);

  // Priority 4: Largest Category Change (MoM)
  const categoryMoMShifts = useMemo(() => {
    const prevDate = subMonths(now, monthOffset + 1);
    const start = format(startOfMonth(prevDate), "yyyy-MM-dd");
    const end = format(endOfMonth(prevDate), "yyyy-MM-dd");
    const prevTxs = allTxs.filter(
      (t) =>
        t.occurred_on &&
        t.occurred_on >= start &&
        t.occurred_on <= end &&
        t.type === breakdownType &&
        !isTxCorrection(t),
    );

    const prevMap = new Map<string, number>();
    prevTxs.forEach((t) => {
      const resolved = resolveTransactionCategory(t, categories);
      const key =
        groupMode === "parent"
          ? getCategoryParent(resolved.name)
          : resolved.name;
      prevMap.set(key, (prevMap.get(key) || 0) + Number(t.amount || 0));
    });

    const shifts: {
      name: string;
      current: number;
      prev: number;
      diff: number;
      pct: number;
    }[] = [];
    activeBreakdownData.forEach((cat) => {
      const current = cat.total;
      const prev = prevMap.get(cat.name) || 0;
      const diff = current - prev;
      const pct =
        prev > 0 ? Math.round((diff / prev) * 100) : current > 0 ? 100 : 0;
      shifts.push({ name: cat.name, current, prev, diff, pct });
    });

    const sortedByIncrease = [...shifts]
      .filter((s) => s.diff > 0)
      .sort((a, b) => b.diff - a.diff);
    const sortedByDecrease = [...shifts]
      .filter((s) => s.diff < 0)
      .sort((a, b) => a.diff - b.diff);

    return {
      biggestIncrease: sortedByIncrease[0] || null,
      biggestDecrease: sortedByDecrease[0] || null,
    };
  }, [allTxs, now, monthOffset, breakdownType, groupMode, activeBreakdownData, categories]);

  // Priority 5: Expense Frequency vs Volume Insights
  const frequencyStats = useMemo(() => {
    if (activeBreakdownData.length === 0) return null;
    const mostFrequent = [...activeBreakdownData].sort(
      (a, b) => b.count - a.count,
    )[0];
    const largestTicket = [...activeBreakdownData].sort(
      (a, b) => b.total / Math.max(1, b.count) - a.total / Math.max(1, a.count),
    )[0];
    return { mostFrequent, largestTicket };
  }, [activeBreakdownData]);

  // Priority 6: Average Transaction Size & MoM Comparison
  const avgTransactionStats = useMemo(() => {
    const expenseTxs = rangeTxs.filter(
      (t) => t.type === "expense" && !isTxCorrection(t),
    );
    const avgExpense =
      expenseTxs.length > 0 ? Math.round(totalExpense / expenseTxs.length) : 0;

    const prevDate = subMonths(now, monthOffset + 1);
    const start = format(startOfMonth(prevDate), "yyyy-MM-dd");
    const end = format(endOfMonth(prevDate), "yyyy-MM-dd");
    const prevExpenseTxs = allTxs.filter(
      (t) =>
        t.occurred_on &&
        t.occurred_on >= start &&
        t.occurred_on <= end &&
        t.type === "expense" &&
        !isTxCorrection(t),
    );
    const prevAvgExpense =
      prevExpenseTxs.length > 0
        ? Math.round(prevExpense / prevExpenseTxs.length)
        : 0;
    const avgDelta = getDelta(avgExpense, prevAvgExpense);

    return {
      avgExpense,
      avgDelta,
      count: expenseTxs.length,
    };
  }, [rangeTxs, totalExpense, allTxs, now, monthOffset, prevExpense]);

  // Priority 10: Calendar Spending Heatmap Data
  const calendarSpendingHeatmap = useMemo(() => {
    const targetMonth = subMonths(now, monthOffset);
    const start = startOfMonth(targetMonth);
    const end = endOfMonth(targetMonth);
    const days = eachDayOfInterval({ start, end });

    const dailySpendMap = new Map<string, number>();
    days.forEach((d) => dailySpendMap.set(format(d, "yyyy-MM-dd"), 0));

    allTxs.forEach((t) => {
      if (t.type !== "expense" || !t.occurred_on || isTxCorrection(t)) return;
      if (dailySpendMap.has(t.occurred_on)) {
        dailySpendMap.set(
          t.occurred_on,
          (dailySpendMap.get(t.occurred_on) || 0) + Number(t.amount || 0),
        );
      }
    });

    const amounts = Array.from(dailySpendMap.values());
    const maxSpend = Math.max(1, ...amounts);
    const pad = getDay(start);

    return {
      days,
      pad,
      dailySpendMap,
      maxSpend,
      targetMonth,
    };
  }, [allTxs, now, monthOffset]);

  const rangeTitle = useMemo(() => {
    if (range === "week") return isIndonesian ? "Minggu Ini" : "This Week";
    if (range === "month") {
      if (monthOffset === 0) {
        return isIndonesian ? "Bulan Ini" : "This Month";
      }
      return format(subMonths(now, monthOffset), "MMM yyyy", {
        locale: isIndonesian ? idLocale : undefined,
      });
    }
    if (range === "year") {
      if (selectedYear === now.getFullYear()) {
        return isIndonesian ? "Tahun Ini" : "This Year";
      }
      return isIndonesian ? `Tahun ${selectedYear}` : `Year ${selectedYear}`;
    }
    return isIndonesian ? "Semua Waktu" : "All Time";
  }, [range, monthOffset, selectedYear, now, isIndonesian]);

  const renderStatisticsCard = (cardId: string, _size: WidgetSize) => {
    switch (cardId) {
      case "health_score":
        return (
          <section className="card-contrast-hero p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Financial Health
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {rangeTitle} performance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHealthDiagnosticOpen(true);
                    triggerHaptic("light");
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)",
                  }}
                  title="Executive Health Diagnostic"
                >
                  <Info size={13} />
                </button>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {healthScore >= 85
                    ? "Excellent"
                    : healthScore >= 70
                      ? "Good"
                      : healthScore >= 50
                        ? "Moderate"
                        : healthScore >= 16
                          ? "Deficit"
                          : "Critical"}
                </span>
              </div>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span
                className="amount text-[36px] font-bold leading-none"
                style={{ color: "var(--text-primary)" }}
              >
                {healthScore}
              </span>
              <span
                className="text-[12px] font-medium pb-1.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                / 100 pts
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{
                background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${healthScore}%`, background: "var(--text-primary)" }}
              />
            </div>
          </section>
        );

      case "monte_carlo":
        return (
          <MonteCarloCard
            netWorth={netWorth}
            monthlySavings={Math.max(1000000, totalIncome - totalExpense)}
            hideBalance={hideBalance}
            onOpenSimulator={() => {
              setMonteCarloOpen(true);
              triggerHaptic("light");
            }}
          />
        );

      case "fire_planner":
        return (
          <FirePlannerCard
            netWorth={netWorth}
            monthlyBurnRate={intel.totalExpense || totalExpense || 3500000}
            monthlySavings={Math.max(1000000, totalIncome - totalExpense)}
            hideBalance={hideBalance}
            onOpenPlanner={() => {
              setFirePlannerOpen(true);
              triggerHaptic("light");
            }}
          />
        );

      case "cashflow_outlook":
        return (
          <CashflowOutlookCard
            defaultForecast={intel.cashflowFloor}
            getCashflowHorizon={intel.getCashflowHorizon}
            hideBalance={hideBalance}
          />
        );

      case "liquidity_horizon":
        return (
          <LiquidityHorizonCard
            liquidityHorizon={intel.liquidityHorizon}
            hideBalance={hideBalance}
          />
        );

      case "zero_based_envelopes":
        return (
          <ZeroBasedEnvelopesCard
            monthlyIncome={intel.totalIncome}
            categories={categories}
            bills={bills}
            goals={goals}
            categorySpendMap={categorySpendMap}
            hideBalance={hideBalance}
          />
        );

      case "spending_patterns":
        if (range !== "month") return null;
        return <SpendingPatternsSection patterns={intel.behavioralPatterns} />;

      case "spending_density_heatmap":
        return (
          <div className="p-5 rounded-[24px] glass-surface">
            <div
              className="flex justify-between items-center cursor-pointer select-none"
              onClick={() => {
                setHeatmapExpanded((v) => !v);
                triggerHaptic("light");
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: "var(--text-tertiary)" }} />
                  <h2
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Spending Density & Heatmap
                  </h2>
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Daily expense cluster · {rangeTitle}
                </p>
              </div>

              <button
                type="button"
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer active:scale-90 shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
                aria-label={heatmapExpanded ? "Lipat" : "Bentangkan"}
              >
                <motion.div
                  animate={{ rotate: heatmapExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <ChevronDown size={14} strokeWidth={1.75} />
                </motion.div>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {heatmapExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden pt-3"
                >
                  <div
                    className="p-3 rounded-2xl"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                      {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                        <div
                          key={i}
                          className="text-[9px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {w}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: calendarSpendingHeatmap.pad }).map((_, i) => (
                        <div key={`pad-${i}`} />
                      ))}
                      {calendarSpendingHeatmap.days.map((d) => {
                        const dStr = format(d, "yyyy-MM-dd");
                        const spent =
                          calendarSpendingHeatmap.dailySpendMap.get(dStr) || 0;
                        const intensity =
                          calendarSpendingHeatmap.maxSpend > 0
                            ? spent / calendarSpendingHeatmap.maxSpend
                            : 0;
                        const isT = isToday(d);

                        let bg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
                        let textColor = "var(--text-tertiary)";
                        if (spent > 0) {
                          if (isDark) {
                            if (intensity > 0.6) {
                              bg = "#FFFFFF";
                              textColor = "#0A0A0B";
                            } else if (intensity > 0.3) {
                              bg = "rgba(255,255,255,0.45)";
                              textColor = "#FFFFFF";
                            } else {
                              bg = "rgba(255,255,255,0.18)";
                              textColor = "rgba(255,255,255,0.9)";
                            }
                          } else {
                            if (intensity > 0.6) {
                              bg = "#18181B";
                              textColor = "#FFFFFF";
                            } else if (intensity > 0.3) {
                              bg = "rgba(24,24,27,0.5)";
                              textColor = "#FFFFFF";
                            } else {
                              bg = "rgba(24,24,27,0.18)";
                              textColor = "#18181B";
                            }
                          }
                        }

                        return (
                          <div
                            key={dStr}
                            className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all"
                            style={{
                              background: bg,
                              color: textColor,
                              border: isT
                                ? "1px solid var(--accent)"
                                : "1px solid transparent",
                            }}
                            title={`${format(d, "dd MMM")}: ${spent > 0 ? formatRupiah(spent) : "No spend"}`}
                          >
                            <span className="text-[10px] font-semibold">
                              {d.getDate()}
                            </span>
                            {spent > 0 && (
                              <span className="text-[8px] font-semibold opacity-80 scale-90 leading-none mt-0.5">
                                {spent >= 1000000
                                  ? (spent / 1000000).toFixed(0) + "M"
                                  : spent >= 1000
                                    ? (spent / 1000).toFixed(0) + "K"
                                    : spent}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "debt_payoff":
        return <DebtPayoffSimulatorCard hideBalance={hideBalance} />;

      case "what_if_simulator":
        return (
          <WhatIfSimulatorCard
            monthlyIncome={intel.totalIncome}
            monthlyExpense={intel.totalExpense}
            hideBalance={hideBalance}
          />
        );

      case "personal_financial_model":
        return (
          <PersonalFinancialModelCard
            hideBalance={hideBalance}
            actual={personalFinancialModel.actual}
            baseline={personalFinancialModel.baseline}
            scenario={personalFinancialModel.scenario}
            insights={personalFinancialModel.insights}
            onOpenDetails={() => {
              setPersonalModelOpen(true);
              triggerHaptic("light");
            }}
          />
        );

      // --- REPORT TAB CARDS ---
      case "financial_report":
        return (
          <FinancialReportSection
            wallets={wallets}
            transactions={rangeTxs}
            allTransactions={allTxs}
            categories={categories}
            startDate={currentPeriodBounds.start}
            endDate={currentPeriodBounds.end}
            periodLabel={currentPeriodLabel}
          />
        );

      case "monthly_review":
        if (range !== "month" || !intel.monthlyReview) return null;
        return (
          <MonthlyReviewSection
            review={intel.monthlyReview}
            onCategoryClick={(catName) => {
              const found = intel.categoryShifts.find(
                (s) => s.name.toLowerCase() === catName.toLowerCase(),
              );
              if (found) {
                setSelectedCategoryShift(found);
                triggerHaptic("light");
              }
            }}
          />
        );

      case "personal_baseline":
        return (
          <PersonalBaselineSection
            baselines={intel.personalBaselines}
            onCategoryClick={(catName) => {
              const found = intel.categoryShifts.find(
                (s) => s.name.toLowerCase() === catName.toLowerCase(),
              );
              if (found) {
                setSelectedCategoryShift(found);
                triggerHaptic("light");
              }
            }}
          />
        );

      case "expense_structure":
        if (range !== "month") return null;
        return (
          <ExpenseStructureCard expenseStructure={intel.expenseStructure} />
        );

      // --- CASHFLOW TAB CARDS ---
      case "cashflow_summary":
        return (
          <div
            className="p-5 rounded-[24px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Ringkasan Periode" : "Period Summary"} · {rangeTitle}
              </p>
              {range === "month" && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {isIndonesian ? "vs bln lalu" : "vs prev month"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: isIndonesian ? "Total Masuk" : "Total In",
                  value: totalIncome,
                  delta: range === "month" ? incomeDelta : null,
                  isExpense: false,
                },
                {
                  label: isIndonesian ? "Total Keluar" : "Total Out",
                  value: totalExpense,
                  delta: range === "month" ? expenseDelta : null,
                  isExpense: true,
                },
                {
                  label: isIndonesian ? "Bersih" : "Net",
                  value: totalIncome - totalExpense,
                  delta: range === "month" ? netDelta : null,
                  isNet: true,
                },
              ].map(({ label, value, delta, isNet }) => {
                const abs = Math.abs(value);
                let formatted = "0";
                if (abs >= 1000000) {
                  formatted = (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
                } else if (abs >= 1000) {
                  formatted = (abs / 1000).toFixed(0) + "K";
                } else {
                  formatted = abs.toLocaleString("id-ID");
                }
                const sign = isNet ? (value < 0 ? "-" : value > 0 ? "+" : "") : "";
                return (
                  <div
                    key={label}
                    className="text-center p-2 rounded-2xl flex flex-col justify-between"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="amount text-[14px] leading-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {sign}
                        {formatted}
                      </p>
                    </div>
                    {delta && (
                      <div className="mt-1.5 pt-1 border-t border-[var(--glass-border)] flex items-center justify-center gap-0.5">
                        <span
                          className="text-[10px] font-medium flex items-center"
                          style={{
                            color: "var(--text-secondary)",
                          }}
                        >
                          {delta.isUp ? "↑" : "↓"} {delta.pct}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "category_breakdown":
        return (
          <CategoryBreakdownCard
            breakdownType={breakdownType}
            setBreakdownType={setBreakdownType}
            categoryStats={categoryStats}
            activeBreakdownData={activeBreakdownData}
            groupMode={groupMode}
            setGroupMode={setGroupMode}
            rangeTitle={rangeTitle}
            categoryBreakdownExpanded={categoryBreakdownExpanded}
            setCategoryBreakdownExpanded={setCategoryBreakdownExpanded}
            totalBreakdownAmount={totalBreakdownAmount}
            colors={colors}
            renderCustomizedLabel={renderCustomizedLabel}
            GlassTooltip={GlassTooltip}
            range={range}
            intel={intel}
            setSelectedCategoryShift={setSelectedCategoryShift}
            categoryMoMShifts={categoryMoMShifts}
            frequencyStats={frequencyStats}
            isDark={isDark}
            isIndonesian={isIndonesian}
            setAllDetailsOpen={setAllDetailsOpen}
          />
        );

      case "cashflow_sankey":
        return (
          <CashflowSankeySection
            transactions={rangeTxs}
            categories={categories}
            wallets={wallets}
            periodLabel={rangeTitle}
          />
        );

      case "net_capital_trajectory":
        return (
          <NetCapitalTrajectoryCard
            netWorth={netWorth}
            hideBalance={hideBalance}
            rangeTitle={rangeTitle}
            netWorthData={netWorthData}
            netTrajectoryExpanded={netTrajectoryExpanded}
            setNetTrajectoryExpanded={setNetTrajectoryExpanded}
            colors={colors}
            isDark={isDark}
            isIndonesian={isIndonesian}
            GlassTooltip={GlassTooltip}
          />
        );

      case "inflow_outflow_trend":
        return (
          <InflowOutflowTrendCard
            rangeTitle={rangeTitle}
            trendData={trendData}
            range={range}
            longitudinal={longitudinal}
            inflowOutflowExpanded={inflowOutflowExpanded}
            setInflowOutflowExpanded={setInflowOutflowExpanded}
            colors={colors}
            isDark={isDark}
            isIndonesian={isIndonesian}
            GlassTooltip={GlassTooltip}
          />
        );

      case "cashflow_velocity":
        return (
          <CashflowVelocityCard
            savingsRate={savingsRate}
            SavingsRing={SavingsRing}
            avgTransactionStats={avgTransactionStats}
            range={range}
            totalExpense={totalExpense}
            walletUsageStats={walletUsageStats}
            rangeTitle={rangeTitle}
            walletFilterType={walletFilterType}
            setWalletFilterType={setWalletFilterType}
            maxWalletVolume={maxWalletVolume}
            hashtagStats={hashtagStats}
            isDark={isDark}
            isIndonesian={isIndonesian}
          />
        );

      // --- ASSETS TAB CARDS ---
      case "asset_analytics":
        return (
          <AssetAnalyticsSection
            wallets={wallets}
            monthlyBurnRate={intel.totalExpense || 3500000}
            hideBalance={hideBalance}
            onOpenValuation={() => setAssetValuationOpen(true)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-5 py-6 space-y-5 pb-36 max-w-full overflow-x-clip" style={{ minHeight: "100dvh" }}>
      {/* Header with Compact Timeframe Selector */}
      <div className="relative z-20 flex justify-between items-center">
        <div>
          <h1
            className="text-[22px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Statistik" : "Analytics"}
          </h1>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Kinerja & Distribusi" : "Performance & Distribution"}
          </p>
        </div>

        {/* Action Controls: Customize Button (Icon Only) + Compact Timeframe Dropdown Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCustomizeStatsOpen(true);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all select-none cursor-pointer shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-card)",
            }}
            aria-label={isIndonesian ? "Kustomisasi Analitik" : "Customize Analytics"}
            title={isIndonesian ? "Kustomisasi Analitik" : "Customize Analytics"}
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} />
          </button>

          {/* Compact Timeframe Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTimeframeMenuOpen((o) => !o);
                triggerHaptic("light");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight active:scale-95 transition-all select-none"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span className="truncate max-w-[120px]">{rangeTitle}</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${timeframeMenuOpen ? "rotate-180" : ""}`}
              style={{ color: "var(--text-tertiary)" }}
            />
          </button>

          {/* Luxury Apple Glass Timeframe Popover Menu */}
          {timeframeMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
                onClick={() => setTimeframeMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 w-60 p-2 rounded-2xl z-50 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                style={{
                  background: isDark ? "#121214" : "#FFFFFF",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
                }}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--glass-border)] mb-1">
                  {isIndonesian ? "Rentang Waktu" : "Timeframe"}
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setRange("week");
                      setTimeframeMenuOpen(false);
                      triggerHaptic("light");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                    style={{
                      color: range === "week" ? "var(--accent)" : "var(--text-primary)",
                      background: range === "week" ? "var(--glass-fill)" : "transparent",
                    }}
                  >
                    <span>{isIndonesian ? "Minggu Ini" : "This Week"}</span>
                    {range === "week" && <Check size={14} />}
                  </button>

                  <button
                    onClick={() => {
                      setRange("month");
                      setMonthOffset(0);
                      setTimeframeMenuOpen(false);
                      triggerHaptic("light");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                    style={{
                      color: range === "month" && monthOffset === 0 ? "var(--accent)" : "var(--text-primary)",
                      background: range === "month" && monthOffset === 0 ? "var(--glass-fill)" : "transparent",
                    }}
                  >
                    <span>{isIndonesian ? "Bulan Ini" : "This Month"}</span>
                    {range === "month" && monthOffset === 0 && <Check size={14} />}
                  </button>

                  <button
                    onClick={() => {
                      setRange("year");
                      setSelectedYear(now.getFullYear());
                      setTimeframeMenuOpen(false);
                      triggerHaptic("light");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                    style={{
                      color: range === "year" && selectedYear === now.getFullYear() ? "var(--accent)" : "var(--text-primary)",
                      background: range === "year" && selectedYear === now.getFullYear() ? "var(--glass-fill)" : "transparent",
                    }}
                  >
                    <span>{isIndonesian ? "Tahun Ini" : "This Year"}</span>
                    {range === "year" && selectedYear === now.getFullYear() && <Check size={14} />}
                  </button>

                  <button
                    onClick={() => {
                      setRange("all");
                      setTimeframeMenuOpen(false);
                      triggerHaptic("light");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                    style={{
                      color: range === "all" ? "var(--accent)" : "var(--text-primary)",
                      background: range === "all" ? "var(--glass-fill)" : "transparent",
                    }}
                  >
                    <span>{isIndonesian ? "Semua Waktu" : "All Time"}</span>
                    {range === "all" && <Check size={14} />}
                  </button>
                </div>

                {/* Specific Month Stepper */}
                <div className="mt-1 pt-1.5 border-t border-[var(--glass-border)]">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                    <span>{isIndonesian ? "Bulan Tertentu" : "Specific Month"}</span>
                    {range === "month" && monthOffset > 0 && (
                      <span className="text-[9px] font-medium text-[var(--accent)]">
                        {isIndonesian ? "Aktif" : "Active"}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center justify-between p-1 rounded-xl mt-1"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRange("month");
                        setMonthOffset((o) => o + 1);
                        triggerHaptic("light");
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}
                      title="Previous Month"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span
                      onClick={() => {
                        setRange("month");
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="text-[11px] font-semibold cursor-pointer hover:underline text-center"
                      style={{
                        color: range === "month" ? "var(--accent)" : "var(--text-primary)",
                      }}
                    >
                      {format(subMonths(now, monthOffset), "MMM yyyy", {
                        locale: isIndonesian ? idLocale : undefined,
                      })}
                    </span>
                    <button
                      disabled={monthOffset === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRange("month");
                        setMonthOffset((o) => Math.max(0, o - 1));
                        triggerHaptic("light");
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20 cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}
                      title="Next Month"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Specific Year Stepper & Available Years */}
                <div className="mt-1 pt-1.5 border-t border-[var(--glass-border)]">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                    <span>{isIndonesian ? "Pilih Tahun" : "Select Year"}</span>
                    {range === "year" && selectedYear !== now.getFullYear() && (
                      <span className="text-[9px] font-medium text-[var(--accent)]">
                        {isIndonesian ? "Aktif" : "Active"}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center justify-between p-1 rounded-xl mt-1"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRange("year");
                        setSelectedYear((y) => {
                          const prevYears = availableYears.filter((ay) => ay < y);
                          return prevYears.length > 0 ? Math.max(...prevYears) : y - 1;
                        });
                        triggerHaptic("light");
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}
                      title={isIndonesian ? "Tahun Sebelumnya" : "Previous Year"}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span
                      onClick={() => {
                        setRange("year");
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="text-[11px] font-semibold cursor-pointer hover:underline text-center"
                      style={{
                        color: range === "year" ? "var(--accent)" : "var(--text-primary)",
                      }}
                    >
                      {isIndonesian ? `Tahun ${selectedYear}` : `Year ${selectedYear}`}
                    </span>
                    <button
                      disabled={selectedYear >= now.getFullYear()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRange("year");
                        setSelectedYear((y) => {
                          const nextYears = availableYears.filter((ay) => ay > y);
                          return nextYears.length > 0 ? Math.min(...nextYears) : Math.min(now.getFullYear(), y + 1);
                        });
                        triggerHaptic("light");
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20 cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}
                      title={isIndonesian ? "Tahun Berikutnya" : "Next Year"}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Available Year Chips */}
                  {availableYears.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
                      {availableYears.map((yr) => {
                        const isSelected = range === "year" && selectedYear === yr;
                        return (
                          <button
                            key={yr}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRange("year");
                              setSelectedYear(yr);
                              setTimeframeMenuOpen(false);
                              triggerHaptic("light");
                            }}
                            className="flex-1 min-w-[50px] py-1 px-2 rounded-lg text-[10.5px] font-semibold text-center transition-all cursor-pointer select-none"
                            style={{
                              background: isSelected
                                ? "var(--text-primary)"
                                : "var(--glass-fill)",
                              color: isSelected
                                ? (isDark ? "#000000" : "#FFFFFF")
                                : "var(--text-secondary)",
                              border: isSelected
                                ? "1px solid transparent"
                                : "1px solid var(--glass-border)",
                              boxShadow: isSelected
                                ? "0 1px 4px var(--shadow-strength)"
                                : "none",
                            }}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* 4-Tab Luxury Apple Glass Segmented Control Bar */}
      <div
        className="flex items-center p-1 rounded-2xl border border-[var(--glass-border)]"
        style={{
          background: "var(--glass-fill)",
        }}
      >
        {analyticsTabs.map((t) => {
          const isSelected = analyticsSubTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setAnalyticsSubTab(t.key);
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 active:scale-95 cursor-pointer select-none text-center truncate"
              style={{
                background: isSelected ? "var(--bg-elevated)" : "transparent",
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
                boxShadow: isSelected
                  ? "0 1px 4px var(--shadow-strength)"
                  : "none",
                border: isSelected
                  ? "1px solid var(--glass-border)"
                  : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Fallback Empty State when all cards/tabs are hidden */}
      {analyticsTabs.length === 0 && (
        <div
          className="p-8 rounded-[28px] text-center space-y-3"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <SlidersHorizontal size={20} style={{ color: "var(--text-tertiary)" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              {isIndonesian ? "Semua Kartu Dinonaktifkan" : "All Analytics Cards Hidden"}
            </h3>
            <p className="text-[12px] text-[var(--text-tertiary)] max-w-xs mx-auto mt-1">
              {isIndonesian
                ? "Aktifkan kembali kartu analitik melalui menu kustomisasi untuk melihat data finansial Anda."
                : "Re-enable analytics cards from the customization menu to view your financial telemetry."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomizeStatsOpen(true)}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold text-[var(--bg-base)] bg-[var(--text-primary)] cursor-pointer active:scale-95 transition-transform"
          >
            {isIndonesian ? "Buka Kustomisasi" : "Customize Analytics"}
          </button>
        </div>
      )}

      {/* TAB 1: REPORT */}
      {analyticsSubTab === "report" && (
        <>
          {/* Financial Wrapped Trigger Banner (Only shown on 'month' and 'year' ranges) */}
          {(range === "month" || range === "year") && (
            <section
              onClick={() => {
                setWrappedOpen(true);
                triggerHaptic("medium");
              }}
              className="p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform select-none relative overflow-hidden"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className="text-[13px] font-semibold tracking-tight truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Financial Wrapped
                    </p>
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        background: "var(--glass-fill-strong)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      {range === "year"
                        ? isIndonesian
                          ? selectedYear === now.getFullYear()
                            ? "Kilas Balik Tahun Ini"
                            : `Kilas Balik ${selectedYear}`
                          : selectedYear === now.getFullYear()
                            ? "Year in Review"
                            : `${selectedYear} Wrapped`
                        : isIndonesian ? "Rekap Bulanan" : "Monthly Recap"}
                    </span>
                  </div>
                  <p
                    className="text-[11px] font-medium truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Rekap finansial interaktif & arketipe ${range === "year" ? selectedYear : format(activeMonthDate, "MMMM yyyy", { locale: idLocale })}`
                      : `Interactive financial recap & archetype for ${range === "year" ? selectedYear : format(activeMonthDate, "MMMM yyyy")}`}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              />
            </section>
          )}

          <ReorderableWidgetGrid
            cards={visibleReportCards}
            isEditMode={isStatsEditMode}
            onReorder={reorderStatsCards}
            onEnterEditMode={() => setIsStatsEditMode(true)}
            onCycleSize={cycleStatsCardSize}
            onHide={toggleStatsCardVisibility}
            renderCard={(card) => renderStatisticsCard(card.id, card.size)}
          />
        </>
      )}

      {/* TAB 2: INTELLIGENCE */}
      {analyticsSubTab === "intelligence" && (
        <ReorderableWidgetGrid
          cards={visibleIntelligenceCards}
          isEditMode={isStatsEditMode}
          onReorder={reorderStatsCards}
          onEnterEditMode={() => setIsStatsEditMode(true)}
          onCycleSize={cycleStatsCardSize}
          onHide={toggleStatsCardVisibility}
          renderCard={(card) => renderStatisticsCard(card.id, card.size)}
        />
      )}

      {/* TAB 3: CASHFLOW */}
      {analyticsSubTab === "cashflow" && (
        <ReorderableWidgetGrid
          cards={visibleCashflowCards}
          isEditMode={isStatsEditMode}
          onReorder={reorderStatsCards}
          onEnterEditMode={() => setIsStatsEditMode(true)}
          onCycleSize={cycleStatsCardSize}
          onHide={toggleStatsCardVisibility}
          renderCard={(card) => renderStatisticsCard(card.id, card.size)}
        />
      )}

      {/* TAB 4: NET WORTH (ASSETS) */}
      {analyticsSubTab === "assets" && (
        <ReorderableWidgetGrid
          cards={visibleAssetCards}
          isEditMode={isStatsEditMode}
          onReorder={reorderStatsCards}
          onEnterEditMode={() => setIsStatsEditMode(true)}
          onCycleSize={cycleStatsCardSize}
          onHide={toggleStatsCardVisibility}
          renderCard={(card) => renderStatisticsCard(card.id, card.size)}
        />
      )}

      {/* Comprehensive Category & Parent Breakdown BottomSheet (Phase II Relayout) */}
      <BottomSheet
        isOpen={allDetailsOpen}
        onClose={() => setAllDetailsOpen(false)}
      >
        <div className="p-5 pb-20 space-y-3.5 safe-area-bottom">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3
                className="font-semibold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                {breakdownType === "expense"
                  ? "Expense Breakdown Details"
                  : "Income Breakdown Details"}
              </h3>
              <p
                className="text-[12px] font-medium mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {groupMode === "parent"
                  ? parentCategoryStats.length
                  : categoryStats.length}{" "}
                {groupMode === "parent" ? "parent groups" : "categories"} ·
                Total {formatRupiah(totalBreakdownAmount)}
              </p>
            </div>
          </div>

          {/* Group Mode Toggle Inside BottomSheet */}
          <div
            className="flex items-center gap-1.5 p-1 rounded-xl w-fit"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              onClick={() => {
                setGroupMode("category");
                triggerHaptic("light");
              }}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background:
                  groupMode === "category"
                    ? "var(--glass-fill-strong)"
                    : "transparent",
                color:
                  groupMode === "category"
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              By Category
            </button>
            <button
              onClick={() => {
                setGroupMode("parent");
                triggerHaptic("light");
              }}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
              style={{
                background:
                  groupMode === "parent"
                    ? "var(--glass-fill-strong)"
                    : "transparent",
                color:
                  groupMode === "parent"
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              <Layers size={11} />
              By Parent (Induk)
            </button>
          </div>

          {/* 2-Column Modern Compact Card Grid */}
          <div className="grid grid-cols-2 gap-2.5 max-h-[64dvh] overflow-y-auto pb-12 pr-0.5">
            {groupMode === "category"
              ? categoryStats.map((cat, i) => {
                  const pct =
                    totalBreakdownAmount > 0
                      ? ((cat.total / totalBreakdownAmount) * 100).toFixed(1)
                      : "0.0";
                  const barColor = colors.donut[i % colors.donut.length];
                  const shift = intel.categoryShifts.find(
                    (s) => s.name.toLowerCase() === cat.name.toLowerCase(),
                  );

                  return (
                    <div
                      key={cat.name}
                      onClick={() => {
                        if (shift) {
                          setSelectedCategoryShift(shift);
                          triggerHaptic("light");
                        }
                      }}
                      className="p-3 rounded-2xl flex flex-col justify-between cursor-pointer active:scale-97 transition-all select-none"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        minHeight: "105px",
                      }}
                    >
                      {/* Top Row: Icon + Name + Percentage */}
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: "var(--glass-fill)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                          </div>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full amount shrink-0"
                            style={{
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <p
                          className="text-[12px] font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                          title={cat.name}
                        >
                          {cat.name}
                        </p>
                      </div>

                      {/* Bottom Row: Amount + Sub-detail + Progress */}
                      <div className="pt-2">
                        <p
                          className="amount text-[13px] truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(cat.total)}
                        </p>
                        <div
                          className="flex items-center justify-between text-[10px] mt-0.5 mb-1.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <span>{cat.count} txs</span>
                          {shift && (
                            <span
                              style={{
                                color: shift.isIncrease
                                  ? "var(--text-primary)"
                                  : "var(--text-secondary)",
                              }}
                            >
                              {shift.isIncrease ? "↑" : "↓"}
                              {shift.pctChange}%
                            </span>
                          )}
                        </div>
                        <div
                          className="w-full h-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              : parentCategoryStats.map((parent, i) => {
                  const pct =
                    totalBreakdownAmount > 0
                      ? ((parent.total / totalBreakdownAmount) * 100).toFixed(1)
                      : "0.0";
                  const barColor = colors.donut[i % colors.donut.length];

                  return (
                    <div
                      key={parent.name}
                      className="p-3 rounded-2xl flex flex-col justify-between select-none"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        minHeight: "105px",
                      }}
                    >
                      {/* Top Row: Icon + Name + Percentage */}
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: "var(--glass-fill)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            <IconRenderer icon={parent.emoji} size="w-4 h-4" />
                          </div>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full amount shrink-0"
                            style={{
                              background: "rgba(255, 255, 255, 0.08)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <p
                          className="text-[12px] font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                          title={parent.name}
                        >
                          {parent.name}
                        </p>
                      </div>

                      {/* Bottom Row: Amount + Sub-detail + Progress */}
                      <div className="pt-2">
                        <p
                          className="amount text-[13px] truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(parent.total)}
                        </p>
                        <div
                          className="flex items-center justify-between text-[10px] mt-0.5 mb-1.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <span>{parent.categoriesCount} categories</span>
                          <span>{parent.count} txs</span>
                        </div>
                        <div
                          className="w-full h-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </BottomSheet>

      <Suspense fallback={null}>
        <CategoryDrillDownSheet
          isOpen={!!selectedCategoryShift}
          onClose={() => setSelectedCategoryShift(null)}
          shift={selectedCategoryShift}
        />

        <PersonalFinancialModelSheet
          isOpen={personalModelOpen}
          onClose={() => setPersonalModelOpen(false)}
          hideBalance={hideBalance}
          actual={personalFinancialModel.actual}
          baseline={personalFinancialModel.baseline}
          scenario={personalFinancialModel.scenario}
          insights={personalFinancialModel.insights}
        />

        <FinancialHealthDiagnosticModal
          isOpen={healthDiagnosticOpen}
          onClose={() => setHealthDiagnosticOpen(false)}
          healthScore={healthScore}
          savingsRate={savingsRate}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          rangeTitle={rangeTitle}
          baselines={range === "month" ? intel.personalBaselines : undefined}
          categoryShifts={range === "month" ? intel.categoryShifts : []}
        />

        <FinancialWrappedModal
          isOpen={wrappedOpen}
          onClose={() => setWrappedOpen(false)}
          transactions={allTxs}
          categories={categories}
          mode={range === "year" ? "year" : "month"}
          targetDate={range === "year" ? new Date(selectedYear, 0, 1) : activeMonthDate}
        />

        <AssetValuationSheet
          isOpen={assetValuationOpen}
          onClose={() => setAssetValuationOpen(false)}
        />

        <MonteCarloSimulatorSheet
          isOpen={monteCarloOpen}
          onClose={() => setMonteCarloOpen(false)}
          initialNetWorth={netWorth}
          defaultMonthlySavings={Math.max(1000000, totalIncome - totalExpense)}
          defaultMonthlyBurnRate={intel.totalExpense || totalExpense || 3500000}
          hideBalance={hideBalance}
        />

        <FirePlannerSheet
          isOpen={firePlannerOpen}
          onClose={() => setFirePlannerOpen(false)}
          initialNetWorth={netWorth}
          defaultMonthlySavings={Math.max(1000000, totalIncome - totalExpense)}
          defaultMonthlyBurnRate={intel.totalExpense || totalExpense || 3500000}
          hideBalance={hideBalance}
        />
      </Suspense>

      {/* Floating iOS Springboard Customization Pill for Intelligence Tab */}
      {isStatsEditMode && (
        <WidgetCustomizationBar
          isEditMode={isStatsEditMode}
          onDone={() => setIsStatsEditMode(false)}
          onReset={resetStatsLayout}
          hiddenCards={hiddenStatsCards}
          onUnhideCard={toggleStatsCardVisibility}
        />
      )}

      {/* Intelligence Cards Customization Modal */}
      <CustomizeStatisticsModal
        isOpen={customizeStatsOpen}
        onClose={() => setCustomizeStatsOpen(false)}
        widgets={statsWidgets}
        onToggleVisibility={toggleStatsCardVisibility}
        onReset={resetStatsLayout}
        onApplyPreset={applyStatsPreset}
        onEnterGridEdit={() => setIsStatsEditMode(true)}
        activePresetKey={activeStatsPresetKey}
        onSelectPresetKey={setActiveStatsPresetKey}
      />
    </div>
  );
}
