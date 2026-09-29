import { describe, it, expect } from "vitest";
import {
  detectColumns,
  columnRoleLabel,
  CORE_COLUMN_ROLES,
  type ColumnRole,
} from "../src/lib/csvColumnDetector";
import { generateLuxuryPdf, type ReportSummary } from "../src/lib/reportExportService";
import type { Wallet, Category, Transaction } from "../src/lib/types";

describe("Statement Import & Financial Export Suite", () => {
  describe("1. CSV Column Detector & Core Schema Mapping", () => {
    it("detects 'Judul' as description (Catatan) and 'Jenis Transaksi' as type (Jenis Transaksi)", () => {
      const headers = [
        "Tanggal",
        "Jam",
        "Rekening",
        "Kategori",
        "Judul",
        "Jumlah",
        "Jenis Transaksi",
      ];
      const sampleRows = [
        ["01/04/2025", "04:31:00", "BNI", "Biaya admin", "-", "-5000", "PENGELUARAN"],
        ["02/04/2025", "09:42:00", "Blu", "Gadget", "baterai", "-150000", "PENGELUARAN"],
        ["02/04/2025", "17:47:00", "Cash", "Bensin", "-", "-25000", "PENGELUARAN"],
      ];

      const detected = detectColumns(headers, sampleRows);

      // Tanggal -> dateCol (index 0)
      expect(detected.dateCol).toBe(0);
      // Rekening -> walletCol (index 2)
      expect(detected.walletCol).toBe(2);
      // Kategori -> categoryCol (index 3)
      expect(detected.categoryCol).toBe(3);
      // Judul -> descCol (index 4, NOT ignored!)
      expect(detected.descCol).toBe(4);
      // Jumlah -> amountCol (index 5)
      expect(detected.amountCol).toBe(5);
      // Jenis Transaksi -> typeCol (index 6, NOT descCol!)
      expect(detected.typeCol).toBe(6);
    });

    it("restricts user-facing dropdown roles strictly to core transaction schema fields + ignore", () => {
      expect(CORE_COLUMN_ROLES).toEqual([
        "date",
        "time",
        "description",
        "amount",
        "type",
        "category",
        "wallet",
        "ignore",
      ]);
      expect(CORE_COLUMN_ROLES).not.toContain("debit");
      expect(CORE_COLUMN_ROLES).not.toContain("credit");
      expect(CORE_COLUMN_ROLES).not.toContain("balance");
    });

    it("localizes column role labels with 100% pure Indonesian and pure English without bilingual mixing", () => {
      const expectedId: Record<ColumnRole, string> = {
        date: "Tanggal",
        time: "Jam / Waktu",
        description: "Catatan",
        amount: "Nominal",
        type: "Jenis Transaksi",
        category: "Kategori",
        wallet: "Akun",
        debit: "Debet",
        credit: "Kredit",
        balance: "Saldo",
        ignore: "Abaikan",
      };

      const expectedEn: Record<ColumnRole, string> = {
        date: "Date",
        time: "Time",
        description: "Note",
        amount: "Amount",
        type: "Transaction Type",
        category: "Category",
        wallet: "Account",
        debit: "Debit",
        credit: "Credit",
        balance: "Balance",
        ignore: "Ignore",
      };

      for (const role of CORE_COLUMN_ROLES) {
        expect(columnRoleLabel(role, true)).toBe(expectedId[role]);
        expect(columnRoleLabel(role, false)).toBe(expectedEn[role]);
      }
    });
  });

  describe("2. PDF Financial Statement Export (Balance Sheet Account Completeness)", () => {
    it("renders 100% of user accounts in Balance Sheet without truncation or '+ X Akun Lainnya'", () => {
      const mockWallets: Wallet[] = [
        { id: "w-cash", user_id: "u1", name: "Dompet Tunai", icon: "Coins", created_at: "2026-01-01", balance: 500000, classification: "liquid" },
        { id: "w-bca", user_id: "u1", name: "BCA Tabungan", icon: "Landmark", created_at: "2026-01-01", balance: 15000000, classification: "liquid" },
        { id: "w-mandiri", user_id: "u1", name: "Mandiri Payroll", icon: "Landmark", created_at: "2026-01-01", balance: 8000000, classification: "liquid" },
        { id: "w-seabank", user_id: "u1", name: "SeaBank Tabungan", icon: "Landmark", created_at: "2026-01-01", balance: 4500000, classification: "liquid" },
        { id: "w-gopay", user_id: "u1", name: "GoPay Saldo", icon: "Smartphone", created_at: "2026-01-01", balance: 350000, classification: "liquid" },
        { id: "w-blu", user_id: "u1", name: "Blu by BCA", icon: "Smartphone", created_at: "2026-01-01", balance: 1200000, classification: "liquid" },
        { id: "w-jago", user_id: "u1", name: "Bank Jago Utama", icon: "Landmark", created_at: "2026-01-01", balance: 2500000, classification: "liquid" },
        { id: "w-bibit", user_id: "u1", name: "Bibit Reksadana", icon: "TrendingUp", created_at: "2026-01-01", balance: 20000000, classification: "investment" },
        { id: "w-cc", user_id: "u1", name: "BCA Everyday Card", icon: "CreditCard", created_at: "2026-01-01", balance: -1500000, classification: "credit" },
      ];

      const mockCategories: Category[] = [
        { id: "c-food", user_id: "u1", name: "Makanan & Minuman", emoji: "Utensils", type: "expense", is_default: true, created_at: "2026-01-01" },
      ];

      const mockTxs: Transaction[] = [
        { id: "tx-1", user_id: "u1", amount: 50000, type: "expense", category_id: "c-food", wallet_id: "w-bca", to_wallet_id: null, note: "Makan siang", occurred_on: "2026-09-01", created_at: "2026-09-01T12:00:00Z" },
      ];

      const mockSummary: ReportSummary = {
        periodLabel: "September 2026",
        spaceName: "Pribadi",
        totalIncome: 10000000,
        totalExpense: 50000,
        totalTransfer: 0,
        netCashflow: 9950000,
        savingsRate: 99,
        transactionCount: 1,
        topCategories: [{ name: "Makanan & Minuman", amount: 50000, percentage: 100, count: 1 }],
        walletBreakdown: [],
      };

      const doc = generateLuxuryPdf(
        mockTxs,
        mockSummary,
        mockWallets,
        mockCategories,
        true, // isIndonesian
        mockTxs,
      );

      // Extract raw PDF output string
      const pdfString = doc.output();

      // Verify that every single wallet name is included in the output
      expect(pdfString).toContain("Dompet Tunai");
      expect(pdfString).toContain("BCA Tabungan");
      expect(pdfString).toContain("Mandiri Payroll");
      expect(pdfString).toContain("SeaBank Tabungan");
      expect(pdfString).toContain("GoPay Saldo");
      expect(pdfString).toContain("Blu by BCA");
      expect(pdfString).toContain("Bank Jago Utama");
      expect(pdfString).toContain("Bibit Reksadana");
      expect(pdfString).toContain("BCA Everyday Card");

      // Verify that NO truncation text exists
      expect(pdfString).not.toContain("Akun Kas Lainnya");
      expect(pdfString).not.toContain("Other Accounts");
      expect(pdfString).not.toMatch(/\+\s+\d+\s+Akun/);
    });
  });
});
