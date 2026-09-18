import type { InvestmentHolding, AssetType } from "./types";

export const HOLDINGS_STORAGE_KEY = "trouvaille_holdings_v1";
export const QUOTES_CACHE_KEY = "trouvaille_market_quotes_cache_v2";
const QUOTE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export interface CachedQuote {
  price: number;
  timestamp: number;
}

export interface HoldingValuation {
  costBasis: number;
  marketValue: number;
  floatingPnL: number;
  floatingPnLPct: number;
}

export interface PortfolioSummary {
  totalCostBasis: number;
  totalMarketValue: number;
  totalFloatingPnL: number;
  totalFloatingPnLPct: number;
  byAssetType: Record<AssetType, { costBasis: number; marketValue: number; floatingPnL: number }>;
}

/**
 * Standard USD/IDR exchange rate fallback if real-time exchange fetch is offline.
 */
export const USD_IDR_ESTIMATE = 17725;

/**
 * Retrieve saved investment holdings from localStorage.
 */
export function getSavedHoldings(): InvestmentHolding[] {
  try {
    const raw = localStorage.getItem(HOLDINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save investment holdings to localStorage.
 */
export function saveHoldings(holdings: InvestmentHolding[]): void {
  try {
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  } catch (e) {
    console.warn("Failed to persist holdings:", e);
  }
}

/**
 * Add or update a holding.
 */
export function upsertHolding(holding: InvestmentHolding): InvestmentHolding[] {
  const current = getSavedHoldings();
  const index = current.findIndex((h) => h.id === holding.id);
  let updated: InvestmentHolding[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...holding, last_price_updated_at: new Date().toISOString() };
  } else {
    updated = [
      ...current,
      {
        ...holding,
        id: holding.id || `holding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        last_price_updated_at: new Date().toISOString(),
      },
    ];
  }
  saveHoldings(updated);
  return updated;
}

/**
 * Delete a holding by ID.
 */
export function deleteHolding(id: string): InvestmentHolding[] {
  const current = getSavedHoldings();
  const updated = current.filter((h) => h.id !== id);
  saveHoldings(updated);
  return updated;
}

/**
 * Get cached quote if valid within TTL.
 */
function getCachedQuote(key: string): number | null {
  try {
    const raw = localStorage.getItem(QUOTES_CACHE_KEY);
    if (!raw) return null;
    const cache: Record<string, CachedQuote> = JSON.parse(raw);
    const item = cache[key];
    if (item && Date.now() - item.timestamp < QUOTE_CACHE_TTL_MS) {
      return item.price;
    }
  } catch {}
  return null;
}

/**
 * Save quote to cache.
 */
function setCachedQuote(key: string, price: number): void {
  try {
    const raw = localStorage.getItem(QUOTES_CACHE_KEY);
    const cache: Record<string, CachedQuote> = raw ? JSON.parse(raw) : {};
    cache[key] = { price, timestamp: Date.now() };
    localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Fetch live USD/USDT price in IDR.
 * Priority: CoinGecko (CORS *) → Open Exchange Rate (CORS *) → static fallback.
 * Yahoo Finance is intentionally skipped — it returns null CORS header and
 * browsers block it in mobile WebView contexts.
 */
export async function fetchUsdtPriceInIDR(): Promise<number> {
  const cacheKey = "usdt_rate_idr";
  const cached = getCachedQuote(cacheKey);
  if (cached !== null) return cached;

  // 1. CoinGecko — free, no auth, CORS *
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr",
      { headers: { Accept: "application/json" } },
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.tether?.idr;
      if (typeof price === "number" && price > 10000) {
        const rounded = Math.round(price);
        setCachedQuote(cacheKey, rounded);
        return rounded;
      }
    }
  } catch {}

  // 2. Open Exchange Rates — free, no auth, CORS *
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.IDR;
      if (typeof rate === "number" && rate > 10000) {
        const rounded = Math.round(rate);
        setCachedQuote(cacheKey, rounded);
        return rounded;
      }
    }
  } catch {}

  return USD_IDR_ESTIMATE;
}

/**
 * Fetch live Crypto price via Binance Public API (100% free, no auth, unlimited rate).
 * Returns price in IDR.
 */
export async function fetchCryptoPriceInIDR(symbol: string): Promise<number | null> {
  const clean = symbol.trim().toUpperCase();
  if (clean === "USDT" || clean === "USD" || clean === "USDC") {
    return fetchUsdtPriceInIDR();
  }

  const cleanSymbol = clean.replace(/USDT$/, "");
  const pair = `${cleanSymbol}USDT`;
  const cacheKey = `crypto_${pair}`;

  const cached = getCachedQuote(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    if (!res.ok) return null;
    const data = await res.json();
    const usdPrice = parseFloat(data.price);
    if (!isNaN(usdPrice) && usdPrice > 0) {
      const usdtRate = await fetchUsdtPriceInIDR();
      const idrPrice = Math.round(usdPrice * usdtRate);
      setCachedQuote(cacheKey, idrPrice);
      return idrPrice;
    }
  } catch {
    // Network or CORS fallback
  }
  return null;
}

/**
 * Fetch live stock price via Yahoo Finance Chart API (free, on-demand).
 */
export async function fetchStockPriceInIDR(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `stock_${cleanSymbol}`;

  const cached = getCachedQuote(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const regularMarketPrice = meta?.regularMarketPrice;
    if (typeof regularMarketPrice === "number" && regularMarketPrice > 0) {
      // If US stock (e.g. AAPL, TSLA), convert to IDR
      const isUS = !cleanSymbol.endsWith(".JK");
      const finalPrice = isUS
        ? Math.round(regularMarketPrice * USD_IDR_ESTIMATE)
        : Math.round(regularMarketPrice);
      setCachedQuote(cacheKey, finalPrice);
      return finalPrice;
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

/**
 * Calculate valuation and floating profit/loss for a single holding.
 */
export function calculateHoldingValuation(holding: InvestmentHolding): HoldingValuation {
  const units = Number(holding.units || 0);
  const buyPrice = Number(holding.avg_buy_price || 0);
  const currentPrice = Number(holding.current_price || buyPrice);

  const costBasis = units * buyPrice;
  const marketValue = units * currentPrice;
  const floatingPnL = marketValue - costBasis;
  const floatingPnLPct = costBasis > 0 ? (floatingPnL / costBasis) * 100 : 0;

  return {
    costBasis,
    marketValue,
    floatingPnL,
    floatingPnLPct,
  };
}

/**
 * Calculate aggregate portfolio summary and asset distribution.
 */
export function calculatePortfolioSummary(holdings: InvestmentHolding[]): PortfolioSummary {
  let totalCostBasis = 0;
  let totalMarketValue = 0;

  const byAssetType: Record<
    AssetType,
    { costBasis: number; marketValue: number; floatingPnL: number }
  > = {
    stock: { costBasis: 0, marketValue: 0, floatingPnL: 0 },
    crypto: { costBasis: 0, marketValue: 0, floatingPnL: 0 },
    mutual_fund: { costBasis: 0, marketValue: 0, floatingPnL: 0 },
    gold: { costBasis: 0, marketValue: 0, floatingPnL: 0 },
    bond: { costBasis: 0, marketValue: 0, floatingPnL: 0 },
    fixed_asset: { costBasis: 0, marketValue: 0, floatingPnL: 0 },
  };

  holdings.forEach((h) => {
    const val = calculateHoldingValuation(h);
    totalCostBasis += val.costBasis;
    totalMarketValue += val.marketValue;

    const t = h.asset_type || "stock";
    if (byAssetType[t]) {
      byAssetType[t].costBasis += val.costBasis;
      byAssetType[t].marketValue += val.marketValue;
      byAssetType[t].floatingPnL += val.floatingPnL;
    }
  });

  const totalFloatingPnL = totalMarketValue - totalCostBasis;
  const totalFloatingPnLPct =
    totalCostBasis > 0 ? (totalFloatingPnL / totalCostBasis) * 100 : 0;

  return {
    totalCostBasis,
    totalMarketValue,
    totalFloatingPnL,
    totalFloatingPnLPct,
    byAssetType,
  };
}
