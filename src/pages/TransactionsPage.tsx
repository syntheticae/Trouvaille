import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator";
import { triggerHaptic } from "../lib/haptics";
import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Calendar,
  ChevronDown,
  Wallet,
  SlidersHorizontal,
  Tag,
  CheckSquare,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Inbox,
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
  useBatchDeleteTransactions,
} from "../hooks/useTransactions";
import { useWallets, resolveTransactionWallets } from "../hooks/useWallets";
import { useCategories } from "../hooks/useCategories";
import { useToast } from "../contexts/ToastContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useSpace } from "../contexts/SpaceContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { TransactionSheet } from "../components/transactions/TransactionSheet";
import { BottomSheet } from "../components/ui/BottomSheet";
import type { Transaction, Category, Wallet as WalletType } from "../lib/types";
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
  eachWeekOfInterval,
  endOfWeek,
  eachMonthOfInterval,
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

interface TransactionsPageProps {
  onOpenScan?: () => void;
  onOpenImport?: () => void;
  onOpenVoiceAdd?: () => void;
}

export function TransactionsPage({
  onOpenScan: _onOpenScan,
  onOpenImport: _onOpenImport,
  onOpenVoiceAdd: _onOpenVoiceAdd,
}: TransactionsPageProps = {}) {
  const { isStealthMode, toggleStealthMode } = usePrivacy();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const deferredSearch = useDeferredValue(search);
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
  const batchDeleteTx = useBatchDeleteTransactions();
  const { showToast } = useToast();
  useCurrency();
  const { t, isIndonesian } = useLanguage();
  const { activeSpace, activeSpaceId, setActiveSpaceId, filterTransactionsBySpace } = useSpace();

  // Selection Mode State for Bulk Actions
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // O(1) Dictionary Lookup Maps for Categories and Wallets
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const walletMap = useMemo(() => {
    const map = new Map<string, WalletType>();
    wallets.forEach((w) => map.set(w.id, w));
    return map;
  }, [wallets]);

  const visibleTxs = useMemo(
    () =>
      filterTransactionsBySpace(allTxs, activeSpaceId).filter(
        (t) => !pendingDeletedIds.has(t.id),
      ),
    [allTxs, activeSpaceId, filterTransactionsBySpace, pendingDeletedIds],
  );

  const { checkUnusual } = useUnusualSpending(visibleTxs);

  // 5-second Undo Grace Period for single deletion
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
      5000,
      () => {
        setPendingDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(tx.id);
          return next;
        });
      },
    );
  };

  const handleToggleSelect = useCallback((tx: Transaction) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(tx.id)) {
        next.delete(tx.id);
      } else {
        next.add(tx.id);
      }
      return next;
    });
  }, []);

  const handleEnterSelectMode = useCallback((tx?: Transaction) => {
    setIsSelectMode(true);
    if (tx) {
      setSelectedTxIds(new Set([tx.id]));
    }
  }, []);

  const handleItemClick = useCallback(
    (t: Transaction) => {
      if (isSelectMode) {
        handleToggleSelect(t);
      } else {
        setEditingTx(t);
        setSheetOpen(true);
      }
    },
    [isSelectMode, handleToggleSelect],
  );

  const handleExitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedTxIds(new Set());
  }, []);

  // Bulk Deletion with 5-second Undo Grace Period
  const handleBulkDelete = () => {
    if (selectedTxIds.size === 0) return;
    triggerHaptic("heavy");
    const idsToDelete = Array.from(selectedTxIds);
    setPendingDeletedIds((prev) => {
      const next = new Set(prev);
      idsToDelete.forEach((id) => next.add(id));
      return next;
    });
    const count = idsToDelete.length;
    handleExitSelectMode();

    showToast(
      `${count} transactions deleted`,
      "delete",
      () => {
        batchDeleteTx.mutate(idsToDelete, {
          onSuccess: () => {
            setPendingDeletedIds((prev) => {
              const next = new Set(prev);
              idsToDelete.forEach((id) => next.delete(id));
              return next;
            });
          },
        });
      },
      5000,
      () => {
        setPendingDeletedIds((prev) => {
          const next = new Set(prev);
          idsToDelete.forEach((id) => next.delete(id));
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


  const scrollParent = useMemo(
    () =>
      typeof document !== "undefined"
        ? document.getElementById("app-scroll-container")
        : null,
    [],
  );

  const resolveWalletNames = useCallback(
    (tx: Transaction) => resolveTransactionWallets(tx, walletMap),
    [walletMap],
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

    const q = deferredSearch.toLowerCase().trim();
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
    deferredSearch,
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
          } else if (intervalDays.length <= 180) {
            // Adaptive bar chart density: weekly buckets (approx 9 to 26 bars)
            const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
            weeks.forEach((weekStart) => {
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const actualEnd = weekEnd > end ? end : weekEnd;
              const actualStart = weekStart < start ? start : weekStart;
              const weekDays = eachDayOfInterval({ start: actualStart, end: actualEnd });
              const weekTxs: Transaction[] = [];
              weekDays.forEach((d) => {
                const dateStr = format(d, "yyyy-MM-dd");
                const dayTxs = filteredTxsByDay.dayMap.get(dateStr);
                if (dayTxs) weekTxs.push(...dayTxs);
              });
              const totals = summarizeTransactionsForChart(
                weekTxs,
                filter,
                isTxCorrection,
              );
              points.push({
                dateStr: format(actualStart, "yyyy-MM-dd"),
                label: `${format(actualStart, "d/M")}-${format(actualEnd, "d/M")}`,
                ...totals,
              });
            });
            return points;
          } else {
            // Adaptive bar chart density: monthly buckets for long ranges (> 180 days)
            const months = eachMonthOfInterval({ start, end });
            months.forEach((monthDate) => {
              const monthKey = format(monthDate, "yyyy-MM");
              const totals = summarizeTransactionsForChart(
                filteredTxsByDay.monthMap.get(monthKey) || [],
                filter,
                isTxCorrection,
              );
              points.push({
                dateStr: monthKey,
                label: format(monthDate, "MMM yy"),
                ...totals,
              });
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

  const filterTabs: { key: FilterType; label: string }[] = useMemo(
    () => [
      { key: "all", label: isIndonesian ? "Semua" : "All" },
      { key: "expense", label: isIndonesian ? "Pengeluaran" : "Outflow" },
      { key: "income", label: isIndonesian ? "Pemasukan" : "Inflow" },
      { key: "transfer", label: "Transfer" },
      { key: "adjustment", label: isIndonesian ? "Koreksi" : "Correction" },
    ],
    [isIndonesian],
  );

  const maxBar = Math.max(...dynamicChartData.map((d) => d.activeValue), 1);

  const selectedMonthLabel = useMemo(() => {
    if (timeRange === "this_month") return isIndonesian ? "Bulan Ini" : "This Month";
    if (timeRange === "last_month") return isIndonesian ? "Bulan Lalu" : "Last Month";
    if (timeRange === "last_30") return isIndonesian ? "30 Hari Terakhir" : "Last 30 Days";
    if (timeRange === "all") return isIndonesian ? "Semua Waktu" : "All Time";
    if (timeRange === "custom_range") {
      if (customStartDate && customEndDate) {
        try {
          const s = parseISO(customStartDate);
          const e = parseISO(customEndDate);
          return `${format(s, "d MMM")} - ${format(e, "d MMM")}`;
        } catch {
          return isIndonesian ? "Rentang Kustom" : "Custom Range";
        }
      }
      return isIndonesian ? "Rentang Kustom" : "Custom Range";
    }
    try {
      const parsed = parse(selectedCustomMonth, "yyyy-MM", new Date());
      return format(parsed, "MMMM yyyy");
    } catch {
      return isIndonesian ? "Bulan Kustom" : "Custom Month";
    }
  }, [timeRange, selectedCustomMonth, customStartDate, customEndDate, isIndonesian]);

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
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] truncate leading-none mb-1.5"
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
              className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-tight amount whitespace-nowrap"
              style={{ color: "var(--text-primary)" }}
            >
              {isStealthMode ? "Rp ••••••••" : formatRupiah(totalPeriodAmount)}
            </p>
            <p
              className="text-[11px] font-medium mt-1 text-[var(--text-tertiary)] truncate"
            >
              {dynamicChartData.length} data points · {selectedMonthLabel}
            </p>
          </div>

          {/* Header Action Pills: Stealth Mode & Month Selector */}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <button
              type="button"
              onClick={toggleStealthMode}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation cursor-pointer select-none no-pull"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: isStealthMode ? "var(--accent)" : "var(--text-secondary)",
              }}
              title={isStealthMode ? "Disable Stealth Mode" : "Enable Stealth Mode (or 3-finger tap)"}
            >
              {isStealthMode ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setMonthPickerOpen(true);
                triggerHaptic("light");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95 transition-all touch-manipulation cursor-pointer select-none no-pull shrink-0 whitespace-nowrap"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "0 2px 8px var(--shadow-strength)",
              }}
            >
              <Calendar size={12} style={{ color: "var(--text-secondary)" }} />
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {selectedMonthLabel}
              </span>
              <ChevronDown size={11} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
        </div>

        {/* Active Space Segregation Notice */}
        {activeSpaceId !== "all" && activeSpaceId !== "personal" && (
          <div
            className="mb-3 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-medium animate-fadeIn"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
              <span>
                {isIndonesian ? (
                  <>
                    Difilter ke space <strong>{activeSpace.name}</strong> ({visibleTxs.length} catatan)
                  </>
                ) : (
                  <>
                    Filtered to <strong>{activeSpace.name}</strong> space ({visibleTxs.length} records)
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveSpaceId("all");
              }}
              className="text-[10px] font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer"
              style={{ color: "var(--text-primary)" }}
            >
              View All
            </button>
          </div>
        )}

        {/* DYNAMIC TIMEFRAME GRADIENT BAR CHART */}
        <div className="h-[95px] w-full mb-3.5 flex items-end">
          {!shouldRenderHeavy ? (
            <div className="w-full flex justify-around items-end h-full px-2 pb-5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="w-8 rounded-md bg-white/5 animate-pulse"
                  style={{ height: `${[45, 70, 35, 80, 50, 65, 40][(i - 1) % 7]}%` }}
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

        {/* Full-Width Search Bar with Dynamic Focus Animation */}
        <div
          className="flex items-center pl-3.5 pr-2 py-1.5 rounded-2xl mb-2.5 glass-surface no-pull transition-all duration-200"
          style={{
            background: "var(--bg-elevated)",
            border: isSearchFocused
              ? "1px solid rgba(255, 255, 255, 0.22)"
              : "1px solid var(--glass-border)",
            boxShadow: isSearchFocused
              ? "0 4px 16px rgba(0, 0, 0, 0.25)"
              : "none",
          }}
        >
          <Search
            size={16}
            className="shrink-0"
            style={{
              color: isSearchFocused
                ? "var(--text-primary)"
                : "var(--text-tertiary)",
            }}
          />
          <input
            type="text"
            value={search}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isIndonesian ? "Cari transaksi..." : "Search transactions..."}
            className="w-full bg-transparent pl-2.5 pr-2 py-1 text-[13px] outline-none font-semibold touch-manipulation no-pull min-w-0"
            style={{ color: "var(--text-primary)" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                triggerHaptic("light");
              }}
              className="p-1 rounded-full shrink-0 mr-1 touch-manipulation cursor-pointer"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={14} />
            </button>
          )}

          {/* Smooth hiding of side buttons (Filters & Select) when search is focused or active */}
          <AnimatePresence>
            {!isSearchFocused && !search && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center shrink-0 overflow-hidden"
              >
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
                  <span className="text-[11px] font-semibold">{isIndonesian ? "Filter" : "Filters"}</span>
                  {activeFiltersCount > 0 && (
                    <span
                      className="w-4 h-4 rounded-full text-[9px] font-semibold flex items-center justify-center"
                      style={{
                        background: "var(--accent-ink)",
                        color: "var(--accent)",
                      }}
                    >
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Select Mode Trigger Button */}
                <div className="h-4 w-[1px] bg-white/10 shrink-0 mx-1" />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    if (isSelectMode) {
                      handleExitSelectMode();
                    } else {
                      setIsSelectMode(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl active:scale-95 transition-all shrink-0 touch-manipulation cursor-pointer select-none no-pull"
                  style={{
                    background: isSelectMode
                      ? "var(--accent)"
                      : "var(--glass-fill)",
                    color: isSelectMode
                      ? "var(--accent-ink)"
                      : "var(--text-secondary)",
                    border: isSelectMode
                      ? "1px solid var(--accent)"
                      : "1px solid var(--glass-border)",
                  }}
                  title={
                    isSelectMode ? "Exit Select Mode" : "Select Transactions"
                  }
                >
                  <CheckSquare size={13} />
                  <span className="text-[11px] font-semibold">
                    {isSelectMode ? (isIndonesian ? "Selesai" : "Done") : (isIndonesian ? "Pilih" : "Select")}
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 touch-manipulation cursor-pointer select-none"
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
          <div className="py-14 px-4 flex flex-col items-center justify-center text-center">
            <div
              className="w-14 h-14 rounded-3xl flex items-center justify-center mb-3.5 glass-surface"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
              }}
            >
              <Inbox size={24} strokeWidth={1.5} />
            </div>
            <p
              className="text-[14px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {search
                ? (isIndonesian ? "Tidak ada transaksi yang cocok" : "No matching transactions found")
                : (isIndonesian ? "Tidak ada transaksi pada periode ini" : "No transactions recorded in this period")}
            </p>
            <p
              className="text-[12px] mt-1 max-w-[260px] leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              {search
                ? t("transactions.emptySearch", "Try searching with different keywords or adjust your filters.")
                : t("transactions.emptyFresh", "Start managing your finances by logging your expenses and income.")}
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
                    className="text-[12px] font-semibold"
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
                    categoryMap={categoryMap}
                    fromWalletName={from}
                    toWalletName={to}
                    isUnusual={isUnusual}
                    isSelectMode={isSelectMode}
                    isSelected={selectedTxIds.has(tx.id)}
                    onClick={handleItemClick}
                    onDelete={handleDeleteTransaction}
                    onDuplicate={handleDuplicateTransaction}
                    onToggleSelect={handleToggleSelect}
                    onLongPress={handleEnterSelectMode}
                  />
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Floating Bulk Action Bar (Strict Apple Luxury Aesthetics) */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 35, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-[calc(78px+env(safe-area-inset-bottom,16px))] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-[9999] p-3 rounded-[24px] flex items-center justify-between pointer-events-auto"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-card), 0 16px 40px rgba(0,0,0,0.35)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[13px] font-bold px-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                {selectedTxIds.size} {isIndonesian ? "Dipilih" : "Selected"}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  if (
                    selectedTxIds.size === visibleTxs.length &&
                    visibleTxs.length > 0
                  ) {
                    setSelectedTxIds(new Set());
                  } else {
                    setSelectedTxIds(new Set(visibleTxs.map((t) => t.id)));
                  }
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-xl active:scale-95 transition-all cursor-pointer select-none"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {selectedTxIds.size === visibleTxs.length &&
                visibleTxs.length > 0
                  ? (isIndonesian ? "Batalkan Pilihan" : "Deselect All")
                  : (isIndonesian ? "Pilih Semua" : "Select All")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedTxIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold active:scale-95 transition-all cursor-pointer"
                  style={{
                    background: "rgba(239, 68, 68, 0.14)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                  }}
                >
                  <Trash2 size={13} strokeWidth={2} />
                  <span>Delete ({selectedTxIds.size})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExitSelectMode}
                className="px-3.5 py-1.5 rounded-xl text-[12px] font-bold active:scale-95 transition-all cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== 12-MONTH & YEAR SELECTOR BOTTOM SHEET ====== */}
      <BottomSheet
        isOpen={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
      >
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3
                className="font-semibold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Pilih Rentang Waktu" : "Select Timeframe"}
              </h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Filter transaksi berdasarkan bulan atau tahun"
                  : "Filter transactions by month or year"}
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "this_month", label: isIndonesian ? "Bulan Ini" : "This Month" },
              { key: "last_month", label: isIndonesian ? "Bulan Lalu" : "Last Month" },
              { key: "last_30", label: isIndonesian ? "30 Hari Terakhir" : "Last 30 Days" },
              { key: "all", label: isIndonesian ? "Semua Waktu" : "All Time" },
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
                  className="py-2.5 px-3 rounded-2xl text-[12px] font-semibold flex items-center justify-between active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
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
                  {isSelected && <Check size={12} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>

          {/* Elegant Year Selector Tabs */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Pilih Bulan dalam Tahun" : "Specific Month in Year"}
              </span>
              <span
                className="text-[12px] font-semibold"
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
                    className="flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all touch-manipulation cursor-pointer select-none"
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
                    className="p-3 rounded-2xl text-[12px] font-semibold text-center active:scale-95 transition-all touch-manipulation cursor-pointer select-none"
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

      {sheetOpen && (
        <TransactionSheet
          isOpen={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            setEditingTx(null);
          }}
          transaction={editingTx}
          onOpenScan={_onOpenScan}
          onOpenVoiceAdd={() => {
            setSheetOpen(false);
            setEditingTx(null);
            _onOpenVoiceAdd?.();
          }}
        />
      )}

      {/* Account Picker Glass Sheet */}
      <BottomSheet
        isOpen={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
      >
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-semibold text-base"
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
        <div className="p-5 pb-16 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-semibold text-base"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Filter" : "Filters"}
              </h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Saring berdasarkan waktu, jenis, akun, kategori & nominal" : "Refine by timeframe, type, account, category & amount"}
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
                {isIndonesian ? "Reset Semua" : "Reset All"}
              </button>
            )}
          </div>

          {/* 1. Transaction Type */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Jenis Transaksi" : "Transaction Type"}
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
              {isIndonesian ? "Rentang Waktu & Tanggal" : "Timeframe & Date Range"}
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {[
                { key: "this_month", label: isIndonesian ? "Bulan Ini" : "This Month" },
                { key: "last_month", label: isIndonesian ? "Bulan Lalu" : "Last Month" },
                { key: "last_30", label: isIndonesian ? "30 Hari Terakhir" : "Last 30 Days" },
                { key: "all", label: isIndonesian ? "Semua Waktu" : "All Time" },
                { key: "custom_range", label: isIndonesian ? "Rentang Kustom" : "Custom Range" },
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
                <div className="relative p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] min-w-0 transition-colors hover:border-[var(--text-secondary)] flex flex-col justify-center cursor-pointer">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[var(--text-tertiary)]"
                  >
                    {isIndonesian ? "Tanggal Mulai" : "Start Date"}
                  </span>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                    {customStartDate
                      ? format(parseISO(customStartDate), isIndonesian ? "d MMM yyyy" : "MMM d, yyyy")
                      : "-"}
                  </div>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="relative p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] min-w-0 transition-colors hover:border-[var(--text-secondary)] flex flex-col justify-center cursor-pointer">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[var(--text-tertiary)]"
                  >
                    {isIndonesian ? "Tanggal Selesai" : "End Date"}
                  </span>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                    {customEndDate
                      ? format(parseISO(customEndDate), isIndonesian ? "d MMM yyyy" : "MMM d, yyyy")
                      : "-"}
                  </div>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
                {isIndonesian ? "Akun" : "Account"}
              </label>
              {selectedWalletName && (
                <button
                  type="button"
                  onClick={() => setSelectedWalletName(null)}
                  className="text-[11px] font-bold text-[var(--accent)]"
                >
                  {isIndonesian ? "Semua Akun" : "All Accounts"}
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
                {isIndonesian ? "Semua Akun" : "All Accounts"}
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
                {isIndonesian ? "Kategori" : "Categories"}
              </label>
              {selectedCategoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds([])}
                  className="text-[11px] font-bold text-[var(--accent)]"
                >
                  {isIndonesian ? "Hapus Pilihan" : "Clear Categories"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 py-0.5">
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
              {isIndonesian ? "Rentang Nominal" : "Amount Range"}
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
                  {isIndonesian ? "Nominal Min" : "Min Amount"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                  {isIndonesian ? "Nominal Maks" : "Max Amount"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={isIndonesian ? "Tanpa Batas" : "Unlimited"}
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
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] active:scale-95 transition-all shadow-xl mt-2 cursor-pointer"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            {isIndonesian
              ? `Tampilkan ${filteredTxs.length} Transaksi`
              : `Show ${filteredTxs.length} Transactions`}
          </button>
        </div>
      </BottomSheet>

      {/* Bottom padding for tabbar */}
      <div className="h-6" />
    </div>
  );
}
