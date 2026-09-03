import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Transaction, TransactionType } from "../lib/types";
import { format } from "date-fns";

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

function isLikelyTransientTransactionError(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("timeout") ||
    normalized.includes("tempor") ||
    normalized.includes("fetch")
  );
}

import { useAuth } from "../contexts/AuthContext";

/**
 * Deterministic chunked pagination fetcher for Supabase transactions.
 * Guarantees 100% retrieval across arbitrarily large datasets without PostgREST row limits.
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

  const pageSize = 1000;
  let from = 0;
  const allRecords: Transaction[] = [];
  let hasMore = true;
  let serverTotalCount: number | null = null;

  while (hasMore) {
    const shouldRequestCount = from === 0;
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
    if (filters?.startDate) query = query.gte("occurred_on", filters.startDate);
    if (filters?.endDate) query = query.lte("occurred_on", filters.endDate);

    let { data, error, count } = await query;
    if (error) {
      console.warn(
        `[fetchAllTransactionsFromSupabase] Error with join at page [${from} - ${from + pageSize - 1}], trying direct select('*'):`,
        error,
      );
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

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error) {
        console.error(
          "[fetchAllTransactionsFromSupabase] Fallback select failed:",
          fallbackRes.error,
        );
        throw fallbackRes.error;
      }
      data = fallbackRes.data;
      count = fallbackRes.count;
    }

    if (count !== null && count !== undefined) {
      serverTotalCount = count;
    }

    const chunk = (data as Transaction[]) || [];
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

  // Deduplicate by primary key ID to guarantee no duplicates
  const seenIds = new Set<string>();
  const uniqueRecords: Transaction[] = [];
  for (const item of allRecords) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueRecords.push(item);
    }
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    return uniqueRecords.filter((t) => t.note?.toLowerCase().includes(s));
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
    mutationFn: async (input: TransactionInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const insertedId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        const { data, error } = await supabase
          .from("transactions")
          .insert({ ...input, id: insertedId, user_id: user.id })
          .select("*")
          .single();

        if (!error && data) return data as Transaction;

        const fallback = await supabase
          .from("transactions")
          .select("*")
          .eq("id", insertedId)
          .maybeSingle();

        if (!fallback.error && fallback.data) {
          return fallback.data as Transaction;
        }

        lastError =
          error || fallback.error || new Error("Failed to save transaction");

        if (attempt < 2 && isLikelyTransientTransactionError(lastError)) {
          await delay(350);
          continue;
        }

        throw lastError;
      }

      throw lastError || new Error("Failed to save transaction");
    },
    onMutate: async (newTx) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const snapshots = snapshotTransactionQueries(qc);
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `temp-${crypto.randomUUID()}`
          : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const optimisticItem: Transaction = {
        id: tempId,
        user_id: userId || "",
        amount: newTx.amount,
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
      return { snapshots, tempId };
    },
    onSuccess: (savedTx, _vars, context) => {
      if (context?.tempId) {
        removeTransactionFromCaches(qc, context.tempId);
      }
      upsertTransactionAcrossCaches(qc, savedTx);
    },
    onError: (_err, _newTx, context) => {
      if (context?.snapshots) {
        restoreTransactionQueries(qc, context.snapshots);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionInput & { id: string }) => {
      // 1. Sanitize payload
      const sanitized: any = {};
      if (input.type) sanitized.type = input.type;
      if (input.amount !== undefined) sanitized.amount = Number(input.amount);
      if (input.occurred_on) sanitized.occurred_on = input.occurred_on;
      if (input.created_at) sanitized.created_at = input.created_at;
      sanitized.note = input.note ?? null;
      sanitized.category_id = input.category_id ?? null;
      sanitized.wallet_id = input.wallet_id ?? null;
      sanitized.to_wallet_id = input.to_wallet_id ?? null;

      let { data, error } = await supabase
        .from("transactions")
        .update(sanitized)
        .eq("id", id)
        .select("*, categories(*)")
        .maybeSingle();

      if (error || !data) {
        console.warn(
          "[useUpdateTransaction] Update with join error or empty, retrying without join:",
          error,
        );
        const { data: fallback, error: fbErr } = await supabase
          .from("transactions")
          .update(sanitized)
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (fbErr) {
          console.error("[useUpdateTransaction] Direct update error:", fbErr);
          throw fbErr;
        }
        data = fallback;
      }
      return data as Transaction;
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
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
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
