import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Wallet } from "../lib/types"

export function getWalletIcon(name: string): string {
  if (!name) return "/icons/Budgets/Cash.png"
  const n = name.trim().toLowerCase()
  if (n === "blu") return "/icons/Budgets/BLU.png"
  if (n === "bni") return "/icons/Budgets/BNI.png"
  if (n === "cash") return "/icons/Budgets/Cash.png"
  if (n === "crypto") return "/icons/Budgets/Crypto.png"
  if (n === "dana") return "/icons/Budgets/Dana.png"
  if (n === "gopay") return "/icons/Budgets/Gopay.png"
  if (n === "jago") return "/icons/Budgets/Jago.png"
  if (n === "krom") return "/icons/Budgets/Krom.png"
  if (n === "liabilities") return "/icons/Budgets/Liabilities.png"
  if (n === "piutang") return "/icons/Budgets/Piutang.png"
  if (n === "saham") return "/icons/Budgets/Saham.png"
  if (n === "seabank") return "/icons/Budgets/Seabank.png"
  if (n === "shopeepay" || n === "shopee") return "/icons/Budgets/Shopeepay.png"
  if (n === "superbank") return "/icons/Budgets/Superbank.png"
  if (n === "tapcash") return "/icons/Budgets/Tapcash.png"
  return "/icons/Budgets/Cash.png"
}

export const DEFAULT_WALLETS = [
  "Cash", "BNI", "BCA", "Crypto", "Dana", "Shopeepay", "Gopay", "Jago", "BLU", "Krom",
  "Liabilities", "Piutang", "Saham", "Seabank", "Superbank", "Tapcash"
]

export const FALLBACK_WALLETS: Wallet[] = DEFAULT_WALLETS.map((name, i) => ({
  id: `fallback-${i}-${name.toLowerCase()}`,
  user_id: "default",
  name,
  icon: getWalletIcon(name),
  created_at: new Date().toISOString()
}))

export function useEnsureDefaultWallets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: existing } = await supabase.from("wallets").select("name").eq("user_id", user.id)
        if (existing && existing.length > 0) {
          const existingNames = new Set(existing.map((w: { name: string }) => w.name.toLowerCase()))
          const missing = DEFAULT_WALLETS.filter(w => !existingNames.has(w.toLowerCase()))
          if (missing.length === 0) return
          await supabase.from("wallets").insert(
            missing.map(name => ({ name, icon: getWalletIcon(name), user_id: user.id }))
          )
        } else {
          await supabase.from("wallets").insert(
            DEFAULT_WALLETS.map(name => ({ name, icon: getWalletIcon(name), user_id: user.id }))
          )
        }
      } catch (e) {
        console.warn("useEnsureDefaultWallets caught error:", e)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  })
}

export function useWallets() {
  return useQuery({
    queryKey: ["wallets"],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return FALLBACK_WALLETS
        const { data, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
        if (!error && data && data.length > 0) {
          const seen = new Set<string>()
          const unique: Wallet[] = []
          ;(data as Wallet[]).forEach(w => {
            const k = w.name.trim().toLowerCase()
            if (!seen.has(k)) {
              seen.add(k)
              // Ensure icon uses the new Budget icon if it has generic icon or missing
              const resolvedIcon = (!w.icon || w.icon === "/icons/wallet.png") ? getWalletIcon(w.name) : w.icon
              unique.push({ ...w, icon: resolvedIcon })
            }
          })
          return unique
        }
        // Auto-seed if empty
        const { data: inserted } = await supabase
          .from("wallets")
          .insert(DEFAULT_WALLETS.map(name => ({ name, icon: getWalletIcon(name), user_id: user.id })))
          .select()
        if (inserted && inserted.length > 0) return inserted as Wallet[]
        return FALLBACK_WALLETS
      } catch (e) {
        console.warn("Failed to fetch wallets:", e)
        return FALLBACK_WALLETS
      }
    },
    staleTime: 60 * 1000,
  })
}

export function useAddWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (w: { name: string; icon?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const finalIcon = w.icon || getWalletIcon(w.name)
      const { data, error } = await supabase.from("wallets").insert({ name: w.name, icon: finalIcon, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  })
}

export function useUpdateWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, icon }: { id: string; name: string; icon?: string }) => {
      const payload: any = { name }
      if (icon) payload.icon = icon
      else payload.icon = getWalletIcon(name)
      const { error } = await supabase.from("wallets").update(payload).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  })
}

export function useDeleteWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wallets").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  })
}
