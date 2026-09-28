// ======================================================================
// TROUVAILLE DETERMINISTIC CSV & DELIMITED TEXT PARSER
// Wraps PapaParse for robust quote-safe, delimiter-adaptive parsing.
// Handles commas inside quoted strings, semicolon-delimited Indonesian CSVs,
// tab-separated files, and UTF-8 Byte Order Marks (BOM).
// 100% offline & client-side.
// ======================================================================

import Papa from "papaparse";

export interface ParsedCSVResult {
  /** First row treated as headers (trimmed, quotes stripped, BOM removed) */
  headers: string[];
  /** Data rows as string arrays */
  rows: string[][];
  /** Delimiter detected by PapaParse (e.g. ",", ";", "\t") */
  delimiter: string;
  /** Whether the first row looks like a header or pure data */
  hasHeaderRow: boolean;
}

/**
 * Strips UTF-8 Byte Order Mark (BOM) if present at start of text.
 */
function stripBOM(str: string): string {
  if (str.charCodeAt(0) === 0xfeff) {
    return str.slice(1);
  }
  return str;
}

/**
 * Evaluates whether a row looks like a header row (mostly strings/text, not dates/numbers).
 */
function checkIsHeaderRow(firstRow: string[]): boolean {
  if (!firstRow || firstRow.length === 0) return false;
  // If first column matches a date pattern (DD/MM/YYYY or YYYY-MM-DD), it's almost certainly data
  const firstCol = firstRow[0].trim();
  if (/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/.test(firstCol)) return false;
  if (/^\d{1,2}\s+[a-zA-Z]{3}/.test(firstCol)) return false;

  // Check if at least 2 cells contain typical header vocabulary
  const headerTerms = [
    "tanggal", "date", "tgl", "deskripsi", "keterangan", "narasi", "description",
    "debet", "debit", "kredit", "credit", "jumlah", "nominal", "amount", "saldo", "balance",
    "jenis", "tipe", "type", "no", "mutasi"
  ];

  const lowerJoined = firstRow.map((c) => c.toLowerCase().trim()).join(" ");
  const matchCount = headerTerms.filter((term) => lowerJoined.includes(term)).length;
  if (matchCount >= 2) return true;

  // If no date found in col 0 and not all cells are purely numeric, treat as header
  const numericCount = firstRow.filter((c) => /^[\d.,\-+]+$/.test(c.trim())).length;
  return numericCount < firstRow.length / 2;
}

/**
 * Parses raw CSV, TSV, or semicolon-delimited text into clean rows.
 */
export function parseDelimitedText(rawText: string): ParsedCSVResult {
  const cleanInput = stripBOM(rawText.trim());

  if (!cleanInput) {
    return {
      headers: [],
      rows: [],
      delimiter: ",",
      hasHeaderRow: false,
    };
  }

  const parsed = Papa.parse<string[]>(cleanInput, {
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  const rawRows: string[][] = (parsed.data || [])
    .map((row) => row.map((cell) => (typeof cell === "string" ? cell.trim() : String(cell || "").trim())))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      delimiter: parsed.meta.delimiter || ",",
      hasHeaderRow: false,
    };
  }

  const hasHeaderRow = checkIsHeaderRow(rawRows[0]);

  if (hasHeaderRow) {
    const headers = rawRows[0];
    const rows = rawRows.slice(1);
    return {
      headers,
      rows,
      delimiter: parsed.meta.delimiter || ",",
      hasHeaderRow: true,
    };
  } else {
    // Generate positional fallback headers: Kolom 1, Kolom 2, ...
    const maxCols = Math.max(...rawRows.map((r) => r.length));
    const fallbackHeaders = Array.from({ length: maxCols }, (_, i) => `Kolom ${i + 1}`);
    return {
      headers: fallbackHeaders,
      rows: rawRows,
      delimiter: parsed.meta.delimiter || ",",
      hasHeaderRow: false,
    };
  }
}
