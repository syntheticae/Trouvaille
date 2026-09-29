import { describe, it, expect } from "vitest";
import {
  isMultiTransactionHistoryText,
  parseScreenshotHistory,
} from "../screenshotHistoryParser";
import { parseDeepLink } from "../deepLinkHandler";
import type { Category, Wallet, Transaction } from "../types";

const mockCategories: Category[] = [
  { id: "cat-food", name: "Makanan & Minuman", emoji: "🍜", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-transport", name: "Transportasi", emoji: "🛵", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-shopping", name: "Belanja", emoji: "🛍️", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-income", name: "Gaji & Pemasukan", emoji: "💰", type: "income", is_default: false, created_at: "", user_id: "" },
];

const mockWallets: Wallet[] = [
  { id: "wal-gopay", name: "GoPay", balance: 500000, icon: "wallet", created_at: "", user_id: "" },
  { id: "wal-bca", name: "Bank BCA", balance: 2500000, icon: "landmark", created_at: "", user_id: "" },
];

describe("screenshotHistoryParser & Batch Deep Link Tests", () => {
  it("correctly identifies multi-transaction history screens via heuristic", () => {
    const singleReceipt = `
      Kopi Kenangan
      Pembayaran QRIS Berhasil
      Rp 75.000
      Waktu: 09:33
      Rekening: BCA
    `;
    expect(isMultiTransactionHistoryText(singleReceipt)).toBe(false);

    const goPayHistoryText = `
      Riwayat Transaksi
      25 Sep 2024
      GoFood
      Order GF-839201948 - Martabak Pecenongan 78
      25 Sep, 19:42 • GoPay Saldo
      -Rp68.500
      Berhasil
      Ditransfer ke BCA
      Budi Santoso - 0148291039
      25 Sep, 14:15 • Saldo GoPay
      -Rp250.000
      Berhasil
      GoPay Top Up
      BCA OneKlik - Top Up Saldo
      24 Sep, 10:00
      +Rp500.000
      Berhasil
    `;
    expect(isMultiTransactionHistoryText(goPayHistoryText)).toBe(true);
  });

  it("parses GoPay multi-transaction history with expenses, transfers, and inflows", () => {
    const rawOcr = `
      Riwayat Transaksi
      25 Sep 2024
      GoFood - Martabak Pecenongan 78
      -Rp68.500
      Berhasil
      Ditransfer ke BCA
      -Rp250.000
      Berhasil
      GoPay Top Up
      +Rp500.000
      Berhasil
    `;

    const items = parseScreenshotHistory(rawOcr, [], mockCategories, mockWallets);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(3);

    // Item 1: GoFood expense
    expect(items![0].amount).toBe(68500);
    expect(items![0].type).toBe("expense");
    expect(items![0].cleanDescription).toContain("GoFood");

    // Item 2: Transfer to BCA
    expect(items![1].amount).toBe(250000);
    expect(items![1].type).toBe("transfer");
    expect(items![1].destinationWalletId).toBe("wal-bca");

    // Item 3: Inflow / Top Up
    expect(items![2].amount).toBe(500000);
    expect(items![2].type).toBe("income");
  });

  it("correctly identifies duplicates within 48-hour window and unchecks them", () => {
    const existingTxs: Transaction[] = [
      {
        id: "tx-existing-1",
        amount: 68500,
        type: "expense",
        category_id: "cat-food",
        wallet_id: "wal-gopay",
        to_wallet_id: null,
        occurred_on: "2024-09-25",
        created_at: "2024-09-25T19:42:00Z",
        note: "GoFood Martabak",
        user_id: "u1",
      },
    ];

    const rawOcr = `
      Riwayat Transaksi
      25 Sep 2024
      GoFood Martabak
      -Rp68.500
      Berhasil
      Kopi Kenangan
      -Rp24.000
      Berhasil
    `;

    const items = parseScreenshotHistory(rawOcr, existingTxs, mockCategories, mockWallets);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(2);

    // Item 1 should be flagged as duplicate and selected = false
    expect(items![0].isDuplicate).toBe(true);
    expect(items![0].selected).toBe(false);

    // Item 2 should NOT be duplicate and selected = true
    expect(items![1].isDuplicate).toBe(false);
    expect(items![1].selected).toBe(true);
  });

  it("handles deep link capture routing and returns batch_review action", () => {
    const rawOcr = `
      Riwayat Transaksi
      25 Sep 2024
      GoFood Martabak
      -Rp68.500
      Berhasil
      Kopi Kenangan
      -Rp24.000
      Berhasil
    `;

    const encoded = encodeURIComponent(rawOcr);
    const deepLinkUrl = `trouvaille://capture?text=${encoded}&source=ocr`;

    const res = parseDeepLink(deepLinkUrl, mockCategories, mockWallets, []);
    expect(res.action).toBe("batch_review");
    expect(res.batchItems).toBeDefined();
    expect(res.batchItems!.length).toBe(2);
  });
});
