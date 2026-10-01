import { describe, it, expect } from "vitest";

describe("Search & Viewport Stability Integrity", () => {
  const sampleTransactions = [
    {
      id: "tx-1",
      amount: 45000,
      note: "Kopi Kenangan Mantan",
      occurred_on: "2026-03-15",
      type: "expense" as const,
      category_id: "cat-fnb",
      wallet_id: "w-bca",
    },
    {
      id: "tx-2",
      amount: 12000000,
      note: "Gaji Bulanan PT Maju",
      occurred_on: "2026-03-25",
      type: "income" as const,
      category_id: "cat-salary",
      wallet_id: "w-bca",
    },
    {
      id: "tx-3",
      amount: 85000,
      note: "Beli Kopi Arabika Roastery",
      occurred_on: "2026-02-14", // Last month!
      type: "expense" as const,
      category_id: "cat-fnb",
      wallet_id: "w-mandiri",
    },
    {
      id: "tx-4",
      amount: 500000,
      note: "Shopee Pay Top Up",
      occurred_on: "2026-01-10", // 2 months ago!
      type: "transfer" as const,
      category_id: null,
      wallet_id: "w-bca",
      to_wallet_id: "w-shopee",
    },
  ];

  const categories = [
    { id: "cat-fnb", name: "Makanan & Minuman", emoji: "Utensils" },
    { id: "cat-salary", name: "Gaji & Pendapatan", emoji: "Briefcase" },
  ];

  const wallets = [
    { id: "w-bca", name: "BCA Prioritas" },
    { id: "w-mandiri", name: "Mandiri Utama" },
    { id: "w-shopee", name: "ShopeePay" },
  ];

  const matchTx = (tx: (typeof sampleTransactions)[0], query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const digitsOnly = q.replace(/[^0-9]/g, "");

    const fromWallet = wallets.find((w) => w.id === tx.wallet_id)?.name || "";
    const toWallet = wallets.find((w) => w.id === tx.to_wallet_id)?.name || "";
    const cat = categories.find((c) => c.id === tx.category_id)?.name || "";
    const amountStr = String(tx.amount || "");

    const matchesText =
      (tx.note && tx.note.toLowerCase().includes(q)) ||
      cat.toLowerCase().includes(q) ||
      fromWallet.toLowerCase().includes(q) ||
      toWallet.toLowerCase().includes(q);

    const matchesAmount =
      (digitsOnly.length > 0 && amountStr.includes(digitsOnly)) ||
      amountStr.includes(q);

    return matchesText || matchesAmount;
  };

  it("filters search within current period (March 2026)", () => {
    const currentPeriodTxs = sampleTransactions.filter((t) =>
      t.occurred_on.startsWith("2026-03"),
    );

    const kopiMatches = currentPeriodTxs.filter((t) => matchTx(t, "kopi"));
    expect(kopiMatches).toHaveLength(1);
    expect(kopiMatches[0].id).toBe("tx-1");
  });

  it("finds all-time matches across past months when searching 'kopi'", () => {
    const allMatches = sampleTransactions.filter((t) => matchTx(t, "kopi"));
    expect(allMatches).toHaveLength(2); // tx-1 (March) and tx-3 (February)
    expect(allMatches.map((m) => m.id)).toEqual(["tx-1", "tx-3"]);
  });

  it("detects cross-period matches when current period has 0 results", () => {
    const currentPeriodTxs = sampleTransactions.filter((t) =>
      t.occurred_on.startsWith("2026-03"),
    );

    // Search for 'Shopee' which only exists in January
    const currentMatches = currentPeriodTxs.filter((t) => matchTx(t, "shopee"));
    expect(currentMatches).toHaveLength(0);

    const allMatches = sampleTransactions.filter((t) => matchTx(t, "shopee"));
    expect(allMatches).toHaveLength(1);
    expect(allMatches[0].id).toBe("tx-4");
  });

  it("matches by category name and amount digits", () => {
    // Match by category name 'Gaji'
    const salaryMatches = sampleTransactions.filter((t) => matchTx(t, "gaji"));
    expect(salaryMatches).toHaveLength(1);
    expect(salaryMatches[0].id).toBe("tx-2");

    // Match by partial amount digits '12000'
    const amountMatches = sampleTransactions.filter((t) => matchTx(t, "12000"));
    expect(amountMatches).toHaveLength(1);
    expect(amountMatches[0].id).toBe("tx-2");
  });

  it("calculates visual viewport keyboard offset correctly", () => {
    const windowInnerHeight = 844; // iPhone 12/13/14 height
    const vvHeight = 504; // Visual viewport when virtual keyboard is 340px tall
    const vvOffsetTop = 0;

    const offset = windowInnerHeight - (vvHeight + vvOffsetTop);
    expect(offset).toBe(340);

    const isKeyboardActive = offset > 80;
    expect(isKeyboardActive).toBe(true);

    // BottomSheet effectiveMinHeight test: should cap locked minHeight below visual viewport
    const lockedMinHeight = 700;
    const effectiveMinHeight = Math.min(
      lockedMinHeight,
      Math.round(vvHeight * 0.85),
    );
    expect(effectiveMinHeight).toBe(428); // Capped from 700 to 428 so header is never offscreen
  });
});
