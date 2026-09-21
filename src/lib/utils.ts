import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRupiah(amount: number): string {
  const val = Number(amount)
  if (isNaN(val) || amount === null || amount === undefined) return "Rp 0"
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val)
}

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
