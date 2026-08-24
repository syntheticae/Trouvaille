import { GoalDetailModal } from "../components/goals/GoalDetailModal"
import { usePullToRefresh } from "../hooks/usePullToRefresh"
import { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator"
import { useGoals } from "../hooks/useGoals"
import { useWallets } from "../hooks/useWallets"
import { useBills } from "../hooks/useBills"
import { CalendarDays, Target } from "lucide-react"
import { triggerHaptic } from "../lib/haptics"

function formatNetAmount(net: number): string {
  const abs = Math.abs(net)
  let val = ""
  if (abs >= 1000000) {
    val = (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "m"
  } else if (abs >= 1000) {
    val = Math.round(abs / 1000) + "k"
  } else {
    val = abs.toString()
  }
  return net < 0 ? `-${val}` : `+${val}`
}

﻿import { useState, useMemo } from "react"
import { Bell, ArrowUpRight, TrendingUp, TrendingDown, Sparkles, PiggyBank, Flame, Eye, EyeOff } from "lucide-react"
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { useAllTransactions } from "../hooks/useTransactions"
import { useUpcomingBills, getDaysUntilDue } from "../hooks/useBills"
import { formatRupiah } from "../lib/utils"
import { IconRenderer } from "../components/ui/IconRenderer"
import {
  format, isToday, isSameDay, eachDayOfInterval, startOfMonth, endOfMonth,
  getDay, subDays, subMonths
} from "date-fns"
import { BottomSheet } from "../components/ui/BottomSheet"
import { BalanceCard } from "../components/ui/BalanceCard"
import { NotificationSheet } from "../components/ui/NotificationSheet"
import { useAuth } from "../contexts/AuthContext"
import { useCategories } from "../hooks/useCategories"
import { useBudgetTarget } from "../hooks/useBudgetTarget"

interface HomePageProps {
  onOpenAdd?: () => void
}

type StockRange = "1D" | "1W" | "1M" | "6M" | "YTD" | "1Y" | "ALL"

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--glass-border)",
      borderRadius: 12,
      padding: "6px 10px",
      boxShadow: "0 8px 24px var(--shadow-strength)"
    }}>
      <p style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 700 }}>{label}</p>
      <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}>{formatRupiah(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

function formatAxisY(val: number): string {
  if (Math.abs(val) >= 1000000000) return (val / 1000000000).toFixed(1) + "B"
  if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + "M"
  if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + "K"
  return String(val)
}

export function HomePage({ onOpenAdd: _onOpenAdd }: HomePageProps) {
  const now = new Date()
  const { session } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [stockRange, setStockRange] = useState<StockRange>("1W")
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem("trouvaille_hide_balance") === "true")

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev
      localStorage.setItem("trouvaille_hide_balance", String(next))
      triggerHaptic("medium")
      return next
    })
  }

  const upcomingBills = useUpcomingBills()
  const { budgetTarget } = useBudgetTarget()
  const { data: allTxs = [], refetch: refetchAllTxs } = useAllTransactions()
  const { data: categories = [], refetch: refetchCategories } = useCategories()
  const { refetch: refetchWallets } = useWallets()
  const { refetch: refetchBills } = useBills()
  const { goals, depositToGoal, updateGoal, deleteGoal } = useGoals()
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetchAllTxs(),
        refetchWallets(),
        refetchCategories(),
        refetchBills(),
      ])
    }
  })

  // 1. Total Balance and Apple Stocks Layout Data Calculation
  const assetData = useMemo(() => {
    let currentBalance = 0
    allTxs.forEach(tx => {
      if (tx.type === "income") currentBalance += Number(tx.amount || 0)
      else if (tx.type === "expense") currentBalance -= Number(tx.amount || 0)
    })

    const chartData: { label: string; balance: number }[] = []
    let diff = 0
    let percent = 0
    let periodInflow = 0
    let periodOutflow = 0

    if (stockRange === "1D") {
      // Today (1 Day)
      const todayStr = format(now, "yyyy-MM-dd")
      const todayTxs = allTxs.filter(t => t.occurred_on === todayStr)
      const todayIn = todayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
      const todayOut = todayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
      const startBalance = currentBalance - (todayIn - todayOut)

      chartData.push({ label: "Open", balance: startBalance })
      chartData.push({ label: "Mid", balance: startBalance + todayIn * 0.5 - todayOut * 0.5 })
      chartData.push({ label: "Now", balance: currentBalance })

      diff = currentBalance - startBalance
      percent = startBalance === 0 ? 0 : (diff / Math.abs(startBalance)) * 100
      periodInflow = todayIn
      periodOutflow = todayOut
    } else if (stockRange === "1W") {
      // 1 Week (7 Days)
      let temp = currentBalance
      for (let i = 0; i < 7; i++) {
        const d = subDays(now, i)
        const dStr = format(d, "yyyy-MM-dd")
        const dayTxs = allTxs.filter(t => t.occurred_on === dStr)
        const dayIn = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const dayOut = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)

        chartData.unshift({ label: format(d, "d"), balance: temp })
        periodInflow += dayIn
        periodOutflow += dayOut
        temp = temp - (dayIn - dayOut)
      }
      const startBal = chartData[0]?.balance ?? 0
      diff = currentBalance - startBal
      percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
    } else if (stockRange === "1M") {
      // 1 Month (30 Days)
      let temp = currentBalance
      for (let i = 0; i < 30; i++) {
        const d = subDays(now, i)
        const dStr = format(d, "yyyy-MM-dd")
        const dayTxs = allTxs.filter(t => t.occurred_on === dStr)
        const dayIn = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const dayOut = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)

        if (i % 5 === 0 || i === 0 || i === 29) {
          chartData.unshift({ label: format(d, "d MMM"), balance: temp })
        }
        periodInflow += dayIn
        periodOutflow += dayOut
        temp = temp - (dayIn - dayOut)
      }
      const startBal = temp
      diff = currentBalance - startBal
      percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
    } else if (stockRange === "6M") {
      // 6 Months (Weekly Points)
      let temp = currentBalance
      for (let w = 0; w < 24; w++) {
        const d = subDays(now, w * 7)
        const weekTxs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const td = new Date(t.occurred_on)
          return td <= d && td > subDays(d, 7)
        })
        const wIn = weekTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const wOut = weekTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)

        if (w % 4 === 0 || w === 0) {
          chartData.unshift({ label: format(d, "MMM d"), balance: temp })
        }
        periodInflow += wIn
        periodOutflow += wOut
        temp = temp - (wIn - wOut)
      }
      const startBal = temp
      diff = currentBalance - startBal
      percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
    } else if (stockRange === "YTD" || stockRange === "1Y") {
      // Year to date / 1 Year
      const currentYear = now.getFullYear()
      let temp = 0
      for (let m = 0; m <= now.getMonth(); m++) {
        const d = new Date(currentYear, m, 1)
        const mTxs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const td = new Date(t.occurred_on)
          return td.getFullYear() === currentYear && td.getMonth() === m
        })
        const mIn = mTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const mOut = mTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)

        periodInflow += mIn
        periodOutflow += mOut
        temp += (mIn - mOut)
        chartData.push({ label: format(d, "MMM"), balance: temp })
      }
      const startBal = chartData[0]?.balance ?? 0
      diff = currentBalance - startBal
      percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
    } else {
      // ALL Time (8 Monthly Points)
      let temp = 0
      for (let i = 7; i >= 0; i--) {
        const d = subMonths(now, i)
        const y = d.getFullYear()
        const m = d.getMonth()
        const mTxs = allTxs.filter(t => {
          if (!t.occurred_on) return false
          const td = new Date(t.occurred_on)
          return td.getFullYear() === y && td.getMonth() === m
        })
        const mIn = mTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
        const mOut = mTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)

        periodInflow += mIn
        periodOutflow += mOut
        temp += (mIn - mOut)
        chartData.push({ label: format(d, "MMM yy"), balance: temp })
      }
      diff = currentBalance
      percent = chartData[0]?.balance ? ((currentBalance - chartData[0].balance) / Math.abs(chartData[0].balance)) * 100 : 100
    }

    const balances = chartData.map(d => d.balance)
    const highBalance = Math.max(...balances, currentBalance)
    const lowBalance = Math.min(...balances, currentBalance)

    return {
      currentBalance,
      chartData,
      diff,
      percent,
      highBalance,
      lowBalance,
      periodInflow,
      periodOutflow
    }
  }, [allTxs, stockRange])

  // 2. Current Month Financial Calculations
  const currentMonthStats = useMemo(() => {
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    let income = 0
    let expense = 0
    const catMap = new Map<string, { name: string; emoji: string; total: number; count: number }>()

    allTxs.forEach(t => {
      if (!t.occurred_on) return
      const d = new Date(t.occurred_on)
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const amt = Number(t.amount || 0)
        if (t.type === "income") income += amt
        else if (t.type === "expense") {
          expense += amt
          const catName = t.categories?.name || "Lainnya"
          const emoji = t.categories?.emoji || "/icons/lainnya.png"
          const ex = catMap.get(catName) || { name: catName, emoji, total: 0, count: 0 }
          ex.total += amt
          ex.count += 1
          catMap.set(catName, ex)
        }
      }
    })

    const topExpList = Array.from(catMap.values()).sort((a, b) => b.total - a.total)
    return {
      income,
      expense,
      topExpense: topExpList[0] || null
    }
  }, [allTxs])

  const totalIncome = currentMonthStats.income
  const totalExpense = currentMonthStats.expense
  const topExpense = currentMonthStats.topExpense

  const netCashflow = totalIncome - totalExpense
  const isPositiveCashflow = netCashflow >= 0
  const daysInMonth = now.getDate()
  const dailyAverage = daysInMonth > 0 ? totalExpense / daysInMonth : 0

  // 3. Calendar heatmap calculations
  const calStart = startOfMonth(now)
  const calEnd = endOfMonth(now)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })
  const calPad = getDay(calStart)

  const monthlyStats = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    allTxs.forEach(tx => {
      const dStr = tx.occurred_on
      if (!dStr) return
      const txDate = new Date(dStr)
      if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return
      const existing = map.get(dStr) || { income: 0, expense: 0 }
      if (tx.type === "income") existing.income += Number(tx.amount || 0)
      else if (tx.type === "expense") existing.expense += Number(tx.amount || 0)
      map.set(dStr, existing)
    })
    let maxSurplus = 0, maxDeficit = 0
    map.forEach(({ income, expense }) => {
      const net = income - expense
      if (net > 0 && net > maxSurplus) maxSurplus = net
      if (net < 0 && Math.abs(net) > maxDeficit) maxDeficit = Math.abs(net)
    })
    return { map, maxSurplus, maxDeficit }
  }, [allTxs])

  const dayData = (d: Date) => {
    const dStr = format(d, "yyyy-MM-dd")
    const data = monthlyStats.map.get(dStr) || { income: 0, expense: 0 }
    return { income: data.income, expense: data.expense, hasTx: monthlyStats.map.has(dStr) }
  }

  const lerpHex = (from: [number, number, number], to: [number, number, number], t: number): string => {
    const r = Math.round(from[0] + (to[0] - from[0]) * t)
    const g = Math.round(from[1] + (to[1] - from[1]) * t)
    const b = Math.round(from[2] + (to[2] - from[2]) * t)
    return `rgb(${r},${g},${b})`
  }

  const selectedDayTxs = useMemo(() => {
    if (!selectedDate) return []
    const dStr = format(selectedDate, "yyyy-MM-dd")
    return allTxs.filter(t => t.occurred_on === dStr)
  }, [selectedDate, allTxs])

  const displayName = session?.user?.user_metadata?.display_name || session?.user?.email?.split("@")[0] || "User"
  const avatarUrl = session?.user?.user_metadata?.avatar_url || localStorage.getItem("trouvaille_avatar") || ""

  const stockRangeLabels: Record<StockRange, string> = {
    "1D": "Past Day",
    "1W": "Past Week",
    "1M": "Past Month",
    "6M": "Past 6 Months",
    "YTD": "Year to Date",
    "1Y": "Past 1 Year",
    "ALL": "All Time"
  }

  return (
    <div className="px-5 pt-6 space-y-4 pb-32 relative">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} threshold={threshold} />
      {/* HEADER */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "0 2px 8px var(--shadow-strength)" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-extrabold text-[14px]" style={{ color: "var(--text-primary)" }}>
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-[14px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              Welcome, {displayName}
            </p>
            <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
              Financial Overview
            </p>
          </div>
        </div>
        <button
          onClick={() => setNotifOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center glass-surface active:scale-95 transition-transform"
        >
          <Bell size={16} style={{ color: "var(--text-primary)" }} />
        </button>
      </header>

      {/* 1. TOTAL ASSETS HERO CARD — Refined Compact Apple Stocks Layout */}
      <section className="card-contrast-hero p-4 pb-3 relative overflow-hidden">
        {/* Title Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-extrabold tracking-wider text-white/90 leading-none">
            Net Portfolio
          </h2>
          <button
            onClick={toggleHideBalance}
            className="text-white/60 hover:text-white active:scale-90 transition-all p-1 -mr-1"
            title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
          >
            {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {/* Amount */}
        <div className="mb-1.5">
          <span className="text-[28px] font-extrabold tracking-tight amount leading-tight text-white">
            {hideBalance ? "Rp ••••••••" : formatRupiah(assetData.currentBalance)}
          </span>
        </div>

        {/* Change Line + Time Label Side by Side */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1 text-[12px] font-extrabold"
            style={{ color: assetData.diff >= 0 ? "#FFFFFF" : "#A1A1AA" }}>
            <ArrowUpRight size={13} className={assetData.diff < 0 ? "rotate-90" : ""} />
            <span>{assetData.diff >= 0 ? "+" : ""}{formatRupiah(assetData.diff)}</span>
            <span className="opacity-80">({assetData.percent > 0 ? "+" : ""}{assetData.percent.toFixed(2)}%)</span>
          </div>
          <span className="text-[11px] font-semibold text-white/50 shrink-0">
            {stockRangeLabels[stockRange]} · IDR
          </span>
        </div>

        {/* Range Pill Selector (1D, 1W, 1M, 6M, YTD, 1Y, ALL) */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 mb-1.5">
          {(["1D", "1W", "1M", "6M", "YTD", "1Y", "ALL"] as StockRange[]).map(r => {
            const isActive = stockRange === r
            return (
              <button
                key={r}
                onClick={() => { setStockRange(r); triggerHaptic("light"); }}
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 transition-all"
                style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "transparent",
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                  border: isActive ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent"
                }}
              >
                {r}
              </button>
            )
          })}
        </div>

        {/* Chart with Right Y-Axis & Dotted Grid */}
        <div className="h-[120px] w-full mt-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={assetData.chartData} margin={{ top: 4, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="appleStockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="2 2"
                vertical={true}
                horizontal={true}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)", fontFamily: "Urbanist", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                dy={3}
              />
              <YAxis
                orientation="right"
                width={34}
                domain={["auto", "auto"]}
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)", fontFamily: "Urbanist", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisY}
                dx={-2}
              />
              <Tooltip content={<GlassTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#FFFFFF"
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#appleStockGradient)"
                activeDot={{ r: 3.5, fill: "#FFFFFF", stroke: "#121212", strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stocks-Style Summary Footer (High, Low, Inflow, Outflow) */}
        <div className="grid grid-cols-4 gap-1.5 pt-2.5 mt-1 border-t border-white/10 text-center">
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">High</p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {assetData.highBalance >= 1000 ? "Rp " + formatAxisY(assetData.highBalance) : formatRupiah(assetData.highBalance)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">Low</p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {assetData.lowBalance >= 1000 ? "Rp " + formatAxisY(assetData.lowBalance) : formatRupiah(assetData.lowBalance)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">Inflow</p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {assetData.periodInflow > 0 ? "+Rp " + formatAxisY(assetData.periodInflow) : "Rp 0"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-white/45">Outflow</p>
            <p className="text-[11px] font-extrabold amount text-white mt-0.5">
              {assetData.periodOutflow > 0 ? "-Rp " + formatAxisY(assetData.periodOutflow) : "Rp 0"}
            </p>
          </div>
        </div>
      </section>

      {/* 2. PORTFOLIO & ACCOUNTS CARD */}
      <BalanceCard />

      {/* 3. 2x2 FINANCIAL INSIGHTS GRID */}
      <section className="grid grid-cols-2 gap-3">
        {/* Net Cashflow */}
        <div className="p-4 rounded-[22px]"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          }}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#71717A" }}>Net Cashflow</p>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(18,18,18,0.07)" }}>
              {isPositiveCashflow ? <TrendingUp size={12} color="#121212" /> : <TrendingDown size={12} color="#121212" />}
            </div>
          </div>
          <div className="amount text-[18px] font-extrabold mb-0.5" style={{ color: "#121212" }}>
            {formatRupiah(Math.abs(netCashflow))}
          </div>
          <p className="text-[11px] font-semibold" style={{ color: "#71717A" }}>
            {isPositiveCashflow ? "Surplus bulan ini" : "Defisit bulan ini"}
          </p>
        </div>

        {/* Monthly Outflow */}
        <div className="p-4 rounded-[22px] glass-surface">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Total Outflow</p>
            <Flame size={13} style={{ color: "var(--text-primary)" }} />
          </div>
          <div className="amount text-[18px] font-extrabold leading-tight mb-0.5" style={{ color: "var(--text-primary)" }}>
            {formatRupiah(totalExpense)}
          </div>
          <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>Pengeluaran bulan ini</p>
        </div>

        {/* Daily Average */}
        <div className="p-4 rounded-[22px] glass-surface">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Daily Spending</p>
            <Sparkles size={13} style={{ color: "var(--text-primary)" }} />
          </div>
          <div className="amount text-[18px] font-extrabold mb-0.5" style={{ color: "var(--text-primary)" }}>
            {formatRupiah(dailyAverage)}
          </div>
          <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>Rata-rata {daysInMonth} hari</p>
        </div>

        {/* Inflow vs Outflow Ratio */}
        <div className="p-4 rounded-[22px]"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          }}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#71717A" }}>
              {totalIncome >= totalExpense ? "Savings Rate" : "Income Inflow"}
            </p>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(18,18,18,0.07)" }}>
              <PiggyBank size={12} color="#121212" />
            </div>
          </div>
          <div className="amount text-[18px] font-extrabold mb-0.5" style={{ color: "#121212" }}>
            {totalIncome >= totalExpense
              ? `${(totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0).toFixed(0)}%`
              : formatRupiah(totalIncome)}
          </div>
          <p className="text-[11px] font-semibold" style={{ color: "#71717A" }}>
            {totalIncome >= totalExpense ? "Tersimpan bulan ini" : "Pemasukan bulan ini"}
          </p>
        </div>
      </section>

      {/* 4.5 MONTHLY BUDGET PROGRESS */}
      {budgetTarget > 0 && (
        <section className="glass-surface p-4 rounded-[24px] mb-3">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Batas Anggaran</p>
              <p className="text-[14px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{formatRupiah(totalExpense)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>dari {formatRupiah(budgetTarget)}</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div 
              className="h-full rounded-full transition-all duration-1000" 
              style={{ 
                width: `${Math.min(100, (totalExpense / budgetTarget) * 100)}%`,
                background: "var(--text-primary)"
              }} 
            />
          </div>
          <p className="text-[10px] font-bold text-right mt-1.5" style={{ color: "var(--text-tertiary)" }}>
            {((totalExpense / budgetTarget) * 100).toFixed(1)}% Terpakai
          </p>
        </section>
      )}

      {/* 4. TOP EXPENSE CARD */}
      {topExpense && (
        <section className="p-4 rounded-[22px] flex items-center justify-between"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-fill-strong)", border: "1px solid var(--glass-border)" }}>
              <IconRenderer icon={topExpense.emoji} size="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>Highest Outflow</p>
              <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{topExpense.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="amount text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{formatRupiah(topExpense.total)}</p>
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{topExpense.count} txs</p>
          </div>
        </section>
      )}

      

      {/* 5. HEATMAP CALENDAR */}
      <section>
        <span className="text-[11px] font-bold uppercase tracking-widest px-1 mb-2 block" style={{ color: "var(--text-tertiary)" }}>
          Monthly Activity
        </span>
        <div className="glass-surface p-3.5 rounded-[22px]">
          <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
            {["S","M","T","W","T","F","S"].map((w, i) => (
              <div key={i} className="text-[9px] font-bold mb-0.5" style={{ color: "var(--text-tertiary)" }}>{w}</div>
            ))}
            {Array.from({ length: calPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {calDays.map(d => {
              const { income, expense, hasTx } = dayData(d)
              const isT = isToday(d)
              const isSel = selectedDate && isSameDay(d, selectedDate)
              const net = income - expense
              const isSurplus = hasTx && net >= 0
              const isDeficit = hasTx && net < 0

              let bg = "transparent"
              let textColor = "var(--text-tertiary)"
              let border = "none"

              if (isSurplus && monthlyStats.maxSurplus > 0) {
                const intensity = Math.min(1, net / monthlyStats.maxSurplus)
                bg = lerpHex([212, 212, 216], [255, 255, 255], Math.max(0.2, intensity))
                textColor = "#121212"
              } else if (isDeficit && monthlyStats.maxDeficit > 0) {
                const intensity = Math.min(1, Math.abs(net) / monthlyStats.maxDeficit)
                bg = lerpHex([82, 82, 91], [24, 24, 27], Math.max(0.2, intensity))
                textColor = "#FFFFFF"
                border = "1px solid rgba(255,255,255,0.18)"
              }

              if (isT && !hasTx) {
                border = "1px solid var(--glass-border)"
                textColor = "var(--text-primary)"
              }
              if (isSel) {
                border = "2px solid var(--text-primary)"
              }

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className="flex flex-col items-center justify-center rounded-lg active:scale-90 transition-transform py-0.5"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold transition-all"
                    style={{
                      background: bg,
                      color: textColor,
                      border,
                      boxShadow: isSel ? "0 0 0 2px var(--text-primary)" : "none"
                    }}
                  >
                    {format(d, "d")}
                  </div>
                  <div className="h-[10px] flex items-center justify-center mt-0.5">
                    {hasTx && net !== 0 ? (
                      <span
                        className="text-[8px] font-extrabold tracking-tighter leading-none truncate max-w-[34px]"
                        style={{
                          color: isSurplus ? "var(--text-primary)" : "var(--text-tertiary)",
                          opacity: isSurplus ? 0.95 : 0.65
                        }}
                      >
                        {formatNetAmount(net)}
                      </span>
                    ) : (
                      <span className="text-[8px] opacity-0 select-none">-</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

        {/* 5.5 FINANCIAL GOALS */}
      {goals.length > 0 && (
        <section className="mb-6">
          <div className="flex justify-between items-center px-1 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              Financial Goals
            </span>
            <span className="text-[11px] font-bold" style={{ color: "var(--text-tertiary)" }}>
              {goals.length} Target
            </span>
          </div>

          <div className="space-y-2.5">
            {goals.map((g: any) => {
              const pct = Math.min(100, Math.round((g.currentAmount / (g.targetAmount || 1)) * 100))
              return (
                <div
                  key={g.id}
                  onClick={() => { setSelectedGoal(g); triggerHaptic("light"); }}
                  className="p-4 rounded-[22px] glass-surface cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[15px]"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                        <Target size={16} style={{ color: "var(--text-primary)" }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{g.title}</p>
                        <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                          {formatRupiah(g.currentAmount)} dari {formatRupiah(g.targetAmount)}
                        </p>
                      </div>
                    </div>
                    <span className="amount text-[12px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 6. UPCOMING BILLS (MOVED ABOVE CALENDAR) */}
      {upcomingBills.length > 0 && (
        <section className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-widest px-1 mb-2 block" style={{ color: "var(--text-tertiary)" }}>
            Upcoming Bills
          </span>
          <div className="space-y-2">
            {upcomingBills.slice(0, 3).map((bill: any) => {
              const days = getDaysUntilDue(bill.due_date)
              return (
                <div key={bill.id} className="glass-surface flex items-center gap-3 px-4 py-3 rounded-2xl">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px]"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                    <Bell size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{bill.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {days <= 0 ? "Due today" : `Due in ${days} days`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="amount text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>{formatRupiah(Number(bill.amount))}</p>
                  </div>
                </div>
              )
            })}
            
            {/* Total Kebutuhan Tagihan */}
            <div
              className="p-3.5 rounded-2xl glass-surface flex items-center justify-between mt-2.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}>
                  <CalendarDays size={13} />
                </div>
                <span className="text-[12px] font-bold" style={{ color: "var(--text-tertiary)" }}>Total Kebutuhan Tagihan</span>
              </div>
              <span className="amount text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(upcomingBills.reduce((s: number, b: any) => s + Number(b.amount || 0), 0))}
              </span>
            </div>
          </div>
        </section>
      )}

        {/* Day Transactions Sheet */}
      <BottomSheet isOpen={!!selectedDate} onClose={() => setSelectedDate(null)}>
        <div className="px-5 pb-10">
          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
            {selectedDate ? format(selectedDate, "dd MMMM yyyy") : ""}
          </h3>
          {selectedDayTxs.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-tertiary)" }}>No transactions on this date.</p>
          ) : (
            <div className="space-y-2.5">
              {selectedDayTxs.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3.5 rounded-2xl"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                      <IconRenderer icon={tx.categories?.emoji || categories.find(c => c.id === tx.category_id)?.emoji || "/icons/lainnya.png"} size="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{tx.categories?.name || categories.find(c => c.id === tx.category_id)?.name || "Transfer"}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{tx.note || "No note"}</p>
                    </div>
                  </div>
                  <span className="amount font-bold text-[14px]"
                    style={{ color: tx.type === "income" ? "var(--accent)" : "var(--text-primary)" }}>
                    {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}{formatRupiah(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      <NotificationSheet isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <GoalDetailModal goal={selectedGoal} isOpen={!!selectedGoal} onClose={() => setSelectedGoal(null)} onDeposit={depositToGoal} onUpdate={updateGoal} onDelete={deleteGoal} />
    </div>
  )
}


