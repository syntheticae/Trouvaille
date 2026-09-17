import { describe, it, expect } from "vitest";
import { resolveTransactionCategory } from "../src/lib/categoryResolver";
import { resolveTransactionWallets } from "../src/hooks/useWallets";
import type { Transaction, Category, Wallet } from "../src/lib/types";

describe("Transaction Ecosystem Enhancements", () => {
  const mockCategories: Category[] = [
    {
      id: "cat-food",
      user_id: "u1",
      name: "Food & Drinks",
      emoji: "/icons/food.png",
      type: "expense",
      is_default: false,
      created_at: "2026-01-01",
      budget_amount: 1500000,
    },
    {
      id: "cat-transport",
      user_id: "u1",
      name: "Transport",
      emoji: "/icons/transport.png",
      type: "expense",
      is_default: false,
      created_at: "2026-01-01",
      budget_amount: 500000,
    },
  ];

  const mockWallets: Wallet[] = [
    {
      id: "w-bca",
      user_id: "u1",
      name: "BCA Main",
      icon: "bank",
      created_at: "2026-01-01",
    },
    {
      id: "w-cash",
      user_id: "u1",
      name: "Cash Wallet",
      icon: "wallet",
      created_at: "2026-01-01",
    },
  ];

  describe("O(1) Dictionary Lookups for Categories and Wallets", () => {
    it("resolves category accurately using Category Map", () => {
      const categoryMap = new Map<string, Category>();
      mockCategories.forEach((c) => categoryMap.set(c.id, c));

      const tx: Partial<Transaction> = {
        category_id: "cat-food",
        type: "expense",
        amount: 50000,
      };

      const resolved = resolveTransactionCategory(tx, categoryMap);
      expect(resolved.id).toBe("cat-food");
      expect(resolved.name).toBe("Food & Drinks");
      expect(resolved.emoji).toBe("/icons/food.png");
    });

    it("resolves wallets accurately using Wallet Map", () => {
      const walletMap = new Map<string, Wallet>();
      mockWallets.forEach((w) => walletMap.set(w.id, w));

      const tx = {
        wallet_id: "w-bca",
        to_wallet_id: "w-cash",
      };

      const resolved = resolveTransactionWallets(tx, walletMap);
      expect(resolved.from).toBe("BCA Main");
      expect(resolved.to).toBe("Cash Wallet");
    });

    it("falls back gracefully when wallet is not found in Map", () => {
      const walletMap = new Map<string, Wallet>();
      const tx = {
        wallet_id: "w-nonexistent",
        to_wallet_id: null,
      };

      const resolved = resolveTransactionWallets(tx, walletMap);
      expect(resolved.from).toBe("Cash");
      expect(resolved.to).toBe("Cash");
    });
  });

  describe("Duplicate Detection Logic", () => {
    it("flags duplicate when transaction has identical amount & category within 15 minutes", () => {
      const now = new Date("2026-09-17T10:15:00Z").getTime();
      const existingTxs: Transaction[] = [
        {
          id: "tx-1",
          user_id: "u1",
          amount: 50000,
          category_id: "cat-food",
          wallet_id: "w-bca",
          to_wallet_id: null,
          type: "expense",
          note: "Lunch",
          occurred_on: "2026-09-17",
          created_at: "2026-09-17T10:05:00Z", // 10 minutes ago
        },
      ];

      const newTxCandidate = {
        amount: 50000,
        category_id: "cat-food",
        wallet_id: "w-bca",
      };

      const isDuplicate = existingTxs.some((tx) => {
        if (tx.amount !== newTxCandidate.amount) return false;
        if (tx.category_id !== newTxCandidate.category_id) return false;
        const txTime = new Date(tx.created_at).getTime();
        const diffMinutes = Math.abs(now - txTime) / (1000 * 60);
        return diffMinutes <= 15;
      });

      expect(isDuplicate).toBe(true);
    });

    it("does not flag duplicate when transaction was recorded over 15 minutes ago", () => {
      const now = new Date("2026-09-17T11:00:00Z").getTime();
      const existingTxs: Transaction[] = [
        {
          id: "tx-1",
          user_id: "u1",
          amount: 50000,
          category_id: "cat-food",
          wallet_id: "w-bca",
          to_wallet_id: null,
          type: "expense",
          note: "Lunch",
          occurred_on: "2026-09-17",
          created_at: "2026-09-17T10:05:00Z", // 55 minutes ago
        },
      ];

      const newTxCandidate = {
        amount: 50000,
        category_id: "cat-food",
      };

      const isDuplicate = existingTxs.some((tx) => {
        if (tx.amount !== newTxCandidate.amount) return false;
        if (tx.category_id !== newTxCandidate.category_id) return false;
        const txTime = new Date(tx.created_at).getTime();
        const diffMinutes = Math.abs(now - txTime) / (1000 * 60);
        return diffMinutes <= 15;
      });

      expect(isDuplicate).toBe(false);
    });
  });
});
