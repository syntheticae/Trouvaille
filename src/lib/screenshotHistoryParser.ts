// ======================================================================
// TROUVAILLE SCREENSHOT & LIVE TEXT HISTORY PARSER v2.0
// Offline heuristic parser for multi-app transaction history screens:
// - GoPay & Gojek Riwayat
// - Shopee Pesanan & ShopeePay Riwayat
// - Grab & OVO Riwayat Transaksi
// - DANA Riwayat & Mutasi
// - Tokopedia & TikTok Shop Pesanan
// - BCA Mobile, myBCA, Livin' Mandiri, wondr by BNI, BRImo
// ======================================================================

import { format, subDays, addDays, isValid } from "date-fns";
import type { Category, Wallet, Transaction, TransactionType, Bill } from "./types";
import type { ParsedStatementItem } from "./statementParser";
import { resolveTransactionCategory } from "./categoryResolver";
import { parseIndonesianDate, parseCurrencyAmount } from "./deepLinkHandler";
import { BANK_ALIASES } from "./slipParser";
import { getMerchantMemory } from "./merchantCategoryMemory";
import { findBestMatchingBill } from "./billMatchingEngine";

interface RawHistoryRecord {
  dateStr?: string;
  timeStr?: string;
  title: string;
  amount: number;
  type: TransactionType;
  rawText: string;
  isStatusGagal?: boolean;
}

/**
 * Checks if raw text appears to be a multi-transaction history screen rather than
 * a single receipt, invoice, or single-line notification.
 */
export function isMultiTransactionHistoryText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const clean = text.trim();
  if (clean.length < 30) return false;

  const lower = clean.toLowerCase();

  // Strong signals for transaction history screen
  const historyKeywords = [
    "riwayat transaksi",
    "riwayat",
    "aktivitas",
    "mutasi rekening",
    "mutasi",
    "histori",
    "pesanan saya",
    "daftar transaksi",
    "transaksi terakhir",
    "catatan transaksi",
  ];

  const hasHistorySignal = historyKeywords.some((kw) => lower.includes(kw));

  // Count independent amounts in the text (e.g. "Rp 50.000", "-Rp25.000", "+Rp100.000", "50.000,00 DB")
  const amountPattern = /(?:[+\-]?\s*rp\.?\s*[\d.,]+|[\d.,]+\s*(?:db|cr)\b)/gi;
  const matches = clean.match(amountPattern) || [];

  // If explicit history header and at least 2 amounts -> definitely a history screen
  if (hasHistorySignal && matches.length >= 2) return true;

  // If at least 3 distinct currency amounts found across multiple lines -> history screen
  if (matches.length >= 3 && clean.includes("\n")) return true;

  return false;
}

/**
 * Clean redundant metadata from extracted titles (order IDs, trailing status pills, etc.)
 */
function cleanHistoryTitle(raw: string): string {
  return raw
    .replace(/^order\s+[a-z0-9_-]+\s*-\s*/i, "") // e.g. "Order GF-839201948 - "
    .replace(/^pesanan\s+[a-z0-9_-]+\s*-\s*/i, "")
    .replace(/\b(?:berhasil|menunggu|sukses|selesai|terkirim|lunas)\b/gi, "")
    .replace(/\b(?:diskon|voucher|cashback|hemat|potongan)\s*rp\.?\s*[\d.,]+/gi, "")
    .replace(/\b(?:ongkir|biaya layanan|biaya penanganan)\s*rp\.?\s*[\d.,]+/gi, "")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:wib|wita|wit)?\b/gi, "")
    .replace(/[•·|\-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parse GoPay "Riwayat Transaksi" OCR text
 */
function parseGoPayHistory(lines: string[]): RawHistoryRecord[] {
  const records: RawHistoryRecord[] = [];
  let currentDate = format(new Date(), "yyyy-MM-dd");

  // Filter out UI noise lines
  const cleanLines = lines.map((l) => l.trim()).filter((l) => {
    if (!l) return false;
    const low = l.toLowerCase();
    return (
      !low.startsWith("riwayat transaksi") &&
      !low.startsWith("cari transaksi") &&
      !low.startsWith("semua") &&
      !low.startsWith("filter") &&
      !low.startsWith("unduh") &&
      !low.startsWith("hanya menampilkan")
    );
  });

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    // 1. Check for Date Headers (e.g., "Kamis 22 Mei 2025", "25 Sep 2024", "Hari Ini", "Kemarin")
    if (
      /(?:hari ini|kemarin)/i.test(line) ||
      /^(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)[,\s]/i.test(line) ||
      /^\d{1,2}\s+(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)/i.test(line)
    ) {
      if (/hari ini/i.test(line)) {
        currentDate = format(new Date(), "yyyy-MM-dd");
      } else if (/kemarin/i.test(line)) {
        currentDate = format(subDays(new Date(), 1), "yyyy-MM-dd");
      } else {
        const parsed = parseIndonesianDate(line);
        if (parsed && isValid(parsed)) {
          currentDate = format(parsed, "yyyy-MM-dd");
        }
      }
      continue;
    }

    // 2. Check for GoPay Amount line: "-Rp45.000", "+Rp50.000", "Rp 44.000", "- Rp 25.000"
    const amountMatch = line.match(/^([+\-])?\s*rp\.?\s*([\d.,]+)/i);
    if (amountMatch) {
      const sign = amountMatch[1] || "-"; // Default to expense if no sign
      const amountVal = parseCurrencyAmount(amountMatch[2]);
      if (amountVal <= 0) continue;

      const isExpense = sign === "-";
      const txType: TransactionType = isExpense ? "expense" : "income";

      // Look back 1-2 lines for Title / Merchant
      let title = "Transaksi GoPay";
      let timeStr: string | undefined;

      for (let prevIdx = i - 1; prevIdx >= Math.max(0, i - 3); prevIdx--) {
        const prevLine = cleanLines[prevIdx];
        if (prevLine.match(/^[+\-]?\s*rp/i)) break; // Hit another amount

        // Check for time: "14:15", "19:42 • GoPay Saldo"
        const timeMatch = prevLine.match(/(\d{1,2}:\d{2})/);
        if (timeMatch && !timeStr) {
          timeStr = timeMatch[1];
        }

        // Avoid pure date or status headers as title
        if (
          !/(?:hari ini|kemarin|berhasil|menunggu|gagal)/i.test(prevLine) &&
          prevLine.length > 2 &&
          !/^\d{1,2}[/-]\d{1,2}/.test(prevLine)
        ) {
          title = prevLine;
          break;
        }
      }

      // Check next line for failure status
      const nextLine = cleanLines[i + 1] || "";
      const isFailed = /gagal|dibatalkan|kadaluarsa/i.test(nextLine);

      records.push({
        dateStr: currentDate,
        timeStr,
        title: cleanHistoryTitle(title),
        amount: amountVal,
        type: txType,
        rawText: `${title} | ${line}`,
        isStatusGagal: isFailed,
      });
    }
  }

  return records;
}

/**
 * Parse Shopee Order & ShopeePay History
 */
function parseShopeeHistory(lines: string[]): RawHistoryRecord[] {
  const records: RawHistoryRecord[] = [];
  let currentDate = format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Shopee Total Pesanan pattern: "Total Pesanan: Rp312.000" or "Total: Rp45.000"
    const orderTotalMatch = line.match(/(?:total\s+pesanan|total\s+belanja|total|pesanan\s+selesai)[:\s]*rp\.?\s*([\d.,]+)/i);
    if (orderTotalMatch) {
      const amt = parseCurrencyAmount(orderTotalMatch[1]);
      if (amt > 0) {
        // Find store or item name looking back
        let title = "Pesanan Shopee";
        for (let b = i - 1; b >= Math.max(0, i - 5); b--) {
          const prev = lines[b].trim();
          if (prev.length > 3 && !/pesanan|total|selesai|variasi|beli lagi/i.test(prev)) {
            title = prev;
            break;
          }
        }
        records.push({
          dateStr: currentDate,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: "expense",
          rawText: `${title} | ${line}`,
        });
        continue;
      }
    }

    // ShopeePay wallet history pattern: "-Rp150.000" or "+Rp200.000"
    const spayMatch = line.match(/^([+\-])\s*rp\.?\s*([\d.,]+)/i);
    if (spayMatch) {
      const isOutflow = spayMatch[1] === "-";
      const amt = parseCurrencyAmount(spayMatch[2]);
      if (amt > 0) {
        let title = "ShopeePay";
        let timeStr: string | undefined;

        for (let b = i - 1; b >= Math.max(0, i - 3); b--) {
          const prev = lines[b].trim();
          const tMatch = prev.match(/(\d{1,2}:\d{2})/);
          if (tMatch && !timeStr) timeStr = tMatch[1];
          if (prev.length > 3 && !tMatch) {
            title = prev;
            break;
          }
        }

        records.push({
          dateStr: currentDate,
          timeStr,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: isOutflow ? "expense" : "income",
          rawText: `${title} | ${line}`,
        });
      }
    }
  }

  return records;
}

/**
 * Parse Grab & OVO Riwayat Transaksi OCR text
 */
function parseGrabHistory(lines: string[]): RawHistoryRecord[] {
  const records: RawHistoryRecord[] = [];
  let currentDate = format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check date headers like "28 Sep 2026", "28 Sep, 12:45", "Hari Ini", "Kemarin"
    if (/hari ini/i.test(line)) {
      currentDate = format(new Date(), "yyyy-MM-dd");
    } else if (/kemarin/i.test(line)) {
      currentDate = format(subDays(new Date(), 1), "yyyy-MM-dd");
    } else {
      const dateMatch = line.match(/^(\d{1,2}\s+(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s*(?:\d{4})?)/i);
      if (dateMatch) {
        const parsed = parseIndonesianDate(dateMatch[1]);
        if (parsed && isValid(parsed)) {
          currentDate = format(parsed, "yyyy-MM-dd");
        }
      }
    }

    // Grab / OVO amount pattern: "Rp42.500", "-Rp42.500", "Rp 50.000", "+Rp100.000"
    const amtMatch = line.match(/^([+\-])?\s*rp\.?\s*([\d.,]+)/i);
    if (amtMatch) {
      const sign = amtMatch[1] || "-";
      const amt = parseCurrencyAmount(amtMatch[2]);
      if (amt > 0) {
        let title = "Transaksi Grab";
        let serviceType = "";
        let timeStr: string | undefined;

        for (let b = i - 1; b >= Math.max(0, i - 6); b--) {
          const prev = lines[b].trim();
          if (/^(?:grabfood|grabbike|grabcar|grabexpress|grabmart)\b/i.test(prev)) {
            serviceType = prev;
          }
          const tMatch = prev.match(/(\d{1,2}:\d{2})/);
          if (tMatch && !timeStr) timeStr = tMatch[1];
          if (
            prev.length > 3 &&
            !/selesai|ovo cash|metode|pesanan|antar ke|titik jemput|diskon|voucher|cashback|hemat|potongan|ongkir|biaya/i.test(prev)
          ) {
            title = prev;
            break;
          }
        }

        if (serviceType && !title.toLowerCase().includes(serviceType.toLowerCase())) {
          title = `${serviceType} - ${title}`;
        }

        records.push({
          dateStr: currentDate,
          timeStr,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: sign === "+" ? "income" : "expense",
          rawText: `${title} | ${line}`,
        });
      }
    }
  }

  return records;
}

/**
 * Parse DANA Riwayat & Mutasi OCR text
 */
function parseDanaHistory(lines: string[]): RawHistoryRecord[] {
  const records: RawHistoryRecord[] = [];
  let currentDate = format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateHeaderMatch = line.match(/^(\d{1,2}\s+(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s*(?:\d{4})?)/i);
    if (dateHeaderMatch) {
      const parsed = parseIndonesianDate(dateHeaderMatch[1]);
      if (parsed && isValid(parsed)) {
        currentDate = format(parsed, "yyyy-MM-dd");
      }
    }

    // DANA amount: "-Rp50.000", "+Rp100.000", "Rp 25.000"
    const danaAmtMatch = line.match(/^([+\-])?\s*rp\.?\s*([\d.,]+)/i);
    if (danaAmtMatch) {
      const isOutflow = danaAmtMatch[1] !== "+";
      const amt = parseCurrencyAmount(danaAmtMatch[2]);
      if (amt > 0) {
        let title = isOutflow ? "Transaksi DANA" : "Top Up DANA";
        let timeStr: string | undefined;

        for (let b = i - 1; b >= Math.max(0, i - 3); b--) {
          const prev = lines[b].trim();
          const tMatch = prev.match(/(\d{1,2}:\d{2})/);
          if (tMatch && !timeStr) timeStr = tMatch[1];
          if (prev.length > 3 && !/berhasil|sukses|qris|saldo|selesai/i.test(prev)) {
            title = prev;
            break;
          }
        }

        records.push({
          dateStr: currentDate,
          timeStr,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: isOutflow ? "expense" : "income",
          rawText: `${title} | ${line}`,
        });
      }
    }
  }

  return records;
}

/**
 * Parse Tokopedia & TikTok Shop Riwayat Pesanan
 */
function parseTokopediaHistory(lines: string[]): RawHistoryRecord[] {
  const records: RawHistoryRecord[] = [];
  let currentDate = format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(/^(\d{1,2}\s+(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s*(?:\d{4})?)/i);
    if (dateMatch) {
      const parsed = parseIndonesianDate(dateMatch[1]);
      if (parsed && isValid(parsed)) {
        currentDate = format(parsed, "yyyy-MM-dd");
      }
    }

    // "Total Belanja: Rp 150.000", "Total Pembayaran: Rp 80.000", "Total Harga: Rp 45.000"
    const totalMatch = line.match(/(?:total\s+belanja|total\s+pembayaran|total\s+tagihan|total\s+harga|total)[:\s]*rp\.?\s*([\d.,]+)/i);
    if (totalMatch) {
      const amt = parseCurrencyAmount(totalMatch[1]);
      if (amt > 0) {
        let title = "Pesanan Tokopedia";
        for (let b = i - 1; b >= Math.max(0, i - 5); b--) {
          const prev = lines[b].trim();
          if (
            prev.length > 3 &&
            !/total|selesai|beli lagi|ulasan|invoice|barang|pesanan|daftar|riwayat|diskon|voucher|cashback/i.test(prev)
          ) {
            title = prev;
            break;
          }
        }

        records.push({
          dateStr: currentDate,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: "expense",
          rawText: `${title} | ${line}`,
        });
      }
    }
  }

  return records;
}

/**
 * Parse m-BCA / BCA Mobile classic text table & Livin Mandiri cards, wondr by BNI, BRImo
 */
function parseBankMutasiHistory(lines: string[]): RawHistoryRecord[] {
  const records: RawHistoryRecord[] = [];
  let currentDate = format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // m-BCA format: "150.000,00 DB" or "1.250.000,00 CR" (with tolerance for OCR typos: DB -> 08, OB, DR; CR -> CP, CA, C8)
    const bcaDbCrMatch = line.match(/([\d.,]+)\s*(?:,\d{2})?\s*(db|cr|08|ob|dr|0b|cp|ca|c8)\b/i);
    if (bcaDbCrMatch) {
      const rawNum = bcaDbCrMatch[1];
      const indicator = bcaDbCrMatch[2].toUpperCase();
      const isExpense = ["DB", "08", "OB", "DR", "0B"].includes(indicator);
      const amt = parseCurrencyAmount(rawNum);

      if (amt > 0) {
        let title = isExpense ? "Pengeluaran BCA" : "Pemasukan BCA";
        let dateFound: string | undefined;

        // Look back for date: "25/09" or "25/09/2026"
        for (let b = i; b >= Math.max(0, i - 4); b--) {
          const prev = lines[b].trim();
          const dateMatch = prev.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
          if (dateMatch && !dateFound) {
            const d = parseInt(dateMatch[1], 10);
            const m = parseInt(dateMatch[2], 10);
            let y = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
            if (y < 100) y += 2000;
            if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
              dateFound = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            }
          }

          if (b < i && prev.length > 3 && !prev.match(/mutasi|periode|trsf|e-banking/i)) {
            title = prev;
          }
        }

        records.push({
          dateStr: dateFound || currentDate,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: isExpense ? "expense" : "income",
          rawText: line,
        });
        continue;
      }
    }

    // Modern card format (myBCA / Livin Mandiri): "- Rp 150.000" or "+ Rp 500.000"
    const cardMatch = line.match(/^([+\-])\s*(?:rp\.?\s*)?([\d.,]+)/i);
    if (cardMatch) {
      const isOutflow = cardMatch[1] === "-";
      const amt = parseCurrencyAmount(cardMatch[2]);
      if (amt > 0) {
        let title = "Transaksi Bank";
        for (let b = i - 1; b >= Math.max(0, i - 3); b--) {
          const prev = lines[b].trim();
          if (prev.length > 3 && !/mutasi|rekening|berhasil/i.test(prev)) {
            title = prev;
            break;
          }
        }
        records.push({
          dateStr: currentDate,
          title: cleanHistoryTitle(title),
          amount: amt,
          type: isOutflow ? "expense" : "income",
          rawText: `${title} | ${line}`,
        });
      }
    }
  }

  return records;
}

/**
 * Resolves optimal source wallet based on app signals in the text
 */
function resolveAppSourceWallet(text: string, wallets: Wallet[]): Wallet | undefined {
  if (wallets.length === 0) return undefined;
  const lower = text.toLowerCase();

  const findWalletByKeyword = (kw: string) => {
    const kwLower = kw.toLowerCase();
    const aliases = BANK_ALIASES[kwLower] || [kwLower];
    return wallets.find((w) => {
      const wLower = w.name.toLowerCase();
      return aliases.some((a) => wLower === a || wLower.includes(a) || a.includes(wLower));
    });
  };

  if (lower.includes("gopay") || lower.includes("gojek")) return findWalletByKeyword("gopay");
  if (lower.includes("shopeepay") || lower.includes("spay") || lower.includes("shopee")) return findWalletByKeyword("shopeepay");
  if (lower.includes("bca") || lower.includes("klikbca")) return findWalletByKeyword("bca");
  if (lower.includes("livin") || lower.includes("mandiri")) return findWalletByKeyword("mandiri");
  if (lower.includes("seabank")) return findWalletByKeyword("seabank");
  if (lower.includes("ovo")) return findWalletByKeyword("ovo");
  if (lower.includes("dana")) return findWalletByKeyword("dana");
  if (lower.includes("bni") || lower.includes("wondr")) return findWalletByKeyword("bni");
  if (lower.includes("bri") || lower.includes("brimo")) return findWalletByKeyword("bri");

  return wallets[0];
}

/**
 * Checks if a transaction item matches an existing transaction within 48 hours (fuzzy duplicate)
 */
function checkDuplicateInWindow(
  itemDate: string,
  amount: number,
  type: TransactionType,
  title: string,
  existingTxs: Transaction[]
): { isDuplicate: boolean; reason?: string } {
  const targetDate = new Date(itemDate);
  if (isNaN(targetDate.getTime())) return { isDuplicate: false };

  const minTime = subDays(targetDate, 2).getTime();
  const maxTime = addDays(targetDate, 2).getTime();

  for (const tx of existingTxs) {
    if (Math.abs(tx.amount - amount) > 0.01) continue;
    if (tx.type && tx.type !== type) continue;

    // Check date within 48 hours
    const txDate = tx.occurred_on ? new Date(tx.occurred_on) : new Date(tx.created_at);
    if (isNaN(txDate.getTime())) continue;

    const time = txDate.getTime();
    if (time >= minTime && time <= maxTime) {
      const dateFormatted = format(txDate, "dd MMM yyyy");
      return {
        isDuplicate: true,
        reason: `Cocok dengan transaksi ${title} pada ${dateFormatted} (Rp ${amount.toLocaleString("id-ID")})`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Main Entry Point: Parses raw text from a screenshot of transaction history
 * and transforms it into rich `ParsedStatementItem[]` for the Review Sheet.
 */
export function parseScreenshotHistory(
  rawText: string,
  existingTransactions: Transaction[] = [],
  categories: Category[] = [],
  wallets: Wallet[] = [],
  bills: Bill[] = []
): ParsedStatementItem[] | null {
  if (!rawText || typeof rawText !== "string") return null;

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const lower = rawText.toLowerCase();
  let rawRecords: RawHistoryRecord[] = [];

  // 1. Dispatch to specialized app history sub-parsers
  if (lower.includes("gopay") || lower.includes("gojek") || lower.includes("gofood")) {
    rawRecords = parseGoPayHistory(lines);
  } else if (lower.includes("grab") || lower.includes("grabfood") || lower.includes("grabbike") || lower.includes("ovo")) {
    rawRecords = parseGrabHistory(lines);
  } else if (lower.includes("shopee") || lower.includes("shopeepay") || lower.includes("spay")) {
    rawRecords = parseShopeeHistory(lines);
  } else if (lower.includes("dana")) {
    rawRecords = parseDanaHistory(lines);
  } else if (
    lower.includes("tokopedia") ||
    lower.includes("tokped") ||
    lower.includes("tiktok shop") ||
    lower.includes("tiktokshop") ||
    lower.includes("total belanja") ||
    lower.includes("total pembayaran")
  ) {
    rawRecords = parseTokopediaHistory(lines);
  } else if (
    lower.includes("bca") ||
    lower.includes("livin") ||
    lower.includes("mandiri") ||
    lower.includes("bni") ||
    lower.includes("wondr") ||
    lower.includes("bri") ||
    lower.includes("brimo") ||
    lower.includes("mutasi")
  ) {
    rawRecords = parseBankMutasiHistory(lines);
  } else {
    // Fallback: Try GoPay pattern, then Grab, then Tokopedia, then bank mutasi
    rawRecords = parseGoPayHistory(lines);
    if (rawRecords.length === 0) rawRecords = parseGrabHistory(lines);
    if (rawRecords.length === 0) rawRecords = parseTokopediaHistory(lines);
    if (rawRecords.length === 0) rawRecords = parseBankMutasiHistory(lines);
  }

  // Filter out records marked as failed in the app UI
  const validRecords = rawRecords.filter((r) => !r.isStatusGagal && r.amount > 0);
  if (validRecords.length === 0) return null;

  // Resolve default source wallet for this batch
  const defaultWallet = resolveAppSourceWallet(rawText, wallets);

  // 2. Map raw records to ParsedStatementItem[]
  const items: ParsedStatementItem[] = validRecords.map((rec, idx) => {
    const cleanDesc = rec.title || "Transaksi";

    // Transfer detection: e.g. "Ditransfer ke BCA", "Transfer ke Rek..."
    let effectiveType = rec.type;
    let destinationWalletId: string | null = null;
    let destinationWalletName: string | null = null;

    if (rec.type === "expense" && /\b(?:ditransfer ke|transfer ke|kirim ke)\b/i.test(cleanDesc)) {
      effectiveType = "transfer";
      // Try to match destination wallet from user's other wallets using names and BANK_ALIASES
      const descLower = cleanDesc.toLowerCase();
      const destMatch = wallets.find((w) => {
        if (w.id === defaultWallet?.id) return false;
        const wLower = w.name.toLowerCase();
        if (descLower.includes(wLower)) return true;
        for (const [key, aliasList] of Object.entries(BANK_ALIASES)) {
          if (wLower.includes(key) || key.includes(wLower)) {
            if (aliasList.some((alias) => descLower.includes(alias))) {
              return true;
            }
          }
        }
        return false;
      });
      if (destMatch) {
        destinationWalletId = destMatch.id;
        destinationWalletName = destMatch.name;
      }
    }

    // Category suggestion (Leverages Merchant Memory + Semantic Classifier)
    const mockTx: Partial<Transaction> = {
      note: cleanDesc,
      type: effectiveType,
      amount: rec.amount,
    };
    const resolvedCat = resolveTransactionCategory(mockTx, categories);

    // Calculate Confidence & Ambiguity (Pilar 3)
    const memory = getMerchantMemory(cleanDesc);
    let confidence = 0.70;
    if (memory) {
      confidence = 0.95;
    } else if (resolvedCat.id && !/other|lainnya|uncategorized/i.test(resolvedCat.name)) {
      confidence = 0.85;
    } else {
      confidence = 0.50;
    }

    // Smart Bill Matching (Pilar 2)
    const billMatch = findBestMatchingBill(cleanDesc, rec.amount, bills);
    const matchedBill = billMatch
      ? {
          id: billMatch.bill.id,
          title: billMatch.bill.title,
          amount: billMatch.bill.amount,
          exactAmountMatch: billMatch.exactAmountMatch,
          confirmedPaid: true,
        }
      : null;

    // Duplicate check in 48-hour window
    const dupCheck = checkDuplicateInWindow(
      rec.dateStr || format(new Date(), "yyyy-MM-dd"),
      rec.amount,
      effectiveType,
      cleanDesc,
      existingTransactions
    );

    const needsReview = confidence < 0.65 || dupCheck.isDuplicate || !resolvedCat.id;

    return {
      id: `batch-tx-${Date.now()}-${idx}`,
      date: rec.dateStr || format(new Date(), "yyyy-MM-dd"),
      time: rec.timeStr,
      description: cleanDesc,
      cleanDescription: cleanDesc,
      amount: rec.amount,
      type: effectiveType,
      walletId: defaultWallet?.id || null,
      walletName: defaultWallet?.name || null,
      destinationWalletId,
      destinationWalletName,
      suggestedCategoryId: resolvedCat.id || null,
      suggestedCategoryName: resolvedCat.name,
      suggestedCategoryEmoji: resolvedCat.emoji,
      isDuplicate: dupCheck.isDuplicate,
      duplicateReason: dupCheck.reason,
      // Duplicates are UNCHECKED by default for user protection!
      selected: !dupCheck.isDuplicate,
      raw: rec.rawText,
      confidence,
      needsReview,
      matchedBill,
    };
  });

  return items;
}
