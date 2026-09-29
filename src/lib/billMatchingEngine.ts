// ======================================================================
// TROUVAILLE SMART RECURRING & BILL MATCHING ENGINE (PILAR 2)
// Automatically correlates incoming transactions/mutations with active
// unpaid bills and proposes auto-settlement with explicit user confirmation.
// ======================================================================

import type { Bill } from "./types";

export interface MatchedBillResult {
  bill: Bill;
  confidence: number;
  matchReason: string;
  exactAmountMatch: boolean;
}

function cleanString(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Synonyms and common Indonesian utility & subscription aliases
const BILL_ALIAS_GROUPS: string[][] = [
  ["pln", "listrik", "token pln", "tagihan listrik"],
  ["pdam", "air", "tagihan air", "tirtanadi", "aetra", "palyja"],
  ["bpjs", "bpjs kesehatan", "bpjs ketenagakerjaan"],
  ["indihome", "telkom", "wifi", "internet", "biznet", "myrepublic", "first media", "cbn"],
  ["netflix", "spotify", "youtube premium", "disney", "disney+", "hbo", "vidio", "prime video", "apple"],
  ["kost", "kos", "kontrakan", "sewa kos", "sewa rumah"],
  ["asuransi", "prudential", "allianz", "manulife", "axa"],
];

function areTitlesRelated(txTitle: string, billTitle: string): boolean {
  const cleanTx = cleanString(txTitle);
  const cleanBill = cleanString(billTitle);

  if (!cleanTx || !cleanBill) return false;

  // Direct substring
  if (cleanTx.includes(cleanBill) || cleanBill.includes(cleanTx)) {
    return true;
  }

  // Token overlap (at least one word >= 3 letters matches)
  const txTokens = cleanTx.split(" ").filter((t) => t.length >= 3);
  const billTokens = cleanBill.split(" ").filter((t) => t.length >= 3);

  for (const bt of billTokens) {
    if (txTokens.includes(bt)) return true;
  }

  // Check alias groups
  for (const group of BILL_ALIAS_GROUPS) {
    const billHasAlias = group.some((alias) => cleanBill.includes(alias));
    const txHasAlias = group.some((alias) => cleanTx.includes(alias));
    if (billHasAlias && txHasAlias) return true;
  }

  return false;
}

/**
 * Evaluates whether an incoming transaction matches any active unpaid bill.
 * Only returns a match if title or alias correlates and amount is within reasonable threshold.
 */
export function findBestMatchingBill(
  txTitle: string,
  txAmount: number,
  bills: Bill[],
): MatchedBillResult | null {
  if (!txTitle || !bills || bills.length === 0 || txAmount <= 0) {
    return null;
  }

  // Filter only unpaid bills (or bills due for current cycle)
  const candidateBills = bills.filter((b) => !b.is_paid);
  if (candidateBills.length === 0) return null;

  let bestMatch: MatchedBillResult | null = null;

  for (const bill of candidateBills) {
    const titleMatch = areTitlesRelated(txTitle, bill.title);
    if (!titleMatch) continue;

    const billAmt = Number(bill.amount) || 0;
    let confidence = 0.5;
    let matchReason = "Nama tagihan sesuai";
    let exactAmountMatch = false;

    if (billAmt > 0) {
      const diff = Math.abs(txAmount - billAmt);

      if (diff === 0) {
        // Exact amount match
        confidence = 0.95;
        matchReason = "Nama & nominal tagihan cocok persis";
        exactAmountMatch = true;
      } else if (diff <= 5000) {
        // Common admin fee discrepancy (Rp 1.000 - Rp 5.000)
        confidence = 0.85;
        matchReason = "Nama cocok, selisih nominal wajar (biaya admin)";
      } else {
        // Variable bill (e.g. PLN pascabayar / PAM / Pulsa)
        confidence = 0.65;
        matchReason = "Nama tagihan cocok (nominal bervariasi)";
      }
    } else {
      // Bill with zero or unset nominal (variable amount bill)
      confidence = 0.75;
      matchReason = "Nama tagihan cocok";
    }

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        bill,
        confidence,
        matchReason,
        exactAmountMatch,
      };
    }
  }

  return bestMatch;
}
