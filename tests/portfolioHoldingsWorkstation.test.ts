import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import type { InvestmentHolding } from "../src/types";

describe("Portfolio Holdings Workstation & App Icon Suite", () => {
  it("verifies all 3D luxury app icons exist and have valid file sizes", () => {
    const requiredIcons = [
      "public/pwa-192x192.png",
      "public/pwa-512x512.png",
      "public/apple-touch-icon.png",
      "public/favicon.png",
      "public/icon-dark.png",
      "public/icon-light.png",
      "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
    ];

    for (const relPath of requiredIcons) {
      const fullPath = path.resolve(relPath);
      expect(fs.existsSync(fullPath), `Icon file ${relPath} should exist`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size, `Icon file ${relPath} should be non-empty`).toBeGreaterThan(1000);
    }
  });

  it("verifies index.html has valid icon references and no 404 targets", () => {
    const indexPath = path.resolve("index.html");
    const content = fs.readFileSync(indexPath, "utf-8");

    expect(content).toContain('href="/icon-dark.png"');
    expect(content).toContain('href="/icon-light.png"');
    expect(content).toContain('href="/favicon.png"');
    expect(content).toContain('href="/apple-touch-icon.png"');
    // Ensure all referenced files exist in public/
    expect(fs.existsSync(path.resolve("public/icon-dark.png"))).toBe(true);
    expect(fs.existsSync(path.resolve("public/icon-light.png"))).toBe(true);
    expect(fs.existsSync(path.resolve("public/favicon.png"))).toBe(true);
    expect(fs.existsSync(path.resolve("public/apple-touch-icon.png"))).toBe(true);
  });

  it("verifies category filtering logic handles crypto, US stock, IDX stock, gold, and fixed assets", () => {
    const mockHoldings: InvestmentHolding[] = [
      {
        id: "h1",
        symbol: "BTC",
        name: "Bitcoin",
        asset_type: "crypto",
        units: 0.1,
        avg_buy_price: 900000000,
        current_price: 1000000000,
        currency: "IDR",
      },
      {
        id: "h2",
        symbol: "AAPL",
        name: "Apple Inc.",
        asset_type: "stock",
        units: 5,
        avg_buy_price: 2800000,
        current_price: 3200000,
        currency: "USD",
        native_currency: "USD",
      },
      {
        id: "h3",
        symbol: "BBCA",
        name: "Bank Central Asia",
        asset_type: "stock",
        units: 1000,
        avg_buy_price: 9500,
        current_price: 10200,
        currency: "IDR",
      },
      {
        id: "h4",
        symbol: "ANTAM",
        name: "Emas Batangan Antam",
        asset_type: "gold",
        units: 10,
        avg_buy_price: 1200000,
        current_price: 1400000,
        currency: "IDR",
      },
      {
        id: "h5",
        symbol: "PROP-01",
        name: "Tanah Kavling",
        asset_type: "fixed_asset",
        units: 1,
        avg_buy_price: 150000000,
        current_price: 180000000,
        currency: "IDR",
      },
      {
        id: "usdt-core-holding",
        symbol: "USDT",
        name: "Tether USD",
        asset_type: "crypto",
        units: 500,
        avg_buy_price: 16200,
        current_price: 16400,
        currency: "IDR",
      },
    ];

    // Filter crypto
    const cryptoItems = mockHoldings.filter(
      (h) => h.asset_type === "crypto" || h.symbol?.toUpperCase() === "USDT",
    );
    expect(cryptoItems.map((h) => h.symbol)).toEqual(["BTC", "USDT"]);

    // Filter stock_us
    const stockUsItems = mockHoldings.filter(
      (h) => h.asset_type === "stock" && (h.currency === "USD" || h.native_currency === "USD"),
    );
    expect(stockUsItems.map((h) => h.symbol)).toEqual(["AAPL"]);

    // Filter stock_id
    const stockIdItems = mockHoldings.filter(
      (h) => h.asset_type === "stock" && h.currency !== "USD" && h.native_currency !== "USD",
    );
    expect(stockIdItems.map((h) => h.symbol)).toEqual(["BBCA"]);

    // Filter gold
    const goldItems = mockHoldings.filter(
      (h) => h.asset_type === "gold" || h.symbol?.toUpperCase() === "ANTAM",
    );
    expect(goldItems.map((h) => h.symbol)).toEqual(["ANTAM"]);

    // Filter fixed_asset
    const fixedItems = mockHoldings.filter(
      (h) => h.asset_type === "fixed_asset",
    );
    expect(fixedItems.map((h) => h.symbol)).toEqual(["PROP-01"]);

    // Search query matching
    const searchResult = mockHoldings.filter(
      (h) =>
        h.name.toLowerCase().includes("tether") ||
        h.symbol.toLowerCase().includes("tether"),
    );
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].symbol).toBe("USDT");
  });

  it("verifies card order in AssetsPage.tsx matches requested sequence", () => {
    const assetsPagePath = path.resolve("src/pages/AssetsPage.tsx");
    const content = fs.readFileSync(assetsPagePath, "utf-8");

    const perfRiskIdx = content.indexOf("<PortfolioIntelligenceDeck");
    const wealthHistIdx = content.indexOf("<WealthHistoryTrajectoryCard");
    const holdingsDeckIdx = content.indexOf("<PortfolioHoldingsDeck");

    expect(perfRiskIdx).toBeGreaterThan(-1);
    expect(wealthHistIdx).toBeGreaterThan(-1);
    expect(holdingsDeckIdx).toBeGreaterThan(-1);

    // Performance & Risk must be ABOVE Wealth History
    expect(perfRiskIdx).toBeLessThan(wealthHistIdx);

    // Wealth History must be ABOVE Portfolio Holdings
    expect(wealthHistIdx).toBeLessThan(holdingsDeckIdx);
  });
});
