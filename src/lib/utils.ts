import clsx, { type ClassValue } from "clsx";
import {
  convertCurrency,
  formatCurrencyAmount,
  type SupportedCurrency,
  CURRENCY_METADATA,
  getCachedNumberFormatter,
} from "./currency";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getActivePreferredCurrency(): SupportedCurrency {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("trouvaille_preferred_currency") as SupportedCurrency;
      if (saved && CURRENCY_METADATA[saved]) {
        return saved;
      }
    }
  } catch {
    // ignore
  }
  return "IDR";
}

export function formatRupiah(amount: number, forceCurrency?: SupportedCurrency): string {
  const val = Number(amount);
  const curr = forceCurrency || getActivePreferredCurrency();
  if (isNaN(val) || amount === null || amount === undefined) {
    return formatCurrencyAmount(0, curr);
  }
  if (curr === "IDR") {
    return getCachedNumberFormatter("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  }
  const converted = convertCurrency(val, "IDR", curr);
  return formatCurrencyAmount(converted, curr);
}

export const formatCurrency = formatRupiah;

export function parseRupiah(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

const DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getCachedDateTimeFormatter(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}_${options?.day ?? ""}_${options?.month ?? ""}_${options?.year ?? ""}`;
  let formatter = DATE_FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    DATE_FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Unknown Date";
  return getCachedDateTimeFormatter("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  return dateStr === new Date().toISOString().split("T")[0]
}

export function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false
  return dateStr === new Date(Date.now() - 86400000).toISOString().split("T")[0]
}

export function getDateLabel(dateStr: string): string {
  if (!dateStr || dateStr === "undefined" || dateStr === "null") return "Unknown Date"
  if (isToday(dateStr)) return "Today"
  if (isYesterday(dateStr)) return "Yesterday"
  return formatDate(dateStr)
}

/**
 * Format asset holding units cleanly:
 * - If units >= 1: rounds to integer (no awkward decimals like 1,002.316)
 * - If 0 < units < 1: preserves significant fractional digits up to 4 places (e.g. 0.045 BTC)
 */
export function formatHoldingUnits(units: number | string | null | undefined): string {
  const val = Number(units);
  if (isNaN(val) || val === 0) return "0";
  // Support up to 8 decimal places (crypto like BTC, ETH may have fractional units >= 1)
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
  const formatted = fmt.format(val);
  // Trim trailing zeros after decimal point
  return formatted.includes(".")
    ? formatted.replace(/\.?(0+)$/, "")
    : formatted;
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Auto-format numeric inputs live as the user types with thousand separators.
 * - Integer (IDR): 1000000 -> "1.000.000"
 * - Decimals (USD, Crypto Units, APY): 1234.56 -> "1.234,56" or "1,234.56"
 */
export interface FormattedLiveAmount {
  display: string;
  rawNumber: number;
  formatted: string;
  raw: number;
}

export function formatLiveAmountInput(
  value: string,
  isIndonesian: boolean = true,
  allowDecimals: boolean = false,
  maxDecimals: number = 8,
): FormattedLiveAmount {
  if (!value) return { display: "", rawNumber: 0, formatted: "", raw: 0 };

  if (!allowDecimals) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return { display: "", rawNumber: 0, formatted: "", raw: 0 };
    const num = parseInt(digits.slice(0, 15), 10);
    const display = num.toLocaleString(isIndonesian ? "id-ID" : "en-US");
    return {
      display,
      rawNumber: num,
      formatted: display,
      raw: num,
    };
  }

  // Handle decimals (allows '.' or ',' as decimal separator)
  const separator = isIndonesian ? "," : ".";
  const thousandSep = isIndonesian ? "." : ",";

  // Normalize decimal character to standard dot for parsing
  const normalized = value
    .replace(new RegExp(`\\${thousandSep}`, "g"), "")
    .replace(",", ".");

  // Check if trailing decimal was just typed (e.g. "12.")
  const endsWithDecimal = value.endsWith(".") || value.endsWith(",");

  const parts = normalized.split(".");
  const intPart = parts[0].replace(/\D/g, "");
  const decPart =
    parts.length > 1 ? parts[1].replace(/\D/g, "").slice(0, maxDecimals) : "";

  const intNum = intPart ? parseInt(intPart, 10) : 0;
  const formattedInt = intPart
    ? intNum.toLocaleString(isIndonesian ? "id-ID" : "en-US")
    : endsWithDecimal
      ? "0"
      : "";

  let display = formattedInt;
  if (endsWithDecimal && parts.length === 1) {
    display = `${formattedInt}${separator}`;
  } else if (parts.length > 1) {
    display = `${formattedInt}${separator}${decPart}`;
  }

  const rawNumber = parseFloat(`${intNum}.${decPart || 0}`) || 0;
  return { display, rawNumber, formatted: display, raw: rawNumber };
}
