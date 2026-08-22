import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Transaction, TransactionType } from "../lib/types"
import { format } from "date-fns"

interface TransactionInput {
  type: TransactionType; amount: number
  category_id: string | null; wallet_id?: string | null; to_wallet_id?: string | null; note?: string | null; occurred_on: string
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ["transactions", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, categories(*)")
        .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(limit)
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useMonthTransactions(year: number, month: number) {
  const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd")
  const end = format(new Date(year, month, 0), "yyyy-MM-dd")
  return useQuery({
    queryKey: ["transactions", "month", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, categories(*)")
        .gte("occurred_on", start).lte("occurred_on", end)
        .order("occurred_on", { ascending: false }).order("created_at", { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useAllTransactions(filters?: { categoryId?: string; search?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["transactions", "all", filters],
    queryFn: async () => {
      let query = supabase.from("transactions").select("*, categories(*)")
        .order("occurred_on", { ascending: false }).order("created_at", { ascending: false })
      if (filters?.categoryId) query = query.eq("category_id", filters.categoryId)
      if (filters?.startDate) query = query.gte("occurred_on", filters.startDate)
      if (filters?.endDate) query = query.lte("occurred_on", filters.endDate)
      const { data, error } = await query
      if (error) throw error
      let result = data as Transaction[]
      if (filters?.search) {
        const s = filters.search.toLowerCase()
        result = result.filter(t => t.note?.toLowerCase().includes(s))
      }
      return result
    },
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase.from("transactions")
        .insert({ ...input, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: TransactionInput & { id: string }) => {
      const { data, error } = await supabase.from("transactions")
        .update(input).eq("id", id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
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
