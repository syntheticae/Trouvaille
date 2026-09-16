import { describe, it, expect } from "vitest";
import { parseSlipText, cleanCurrency } from "../src/lib/slipParser";
import type { Wallet, Category } from "../src/lib/types";

const mockWallets: Wallet[] = [
  { id: "w-bca", name: "BCA Tahapan", balance: 5000000, user_id: "u-1", created_at: "", updated_at: "" },
  { id: "w-mandiri", name: "Mandiri Payroll", balance: 3000000, user_id: "u-1", created_at: "", updated_at: "" },
  { id: "w-gopay", name: "GoPay", balance: 250000, user_id: "u-1", created_at: "", updated_at: "" },
  { id: "w-cash", name: "Dompet Tunai", balance: 100000, user_id: "u-1", created_at: "", updated_at: "" },
];

const mockCategories: Category[] = [
  { id: "c-kopi", name: "Kopi", icon: "Coffee", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
  { id: "c-makan", name: "Makanan & Minuman", icon: "Utensils", color: "#222", user_id: "u-1", created_at: "", updated_at: "" },
  { id: "c-belanja", name: "Belanja Harian", icon: "ShoppingBag", color: "#333", user_id: "u-1", created_at: "", updated_at: "" },
  { id: "c-transport", name: "Transportasi", icon: "Car", color: "#444", user_id: "u-1", created_at: "", updated_at: "" },
];

describe("Indonesian Slip & Receipt Parser Test Suite", () => {
  it("cleans currency numbers accurately", () => {
    expect(cleanCurrency("Rp 150.000")).toBe(150000);
    expect(cleanCurrency("Rp. 25.500,00")).toBe(25500);
    expect(cleanCurrency("IDR 1.250.000")).toBe(1250000);
    expect(cleanCurrency("85000")).toBe(85000);
  });

  it("parses m-BCA transfer slip correctly", () => {
    const bcaRawText = `
      m-Transfer:
      BERHASIL
      16/09/2026 14:22:05
      Dari Rekening: 1234567890
      Ke Rekening: 9876543210
      Nama: KOPI KENANGAN
      Jumlah: Rp 88.000
      Berita: Pesanan #4021
      No. Referensi: 2026091614220501
    `;

    const result = parseSlipText(bcaRawText, mockWallets, mockCategories);

    expect(result.amount).toBe(88000);
    expect(result.sourceWalletId).toBe("w-bca");
    expect(result.categoryId).toBe("c-kopi");
    expect(result.detectedInstitution).toBe("BCA");
    expect(result.type).toBe("expense");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("parses Mandiri Livin' transfer slip correctly", () => {
    const livinRawText = `
      Transfer Berhasil
      16 Sep 2026, 10:15 WIB
      Total Transaksi
      Rp 350.000
      Penerima
      Budi Santoso
      Bank Mandiri - 1370001234567
      Biaya Transaksi
      Rp 0
      Nomor Resi: LVN20260916001
    `;

    const result = parseSlipText(livinRawText, mockWallets, mockCategories);

    expect(result.amount).toBe(350000);
    expect(result.sourceWalletId).toBe("w-mandiri");
    expect(result.detectedInstitution).toBe("MANDIRI");
    expect(result.merchantOrRecipient.toLowerCase()).toContain("budi santoso");
  });

  it("parses BRImo slip and ignores admin fee", () => {
    const brimoRawText = `
      Transaksi Berhasil
      16/09/2026 18:30:11
      Nominal Transfer
      Rp 500.000
      Biaya Admin
      Rp 2.500
      Total
      Rp 502.500
      Tujuan: WARUNG MAKAN SEDERHANA
    `;

    const result = parseSlipText(brimoRawText, mockWallets, mockCategories);

    // Total should be picked (502500) or Nominal (500000), admin fee (2500) must be ignored
    expect(result.amount).toBeGreaterThanOrEqual(500000);
    expect(result.amount).not.toBe(2500);
    expect(result.categoryId).toBe("c-makan");
  });

  it("parses GoPay QRIS payment slip", () => {
    const gopayRawText = `
      Pembayaran Berhasil
      16 Sep 2026 12:45
      STARBUCKS COFFEE RESERVE
      Metode Pembayaran: GoPay
      Total Pembayaran: Rp 65.000
      No Transaksi: GP-9948291
    `;

    const result = parseSlipText(gopayRawText, mockWallets, mockCategories);

    expect(result.amount).toBe(65000);
    expect(result.sourceWalletId).toBe("w-gopay");
    expect(result.categoryId).toBe("c-kopi");
    expect(result.detectedSlipType).toBe("ewallet");
  });

  it("parses Indomaret cash receipt and selects Grand Total over Subtotal", () => {
    const indomaretRawText = `
      INDOMARET POINT KEMANG
      JL. KEMANG RAYA NO. 12
      TANGGAL: 16-09-2026 19:10
      ------------------------------
      ROTI TAWAR SARI ROTI    18.000
      ULTRA MILK 1L           21.500
      MINYAK GORENG 2L        34.000
      ------------------------------
      SUBTOTAL                73.500
      DISKON MEMBER          - 3.500
      PPN 11%                  7.700
      TOTAL BELANJA           70.000
      TUNAI                  100.000
      KEMBALI                 30.000
      TERIMA KASIH
    `;

    const result = parseSlipText(indomaretRawText, mockWallets, mockCategories);

    expect(result.amount).toBe(70000); // Grand total
    expect(result.amount).not.toBe(73500); // Must not pick subtotal
    expect(result.amount).not.toBe(30000); // Must not pick kembalian
    expect(result.categoryId).toBe("c-belanja");
  });
});
