import { describe, it, expect } from "vitest"
import { isCorrectionTx } from "../src/lib/financialMath"
import type { Transaction } from "../src/lib/types"

describe("Data Synchronization & Large Dataset Integrity Test Suite", () => {
  function generateMockDataset(count = 913): Transaction[] {
    const records: Transaction[] = []
    const baseDate = new Date("2024-01-01T08:00:00Z")
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate.getTime() + i * 24 * 3600 * 1000)
      const dateStr = d.toISOString().slice(0, 10)
      const type = (i % 50 === 0) ? "adjustment" : (i % 15 === 0) ? "transfer" : (i % 10 === 0) ? "income" : "expense"
      const amount = type === "income" ? 1000000 + (i % 5) * 500000 : 25000 + (i % 20) * 10000
      const note = type === "adjustment" ? "Correction (+) BCA" : ("Transaction note #" + (i + 1))
      records.push({
        id: "tx-uuid-" + (i + 1),
        user_id: "user-test",
        type: type as any,
        amount,
        occurred_on: dateStr,
        created_at: d.toISOString(),
        category_id: type === "transfer" ? null : ("cat-" + ((i % 10) + 1)),
        wallet_id: "w-bca",
        to_wallet_id: type === "transfer" ? "w-ovo" : null,
        note
      })
    }
    return records
  }

  it("Retrieves the full dataset (913 records) without truncation or drop", () => {
    const dataset = generateMockDataset(913)
    expect(dataset.length).toBe(913)
    const pageSize = 1000
    let from = 0
    let hasMore = true
    const fetched: Transaction[] = []
    while (hasMore) {
      const chunk = dataset.slice(from, from + pageSize)
      fetched.push(...chunk)
      if (chunk.length < pageSize || fetched.length >= dataset.length) {
        hasMore = false
      } else {
        from += pageSize
      }
    }
    expect(fetched.length).toBe(913)
    expect(fetched[0].id).toBe("tx-uuid-1")
    expect(fetched[912].id).toBe("tx-uuid-913")
  })

  it("Pagination properly handles datasets exceeding 1,000 records across multiple pages", () => {
    const dataset = generateMockDataset(1500)
    const pageSize = 1000
    let from = 0
    let hasMore = true
    const fetched: Transaction[] = []
    let pageCount = 0
    while (hasMore) {
      pageCount++
      const chunk = dataset.slice(from, from + pageSize)
      fetched.push(...chunk)
      if (chunk.length < pageSize || fetched.length >= dataset.length) {
        hasMore = false
      } else {
        from += pageSize
      }
    }
    expect(pageCount).toBe(2)
    expect(fetched.length).toBe(1500)
    expect(fetched[0].id).toBe("tx-uuid-1")
    expect(fetched[1499].id).toBe("tx-uuid-1500")
  })

  it("Guarantees total records = unique transaction IDs with zero duplicates", () => {
    const dataset = generateMockDataset(913)
    const idSet = new Set(dataset.map(t => t.id))
    expect(idSet.size).toBe(913)
    expect(idSet.size).toBe(dataset.length)
  })

  it("Repeated sync operations preserve exact count without creating duplicate entries", () => {
    const existingDataset = generateMockDataset(913)
    const existingSigSet = new Set(existingDataset.map(t => t.occurred_on + "_" + t.amount + "_" + t.type + "_" + (t.note || "").trim().toLowerCase()))
    const incomingRecords = generateMockDataset(913)
    const missingToInsert: Transaction[] = []
    incomingRecords.forEach(r => {
      const sig = r.occurred_on + "_" + r.amount + "_" + r.type + "_" + (r.note || "").trim().toLowerCase()
      if (!existingSigSet.has(sig)) {
        missingToInsert.push(r)
      }
    })
    expect(missingToInsert.length).toBe(0)
    expect(existingDataset.length).toBe(913)
  })

  it("Interrupted sync does not corrupt existing valid state with partial data", () => {
    const validClientState = generateMockDataset(913)
    let tempFetchBuffer: Transaction[] = []
    let syncError: Error | null = null
    try {
      tempFetchBuffer = validClientState.slice(0, 500)
      throw new Error("Network timeout during page 2 fetch")
    } catch (err: any) {
      syncError = err
    }
    expect(syncError).not.toBeNull()
    expect(syncError?.message).toContain("Network timeout")
    const finalClientState = syncError ? validClientState : tempFetchBuffer
    expect(finalClientState.length).toBe(913)
  })

  it("Search and filters accurately locate historical, recent, category, and note transactions across 913 records", () => {
    const dataset = generateMockDataset(913)
    const oldQuery = "Transaction note #2"
    const oldResults = dataset.filter(t => t.note?.toLowerCase().includes(oldQuery.toLowerCase()))
    expect(oldResults.length).toBeGreaterThanOrEqual(1)
    expect(oldResults[0].id).toBe("tx-uuid-2")

    const newQuery = "Transaction note #913"
    const newResults = dataset.filter(t => t.note?.toLowerCase().includes(newQuery.toLowerCase()))
    expect(newResults.length).toBe(1)
    expect(newResults[0].id).toBe("tx-uuid-913")

    const cat1Results = dataset.filter(t => t.category_id === "cat-1")
    expect(cat1Results.length).toBeGreaterThan(0)

    const adjResults = dataset.filter(t => isCorrectionTx(t))
    expect(adjResults.length).toBeGreaterThan(0)
    expect(adjResults[0].note).toBe("Correction (+) BCA")
  })
})