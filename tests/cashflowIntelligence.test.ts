import { describe, expect, it } from "vitest"
import {
  calculateCashflowFloor,
  calculateExpenseStructure,
  calculateLiquidityHorizon,
  detectRecurringTransactions
} from "../src/lib/financialMath"
import type { Bill, Category, Transaction } from "../src/lib/types"

const expenseCategories: Category[] = [
  { id: "c-hunian", user_id: "u", name: "Hunian", emoji: "/icons/hunian.png", type: "expense", is_default: true, created_at: "" },
  { id: "c-makanan", user_id: "u", name: "Makanan", emoji: "/icons/makanan.png", type: "expense", is_default: true, created_at: "" },
  { id: "c-cafe", user_id: "u", name: "Cafe", emoji: "/icons/cafe.png", type: "expense", is_default: true, created_at: "" },
  { id: "c-stream", user_id: "u", name: "Streaming", emoji: "/icons/subscription.png", type: "expense", is_default: true, created_at: "" },
  { id: "c-gaji", user_id: "u", name: "Gaji", emoji: "/icons/gaji.png", type: "income", is_default: true, created_at: "" }
]

describe("Phase III: Cashflow Intelligence Test Suite", () => {
  it("detects recurring monthly patterns, marks confirmed items, and suppresses weak evidence", () => {
    const txs: Transaction[] = [
      { id: "t1", user_id: "u", amount: 400000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-stream", note: "PLN Aug", occurred_on: "2026-05-02", created_at: "", categories: expenseCategories[3] },
      { id: "t2", user_id: "u", amount: 420000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-stream", note: "PLN Sep", occurred_on: "2026-06-02", created_at: "", categories: expenseCategories[3] },
      { id: "t3", user_id: "u", amount: 390000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-stream", note: "PLN Oct", occurred_on: "2026-07-02", created_at: "", categories: expenseCategories[3] },
      { id: "t4", user_id: "u", amount: 410000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-stream", note: "PLN Nov", occurred_on: "2026-08-02", created_at: "", categories: expenseCategories[3] },
      { id: "t5", user_id: "u", amount: 100000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Random brunch", occurred_on: "2026-07-01", created_at: "", categories: expenseCategories[2] },
      { id: "t6", user_id: "u", amount: 300000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Random brunch deluxe", occurred_on: "2026-07-19", created_at: "", categories: expenseCategories[2] }
    ]

    const bills: Bill[] = [
      { id: "b1", user_id: "u", title: "PLN", amount: 400000, due_date: "2026-09-02", repeat_rule: "monthly", is_paid: false, note: null, created_at: "" }
    ]

    const recurring = detectRecurringTransactions(txs, bills, expenseCategories, new Date("2026-08-20T12:00:00Z"))
    const pln = recurring.find(item => item.normalizedMerchant === "pln")

    expect(pln).toBeDefined()
    expect(pln?.frequency).toBe("monthly")
    expect(pln?.confidence).toBe("strong")
    expect(pln?.status).toBe("confirmed")
    expect(pln?.typicalAmount).toBe(405000)
    expect(recurring.find(item => item.categoryName === "Cafe")).toBeUndefined()
  })

  it("marks stale recurring patterns as inactive when they miss multiple expected cycles", () => {
    const txs: Transaction[] = [
      { id: "g1", user_id: "u", amount: 150000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Gym weekly", occurred_on: "2026-05-01", created_at: "", categories: expenseCategories[2] },
      { id: "g2", user_id: "u", amount: 150000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Gym weekly", occurred_on: "2026-05-08", created_at: "", categories: expenseCategories[2] },
      { id: "g3", user_id: "u", amount: 150000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Gym weekly", occurred_on: "2026-05-15", created_at: "", categories: expenseCategories[2] },
      { id: "g4", user_id: "u", amount: 150000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Gym weekly", occurred_on: "2026-05-22", created_at: "", categories: expenseCategories[2] }
    ]

    const recurring = detectRecurringTransactions(txs, [], expenseCategories, new Date("2026-08-20T12:00:00Z"))
    expect(recurring[0]?.status).toBe("inactive")
    expect(recurring[0]?.frequency).toBe("weekly")
  })

  it("classifies expense structure with reconciliation and category overrides", () => {
    const txs: Transaction[] = [
      { id: "e1", user_id: "u", amount: 1000000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-hunian", note: "Rent", occurred_on: "2026-08-01", created_at: "", categories: expenseCategories[0] },
      { id: "e2", user_id: "u", amount: 500000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-makanan", note: "Groceries", occurred_on: "2026-08-03", created_at: "", categories: expenseCategories[1] },
      { id: "e3", user_id: "u", amount: 300000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-cafe", note: "Coffee beans", occurred_on: "2026-08-05", created_at: "", categories: expenseCategories[2] },
      { id: "e4", user_id: "u", amount: 200000, type: "expense", wallet_id: "w1", to_wallet_id: null, category_id: "c-stream", note: "Streaming pack", occurred_on: "2026-08-07", created_at: "", categories: expenseCategories[3] }
    ]

    const recurringItems = [
      {
        id: "r-stream",
        title: "Streaming pack",
        normalizedMerchant: "streaming pack",
        categoryId: "c-stream",
        categoryName: "Streaming",
        categoryEmoji: "/icons/subscription.png",
        walletId: "w1",
        type: "expense" as const,
        frequency: "monthly" as const,
        typicalAmount: 200000,
        amountRange: [200000, 200000] as [number, number],
        confidence: "moderate" as const,
        occurrencesCount: 2,
        lastOccurrenceDate: "2026-08-07",
        nextExpectedDate: "2026-09-07",
        status: "detected" as const,
        matchingTransactionIds: ["e4"],
        explanation: ""
      }
    ]

    const structure = calculateExpenseStructure(txs, recurringItems, { cafe: "variable" }, new Date("2026-08-15T12:00:00Z"))

    expect(structure.totalExpense).toBe(2000000)
    expect(structure.fixedAmount).toBe(1200000)
    expect(structure.variableAmount).toBe(800000)
    expect(structure.discretionaryAmount).toBe(0)
    expect(structure.unclassifiedAmount).toBe(0)
    expect(structure.committedAmount + structure.flexibleAmount).toBe(structure.totalExpense)
    expect(structure.reconciliationCheck).toBe(true)
    expect(structure.items.find(item => item.name === "Cafe")?.classification).toBe("variable")
  })

  it("projects cashflow floor across scheduled bills and recurring inflows", () => {
    const bills: Bill[] = [
      { id: "b1", user_id: "u", title: "Rent", amount: 500000, due_date: "2026-08-03", repeat_rule: "monthly", is_paid: false, note: null, created_at: "" },
      { id: "b2", user_id: "u", title: "Insurance", amount: 400000, due_date: "2026-08-07", repeat_rule: "monthly", is_paid: false, note: null, created_at: "" }
    ]

    const recurringItems = [
      {
        id: "salary",
        title: "Salary",
        normalizedMerchant: "salary",
        categoryId: "c-gaji",
        categoryName: "Gaji",
        categoryEmoji: "/icons/gaji.png",
        walletId: "w1",
        type: "income" as const,
        frequency: "monthly" as const,
        typicalAmount: 1000000,
        amountRange: [1000000, 1000000] as [number, number],
        confidence: "strong" as const,
        occurrencesCount: 4,
        lastOccurrenceDate: "2026-07-05",
        nextExpectedDate: "2026-08-05",
        status: "detected" as const,
        matchingTransactionIds: [],
        explanation: ""
      },
      {
        id: "internet",
        title: "Internet",
        normalizedMerchant: "internet",
        categoryId: "c-stream",
        categoryName: "Streaming",
        categoryEmoji: "/icons/subscription.png",
        walletId: "w1",
        type: "expense" as const,
        frequency: "monthly" as const,
        typicalAmount: 300000,
        amountRange: [300000, 300000] as [number, number],
        confidence: "moderate" as const,
        occurrencesCount: 3,
        lastOccurrenceDate: "2026-07-04",
        nextExpectedDate: "2026-08-04",
        status: "detected" as const,
        matchingTransactionIds: [],
        explanation: ""
      }
    ]

    const forecast = calculateCashflowFloor(2000000, bills, recurringItems, 7, new Date("2026-08-01T12:00:00Z"))

    expect(forecast.lowestBalance).toBe(1200000)
    expect(forecast.lowestBalanceDate).toBe("2026-08-04")
    expect(forecast.daysUntilLowest).toBe(3)
    expect(forecast.upcomingCommitmentsTotal).toBe(1200000)
    expect(forecast.upcomingInflowsTotal).toBe(1000000)
    expect(forecast.netProjectedChange).toBe(-200000)
    expect(forecast.dailyPoints).toHaveLength(7)
  })

  it("computes liquidity horizon only when historical baselines are sufficient", () => {
    const insufficient = calculateLiquidityHorizon(8000000, {
      status: "insufficient",
      confidence: "low",
      historicalMonthsCount: 1,
      message: "Need more history",
      medianExpense: 0,
      meanExpense: 0,
      typicalExpenseRange: [0, 0],
      medianIncome: 0,
      typicalIncomeRange: [0, 0],
      medianNetCashflow: 0,
      typicalNetCashflowRange: [0, 0],
      medianTxSize: 0,
      monthlyTxFrequency: 0,
      currentMonthExpense: 0,
      currentMonthStatus: "within_range",
      currentMonthDelta: 0,
      currentMonthDeviationPct: 0,
      categoryBaselines: []
    })

    expect(insufficient.status).toBe("insufficient")
    expect(insufficient.totalCoverageMonths).toBe(0)

    const sufficient = calculateLiquidityHorizon(
      10000000,
      {
        status: "stable",
        confidence: "high",
        historicalMonthsCount: 4,
        medianExpense: 4000000,
        meanExpense: 4100000,
        typicalExpenseRange: [3800000, 4300000],
        medianIncome: 7000000,
        typicalIncomeRange: [6800000, 7200000],
        medianNetCashflow: 3000000,
        typicalNetCashflowRange: [2500000, 3200000],
        medianTxSize: 200000,
        monthlyTxFrequency: 18,
        currentMonthExpense: 3900000,
        currentMonthStatus: "within_range",
        currentMonthDelta: -100000,
        currentMonthDeviationPct: -3,
        categoryBaselines: []
      },
      {
        totalExpense: 3900000,
        fixedAmount: 1500000,
        fixedPercentage: 38.5,
        variableAmount: 1700000,
        variablePercentage: 43.6,
        discretionaryAmount: 700000,
        discretionaryPercentage: 17.9,
        unclassifiedAmount: 0,
        unclassifiedPercentage: 0,
        committedAmount: 1500000,
        flexibleAmount: 2400000,
        committedPercentage: 38.5,
        flexiblePercentage: 61.5,
        items: [],
        reconciliationCheck: true
      },
      [{ name: "BCA", balance: 6000000, icon: "/icons/Budgets/BCA.png" }]
    )

    expect(sufficient.status).toBe("sufficient")
    expect(sufficient.totalCoverageMonths).toBe(2.5)
    expect(sufficient.committedCoverageMonths).toBeCloseTo(6.7, 1)
    expect(sufficient.resilienceTier).toBe("MODERATE")
  })
})
