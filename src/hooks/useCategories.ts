import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Category, TransactionType } from "../lib/types"

// ======================================================================
// DEFAULT CATEGORIES — using PNG icons from public/icons/
// Income: gaji, bunga, pemberian, trading, side job, investasi, hadiah
// Expense: everything else
// ======================================================================
export const DEFAULT_CATEGORIES: Omit<Category, "id" | "user_id" | "created_at">[] = [
  // --- INCOME ---
  { name: "Gaji",        emoji: "/icons/gaji.png",        type: "income",  is_default: true },
  { name: "Investasi",   emoji: "/icons/investasi.png",   type: "income",  is_default: true },
  { name: "Bunga",       emoji: "/icons/bunga.png",       type: "income",  is_default: true },
  { name: "Trading",     emoji: "/icons/trading.png",     type: "income",  is_default: true },
  { name: "Side Job",    emoji: "/icons/side job.png",    type: "income",  is_default: true },
  { name: "Pemberian",   emoji: "/icons/pemberian.png",   type: "income",  is_default: true },
  { name: "Hadiah",      emoji: "/icons/hadiah.png",      type: "income",  is_default: true },
  // --- EXPENSE ---
  { name: "Makanan",     emoji: "/icons/makanan.png",     type: "expense", is_default: true },
  { name: "Minuman",     emoji: "/icons/minuman.png",     type: "expense", is_default: true },
  { name: "Kopi",        emoji: "/icons/kopi.png",        type: "expense", is_default: true },
  { name: "Cafe",        emoji: "/icons/cafe.png",        type: "expense", is_default: true },
  { name: "Transportasi",emoji: "/icons/transportasi.png",type: "expense", is_default: true },
  { name: "Bensin",      emoji: "/icons/bensin.png",      type: "expense", is_default: true },
  { name: "Kendaraan",   emoji: "/icons/kendaraan.png",   type: "expense", is_default: true },
  { name: "Parkir",      emoji: "/icons/parkir.png",      type: "expense", is_default: true },
  { name: "Fashion",     emoji: "/icons/fashion.png",     type: "expense", is_default: true },
  { name: "Gadget",      emoji: "/icons/gadget.png",      type: "expense", is_default: true },
  { name: "Kesehatan",   emoji: "/icons/kesehatan.png",   type: "expense", is_default: true },
  { name: "Olahraga",    emoji: "/icons/olahraga.png",    type: "expense", is_default: true },
  { name: "Hiburan",     emoji: "/icons/hiburan.png",     type: "expense", is_default: true },
  { name: "Liburan",     emoji: "/icons/liburan.png",     type: "expense", is_default: true },
  { name: "Hunian",      emoji: "/icons/hunian.png",      type: "expense", is_default: true },
  { name: "Internet",    emoji: "/icons/internet.png",    type: "expense", is_default: true },
  { name: "Subscription",emoji: "/icons/subscription.png",type: "expense", is_default: true },
  { name: "Pendidikan",  emoji: "/icons/pendidikan.png",  type: "expense", is_default: true },
  { name: "Perawatan",   emoji: "/icons/perawatan.png",   type: "expense", is_default: true },
  { name: "Laundry",     emoji: "/icons/laundry.png",     type: "expense", is_default: true },
  { name: "Donasi",      emoji: "/icons/donasi.png",      type: "expense", is_default: true },
  { name: "Pajak & Legal",emoji:"/icons/pajak-legal.png", type: "expense", is_default: true },
  { name: "Admin & Fee", emoji: "/icons/admin.png",       type: "expense", is_default: true },
  { name: "Jasa",        emoji: "/icons/jasa.png",        type: "expense", is_default: true },
  { name: "Tabungan",    emoji: "/icons/wallet.png",      type: "expense", is_default: true },
  { name: "Lainnya",     emoji: "/icons/lainnya.png",     type: "expense", is_default: true },
]

export function useCategories(type?: TransactionType) {
  return useQuery({
    queryKey: ["categories", type],
    queryFn: async () => {
      let query = supabase.from("categories").select("*")
        .order("is_default", { ascending: false })
        .order("name")
      if (type) query = query.eq("type", type)
      const { data, error } = await query
      if (error) throw error

      // Deduplicate by name (case-insensitive) per type to prevent any duplicate categories
      const seen = new Set<string>()
      const uniqueList: Category[] = []
      ;((data as Category[]) || []).forEach(cat => {
        const key = `${cat.type}_${cat.name.trim().toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueList.push(cat)
        }
      })
      return uniqueList
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useEnsureDefaultCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user;
      if (!user) return

      // Check if any default categories exist
      const { data: existing } = await supabase
        .from("categories")
        .select("name")
        .eq("is_default", true)

      if (existing && existing.length > 0) {
        // Upsert: add any categories that might be missing
        const existingNames = new Set(existing.map((c: { name: string }) => c.name))
        const missing = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name))
        if (missing.length === 0) return
        await supabase.from("categories").insert(
          missing.map(c => ({ ...c, user_id: user.id }))
        )
      } else {
        // Fresh insert
        await supabase.from("categories").insert(
          DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }))
        )
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useResetDefaultCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user;
      if (!user) return
      // Delete all default categories
      await supabase.from("categories").delete().eq("user_id", user.id).eq("is_default", true)
      // Re-insert with new PNG icons
      await supabase.from("categories").insert(
        DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }))
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useAddCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cat: { name: string; emoji: string; type: TransactionType }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user;
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase.from("categories")
        .insert({ ...cat, user_id: user.id, is_default: false }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, emoji }: { id: string; name: string; emoji: string }) => {
      const { error } = await supabase.from("categories").update({ name, emoji }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}
