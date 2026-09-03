import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

export interface FinancialSnapshot {
  id: string;
  monthKey: string;
  periodLabel: string;
  capturedAt: string;
  totalLiquidAssets: number;
  netWorth: number;
  monthlyExpense: number;
  savingsRate: number;
  committedAmount: number;
  debtBalance: number;
}

function getSnapshotStorageKey(userId?: string) {
  return `trouvaille_financial_snapshots_v1:${userId ?? "guest"}`;
}

export function useFinancialSnapshots() {
  const { user } = useAuth();
  const userId = user?.id;
  const storageKey = useMemo(() => getSnapshotStorageKey(userId), [userId]);
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setSnapshots(raw ? (JSON.parse(raw) as FinancialSnapshot[]) : []);
    } catch {
      setSnapshots([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(snapshots));
    } catch (error) {
      console.warn("Failed to persist financial snapshots:", error);
    }
  }, [snapshots, storageKey]);

  const saveSnapshot = (
    input: Omit<
      FinancialSnapshot,
      "id" | "capturedAt" | "monthKey" | "periodLabel"
    >,
  ) => {
    const now = new Date();
    const monthKey = format(now, "yyyy-MM");
    const periodLabel = format(now, "MMMM yyyy");
    const capturedAt = now.toISOString();
    const updatedExisting = snapshots.some(
      (item) => item.monthKey === monthKey,
    );

    const snapshot: FinancialSnapshot = {
      id: monthKey,
      monthKey,
      periodLabel,
      capturedAt,
      ...input,
    };

    setSnapshots((prev) => {
      const next = prev.filter((item) => item.monthKey !== monthKey);
      return [snapshot, ...next]
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
        .slice(0, 24);
    });

    return { snapshot, updatedExisting };
  };

  return {
    snapshots,
    saveSnapshot,
  };
}
