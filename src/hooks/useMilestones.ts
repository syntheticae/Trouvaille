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
      title: "Langkah Perdana",
      category: "consistency",
      description: "Catat transaksi pertamamu ke dalam buku besar.",
      criteria: "1 Transaksi di Ledger",
      isUnlocked: txCount >= 1,
      progressPct: txCount >= 1 ? 100 : 0,
      currentValueText: `${txCount} Transaksi`,
      targetValueText: "1 Transaksi",
      iconName: "Zap",
    },
    {
      id: "streak_3",
      title: "Pejuang Konsistensi",
      category: "consistency",
      description: "Catat keuangan selama 3 hari berturut-turut tanpa terputus.",
      criteria: "Streak 3 Hari",
      isUnlocked: streak >= 3,
      progressPct: Math.min(100, Math.round((streak / 3) * 100)),
      currentValueText: `${streak} Hari`,
      targetValueText: "3 Hari",
      iconName: "Flame",
    },
    {
      id: "streak_7",
      title: "Master Kebiasaan",
      category: "consistency",
      description: "Pertahankan pencatatan keuangan selama 7 hari penuh.",
      criteria: "Streak 7 Hari",
      isUnlocked: streak >= 7,
      progressPct: Math.min(100, Math.round((streak / 7) * 100)),
      currentValueText: `${streak} Hari`,
      targetValueText: "7 Hari",
      iconName: "Award",
    },
    {
      id: "emergency_3m",
      title: "Jaring Pengaman",
      category: "safety",
      description: "Miliki dana likuid minimal 3 bulan pengeluaran operasional.",
      criteria: "Runway ≥ 3 Bulan",
      isUnlocked: runwayMonths >= 3,
      progressPct: Math.min(100, Math.round((runwayMonths / 3) * 100)),
      currentValueText: `${runwayMonths.toFixed(1)} Bulan`,
      targetValueText: "3 Bulan",
      iconName: "ShieldCheck",
    },
    {
      id: "emergency_6m",
      title: "Benteng Finansial",
      category: "safety",
      description: "Capai standar ideal ketahanan darurat 6 bulan pengeluaran.",
      criteria: "Runway ≥ 6 Bulan",
      isUnlocked: runwayMonths >= 6,
      progressPct: Math.min(100, Math.round((runwayMonths / 6) * 100)),
      currentValueText: `${runwayMonths.toFixed(1)} Bulan`,
      targetValueText: "6 Bulan",
      iconName: "Shield",
    },
    {
      id: "savings_master",
      title: "Sang Akumulator",
      category: "saving",
      description: "Sisihkan minimal 20% dari total pemasukan bulanan untuk tabungan.",
      criteria: "Savings Rate ≥ 20%",
      isUnlocked: savingsRate >= 20,
      progressPct: Math.min(100, Math.max(0, Math.round((savingsRate / 20) * 100))),
      currentValueText: `${savingsRate.toFixed(0)}%`,
      targetValueText: "20%",
      iconName: "TrendingUp",
    },
    {
      id: "split_bill",
      title: "Bagi Rata Pro",
      category: "lifestyle",
      description: "Gunakan kalkulator bagi tagihan hangout atau catat pengeluaran split.",
      criteria: "1 Split Bill Transaksi",
      isUnlocked: hasSplitBillTx,
      progressPct: hasSplitBillTx ? 100 : 0,
      currentValueText: hasSplitBillTx ? "Tercatat" : "Belum",
      targetValueText: "1 Kali",
      iconName: "Users",
    },
    {
      id: "goal_setter",
      title: "Pengejar Impian",
      category: "saving",
      description: "Buat target tabungan dan lakukan setoran dana pertama.",
      criteria: "Deposit pada Goals",
      isUnlocked: hasActiveGoalDeposit,
      progressPct: hasActiveGoalDeposit ? 100 : 0,
      currentValueText: hasActiveGoalDeposit ? "Ada Setoran" : "Kosong",
      targetValueText: "1 Setoran",
      iconName: "Target",
    },
    {
      id: "balanced_ledger",
      title: "Audit Bersertifikasi",
      category: "discipline",
      description: "Jaga akurasi persamaan akuntansi (Aset = Liabilitas + Ekuitas).",
      criteria: "Status Certified Balanced",
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
