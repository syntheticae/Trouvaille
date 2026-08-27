import { format, subMonths, subDays } from "date-fns"
import type { Transaction, Category, Wallet } from "./types"
import famfinaRaw from "../data/famfina_transactions.json"

export type BudgetRiskLevel = "SAFE" | "WATCH" | "AT RISK"

export interface AccountBalanceItem {
  id: string
  name: string
  icon: string
  balance: number
  inflow: number
  outflow: number
}

export interface WalletBalancesResult {
  walletMap: Map<string, AccountBalanceItem>
  balancesById: Record<string, number>
  balancesByName: Record<string, number>
  allAccounts: AccountBalanceItem[]
  positiveAccounts: AccountBalanceItem[]
  zeroAccounts: AccountBalanceItem[]
  totalAssets: number
  netWorth: number
}

export interface AssetTrendResult {
  currentBalance: number
  chartData: { label: string; balance: number }[]
  diff: number
  percent: number
  highBalance: number
  lowBalance: number
  periodInflow: number
  periodOutflow: number
}

export interface MonthAggregates {
  year: number
  month: number
  totalIncome: number
  totalExpense: number
  netCashflow: number
  savingsRate: number
  txCount: number
  avgExpense: number
  categoryTotals: Record<string, { total: number; count: number }>
}

export interface CategoryMoMShift {
  categoryId: string
  name: string
  emoji: string
  currentTotal: number
  previousTotal: number
  deltaAmount: number
  pctChange: number
  isIncrease: boolean
  contributors: Array<{ note: string; amount: number; count: number }>
}

export interface ActionCenterInsight {
  type: "budget_risk" | "spending_pace" | "projected_overrun" | "category_spike" | "safety_buffer" | "healthy"
  title: string
  subtitle: string
  badge: string
  actionLabel: string
  actionType: "statistics" | "budget" | "bills" | "transactions" | "category_detail"
  actionParam?: string
  drillDownDetails?: {
    headline: string
    explanation: string
    bulletPoints: string[]
  }
}

export interface CategoryBaseline {
  categoryId: string
  name: string
  emoji: string
  medianMonthlyTotal: number
  typicalMonthlyRange: [number, number]
  medianTxSize: number
  typicalTxRange: [number, number]
  monthlyFrequency: number
  currentMonthTotal: number
  currentStatus: "below_range" | "within_range" | "above_range"
  deviationPct: number
}

export interface PersonalBaselineResult {
  status: "insufficient" | "early" | "stable"
  confidence: "low" | "moderate" | "high"
  historicalMonthsCount: number
  message?: string
  medianExpense: number
  meanExpense: number
  typicalExpenseRange: [number, number]
  medianIncome: number
  typicalIncomeRange: [number, number]
  medianNetCashflow: number
  typicalNetCashflowRange: [number, number]
  medianTxSize: number
  monthlyTxFrequency: number
  currentMonthExpense: number
  currentMonthStatus: "below_range" | "within_range" | "above_range"
  currentMonthDelta: number
  currentMonthDeviationPct: number
  categoryBaselines: CategoryBaseline[]
}

export interface BehavioralPattern {
  id: string
  type: "day_of_week" | "category_concentration" | "spending_timing" | "ticket_size"
  title: string
  subtitle: string
  badge: string
  evidence: string
  metricValue: number
}

export interface LongitudinalMonthPoint {
  monthKey: string
  label: string
  year: number
  month: number
  income: number
  expense: number
  netCashflow: number
  savingsRate: number
  txCount: number
  avgTxSize: number
}

export interface LongitudinalTimelineResult {
  range: "3M" | "6M" | "12M" | "ALL"
  points: LongitudinalMonthPoint[]
  trajectoryInterpretation: string
  trendDirection: "increasing" | "decreasing" | "stable"
  averageMonthlyExpense: number
  averageMonthlyIncome: number
  totalNetGrowth: number
}

export interface GoalPlanningResult {
  goalId: string
  goalTitle: string
  targetAmount: number
  currentAmount: number
  remainingAmount: number
  targetDate?: string
  remainingMonths: number
  requiredMonthlyContribution: number
  historicalRetainedCash: number
  trajectoryStatus: "ON TRACK" | "BEHIND TARGET" | "AHEAD OF TARGET"
  trajectoryExplanation: string
}

export interface MonthlyFinancialReviewData {
  monthName: string
  year: number
  overview: {
    income: number
    expense: number
    netCashflow: number
    savingsRate: number
    txCount: number
    avgTransaction: number
  }
  whatChanged: Array<{
    label: string
    changeText: string
    isUp: boolean
    isNeutral?: boolean
  }>
  whatWentWell: string[]
  whatNeedsAttention: string[]
  nextMonthBaseline: string
  baselineComparison?: {
    typicalRangeText: string
    statusText: string
    isAboveRange: boolean
  }
}

// Pre-index Famfina records for deterministic lookup
const famfinaKeyMap = new Map<string, any[]>()
;(famfinaRaw as any[]).forEach((t: any) => {
  const k = `${t.occurred_on}_${t.amount}_${t.type}`
  if (!famfinaKeyMap.has(k)) famfinaKeyMap.set(k, [])
  famfinaKeyMap.get(k)!.push(t)
})

export function getFallbackWalletIcon(name: string): string {
  if (!name) return "/icons/Budgets/Cash.png"
  const n = name.trim().toLowerCase()
  if (n === "bca") return "/icons/Budgets/BCA.png"
  if (n === "bri") return "/icons/Budgets/BRI.png"
  if (n === "mandiri") return "/icons/Budgets/Mandiri.png"
  if (n === "link" || n === "linkaja") return "/icons/Budgets/Link.png"
  if (n === "ovo") return "/icons/Budgets/Ovo.png"
  if (n === "blu") return "/icons/Budgets/BLU.png"
  if (n === "bni") return "/icons/Budgets/BNI.png"
  if (n === "cash") return "/icons/Budgets/Cash.png"
  if (n === "crypto") return "/icons/Budgets/Crypto.png"
  if (n === "dana") return "/icons/Budgets/Dana.png"
  if (n === "gopay") return "/icons/Budgets/Gopay.png"
  if (n === "jago") return "/icons/Budgets/Jago.png"
  if (n === "krom") return "/icons/Budgets/Krom.png"
  if (n === "liabilities") return "/icons/Budgets/Liabilities.png"
  if (n === "piutang") return "/icons/Budgets/Piutang.png"
  if (n === "saham") return "/icons/Budgets/Saham.png"
  if (n === "seabank") return "/icons/Budgets/Seabank.png"
  if (n === "shopeepay" || n === "shopee") return "/icons/Budgets/Shopeepay.png"
  if (n === "superbank") return "/icons/Budgets/Superbank.png"
  if (n === "tapcash") return "/icons/Budgets/Tapcash.png"
  return "/icons/wallet.png"
}

/**
 * Pure, deterministic calculation of all wallet balances and net worth.
 */
export function calculateWalletBalances(
  transactions: Transaction[],
  wallets: Wallet[]
): WalletBalancesResult {
  const walletMap = new Map<string, AccountBalanceItem>()

  wallets.forEach(w => {
    const key = w.name.toLowerCase()
    const resolvedIcon = (!w.icon || w.icon === "/icons/wallet.png") ? getFallbackWalletIcon(w.name) : w.icon
    walletMap.set(key, {
      id: w.id,
      name: w.name,
      icon: resolvedIcon,
      balance: 0,
      inflow: 0,
      outflow: 0,
    })
  })

  if (walletMap.size === 0) {
    walletMap.set("cash", {
      id: "wallet-cash",
      name: "Cash",
      icon: "/icons/Budgets/Cash.png",
      balance: 0,
      inflow: 0,
      outflow: 0,
    })
  }

  // Deep copy of Famfina lookup map
  const keyMapCopy = new Map<string, any[]>()
  famfinaKeyMap.forEach((v, k) => {
    keyMapCopy.set(k, [...v])
  })

  const getWallet = (nameOrId: string | null | undefined): AccountBalanceItem => {
    if (!nameOrId) return walletMap.get("cash") || Array.from(walletMap.values())[0]
    const key = nameOrId.toLowerCase()
    if (walletMap.has(key)) return walletMap.get(key)!
    const byId = wallets.find(w => w.id === nameOrId)
    if (byId && walletMap.has(byId.name.toLowerCase())) {
      return walletMap.get(byId.name.toLowerCase())!
    }
    const displayName = nameOrId.charAt(0).toUpperCase() + nameOrId.slice(1)
    const newEntry: AccountBalanceItem = {
      id: `wallet-${key}`,
      name: displayName,
      icon: getFallbackWalletIcon(displayName),
      balance: 0,
      inflow: 0,
      outflow: 0,
    }
    walletMap.set(key, newEntry)
    return newEntry
  }

  // Process all transactions deterministically
  transactions.forEach(tx => {
    const amt = Number(tx.amount || 0)
    if (amt <= 0) return

    let fromName = tx.wallet_id ? wallets.find(w => w.id === tx.wallet_id)?.name : null
    let toName = tx.to_wallet_id ? wallets.find(w => w.id === tx.to_wallet_id)?.name : null

    if (!fromName || (!toName && tx.type === "transfer")) {
      const k = `${tx.occurred_on}_${tx.amount}_${tx.type}`
      const matches = keyMapCopy.get(k)
      const hint = matches && matches.length > 0 ? matches.shift() : null
      if (!fromName && hint?.fromWallet) fromName = hint.fromWallet
      if (!toName && hint?.toWallet) toName = hint.toWallet
    }

    if (!fromName && tx.note) {
      for (const w of wallets) {
        if (tx.note.toLowerCase().includes(w.name.toLowerCase())) {
          fromName = w.name
          break
        }
      }
    }

    const fromEntry = getWallet(fromName || "Cash")
    const toEntry = getWallet(toName || "BNI")

    const isCorrection = isCorrectionTx(tx)

    if (isCorrection) {
      const isNegative = tx.note?.includes("(-)") || tx.type === "expense"
      if (isNegative) {
        fromEntry.balance -= amt
      } else {
        fromEntry.balance += amt
      }
    } else if (tx.type === "income") {
      fromEntry.inflow += amt
      fromEntry.balance += amt
    } else if (tx.type === "expense") {
      fromEntry.outflow += amt
      fromEntry.balance -= amt
    } else if (tx.type === "transfer") {
      // Transfer Invariant: Zero-sum between accounts
      fromEntry.outflow += amt
      fromEntry.balance -= amt
      toEntry.inflow += amt
      toEntry.balance += amt
    }
  })

  const allAccounts = Array.from(walletMap.values()).sort((a, b) => b.balance - a.balance)
  const positiveAccounts = allAccounts.filter(a => a.balance > 0)
  const zeroAccounts = allAccounts.filter(a => a.balance <= 0)
  const totalAssets = positiveAccounts.reduce((s, a) => s + a.balance, 0)
  const netWorth = allAccounts.reduce((s, a) => s + a.balance, 0)

  const balancesById: Record<string, number> = {}
  const balancesByName: Record<string, number> = {}
  allAccounts.forEach(a => {
    balancesById[a.id] = a.balance
    balancesByName[a.name.toLowerCase()] = a.balance
  })

  return {
    walletMap,
    balancesById,
    balancesByName,
    allAccounts,
    positiveAccounts,
    zeroAccounts,
    totalAssets,
    netWorth
  }
}

/**
 * Pure, deterministic calculation of Apple Stocks-style Net Worth Trend.
 */
export function calculateAssetTrend(
  transactions: Transaction[],
  currentBalance: number,
  stockRange: string,
  now = new Date()
): AssetTrendResult {
  const chartData: { label: string; balance: number }[] = []
  let diff = 0
  let percent = 0
  let periodInflow = 0
  let periodOutflow = 0

  if (stockRange === "1D") {
    const todayStr = format(now, "yyyy-MM-dd")
    const todayTxs = transactions.filter(t => t.occurred_on === todayStr)
    const todayIn = todayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
    const todayOut = todayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
    const todayAdj = todayTxs.filter(t => isCorrectionTx(t)).reduce((s, t) => s + (t.note?.includes("(-)") ? -Number(t.amount || 0) : Number(t.amount || 0)), 0)
    const startBalance = currentBalance - (todayIn - todayOut + todayAdj)

    chartData.push({ label: "Open", balance: startBalance })
    chartData.push({ label: "Mid", balance: startBalance + (todayIn - todayOut + todayAdj) * 0.5 })
    chartData.push({ label: "Now", balance: currentBalance })

    diff = currentBalance - startBalance
    percent = startBalance === 0 ? 0 : (diff / Math.abs(startBalance)) * 100
    periodInflow = todayIn
    periodOutflow = todayOut
  } else if (stockRange === "1W") {
    let temp = currentBalance
    for (let i = 0; i < 7; i++) {
      const d = subDays(now, i)
      const dStr = format(d, "yyyy-MM-dd")
      const dayTxs = transactions.filter(t => t.occurred_on === dStr)
      const dayIn = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
      const dayOut = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
      const dayAdj = dayTxs.filter(t => isCorrectionTx(t)).reduce((s, t) => s + (t.note?.includes("(-)") ? -Number(t.amount || 0) : Number(t.amount || 0)), 0)

      chartData.unshift({ label: format(d, "d"), balance: temp })
      periodInflow += dayIn
      periodOutflow += dayOut
      temp = temp - (dayIn - dayOut + dayAdj)
    }
    const startBal = chartData[0]?.balance ?? 0
    diff = currentBalance - startBal
    percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
  } else if (stockRange === "1M") {
    let temp = currentBalance
    for (let i = 0; i < 30; i++) {
      const d = subDays(now, i)
      const dStr = format(d, "yyyy-MM-dd")
      const dayTxs = transactions.filter(t => t.occurred_on === dStr)
      const dayIn = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
      const dayOut = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
      const dayAdj = dayTxs.filter(t => isCorrectionTx(t)).reduce((s, t) => s + (t.note?.includes("(-)") ? -Number(t.amount || 0) : Number(t.amount || 0)), 0)

      if (i % 5 === 0 || i === 0 || i === 29) {
        chartData.unshift({ label: format(d, "d MMM"), balance: temp })
      }
      periodInflow += dayIn
      periodOutflow += dayOut
      temp = temp - (dayIn - dayOut + dayAdj)
    }
    const startBal = temp
    diff = currentBalance - startBal
    percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
  } else if (stockRange === "6M") {
    let temp = currentBalance
    for (let w = 0; w < 24; w++) {
      const d = subDays(now, w * 7)
      const weekTxs = transactions.filter(t => {
        if (!t.occurred_on) return false
        const td = new Date(t.occurred_on)
        return td <= d && td > subDays(d, 7)
      })
      const wIn = weekTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0)
      const wOut = weekTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0)
      const wAdj = weekTxs.filter(t => isCorrectionTx(t)).reduce((s, t) => s + (t.note?.includes("(-)") ? -Number(t.amount || 0) : Number(t.amount || 0)), 0)

      if (w % 4 === 0 || w === 0) {
        chartData.unshift({ label: format(d, "MMM d"), balance: temp })
      }
      periodInflow += wIn
      periodOutflow += wOut
      temp = temp - (wIn - wOut + wAdj)
    }
    const startBal = temp
    diff = currentBalance - startBal
    percent = startBal === 0 ? 0 : (diff / Math.abs(startBal)) * 100
  } else if (stockRange === "YTD" || stockRange === "1Y") {
    const currentYear = now.getFullYear()
    let temp = 0
    for (let m = 0; m <= now.getMonth(); m++) {
      const d = new Date(currentYear, m, 1)
      const mKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`
      const mTxs = transactions.filter(t => t.occurred_on?.startsWith(mKey))
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
    // ALL Time
    let temp = 0
    for (let i = 7; i >= 0; i--) {
      const d = subMonths(now, i)
      const mKey = format(d, "yyyy-MM")
      const mTxs = transactions.filter(t => t.occurred_on?.startsWith(mKey))
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
}

export function isCorrectionTx(t: Transaction): boolean {
  return (
    t.type === "adjustment" ||
    !!t.note?.toLowerCase().includes("correction") ||
    !!t.note?.toLowerCase().includes("koreksi saldo") ||
    !!t.note?.toLowerCase().includes("balance adjustment")
  )
}

/**
 * Filter transactions for a specific month (YYYY-MM).
 */
export function getMonthTransactions(transactions: Transaction[], year: number, month: number): Transaction[] {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  return transactions.filter(t => t.occurred_on && t.occurred_on.startsWith(monthKey))
}

/**
 * Computes pure month aggregates.
 */
export function computeMonthAggregates(
  transactions: Transaction[],
  year: number,
  month: number
): MonthAggregates {
  const monthTxs = getMonthTransactions(transactions, year, month)
  let totalIncome = 0
  let totalExpense = 0
  let expenseCount = 0
  const categoryTotals: Record<string, { total: number; count: number }> = {}

  monthTxs.forEach(t => {
    if (isCorrectionTx(t) || t.type === "transfer") return

    const amt = Number(t.amount || 0)
    if (t.type === "income") {
      totalIncome += amt
    } else if (t.type === "expense") {
      totalExpense += amt
      expenseCount++
      const catKey = t.category_id || "uncategorized"
      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = { total: 0, count: 0 }
      }
      categoryTotals[catKey].total += amt
      categoryTotals[catKey].count++
    }
  })

  const netCashflow = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.max(0, (netCashflow / totalIncome) * 100) : 0
  const avgExpense = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    netCashflow,
    savingsRate,
    txCount: expenseCount,
    avgExpense,
    categoryTotals
  }
}

/**
 * Computes Spending Pace, Daily Average, and Month-End Projection.
 */
export function computeSpendingPace(
  totalExpense: number,
  budget: number,
  daysElapsed: number,
  totalDays: number
) {
  const safeDaysElapsed = Math.max(1, daysElapsed)
  const expectedPace = budget > 0 ? (daysElapsed / totalDays) * budget : 0
  const paceDiff = budget > 0 ? totalExpense - expectedPace : 0
  const isAheadOfPace = paceDiff > 0

  const dailyAvg = totalExpense / safeDaysElapsed
  const projectedMonthEnd = Math.round(dailyAvg * totalDays)
  const projectedVariance = budget > 0 ? projectedMonthEnd - budget : 0

  const consumedPct = budget > 0 ? (totalExpense / budget) * 100 : 0
  const timePct = (daysElapsed / totalDays) * 100

  return {
    expectedPace,
    paceDiff,
    isAheadOfPace,
    dailyAvg,
    projectedMonthEnd,
    projectedVariance,
    consumedPct,
    timePct
  }
}

/**
 * Computes deterministic Budget Risk.
 */
export function computeBudgetRisk(
  consumedPct: number,
  timePct: number,
  budget: number
): { riskLevel: BudgetRiskLevel; reason: string } {
  if (!budget || budget <= 0) {
    return {
      riskLevel: "SAFE",
      reason: "No monthly budget limit configured."
    }
  }

  if (consumedPct >= 95 || consumedPct > timePct + 20) {
    return {
      riskLevel: "AT RISK",
      reason: `Budget is ${consumedPct.toFixed(0)}% consumed while ${timePct.toFixed(0)}% of the month has elapsed.`
    }
  }
  if (consumedPct > timePct + 5) {
    return {
      riskLevel: "WATCH",
      reason: `Spending is running slightly ahead of the ${timePct.toFixed(0)}% monthly elapsed pace.`
    }
  }
  return {
    riskLevel: "SAFE",
    reason: `Spending pace (${consumedPct.toFixed(0)}%) is healthy relative to elapsed month (${timePct.toFixed(0)}%).`
  }
}

/**
 * Computes Category Month-over-Month shifts with contributing sub-items.
 */
export function computeCategoryMoMChanges(
  currentMonthTxs: Transaction[],
  previousMonthTxs: Transaction[],
  categories: Category[]
): CategoryMoMShift[] {
  const catMap = new Map<string, Category>()
  categories.forEach(c => catMap.set(c.id, c))

  // Aggregate current month by category and sub-note
  const currentByCat: Record<string, { total: number; notes: Record<string, { amount: number; count: number }> }> = {}
  currentMonthTxs.forEach(t => {
    if (t.type !== "expense" || isCorrectionTx(t)) return
    const catId = t.category_id || "other"
    if (!currentByCat[catId]) currentByCat[catId] = { total: 0, notes: {} }
    const amt = Number(t.amount || 0)
    currentByCat[catId].total += amt

    const noteKey = (t.note || "General").trim()
    if (!currentByCat[catId].notes[noteKey]) currentByCat[catId].notes[noteKey] = { amount: 0, count: 0 }
    currentByCat[catId].notes[noteKey].amount += amt
    currentByCat[catId].notes[noteKey].count++
  })

  // Aggregate previous month by category
  const prevByCat: Record<string, number> = {}
  previousMonthTxs.forEach(t => {
    if (t.type !== "expense" || isCorrectionTx(t)) return
    const catId = t.category_id || "other"
    prevByCat[catId] = (prevByCat[catId] || 0) + Number(t.amount || 0)
  })

  const allCatIds = new Set([...Object.keys(currentByCat), ...Object.keys(prevByCat)])
  const shifts: CategoryMoMShift[] = []

  allCatIds.forEach(catId => {
    const currTotal = currentByCat[catId]?.total || 0
    const prevTotal = prevByCat[catId] || 0
    const deltaAmount = currTotal - prevTotal

    if (currTotal === 0 && prevTotal === 0) return

    let pctChange = 0
    if (prevTotal > 0) {
      pctChange = Math.round(((currTotal - prevTotal) / prevTotal) * 100)
    } else if (currTotal > 0) {
      pctChange = 100
    }

    const catMeta = catMap.get(catId)
    const name = catMeta?.name || (catId === "other" ? "Lainnya" : "Category")
    const emoji = catMeta?.emoji || "/icons/lainnya.png"

    // Extract top contributing notes
    const notesRecord = currentByCat[catId]?.notes || {}
    const contributors = Object.entries(notesRecord)
      .map(([note, data]) => ({ note, amount: data.amount, count: data.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    shifts.push({
      categoryId: catId,
      name,
      emoji,
      currentTotal: currTotal,
      previousTotal: prevTotal,
      deltaAmount,
      pctChange: Math.abs(pctChange),
      isIncrease: deltaAmount > 0,
      contributors
    })
  })

  return shifts.sort((a, b) => Math.abs(b.deltaAmount) - Math.abs(a.deltaAmount))
}

/**
 * Generates the single most relevant Financial Action Center Insight.
 */
export function generateActionCenterInsight(options: {
  totalExpense: number
  budget: number
  projectedMonthEnd: number
  projectedVariance: number
  budgetRisk: BudgetRiskLevel
  isAheadOfPace: boolean
  paceDiff: number
  consumedPct: number
  timePct: number
  categoryShifts: CategoryMoMShift[]
  safeToSpend: number
  unpaidBillsCount: number
}): ActionCenterInsight {
  const {
    budget,
    projectedVariance,
    budgetRisk,
    isAheadOfPace,
    paceDiff,
    consumedPct,
    timePct,
    categoryShifts,
    safeToSpend,
    unpaidBillsCount
  } = options

  const formatIdr = (n: number) => {
    if (Math.abs(n) >= 1000000) return `Rp ${(Math.abs(n) / 1000000).toFixed(1)}M`
    if (Math.abs(n) >= 1000) return `Rp ${(Math.abs(n) / 1000).toFixed(0)}K`
    return `Rp ${Math.abs(n)}`
  }

  // Priority 1: Critical Budget Risk / Projected Overrun
  if (budget > 0 && budgetRisk === "AT RISK" && projectedVariance > 0) {
    return {
      type: "projected_overrun",
      title: `Projected ${formatIdr(projectedVariance)} above monthly budget`,
      subtitle: `At current daily run-rate, total spending will reach ${consumedPct.toFixed(0)}% of limit.`,
      badge: "BUDGET RISK",
      actionLabel: "Review budget",
      actionType: "budget",
      drillDownDetails: {
        headline: "Projected Budget Overrun",
        explanation: `Based on ${timePct.toFixed(0)}% of days elapsed, your average daily spending projects to exceed your monthly limit by ${formatIdr(projectedVariance)}.`,
        bulletPoints: [
          `Current spending: ${consumedPct.toFixed(0)}% of limit`,
          `Month elapsed: ${timePct.toFixed(0)}%`,
          `Projected month-end variance: +${formatIdr(projectedVariance)}`
        ]
      }
    }
  }

  // Priority 2: Spending Pace running significantly ahead
  if (budget > 0 && isAheadOfPace && paceDiff > 100000) {
    return {
      type: "spending_pace",
      title: `Spending is running ${formatIdr(paceDiff)} ahead of monthly pace`,
      subtitle: `${consumedPct.toFixed(0)}% budget consumed vs ${timePct.toFixed(0)}% days elapsed.`,
      badge: "SPENDING PACE",
      actionLabel: "View breakdown",
      actionType: "statistics",
      drillDownDetails: {
        headline: "Spending Pace Deviation",
        explanation: `You are currently spending faster than the proportional time elapsed in the current month.`,
        bulletPoints: [
          `Expected spending at this point: ${formatIdr(options.totalExpense - paceDiff)}`,
          `Actual spending: ${formatIdr(options.totalExpense)}`,
          `Pace variance: +${formatIdr(paceDiff)}`
        ]
      }
    }
  }

  // Priority 3: Significant Category Spike
  const topSpike = categoryShifts.find(c => c.isIncrease && c.deltaAmount >= 200000 && c.pctChange >= 20)
  if (topSpike) {
    return {
      type: "category_spike",
      title: `${topSpike.name} spending increased ${topSpike.pctChange}% vs last month`,
      subtitle: `+${formatIdr(topSpike.deltaAmount)} higher than previous month's baseline.`,
      badge: "CATEGORY SHIFT",
      actionLabel: "View category",
      actionType: "category_detail",
      actionParam: topSpike.categoryId,
      drillDownDetails: {
        headline: `${topSpike.name} Spending Shift`,
        explanation: `${topSpike.name} had the largest positive expense change compared to the previous month.`,
        bulletPoints: topSpike.contributors.map(c => `${c.note}: ${formatIdr(c.amount)} (${c.count} txs)`)
      }
    }
  }

  // Priority 4: Tight Safe-to-Spend buffer
  if (unpaidBillsCount > 0 && safeToSpend < 300000) {
    return {
      type: "safety_buffer",
      title: `${unpaidBillsCount} upcoming bills scheduled this cycle`,
      subtitle: `Safe-to-spend buffer is currently ${formatIdr(safeToSpend)}.`,
      badge: "SAFETY BUFFER",
      actionLabel: "View upcoming bills",
      actionType: "bills",
      drillDownDetails: {
        headline: "Committed Obligations Buffer",
        explanation: `Upcoming recurring bills are deducted from liquid assets to determine your unencumbered spending balance.`,
        bulletPoints: [
          `Total upcoming commitments: ${formatIdr(options.safeToSpend)}`,
          `Remaining safety buffer: ${formatIdr(safeToSpend)}`
        ]
      }
    }
  }

  // Priority 5: Calm on-track state
  return {
    type: "healthy",
    title: budget > 0 ? "You're on track for this month's budget" : "Monthly spending is steady",
    subtitle: budget > 0
      ? `${consumedPct.toFixed(0)}% consumed with ${timePct.toFixed(0)}% of the month elapsed.`
      : "Cashflow and spending pace are within normal parameters.",
    badge: "ON TRACK",
    actionLabel: "View statistics",
    actionType: "statistics",
    drillDownDetails: {
      headline: "Financial Summary",
      explanation: "Current spending rate is aligned with your monthly schedule.",
      bulletPoints: [
        `Net cashflow: ${options.totalExpense === 0 ? "No expenses recorded" : "Controlled"}`,
        `Spending pace: Balanced`
      ]
    }
  }
}

/**
 * Generates the Monthly Financial Review for Statistics Page.
 */
export function generateMonthlyFinancialReview(
  currentMonthTxs: Transaction[],
  previousMonthTxs: Transaction[],
  categories: Category[],
  budget: number,
  monthDate: Date
): MonthlyFinancialReviewData {
  const monthName = format(monthDate, "MMMM")
  const year = monthDate.getFullYear()
  const monthNumber = monthDate.getMonth() + 1

  const currentAgg = computeMonthAggregates(currentMonthTxs, year, monthNumber)
  const prevAgg = computeMonthAggregates(
    previousMonthTxs,
    subMonths(monthDate, 1).getFullYear(),
    subMonths(monthDate, 1).getMonth() + 1
  )

  const shifts = computeCategoryMoMChanges(currentMonthTxs, previousMonthTxs, categories)

  // What Changed: Up to 3 meaningful shifts
  const whatChanged: MonthlyFinancialReviewData["whatChanged"] = []
  shifts.slice(0, 3).forEach(s => {
    if (s.deltaAmount === 0 && s.pctChange === 0) return
    whatChanged.push({
      label: s.name,
      changeText: `${s.isIncrease ? "↑" : "↓"} ${s.pctChange}% (Rp ${(Math.abs(s.deltaAmount) / 1000).toFixed(0)}K)`,
      isUp: s.isIncrease
    })
  })

  if (prevAgg.avgExpense > 0 && currentAgg.avgExpense > 0) {
    const avgDiffPct = Math.round(((currentAgg.avgExpense - prevAgg.avgExpense) / prevAgg.avgExpense) * 100)
    if (Math.abs(avgDiffPct) >= 5) {
      whatChanged.push({
        label: "Avg Transaction",
        changeText: `${avgDiffPct > 0 ? "↑" : "↓"} ${Math.abs(avgDiffPct)}%`,
        isUp: avgDiffPct > 0
      })
    }
  }

  // What Went Well
  const whatWentWell: string[] = []
  if (budget > 0 && currentAgg.totalExpense <= budget) {
    whatWentWell.push(`Maintained spending within your ${format(monthDate, "MMMM")} budget.`)
  }
  if (currentAgg.savingsRate >= 20) {
    whatWentWell.push(`Achieved a ${currentAgg.savingsRate.toFixed(0)}% savings rate from total monthly inflow.`)
  }
  if (prevAgg.totalExpense > 0 && currentAgg.totalExpense < prevAgg.totalExpense) {
    const savedMoM = prevAgg.totalExpense - currentAgg.totalExpense
    whatWentWell.push(`Total outflow decreased by Rp ${(savedMoM / 1000).toFixed(0)}K compared to previous month.`)
  }
  if (whatWentWell.length === 0 && currentAgg.netCashflow >= 0) {
    whatWentWell.push("Maintained positive net cashflow with zero month-end deficit.")
  }

  // What Needs Attention
  const whatNeedsAttention: string[] = []
  if (budget > 0 && currentAgg.totalExpense > budget) {
    const over = currentAgg.totalExpense - budget
    whatNeedsAttention.push(`Outflow exceeded monthly budget by Rp ${(over / 1000).toFixed(0)}K.`)
  }
  const bigSpike = shifts.find(s => s.isIncrease && s.pctChange >= 25 && s.deltaAmount >= 200000)
  if (bigSpike) {
    whatNeedsAttention.push(`${bigSpike.name} spending grew ${bigSpike.pctChange}% (+Rp ${(bigSpike.deltaAmount / 1000).toFixed(0)}K vs previous month).`)
  }
  if (currentAgg.netCashflow < 0) {
    whatNeedsAttention.push(`Net deficit of Rp ${(Math.abs(currentAgg.netCashflow) / 1000).toFixed(0)}K (outflow exceeded inflow).`)
  }

  // Next Month Run-Rate Baseline
  let nextMonthBaseline = "Baseline expense trajectory aligns with historical run-rate."
  if (currentAgg.totalExpense > 0 && budget > 0) {
    if (currentAgg.totalExpense > budget) {
      nextMonthBaseline = "At the current spending pace, next cycle may risk remaining above target without category adjustments."
    } else {
      nextMonthBaseline = "Current discipline provides a strong foundation for next month's envelope limits."
    }
  }

  return {
    monthName,
    year,
    overview: {
      income: currentAgg.totalIncome,
      expense: currentAgg.totalExpense,
      netCashflow: currentAgg.netCashflow,
      savingsRate: currentAgg.savingsRate,
      txCount: currentAgg.txCount,
      avgTransaction: currentAgg.avgExpense
    },
    whatChanged: whatChanged.slice(0, 4),
    whatWentWell: whatWentWell.slice(0, 3),
    whatNeedsAttention: whatNeedsAttention.slice(0, 3),
    nextMonthBaseline
  }
}

/**
 * Pure statistical helpers
 */
export function calculateMedian(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[mid]
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export function calculateTypicalRange(numbers: number[]): [number, number] {
  if (!numbers || numbers.length === 0) return [0, 0]
  if (numbers.length === 1) return [numbers[0], numbers[0]]
  const sorted = [...numbers].sort((a, b) => a - b)
  const median = calculateMedian(sorted)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const lowerBound = Math.round(Math.max(min, median * 0.85))
  const upperBound = Math.round(Math.min(max, median * 1.15))
  return [lowerBound, upperBound]
}

/**
 * Calculates Personal Historical Baseline across completed cycles.
 */
export function calculatePersonalBaselines(
  transactions: Transaction[],
  categories: Category[] = [],
  now = new Date()
): PersonalBaselineResult {
  const currentMonthKey = format(now, "yyyy-MM")
  const currentMonthTxs = transactions.filter(t => t.occurred_on?.startsWith(currentMonthKey))
  const currentAgg = computeMonthAggregates(currentMonthTxs, now.getFullYear(), now.getMonth() + 1)
  const currentMonthExpense = currentAgg.totalExpense

  // Map transactions by month
  const monthMap = new Map<string, Transaction[]>()
  transactions.forEach(t => {
    if (!t.occurred_on) return
    const mKey = t.occurred_on.slice(0, 7)
    if (!monthMap.has(mKey)) monthMap.set(mKey, [])
    monthMap.get(mKey)!.push(t)
  })

  // Filter completed historical months (excluding current month)
  const historicalMonthKeys = Array.from(monthMap.keys())
    .filter(k => k < currentMonthKey)
    .sort()

  const historicalMonthsCount = historicalMonthKeys.length

  if (historicalMonthsCount < 2) {
    return {
      status: "insufficient",
      confidence: "low",
      historicalMonthsCount,
      message: "Build more history to establish your personal baseline.",
      medianExpense: currentMonthExpense || 0,
      meanExpense: currentMonthExpense || 0,
      typicalExpenseRange: [currentMonthExpense, currentMonthExpense],
      medianIncome: currentAgg.totalIncome || 0,
      typicalIncomeRange: [currentAgg.totalIncome, currentAgg.totalIncome],
      medianNetCashflow: currentAgg.netCashflow || 0,
      typicalNetCashflowRange: [currentAgg.netCashflow, currentAgg.netCashflow],
      medianTxSize: currentAgg.avgExpense || 0,
      monthlyTxFrequency: currentAgg.txCount || 0,
      currentMonthExpense,
      currentMonthStatus: "within_range",
      currentMonthDelta: 0,
      currentMonthDeviationPct: 0,
      categoryBaselines: []
    }
  }

  const confidence = historicalMonthsCount >= 4 ? "high" : "moderate"
  const status = historicalMonthsCount >= 4 ? "stable" : "early"

  // Compute monthly aggregates for all completed historical months
  const monthlyExpenses: number[] = []
  const monthlyIncomes: number[] = []
  const monthlyNetCashflows: number[] = []
  const monthlyTxCounts: number[] = []
  const allHistoricalExpenseAmounts: number[] = []
  const categoryMonthlyMap = new Map<string, number[]>()

  historicalMonthKeys.forEach(k => {
    const txs = monthMap.get(k)!
    const [y, m] = k.split("-").map(Number)
    const agg = computeMonthAggregates(txs, y, m)

    monthlyExpenses.push(agg.totalExpense)
    monthlyIncomes.push(agg.totalIncome)
    monthlyNetCashflows.push(agg.netCashflow)
    monthlyTxCounts.push(agg.txCount)

    // Collect expense amounts
    txs.forEach(t => {
      if (t.type === "expense" && !isCorrectionTx(t)) {
        const amt = Number(t.amount || 0)
        if (amt > 0) allHistoricalExpenseAmounts.push(amt)
      }
    })

    // Collect category totals
    Object.entries(agg.categoryTotals).forEach(([catId, data]) => {
      if (!categoryMonthlyMap.has(catId)) categoryMonthlyMap.set(catId, [])
      categoryMonthlyMap.get(catId)!.push(data.total)
    })
  })

  const medianExpense = calculateMedian(monthlyExpenses)
  const meanExpense = Math.round(monthlyExpenses.reduce((s, v) => s + v, 0) / monthlyExpenses.length)
  const typicalExpenseRange = calculateTypicalRange(monthlyExpenses)

  const medianIncome = calculateMedian(monthlyIncomes)
  const typicalIncomeRange = calculateTypicalRange(monthlyIncomes)

  const medianNetCashflow = calculateMedian(monthlyNetCashflows)
  const typicalNetCashflowRange = calculateTypicalRange(monthlyNetCashflows)

  const medianTxSize = calculateMedian(allHistoricalExpenseAmounts)
  const monthlyTxFrequency = Math.round(monthlyTxCounts.reduce((s, v) => s + v, 0) / monthlyTxCounts.length)

  // Determine current month status vs typical range
  let currentMonthStatus: "below_range" | "within_range" | "above_range" = "within_range"
  if (currentMonthExpense > typicalExpenseRange[1]) {
    currentMonthStatus = "above_range"
  } else if (currentMonthExpense < typicalExpenseRange[0] && currentMonthExpense > 0) {
    currentMonthStatus = "below_range"
  }

  const currentMonthDelta = currentMonthExpense - medianExpense
  const currentMonthDeviationPct = medianExpense > 0 ? Math.round((currentMonthDelta / medianExpense) * 100) : 0

  // Category Baselines
  const catLookup = new Map<string, Category>()
  categories.forEach(c => catLookup.set(c.id, c))

  const categoryBaselines: CategoryBaseline[] = []
  categoryMonthlyMap.forEach((totals, catId) => {
    if (totals.length >= 2) {
      const medianMonthlyTotal = calculateMedian(totals)
      const typicalMonthlyRange = calculateTypicalRange(totals)

      // Category transactions for ticket size calculation
      const catTxs = transactions.filter(t => (t.category_id === catId || (catLookup.get(catId)?.name && t.categories?.name === catLookup.get(catId)?.name)) && t.type === "expense" && !isCorrectionTx(t))
      const catAmounts = catTxs.map(t => Number(t.amount || 0)).filter(a => a > 0)
      const medianCatTxSize = calculateMedian(catAmounts)
      const typicalTxRange = calculateTypicalRange(catAmounts)
      const catMonthlyFreq = Math.round(catTxs.length / Math.max(1, historicalMonthsCount))

      const currentCatTotal = currentAgg.categoryTotals[catId]?.total || 0
      let currentCatStatus: "below_range" | "within_range" | "above_range" = "within_range"
      if (currentCatTotal > typicalMonthlyRange[1]) {
        currentCatStatus = "above_range"
      } else if (currentCatTotal < typicalMonthlyRange[0] && currentCatTotal > 0) {
        currentCatStatus = "below_range"
      }

      const devPct = medianMonthlyTotal > 0 ? Math.round(((currentCatTotal - medianMonthlyTotal) / medianMonthlyTotal) * 100) : 0
      const catMeta = catLookup.get(catId)

      categoryBaselines.push({
        categoryId: catId,
        name: catMeta?.name || "Category",
        emoji: catMeta?.emoji || "/icons/lainnya.png",
        medianMonthlyTotal,
        typicalMonthlyRange,
        medianTxSize: medianCatTxSize,
        typicalTxRange,
        monthlyFrequency: catMonthlyFreq,
        currentMonthTotal: currentCatTotal,
        currentStatus: currentCatStatus,
        deviationPct: devPct
      })
    }
  })

  categoryBaselines.sort((a, b) => b.medianMonthlyTotal - a.medianMonthlyTotal)

  return {
    status,
    confidence,
    historicalMonthsCount,
    medianExpense,
    meanExpense,
    typicalExpenseRange,
    medianIncome,
    typicalIncomeRange,
    medianNetCashflow,
    typicalNetCashflowRange,
    medianTxSize,
    monthlyTxFrequency,
    currentMonthExpense,
    currentMonthStatus,
    currentMonthDelta,
    currentMonthDeviationPct,
    categoryBaselines
  }
}

/**
 * Detects descriptive behavioral spending patterns with strict evidence gates.
 */
export function detectBehavioralPatterns(
  transactions: Transaction[],
  baselines: PersonalBaselineResult,
  _now = new Date()
): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = []
  if (baselines.status === "insufficient") return patterns

  const formatIdr = (n: number) => {
    if (Math.abs(n) >= 1000000) return `Rp ${(Math.abs(n) / 1000000).toFixed(1)}M`
    if (Math.abs(n) >= 1000) return `Rp ${(Math.abs(n) / 1000).toFixed(0)}K`
    return `Rp ${Math.abs(n)}`
  }

  // 1. Day of Week Pattern (Weekend vs Weekday Daily Average)
  let weekdayTotal = 0
  let weekdayDays = new Set<string>()
  let weekendTotal = 0
  let weekendDays = new Set<string>()

  transactions.forEach(t => {
    if (t.type !== "expense" || isCorrectionTx(t) || !t.occurred_on) return
    const amt = Number(t.amount || 0)
    if (amt <= 0) return
    const dateObj = new Date(t.occurred_on)
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendTotal += amt
      weekendDays.add(t.occurred_on)
    } else {
      weekdayTotal += amt
      weekdayDays.add(t.occurred_on)
    }
  })

  if (weekendDays.size >= 8 && weekdayDays.size >= 16) {
    const avgWeekendDay = Math.round(weekendTotal / weekendDays.size)
    const avgWeekdayDay = Math.round(weekdayTotal / weekdayDays.size)

    if (avgWeekdayDay > 0) {
      const weekendRatio = avgWeekendDay / avgWeekdayDay
      if (weekendRatio >= 1.25) {
        patterns.push({
          id: "pattern-weekend-elevated",
          type: "day_of_week",
          title: "Weekend spending is typically elevated",
          subtitle: `Weekend daily expenses average ${weekendRatio.toFixed(1)}× higher than weekdays.`,
          badge: "DAY OF WEEK",
          evidence: `Average daily spending is ${formatIdr(avgWeekendDay)} on weekends vs ${formatIdr(avgWeekdayDay)} on weekdays.`,
          metricValue: weekendRatio
        })
      } else if (weekendRatio <= 0.75) {
        patterns.push({
          id: "pattern-weekday-elevated",
          type: "day_of_week",
          title: "Weekday spending is typically higher",
          subtitle: `Weekday daily expenses average ${(1 / weekendRatio).toFixed(1)}× higher than weekends.`,
          badge: "DAY OF WEEK",
          evidence: `Average daily spending is ${formatIdr(avgWeekdayDay)} on weekdays vs ${formatIdr(avgWeekendDay)} on weekends.`,
          metricValue: weekendRatio
        })
      }
    }
  }

  // 2. Category Concentration Pattern
  if (baselines.categoryBaselines.length > 0 && baselines.medianExpense > 0) {
    const topCat = baselines.categoryBaselines[0]
    const concentrationPct = Math.round((topCat.medianMonthlyTotal / baselines.medianExpense) * 100)
    if (concentrationPct >= 30) {
      patterns.push({
        id: "pattern-category-concentration",
        type: "category_concentration",
        title: `${topCat.name} is your largest expense allocation`,
        subtitle: `${topCat.name} typically represents ${concentrationPct}% of monthly expenses.`,
        badge: "CONCENTRATION",
        evidence: `Typical monthly allocation of ${formatIdr(topCat.medianMonthlyTotal)} out of ${formatIdr(baselines.medianExpense)} total monthly expenses.`,
        metricValue: concentrationPct
      })
    }
  }

  // 3. Monthly Spending Timing Distribution (First 10 Days vs Rest of Month)
  let earlyMonthTotal = 0
  let totalValidExpense = 0

  transactions.forEach(t => {
    if (t.type !== "expense" || isCorrectionTx(t) || !t.occurred_on) return
    const day = Number(t.occurred_on.slice(8, 10))
    const amt = Number(t.amount || 0)
    if (!isNaN(day) && amt > 0) {
      totalValidExpense += amt
      if (day <= 10) earlyMonthTotal += amt
    }
  })

  if (totalValidExpense > 0) {
    const earlyPct = Math.round((earlyMonthTotal / totalValidExpense) * 100)
    if (earlyPct >= 45) {
      patterns.push({
        id: "pattern-spending-timing",
        type: "spending_timing",
        title: "Front-loaded monthly spending pattern",
        subtitle: `${earlyPct}% of monthly expenses typically occur during the first 10 days.`,
        badge: "TIMING",
        evidence: `Early-cycle commitments and recurring obligations represent ${earlyPct}% of total outflow.`,
        metricValue: earlyPct
      })
    }
  }

  // 4. Ticket Size Consistency
  if (baselines.medianTxSize > 0 && baselines.monthlyTxFrequency > 0) {
    patterns.push({
      id: "pattern-ticket-size",
      type: "ticket_size",
      title: `Typical expense size is ${formatIdr(baselines.medianTxSize)}`,
      subtitle: `Your typical rhythm is ${baselines.monthlyTxFrequency} expense transactions per month.`,
      badge: "TICKET SIZE",
      evidence: `Median transaction amount across completed historical cycles.`,
      metricValue: baselines.medianTxSize
    })
  }

  return patterns
}

/**
 * Pure longitudinal timeline aggregation and trajectory interpretation.
 */
export function calculateLongitudinalTimeline(
  transactions: Transaction[],
  range: "3M" | "6M" | "12M" | "ALL" = "6M",
  now = new Date()
): LongitudinalTimelineResult {
  const monthsCount = range === "3M" ? 3 : range === "6M" ? 6 : range === "12M" ? 12 : 24
  const points: LongitudinalMonthPoint[] = []

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = subMonths(now, i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const agg = computeMonthAggregates(transactions, y, m)
    const mKey = `${y}-${String(m).padStart(2, "0")}`

    points.push({
      monthKey: mKey,
      label: format(d, "MMM yy"),
      year: y,
      month: m,
      income: agg.totalIncome,
      expense: agg.totalExpense,
      netCashflow: agg.netCashflow,
      savingsRate: agg.savingsRate,
      txCount: agg.txCount,
      avgTxSize: agg.avgExpense
    })
  }

  const validExpensePoints = points.filter(p => p.expense > 0)
  const averageMonthlyExpense = validExpensePoints.length > 0
    ? Math.round(validExpensePoints.reduce((s, p) => s + p.expense, 0) / validExpensePoints.length)
    : 0
  const validIncomePoints = points.filter(p => p.income > 0)
  const averageMonthlyIncome = validIncomePoints.length > 0
    ? Math.round(validIncomePoints.reduce((s, p) => s + p.income, 0) / validIncomePoints.length)
    : 0
  const totalNetGrowth = points.reduce((s, p) => s + p.netCashflow, 0)

  // Trajectory interpretation
  let trendDirection: "increasing" | "decreasing" | "stable" = "stable"
  let trajectoryInterpretation = "Monthly cashflow and expense trajectory have remained stable across this period."

  if (points.length >= 4) {
    const half = Math.floor(points.length / 2)
    const firstHalfAvg = Math.round(points.slice(0, half).reduce((s, p) => s + p.expense, 0) / half)
    const secondHalfAvg = Math.round(points.slice(half).reduce((s, p) => s + p.expense, 0) / (points.length - half))

    const formatIdr = (n: number) => {
      if (Math.abs(n) >= 1000000) return `Rp ${(Math.abs(n) / 1000000).toFixed(1)}M`
      return `Rp ${(Math.abs(n) / 1000).toFixed(0)}K`
    }

    if (firstHalfAvg > 0 && secondHalfAvg > firstHalfAvg * 1.12) {
      trendDirection = "increasing"
      trajectoryInterpretation = `Average monthly expense increased from ${formatIdr(firstHalfAvg)} to ${formatIdr(secondHalfAvg)} over the selected period.`
    } else if (firstHalfAvg > 0 && secondHalfAvg < firstHalfAvg * 0.88) {
      trendDirection = "decreasing"
      trajectoryInterpretation = `Average monthly expense decreased from ${formatIdr(firstHalfAvg)} to ${formatIdr(secondHalfAvg)} over the selected period.`
    } else {
      trajectoryInterpretation = `Average monthly expense has remained balanced around ${formatIdr(averageMonthlyExpense)}.`
    }
  }

  return {
    range,
    points,
    trajectoryInterpretation,
    trendDirection,
    averageMonthlyExpense,
    averageMonthlyIncome,
    totalNetGrowth
  }
}

/**
 * Pure goal planning and mathematical trajectory evaluation.
 */
export function calculateGoalPlanning(
  goal: { id: string; title: string; targetAmount: number; currentAmount: number; targetDate?: string },
  baselines: PersonalBaselineResult,
  now = new Date()
): GoalPlanningResult {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount)

  let remainingMonths = 12
  if (goal.targetDate) {
    const targetD = new Date(goal.targetDate)
    const diffMonths = (targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth())
    remainingMonths = Math.max(1, diffMonths)
  }

  const requiredMonthlyContribution = Math.round(remainingAmount / remainingMonths)
  const historicalRetainedCash = baselines.medianNetCashflow > 0 ? baselines.medianNetCashflow : 0

  let trajectoryStatus: "ON TRACK" | "BEHIND TARGET" | "AHEAD OF TARGET" = "ON TRACK"
  let trajectoryExplanation = `Requires approximately Rp ${requiredMonthlyContribution.toLocaleString("id-ID")}/month over ${remainingMonths} months.`

  if (goal.currentAmount >= goal.targetAmount) {
    trajectoryStatus = "AHEAD OF TARGET"
    trajectoryExplanation = "Target goal has been fully reached."
  } else if (historicalRetainedCash >= requiredMonthlyContribution * 1.1) {
    trajectoryStatus = "ON TRACK"
    trajectoryExplanation = `Your historical average retained cash (Rp ${historicalRetainedCash.toLocaleString("id-ID")}/mo) supports the required Rp ${requiredMonthlyContribution.toLocaleString("id-ID")}/mo pace.`
  } else if (historicalRetainedCash >= requiredMonthlyContribution * 0.8) {
    trajectoryStatus = "ON TRACK"
    trajectoryExplanation = `Required contribution (Rp ${requiredMonthlyContribution.toLocaleString("id-ID")}/mo) closely aligns with historical net cashflow (Rp ${historicalRetainedCash.toLocaleString("id-ID")}/mo).`
  } else {
    trajectoryStatus = "BEHIND TARGET"
    trajectoryExplanation = `Target requires Rp ${requiredMonthlyContribution.toLocaleString("id-ID")}/month while historical average retained cash is Rp ${historicalRetainedCash.toLocaleString("id-ID")}/month.`
  }

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remainingAmount,
    targetDate: goal.targetDate,
    remainingMonths,
    requiredMonthlyContribution,
    historicalRetainedCash,
    trajectoryStatus,
    trajectoryExplanation
  }
}
