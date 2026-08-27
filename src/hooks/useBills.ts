import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Bill, RepeatRule } from "../lib/types"
import { addWeeks, addMonths, addYears, format, parseISO, addDays } from "date-fns"
import { syncBillNotifications } from "../lib/notifications"

interface BillInput {
  title: string; amount?: number | null; due_date: string
  repeat_rule: RepeatRule; is_paid?: boolean; note?: string | null
}

import { useAuth } from "../contexts/AuthContext"

export function useBills() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: ["bills", userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase.from("bills").select("*").eq("user_id", userId).order("due_date", { ascending: true })
      if (error) throw error
      const bills = data as Bill[]

      // Automatic Recurring Cycle Rollover:
      // If a recurring bill was marked paid and its due_date has now passed,
      // roll it forward to the next cycle and reset is_paid to false.
      const todayStr = format(new Date(), "yyyy-MM-dd")
      const updatesToRun: Promise<any>[] = []

      const syncedBills = bills.map(b => {
        if (b.is_paid && b.repeat_rule !== "none" && b.due_date < todayStr) {
          const nextDate = getNextDueDate(b)
          if (nextDate) {
            updatesToRun.push(
              Promise.resolve(supabase.from("bills").update({ due_date: nextDate, is_paid: false }).eq("id", b.id))
            )
            return { ...b, due_date: nextDate, is_paid: false }
          }
        }
        return b
      })

      if (updatesToRun.length > 0) {
        Promise.all(updatesToRun).catch(console.error)
      }

      setTimeout(() => { syncBillNotifications(syncedBills).catch(() => {}) }, 300)
      return syncedBills
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user;
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase.from("bills")
        .insert({ ...input, user_id: user.id }).select().single()
      if (error) throw error
      return data as Bill
    },
    onSuccess: (newBill) => {
      qc.setQueryData<Bill[]>(["bills"], (old) => {
        if (!old) return [newBill]
        return [...old.filter(b => b.id !== newBill.id), newBill].sort((a, b) => a.due_date.localeCompare(b.due_date))
      })
      qc.invalidateQueries({ queryKey: ["bills"] })
    },
  })
}

export function useUpdateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: BillInput & { id: string }) => {
      const { data, error } = await supabase.from("bills").update(input).eq("id", id).select().single()
      if (error) throw error
      return data as Bill
    },
    onSuccess: (updated) => {
      qc.setQueryData<Bill[]>(["bills"], (old) => {
        if (!old) return []
        return old.map(b => b.id === updated.id ? updated : b).sort((a, b) => a.due_date.localeCompare(b.due_date))
      })
      qc.invalidateQueries({ queryKey: ["bills"] })
    },
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData<Bill[]>(["bills"], (old) => {
        if (!old) return []
        return old.filter(b => b.id !== deletedId)
      })
      qc.invalidateQueries({ queryKey: ["bills"] })
    },
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
      const { data, error } = await supabase.from("bills").update(updateData).eq("id", bill.id).select().single()
      if (error) throw error
      return data as Bill
    },
    onSuccess: (updated) => {
      qc.setQueryData<Bill[]>(["bills"], (old) => {
        if (!old) return []
        return old.map(b => b.id === updated.id ? updated : b).sort((a, b) => a.due_date.localeCompare(b.due_date))
      })
      qc.invalidateQueries({ queryKey: ["bills"] })
    },
  })
}


