import { useMemo } from "react"
import { getDaysInMonth, subMonths } from "date-fns"
import type { Transaction, Bill, Category } from "../lib/types"
import {
  computeMonthAggregates,
  computeSpendingPace,
  computeBudgetRisk,
  computeCategoryMoMChanges,
  generateActionCenterInsight,
  generateMonthlyFinancialReview,
  getMonthTransactions,
  type BudgetRiskLevel,
  type CategoryMoMShift,
  type ActionCenterInsight,
  type MonthlyFinancialReviewData
} from "../lib/financialMath"

export type { BudgetRiskLevel, CategoryMoMShift, ActionCenterInsight, MonthlyFinancialReviewData }
export type MomentumState = "positive" | "neutral" | "negative"

interface FinancialIntelligenceOptions {
  transactions: Transaction[]
  budgetTarget: number
  totalAssets: number
  bills: Bill[]
  categories?: Category[]
  activeMonthDate?: Date
}

export function useFinancialIntelligence({
  transactions,
  budgetTarget,
  totalAssets,
  bills,
  categories = [],
  activeMonthDate = new Date()
}: FinancialIntelligenceOptions) {
  return useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const daysElapsed = now.getDate()
    const totalDays = getDaysInMonth(now)

    // Current Month Aggregates
    const currentMonthAgg = computeMonthAggregates(transactions, currentYear, currentMonth)
    const { totalIncome, totalExpense, netCashflow, savingsRate } = currentMonthAgg

    // Previous Month Aggregates
    const prevDate = subMonths(now, 1)
    const prevYear = prevDate.getFullYear()
    const prevMonth = prevDate.getMonth() + 1
    const prevMonthAgg = computeMonthAggregates(transactions, prevYear, prevMonth)

    // Spending Pace & Projections
    const budget = budgetTarget > 0 ? budgetTarget : 0
    const pace = computeSpendingPace(totalExpense, budget, daysElapsed, totalDays)
    const risk = computeBudgetRisk(pace.consumedPct, pace.timePct, budget)

    // Category MoM Shifts
    const currentMonthTxs = getMonthTransactions(transactions, currentYear, currentMonth)
    const prevMonthTxs = getMonthTransactions(transactions, prevYear, prevMonth)
    const categoryShifts = computeCategoryMoMChanges(currentMonthTxs, prevMonthTxs, categories)
    const categoryMoMMap = new Map<string, CategoryMoMShift>()
    categoryShifts.forEach(c => categoryMoMMap.set(c.categoryId, c))

    // Financial Momentum
    let momentum: MomentumState = "neutral"
    let momentumReason = "Balanced income and expense pace"

    if (netCashflow > 0 && (!budget || !pace.isAheadOfPace || savingsRate >= 25)) {
      momentum = "positive"
      momentumReason = savingsRate >= 30 
        ? `Strong ${savingsRate.toFixed(0)}% savings rate with healthy cashflow` 
        : `Surplus cashflow and controlled spending pace`
    } else if (netCashflow < 0 || (budget > 0 && risk.riskLevel === "AT RISK")) {
      momentum = "negative"
      momentumReason = netCashflow < 0 
        ? `Outflow exceeds inflow this month by ${Math.abs(netCashflow).toLocaleString("id-ID")}` 
        : `Spending pace is elevated against budget limit`
    } else {
      momentum = "neutral"
      momentumReason = `Steady cashflow with ${savingsRate.toFixed(0)}% saved`
    }

    // Safety Buffer
    const unpaidUpcomingBills = bills.filter(b => !b.is_paid)
    const committedAmount = unpaidUpcomingBills.reduce((s, b) => s + Number(b.amount || 0), 0)
    const safeToSpend = Math.max(0, totalAssets - committedAmount)

    // Financial Action Center Insight
    const actionCenterInsight = generateActionCenterInsight({
      totalExpense,
      budget,
      projectedMonthEnd: pace.projectedMonthEnd,
      projectedVariance: pace.projectedVariance,
      budgetRisk: risk.riskLevel,
      isAheadOfPace: pace.isAheadOfPace,
      paceDiff: pace.paceDiff,
      consumedPct: pace.consumedPct,
      timePct: pace.timePct,
      categoryShifts,
      safeToSpend,
      unpaidBillsCount: unpaidUpcomingBills.length
    })

    // Monthly Financial Review (for Statistics Page)
    const activeReviewTxs = getMonthTransactions(
      transactions,
      activeMonthDate.getFullYear(),
      activeMonthDate.getMonth() + 1
    )
    const activePrevReviewDate = subMonths(activeMonthDate, 1)
    const activePrevReviewTxs = getMonthTransactions(
      transactions,
      activePrevReviewDate.getFullYear(),
      activePrevReviewDate.getMonth() + 1
    )

    const monthlyReview = generateMonthlyFinancialReview(
      activeReviewTxs,
      activePrevReviewTxs,
      categories,
      budget,
      activeMonthDate
    )

    // Helpers for "Why?" Drill-Down Insights
    const explainCategory = (catId: string) => {
      return categoryMoMMap.get(catId) || null
    }

    const explainExpenseChange = () => {
      const topContributors = categoryShifts
        .filter(s => s.deltaAmount !== 0)
        .slice(0, 4)
      return {
        totalCurrent: totalExpense,
        totalPrevious: prevMonthAgg.totalExpense,
        delta: totalExpense - prevMonthAgg.totalExpense,
        pctChange: prevMonthAgg.totalExpense > 0
          ? Math.round(((totalExpense - prevMonthAgg.totalExpense) / prevMonthAgg.totalExpense) * 100)
          : 0,
        topContributors
      }
    }

    return {
      daysElapsed,
      totalDays,
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      // Spending Pace
      budget,
      expectedPace: pace.expectedPace,
      paceDiff: pace.paceDiff,
      isAheadOfPace: pace.isAheadOfPace,
      // Projection
      dailyAvg: pace.dailyAvg,
      projectedMonthEnd: pace.projectedMonthEnd,
      projectedVariance: pace.projectedVariance,
      // Risk & Momentum
      budgetRisk: risk.riskLevel,
      budgetRiskReason: risk.reason,
      consumedPct: pace.consumedPct,
      timePct: pace.timePct,
      momentum,
      momentumReason,
      // Safety Buffer
      totalAssets,
      committedAmount,
      safeToSpend,
      unpaidBillsCount: unpaidUpcomingBills.length,
      // New Intelligence Layers
      actionCenterInsight,
      monthlyReview,
      categoryShifts,
      categoryMoMMap,
      explainCategory,
      explainExpenseChange
    }
  }, [transactions, budgetTarget, totalAssets, bills, categories, activeMonthDate])
}
