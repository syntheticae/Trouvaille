import { describe, it, expect } from "vitest";
import {
  parseNaturalTransaction,
  parseMultiNaturalTransactions,
  splitIntoClauses,
} from "../src/lib/nlpParser";
import type { Category, Wallet } from "../src/lib/types";

describe("Multi-Transaction NLP Parser & Indonesian Slang Suite", () => {
  const mockCategories: Category[] = [
    {
      id: "c-kopi",
      user_id: "u1",
      name: "Kopi",
      emoji: "/icons/cafe.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-makanan",
      user_id: "u1",
      name: "Makanan",
      emoji: "/icons/makanan.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-transport",
      user_id: "u1",
      name: "Transportasi",
      emoji: "/icons/transportasi.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-gaji",
      user_id: "u1",
      name: "Gaji",
      emoji: "/icons/gaji.png",
      type: "income",
      is_default: true,
      created_at: "",
    },
  ];

  const mockWallets: Wallet[] = [
    {
      id: "w-bca",
      user_id: "u1",
      name: "BCA",
      icon: "/icons/Budgets/BCA.png",
      created_at: "",
    },
    {
      id: "w-jago",
      user_id: "u1",
      name: "Jago",
      icon: "/icons/Budgets/Jago.png",
      created_at: "",
    },
    {
      id: "w-gopay",
      user_id: "u1",
      name: "GoPay",
      icon: "/icons/Budgets/Gopay.png",
      created_at: "",
    },
    {
      id: "w-cash",
      user_id: "u1",
      name: "Cash",
      icon: "/icons/Budgets/Cash.png",
      created_at: "",
    },
  ];

  const referenceDate = new Date("2026-09-17T12:00:00Z");

  describe("Indonesian Slang Numbers", () => {
    it("parses 'gocap' as 50.000", () => {
      const result = parseNaturalTransaction("bensin gocap", mockCategories, mockWallets, referenceDate);
      expect(result.amount).toBe(50000);
      expect(result.categoryId).toBe("c-transport");
    });

    it("parses 'ceban' as 10.000 and 'goceng' as 5.000", () => {
      const cebanRes = parseNaturalTransaction("kopi ceban", mockCategories, mockWallets, referenceDate);
      expect(cebanRes.amount).toBe(10000);

      const gocengRes = parseNaturalTransaction("parkir goceng", mockCategories, mockWallets, referenceDate);
      expect(gocengRes.amount).toBe(5000);
    });

    it("parses multi-slang multiplier '2 ceban' as 20.000", () => {
      const result = parseNaturalTransaction("makan 2 ceban", mockCategories, mockWallets, referenceDate);
      expect(result.amount).toBe(20000);
    });

    it("parses 'setengah juta' and 'sejutaan'", () => {
      const halfMillion = parseNaturalTransaction("belanja setengah juta", mockCategories, mockWallets, referenceDate);
      expect(halfMillion.amount).toBe(500000);

      const oneMillion = parseNaturalTransaction("bonus sejutaan bca", mockCategories, mockWallets, referenceDate);
      expect(oneMillion.amount).toBe(1000000);
    });
  });

  describe("Clause Splitting Intelligence", () => {
    it("correctly splits compound multi-transactions with 'terus' and 'dan'", () => {
      const input = "Beli kopi 25rb pakai BCA terus bensin 50rb Cash dan parkir 5rb";
      const clauses = splitIntoClauses(input);
      expect(clauses).toHaveLength(3);
      expect(clauses[0]).toContain("kopi 25rb");
      expect(clauses[1]).toContain("bensin 50rb");
      expect(clauses[2]).toContain("parkir 5rb");
    });

    it("does NOT split single food items containing 'dan' when only one amount is present", () => {
      const input = "Nasi padang dan es teh 35k";
      const clauses = splitIntoClauses(input);
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toBe("Nasi padang dan es teh 35k");
    });

    it("splits comma-separated list of expenses", () => {
      const input = "Kopi 25k, bensin 50k, parkir 5k";
      const clauses = splitIntoClauses(input);
      expect(clauses).toHaveLength(3);
    });
  });

  describe("Multi-Transaction Parsing & Context Inheritance", () => {
    it("extracts 3 separate transactions from a compound voice sentence", () => {
      const input = "Beli kopi 25rb pakai BCA terus bensin 50rb Cash dan parkir 5rb";
      const results = parseMultiNaturalTransactions(
        input,
        mockCategories,
        mockWallets,
        referenceDate,
      );

      expect(results).toHaveLength(3);

      // 1. Kopi 25k BCA
      expect(results[0].amount).toBe(25000);
      expect(results[0].categoryId).toBe("c-kopi");
      expect(results[0].walletId).toBe("w-bca");

      // 2. Bensin 50k Cash
      expect(results[1].amount).toBe(50000);
      expect(results[1].categoryId).toBe("c-transport");
      expect(results[1].walletId).toBe("w-cash");

      // 3. Parkir 5k
      expect(results[2].amount).toBe(5000);
      expect(results[2].categoryId).toBe("c-transport");
    });

    it("propagates wallet when only one wallet is specified in companion clause", () => {
      const input = "Kopi 25rb sama roti 15rb pake BCA";
      const results = parseMultiNaturalTransactions(
        input,
        mockCategories,
        mockWallets,
        referenceDate,
      );

      expect(results).toHaveLength(2);
      expect(results[0].amount).toBe(25000);
      expect(results[0].walletId).toBe("w-bca");

      expect(results[1].amount).toBe(15000);
      expect(results[1].walletId).toBe("w-bca");
    });

    it("propagates relative date across all clauses", () => {
      const input = "Kemarin beli kopi 25k terus bensin 50k";
      const results = parseMultiNaturalTransactions(
        input,
        mockCategories,
        mockWallets,
        referenceDate,
      );

      expect(results).toHaveLength(2);
      expect(results[0].dateLabel).toBe("Yesterday");
      expect(results[1].dateLabel).toBe("Yesterday");
      expect(results[1].date.toISOString().slice(0, 10)).toBe("2026-09-16");
    });

    it("parses e-wallet top-up transfer correctly", () => {
      const input = "Top up gopay 100k dari bca";
      const result = parseNaturalTransaction(
        input,
        mockCategories,
        mockWallets,
        referenceDate,
      );

      expect(result.type).toBe("transfer");
      expect(result.amount).toBe(100000);
      expect(result.walletId).toBe("w-bca");
      expect(result.toWalletId).toBe("w-gopay");
    });
  });
});
