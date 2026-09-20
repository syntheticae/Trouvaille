import { createContext, useContext, type ReactNode } from "react";
import {
  useCurrency as useCurrencyInternal,
  type SupportedCurrency,
  type CurrencyMeta,
  CURRENCY_METADATA,
  DEFAULT_RATES,
} from "../lib/currency";

export interface CurrencyContextValue {
  preferredCurrency: SupportedCurrency;
  currencyMeta: CurrencyMeta;
  setPreferredCurrency: (curr: SupportedCurrency) => void;
  rates: Record<SupportedCurrency, number>;
  lastUpdated: number;
  isLoading: boolean;
  refreshRates: () => Promise<void>;
  convertFromIdr: (idrAmount: number, targetCurr?: SupportedCurrency) => number;
  convertToIdr: (foreignAmount: number, sourceCurr?: SupportedCurrency) => number;
  formatWithPreferred: (idrAmount: number, options?: { showCode?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currencyState = useCurrencyInternal();
  const meta = CURRENCY_METADATA[currencyState.preferredCurrency] || CURRENCY_METADATA.IDR;

  const value: CurrencyContextValue = {
    ...currencyState,
    currencyMeta: meta,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Graceful fallback if rendered outside of Provider (e.g. isolated test environments)
    return {
      preferredCurrency: "IDR",
      currencyMeta: CURRENCY_METADATA.IDR,
      setPreferredCurrency: () => {},
      rates: DEFAULT_RATES,
      lastUpdated: Date.now(),
      isLoading: false,
      refreshRates: async () => {},
      convertFromIdr: (amt: number) => amt,
      convertToIdr: (amt: number) => amt,
      formatWithPreferred: (amt: number) => `Rp ${Math.round(amt).toLocaleString("id-ID")}`,
    };
  }
  return context;
}

export { CURRENCY_METADATA, DEFAULT_RATES, type SupportedCurrency, type CurrencyMeta };
