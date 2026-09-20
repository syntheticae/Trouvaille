import { describe, it, expect } from "vitest";
import {
  CURRENCY_METADATA,
  DEFAULT_RATES,
  convertCurrency,
  formatCurrencyAmount,
  type SupportedCurrency,
} from "../src/lib/currency";

describe("Multi-Currency & Global Exchange Rate Engine Suite", () => {
  const EXPECTED_CURRENCIES: SupportedCurrency[] = [
    "IDR",
    "USD",
    "SGD",
    "EUR",
    "JPY",
    "MYR",
    "THB",
    "AUD",
    "GBP",
    "CNY",
    "SAR",
    "AED",
    "USDT",
  ];

  // ─── 1. Metadata & GEMINI.md Strict Design Rule ───────────────────────────
  describe("Currency Metadata & Design Compliance", () => {
    it("provides comprehensive coverage for all 13 supported international currencies", () => {
      EXPECTED_CURRENCIES.forEach((code) => {
        const meta = CURRENCY_METADATA[code];
        expect(meta).toBeDefined();
        expect(meta.code).toBe(code);
        expect(meta.name.length).toBeGreaterThan(3);
        expect(meta.symbol.length).toBeGreaterThan(0);
      });
    });

    it("strictly uses monochrome 2-letter ISO country codes instead of native system emojis", () => {
      EXPECTED_CURRENCIES.forEach((code) => {
        const meta = CURRENCY_METADATA[code];
        expect(meta.countryCode).toMatch(/^[A-Z]{2}$/);
        // Ensure no Unicode colored emojis in countryCode or code
        expect(meta.countryCode).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
      });
    });

    it("specifies correct decimal precision according to currency standards", () => {
      expect(CURRENCY_METADATA.IDR.decimals).toBe(0);
      expect(CURRENCY_METADATA.JPY.decimals).toBe(0);
      expect(CURRENCY_METADATA.USD.decimals).toBe(2);
      expect(CURRENCY_METADATA.SGD.decimals).toBe(2);
      expect(CURRENCY_METADATA.EUR.decimals).toBe(2);
      expect(CURRENCY_METADATA.MYR.decimals).toBe(2);
      expect(CURRENCY_METADATA.SAR.decimals).toBe(2);
      expect(CURRENCY_METADATA.AED.decimals).toBe(2);
      expect(CURRENCY_METADATA.USDT.decimals).toBe(2);
    });
  });

  // ─── 2. Offline Fallback Rates & Conversion Calculations ──────────────────
  describe("Exchange Rates & Currency Conversions", () => {
    it("maintains positive default offline rates for all 13 currencies", () => {
      EXPECTED_CURRENCIES.forEach((code) => {
        const rate = DEFAULT_RATES[code];
        expect(rate).toBeDefined();
        expect(rate).toBeGreaterThan(0);
      });
      expect(DEFAULT_RATES.IDR).toBe(1);
    });

    it("accurately converts foreign currency to IDR base", () => {
      // 100 USD at 15,850 IDR rate = 1,585,000 IDR
      const customRates: Record<SupportedCurrency, number> = {
        ...DEFAULT_RATES,
        USD: 1 / 15850,
      };
      const idrResult = convertCurrency(100, "USD", "IDR", customRates);
      expect(idrResult).toBeCloseTo(1585000, 0);
    });

    it("accurately converts IDR to foreign currency (Umrah SAR & Travel MYR)", () => {
      // Rp 4,225,000 IDR to SAR at 4,225 rate = 1,000 SAR
      const customRates: Record<SupportedCurrency, number> = {
        ...DEFAULT_RATES,
        SAR: 1 / 4225,
        MYR: 1 / 3580,
      };
      const sarResult = convertCurrency(4225000, "IDR", "SAR", customRates);
      expect(sarResult).toBeCloseTo(1000, 1);

      // Rp 3,580,000 IDR to MYR at 3,580 rate = 1,000 MYR
      const myrResult = convertCurrency(3580000, "IDR", "MYR", customRates);
      expect(myrResult).toBeCloseTo(1000, 1);
    });

    it("handles zero amounts and identity conversions without mutation", () => {
      expect(convertCurrency(0, "USD", "IDR")).toBe(0);
      expect(convertCurrency(500, "USD", "USD")).toBe(500);
      expect(convertCurrency(100000, "IDR", "IDR")).toBe(100000);
    });

    it("performs cross-currency conversions between non-IDR pairs via base", () => {
      // 100 USD (at 15,850) = 1,585,000 IDR -> SGD (at 11,820) ≈ 134.09 SGD
      const customRates: Record<SupportedCurrency, number> = {
        ...DEFAULT_RATES,
        USD: 1 / 15850,
        SGD: 1 / 11820,
      };
      const sgdResult = convertCurrency(100, "USD", "SGD", customRates);
      expect(sgdResult).toBeCloseTo(134.09, 1);
    });
  });

  // ─── 3. Standardized Formatting ───────────────────────────────────────────
  describe("Format Currency Amount", () => {
    it("formats Indonesian Rupiah with Rp prefix and no decimals", () => {
      const formatted = formatCurrencyAmount(150000, "IDR");
      expect(formatted).toBe("Rp 150.000");
    });

    it("formats Japanese Yen with symbol and no decimals", () => {
      const formatted = formatCurrencyAmount(12500, "JPY");
      expect(formatted).toBe("¥12,500");
    });

    it("formats US Dollar with 2 decimal places", () => {
      const formatted = formatCurrencyAmount(49.99, "USD");
      expect(formatted).toBe("$49.99");
    });

    it("formats Saudi Riyal with native symbol and 2 decimals", () => {
      const formatted = formatCurrencyAmount(350.5, "SAR");
      expect(formatted).toBe("﷼350.50");
    });

    it("formats Malaysian Ringgit with RM prefix and 2 decimals", () => {
      const formatted = formatCurrencyAmount(85.2, "MYR");
      expect(formatted).toBe("RM85.20");
    });

    it("correctly displays negative sign before currency symbol", () => {
      const formatted = formatCurrencyAmount(-120.75, "USD");
      expect(formatted).toBe("-$120.75");
    });

    it("appends ISO code suffix when showCode option is enabled", () => {
      const formatted = formatCurrencyAmount(100, "USD", { showCode: true });
      expect(formatted).toBe("$100.00 USD");
    });
  });
});
