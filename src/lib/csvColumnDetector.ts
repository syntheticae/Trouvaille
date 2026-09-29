// ======================================================================
// TROUVAILLE SMART CSV COLUMN AUTO-DETECTOR
// Detects date, description, debit, credit, amount, type, wallet,
// category & balance columns from arbitrary CSV/Excel headers and data-row heuristics.
// ======================================================================

import { parseLocalizedNumber } from "./statementParser";

export interface DetectedColumnMap {
  /** 0-based index of the date column */
  dateCol: number;
  /** 0-based index of the time column, or null */
  timeCol: number | null;
  /** 0-based index of the description/narration column */
  descCol: number;
  /** 0-based index of the debit/expense column, or null */
  debitCol: number | null;
  /** 0-based index of the credit/income column, or null */
  creditCol: number | null;
  /** 0-based index of a combined amount column (if no separate debit/credit), or null */
  amountCol: number | null;
  /** 0-based index of a type/direction column (DB/CR/D/K), or null */
  typeCol: number | null;
  /** 0-based index of the wallet/account column (for multi-account files), or null */
  walletCol: number | null;
  /** 0-based index of the category column (from other finance apps), or null */
  categoryCol: number | null;
  /** 0-based index of the balance/saldo column (informational only), or null */
  balanceCol: number | null;
  /** 0.0 – 1.0 confidence: 1.0 = all key columns found, lower = partial */
  confidence: number;
}

// -----------------------------------------------------------------------
// Keyword scoring tables (lower case header vs role)
// -----------------------------------------------------------------------

const DATE_KEYWORDS = [
  "tanggal", "tgl", "date", "tgl transaksi", "transaction date",
  "posting date", "value date", "tgl posting",
];

const TIME_KEYWORDS = [
  "jam", "time", "waktu", "pukul", "hour", "transaction time", "jam transaksi",
];

const DESC_KEYWORDS = [
  "deskripsi", "keterangan", "narasi", "description", "remark",
  "uraian", "memo", "information", "detail",
  "transaction description", "note", "catatan", "merchant", "penerima",
  "judul", "title", "subjek", "subject", "nama transaksi", "perihal",
];

const DEBIT_KEYWORDS = [
  "debet", "debit", "pengeluaran", "db", "out", "withdrawal",
  "keluar", "debit amount", "jumlah debet", "nominal debet",
  "nominal db",
];

const CREDIT_KEYWORDS = [
  "kredit", "credit", "pemasukan", "cr", "in", "deposit",
  "masuk", "credit amount", "jumlah kredit", "nominal kredit",
  "nominal cr",
];

const AMOUNT_KEYWORDS = [
  "jumlah", "nominal", "amount", "nilai", "total", "mutasi",
  "transaction amount", "sum",
];

const TYPE_KEYWORDS = [
  "jenis transaksi", "tipe transaksi", "jenis", "type", "tipe",
  "transaction type", "direction", "d/k", "db/cr", "cr/db",
  "debet/kredit", "status", "status transaksi",
];

const WALLET_KEYWORDS = [
  "akun", "account", "wallet", "dompet", "rekening", "sumber dana",
  "source", "payment method", "metode pembayaran", "metode", "bank",
];

const CATEGORY_KEYWORDS = [
  "kategori", "category", "pos", "kategori transaksi", "pos pengeluaran",
  "group", "kelompok", "subkategori", "classification",
];

const BALANCE_KEYWORDS = [
  "saldo", "balance", "saldo akhir", "closing balance",
  "running balance", "saldo setelah",
];

// -----------------------------------------------------------------------
// Header keyword score
// -----------------------------------------------------------------------

function scoreHeader(header: string, keywords: string[]): number {
  if (!header) return 0;
  const h = header.toLowerCase().trim();
  for (const kw of keywords) {
    if (h === kw) return 1.0;
    if (h.includes(kw)) return 0.75;
    if (kw.includes(h) && h.length >= 3) return 0.5;
  }
  return 0;
}

// -----------------------------------------------------------------------
// Sample Row Data-Type Evaluation
// -----------------------------------------------------------------------

function isDateLike(val: string): boolean {
  const v = val.trim();
  if (/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/.test(v)) return true;
  if (/^\d{1,2}\s+[a-zA-Z]{3}(?:\s+\d{2,4})?$/.test(v)) return true;
  return false;
}

function isTimeLike(val: string): boolean {
  const v = val.trim();
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(v);
}

function isTypeDirectionLike(val: string): boolean {
  const v = val.trim().toLowerCase();
  return /^(cr|db|d|k|kredit|debet|in|out|masuk|keluar|income|expense|transfer)$/i.test(v);
}

function isNumericLike(val: string): boolean {
  return parseLocalizedNumber(val) > 0;
}

// -----------------------------------------------------------------------
// Main Detector
// -----------------------------------------------------------------------

/**
 * Given an array of column header strings and optional sample data rows,
 * returns the best-guess DetectedColumnMap.
 */
export function detectColumns(headers: string[], sampleRows?: string[][]): DetectedColumnMap {
  const n = headers.length;

  const roles = [
    { name: "date", keywords: DATE_KEYWORDS },
    { name: "time", keywords: TIME_KEYWORDS },
    { name: "desc", keywords: DESC_KEYWORDS },
    { name: "debit", keywords: DEBIT_KEYWORDS },
    { name: "credit", keywords: CREDIT_KEYWORDS },
    { name: "amount", keywords: AMOUNT_KEYWORDS },
    { name: "type", keywords: TYPE_KEYWORDS },
    { name: "wallet", keywords: WALLET_KEYWORDS },
    { name: "category", keywords: CATEGORY_KEYWORDS },
    { name: "balance", keywords: BALANCE_KEYWORDS },
  ] as const;

  type RoleName = (typeof roles)[number]["name"];

  const scores: Record<RoleName, number[]> = {
    date: [],
    time: [],
    desc: [],
    debit: [],
    credit: [],
    amount: [],
    type: [],
    wallet: [],
    category: [],
    balance: [],
  };

  // 1. Initial scores from headers
  for (const role of roles) {
    scores[role.name] = headers.map((h) => scoreHeader(h, role.keywords));
  }

  // 2. Data row heuristic boosts
  if (sampleRows && sampleRows.length > 0) {
    const validSamples = sampleRows.slice(0, 5).filter((r) => r && r.length > 0);
    const sampleCount = validSamples.length;

    if (sampleCount > 0) {
      for (let col = 0; col < n; col++) {
        let dateMatches = 0;
        let timeMatches = 0;
        let numericMatches = 0;
        let typeMatches = 0;
        let textMatches = 0;

        for (const row of validSamples) {
          const cell = (row[col] || "").trim();
          if (!cell) continue;

          if (isDateLike(cell)) dateMatches++;
          else if (isTimeLike(cell)) timeMatches++;
          else if (isTypeDirectionLike(cell)) typeMatches++;
          else if (isNumericLike(cell)) numericMatches++;
          else if (cell.length > 2) textMatches++;
        }

        // Boost based on sample data consistency
        if (dateMatches >= sampleCount * 0.6) {
          scores.date[col] += 0.8;
        }
        if (timeMatches >= sampleCount * 0.6) {
          scores.time[col] += 0.8;
        }
        if (typeMatches >= sampleCount * 0.6) {
          scores.type[col] += 0.8;
        }
        if (numericMatches >= sampleCount * 0.6) {
          scores.amount[col] += 0.4;
          if (scores.debit[col] > 0) scores.debit[col] += 0.3;
          if (scores.credit[col] > 0) scores.credit[col] += 0.3;
        }
        if (textMatches >= sampleCount * 0.6 && numericMatches === 0 && dateMatches === 0 && timeMatches === 0) {
          scores.desc[col] += 0.4;
        }
      }
    }
  }

  // 3. Greedy assignment in priority order
  const assigned = new Set<number>();

  function pickBest(roleName: RoleName): number | null {
    const roleScores = scores[roleName];
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < n; i++) {
      if (!assigned.has(i) && roleScores[i] > bestScore) {
        bestScore = roleScores[i];
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestScore > 0) {
      assigned.add(bestIdx);
      return bestIdx;
    }
    return null;
  }

  const dateCol = pickBest("date");
  const timeCol = pickBest("time");
  const descCol = pickBest("desc");

  // If a type direction column (DB/CR) or strong amount header exists, prioritize amount over separate debit/credit
  const hasTypeColCandidate = scores.type.some((s) => s >= 0.7);
  const hasStrongAmountHeader = scores.amount.some((s) => s >= 0.7);

  let amountCol: number | null = null;
  let debitCol: number | null = null;
  let creditCol: number | null = null;

  if (hasTypeColCandidate || hasStrongAmountHeader) {
    amountCol = pickBest("amount");
  } else {
    debitCol = pickBest("debit");
    creditCol = pickBest("credit");
    amountCol = pickBest("amount");
  }

  const typeCol = pickBest("type");
  const walletCol = pickBest("wallet");
  const categoryCol = pickBest("category");
  const balanceCol = pickBest("balance");

  // Fallback positional heuristics if nothing assigned
  const finalDateCol = dateCol ?? (n > 0 ? 0 : -1);
  const finalDescCol = descCol ?? (n > 1 ? 1 : -1);
  let finalAmountCol = amountCol;
  if (finalAmountCol === null && debitCol === null && creditCol === null && n >= 3) {
    finalAmountCol = 2;
    assigned.add(2);
  }

  const hasDate = dateCol !== null;
  const hasDesc = descCol !== null;
  const hasAmount =
    amountCol !== null ||
    (debitCol !== null && creditCol !== null) ||
    debitCol !== null;

  let confidence = 0;
  if (hasDate) confidence += 0.35;
  if (hasDesc) confidence += 0.25;
  if (hasAmount) confidence += 0.4;

  return {
    dateCol: finalDateCol >= 0 ? finalDateCol : 0,
    timeCol,
    descCol: finalDescCol >= 0 ? finalDescCol : 1,
    debitCol,
    creditCol,
    amountCol: finalAmountCol,
    typeCol,
    walletCol,
    categoryCol,
    balanceCol,
    confidence,
  };
}

// -----------------------------------------------------------------------
// Human-readable role label (for UI dropdown)
// -----------------------------------------------------------------------

export type ColumnRole =
  | "date"
  | "time"
  | "description"
  | "debit"
  | "credit"
  | "amount"
  | "type"
  | "wallet"
  | "category"
  | "balance"
  | "ignore";

/**
 * The core fields of Trouvaille's transaction schema + Ignore.
 * Strictly used in user-facing column mapping dropdowns.
 */
export const CORE_COLUMN_ROLES: ColumnRole[] = [
  "date",
  "time",
  "description",
  "amount",
  "type",
  "category",
  "wallet",
  "ignore",
];

export function columnRoleLabel(role: ColumnRole, isIndonesian: boolean): string {
  const map: Record<ColumnRole, [string, string]> = {
    date: ["Tanggal", "Date"],
    time: ["Jam / Waktu", "Time"],
    description: ["Catatan", "Note"],
    amount: ["Nominal", "Amount"],
    type: ["Jenis Transaksi", "Transaction Type"],
    category: ["Kategori", "Category"],
    wallet: ["Akun", "Account"],
    debit: ["Debet", "Debit"],
    credit: ["Kredit", "Credit"],
    balance: ["Saldo", "Balance"],
    ignore: ["Abaikan", "Ignore"],
  };
  return isIndonesian ? map[role][0] : map[role][1];
}
