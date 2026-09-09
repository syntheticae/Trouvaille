import { useMemo } from "react"
import type { Wallet, Transaction, TransactionType } from "../lib/types"

interface WalletSuggestionsOptions {
  wallets: Wallet[]
  transactions: Transaction[]
  type: TransactionType
  selectedCategoryId?: string | null
  target?: "from" | "to"
}

export function useWalletSuggestions({
  wallets,
  transactions,
  type,
  selectedCategoryId,
  target = "from"
}: WalletSuggestionsOptions): Wallet[] {
  return useMemo(() => {
    if (!wallets || wallets.length === 0) return []
    if (!transactions || transactions.length === 0) return wallets

    const scores = new Map<string, number>()
    const idToWallet = new Map<string, Wallet>()
    const nameToWallet = new Map<string, Wallet>()

    wallets.forEach(w => {
      scores.set(w.id, 0)
      idToWallet.set(w.id, w)
      nameToWallet.set(w.name.toLowerCase(), w)
    })

    const relevantTxs = transactions.filter(t => {
      if (type === "transfer") return t.type === "transfer"
      return t.type === type
    })

    const nowMs = Date.now()

    // Deterministic Exponential Time Decay Scoring for Accounts
    relevantTxs.forEach(t => {
      let matchedWalletId: string | null = null

      if (target === "to" && t.type === "transfer") {
        matchedWalletId = t.to_wallet_id
      } else {
        matchedWalletId = t.wallet_id
      }

      if (!matchedWalletId && t.note) {
        const noteLower = t.note.toLowerCase()
        const match = wallets.find(w => noteLower.includes(w.name.toLowerCase()))
        if (match) matchedWalletId = match.id
      }

      if (!matchedWalletId || !scores.has(matchedWalletId)) return

      const txMs = t.occurred_on ? new Date(t.occurred_on + "T12:00:00").getTime() : nowMs
      const daysDiff = Math.max(0, Math.floor((nowMs - txMs) / (1000 * 60 * 60 * 24)))

      // 1. Exponential Recency (14-day half-life decay)
      const recencyScore = 25 * Math.exp(-daysDiff / 14)

      // 2. Frequency weight (recent 60 days carries strong weight; legacy >60 days decays)
      const freqScore = daysDiff <= 60 ? 2 : 0.1

      // 3. Contextual boost with selected category
      const contextScore = (selectedCategoryId && t.category_id === selectedCategoryId)
        ? (8 * Math.exp(-daysDiff / 14))
        : 0

      const current = scores.get(matchedWalletId) || 0
      scores.set(matchedWalletId, current + recencyScore + freqScore + contextScore)
    })

    // Sort wallets by calculated score descending.
    // If scores are equal (cold start), maintain original wallet array order.
    return [...wallets].sort((a, b) => {
      const scoreA = scores.get(a.id) || 0
      const scoreB = scores.get(b.id) || 0
      if (Math.abs(scoreB - scoreA) > 0.01) {
        return scoreB - scoreA
      }
      return 0
    })
  }, [wallets, transactions, type, selectedCategoryId, target])
}
