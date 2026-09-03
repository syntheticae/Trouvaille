import { describe, it, expect } from "vitest";
import {
  calculatePersonalBaselines,
  detectBehavioralPatterns,
  calculateLongitudinalTimeline,
  calculateGoalPlanning,
  calculateMedian,
  calculateTypicalRange,
} from "../src/lib/financialMath";
import type { Transaction, Category } from "../src/lib/types";

describe("Phase II: Personal Financial Intelligence Test Suite", () => {
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
    {
      id: "c-trans",
      user_id: "u",
      name: "Transportasi",
      emoji: "/icons/transportasi.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
  ];

  // Helper to generate multi-month test dataset
  function createMultiMonthDataset(
    monthConfigs: Array<{
      year: number;
      month: number;
      food: number;
      trans: number;
      income: number;
      daysCount?: number;
    }>,
  ): Transaction[] {
    const txs: Transaction[] = [];
    monthConfigs.forEach(
      ({ year, month, food, trans, income, daysCount = 20 }) => {
        const mStr = String(month).padStart(2, "0");
        // Inflow
        if (income > 0) {
          txs.push({
            id: `tx-inc-${year}-${mStr}`,
            user_id: "u",
            amount: income,
            type: "income",
            wallet_id: "w-bca",
            to_wallet_id: null,
            category_id: null,
            note: "Monthly Inflow",
            occurred_on: `${year}-${mStr}-01`,
            created_at: `${year}-${mStr}-01T08:00:00Z`,
          });
        }
        // Food transactions spread across days
        const foodPerTx = Math.round(food / daysCount);
        for (let d = 1; d <= daysCount; d++) {
          const dStr = String(d).padStart(2, "0");
          txs.push({
            id: `tx-food-${year}-${mStr}-${dStr}`,
            user_id: "u",
            amount: foodPerTx,
            type: "expense",
            wallet_id: "w-bca",
            to_wallet_id: null,
            category_id: "c-food",
            note: "Food meal",
            occurred_on: `${year}-${mStr}-${dStr}`,
            created_at: `${year}-${mStr}-${dStr}T12:00:00Z`,
          });
        }
        // Trans
        if (trans > 0) {
          txs.push({
            id: `tx-trans-${year}-${mStr}`,
            user_id: "u",
            amount: trans,
            type: "expense",
            wallet_id: "w-bca",
            to_wallet_id: null,
            category_id: "c-trans",
            note: "Commute",
            occurred_on: `${year}-${mStr}-15`,
            created_at: `${year}-${mStr}-15T18:00:00Z`,
          });
        }
      },
    );
    return txs;
  }

  // 1. Statistical Helpers
  it("Statistical Helpers: calculateMedian and calculateTypicalRange behave deterministically", () => {
    expect(calculateMedian([10, 20, 30])).toBe(20);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
    expect(calculateMedian([])).toBe(0);

    const range = calculateTypicalRange([
      1000000, 1100000, 1200000, 1300000, 1400000,
    ]);
    expect(range[0]).toBeLessThanOrEqual(1200000);
    expect(range[1]).toBeGreaterThanOrEqual(1200000);
  });

  // 2. Data Sufficiency Gate
  it("Data Sufficiency Rule: Enforces honest empty/insufficient state when < 2 completed months", () => {
    // Only 1 month of data
    const singleMonthTxs = createMultiMonthDataset([
      { year: 2026, month: 7, food: 1000000, trans: 200000, income: 5000000 },
    ]);

    const baselines = calculatePersonalBaselines(
      singleMonthTxs,
      categories,
      new Date("2026-08-15T12:00:00Z"),
    );
    expect(baselines.status).toBe("insufficient");
    expect(baselines.confidence).toBe("low");
    expect(baselines.message).toContain("Build more history");
  });

  // 3. Stable Personal Baseline Calculation (4+ Historical Cycles)
  it("Personal Baseline: Correctly computes historical median, normal ranges, and category bands across 4+ months", () => {
    const historicalTxs = createMultiMonthDataset([
      { year: 2026, month: 3, food: 2000000, trans: 500000, income: 8000000 },
      { year: 2026, month: 4, food: 2200000, trans: 500000, income: 8000000 },
      { year: 2026, month: 5, food: 2100000, trans: 600000, income: 8000000 },
      { year: 2026, month: 6, food: 2300000, trans: 500000, income: 8000000 },
      { year: 2026, month: 7, food: 2100000, trans: 500000, income: 8000000 },
      // Current active month (August)
      { year: 2026, month: 8, food: 3500000, trans: 500000, income: 8000000 },
    ]);

    const baselines = calculatePersonalBaselines(
      historicalTxs,
      categories,
      new Date("2026-08-20T12:00:00Z"),
    );
    expect(baselines.status).toBe("stable");
    expect(baselines.confidence).toBe("high");
    expect(baselines.historicalMonthsCount).toBe(5);

    // Expected historical median expense ~2.6M - 2.7M
    expect(baselines.medianExpense).toBeGreaterThan(2500000);
    expect(baselines.medianExpense).toBeLessThan(2900000);

    // Current month August has 4.0M outflow -> Should be above typical range
    expect(baselines.currentMonthStatus).toBe("above_range");

    // Category baseline for Food
    const foodBaseline = baselines.categoryBaselines.find(
      (c) => c.categoryId === "c-food",
    );
    expect(foodBaseline).toBeDefined();
    expect(foodBaseline?.currentStatus).toBe("above_range");
  });

  // 4. Behavioral Pattern Detection (Weekend vs Weekday Pattern)
  it("Behavioral Patterns: Detects weekend vs weekday divergence when evidence threshold is satisfied", () => {
    // Generate 6 weeks where weekend spending is 2x weekday
    const txs: Transaction[] = [];
    const startDate = new Date("2026-06-01T08:00:00Z");

    for (let day = 0; day < 60; day++) {
      const d = new Date(startDate.getTime() + day * 24 * 3600 * 1000);
      const dStr = d.toISOString().slice(0, 10);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const amount = isWeekend ? 300000 : 80000;

      txs.push({
        id: `tx-${day}`,
        user_id: "u",
        amount,
        type: "expense",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "c-food",
        note: isWeekend ? "Weekend dining" : "Weekday lunch",
        occurred_on: dStr,
        created_at: d.toISOString(),
      });
    }

    const baselines = calculatePersonalBaselines(
      txs,
      categories,
      new Date("2026-08-01T12:00:00Z"),
    );
    const patterns = detectBehavioralPatterns(
      txs,
      baselines,
      new Date("2026-08-01T12:00:00Z"),
    );

    const weekendPattern = patterns.find((p) => p.type === "day_of_week");
    expect(weekendPattern).toBeDefined();
    expect(weekendPattern?.title).toContain(
      "Weekend spending is typically elevated",
    );
    expect(weekendPattern?.evidence).toContain("Average daily spending");
  });

  // 5. Behavioral Pattern Detection (Weak Evidence Suppression)
  it("Behavioral Patterns: Suppresses patterns when observations are insufficient", () => {
    // Only 3 transactions over 3 days (insufficient observation threshold)
    const sparseTxs: Transaction[] = [
      {
        id: "1",
        user_id: "u",
        amount: 100000,
        type: "expense",
        wallet_id: null,
        to_wallet_id: null,
        category_id: null,
        note: "",
        occurred_on: "2026-08-01",
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
        note: "",
        occurred_on: "2026-08-02",
        created_at: "",
      },
    ];

    const baselines = calculatePersonalBaselines(
      sparseTxs,
      categories,
      new Date("2026-08-05T12:00:00Z"),
    );
    const patterns = detectBehavioralPatterns(
      sparseTxs,
      baselines,
      new Date("2026-08-05T12:00:00Z"),
    );

    // Weekend pattern must not be returned on 2 days
    expect(patterns.find((p) => p.type === "day_of_week")).toBeUndefined();
  });

  // 6. Longitudinal Timeline & Trajectory Factual Interpretation
  it("Longitudinal Timeline: Aggregates monthly points and accurately identifies directional expense trends", () => {
    const historicalTxs = createMultiMonthDataset([
      { year: 2026, month: 1, food: 1500000, trans: 300000, income: 6000000 },
      { year: 2026, month: 2, food: 1600000, trans: 300000, income: 6000000 },
      { year: 2026, month: 3, food: 1500000, trans: 300000, income: 6000000 },
      { year: 2026, month: 4, food: 3000000, trans: 500000, income: 6000000 },
      { year: 2026, month: 5, food: 3200000, trans: 500000, income: 6000000 },
      { year: 2026, month: 6, food: 3100000, trans: 500000, income: 6000000 },
    ]);

    const timeline = calculateLongitudinalTimeline(
      historicalTxs,
      "6M",
      new Date("2026-06-30T12:00:00Z"),
    );
    expect(timeline.points.length).toBe(6);
    expect(timeline.trendDirection).toBe("increasing");
    expect(timeline.trajectoryInterpretation).toContain(
      "Average monthly expense increased",
    );
  });

  it("Longitudinal Timeline ALL: Includes the full historical span", () => {
    const historicalTxs = createMultiMonthDataset([
      { year: 2024, month: 11, food: 900000, trans: 200000, income: 5000000 },
      { year: 2025, month: 6, food: 1200000, trans: 250000, income: 5500000 },
      { year: 2026, month: 2, food: 1500000, trans: 300000, income: 6000000 },
      { year: 2026, month: 8, food: 1700000, trans: 350000, income: 6200000 },
    ]);

    const timeline = calculateLongitudinalTimeline(
      historicalTxs,
      "ALL",
      new Date("2026-08-31T12:00:00Z"),
    );

    expect(timeline.points.length).toBe(22);
    expect(timeline.points[0].monthKey).toBe("2024-11");
    expect(timeline.points[timeline.points.length - 1].monthKey).toBe(
      "2026-08",
    );
  });

  // 7. Goal Planning and Trajectory Calculation
  it("Goal Planning: Computes required monthly pace and compares with historical net cashflow", () => {
    const baselines: any = {
      status: "stable",
      medianNetCashflow: 2000000, // User historically saves 2M/month
      medianExpense: 3000000,
    };

    // Goal A: Requires 1M/month (10M in 10 months) -> ON TRACK
    const onTrackGoal = {
      id: "goal-1",
      title: "Emergency Fund",
      targetAmount: 10000000,
      currentAmount: 0,
      targetDate: "2027-06-01", // ~10 months from 2026-08
    };

    const planA = calculateGoalPlanning(
      onTrackGoal,
      baselines,
      new Date("2026-08-01T12:00:00Z"),
    );
    expect(planA.requiredMonthlyContribution).toBe(1000000);
    expect(planA.trajectoryStatus).toBe("ON TRACK");
    expect(planA.trajectoryExplanation).toContain("supports the required");

    // Goal B: Requires 5M/month (30M in 6 months) while saving 2M/month -> BEHIND TARGET
    const behindGoal = {
      id: "goal-2",
      title: "Down Payment",
      targetAmount: 30000000,
      currentAmount: 0,
      targetDate: "2027-02-01", // ~6 months from 2026-08
    };

    const planB = calculateGoalPlanning(
      behindGoal,
      baselines,
      new Date("2026-08-01T12:00:00Z"),
    );
    expect(planB.requiredMonthlyContribution).toBe(5000000);
    expect(planB.trajectoryStatus).toBe("BEHIND TARGET");
  });
});
