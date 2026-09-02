import { useMemo } from "react"
import { getDaysInMonth, subMonths } from "date-fns"
import type { Transaction, Bill, Category, Goal, Wallet } from "../lib/types"
import {
  computeMonthAggregates,
  computeSpendingPace,
  computeBudgetRisk,
  computeCategoryMoMChanges,
  generateActionCenterInsight,
  generateMonthlyFinancialReview,
  getMonthTransactions,
  calculatePersonalBaselines,
  detectBehavioralPatterns,
  calculateLongitudinalTimeline,
  calculateGoalPlanning,
  detectRecurringTransactions,
  calculateExpenseStructure,
  calculateCashflowFloor,
  calculateLiquidityHorizon,
  calculateWalletBalances,
  type BudgetRiskLevel,
  type CategoryMoMShift,
  type ActionCenterInsight,
  type MonthlyFinancialReviewData,
  type PersonalBaselineResult,
  type BehavioralPattern,
  type LongitudinalTimelineResult,
  type GoalPlanningResult,
  type DetectedRecurringItem,
  type ExpenseStructureResult,
  type CashflowFloorResult,
  type LiquidityHorizonResult
} from "../lib/financialMath"

export type {
  BudgetRiskLevel,
  CategoryMoMShift,
  ActionCenterInsight,
  MonthlyFinancialReviewData,
  PersonalBaselineResult,
  BehavioralPattern,
  LongitudinalTimelineResult,
  GoalPlanningResult,
  DetectedRecurringItem,
  ExpenseStructureResult,
  CashflowFloorResult,
  LiquidityHorizonResult
}
export type MomentumState = "positive" | "neutral" | "negative"

interface FinancialIntelligenceOptions {
  transactions: Transaction[]
  budgetTarget: number
  totalAssets: number
  bills: Bill[]
  categories?: Category[]
  wallets?: Wallet[]
  activeMonthDate?: Date
}

export function useFinancialIntelligence({
  transactions,
  budgetTarget,
  totalAssets,
  bills,
  categories = [],
  wallets = [],
  activeMonthDate = new Date()
}: FinancialIntelligenceOptions) {
  return useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const daysElapsed = now.getDate()
    const totalDays = getDaysInMonth(now)

    // 1. Current Month Aggregates
    const currentMonthAgg = computeMonthAggregates(transactions, currentYear, currentMonth)
    const { totalIncome, totalExpense, netCashflow, savingsRate } = currentMonthAgg

    // 2. Previous Month Aggregates
    const prevDate = subMonths(now, 1)
    const prevYear = prevDate.getFullYear()
    const prevMonth = prevDate.getMonth() + 1
    const prevMonthAgg = computeMonthAggregates(transactions, prevYear, prevMonth)

    // 3. Personal Historical Baselines (Phase II)
    const personalBaselines = calculatePersonalBaselines(transactions, categories, now)

    // 4. Behavioral Spending Patterns (Phase II)
    const behavioralPatterns = detectBehavioralPatterns(transactions, personalBaselines, now)

    // 5. Spending Pace & Projections
    const budget = budgetTarget > 0 ? budgetTarget : 0
    const pace = computeSpendingPace(totalExpense, budget, daysElapsed, totalDays)
    const risk = computeBudgetRisk(pace.consumedPct, pace.timePct, budget)

    // 6. Category MoM Shifts
    const currentMonthTxs = getMonthTransactions(transactions, currentYear, currentMonth)
    const prevMonthTxs = getMonthTransactions(transactions, prevYear, prevMonth)
    const categoryShifts = computeCategoryMoMChanges(currentMonthTxs, prevMonthTxs, categories)
    const categoryMoMMap = new Map<string, CategoryMoMShift>()
    categoryShifts.forEach(c => categoryMoMMap.set(c.categoryId, c))

    // 7. Financial Momentum
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

    // 8. Safety Buffer
    const unpaidUpcomingBills = bills.filter(b => !b.is_paid)
    const committedAmount = unpaidUpcomingBills.reduce((s, b) => s + Number(b.amount || 0), 0)
    const safeToSpend = Math.max(0, totalAssets - committedAmount)

    // 9. Financial Action Center Insight (Extended with Personal Baseline)
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

    // 10. Monthly Financial Review (for Statistics Page)
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

    // Enrich Monthly Review with Baseline Comparison if available
    if (personalBaselines.status !== "insufficient") {
      const minStr = `Rp ${(personalBaselines.typicalExpenseRange[0] / 1000000).toFixed(1)}M`
      const maxStr = `Rp ${(personalBaselines.typicalExpenseRange[1] / 1000000).toFixed(1)}M`
      monthlyReview.baselineComparison = {
        typicalRangeText: `${minStr} – ${maxStr}`,
        statusText: personalBaselines.currentMonthStatus === "above_range"
          ? "Above your typical monthly range"
          : personalBaselines.currentMonthStatus === "below_range"
          ? "Below your typical monthly range"
          : "Within your typical monthly range",
        isAboveRange: personalBaselines.currentMonthStatus === "above_range"
      }
    }

    // 11. Longitudinal Timeline Helper (Phase II)
    const getLongitudinalTimeline = (range: "3M" | "6M" | "12M" | "ALL" = "6M") => {
      return calculateLongitudinalTimeline(transactions, range, now)
    }

    // 12. Planning & Goal Trajectory Helper (Phase II)
    const getGoalPlanning = (goal: Goal) => {
      return calculateGoalPlanning(goal, personalBaselines, now)
    }

    // 13. Helpers for "Why?" Drill-Down Insights
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

    // ==========================================
    // PHASE III: CASHFLOW INTELLIGENCE & STRUCTURE
    // ==========================================

    // 14. Recurring Transaction Detection
    const recurringItems = useMemo(() => {
      return detectRecurringTransactions(transactions, bills, categories, now)
    }, [transactions, bills, categories, now])

    // 15. Expense Structure Analysis (Fixed/Variable/Discretionary)
    const expenseStructure = useMemo(() => {
      const currentMonthTxs = getMonthTransactions(transactions, currentYear, currentMonth)
      return calculateExpenseStructure(currentMonthTxs, recurringItems, {}, now)
    }, [transactions, recurringItems, currentYear, currentMonth, now])

    // 16. Cashflow Floor Projection (7/14/30 days)
    const cashflowFloor = useMemo(() => {
      const walletBalances = calculateWalletBalances(transactions, wallets)
      const currentBalance = walletBalances.totalAssets
      return calculateCashflowFloor(currentBalance, bills, recurringItems, transactions, now)
    }, [transactions, wallets, bills, recurringItems, now])

    // 17. Liquidity Horizon Analysis
    const liquidityHorizon = useMemo(() => {
      const walletBalances = calculateWalletBalances(transactions, wallets)
      const liquidAccounts = walletBalances.allAccounts
        .filter(a => a.balance > 0)
        .map(a => ({ name: a.name, balance: a.balance, icon: a.icon }))
      
      return calculateLiquidityHorizon(
        walletBalances.totalAssets,
        personalBaselines,
        expenseStructure,
        liquidAccounts
      )
    }, [transactions, wallets, personalBaselines, expenseStructure])

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
      // Phase II Personal Financial Intelligence
      personalBaselines,
      behavioralPatterns,
      getLongitudinalTimeline,
      getGoalPlanning,
      // Intelligence Layers
      actionCenterInsight,
      monthlyReview,
      categoryShifts,
      categoryMoMMap,
      explainCategory,
      explainExpenseChange,
      // Phase III Cashflow Intelligence
      recurringItems,
      expenseStructure,
      cashflowFloor,
      liquidityHorizon
    }
  }, [transactions, budgetTarget, totalAssets, bills, categories, wallets, activeMonthDate])
}
