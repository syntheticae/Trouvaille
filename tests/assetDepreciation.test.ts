import { describe, it, expect } from "vitest";
import {
  calculateAssetDepreciation,
  calculateHoldingValuation,
} from "../src/lib/marketPriceService";
import type { InvestmentHolding } from "../src/types";

describe("Asset Valuation & Compound Depreciation / Growth Suite", () => {
  it("returns original cost when purchase date is invalid or rate is 0", () => {
    const resultZero = calculateAssetDepreciation(
      20000000,
      0,
      "2025-01-01",
      new Date("2026-01-01T00:00:00Z")
    );
    expect(resultZero.currentPrice).toBe(20000000);
    expect(resultZero.totalChange).toBe(0);
    expect(resultZero.totalChangePct).toBe(0);

    const resultInvalidDate = calculateAssetDepreciation(
      15000000,
      -10,
      "invalid-date",
      new Date("2026-01-01T00:00:00Z")
    );
    expect(resultInvalidDate.currentPrice).toBe(15000000);
    expect(resultInvalidDate.totalChange).toBe(0);
  });

  it("calculates accurate 1-year vehicle depreciation (-15%/yr)", () => {
    // Exactly 365.25 days difference
    const buyPrice = 20000000;
    const purchaseDate = "2025-01-01T00:00:00Z";
    const targetDate = new Date("2026-01-01T06:00:00Z"); // 365.25 days

    const res = calculateAssetDepreciation(buyPrice, -15, purchaseDate, targetDate);

    // 20,000,000 * 0.85 = 17,000,000
    expect(res.currentPrice).toBe(17000000);
    expect(res.totalChange).toBe(-3000000);
    expect(res.totalChangePct).toBeCloseTo(-15.0, 1);
    expect(res.yearsElapsed).toBeCloseTo(1.0, 1);
  });

  it("calculates multi-year compound property appreciation (+5%/yr for 2 years)", () => {
    const buyPrice = 500000000;
    const purchaseDate = "2024-01-01T00:00:00Z";
    const targetDate = new Date(new Date(purchaseDate).getTime() + 2 * 365.25 * 24 * 3600 * 1000);

    const res = calculateAssetDepreciation(buyPrice, 5, purchaseDate, targetDate);

    // 500M * 1.05^2 = 500M * 1.1025 = 551,250,000
    expect(res.currentPrice).toBe(551250000);
    expect(res.totalChange).toBe(51250000);
    expect(res.totalChangePct).toBeCloseTo(10.25, 2);
    expect(res.yearsElapsed).toBeCloseTo(2.0, 1);
  });

  it("clamps valuation to 0 when depreciation rate is extreme (-100%)", () => {
    const buyPrice = 10000000;
    const purchaseDate = "2025-01-01T00:00:00Z";
    const targetDate = new Date("2026-01-01T00:00:00Z");

    const res = calculateAssetDepreciation(buyPrice, -100, purchaseDate, targetDate);
    expect(res.currentPrice).toBe(0);
    expect(res.totalChange).toBe(-10000000);
    expect(res.totalChangePct).toBe(-100);
  });

  it("integrates seamlessly into calculateHoldingValuation", () => {
    const holding: InvestmentHolding = {
      id: "h-civic-1",
      symbol: "VEHICLE",
      name: "Honda Civic RS 2024",
      asset_type: "fixed_asset",
      units: 1,
      avg_buy_price: 600000000,
      current_price: 600000000,
      annual_rate: -10, // -10%/yr
      purchase_date: new Date(Date.now() - 365.25 * 24 * 3600 * 1000).toISOString(), // exactly 1 year ago
    };

    const val = calculateHoldingValuation(holding);
    // Cost basis: 600M
    expect(val.costBasis).toBe(600000000);
    // Market value should be ~540M (-10%)
    expect(val.marketValue).toBeCloseTo(540000000, -6);
    expect(val.floatingPnL).toBeLessThan(0);
    expect(val.floatingPnLPct).toBeCloseTo(-10.0, 0);
  });
});
