import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, X, ArrowLeftRight, TrendingDown, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { useWallets } from "../hooks/useWallets"
import { TransactionSheet } from "../components/transactions/TransactionSheet"
import type { Transaction } from "../lib/types"
import { formatRupiah, getDateLabel } from "../lib/utils"
import { IconRenderer } from "../components/ui/IconRenderer"
import { format, subDays } from "date-fns"
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

export function TransactionsPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")

  const { data: allTxs = [], isLoading } = useAllTransactions()
  const { data: wallets = [] } = useWallets()

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

  // 2. Filter & Search transactions
  const filteredTxs = useMemo(() => {
    let txs = allTxs
    if (filter !== "all") txs = txs.filter(t => t.type === filter)
    if (search) {
      const q = search.toLowerCase()
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
  }, [allTxs, filter, search, wallets])

  // 3. Group by date
  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {}
    filteredTxs.forEach(tx => {
      const dateKey = tx.occurred_on || "Unknown"
      if (!g[dateKey]) g[dateKey] = []
      g[dateKey].push(tx)
    })
    return g
  }, [filteredTxs])

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expense", label: "Outflow" },
    { key: "income", label: "Inflow" },
    { key: "transfer", label: "Transfer" },
  ]

  const maxBar = Math.max(...dynamicWeeklyData.map(d => d.activeValue), 1)

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* ====== HEADER ====== */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
              {filter === "income" ? "Weekly Inflow" : filter === "expense" ? "Weekly Outflow" : filter === "transfer" ? "Weekly Transfers" : "Weekly Activity"}
            </p>
            <p className="text-[32px] font-extrabold tracking-tight leading-tight amount" style={{ color: "var(--text-primary)" }}>
              {formatRupiah(totalPeriodAmount)}
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>Past 7 days volume</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full glass-surface flex items-center justify-center">
              {filter === "income" ? (
                <TrendingUp size={18} style={{ color: "var(--accent)" }} />
              ) : (
                <TrendingDown size={18} style={{ color: "var(--accent)" }} />
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Bar chart weekly */}
        {dynamicWeeklyData.some(d => d.activeValue > 0) && (
          <div className="h-[95px] mb-4 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicWeeklyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={22}>
                <defs>
                  <linearGradient id="txBarHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0.85}/>
                  </linearGradient>
                  <linearGradient id="txBarMid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4D4D8" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#52525B" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="txBarLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#71717A" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#27272A" stopOpacity={0.25}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "Urbanist, sans-serif", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis hide />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)", radius: 6 }} />
                <Bar dataKey="activeValue" radius={[6, 6, 0, 0]}>
                  {dynamicWeeklyData.map((entry, index) => {
                    const ratio = entry.activeValue / maxBar
                    const fill = ratio > 0.65 ? "url(#txBarHigh)" : ratio > 0.3 ? "url(#txBarMid)" : "url(#txBarLow)"
                    return <Cell key={`cell-${index}`} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search note, category, wallet..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-[13px] outline-none font-semibold"
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

        {/* Filter Pills */}
        <div className="flex p-1 rounded-full glass-surface">
          {filterTabs.map(tab => {
            const isSelected = filter === tab.key
            return (
              <motion.button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--accent-ink)" : "var(--text-secondary)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                {tab.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ====== LIST TRANSAKSI ====== */}
      <div className="px-5 pb-36 space-y-5">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-[22px] animate-pulse" style={{ background: "var(--bg-elevated)" }} />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              {search ? "No matching transactions" : "No transactions yet"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try searching with another keyword" : "Start logging your expenses & income"}
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

                    return (
                      <motion.div
                        key={tx.id}
                        onClick={() => { setEditingTx(tx); setSheetOpen(true) }}
                        className="p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                          boxShadow: "var(--shadow-card)"
                        }}
                        whileTap={{ scale: 0.98 }}
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
                            <p className="text-[11px] font-semibold mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                              {tx.note || (isTransfer ? "Transfer" : fromWalletName)}
                            </p>
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
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })
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
