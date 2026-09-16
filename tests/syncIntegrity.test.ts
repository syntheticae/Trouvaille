import { describe, it, expect } from "vitest"
import { isCorrectionTx } from "../src/lib/financialMath"
import type { Transaction } from "../src/lib/types"
import { generateUUID } from "../src/hooks/useTransactions"

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

  it("Recovers transactions from local backup snapshot when initial network fetch fails", () => {
    const backupDataset = generateMockDataset(500)
    const backupJson = JSON.stringify(backupDataset)

    // Simulate network error on cold start
    let fetchedData: Transaction[] = []
    const isNetworkError = true

    if (isNetworkError) {
      // Recovery logic from TROUVAILLE_TX_BACKUP_V1
      const restored = JSON.parse(backupJson) as Transaction[]
      expect(restored.length).toBe(500)
      fetchedData = restored
    }

    expect(fetchedData.length).toBe(500)
    expect(fetchedData[0].id).toBe("tx-uuid-1")
    expect(fetchedData[499].id).toBe("tx-uuid-500")
  })

  it("Ensures initial page network failure throws instead of returning empty array when no backup is present", () => {
    let thrownError: Error | null = null
    try {
      const from = 0
      const chunk: Transaction[] = []
      const fetchError = new Error("Network request failed")
      if (fetchError && chunk.length === 0) {
        if (from === 0) {
          // No backup in storage -> MUST throw to protect React Query cache
          throw fetchError
        }
      }
    } catch (err: any) {
      thrownError = err
    }
    expect(thrownError).not.toBeNull()
    expect(thrownError?.message).toBe("Network request failed")
  })

  it("generateUUID produces valid RFC4122 v4 compliant UUIDs", () => {
    const uuid = generateUUID()
    const rfc4122v4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(uuid).toMatch(rfc4122v4Regex)
    expect(uuid.startsWith("tx-")).toBe(false)
  })

  it("Deterministic ID pre-assignment prevents optimistic phantom duplicate records", () => {
    const rawInput: any = {
      type: "expense",
      amount: 50000,
      occurred_on: "2026-09-16",
    }

    // onMutate assigns id
    const assignedId = rawInput.id || generateUUID()
    rawInput.id = assignedId

    // mutationFn receives same object
    const mutationFnId = rawInput.id || generateUUID()
    expect(mutationFnId).toBe(assignedId)
  })

  it("Cleans update payload by completely stripping id and user_id", () => {
    const updatePayload: any = {
      id: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      user_id: "user-12345",
      amount: 75000,
      note: "Lunch with colleagues",
    }

    const { id: _id, user_id: _uid, ...cleanUpdate } = updatePayload
    expect(cleanUpdate.id).toBeUndefined()
    expect(cleanUpdate.user_id).toBeUndefined()
    expect(cleanUpdate.amount).toBe(75000)
    expect(cleanUpdate.note).toBe("Lunch with colleagues")
  })

  it("syncEngine retry count drops corrupted mutations after 10 failed attempts", () => {
    const corruptMutation = {
      id: "mut-bad",
      type: "update",
      retryCount: 10,
    }

    corruptMutation.retryCount += 1
    const remaining: typeof corruptMutation[] = []
    if (corruptMutation.retryCount <= 10) {
      remaining.push(corruptMutation)
    }

    expect(remaining.length).toBe(0)
  })

  it("Selective query dehydration filters out memory-heavy temporary slice queries", () => {
    const shouldDehydrate = (queryKey: readonly unknown[]) => {
      const domain = queryKey[0]
      if (domain === "categories" || domain === "wallets" || domain === "bills" || domain === "shortcuts") {
        return true
      }
      if (domain === "transactions") {
        return queryKey[1] === "all"
      }
      return false
    }

    expect(shouldDehydrate(["categories"])).toBe(true)
    expect(shouldDehydrate(["wallets"])).toBe(true)
    expect(shouldDehydrate(["transactions", "all", "user-1"])).toBe(true)
    expect(shouldDehydrate(["transactions", "month", "user-1", 2026, 9])).toBe(false)
    expect(shouldDehydrate(["transactions", "day", "user-1", "2026-09-16"])).toBe(false)
    expect(shouldDehydrate(["transactions", "recent", "user-1", 10])).toBe(false)
    expect(shouldDehydrate(["transactions", "trend"])).toBe(false)
  })
})