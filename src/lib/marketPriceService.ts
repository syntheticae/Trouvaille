import type { InvestmentHolding, AssetType } from "./types";
import { supabase } from "./supabase";

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
export const USD_IDR_ESTIMATE = 16300;

export function getHoldingsStorageKey(userId?: string): string {
  const isGuest =
    userId === "guest_local_user" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("trouvaille_guest_mode") === "true");
  if (isGuest) return "trouvaille_holdings_guest_v1";

  if (userId) {
    return `trouvaille_holdings_${userId}_v1`;
  }
  if (typeof window !== "undefined") {
    // Inspect if there is an active Supabase user session token
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.user?.id) return `trouvaille_holdings_${parsed.user.id}_v1`;
          } catch {}
        }
      }
    }
  }
  return "trouvaille_holdings_guest_v1";
}

export function getUsdtStorageKey(userId?: string): string {
  const isGuest =
    userId === "guest_local_user" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("trouvaille_guest_mode") === "true");
  if (isGuest) return "trouvaille_usdt_valuation_guest_v1";

  if (userId) {
    return `trouvaille_usdt_valuation_${userId}_v1`;
  }
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.user?.id) return `trouvaille_usdt_valuation_${parsed.user.id}_v1`;
          } catch {}
        }
      }
    }
  }
  return "trouvaille_usdt_valuation_guest_v1";
}

export interface UsdtValuationPref {
  units: number;
  rate: number;
  costBasis: number;
}

/**
 * Retrieve saved USDT valuation preferences scoped to user.
 * Includes auto-rescue: if current user key is empty, scans local storage for any
 * previously configured USDT holdings and adopts them to prevent accidental loss.
 */
export function getSavedUsdtPref(userId?: string): UsdtValuationPref {
  try {
    const key = getUsdtStorageKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      const units = Number(parsed.units) || 0;
      if (units > 0) {
        const rate = Number(parsed.rate);
        return {
          units,
          rate: rate > 5000 && rate < 50000 ? rate : USD_IDR_ESTIMATE,
          costBasis: Number(parsed.costBasis) || 0,
        };
      }
    }

    // Auto-Rescue: If authenticated user has 0 units in target key,
    // search across all previous keys in localStorage to rescue user's USDT
    if (typeof window !== "undefined") {
      const searchKeys = [
        "trouvaille_usdt_valuation_guest_v1",
        "trouvaille_usdt_valuation_v2",
        "trouvaille_usdt_valuation_v1",
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("trouvaille_usdt_valuation_") && !searchKeys.includes(k) && k !== key) {
          searchKeys.push(k);
        }
      }

      for (const k of searchKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const units = Number(parsed.units) || 0;
            if (units > 0) {
              const rate = Number(parsed.rate);
              const rescued: UsdtValuationPref = {
                units,
                rate: rate > 5000 && rate < 50000 ? rate : USD_IDR_ESTIMATE,
                costBasis: Number(parsed.costBasis) || 0,
              };
              localStorage.setItem(key, JSON.stringify(rescued));
              return rescued;
            }
          } catch {}
        }
      }
    }
  } catch {}
  return {
    units: 0,
    rate: USD_IDR_ESTIMATE,
    costBasis: 0,
  };
}

/**
 * Persist USDT valuation preferences scoped to user, and asynchronously syncs to Supabase cloud.
 */
export function saveUsdtPref(pref: UsdtValuationPref, userId?: string): void {
  try {
    const key = getUsdtStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(pref));
    localStorage.removeItem("trouvaille_usdt_valuation_v2");
    localStorage.removeItem("trouvaille_usdt_valuation_v1");

    // Asynchronously synchronize USDT to Supabase holdings table
    if (userId && userId !== "guest_local_user") {
      syncHoldingToSupabase(
        {
          id: `usdt-${userId}`,
          symbol: "USDT",
          name: "Tether USD",
          asset_type: "crypto",
          units: pref.units,
          avg_buy_price: pref.units > 0 ? Math.round(pref.costBasis / pref.units) : pref.rate,
          current_price: pref.rate,
          currency: "IDR",
          icon: "Coins",
          last_price_updated_at: new Date().toISOString(),
        },
        userId,
      ).catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("trouvaille_holdings_updated"));
    }
  } catch (e) {
    console.warn("Failed to persist USDT preference:", e);
  }
}

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Asynchronously synchronizes a holding row with Supabase cloud table `public.holdings`.
 */
export async function syncHoldingToSupabase(holding: InvestmentHolding, userId: string): Promise<void> {
  if (!userId || userId === "guest_local_user") return;
  try {
    let holdingId = holding.id;

    // Ensure ID is a valid UUID for PostgreSQL UUID primary key
    if (!isValidUUID(holdingId)) {
      const { data: existing } = await supabase
        .from("holdings")
        .select("id")
        .eq("user_id", userId)
        .eq("symbol", holding.symbol)
        .limit(1)
        .maybeSingle();

      if (existing?.id && isValidUUID(existing.id)) {
        holdingId = existing.id;
      } else {
        holdingId = generateUUID();
      }
      holding.id = holdingId;
    }

    const validWalletId = holding.wallet_id && isValidUUID(holding.wallet_id) ? holding.wallet_id : null;

    await supabase.from("holdings").upsert({
      id: holdingId,
      user_id: userId,
      symbol: holding.symbol,
      name: holding.name,
      asset_type: holding.asset_type,
      units: holding.units,
      avg_buy_price: holding.avg_buy_price,
      current_price: holding.current_price,
      currency: holding.currency || "IDR",
      notes: holding.notes || null,
      icon: holding.icon || "TrendingUp",
      annual_rate: holding.annual_rate || null,
      purchase_date: holding.purchase_date || null,
      wallet_id: validWalletId,
      last_price_updated_at: holding.last_price_updated_at || new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[syncHoldingToSupabase] Supabase sync notice:", e);
  }
}

/**
 * Asynchronously removes a holding row from Supabase.
 */
export async function deleteHoldingFromSupabase(id: string, userId: string): Promise<void> {
  if (!userId || userId === "guest_local_user") return;
  try {
    if (isValidUUID(id)) {
      await supabase.from("holdings").delete().eq("id", id).eq("user_id", userId);
    }
  } catch (e) {
    console.warn("[deleteHoldingFromSupabase] Supabase delete notice:", e);
  }
}

/**
 * Loads cloud holdings from Supabase and merges into local cache.
 */
export async function fetchHoldingsFromSupabase(userId: string): Promise<InvestmentHolding[]> {
  if (!userId || userId === "guest_local_user") return getSavedHoldings(userId);
  try {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      const nonUsdtHoldings: InvestmentHolding[] = [];
      let foundUsdt: any = null;

      for (const row of data) {
        if (row.symbol === "USDT") {
          foundUsdt = row;
        } else {
          nonUsdtHoldings.push({
            id: row.id,
            wallet_id: row.wallet_id || undefined,
            symbol: row.symbol,
            name: row.name,
            asset_type: row.asset_type,
            units: Number(row.units) || 0,
            avg_buy_price: Number(row.avg_buy_price) || 0,
            current_price: Number(row.current_price) || 0,
            currency: row.currency || "IDR",
            notes: row.notes || undefined,
            icon: row.icon || "TrendingUp",
            annual_rate: row.annual_rate ? Number(row.annual_rate) : undefined,
            purchase_date: row.purchase_date || undefined,
            last_price_updated_at: row.last_price_updated_at || undefined,
          });
        }
      }

      // Update local holdings cache
      saveHoldings(nonUsdtHoldings, userId);

      // If USDT was found in cloud, restore USDT preference if local is empty
      if (foundUsdt) {
        const currentUsdt = getSavedUsdtPref(userId);
        if (currentUsdt.units <= 0 && Number(foundUsdt.units) > 0) {
          const restoredUsdt: UsdtValuationPref = {
            units: Number(foundUsdt.units) || 0,
            rate: Number(foundUsdt.current_price) || USD_IDR_ESTIMATE,
            costBasis: Math.round((Number(foundUsdt.units) || 0) * (Number(foundUsdt.avg_buy_price) || USD_IDR_ESTIMATE)),
          };
          const key = getUsdtStorageKey(userId);
          localStorage.setItem(key, JSON.stringify(restoredUsdt));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("trouvaille_holdings_updated"));
          }
        }
      }

      return nonUsdtHoldings;
    }
  } catch (e) {
    console.warn("[fetchHoldingsFromSupabase] Fetch notice:", e);
  }
  return getSavedHoldings(userId);
}

/**
 * Retrieve saved investment holdings from localStorage scoped to user.
 * Auto-rescues holdings from guest/legacy storage if user account key is empty.
 */
export function getSavedHoldings(userId?: string): InvestmentHolding[] {
  try {
    const key = getHoldingsStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Auto-Rescue: If authenticated user has 0 holdings in target key,
    // search across guest or legacy keys
    if (typeof window !== "undefined" && key !== "trouvaille_holdings_guest_v1") {
      const candidateKeys = [
        "trouvaille_holdings_guest_v1",
        HOLDINGS_STORAGE_KEY,
      ];
      for (const cand of candidateKeys) {
        const legacy = localStorage.getItem(cand);
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(key, legacy);
              return parsed;
            }
          } catch {}
        }
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save investment holdings to localStorage scoped to user, and syncs to Supabase.
 */
export function saveHoldings(holdings: InvestmentHolding[], userId?: string): void {
  try {
    const key = getHoldingsStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(holdings));
    // Clear un-scoped legacy key to prevent leaks into guest mode
    localStorage.removeItem(HOLDINGS_STORAGE_KEY);

    // Sync to Supabase if authenticated
    if (userId && userId !== "guest_local_user") {
      for (const h of holdings) {
        syncHoldingToSupabase(h, userId).catch(() => {});
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("trouvaille_holdings_updated", { detail: holdings }));
    }
  } catch (e) {
    console.warn("Failed to persist holdings:", e);
  }
}

/**
 * Add or update a holding.
 */
export function upsertHolding(holding: InvestmentHolding, userId?: string): InvestmentHolding[] {
  const current = getSavedHoldings(userId);
  const index = current.findIndex((h) => h.id === holding.id);
  const targetId = isValidUUID(holding.id) ? holding.id : generateUUID();
  let updated: InvestmentHolding[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...holding, id: targetId, last_price_updated_at: new Date().toISOString() };
  } else {
    updated = [
      ...current,
      {
        ...holding,
        id: targetId,
        last_price_updated_at: new Date().toISOString(),
      },
    ];
  }
  saveHoldings(updated, userId);
  return updated;
}

/**
 * Automatically refreshes live market quotes for USDT and all active investment holdings.
 * Updates current_price, saves to storage, syncs to Supabase, and dispatches change event.
 */
export async function refreshAllPortfolioPrices(userId?: string): Promise<{
  usdtRate: number;
  updatedHoldings: InvestmentHolding[];
}> {
  // 1. Refresh USDT live rate
  let liveUsdtRate = await fetchUsdtPriceInIDR();
  if (liveUsdtRate && liveUsdtRate > 5000 && liveUsdtRate < 50000) {
    const currentPref = getSavedUsdtPref(userId);
    if (currentPref.rate !== liveUsdtRate) {
      saveUsdtPref({ ...currentPref, rate: liveUsdtRate }, userId);
    }
  } else {
    liveUsdtRate = USD_IDR_ESTIMATE;
  }

  // 2. Refresh active market holdings (crypto & stock)
  const holdings = getSavedHoldings(userId);
  let hasChanges = false;
  const updatedHoldings: InvestmentHolding[] = [];

  for (const h of holdings) {
    let newPrice: number | null = null;
    try {
      if (h.asset_type === "crypto") {
        newPrice = await fetchCryptoPriceInIDR(h.symbol);
      } else if (h.asset_type === "stock") {
        newPrice = await fetchStockPriceInIDR(h.symbol);
      }
    } catch {
      // Keep current price on network fallback
    }

    if (newPrice && newPrice > 0 && Math.abs(newPrice - h.current_price) > 0.001) {
      hasChanges = true;
      updatedHoldings.push({
        ...h,
        current_price: newPrice,
        last_price_updated_at: new Date().toISOString(),
      });
    } else {
      updatedHoldings.push(h);
    }
  }

  if (hasChanges) {
    saveHoldings(updatedHoldings, userId);
  }

  return {
    usdtRate: liveUsdtRate,
    updatedHoldings,
  };
}

/**
 * Delete a holding by ID.
 */
export function deleteHolding(id: string, userId?: string): InvestmentHolding[] {
  const current = getSavedHoldings(userId);
  const updated = current.filter((h) => h.id !== id);
  saveHoldings(updated, userId);
  if (userId && userId !== "guest_local_user") {
    deleteHoldingFromSupabase(id, userId).catch(() => {});
  }
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
 * Calculates current price/value given buy price, annual growth/depreciation rate %, and purchase date.
 * Uses continuous/compound annual rate: value = buyPrice * (1 + rate / 100)^yearsElapsed
 */
export function calculateAssetDepreciation(
  buyPrice: number,
  annualRatePct: number,
  purchaseDate: string,
  targetDate: Date = new Date(),
): {
  currentPrice: number;
  yearsElapsed: number;
  totalChange: number;
  totalChangePct: number;
} {
  const buy = Math.max(0, Number(buyPrice) || 0);
  if (buy === 0 || !purchaseDate) {
    return { currentPrice: buy, yearsElapsed: 0, totalChange: 0, totalChangePct: 0 };
  }

  const pDate = new Date(purchaseDate);
  if (isNaN(pDate.getTime())) {
    return { currentPrice: buy, yearsElapsed: 0, totalChange: 0, totalChangePct: 0 };
  }

  const msDiff = targetDate.getTime() - pDate.getTime();
  const yearsElapsed = Math.max(0, msDiff / (365.25 * 24 * 3600 * 1000));
  const rate = Number(annualRatePct) || 0;

  // Compound rate: price = buyPrice * (1 + rate / 100)^yearsElapsed
  let factor = 1;
  if (rate <= -100) {
    factor = 0;
  } else {
    factor = Math.pow(1 + rate / 100, yearsElapsed);
  }

  const currentPrice = Math.max(0, Math.round(buy * factor));
  const totalChange = currentPrice - buy;
  const totalChangePct = buy > 0 ? (totalChange / buy) * 100 : 0;

  return {
    currentPrice,
    yearsElapsed,
    totalChange,
    totalChangePct,
  };
}

/**
 * Calculate valuation and floating profit/loss for a single holding.
 */
export function calculateHoldingValuation(holding: InvestmentHolding): HoldingValuation {
  const units = Number(holding.units || 0);
  const buyPrice = Number(holding.avg_buy_price || 0);
  let currentPrice = Number(holding.current_price || buyPrice);

  // If holding has annual depreciation/growth rate and purchase date, dynamically adjust current market price
  if (
    typeof holding.annual_rate === "number" &&
    holding.annual_rate !== 0 &&
    holding.purchase_date
  ) {
    const dep = calculateAssetDepreciation(
      buyPrice,
      holding.annual_rate,
      holding.purchase_date,
    );
    currentPrice = dep.currentPrice;
  }

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
