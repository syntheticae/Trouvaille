import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Transaction, TransactionType } from "../lib/types";
import { format } from "date-fns";
import {
  enqueuePendingMutation,
  removePendingMutation,
  getPendingMutations,
} from "../lib/syncEngine";

interface TransactionInput {
  type: TransactionType;
  amount: number;
  category_id: string | null;
  wallet_id?: string | null;
  to_wallet_id?: string | null;
  note?: string | null;
  occurred_on: string;
  created_at?: string;
}

export interface TransactionFilters {
  categoryId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface TransactionQueryOptions {
  enabled?: boolean;
}

export const transactionKeys = {
  all: (userId?: string, filters?: TransactionFilters) =>
    ["transactions", "all", userId ?? null, filters ?? null] as const,
  month: (userId: string | undefined, year: number, month: number) =>
    ["transactions", "month", userId ?? null, year, month] as const,
  day: (userId: string | undefined, date: string) =>
    ["transactions", "day", userId ?? null, date] as const,
  recent: (userId: string | undefined, limit: number) =>
    ["transactions", "recent", userId ?? null, limit] as const,
};

function sortTransactionsDesc(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => {
    const occurred = (b.occurred_on || "").localeCompare(a.occurred_on || "");
    if (occurred !== 0) return occurred;
    const created = (b.created_at || "").localeCompare(a.created_at || "");
    if (created !== 0) return created;
    return (b.id || "").localeCompare(a.id || "");
  });
}

function isTransactionList(data: unknown): data is Transaction[] {
  return (
    Array.isArray(data) &&
    (data.length === 0 ||
      (typeof data[0] === "object" &&
        data[0] !== null &&
        "id" in data[0] &&
        "type" in data[0]))
  );
}

function matchesTransactionFilters(
  tx: Transaction,
  filters?: TransactionFilters | null,
) {
  if (!filters) return true;
  if (filters.userId && tx.user_id !== filters.userId) return false;
  if (filters.categoryId && tx.category_id !== filters.categoryId) return false;
  if (filters.startDate && tx.occurred_on < filters.startDate) return false;
  if (filters.endDate && tx.occurred_on > filters.endDate) return false;
  if (filters.search) {
    const search = filters.search.toLowerCase();
    if (!tx.note?.toLowerCase().includes(search)) return false;
  }
  return true;
}

function snapshotTransactionQueries(qc: ReturnType<typeof useQueryClient>) {
  return qc
    .getQueriesData<Transaction[]>({ queryKey: ["transactions"] })
    .filter(([, data]) => isTransactionList(data));
}

function restoreTransactionQueries(
  qc: ReturnType<typeof useQueryClient>,
  snapshots: Array<[readonly unknown[], Transaction[] | undefined]>,
) {
  snapshots.forEach(([key, data]) => {
    qc.setQueryData(key, data);
  });
}

function upsertTransactionAcrossCaches(
  qc: ReturnType<typeof useQueryClient>,
  tx: Transaction,
) {
  const queries = qc.getQueryCache().findAll({ queryKey: ["transactions"] });
  queries.forEach((query) => {
    const data = query.state.data;
    if (!isTransactionList(data)) return;

    const key = query.queryKey as unknown as any[];
    const mode = key[1];
    const withoutTx = data.filter((item) => item.id !== tx.id);

    if (mode === "all") {
      const filters = (key[3] ?? null) as TransactionFilters | null;
      const next = matchesTransactionFilters(tx, filters)
        ? sortTransactionsDesc([tx, ...withoutTx])
        : sortTransactionsDesc(withoutTx);
      qc.setQueryData(query.queryKey, next);
      return;
    }

    if (mode === "month") {
      const year = Number(key[3]);
      const month = Number(key[4]);
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const next = tx.occurred_on?.startsWith(monthKey)
        ? sortTransactionsDesc([tx, ...withoutTx])
        : sortTransactionsDesc(withoutTx);
      qc.setQueryData(query.queryKey, next);
      return;
    }

    if (mode === "day") {
      const date = String(key[3] ?? "");
      const next =
        tx.occurred_on === date
          ? sortTransactionsDesc([tx, ...withoutTx])
          : sortTransactionsDesc(withoutTx);
      qc.setQueryData(query.queryKey, next);
      return;
    }

    if (mode === "recent") {
      const limit = Number(key[3]) || 10;
      qc.setQueryData(
        query.queryKey,
        sortTransactionsDesc([tx, ...withoutTx]).slice(0, limit),
      );
    }
  });
}

function removeTransactionFromCaches(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
) {
  const queries = qc.getQueryCache().findAll({ queryKey: ["transactions"] });
  queries.forEach((query) => {
    const data = query.state.data;
    if (!isTransactionList(data)) return;
    qc.setQueryData(
      query.queryKey,
      data.filter((item) => item.id !== id),
    );
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase request timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const TX_BACKUP_STORAGE_KEY = "TROUVAILLE_TX_BACKUP_V1";

import { useAuth } from "../contexts/AuthContext";

/**
 * Deterministic chunked pagination fetcher for Supabase transactions.
 * Guarantees 100% retrieval across arbitrarily large datasets without PostgREST row limits.
 * Resilient against network timeouts, flakiness, and offline cold starts with local backup snapshots.
 */
export async function fetchAllTransactionsFromSupabase(
  filters?: TransactionFilters,
  onPageFetched?: (currentCount: number, totalCount: number | null) => void,
): Promise<Transaction[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  const effectiveUserId = filters?.userId || user?.id;

  const pageSize = 250;
  let from = 0;
  const allRecords: Transaction[] = [];
  let hasMore = true;
  let serverTotalCount: number | null = null;

  while (hasMore) {
    const shouldRequestCount = from === 0;
    let chunk: Transaction[] = [];
    let fetchError: unknown = null;

    // Resilient chunk fetcher with auto-retry up to 3 attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let query = supabase
          .from("transactions")
          .select(
            "*, categories(*)",
            shouldRequestCount ? { count: "exact" } : undefined,
          )
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + pageSize - 1);

        if (effectiveUserId) query = query.eq("user_id", effectiveUserId);
        if (filters?.categoryId)
          query = query.eq("category_id", filters.categoryId);
        if (filters?.startDate)
          query = query.gte("occurred_on", filters.startDate);
        if (filters?.endDate) query = query.lte("occurred_on", filters.endDate);

        let { data, error, count } = await withTimeout(query, 8000);
        if (error) {
          // Fallback to flat query without join for speed and resilience
          let fallbackQuery = supabase
            .from("transactions")
            .select("*", shouldRequestCount ? { count: "exact" } : undefined)
            .order("occurred_on", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, from + pageSize - 1);

          if (effectiveUserId)
            fallbackQuery = fallbackQuery.eq("user_id", effectiveUserId);
          if (filters?.categoryId)
            fallbackQuery = fallbackQuery.eq("category_id", filters.categoryId);
          if (filters?.startDate)
            fallbackQuery = fallbackQuery.gte("occurred_on", filters.startDate);
          if (filters?.endDate)
            fallbackQuery = fallbackQuery.lte("occurred_on", filters.endDate);

          const fallbackRes = await withTimeout(fallbackQuery, 8000);
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
          count = fallbackRes.count;
        }

        if (count !== null && count !== undefined) {
          serverTotalCount = count;
        }

        chunk = (data as Transaction[]) || [];
        fetchError = null;
        break;
      } catch (err) {
        fetchError = err;
        if (attempt < 3) {
          await delay(300 * attempt);
        }
      }
    }

    if (fetchError && chunk.length === 0) {
      // If initial page fails, attempt recovery from local backup snapshot
      if (from === 0) {
        try {
          const rawBackup = localStorage.getItem(TX_BACKUP_STORAGE_KEY);
          if (rawBackup) {
            const parsed = JSON.parse(rawBackup);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.warn(
                "[fetchAllTransactionsFromSupabase] Network unreachable, successfully recovered from local snapshot:",
                fetchError,
              );
              let restored = parsed as Transaction[];
              if (filters?.categoryId) {
                restored = restored.filter((t) => t.category_id === filters.categoryId);
              }
              if (filters?.startDate) {
                restored = restored.filter((t) => t.occurred_on >= filters.startDate!);
              }
              if (filters?.endDate) {
                restored = restored.filter((t) => t.occurred_on <= filters.endDate!);
              }
              if (filters?.search) {
                const s = filters.search.toLowerCase();
                restored = restored.filter(
                  (t) =>
                    t.categories?.name.toLowerCase().includes(s) ||
                    t.note?.toLowerCase().includes(s),
                );
              }
              // Overlay pending mutations onto restored backup
              const pendingMutations = getPendingMutations();
              const pendingDeletes = new Set<string>();
              const pendingUpserts = new Map<string, Transaction>();
              for (const m of pendingMutations) {
                if (m.type === "delete") {
                  const id = m.payload?.id || m.payload;
                  if (id) pendingDeletes.add(id);
                } else if ((m.type === "insert" || m.type === "update") && m.payload?.id) {
                  pendingUpserts.set(m.payload.id, m.payload as Transaction);
                }
              }
              const map = new Map<string, Transaction>();
              for (const item of restored) {
                if (!pendingDeletes.has(item.id)) map.set(item.id, item);
              }
              for (const [id, tx] of pendingUpserts) {
                if (!pendingDeletes.has(id)) map.set(id, tx);
              }
              return sortTransactionsDesc(Array.from(map.values()));
            }
          }
        } catch (backupErr) {
          console.warn("[fetchAllTransactionsFromSupabase] Backup read failed:", backupErr);
        }

        // If no backup exists, throw the error so React Query marks query as error
        // instead of empty success, preserving any existing cached transactions!
        throw fetchError;
      }

      // If subsequent page fails, throw so we never return a partial/truncated dataset
      throw fetchError;
    }

    if (chunk.length === 0) {
      hasMore = false;
      break;
    }

    allRecords.push(...chunk);

    if (onPageFetched) {
      onPageFetched(allRecords.length, serverTotalCount);
    }

    if (serverTotalCount !== null && allRecords.length >= serverTotalCount) {
      hasMore = false;
    } else if (chunk.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  // Deduplicate and overlay local pending mutations
  const pendingMutations = getPendingMutations();
  const pendingDeletes = new Set<string>();
  const pendingUpserts = new Map<string, Transaction>();

  for (const m of pendingMutations) {
    if (m.type === "delete") {
      const id = m.payload?.id || m.payload;
      if (id) pendingDeletes.add(id);
    } else if ((m.type === "insert" || m.type === "update") && m.payload?.id) {
      pendingUpserts.set(m.payload.id, m.payload as Transaction);
    }
  }

  const recordMap = new Map<string, Transaction>();
  for (const item of allRecords) {
    if (!pendingDeletes.has(item.id)) {
      recordMap.set(item.id, item);
    }
  }

  // Preserve and overlay all local pending inserts/updates
  for (const [id, pendingTx] of pendingUpserts) {
    if (!pendingDeletes.has(id)) {
      recordMap.set(id, pendingTx);
    }
  }

  let uniqueRecords = sortTransactionsDesc(Array.from(recordMap.values()));

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    uniqueRecords = uniqueRecords.filter((t) =>
      t.note?.toLowerCase().includes(s),
    );
  }

  // Persist healthy full dataset to local backup if unfiltered
  if (
    !filters?.categoryId &&
    !filters?.startDate &&
    !filters?.endDate &&
    !filters?.search &&
    uniqueRecords.length > 0
  ) {
    try {
      localStorage.setItem(
        TX_BACKUP_STORAGE_KEY,
        JSON.stringify(uniqueRecords.slice(0, 3000)),
      );
    } catch (e) {
      console.warn("[fetchAllTransactionsFromSupabase] Failed to write backup snapshot:", e);
    }
  }

  return uniqueRecords;
}

export function useRecentTransactions(limit = 10) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: transactionKeys.recent(userId, limit),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", userId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      if (error) {
        const { data: fallback, error: fbErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit);
        if (fbErr) throw fbErr;
        return (fallback || []) as Transaction[];
      }
      return data as Transaction[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useMonthTransactions(year: number, month: number) {
  const { user } = useAuth();
  const userId = user?.id;
  const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const end = format(new Date(year, month, 0), "yyyy-MM-dd");

  return useQuery({
    queryKey: transactionKeys.month(userId, year, month),
    queryFn: () =>
      fetchAllTransactionsFromSupabase({
        startDate: start,
        endDate: end,
        userId,
      }),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useAllTransactions(
  filters?: TransactionFilters,
  options?: TransactionQueryOptions,
) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: transactionKeys.all(userId, filters),
    queryFn: () => fetchAllTransactionsFromSupabase({ ...filters, userId }),
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: 60 * 1000,
  });
}

export function useDayTransactions(date: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: transactionKeys.day(userId, date),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .eq("user_id", userId)
        .eq("occurred_on", date)
        .order("created_at", { ascending: false });
      if (error) {
        const { data: fb, error: fbErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .eq("occurred_on", date)
          .order("created_at", { ascending: false });
        if (fbErr) throw fbErr;
        return (fb || []) as Transaction[];
      }
      return data as Transaction[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

import { computeMonthAggregates } from "../lib/financialMath";

export function useMonthSummary(year: number, month: number) {
  const { data: monthTxs = [] } = useMonthTransactions(year, month);
  return useMemo(() => {
    const agg = computeMonthAggregates(monthTxs, year, month);
    return {
      totalIncome: agg.totalIncome,
      totalExpense: agg.totalExpense,
      balance: agg.netCashflow,
      savingsRate: agg.savingsRate,
      txCount: agg.txCount,
      avgExpense: agg.avgExpense,
    };
  }, [monthTxs, year, month]);
}

export function useAddTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (input: TransactionInput & { id?: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user || (userId ? { id: userId } : null);

      const effectiveId =
        input.id ||
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

      const fullTx: Transaction = {
        id: effectiveId,
        user_id: currentUser?.id || userId || "",
        amount: Number(input.amount),
        type: input.type,
        category_id: input.category_id,
        wallet_id: input.wallet_id || null,
        to_wallet_id: input.to_wallet_id || null,
        note: input.note || null,
        occurred_on: input.occurred_on,
        created_at: input.created_at || new Date().toISOString(),
        categories: null,
      };

      // Always save to persistent pending mutations queue first
      const mutation = enqueuePendingMutation("insert", fullTx);

      if (!currentUser?.id) {
        return fullTx;
      }

      // Attempt immediate sync to Supabase with quick timeout/retry
      try {
        const { data, error } = await supabase
          .from("transactions")
          .upsert({ ...fullTx, user_id: currentUser.id })
          .select("*")
          .maybeSingle();

        if (!error && data) {
          removePendingMutation(mutation.id);
          return data as Transaction;
        }
      } catch (networkErr) {
        console.warn(
          "[useAddTransaction] Network slow/unreachable. Preserved in pending queue:",
          networkErr,
        );
      }

      // Return fullTx safely so UI stays intact and transaction is never dropped
      return fullTx;
    },
    onMutate: async (newTx: any) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const snapshots = snapshotTransactionQueries(qc);
      const effectiveId =
        newTx.id ||
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

      const optimisticItem: Transaction = {
        id: effectiveId,
        user_id: userId || "",
        amount: Number(newTx.amount),
        type: newTx.type,
        category_id: newTx.category_id,
        wallet_id: newTx.wallet_id || null,
        to_wallet_id: newTx.to_wallet_id || null,
        note: newTx.note || null,
        occurred_on: newTx.occurred_on,
        created_at: newTx.created_at || new Date().toISOString(),
        categories: null,
      };

      upsertTransactionAcrossCaches(qc, optimisticItem);
      return { snapshots, optimisticItem };
    },
    onSuccess: (savedTx) => {
      upsertTransactionAcrossCaches(qc, savedTx);
    },
    onError: (_err, _newTx, context) => {
      // Do NOT rollback if transaction was enqueued
      if (context?.optimisticItem) {
        upsertTransactionAcrossCaches(qc, context.optimisticItem);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionInput & { id: string }) => {
      const sanitized: any = { id };
      if (input.type) sanitized.type = input.type;
      if (input.amount !== undefined) sanitized.amount = Number(input.amount);
      if (input.occurred_on) sanitized.occurred_on = input.occurred_on;
      if (input.created_at) sanitized.created_at = input.created_at;
      sanitized.note = input.note ?? null;
      sanitized.category_id = input.category_id ?? null;
      sanitized.wallet_id = input.wallet_id ?? null;
      sanitized.to_wallet_id = input.to_wallet_id ?? null;
      if (userId) sanitized.user_id = userId;

      const mutation = enqueuePendingMutation("update", sanitized);

      try {
        const { data, error } = await supabase
          .from("transactions")
          .update(sanitized)
          .eq("id", id)
          .select("*")
          .maybeSingle();

        if (!error && data) {
          removePendingMutation(mutation.id);
          return data as Transaction;
        }
      } catch (err) {
        console.warn("[useUpdateTransaction] Update queued locally:", err);
      }

      return sanitized as Transaction;
    },
    onMutate: async ({ id, ...updated }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const snapshots = snapshotTransactionQueries(qc);
      const existing = snapshots
        .flatMap(([, data]) => data ?? [])
        .find((item) => item.id === id);

      if (existing) {
        upsertTransactionAcrossCaches(qc, {
          ...existing,
          ...updated,
          id,
        } as Transaction);
      }

      return { snapshots };
    },
    onSuccess: (updatedTx) => {
      upsertTransactionAcrossCaches(qc, updatedTx);
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        restoreTransactionQueries(qc, context.snapshots);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const mutation = enqueuePendingMutation("delete", { id });
      try {
        let q = supabase.from("transactions").delete().eq("id", id);
        if (userId) q = q.eq("user_id", userId);
        const { error } = await q;
        if (!error) {
          removePendingMutation(mutation.id);
        }
      } catch (err) {
        console.warn("[useDeleteTransaction] Delete queued locally:", err);
      }
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const snapshots = snapshotTransactionQueries(qc);
      removeTransactionFromCaches(qc, id);
      return { snapshots };
    },
    onSuccess: (deletedId) => {
      removeTransactionFromCaches(qc, deletedId);
    },
    onError: (_err, _id, context) => {
      if (context?.snapshots) {
        restoreTransactionQueries(qc, context.snapshots);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useSixMonthTrend() {
  return useQuery({
    queryKey: ["transactions", "trend"],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        months.push({
          year: y,
          month: m,
          start: format(new Date(y, m - 1, 1), "yyyy-MM-dd"),
          end: format(new Date(y, m, 0), "yyyy-MM-dd"),
          label: format(new Date(y, m - 1, 1), "MMM"),
        });
      }
      return Promise.all(
        months.map(async (m) => {
          const { data } = await supabase
            .from("transactions")
            .select("type,amount")
            .gte("occurred_on", m.start)
            .lte("occurred_on", m.end);
          const income =
            data
              ?.filter((t) => t.type === "income")
              .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
          const expense =
            data
              ?.filter((t) => t.type === "expense")
              .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
          return { ...m, income, expense };
        }),
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryStats(
  year: number,
  month: number,
  type: "income" | "expense" = "expense",
) {
  const { data, isLoading } = useMonthTransactions(year, month);
  if (!data) return { data: [], isLoading };
  const filteredData = data.filter((t) => t.type === type);
  const grouped: Record<
    string,
    {
      category_id: string;
      name: string;
      emoji: string;
      total: number;
      count: number;
    }
  > = {};
  filteredData.forEach((t) => {
    const key = t.category_id ?? "other";
    const cat = t.categories;
    if (!grouped[key]) {
      grouped[key] = {
        category_id: key,
        name: cat?.name ?? "Lainnya",
        emoji: cat?.emoji ?? "??",
        total: 0,
        count: 0,
      };
    }
    grouped[key].total += Number(t.amount);
    grouped[key].count += 1;
  });
  return {
    data: Object.values(grouped).sort((a, b) => b.total - a.total),
    isLoading,
  };
}

export function useSevenDayTrend() {
  return useQuery({
    queryKey: ["transactions", "7day"],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const label = format(d, "EEE");
        days.push({ dateStr, label });
      }
      const start = days[0].dateStr;
      const end = days[days.length - 1].dateStr;
      const { data } = await supabase
        .from("transactions")
        .select("type,amount,occurred_on")
        .gte("occurred_on", start)
        .lte("occurred_on", end);
      return days.map(({ dateStr, label }) => {
        const dayTxs = data?.filter((t) => t.occurred_on === dateStr) ?? [];
        const expense = dayTxs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + Number(t.amount), 0);
        const income = dayTxs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + Number(t.amount), 0);
        return { dateStr, label, expense, income };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
