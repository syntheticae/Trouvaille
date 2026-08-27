import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Transaction, TransactionType } from "../lib/types"
import { format } from "date-fns"

interface TransactionInput {
  type: TransactionType
  amount: number
  category_id: string | null
  wallet_id?: string | null
  to_wallet_id?: string | null
  note?: string | null
  occurred_on: string
  created_at?: string
}

export interface TransactionFilters {
  categoryId?: string
  search?: string
  startDate?: string
  endDate?: string
  userId?: string
}

/**
 * Deterministic chunked pagination fetcher for Supabase transactions.
 * Guarantees 100% retrieval across arbitrarily large datasets without PostgREST row limits.
 */
export async function fetchAllTransactionsFromSupabase(
  filters?: TransactionFilters,
  onPageFetched?: (currentCount: number, totalCount: number | null) => void
): Promise<Transaction[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const effectiveUserId = filters?.userId || user?.id

  const pageSize = 1000
  let from = 0
  const allRecords: Transaction[] = []
  let hasMore = true
  let serverTotalCount: number | null = null

  while (hasMore) {
    let query = supabase
      .from("transactions")
      .select("*, categories(*)", { count: "exact" })
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1)

    if (effectiveUserId) query = query.eq("user_id", effectiveUserId)
    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId)
    if (filters?.startDate) query = query.gte("occurred_on", filters.startDate)
    if (filters?.endDate) query = query.lte("occurred_on", filters.endDate)

    const { data, error, count } = await query
    if (error) {
      console.error(`[fetchAllTransactionsFromSupabase] Error fetching page [${from} - ${from + pageSize - 1}]:`, error)
      throw error
    }

    if (count !== null && count !== undefined) {
      serverTotalCount = count
    }

    const chunk = (data as Transaction[]) || []
    if (chunk.length === 0) {
      hasMore = false
      break
    }

    allRecords.push(...chunk)

    if (onPageFetched) {
      onPageFetched(allRecords.length, serverTotalCount)
    }

    if (serverTotalCount !== null && allRecords.length >= serverTotalCount) {
      hasMore = false
    } else if (chunk.length < pageSize) {
      hasMore = false
    } else {
      from += pageSize
    }
  }

  // Deduplicate by primary key ID to guarantee no duplicates
  const seenIds = new Set<string>()
  const uniqueRecords: Transaction[] = []
  for (const item of allRecords) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id)
      uniqueRecords.push(item)
    }
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    return uniqueRecords.filter(t => t.note?.toLowerCase().includes(s))
  }

  return uniqueRecords
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ["transactions", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, categories(*)")
        .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit)
      if (error) throw error
      return data as Transaction[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMonthTransactions(year: number, month: number) {
  const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd")
  const end = format(new Date(year, month, 0), "yyyy-MM-dd")
  return useQuery({
    queryKey: ["transactions", "month", year, month],
    queryFn: () => fetchAllTransactionsFromSupabase({ startDate: start, endDate: end }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", "all", filters],
    queryFn: () => fetchAllTransactionsFromSupabase(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useDayTransactions(date: string) {
  return useQuery({
    queryKey: ["transactions", "day", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, categories(*)")
        .eq("occurred_on", date).order("created_at", { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMonthSummary(year: number, month: number) {
  const { data } = useMonthTransactions(year, month)
  if (!data) return { totalIncome: 0, totalExpense: 0, balance: 0 }
  const totalIncome = data.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = data.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense }
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase.from("transactions")
        .insert({ ...input, user_id: user.id }).select("*, categories(*)").single()
      if (error) throw error
      return data as Transaction
    },
    onMutate: async (newTx) => {
      await qc.cancelQueries({ queryKey: ["transactions"] })
      const prevAll = qc.getQueryData<Transaction[]>(["transactions", "all", undefined])
      const tempId = "temp-" + Date.now()
      if (prevAll) {
        const optimisticItem: Transaction = {
          id: tempId,
          user_id: "",
          amount: newTx.amount,
          type: newTx.type,
          category_id: newTx.category_id,
          wallet_id: newTx.wallet_id || null,
          to_wallet_id: newTx.to_wallet_id || null,
          note: newTx.note || null,
          occurred_on: newTx.occurred_on,
          created_at: newTx.created_at || new Date().toISOString(),
          categories: null
        }
        qc.setQueryData<Transaction[]>(["transactions", "all", undefined], [optimisticItem, ...prevAll])
      }
      return { prevAll, tempId }
    },
    onSuccess: (savedTx, _vars, context) => {
      qc.setQueriesData<Transaction[]>({ queryKey: ["transactions", "all"] }, (old) => {
        if (!old) return [savedTx]
        const filtered = old.filter(t => t.id !== context?.tempId && t.id !== savedTx.id)
        return [savedTx, ...filtered]
      })
      if (savedTx.occurred_on) {
        const parts = savedTx.occurred_on.split("-").map(Number)
        if (parts.length >= 2) {
          const year = parts[0]
          const month = parts[1]
          qc.setQueryData<Transaction[]>(["transactions", "month", year, month], (old) => {
            if (!old) return [savedTx]
            const filtered = old.filter(t => t.id !== context?.tempId && t.id !== savedTx.id)
            return [savedTx, ...filtered]
          })
        }
      }
      qc.setQueriesData<Transaction[]>({ queryKey: ["transactions", "recent"] }, (old) => {
        if (!old) return [savedTx]
        const filtered = old.filter(t => t.id !== context?.tempId && t.id !== savedTx.id)
        return [savedTx, ...filtered]
      })
    },
    onError: (_err, _newTx, context) => {
      if (context?.prevAll) {
        qc.setQueryData(["transactions", "all", undefined], context.prevAll)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionInput & { id: string }) => {
      const { data, error } = await supabase.from("transactions")
        .update(input).eq("id", id).select("*, categories(*)").single()
      if (error) throw error
      return data as Transaction
    },
    onMutate: async ({ id, ...updated }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] })
      const prevAll = qc.getQueryData<Transaction[]>(["transactions", "all", undefined])
      if (prevAll) {
        qc.setQueryData<Transaction[]>(
          ["transactions", "all", undefined],
          prevAll.map(t => (t.id === id ? { ...t, ...updated } : t))
        )
      }
      return { prevAll }
    },
    onSuccess: (updatedTx) => {
      qc.setQueriesData<Transaction[]>({ queryKey: ["transactions"] }, (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map(t => (t.id === updatedTx.id ? updatedTx : t))
      })
    },
    onError: (_err, _vars, context) => {
      if (context?.prevAll) {
        qc.setQueryData(["transactions", "all", undefined], context.prevAll)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["transactions"] })
      const prevAll = qc.getQueryData<Transaction[]>(["transactions", "all", undefined])
      if (prevAll) {
        qc.setQueryData<Transaction[]>(
          ["transactions", "all", undefined],
          prevAll.filter(t => t.id !== id)
        )
      }
      return { prevAll }
    },
    onSuccess: (deletedId) => {
      qc.setQueriesData<Transaction[]>({ queryKey: ["transactions"] }, (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.filter(t => t.id !== deletedId)
      })
    },
    onError: (_err, _id, context) => {
      if (context?.prevAll) {
        qc.setQueryData(["transactions", "all", undefined], context.prevAll)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    },
  })
}

export function useSixMonthTrend() {
  return useQuery({
    queryKey: ["transactions", "trend"],
    queryFn: async () => {
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const y = d.getFullYear(); const m = d.getMonth() + 1
        months.push({
          year: y, month: m,
          start: format(new Date(y, m - 1, 1), "yyyy-MM-dd"),
          end: format(new Date(y, m, 0), "yyyy-MM-dd"),
          label: format(new Date(y, m - 1, 1), "MMM")
        })
      }
      return Promise.all(months.map(async (m) => {
        const { data } = await supabase.from("transactions").select("type,amount")
          .gte("occurred_on", m.start).lte("occurred_on", m.end)
        const income = data?.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) ?? 0
        const expense = data?.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) ?? 0
        return { ...m, income, expense }
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCategoryStats(year: number, month: number, type: "income" | "expense" = "expense") {
  const { data, isLoading } = useMonthTransactions(year, month)
  if (!data) return { data: [], isLoading }
  const filteredData = data.filter(t => t.type === type)
  const grouped: Record<string, { category_id: string; name: string; emoji: string; total: number; count: number }> = {}
  filteredData.forEach(t => {
    const key = t.category_id ?? "other"
    const cat = t.categories
    if (!grouped[key]) {
      grouped[key] = { category_id: key, name: cat?.name ?? "Lainnya", emoji: cat?.emoji ?? "??", total: 0, count: 0 }
    }
    grouped[key].total += Number(t.amount)
    grouped[key].count += 1
  })
  return { data: Object.values(grouped).sort((a, b) => b.total - a.total), isLoading }
}

export function useSevenDayTrend() {
  return useQuery({
    queryKey: ["transactions", "7day"],
    queryFn: async () => {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = format(d, "yyyy-MM-dd")
        const label = format(d, "EEE")
        days.push({ dateStr, label })
      }
      const start = days[0].dateStr
      const end = days[days.length - 1].dateStr
      const { data } = await supabase.from("transactions")
        .select("type,amount,occurred_on")
        .gte("occurred_on", start)
        .lte("occurred_on", end)
      return days.map(({ dateStr, label }) => {
        const dayTxs = data?.filter(t => t.occurred_on === dateStr) ?? []
        const expense = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
        const income = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
        return { dateStr, label, expense, income }
      })
    },
    staleTime: 5 * 60 * 1000,
  })
}
