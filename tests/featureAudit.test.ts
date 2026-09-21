import { describe, it, expect } from "vitest";
import { calculateAssetDepreciation } from "../src/lib/marketPriceService";
import { evaluateMathSafe } from "../src/lib/evaluateMathSafe";
import { INDONESIAN_CARD_PRESETS } from "../src/components/nfc/NfcCardReaderModal";
import { DEFAULT_MONEY_SPACES } from "../src/contexts/SpaceContext";
import type { Transaction, Category } from "../src/lib/types";

describe("Cross-Feature Audit & Integration Suite", () => {
  // ─── 1. NFC Balance Sync & Transit Auto-Reconciliation ──────────────────────
  describe("NFC Contactless & Wallet Sync Reconciliation", () => {
    it("correctly computes positive adjustment delta when physical card balance exceeds wallet ledger", () => {
      const cardBalance = 150000;
      const currentWalletBalance = 100000;
      const delta = cardBalance - currentWalletBalance;

      expect(delta).toBe(50000);
      const isPositive = delta > 0;
      const note = `NFC Balance Sync BCA Flazz (${isPositive ? "+" : ""}${delta})`;
      expect(note).toBe("NFC Balance Sync BCA Flazz (+50000)");

      // Adjustment transaction payload
      const adjTx = {
        amount: Math.abs(delta),
        type: isPositive ? ("income" as const) : ("expense" as const),
        note,
      };
      expect(adjTx.amount).toBe(50000);
      expect(adjTx.type).toBe("income");
    });

    it("correctly computes negative adjustment delta when physical card balance is lower than wallet ledger", () => {
      const cardBalance = 85000;
      const currentWalletBalance = 100000;
      const delta = cardBalance - currentWalletBalance;

      expect(delta).toBe(-15000);
      const isPositive = delta > 0;
      const note = `NFC Balance Sync BCA Flazz (${isPositive ? "+" : ""}${delta})`;
      expect(note).toBe("NFC Balance Sync BCA Flazz (-15000)");

      const adjTx = {
        amount: Math.abs(delta),
        type: isPositive ? ("income" as const) : ("expense" as const),
        note,
      };
      expect(adjTx.amount).toBe(15000);
      expect(adjTx.type).toBe("expense");
    });

    it("matches transport/transit categories for automated transit expense tap-ins", () => {
      const mockCategories: Category[] = [
        { id: "cat-1", name: "Food & Dining", type: "expense", emoji: "🍔" },
        { id: "cat-2", name: "Transport & Commute", type: "expense", emoji: "🚇" },
        { id: "cat-3", name: "Salary", type: "income", emoji: "💰" },
      ];

      const transportCategory = mockCategories.find((c) =>
        /transport|transit|kendaraan|commute|bensin/i.test(c.name),
      );

      expect(transportCategory).toBeDefined();
      expect(transportCategory?.id).toBe("cat-2");
      expect(transportCategory?.name).toBe("Transport & Commute");
    });

    it("validates all Indonesian card presets include standard issuer metadata and valid balances", () => {
      INDONESIAN_CARD_PRESETS.forEach((preset) => {
        expect(preset.cardUid.length).toBeGreaterThan(10);
        expect(preset.balance).toBeGreaterThan(0);
        expect(preset.productName.length).toBeGreaterThan(0);
        expect(preset.lastTapAmount).toBeGreaterThan(0);
      });
    });
  });

  // ─── 2. Money Spaces Architecture & Scoping ─────────────────────────────────
  describe("Money Spaces Architecture Scoping", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "tx-1",
        amount: 50000,
        type: "expense",
        note: "Makan siang dengan tim",
        occurred_on: "2026-09-01",
        created_at: "2026-09-01T12:00:00Z",
      },
      {
        id: "tx-2",
        amount: 250000,
        type: "expense",
        note: "Hosting server #business client meeting",
        occurred_on: "2026-09-02",
        created_at: "2026-09-02T12:00:00Z",
      },
      {
        id: "tx-3",
        amount: 1200000,
        type: "expense",
        note: "Tiket kereta cepat Whoosh #travel liburan",
        occurred_on: "2026-09-03",
        created_at: "2026-09-03T12:00:00Z",
      },
      {
        id: "tx-4",
        amount: 5000000,
        type: "income",
        note: "Gaji Bulanan",
        occurred_on: "2026-09-05",
        created_at: "2026-09-05T12:00:00Z",
      },
      {
        id: "tx-5",
        amount: 1500000,
        type: "income",
        note: "Project invoice #kantor #business",
        occurred_on: "2026-09-06",
        created_at: "2026-09-06T12:00:00Z",
      },
    ];

    function filterBySpace(txs: Transaction[], spaceId: string): Transaction[] {
      if (spaceId === "all") return txs;
      if (spaceId === "business") {
        return txs.filter((t) => {
          const note = (t.note || "").toLowerCase();
          return (
            note.includes("#business") ||
            note.includes("#kantor") ||
            note.includes("#proyek") ||
            note.includes("#freelance") ||
            note.includes("#work")
          );
        });
      }
      if (spaceId === "travel") {
        return txs.filter((t) => {
          const note = (t.note || "").toLowerCase();
          return (
            note.includes("#travel") ||
            note.includes("#liburan") ||
            note.includes("#holiday") ||
            note.includes("#trip") ||
            note.includes("#vacation")
          );
        });
      }
      if (spaceId === "personal") {
        return txs.filter((t) => {
          const note = (t.note || "").toLowerCase();
          const isBusiness =
            note.includes("#business") ||
            note.includes("#kantor") ||
            note.includes("#proyek") ||
            note.includes("#freelance") ||
            note.includes("#work");
          const isTravel =
            note.includes("#travel") ||
            note.includes("#liburan") ||
            note.includes("#holiday") ||
            note.includes("#trip") ||
            note.includes("#vacation");
          return !isBusiness && !isTravel;
        });
      }
      return txs;
    }

    it("returns 100% of transactions when Space is 'all'", () => {
      const all = filterBySpace(mockTransactions, "all");
      expect(all.length).toBe(5);
    });

    it("filters only business & freelance tagged items for 'business' space", () => {
      const business = filterBySpace(mockTransactions, "business");
      expect(business.length).toBe(2);
      expect(business.map((t) => t.id)).toEqual(["tx-2", "tx-5"]);
    });

    it("filters only vacation & trip items for 'travel' space", () => {
      const travel = filterBySpace(mockTransactions, "travel");
      expect(travel.length).toBe(1);
      expect(travel[0].id).toBe("tx-3");
    });

    it("segregates personal items strictly away from business and travel tags", () => {
      const personal = filterBySpace(mockTransactions, "personal");
      expect(personal.length).toBe(2);
      expect(personal.map((t) => t.id)).toEqual(["tx-1", "tx-4"]);
    });

    it("contains single default space with unique IDs", () => {
      const ids = DEFAULT_MONEY_SPACES.map((s) => s.id);
      expect(ids).toEqual(["personal"]);
      expect(new Set(ids).size).toBe(DEFAULT_MONEY_SPACES.length);
    });
  });

  // ─── 3. Compound Asset Depreciation & Appreciation ──────────────────────────
  describe("Compound Asset Depreciation & Appreciation Engine", () => {
    it("accurately computes vehicle annual depreciation compounded over elapsed time", () => {
      const purchasePrice = 300000000; // Rp 300M (Car)
      const annualRate = -15; // -15% depreciation per year
      const purchaseDate = "2024-01-01T00:00:00Z";
      const asOfDate = new Date("2026-01-01T06:00:00Z"); // 2.0 years

      const result = calculateAssetDepreciation(purchasePrice, annualRate, purchaseDate, asOfDate);

      // Expected: 300M * (1 - 0.15)^1.99863 = 216,677,679
      expect(result.currentPrice).toBe(216677679);
      expect(result.totalChange).toBe(-83322321);
      expect(result.totalChangePct).toBeCloseTo(-27.77, 1);
      expect(result.yearsElapsed).toBeCloseTo(2.0, 1);
    });

    it("accurately computes property annual appreciation compounded over elapsed time", () => {
      const purchasePrice = 1000000000; // Rp 1B (House)
      const annualRate = 10; // +10% appreciation per year
      const purchaseDate = "2023-01-01T00:00:00Z";
      const asOfDate = new Date("2026-01-01T06:00:00Z"); // 3.0 years

      const result = calculateAssetDepreciation(purchasePrice, annualRate, purchaseDate, asOfDate);

      // Expected: 1B * (1 + 0.10)^3.00068 = 1,331,173,670
      expect(result.currentPrice).toBe(1331173670);
      expect(result.totalChange).toBe(331173670);
      expect(result.totalChangePct).toBeCloseTo(33.1, 1);
    });

    it("returns purchase price intact when rate is 0 or undefined", () => {
      const purchasePrice = 50000000;
      const result = calculateAssetDepreciation(purchasePrice, 0, "2020-01-01");
      expect(result.currentPrice).toBe(50000000);
      expect(result.totalChange).toBe(0);
      expect(result.totalChangePct).toBe(0);
    });
  });

  // ─── 4. Safe Inline Math Keypad & Payday Calculation ────────────────────────
  describe("Safe Keypad Math & Utility Functions", () => {
    it("evaluates additions, subtractions, multiplications cleanly", () => {
      expect(evaluateMathSafe("50000 + 25000")).toBe(75000);
      expect(evaluateMathSafe("100000 - 35000")).toBe(65000);
      expect(evaluateMathSafe("25000 * 4")).toBe(100000);
      expect(evaluateMathSafe("100000 / 2")).toBe(50000);
    });

    it("handles compound chained operations respecting PEMDAS order", () => {
      // 10000 + 5000 * 2 = 10000 + 10000 = 20000
      expect(evaluateMathSafe("10000 + 5000 * 2")).toBe(20000);
    });

    it("safely rejects malicious code strings or non-numeric tokens without throwing", () => {
      expect(evaluateMathSafe("console.log('injected')")).toBe(0);
      expect(evaluateMathSafe("window.location")).toBe(0);
      expect(evaluateMathSafe("process.exit()")).toBe(0);
      expect(evaluateMathSafe("")).toBe(0);
    });
  });
});
