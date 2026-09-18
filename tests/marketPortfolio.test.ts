import { describe, it, expect } from "vitest";
import {
  calculateHoldingValuation,
  calculatePortfolioSummary,
} from "../src/lib/marketPriceService";
import {
  calculateWalletBalances,
  isMarketInvestmentName,
  isFixedAssetName,
  isCreditOrDebtName,
} from "../src/lib/financialMath";
import type { Wallet, Transaction, InvestmentHolding } from "../src/lib/types";

describe("Market Portfolio Math & Valuation", () => {
  it("calculates holding valuation correctly for profit scenario", () => {
    const holding: InvestmentHolding = {
      id: "h-btc",
      symbol: "BTC",
      name: "Bitcoin",
      asset_type: "crypto",
      units: 0.5,
      avg_buy_price: 900_000_000,
      current_price: 1_000_000_000,
      last_price_updated_at: new Date().toISOString(),
    };

    const val = calculateHoldingValuation(holding);
    expect(val.costBasis).toBe(450_000_000);
    expect(val.marketValue).toBe(500_000_000);
    expect(val.floatingPnL).toBe(50_000_000);
    expect(val.floatingPnLPct).toBeCloseTo(11.11, 1);
  });

  it("calculates holding valuation correctly for loss scenario", () => {
    const holding: InvestmentHolding = {
      id: "h-bbca",
      symbol: "BBCA",
      name: "Bank Central Asia",
      asset_type: "stock",
      units: 1000,
      avg_buy_price: 10_000,
      current_price: 9_500,
      last_price_updated_at: new Date().toISOString(),
    };

    const val = calculateHoldingValuation(holding);
    expect(val.costBasis).toBe(10_000_000);
    expect(val.marketValue).toBe(9_500_000);
    expect(val.floatingPnL).toBe(-500_000);
    expect(val.floatingPnLPct).toBeCloseTo(-5.0, 1);
  });

  it("handles zero quantity or zero buy price safely without NaN", () => {
    const holding: InvestmentHolding = {
      id: "h-zero",
      symbol: "TEST",
      name: "Zero Holding",
      asset_type: "gold",
      units: 0,
      avg_buy_price: 0,
      current_price: 1_000_000,
      last_price_updated_at: new Date().toISOString(),
    };

    const val = calculateHoldingValuation(holding);
    expect(val.costBasis).toBe(0);
    expect(val.marketValue).toBe(0);
    expect(val.floatingPnL).toBe(0);
    expect(val.floatingPnLPct).toBe(0);
  });

  it("calculates portfolio summary aggregated across diverse asset classes", () => {
    const holdings: InvestmentHolding[] = [
      {
        id: "h1",
        symbol: "BTC",
        name: "Bitcoin",
        asset_type: "crypto",
        units: 1,
        avg_buy_price: 1_000_000_000,
        current_price: 1_100_000_000, // +100M
        last_price_updated_at: new Date().toISOString(),
      },
      {
        id: "h2",
        symbol: "BBRI",
        name: "Bank Rakyat Indonesia",
        asset_type: "stock",
        units: 10_000,
        avg_buy_price: 5_000,
        current_price: 4_800, // Cost 50M, MV 48M (-2M)
        last_price_updated_at: new Date().toISOString(),
      },
      {
        id: "h3",
        symbol: "ANTAM",
        name: "Logam Mulia Antam",
        asset_type: "gold",
        units: 10, // 10 grams
        avg_buy_price: 1_200_000,
        current_price: 1_300_000, // Cost 12M, MV 13M (+1M)
        last_price_updated_at: new Date().toISOString(),
      },
    ];

    const summary = calculatePortfolioSummary(holdings);
    expect(summary.totalCostBasis).toBe(1_062_000_000);
    expect(summary.totalMarketValue).toBe(1_161_000_000);
    expect(summary.totalFloatingPnL).toBe(99_000_000);
    expect(summary.totalFloatingPnLPct).toBeCloseTo(9.32, 1);

    expect(summary.byAssetType.crypto.marketValue).toBe(1_100_000_000);
    expect(summary.byAssetType.stock.marketValue).toBe(48_000_000);
    expect(summary.byAssetType.gold.marketValue).toBe(13_000_000);
  });
});

describe("Bifocal Liquidity Segmentation Rules", () => {
  it("detects fixed asset names correctly", () => {
    expect(isFixedAssetName("Rumah Puri")).toBe(true);
    expect(isFixedAssetName("Mobil Honda CR-V")).toBe(true);
    expect(isFixedAssetName("Tanah Kavling")).toBe(true);
    expect(isFixedAssetName("Apartemen")).toBe(true);
    expect(isFixedAssetName("BCA Tabungan")).toBe(false);
  });

  it("detects market investment names correctly", () => {
    expect(isMarketInvestmentName("Ajaib Saham")).toBe(true);
    expect(isMarketInvestmentName("Bibit Reksadana")).toBe(true);
    expect(isMarketInvestmentName("Pluang Crypto")).toBe(true);
    expect(isMarketInvestmentName("Binance Portfolio")).toBe(true);
    expect(isMarketInvestmentName("Bank Mandiri")).toBe(false);
  });

  it("detects debt / credit card accounts correctly", () => {
    expect(isCreditOrDebtName("Kartu Kredit BCA")).toBe(true);
    expect(isCreditOrDebtName("Kredit Mandiri")).toBe(true);
    expect(isCreditOrDebtName("Cicilan Paylater")).toBe(true);
    expect(isCreditOrDebtName("Hutang Teman")).toBe(true);
    expect(isCreditOrDebtName("Gopay")).toBe(false);
  });

  it("isolates liquid operating cash from fixed assets and liabilities", () => {
    const wallets: (Wallet & { balance: number })[] = [
      {
        id: "w1",
        user_id: "u1",
        name: "BCA Tabungan Utama",
        icon: "/icons/bank.png",
        created_at: new Date().toISOString(),
        balance: 20_000_000,
        classification: "liquid",
      },
      {
        id: "w2",
        user_id: "u1",
        name: "Gopay",
        icon: "/icons/ewallet.png",
        created_at: new Date().toISOString(),
        balance: 1_500_000,
        classification: "liquid",
      },
      {
        id: "w3",
        user_id: "u1",
        name: "Stockbit Portofolio",
        icon: "/icons/invest.png",
        created_at: new Date().toISOString(),
        balance: 50_000_000,
        classification: "investment",
      },
      {
        id: "w4",
        user_id: "u1",
        name: "Rumah BSD",
        icon: "/icons/home.png",
        created_at: new Date().toISOString(),
        balance: 1_200_000_000,
        classification: "fixed_asset",
      },
      {
        id: "w5",
        user_id: "u1",
        name: "Kartu Kredit BCA",
        icon: "/icons/card.png",
        created_at: new Date().toISOString(),
        balance: -5_000_000, // -5M debt
        classification: "credit",
      },
    ];

    const txs: Transaction[] = []; // baseline test without transaction adjustments

    const result = calculateWalletBalances(txs, wallets);

    // Liquid Capital: BCA (20M) + Gopay (1.5M) = 21.5M
    expect(result.liquidCapital).toBe(21_500_000);
    // Liquid Net Position: 21.5M - 5M credit card = 16.5M
    expect(result.liquidNetPosition).toBe(16_500_000);

    // Market Assets: Stockbit (50M)
    expect(result.marketAssets).toBe(50_000_000);

    // Fixed Assets: Rumah BSD (1.2B)
    expect(result.fixedAssets).toBe(1_200_000_000);

    // Total Liabilities: Credit Card (5M)
    expect(result.totalLiabilities).toBe(5_000_000);

    // Consolidated Net Worth: 21.5M (liquid) + 50M (market) + 1.2B (fixed) - 5M (liabilities) = 1,266,500,000
    expect(result.netWorth).toBe(1_266_500_000);

    // Verify liquid operating cash is completely untainted by 1.2B real estate
    expect(result.liquidCapital).toBeLessThan(50_000_000);
  });

  it("allows Crypto / USDT wallet to be counted as liquid cash when classified as liquid", () => {
    const wallets: (Wallet & { balance: number })[] = [
      {
        id: "w-crypto",
        user_id: "u1",
        name: "Crypto",
        icon: "/icons/crypto.png",
        created_at: new Date().toISOString(),
        balance: 14_860_559, // User's actual recorded capital
        classification: "liquid", // User toggles "Hitung Sebagai Kas Likuid"
      },
      {
        id: "w-cash",
        user_id: "u1",
        name: "Cash",
        icon: "/icons/cash.png",
        created_at: new Date().toISOString(),
        balance: 203_000,
        classification: "liquid",
      },
    ];

    const result = calculateWalletBalances([], wallets);

    // Both Cash and Crypto (USDT) are now in liquidAccounts
    expect(result.liquidAccounts.length).toBe(2);
    expect(result.liquidCapital).toBe(14_860_559 + 203_000);
    expect(result.marketAccounts.length).toBe(0);
  });
});
