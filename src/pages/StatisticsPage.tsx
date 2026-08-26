import { triggerHaptic } from "../lib/haptics"
import { useWallets, getWalletIcon } from "../hooks/useWallets"
import { resolveFamfinaWallet } from "../lib/famfinaResolver"
import { useCategories, getCategoryParent } from "../hooks/useCategories"
import { CreditCard, Layers, Calendar } from "lucide-react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, ArrowDownCircle, ArrowUpCircle, TrendingUp, ChevronRight, ChevronLeft } from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, AreaChart, Area
} from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { formatRupiah } from "../lib/utils"
import { BottomSheet } from "../components/ui/BottomSheet"
import { IconRenderer } from "../components/ui/IconRenderer"
import { useTheme } from "../contexts/ThemeContext"
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, getDay, isToday } from "date-fns"

type Range = "week" | "month" | "year" | "all"
type BreakdownType = "expense" | "income"
type GroupMode = "category" | "parent"

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
  const { theme } = useTheme()
  const isDark = theme !== "light"
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const strokeDashoffset = circ - (rate / 100) * circ
  const ringColor = isDark ? "#FFFFFF" : "#121212"
  const trackColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={isNaN(strokeDashoffset) ? circ : strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="amount text-[20px] font-extrabold" style={{ color: "var(--text-primary)" }}>
          {rate.toFixed(0)}%
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>Saved</span>
      </div>
    </div>
  )
}

function useChartColors() {
  const { theme } = useTheme()
  const isDark = theme !== "light"
  return useMemo(() => ({
    donut: isDark
      ? ["#FFFFFF", "#D1D1D6", "#AEAEB2", "#8E8E93", "#636366", "#48484A", "#3A3A3C"]
      : ["#121212", "#2C2C2E", "#3A3A3C", "#636366", "#8E8E93", "#AEAEB2", "#D1D1D6"],
    barHigh: isDark ? "#FFFFFF" : "#121212",
    barMid: isDark ? "#AEAEB2" : "#636366",
    barLow: isDark ? "#3A3A3C" : "#D1D1D6",
    lineStroke: isDark ? "#FFFFFF" : "#121212",
    cursorFill: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"
  }), [isDark])
}

export function StatisticsPage() {
  const { theme } = useTheme()
  const isDark = theme !== "light"
  const [range, setRange] = useState<Range>("month")
  const [breakdownType, setBreakdownType] = useState<BreakdownType>("expense")
  const [groupMode, setGroupMode] = useState<GroupMode>("category")
  const [allDetailsOpen, setAllDetailsOpen] = useState(false)
  const now = new Date()
  const { data: allTxs = [] } = useAllTransactions()
  const { data: wallets = [] } = useWallets()
  const { data: categories = [] } = useCategories()
  const [walletFilterType, setWalletFilterType] = useState<"all" | "expense" | "income">("all")
  const [monthOffset, setMonthOffset] = useState(0)
  const colors = useChartColors()

  const isTxCorrection = (t: any) => t.type === "adjustment" || t.note?.toLowerCase().includes("correction") || t.note?.toLowerCase().includes("balance adjustment") || t.note?.toLowerCase().includes("koreksi saldo")

  // 1. Filter by range with exact ISO string boundaries
  const rangeTxs = useMemo(() => {
    let startStr: string
    let endStr: string
    if (range === "week") {
      startStr = format(subDays(now, 6), "yyyy-MM-dd")
      endStr = format(now, "yyyy-MM-dd")
    } else if (range === "month") {
      const targetMonth = subMonths(now, monthOffset)
      startStr = format(startOfMonth(targetMonth), "yyyy-MM-dd")
      endStr = format(endOfMonth(targetMonth), "yyyy-MM-dd")
    } else if (range === "year") {
      startStr = format(startOfYear(now), "yyyy-MM-dd")
      endStr = format(endOfYear(now), "yyyy-MM-dd")
    } else {
      return allTxs
    }
    return allTxs.filter(t => {
      if (!t.occurred_on) return false
      return t.occurred_on >= startStr && t.occurred_on <= endStr
    })
  }, [allTxs, range, monthOffset])

  const { totalIncome, totalExpense } = useMemo(() => ({
    totalIncome: rangeTxs.filter(t => t.type === "income" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
    totalExpense: rangeTxs.filter(t => t.type === "expense" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
  }), [rangeTxs])

  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0

  // Month-over-Month Delta Calculation (comparing to previous month)
  const { prevIncome, prevExpense } = useMemo(() => {
    const prevDate = subMonths(now, monthOffset + 1)
    const start = format(startOfMonth(prevDate), "yyyy-MM-dd")
    const end = format(endOfMonth(prevDate), "yyyy-MM-dd")
    const pTxs = allTxs.filter(t => t.occurred_on && t.occurred_on >= start && t.occurred_on <= end)
    return {
      prevIncome: pTxs.filter(t => t.type === "income" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
      prevExpense: pTxs.filter(t => t.type === "expense" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0)
    }
  }, [allTxs, now, monthOffset])

  const getDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? { pct: 100, isUp: true } : null
    const diff = curr - prev
    const pct = Math.round((Math.abs(diff) / prev) * 100)
    return { pct, isUp: diff >= 0, diff }
  }

  const incomeDelta = useMemo(() => getDelta(totalIncome, prevIncome), [totalIncome, prevIncome])
  const expenseDelta = useMemo(() => getDelta(totalExpense, prevExpense), [totalExpense, prevExpense])
  const netDelta = useMemo(() => getDelta(totalIncome - totalExpense, prevIncome - prevExpense), [totalIncome, totalExpense, prevIncome, prevExpense])

  const healthScore = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return 75
    if (totalIncome > 0 && totalExpense === 0) return 100
    if (totalIncome === 0 && totalExpense > 0) {
      if (totalExpense < 1000000) return 65
      if (totalExpense < 5000000) return 50
      return 35
    }
    const ratio = totalExpense / totalIncome
    if (ratio >= 2.0) return 20
    if (ratio >= 1.5) return Math.max(20, Math.round(35 - (ratio - 1.5) * 30))
    if (ratio > 1.0) return Math.round(55 - (ratio - 1.0) * 40)
    if (ratio >= 0.8) return Math.round(65 + (1.0 - ratio) * 50)
    if (ratio >= 0.4) return Math.round(75 + (0.8 - ratio) * 35)
    return Math.min(100, Math.round(90 + (0.4 - ratio) * 25))
  }, [totalIncome, totalExpense])

  // Single-pass Pre-aggregated Monthly Map for ultra-fast All-Time and Year rendering
  const monthlyAggregates = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    for (let i = 0; i < allTxs.length; i++) {
      const t = allTxs[i]
      if (!t.occurred_on || t.type === "transfer" || isTxCorrection(t)) continue
      const key = t.occurred_on.slice(0, 7)
      let entry = map.get(key)
      if (!entry) {
        entry = { income: 0, expense: 0 }
        map.set(key, entry)
      }
      const amt = Number(t.amount || 0)
      if (t.type === "income") entry.income += amt
      else if (t.type === "expense") entry.expense += amt
    }
    return map
  }, [allTxs])

  // 2. Trend bar chart data with high performance O(1) monthly lookups
  const trendData = useMemo(() => {
    if (range === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i)
        const dStr = format(d, "yyyy-MM-dd")
        const txs = allTxs.filter(t => t.occurred_on === dStr)
        return {
          label: format(d, "EEE"),
          income: txs.filter(t => t.type === "income" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs.filter(t => t.type === "expense" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
        }
      })
    } else if (range === "month") {
      const targetMonthDate = subMonths(now, monthOffset)
      const currentYear = targetMonthDate.getFullYear()
      const currentMonth = targetMonthDate.getMonth()
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
          const [y, m, d] = t.occurred_on.split("-").map(Number)
          if (y !== currentYear || (m - 1) !== currentMonth) return false
          return d >= w.startDay && d <= w.endDay
        })
        return {
          label: w.label,
          income: txs.filter(t => t.type === "income" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
          expense: txs.filter(t => t.type === "expense" && !isTxCorrection(t)).reduce((s, t) => s + Number(t.amount || 0), 0),
        }
      })
    } else if (range === "year") {
      const currentYear = now.getFullYear()
      return Array.from({ length: 12 }, (_, m) => {
        const d = new Date(currentYear, m, 1)
        const key = format(d, "yyyy-MM")
        const agg = monthlyAggregates.get(key) || { income: 0, expense: 0 }
        return {
          label: format(d, "MMM"),
          income: agg.income,
          expense: agg.expense,
        }
      })
    } else {
      // All Time: 8 recent aggregated monthly points with instant O(1) retrieval
      return Array.from({ length: 8 }, (_, i) => {
        const d = subMonths(now, 7 - i)
        const key = format(d, "yyyy-MM")
        const agg = monthlyAggregates.get(key) || { income: 0, expense: 0 }
        return {
          label: format(d, "MMM"),
          income: agg.income,
          expense: agg.expense,
        }
      })
    }
  }, [allTxs, range, monthOffset, monthlyAggregates])

  // 3. Cumulative Net Worth trend
  const netWorthData = useMemo(() => {
    let cumulative = 0
    return trendData.map(d => {
      cumulative += (d.income - d.expense)
      return { label: d.label, net: cumulative }
    })
  }, [trendData])


  // Most Active Accounts Calculation (Apple macOS Style)
  const walletUsageStats = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; count: number; totalExpense: number; totalIncome: number }>()

    rangeTxs.forEach(tx => {
      if (tx.type === "transfer") return
      const resolved = resolveFamfinaWallet(tx, wallets)
      const walletName = resolved.from || "Cash"
      const amt = Number(tx.amount || 0)

      const entry = map.get(walletName) || {
        name: walletName,
        icon: getWalletIcon(walletName),
        count: 0,
        totalExpense: 0,
        totalIncome: 0
      }

      entry.count += 1
      if (tx.type === "expense") entry.totalExpense += amt
      else if (tx.type === "income") entry.totalIncome += amt

      map.set(walletName, entry)
    })

    const list = Array.from(map.values())
    if (walletFilterType === "expense") {
      return list.filter(w => w.totalExpense > 0).sort((a, b) => b.totalExpense - a.totalExpense)
    }
    if (walletFilterType === "income") {
      return list.filter(w => w.totalIncome > 0).sort((a, b) => b.totalIncome - a.totalIncome)
    }
    return list.sort((a, b) => (b.totalExpense + b.totalIncome) - (a.totalExpense + a.totalIncome))
  }, [rangeTxs, wallets, walletFilterType])

  const maxWalletVolume = useMemo(() => {
    if (walletUsageStats.length === 0) return 1
    return Math.max(...walletUsageStats.map(w =>
      walletFilterType === "expense" ? w.totalExpense : walletFilterType === "income" ? w.totalIncome : (w.totalExpense + w.totalIncome)
    ))
  }, [walletUsageStats, walletFilterType])

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

  // 4. Category breakdown (Detailed) with Envelope Budget metadata
  const categoryStats = useMemo(() => {
    const catMap = new Map<string, { name: string; emoji: string; total: number; count: number; budget_amount: number | null }>()
    const userCatMap = new Map<string, { emoji: string; budget_amount: number | null }>()
    categories.forEach(c => userCatMap.set(c.name.trim().toLowerCase(), { emoji: c.emoji, budget_amount: c.budget_amount ?? null }))

    rangeTxs.filter(t => t.type === breakdownType).forEach(t => {
      const name = t.categories?.name || "Lainnya"
      const meta = userCatMap.get(name.trim().toLowerCase())
      const emoji = t.categories?.emoji || meta?.emoji || (breakdownType === "income" ? "/icons/gaji.png" : "/icons/lainnya.png")
      const budget_amount = t.categories?.budget_amount ?? meta?.budget_amount ?? null
      const amt = Number(t.amount || 0)
      const ex = catMap.get(name)
      if (ex) { ex.total += amt; ex.count++ }
      else catMap.set(name, { name, emoji, total: amt, count: 1, budget_amount })
    })
    return Array.from(catMap.values()).sort((a, b) => b.total - a.total)
  }, [rangeTxs, breakdownType, categories])

  // 4b. Macro Parent (Induk) breakdown
  const parentCategoryStats = useMemo(() => {
    const parentMap = new Map<string, { name: string; total: number; count: number }>()
    rangeTxs.filter(t => t.type === breakdownType).forEach(t => {
      const catName = t.categories?.name || "Lainnya"
      const parentName = getCategoryParent(catName)
      const amt = Number(t.amount || 0)
      const ex = parentMap.get(parentName)
      if (ex) { ex.total += amt; ex.count++ }
      else parentMap.set(parentName, { name: parentName, total: amt, count: 1 })
    })
    return Array.from(parentMap.values()).sort((a, b) => b.total - a.total)
  }, [rangeTxs, breakdownType])

  const activeBreakdownData = groupMode === "parent" ? parentCategoryStats : categoryStats
  const totalBreakdownAmount = activeBreakdownData.reduce((s, c) => s + c.total, 0)

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

  // Priority 4: Largest Category Change (MoM)
  const categoryMoMShifts = useMemo(() => {
    const prevDate = subMonths(now, monthOffset + 1)
    const start = format(startOfMonth(prevDate), "yyyy-MM-dd")
    const end = format(endOfMonth(prevDate), "yyyy-MM-dd")
    const prevTxs = allTxs.filter(t => t.occurred_on && t.occurred_on >= start && t.occurred_on <= end && t.type === breakdownType && !isTxCorrection(t))

    const prevMap = new Map<string, number>()
    prevTxs.forEach(t => {
      const key = groupMode === "parent" ? getCategoryParent(t.categories?.name || "Lainnya") : (t.categories?.name || "Lainnya")
      prevMap.set(key, (prevMap.get(key) || 0) + Number(t.amount || 0))
    })

    const shifts: { name: string; current: number; prev: number; diff: number; pct: number }[] = []
    activeBreakdownData.forEach(cat => {
      const current = cat.total
      const prev = prevMap.get(cat.name) || 0
      const diff = current - prev
      const pct = prev > 0 ? Math.round((diff / prev) * 100) : (current > 0 ? 100 : 0)
      shifts.push({ name: cat.name, current, prev, diff, pct })
    })

    const sortedByIncrease = [...shifts].filter(s => s.diff > 0).sort((a, b) => b.diff - a.diff)
    const sortedByDecrease = [...shifts].filter(s => s.diff < 0).sort((a, b) => a.diff - b.diff)

    return {
      biggestIncrease: sortedByIncrease[0] || null,
      biggestDecrease: sortedByDecrease[0] || null
    }
  }, [allTxs, now, monthOffset, breakdownType, groupMode, activeBreakdownData])

  // Priority 5: Expense Frequency vs Volume Insights
  const frequencyStats = useMemo(() => {
    if (activeBreakdownData.length === 0) return null
    const mostFrequent = [...activeBreakdownData].sort((a, b) => b.count - a.count)[0]
    const largestTicket = [...activeBreakdownData].sort((a, b) => (b.total / Math.max(1, b.count)) - (a.total / Math.max(1, a.count)))[0]
    return { mostFrequent, largestTicket }
  }, [activeBreakdownData])

  // Priority 6: Average Transaction Size & MoM Comparison
  const avgTransactionStats = useMemo(() => {
    const expenseTxs = rangeTxs.filter(t => t.type === "expense" && !isTxCorrection(t))
    const avgExpense = expenseTxs.length > 0 ? Math.round(totalExpense / expenseTxs.length) : 0

    const prevDate = subMonths(now, monthOffset + 1)
    const start = format(startOfMonth(prevDate), "yyyy-MM-dd")
    const end = format(endOfMonth(prevDate), "yyyy-MM-dd")
    const prevExpenseTxs = allTxs.filter(t => t.occurred_on && t.occurred_on >= start && t.occurred_on <= end && t.type === "expense" && !isTxCorrection(t))
    const prevAvgExpense = prevExpenseTxs.length > 0 ? Math.round(prevExpense / prevExpenseTxs.length) : 0
    const avgDelta = getDelta(avgExpense, prevAvgExpense)

    return {
      avgExpense,
      avgDelta,
      count: expenseTxs.length
    }
  }, [rangeTxs, totalExpense, allTxs, now, monthOffset, prevExpense])

  // Priority 10: Calendar Spending Heatmap Data
  const calendarSpendingHeatmap = useMemo(() => {
    const targetMonth = subMonths(now, monthOffset)
    const start = startOfMonth(targetMonth)
    const end = endOfMonth(targetMonth)
    const days = eachDayOfInterval({ start, end })

    const dailySpendMap = new Map<string, number>()
    days.forEach(d => dailySpendMap.set(format(d, "yyyy-MM-dd"), 0))

    allTxs.forEach(t => {
      if (t.type !== "expense" || !t.occurred_on || isTxCorrection(t)) return
      if (dailySpendMap.has(t.occurred_on)) {
        dailySpendMap.set(t.occurred_on, (dailySpendMap.get(t.occurred_on) || 0) + Number(t.amount || 0))
      }
    })

    const amounts = Array.from(dailySpendMap.values())
    const maxSpend = Math.max(1, ...amounts)
    const pad = getDay(start)

    return {
      days,
      pad,
      dailySpendMap,
      maxSpend,
      targetMonth
    }
  }, [allTxs, now, monthOffset])
  
  const rangeTitle = useMemo(() => {
    if (range === "week") return "This Week"
    if (range === "month") {
      return format(subMonths(now, monthOffset), "MMMM yyyy")
    }
    if (range === "year") return "This Year"
    return "All Time"
  }, [range, monthOffset])

  return (
    <div className="px-5 py-6 space-y-5 pb-36" style={{ minHeight: "100dvh" }}>
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
            onClick={() => { setRange(r); triggerHaptic("light"); }}
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

      {/* Month Navigator when Month is active */}
      {range === "month" && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          <button
            onClick={() => { setMonthOffset(o => o + 1); triggerHaptic("light"); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-extrabold text-[13px]" style={{ color: "var(--text-primary)" }}>
            {format(subMonths(now, monthOffset), "MMMM yyyy")}
          </span>
          <button
            disabled={monthOffset === 0}
            onClick={() => { setMonthOffset(o => Math.max(0, o - 1)); triggerHaptic("light"); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none"
            style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

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
            {healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : healthScore >= 50 ? "Moderate" : healthScore >= 16 ? "Deficit" : "Critical"}
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

      {/* 2-column mini stat cards (Savings Rate & Average Expense) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Savings Ring card */}
        <div className="p-4 rounded-[22px] glass-surface flex flex-col items-center">
          <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-tertiary)" }}>Savings Rate</p>
          <SavingsRing rate={savingsRate} size={110} />
        </div>
        {/* Average Transaction Size & Count Card (Priority 6) */}
        <div className="p-4 rounded-[22px] glass-surface flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-tertiary)" }}>Avg Expense</p>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <p className="amount text-[17px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(avgTransactionStats.avgExpense)}
              </p>
              {avgTransactionStats.avgDelta && range === "month" && (
                <span className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
                  {avgTransactionStats.avgDelta.isUp ? "↑" : "↓"} {avgTransactionStats.avgDelta.pct}%
                </span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--glass-border)]">
            <div className="flex justify-between items-center text-[10px]">
              <span style={{ color: "var(--text-tertiary)" }}>Activity:</span>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>{avgTransactionStats.count} txs</span>
            </div>
            <div className="flex justify-between items-center text-[10px] mt-1">
              <span style={{ color: "var(--text-tertiary)" }}>Total Out:</span>
              <span className="amount font-bold" style={{ color: "var(--text-primary)" }}>{formatRupiah(totalExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex justify-between items-center mb-3">
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
              {activeBreakdownData.length} {groupMode === "parent" ? "parent groups" : "categories"} · {rangeTitle}
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

        {/* Sub-toggle: By Category vs By Parent (Induk) */}
        <div className="flex items-center gap-1.5 mb-4 p-1 rounded-xl w-fit" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          <button
            onClick={() => setGroupMode("category")}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all"
            style={{
              background: groupMode === "category" ? "var(--glass-fill-strong)" : "transparent",
              color: groupMode === "category" ? "var(--text-primary)" : "var(--text-tertiary)"
            }}
          >
            By Category
          </button>
          <button
            onClick={() => setGroupMode("parent")}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1"
            style={{
              background: groupMode === "parent" ? "var(--glass-fill-strong)" : "transparent",
              color: groupMode === "parent" ? "var(--text-primary)" : "var(--text-tertiary)"
            }}
          >
            <Layers size={10} />
            By Parent (Induk)
          </button>
        </div>

        {activeBreakdownData.length > 0 ? (
          <>
            <div className="flex justify-center mb-5">
              <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                <PieChart width={200} height={200}>
                  <Pie data={activeBreakdownData.map((c, i) => ({ name: c.name, value: c.total, fill: colors.donut[i % colors.donut.length] }))}
                    cx="50%" cy="50%" innerRadius={62} outerRadius={92} dataKey="value" paddingAngle={3}
                    stroke="none" labelLine={false} label={renderCustomizedLabel}>
                    {activeBreakdownData.map((_, i) => (
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
              {activeBreakdownData.slice(0, 6).map((cat, i) => {
                const pct = totalBreakdownAmount > 0 ? Math.round((cat.total / totalBreakdownAmount) * 100) : 0
                const avgCat = cat.count > 0 ? Math.round(cat.total / cat.count) : 0
                return (
                  <div key={cat.name} className="flex items-center justify-between px-2.5 py-2 rounded-xl"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.donut[i % colors.donut.length] }} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate max-w-[65px]" style={{ color: "var(--text-primary)" }}>{cat.name}</p>
                        <p className="text-[9px] font-medium" style={{ color: "var(--text-tertiary)" }}>Avg {formatRupiah(avgCat)}</p>
                      </div>
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

            {/* Largest Category Change (Priority 4 — Strict Monochrome) & Frequency Insights (Priority 5) */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
              {categoryMoMShifts.biggestIncrease && (
                <div className="p-2.5 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Biggest Increase</p>
                  <p className="text-[12px] font-extrabold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {categoryMoMShifts.biggestIncrease.name}
                  </p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    ↑ {categoryMoMShifts.biggestIncrease.pct}% (+{formatRupiah(categoryMoMShifts.biggestIncrease.diff)})
                  </p>
                </div>
              )}
              {categoryMoMShifts.biggestDecrease ? (
                <div className="p-2.5 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Biggest Decrease</p>
                  <p className="text-[12px] font-extrabold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {categoryMoMShifts.biggestDecrease.name}
                  </p>
                  <p className="text-[10px] font-bold mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    ↓ {Math.abs(categoryMoMShifts.biggestDecrease.pct)}% (-{formatRupiah(Math.abs(categoryMoMShifts.biggestDecrease.diff))})
                  </p>
                </div>
              ) : frequencyStats?.mostFrequent && (
                <div className="p-2.5 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Most Frequent</p>
                  <p className="text-[12px] font-extrabold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {frequencyStats.mostFrequent.name}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
                    {frequencyStats.mostFrequent.count} txs · Avg {formatRupiah(Math.round(frequencyStats.mostFrequent.total / frequencyStats.mostFrequent.count))}
                  </p>
                </div>
              )}
            </div>

            {/* Category Envelope Budgets Progress with Budget Risk Badges (Strict Monochrome) */}
            {breakdownType === "expense" && categoryStats.some(c => c.budget_amount && c.budget_amount > 0) && (
              <div className="mt-4 pt-3 border-t border-[var(--glass-border)] space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    Category Budget Progress
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                    Envelope Tracking
                  </span>
                </div>
                {categoryStats.filter(c => c.budget_amount && c.budget_amount > 0).map(cat => {
                  const budget = cat.budget_amount!
                  const spent = cat.total
                  const pct = Math.round((spent / budget) * 100)
                  const daysElapsed = now.getDate()
                  const timePct = (daysElapsed / 30) * 100
                  let catRisk: "SAFE" | "WATCH" | "AT RISK" = "SAFE"
                  if (pct >= 95 || pct > timePct + 20) catRisk = "AT RISK"
                  else if (pct > timePct + 5) catRisk = "WATCH"

                  return (
                    <div key={cat.name} className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                          <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                          <span
                            className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: catRisk === "AT RISK" ? "var(--text-primary)" : "var(--glass-fill-strong)",
                              color: catRisk === "AT RISK" ? "var(--bg-canvas)" : "var(--text-primary)",
                              border: "1px solid var(--glass-border)"
                            }}
                          >
                            {catRisk}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="amount text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                            {formatRupiah(spent)} / {formatRupiah(budget)}
                          </span>
                          <span className="text-[11px] font-extrabold ml-1.5" style={{ color: "var(--text-secondary)" }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            background: "var(--text-primary)"
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>No {breakdownType} recorded</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>Try another timeframe</p>
          </div>
        )}
      </div>

      {/* 📅 Financial Calendar Spending Heatmap (Priority 10) */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: "var(--text-tertiary)" }} />
              <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                Spending Density & Heatmap
              </h2>
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Daily expense cluster · {rangeTitle}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {["S","M","T","W","T","F","S"].map((w, i) => (
              <div key={i} className="text-[9px] font-bold" style={{ color: "var(--text-tertiary)" }}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calendarSpendingHeatmap.pad }).map((_, i) => <div key={`pad-${i}`} />)}
            {calendarSpendingHeatmap.days.map(d => {
              const dStr = format(d, "yyyy-MM-dd")
              const spent = calendarSpendingHeatmap.dailySpendMap.get(dStr) || 0
              const intensity = calendarSpendingHeatmap.maxSpend > 0 ? spent / calendarSpendingHeatmap.maxSpend : 0
              const isT = isToday(d)

              let bg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"
              let textColor = "var(--text-tertiary)"
              if (spent > 0) {
                if (isDark) {
                  if (intensity > 0.6) {
                    bg = "#FFFFFF"
                    textColor = "#0A0A0B"
                  } else if (intensity > 0.3) {
                    bg = "rgba(255,255,255,0.45)"
                    textColor = "#FFFFFF"
                  } else {
                    bg = "rgba(255,255,255,0.18)"
                    textColor = "rgba(255,255,255,0.9)"
                  }
                } else {
                  if (intensity > 0.6) {
                    bg = "#18181B"
                    textColor = "#FFFFFF"
                  } else if (intensity > 0.3) {
                    bg = "rgba(24,24,27,0.5)"
                    textColor = "#FFFFFF"
                  } else {
                    bg = "rgba(24,24,27,0.18)"
                    textColor = "#18181B"
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
                    border: isT ? "1px solid var(--accent)" : "1px solid transparent"
                  }}
                  title={`${format(d, "dd MMM")}: ${spent > 0 ? formatRupiah(spent) : "No spend"}`}
                >
                  <span className="text-[10px] font-extrabold">{d.getDate()}</span>
                  {spent > 0 && (
                    <span className="text-[7px] font-bold opacity-80 scale-90 leading-none mt-0.5">
                      {spent >= 1000000 ? (spent / 1000000).toFixed(0) + "M" : spent >= 1000 ? (spent / 1000).toFixed(0) + "K" : spent}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>


      {/* 🍎 Apple macOS Style: Most Active Accounts & Volume Distribution */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} style={{ color: "var(--text-tertiary)" }} />
              <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                Most Active Accounts
              </h2>
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {walletUsageStats.length} accounts · {rangeTitle}
            </p>
          </div>
          <div className="flex p-1 rounded-full" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["all", "expense", "income"] as const).map(t => (
              <button
                key={t}
                onClick={() => setWalletFilterType(t)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all"
                style={{
                  background: walletFilterType === t ? "var(--accent)" : "transparent",
                  color: walletFilterType === t ? "var(--accent-ink)" : "var(--text-secondary)"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {walletUsageStats.length > 0 ? (
          <div className="space-y-2.5">
            {walletUsageStats.slice(0, 6).map((w, idx) => {
              const activeVal = walletFilterType === "expense" ? w.totalExpense : walletFilterType === "income" ? w.totalIncome : (w.totalExpense + w.totalIncome)
              const pct = maxWalletVolume > 0 ? Math.min(100, Math.max(8, (activeVal / maxWalletVolume) * 100)) : 0

              return (
                <div
                  key={w.name}
                  className="p-3.5 rounded-2xl transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--shadow-card)"
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                      >
                        <IconRenderer icon={w.icon} size="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>{w.name}</p>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "var(--glass-fill-strong)", color: "var(--text-tertiary)", border: "1px solid var(--glass-border)" }}
                          >
                            {w.count} txs
                          </span>
                        </div>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {walletFilterType === "all" ? `In: ${formatRupiah(w.totalIncome)} · Out: ${formatRupiah(w.totalExpense)}` : `Total ${walletFilterType}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount font-extrabold text-[14px]" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(activeVal)}
                      </span>
                    </div>
                  </div>

                  {/* macOS Sleek Progress Gauge */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: idx === 0 ? "var(--accent)" : idx === 1 ? "var(--text-primary)" : "var(--text-secondary)",
                        opacity: idx === 0 ? 1 : idx === 1 ? 0.75 : 0.45
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>No account activity recorded</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>Try selecting another timeframe</p>
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

      {/* Net Income Summary Row with MoM Delta */}
      <div className="p-5 rounded-[24px]"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
            Period Summary · {rangeTitle}
          </p>
          {range === "month" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--glass-fill)", color: "var(--text-tertiary)", border: "1px solid var(--glass-border)" }}>
              vs prev month
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total In", value: totalIncome, delta: range === "month" ? incomeDelta : null, isExpense: false },
            { label: "Total Out", value: totalExpense, delta: range === "month" ? expenseDelta : null, isExpense: true },
            { label: "Net", value: totalIncome - totalExpense, delta: range === "month" ? netDelta : null, isNet: true },
          ].map(({ label, value, delta, isExpense, isNet }) => {
            const abs = Math.abs(value)
            let formatted = "0"
            if (abs >= 1000000) {
              formatted = (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M"
            } else if (abs >= 1000) {
              formatted = (abs / 1000).toFixed(0) + "K"
            } else {
              formatted = abs.toLocaleString("id-ID")
            }
            const sign = isNet ? (value < 0 ? "-" : value > 0 ? "+" : "") : ""
            return (
              <div key={label} className="text-center p-2 rounded-2xl flex flex-col justify-between" style={{ background: "var(--glass-fill)" }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-tertiary)" }}>{label}</p>
                  <p className="amount text-[14px] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
                    {sign}{formatted}
                  </p>
                </div>
                {delta && (
                  <div className="mt-1.5 pt-1 border-t border-[var(--glass-border)] flex items-center justify-center gap-0.5">
                    <span
                      className="text-[10px] font-bold flex items-center"
                      style={{
                        color: isExpense
                          ? (delta.isUp ? "#ef4444" : "var(--accent)")
                          : (delta.isUp ? "var(--accent)" : "var(--text-tertiary)")
                      }}
                    >
                      {delta.isUp ? "↑" : "↓"} {delta.pct}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
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
        <div className="p-5 pb-12 space-y-4">
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

          <div className="space-y-2.5">
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

