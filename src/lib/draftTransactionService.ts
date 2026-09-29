// ======================================================================
// TROUVAILLE DRAFT TRANSACTIONS SERVICE
// Client-side persistent draft storage (localStorage)
// Keeps unreviewed transactions safely queued without affecting balances.
// ======================================================================

import { useState, useEffect } from "react";
import type { ParsedStatementItem } from "./statementParser";

const STORAGE_KEY = "trouvaille_draft_transactions";
const EXPIRATION_DAYS = 7;

export interface DraftBatch {
  id: string;
  appName: string;
  source: "back_tap" | "clipboard" | "manual";
  createdAt: string; // ISO 8601
  items: ParsedStatementItem[];
}

/**
 * Dispatches a window-wide event so any active component (e.g. HomePage Draft Banner)
 * immediately synchronizes its draft badge/count without reloading.
 */
function notifyDraftsUpdated() {
  if (typeof window === "undefined") return;
  const count = getDraftCount();
  window.dispatchEvent(new CustomEvent("trouvaille:drafts-updated", { detail: { count } }));
}

/**
 * Loads all draft batches from localStorage, automatically purging expired ones (> 7 days).
 */
export function getDraftBatches(): DraftBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: DraftBatch[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    const maxAgeMs = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    // Filter out batches older than EXPIRATION_DAYS
    const valid = parsed.filter((b) => {
      const createdTime = new Date(b.createdAt).getTime();
      return !isNaN(createdTime) && now - createdTime < maxAgeMs && b.items && b.items.length > 0;
    });

    if (valid.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch (err) {
    console.warn("[DraftService] Failed to read drafts from storage:", err);
    return [];
  }
}

/**
 * Returns a flat array of all pending draft items across all batches.
 */
export function getAllDraftItems(): ParsedStatementItem[] {
  const batches = getDraftBatches();
  return batches.flatMap((b) => b.items);
}

/**
 * Returns total number of pending draft items.
 */
export function getDraftCount(): number {
  return getAllDraftItems().length;
}

/**
 * Saves a new batch of items to drafts.
 * Returns the created batch ID.
 */
export function saveDraftBatch(
  items: ParsedStatementItem[],
  appName: string = "Transaksi",
  source: "back_tap" | "clipboard" | "manual" = "back_tap"
): string {
  if (!items || items.length === 0) return "";
  try {
    const existing = getDraftBatches();
    const batchId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newBatch: DraftBatch = {
      id: batchId,
      appName,
      source,
      createdAt: new Date().toISOString(),
      items,
    };

    const updated = [newBatch, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyDraftsUpdated();
    return batchId;
  } catch (err) {
    console.error("[DraftService] Failed to save draft batch:", err);
    return "";
  }
}

/**
 * Removes a specific batch by its ID.
 */
export function deleteDraftBatch(batchId: string): void {
  try {
    const existing = getDraftBatches();
    const updated = existing.filter((b) => b.id !== batchId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyDraftsUpdated();
  } catch (err) {
    console.error("[DraftService] Failed to delete draft batch:", err);
  }
}

/**
 * Removes a single draft item by its ID across all batches.
 */
export function removeDraftItem(itemId: string): void {
  try {
    const existing = getDraftBatches();
    const updated = existing
      .map((b) => ({
        ...b,
        items: b.items.filter((it) => it.id !== itemId),
      }))
      .filter((b) => b.items.length > 0);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyDraftsUpdated();
  } catch (err) {
    console.error("[DraftService] Failed to remove draft item:", err);
  }
}

/**
 * Clears all draft batches.
 */
export function clearAllDrafts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyDraftsUpdated();
  } catch (err) {
    console.error("[DraftService] Failed to clear drafts:", err);
  }
}

/**
 * React hook to reactively subscribe to draft updates in any component.
 */
export function useDraftTransactions() {
  const [batches, setBatches] = useState<DraftBatch[]>(() => getDraftBatches());

  useEffect(() => {
    const handleUpdate = () => {
      setBatches(getDraftBatches());
    };

    window.addEventListener("trouvaille:drafts-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("trouvaille:drafts-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const totalItems = batches.flatMap((b) => b.items);

  return {
    batches,
    items: totalItems,
    count: totalItems.length,
    saveBatch: saveDraftBatch,
    deleteBatch: deleteDraftBatch,
    removeItem: removeDraftItem,
    clearAll: clearAllDrafts,
    refresh: () => setBatches(getDraftBatches()),
  };
}
