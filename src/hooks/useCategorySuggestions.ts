import { useMemo } from "react"
import type { Category, Transaction, TransactionType } from "../lib/types"

interface CategorySuggestionsOptions {
  categories: Category[]
  transactions: Transaction[]
  type: TransactionType
  selectedWalletId?: string | null
}

/**
 * Lightweight deterministic ranking system:
 * 1. Recency: Recently used categories in recent transactions
 * 2. Frequency: Frequently used categories for the current transaction type
 * 3. Contextual: Categories frequently recorded with the selected wallet/account (e.g. BCA -> Cafe)
 * 4. Default: Original category ordering
 */
export function useCategorySuggestions({
  categories,
  transactions,
  type,
  selectedWalletId
}: CategorySuggestionsOptions): Category[] {
  return useMemo(() => {
    if (!categories || categories.length === 0) return []
    if (!transactions || transactions.length === 0) return categories

    // Filter transactions matching the current type
    const typedTransactions = transactions.filter(t => t.type === type)
    if (typedTransactions.length === 0) return categories

    // 1. Calculate Recency & Frequency & Contextual weights
    const scores = new Map<string, number>()

    // Initialize all with 0
    categories.forEach(c => scores.set(c.id, 0))

    // Recency (inspect last 30 transactions)
    const recentSample = typedTransactions.slice(0, 30)
    recentSample.forEach((t, index) => {
      if (t.category_id && scores.has(t.category_id)) {
        const current = scores.get(t.category_id) || 0
        // Exponential/linear recency decay
        scores.set(t.category_id, current + (30 - index) * 3)
      }
    })

    // Frequency across all typed transactions
    typedTransactions.forEach(t => {
      if (t.category_id && scores.has(t.category_id)) {
        const current = scores.get(t.category_id) || 0
        scores.set(t.category_id, current + 2)
      }
    })

    // Contextual: Boost if used with currently selected wallet
    if (selectedWalletId) {
      typedTransactions.forEach(t => {
        if (t.wallet_id === selectedWalletId && t.category_id && scores.has(t.category_id)) {
          const current = scores.get(t.category_id) || 0
          scores.set(t.category_id, current + 6)
        }
      })
    }

    // Sort categories based on calculated score descending
    const sorted = [...categories].sort((a, b) => {
      const scoreA = scores.get(a.id) || 0
      const scoreB = scores.get(b.id) || 0
      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }
      return a.name.localeCompare(b.name)
    })

    return sorted
  }, [categories, transactions, type, selectedWalletId])
}
