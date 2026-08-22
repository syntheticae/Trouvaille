import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns"

export type ResetPeriod = "today" | "week" | "month" | "year" | "all"

export function useResetTransactions() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (period: ResetPeriod) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const now = new Date()
      let query = supabase.from("transactions").delete().eq("user_id", user.id)

      if (period === "today") {
        const todayStr = format(now, "yyyy-MM-dd")
        query = query.eq("occurred_on", todayStr)
      } else if (period === "week") {
        const start = format(subDays(now, 6), "yyyy-MM-dd")
        const end = format(now, "yyyy-MM-dd")
        query = query.gte("occurred_on", start).lte("occurred_on", end)
      } else if (period === "month") {
        const start = format(startOfMonth(now), "yyyy-MM-dd")
        const end = format(endOfMonth(now), "yyyy-MM-dd")
        query = query.gte("occurred_on", start).lte("occurred_on", end)
      } else if (period === "year") {
        const start = format(startOfYear(now), "yyyy-MM-dd")
        const end = format(endOfYear(now), "yyyy-MM-dd")
        query = query.gte("occurred_on", start).lte("occurred_on", end)
      }
      // If "all", no date filter -> deletes all transactions for this user

      const { error } = await query
      if (error) throw error
      return { period }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["categoryStats"] })
      qc.invalidateQueries({ queryKey: ["monthSummary"] })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    }
  })
}
