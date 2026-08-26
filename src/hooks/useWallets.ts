import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Wallet } from "../lib/types"

export function getWalletIcon(name: string): string {
  if (!name) return "/icons/Budgets/custom.png"
  const n = name.trim().toLowerCase()
  if (n === "bca") return "/icons/Budgets/BCA.png"
  if (n === "bri") return "/icons/Budgets/BRI.png"
  if (n === "mandiri") return "/icons/Budgets/Mandiri.png"
  if (n === "link" || n === "linkaja") return "/icons/Budgets/Link.png"
  if (n === "ovo") return "/icons/Budgets/Ovo.png"
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
  return "/icons/Budgets/custom.png"
}

export const DEFAULT_WALLETS = [
  "Cash", "BNI", "BCA", "BRI", "Mandiri", "Dana", "Gopay", "Ovo", "Link", "Shopeepay",
  "Jago", "BLU", "Krom", "Seabank", "Superbank", "Tapcash", "Crypto", "Saham", "Piutang", "Liabilities"
]

export const FALLBACK_WALLETS: Wallet[] = DEFAULT_WALLETS.map((name, i) => ({
  id: `fallback-${i}-${name.toLowerCase()}`,
  user_id: "default",
  name,
  icon: getWalletIcon(name),
  created_at: new Date().toISOString()
}))

export const AVAILABLE_WALLET_ICONS = [
  "/icons/Budgets/Cash.png",
  "/icons/Budgets/BCA.png",
  "/icons/Budgets/BNI.png",
  "/icons/Budgets/BRI.png",
  "/icons/Budgets/Mandiri.png",
  "/icons/Budgets/Dana.png",
  "/icons/Budgets/Gopay.png",
  "/icons/Budgets/Ovo.png",
  "/icons/Budgets/Link.png",
  "/icons/Budgets/Shopeepay.png",
  "/icons/Budgets/Jago.png",
  "/icons/Budgets/BLU.png",
  "/icons/Budgets/Krom.png",
  "/icons/Budgets/Seabank.png",
  "/icons/Budgets/Superbank.png",
  "/icons/Budgets/Tapcash.png",
  "/icons/Budgets/Crypto.png",
  "/icons/Budgets/Saham.png",
  "/icons/Budgets/Piutang.png",
  "/icons/Budgets/Liabilities.png",
  "/icons/tabungan.png",
  "/icons/investasi.png",
  "/icons/trading.png",
  "/icons/wallet.png",
]

export function useEnsureDefaultWallets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) return

        const { data: existing } = await supabase.from("wallets").select("id").eq("user_id", user.id).limit(1)
        // Only seed on brand new user with 0 wallets. Never restore deleted wallets.
        if (!existing || existing.length === 0) {
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
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user;
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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user;
      if (!user) throw new Error("Not authenticated")
      const finalIcon = w.icon || getWalletIcon(w.name)
      const { data, error } = await supabase.from("wallets").insert({ name: w.name, icon: finalIcon, user_id: user.id }).select().single()
      if (error) throw error
      return data as Wallet
    },
    onSuccess: (newWallet) => {
      qc.setQueryData<Wallet[]>(["wallets"], (old) => {
        if (!old) return [newWallet]
        return [...old.filter(w => w.id !== newWallet.id), newWallet]
      })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    },
  })
}

export function useUpdateWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, icon }: { id: string; name: string; icon?: string }) => {
      const payload: any = { name }
      if (icon) payload.icon = icon
      else payload.icon = getWalletIcon(name)
      const { data, error } = await supabase.from("wallets").update(payload).eq("id", id).select().single()
      if (error) throw error
      return data as Wallet
    },
    onSuccess: (updated) => {
      qc.setQueryData<Wallet[]>(["wallets"], (old) => {
        if (!old) return []
        return old.map(w => w.id === updated.id ? updated : w)
      })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    },
  })
}

export function useDeleteWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wallets").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData<Wallet[]>(["wallets"], (old) => {
        if (!old) return []
        return old.filter(w => w.id !== deletedId)
      })
      qc.invalidateQueries({ queryKey: ["wallets"] })
    },
  })
}
