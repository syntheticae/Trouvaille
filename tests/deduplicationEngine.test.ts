import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  autoDeduplicateCategories,
  autoDeduplicateWallets,
} from "../src/lib/deduplicationEngine";
import type { Category, Wallet, Transaction } from "../src/lib/types";

// Mock supabase
vi.mock("../src/lib/supabase", () => {
  const mockFrom = vi.fn((table: string) => {
    return {
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
    };
  });
  return { supabase: { from: mockFrom } };
});

describe("Deduplication Engine Suite", () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
    };
    (globalThis as any).localStorage = mockStorage;
  });

  describe("autoDeduplicateCategories", () => {
    it("detects and consolidates duplicate categories with same name and type", async () => {
      const mockCategories: Category[] = [
        {
          id: "cat-1",
          user_id: "user-1",
          name: "Food & Dining",
          emoji: "Utensils",
          type: "expense",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "cat-2",
          user_id: "user-1",
          name: "Food & Dining ",
          emoji: "Utensils",
          type: "expense",
          created_at: "2026-02-01T00:00:00Z",
        },
        {
          id: "cat-3",
          user_id: "user-1",
          name: "Transportation",
          emoji: "Car",
          type: "expense",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];

      // Transactions point to both cat-1 and cat-2
      const mockTxs: Transaction[] = [
        {
          id: "tx-1",
          user_id: "user-1",
          amount: 50000,
          category_id: "cat-1",
          wallet_id: "w-1",
          to_wallet_id: null,
          type: "expense",
          occurred_on: "2026-02-01",
          created_at: "2026-02-01T10:00:00Z",
        },
        {
          id: "tx-2",
          user_id: "user-1",
          amount: 75000,
          category_id: "cat-2",
          wallet_id: "w-1",
          to_wallet_id: null,
          type: "expense",
          occurred_on: "2026-02-02",
          created_at: "2026-02-02T10:00:00Z",
        },
      ];

      const res = await autoDeduplicateCategories("user-1", mockCategories, mockTxs);

      expect(res.mergedCount).toBe(1);
      expect(res.duplicateCount).toBe(1);
      expect(res.details[0]).toContain('Food & Dining');
    });

    it("does nothing when all categories are unique", async () => {
      const mockCategories: Category[] = [
        {
          id: "cat-1",
          user_id: "user-1",
          name: "Food & Dining",
          emoji: "Utensils",
          type: "expense",
        },
        {
          id: "cat-2",
          user_id: "user-1",
          name: "Transportation",
          emoji: "Car",
          type: "expense",
        },
      ];

      const res = await autoDeduplicateCategories("user-1", mockCategories, []);
      expect(res.mergedCount).toBe(0);
      expect(res.duplicateCount).toBe(0);
    });

    it("detects and consolidates cross-lingual default categories (e.g. Makanan & Minuman and Food & Dining)", async () => {
      const mockCategories: Category[] = [
        {
          id: "cat-indo",
          user_id: "user-1",
          name: "Makanan & Minuman",
          emoji: "Utensils",
          type: "expense",
          is_default: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "cat-en",
          user_id: "user-1",
          name: "Food & Dining",
          emoji: "Utensils",
          type: "expense",
          is_default: true,
          created_at: "2026-03-01T00:00:00Z",
        },
      ];

      const mockTxs: Transaction[] = [
        {
          id: "tx-1",
          user_id: "user-1",
          amount: 50000,
          category_id: "cat-indo",
          wallet_id: "w-1",
          to_wallet_id: null,
          type: "expense",
          occurred_on: "2026-02-01",
          created_at: "2026-02-01T10:00:00Z",
        },
      ];

      const res = await autoDeduplicateCategories("user-1", mockCategories, mockTxs);

      expect(res.mergedCount).toBe(1);
      expect(res.duplicateCount).toBe(1);
      expect(res.details[0]).toContain('Merged 1 duplicate(s) of "Makanan & Minuman"');
    });
  });

  describe("autoDeduplicateWallets", () => {
    it("detects and consolidates duplicate wallets with same name", async () => {
      const mockWallets: Wallet[] = [
        {
          id: "w-1",
          user_id: "user-1",
          name: "BCA",
          icon: "Landmark",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "w-2",
          user_id: "user-1",
          name: "BCA ",
          icon: "Landmark",
          created_at: "2026-02-01T00:00:00Z",
        },
      ];

      const res = await autoDeduplicateWallets("user-1", mockWallets, []);
      expect(res.mergedCount).toBe(1);
      expect(res.duplicateCount).toBe(1);
      expect(res.details[0]).toContain('wallet "BCA"');
    });
  });
});
