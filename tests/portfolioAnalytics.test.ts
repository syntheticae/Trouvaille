import { describe, it, expect } from "vitest";
import {
  roundSafe,
  calculatePortfolioDiversification,
  calculateAssetClassAllocation,
  calculateUnrealizedGains,
  formatRunwaySummary,
  calculateHistoricalNetWorthPoints,
} from "../src/lib/portfolioAnalytics";

describe("Portfolio Analytics Engine", () => {
  describe("roundSafe", () => {
    it("safely rounds decimals without floating point artifacts", () => {
      // 0.1 + 0.2 in JS is 0.30000000000000004
      expect(roundSafe(0.1 + 0.2, 1)).toBe(0.3);
      expect(roundSafe(26.2345, 1)).toBe(26.2);
      expect(roundSafe(26.255, 1)).toBe(26.3);
      expect(roundSafe(NaN)).toBe(0);
      expect(roundSafe(Infinity)).toBe(0);
    });
  });

  describe("calculatePortfolioDiversification", () => {
    it("returns score 18 and 'Overexposed' when 100% of wealth is in a single asset", () => {
      const singleHolding = [{ id: "h1", marketValue: 18760833 }];
      const result = calculatePortfolioDiversification(singleHolding, 0);

      expect(result.score).toBe(18);
      expect(result.status).toBe("Overexposed");
      expect(result.hhi).toBe(10000);
      expect(result.activeAssetsCount).toBe(1);
    });

    it("handles multiple assets and scores higher when evenly diversified", () => {
      const diversifiedHoldings = [
        { id: "h1", marketValue: 25000000 },
        { id: "h2", marketValue: 25000000 },
        { id: "h3", marketValue: 25000000 },
        { id: "h4", marketValue: 25000000 },
      ];
      const result = calculatePortfolioDiversification(diversifiedHoldings, 0);

      // HHI for 4 equal assets is (0.25^2 * 4) * 10000 = 2500
      expect(result.hhi).toBe(2500);
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.status).toBe("Diversified");
      expect(result.activeAssetsCount).toBe(4);
    });

    it("returns 'Balanced' when moderately concentrated", () => {
      const balancedHoldings = [
        { id: "h1", marketValue: 60000000 },
        { id: "h2", marketValue: 40000000 },
      ];
      const result = calculatePortfolioDiversification(balancedHoldings, 0);

      expect(result.status).toBe("Balanced");
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(75);
    });

    it("handles empty portfolio gracefully", () => {
      const result = calculatePortfolioDiversification([], 0);
      expect(result.score).toBe(0);
      expect(result.status).toBe("Overexposed");
      expect(result.activeAssetsCount).toBe(0);
    });
  });

  describe("calculateAssetClassAllocation", () => {
    it("always returns all 4 asset classes even if balance is 0%", () => {
      const holdings = [
        { asset_type: "crypto" as const, marketValue: 18760833 },
      ];
      const result = calculateAssetClassAllocation(holdings, 0);

      expect(result.categories).toHaveLength(4);
      expect(result.categories.map((c) => c.id)).toEqual([
        "crypto",
        "stock",
        "gold",
        "cash",
      ]);

      const crypto = result.categories.find((c) => c.id === "crypto");
      const stock = result.categories.find((c) => c.id === "stock");
      const gold = result.categories.find((c) => c.id === "gold");
      const cash = result.categories.find((c) => c.id === "cash");

      expect(crypto?.sharePct).toBe(100);
      expect(stock?.sharePct).toBe(0);
      expect(gold?.sharePct).toBe(0);
      expect(cash?.sharePct).toBe(0);

      expect(result.activeClassesCount).toBe(1);
    });

    it("correctly calculates shares when multiple classes are populated", () => {
      const holdings = [
        { asset_type: "crypto" as const, marketValue: 50000000 },
        { asset_type: "stock" as const, marketValue: 30000000 },
        { asset_type: "gold" as const, marketValue: 20000000 },
      ];
      const cashTotal = 0; // Total 100 Million

      const result = calculateAssetClassAllocation(holdings, cashTotal);

      expect(result.categories.find((c) => c.id === "crypto")?.sharePct).toBe(50);
      expect(result.categories.find((c) => c.id === "stock")?.sharePct).toBe(30);
      expect(result.categories.find((c) => c.id === "gold")?.sharePct).toBe(20);
      expect(result.categories.find((c) => c.id === "cash")?.sharePct).toBe(0);
      expect(result.activeClassesCount).toBe(3);
    });
  });

  describe("calculateUnrealizedGains", () => {
    it("calculates cost basis, market value, profit %, and sorts descending by highest gain", () => {
      const mockHoldings = [
        {
          id: "h-btc",
          symbol: "BTC",
          name: "Bitcoin",
          units: 0.1,
          costBasis: 100000000,
          marketValue: 150000000, // +50% gain
        },
        {
          id: "h-usdt",
          symbol: "USDT",
          name: "Tether USD",
          units: 1051.97,
          costBasis: 14860559,
          marketValue: 18760833, // +26.2% gain
        },
        {
          id: "h-eth",
          symbol: "ETH",
          name: "Ethereum",
          units: 1.5,
          costBasis: 60000000,
          marketValue: 54000000, // -10% loss
        },
      ];

      const gains = calculateUnrealizedGains(mockHoldings);

      expect(gains).toHaveLength(3);
      // Sorted highest gain first: BTC (+50%) > USDT (+26.2%) > ETH (-10%)
      expect(gains[0].symbol).toBe("BTC");
      expect(gains[0].floatingProfitPct).toBe(50);
      expect(gains[1].symbol).toBe("USDT");
      expect(gains[1].floatingProfitPct).toBe(26.2);
      expect(gains[2].symbol).toBe("ETH");
      expect(gains[2].floatingProfitPct).toBe(-10);
    });

    it("safely handles 0 cost basis without throwing division by zero", () => {
      const mock = [
        {
          id: "gift",
          symbol: "GIFT",
          name: "Gifted Token",
          units: 10,
          costBasis: 0,
          marketValue: 500000,
        },
      ];
      const gains = calculateUnrealizedGains(mock);
      expect(gains[0].floatingProfitPct).toBe(0);
      expect(gains[0].floatingProfit).toBe(500000);
    });
  });

  describe("formatRunwaySummary", () => {
    it("formats safe runway in English cleanly without duplicate cards", () => {
      const summary = formatRunwaySummary(13.3, 1406693, false);
      expect(summary).toBe("13.3 months safe runway • Rp 1.406.693/mo burn rate");
    });

    it("formats low buffer runway cleanly", () => {
      const summary = formatRunwaySummary(3.5, 2000000, false);
      expect(summary).toBe("3.5 months runway buffer • Rp 2.000.000/mo burn rate");
    });

    it("supports Indonesian when requested", () => {
      const summary = formatRunwaySummary(13.3, 1406693, true);
      expect(summary).toBe("13.3 bulan runway aman • Rp 1.406.693/bln burn rate");
    });
  });

  describe("calculateHistoricalNetWorthPoints", () => {
    it("reconstructs 6-month historical net worth progression curve", () => {
      const deploymentHistory = [
        { label: "Apr", deployed: 500000 },
        { label: "May", deployed: 0 },
        { label: "Jun", deployed: 1200000 },
        { label: "Jul", deployed: 0 },
        { label: "Aug", deployed: 800000 },
        { label: "Sep", deployed: 0 },
      ];
      const points = calculateHistoricalNetWorthPoints(18760833, deploymentHistory);

      expect(points).toHaveLength(6);
      expect(points[0].label).toBe("Apr");
      expect(points[5].label).toBe("Sep");
      expect(points[5].valuation).toBe(18760833);
      expect(points[0].valuation).toBeLessThanOrEqual(points[5].valuation);
    });
  });
});
