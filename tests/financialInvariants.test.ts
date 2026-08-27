import { describe, it, expect } from "vitest"
import { calculateWalletBalances, computeMonthAggregates, isCorrectionTx } from "../src/lib/financialMath"
import type { Transaction, Wallet } from "../src/lib/types"

describe("Financial Invariants Test Suite", () => {
  const wallets: Wallet[] = [
    { id: "w-bca", user_id: "user-1", name: "BCA", icon: "/icons/Budgets/BCA.png", created_at: "2026-01-01T00:00:00Z" },
    { id: "w-cash", user_id: "user-1", name: "Cash", icon: "/icons/Budgets/Cash.png", created_at: "2026-01-01T00:00:00Z" },
    { id: "w-ovo", user_id: "user-1", name: "Ovo", icon: "/icons/Budgets/Ovo.png", created_at: "2026-01-01T00:00:00Z" },
  ]

  // Invariant 1: Wallet Balance Invariant
  it("Invariant 1: Wallet Balance reflects exact sum of income, expense, and corrections", () => {
    const txs: Transaction[] = [
      { id: "tx-1", user_id: "user-1", amount: 5000000, type: "income", wallet_id: "w-bca", to_wallet_id: null, category_id: "cat-sal", note: "Salary", occurred_on: "2026-08-01", created_at: "2026-08-01T10:00:00Z" },
      { id: "tx-2", user_id: "user-1", amount: 150000, type: "expense", wallet_id: "w-bca", to_wallet_id: null, category_id: "cat-food", note: "Dinner", occurred_on: "2026-08-02", created_at: "2026-08-02T19:00:00Z" },
      { id: "tx-3", user_id: "user-1", amount: 50000, type: "adjustment", wallet_id: "w-bca", to_wallet_id: null, category_id: null, note: "Correction (+) BCA: Found cash", occurred_on: "2026-08-03", created_at: "2026-08-03T12:00:00Z" },
    ]

    const res = calculateWalletBalances(txs, wallets)
    expect(res.balancesById["w-bca"]).toBe(4900000)
    expect(res.totalAssets).toBe(4900000)
  })

  // Invariant 2: Transfer Zero-Sum Invariant
  it("Invariant 2: Transfer reduces Source by X, increases Dest by X, and Net Worth is strictly unchanged", () => {
    const initialTxs: Transaction[] = [
      { id: "tx-1", user_id: "user-1", amount: 5000000, type: "income", wallet_id: "w-bca", to_wallet_id: null, category_id: "cat-sal", note: "Initial BCA", occurred_on: "2026-08-01", created_at: "2026-08-01T08:00:00Z" },
      { id: "tx-2", user_id: "user-1", amount: 1000000, type: "income", wallet_id: "w-ovo", to_wallet_id: null, category_id: "cat-sal", note: "Initial OVO", occurred_on: "2026-08-01", created_at: "2026-08-01T08:00:00Z" },
    ]

    const before = calculateWalletBalances(initialTxs, wallets)
    expect(before.balancesById["w-bca"]).toBe(5000000)
    expect(before.balancesById["w-ovo"]).toBe(1000000)
    expect(before.totalAssets).toBe(6000000)
    expect(before.netWorth).toBe(6000000)

    const transferTx: Transaction = {
      id: "tx-transfer",
      user_id: "user-1",
      amount: 500000,
      type: "transfer",
      wallet_id: "w-bca",
      to_wallet_id: "w-ovo",
      category_id: null,
      note: "Top up OVO from BCA",
      occurred_on: "2026-08-05",
      created_at: "2026-08-05T14:00:00Z"
    }

    const after = calculateWalletBalances([...initialTxs, transferTx], wallets)
    expect(after.balancesById["w-bca"]).toBe(4500000)
    expect(after.balancesById["w-ovo"]).toBe(1500000)
    expect(after.totalAssets).toBe(6000000)
    expect(after.netWorth).toBe(6000000)
  })

  // Invariant 3: Expense Atomicity on Edit
  it("Invariant 3: Editing an expense from X1 to X2 atomically reverses X1 and applies X2", () => {
    const initialTxs: Transaction[] = [
      { id: "tx-1", user_id: "user-1", amount: 2000000, type: "income", wallet_id: "w-cash", to_wallet_id: null, category_id: null, note: "Cash deposit", occurred_on: "2026-08-01", created_at: "2026-08-01T00:00:00Z" },
      { id: "tx-food", user_id: "user-1", amount: 50000, type: "expense", wallet_id: "w-cash", to_wallet_id: null, category_id: "cat-food", note: "Lunch", occurred_on: "2026-08-02", created_at: "2026-08-02T12:00:00Z" },
    ]

    const beforeEdit = calculateWalletBalances(initialTxs, wallets)
    expect(beforeEdit.balancesById["w-cash"]).toBe(1950000)

    const editedTxs = initialTxs.map(t => t.id === "tx-food" ? { ...t, amount: 80000 } : t)
    const afterEdit = calculateWalletBalances(editedTxs, wallets)
    expect(afterEdit.balancesById["w-cash"]).toBe(1920000)
  })

  // Invariant 4: Delete Idempotency & Reversal
  it("Invariant 4: Deleting a transaction reverses its financial effect accurately", () => {
    const initialTxs: Transaction[] = [
      { id: "tx-1", user_id: "user-1", amount: 1000000, type: "income", wallet_id: "w-cash", to_wallet_id: null, category_id: null, note: "Deposit", occurred_on: "2026-08-01", created_at: "2026-08-01T00:00:00Z" },
      { id: "tx-delete-me", user_id: "user-1", amount: 250000, type: "expense", wallet_id: "w-cash", to_wallet_id: null, category_id: "cat-shopping", note: "Shoes", occurred_on: "2026-08-02", created_at: "2026-08-02T10:00:00Z" },
    ]

    const beforeDelete = calculateWalletBalances(initialTxs, wallets)
    expect(beforeDelete.balancesById["w-cash"]).toBe(750000)

    const afterDelete = calculateWalletBalances(initialTxs.filter(t => t.id !== "tx-delete-me"), wallets)
    expect(afterDelete.balancesById["w-cash"]).toBe(1000000)
  })

  // Invariant 5: Net Cashflow Invariant
  it("Invariant 5: Monthly cashflow strictly excludes internal transfers and corrections", () => {
    const txs: Transaction[] = [
      { id: "tx-1", user_id: "user-1", amount: 10000000, type: "income", wallet_id: "w-bca", to_wallet_id: null, category_id: "cat-sal", note: "Monthly Salary", occurred_on: "2026-08-01", created_at: "2026-08-01T08:00:00Z" },
      { id: "tx-2", user_id: "user-1", amount: 2500000, type: "expense", wallet_id: "w-bca", to_wallet_id: null, category_id: "cat-rent", note: "Apartment Rent", occurred_on: "2026-08-02", created_at: "2026-08-02T10:00:00Z" },
      { id: "tx-3", user_id: "user-1", amount: 1000000, type: "transfer", wallet_id: "w-bca", to_wallet_id: "w-cash", category_id: null, note: "ATM Withdrawal", occurred_on: "2026-08-03", created_at: "2026-08-03T11:00:00Z" },
      { id: "tx-4", user_id: "user-1", amount: 500000, type: "adjustment", wallet_id: "w-cash", to_wallet_id: null, category_id: null, note: "Correction (+) Cash", occurred_on: "2026-08-04", created_at: "2026-08-04T12:00:00Z" },
    ]

    const agg = computeMonthAggregates(txs, 2026, 8)
    expect(agg.totalIncome).toBe(10000000)
    expect(agg.totalExpense).toBe(2500000)
    expect(agg.netCashflow).toBe(7500000)
    expect(agg.savingsRate).toBe(75)
    expect(agg.txCount).toBe(1)
  })

  // Invariant 6: Correction detection
  it("Invariant 6: isCorrectionTx correctly detects all correction note & type variants", () => {
    expect(isCorrectionTx({ id: "1", user_id: "u", amount: 100, type: "adjustment", wallet_id: null, to_wallet_id: null, category_id: null, note: null, occurred_on: "2026-08-01", created_at: "" })).toBe(true)
    expect(isCorrectionTx({ id: "2", user_id: "u", amount: 100, type: "income", wallet_id: null, to_wallet_id: null, category_id: null, note: "Correction (+) BCA", occurred_on: "2026-08-01", created_at: "" })).toBe(true)
    expect(isCorrectionTx({ id: "3", user_id: "u", amount: 100, type: "expense", wallet_id: null, to_wallet_id: null, category_id: null, note: "Koreksi saldo BNI", occurred_on: "2026-08-01", created_at: "" })).toBe(true)
    expect(isCorrectionTx({ id: "4", user_id: "u", amount: 100, type: "expense", wallet_id: null, to_wallet_id: null, category_id: null, note: "Regular grocery shopping", occurred_on: "2026-08-01", created_at: "" })).toBe(false)
  })
})
