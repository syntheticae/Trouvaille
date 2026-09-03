import { describe, it, expect } from "vitest";
import {
  computeMonthAggregates,
  computeSpendingPace,
  computeBudgetRisk,
  computeCategoryMoMChanges,
  calculateAssetTrend,
} from "../src/lib/financialMath";
import type { Transaction, Category } from "../src/lib/types";

describe("Financial Math & Analytics Test Suite", () => {
  it("computes month aggregates accurately", () => {
    const txs: Transaction[] = [
      {
        id: "1",
        user_id: "u",
        amount: 500000,
        type: "income",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: "Freelance",
        occurred_on: "2026-08-10",
        created_at: "",
      },
      {
        id: "2",
        user_id: "u",
        amount: 100000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: "c-food",
        note: "Meal",
        occurred_on: "2026-08-11",
        created_at: "",
      },
      {
        id: "3",
        user_id: "u",
        amount: 50000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: "c-food",
        note: "Coffee",
        occurred_on: "2026-08-12",
        created_at: "",
      },
    ];

    const agg = computeMonthAggregates(txs, 2026, 8);
    expect(agg.totalIncome).toBe(500000);
    expect(agg.totalExpense).toBe(150000);
    expect(agg.netCashflow).toBe(350000);
    expect(agg.savingsRate).toBe(70);
    expect(agg.txCount).toBe(2);
    expect(agg.avgExpense).toBe(75000);
    expect(agg.categoryTotals["c-food"].total).toBe(150000);
    expect(agg.categoryTotals["c-food"].count).toBe(2);
  });

  it("computes spending pace and projections deterministically", () => {
    const pace = computeSpendingPace(1000000, 3000000, 10, 30);
    expect(pace.expectedPace).toBe(1000000);
    expect(pace.paceDiff).toBe(0);
    expect(pace.isAheadOfPace).toBe(false);
    expect(pace.dailyAvg).toBe(100000);
    expect(pace.projectedMonthEnd).toBe(3000000);
    expect(pace.consumedPct).toBeCloseTo(33.33, 1);
    expect(pace.timePct).toBeCloseTo(33.33, 1);
  });

  it("computes budget risk levels correctly (SAFE, WATCH, AT RISK)", () => {
    const safeRisk = computeBudgetRisk(30, 35, 5000000);
    expect(safeRisk.riskLevel).toBe("SAFE");

    const watchRisk = computeBudgetRisk(45, 35, 5000000);
    expect(watchRisk.riskLevel).toBe("WATCH");

    const criticalRisk = computeBudgetRisk(70, 40, 5000000);
    expect(criticalRisk.riskLevel).toBe("AT RISK");
  });

  it("computes category month-over-month shifts with contributors", () => {
    const currentTxs: Transaction[] = [
      {
        id: "1",
        user_id: "u",
        amount: 600000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: "c-food",
        note: "Groceries",
        occurred_on: "2026-08-05",
        created_at: "",
      },
    ];
    const prevTxs: Transaction[] = [
      {
        id: "2",
        user_id: "u",
        amount: 400000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: "c-food",
        note: "Groceries",
        occurred_on: "2026-07-05",
        created_at: "",
      },
    ];
    const categories: Category[] = [
      {
        id: "c-food",
        user_id: "u",
        name: "Makanan",
        emoji: "/icons/makanan.png",
        type: "expense",
        is_default: true,
        created_at: "",
      },
    ];

    const shifts = computeCategoryMoMChanges(currentTxs, prevTxs, categories);
    expect(shifts.length).toBe(1);
    expect(shifts[0].name).toBe("Makanan");
    expect(shifts[0].deltaAmount).toBe(200000);
    expect(shifts[0].pctChange).toBe(50);
    expect(shifts[0].isIncrease).toBe(true);
  });

  it("calculates asset trend across timeframes without floating point errors", () => {
    const txs: Transaction[] = [
      {
        id: "1",
        user_id: "u",
        amount: 1000000,
        type: "income",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: null,
        occurred_on: "2026-08-20",
        created_at: "",
      },
      {
        id: "2",
        user_id: "u",
        amount: 200000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: null,
        occurred_on: "2026-08-21",
        created_at: "",
      },
    ];

    const trend = calculateAssetTrend(
      txs,
      800000,
      "1W",
      new Date("2026-08-22T12:00:00Z"),
    );
    expect(trend.currentBalance).toBe(800000);
    expect(trend.chartData.length).toBe(7);
  });

  it("keeps YTD, 1Y, and ALL portfolio charts anchored to real balances instead of zero-based flow", () => {
    const txs: Transaction[] = [
      {
        id: "1",
        user_id: "u",
        amount: 5000000,
        type: "income",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: "Salary",
        occurred_on: "2026-01-05",
        created_at: "",
      },
      {
        id: "2",
        user_id: "u",
        amount: 1000000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: "Rent",
        occurred_on: "2026-02-10",
        created_at: "",
      },
      {
        id: "3",
        user_id: "u",
        amount: 2000000,
        type: "income",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: "Bonus",
        occurred_on: "2026-08-15",
        created_at: "",
      },
    ];

    const ytd = calculateAssetTrend(
      txs,
      24000000,
      "YTD",
      new Date("2026-09-01T12:00:00Z"),
    );
    const oneYear = calculateAssetTrend(
      txs,
      24000000,
      "1Y",
      new Date("2026-09-01T12:00:00Z"),
    );
    const allTime = calculateAssetTrend(
      txs,
      24000000,
      "ALL",
      new Date("2026-09-01T12:00:00Z"),
    );

    expect(ytd.diff).toBe(6000000);
    expect(oneYear.diff).toBe(6000000);
    expect(allTime.diff).toBe(6000000);
    expect(ytd.lowBalance).toBeGreaterThan(17000000);
    expect(oneYear.lowBalance).toBeGreaterThan(17000000);
    expect(allTime.lowBalance).toBeGreaterThan(17000000);
    expect(allTime.chartData.length).toBeGreaterThanOrEqual(9);
  });

  it("handles empty transactions dataset cleanly (0 records)", () => {
    const agg = computeMonthAggregates([], 2026, 8);
    expect(agg.totalIncome).toBe(0);
    expect(agg.totalExpense).toBe(0);
    expect(agg.netCashflow).toBe(0);
    expect(agg.savingsRate).toBe(0);
    expect(agg.txCount).toBe(0);
  });
});
