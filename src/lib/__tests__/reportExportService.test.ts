import { describe, it, expect } from "vitest";
import {
  filterTransactionsForReport,
  extractTxDateAndTime,
  calculateReportSummary,
  generateCsvContent,
  generateLuxuryPrintableHtml,
  type ReportFilterOptions,
} from "../reportExportService";
import type { Transaction, Wallet } from "../types";

describe("reportExportService — Rule 8.1 Full ISO Timestamps & Rule 6 Localization", () => {
  const mockWallets: Wallet[] = [
    {
      id: "w-bca",
      user_id: "u-1",
      name: "BCA Prioritas",
      icon: "Landmark",
      balance: 25_000_000,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "w-gopay",
      user_id: "u-1",
      name: "GoPay",
      icon: "Smartphone",
      balance: 1_500_000,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: "tx-start",
      user_id: "u-1",
      type: "income",
      amount: 15_000_000,
      occurred_on: "2026-09-01T09:15:00",
      created_at: "2026-09-01T02:15:00Z",
      category_id: "c1",
      wallet_id: "w-bca",
      to_wallet_id: null,
      note: "Gaji Bulanan",
      categories: {
        id: "c1",
        user_id: "u-1",
        name: "Gaji",
        emoji: "Briefcase",
        type: "income",
        is_default: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    },
    {
      id: "tx-end-day-iso",
      user_id: "u-1",
      type: "expense",
      amount: 450_000,
      occurred_on: "2026-09-30T21:45:30",
      created_at: "2026-09-30T14:45:30Z",
      category_id: "c2",
      wallet_id: "w-gopay",
      to_wallet_id: null,
      note: "Makan Malam Akhir Bulan",
      categories: {
        id: "c2",
        user_id: "u-1",
        name: "Makanan",
        emoji: "Utensils",
        type: "expense",
        is_default: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    },
    {
      id: "tx-next-month",
      user_id: "u-1",
      type: "expense",
      amount: 100_000,
      occurred_on: "2026-10-01T08:00:00",
      created_at: "2026-10-01T01:00:00Z",
      category_id: null,
      wallet_id: "w-bca",
      to_wallet_id: null,
      note: "Kopi Pagi",
    },
  ];

  it("includes transactions with Full ISO timestamps on the final day of the custom range (Rule 8.1)", () => {
    const options: ReportFilterOptions = {
      dateRange: "custom",
      customStartDate: new Date(2026, 8, 1), // Sep 1, 2026
      customEndDate: new Date(2026, 8, 30), // Sep 30, 2026
    };

    const filtered = filterTransactionsForReport(mockTransactions, options);
    expect(filtered.map((t) => t.id)).toEqual(["tx-start", "tx-end-day-iso"]);
  });

  it("extracts normalized YYYY-MM-DD and HH:mm from Full ISO occurred_on", () => {
    const parsed = extractTxDateAndTime(mockTransactions[1]!);
    expect(parsed.dateStr).toBe("2026-09-30");
    expect(parsed.timeStr).toBe("21:45");
  });

  it("generates CSV with normalized YYYY-MM-DD dates and HH:mm times from occurred_on", () => {
    const csv = generateCsvContent(mockTransactions.slice(0, 2), mockWallets, true);
    expect(csv).toContain("2026-09-30,21:45,Pengeluaran");
    expect(csv).toContain("2026-09-01,09:15,Pemasukan");
    expect(csv).not.toContain("2026-09-30T21:45:30");
  });

  it("localizes generateLuxuryPrintableHtml cleanly in Indonesian and English (Rule 6)", () => {
    const options: ReportFilterOptions = {
      dateRange: "custom",
      customStartDate: new Date(2026, 8, 1),
      customEndDate: new Date(2026, 8, 30),
      spaceName: "Utama",
    };
    const filtered = filterTransactionsForReport(mockTransactions, options);
    const summaryId = calculateReportSummary(filtered, options, mockWallets, true);

    const htmlId = generateLuxuryPrintableHtml(filtered, summaryId, mockWallets, true);
    expect(htmlId).toContain("TOTAL PEMASUKAN");
    expect(htmlId).toContain("TOTAL PENGELUARAN");
    expect(htmlId).toContain("ARUS KAS BERSIH");
    expect(htmlId).toContain("Tabel Transaksi");
    expect(htmlId).toContain("2026-09-30 21:45");

    const htmlEn = generateLuxuryPrintableHtml(filtered, summaryId, mockWallets, false);
    expect(htmlEn).toContain("TOTAL INFLOW");
    expect(htmlEn).toContain("TOTAL OUTFLOW");
    expect(htmlEn).toContain("NET CASH FLOW");
    expect(htmlEn).toContain("Transactions Table");
  });
});
