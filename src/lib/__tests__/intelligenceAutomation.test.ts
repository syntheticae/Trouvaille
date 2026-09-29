import { describe, it, expect, beforeEach } from "vitest";
import { classifySemanticCategory } from "../semanticClassifier";
import {
  getMerchantMemory,
  saveMerchantMemory,
  clearMerchantMemory,
  normalizeMerchantKey,
} from "../merchantCategoryMemory";
import { resolveTransactionCategory } from "../categoryResolver";
import { findBestMatchingBill } from "../billMatchingEngine";
import { parseScreenshotHistory } from "../screenshotHistoryParser";
import type { Category, Wallet, Bill } from "../types";

const mockCategories: Category[] = [
  { id: "cat-food", name: "Makanan & Minuman", emoji: "🍜", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-transport", name: "Transportasi", emoji: "🛵", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-shopping", name: "Belanja", emoji: "🛍️", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-clothing", name: "Pakaian", emoji: "👕", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-bills", name: "Tagihan & Utilitas", emoji: "⚡", type: "expense", is_default: false, created_at: "", user_id: "" },
  { id: "cat-income", name: "Gaji & Pemasukan", emoji: "💰", type: "income", is_default: false, created_at: "", user_id: "" },
];

const mockWallets: Wallet[] = [
  { id: "wal-spay", name: "ShopeePay", balance: 150000, icon: "wallet", created_at: "", user_id: "" },
  { id: "wal-dana", name: "DANA", balance: 250000, icon: "wallet", created_at: "", user_id: "" },
  { id: "wal-ovo", name: "OVO", balance: 75000, icon: "wallet", created_at: "", user_id: "" },
  { id: "wal-bca", name: "Bank BCA", balance: 2500000, icon: "landmark", created_at: "", user_id: "" },
];

describe("Intelligence & Accuracy Automation Engine Tests", () => {
  beforeEach(() => {
    clearMerchantMemory();
  });

  describe("Pilar 0: Shopee & Marketplace Context Disambiguation", () => {
    it("classifies general Shopee/ShopeePay as Belanja/Shopping, NEVER Fashion/Pakaian", () => {
      const res = classifySemanticCategory("Pesanan Shopee", mockCategories);
      expect(res.category).not.toBeNull();
      expect(res.category!.id).toBe("cat-shopping");
      expect(res.category!.name).toBe("Belanja");
      expect(res.category!.name).not.toBe("Pakaian");
    });

    it("classifies ShopeeFood as Makanan & Minuman", () => {
      const res = classifySemanticCategory("ShopeeFood - Ayam Geprek Bensu", mockCategories);
      expect(res.category).not.toBeNull();
      expect(res.category!.id).toBe("cat-food");
    });

    it("classifies Shopee bills/PLN as Tagihan & Utilitas", () => {
      const res = classifySemanticCategory("Shopee - Tagihan Listrik PLN", mockCategories);
      expect(res.category).not.toBeNull();
      expect(res.category!.id).toBe("cat-bills");
    });

    it("classifies explicit clothing purchases as Pakaian/Fashion", () => {
      const res = classifySemanticCategory("Shopee - Baju Kaos Pria Oversize", mockCategories);
      expect(res.category).not.toBeNull();
      expect(res.category!.id).toBe("cat-clothing");
    });
  });

  describe("Pilar 1: Self-Learning Merchant Memory", () => {
    it("normalizes merchant keys by stripping noise prefixes", () => {
      expect(normalizeMerchantKey("PT Sumber Alfaria Trijaya")).toBe("sumber alfaria trijaya");
      expect(normalizeMerchantKey("Pembayaran QRIS Kopi Kenangan")).toBe("kopi kenangan");
      expect(normalizeMerchantKey("Pesanan Selesai - Toko Baju")).toBe("toko baju");
    });

    it("remembers user category correction and resolves with priority 1", () => {
      // Simulate user manually reclassifying Shopee to "Pakaian" or custom category
      saveMerchantMemory("Shopee", "cat-clothing", "Pakaian");

      const memory = getMerchantMemory("Shopee");
      expect(memory).not.toBeNull();
      expect(memory!.categoryId).toBe("cat-clothing");

      // Verify categoryResolver honors merchant memory over defaults
      const resolved = resolveTransactionCategory(
        { note: "Shopee - Pesanan 123", amount: 150000 },
        mockCategories
      );
      expect(resolved.id).toBe("cat-clothing");
      expect(resolved.name).toBe("Pakaian");
    });
  });

  describe("Pilar 2: Smart Recurring & Bill Matching", () => {
    const mockBills: Bill[] = [
      {
        id: "bill-pln",
        user_id: "u1",
        title: "PLN Listrik",
        amount: 150000,
        due_date: "2026-09-30",
        repeat_rule: "monthly",
        is_paid: false,
        note: null,
        created_at: "",
      },
      {
        id: "bill-indihome",
        user_id: "u1",
        title: "Wifi Indihome",
        amount: 350000,
        due_date: "2026-09-28",
        repeat_rule: "monthly",
        is_paid: false,
        note: null,
        created_at: "",
      },
    ];

    it("matches bill with exact amount match", () => {
      const match = findBestMatchingBill("Pembayaran Wifi Indihome", 350000, mockBills);
      expect(match).not.toBeNull();
      expect(match!.bill.id).toBe("bill-indihome");
      expect(match!.exactAmountMatch).toBe(true);
      expect(match!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("matches bill with admin fee tolerance (diff <= Rp 5.000)", () => {
      const match = findBestMatchingBill("Shopee - Tagihan Listrik PLN", 152500, mockBills);
      expect(match).not.toBeNull();
      expect(match!.bill.id).toBe("bill-pln");
      expect(match!.exactAmountMatch).toBe(false);
      expect(match!.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("does not match unrelated transactions", () => {
      const match = findBestMatchingBill("Mie Gacoan", 45000, mockBills);
      expect(match).toBeNull();
    });
  });

  describe("Pilar 4: Multi-App History Parser Expansion", () => {
    it("parses Grab / OVO history screens with clean net amounts", () => {
      const grabOcr = `
        Aktivitas
        28 Sep 2026
        GrabFood
        Ayam Geprek Mas Budi
        28 Sep, 12:45 • OVO Cash
        Diskon Rp10.000
        -Rp38.500
        Pesanan Selesai
        GrabBike
        Perjalanan ke Kantor
        28 Sep, 08:30 • OVO Cash
        -Rp14.000
        Selesai
      `;

      const items = parseScreenshotHistory(grabOcr, [], mockCategories, mockWallets);
      expect(items).not.toBeNull();
      expect(items!.length).toBe(2);

      // Clean net descriptions ("bersih saja")
      expect(items![0].cleanDescription).not.toContain("Diskon");
      expect(items![0].amount).toBe(38500);
      expect(items![0].suggestedCategoryId).toBe("cat-food");

      expect(items![1].amount).toBe(14000);
      expect(items![1].suggestedCategoryId).toBe("cat-transport");
    });

    it("parses DANA history screens accurately", () => {
      const danaOcr = `
        Riwayat Transaksi
        28 Sep 2026
        QRIS DANA
        Kopi Kenangan Grand Indonesia
        28 Sep 2026 14:15
        -Rp28.000
        Transaksi Berhasil
        Isi Saldo
        Top Up via BCA OneKlik
        28 Sep 2026 10:00
        +Rp200.000
        Berhasil
      `;

      const items = parseScreenshotHistory(danaOcr, [], mockCategories, mockWallets);
      expect(items).not.toBeNull();
      expect(items!.length).toBe(2);

      expect(items![0].amount).toBe(28000);
      expect(items![0].type).toBe("expense");
      expect(items![1].amount).toBe(200000);
      expect(items![1].type).toBe("income");
    });

    it("parses Tokopedia history screens with Net amounts", () => {
      const tokpedOcr = `
        Daftar Transaksi
        28 Sep 2026
        Eiger Official Store
        Total Pembayaran: Rp285.000
        Selesai
        Gramedia Official
        Total Belanja: Rp95.000
        Selesai
      `;

      const items = parseScreenshotHistory(tokpedOcr, [], mockCategories, mockWallets);
      expect(items).not.toBeNull();
      expect(items!.length).toBe(2);
      expect(items![0].amount).toBe(285000);
      expect(items![1].amount).toBe(95000);
    });
  });
});
