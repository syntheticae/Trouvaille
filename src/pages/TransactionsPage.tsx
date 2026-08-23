import { useState, useMemo, useEffect } from "react"
import { Search, X, ArrowLeftRight, Calendar, Clock } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { useWallets } from "../hooks/useWallets"
import { TransactionSheet } from "../components/transactions/TransactionSheet"
import type { Transaction } from "../lib/types"
import { formatRupiah, getDateLabel } from "../lib/utils"
import { IconRenderer } from "../components/ui/IconRenderer"
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns"
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

type FilterType = "all" | "income" | "expense" | "transfer"
type TimeRangeType = "this_month" | "last_month" | "last_30" | "all"

export function TransactionsPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [timeRange, setTimeRange] = useState<TimeRangeType>("this_month")
  const [visibleCount, setVisibleCount] = useState(35)

  const { data: allTxs = [], isLoading } = useAllTransactions()
  const { data: wallets = [] } = useWallets()

  // Debounce search by 150ms for snappy typing
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

  // 1. Direct computation of past 7 days trend for all 4 filter types
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

  // 2. Filter & Search transactions with smart date range scoping
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
  }, [allTxs, filter, debouncedSearch, timeRange, wallets])

  // 3. Paginated slice for smooth DOM performance
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

  const timeRangeTabs: { key: TimeRangeType; label: string }[] = [
    { key: "this_month", label: "Bulan Ini" },
    { key: "last_month", label: "Bulan Lalu" },
    { key: "last_30", label: "30 Hari" },
    { key: "all", label: "Semua" },
  ]

  const maxBar = Math.max(...dynamicWeeklyData.map(d => d.activeValue), 1)

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
        </div>

        {/* 7-DAY MINI BAR CHART */}
        <div className="h-[95px] w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicWeeklyData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
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
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isCurrentDay ? "var(--accent)" : "var(--glass-fill-strong)"}
                      style={{ transition: "fill 0.3s ease" }}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Search */}
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

        {/* Time Range Pills (Bulan Ini, Bulan Lalu, 30 Hari, Semua) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 mb-3">
          <Calendar size={13} className="shrink-0 ml-1" style={{ color: "var(--text-tertiary)" }} />
          {timeRangeTabs.map(tab => {
            const isSelected = timeRange === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => { setTimeRange(tab.key); setVisibleCount(35) }}
                className="px-3 py-1 rounded-full text-[11px] font-bold shrink-0 active:scale-95 transition-all"
                style={{
                  background: isSelected ? "var(--accent)" : "var(--bg-elevated)",
                  color: isSelected ? "var(--accent-ink)" : "var(--text-secondary)",
                  border: isSelected ? "1px solid transparent" : "1px solid var(--glass-border)"
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Transaction Type Filter Pills */}
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

      {/* ====== LIST TRANSAKSI ====== */}
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
              {search ? "No matching transactions" : "Tidak ada transaksi pada periode ini"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try searching with another keyword" : "Pilih periode 'Semua' atau catat transaksi baru"}
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

        {/* Load More Button for 'All' / High Volume Filter */}
        {filteredTxs.length > visibleCount && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisibleCount(c => c + 35)}
              className="px-6 py-2.5 rounded-full text-[12px] font-bold active:scale-95 transition-all"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            >
              Muat Lebih Banyak ({filteredTxs.length - visibleCount} tersisa)
            </button>
          </div>
        )}
      </div>

      <TransactionSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingTx(null) }}
        transaction={editingTx}
      />
    </div>
  )
}
