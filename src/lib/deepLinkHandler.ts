import type { Category, Wallet, TransactionType } from "./types";
import { parseBankNotification } from "./bankNotificationParser";
import { parseNaturalTransaction } from "./nlpParser";
import { parseSlipText } from "./slipParser";

export interface DeepLinkPrefill {
  amount?: number;
  type?: TransactionType;
  note?: string;
  category_id?: string;
  categoryId?: string;
  wallet_id?: string;
  walletId?: string;
  to_wallet_id?: string;
  toWalletId?: string;
  date?: Date;
  time?: string;
}

export interface DeepLinkResult {
  action: "transaction" | "voice" | "scan" | "import" | "navigate" | "restore_balance" | "none";
  path?: string;
  autoSave?: boolean;
  matchedCategoryName?: string;
  matchedWalletName?: string;
  matchedToWalletName?: string;
  prefilledValues?: DeepLinkPrefill;
}

/**
 * Resilient multi-format Indonesian & international date parser.
 * Handles ISO, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY with Indonesian month names.
 */
export function parseIndonesianDate(dateStr?: string | null): Date | undefined {
  if (!dateStr || typeof dateStr !== "string") return undefined;
  // Strip leading day names (e.g. "Senin, ", "Monday, ") often produced by iOS Shortcuts
  const clean = dateStr
    .trim()
    .replace(/^(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,\s]+/i, "")
    .trim();
  if (!clean) return undefined;

  // Try standard JS parse first (e.g. ISO 8601 or YYYY-MM-DD)
  const stdDate = new Date(clean);
  if (!isNaN(stdDate.getTime()) && !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(clean)) {
    return stdDate;
  }

  const monthMap: Record<string, number> = {
    jan: 0, januari: 0, january: 0,
    feb: 1, februari: 1, february: 1,
    mar: 2, maret: 2, march: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5, june: 5,
    jul: 6, juli: 6, july: 6,
    agu: 7, agustus: 7, aug: 7, august: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9, oct: 9, october: 9,
    nov: 10, november: 10,
    des: 11, desember: 11, dec: 11, december: 11,
  };

  // Pattern A: "28/09/2026", "28-09-2026", "28/09/26" (DD/MM/YYYY or DD-MM-YYYY)
  const numMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (numMatch) {
    const d = parseInt(numMatch[1], 10);
    const m = parseInt(numMatch[2], 10);
    let y = parseInt(numMatch[3], 10);
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      return new Date(y, m - 1, d);
    }
  }

  // Pattern B: "28 Sep 2026", "28 September 2026", "28 Okt 2026", "28-Agu-2026"
  const textMatch =
    clean.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{2,4})/i) ||
    clean.match(/^(\d{1,2})[/-]([a-zA-Z]+)[/-](\d{2,4})/i);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const mStr = textMatch[2].toLowerCase();
    const m = monthMap[mStr];
    let y = parseInt(textMatch[3], 10);
    if (y < 100) y += 2000;
    if (m !== undefined && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return new Date(y, m, d);
    }
  }

  // Pattern C: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m - 1, d);
  }

  return undefined;
}

/**
 * Normalizes Indonesian & International currency strings into clean numbers.
 * Handles "Rp 50.000", "50.000", "50,000", "50000", "1.500.000,00", etc.
 */
export function parseCurrencyAmount(rawStr?: string | null): number {
  if (!rawStr || typeof rawStr !== "string") return 0;
  let clean = rawStr.trim().replace(/^[^\d]+/g, "");
  if (!clean) return 0;

  if (clean.includes(".") && clean.includes(",")) {
    const dotIdx = clean.lastIndexOf(".");
    const commaIdx = clean.lastIndexOf(",");
    if (commaIdx > dotIdx) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts[parts.length - 1].length === 3 || parts.length > 2) {
      clean = clean.replace(/\./g, "");
    }
  } else if (clean.includes(",")) {
    const parts = clean.split(",");
    if (parts[parts.length - 1].length === 3 || parts.length > 2) {
      clean = clean.replace(/,/g, "");
    } else {
      clean = clean.replace(",", ".");
    }
  } else {
    clean = clean.replace(/[^\d.]/g, "");
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
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

    // Replace raw spaces with %20 so new URL(...) does not throw on unencoded query params
    const safeUrl = targetUrl.replace(/ /g, "%20");
    const parsed = new URL(safeUrl);
    const actionPath = parsed.pathname.replace(/^\/+/, "").toLowerCase();
    const params = parsed.searchParams;

    // 1. Direct modal routing actions (via path, ?mode=, or ?action=)
    if (
      actionPath === "restore-balance" ||
      actionPath === "clean-sync" ||
      actionPath === "reset-queue" ||
      params.get("action") === "restore_balance" ||
      params.get("action") === "clean_sync" ||
      params.get("mode") === "clean_sync"
    ) {
      return { action: "restore_balance" };
    }
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

    // 2. Direct tab navigation routes
    if (actionPath === "calendar") {
      return { action: "navigate", path: "/calendar" };
    }
    if (actionPath === "bills" || actionPath === "tagihan") {
      return { action: "navigate", path: "/bills" };
    }
    if (actionPath === "transactions" || actionPath === "history" || actionPath === "riwayat") {
      return { action: "navigate", path: "/transactions" };
    }
    if (actionPath === "statistics" || actionPath === "stats" || actionPath === "statistik") {
      return { action: "navigate", path: "/statistics" };
    }
    if (actionPath === "assets" || actionPath === "wealth" || actionPath === "investments" || actionPath === "aset") {
      return { action: "navigate", path: "/assets" };
    }
    if (actionPath === "settings" || actionPath === "pengaturan") {
      return { action: "navigate", path: "/settings" };
    }
    if (actionPath === "reports" || actionPath === "report" || actionPath === "laporan") {
      return { action: "navigate", path: "/transactions?open=export" };
    }
    if (actionPath === "home" || actionPath === "beranda") {
      return { action: "navigate", path: "/" };
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
      params.get("akun") ||
      params.get("account") ||
      params.get("wallet_id") ||
      params.get("walletId") ||
      params.get("dari");
    const directToWallet =
      params.get("to_wallet") ||
      params.get("to_wallet_id") ||
      params.get("toWallet") ||
      params.get("ke") ||
      params.get("tujuan");
    const directDate = params.get("date") || params.get("tanggal") || params.get("datetime");
    const directTime = params.get("time") || params.get("waktu");

    // Case A: Direct structured parameters (e.g. from Siri Shortcuts with ask for input / Dialog)
    if (directAmount) {
      const cleanNum = parseCurrencyAmount(directAmount);
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

      let matchedToWal: Wallet | undefined;
      if (directToWallet) {
        matchedToWal = wallets.find(
          (w) =>
            w.id.toLowerCase() === directToWallet.toLowerCase() ||
            w.name.toLowerCase() === directToWallet.toLowerCase() ||
            w.name.toLowerCase().includes(directToWallet.toLowerCase()) ||
            directToWallet.toLowerCase().includes(w.name.toLowerCase())
        );
      }

      const parsedDate = parseIndonesianDate(directDate) || new Date();

      const autoParam = (params.get("autosave") || params.get("auto") || params.get("otomatis") || "").toLowerCase();
      // Auto-save only if explicitly requested (opt-in) to prevent unintended auto-inserts
      const shouldAutoSave = (autoParam === "true" || autoParam === "1" || autoParam === "ya") && !isNaN(cleanNum) && cleanNum > 0;

      const effectiveType: TransactionType =
        directType === "income"
          ? "income"
          : directType === "transfer" || matchedToWal
          ? "transfer"
          : "expense";

      return {
        action: "transaction",
        autoSave: shouldAutoSave,
        matchedCategoryName: matchedCat?.name,
        matchedWalletName: matchedWal?.name,
        matchedToWalletName: matchedToWal?.name,
        prefilledValues: {
          amount: isNaN(cleanNum) ? undefined : cleanNum,
          note: directNote || "",
          type: effectiveType,
          category_id: effectiveType === "transfer" ? undefined : matchedCat?.id,
          categoryId: effectiveType === "transfer" ? undefined : matchedCat?.id,
          wallet_id: matchedWal?.id,
          walletId: matchedWal?.id,
          to_wallet_id: matchedToWal?.id,
          toWalletId: matchedToWal?.id,
          date: parsedDate,
          time: directTime || undefined,
        },
      };
    }

    // Case B: Raw text provided (from iOS Back Tap OCR / Shortcuts Notification Automations)
    if (rawText) {
      const trimmedText = rawText.trim();
      const autoParam = (params.get("autosave") || params.get("auto") || params.get("otomatis") || "").toLowerCase();
      const isAutoRequested = autoParam === "true" || autoParam === "1";

      const isMultiLineOrSlip =
        trimmedText.includes("\n") ||
        trimmedText.includes("\r") ||
        trimmedText.length > 70 ||
        /(?:struk|nota|total|subtotal|biaya admin|rekening|pengirim|penerima|no\.?\s*referensi|bi-fast|bukti transfer|transfer berhasil|transaksi berhasil)/i.test(trimmedText);

      // B1: If multi-line OCR text or matches slip characteristics (Back Tap Live Text OCR output),
      // prioritize parseSlipText so transfer slips (e.g. SeaBank -> ShopeePay) are accurately parsed!
      if (isMultiLineOrSlip) {
        const slipResult = parseSlipText(trimmedText, wallets, categories);
        if (slipResult && slipResult.amount && slipResult.amount > 0) {
          return {
            action: "transaction",
            autoSave: isAutoRequested,
            matchedCategoryName: slipResult.categoryName || undefined,
            matchedWalletName: slipResult.sourceWalletName || undefined,
            matchedToWalletName: slipResult.destinationWalletName || undefined,
            prefilledValues: {
              amount: slipResult.amount,
              type: slipResult.type,
              note: directNote || "", // Strictly empty note for scanned receipts/slips unless explicit directNote
              category_id: slipResult.type === "transfer" ? undefined : (slipResult.categoryId || undefined),
              categoryId: slipResult.type === "transfer" ? undefined : (slipResult.categoryId || undefined),
              wallet_id: slipResult.sourceWalletId || undefined,
              walletId: slipResult.sourceWalletId || undefined,
              to_wallet_id: slipResult.destinationWalletId || undefined,
              toWalletId: slipResult.destinationWalletId || undefined,
              date: slipResult.date || new Date(),
              time: slipResult.time || undefined,
            },
          };
        }
      }

      // B2: Indonesian Bank / E-Wallet push notification parser (single-line notifications from iOS notification center)
      const bankResult = parseBankNotification(trimmedText, categories, wallets);
      if (bankResult && bankResult.amount > 0) {
        const matchedCat = categories.find((c) => c.id === bankResult.suggestedCategoryId);
        const matchedWal = wallets.find((w) => w.id === bankResult.suggestedWalletId);
        const matchedToWal = wallets.find((w) => w.id === bankResult.suggestedToWalletId);

        return {
          action: "transaction",
          autoSave: isAutoRequested,
          matchedCategoryName: matchedCat?.name,
          matchedWalletName: matchedWal?.name,
          matchedToWalletName: matchedToWal?.name,
          prefilledValues: {
            amount: bankResult.amount,
            type: bankResult.type,
            note: directNote || (bankResult.type === "transfer" ? "" : (bankResult.merchantOrNote || "")),
            category_id: bankResult.type === "transfer" ? undefined : bankResult.suggestedCategoryId,
            categoryId: bankResult.type === "transfer" ? undefined : bankResult.suggestedCategoryId,
            wallet_id: bankResult.suggestedWalletId,
            walletId: bankResult.suggestedWalletId,
            to_wallet_id: bankResult.suggestedToWalletId,
            toWalletId: bankResult.suggestedToWalletId,
            date: new Date(),
          },
        };
      }

      // B3: Fallback to Slip & Receipt Parser if not already run in B1
      if (!isMultiLineOrSlip) {
        const slipResult = parseSlipText(trimmedText, wallets, categories);
        if (slipResult && slipResult.amount && slipResult.amount > 0) {
          return {
            action: "transaction",
            autoSave: isAutoRequested,
            matchedCategoryName: slipResult.categoryName || undefined,
            matchedWalletName: slipResult.sourceWalletName || undefined,
            matchedToWalletName: slipResult.destinationWalletName || undefined,
            prefilledValues: {
              amount: slipResult.amount,
              type: slipResult.type,
              note: directNote || "",
              category_id: slipResult.type === "transfer" ? undefined : (slipResult.categoryId || undefined),
              categoryId: slipResult.type === "transfer" ? undefined : (slipResult.categoryId || undefined),
              wallet_id: slipResult.sourceWalletId || undefined,
              walletId: slipResult.sourceWalletId || undefined,
              to_wallet_id: slipResult.destinationWalletId || undefined,
              toWalletId: slipResult.destinationWalletId || undefined,
              date: slipResult.date || new Date(),
              time: slipResult.time || undefined,
            },
          };
        }
      }

      // B4: Try Natural Language Transaction parser (e.g., "Kopi tuku 25rb pakai gopay")
      const nlpResult = parseNaturalTransaction(trimmedText, categories, wallets);
      if (nlpResult && nlpResult.amount && nlpResult.amount > 0) {
        const matchedCat = categories.find((c) => c.id === nlpResult.categoryId) || categories[0];
        const matchedWal = wallets.find((w) => w.id === nlpResult.walletId) || wallets[0];
        return {
          action: "transaction",
          autoSave: isAutoRequested,
          matchedCategoryName: matchedCat?.name,
          matchedWalletName: matchedWal?.name,
          prefilledValues: {
            amount: nlpResult.amount,
            type: nlpResult.type || "expense",
            note: directNote || nlpResult.note || trimmedText.slice(0, 40),
            category_id: nlpResult.categoryId || matchedCat?.id,
            categoryId: nlpResult.categoryId || matchedCat?.id,
            wallet_id: nlpResult.walletId || matchedWal?.id,
            walletId: nlpResult.walletId || matchedWal?.id,
            date: new Date(),
          },
        };
      }

      // B5: Fallback if amount couldn't be extracted, open with note
      return {
        action: "transaction",
        autoSave: false,
        prefilledValues: {
          note: directNote || trimmedText.slice(0, 60),
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
