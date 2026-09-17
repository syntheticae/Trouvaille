import { useMemo, useCallback } from "react";
import type { Transaction } from "../lib/types";

export interface MerchantPrediction {
  categoryId: string | null;
  walletId: string | null;
  confidence: number;
  matchedKeyword: string;
}

export interface KeywordStats {
  categoryCounts: Record<string, number>;
  walletCounts: Record<string, number>;
  totalOccurrences: number;
}

export type MerchantMemoryIndex = Record<string, KeywordStats>;

/**
 * Normalizes input text into searchable keyword tokens.
 * Ignores stop words, short words, and common transactional prefixes.
 */
export function extractMerchantKeywords(text: string): string[] {
  if (!text) return [];
  const stopWords = new Set([
    "di",
    "ke",
    "dari",
    "pada",
    "untuk",
    "dan",
    "atau",
    "pake",
    "pakai",
    "via",
    "buat",
    "beli",
    "bayar",
    "isi",
    "the",
    "a",
    "an",
    "to",
    "for",
    "in",
    "at",
    "by",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

/**
 * Builds an in-memory frequency index from transaction history.
 */
export function buildMerchantMemoryIndex(
  transactions: Transaction[] = [],
): MerchantMemoryIndex {
  const index: MerchantMemoryIndex = {};

  for (const tx of transactions) {
    if (!tx.note || (!tx.category_id && !tx.wallet_id)) continue;

    const keywords = extractMerchantKeywords(tx.note);
    for (const kw of keywords) {
      if (!index[kw]) {
        index[kw] = {
          categoryCounts: {},
          walletCounts: {},
          totalOccurrences: 0,
        };
      }

      const entry = index[kw];
      entry.totalOccurrences += 1;

      if (tx.category_id) {
        entry.categoryCounts[tx.category_id] =
          (entry.categoryCounts[tx.category_id] || 0) + 1;
      }

      if (tx.wallet_id) {
        entry.walletCounts[tx.wallet_id] =
          (entry.walletCounts[tx.wallet_id] || 0) + 1;
      }
    }
  }

  return index;
}

/**
 * Given a note and memory index, predicts the most likely Category and Wallet.
 */
export function predictMerchantProfile(
  note: string,
  memoryIndex: MerchantMemoryIndex,
): MerchantPrediction | null {
  if (!note || !memoryIndex) return null;
  const keywords = extractMerchantKeywords(note);
  if (keywords.length === 0) return null;

  let bestKeyword = "";
  let highestOccurrences = 0;

  for (const kw of keywords) {
    const stats = memoryIndex[kw];
    if (stats && stats.totalOccurrences > highestOccurrences) {
      highestOccurrences = stats.totalOccurrences;
      bestKeyword = kw;
    }
  }

  if (!bestKeyword || highestOccurrences === 0) return null;

  const stats = memoryIndex[bestKeyword];

  // Find top category
  let topCategoryId: string | null = null;
  let topCategoryCount = 0;
  for (const [catId, count] of Object.entries(stats.categoryCounts)) {
    if (count > topCategoryCount) {
      topCategoryCount = count;
      topCategoryId = catId;
    }
  }

  // Find top wallet
  let topWalletId: string | null = null;
  let topWalletCount = 0;
  for (const [wId, count] of Object.entries(stats.walletCounts)) {
    if (count > topWalletCount) {
      topWalletCount = count;
      topWalletId = wId;
    }
  }

  const confidence = Math.min(
    1,
    Math.round((highestOccurrences / (highestOccurrences + 2)) * 100) / 100,
  );

  return {
    categoryId: topCategoryId,
    walletId: topWalletId,
    confidence,
    matchedKeyword: bestKeyword,
  };
}

/**
 * React Hook that learns user spending habits by mapping merchant notes/keywords
 * to their most frequently associated Category and Wallet.
 */
export function useMerchantMemory(transactions: Transaction[] = []) {
  const memoryIndex = useMemo(
    () => buildMerchantMemoryIndex(transactions),
    [transactions],
  );

  const predictProfile = useCallback(
    (note: string): MerchantPrediction | null =>
      predictMerchantProfile(note, memoryIndex),
    [memoryIndex],
  );

  return {
    predictProfile,
    getMemoryForNote: predictProfile,
    memorySize: Object.keys(memoryIndex).length,
  };
}
