import famfinaRaw from "../data/famfina_transactions.json"
import { supabase } from "./supabase"
import type { Transaction, Wallet } from "./types"
import { fetchAllTransactionsFromSupabase } from "../hooks/useTransactions"
import { DEFAULT_CATEGORIES } from "../hooks/useCategories"
import { DEFAULT_WALLETS, getWalletIcon } from "../hooks/useWallets"

interface FamfinaRecord {
  file: string
  occurred_on: string
  created_at: string
  type: string
  amount: number
  fromWallet: string
  toWallet: string | null
  categoryName: string
  note: string | null
}

const records: FamfinaRecord[] = famfinaRaw as FamfinaRecord[]

// Multi-tier signature indexing for 100% accurate matching
const fullMap = new Map<string, FamfinaRecord[]>()
const basicMap = new Map<string, FamfinaRecord[]>()

records.forEach(r => {
  const noteClean = (r.note || "").trim().toLowerCase()
  const fullKey = `${r.occurred_on}_${r.amount}_${r.type}_${noteClean}`
  const basicKey = `${r.occurred_on}_${r.amount}_${r.type}`

  const fList = fullMap.get(fullKey) || []
  fList.push(r)
  fullMap.set(fullKey, fList)

  const bList = basicMap.get(basicKey) || []
  bList.push(r)
  basicMap.set(basicKey, bList)
})

export function getFamfinaMatch(tx: { occurred_on: string; amount: number; type: string; note?: string | null }) {
  const noteClean = (tx.note || "").trim().toLowerCase()
  const fullKey = `${tx.occurred_on}_${tx.amount}_${tx.type}_${noteClean}`
  const fList = fullMap.get(fullKey)
  if (fList && fList.length > 0) {
    return fList[0]
  }

  const basicKey = `${tx.occurred_on}_${tx.amount}_${tx.type}`
  const bList = basicMap.get(basicKey)
  if (bList && bList.length > 0) {
    return bList[0]
  }

  return null
}

export function resolveFamfinaWallet(tx: Transaction, wallets: Wallet[]): { from: string; to: string } {
  let fromName: string | undefined
  let toName: string | undefined

  if (tx.wallet_id) {
    const found = wallets.find(w => w.id === tx.wallet_id)
    if (found) fromName = found.name
  }
  if (tx.to_wallet_id) {
    const found = wallets.find(w => w.id === tx.to_wallet_id)
    if (found) toName = found.name
  }

  if (!fromName || (tx.type === "transfer" && !toName)) {
    const match = getFamfinaMatch(tx)
    if (match) {
      if (!fromName && match.fromWallet) fromName = match.fromWallet
      if (!toName && match.toWallet) toName = match.toWallet
    }
  }

  return {
    from: fromName || "Cash",
    to: toName || "BNI"
  }
}

export async function syncAllTransactionsWithFamfina(
  onProgress?: (current: number, total: number) => void
): Promise<{ updated: number; total: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error("Not authenticated. Please log in first.")

  // 1. Fetch or Auto-Seed user wallets in Supabase
  let { data: userWallets } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)

  const DEFAULT_WALLETS = [
    "Cash", "BNI", "BCA", "Crypto", "Dana", "Shopeepay", "Gopay", "Jago", "BLU", "Krom",
    "Liabilities", "Piutang", "Saham", "Seabank", "Superbank", "Tapcash"
  ]

  if (!userWallets || userWallets.length === 0) {
    console.log("Wallets empty in Supabase, auto-seeding default wallets...")
    const { data: seeded, error: seedErr } = await supabase
      .from("wallets")
      .insert(
        DEFAULT_WALLETS.map(name => ({
          name,
          icon: `/icons/Budgets/${name}.png`,
          user_id: user.id
        }))
      )
      .select()

    if (seedErr) {
      console.error("Auto-seed error:", seedErr)
      throw new Error("Gagal membuat data akun di Supabase: " + seedErr.message)
    }
    userWallets = seeded || []
  }

  const walletByName = new Map<string, string>()
  userWallets.forEach((w: any) => {
    walletByName.set(w.name.trim().toLowerCase(), w.id)
  })

  // 2. Fetch all user transactions via paginated engine
  const userTxs = await fetchAllTransactionsFromSupabase({ userId: user.id })

  let updatedCount = 0
  const updates: Array<{ id: string; wallet_id: string | null; to_wallet_id: string | null }> = []

  userTxs.forEach((tx: any) => {
    const match = getFamfinaMatch(tx)
    if (match) {
      const fromWalletId = match.fromWallet ? walletByName.get(match.fromWallet.toLowerCase()) : null
      const toWalletId = match.toWallet ? walletByName.get(match.toWallet.toLowerCase()) : null

      if (fromWalletId || toWalletId) {
        updates.push({
          id: tx.id,
          wallet_id: fromWalletId || tx.wallet_id,
          to_wallet_id: toWalletId || tx.to_wallet_id
        })
      }
    }
  })

  // Process in batches of 50
  const batchSize = 50
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    await Promise.all(
      batch.map(u =>
        supabase.from("transactions").update({
          wallet_id: u.wallet_id,
          to_wallet_id: u.to_wallet_id
        }).eq("id", u.id)
      )
    )
    updatedCount += batch.length
    if (onProgress) onProgress(updatedCount, updates.length)
  }

  return { updated: updatedCount, total: userTxs.length }
}

export const FAMFINA_CAT_MAP: Record<string, string | null> = {
  "koreksi saldo": null,
  "biaya admin": "Admin & Fee",
  "admin & fee": "Admin & Fee",
  "makanan": "Makanan",
  "perawatan": "Perawatan",
  "cafe": "Cafe",
  "pindah saldo": null, // transfer
  "bbm": "Bensin",
  "bensin": "Bensin",
  "internet": "Internet",
  "hilang": "Kerugian",
  "kerugian": "Kerugian",
  "laundry": "Laundry",
  "parkir": "Parkir",
  "tagihan": "Hunian",
  "kendaraan": "Kendaraan",
  "trading": "Trading",
  "fashion": "Fashion",
  "gaji": "Gaji",
  "peralatan": "Peralatan",
  "langganan": "Subscription",
  "subscription": "Subscription",
  "minuman": "Minuman",
  "bunga": "Bunga",
  "lain-lain": "Lainnya",
  "lainnya": "Lainnya",
  "groceries": "Groceries",
  "hadiah": "Hadiah",
  "pajak/legal": "Pajak & Legal",
  "pajak & legal": "Pajak & Legal",
  "donasi": "Donasi",
  "sampingan": "Side Job",
  "side job": "Side Job",
  "kopi": "Kopi",
  "kesehatan": "Kesehatan",
  "gadget": "Gadget",
  "pendidikan": "Pendidikan",
  "hiburan": "Hiburan",
  "bonus": "Bonus",
  "transportasi": "Transportasi"
}

export async function forceReinjectAllFamfinaTransactions(): Promise<{ inserted: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error("Not authenticated. Please log in first.")

  // 1. Fetch user categories (auto-seed if missing)
  let { data: userCats } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("user_id", user.id)

  if (!userCats || userCats.length === 0) {
    console.log("Auto-seeding default categories for user:", user.id)
    const { data: seededCats } = await supabase
      .from("categories")
      .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id })))
      .select("id, name, type")
    userCats = seededCats || []
  }

  const catMap = new Map<string, string>()
  ;(userCats || []).forEach(c => {
    catMap.set(c.name.trim().toLowerCase(), c.id)
  })

  // 2. Fetch user wallets (auto-seed if missing)
  let { data: userWallets } = await supabase
    .from("wallets")
    .select("id, name")
    .eq("user_id", user.id)

  if (!userWallets || userWallets.length === 0) {
    console.log("Auto-seeding default wallets for user:", user.id)
    const { data: seededWallets } = await supabase
      .from("wallets")
      .insert(DEFAULT_WALLETS.map(name => ({ name, icon: getWalletIcon(name), user_id: user.id })))
      .select("id, name")
    userWallets = seededWallets || []
  }

  const walletMap = new Map<string, string>()
  ;(userWallets || []).forEach(w => {
    walletMap.set(w.name.trim().toLowerCase(), w.id)
  })

  const cashWalletId = walletMap.get("cash") || userWallets?.[0]?.id || null
  const defaultCatId = catMap.get("lainnya") || catMap.get("makanan") || userCats?.[0]?.id || null

  // 3. Clean wipe existing transactions for this user
  console.log("Wiping existing transactions for user:", user.id)
  const { error: delErr } = await supabase.from("transactions").delete().eq("user_id", user.id)
  if (delErr) console.warn("Delete error (continuing):", delErr)

  // 4. Map all records
  const recordsToInsert = records.map(r => {
    const fromWName = (r.fromWallet || "").trim().toLowerCase()
    const toWName = (r.toWallet || "").trim().toLowerCase()
    const catNameKey = (r.categoryName || "").trim().toLowerCase()
    const mappedCatName = FAMFINA_CAT_MAP[catNameKey]

    let categoryId: string | null = null
    if (r.type !== "transfer") {
      categoryId = (mappedCatName ? catMap.get(mappedCatName.toLowerCase()) : null) || catMap.get(catNameKey) || defaultCatId
    }

    const walletId = walletMap.get(fromWName) || cashWalletId
    const toWalletId = r.type === "transfer" ? (walletMap.get(toWName) || cashWalletId) : null

    return {
      user_id: user.id,
      type: r.type,
      amount: Number(r.amount),
      occurred_on: r.occurred_on,
      created_at: r.created_at || `${r.occurred_on}T12:00:00Z`,
      note: r.note || null,
      wallet_id: walletId,
      to_wallet_id: toWalletId,
      category_id: categoryId,
    }
  })

  // 5. Batch insert in chunks of 100
  const batchSize = 100
  let totalInserted = 0

  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const chunk = recordsToInsert.slice(i, i + batchSize)
    const { error: insErr } = await supabase.from("transactions").insert(chunk)
    if (insErr) {
      console.error("Batch insert error at index", i, insErr)
      throw insErr
    }
    totalInserted += chunk.length
  }

  console.log(`Successfully re-injected ${totalInserted} Famfina transactions!`)
  return { inserted: totalInserted }
}
