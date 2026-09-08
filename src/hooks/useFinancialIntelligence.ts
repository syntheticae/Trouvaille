import { useMemo } from "react";
import { getDaysInMonth, isSameMonth, subMonths } from "date-fns";
import type { Transaction, Bill, Category, Goal } from "../lib/types";
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
  calculateExpenseVolatility,
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
  type LiquidityHorizonResult,
  type ExpenseVolatilityResult,
  type CashflowCalendarDayPoint,
  type ExpenseClassification,
} from "../lib/financialMath";

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
  LiquidityHorizonResult,
  ExpenseVolatilityResult,
  CashflowCalendarDayPoint,
  ExpenseClassification,
};
export type MomentumState = "positive" | "neutral" | "negative";

interface FinancialIntelligenceOptions {
  transactions: Transaction[];
  budgetTarget: number;
  totalAssets: number;
  liquidAssets?: number;
  liquidAccounts?: Array<{ name: string; balance: number; icon: string }>;
  bills: Bill[];
  categories?: Category[];
  categoryOverrides?: Record<string, ExpenseClassification>;
  activeMonthDate?: Date;
}

export function useFinancialIntelligence({
  transactions,
  budgetTarget,
  totalAssets,
  liquidAssets,
  liquidAccounts,
  bills,
  categories = [],
  categoryOverrides = {},
  activeMonthDate = new Date(),
}: FinancialIntelligenceOptions) {
  return useMemo(() => {
    const now = new Date();
    const referenceDate = activeMonthDate;
    const isCurrentReferenceMonth = isSameMonth(referenceDate, now);
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth() + 1;
    const totalDays = getDaysInMonth(referenceDate);
    const daysElapsed = isSameMonth(referenceDate, now)
      ? now.getDate()
      : totalDays;

    // 1. Current Month Aggregates
    const currentMonthAgg = computeMonthAggregates(
      transactions,
      currentYear,
      currentMonth,
    );
    const { totalIncome, totalExpense, netCashflow, savingsRate } =
      currentMonthAgg;

    // 2. Previous Month Aggregates
    const prevDate = subMonths(referenceDate, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prevMonthAgg = computeMonthAggregates(
      transactions,
      prevYear,
      prevMonth,
    );

    // 3. Personal Historical Baselines (Phase II)
    const personalBaselines = calculatePersonalBaselines(
      transactions,
      categories,
      referenceDate,
    );

    // 4. Behavioral Spending Patterns (Phase II)
    const behavioralPatterns = detectBehavioralPatterns(
      transactions,
      personalBaselines,
      referenceDate,
    );

    // 5. Spending Pace & Projections
    const budget = budgetTarget > 0 ? budgetTarget : 0;
    const pace = computeSpendingPace(
      totalExpense,
      budget,
      daysElapsed,
      totalDays,
    );
    const risk = computeBudgetRisk(pace.consumedPct, pace.timePct, budget);

    // 6. Category MoM Shifts
    const currentMonthTxs = getMonthTransactions(
      transactions,
      currentYear,
      currentMonth,
    );
    const prevMonthTxs = getMonthTransactions(
      transactions,
      prevYear,
      prevMonth,
    );
    const categoryShifts = computeCategoryMoMChanges(
      currentMonthTxs,
      prevMonthTxs,
      categories,
    );
    const categoryMoMMap = new Map<string, CategoryMoMShift>();
    categoryShifts.forEach((c) => categoryMoMMap.set(c.categoryId, c));

    // 7. Financial Momentum
    let momentum: MomentumState = "neutral";
    let momentumReason = "Balanced income and expense pace";

    if (
      netCashflow > 0 &&
      (!budget || !pace.isAheadOfPace || savingsRate >= 25)
    ) {
      momentum = "positive";
      momentumReason =
        savingsRate >= 30
          ? `Strong ${savingsRate.toFixed(0)}% savings rate with healthy cashflow`
          : `Surplus cashflow and controlled spending pace`;
    } else if (
      netCashflow < 0 ||
      (budget > 0 && risk.riskLevel === "AT RISK")
    ) {
      momentum = "negative";
      momentumReason =
        netCashflow < 0
          ? `Outflow exceeds inflow ${isCurrentReferenceMonth ? "this month" : "in the selected month"} by ${Math.abs(netCashflow).toLocaleString("id-ID")}`
          : `Spending pace is elevated against budget limit`;
    } else {
      momentum = "neutral";
      momentumReason = `Steady cashflow with ${savingsRate.toFixed(0)}% saved`;
    }

    // 8. Safety Buffer
    const unpaidUpcomingBills = bills.filter((b) => !b.is_paid);
    const committedAmount = unpaidUpcomingBills.reduce(
      (s, b) => s + Number(b.amount || 0),
      0,
    );
    const safeToSpend = Math.max(0, totalAssets - committedAmount);

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
      unpaidBillsCount: unpaidUpcomingBills.length,
    });

    // 10. Monthly Financial Review (for Statistics Page)
    const activeReviewTxs = getMonthTransactions(
      transactions,
      activeMonthDate.getFullYear(),
      activeMonthDate.getMonth() + 1,
    );
    const activePrevReviewDate = subMonths(activeMonthDate, 1);
    const activePrevReviewTxs = getMonthTransactions(
      transactions,
      activePrevReviewDate.getFullYear(),
      activePrevReviewDate.getMonth() + 1,
    );

    const monthlyReview = generateMonthlyFinancialReview(
      activeReviewTxs,
      activePrevReviewTxs,
      categories,
      budget,
      activeMonthDate,
    );

    // Enrich Monthly Review with Baseline Comparison if available
    if (personalBaselines.status !== "insufficient") {
      const minStr = `Rp ${(personalBaselines.typicalExpenseRange[0] / 1000000).toFixed(1)}M`;
      const maxStr = `Rp ${(personalBaselines.typicalExpenseRange[1] / 1000000).toFixed(1)}M`;
      monthlyReview.baselineComparison = {
        typicalRangeText: `${minStr} – ${maxStr}`,
        statusText:
          personalBaselines.currentMonthStatus === "above_range"
            ? "Above your typical monthly range"
            : personalBaselines.currentMonthStatus === "below_range"
              ? "Below your typical monthly range"
              : "Within your typical monthly range",
        isAboveRange: personalBaselines.currentMonthStatus === "above_range",
      };
    }

    // 11. Longitudinal Timeline Helper (Phase II)
    const getLongitudinalTimeline = (
      range: "3M" | "6M" | "12M" | "ALL" = "6M",
    ) => {
      return calculateLongitudinalTimeline(transactions, range, referenceDate);
    };

    // 12. Planning & Goal Trajectory Helper (Phase II)
    const getGoalPlanning = (goal: Goal) => {
      return calculateGoalPlanning(goal, personalBaselines, referenceDate);
    };

    // 13. Helpers for "Why?" Drill-Down Insights
    const explainCategory = (catId: string) => {
      return categoryMoMMap.get(catId) || null;
    };

    const explainExpenseChange = () => {
      const topContributors = categoryShifts
        .filter((s) => s.deltaAmount !== 0)
        .slice(0, 4);
      return {
        totalCurrent: totalExpense,
        totalPrevious: prevMonthAgg.totalExpense,
        delta: totalExpense - prevMonthAgg.totalExpense,
        pctChange:
          prevMonthAgg.totalExpense > 0
            ? Math.round(
                ((totalExpense - prevMonthAgg.totalExpense) /
                  prevMonthAgg.totalExpense) *
                  100,
              )
            : 0,
        topContributors,
      };
    };

    // 14. Phase III: Recurring Transaction Detection
    const detectedRecurring = detectRecurringTransactions(
      transactions,
      bills,
      categories,
      referenceDate,
    );

    // 15. Phase III: Expense Structure (Fixed, Variable, Discretionary)
    const expenseStructure = calculateExpenseStructure(
      activeReviewTxs,
      detectedRecurring,
      categoryOverrides,
      activeMonthDate,
    );

    // 16. Phase III: Cashflow Calendar & Cashflow Floor
    const effectiveLiquidAssets =
      liquidAssets !== undefined ? liquidAssets : totalAssets;
    const cashflowFloor = calculateCashflowFloor(
      effectiveLiquidAssets,
      bills,
      detectedRecurring,
      14,
      referenceDate,
    );
    const getCashflowHorizon = (days = 14) => {
      return calculateCashflowFloor(
        effectiveLiquidAssets,
        bills,
        detectedRecurring,
        days,
        referenceDate,
      );
    };

    // 17. Phase III: Liquidity Horizon
    const liquidityHorizon = calculateLiquidityHorizon(
      effectiveLiquidAssets,
      personalBaselines,
      expenseStructure,
      liquidAccounts,
    );

    // 18. Expense Volatility (Spending Stability)
    const expenseVolatility = calculateExpenseVolatility(
      transactions,
      referenceDate,
    );

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
      liquidAssets: effectiveLiquidAssets,
      committedAmount,
      safeToSpend,
      unpaidBillsCount: unpaidUpcomingBills.length,
      // Phase II Personal Financial Intelligence
      personalBaselines,
      behavioralPatterns,
      getLongitudinalTimeline,
      getGoalPlanning,
      // Phase III Cashflow Intelligence & Financial Structure
      detectedRecurring,
      expenseStructure,
      cashflowFloor,
      getCashflowHorizon,
      liquidityHorizon,
      // Expense Volatility
      expenseVolatility,
      // Intelligence Layers
      actionCenterInsight,
      monthlyReview,
      categoryShifts,
      categoryMoMMap,
      explainCategory,
      explainExpenseChange,
    };
  }, [
    transactions,
    budgetTarget,
    totalAssets,
    liquidAssets,
    liquidAccounts,
    bills,
    categories,
    categoryOverrides,
    activeMonthDate,
  ]);
}
