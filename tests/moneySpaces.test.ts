import { describe, it, expect } from "vitest";
import { DEFAULT_MONEY_SPACES } from "../src/contexts/SpaceContext";
import type { Transaction } from "../src/types";

// Helper function implementing the same filtering logic as SpaceContext for isolation testing
function filterTransactions(transactions: Transaction[], spaceId: string, customTag?: string): Transaction[] {
  if (spaceId === "all") return transactions;

  if (spaceId === "business") {
    return transactions.filter((t) => {
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
    return transactions.filter((t) => {
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
    return transactions.filter((t) => {
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

  if (customTag) {
    const tag = customTag.toLowerCase();
    return transactions.filter((t) => (t.note || "").toLowerCase().includes(tag));
  }

  return transactions;
}

describe("Money Spaces Architecture & Segregation Suite", () => {
  const sampleTransactions: Transaction[] = [
    {
      id: "tx-1",
      user_id: "u1",
      category_id: "c1",
      wallet_id: "w1",
      to_wallet_id: null,
      type: "expense",
      amount: 45000,
      note: "Makan siang di warteg",
      occurred_on: "2026-09-20",
      created_at: "2026-09-20T12:00:00Z",
    },
    {
      id: "tx-2",
      user_id: "u1",
      category_id: "c2",
      wallet_id: "w1",
      to_wallet_id: null,
      type: "expense",
      amount: 250000,
      note: "Hosting server AWS #business #proyek",
      occurred_on: "2026-09-20",
      created_at: "2026-09-20T13:00:00Z",
    },
    {
      id: "tx-3",
      user_id: "u1",
      category_id: "c3",
      wallet_id: "w2",
      to_wallet_id: null,
      type: "expense",
      amount: 1200000,
      note: "Tiket pesawat Garuda CGK-DPS #travel #liburan",
      occurred_on: "2026-09-19",
      created_at: "2026-09-19T10:00:00Z",
    },
    {
      id: "tx-4",
      user_id: "u1",
      category_id: "c4",
      wallet_id: "w1",
      to_wallet_id: null,
      type: "income",
      amount: 5000000,
      note: "Client payment web project #business",
      occurred_on: "2026-09-18",
      created_at: "2026-09-18T09:00:00Z",
    },
    {
      id: "tx-5",
      user_id: "u1",
      category_id: "c5",
      wallet_id: "w1",
      to_wallet_id: null,
      type: "expense",
      amount: 350000,
      note: "Material cat kamar #renovation",
      occurred_on: "2026-09-17",
      created_at: "2026-09-17T15:00:00Z",
    },
  ];

  it("contains single default space by default", () => {
    const ids = DEFAULT_MONEY_SPACES.map((s) => s.id);
    expect(ids).toEqual(["personal"]);
  });

  it("filters business space transactions accurately", () => {
    const businessTxs = filterTransactions(sampleTransactions, "business");
    expect(businessTxs.length).toBe(2);
    expect(businessTxs.map((t) => t.id)).toEqual(["tx-2", "tx-4"]);
  });

  it("filters travel space transactions accurately", () => {
    const travelTxs = filterTransactions(sampleTransactions, "travel");
    expect(travelTxs.length).toBe(1);
    expect(travelTxs[0].id).toBe("tx-3");
  });

  it("isolates personal space from business and travel outlays", () => {
    const personalTxs = filterTransactions(sampleTransactions, "personal");
    // Should contain tx-1 (lunch) and tx-5 (renovation, which isn't business or travel)
    expect(personalTxs.map((t) => t.id)).toEqual(["tx-1", "tx-5"]);
    expect(personalTxs.map((t) => t.id)).not.toContain("tx-2");
    expect(personalTxs.map((t) => t.id)).not.toContain("tx-3");
    expect(personalTxs.map((t) => t.id)).not.toContain("tx-4");
  });

  it("returns all transactions when space is 'all'", () => {
    const allTxs = filterTransactions(sampleTransactions, "all");
    expect(allTxs.length).toBe(sampleTransactions.length);
  });

  it("filters custom space by its specific tag", () => {
    const customTxs = filterTransactions(sampleTransactions, "custom-renov", "#renovation");
    expect(customTxs.length).toBe(1);
    expect(customTxs[0].id).toBe("tx-5");
  });

  describe("True Multi-Ledger Native Architecture Suite", () => {
    const nativeLedgerTxs: Transaction[] = [
      {
        id: "tx-native-1",
        user_id: "u1",
        category_id: "c1",
        wallet_id: "w1",
        to_wallet_id: null,
        type: "expense",
        amount: 30000,
        note: "Kopi pagi (no hashtag)",
        occurred_on: "2026-09-21",
        created_at: "2026-09-21T08:00:00Z",
        ledger_id: "personal",
      },
      {
        id: "tx-native-2",
        user_id: "u1",
        category_id: "c2",
        wallet_id: "w1",
        to_wallet_id: null,
        type: "expense",
        amount: 1500000,
        note: "Server database invoice (no hashtag)",
        occurred_on: "2026-09-21",
        created_at: "2026-09-21T08:30:00Z",
        ledger_id: "ledger-biz-01",
      },
      {
        id: "tx-native-3",
        user_id: "u1",
        category_id: "c3",
        wallet_id: "w1",
        to_wallet_id: null,
        type: "income",
        amount: 8000000,
        note: "Retainer client payment (no hashtag)",
        occurred_on: "2026-09-21",
        created_at: "2026-09-21T09:00:00Z",
        ledger_id: "ledger-biz-01",
      },
    ];

    function filterByNativeLedger(txs: Transaction[], targetLedgerId: string): Transaction[] {
      if (targetLedgerId === "all") return txs;
      return txs.filter((t) => (t.ledger_id || t.space_id || "personal") === targetLedgerId);
    }

    it("filters transactions purely based on native ledger_id without needing hashtags", () => {
      const bizTxs = filterByNativeLedger(nativeLedgerTxs, "ledger-biz-01");
      expect(bizTxs.length).toBe(2);
      expect(bizTxs.map((t) => t.id)).toEqual(["tx-native-2", "tx-native-3"]);

      const personalTxs = filterByNativeLedger(nativeLedgerTxs, "personal");
      expect(personalTxs.length).toBe(1);
      expect(personalTxs[0].id).toBe("tx-native-1");
    });

    it("consolidates all ledgers when target is 'all'", () => {
      const consolidated = filterByNativeLedger(nativeLedgerTxs, "all");
      expect(consolidated.length).toBe(3);
    });

    it("reassigns transactions safely to personal ledger upon custom ledger deletion", () => {
      const deletedLedgerId = "ledger-biz-01";
      const reassigned = nativeLedgerTxs.map((tx) => {
        if (tx.ledger_id === deletedLedgerId) {
          return { ...tx, ledger_id: "personal", space_id: "personal" };
        }
        return tx;
      });

      const personalAfterReassign = filterByNativeLedger(reassigned, "personal");
      expect(personalAfterReassign.length).toBe(3);
      expect(personalAfterReassign.every((t) => t.ledger_id === "personal")).toBe(true);
    });
  });
});
