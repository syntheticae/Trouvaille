import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import famfinaData from "../data/famfina_transactions.json"
import { DEFAULT_CATEGORIES } from "./useCategories"
import { DEFAULT_WALLETS } from "./useWallets"

export interface FamfinaRecord {
  file: string
  occurred_on: string
  created_at: string
  type: "income" | "expense" | "transfer"
  amount: number
  fromWallet: string
  toWallet: string | null
  categoryName: string
  note: string | null
}

export function mapCategoryName(name: string): string {
  const n = name.trim()
  if (n === "BBM") return "Bensin"
  if (n === "Biaya Admin") return "Admin & Fee"
  if (n === "Tagihan" || n === "Langganan") return "Subscription"
  if (n === "Sampingan" || n === "Bonus") return "Side Job"
  if (n === "Kopi") return "Kopi"
  if (n === "Cafe") return "Cafe"
  if (n === "Lain-lain" || n === "Koreksi Saldo") return "Lainnya"
  if (n === "Groceries") return "Makanan"
  if (n === "Pajak/Legal") return "Pajak & Legal"
  if (n === "Peralatan") return "Lainnya"
  if (n === "Hilang") return "Hilang"
  return n
}

export function normalizeWalletName(w: string): string {
  if (!w) return "Cash"
  const lw = w.toLowerCase()
  if (lw.includes("shopee")) return "Shopeepay"
  if (lw.includes("krom")) return "Krom"
  if (lw.includes("blu")) return "Blu"
  if (lw.includes("super")) return "Superbank"
  if (lw.includes("sea")) return "Seabank"
  if (lw.includes("tap")) return "Tapcash"
  if (lw.includes("piutang")) return "Piutang"
  if (lw.includes("crypto")) return "Crypto"
  if (lw.includes("bni")) return "BNI"
  if (lw.includes("bca")) return "BCA"
  if (lw.includes("dana")) return "Dana"
  if (lw.includes("jago")) return "Jago"
  if (lw.includes("cash")) return "Cash"
  return w
}

export function useImportFamfina() {
  const qc = useQueryClient()
  const [progress, setProgress] = useState<{ current: number; total: number; stage: string }>({
    current: 0,
    total: famfinaData.length,
    stage: "idle"
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Silakan masuk terlebih dahulu untuk mengimpor data.")

      setProgress({ current: 0, total: famfinaData.length, stage: "Menyiapkan kategori & rekening..." })

      // 1. Ensure wallets exist
      const { data: existingWallets } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)

      let currentWallets = existingWallets || []
      const existingWalletNames = new Set(currentWallets.map(w => w.name.toLowerCase()))
      const missingWallets = DEFAULT_WALLETS.filter(w => !existingWalletNames.has(w.toLowerCase()))

      if (missingWallets.length > 0) {
        const { data: insertedWallets } = await supabase
          .from("wallets")
          .insert(missingWallets.map(name => ({ name, icon: "/icons/wallet.png", user_id: user.id })))
          .select()
        if (insertedWallets) currentWallets = [...currentWallets, ...insertedWallets]
      }

      // Wallet lookup map
      const walletMap = new Map<string, string>()
      currentWallets.forEach(w => {
        walletMap.set(w.name.toLowerCase(), w.id)
      })
      const defaultWalletId = currentWallets[0]?.id || null

      // 2. Ensure categories exist
      const { data: existingCats } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)

      let currentCats = existingCats || []
      const existingCatNames = new Set(currentCats.map(c => c.name.toLowerCase()))
      const missingCats = DEFAULT_CATEGORIES.filter(c => !existingCatNames.has(c.name.toLowerCase()))

      if (missingCats.length > 0) {
        const { data: insertedCats } = await supabase
          .from("categories")
          .insert(missingCats.map(c => ({ ...c, user_id: user.id })))
          .select()
        if (insertedCats) currentCats = [...currentCats, ...insertedCats]
      }

      // Category lookup map
      const catMap = new Map<string, string>()
      currentCats.forEach(c => {
        catMap.set(c.name.toLowerCase(), c.id)
      })
      const defaultCatId = currentCats.find(c => c.name === "Lainnya")?.id || currentCats[0]?.id || null

      // 3. Clean any existing transactions for fresh deterministic injection
      setProgress({ current: 0, total: famfinaData.length, stage: "Menyiapkan database transaksi..." })
      await supabase.from("transactions").delete().eq("user_id", user.id)

      // 4. Map transactions
      const toInsert: any[] = []
      const records = famfinaData as FamfinaRecord[]

      records.forEach(r => {

        const normalizedFrom = normalizeWalletName(r.fromWallet).toLowerCase()
        const fromWalletId = walletMap.get(normalizedFrom) || defaultWalletId

        let toWalletId: string | null = null
        if (r.toWallet) {
          const normalizedTo = normalizeWalletName(r.toWallet).toLowerCase()
          toWalletId = walletMap.get(normalizedTo) || defaultWalletId
        }

        let categoryId: string | null = null
        if (r.type !== "transfer") {
          const targetCat = mapCategoryName(r.categoryName).toLowerCase()
          categoryId = catMap.get(targetCat) || defaultCatId
        }

        toInsert.push({
          user_id: user.id,
          type: r.type,
          amount: r.amount,
          category_id: categoryId,
          wallet_id: fromWalletId,
          to_wallet_id: toWalletId,
          note: r.note,
          occurred_on: r.occurred_on,
          created_at: r.created_at
        })
      })

      if (toInsert.length === 0) {
        setProgress({ current: famfinaData.length, total: famfinaData.length, stage: "Semua data sudah terimpor sebelumnya." })
        return { importedCount: 0, alreadyExisted: true }
      }

      // 5. Batch Insert in chunks of 50
      const batchSize = 50
      let uploaded = 0
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize)
        const { error } = await supabase.from("transactions").insert(batch)
        if (error) {
          console.error("Batch insert error:", error)
          throw error
        }
        uploaded += batch.length
        setProgress({
          current: uploaded,
          total: toInsert.length,
          stage: `Mengimpor ${uploaded} dari ${toInsert.length} transaksi...`
        })
      }

      setProgress({ current: toInsert.length, total: toInsert.length, stage: "Migrasi selesai!" })
      return { importedCount: toInsert.length, alreadyExisted: false }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["categoryStats"] })
      qc.invalidateQueries({ queryKey: ["monthSummary"] })
      qc.invalidateQueries({ queryKey: ["wallets"] })
      qc.invalidateQueries({ queryKey: ["categories"] })
    }
  })

  return {
    ...mutation,
    progress,
    totalRecords: famfinaData.length
  }
}
