import { useMemo } from "react";
import type { Transaction, Goal } from "../types";

export interface Milestone {
  id: string;
  title: string;
  category: "consistency" | "saving" | "safety" | "lifestyle" | "discipline";
  description: string;
  criteria: string;
  isUnlocked: boolean;
  progressPct: number; // 0 to 100
  currentValueText: string;
  targetValueText: string;
  iconName:
    | "Zap"
    | "Flame"
    | "Award"
    | "ShieldCheck"
    | "Shield"
    | "TrendingUp"
    | "Users"
    | "Target"
    | "Scale";
}

export interface MilestoneSummary {
  milestones: Milestone[];
  totalUnlocked: number;
  totalMilestones: number;
  completionPct: number;
}

export function calculateMilestones({
  transactions,
  streak,
  liquidAssets,
  monthlyBurn,
  savingsRate,
  goals,
  isCertifiedBalanced = true,
}: {
  transactions: Transaction[];
  streak: number;
  liquidAssets: number;
  monthlyBurn: number;
  savingsRate: number;
  goals: Goal[];
  isCertifiedBalanced?: boolean;
}): MilestoneSummary {
  const txCount = transactions.length;
  const runwayMonths =
    monthlyBurn > 0
      ? liquidAssets / monthlyBurn
      : liquidAssets > 0
        ? 12
        : 0;

  const hasSplitBillTx = transactions.some((tx) =>
    tx.note ? /split bill|patungan/i.test(tx.note) : false,
  );

  const hasActiveGoalDeposit = goals.some((g) => (g.currentAmount ?? 0) > 0);

  const milestones: Milestone[] = [
    {
      id: "first_tx",
      title: "First Step",
      category: "consistency",
      description: "Record your first transaction into the ledger.",
      criteria: "1 Transaction in Ledger",
      isUnlocked: txCount >= 1,
      progressPct: txCount >= 1 ? 100 : 0,
      currentValueText: `${txCount} ${txCount === 1 ? "Tx" : "Txs"}`,
      targetValueText: "1 Tx",
      iconName: "Zap",
    },
    {
      id: "streak_3",
      title: "Consistency Seeker",
      category: "consistency",
      description: "Log finances for 3 consecutive days without interruption.",
      criteria: "3-Day Streak",
      isUnlocked: streak >= 3,
      progressPct: Math.min(100, Math.round((streak / 3) * 100)),
      currentValueText: `${streak} Days`,
      targetValueText: "3 Days",
      iconName: "Flame",
    },
    {
      id: "streak_7",
      title: "Habit Master",
      category: "consistency",
      description: "Maintain daily transaction logging for a full 7 days.",
      criteria: "7-Day Streak",
      isUnlocked: streak >= 7,
      progressPct: Math.min(100, Math.round((streak / 7) * 100)),
      currentValueText: `${streak} Days`,
      targetValueText: "7 Days",
      iconName: "Award",
    },
    {
      id: "emergency_3m",
      title: "Safety Net",
      category: "safety",
      description: "Hold liquid cash reserves covering at least 3 months of expenses.",
      criteria: "Runway ≥ 3 Months",
      isUnlocked: runwayMonths >= 3,
      progressPct: Math.min(100, Math.round((runwayMonths / 3) * 100)),
      currentValueText: `${runwayMonths.toFixed(1)} Mos`,
      targetValueText: "3 Mos",
      iconName: "ShieldCheck",
    },
    {
      id: "emergency_6m",
      title: "Financial Fortress",
      category: "safety",
      description: "Attain the ideal standard of 6 months emergency living runway.",
      criteria: "Runway ≥ 6 Months",
      isUnlocked: runwayMonths >= 6,
      progressPct: Math.min(100, Math.round((runwayMonths / 6) * 100)),
      currentValueText: `${runwayMonths.toFixed(1)} Mos`,
      targetValueText: "6 Mos",
      iconName: "Shield",
    },
    {
      id: "savings_master",
      title: "Capital Accumulator",
      category: "saving",
      description: "Retain at least 20% of net monthly income into savings or investments.",
      criteria: "Savings Rate ≥ 20%",
      isUnlocked: savingsRate >= 20,
      progressPct: Math.min(100, Math.max(0, Math.round((savingsRate / 20) * 100))),
      currentValueText: `${savingsRate.toFixed(0)}%`,
      targetValueText: "20%",
      iconName: "TrendingUp",
    },
    {
      id: "split_bill",
      title: "Split Bill Pro",
      category: "lifestyle",
      description: "Use the bill split calculator or log a shared expense.",
      criteria: "1 Split Bill Transaction",
      isUnlocked: hasSplitBillTx,
      progressPct: hasSplitBillTx ? 100 : 0,
      currentValueText: hasSplitBillTx ? "Recorded" : "None",
      targetValueText: "1 Time",
      iconName: "Users",
    },
    {
      id: "goal_setter",
      title: "Goal Achiever",
      category: "saving",
      description: "Create a savings target and make your first capital deposit.",
      criteria: "Deposit to Goals",
      isUnlocked: hasActiveGoalDeposit,
      progressPct: hasActiveGoalDeposit ? 100 : 0,
      currentValueText: hasActiveGoalDeposit ? "Funded" : "Empty",
      targetValueText: "1 Deposit",
      iconName: "Target",
    },
    {
      id: "balanced_ledger",
      title: "Certified Audit",
      category: "discipline",
      description: "Maintain balanced accounting integrity (Assets = Liabilities + Equity).",
      criteria: "Certified Balanced Status",
      isUnlocked: txCount >= 5 && isCertifiedBalanced,
      progressPct: txCount >= 5 && isCertifiedBalanced ? 100 : txCount > 0 ? 50 : 0,
      currentValueText: isCertifiedBalanced ? "Balanced" : "Auditing",
      targetValueText: "Certified",
      iconName: "Scale",
    },
  ];

  const totalUnlocked = milestones.filter((m) => m.isUnlocked).length;
  const totalMilestones = milestones.length;
  const completionPct =
    totalMilestones > 0
      ? Math.round((totalUnlocked / totalMilestones) * 100)
      : 0;

  return {
    milestones,
    totalUnlocked,
    totalMilestones,
    completionPct,
  };
}

export function useMilestones({
  transactions,
  streak,
  liquidAssets,
  monthlyBurn,
  savingsRate,
  goals,
  isCertifiedBalanced = true,
}: {
  transactions: Transaction[];
  streak: number;
  liquidAssets: number;
  monthlyBurn: number;
  savingsRate: number;
  goals: Goal[];
  isCertifiedBalanced?: boolean;
}): MilestoneSummary {
  return useMemo(() => {
    return calculateMilestones({
      transactions,
      streak,
      liquidAssets,
      monthlyBurn,
      savingsRate,
      goals,
      isCertifiedBalanced,
    });
  }, [
    transactions,
    streak,
    liquidAssets,
    monthlyBurn,
    savingsRate,
    goals,
    isCertifiedBalanced,
  ]);
}
