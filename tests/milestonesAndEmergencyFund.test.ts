import { describe, it, expect } from "vitest";
import { calculateMilestones } from "../src/hooks/useMilestones";
import type { Transaction, Goal } from "../src/types";

describe("Milestones Evaluation Engine", () => {
  const dummyTx: Transaction = {
    id: "tx-1",
    user_id: "u1",
    type: "expense",
    amount: 50000,
    wallet_id: "w1",
    category_id: "c1",
    occurred_on: "2026-09-20",
    created_at: "2026-09-20T10:00:00Z",
    note: "Lunch",
  };

  it("calculates initial locked status for clean/empty state", () => {
    const res = calculateMilestones({
      transactions: [],
      streak: 0,
      liquidAssets: 0,
      monthlyBurn: 0,
      savingsRate: 0,
      goals: [],
      isCertifiedBalanced: false,
    });

    expect(res.totalMilestones).toBe(8);
    expect(res.totalUnlocked).toBe(0);
    expect(res.completionPct).toBe(0);

    const firstTx = res.milestones.find((m) => m.id === "first_tx");
    expect(firstTx?.isUnlocked).toBe(false);
    expect(firstTx?.progressPct).toBe(0);
  });

  it("unlocks first_tx upon recording 1 transaction", () => {
    const res = calculateMilestones({
      transactions: [dummyTx],
      streak: 1,
      liquidAssets: 5000000,
      monthlyBurn: 10000000,
      savingsRate: 0,
      goals: [],
    });

    const firstTx = res.milestones.find((m) => m.id === "first_tx");
    expect(firstTx?.isUnlocked).toBe(true);
    expect(firstTx?.progressPct).toBe(100);

    const streak3 = res.milestones.find((m) => m.id === "streak_3");
    expect(streak3?.isUnlocked).toBe(false);
    expect(streak3?.progressPct).toBe(33); // 1 / 3 = 33%
  });

  it("unlocks streak milestones correctly", () => {
    const res3 = calculateMilestones({
      transactions: [dummyTx],
      streak: 3,
      liquidAssets: 0,
      monthlyBurn: 0,
      savingsRate: 0,
      goals: [],
    });

    const s3 = res3.milestones.find((m) => m.id === "streak_3");
    const s7 = res3.milestones.find((m) => m.id === "streak_7");
    expect(s3?.isUnlocked).toBe(true);
    expect(s3?.progressPct).toBe(100);
    expect(s7?.isUnlocked).toBe(false);
    expect(s7?.progressPct).toBe(43); // 3 / 7 = 43%

    const res7 = calculateMilestones({
      transactions: [dummyTx],
      streak: 7,
      liquidAssets: 0,
      monthlyBurn: 0,
      savingsRate: 0,
      goals: [],
    });
    const s7Unlocked = res7.milestones.find((m) => m.id === "streak_7");
    expect(s7Unlocked?.isUnlocked).toBe(true);
    expect(s7Unlocked?.progressPct).toBe(100);
  });

  it("unlocks emergency fund milestones (3 months & 6 months)", () => {
    // 30jt liquid / 10jt burn = 3 months
    const res3m = calculateMilestones({
      transactions: [dummyTx],
      streak: 1,
      liquidAssets: 30000000,
      monthlyBurn: 10000000,
      savingsRate: 0,
      goals: [],
    });

    const em3m = res3m.milestones.find((m) => m.id === "emergency_3m");
    const em6m = res3m.milestones.find((m) => m.id === "emergency_6m");
    expect(em3m?.isUnlocked).toBe(true);
    expect(em3m?.progressPct).toBe(100);
    expect(em6m?.isUnlocked).toBe(false);
    expect(em6m?.progressPct).toBe(50); // 3 / 6 = 50%

    // 60jt liquid / 10jt burn = 6 months
    const res6m = calculateMilestones({
      transactions: [dummyTx],
      streak: 1,
      liquidAssets: 60000000,
      monthlyBurn: 10000000,
      savingsRate: 0,
      goals: [],
    });
    const em6mUnlocked = res6m.milestones.find((m) => m.id === "emergency_6m");
    expect(em6mUnlocked?.isUnlocked).toBe(true);
    expect(em6mUnlocked?.progressPct).toBe(100);
  });

  it("unlocks savings master when savingsRate >= 20%", () => {
    const resSaving = calculateMilestones({
      transactions: [dummyTx],
      streak: 1,
      liquidAssets: 0,
      monthlyBurn: 0,
      savingsRate: 25,
      goals: [],
    });

    const saver = resSaving.milestones.find((m) => m.id === "savings_master");
    expect(saver?.isUnlocked).toBe(true);
    expect(saver?.progressPct).toBe(100);
  });

  it("unlocks goal setter when goal has active deposit", () => {
    const activeGoal: Goal = {
      id: "g1",
      user_id: "u1",
      title: "Dana Liburan",
      targetAmount: 10000000,
      currentAmount: 2500000,
      created_at: "2026-09-01T00:00:00Z",
    };

    const res = calculateMilestones({
      transactions: [dummyTx],
      streak: 1,
      liquidAssets: 0,
      monthlyBurn: 0,
      savingsRate: 0,
      goals: [activeGoal],
    });

    const goalMilestone = res.milestones.find((m) => m.id === "goal_setter");
    expect(goalMilestone?.isUnlocked).toBe(true);
  });
});
