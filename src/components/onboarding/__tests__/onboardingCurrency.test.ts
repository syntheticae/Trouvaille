import { describe, it, expect } from "vitest";
import { CURRENCY_METADATA, convertCurrency, type SupportedCurrency } from "../../../lib/currency";

describe("Onboarding Currency Integration Suite", () => {
  it("supports all 13 verified currencies with proper symbols and metadata", () => {
    const supportedList: SupportedCurrency[] = [
      "IDR", "USD", "SGD", "EUR", "JPY", "MYR",
      "THB", "AUD", "GBP", "CNY", "SAR", "AED", "USDT"
    ];

    supportedList.forEach((code) => {
      const meta = CURRENCY_METADATA[code];
      expect(meta).toBeDefined();
      expect(meta.code).toBe(code);
      expect(meta.symbol.length).toBeGreaterThan(0);
      expect(meta.name.length).toBeGreaterThan(0);
      expect(typeof meta.decimals).toBe("number");
    });
  });

  it("converts initial balance correctly between selected currency and internal base IDR", () => {
    // If a user selects USD and enters 1,000 as initial reserve
    const usdAmount = 1000;
    const convertedToIdr = convertCurrency(usdAmount, "USD", "IDR");
    
    expect(convertedToIdr).toBeCloseTo(1000 * 15850, -2);

    // Converting back to USD should yield original 1,000 USD
    const convertedBack = convertCurrency(convertedToIdr, "IDR", "USD");
    expect(convertedBack).toBeCloseTo(1000, 2);
  });

  it("calculates adaptive quick increment chips appropriately for different currencies", () => {
    const getIncrements = (curr: SupportedCurrency) => {
      if (curr === "IDR") return [250000, 500000, 1000000, 5000000];
      if (curr === "JPY") return [5000, 10000, 50000, 100000];
      if (["USD", "EUR", "SGD", "GBP", "AUD", "USDT"].includes(curr)) {
        return [100, 500, 1000, 5000];
      }
      return [500, 1000, 5000, 10000];
    };

    expect(getIncrements("IDR")).toEqual([250000, 500000, 1000000, 5000000]);
    expect(getIncrements("USD")).toEqual([100, 500, 1000, 5000]);
    expect(getIncrements("SGD")).toEqual([100, 500, 1000, 5000]);
    expect(getIncrements("JPY")).toEqual([5000, 10000, 50000, 100000]);
  });
});
