import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import {
  clearPendingMutations,
  getPendingMutations,
  removePendingMutation,
} from "../lib/syncEngine";
import {
  clearLocalTransactionsCache,
  TX_BACKUP_STORAGE_KEY,
} from "./useTransactions";
import { getVaultItem, setVaultItem } from "../lib/indexedDbStorage";
import type { Transaction } from "../lib/types";

export type ResetPeriod = "today" | "week" | "month" | "year" | "all";

export function getResetPeriodDateBounds(
  period: ResetPeriod,
  now: Date = new Date(),
): { startDate: string; endDate: string } | null {
  if (period === "all") return null;
  const todayStr = format(now, "yyyy-MM-dd");
  if (period === "today") {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (period === "week") {
    return { startDate: format(subDays(now, 6), "yyyy-MM-dd"), endDate: todayStr };
  }
  if (period === "month") {
    return {
      startDate: format(startOfMonth(now), "yyyy-MM-dd"),
      endDate: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  return {
    startDate: format(startOfYear(now), "yyyy-MM-dd"),
    endDate: format(endOfYear(now), "yyyy-MM-dd"),
  };
}

/**
 * Rule 8.1 compliant period matcher supporting both YYYY-MM-DD and full ISO YYYY-MM-DDTHH:mm:ss timestamps.
 */
export function doesTransactionMatchResetPeriod(
  occurredOn: string | undefined | null,
  period: ResetPeriod,
  now: Date = new Date(),
): boolean {
  if (!occurredOn) return false;
  if (period === "all") return true;
  const txDate = occurredOn.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(txDate)) return false;
  const bounds = getResetPeriodDateBounds(period, now);
  if (!bounds) return true;
  return txDate >= bounds.startDate && txDate <= bounds.endDate;
}

async function pruneLocalTransactionsByPeriod(
  period: ResetPeriod,
  now: Date,
): Promise<void> {
  if (period === "all") {
    clearPendingMutations();
    await clearLocalTransactionsCache();
    return;
  }

  // Prune matching pending mutations
  const pending = getPendingMutations();
  for (const m of pending) {
    const occurredOn = m.payload?.occurred_on;
    if (occurredOn && doesTransactionMatchResetPeriod(occurredOn, period, now)) {
      removePendingMutation(m.id);
    }
  }

  // Prune localStorage backup
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(TX_BACKUP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Transaction[];
        if (Array.isArray(parsed)) {
          const remaining = parsed.filter(
            (t) => !doesTransactionMatchResetPeriod(t.occurred_on, period, now),
          );
          localStorage.setItem(TX_BACKUP_STORAGE_KEY, JSON.stringify(remaining));
        }
      }
    } catch {}

    // Prune IndexedDB vault backup
    try {
      const vaultData = await getVaultItem<Transaction[]>(TX_BACKUP_STORAGE_KEY);
      if (Array.isArray(vaultData)) {
        const remaining = vaultData.filter(
          (t) => !doesTransactionMatchResetPeriod(t.occurred_on, period, now),
        );
        await setVaultItem(TX_BACKUP_STORAGE_KEY, remaining);
      }
    } catch {}
  }
}

export function useResetTransactions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (period: ResetPeriod) => {
      const now = new Date();
      const isGuestMode =
        typeof window !== "undefined" &&
        localStorage.getItem("trouvaille_guest_mode") === "true";

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !isGuestMode) {
        const bounds = getResetPeriodDateBounds(period, now);
        if (!bounds) {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          // Try full ISO upper bound first so YYYY-MM-DDTHH:mm:ss rows on the end date are included
          const { error: isoErr } = await supabase
            .from("transactions")
            .delete()
            .eq("user_id", user.id)
            .gte("occurred_on", bounds.startDate)
            .lte("occurred_on", `${bounds.endDate}T23:59:59`);

          if (isoErr) {
            const { error: dateErr } = await supabase
              .from("transactions")
              .delete()
              .eq("user_id", user.id)
              .gte("occurred_on", bounds.startDate)
              .lte("occurred_on", bounds.endDate);
            if (dateErr) throw dateErr;
          }
        }
      } else if (!user && !isGuestMode) {
        // Check if local transactions exist in offline cache; if neither session nor guest mode is active, still prune local cache safely
        await pruneLocalTransactionsByPeriod(period, now);
        return { period };
      }

      await pruneLocalTransactionsByPeriod(period, now);
      return { period };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["categoryStats"] });
      qc.invalidateQueries({ queryKey: ["monthSummary"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

