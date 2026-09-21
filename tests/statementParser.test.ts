import { describe, it, expect } from "vitest";
import {
  parseLocalizedNumber,
  normalizeDateString,
  cleanBankNarration,
  parseStatementText,
} from "../src/lib/statementParser";
import type { Transaction, Category } from "../src/lib/types";

describe("Statement Parser & Bank Mutasi Ingestion Suite", () => {
  describe("Number & Date Normalization", () => {
    it("correctly parses Indonesian format with dots as thousands and commas as decimal", () => {
      expect(parseLocalizedNumber("1.250.000,00")).toBe(1250000);
      expect(parseLocalizedNumber("50.000,00")).toBe(50000);
      expect(parseLocalizedNumber("75.500")).toBe(75500);
    });

    it("correctly parses US format with commas as thousands", () => {
      expect(parseLocalizedNumber("1,250,000.00")).toBe(1250000);
      expect(parseLocalizedNumber("45,000")).toBe(45000);
    });

    it("normalizes short DD/MM dates using current year", () => {
      const year = new Date().getFullYear();
      expect(normalizeDateString("05/09")).toBe(`${year}-09-05`);
      expect(normalizeDateString("15/12")).toBe(`${year}-12-15`);
    });

    it("normalizes full DD/MM/YYYY dates", () => {
      expect(normalizeDateString("12/09/2026")).toBe("2026-09-12");
      expect(normalizeDateString("01-05-2026")).toBe("2026-05-01");
    });

    it("normalizes Jenius style DD Mon YYYY dates", () => {
      expect(normalizeDateString("14 Sep 2026")).toBe("2026-09-14");
    });
  });

  describe("Narration Cleaner", () => {
    it("strips bank technical prefixes like TRSF, E-BANKING, QRIS, batch IDs", () => {
      const cleaned = cleanBankNarration("TRSF E-BANKING CR 0509/FTSCY/WS95011 KOPI KENANGAN");
      expect(cleaned.toLowerCase()).toContain("kopi kenangan");
      expect(cleaned).not.toContain("TRSF");
      expect(cleaned).not.toContain("0509/FTSCY/WS95011");
    });
  });

  describe("BCA E-Statement / Mutasi Parsing", () => {
    const mockCategories: Category[] = [
      { id: "c-food", name: "Food & Dining", emoji: "/icons/makan.png", type: "expense", user_id: "u1" },
      { id: "c-salary", name: "Salary", emoji: "/icons/gaji.png", type: "income", user_id: "u1" },
    ];

    it("parses typical BCA mutasi lines accurately with DB/CR detection", () => {
      const bcaSnippet = `
05/09 TRSF E-BANKING CR 0509/FTSCY/WS95011 GAJI BULANAN 15.000.000,00 25.000.000,00
12/09 QRIS KOPI KENANGAN 45.000,00 DB 24.955.000,00
15/09 BIAYA ADM 15.000,00 DB 24.940.000,00
      `;

      const result = parseStatementText(bcaSnippet, [], mockCategories);
      expect(result.detectedFormat).toBe("bca");
      expect(result.items.length).toBe(3);

      // Item 1: Inflow / Income
      expect(result.items[0].type).toBe("income");
      expect(result.items[0].amount).toBe(15000000);
      expect(result.items[0].selected).toBe(true);

      // Item 2: Outflow / Expense (Kopi Kenangan)
      expect(result.items[1].type).toBe("expense");
      expect(result.items[1].amount).toBe(45000);
      expect(result.items[1].cleanDescription.toLowerCase()).toContain("kopi kenangan");

      // Item 3: Fee
      expect(result.items[2].type).toBe("expense");
      expect(result.items[2].amount).toBe(15000);
    });
  });

  describe("Mandiri Livin Mutasi Parsing", () => {
    it("parses Mandiri format with D/K and DD/MM/YYYY", () => {
      const mandiriSnippet = `
12/09/2026 QRIS INDOMARET 12345 D 75.000,00
13/09/2026 TRANSFER DARI PT INVESTAMA K 5.000.000,00
      `;

      const result = parseStatementText(mandiriSnippet, [], []);
      expect(result.detectedFormat).toBe("mandiri");
      expect(result.items.length).toBe(2);

      expect(result.items[0].type).toBe("expense");
      expect(result.items[0].amount).toBe(75000);
      expect(result.items[0].date).toBe("2026-09-12");

      expect(result.items[1].type).toBe("income");
      expect(result.items[1].amount).toBe(5000000);
      expect(result.items[1].date).toBe("2026-09-13");
    });
  });

  describe("Jenius & CSV Parsing", () => {
    it("parses Jenius statement lines with Money Out / Money In", () => {
      const jeniusSnippet = `
14 Sep 2026 Money Out - STARBUCKS -55.000
15 Sep 2026 Money In - Freelance +1.500.000
      `;

      const result = parseStatementText(jeniusSnippet, [], []);
      expect(result.detectedFormat).toBe("jenius");
      expect(result.items.length).toBe(2);

      expect(result.items[0].type).toBe("expense");
      expect(result.items[0].amount).toBe(55000);

      expect(result.items[1].type).toBe("income");
      expect(result.items[1].amount).toBe(1500000);
    });

    it("parses Generic CSV data with comma delimiters", () => {
      const csvSnippet = `
Date,Description,Amount,Type
2026-09-20,Makan Siang Resto Padang,45000,expense
2026-09-21,Bonus Kinerja,2000000,income
      `;

      const result = parseStatementText(csvSnippet, [], []);
      expect(result.items.length).toBe(2);
      expect(result.items[0].amount).toBe(45000);
      expect(result.items[0].type).toBe("expense");
      expect(result.items[1].amount).toBe(2000000);
      expect(result.items[1].type).toBe("income");
    });
  });

  describe("Smart Deduplication Detection", () => {
    it("detects existing transactions and unchecks duplicates automatically", () => {
      const existing: Transaction[] = [
        {
          id: "tx-existing-1",
          amount: 45000,
          type: "expense",
          occurred_on: "2026-09-12",
          category_id: "c-food",
          user_id: "u1",
          note: "QRIS Kopi Kenangan",
        },
      ];

      const input = `
12/09/2026 QRIS KOPI KENANGAN D 45.000,00
12/09/2026 MAKAN SOTO AYAM D 25.000,00
      `;

      const result = parseStatementText(input, existing, []);
      expect(result.items.length).toBe(2);

      // Item 0 matches existing tx on 2026-09-12 of 45000 expense!
      expect(result.items[0].isDuplicate).toBe(true);
      expect(result.items[0].selected).toBe(false);
      expect(result.items[0].duplicateReason).toBeDefined();

      // Item 1 is new!
      expect(result.items[1].isDuplicate).toBe(false);
      expect(result.items[1].selected).toBe(true);
    });
  });

  describe("Print Preview & Tabular Copy-Paste Formats", () => {
    it("parses KlikBCA print preview copy-paste containing 0000 branch code", () => {
      const printoutSnippet = `
TGL    KETERANGAN                                     CBG   MUTASI          SALDO
05/09  TRSF E-BANKING CR 0509/FTSCY/WS95011 GAJI      0000  10.000.000,00   15.000.000,00
12/09  QRIS KOPI KENANGAN                             0000  38.000,00 DB    14.962.000,00
      `;

      const result = parseStatementText(printoutSnippet, [], []);
      expect(result.items.length).toBe(2);

      // Inflow
      expect(result.items[0].type).toBe("income");
      expect(result.items[0].amount).toBe(10000000);
      expect(result.items[0].cleanDescription).not.toContain("0000");

      // Outflow
      expect(result.items[1].type).toBe("expense");
      expect(result.items[1].amount).toBe(38000);
      expect(result.items[1].cleanDescription.toLowerCase()).toContain("kopi kenangan");
      expect(result.items[1].cleanDescription).not.toContain("0000");
    });

    it("parses tab-separated mutasi copied from web banking table", () => {
      const tabSnippet = "15/09/2026\tPEMBAYARAN LISTRIK PLN\t500.000,00\tDB\t10.000.000,00\n16/09/2026\tTRANSFER MASUK DARI BUDI\t2.500.000,00\tCR\t12.500.000,00";
      const result = parseStatementText(tabSnippet, [], []);
      expect(result.items.length).toBe(2);

      expect(result.items[0].type).toBe("expense");
      expect(result.items[0].amount).toBe(500000);

      expect(result.items[1].type).toBe("income");
      expect(result.items[1].amount).toBe(2500000);
    });
  });
});
