import type { Category, Wallet, TransactionType } from "./types";
import { parseBankNotification } from "./bankNotificationParser";
import { parseNaturalTransaction } from "./nlpParser";

export interface DeepLinkPrefill {
  amount?: number;
  type?: TransactionType;
  note?: string;
  category_id?: string;
  categoryId?: string;
  wallet_id?: string;
  walletId?: string;
  date?: Date;
  time?: string;
}

export interface DeepLinkResult {
  action: "transaction" | "voice" | "scan" | "import" | "none";
  prefilledValues?: DeepLinkPrefill;
}

/**
 * Parses incoming URL scheme strings (e.g. `trouvaille://add?text=...`, `trouvaille://voice`, etc.)
 * or standard web search parameters.
 */
export function parseDeepLink(
  urlString: string,
  categories: Category[] = [],
  wallets: Wallet[] = []
): DeepLinkResult {
  if (!urlString || typeof urlString !== "string") {
    return { action: "none" };
  }

  try {
    // Standardize URL scheme to a valid dummy HTTP URL for safe URLSearchParams parsing
    let targetUrl = urlString.trim();
    if (targetUrl.startsWith("?")) {
      targetUrl = `https://trouvaille.internal/${targetUrl}`;
    } else if (/^trouvaille:\/\//i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/^trouvaille:\/\//i, "https://trouvaille.internal/");
    } else if (!/^https?:\/\//i.test(targetUrl)) {
      return { action: "none" };
    }

    const parsed = new URL(targetUrl);
    const actionPath = parsed.pathname.replace(/^\/+/, "").toLowerCase();
    const params = parsed.searchParams;

    // 1. Direct modal routing actions
    if (actionPath === "voice" || params.get("mode") === "voice") {
      return { action: "voice" };
    }
    if (actionPath === "scan" || params.get("mode") === "scan") {
      return { action: "scan" };
    }
    if (actionPath === "import" || params.get("mode") === "import") {
      return { action: "import" };
    }

    // 2. Extract potential parameter tokens
    const rawText =
      params.get("text") ||
      params.get("title") ||
      params.get("q") ||
      params.get("ocr") ||
      params.get("content");
    const directAmount = params.get("amount");
    const directNote = params.get("note");
    const directType = params.get("type") as TransactionType | null;
    const directCategory =
      params.get("category") ||
      params.get("category_id") ||
      params.get("categoryId");
    const directWallet =
      params.get("wallet") ||
      params.get("wallet_id") ||
      params.get("walletId") ||
      params.get("account");
    const directDate = params.get("date") || params.get("datetime");
    const directTime = params.get("time");

    // Case A: Direct structured parameters (e.g. from Siri Shortcuts with ask for input)
    if (directAmount) {
      const cleanNum = parseFloat(directAmount.replace(/[^\d.]/g, ""));
      let matchedCatId = "";
      if (directCategory) {
        const cat = categories.find(
          (c) =>
            c.id.toLowerCase() === directCategory.toLowerCase() ||
            c.name.toLowerCase().includes(directCategory.toLowerCase()) ||
            directCategory.toLowerCase().includes(c.name.toLowerCase())
        );
        if (cat) matchedCatId = cat.id;
      }

      let matchedWalletId = "";
      if (directWallet) {
        const wal = wallets.find(
          (w) =>
            w.id.toLowerCase() === directWallet.toLowerCase() ||
            w.name.toLowerCase().includes(directWallet.toLowerCase()) ||
            directWallet.toLowerCase().includes(w.name.toLowerCase())
        );
        if (wal) matchedWalletId = wal.id;
      }

      let parsedDate: Date | undefined;
      if (directDate) {
        const d = new Date(directDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      return {
        action: "transaction",
        prefilledValues: {
          amount: isNaN(cleanNum) ? undefined : cleanNum,
          note: directNote || "",
          type: directType === "income" ? "income" : "expense",
          category_id: matchedCatId || undefined,
          categoryId: matchedCatId || undefined,
          wallet_id: matchedWalletId || undefined,
          walletId: matchedWalletId || undefined,
          date: parsedDate,
          time: directTime || undefined,
        },
      };
    }

    // Case B: Raw text provided (from iOS Back Tap OCR / Share Sheet / Web Share Target)
    if (rawText) {
      const trimmedText = rawText.trim();

      // B1: Try Indonesian Bank / E-Wallet notification parser
      const bankResult = parseBankNotification(trimmedText, categories, wallets);
      if (bankResult && bankResult.amount > 0) {
        return {
          action: "transaction",
          prefilledValues: {
            amount: bankResult.amount,
            type: bankResult.type,
            note: bankResult.merchantOrNote,
            category_id: bankResult.suggestedCategoryId,
            categoryId: bankResult.suggestedCategoryId,
            wallet_id: bankResult.suggestedWalletId,
            walletId: bankResult.suggestedWalletId,
          },
        };
      }

      // B2: Try Natural Language Transaction parser (e.g., "Kopi tuku 25rb pakai gopay")
      const nlpResult = parseNaturalTransaction(trimmedText, categories, wallets);
      if (nlpResult && nlpResult.amount && nlpResult.amount > 0) {
        return {
          action: "transaction",
          prefilledValues: {
            amount: nlpResult.amount,
            type: nlpResult.type || "expense",
            note: nlpResult.note || trimmedText.slice(0, 40),
            category_id: nlpResult.categoryId || undefined,
            categoryId: nlpResult.categoryId || undefined,
            wallet_id: nlpResult.walletId || undefined,
            walletId: nlpResult.walletId || undefined,
          },
        };
      }

      // B3: Fallback if amount couldn't be extracted, still open with note
      return {
        action: "transaction",
        prefilledValues: {
          note: trimmedText.slice(0, 60),
          type: "expense",
        },
      };
    }

    // Case C: Explicit open transaction modal (e.g. `trouvaille://add` or `trouvaille://transaction`)
    if (actionPath === "add" || actionPath === "transaction" || actionPath === "") {
      return { action: "transaction" };
    }

    return { action: "none" };
  } catch (err) {
    console.warn("[DeepLink] Failed to parse deep link URL:", err);
    return { action: "none" };
  }
}
