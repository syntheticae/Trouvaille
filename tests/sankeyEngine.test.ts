import { describe, it, expect } from "vitest";
import { calculateSankeyFlow } from "../src/lib/sankeyEngine";
import type { Transaction, Category } from "../src/lib/types";

describe("Sankey Flow Calculation Engine Suite", () => {
  const mockCategories: Category[] = [
    {
      id: "c-salary",
      user_id: "u1",
      name: "Gaji",
      emoji: "/icons/gaji.png",
      type: "income",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-freelance",
      user_id: "u1",
      name: "Freelance",
      emoji: "/icons/freelance.png",
      type: "income",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-rent",
      user_id: "u1",
      name: "Hunian",
      emoji: "/icons/hunian.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-food",
      user_id: "u1",
      name: "Makanan",
      emoji: "/icons/makanan.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
    {
      id: "c-coffee",
      user_id: "u1",
      name: "Kopi",
      emoji: "/icons/cafe.png",
      type: "expense",
      is_default: true,
      created_at: "",
    },
  ];

  const surplusTransactions: Transaction[] = [
    {
      id: "t1",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-salary",
      amount: 20000000,
      type: "income",
      occurred_on: "2026-09-01",
      created_at: "",
    },
    {
      id: "t2",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-freelance",
      amount: 5000000,
      type: "income",
      occurred_on: "2026-09-05",
      created_at: "",
    },
    {
      id: "t3",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-rent",
      amount: 6000000,
      type: "expense",
      occurred_on: "2026-09-02",
      created_at: "",
    },
    {
      id: "t4",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-food",
      amount: 4000000,
      type: "expense",
      occurred_on: "2026-09-03",
      created_at: "",
    },
    {
      id: "t5",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-coffee",
      amount: 1000000,
      type: "expense",
      occurred_on: "2026-09-04",
      created_at: "",
    },
  ];

  it("calculates surplus flow conservation accurately", () => {
    const result = calculateSankeyFlow(surplusTransactions, mockCategories, {
      mode: "category",
    });

    expect(result.telemetry.totalInflow).toBe(25000000);
    expect(result.telemetry.totalOutflow).toBe(11000000);
    expect(result.telemetry.netSavings).toBe(14000000);
    expect(result.telemetry.savingsRatePct).toBe(56);
    expect(result.telemetry.isDeficit).toBe(false);

    // Nodes in 3 columns
    const col0 = result.nodes.filter((n) => n.column === 0);
    const col1 = result.nodes.filter((n) => n.column === 1);
    const col2 = result.nodes.filter((n) => n.column === 2);

    expect(col0.length).toBe(2); // Gaji + Freelance
    expect(col1.length).toBe(1); // Hub
    expect(col1[0].amount).toBe(25000000);

    // Destinations includes 3 expenses + Retained Savings
    expect(col2.some((n) => n.isSavings)).toBe(true);
    const savingsNode = col2.find((n) => n.isSavings);
    expect(savingsNode?.amount).toBe(14000000);

    // Sum of col0 = col1 = sum of col2
    const sumCol0 = col0.reduce((s, n) => s + n.amount, 0);
    const sumCol2 = col2.reduce((s, n) => s + n.amount, 0);
    expect(sumCol0).toBe(25000000);
    expect(sumCol2).toBe(25000000);
  });

  it("generates valid cubic Bézier ribbon link paths", () => {
    const result = calculateSankeyFlow(surplusTransactions, mockCategories);

    expect(result.links.length).toBeGreaterThan(0);
    result.links.forEach((link) => {
      expect(link.pathD).toMatch(
        /^M [\d.]+ [\d.]+ C [\d.]+ [\d.]+, [\d.]+ [\d.]+, [\d.]+ [\d.]+ L [\d.]+ [\d.]+/,
      );
      expect(link.pathD.endsWith("Z")).toBe(true);
      expect(link.value).toBeGreaterThan(0);
    });
  });

  it("handles deficit periods with reserves cushion node", () => {
    const deficitTransactions: Transaction[] = [
      {
        id: "t1",
        user_id: "u1",
        wallet_id: "w1",
        category_id: "c-salary",
        amount: 5000000,
        type: "income",
        occurred_on: "2026-09-01",
        created_at: "",
      },
      {
        id: "t2",
        user_id: "u1",
        wallet_id: "w1",
        category_id: "c-rent",
        amount: 8000000,
        type: "expense",
        occurred_on: "2026-09-02",
        created_at: "",
      },
    ];

    const result = calculateSankeyFlow(deficitTransactions, mockCategories);
    expect(result.telemetry.isDeficit).toBe(true);
    expect(result.telemetry.netSavings).toBe(-3000000);

    // Inflows should include Salary + Deficit Cushion (3M)
    const cushionNode = result.nodes.find((n) => n.isDeficit);
    expect(cushionNode).toBeDefined();
    expect(cushionNode?.amount).toBe(3000000);

    // Flow is preserved at totalOutflow (8M)
    const hub = result.nodes.find((n) => n.isHub);
    expect(hub?.amount).toBe(8000000);
  });

  it("handles zero income periods gracefully", () => {
    const zeroIncomeTransactions: Transaction[] = [
      {
        id: "t1",
        user_id: "u1",
        wallet_id: "w1",
        category_id: "c-food",
        amount: 500000,
        type: "expense",
        occurred_on: "2026-09-02",
        created_at: "",
      },
    ];

    const result = calculateSankeyFlow(zeroIncomeTransactions, mockCategories);
    expect(result.telemetry.totalInflow).toBe(0);
    expect(result.telemetry.totalOutflow).toBe(500000);

    // Should create a "Cash Reserves" node
    const reservesNode = result.nodes.find((n) => n.id === "src-reserves");
    expect(reservesNode).toBeDefined();
    expect(reservesNode?.amount).toBe(500000);
  });

  it("calculates essential vs discretionary telemetry accurately", () => {
    const result = calculateSankeyFlow(surplusTransactions, mockCategories);

    // Rent (6M) and Food (4M) are essential -> 10M
    // Coffee (1M) is discretionary -> 1M
    // Total outflow = 11M -> essential ~91%, discretionary ~9%
    expect(result.telemetry.essentialAmount).toBe(10000000);
    expect(result.telemetry.discretionaryAmount).toBe(1000000);
    expect(result.telemetry.essentialPct).toBe(91);
    expect(result.telemetry.discretionaryPct).toBe(9);
  });
});
