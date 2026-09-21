// ======================================================================
// TROUVAILLE BANK E-STATEMENT & TABULAR / CSV INGESTION ENGINE
// Deterministic, offline client-side parser for Indonesian bank statements
// Supports BCA, Mandiri (Livin), Jenius, GoPay, and Generic CSV/TSV
// ======================================================================

import { format, parse, isValid } from "date-fns";
import type { Transaction, Category, TransactionType } from "./types";
import { resolveTransactionCategory } from "./categoryResolver";

export interface ParsedStatementItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  description: string;
  cleanDescription: string;
  amount: number;
  type: TransactionType;
  balance?: number;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  suggestedCategoryEmoji: string | null;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
  raw: string;
}

export type StatementFormat = "bca" | "mandiri" | "jenius" | "gopay" | "generic_csv";

export interface ParseStatementResult {
  detectedFormat: StatementFormat;
  items: ParsedStatementItem[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    duplicateCount: number;
    validCount: number;
  };
}

/**
 * Normalizes Indonesian formatted numbers (e.g. "1.250.000,00" or "1,250,000.00" or "50000")
 */
export function parseLocalizedNumber(raw: string): number {
  if (!raw) return 0;
  let clean = raw.trim().replace(/[^\d.,\-+]/g, "");

  // Check if formatted like 1.250.000,00 (Indonesian standard: dot is thousand, comma is decimal)
  if (clean.includes(".") && clean.includes(",")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      // Formatted like 1,250,000.00 (US standard: comma is thousand, dot is decimal)
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    // Only commas: if 2 decimals at end (e.g. 50000,00), it's decimal comma
    if (/,\d{2}$/.test(clean)) {
      clean = clean.replace(",", ".");
    } else {
      // Otherwise thousands separator
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(".")) {
    // Only dots: if 3 digits after dot (e.g. 50.000 or 1.500.000), it's thousands separator
    if (/\.\d{3}/.test(clean) && !/\.\d{2}$/.test(clean)) {
      clean = clean.replace(/\./g, "");
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Normalizes date string into YYYY-MM-DD
 */
export function normalizeDateString(dateStr: string, defaultYear = new Date().getFullYear()): string {
  const trimmed = dateStr.trim();
  const currentYearStr = String(defaultYear);

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyFull = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyFull) {
    const [, day, month, year] = dmyFull;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Match DD/MM (BCA mutasi style)
  const dmyShort = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmyShort) {
    const [, day, month] = dmyShort;
    return `${currentYearStr}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Match YYYY-MM-DD (ISO)
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Match Jenius/Eng: "14 Sep 2026" or "14 Sep"
  try {
    const parsedWithYear = parse(trimmed, "dd MMM yyyy", new Date());
    if (isValid(parsedWithYear)) {
      return format(parsedWithYear, "yyyy-MM-dd");
    }
    const parsedShort = parse(trimmed, "dd MMM", new Date());
    if (isValid(parsedShort)) {
      parsedShort.setFullYear(defaultYear);
      return format(parsedShort, "yyyy-MM-dd");
    }
  } catch {
    // fallback
  }

  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Cleans noisy bank narration / prefixes (e.g. TRSF E-BANKING, M-BCA, QRIS, WS95011)
 */
export function cleanBankNarration(raw: string): string {
  if (!raw) return "Transaction";
  let text = raw.trim();

  // Strip common Indonesian bank metadata
  text = text
    .replace(/\b(TRSF|TRANSFER|E-BANKING|M-BCA|M-BANKING|QRIS|BI-FAST|LLG|RTGS|WS\d+|FTSCY|SWITCHING)\b/gi, "")
    .replace(/\b(CR|DB|D\/K|DEBET|KREDIT)\b/gi, "")
    .replace(/\b0{4,}\b/g, "") // remove 0000 branch code from KlikBCA
    .replace(/\d{4,}\/\w+\/\w+/g, "") // remove batch/trans ID like 0509/FTSCY/WS95011
    .replace(/\s{2,}/g, " ")
    .trim();

  return text || raw.trim();
}

/**
 * Detects format of raw input string
 */
export function detectStatementFormat(rawText: string): StatementFormat {
  const lower = rawText.toLowerCase();

  // 1. Bank specific checks FIRST
  if (lower.includes("gopay") || (lower.includes("pembayaran") && lower.includes("berhasil"))) {
    return "gopay";
  }
  if (lower.includes("jenius") || lower.includes("money out") || lower.includes("money in")) {
    return "jenius";
  }
  if (
    lower.includes("m-bca") ||
    lower.includes("trsf e-banking") ||
    /\b(db|cr)\b/i.test(rawText) ||
    /^\s*\d{1,2}\/\d{1,2}\s+/m.test(rawText)
  ) {
    return "bca";
  }
  if (
    lower.includes("livin") ||
    lower.includes("mandiri") ||
    /\b[dk]\s+[\d.,]+/i.test(rawText)
  ) {
    return "mandiri";
  }

  // 2. Generic CSV check: check if delimiters exist outside of number decimals (e.g. 50.000,00)
  const nonBlankLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const firstLine = nonBlankLines[0] || "";
  const strippedFirstLine = firstLine.replace(/\d+,\d+/g, "");

  if (strippedFirstLine.includes(",") || firstLine.includes(";") || firstLine.includes("\t")) {
    return "generic_csv";
  }

  return "bca";
}

/**
 * Parses raw text or CSV from clipboard/file into structured transactions
 */
export function parseStatementText(
  rawText: string,
  existingTransactions: Transaction[] = [],
  categories: Category[] = []
): ParseStatementResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      detectedFormat: "generic_csv",
      items: [],
      summary: { totalInflow: 0, totalOutflow: 0, duplicateCount: 0, validCount: 0 },
    };
  }

  const detectedFormat = detectStatementFormat(rawText);
  const items: ParsedStatementItem[] = [];

  const existingMap = new Map<string, Transaction[]>();
  for (const tx of existingTransactions) {
    const key = `${tx.occurred_on}_${Math.round(Number(tx.amount))}_${tx.type}`;
    if (!existingMap.has(key)) {
      existingMap.set(key, []);
    }
    existingMap.get(key)!.push(tx);
  }

  let idCounter = 1;

  for (const line of lines) {
    // Skip obvious header rows or noise lines
    const lineLower = line.toLowerCase();
    if (
      lineLower.startsWith("tanggal") ||
      lineLower.startsWith("date") ||
      lineLower.startsWith("mutasi rekening") ||
      lineLower.startsWith("periode") ||
      lineLower.startsWith("nomor rekening") ||
      lineLower.startsWith("saldo awal") ||
      lineLower.startsWith("saldo akhir")
    ) {
      continue;
    }

    let dateStr = "";
    let description = "";
    let amount = 0;
    let type: TransactionType = "expense";

    // 1. BCA MUTASI PARSER
    // Typical line: "05/09 TRSF E-BANKING CR 0509/FTSCY/WS95011 500.000,00 12.500.000,00"
    // or: "12/09 QRIS KOPI KENANGAN 45.000,00 DB 12.455.000,00"
    if (detectedFormat === "bca") {
      const bcaMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+)$/);
      if (bcaMatch) {
        dateStr = bcaMatch[1];
        const rest = bcaMatch[2];

        // Determine CR (Credit / Income) vs DB (Debet / Expense)
        const isCredit = /\bCR\b/i.test(rest);
        type = isCredit ? "income" : "expense";

        // Extract amount: numbers with dots and commas before CR/DB or at the end
        const amountMatch = rest.match(/([\d.,]+)\s*(?:CR|DB)/i) || rest.match(/([\d.,]+)\s+[\d.,]+$/);
        if (amountMatch) {
          amount = parseLocalizedNumber(amountMatch[1]);
          // Remove amount & CR/DB from description
          description = rest
            .replace(amountMatch[0], "")
            .replace(/\b(CR|DB)\b/gi, "")
            .replace(/[\d.,]+$/, "") // remove trailing balance
            .trim();
        } else {
          // Fallback: extract last valid number
          const numbers = rest.match(/[\d.,]{3,}/g);
          if (numbers && numbers.length > 0) {
            amount = parseLocalizedNumber(numbers[0]);
            description = rest.replace(numbers[0], "").trim();
          }
        }
      }
    }

    // 2. MANDIRI / LIVIN PARSER
    // Typical line: "12/09/2026 QRIS INDOMARET 12345 D 75.000,00" or comma separated
    else if (detectedFormat === "mandiri") {
      const mandiriMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+)$/);
      if (mandiriMatch) {
        dateStr = mandiriMatch[1];
        const rest = mandiriMatch[2];

        // Case A: [D/K] followed by amount, e.g. "D 75.000,00" or "K 5.000.000,00"
        const dkBeforeAmount = rest.match(/\b([DK]|DEBET|KREDIT)\s+([\d.,]+)/i);
        if (dkBeforeAmount) {
          const indicator = dkBeforeAmount[1];
          type = /K|KREDIT/i.test(indicator) ? "income" : "expense";
          amount = parseLocalizedNumber(dkBeforeAmount[2]);
          description = rest.replace(dkBeforeAmount[0], "").trim();
        } else {
          // Case B: amount followed by [D/K] or trailing number
          const amountMatch = rest.match(/([\d.,]+)(?:\s+([DK]|DEBET|KREDIT))?(?:\s+[\d.,]+)?$/i);
          if (amountMatch) {
            amount = parseLocalizedNumber(amountMatch[1]);
            const indicator = amountMatch[2];
            if (indicator) {
              type = /K|KREDIT/i.test(indicator) ? "income" : "expense";
            }
            description = rest.replace(amountMatch[0], "").trim();
          }
        }
      }
    }

    // 3. JENIUS PARSER
    // Typical line: "14 Sep 2026 Money Out - STARBUCKS -45.000" or "+2.000.000"
    else if (detectedFormat === "jenius") {
      const jeniusMatch = line.match(/^(\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{2,4})?)\s+(.+)$/);
      if (jeniusMatch) {
        dateStr = jeniusMatch[1];
        const rest = jeniusMatch[2];

        const isPositive = /\+\s*[\d.,]+/i.test(rest) || /money in/i.test(rest);
        type = isPositive ? "income" : "expense";

        const amountMatch = rest.match(/[+\-]?\s*(?:Rp)?\s*([\d.,]{3,})/i);
        if (amountMatch) {
          amount = parseLocalizedNumber(amountMatch[1]);
          description = rest.replace(amountMatch[0], "").trim();
        }
      }
    }

    // 4. GOPAY / CSV / TSV PARSER
    else {
      // Delimiter detection: comma, semicolon, tab
      let delimiter = ",";
      if (line.includes("\t")) delimiter = "\t";
      else if (line.includes(";")) delimiter = ";";

      const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
      if (cols.length >= 3) {
        // First column date check
        dateStr = cols[0];
        description = cols[1];

        // Check Credit vs Debit across line and columns
        const isCreditInLine = /\b(cr|kredit|pemasukan|income|money in)\b/i.test(line);
        const isDebitInLine = /\b(db|debet|pengeluaran|expense|money out)\b/i.test(line);
        if (isCreditInLine && !isDebitInLine) {
          type = "income";
        } else if (isDebitInLine && !isCreditInLine) {
          type = "expense";
        } else if (cols.length >= 4) {
          const typeCandidate = cols.find((c) =>
            /^(income|expense|transfer|pengeluaran|pemasukan|debet|kredit|db|cr)$/i.test(c)
          );
          if (typeCandidate) {
            type = /income|pemasukan|kredit|cr/i.test(typeCandidate) ? "income" : "expense";
          }
        }

        // Amount: find first column with valid numeric amount
        for (let i = 2; i < cols.length; i++) {
          const parsedVal = parseLocalizedNumber(cols[i]);
          if (parsedVal > 0) {
            amount = parsedVal;
            break;
          }
        }
      }
    }

    // If no amount extracted, skip invalid line
    if (!amount || amount <= 0) continue;

    const normalizedDate = normalizeDateString(dateStr || new Date().toISOString());
    const cleanDesc = cleanBankNarration(description);

    // Heuristic category assignment
    const mockTx: Partial<Transaction> = {
      note: `${cleanDesc} ${description}`,
      type,
      amount,
    };
    const resolvedCat = resolveTransactionCategory(mockTx, categories);

    // Deduplication check
    const dedupKey = `${normalizedDate}_${Math.round(amount)}_${type}`;
    const matches = existingMap.get(dedupKey) || [];
    const isDuplicate = matches.length > 0;
    const duplicateReason = isDuplicate
      ? `Matches existing ${type} on ${normalizedDate} (Rp ${amount.toLocaleString("id-ID")})`
      : undefined;

    items.push({
      id: `stmt-tx-${Date.now()}-${idCounter++}`,
      date: normalizedDate,
      description: description || "Transaction",
      cleanDescription: cleanDesc,
      amount,
      type,
      suggestedCategoryId: resolvedCat.id || null,
      suggestedCategoryName: resolvedCat.name,
      suggestedCategoryEmoji: resolvedCat.emoji,
      isDuplicate,
      duplicateReason,
      selected: !isDuplicate, // auto-select new items, auto-unselect duplicates
      raw: line,
    });
  }

  // Compute summary stats
  const totalInflow = items
    .filter((it) => it.selected && it.type === "income")
    .reduce((sum, it) => sum + it.amount, 0);
  const totalOutflow = items
    .filter((it) => it.selected && it.type === "expense")
    .reduce((sum, it) => sum + it.amount, 0);
  const duplicateCount = items.filter((it) => it.isDuplicate).length;
  const validCount = items.length;

  return {
    detectedFormat,
    items,
    summary: {
      totalInflow,
      totalOutflow,
      duplicateCount,
      validCount,
    },
  };
}
