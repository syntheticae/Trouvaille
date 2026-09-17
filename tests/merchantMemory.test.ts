import { describe, it, expect } from "vitest";
import {
  extractMerchantKeywords,
  buildMerchantMemoryIndex,
  predictMerchantProfile,
} from "../src/hooks/useMerchantMemory";
import type { Transaction } from "../src/lib/types";

describe("Merchant Memory & Spending Profile Predictor", () => {
  it("extracts clean merchant keywords without stop words", () => {
    const keywords = extractMerchantKeywords("Beli kopi di Fore Coffee pake BCA");
    expect(keywords).toContain("kopi");
    expect(keywords).toContain("fore");
    expect(keywords).toContain("coffee");
    expect(keywords).toContain("bca");
    expect(keywords).not.toContain("di");
    expect(keywords).not.toContain("beli");
    expect(keywords).not.toContain("pake");
  });

  it("accurately predicts Category and Wallet based on past transactions", () => {
    const mockTxs: Transaction[] = [
      {
        id: "tx-1",
        user_id: "u1",
        amount: 35000,
        type: "expense",
        category_id: "cat-kopi",
        wallet_id: "w-gopay",
        note: "Fore Coffee Grand Indonesia",
        occurred_on: "2026-09-10",
        created_at: "2026-09-10T10:00:00Z",
      },
      {
        id: "tx-2",
        user_id: "u1",
        amount: 40000,
        type: "expense",
        category_id: "cat-kopi",
        wallet_id: "w-gopay",
        note: "Fore Signature Latte",
        occurred_on: "2026-09-12",
        created_at: "2026-09-12T10:00:00Z",
      },
      {
        id: "tx-3",
        user_id: "u1",
        amount: 250000,
        type: "expense",
        category_id: "cat-groceries",
        wallet_id: "w-bca",
        note: "Indomaret Point",
        occurred_on: "2026-09-14",
        created_at: "2026-09-14T10:00:00Z",
      },
    ];

    const index = buildMerchantMemoryIndex(mockTxs);
    const prediction = predictMerchantProfile("Fore Senopati", index);

    expect(prediction).not.toBeNull();
    expect(prediction?.categoryId).toBe("cat-kopi");
    expect(prediction?.walletId).toBe("w-gopay");
    expect(prediction?.confidence).toBeGreaterThan(0.4);
  });

  it("returns null for unfamiliar merchants with no transaction history", () => {
    const index = buildMerchantMemoryIndex([]);
    const prediction = predictMerchantProfile("Toko Unik Yang Belum Pernah Dikunjungi", index);
    expect(prediction).toBeNull();
  });
});
