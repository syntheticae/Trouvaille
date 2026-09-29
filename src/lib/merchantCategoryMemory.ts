// ======================================================================
// TROUVAILLE SELF-LEARNING MERCHANT MEMORY ENGINE (PILAR 1)
// Adaptive local persistence that remembers user category corrections
// for merchants and transaction titles across sessions.
// ======================================================================

export interface MerchantMemoryEntry {
  normalizedMerchant: string;
  categoryId: string;
  categoryName: string;
  count: number;
  lastUsedAt: number;
}

const STORAGE_KEY = "trouvaille_merchant_category_memory";

// In-memory fallback for test environments, SSR, or private browsing
let memoryFallback: Record<string, MerchantMemoryEntry> = {};

function getStorageData(): Record<string, MerchantMemoryEntry> {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : memoryFallback;
    } catch {
      return memoryFallback;
    }
  }
  return memoryFallback;
}

function setStorageData(data: Record<string, MerchantMemoryEntry>): void {
  memoryFallback = { ...data };
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }
}

/**
 * Normalizes merchant or transaction string into a clean lookup key.
 * Strips noise prefixes, punctuation, and transaction verbs.
 */
export function normalizeMerchantKey(raw: string): string {
  if (!raw) return "";

  let key = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // replace punctuation with spaces
    .replace(/\s+/g, " ")
    .trim();

  // Strip common transaction prefixes
  const noisePrefixes = [
    /^(?:pembayaran\s+qris|pembayaran|bayar\s+ke|transfer\s+ke|ditransfer\s+ke)\s+/i,
    /^(?:pesanan\s+selesai|pesanan|total\s+pesanan|order\s+gf|order)\s+/i,
    /^(?:top\s*up\s+saldo|top\s*up|isi\s+saldo)\s+/i,
    /^(?:pt|cv|ud)\s+/i,
  ];

  for (const prefix of noisePrefixes) {
    key = key.replace(prefix, "").trim();
  }

  return key.slice(0, 60);
}

/**
 * Retrieves learned category mapping for a merchant if one exists.
 */
export function getMerchantMemory(
  merchantName: string,
): MerchantMemoryEntry | null {
  if (!merchantName) return null;
  const key = normalizeMerchantKey(merchantName);
  if (!key || key.length < 2) return null;

  try {
    const memory = getStorageData();

    // Exact normalized match
    if (memory[key]) {
      return memory[key];
    }

    // Fuzzy contains match for compound merchant titles (e.g. "Kopi Kenangan Grand Indonesia" -> "Kopi Kenangan")
    for (const [savedKey, entry] of Object.entries(memory)) {
      if (savedKey.length >= 4 && (key.includes(savedKey) || savedKey.includes(key))) {
        return entry;
      }
    }

    return null;
  } catch (err) {
    console.warn("[merchantCategoryMemory] Failed to read merchant memory:", err);
    return null;
  }
}

/**
 * Saves or updates a category correction for a merchant.
 */
export function saveMerchantMemory(
  merchantName: string,
  categoryId: string,
  categoryName: string,
): void {
  if (!merchantName || !categoryId) return;
  const key = normalizeMerchantKey(merchantName);
  if (!key || key.length < 2) return null as unknown as void;

  try {
    const memory = getStorageData();

    const existing = memory[key];
    memory[key] = {
      normalizedMerchant: key,
      categoryId,
      categoryName,
      count: (existing?.count || 0) + 1,
      lastUsedAt: Date.now(),
    };

    setStorageData(memory);
  } catch (err) {
    console.warn("[merchantCategoryMemory] Failed to save merchant memory:", err);
  }
}

/**
 * Returns all saved merchant category memories.
 */
export function getAllMerchantMemory(): Record<string, MerchantMemoryEntry> {
  try {
    return getStorageData();
  } catch {
    return {};
  }
}

/**
 * Clears all saved merchant memory (e.g. for testing or user reset).
 */
export function clearMerchantMemory(): void {
  memoryFallback = {};
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
