import { useState, useMemo, useEffect } from "react"
import { Search, X, ArrowLeftRight, Calendar, Clock, ChevronDown, Archive } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { useWallets } from "../hooks/useWallets"
import { TransactionSheet } from "../components/transactions/TransactionSheet"
import { BottomSheet } from "../components/ui/BottomSheet"
import type { Transaction } from "../lib/types"
import { formatRupiah, getDateLabel } from "../lib/utils"
import { IconRenderer } from "../components/ui/IconRenderer"
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parse } from "date-fns"
import famfinaRaw from "../data/famfina_transactions.json"

const famfinaMap = new Map<string, any>()
famfinaRaw.forEach((t: any) => {
  famfinaMap.set(`${t.occurred_on}_${t.amount}_${t.type}_${t.created_at}`, t)
})

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
  const [timeRange, setTimeRange] = useState<TimeRangeType>("this_month")
  const [selectedCustomMonth, setSelectedCustomMonth] = useState<string>(format(new Date(), "yyyy-MM"))
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear())
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [visibleCount, setVisibleCount] = useState(35)

  const { data: allTxs = [], isLoading } = useAllTransactions()
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()

  const isDark = document.documentElement.getAttribute("data-theme") !== "light"

  // Debounce search by 150ms for snappy 120Hz typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(timer)
  }, [search])

  const resolveWalletNames = (tx: Transaction) => {
    let fromName = wallets.find(w => w.id === tx.wallet_id)?.name
    let toName = wallets.find(w => w.id === tx.to_wallet_id)?.name
    if (!fromName || (tx.type === "transfer" && !toName)) {
      const sig = `${tx.occurred_on}_${tx.amount}_${tx.type}_${tx.created_at}`
      const hint = famfinaMap.get(sig)
      if (hint) {
        if (!fromName && hint.fromWallet) fromName = hint.fromWallet
        if (!toName && hint.toWallet) toName = hint.toWallet
      }
    }
    return {
      from: fromName || "Cash",
      to: toName || "BNI"
    }
  }

  // 1. Direct computation of past 7 days trend (Inflow + Outflow only, transfers excluded)
  const dynamicWeeklyData = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i)
      const dateStr = format(d, "yyyy-MM-dd")
      const label = format(d, "EEE")
      const dayTxs = allTxs.filter(t => t.occurred_on === dateStr)
      const income = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
      const expense = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
      const transfer = dayTxs.filter(t => t.type === "transfer").reduce((s, t) => s + Number(t.amount || 0), 0)

      let activeValue = expense + income
      if (filter === "income") activeValue = income
      else if (filter === "expense") activeValue = expense
      else if (filter === "transfer") activeValue = transfer

      days.push({
        dateStr,
        label,
        income,
        expense,
        transfer,
        activeValue
      })
    }
    return days
  }, [allTxs, filter])

  const totalPeriodAmount = useMemo(() => {
    return dynamicWeeklyData.reduce((s, d) => s + d.activeValue, 0)
  }, [dynamicWeeklyData])

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
      const start = subDays(now, 30)
      txs = txs.filter(t => {
        if (!t.occurred_on) return false
        const d = new Date(t.occurred_on)
        return d >= start && d <= now
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
  }, [allTxs, filter, debouncedSearch, timeRange, selectedCustomMonth, showArchived, wallets])

  // 3. Paginated slice for instant 120Hz DOM rendering
  const paginatedTxs = useMemo(() => {
    return filteredTxs.slice(0, visibleCount)
  }, [filteredTxs, visibleCount])

  // 4. Group by date
  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {}
    paginatedTxs.forEach(tx => {
      const dateKey = tx.occurred_on || "Unknown"
      if (!g[dateKey]) g[dateKey] = []
      g[dateKey].push(tx)
    })
    return g
  }, [paginatedTxs])

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Outflow" },
    { key: "income", label: "Inflow" },
    { key: "transfer", label: "Transfer" },
  ]

  const maxBar = Math.max(...dynamicWeeklyData.map(d => d.activeValue), 1)

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
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* ====== HEADER ====== */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
              {filter === "income" ? "Weekly Inflow" : filter === "expense" ? "Weekly Outflow" : filter === "transfer" ? "Weekly Transfers" : "Weekly Activity"}
            </p>
            <p className="text-[32px] font-extrabold tracking-tight leading-tight amount" style={{ color: "var(--text-primary)" }}>
              {formatRupiah(totalPeriodAmount)}
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>Past 7 days volume</p>
          </div>

          {/* Month Selector Trigger */}
          <button
            onClick={() => setMonthPickerOpen(true)}
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

        {/* 7-DAY RADIANT GRADIENT BAR CHART */}
        <div className="h-[95px] w-full mb-3.5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicWeeklyData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
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
                tick={{ fill: "var(--text-tertiary)", fontSize: 10, fontWeight: 700 }}
              />
              <YAxis hide domain={[0, maxBar * 1.15]} />
              <Bar dataKey="activeValue" radius={[6, 6, 6, 6]} maxBarSize={30}>
                {dynamicWeeklyData.map((_, index) => {
                  const isCurrentDay = index === dynamicWeeklyData.length - 1
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
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search note, category, wallet..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-[16px] outline-none font-semibold"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)"
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full" style={{ color: "var(--text-tertiary)" }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Unified Clean Filter Tabs */}
        <div className="flex p-1 rounded-full glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {filterTabs.map(tab => {
            const isSelected = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
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
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-[22px] animate-pulse" style={{ background: "var(--bg-elevated)" }} />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {search ? "No matching transactions found" : "No transactions recorded for this period"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try searching with different keywords" : "Select another month or record a new transaction"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateKey, txs]) => {
            const dayTotal = txs.reduce((s, t) => {
              if (t.type === "income") return s + Number(t.amount)
              if (t.type === "expense") return s - Number(t.amount)
              return s
            }, 0)

            return (
              <div key={dateKey} className="space-y-2">
                {/* Date Header */}
                <div className="flex justify-between items-center px-1">
                  <span className="text-[12px] font-extrabold" style={{ color: "var(--text-secondary)" }}>
                    {getDateLabel(dateKey)}
                  </span>
                  <span className="text-[12px] font-bold amount" style={{ color: dayTotal >= 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                    {dayTotal > 0 ? "+" : ""}{formatRupiah(dayTotal)}
                  </span>
                </div>

                {/* Items in Day */}
                <div className="space-y-2">
                  {txs.map(tx => {
                    const isIncome = tx.type === "income"
                    const isTransfer = tx.type === "transfer"
                    const { from: fromWalletName, to: toWalletName } = resolveWalletNames(tx)
                    const timeLabel = tx.created_at ? format(new Date(tx.created_at), "HH:mm") : ""

                    return (
                      <div
                        key={tx.id}
                        onClick={() => { setEditingTx(tx); setSheetOpen(true) }}
                        className="p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                          boxShadow: "var(--shadow-card)"
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative shrink-0"
                            style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                            {isTransfer ? (
                              <ArrowLeftRight size={18} style={{ color: "var(--text-primary)" }} />
                            ) : (
                              <IconRenderer icon={tx.categories?.emoji || "/icons/lainnya.png"} size="w-6 h-6" />
                            )}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow"
                              style={{
                                background: isTransfer ? "var(--text-primary)" : isIncome ? "var(--accent)" : "var(--bg-elevated)",
                                color: isTransfer ? "var(--bg-base)" : isIncome ? "var(--accent-ink)" : "var(--text-tertiary)",
                                border: "1.5px solid var(--bg-elevated)"
                              }}>
                              {isTransfer ? "⇄" : isIncome ? "+" : "-"}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[14px] leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                              {isTransfer ? `${fromWalletName} to ${toWalletName}` : (tx.categories?.name || "General")}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                              {timeLabel && (
                                <span className="flex items-center gap-0.5 font-bold amount">
                                  <Clock size={10} />
                                  {timeLabel} ·
                                </span>
                              )}
                              <span className="truncate">{tx.note || (isTransfer ? "Transfer" : fromWalletName)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="amount font-extrabold text-[14px]"
                            style={{ color: isTransfer ? "var(--text-primary)" : isIncome ? "var(--accent)" : "var(--text-primary)" }}>
                            {isTransfer ? "" : isIncome ? "+" : "-"}{formatRupiah(Number(tx.amount))}
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                            {isTransfer ? "Transfer" : isIncome ? "Inflow" : "Outflow"}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* Load More Button for 'All Time' / High Volume Filter */}
        {filteredTxs.length > visibleCount && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisibleCount(c => c + 35)}
              className="px-6 py-2.5 rounded-full text-[12px] font-bold active:scale-95 transition-all"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            >
              Load More ({filteredTxs.length - visibleCount} remaining)
            </button>
          </div>
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
                    setVisibleCount(35)
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
                      setVisibleCount(35)
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
    </div>
  )
}
