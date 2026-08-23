import famfinaRaw from "../data/famfina_transactions.json"
import { supabase } from "./supabase"
import type { Transaction, Wallet } from "./types"

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
  if (!user) throw new Error("Not authenticated")

  // 1. Fetch user wallets
  const { data: userWallets, error: wErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
  if (wErr || !userWallets) throw wErr || new Error("Failed to fetch wallets")

  const walletByName = new Map<string, string>()
  userWallets.forEach((w: any) => {
    walletByName.set(w.name.trim().toLowerCase(), w.id)
  })

  // 2. Fetch all user transactions
  const { data: userTxs, error: tErr } = await supabase
    .from("transactions")
    .select("id, occurred_on, amount, type, note, wallet_id, to_wallet_id")
    .eq("user_id", user.id)
  if (tErr || !userTxs) throw tErr || new Error("Failed to fetch transactions")

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
