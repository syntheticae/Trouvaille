import { describe, it, expect } from "vitest";
import { parseNaturalTransaction } from "../src/lib/nlpParser";
import type { Category, Wallet } from "../src/lib/types";

describe("Natural Language Transaction Parser Test Suite", () => {
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
      id: "w-cash",
      user_id: "u1",
      name: "Cash",
      icon: "/icons/Budgets/Cash.png",
      created_at: "",
    },
  ];

  const referenceDate = new Date("2026-09-09T14:00:00Z");

  it("parses colloquial Indonesian expenses: 'Kopi 35rb bca'", () => {
    const result = parseNaturalTransaction(
      "Kopi 35rb bca",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.amount).toBe(35000);
    expect(result.type).toBe("expense");
    expect(result.categoryId).toBe("c-kopi");
    expect(result.categoryName).toBe("Kopi");
    expect(result.walletId).toBe("w-bca");
    expect(result.walletName).toBe("BCA");
    expect(result.dateLabel).toBe("Today");
  });

  it("parses category alias and relative date: 'Makan siang padang 45k jago kemarin'", () => {
    const result = parseNaturalTransaction(
      "Makan siang padang 45k jago kemarin",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.amount).toBe(45000);
    expect(result.type).toBe("expense");
    expect(result.categoryId).toBe("c-makanan");
    expect(result.categoryName).toBe("Makanan");
    expect(result.walletId).toBe("w-jago");
    expect(result.walletName).toBe("Jago");
    expect(result.dateLabel).toBe("Yesterday");
    expect(result.date.toISOString().slice(0, 10)).toBe("2026-09-08");
  });

  it("parses millions format: 'Gaji kantor 18.5jt bca'", () => {
    const result = parseNaturalTransaction(
      "Gaji kantor 18.5jt bca",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.amount).toBe(18500000);
    expect(result.type).toBe("income");
    expect(result.categoryId).toBe("c-gaji");
    expect(result.walletId).toBe("w-bca");
  });

  it("parses transfer routes: 'Transfer 500k dari bca ke jago'", () => {
    const result = parseNaturalTransaction(
      "Transfer 500k dari bca ke jago",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.amount).toBe(500000);
    expect(result.type).toBe("transfer");
    expect(result.walletId).toBe("w-bca");
    expect(result.walletName).toBe("BCA");
    expect(result.toWalletId).toBe("w-jago");
    expect(result.toWalletName).toBe("Jago");
  });

  it("handles wallet alias 'tunai' matching Cash wallet: 'Bensin 100rb tunai'", () => {
    const result = parseNaturalTransaction(
      "Bensin 100rb tunai",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.amount).toBe(100000);
    expect(result.categoryId).toBe("c-transport");
    expect(result.walletId).toBe("w-cash");
    expect(result.walletName).toBe("Cash");
  });

  it("handles dotted Indonesian numbers: 'Rp 150.000 supermarket bca'", () => {
    const result = parseNaturalTransaction(
      "Rp 150.000 supermarket bca",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.amount).toBe(150000);
    expect(result.walletId).toBe("w-bca");
  });

  it("parses ATM cash withdrawal: 'Tarik tunai 500 ribu dari BCA'", () => {
    const result = parseNaturalTransaction(
      "Tarik tunai 500 ribu dari BCA",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.type).toBe("transfer");
    expect(result.amount).toBe(500000);
    expect(result.walletId).toBe("w-bca");
    expect(result.walletName).toBe("BCA");
    expect(result.toWalletId).toBe("w-cash");
    expect(result.toWalletName).toBe("Cash");
    expect(result.categoryId).toBeNull();
    expect(result.note).toBe("Tarik Tunai");
  });

  it("parses cash deposit: 'Setor tunai 1 juta ke BCA'", () => {
    const result = parseNaturalTransaction(
      "Setor tunai 1 juta ke BCA",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.type).toBe("transfer");
    expect(result.amount).toBe(1000000);
    expect(result.walletId).toBe("w-cash");
    expect(result.walletName).toBe("Cash");
    expect(result.toWalletId).toBe("w-bca");
    expect(result.toWalletName).toBe("BCA");
    expect(result.categoryId).toBeNull();
    expect(result.note).toBe("Setor Tunai");
  });

  it("parses expanded colloquial income: 'Dapet duit 200rb'", () => {
    const result = parseNaturalTransaction(
      "Dapet duit 200rb",
      mockCategories,
      mockWallets,
      referenceDate,
    );

    expect(result.type).toBe("income");
    expect(result.amount).toBe(200000);
  });

  it("parses angpao and cashback as income: 'Angpao 500k' and 'Cashback 25rb'", () => {
    const angpaoResult = parseNaturalTransaction(
      "Angpao 500k",
      mockCategories,
      mockWallets,
      referenceDate,
    );
    expect(angpaoResult.type).toBe("income");
    expect(angpaoResult.amount).toBe(500000);

    const cashbackResult = parseNaturalTransaction(
      "Cashback 25rb",
      mockCategories,
      mockWallets,
      referenceDate,
    );
    expect(cashbackResult.type).toBe("income");
    expect(cashbackResult.amount).toBe(25000);
  });
});

