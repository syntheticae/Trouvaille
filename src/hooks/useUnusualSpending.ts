import { useMemo } from "react"
import { subDays, format } from "date-fns"
import type { Transaction } from "../lib/types"

export interface UnusualInsight {
  isUnusual: boolean
  median: number
  categoryName: string
  ratio: number
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function useUnusualSpending(transactions: Transaction[]) {
  // Pre-calculate 60-day historical medians per category in a single O(N) pass
  const categoryMedians = useMemo(() => {
    const now = new Date()
    const cutoffDate = format(subDays(now, 60), "yyyy-MM-dd")
    const amountsPerCategory = new Map<string, number[]>()

    transactions.forEach(t => {
      if (t.type !== "expense" || !t.occurred_on || t.occurred_on < cutoffDate) return

      const isCorrection = t.note?.toLowerCase().includes("correction") || t.note?.toLowerCase().includes("koreksi saldo") || t.note?.toLowerCase().includes("balance adjustment")
      if (isCorrection) return

      const catName = t.categories?.name || "Lainnya"
      const amt = Number(t.amount || 0)
      if (amt <= 0) return

      const list = amountsPerCategory.get(catName)
      if (list) list.push(amt)
      else amountsPerCategory.set(catName, [amt])
    })

    const mediansMap = new Map<string, number>()
    amountsPerCategory.forEach((amounts, catName) => {
      // Need at least 3 historical transactions to establish a reliable baseline
      if (amounts.length >= 3) {
        mediansMap.set(catName, calculateMedian(amounts))
      }
    })

    return mediansMap
  }, [transactions])

  const checkUnusual = useMemo(() => {
    return (tx: Transaction): UnusualInsight => {
      if (tx.type !== "expense") {
        return { isUnusual: false, median: 0, categoryName: "", ratio: 1 }
      }

      const catName = tx.categories?.name || "Lainnya"
      const median = categoryMedians.get(catName)
      const amt = Number(tx.amount || 0)

      if (!median || median <= 0) {
        return { isUnusual: false, median: 0, categoryName: catName, ratio: 1 }
      }

      // Flag as unusual if amount >= 2.5x historical median and >= Rp 50.000 minimum ticket
      const ratio = amt / median
      const isUnusual = amt >= 50000 && ratio >= 2.5

      return {
        isUnusual,
        median,
        categoryName: catName,
        ratio
      }
    }
  }, [categoryMedians])

  return { categoryMedians, checkUnusual }
}
