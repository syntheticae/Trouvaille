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
  autoSave?: boolean;
  matchedCategoryName?: string;
  matchedWalletName?: string;
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

    // 1. Direct modal routing actions (via path, ?mode=, or ?action= from PWA manifest shortcuts)
    if (actionPath === "voice" || params.get("mode") === "voice" || params.get("action") === "voice") {
      return { action: "voice" };
    }
    if (actionPath === "scan" || params.get("mode") === "scan" || params.get("action") === "scan") {
      return { action: "scan" };
    }
    if (actionPath === "import" || params.get("mode") === "import" || params.get("action") === "import") {
      return { action: "import" };
    }
    if (params.get("action") === "add") {
      return { action: "transaction" };
    }

    // 2. Extract potential parameter tokens
    const rawText =
      params.get("text") ||
      params.get("teks") ||
      params.get("title") ||
      params.get("q") ||
      params.get("ocr") ||
      params.get("content");
    const directAmount = params.get("amount") || params.get("nominal");
    const directNote = params.get("note") || params.get("catatan") || params.get("deskripsi");
    const directType = (params.get("type") || params.get("tipe")) as TransactionType | null;
    const directCategory =
      params.get("category") ||
      params.get("kategori") ||
      params.get("category_id") ||
      params.get("categoryId");
    const directWallet =
      params.get("wallet") ||
      params.get("rekening") ||
      params.get("dompet") ||
      params.get("wallet_id") ||
      params.get("walletId") ||
      params.get("account");
    const directDate = params.get("date") || params.get("tanggal") || params.get("datetime");
    const directTime = params.get("time") || params.get("waktu");

    // Case A: Direct structured parameters (e.g. from Siri Shortcuts with ask for input)
    if (directAmount) {
      const cleanNum = parseFloat(directAmount.replace(/[^\d.]/g, ""));
      let matchedCat = categories.find(
        (c) =>
          (directCategory && c.id.toLowerCase() === directCategory.toLowerCase()) ||
          (directCategory && c.name.toLowerCase() === directCategory.toLowerCase()) ||
          (directCategory && c.name.toLowerCase().includes(directCategory.toLowerCase())) ||
          (directCategory && directCategory.toLowerCase().includes(c.name.toLowerCase()))
      );
      if (!matchedCat && categories.length > 0) {
        matchedCat = categories.find((c) => c.type !== "income") || categories[0];
      }

      let matchedWal = wallets.find(
        (w) =>
          (directWallet && w.id.toLowerCase() === directWallet.toLowerCase()) ||
          (directWallet && w.name.toLowerCase() === directWallet.toLowerCase()) ||
          (directWallet && w.name.toLowerCase().includes(directWallet.toLowerCase())) ||
          (directWallet && directWallet.toLowerCase().includes(w.name.toLowerCase()))
      );
      if (!matchedWal && wallets.length > 0) {
        matchedWal = wallets[0];
      }

      let parsedDate: Date | undefined;
      if (directDate) {
        const d = new Date(directDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      const autoParam = (params.get("autosave") || params.get("auto") || params.get("otomatis") || "").toLowerCase();
      // Auto-save only if explicitly requested (opt-in) to prevent malicious URL injection
      const shouldAutoSave = (autoParam === "true" || autoParam === "1" || autoParam === "ya") && !isNaN(cleanNum) && cleanNum > 0;

      return {
        action: "transaction",
        autoSave: shouldAutoSave,
        matchedCategoryName: matchedCat?.name,
        matchedWalletName: matchedWal?.name,
        prefilledValues: {
          amount: isNaN(cleanNum) ? undefined : cleanNum,
          note: directNote || "",
          type: directType === "income" ? "income" : "expense",
          category_id: matchedCat?.id,
          categoryId: matchedCat?.id,
          wallet_id: matchedWal?.id,
          walletId: matchedWal?.id,
          date: parsedDate || new Date(),
          time: directTime || undefined,
        },
      };
    }

    // Case B: Raw text provided (from iOS Back Tap OCR / Share Sheet / Web Share Target)
    if (rawText) {
      const trimmedText = rawText.trim();
      const autoParam = (params.get("autosave") || params.get("auto") || params.get("otomatis") || "").toLowerCase();
      const isAutoRequested = autoParam === "true" || autoParam === "1";

      // B1: Try Indonesian Bank / E-Wallet notification parser
      const bankResult = parseBankNotification(trimmedText, categories, wallets);
      if (bankResult && bankResult.amount > 0) {
        const matchedCat = categories.find(c => c.id === bankResult.suggestedCategoryId);
        const matchedWal = wallets.find(w => w.id === bankResult.suggestedWalletId);
        return {
          action: "transaction",
          autoSave: isAutoRequested,
          matchedCategoryName: matchedCat?.name,
          matchedWalletName: matchedWal?.name,
          prefilledValues: {
            amount: bankResult.amount,
            type: bankResult.type,
            note: bankResult.merchantOrNote,
            category_id: bankResult.suggestedCategoryId,
            categoryId: bankResult.suggestedCategoryId,
            wallet_id: bankResult.suggestedWalletId,
            walletId: bankResult.suggestedWalletId,
            date: new Date(),
          },
        };
      }

      // B2: Try Natural Language Transaction parser (e.g., "Kopi tuku 25rb pakai gopay")
      const nlpResult = parseNaturalTransaction(trimmedText, categories, wallets);
      if (nlpResult && nlpResult.amount && nlpResult.amount > 0) {
        const matchedCat = categories.find(c => c.id === nlpResult.categoryId) || categories[0];
        const matchedWal = wallets.find(w => w.id === nlpResult.walletId) || wallets[0];
        return {
          action: "transaction",
          autoSave: isAutoRequested,
          matchedCategoryName: matchedCat?.name,
          matchedWalletName: matchedWal?.name,
          prefilledValues: {
            amount: nlpResult.amount,
            type: nlpResult.type || "expense",
            note: nlpResult.note || trimmedText.slice(0, 40),
            category_id: nlpResult.categoryId || matchedCat?.id,
            categoryId: nlpResult.categoryId || matchedCat?.id,
            wallet_id: nlpResult.walletId || matchedWal?.id,
            walletId: nlpResult.walletId || matchedWal?.id,
            date: new Date(),
          },
        };
      }

      // B3: Fallback if amount couldn't be extracted, still open with note
      return {
        action: "transaction",
        autoSave: false,
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
