import { format, subMonths } from "date-fns"
import type { Transaction, Category } from "./types"

export type BudgetRiskLevel = "SAFE" | "WATCH" | "AT RISK"

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
