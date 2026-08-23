import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, ArrowDownCircle, ArrowUpCircle, TrendingUp, ChevronRight } from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, AreaChart, Area
} from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { formatRupiah } from "../lib/utils"
import { BottomSheet } from "../components/ui/BottomSheet"
import { IconRenderer } from "../components/ui/IconRenderer"
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

type Range = "week" | "month" | "year" | "all"
type BreakdownType = "expense" | "income"

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
      <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
          <span style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500 }}>
            {p.name === "income" ? "Inflow: " : p.name === "expense" ? "Outflow: " : p.name === "net" ? "Net Growth: " : ""}
          </span>
          {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  )
}

function SavingsRing({ rate, size = 130 }: { rate: number; size?: number }) {
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min(1, Math.max(0, rate / 100)) * circ
  const cx = size / 2
  const cy = size / 2

  const getColor = (isDark: boolean, pct: number) => {
    if (pct >= 70) return isDark ? "#FFFFFF" : "#18181B"
    if (pct >= 40) return isDark ? "#D4D4D8" : "#3F3F46"
    return isDark ? "#71717A" : "#71717A"
  }

  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  const ringColor = getColor(isDark, rate)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated-2)" strokeWidth={10} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={ringColor} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={22} fontWeight="800"
        fontFamily="Urbanist, sans-serif" fill="var(--text-primary)">
        {rate.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={10} fontWeight="600"
        fontFamily="Urbanist, sans-serif" fill="var(--text-tertiary)">
        Savings
      </text>
    </svg>
  )
}

function useChartColors() {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  return {
    barHigh: isDark ? "#FFFFFF" : "#18181B",
    barMid: isDark ? "#A1A1AA" : "#52525B",
    barLow: isDark ? "#52525B" : "#A1A1AA",
    lineStroke: isDark ? "#FFFFFF" : "#18181B",
    areaFillStart: isDark ? "rgba(255,255,255,0.2)" : "rgba(18,18,27,0.12)",
    areaFillEnd: "rgba(0,0,0,0)",
    donut: isDark
      ? ["#FFFFFF", "#D4D4D8", "#A1A1AA", "#71717A", "#3F3F46", "#27272A"]
      : ["#18181B", "#3F3F46", "#52525B", "#71717A", "#A1A1AA", "#D4D4D8"],
    labelFill: isDark ? "#121212" : "#FFFFFF",
    cursorFill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  }
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)
  if (percent < 0.05) return null
  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  return (
    <text x={x} y={y} fill={isDark ? "#121212" : "#FFFFFF"} textAnchor="middle" dominantBaseline="central"
      fontSize={10} fontWeight="800" fontFamily="Urbanist">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function StatisticsPage() {
  const [range, setRange] = useState<Range>("month")
  const [breakdownType, setBreakdownType] = useState<BreakdownType>("expense")
  const [allDetailsOpen, setAllDetailsOpen] = useState(false)
  const now = new Date()
  const { data: allTxs = [] } = useAllTransactions()
  const colors = useChartColors()

  // 1. Filter by range
  const rangeTxs = useMemo(() => {
    let start: Date
    let end: Date
    if (range === "week") {
      start = subDays(now, 6)
      end = now
    } else if (range === "month") {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else if (range === "year") {
      start = startOfYear(now)
      end = endOfYear(now)
    } else {
      // All time
      return allTxs
    }
    return allTxs.filter(t => {
      if (!t.occurred_on) return false
      const d = new Date(t.occurred_on)
      return !isNaN(d.getTime()) && d >= start && d <= end
    })
  }, [allTxs, range])

  const { totalIncome, totalExpense } = useMemo(() => ({
    totalIncome: rangeTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0),
    totalExpense: rangeTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0),
  }), [rangeTxs])

  const spendingRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0

  const healthScore = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return 85
    if (totalIncome === 0) return 40
    if (spendingRatio <= 50) return 98
    if (spendingRatio <= 70) return 88
    if (spendingRatio <= 90) return 74
    if (spendingRatio <= 100) return 60
    return 35
  }, [totalIncome, totalExpense, spendingRatio])

  // 2. Trend bar chart data with exact mathematical consistency
  const trendData = useMemo(() => {
    if (range === "week") {
      // 7 Days
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i)
        const dStr = format(d, "yyyy-MM-dd")
        const txs = allTxs.filter(t => t.occurred_on === dStr)
        return {
          label: format(d, "EEE"),
          income: txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0),
        }
      })
    } else if (range === "month") {
      // 5 Weeks of the current month
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      const weeks = [
        { label: "W1 (1-7)", startDay: 1, endDay: 7 },
        { label: "W2 (8-14)", startDay: 8, endDay: 14 },
        { label: "W3 (15-21)", startDay: 15, endDay: 21 },
        { label: "W4 (22-28)", startDay: 22, endDay: 28 },
        { label: "W5 (29+)", startDay: 29, endDay: 31 },
      ]
      return weeks.map(w => {
        const txs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const td = new Date(t.occurred_on)
          if (td.getFullYear() !== currentYear || td.getMonth() !== currentMonth) return false
          const day = td.getDate()
          return day >= w.startDay && day <= w.endDay
        })
        return {
          label: w.label,
          income: txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0),
        }
      })
    } else if (range === "year") {
      // 12 Months of current year
      const currentYear = now.getFullYear()
      return Array.from({ length: 12 }, (_, m) => {
        const d = new Date(currentYear, m, 1)
        const txs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const td = new Date(t.occurred_on)
          return td.getFullYear() === currentYear && td.getMonth() === m
        })
        return {
          label: format(d, "MMM"),
          income: txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0),
        }
      })
    } else {
      // All Time (8 Months history)
      return Array.from({ length: 8 }, (_, i) => {
        const d = subMonths(now, 7 - i)
        const y = d.getFullYear()
        const m = d.getMonth()
        const txs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const td = new Date(t.occurred_on)
          return td.getFullYear() === y && td.getMonth() === m
        })
        return {
          label: format(d, "MMM"),
          income: txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0),
        }
      })
    }
  }, [allTxs, range])

  // 3. Cumulative Net Worth trend
  const netWorthData = useMemo(() => {
    let cumulative = 0
    return trendData.map(d => {
      cumulative += (d.income - d.expense)
      return { label: d.label, net: cumulative }
    })
  }, [trendData])

  // 4. Category breakdown
  const categoryStats = useMemo(() => {
    const catMap = new Map<string, { name: string; emoji: string; total: number; count: number }>()
    rangeTxs.filter(t => t.type === breakdownType).forEach(t => {
      const name = t.categories?.name || "Lainnya"
      const emoji = t.categories?.emoji || (breakdownType === "income" ? "/icons/gaji.png" : "/icons/lainnya.png")
      const amt = Number(t.amount || 0)
      const ex = catMap.get(name)
      if (ex) { ex.total += amt; ex.count++ }
      else catMap.set(name, { name, emoji, total: amt, count: 1 })
    })
    return Array.from(catMap.values()).sort((a, b) => b.total - a.total)
  }, [rangeTxs, breakdownType])

  // 5. Hashtag breakdown
  const hashtagStats = useMemo(() => {
    const hashMap = new Map<string, { total: number; count: number }>()
    rangeTxs.forEach(t => {
      const amt = Number(t.amount || 0)
      if (t.note) {
        const matches = t.note.match(/#\w+/g)
        if (matches) {
          matches.forEach(m => {
            const tag = m.toLowerCase()
            const ex = hashMap.get(tag)
            if (ex) { ex.total += amt; ex.count++ }
            else hashMap.set(tag, { total: amt, count: 1 })
          })
        }
      }
    })
    return Array.from(hashMap.entries())
      .map(([tag, data]) => ({ tag, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [rangeTxs])
  
  const totalBreakdownAmount = categoryStats.reduce((s, c) => s + c.total, 0)
  const rangeTitle = range === "week" ? "This Week" : range === "month" ? "This Month" : range === "year" ? "This Year" : "All Time"

  return (
    <div className="px-5 py-6 space-y-5 pb-32" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Analytics</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Performance & Distribution</p>
        </div>
      </div>

      {/* Range Toggle */}
      <div className="flex p-1 rounded-full glass-surface">
        {(["week", "month", "year", "all"] as Range[]).map(r => (
          <motion.button key={r}
            onClick={() => setRange(r)}
            className="flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200"
            style={{
              background: range === r ? "var(--accent)" : "transparent",
              color: range === r ? "var(--accent-ink)" : "var(--text-secondary)",
            }}
            whileTap={{ scale: 0.97 }}>
            {r === "week" ? "Week" : r === "month" ? "Month" : r === "year" ? "Year" : "All"}
          </motion.button>
        ))}
      </div>

      {/* Financial Health Hero */}
      <section className="card-contrast-hero p-5 relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF" }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Financial Health</p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                {rangeTitle} performance
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.18)" }}>
            {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "Moderate"}
          </span>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <span className="amount text-[40px] font-extrabold leading-none text-white">{healthScore}</span>
          <span className="text-[12px] font-medium pb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>/ 100 pts</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${healthScore}%`, background: "#FFFFFF" }} />
        </div>
      </section>

      {/* 2-column mini stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Savings Ring card */}
        <div className="p-4 rounded-[22px] glass-surface flex flex-col items-center">
          <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-tertiary)" }}>Savings Rate</p>
          <SavingsRing rate={savingsRate} size={110} />
        </div>
        {/* Cash Flow card */}
        <div className="p-4 rounded-[22px] glass-surface flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-tertiary)" }}>Cash Flow</p>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.barHigh }} />
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>Inflow</p>
            </div>
            <p className="amount text-[16px] font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>{formatRupiah(totalIncome)}</p>
            <div className="flex items-center gap-1.5 mb-1 mt-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.barMid }} />
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>Outflow</p>
            </div>
            <p className="amount text-[16px] font-extrabold" style={{ color: "var(--text-primary)" }}>{formatRupiah(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                {breakdownType === "expense" ? "Expense Breakdown" : "Income Breakdown"}
              </h2>
              {categoryStats.length > 0 && (
                <button
                  onClick={() => setAllDetailsOpen(true)}
                  className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95 transition-transform"
                  style={{ color: "var(--text-secondary)" }}
                >
                  All Details <ChevronRight size={13} />
                </button>
              )}
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {categoryStats.length} categories · {rangeTitle}
            </p>
          </div>
          <div className="flex p-1 rounded-full" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <button onClick={() => setBreakdownType("expense")}
              className="px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1"
              style={{ background: breakdownType === "expense" ? "var(--accent)" : "transparent", color: breakdownType === "expense" ? "var(--accent-ink)" : "var(--text-secondary)" }}>
              <ArrowDownCircle size={11} /> Out
            </button>
            <button onClick={() => setBreakdownType("income")}
              className="px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1"
              style={{ background: breakdownType === "income" ? "var(--accent)" : "transparent", color: breakdownType === "income" ? "var(--accent-ink)" : "var(--text-secondary)" }}>
              <ArrowUpCircle size={11} /> In
            </button>
          </div>
        </div>

        {categoryStats.length > 0 ? (
          <>
            <div className="flex justify-center mb-5">
              <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                <PieChart width={200} height={200}>
                  <Pie data={categoryStats.map((c, i) => ({ name: c.name, value: c.total, fill: colors.donut[i % colors.donut.length] }))}
                    cx="50%" cy="50%" innerRadius={62} outerRadius={92} dataKey="value" paddingAngle={3}
                    stroke="none" labelLine={false} label={renderCustomizedLabel}>
                    {categoryStats.map((_, i) => (
                      <Cell key={i} fill={colors.donut[i % colors.donut.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
                <div className="absolute text-center pointer-events-none">
                  <p className="amount text-[18px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                    {totalBreakdownAmount >= 1000000
                      ? (totalBreakdownAmount / 1000000).toFixed(1) + "M"
                      : (totalBreakdownAmount / 1000).toFixed(0) + "K"}
                  </p>
                  <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {breakdownType === "expense" ? "Total Out" : "Total In"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categoryStats.slice(0, 6).map((cat, i) => {
                const pct = totalBreakdownAmount > 0 ? Math.round((cat.total / totalBreakdownAmount) * 100) : 0
                return (
                  <div key={cat.name} className="flex items-center justify-between px-2.5 py-2 rounded-xl"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.donut[i % colors.donut.length] }} />
                      <span className="text-[11px] font-bold truncate max-w-[65px]" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount text-[11px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="py-10 text-center rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>No {breakdownType} recorded</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>Try another timeframe</p>
          </div>
        )}
      </div>

      {/* Inflow vs Outflow Bar Chart */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="mb-4">
          <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
            Inflow vs Outflow Trend
          </h2>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{rangeTitle} comparison</p>
        </div>
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={range === "year" || range === "all" ? 7 : 10} barGap={2}>
              <defs>
                <linearGradient id="inflowG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.barHigh} stopOpacity={1} />
                  <stop offset="100%" stopColor={colors.barMid} stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="outflowG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.barMid} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={colors.barLow} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontWeight: 600, fontFamily: "Urbanist" }} axisLine={false} tickLine={false} dy={6} />
              <YAxis hide />
              <Tooltip content={<GlassTooltip />} cursor={{ fill: colors.cursorFill, radius: 6 }} />
              <Bar dataKey="income" name="income" fill="url(#inflowG)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill="url(#outflowG)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-5 mt-4 justify-center">
          <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: colors.barHigh }} /> Inflow
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: colors.barMid }} /> Outflow
          </div>
        </div>
      </div>

      {/* Cumulative Net Worth Line Chart */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: "var(--text-tertiary)" }} />
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Net Capital Trajectory</h2>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Cumulative net worth change ({rangeTitle})</p>
          </div>
        </div>
        <div className="h-[160px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.lineStroke} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={colors.lineStroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} opacity={0.35} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontWeight: 600, fontFamily: "Urbanist" }} axisLine={false} tickLine={false} dy={6} />
              <YAxis hide />
              <Tooltip content={<GlassTooltip />} cursor={{ stroke: colors.lineStroke, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="net" name="net" stroke={colors.lineStroke} strokeWidth={2.5}
                fill="url(#netG)" fillOpacity={1} dot={false} activeDot={{ r: 4, fill: colors.lineStroke }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Income Summary Row */}
      <div className="p-5 rounded-[24px]"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>
          Period Summary · {rangeTitle}
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total In", value: totalIncome, icon: "↑" },
            { label: "Total Out", value: totalExpense, icon: "↓" },
            { label: "Net", value: totalIncome - totalExpense, icon: "=" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-tertiary)" }}>{icon} {label}</p>
              <p className="amount text-[13px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                {value >= 1000000 ? (value / 1000000).toFixed(1) + "M" : value >= 1000 ? (value / 1000).toFixed(0) + "K" : value.toFixed(0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Hashtag Summary */}
      {hashtagStats.length > 0 && (
        <div className="p-5 rounded-[24px]" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Event & Hashtag Tracking</h2>
            <span className="text-[10px] font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>{rangeTitle}</span>
          </div>
          <div className="space-y-2">
            {hashtagStats.slice(0, 5).map(h => (
              <div key={h.tag} className="flex justify-between items-center p-2 rounded-xl" style={{ background: "var(--glass-fill)" }}>
                <div>
                  <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{h.tag}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{h.count} txs</p>
                </div>
                <p className="text-[13px] font-bold amount" style={{ color: "var(--text-primary)" }}>{formatRupiah(h.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehensive Category Breakdown BottomSheet */}
      <BottomSheet isOpen={allDetailsOpen} onClose={() => setAllDetailsOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>
                {breakdownType === "expense" ? "All Expense Categories" : "All Income Categories"}
              </h3>
              <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                {categoryStats.length} categories · Total {formatRupiah(totalBreakdownAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {categoryStats.map((cat, i) => {
              const pct = totalBreakdownAmount > 0 ? ((cat.total / totalBreakdownAmount) * 100).toFixed(1) : "0.0"
              const barColor = colors.donut[i % colors.donut.length]

              return (
                <div
                  key={cat.name}
                  className="p-3.5 rounded-2xl flex items-center justify-between"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                      <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                        {cat.name}
                      </p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {cat.count} {cat.count === 1 ? "transaction" : "transactions"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="amount text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(cat.total)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated-2)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="amount text-[11px] font-bold" style={{ color: "var(--text-tertiary)" }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

