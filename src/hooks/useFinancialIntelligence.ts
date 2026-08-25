import { useMemo } from "react"
import { getDaysInMonth } from "date-fns"
import type { Transaction, Bill } from "../lib/types"

export type BudgetRiskLevel = "SAFE" | "WATCH" | "AT RISK"
export type MomentumState = "positive" | "neutral" | "negative"

interface FinancialIntelligenceOptions {
  transactions: Transaction[]
  budgetTarget: number
  totalAssets: number
  bills: Bill[]
}

export function useFinancialIntelligence({
  transactions,
  budgetTarget,
  totalAssets,
  bills
}: FinancialIntelligenceOptions) {
  return useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const daysElapsed = now.getDate()
    const totalDays = getDaysInMonth(now)

    // Current Month Transactions Filter
    let totalIncome = 0
    let totalExpense = 0

    transactions.forEach(t => {
      if (!t.occurred_on) return
      const d = new Date(t.occurred_on)
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return

      const isCorrection = t.type === "adjustment" || t.note?.toLowerCase().includes("correction") || t.note?.toLowerCase().includes("koreksi saldo") || t.note?.toLowerCase().includes("balance adjustment")
      if (isCorrection || t.type === "transfer") return

      const amt = Number(t.amount || 0)
      if (t.type === "income") totalIncome += amt
      else if (t.type === "expense") totalExpense += amt
    })

    const netCashflow = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? Math.max(0, (netCashflow / totalIncome) * 100) : 0

    // 1. Spending Pace
    const budget = budgetTarget > 0 ? budgetTarget : 0
    const expectedPace = budget > 0 ? (daysElapsed / totalDays) * budget : 0
    const paceDiff = budget > 0 ? totalExpense - expectedPace : 0
    const isAheadOfPace = paceDiff > 0

    // 2. Projected Month-End Spending
    const dailyAvg = totalExpense / Math.max(1, daysElapsed)
    const projectedMonthEnd = Math.round(dailyAvg * totalDays)
    const projectedVariance = budget > 0 ? projectedMonthEnd - budget : 0

    // 3. Budget Risk Level (SAFE / WATCH / AT RISK)
    let budgetRisk: BudgetRiskLevel = "SAFE"
    const consumedPct = budget > 0 ? (totalExpense / budget) * 100 : 0
    const timePct = (daysElapsed / totalDays) * 100

    if (budget > 0) {
      if (consumedPct >= 95 || consumedPct > timePct + 20) {
        budgetRisk = "AT RISK"
      } else if (consumedPct > timePct + 5) {
        budgetRisk = "WATCH"
      } else {
        budgetRisk = "SAFE"
      }
    }

    // 4. Financial Momentum
    let momentum: MomentumState = "neutral"
    let momentumReason = "Balanced income and expense pace"

    if (netCashflow > 0 && (!budget || !isAheadOfPace || savingsRate >= 25)) {
      momentum = "positive"
      momentumReason = savingsRate >= 30 
        ? `Strong ${savingsRate.toFixed(0)}% savings rate with healthy cashflow` 
        : `Surplus cashflow and controlled spending pace`
    } else if (netCashflow < 0 || (budget > 0 && budgetRisk === "AT RISK")) {
      momentum = "negative"
      momentumReason = netCashflow < 0 
        ? `Outflow exceeds inflow this month by ${Math.abs(netCashflow).toLocaleString("id-ID")}` 
        : `Spending pace is elevated against budget limit`
    } else {
      momentum = "neutral"
      momentumReason = `Steady cashflow with ${savingsRate.toFixed(0)}% saved`
    }

    // 5. Balance Safety Buffer
    const unpaidUpcomingBills = bills.filter(b => !b.is_paid)
    const committedAmount = unpaidUpcomingBills.reduce((s, b) => s + Number(b.amount || 0), 0)
    const safeToSpend = Math.max(0, totalAssets - committedAmount)

    return {
      daysElapsed,
      totalDays,
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      // Spending Pace
      budget,
      expectedPace,
      paceDiff,
      isAheadOfPace,
      // Projection
      dailyAvg,
      projectedMonthEnd,
      projectedVariance,
      // Risk & Momentum
      budgetRisk,
      consumedPct,
      timePct,
      momentum,
      momentumReason,
      // Safety Buffer
      totalAssets,
      committedAmount,
      safeToSpend,
      unpaidBillsCount: unpaidUpcomingBills.length
    }
  }, [transactions, budgetTarget, totalAssets, bills])
}
