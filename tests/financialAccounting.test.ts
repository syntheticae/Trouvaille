import { describe, it, expect } from "vitest";
import {
  calculateBalanceSheet,
  calculateCashFlowStatement,
  generateFinancialReportPackage,
} from "../src/lib/financialAccounting";
import type { Wallet, Transaction, Category } from "../src/lib/types";

describe("Financial Accounting Engine Test Suite", () => {
  const wallets: Wallet[] = [
    {
      id: "w-cash",
      user_id: "user-1",
      name: "Cash",
      icon: "/icons/Budgets/Cash.png",
      classification: "liquid",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "w-bca",
      user_id: "user-1",
      name: "BCA",
      icon: "/icons/Budgets/BCA.png",
      classification: "liquid",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "w-saham",
      user_id: "user-1",
      name: "Saham",
      icon: "/icons/Budgets/Saham.png",
      classification: "investment",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "w-piutang",
      user_id: "user-1",
      name: "Piutang",
      icon: "/icons/Budgets/Piutang.png",
      classification: "receivable",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "w-cc",
      user_id: "user-1",
      name: "Kartu Kredit",
      icon: "/icons/Budgets/Liabilities.png",
      classification: "credit",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "w-loan",
      user_id: "user-1",
      name: "Liabilities",
      icon: "/icons/Budgets/Liabilities.png",
      classification: "loan",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const categories: Category[] = [
    {
      id: "cat-gaji",
      user_id: "user-1",
      name: "Gaji",
      emoji: "/icons/gaji.png",
      type: "income",
      is_default: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "cat-food",
      user_id: "user-1",
      name: "Makanan",
      emoji: "/icons/makanan.png",
      type: "expense",
      is_default: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "cat-inv",
      user_id: "user-1",
      name: "Investasi",
      emoji: "/icons/investasi.png",
      type: "expense",
      is_default: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "cat-div",
      user_id: "user-1",
      name: "Trading",
      emoji: "/icons/trading.png",
      type: "income",
      is_default: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "cat-loan-pay",
      user_id: "user-1",
      name: "Cicilan",
      emoji: "/icons/admin.png",
      type: "expense",
      is_default: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  it("Neraca / Balance Sheet Invariant: Assets strictly equals Liabilities + Net Worth", () => {
    const transactions: Transaction[] = [
      // Income: Rp 10M to BCA
      {
        id: "tx-1",
        user_id: "user-1",
        amount: 10000000,
        type: "income",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-gaji",
        note: "Monthly Salary",
        occurred_on: "2026-09-01",
        created_at: "2026-09-01T10:00:00Z",
      },
      // Transfer: Rp 3M from BCA to Saham (Investment)
      {
        id: "tx-2",
        user_id: "user-1",
        amount: 3000000,
        type: "transfer",
        wallet_id: "w-bca",
        to_wallet_id: "w-saham",
        category_id: null,
        note: "Buy stock",
        occurred_on: "2026-09-02",
        created_at: "2026-09-02T10:00:00Z",
      },
      // Transfer: Rp 1M from BCA to Piutang (Lend money)
      {
        id: "tx-3",
        user_id: "user-1",
        amount: 1000000,
        type: "transfer",
        wallet_id: "w-bca",
        to_wallet_id: "w-piutang",
        category_id: null,
        note: "Lend to friend",
        occurred_on: "2026-09-03",
        created_at: "2026-09-03T10:00:00Z",
      },
      // Expense: Rp 2M on Credit Card (creates liability of 2M)
      {
        id: "tx-4",
        user_id: "user-1",
        amount: 2000000,
        type: "expense",
        wallet_id: "w-cc",
        to_wallet_id: null,
        category_id: "cat-food",
        note: "Hotel dining",
        occurred_on: "2026-09-04",
        created_at: "2026-09-04T10:00:00Z",
      },
    ];

    const bs = calculateBalanceSheet(wallets, transactions);

    // BCA: 10M - 3M - 1M = 6M (Liquid)
    expect(bs.liquidAssets.total).toBe(6000000);
    // Saham: 3M (Investment)
    expect(bs.investmentAssets.total).toBe(3000000);
    // Piutang: 1M (Receivable)
    expect(bs.receivableAssets.total).toBe(1000000);
    // Total Assets = 6M + 3M + 1M = 10M
    expect(bs.totalAssets).toBe(10000000);

    // Current Liabilities: CC 2M
    expect(bs.currentLiabilities.total).toBe(2000000);
    expect(bs.totalLiabilities).toBe(2000000);

    // Net Worth = 10M - 2M = 8M
    expect(bs.netWorth).toBe(8000000);

    // Accounting check
    expect(bs.isBalanced).toBe(true);
    expect(bs.discrepancy).toBe(0);
    expect(bs.totalAssets).toBe(bs.totalLiabilities + bs.netWorth);
  });

  it("Cash Flow Statement: accurately partitions 3 activities (PSAK 2 / IAS 7)", () => {
    const transactions: Transaction[] = [
      // Operating Inflow: Rp 10.000.000 (Salary)
      {
        id: "tx-1",
        user_id: "user-1",
        amount: 10000000,
        type: "income",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-gaji",
        note: "Salary",
        occurred_on: "2026-09-01",
        created_at: "2026-09-01T10:00:00Z",
      },
      // Operating Outflow: Rp 2.500.000 (Food)
      {
        id: "tx-2",
        user_id: "user-1",
        amount: 2500000,
        type: "expense",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-food",
        note: "Groceries & Food",
        occurred_on: "2026-09-02",
        created_at: "2026-09-02T10:00:00Z",
      },
      // Investing Inflow: Rp 500.000 (Trading gain)
      {
        id: "tx-3",
        user_id: "user-1",
        amount: 500000,
        type: "income",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-div",
        note: "Stock dividend",
        occurred_on: "2026-09-03",
        created_at: "2026-09-03T10:00:00Z",
      },
      // Investing Outflow: Rp 1.500.000 (Investasi)
      {
        id: "tx-4",
        user_id: "user-1",
        amount: 1500000,
        type: "expense",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-inv",
        note: "Mutual fund buy",
        occurred_on: "2026-09-04",
        created_at: "2026-09-04T10:00:00Z",
      },
      // Financing Outflow: Rp 1.000.000 (Cicilan)
      {
        id: "tx-5",
        user_id: "user-1",
        amount: 1000000,
        type: "expense",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-loan-pay",
        note: "Loan payment",
        occurred_on: "2026-09-05",
        created_at: "2026-09-05T10:00:00Z",
      },
      // Internal Transfer (should have 0 impact on cash flows)
      {
        id: "tx-6",
        user_id: "user-1",
        amount: 500000,
        type: "transfer",
        wallet_id: "w-bca",
        to_wallet_id: "w-cash",
        category_id: null,
        note: "ATM withdrawal",
        occurred_on: "2026-09-06",
        created_at: "2026-09-06T10:00:00Z",
      },
    ];

    const cf = calculateCashFlowStatement(transactions, categories, wallets);

    // Operating: Inflow 10M, Outflow 2.5M -> Net OCF = 7.5M
    expect(cf.operatingInflow).toBe(10000000);
    expect(cf.operatingOutflow).toBe(2500000);
    expect(cf.netOperatingCashFlow).toBe(7500000);

    // Investing: Inflow 500k, Outflow 1.5M -> Net ICF = -1.0M
    expect(cf.investingInflow).toBe(500000);
    expect(cf.investingOutflow).toBe(1500000);
    expect(cf.netInvestingCashFlow).toBe(-1000000);

    // Financing: Outflow 1.0M -> Net FCF = -1.0M
    expect(cf.financingInflow).toBe(0);
    expect(cf.financingOutflow).toBe(1000000);
    expect(cf.netFinancingCashFlow).toBe(-1000000);

    // Net Cash Flow = 7.5M - 1M - 1M = 5.5M
    expect(cf.netCashFlow).toBe(5500000);
  });

  it("CALK / Notes to Financial Statements: Solvency runway, DAR, and material transaction disclosure", () => {
    const report = generateFinancialReportPackage(
      wallets,
      [
        {
          id: "tx-1",
          user_id: "user-1",
          amount: 20000000,
          type: "income",
          wallet_id: "w-bca",
          to_wallet_id: null,
          category_id: "cat-gaji",
          note: "Salary",
          occurred_on: "2026-09-01",
          created_at: "2026-09-01T10:00:00Z",
        },
        {
          id: "tx-2",
          user_id: "user-1",
          amount: 2000000,
          type: "expense",
          wallet_id: "w-bca",
          to_wallet_id: null,
          category_id: "cat-food",
          note: "Monthly groceries",
          occurred_on: "2026-09-02",
          created_at: "2026-09-02T10:00:00Z",
        },
        // Material transaction (> 15% of total expense)
        {
          id: "tx-3",
          user_id: "user-1",
          amount: 5000000,
          type: "expense",
          wallet_id: "w-bca",
          to_wallet_id: null,
          category_id: "cat-food",
          note: "Large annual insurance payment",
          occurred_on: "2026-09-05",
          created_at: "2026-09-05T10:00:00Z",
        },
      ],
      categories,
    );

    const { balanceSheet, calk } = report;

    expect(balanceSheet.isBalanced).toBe(true);
    expect(calk.reconciliation.assetsEqualLiabilitiesPlusEquity).toBe(true);
    expect(calk.reconciliation.auditStatus).toBe("CERTIFIED_BALANCED");

    // Runway: BCA has 13M liquid, monthly expense is 7M -> ~1.9 months
    expect(calk.solvencyRunwayMonths).toBeGreaterThan(1);

    // Zero liabilities -> 0% DAR
    expect(calk.debtToAssetRatioPct).toBe(0);
    expect(calk.debtRating).toBe("debt-free");

    // Material transactions: 5M is 5M/7M = ~71.4% of expenses (>15%)
    expect(calk.materialTransactions.length).toBeGreaterThanOrEqual(1);
    expect(calk.materialTransactions[0].amount).toBe(5000000);
    expect(calk.materialTransactions[0].percentageOfTotalExpense).toBeGreaterThanOrEqual(15);
  });

  it("should guarantee 0 total liabilities and 0% DAR for users with no credit or loan accounts, even if a liquid wallet has negative balance", () => {
    const liquidWallets: Wallet[] = [
      {
        id: "w-cash",
        user_id: "user-1",
        name: "Cash",
        icon: "/icons/Budgets/Cash.png",
        classification: "liquid",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "w-bca",
        user_id: "user-1",
        name: "BCA",
        icon: "/icons/Budgets/BCA.png",
        classification: "liquid",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    // Cash has 500k expense without opening balance (balance -500k), BCA has 10M income
    const txs: Transaction[] = [
      {
        id: "t-1",
        user_id: "user-1",
        amount: 500000,
        type: "expense",
        wallet_id: "w-cash",
        to_wallet_id: null,
        category_id: "cat-food",
        occurred_on: "2026-09-01",
        created_at: "2026-09-01T10:00:00Z",
      },
      {
        id: "t-2",
        user_id: "user-1",
        amount: 10000000,
        type: "income",
        wallet_id: "w-bca",
        to_wallet_id: null,
        category_id: "cat-gaji",
        occurred_on: "2026-09-01",
        created_at: "2026-09-01T10:00:00Z",
      },
    ];

    const bs = calculateBalanceSheet(liquidWallets, txs);
    expect(bs.currentLiabilities.total).toBe(0);
    expect(bs.longTermLiabilities.total).toBe(0);
    expect(bs.totalLiabilities).toBe(0);
    expect(bs.currentLiabilities.items.length).toBe(0);
    expect(bs.longTermLiabilities.items.length).toBe(0);

    const report = generateFinancialReportPackage(liquidWallets, txs, categories);
    expect(report.calk.debtToAssetRatioPct).toBe(0);
    expect(report.calk.debtRating).toBe("debt-free");
  });

  it("handles historical closing periods and flags uninitialized accounts", () => {
    // Scenario: User has DANA with a tx in 2025 (50.000), but BCA and SeaBank only have txs in 2026.
    const customWallets: Wallet[] = [
      {
        id: "w-dana",
        user_id: "user-1",
        name: "DANA",
        icon: "/icons/Budgets/DANA.png",
        classification: "liquid",
        created_at: "2025-05-01T00:00:00Z",
      },
      {
        id: "w-bca",
        user_id: "user-1",
        name: "BCA",
        icon: "/icons/Budgets/BCA.png",
        classification: "liquid",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "w-seabank",
        user_id: "user-1",
        name: "SeaBank",
        icon: "/icons/Budgets/SeaBank.png",
        classification: "liquid",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    const allTxs: Transaction[] = [
      {
        id: "tx-dana-2025",
        user_id: "user-1",
        amount: 50000,
        type: "income",
        wallet_id: "w-dana",
        occurred_on: "2025-10-15",
        created_at: "2025-10-15T10:00:00Z",
      },
      {
        id: "tx-bca-2026",
        user_id: "user-1",
        amount: 5000000,
        type: "income",
        wallet_id: "w-bca",
        occurred_on: "2026-01-10",
        created_at: "2026-01-10T10:00:00Z",
      },
      {
        id: "tx-seabank-2026",
        user_id: "user-1",
        amount: 3000000,
        type: "income",
        wallet_id: "w-seabank",
        occurred_on: "2026-02-01",
        created_at: "2026-02-01T10:00:00Z",
      },
    ];

    // Filtered range txs for 2025 (only DANA)
    const range2025Txs = allTxs.filter((t) => (t.occurred_on || "") <= "2025-12-31");

    // 1. Strict closing position as of 2025-12-31 without carried balances
    const report2025 = generateFinancialReportPackage(
      customWallets,
      range2025Txs,
      [],
      {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        periodLabel: "Year 2025",
        allTransactions: allTxs,
        includeCarriedBalances: false,
      },
    );

    expect(report2025.balanceSheet.isHistoricalPeriod).toBe(true);
    expect(report2025.balanceSheet.totalAssets).toBe(50000);
    expect(report2025.balanceSheet.liquidAssets.items.find((i) => i.name === "DANA")?.balance).toBe(50000);
    // BCA & SeaBank have no balance in 2025 and are flagged as uninitialized in 2025
    expect(report2025.balanceSheet.uninitializedAccounts).toContain("BCA");
    expect(report2025.balanceSheet.uninitializedAccounts).toContain("SeaBank");
    expect(report2025.calk.reconciliation.notes).toContain("Catatan Periode Historis");

    // 2. View with carried balances enabled
    const report2025Carried = generateFinancialReportPackage(
      customWallets,
      range2025Txs,
      [],
      {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        periodLabel: "Year 2025",
        allTransactions: allTxs,
        includeCarriedBalances: true,
      },
    );

    // Carries all balances: DANA 50k + BCA 5M + SeaBank 3M = 8.050.000
    expect(report2025Carried.balanceSheet.totalAssets).toBe(8050000);
  });
});


