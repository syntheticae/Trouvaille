import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Bill, RepeatRule } from "../lib/types"
import { addWeeks, addMonths, addYears, format, parseISO, addDays } from "date-fns"
import { syncBillNotifications } from "../lib/notifications"

interface BillInput {
  title: string; amount?: number | null; due_date: string
  repeat_rule: RepeatRule; is_paid?: boolean; note?: string | null
}

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills").select("*").order("due_date", { ascending: true })
      if (error) throw error
      const bills = data as Bill[]
      syncBillNotifications(bills).catch(() => {})
      return bills
    },
  })
}

export function useUpcomingBills() {
  const { data: bills } = useBills()
  if (!bills) return []
  const today = new Date()
  const cutoff = addDays(today, 90)
  return bills.filter(b => {
    if (b.is_paid) return false
    const due = parseISO(b.due_date)
    return due <= cutoff
  }).sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export function usePaidBills() {
  const { data: bills } = useBills()
  return (bills ?? []).filter(b => b.is_paid)
}

export function useBillsDueOn(date: string) {
  const { data: bills } = useBills()
  return (bills ?? []).filter(b => b.due_date === date && !b.is_paid)
}

export function getDaysUntilDue(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = parseISO(dueDate)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

export function getNextDueDate(bill: Bill): string | null {
  if (bill.repeat_rule === "none") return null
  const due = parseISO(bill.due_date)
  let next: Date
  switch (bill.repeat_rule) {
    case "weekly": next = addWeeks(due, 1); break
    case "monthly": next = addMonths(due, 1); break
    case "yearly": next = addYears(due, 1); break
    default: return null
  }
  return format(next, "yyyy-MM-dd")
}

export function useAddBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BillInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase.from("bills")
        .insert({ ...input, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  })
}

export function useUpdateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: BillInput & { id: string }) => {
      const { data, error } = await supabase.from("bills").update(input).eq("id", id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  })
}

export function useMarkBillPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bill, paid }: { bill: Bill; paid: boolean }) => {
      const updateData: Partial<Bill> = { is_paid: paid }
      if (!paid && bill.repeat_rule !== "none") {
        const next = getNextDueDate(bill)
        if (next) updateData.due_date = next
      }
      const { error } = await supabase.from("bills").update(updateData).eq("id", bill.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  })
}


