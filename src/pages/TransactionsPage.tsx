import { usePullToRefresh } from "../hooks/usePullToRefresh"
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator"
import { triggerHaptic } from "../lib/haptics"
﻿import { useState, useMemo, useEffect } from "react"
import { Search, X, Calendar, ChevronDown, Archive, Wallet } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { useWallets } from "../hooks/useWallets"
import { useCategories } from "../hooks/useCategories"
import { TransactionSheet } from "../components/transactions/TransactionSheet"
import { BottomSheet } from "../components/ui/BottomSheet"
import type { Transaction } from "../lib/types"
import { formatRupiah, getDateLabel } from "../lib/utils"
import { IconRenderer } from "../components/ui/IconRenderer"
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parse, eachDayOfInterval, startOfDay, endOfDay } from "date-fns"
import { GroupedVirtuoso } from "react-virtuoso"
import { useDeferredRender } from "../hooks/useDeferredRender"
import { TransactionItem } from "../components/transactions/TransactionItem"
import { resolveFamfinaWallet } from "../lib/famfinaResolver"

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--glass-border)",
      borderRadius: 12,
      padding: "8px 12px",
      boxShadow: "0 8px 24px var(--shadow-strength)",
      fontFamily: "Urbanist, sans-serif",
    }}>
      <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>{formatRupiah(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

type FilterType = "all" | "expense" | "income" | "transfer"
type TimeRangeType = "this_month" | "last_month" | "last_30" | "custom_month" | "all"

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
]

export function TransactionsPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRangeType>("this_month")
  const [selectedCustomMonth, setSelectedCustomMonth] = useState<string>(format(new Date(), "yyyy-MM"))
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear())
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [accountPickerOpen, setAccountPickerOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const { data: allTxs = [], isLoading, refetch: refetchTxs } = useAllTransactions()
  const { data: wallets = [], refetch: refetchWallets } = useWallets()
  const { data: categories = [], refetch: refetchCategories } = useCategories()

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetchTxs(),
        refetchWallets(),
        refetchCategories(),
      ])
    }
  })

  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  const shouldRenderHeavy = useDeferredRender(150) // Defer chart and list for 150ms

  // Debounce search by 150ms for snappy 120Hz typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(timer)
  }, [search])

  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(() => typeof document !== "undefined" ? document.getElementById("app-scroll-container") : null)

  useEffect(() => {
    if (!scrollParent && typeof document !== "undefined") {
      setScrollParent(document.getElementById("app-scroll-container"))
    }
  }, [scrollParent])

  const resolveWalletNames = (tx: Transaction) => resolveFamfinaWallet(tx, wallets)

  // 1. Dynamic Multi-Timeframe Chart Data (This Month, Last Month, Last 30 Days, Custom Month, All Time)
  const dynamicChartData = useMemo(() => {
    const now = new Date()
    let points: { dateStr: string; label: string; income: number; expense: number; transfer: number; activeValue: number }[] = []

    if (timeRange === "this_month" || timeRange === "last_month" || timeRange === "custom_month") {
      let targetMonthDate = now
      if (timeRange === "last_month") targetMonthDate = subMonths(now, 1)
      else if (timeRange === "custom_month") {
        try {
          targetMonthDate = parse(selectedCustomMonth, "yyyy-MM", new Date())
        } catch {
          targetMonthDate = now
        }
      }

      const start = startOfMonth(targetMonthDate)
      const end = endOfMonth(targetMonthDate)
      const days = eachDayOfInterval({ start, end })

      points = days.map(d => {
        const dateStr = format(d, "yyyy-MM-dd")
        const label = format(d, "d")
        const dayTxs = allTxs.filter(t => t.occurred_on === dateStr)
        const income = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const expense = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
        const transfer = dayTxs.filter(t => t.type === "transfer").reduce((s, t) => s + Number(t.amount || 0), 0)

        let activeValue = expense + income
        if (filter === "income") activeValue = income
        else if (filter === "expense") activeValue = expense
        else if (filter === "transfer") activeValue = transfer

        return { dateStr, label, income, expense, transfer, activeValue }
      })
    } else if (timeRange === "last_30") {
      for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i)
        const dateStr = format(d, "yyyy-MM-dd")
        const label = format(d, "d")
        const dayTxs = allTxs.filter(t => t.occurred_on === dateStr)
        const income = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const expense = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
        const transfer = dayTxs.filter(t => t.type === "transfer").reduce((s, t) => s + Number(t.amount || 0), 0)

        let activeValue = expense + income
        if (filter === "income") activeValue = income
        else if (filter === "expense") activeValue = expense
        else if (filter === "transfer") activeValue = transfer

        points.push({ dateStr, label, income, expense, transfer, activeValue })
      }
    } else if (timeRange === "all") {
      // Past 12 months trend
      for (let i = 11; i >= 0; i--) {
        const mDate = subMonths(now, i)
        const mStart = startOfMonth(mDate)
        const mEnd = endOfMonth(mDate)
        const label = format(mDate, "MMM")
        const dateStr = format(mDate, "yyyy-MM")

        const mTxs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const d = new Date(t.occurred_on)
          return isWithinInterval(d, { start: mStart, end: mEnd })
        })

        const income = mTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const expense = mTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
        const transfer = mTxs.filter(t => t.type === "transfer").reduce((s, t) => s + Number(t.amount || 0), 0)

        let activeValue = expense + income
        if (filter === "income") activeValue = income
        else if (filter === "expense") activeValue = expense
        else if (filter === "transfer") activeValue = transfer

        points.push({ dateStr, label, income, expense, transfer, activeValue })
      }
    }

    return points
  }, [allTxs, filter, timeRange, selectedCustomMonth])

  const totalPeriodAmount = useMemo(() => {
    return dynamicChartData.reduce((s, d) => s + d.activeValue, 0)
  }, [dynamicChartData])

  // 2. Filter & Search transactions with smart date range scoping & auto-archive
  const filteredTxs = useMemo(() => {
    const now = new Date()
    let txs = allTxs

    // Apply Time Range scoping
    if (timeRange === "this_month") {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      txs = txs.filter(t => {
        if (!t.occurred_on) return false
        const d = new Date(t.occurred_on)
        return isWithinInterval(d, { start, end })
      })
    } else if (timeRange === "last_month") {
      const prev = subMonths(now, 1)
      const start = startOfMonth(prev)
      const end = endOfMonth(prev)
      txs = txs.filter(t => {
        if (!t.occurred_on) return false
        const d = new Date(t.occurred_on)
        return isWithinInterval(d, { start, end })
      })
    } else if (timeRange === "last_30") {
      const start = startOfDay(subDays(now, 30))
      const end = endOfDay(now)
      txs = txs.filter(t => {
        if (!t.occurred_on) return false
        const d = new Date(t.occurred_on)
        return isWithinInterval(d, { start, end })
      })
    } else if (timeRange === "custom_month") {
      const parsedMonth = parse(selectedCustomMonth, "yyyy-MM", new Date())
      const start = startOfMonth(parsedMonth)
      const end = endOfMonth(parsedMonth)
      txs = txs.filter(t => {
        if (!t.occurred_on) return false
        const d = new Date(t.occurred_on)
        return isWithinInterval(d, { start, end })
      })
    } else if (timeRange === "all" && !showArchived) {
      // Auto-archive transactions older than 4 months in All view unless showArchived is checked
      const fourMonthsAgo = subMonths(now, 4)
      txs = txs.filter(t => {
        if (!t.occurred_on) return false
        const d = new Date(t.occurred_on)
        return d >= fourMonthsAgo
      })
    }

    if (filter !== "all") txs = txs.filter(t => t.type === filter)

    if (selectedWalletName) {
      const target = selectedWalletName.toLowerCase()
      txs = txs.filter(t => {
        const { from, to } = resolveWalletNames(t)
        return from.toLowerCase() === target || (t.type === "transfer" && to.toLowerCase() === target)
      })
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      txs = txs.filter(t => {
        const { from, to } = resolveWalletNames(t)
        return (
          t.note?.toLowerCase().includes(q) ||
          t.categories?.name?.toLowerCase().includes(q) ||
          from.toLowerCase().includes(q) ||
          to.toLowerCase().includes(q)
        )
      })
    }
    return txs
  }, [allTxs, filter, selectedWalletName, debouncedSearch, timeRange, selectedCustomMonth, showArchived, wallets])

  // 3. Group by date using all filteredTxs
  const { groupKeys, groupedTxs, groupCounts, flatTxs } = useMemo(() => {
    const g: Record<string, Transaction[]> = {}
    filteredTxs.forEach(tx => {
      const dateKey = tx.occurred_on || "Unknown"
      if (!g[dateKey]) g[dateKey] = []
      g[dateKey].push(tx)
    })
    
    const keys = Object.keys(g)
    const counts = keys.map(k => g[k].length)
    const flat = keys.flatMap(k => g[k])

    return { groupKeys: keys, groupedTxs: g, groupCounts: counts, flatTxs: flat }
  }, [filteredTxs])

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Outflow" },
    { key: "income", label: "Inflow" },
    { key: "transfer", label: "Transfer" },
  ]

  const maxBar = Math.max(...dynamicChartData.map(d => d.activeValue), 1)

  const selectedMonthLabel = useMemo(() => {
    if (timeRange === "this_month") return "This Month"
    if (timeRange === "last_month") return "Last Month"
    if (timeRange === "last_30") return "Last 30 Days"
    if (timeRange === "all") return "All Time"
    try {
      const parsed = parse(selectedCustomMonth, "yyyy-MM", new Date())
      return format(parsed, "MMMM yyyy")
    } catch {
      return "Custom Month"
    }
  }, [timeRange, selectedCustomMonth])

  return (
    <div className="min-h-screen relative" style={{ background: "var(--bg-base)" }}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} threshold={threshold} />
      {/* ====== HEADER ====== */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
              {filter === "income"
                ? `${selectedMonthLabel} Inflow`
                : filter === "expense"
                ? `${selectedMonthLabel} Outflow`
                : filter === "transfer"
                ? `${selectedMonthLabel} Transfers`
                : `${selectedMonthLabel} Activity`}
            </p>
            <p className="text-[32px] font-extrabold tracking-tight leading-tight amount" style={{ color: "var(--text-primary)" }}>
              {formatRupiah(totalPeriodAmount)}
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {dynamicChartData.length} data points · {selectedMonthLabel}
            </p>
          </div>

          {/* Month Selector Trigger */}
          <button
            onClick={() => { setMonthPickerOpen(true); triggerHaptic("light"); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl active:scale-95 transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)"
            }}
          >
            <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-[12px] font-extrabold" style={{ color: "var(--text-primary)" }}>
              {selectedMonthLabel}
            </span>
            <ChevronDown size={13} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* DYNAMIC TIMEFRAME GRADIENT BAR CHART */}
        <div className="h-[95px] w-full mb-3.5 flex items-end">
          {!shouldRenderHeavy ? (
            <div className="w-full flex justify-around items-end h-full px-2 pb-5">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="w-8 rounded-md bg-white/5 animate-pulse" style={{ height: `${Math.max(20, Math.random() * 80)}%` }} />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicChartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="activeBarGradDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                    <stop offset="100%" stopColor="#D4D4D8" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="inactiveBarGradDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.18} />
                  </linearGradient>
                  <linearGradient id="activeBarGradLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18181B" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3F3F46" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="inactiveBarGradLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18181B" stopOpacity={0.50} />
                    <stop offset="100%" stopColor="#18181B" stopOpacity={0.12} />
                  </linearGradient>
                </defs>
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "transparent" }} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval={dynamicChartData.length > 20 ? 4 : dynamicChartData.length > 10 ? 2 : 0}
                  tick={{ fill: "var(--text-tertiary)", fontSize: 9, fontWeight: 700 }}
                />
                <YAxis hide domain={[0, maxBar * 1.15]} />
                <Bar
                  dataKey="activeValue"
                  radius={[4, 4, 4, 4]}
                  maxBarSize={dynamicChartData.length > 20 ? 8 : dynamicChartData.length > 10 ? 16 : 28}
                >
                  {dynamicChartData.map((_, index) => {
                    const isCurrentDay = index === dynamicChartData.length - 1
                    const fillId = isDark
                      ? (isCurrentDay ? "url(#activeBarGradDark)" : "url(#inactiveBarGradDark)")
                      : (isCurrentDay ? "url(#activeBarGradLight)" : "url(#inactiveBarGradLight)")

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillId}
                        style={{ transition: "fill 0.3s ease" }}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Full-Width Search Bar with Inline Account Filter */}
        <div
          className="flex items-center pl-3.5 pr-2 py-1.5 rounded-2xl mb-3 glass-surface"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Search size={16} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search note, category, wallet..."
            className="w-full bg-transparent pl-2.5 pr-2 py-1 text-[13px] outline-none font-semibold"
            style={{ color: "var(--text-primary)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="p-1 rounded-full shrink-0 mr-1" style={{ color: "var(--text-tertiary)" }}>
              <X size={14} />
            </button>
          )}

          {/* Inline Account Filter Pill */}
          <div className="h-4 w-[1px] bg-white/10 shrink-0 mx-1" />
          <button
            onClick={() => { setAccountPickerOpen(true); triggerHaptic("light"); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl active:scale-95 transition-all shrink-0"
            style={{
              background: selectedWalletName ? "var(--accent)" : "var(--glass-fill)",
              color: selectedWalletName ? "var(--accent-ink)" : "var(--text-secondary)",
              border: selectedWalletName ? "1px solid var(--accent)" : "1px solid var(--glass-border)"
            }}
            title="Filter by Account"
          >
            <Wallet size={13} />
            <span className="text-[11px] font-extrabold max-w-[65px] truncate">
              {selectedWalletName || "Account"}
            </span>
            <ChevronDown size={11} className="opacity-70" />
          </button>
        </div>

        {/* Unified Clean Filter Tabs */}
        <div className="flex p-1 rounded-full glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {filterTabs.map(tab => {
            const isSelected = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); triggerHaptic("light"); }}
                className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--accent-ink)" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ====== TRANSACTION LIST ====== */}
      <div className="px-5 pb-36 space-y-5">
        {isLoading || !shouldRenderHeavy ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-[22px] animate-pulse" style={{ background: "var(--bg-elevated)" }} />
            ))}
          </div>
        ) : groupKeys.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {search ? "No matching transactions found" : "No transactions recorded for this period"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try searching with different keywords" : "Select another month or record a new transaction"}
            </p>
          </div>
        ) : (
          <GroupedVirtuoso
            customScrollParent={scrollParent || undefined}
            groupCounts={groupCounts}
            groupContent={index => {
              const dateKey = groupKeys[index]
              const txs = groupedTxs[dateKey]
              const dayTotal = txs.reduce((s, t) => {
                if (t.type === "income") return s + Number(t.amount)
                if (t.type === "expense") return s - Number(t.amount)
                return s
              }, 0)
              return (
                <div className="flex justify-between items-center px-1 pb-2 pt-4 bg-[var(--bg-base)]">
                  <span className="text-[12px] font-extrabold" style={{ color: "var(--text-secondary)" }}>
                    {getDateLabel(dateKey)}
                  </span>
                  <span className="text-[12px] font-bold amount" style={{ color: dayTotal >= 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                    {dayTotal > 0 ? "+" : ""}{formatRupiah(dayTotal)}
                  </span>
                </div>
              )
            }}
            itemContent={index => {
              const tx = flatTxs[index]
              const { from, to } = resolveWalletNames(tx)
              return (
                <div className="pb-2">
                  <TransactionItem
                    tx={tx}
                    categories={categories}
                    fromWalletName={from}
                    toWalletName={to}
                    onClick={(t) => { setEditingTx(t); setSheetOpen(true) }}
                  />
                </div>
              )
            }}
          />
        )}
      </div>

      {/* ====== 12-MONTH & YEAR SELECTOR BOTTOM SHEET ====== */}
      <BottomSheet isOpen={monthPickerOpen} onClose={() => setMonthPickerOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Select Timeframe</h3>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>Filter transactions by month or year</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "this_month", label: "This Month" },
              { key: "last_month", label: "Last Month" },
              { key: "last_30", label: "Last 30 Days" },
              { key: "all", label: "All Time" }
            ].map(preset => {
              const isSelected = timeRange === preset.key
              return (
                <button
                  key={preset.key}
                  onClick={() => {
                    setTimeRange(preset.key as TimeRangeType)
                    setMonthPickerOpen(false)
                  }}
                  className="py-2.5 px-3 rounded-2xl text-[12px] font-extrabold flex items-center justify-between active:scale-95 transition-all"
                  style={{
                    background: isSelected ? "var(--accent)" : "var(--bg-elevated)",
                    color: isSelected ? "var(--accent-ink)" : "var(--text-primary)",
                    border: isSelected ? "1px solid transparent" : "1px solid var(--glass-border)"
                  }}
                >
                  <span>{preset.label}</span>
                  {isSelected && <span className="text-[11px]">✓</span>}
                </button>
              )
            })}
          </div>

          {/* Elegant Year Selector Tabs */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Specific Month in Year
              </span>
              <span className="text-[12px] font-extrabold" style={{ color: "var(--text-primary)" }}>{pickerYear}</span>
            </div>

            {/* Year Selector Bar */}
            <div className="flex p-1 rounded-2xl mb-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              {[2026, 2025, 2024, 2023].map(y => {
                const isYSelected = pickerYear === y
                return (
                  <button
                    key={y}
                    onClick={() => setPickerYear(y)}
                    className="flex-1 py-1.5 rounded-xl text-[12px] font-extrabold transition-all"
                    style={{
                      background: isYSelected ? "var(--accent)" : "transparent",
                      color: isYSelected ? "var(--accent-ink)" : "var(--text-secondary)"
                    }}
                  >
                    {y}
                  </button>
                )
              })}
            </div>

            {/* 12-Month iOS Grid */}
            <div className="grid grid-cols-4 gap-2">
              {MONTHS_LIST.map(m => {
                const monthKey = `${pickerYear}-${m.code}`
                const isSelected = timeRange === "custom_month" && selectedCustomMonth === monthKey
                return (
                  <button
                    key={m.code}
                    onClick={() => {
                      setSelectedCustomMonth(monthKey)
                      setTimeRange("custom_month")
                      setMonthPickerOpen(false)
                    }}
                    className="p-3 rounded-2xl text-[12px] font-extrabold text-center active:scale-95 transition-all"
                    style={{
                      background: isSelected ? "var(--accent)" : "var(--bg-elevated)",
                      color: isSelected ? "var(--accent-ink)" : "var(--text-primary)",
                      border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                      boxShadow: isSelected ? "0 0 0 1px var(--accent-glow)" : "none"
                    }}
                  >
                    {m.short}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Smart Auto-Archive Option for All Time */}
          {timeRange === "all" && (
            <div className="p-3.5 rounded-2xl flex items-center justify-between mt-2"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}>
              <div className="flex items-center gap-2.5">
                <Archive size={16} style={{ color: "var(--text-tertiary)" }} />
                <div>
                  <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>Include Archived Data</p>
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Show records older than 4 months</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-white"
              />
            </div>
          )}
        </div>
      </BottomSheet>

      <TransactionSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingTx(null) }}
        transaction={editingTx}
      />

      {/* Account Picker Glass Sheet */}
      <BottomSheet isOpen={accountPickerOpen} onClose={() => setAccountPickerOpen(false)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Filter by Account</h3>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Show transactions from a specific account</p>
            </div>
            {selectedWalletName && (
              <button
                onClick={() => { setSelectedWalletName(null); setAccountPickerOpen(false); triggerHaptic("light"); }}
                className="text-[12px] font-bold px-3 py-1 rounded-full"
                style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {/* All Accounts Option */}
            <button
              onClick={() => { setSelectedWalletName(null); setAccountPickerOpen(false); triggerHaptic("light"); }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
              style={{
                background: selectedWalletName === null ? "var(--glass-fill-strong)" : "transparent",
                color: "var(--text-primary)",
                border: selectedWalletName === null ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: selectedWalletName === null ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <Wallet size={18} style={{ color: "var(--text-primary)" }} />
              </div>
              <span className="text-[11px] font-bold text-center line-clamp-1">
                All Accounts
              </span>
            </button>

            {/* Wallets */}
            {wallets.map(w => {
              const isSelected = selectedWalletName === w.name
              return (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWalletName(w.name); setAccountPickerOpen(false); triggerHaptic("light"); }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {w.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
