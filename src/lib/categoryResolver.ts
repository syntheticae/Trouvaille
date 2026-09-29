import type { Transaction, Category, TransactionType } from "./types";
import { classifySemanticCategory } from "./semanticClassifier";
import { getMerchantMemory } from "./merchantCategoryMemory";

export interface ResolvedCategoryInfo {
  id?: string | null;
  name: string;
  emoji: string;
  type?: TransactionType;
}

const FALLBACK_CATEGORY_NAMES = new Set([
  "kategori",
  "category",
  "uncategorized",
  "tanpa kategori",
]);

/**
 * Robustly resolves the category for any transaction across all scenarios:
 * 1. Supabase nested joined `categories` object
 * 2. Foreign key `category_id` lookup against user's categories
 * 3. Famfina legacy note mapping
 * 4. Contextual note matching (e.g. "Kopi", "Indomaret", "Gaji")
 * 5. Type-based bulletproof fallback (never returns generic "Kategori")
 */
export function resolveTransactionCategory(
  tx: Partial<Transaction> | null | undefined,
  categoriesOrMap: Category[] | Map<string, Category> = [],
): ResolvedCategoryInfo {
  const isIncome = tx?.type === "income";
  const isTransfer = tx?.type === "transfer";

  const defaultFallback: ResolvedCategoryInfo = {
    name: isIncome ? "Other Income" : isTransfer ? "Transfer" : "Other",
    emoji: isIncome
      ? "/icons/gaji.png"
      : isTransfer
        ? "/icons/transfer.png"
        : "/icons/lainnya.png",
  };

  if (!tx) return defaultFallback;

  const isMap = categoriesOrMap instanceof Map;
  const categories = isMap
    ? Array.from(categoriesOrMap.values())
    : categoriesOrMap;
  const categoryMap = isMap ? categoriesOrMap : null;

  // 1. Direct joined categories relation
  if (tx.categories?.name) {
    const rawName = tx.categories.name.trim();
    if (!FALLBACK_CATEGORY_NAMES.has(rawName.toLowerCase())) {
      if (tx.categories?.id && categoryMap?.has(tx.categories.id)) {
        const match = categoryMap.get(tx.categories.id)!;
        return {
          id: match.id,
          name: match.name,
          emoji: match.emoji || defaultFallback.emoji,
          type: match.type,
        };
      }
      const matchInList = categories.find(
        (c) =>
          (tx.categories?.id && c.id === tx.categories.id) ||
          c.name.toLowerCase() === rawName.toLowerCase(),
      );
      if (matchInList) {
        return {
          id: matchInList.id,
          name: matchInList.name,
          emoji: matchInList.emoji || defaultFallback.emoji,
          type: matchInList.type,
        };
      }
      return {
        id: tx.categories.id || null,
        name: rawName,
        emoji: tx.categories.emoji || defaultFallback.emoji,
      };
    }
  }

  // 2. Lookup by category_id (O(1) if Map provided)
  if (tx.category_id) {
    const found = categoryMap
      ? categoryMap.get(tx.category_id)
      : categories.find((c) => c.id === tx.category_id);
    if (found && !FALLBACK_CATEGORY_NAMES.has(found.name.toLowerCase())) {
      return {
        id: found.id,
        name: found.name,
        emoji: found.emoji || defaultFallback.emoji,
        type: found.type,
      };
    }
  }

  // 2.5 Self-Learning Merchant Memory check (Pilar 1)
  if (tx.note) {
    const memory = getMerchantMemory(tx.note);
    if (memory) {
      const match = categories.find(
        (c) =>
          c.id === memory.categoryId ||
          c.name.toLowerCase() === memory.categoryName.toLowerCase(),
      );
      if (match) {
        return {
          id: match.id,
          name: match.name,
          emoji: match.emoji || defaultFallback.emoji,
          type: match.type,
        };
      }
    }
  }

  // 3. Keyword heuristic matching from note
  if (tx.note) {
    const noteLower = tx.note.toLowerCase();

    // Direct match with category name in list
    const exactSubstr = categories.find((c) =>
      noteLower.includes(c.name.toLowerCase()),
    );
    if (
      exactSubstr &&
      !FALLBACK_CATEGORY_NAMES.has(exactSubstr.name.toLowerCase())
    ) {
      return {
        id: exactSubstr.id,
        name: exactSubstr.name,
        emoji: exactSubstr.emoji || defaultFallback.emoji,
        type: exactSubstr.type,
      };
    }

    // Unified Semantic Taxonomy Engine (25+ Concepts, 600+ bilingual keywords)
    const semantic = classifySemanticCategory(tx.note, categories);
    if (semantic.category) {
      return {
        id: semantic.category.id,
        name: semantic.category.name,
        emoji: semantic.category.emoji || defaultFallback.emoji,
        type: semantic.category.type,
      };
    }

    // High frequency financial keywords fallback
    if (
      noteLower.includes("makan") ||
      noteLower.includes("lunch") ||
      noteLower.includes("dinner") ||
      noteLower.includes("kopi") ||
      noteLower.includes("cafe") ||
      noteLower.includes("gofood") ||
      noteLower.includes("grabfood") ||
      noteLower.includes("resto") ||
      noteLower.includes("sarapan")
    ) {
      const foodCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes("makan") ||
          c.name.toLowerCase().includes("food"),
      );
      if (foodCat) {
        return {
          id: foodCat.id,
          name: foodCat.name,
          emoji: foodCat.emoji || "/icons/makan.png",
        };
      }
      return { name: "Food & Dining", emoji: "/icons/makan.png" };
    }

    if (
      noteLower.includes("bensin") ||
      noteLower.includes("pertamina") ||
      noteLower.includes("shell") ||
      noteLower.includes("gojek") ||
      noteLower.includes("grab") ||
      noteLower.includes("toll") ||
      noteLower.includes("tol") ||
      noteLower.includes("parkir")
    ) {
      const transCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes("transport") ||
          c.name.toLowerCase().includes("bensin"),
      );
      if (transCat) {
        return {
          id: transCat.id,
          name: transCat.name,
          emoji: transCat.emoji || "/icons/transport.png",
        };
      }
      return { name: "Transportation", emoji: "/icons/transport.png" };
    }

    if (
      noteLower.includes("listrik") ||
      noteLower.includes("pln") ||
      noteLower.includes("wifi") ||
      noteLower.includes("indihome") ||
      noteLower.includes("pulsa") ||
      noteLower.includes("tagihan")
    ) {
      const billCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes("tagihan") ||
          c.name.toLowerCase().includes("bill") ||
          c.name.toLowerCase().includes("listrik"),
      );
      if (billCat) {
        return {
          id: billCat.id,
          name: billCat.name,
          emoji: billCat.emoji || "/icons/tagihan.png",
        };
      }
      return { name: "Bills & Utilities", emoji: "/icons/tagihan.png" };
    }

    if (
      noteLower.includes("gaji") ||
      noteLower.includes("salary") ||
      noteLower.includes("payroll") ||
      noteLower.includes("bonus") ||
      noteLower.includes("thr")
    ) {
      const salaryCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes("gaji") ||
          c.name.toLowerCase().includes("salary"),
      );
      if (salaryCat) {
        return {
          id: salaryCat.id,
          name: salaryCat.name,
          emoji: salaryCat.emoji || "/icons/gaji.png",
        };
      }
      return { name: "Salary & Income", emoji: "/icons/gaji.png" };
    }
  }

  return defaultFallback;
}
