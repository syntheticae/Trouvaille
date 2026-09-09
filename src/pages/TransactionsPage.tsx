import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import { triggerHaptic } from "../lib/haptics";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  X,
  Calendar,
  ChevronDown,
  Wallet,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  useAllTransactions,
  useDeleteTransaction,
} from "../hooks/useTransactions";
import { useWallets, resolveTransactionWallets } from "../hooks/useWallets";
import { useCategories } from "../hooks/useCategories";
import { useToast } from "../contexts/ToastContext";
import { TransactionSheet } from "../components/transactions/TransactionSheet";
import { BottomSheet } from "../components/ui/BottomSheet";
import type { Transaction } from "../lib/types";
import { formatRupiah, getDateLabel } from "../lib/utils";
import { IconRenderer } from "../components/ui/IconRenderer";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  parse,
  parseISO,
  eachDayOfInterval,
} from "date-fns";
import { GroupedVirtuoso } from "react-virtuoso";
import { useDeferredRender } from "../hooks/useDeferredRender";
import { TransactionItem } from "../components/transactions/TransactionItem";
import { useUnusualSpending } from "../hooks/useUnusualSpending";
import { isCorrectionTx } from "../lib/financialMath";

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
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}
      >
        {formatRupiah(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
};

type FilterType = "all" | "expense" | "income" | "transfer" | "adjustment";
type TimeRangeType =
  | "this_month"
  | "last_month"
  | "last_30"
  | "custom_month"
  | "custom_range"
  | "all";

type ChartPoint = {
  dateStr: string;
  label: string;
  income: number;
  expense: number;
  transfer: number;
  adjustment: number;
  activeValue: number;
};

function summarizeTransactionsForChart(
  txs: Transaction[],
  filter: FilterType,
  isTxCorrection: (tx: Transaction) => boolean,
) {
  let income = 0;
  let expense = 0;
  let transfer = 0;
  let adjustment = 0;

  txs.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.type === "income" && !isTxCorrection(t)) income += amt;
    else if (t.type === "expense" && !isTxCorrection(t)) expense += amt;
    else if (t.type === "transfer") transfer += amt;
    else if (isTxCorrection(t)) adjustment += amt;
  });

  let activeValue = expense + income + transfer + adjustment;
  if (filter === "income") activeValue = income;
  else if (filter === "expense") activeValue = expense;
  else if (filter === "transfer") activeValue = transfer;
  else if (filter === "adjustment") activeValue = adjustment;

  return { income, expense, transfer, adjustment, activeValue };
}

const MONTHS_LIST = [
  { code: "01", short: "Jan", full: "January" },
  { code: "02", short: "Feb", full: "February" },
  { code: "03", short: "Mar", full: "March" },
  { code: "04", short: "Apr", full: "April" },
  { code: "05", short: "May", full: "May" },
  { code: "06", short: "Jun", full: "June" },
  { code: "07", short: "Jul", full: "July" },
  { code: "08", short: "Aug", full: "August" },
  { code: "09", short: "Sep", full: "September" },
  { code: "10", short: "Oct", full: "October" },
  { code: "11", short: "Nov", full: "November" },
  { code: "12", short: "Dec", full: "December" },
];

export function TransactionsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(
    null,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeType>("this_month");
  const [selectedCustomMonth, setSelectedCustomMonth] = useState<string>(
    format(new Date(), "yyyy-MM"),
  );
  const [pickerYear, setPickerYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [pendingDeletedIds, setPendingDeletedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    data: allTxs = [],
    isLoading,
    refetch: refetchTxs,
  } = useAllTransactions();
  const { data: wallets = [], refetch: refetchWallets } = useWallets();
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const deleteTx = useDeleteTransaction();
  const { showToast } = useToast();
  const { checkUnusual } = useUnusualSpending(allTxs);

  const visibleTxs = useMemo(
    () => allTxs.filter((t) => !pendingDeletedIds.has(t.id)),
    [allTxs, pendingDeletedIds],
  );

  const handleDeleteTransaction = (tx: Transaction) => {
    setPendingDeletedIds((prev) => new Set(prev).add(tx.id));
    showToast(
      "Transaction deleted",
      "delete",
      () => {
        deleteTx.mutate(tx.id, {
          onSuccess: () => {
            setPendingDeletedIds((prev) => {
              const next = new Set(prev);
              next.delete(tx.id);
              return next;
            });
          },
        });
      },
      4000,
      () => {
        setPendingDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(tx.id);
          return next;
        });
      },
    );
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    setEditingTx({
      ...tx,
      id: "",
      occurred_on: format(new Date(), "yyyy-MM-dd"),
      created_at: new Date().toISOString(),
    });
    setSheetOpen(true);
  };

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([refetchTxs(), refetchWallets(), refetchCategories()]);
    },
  });

  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";
  const shouldRenderHeavy = useDeferredRender(150);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(timer);
  }, [search]);

  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined"
      ? document.getElementById("app-scroll-container")
      : null,
  );

  useEffect(() => {
    if (!scrollParent && typeof document !== "undefined") {
      setScrollParent(document.getElementById("app-scroll-container"));
    }
  }, [scrollParent]);

  const resolveWalletNames = useCallback(
    (tx: Transaction) => resolveTransactionWallets(tx, wallets),
    [wallets],
  );

  const scopedTxs = useMemo(() => {
    const now = new Date();
    let txs = visibleTxs.filter((t) => !!t.occurred_on);

    if (timeRange === "this_month") {
      const startStr = format(startOfMonth(now), "yyyy-MM-dd");
      const endStr = format(endOfMonth(now), "yyyy-MM-dd");
      txs = txs.filter(
        (t) => t.occurred_on >= startStr && t.occurred_on <= endStr,
      );
    } else if (timeRange === "last_month") {
      const prev = subMonths(now, 1);
      const startStr = format(startOfMonth(prev), "yyyy-MM-dd");
      const endStr = format(endOfMonth(prev), "yyyy-MM-dd");
      txs = txs.filter(
        (t) => t.occurred_on >= startStr && t.occurred_on <= endStr,
      );
    } else if (timeRange === "last_30") {
      const startStr = format(subDays(now, 29), "yyyy-MM-dd");
      const endStr = format(now, "yyyy-MM-dd");
      txs = txs.filter(
        (t) => t.occurred_on >= startStr && t.occurred_on <= endStr,
      );
    } else if (timeRange === "custom_month") {
      txs = txs.filter((t) => t.occurred_on.startsWith(selectedCustomMonth));
    } else if (timeRange === "custom_range") {
      if (customStartDate) {
        txs = txs.filter((t) => t.occurred_on >= customStartDate);
      }
      if (customEndDate) {
        txs = txs.filter((t) => t.occurred_on <= customEndDate);
      }
    }

    return txs;
  }, [visibleTxs, timeRange, selectedCustomMonth, customStartDate, customEndDate]);

  // 2. Filter & Search transactions within the active timeframe
  const filteredTxs = useMemo(() => {
    let txs = scopedTxs;

    if (filter === "income") {
      txs = txs.filter((t) => t.type === "income" && !isTxCorrection(t));
    } else if (filter === "expense") {
      txs = txs.filter((t) => t.type === "expense" && !isTxCorrection(t));
    } else if (filter === "transfer") {
      txs = txs.filter((t) => t.type === "transfer");
    } else if (filter === "adjustment") {
      txs = txs.filter((t) => isTxCorrection(t));
    }

    if (selectedWalletName) {
      const target = selectedWalletName.toLowerCase();
      txs = txs.filter((t) => {
        const { from, to } = resolveWalletNames(t);
        return (
          from.toLowerCase() === target ||
          (t.type === "transfer" && to.toLowerCase() === target)
        );
      });
    }

    if (selectedCategoryIds.length > 0) {
      const catSet = new Set(selectedCategoryIds);
      txs = txs.filter((t) => t.category_id && catSet.has(t.category_id));
    }

    const minAmt = parseFloat(minAmount);
    if (!isNaN(minAmt) && minAmt > 0) {
      txs = txs.filter((t) => Number(t.amount || 0) >= minAmt);
    }

    const maxAmt = parseFloat(maxAmount);
    if (!isNaN(maxAmt) && maxAmt > 0) {
      txs = txs.filter((t) => Number(t.amount || 0) <= maxAmt);
    }

    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      const digitsOnly = q.replace(/[^0-9]/g, "");
      txs = txs.filter((t) => {
        const { from, to } = resolveWalletNames(t);
        const catName =
          t.categories?.name ||
          categories.find((c) => c.id === t.category_id)?.name ||
          "";
        const formattedAmount = formatRupiah(
          Number(t.amount || 0),
        ).toLowerCase();
        const amountStr = String(t.amount || "");

        const matchesText =
          (t.note && t.note.toLowerCase().includes(q)) ||
          catName.toLowerCase().includes(q) ||
          from.toLowerCase().includes(q) ||
          to.toLowerCase().includes(q);

        const matchesAmount =
          (digitsOnly.length > 0 && amountStr.includes(digitsOnly)) ||
          formattedAmount.includes(q) ||
          amountStr.includes(q);

        return matchesText || matchesAmount;
      });
    }
    return txs;
  }, [
    scopedTxs,
    filter,
    selectedWalletName,
    selectedCategoryIds,
    minAmount,
    maxAmount,
    debouncedSearch,
    resolveWalletNames,
    categories,
  ]);

  const filteredTxsByDay = useMemo(() => {
    const dayMap = new Map<string, Transaction[]>();
    const monthMap = new Map<string, Transaction[]>();

    filteredTxs.forEach((tx) => {
      const dayKey = tx.occurred_on;
      const monthKey = tx.occurred_on.slice(0, 7);

      const dayList = dayMap.get(dayKey);
      if (dayList) dayList.push(tx);
      else dayMap.set(dayKey, [tx]);

      const monthList = monthMap.get(monthKey);
      if (monthList) monthList.push(tx);
      else monthMap.set(monthKey, [tx]);
    });

    return { dayMap, monthMap };
  }, [filteredTxs]);

  const dynamicChartData = useMemo(() => {
    const now = new Date();
    const points: ChartPoint[] = [];

    if (timeRange === "custom_range") {
      if (customStartDate && customEndDate && customStartDate <= customEndDate) {
        try {
          const start = parseISO(customStartDate);
          const end = parseISO(customEndDate);
          const intervalDays = eachDayOfInterval({ start, end });
          if (intervalDays.length <= 62) {
            intervalDays.forEach((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const totals = summarizeTransactionsForChart(
                filteredTxsByDay.dayMap.get(dateStr) || [],
                filter,
                isTxCorrection,
              );
              points.push({ dateStr, label: format(d, "d MMM"), ...totals });
            });
            return points;
          }
        } catch {
          // fallback to auto aggregation
        }
      }
    }

    if (
      timeRange === "this_month" ||
      timeRange === "last_month" ||
      timeRange === "custom_month"
    ) {
      let targetMonthDate = now;
      if (timeRange === "last_month") targetMonthDate = subMonths(now, 1);
      else if (timeRange === "custom_month") {
        try {
          targetMonthDate = parse(selectedCustomMonth, "yyyy-MM", new Date());
        } catch {
          targetMonthDate = now;
        }
      }

      const start = startOfMonth(targetMonthDate);
      const end = endOfMonth(targetMonthDate);
      eachDayOfInterval({ start, end }).forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const totals = summarizeTransactionsForChart(
          filteredTxsByDay.dayMap.get(dateStr) || [],
          filter,
          isTxCorrection,
        );
        points.push({ dateStr, label: format(d, "d"), ...totals });
      });
      return points;
    }

    if (timeRange === "last_30") {
      for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i);
        const dateStr = format(d, "yyyy-MM-dd");
        const totals = summarizeTransactionsForChart(
          filteredTxsByDay.dayMap.get(dateStr) || [],
          filter,
          isTxCorrection,
        );
        points.push({ dateStr, label: format(d, "d"), ...totals });
      }
      return points;
    }

    if (filteredTxs.length === 0) return [];

    const earliestDate = filteredTxs.reduce(
      (min, tx) => (tx.occurred_on < min ? tx.occurred_on : min),
      filteredTxs[0].occurred_on,
    );
    const earliestMonth = new Date(`${earliestDate.slice(0, 7)}-01T00:00:00`);
    const totalMonths =
      (now.getFullYear() - earliestMonth.getFullYear()) * 12 +
      (now.getMonth() - earliestMonth.getMonth()) +
      1;

    for (let i = 0; i < totalMonths; i++) {
      const monthDate = new Date(
        earliestMonth.getFullYear(),
        earliestMonth.getMonth() + i,
        1,
      );
      const monthKey = format(monthDate, "yyyy-MM");
      const totals = summarizeTransactionsForChart(
        filteredTxsByDay.monthMap.get(monthKey) || [],
        filter,
        isTxCorrection,
      );
      points.push({
        dateStr: monthKey,
        label:
          totalMonths > 12
            ? format(monthDate, "MMM yy")
            : format(monthDate, "MMM"),
        ...totals,
      });
    }

    return points;
  }, [filteredTxs, filteredTxsByDay, filter, timeRange, selectedCustomMonth, customStartDate, customEndDate]);

  const totalPeriodAmount = useMemo(() => {
    return dynamicChartData.reduce((s, d) => s + d.activeValue, 0);
  }, [dynamicChartData]);

  // 3. Group by date using all filteredTxs
  const { groupKeys, groupedTxs, groupCounts, flatTxs } = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    filteredTxs.forEach((tx) => {
      const dateKey = tx.occurred_on || "Unknown";
      if (!g[dateKey]) g[dateKey] = [];
      g[dateKey].push(tx);
    });

    const keys = Object.keys(g);
    const counts = keys.map((k) => g[k].length);
    const flat = keys.flatMap((k) => g[k]);

    return {
      groupKeys: keys,
      groupedTxs: g,
      groupCounts: counts,
      flatTxs: flat,
    };
  }, [filteredTxs]);

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Outflow" },
    { key: "income", label: "Inflow" },
    { key: "transfer", label: "Transfer" },
    { key: "adjustment", label: "Correction" },
  ];

  const maxBar = Math.max(...dynamicChartData.map((d) => d.activeValue), 1);

  const selectedMonthLabel = useMemo(() => {
    if (timeRange === "this_month") return "This Month";
    if (timeRange === "last_month") return "Last Month";
    if (timeRange === "last_30") return "Last 30 Days";
    if (timeRange === "all") return "All Time";
    if (timeRange === "custom_range") {
      if (customStartDate && customEndDate) {
        try {
          const s = parseISO(customStartDate);
          const e = parseISO(customEndDate);
          return `${format(s, "d MMM")} - ${format(e, "d MMM")}`;
        } catch {
          return "Custom Range";
        }
      }
      return "Custom Range";
    }
    try {
      const parsed = parse(selectedCustomMonth, "yyyy-MM", new Date());
      return format(parsed, "MMMM yyyy");
    } catch {
      return "Custom Month";
    }
  }, [timeRange, selectedCustomMonth, customStartDate, customEndDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filter !== "all") count++;
    if (selectedWalletName) count++;
    if (selectedCategoryIds.length > 0) count += selectedCategoryIds.length;
    if (minAmount.trim()) count++;
    if (maxAmount.trim()) count++;
    if (timeRange === "custom_range") count++;
    else if (timeRange !== "this_month") count++;
    return count;
  }, [
    filter,
    selectedWalletName,
    selectedCategoryIds,
    minAmount,
    maxAmount,
    timeRange,
  ]);

  const handleResetAllFilters = () => {
    setFilter("all");
    setSelectedWalletName(null);
    setSelectedCategoryIds([]);
    setMinAmount("");
    setMaxAmount("");
    setTimeRange("this_month");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearch("");
    triggerHaptic("medium");
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--bg-base)" }}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={threshold}
      />
      {/* ====== HEADER ====== */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              {filter === "income"
                ? `${selectedMonthLabel} Inflow`
                : filter === "expense"
                  ? `${selectedMonthLabel} Outflow`
                  : filter === "transfer"
                    ? `${selectedMonthLabel} Transfers`
                    : filter === "adjustment"
                      ? `${selectedMonthLabel} Corrections`
                      : `${selectedMonthLabel} Activity`}
            </p>
            <p
              className="text-[32px] font-extrabold tracking-tight leading-tight amount"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(totalPeriodAmount)}
            </p>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {dynamicChartData.length} data points · {selectedMonthLabel}
            </p>
          </div>

          {/* Month Selector Trigger */}
          <button
            type="button"
            onClick={() => {
              setMonthPickerOpen(true);
              triggerHaptic("light");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl active:scale-95 transition-all touch-manipulation cursor-pointer select-none no-pull"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)",
            }}
          >
            <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
            <span
              className="text-[12px] font-extrabold"
              style={{ color: "var(--text-primary)" }}
            >
              {selectedMonthLabel}
            </span>
            <ChevronDown size={13} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* DYNAMIC TIMEFRAME GRADIENT BAR CHART */}
        <div className="h-[95px] w-full mb-3.5 flex items-end">
          {!shouldRenderHeavy ? (
            <div className="w-full flex justify-around items-end h-full px-2 pb-5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="w-8 rounded-md bg-white/5 animate-pulse"
                  style={{ height: `${Math.max(20, Math.random() * 80)}%` }}
                />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dynamicChartData}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="activeBarGradDark"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                    <stop offset="100%" stopColor="#D4D4D8" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient
                    id="inactiveBarGradDark"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.65} />
                    <stop
                      offset="100%"
                      stopColor="#FFFFFF"
                      stopOpacity={0.18}
                    />
                  </linearGradient>
                  <linearGradient
                    id="activeBarGradLight"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#18181B" stopOpacity={1} />
                    <stop
                      offset="100%"
                      stopColor="#3F3F46"
                      stopOpacity={0.85}
                    />
                  </linearGradient>
                  <linearGradient
                    id="inactiveBarGradLight"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#18181B" stopOpacity={0.5} />
                    <stop
                      offset="100%"
                      stopColor="#18181B"
                      stopOpacity={0.12}
                    />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={<GlassTooltip />}
                  cursor={{ fill: "transparent" }}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval={
                    dynamicChartData.length > 20
                      ? 4
                      : dynamicChartData.length > 10
                        ? 2
                        : 0
                  }
                  tick={{
                    fill: "var(--text-tertiary)",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
                <YAxis hide domain={[0, maxBar * 1.15]} />
                <Bar
                  dataKey="activeValue"
                  radius={[4, 4, 4, 4]}
                  maxBarSize={
                    dynamicChartData.length > 20
                      ? 8
                      : dynamicChartData.length > 10
                        ? 16
                        : 28
                  }
                >
                  {dynamicChartData.map((_, index) => {
                    const isCurrentDay = index === dynamicChartData.length - 1;
                    const fillId = isDark
                      ? isCurrentDay
                        ? "url(#activeBarGradDark)"
                        : "url(#inactiveBarGradDark)"
                      : isCurrentDay
                        ? "url(#activeBarGradLight)"
                        : "url(#inactiveBarGradLight)";

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillId}
                        style={{ transition: "fill 0.3s ease" }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Full-Width Search Bar with Inline Filter Controls */}
        <div
          className="flex items-center pl-3.5 pr-2 py-1.5 rounded-2xl mb-2.5 glass-surface no-pull"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Search
            size={16}
            className="shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search note, category, wallet, amount..."
            className="w-full bg-transparent pl-2.5 pr-2 py-1 text-[13px] outline-none font-semibold touch-manipulation no-pull"
            style={{ color: "var(--text-primary)" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="p-1 rounded-full shrink-0 mr-1 touch-manipulation cursor-pointer"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={14} />
            </button>
          )}

          {/* Filter Trigger Button */}
          <div className="h-4 w-[1px] bg-white/10 shrink-0 mx-1" />
          <button
            type="button"
            onClick={() => {
              setFilterSheetOpen(true);
              triggerHaptic("light");
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl active:scale-95 transition-all shrink-0 touch-manipulation cursor-pointer select-none no-pull"
            style={{
              background:
                activeFiltersCount > 0
                  ? "var(--accent)"
                  : "var(--glass-fill)",
              color:
                activeFiltersCount > 0
                  ? "var(--accent-ink)"
                  : "var(--text-secondary)",
              border:
                activeFiltersCount > 0
                  ? "1px solid var(--accent)"
                  : "1px solid var(--glass-border)",
            }}
            title="Advanced Filters"
          >
            <SlidersHorizontal size={13} />
            <span className="text-[11px] font-extrabold">Filters</span>
            {activeFiltersCount > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center"
                style={{
                  background: "var(--accent-ink)",
                  color: "var(--accent)",
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Unified Clean Filter Tabs */}
        <div
          className="flex p-1 rounded-full glass-surface no-pull"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {filterTabs.map((tab) => {
            const isSelected = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setFilter(tab.key);
                  triggerHaptic("light");
                }}
                className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all touch-manipulation cursor-pointer select-none no-pull"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Filter Chips Strip */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 mt-2">
            {timeRange !== "this_month" && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                style={{
                  background: "var(--glass-fill-strong)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Calendar size={11} className="opacity-70" />
                <span>{selectedMonthLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTimeRange("this_month");
                    setCustomStartDate("");
                    setCustomEndDate("");
                    triggerHaptic("light");
                  }}
                  className="p-0.5 rounded-full hover:opacity-80 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </span>
            )}

            {selectedWalletName && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                style={{
                  background: "var(--glass-fill-strong)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Wallet size={11} className="opacity-70" />
                <span>{selectedWalletName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWalletName(null);
                    triggerHaptic("light");
                  }}
                  className="p-0.5 rounded-full hover:opacity-80 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </span>
            )}

            {selectedCategoryIds.map((cid) => {
              const cat = categories.find((c) => c.id === cid);
              return (
                <span
                  key={cid}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                  style={{
                    background: "var(--glass-fill-strong)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <Tag size={11} className="opacity-70" />
                  <span>{cat?.name || "Category"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryIds((prev) =>
                        prev.filter((id) => id !== cid),
                      );
                      triggerHaptic("light");
                    }}
                    className="p-0.5 rounded-full hover:opacity-80 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}

            {(minAmount || maxAmount) && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                style={{
                  background: "var(--glass-fill-strong)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span>
                  {minAmount && maxAmount
                    ? `${formatRupiah(Number(minAmount))} - ${formatRupiah(Number(maxAmount))}`
                    : minAmount
                      ? `≥ ${formatRupiah(Number(minAmount))}`
                      : `≤ ${formatRupiah(Number(maxAmount))}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinAmount("");
                    setMaxAmount("");
                    triggerHaptic("light");
                  }}
                  className="p-0.5 rounded-full hover:opacity-80 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 touch-manipulation cursor-pointer select-none"
              style={{
                color: "var(--accent)",
                background: "transparent",
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ====== TRANSACTION LIST ====== */}
      <div className="px-5 pb-36 space-y-5">
        {isLoading || !shouldRenderHeavy ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-[22px] animate-pulse"
                style={{ background: "var(--bg-elevated)" }}
              />
            ))}
          </div>
        ) : groupKeys.length === 0 ? (
          <div className="text-center py-16">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {search
                ? "No matching transactions found"
                : "No transactions recorded for this period"}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {search
                ? "Try searching with different keywords"
                : "Select another month or record a new transaction"}
            </p>
          </div>
        ) : (
          <GroupedVirtuoso
            customScrollParent={scrollParent || undefined}
            computeItemKey={(index) => flatTxs[index]?.id || String(index)}
            groupCounts={groupCounts}
            groupContent={(index) => {
              const dateKey = groupKeys[index];
              const txs = groupedTxs[dateKey];
              const dayTotal = txs.reduce((s, t) => {
                if (t.type === "income") return s + Number(t.amount);
                if (t.type === "expense") return s - Number(t.amount);
                return s;
              }, 0);
              return (
                <div className="flex justify-between items-center px-1 pb-2 pt-4 bg-[var(--bg-base)]">
                  <span
                    className="text-[12px] font-extrabold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {getDateLabel(dateKey)}
                  </span>
                  <span
                    className="text-[12px] font-bold amount"
                    style={{
                      color:
                        dayTotal >= 0
                          ? "var(--text-primary)"
                          : "var(--text-tertiary)",
                    }}
                  >
                    {dayTotal > 0 ? "+" : ""}
                    {formatRupiah(dayTotal)}
                  </span>
                </div>
              );
            }}
            itemContent={(index) => {
              const tx = flatTxs[index];
              const { from, to } = resolveWalletNames(tx);
              const isUnusual = checkUnusual(tx).isUnusual;
              return (
                <div className="pb-2">
                  <TransactionItem
                    tx={tx}
                    categories={categories}
                    fromWalletName={from}
                    toWalletName={to}
                    isUnusual={isUnusual}
                    onClick={(t) => {
                      setEditingTx(t);
                      setSheetOpen(true);
                    }}
                    onDelete={handleDeleteTransaction}
                    onDuplicate={handleDuplicateTransaction}
                  />
                </div>
              );
            }}
          />
        )}
      </div>

      {/* ====== 12-MONTH & YEAR SELECTOR BOTTOM SHEET ====== */}
      <BottomSheet
        isOpen={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
      >
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3
                className="font-extrabold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Select Timeframe
              </h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Filter transactions by month or year
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "this_month", label: "This Month" },
              { key: "last_month", label: "Last Month" },
              { key: "last_30", label: "Last 30 Days" },
              { key: "all", label: "All Time" },
            ].map((preset) => {
              const isSelected = timeRange === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    setTimeRange(preset.key as TimeRangeType);
                    setMonthPickerOpen(false);
                    triggerHaptic("light");
                  }}
                  className="py-2.5 px-3 rounded-2xl text-[12px] font-extrabold flex items-center justify-between active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
                  style={{
                    background: isSelected
                      ? "var(--accent)"
                      : "var(--bg-elevated)",
                    color: isSelected
                      ? "var(--accent-ink)"
                      : "var(--text-primary)",
                    border: isSelected
                      ? "1px solid transparent"
                      : "1px solid var(--glass-border)",
                  }}
                >
                  <span>{preset.label}</span>
                  {isSelected && <span className="text-[11px]">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Elegant Year Selector Tabs */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Specific Month in Year
              </span>
              <span
                className="text-[12px] font-extrabold"
                style={{ color: "var(--text-primary)" }}
              >
                {pickerYear}
              </span>
            </div>

            {/* Year Selector Bar */}
            <div
              className="flex p-1 rounded-2xl mb-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {[2026, 2025, 2024, 2023].map((y) => {
                const isYSelected = pickerYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setPickerYear(y);
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1.5 rounded-xl text-[12px] font-extrabold transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isYSelected ? "var(--accent)" : "transparent",
                      color: isYSelected
                        ? "var(--accent-ink)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>

            {/* 12-Month iOS Grid */}
            <div className="grid grid-cols-4 gap-2">
              {MONTHS_LIST.map((m) => {
                const monthKey = `${pickerYear}-${m.code}`;
                const isSelected =
                  timeRange === "custom_month" &&
                  selectedCustomMonth === monthKey;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => {
                      setSelectedCustomMonth(monthKey);
                      setTimeRange("custom_month");
                      setMonthPickerOpen(false);
                      triggerHaptic("light");
                    }}
                    className="p-3 rounded-2xl text-[12px] font-extrabold text-center active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isSelected
                        ? "0 0 0 1px var(--accent-glow)"
                        : "none",
                    }}
                  >
                    {m.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>

      <TransactionSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingTx(null);
        }}
        transaction={editingTx}
      />

      {/* Account Picker Glass Sheet */}
      <BottomSheet
        isOpen={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
      >
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-extrabold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Filter by Account
              </h3>
              <p
                className="text-[12px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Show transactions from a specific account
              </p>
            </div>
            {selectedWalletName && (
              <button
                type="button"
                onClick={() => {
                  setSelectedWalletName(null);
                  setAccountPickerOpen(false);
                  triggerHaptic("light");
                }}
                className="text-[12px] font-bold px-3 py-1 rounded-full touch-manipulation cursor-pointer select-none"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {/* All Accounts Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedWalletName(null);
                setAccountPickerOpen(false);
                triggerHaptic("light");
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform touch-manipulation cursor-pointer select-none"
              style={{
                background:
                  selectedWalletName === null
                    ? "var(--glass-fill-strong)"
                    : "transparent",
                color: "var(--text-primary)",
                border:
                  selectedWalletName === null
                    ? "1.5px solid var(--accent)"
                    : "1px solid transparent",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    selectedWalletName === null
                      ? "var(--dock-active-pill)"
                      : "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Wallet size={18} style={{ color: "var(--text-primary)" }} />
              </div>
              <span className="text-[11px] font-bold text-center line-clamp-1">
                All Accounts
              </span>
            </button>

            {/* Wallets */}
            {wallets.map((w) => {
              const isSelected = selectedWalletName === w.name;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWalletName(w.name);
                    setAccountPickerOpen(false);
                    triggerHaptic("light");
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform touch-manipulation cursor-pointer select-none"
                  style={{
                    background: isSelected
                      ? "var(--glass-fill-strong)"
                      : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected
                      ? "1.5px solid var(--accent)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: isSelected
                        ? "var(--dock-active-pill)"
                        : "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {w.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {/* ====== ADVANCED FILTERS BOTTOM SHEET ====== */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
      >
        <div className="p-5 pb-16 space-y-5 max-h-[82vh] overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-extrabold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Filters
              </h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Refine by timeframe, type, account, category & amount
              </p>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-[12px] font-bold px-3 py-1 rounded-full touch-manipulation cursor-pointer select-none active:scale-95 transition-transform"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-secondary)",
                }}
              >
                Reset All
              </button>
            )}
          </div>

          {/* 1. Transaction Type */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Transaction Type
            </label>
            <div
              className="flex p-1 rounded-2xl glass-surface"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {filterTabs.map((tab) => {
                const isSelected = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setFilter(tab.key);
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isSelected ? "var(--accent)" : "transparent",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Timeframe & Date Range */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Timeframe & Date Range
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {[
                { key: "this_month", label: "This Month" },
                { key: "last_month", label: "Last Month" },
                { key: "last_30", label: "Last 30 Days" },
                { key: "all", label: "All Time" },
                { key: "custom_range", label: "Custom Range" },
              ].map((preset) => {
                const isSelected = timeRange === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setTimeRange(preset.key as TimeRangeType);
                      triggerHaptic("light");
                    }}
                    className="py-2 px-2.5 rounded-xl text-[11px] font-bold text-center active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {timeRange === "custom_range" && (
              <div
                className="grid grid-cols-2 gap-2 p-3 rounded-2xl glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-transparent text-[12px] font-bold outline-none cursor-pointer"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    End Date
                  </span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-transparent text-[12px] font-bold outline-none cursor-pointer"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Account / Wallet Filter */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Account
              </label>
              {selectedWalletName && (
                <button
                  type="button"
                  onClick={() => setSelectedWalletName(null)}
                  className="text-[11px] font-bold text-[var(--accent)]"
                >
                  All Accounts
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedWalletName(null);
                  triggerHaptic("light");
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer select-none"
                style={{
                  background:
                    selectedWalletName === null
                      ? "var(--accent)"
                      : "var(--bg-elevated)",
                  color:
                    selectedWalletName === null
                      ? "var(--accent-ink)"
                      : "var(--text-primary)",
                  border:
                    selectedWalletName === null
                      ? "1px solid transparent"
                      : "1px solid var(--glass-border)",
                }}
              >
                All Accounts
              </button>
              {wallets.map((w) => {
                const isSelected = selectedWalletName === w.name;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWalletName(isSelected ? null : w.name);
                      triggerHaptic("light");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                    <span>{w.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Category Multi-Select Filter */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Categories
              </label>
              {selectedCategoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds([])}
                  className="text-[11px] font-bold text-[var(--accent)]"
                >
                  Clear Categories
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-0.5">
              {categories.map((c) => {
                const isSelected = selectedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== c.id)
                          : [...prev, c.id],
                      );
                      triggerHaptic("light");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 transition-all cursor-pointer select-none"
                    style={{
                      background: isSelected
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--accent-ink)"
                        : "var(--text-primary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={c.emoji || ""} size="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Amount Range (Min / Max) */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Amount Range (IDR)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 rounded-2xl glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Min Amount
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-bold outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div
                className="p-3 rounded-2xl glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Max Amount
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Unlimited"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-bold outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => {
              setFilterSheetOpen(false);
              triggerHaptic("medium");
            }}
            className="w-full py-3.5 rounded-2xl font-extrabold text-[14px] active:scale-95 transition-all shadow-xl mt-2 cursor-pointer"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            Show {filteredTxs.length} Transactions
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
