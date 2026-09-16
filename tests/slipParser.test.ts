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

  it("parses Superbank slip with voucher and rejects acquirer BRI (Receipt 2)", () => {
    const superbankText = `
      superbank
      Transaksi berhasil
      07 Jul 2026 - 14:27 WIB
      Pengirim
      Aji Fras Aditya
      Superbank - Tabungan Utama
      Penerima
      Kopi Kenangan 1320
      Nominal Bayar
      Rp44.075,00
      Voucher
      -Rp5.000,00
      Total Bayar
      Rp39.075,00
      Nama Acquirer
      BRI
    `;

    const wallets: Wallet[] = [
      { id: "w-bri", name: "BRI", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
      { id: "w-superbank", name: "Superbank", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const categories: Category[] = [
      { id: "c-kopi", name: "Kopi", icon: "Coffee", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];

    const result = parseSlipText(superbankText, wallets, categories);

    expect(result.amount).toBe(39075); // Net total after voucher
    expect(result.sourceWalletId).toBe("w-superbank"); // Must NOT be BRI acquirer
    expect(result.categoryId).toBe("c-kopi");
    expect(result.merchantOrRecipient.toLowerCase()).toContain("kopi kenangan");
  });

  it("parses Wondr by BNI QRIS slip and does NOT mistake 'sumber dana' for Dana e-wallet (Receipt 7)", () => {
    const wondrText = `
      wondr by BNI
      Pembayaran QRIS berhasil
      26 Jul 2026 - 18:04:37 WIB
      Penerima
      DOMINANCE COFFEE BNI BANYUWANGI
      Sumber dana
      AJI FRAS ADITYA
      Nominal Rp28.000
      Total Rp28.000
      Nama issuer BNI
    `;

    const wallets: Wallet[] = [
      { id: "w-dana", name: "Dana", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
      { id: "w-bni", name: "BNI", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const categories: Category[] = [
      { id: "c-cafe", name: "Cafe", icon: "Coffee", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];

    const result = parseSlipText(wondrText, wallets, categories);

    expect(result.amount).toBe(28000);
    expect(result.sourceWalletId).toBe("w-bni"); // Must NOT be Dana
    expect(result.categoryId).toBe("c-cafe");
  });

  it("parses Brize Cafe receipt and does NOT mistake 'Brize' for BRI bank (Receipt 3)", () => {
    const brizeText = `
      Brize Cafe
      17 Jun 2026 18:52
      STRAWBERRY ICE TEA 23.000
      ICE CAFE LATTE 27.000
      TAHU WALIK BANYUWANGI 25.000
      Subtotal Rp 67.500
      Total Rp 67.500
      BCA QR Rp 67.500
    `;

    const wallets: Wallet[] = [
      { id: "w-bri", name: "BRI", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
      { id: "w-bca", name: "BCA", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const categories: Category[] = [
      { id: "c-cafe", name: "Cafe", icon: "Coffee", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];

    const result = parseSlipText(brizeText, wallets, categories);

    expect(result.amount).toBe(67500);
    expect(result.sourceWalletId).toBe("w-bca"); // Must NOT be BRI
    expect(result.categoryId).toBe("c-cafe");
  });

  it("matches Indomaret receipt with Groceries category (Receipt 1 & 6)", () => {
    const indomaretText = `
      INDOMARET
      TOTAL BELANJA : 49,000
      NON TUNAI : 49,000
      QR BNI / WONDR-TRXID:F52F2608021126000101
      PURCHASE : 49,000
    `;

    const wallets: Wallet[] = [
      { id: "w-bni", name: "BNI", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const categories: Category[] = [
      { id: "c-groceries", name: "Groceries", icon: "ShoppingBag", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];

    const result = parseSlipText(indomaretText, wallets, categories);

    expect(result.amount).toBe(49000);
    expect(result.sourceWalletId).toBe("w-bni");
    expect(result.categoryId).toBe("c-groceries");
  });

  it("parses FamilyMart receipt with grand total and groceries category (never Admin & Fee)", () => {
    const raw = `
== FamilyMart
88-90 Binh Quoi
HOA DON BAN HANG
1 Kem BINGGRAE Mel 1 30,000 30,000
2 Kem Celano 1 21,000 21,000
> Téng s6/Tong cong: 146,000
MASTER 146,000
    `;
    const testWallets: Wallet[] = [
      { id: "w-cash", name: "Cash", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
      { id: "w-liab", name: "Liabilities", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const testCats: Category[] = [
      { id: "c-admin", name: "Admin & Fee", icon: "Tag", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
      { id: "c-belanja", name: "Belanja", icon: "Tag", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const result = parseSlipText(raw, testWallets, testCats);
    expect(result.merchantOrRecipient).toBe("FamilyMart");
    expect(result.amount).toBe(146000);
    expect(result.categoryId).toBe("c-belanja");
    expect(result.sourceWalletId).not.toBe("w-liab");
  });

  it("parses Mie Gacoan and Ichiban Sushi correctly as Makanan", () => {
    const gacoan = `
      CIKAMPEK
      IG : @mie.gacoan
      MIE GACOAN LV 2 10.000
      Total 77.560
    `;
    const testCats: Category[] = [
      { id: "c-makanan", name: "Makanan", icon: "Utensils", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const resGacoan = parseSlipText(gacoan, [], testCats);
    expect(resGacoan.merchantOrRecipient).toBe("Mie Gacoan");
    expect(resGacoan.amount).toBe(77560);
    expect(resGacoan.categoryId).toBe("c-makanan");

    const ichiban = `
      ICHIBAN SUSHI
      AEON SENTUL CITY
      Total 257.565
    `;
    const resIchiban = parseSlipText(ichiban, [], testCats);
    expect(resIchiban.merchantOrRecipient).toBe("Ichiban Sushi");
    expect(resIchiban.amount).toBe(257565);
    expect(resIchiban.categoryId).toBe("c-makanan");
  });

  it("parses SeaBank transfers to Warung Suputra and ESB Restaurant", () => {
    const suputra = `
      SeaBank
      Bukti Transaksi
      rp 72.000
      Dari Pratiwi
      Ke warung suputra
      Nominal Transaksi Rp 72.000
    `;
    const testWallets: Wallet[] = [
      { id: "w-seabank", name: "SeaBank", balance: 0, user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const testCats: Category[] = [
      { id: "c-makanan", name: "Makanan", icon: "Utensils", color: "#111", user_id: "u-1", created_at: "", updated_at: "" },
    ];
    const res = parseSlipText(suputra, testWallets, testCats);
    expect(res.merchantOrRecipient).toBe("Warung Suputra");
    expect(res.amount).toBe(72000);
    expect(res.sourceWalletId).toBe("w-seabank");
    expect(res.categoryId).toBe("c-makanan");
  });

  it("extracts timestamp from receipt or transfer slip accurately", () => {
    const slipWithTime = `
      m-Transfer: BERHASIL
      16/09/2026 14:22:05
      Jumlah: Rp 88.000
      Nama: KOPI KENANGAN
    `;
    const res = parseSlipText(slipWithTime, mockWallets, mockCategories);
    expect(res.time).toBe("14:22");
    expect(res.date.getHours()).toBe(14);
    expect(res.date.getMinutes()).toBe(22);
  });
});
