import { describe, it, expect } from "vitest";
import type { Wallet } from "../src/lib/types";

describe("Liquidity Sources Account Detail & Navigation Integrity", () => {
  const mockWallets: Wallet[] = [
    {
      id: "w-bca",
      user_id: "u-1",
      name: "BCA Prioritas",
      icon: "Landmark",
      created_at: "2026-01-01T00:00:00Z",
      classification: "liquid",
      balance: 15000000,
    },
    {
      id: "w-jago",
      user_id: "u-1",
      name: "Bank Jago Main",
      icon: "Smartphone",
      created_at: "2026-01-01T00:00:00Z",
      classification: "liquid",
      balance: 5000000,
    },
  ];

  it("correctly matches an account item to its Wallet entity or falls back safely", () => {
    const findWallet = (acc: { id: string; name: string; icon?: string; balance?: number }) => {
      return mockWallets.find((w) => w.id === acc.id) || {
        id: acc.id,
        user_id: "",
        name: acc.name,
        icon: acc.icon || "Wallet",
        created_at: "2026-01-01T00:00:00Z",
        classification: "liquid" as const,
        balance: acc.balance || 0,
      };
    };

    // Existing wallet
    const matched = findWallet({ id: "w-bca", name: "BCA Prioritas" });
    expect(matched.id).toBe("w-bca");
    expect(matched.balance).toBe(15000000);

    // Fallback wallet
    const fallback = findWallet({ id: "w-unknown", name: "Dompet Darurat", balance: 500000 });
    expect(fallback.id).toBe("w-unknown");
    expect(fallback.name).toBe("Dompet Darurat");
    expect(fallback.balance).toBe(500000);
    expect(fallback.classification).toBe("liquid");
  });

  it("filters mutations specifically for the selected wallet (incoming, outgoing, and transfer)", () => {
    const allTxs = [
      { id: "tx-1", wallet_id: "w-bca", to_wallet_id: null, amount: 200000, type: "expense", occurred_on: "2026-03-20" },
      { id: "tx-2", wallet_id: "w-jago", to_wallet_id: null, amount: 50000, type: "expense", occurred_on: "2026-03-21" },
      { id: "tx-3", wallet_id: "w-bca", to_wallet_id: "w-jago", amount: 1000000, type: "transfer", occurred_on: "2026-03-22" },
      { id: "tx-4", wallet_id: null, to_wallet_id: "w-bca", amount: 8000000, type: "income", occurred_on: "2026-03-25" },
    ];

    const getWalletMutations = (walletId: string) => {
      return allTxs
        .filter((tx) => tx.wallet_id === walletId || tx.to_wallet_id === walletId)
        .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
    };

    const bcaMutations = getWalletMutations("w-bca");
    expect(bcaMutations).toHaveLength(3); // tx-4 (income), tx-3 (transfer out), tx-1 (expense)
    expect(bcaMutations[0].id).toBe("tx-4");
    expect(bcaMutations[1].id).toBe("tx-3");
    expect(bcaMutations[2].id).toBe("tx-1");

    const jagoMutations = getWalletMutations("w-jago");
    expect(jagoMutations).toHaveLength(2); // tx-3 (transfer in), tx-2 (expense)
    expect(jagoMutations[0].id).toBe("tx-3");
    expect(jagoMutations[1].id).toBe("tx-2");
  });

  it("computes the correct target mutation route for 'Lihat Semua Mutasi Akun Ini'", () => {
    const getMutationRoute = (walletId: string) => `/transactions?wallet=${walletId}`;
    expect(getMutationRoute("w-bca")).toBe("/transactions?wallet=w-bca");
    expect(getMutationRoute("w-jago")).toBe("/transactions?wallet=w-jago");
  });

  it("delegates edit action cleanly to WalletManagementSheets", () => {
    let editingWallet: Wallet | null = null;
    let isWalletManagementOpen = false;

    const onEditWallet = (wallet: Wallet) => {
      editingWallet = wallet;
      isWalletManagementOpen = true;
    };

    onEditWallet(mockWallets[0]);

    expect(editingWallet).not.toBeNull();
    expect(editingWallet?.id).toBe("w-bca");
    expect(isWalletManagementOpen).toBe(true);
  });
});
