import clsx, { type ClassValue } from "clsx";
import {
  convertCurrency,
  formatCurrencyAmount,
  type SupportedCurrency,
  CURRENCY_METADATA,
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
    return new Intl.NumberFormat("id-ID", {
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
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "Unknown Date"
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d)
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
