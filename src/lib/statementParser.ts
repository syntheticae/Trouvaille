// ======================================================================
// TROUVAILLE BANK E-STATEMENT & TABULAR / CSV INGESTION ENGINE v2
// Deterministic, offline client-side parser for Indonesian bank statements
// Supports: BCA, Mandiri, Jenius, GoPay, SeaBank, OVO, DANA, BRI, BNI,
//           Permata, CIMB, ShopeePay + Generic CSV/TSV/PDF
// ======================================================================

import { format, parse, isValid } from "date-fns";
import type { Transaction, Category, TransactionType } from "./types";
import { resolveTransactionCategory } from "./categoryResolver";
import { detectColumns, type DetectedColumnMap } from "./csvColumnDetector";

export interface ParsedStatementItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  description: string;
  cleanDescription: string;
  amount: number;
  type: TransactionType; // "income" | "expense" | "transfer"
  balance?: number;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  suggestedCategoryEmoji: string | null;
  isDuplicate: boolean;
  duplicateReason?: string;
  selected: boolean;
  raw: string;
}

export type StatementFormat =
  | "bca"
  | "mandiri"
  | "jenius"
  | "gopay"
  | "seabank"
  | "ovo"
  | "dana"
  | "bri"
  | "bni"
  | "permata"
  | "cimb"
  | "shopeepay"
  | "generic_csv"
  | "generic_pdf";

export interface ParseStatementResult {
  detectedFormat: StatementFormat;
  items: ParsedStatementItem[];
  /** Detected column mapping (only set for CSV/Excel inputs) */
  columnMap?: DetectedColumnMap;
  summary: {
    totalInflow: number;
    totalOutflow: number;
    duplicateCount: number;
    validCount: number;
  };
}

// -----------------------------------------------------------------------
// Number Parser — handles Indonesian & US number formats
// -----------------------------------------------------------------------

export function parseLocalizedNumber(raw: string): number {
  if (!raw) return 0;
  let clean = raw.trim().replace(/[^\d.,\-+]/g, "");

  // Indonesian: 1.250.000,00 (dot=thousands, comma=decimal)
  if (clean.includes(".") && clean.includes(",")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      // US: 1,250,000.00
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    if (/,\d{2}$/.test(clean)) {
      clean = clean.replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(".")) {
    // 50.000 or 1.500.000 → thousands separator
    if (/\.\d{3}/.test(clean) && !/\.\d{2}$/.test(clean)) {
      clean = clean.replace(/\./g, "");
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

// -----------------------------------------------------------------------
// Date Normalizer — handles DD/MM/YYYY, DD/MM, YYYY-MM-DD, "14 Sep 2026"
// -----------------------------------------------------------------------

export function normalizeDateString(
  dateStr: string,
  defaultYear = new Date().getFullYear()
): string {
  const trimmed = dateStr.trim();
  const currentYearStr = String(defaultYear);

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyFull = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyFull) {
    const [, day, month, year] = dmyFull;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD/MM (BCA style — assume current year)
  const dmyShort = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmyShort) {
    const [, day, month] = dmyShort;
    return `${currentYearStr}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // "14 Sep 2026" or "14 Sep" (Jenius / Eng-locale)
  try {
    const parsedWithYear = parse(trimmed, "dd MMM yyyy", new Date());
    if (isValid(parsedWithYear)) return format(parsedWithYear, "yyyy-MM-dd");

    const parsedShort = parse(trimmed, "dd MMM", new Date());
    if (isValid(parsedShort)) {
      parsedShort.setFullYear(defaultYear);
      return format(parsedShort, "yyyy-MM-dd");
    }
  } catch {
    // fallback below
  }

  return format(new Date(), "yyyy-MM-dd");
}

// -----------------------------------------------------------------------
// Bank Narration Cleaner
// -----------------------------------------------------------------------

export function cleanBankNarration(raw: string): string {
  if (!raw) return "Transaction";
  let text = raw.trim();

  text = text
    // Common Indonesian bank metadata prefixes
    .replace(/\b(TRSF|TRANSFER|E-BANKING|M-BCA|M-BANKING|QRIS|BI-FAST|BIFAST|LLG|RTGS|WS\d+|FTSCY|SWITCHING)\b/gi, "")
    .replace(/\b(CR|DB|D\/K|DEBET|KREDIT)\b/gi, "")
    .replace(/\b0{4,}\b/g, "")
    .replace(/\d{4,}\/\w+\/\w+/g, "")
    // SeaBank / OVO / DANA / GoPay prefixes
    .replace(/\b(SEABANK|SEA BANK|OVO CASH|OVO TRANSFER|DANA|GOPAY|SHOPEEPAY|SPAY)\b/gi, "")
    .replace(/\b(TRFIN|TRFOUT|TRFMASUK|TRFKELUAR)\b/gi, "")
    .replace(/\b(BAYAR|PAYMENT|TOP.?UP|TOPUP|PULSA|AUTODEBET|AUTOPAY|TAGIHAN|CICILAN)\b/gi, "")
    // BRI / BNI noise
    .replace(/\b(BRIMO|WONDR|IBANK|MOBILE BANKING)\b/gi, "")
    // Generic batch/trans IDs
    .replace(/[A-Z]{2,4}\d{6,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text || raw.trim();
}

// -----------------------------------------------------------------------
// Format Detector
// -----------------------------------------------------------------------

export function detectStatementFormat(rawText: string): StatementFormat {
  const lower = rawText.toLowerCase();

  // E-wallet specific
  if (lower.includes("gopay") || (lower.includes("pembayaran") && lower.includes("berhasil") && lower.includes("gojek"))) {
    return "gopay";
  }
  if (lower.includes("shopeepay") || (lower.includes("spay") && lower.includes("shopee"))) {
    return "shopeepay";
  }
  if (lower.includes("ovo cash") || lower.includes("ovo transfer") || lower.includes("pt visionet")) {
    return "ovo";
  }
  if (lower.includes("dompet digital dana") || (lower.includes("dana") && lower.includes("transfer berhasil"))) {
    return "dana";
  }

  // Bank specific
  if (lower.includes("seabank") || lower.includes("sea bank")) {
    return "seabank";
  }
  if (lower.includes("jenius") || lower.includes("money out") || lower.includes("money in")) {
    return "jenius";
  }
  if (lower.includes("m-bca") || lower.includes("trsf e-banking") || lower.includes("klik bca")) {
    return "bca";
  }
  if (/\b(db|cr)\b/i.test(rawText) && /^\s*\d{1,2}\/\d{1,2}\s+/m.test(rawText)) {
    return "bca";
  }
  if (lower.includes("livin") || lower.includes("bank mandiri")) {
    return "mandiri";
  }
  if (/\b[dk]\s+[\d.,]+/i.test(rawText) && !lower.includes("wondr")) {
    return "mandiri";
  }
  if (lower.includes("brimo") || lower.includes("bank rakyat indonesia")) {
    return "bri";
  }
  if (lower.includes("wondr") || lower.includes("bank negara indonesia")) {
    return "bni";
  }
  if (lower.includes("permatanet") || lower.includes("bank permata")) {
    return "permata";
  }
  if (lower.includes("octo") || lower.includes("cimb niaga")) {
    return "cimb";
  }

  // Generic PDF (multi-page extracted text)
  if (rawText.length > 3000 && lower.includes("mutasi rekening")) {
    return "generic_pdf";
  }

  // Generic CSV/TSV detection
  const nonBlankLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const firstLine = nonBlankLines[0] || "";
  const strippedFirstLine = firstLine.replace(/\d+,\d+/g, "");
  if (strippedFirstLine.includes(",") || firstLine.includes(";") || firstLine.includes("\t")) {
    return "generic_csv";
  }

  return "bca";
}

// -----------------------------------------------------------------------
// Inline transfer detection (matches destination wallet name heuristically)
// -----------------------------------------------------------------------

function detectTransferType(description: string, amount: number): TransactionType {
  const d = description.toLowerCase();
  // Strong transfer signals
  if (
    /\b(transfer ke|kirim ke|to rekening|ke rek|ke acc|antar rekening|top.?up|isi saldo)\b/.test(d) &&
    amount > 0
  ) {
    return "transfer";
  }
  return "expense";
}

// -----------------------------------------------------------------------
// MAIN PARSER
// -----------------------------------------------------------------------

export function parseStatementText(
  rawText: string,
  existingTransactions: Transaction[] = [],
  categories: Category[] = [],
  /**
   * Optional pre-computed column map for CSV/Excel inputs.
   * If not provided, the parser will run auto-detection for CSV-like inputs.
   */
  columnMap?: DetectedColumnMap
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

  // Build dedup map from existing transactions
  const existingMap = new Map<string, boolean>();
  for (const tx of existingTransactions) {
    // Key: date + rounded-to-1000 amount + type + first 20 chars of note
    const roundedAmt = Math.round(Number(tx.amount) / 1000) * 1000;
    const noteSlug = (tx.note || "").toLowerCase().replace(/\s+/g, "").slice(0, 20);
    const key1 = `${tx.occurred_on}_${Math.round(Number(tx.amount))}_${tx.type}`;
    const key2 = `${tx.occurred_on}_${roundedAmt}_${tx.type}_${noteSlug}`;
    existingMap.set(key1, true);
    existingMap.set(key2, true);
  }

  let idCounter = 1;

  // ----------------------------------------------------------------
  // Auto-detect column map for generic CSV/TSV formats
  // ----------------------------------------------------------------
  let resolvedColumnMap: DetectedColumnMap | undefined = columnMap;
  const isCSVLike = (detectedFormat === "generic_csv" || detectedFormat === "gopay" || detectedFormat === "shopeepay" || detectedFormat === "ovo");

  if (!resolvedColumnMap && isCSVLike) {
    const firstLine = lines[0];
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
    const headers = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());
    // Only use auto-detect if first row looks like a header (not a date)
    const looksLikeHeader = !(/^\d{1,4}[\/\-]/.test(headers[0]));
    if (looksLikeHeader && headers.length >= 2) {
      resolvedColumnMap = detectColumns(headers);
    }
  }

  // ----------------------------------------------------------------
  // Line-by-line parsing
  // ----------------------------------------------------------------

  // Skip known header/metadata lines
  const SKIP_PREFIXES = [
    "tanggal", "date", "mutasi rekening", "periode", "nomor rekening",
    "saldo awal", "saldo akhir", "no.", "no rekening", "nama nasabah",
    "account name", "account no", "opening balance", "closing balance",
    "no\t", "total", "keterangan\t", "deskripsi\t",
  ];

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (SKIP_PREFIXES.some((p) => lineLower.startsWith(p))) continue;

    let dateStr = "";
    let description = "";
    let amount = 0;
    let type: TransactionType = "expense";

    // ----------------------------------------------------------------
    // BCA Mutasi
    // Line: "05/09 TRSF E-BANKING CR 0509/FTSCY/WS95011 500.000,00 12.500.000,00"
    // ----------------------------------------------------------------
    if (detectedFormat === "bca") {
      const bcaMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+)$/);
      if (bcaMatch) {
        dateStr = bcaMatch[1];
        const rest = bcaMatch[2];
        const isCredit = /\bCR\b/i.test(rest);
        type = isCredit ? "income" : "expense";

        const amountMatch = rest.match(/([\d.,]+)\s*(?:CR|DB)/i) || rest.match(/([\d.,]+)\s+[\d.,]+$/);
        if (amountMatch) {
          amount = parseLocalizedNumber(amountMatch[1]);
          description = rest.replace(amountMatch[0], "").replace(/\b(CR|DB)\b/gi, "").replace(/[\d.,]+$/, "").trim();
        } else {
          const numbers = rest.match(/[\d.,]{3,}/g);
          if (numbers && numbers.length > 0) {
            amount = parseLocalizedNumber(numbers[0]);
            description = rest.replace(numbers[0], "").trim();
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // Mandiri Livin
    // Line: "12/09/2026 QRIS INDOMARET D 75.000,00"
    // ----------------------------------------------------------------
    else if (detectedFormat === "mandiri") {
      const mandiriMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+)$/);
      if (mandiriMatch) {
        dateStr = mandiriMatch[1];
        const rest = mandiriMatch[2];
        const dkBeforeAmount = rest.match(/\b([DK]|DEBET|KREDIT)\s+([\d.,]+)/i);
        if (dkBeforeAmount) {
          const indicator = dkBeforeAmount[1];
          type = /K|KREDIT/i.test(indicator) ? "income" : "expense";
          amount = parseLocalizedNumber(dkBeforeAmount[2]);
          description = rest.replace(dkBeforeAmount[0], "").trim();
        } else {
          const amountMatch = rest.match(/([\d.,]+)(?:\s+([DK]|DEBET|KREDIT))?(?:\s+[\d.,]+)?$/i);
          if (amountMatch) {
            amount = parseLocalizedNumber(amountMatch[1]);
            const indicator = amountMatch[2];
            if (indicator) type = /K|KREDIT/i.test(indicator) ? "income" : "expense";
            description = rest.replace(amountMatch[0], "").trim();
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // Jenius BTPN
    // Line: "14 Sep 2026 Money Out - STARBUCKS -45.000"
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // SeaBank
    // Line: "14/09 TRANSFER MASUK dari BUDI 500.000,00 1.000.000,00"
    // Line: "14/09 TRANSFER KELUAR ke BCA 1234 100.000,00 900.000,00"
    // ----------------------------------------------------------------
    else if (detectedFormat === "seabank") {
      const seaMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+)$/);
      if (seaMatch) {
        dateStr = seaMatch[1];
        const rest = seaMatch[2];
        const lRest = rest.toLowerCase();
        const isMasuk = /\b(masuk|kredit|terima|diterima|cr|received)\b/.test(lRest);
        const isKeluar = /\b(keluar|debet|kirim|transfer ke|db|sent)\b/.test(lRest);
        if (isMasuk && !isKeluar) type = "income";
        else if (isKeluar) type = detectTransferType(rest, 1);
        else type = "expense";

        const numbers = rest.match(/[\d.,]{4,}/g);
        if (numbers && numbers.length > 0) {
          amount = parseLocalizedNumber(numbers[0]);
          description = rest.replace(numbers[0], "").replace(/[\d.,]{4,}/g, "").trim();
        }
      }
    }

    // ----------------------------------------------------------------
    // BRI BRImo
    // Line: "14/09/2026 OPS TRANSFER DANA 500.000,00 K" or similar
    // ----------------------------------------------------------------
    else if (detectedFormat === "bri") {
      const briMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+)$/);
      if (briMatch) {
        dateStr = briMatch[1];
        const rest = briMatch[2];
        const amountMatch = rest.match(/([\d.,]{4,})(?:\s+([KD]))?/i);
        if (amountMatch) {
          amount = parseLocalizedNumber(amountMatch[1]);
          const indicator = amountMatch[2];
          if (indicator) type = /K/i.test(indicator) ? "income" : "expense";
          else {
            const isKredit = /\b(masuk|kredit|terima)\b/i.test(rest);
            type = isKredit ? "income" : "expense";
          }
          description = rest.replace(amountMatch[0], "").trim();
        }
      }
    }

    // ----------------------------------------------------------------
    // BNI wondr
    // Similar to Mandiri D/K pattern
    // ----------------------------------------------------------------
    else if (detectedFormat === "bni") {
      const bniMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+)$/);
      if (bniMatch) {
        dateStr = bniMatch[1];
        const rest = bniMatch[2];
        const dkMatch = rest.match(/\b([DK])\s+([\d.,]+)/i);
        if (dkMatch) {
          type = /K/i.test(dkMatch[1]) ? "income" : "expense";
          amount = parseLocalizedNumber(dkMatch[2]);
          description = rest.replace(dkMatch[0], "").trim();
        } else {
          const numbers = rest.match(/[\d.,]{4,}/g);
          if (numbers && numbers.length > 0) {
            amount = parseLocalizedNumber(numbers[0]);
            description = rest.replace(numbers[0], "").trim();
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // OVO / DANA / GoPay / ShopeePay — CSV export formats
    // These are typically comma-separated with: Date, Description, Amount, Type
    // ----------------------------------------------------------------
    else if (["ovo", "dana", "gopay", "shopeepay"].includes(detectedFormat)) {
      const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
      if (cols.length >= 3) {
        dateStr = cols[0];
        description = cols[1];
        const isCreditInLine = /\b(cr|kredit|pemasukan|income|masuk|topup|terima)\b/i.test(line);
        const isDebitInLine = /\b(db|debet|pengeluaran|expense|keluar|bayar)\b/i.test(line);
        if (isCreditInLine && !isDebitInLine) type = "income";
        else if (isDebitInLine && !isCreditInLine) type = "expense";

        for (let i = 2; i < cols.length; i++) {
          const v = parseLocalizedNumber(cols[i]);
          if (v > 0) { amount = v; break; }
        }
      }
    }

    // ----------------------------------------------------------------
    // Generic CSV / TSV (with column map)
    // ----------------------------------------------------------------
    else {
      const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());

      if (resolvedColumnMap && cols.length > 0) {
        const cm = resolvedColumnMap;
        dateStr = cols[cm.dateCol] || "";
        description = cols[cm.descCol] || "";

        // Amount resolution: debit/credit columns or single amount column
        if (cm.debitCol !== null && cm.creditCol !== null) {
          const debitVal = parseLocalizedNumber(cols[cm.debitCol] || "");
          const creditVal = parseLocalizedNumber(cols[cm.creditCol] || "");
          if (creditVal > 0 && debitVal === 0) { amount = creditVal; type = "income"; }
          else if (debitVal > 0 && creditVal === 0) { amount = debitVal; type = "expense"; }
          else if (debitVal > 0 && creditVal > 0) {
            // Both filled? Take larger as principal, mark as income if credit > debit
            if (creditVal > debitVal) { amount = creditVal; type = "income"; }
            else { amount = debitVal; type = "expense"; }
          }
        } else if (cm.debitCol !== null) {
          const v = parseLocalizedNumber(cols[cm.debitCol] || "");
          if (v > 0) { amount = v; type = "expense"; }
        } else if (cm.creditCol !== null) {
          const v = parseLocalizedNumber(cols[cm.creditCol] || "");
          if (v > 0) { amount = v; type = "income"; }
        } else if (cm.amountCol !== null) {
          amount = parseLocalizedNumber(cols[cm.amountCol] || "");
          // Determine type from type column or description
          if (cm.typeCol !== null) {
            const typeCell = (cols[cm.typeCol] || "").toLowerCase();
            if (/kredit|cr|income|masuk|pemasukan/.test(typeCell)) type = "income";
            else if (/debet|db|expense|keluar|pengeluaran/.test(typeCell)) type = "expense";
          } else {
            const isCreditInLine = /\b(cr|kredit|pemasukan|income|masuk)\b/i.test(line);
            const isDebitInLine = /\b(db|debet|pengeluaran|expense|keluar)\b/i.test(line);
            if (isCreditInLine && !isDebitInLine) type = "income";
          }
        }
      } else if (cols.length >= 3) {
        // Fallback: positional (col0=date, col1=desc, col2+=amount)
        dateStr = cols[0];
        description = cols[1];
        const isCreditInLine = /\b(cr|kredit|pemasukan|income|masuk)\b/i.test(line);
        const isDebitInLine = /\b(db|debet|pengeluaran|expense|keluar)\b/i.test(line);
        if (isCreditInLine && !isDebitInLine) type = "income";
        else if (isDebitInLine && !isCreditInLine) type = "expense";
        for (let i = 2; i < cols.length; i++) {
          const v = parseLocalizedNumber(cols[i]);
          if (v > 0) { amount = v; break; }
        }
      }
    }

    if (!amount || amount <= 0) continue;

    const normalizedDate = normalizeDateString(dateStr || new Date().toISOString());
    const cleanDesc = cleanBankNarration(description);

    // Smarter type upgrade: if description strongly signals transfer
    if (type === "expense") {
      type = detectTransferType(description, amount);
    }

    // Category resolution
    const mockTx: Partial<Transaction> = {
      note: `${cleanDesc} ${description}`,
      type,
      amount,
    };
    const resolvedCat = resolveTransactionCategory(mockTx, categories);

    // Deduplication — two keys for tolerance
    const roundedAmt = Math.round(amount / 1000) * 1000;
    const noteSlug = cleanDesc.toLowerCase().replace(/\s+/g, "").slice(0, 20);
    const dedupKey1 = `${normalizedDate}_${Math.round(amount)}_${type}`;
    const dedupKey2 = `${normalizedDate}_${roundedAmt}_${type}_${noteSlug}`;
    const isDuplicate = existingMap.has(dedupKey1) || existingMap.has(dedupKey2);
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
      selected: !isDuplicate,
      raw: line,
    });
  }

  const totalInflow = items.filter((it) => it.selected && it.type === "income").reduce((s, it) => s + it.amount, 0);
  const totalOutflow = items.filter((it) => it.selected && it.type === "expense").reduce((s, it) => s + it.amount, 0);
  const duplicateCount = items.filter((it) => it.isDuplicate).length;

  return {
    detectedFormat,
    columnMap: resolvedColumnMap,
    items,
    summary: { totalInflow, totalOutflow, duplicateCount, validCount: items.length },
  };
}
