import { describe, it, expect } from "vitest";
import { runMonteCarloSimulation } from "../src/lib/monteCarloEngine";

describe("Monte Carlo & FIRE Simulation Engine", () => {
  it("computes ordered percentiles (P10 <= P25 <= P50 <= P75 <= P90) across all horizon years", () => {
    const result = runMonteCarloSimulation({
      initialNetWorth: 50000000,
      monthlyContribution: 5000000,
      annualExpenses: 60000000,
      years: 10,
      iterations: 200,
    });

    expect(result.yearlyTrajectory).toHaveLength(11); // Year 0 to 10

    result.yearlyTrajectory.forEach((point) => {
      expect(point.p10).toBeLessThanOrEqual(point.p25);
      expect(point.p25).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p75);
      expect(point.p75).toBeLessThanOrEqual(point.p90);
    });
  });

  it("calculates accurate FIRE numbers based on 4% safe withdrawal rule (25x annual expenses)", () => {
    const annualExpenses = 120000000; // 120M/yr = 10M/mo
    const result = runMonteCarloSimulation({
      initialNetWorth: 100000000,
      monthlyContribution: 10000000,
      annualExpenses,
      safeWithdrawalRate: 0.04,
      years: 15,
      iterations: 100,
    });

    // 120M / 0.04 = 3,000,000,000 (3 Billion Rp)
    expect(result.fireMilestones.standard.targetAmount).toBe(3000000000);
    expect(result.fireMilestones.lean.targetAmount).toBe(Math.round(3000000000 * 0.7));
    expect(result.fireMilestones.fat.targetAmount).toBe(Math.round(3000000000 * 1.4));
  });

  it("identifies achieved FIRE milestones when initial capital exceeds target", () => {
    const result = runMonteCarloSimulation({
      initialNetWorth: 5000000000, // 5B
      monthlyContribution: 1000000,
      annualExpenses: 60000000, // 60M/yr -> Standard FIRE = 1.5B
      safeWithdrawalRate: 0.04,
      years: 5,
      iterations: 100,
    });

    expect(result.fireMilestones.standard.isAchieved).toBe(true);
    expect(result.fireMilestones.lean.isAchieved).toBe(true);
    expect(result.fireMilestones.fat.isAchieved).toBe(true);
    expect(result.fireMilestones.standard.currentProgressPct).toBe(100);
    expect(result.successRate).toBeGreaterThanOrEqual(95);
    expect(result.resilienceRating).toBe("Exceptional");
  });

  it("correctly models Sequence of Returns Risk early shock", () => {
    const baseConfig = {
      initialNetWorth: 100000000,
      monthlyContribution: 5000000,
      annualExpenses: 80000000,
      years: 10,
      iterations: 1500,
    };

    const shockedResult = runMonteCarloSimulation({
      ...baseConfig,
      earlyShock: true,
    });

    expect(shockedResult.sequenceOfReturnsImpact).not.toBeNull();
    if (shockedResult.sequenceOfReturnsImpact) {
      expect(typeof shockedResult.sequenceOfReturnsImpact.terminalDifference).toBe("number");
      expect(typeof shockedResult.sequenceOfReturnsImpact.terminalPercentageLoss).toBe("number");
    }
  });

  it("generates clear, actionable English insights", () => {
    const result = runMonteCarloSimulation({
      initialNetWorth: 20000000,
      monthlyContribution: 2000000,
      annualExpenses: 50000000,
      years: 15,
      iterations: 150,
    });

    expect(result.insights.length).toBeGreaterThan(0);
    result.insights.forEach((insight) => {
      expect(typeof insight).toBe("string");
      expect(insight.length).toBeGreaterThan(15);
    });
  });
});
