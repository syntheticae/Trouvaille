import { useState, useEffect, useCallback } from "react";

export type SupportedCurrency = "IDR" | "USD" | "SGD" | "EUR" | "JPY";

export interface CurrencyMeta {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  flag: string;
  decimals: number;
}

export const CURRENCY_METADATA: Record<SupportedCurrency, CurrencyMeta> = {
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", flag: "🇮🇩", decimals: 0 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", decimals: 0 },
};

// Default offline fallback rates (Units of Foreign Currency per 1 IDR)
export const DEFAULT_RATES: Record<SupportedCurrency, number> = {
  IDR: 1,
  USD: 1 / 15850,
  SGD: 1 / 11820,
  EUR: 1 / 17150,
  JPY: 1 / 106,
};

export interface ExchangeRatesData {
  base: "IDR";
  timestamp: number;
  rates: Record<SupportedCurrency, number>;
}

const STORAGE_KEY = "trouvaille_exchange_rates_v1";
const PREFERRED_CURRENCY_KEY = "trouvaille_preferred_currency";

export function getCachedRates(): ExchangeRatesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rates && parsed.rates.USD) {
        return parsed;
      }
    }
  } catch {
    // ignore parse failure
  }
  return {
    base: "IDR",
    timestamp: Date.now(),
    rates: { ...DEFAULT_RATES },
  };
}

export function saveCachedRates(data: ExchangeRatesData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Fetch live exchange rates with IDR as base.
 * Gracefully falls back to cached or default rates when offline.
 */
export async function fetchLiveExchangeRates(): Promise<ExchangeRatesData> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/IDR", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    if (json && json.rates) {
      const newRates: Record<SupportedCurrency, number> = {
        IDR: 1,
        USD: json.rates.USD || DEFAULT_RATES.USD,
        SGD: json.rates.SGD || DEFAULT_RATES.SGD,
        EUR: json.rates.EUR || DEFAULT_RATES.EUR,
        JPY: json.rates.JPY || DEFAULT_RATES.JPY,
      };
      const data: ExchangeRatesData = {
        base: "IDR",
        timestamp: Date.now(),
        rates: newRates,
      };
      saveCachedRates(data);
      return data;
    }
  } catch (err) {
    console.warn("Could not fetch live exchange rates, falling back to cache/default:", err);
  }
  return getCachedRates();
}

/**
 * Convert any amount from one supported currency to another.
 */
export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  customRates?: Record<SupportedCurrency, number>
): number {
  if (from === to || amount === 0) return amount;
  const rates = customRates || getCachedRates().rates;

  const rateFrom = rates[from] || DEFAULT_RATES[from] || 1;
  const rateTo = rates[to] || DEFAULT_RATES[to] || 1;

  // Convert to base IDR first: amount / rateFrom
  const amountInIdr = from === "IDR" ? amount : amount / rateFrom;

  // Convert IDR to target: amountInIdr * rateTo
  const targetAmount = to === "IDR" ? amountInIdr : amountInIdr * rateTo;

  return targetAmount;
}

/**
 * Format currency with internationalization standard and native symbol.
 */
export function formatCurrencyAmount(
  amount: number,
  currency: SupportedCurrency = "IDR",
  options?: { showCode?: boolean }
): string {
  const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.IDR;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formattedNumber = "";
  if (currency === "IDR") {
    formattedNumber = Math.round(absAmount).toLocaleString("id-ID");
  } else if (currency === "JPY") {
    formattedNumber = Math.round(absAmount).toLocaleString("ja-JP");
  } else {
    formattedNumber = absAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const sign = isNegative ? "-" : "";
  const prefix = meta.symbol === "Rp" ? "Rp " : meta.symbol;
  const codeSuffix = options?.showCode ? ` ${currency}` : "";

  return `${sign}${prefix}${formattedNumber}${codeSuffix}`;
}

/**
 * React hook to access and manage the active viewing currency across the app.
 */
export function useCurrency() {
  const [preferredCurrency, setPreferredCurrencyState] = useState<SupportedCurrency>(() => {
    try {
      const saved = localStorage.getItem(PREFERRED_CURRENCY_KEY) as SupportedCurrency;
      if (saved && CURRENCY_METADATA[saved]) return saved;
    } catch {
      // fallback
    }
    return "IDR";
  });

  const [ratesData, setRatesData] = useState<ExchangeRatesData>(getCachedRates);
  const [isLoading, setIsLoading] = useState(false);

  const setPreferredCurrency = useCallback((curr: SupportedCurrency) => {
    setPreferredCurrencyState(curr);
    try {
      localStorage.setItem(PREFERRED_CURRENCY_KEY, curr);
    } catch {
      // ignore
    }
  }, []);

  const refreshRates = useCallback(async () => {
    setIsLoading(true);
    const updated = await fetchLiveExchangeRates();
    setRatesData(updated);
    setIsLoading(false);
  }, []);

  // Check rate freshness on mount: fetch if cached rates are older than 24 hours
  useEffect(() => {
    const isStale = Date.now() - ratesData.timestamp > 24 * 60 * 60 * 1000;
    if (isStale) {
      refreshRates();
    }
  }, [ratesData.timestamp, refreshRates]);

  const convertFromIdr = useCallback(
    (idrAmount: number, targetCurr: SupportedCurrency = preferredCurrency) => {
      return convertCurrency(idrAmount, "IDR", targetCurr, ratesData.rates);
    },
    [preferredCurrency, ratesData.rates]
  );

  const convertToIdr = useCallback(
    (foreignAmount: number, sourceCurr: SupportedCurrency = preferredCurrency) => {
      return convertCurrency(foreignAmount, sourceCurr, "IDR", ratesData.rates);
    },
    [preferredCurrency, ratesData.rates]
  );

  const formatWithPreferred = useCallback(
    (idrAmount: number, options?: { showCode?: boolean }) => {
      const converted = convertFromIdr(idrAmount, preferredCurrency);
      return formatCurrencyAmount(converted, preferredCurrency, options);
    },
    [convertFromIdr, preferredCurrency]
  );

  return {
    preferredCurrency,
    setPreferredCurrency,
    rates: ratesData.rates,
    lastUpdated: ratesData.timestamp,
    isLoading,
    refreshRates,
    convertFromIdr,
    convertToIdr,
    formatWithPreferred,
  };
}
