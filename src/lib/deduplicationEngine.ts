import { supabase } from "./supabase";
import type { Category, Wallet, Transaction } from "./types";
import type { QueryClient } from "@tanstack/react-query";

const CATEGORIES_BACKUP_STORAGE_KEY = "TROUVAILLE_CATEGORIES_BACKUP_V1";
const WALLETS_BACKUP_STORAGE_KEY = "TROUVAILLE_WALLETS_BACKUP_V1";

export interface DeduplicationSummary {
  mergedCount: number;
  duplicateCount: number;
  details: string[];
}

/**
 * Cross-lingual canonical keys for standard default categories.
 * Maps English and Indonesian default equivalents to the same canonical key,
 * preventing bilingual duplicate bloat (e.g., Food & Dining alongside Makanan & Minuman).
 */
export const CROSS_LINGUAL_CANONICAL_KEY: Record<string, string> = {
  // Income Universal Streams
  "income:salary & wages": "canonical_income_salary",
  "income:gaji & upah": "canonical_income_salary",
  "income:business & freelance": "canonical_income_business",
  "income:bisnis & freelance": "canonical_income_business",
  "income:bonuses & commissions": "canonical_income_bonus",
  "income:bonus & komisi": "canonical_income_bonus",
  "income:investments & dividends": "canonical_income_investments",
  "income:investasi & dividen": "canonical_income_investments",
  "income:interest & passive income": "canonical_income_interest",
  "income:bunga & imbal hasil": "canonical_income_interest",
  "income:cashback & refunds": "canonical_income_cashback",
  "income:pengembalian & diskon": "canonical_income_cashback",
  "income:gifts & grants": "canonical_income_gifts",
  "income:hadiah & hibah": "canonical_income_gifts",
  "income:other income": "canonical_income_other",
  "income:pendapatan lainnya": "canonical_income_other",

  // Expense Universal Pillars
  "expense:food & dining": "canonical_expense_food",
  "expense:makanan & minuman": "canonical_expense_food",
  "expense:groceries & supermarket": "canonical_expense_groceries",
  "expense:transportation & travel": "canonical_expense_transportation",
  "expense:transportasi & kendaraan": "canonical_expense_transportation",
  "expense:housing & utilities": "canonical_expense_housing",
  "expense:hunian & utilitas": "canonical_expense_housing",
  "expense:bills & subscriptions": "canonical_expense_bills",
  "expense:tagihan & langganan": "canonical_expense_bills",
  "expense:shopping & lifestyle": "canonical_expense_shopping",
  "expense:belanja & gaya hidup": "canonical_expense_shopping",
  "expense:health & medical": "canonical_expense_health",
  "expense:kesehatan & medis": "canonical_expense_health",
  "expense:entertainment & leisure": "canonical_expense_entertainment",
  "expense:hiburan & rekreasi": "canonical_expense_entertainment",
  "expense:family & personal care": "canonical_expense_family",
  "expense:keluarga & pribadi": "canonical_expense_family",
  "expense:education & career": "canonical_expense_education",
  "expense:pendidikan & karier": "canonical_expense_education",
  "expense:pendidikan & karir": "canonical_expense_education",
  "expense:gifts & donations": "canonical_expense_gifts",
  "expense:sosial & amal": "canonical_expense_gifts",
  "expense:financial fees & taxes": "canonical_expense_fees",
  "expense:biaya finansial & pajak": "canonical_expense_fees",
  "expense:savings & investments": "canonical_expense_savings",
  "expense:investasi & tabungan": "canonical_expense_savings",
  "expense:other expenses": "canonical_expense_other",
  "expense:lainnya": "canonical_expense_other",
};

/**
 * Automatically inspects, consolidates, and merges duplicate categories for a user.
 * 1. Groups by type and lower-cased name, and cross-lingual canonical keys.
 * 2. Picks the single best survivor (priority: most transactions linked, or oldest created_at).
 * 3. Migrates any transactions referencing duplicate category IDs to the surviving category ID.
 * 4. Safely deletes duplicate category rows in Supabase and local cache.
 */
export async function autoDeduplicateCategories(
  userId: string,
  categories: Category[],
  transactions: Transaction[],
  qc?: QueryClient,
): Promise<DeduplicationSummary> {
  if (!userId || userId === "guest_local_user" || !categories || categories.length === 0) {
    return { mergedCount: 0, duplicateCount: 0, details: [] };
  }

  // 1. Group categories by canonical key or type + trimmed lower-case name
  const groups = new Map<string, Category[]>();
  for (const cat of categories) {
    const rawKey = `${cat.type || "expense"}:${cat.name.trim().toLowerCase()}`;
    const key = CROSS_LINGUAL_CANONICAL_KEY[rawKey] || rawKey;
    const list = groups.get(key) || [];
    list.push(cat);
    groups.set(key, list);
  }

  // Filter groups that have duplicates
  const duplicateGroups = Array.from(groups.entries()).filter(([_, list]) => list.length > 1);
  if (duplicateGroups.length === 0) {
    return { mergedCount: 0, duplicateCount: 0, details: [] };
  }

  let totalMerged = 0;
  let totalDuplicates = 0;
  const details: string[] = [];

  // Count transactions per category ID for smart survivor selection
  const txCountByCatId = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.category_id) {
      txCountByCatId.set(tx.category_id, (txCountByCatId.get(tx.category_id) || 0) + 1);
    }
  }

  for (const [key, list] of duplicateGroups) {
    // Sort so survivor is at index 0:
    // 1. Category with the highest transaction count
    // 2. Default category over non-default
    // 3. Oldest created_at (or lowest UUID)
    list.sort((a, b) => {
      const countA = txCountByCatId.get(a.id) || 0;
      const countB = txCountByCatId.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    const survivor = list[0];
    const duplicates = list.slice(1);
    const duplicateIds = duplicates.map((d) => d.id);

    try {
      // 1. Reassign all transactions linked to duplicate category IDs to survivor.id
      for (const dupId of duplicateIds) {
        const { error: txUpdateError } = await supabase
          .from("transactions")
          .update({ category_id: survivor.id })
          .eq("user_id", userId)
          .eq("category_id", dupId);

        if (txUpdateError) {
          console.warn(`[autoDeduplicateCategories] Reassigning transactions from ${dupId} warning:`, txUpdateError);
        }

        // Also reassign bills if table exists
        try {
          await supabase
            .from("bills")
            .update({ category_id: survivor.id })
            .eq("user_id", userId)
            .eq("category_id", dupId);
        } catch {
          // ignore if bills not present
        }
      }

      // 2. Delete duplicate category records in Supabase
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("user_id", userId)
        .in("id", duplicateIds);

      if (!deleteError) {
        totalMerged++;
        totalDuplicates += duplicateIds.length;
        details.push(`Merged ${duplicateIds.length} duplicate(s) of "${survivor.name}" (${survivor.type}) into ID ${survivor.id}`);
      } else {
        console.warn(`[autoDeduplicateCategories] Failed to delete duplicate categories for "${survivor.name}":`, deleteError);
      }
    } catch (err) {
      console.warn(`[autoDeduplicateCategories] Exception processing group ${key}:`, err);
    }
  }

  // 3. Update local caches if any merges took place
  if (totalMerged > 0) {
    const survivingCategories = categories.filter((c) => {
      const rawKey = `${c.type || "expense"}:${c.name.trim().toLowerCase()}`;
      const key = CROSS_LINGUAL_CANONICAL_KEY[rawKey] || rawKey;
      const group = groups.get(key);
      if (group && group.length > 1) {
        // Only keep the chosen survivor
        return c.id === group[0].id;
      }
      return true;
    });

    try {
      localStorage.setItem(CATEGORIES_BACKUP_STORAGE_KEY, JSON.stringify(survivingCategories));
    } catch {}

    if (qc) {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  }

  return { mergedCount: totalMerged, duplicateCount: totalDuplicates, details };
}

/**
 * Automatically inspects, consolidates, and merges duplicate wallets/accounts for a user.
 * 1. Groups by trimmed lower-cased name.
 * 2. Picks the single best survivor (priority: highest non-zero balance / transaction count / oldest).
 * 3. Migrates any transactions referencing duplicate wallet IDs (wallet_id or to_wallet_id) to the surviving wallet ID.
 * 4. Safely deletes duplicate wallet rows in Supabase and local cache.
 */
export async function autoDeduplicateWallets(
  userId: string,
  wallets: Wallet[],
  transactions: Transaction[],
  qc?: QueryClient,
): Promise<DeduplicationSummary> {
  if (!userId || userId === "guest_local_user" || !wallets || wallets.length === 0) {
    return { mergedCount: 0, duplicateCount: 0, details: [] };
  }

  // 1. Group wallets by trimmed lower-cased name
  const groups = new Map<string, Wallet[]>();
  for (const w of wallets) {
    const key = w.name.trim().toLowerCase();
    const list = groups.get(key) || [];
    list.push(w);
    groups.set(key, list);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(([_, list]) => list.length > 1);
  if (duplicateGroups.length === 0) {
    return { mergedCount: 0, duplicateCount: 0, details: [] };
  }

  let totalMerged = 0;
  let totalDuplicates = 0;
  const details: string[] = [];

  // Count transactions referencing each wallet ID
  const txCountByWalletId = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.wallet_id) {
      txCountByWalletId.set(tx.wallet_id, (txCountByWalletId.get(tx.wallet_id) || 0) + 1);
    }
    if (tx.to_wallet_id) {
      txCountByWalletId.set(tx.to_wallet_id, (txCountByWalletId.get(tx.to_wallet_id) || 0) + 1);
    }
  }

  for (const [key, list] of duplicateGroups) {
    // Sort so survivor is at index 0:
    // 1. Wallet with highest transaction count
    // 2. Non-zero balance if present
    // 3. Oldest created_at
    list.sort((a, b) => {
      const countA = txCountByWalletId.get(a.id) || 0;
      const countB = txCountByWalletId.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      const balA = Math.abs(Number((a as any).balance || (a as any).initial_balance || 0));
      const balB = Math.abs(Number((b as any).balance || (b as any).initial_balance || 0));
      if (balB !== balA) return balB - balA;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    const survivor = list[0];
    const duplicates = list.slice(1);
    const duplicateIds = duplicates.map((d) => d.id);

    try {
      // 1. Reassign transactions wallet_id and to_wallet_id
      for (const dupId of duplicateIds) {
        await supabase
          .from("transactions")
          .update({ wallet_id: survivor.id })
          .eq("user_id", userId)
          .eq("wallet_id", dupId);

        await supabase
          .from("transactions")
          .update({ to_wallet_id: survivor.id })
          .eq("user_id", userId)
          .eq("to_wallet_id", dupId);

        // Also reassign bills if table exists
        try {
          await supabase
            .from("bills")
            .update({ wallet_id: survivor.id })
            .eq("user_id", userId)
            .eq("wallet_id", dupId);
        } catch {
          // ignore
        }

        // Also reassign holdings if referencing this wallet
        try {
          await supabase
            .from("holdings")
            .update({ wallet_id: survivor.id })
            .eq("user_id", userId)
            .eq("wallet_id", dupId);
        } catch {
          // ignore
        }
      }

      // 2. Delete duplicate wallet records in Supabase
      const { error: deleteError } = await supabase
        .from("wallets")
        .delete()
        .eq("user_id", userId)
        .in("id", duplicateIds);

      if (!deleteError) {
        totalMerged++;
        totalDuplicates += duplicateIds.length;
        details.push(`Merged ${duplicateIds.length} duplicate(s) of wallet "${survivor.name}" into ID ${survivor.id}`);
      } else {
        console.warn(`[autoDeduplicateWallets] Failed to delete duplicate wallets for "${survivor.name}":`, deleteError);
      }
    } catch (err) {
      console.warn(`[autoDeduplicateWallets] Exception processing group ${key}:`, err);
    }
  }

  // 3. Update local caches
  if (totalMerged > 0) {
    const survivingWallets = wallets.filter((w) => {
      const key = w.name.trim().toLowerCase();
      const group = groups.get(key);
      if (group && group.length > 1) {
        return w.id === group[0].id;
      }
      return true;
    });

    try {
      localStorage.setItem(WALLETS_BACKUP_STORAGE_KEY, JSON.stringify(survivingWallets));
    } catch {}

    if (qc) {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  }

  return { mergedCount: totalMerged, duplicateCount: totalDuplicates, details };
}
