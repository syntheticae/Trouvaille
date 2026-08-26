import { useMemo } from "react"
import type { Category, Transaction, TransactionType } from "../lib/types"

interface CategorySuggestionsOptions {
  categories: Category[]
  transactions: Transaction[]
  type: TransactionType
  selectedWalletId?: string | null
}

export function useCategorySuggestions({
  categories,
  transactions,
  type,
  selectedWalletId
}: CategorySuggestionsOptions): Category[] {
  return useMemo(() => {
    if (!categories || categories.length === 0) return []
    if (!transactions || transactions.length === 0) return categories

    const typedTransactions = transactions.filter(t => t.type === type)
    if (typedTransactions.length === 0) return categories

    const scores = new Map<string, number>()
    const nameToCat = new Map<string, Category>()

    categories.forEach(c => {
      scores.set(c.id, 0)
      nameToCat.set(c.name.toLowerCase(), c)
    })

    const getMatchedCatId = (t: Transaction): string | null => {
      if (t.category_id && scores.has(t.category_id)) return t.category_id
      if (t.categories?.id && scores.has(t.categories.id)) return t.categories.id
      if (t.categories?.name) {
        const found = nameToCat.get(t.categories.name.toLowerCase())
        if (found) return found.id
      }
      return null
    }

    const nowMs = Date.now()

    // Deterministic Exponential Time Decay Scoring:
    // S = 25 * exp(-days / 14) + (days <= 60 ? 2 : 0.1) + Contextual Boost
    typedTransactions.forEach(t => {
      const catId = getMatchedCatId(t)
      if (!catId || !scores.has(catId)) return

      const txMs = t.occurred_on ? new Date(t.occurred_on + "T12:00:00").getTime() : nowMs
      const daysDiff = Math.max(0, Math.floor((nowMs - txMs) / (1000 * 60 * 60 * 24)))

      // 1. Exponential Recency (14-day half-life decay)
      const recencyScore = 25 * Math.exp(-daysDiff / 14)

      // 2. Frequency weight (recent 60 days carries strong weight; legacy >60 days decays)
      const freqScore = daysDiff <= 60 ? 2 : 0.1

      // 3. Contextual boost with selected wallet
      const contextScore = (selectedWalletId && t.wallet_id === selectedWalletId)
        ? (8 * Math.exp(-daysDiff / 14))
        : 0

      const current = scores.get(catId) || 0
      scores.set(catId, current + recencyScore + freqScore + contextScore)
    })

    // Sort categories based on calculated score descending.
    // If scores are equal (e.g. cold start with 0 history), maintain original category order.
    return [...categories].sort((a, b) => {
      const scoreA = scores.get(a.id) || 0
      const scoreB = scores.get(b.id) || 0
      if (Math.abs(scoreB - scoreA) > 0.01) {
        return scoreB - scoreA
      }
      return 0
    })
  }, [categories, transactions, type, selectedWalletId])
}
