// ======================================================================
// TROUVAILLE SMART CSV COLUMN AUTO-DETECTOR
// Detects date, description, debit, credit, amount, type & balance columns
// from arbitrary CSV/Excel headers without any pre-configured templates.
// ======================================================================

export interface DetectedColumnMap {
  /** 0-based index of the date column */
  dateCol: number;
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
  "waktu", "timestamp", "posting date", "value date", "tgl posting",
];

const DESC_KEYWORDS = [
  "deskripsi", "keterangan", "narasi", "description", "remark",
  "uraian", "memo", "information", "transaksi", "detail",
  "transaction description", "note", "catatan",
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
  "jenis", "type", "tipe", "direction", "d/k", "db/cr",
  "debet/kredit",
];

const BALANCE_KEYWORDS = [
  "saldo", "balance", "saldo akhir", "closing balance",
  "running balance", "saldo setelah",
];

// -----------------------------------------------------------------------
// Score a single header string against a keyword list
// -----------------------------------------------------------------------

function scoreHeader(header: string, keywords: string[]): number {
  const h = header.toLowerCase().trim();
  for (const kw of keywords) {
    if (h === kw) return 1.0;          // exact match
    if (h.includes(kw)) return 0.75;   // substring match
    // Check if the keyword contains the header word (e.g. header="tgl", kw="tgl transaksi")
    if (kw.includes(h) && h.length >= 3) return 0.5;
  }
  return 0;
}

// -----------------------------------------------------------------------
// Main detector
// -----------------------------------------------------------------------

/**
 * Given an array of column header strings (from first row of CSV/Excel),
 * returns the best-guess DetectedColumnMap.
 *
 * The algorithm scores each column against every role's keyword list and
 * assigns the column with the highest score to each role (no duplicates).
 */
export function detectColumns(headers: string[]): DetectedColumnMap {
  const n = headers.length;

  // Build score matrix: scores[roleIndex][colIndex]
  const roles = [
    { name: "date",    keywords: DATE_KEYWORDS },
    { name: "desc",    keywords: DESC_KEYWORDS },
    { name: "debit",   keywords: DEBIT_KEYWORDS },
    { name: "credit",  keywords: CREDIT_KEYWORDS },
    { name: "amount",  keywords: AMOUNT_KEYWORDS },
    { name: "type",    keywords: TYPE_KEYWORDS },
    { name: "balance", keywords: BALANCE_KEYWORDS },
  ] as const;

  type RoleName = typeof roles[number]["name"];

  const scores: Record<RoleName, number[]> = {
    date: [],
    desc: [],
    debit: [],
    credit: [],
    amount: [],
    type: [],
    balance: [],
  };

  for (const role of roles) {
    scores[role.name] = headers.map((h) => scoreHeader(h, role.keywords));
  }

  // Greedy assignment: for each role pick best scoring unassigned column
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

  // Assign in priority order (date and desc are most critical)
  const dateCol   = pickBest("date");
  const descCol   = pickBest("desc");
  const debitCol  = pickBest("debit");
  const creditCol = pickBest("credit");
  const amountCol = pickBest("amount");
  const typeCol   = pickBest("type");
  const balanceCol = pickBest("balance");

  // Fallback heuristic: if dateCol or descCol not found, try positional
  // (common pattern: col0=date, col1=desc, col2=amount in simple CSVs)
  const finalDateCol = dateCol ?? (n > 0 ? 0 : -1);
  const finalDescCol = descCol ?? (n > 1 ? 1 : -1);
  let finalAmountCol = amountCol;
  if (finalAmountCol === null && debitCol === null && creditCol === null && n >= 3) {
    finalAmountCol = 2;
    assigned.add(2);
  }

  // Confidence: 1.0 if date+desc+amount(or debit/credit) found via keyword match
  const hasDate   = dateCol !== null;
  const hasDesc   = descCol !== null;
  const hasAmount = amountCol !== null || (debitCol !== null && creditCol !== null) || debitCol !== null;

  let confidence = 0;
  if (hasDate)   confidence += 0.35;
  if (hasDesc)   confidence += 0.25;
  if (hasAmount) confidence += 0.40;

  return {
    dateCol:    finalDateCol >= 0 ? finalDateCol : 0,
    descCol:    finalDescCol >= 0 ? finalDescCol : 1,
    debitCol:   debitCol,
    creditCol:  creditCol,
    amountCol:  finalAmountCol,
    typeCol:    typeCol,
    balanceCol: balanceCol,
    confidence,
  };
}

// -----------------------------------------------------------------------
// Human-readable role label (for UI dropdown)
// -----------------------------------------------------------------------

export type ColumnRole =
  | "date"
  | "description"
  | "debit"
  | "credit"
  | "amount"
  | "type"
  | "balance"
  | "ignore";

export function columnRoleLabel(role: ColumnRole, isIndonesian: boolean): string {
  const map: Record<ColumnRole, [string, string]> = {
    date:        ["Tanggal",     "Date"],
    description: ["Deskripsi",   "Description"],
    debit:       ["Debet (Keluar)", "Debit (Out)"],
    credit:      ["Kredit (Masuk)", "Credit (In)"],
    amount:      ["Jumlah",      "Amount"],
    type:        ["Jenis (DB/CR)", "Type (DB/CR)"],
    balance:     ["Saldo",       "Balance"],
    ignore:      ["Abaikan",     "Ignore"],
  };
  return isIndonesian ? map[role][0] : map[role][1];
}
