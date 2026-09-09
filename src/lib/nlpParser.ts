import { subDays } from "date-fns";
import type { Category, Wallet, TransactionType } from "./types";
import { formatRupiah } from "./utils";

export interface ParsedTransactionResult {
  amount: number | null;
  amountFormatted: string | null;
  type: TransactionType;
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji?: string;
  walletId: string | null;
  walletName: string | null;
  toWalletId: string | null;
  toWalletName: string | null;
  date: Date;
  dateLabel: string;
  note: string;
  rawInput: string;
  confidence: number;
  matchedTokens: {
    amountToken?: string;
    categoryToken?: string;
    walletToken?: string;
    toWalletToken?: string;
    dateToken?: string;
  };
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  kopi: ["kopi", "coffee", "cafe", "starbucks", "kopsus", "americano", "latte", "espresso"],
  makanan: [
    "makan",
    "makanan",
    "sarapan",
    "lunch",
    "dinner",
    "nasi",
    "padang",
    "bakso",
    "mie",
    "ayam",
    "gofood",
    "grabfood",
    "shopeefood",
    "restoran",
    "warung",
    "snack",
    "jajan",
  ],
  transportasi: [
    "transport",
    "transportasi",
    "bensin",
    "pertalite",
    "pertamax",
    "solar",
    "shell",
    "bbm",
    "tol",
    "parkir",
    "gojek",
    "grab",
    "ojol",
    "kereta",
    "mrt",
    "krl",
    "busway",
    "taxi",
  ],
  hunian: [
    "hunian",
    "kost",
    "kos",
    "kontrakan",
    "sewa",
    "listrik",
    "pln",
    "air",
    "pdam",
    "wifi",
    "indihome",
    "biznet",
    "ipl",
    "apartemen",
  ],
  hiburan: [
    "hiburan",
    "nonton",
    "bioskop",
    "xxi",
    "cgv",
    "netflix",
    "spotify",
    "youtube",
    "disney",
    "game",
    "steam",
    "playstation",
    "liburan",
    "karaoke",
  ],
  kesehatan: ["kesehatan", "obat", "dokter", "apotek", "klinik", "rs", "rumah sakit", "vitamin"],
  fashion: ["fashion", "baju", "sepatu", "celana", "kaos", "zara", "uniqlo", "h&m", "pakaian"],
  belanja: ["belanja", "groceries", "supermarket", "indomaret", "alfamart", "shopee", "tokopedia"],
  gaji: ["gaji", "salary", "payroll", "upah"],
  bonus: ["bonus", "thr", "insentif", "komisi", "tips"],
};

export function parseNaturalTransaction(
  input: string,
  categories: Category[] = [],
  wallets: Wallet[] = [],
  referenceDate = new Date(),
): ParsedTransactionResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      amount: null,
      amountFormatted: null,
      type: "expense",
      categoryId: null,
      categoryName: null,
      walletId: null,
      walletName: null,
      toWalletId: null,
      toWalletName: null,
      date: referenceDate,
      dateLabel: "Today",
      note: "",
      rawInput: input,
      confidence: 0,
      matchedTokens: {},
    };
  }

  let text = trimmed.toLowerCase();
  const matchedTokens: ParsedTransactionResult["matchedTokens"] = {};
  let confidence = 0;

  // 1. Transaction Type & Transfer Route Detection
  let detectedType: TransactionType = "expense";
  let fromWalletId: string | null = null;
  let fromWalletName: string | null = null;
  let toWalletId: string | null = null;
  let toWalletName: string | null = null;

  // Check transfer keyword first
  if (/\b(transfer|pindah|kirim|tf)\b/i.test(text)) {
    detectedType = "transfer";
    confidence += 0.3;
    text = text.replace(/\b(transfer|pindah|kirim|tf)\b/i, " ");

    // Check "dari X ke Y" or "X ke Y"
    const routeMatch = text.match(/(?:dari\s+)?(\w+)\s+ke\s+(\w+)/i);
    if (routeMatch) {
      const fromStr = routeMatch[1].toLowerCase();
      const toStr = routeMatch[2].toLowerCase();

      const matchedFrom = wallets.find((w) => w.name.toLowerCase().includes(fromStr));
      const matchedTo = wallets.find((w) => w.name.toLowerCase().includes(toStr));

      if (matchedFrom) {
        fromWalletId = matchedFrom.id;
        fromWalletName = matchedFrom.name;
        matchedTokens.walletToken = matchedFrom.name;
      }
      if (matchedTo) {
        toWalletId = matchedTo.id;
        toWalletName = matchedTo.name;
        matchedTokens.toWalletToken = matchedTo.name;
      }

      text = text.replace(routeMatch[0], " ").trim();
    }
  } else if (/\b(gaji|salary|income|bonus|komisi|terima|cair|dividen|hadiah)\b/i.test(text)) {
    detectedType = "income";
    confidence += 0.2;
  }

  // 2. Amount Extraction
  let detectedAmount: number | null = null;
  let amountStr = "";

  // Millions pattern: "1.5jt", "15juta", "15jt", "1.5m", "10mio"
  const millionsMatch = text.match(/(?:rp\.?|idr)?\s*(\d+(?:[.,]\d+)?)\s*(?:jt|juta|mio|m)\b/i);
  if (millionsMatch) {
    const rawVal = parseFloat(millionsMatch[1].replace(",", "."));
    if (!isNaN(rawVal)) {
      detectedAmount = Math.round(rawVal * 1000000);
      amountStr = millionsMatch[0];
      matchedTokens.amountToken = amountStr.trim();
      confidence += 0.35;
      text = text.replace(millionsMatch[0], " ");
    }
  }

  // Thousands pattern: "35rb", "45k", "150ribu"
  if (detectedAmount === null) {
    const thousandsMatch = text.match(/(?:rp\.?|idr)?\s*(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b/i);
    if (thousandsMatch) {
      const rawVal = parseFloat(thousandsMatch[1].replace(",", "."));
      if (!isNaN(rawVal)) {
        detectedAmount = Math.round(rawVal * 1000);
        amountStr = thousandsMatch[0];
        matchedTokens.amountToken = amountStr.trim();
        confidence += 0.35;
        text = text.replace(thousandsMatch[0], " ");
      }
    }
  }

  // Indonesian dotted numbers: "Rp 35.000", "50.000"
  if (detectedAmount === null) {
    const dottedMatch = text.match(/(?:rp\.?|idr)?\s*(\d{1,3}(?:\.\d{3})+)\b/i);
    if (dottedMatch) {
      const cleanDigits = dottedMatch[1].replace(/\./g, "");
      detectedAmount = Number(cleanDigits) || null;
      if (detectedAmount !== null) {
        amountStr = dottedMatch[0];
        matchedTokens.amountToken = amountStr.trim();
        confidence += 0.35;
        text = text.replace(dottedMatch[0], " ");
      }
    }
  }

  // Plain integers (>= 100)
  if (detectedAmount === null) {
    const rawNumMatch = text.match(/(?:rp\.?|idr)?\s*(\d{3,})\b/i);
    if (rawNumMatch) {
      const val = parseInt(rawNumMatch[1], 10);
      if (!isNaN(val) && val >= 100) {
        detectedAmount = val;
        amountStr = rawNumMatch[0];
        matchedTokens.amountToken = amountStr.trim();
        confidence += 0.3;
        text = text.replace(rawNumMatch[0], " ");
      }
    }
  }

  // 3. Relative Date Extraction
  let detectedDate: Date = referenceDate;
  let dateLabel = "Today";

  if (/\b(kemarin|yesterday)\b/i.test(text)) {
    detectedDate = subDays(referenceDate, 1);
    dateLabel = "Yesterday";
    matchedTokens.dateToken = "Yesterday";
    confidence += 0.15;
    text = text.replace(/\b(kemarin|yesterday)\b/i, " ");
  } else if (/\b(\d+)\s*(?:hari|days?)\s*(?:lalu|ago)\b/i.test(text)) {
    const daysAgoMatch = text.match(/\b(\d+)\s*(?:hari|days?)\s*(?:lalu|ago)\b/i);
    if (daysAgoMatch) {
      const numDays = parseInt(daysAgoMatch[1], 10);
      detectedDate = subDays(referenceDate, numDays);
      dateLabel = `${numDays}d ago`;
      matchedTokens.dateToken = dateLabel;
      confidence += 0.15;
      text = text.replace(daysAgoMatch[0], " ");
    }
  } else if (/\b(hari ini|today)\b/i.test(text)) {
    detectedDate = referenceDate;
    dateLabel = "Today";
    matchedTokens.dateToken = "Today";
    text = text.replace(/\b(hari ini|today)\b/i, " ");
  }

  // 4. Wallet Matching (if not transfer or if fromWallet not resolved yet)
  if (detectedType !== "transfer" || !fromWalletId) {
    // Sort wallets by length descending so "kartu kredit" matches before "kartu"
    const sortedWallets = [...wallets].sort((a, b) => b.name.length - a.name.length);
    for (const w of sortedWallets) {
      const wName = w.name.toLowerCase();
      // Match exact word boundary
      const wRegex = new RegExp(`\\b${wName}\\b`, "i");
      if (wRegex.test(text)) {
        fromWalletId = w.id;
        fromWalletName = w.name;
        matchedTokens.walletToken = w.name;
        confidence += 0.2;
        text = text.replace(wRegex, " ");
        break;
      }
    }

    // Check alias "tunai" -> matches "cash" or "tunai"
    if (!fromWalletId && /\btunai\b/i.test(text)) {
      const cashWallet = wallets.find((w) => {
        const n = w.name.toLowerCase();
        return n.includes("cash") || n.includes("tunai");
      });
      if (cashWallet) {
        fromWalletId = cashWallet.id;
        fromWalletName = cashWallet.name;
        matchedTokens.walletToken = cashWallet.name;
        confidence += 0.2;
        text = text.replace(/\btunai\b/i, " ");
      }
    }
  }

  // 5. Category Matching
  let detectedCategoryId: string | null = null;
  let detectedCategoryName: string | null = null;
  let detectedCategoryEmoji: string | undefined;

  // Filter categories by detected transaction type
  const targetCategories = categories.filter(
    (c) => c.type === detectedType || detectedType === "transfer",
  );

  // A. Direct match against category names
  for (const cat of targetCategories) {
    const cName = cat.name.toLowerCase();
    const cRegex = new RegExp(`\\b${cName}\\b`, "i");
    if (cRegex.test(text)) {
      detectedCategoryId = cat.id;
      detectedCategoryName = cat.name;
      detectedCategoryEmoji = cat.emoji;
      matchedTokens.categoryToken = cat.name;
      confidence += 0.25;
      text = text.replace(cRegex, " ");
      break;
    }
  }

  // B. Alias matching (if no direct category name match)
  if (!detectedCategoryId) {
    for (const [canonKey, aliasList] of Object.entries(CATEGORY_ALIASES)) {
      const foundAlias = aliasList.find((alias) =>
        new RegExp(`\\b${alias}\\b`, "i").test(text),
      );
      if (foundAlias) {
        // Find best matching category in user's categories
        const matchedCategory =
          targetCategories.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n === canonKey ||
              n.includes(canonKey) ||
              aliasList.some((a) => n.includes(a))
            );
          }) ||
          categories.find((c) => {
            const n = c.name.toLowerCase();
            return n === canonKey || n.includes(canonKey);
          });

        if (matchedCategory) {
          detectedCategoryId = matchedCategory.id;
          detectedCategoryName = matchedCategory.name;
          detectedCategoryEmoji = matchedCategory.emoji;
          matchedTokens.categoryToken = matchedCategory.name;
          confidence += 0.25;
          text = text.replace(new RegExp(`\\b${foundAlias}\\b`, "i"), " ");
          break;
        }
      }
    }
  }

  // 6. Clean Note / Residual Text
  // Remove filler words like "dari", "ke", "di", "beli", "bayar", "untuk"
  let cleanNote = text
    .replace(/\b(dari|ke|di|beli|bayar|untuk|buat|at|in|for|pada)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If cleanNote is empty, default to category name or raw title
  if (!cleanNote && detectedCategoryName) {
    cleanNote = detectedCategoryName;
  } else if (cleanNote) {
    // Capitalize first letter
    cleanNote = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);
  }

  return {
    amount: detectedAmount,
    amountFormatted: detectedAmount !== null ? formatRupiah(detectedAmount) : null,
    type: detectedType,
    categoryId: detectedCategoryId,
    categoryName: detectedCategoryName,
    categoryEmoji: detectedCategoryEmoji,
    walletId: fromWalletId,
    walletName: fromWalletName,
    toWalletId,
    toWalletName,
    date: detectedDate,
    dateLabel,
    note: cleanNote,
    rawInput: input,
    confidence: Math.min(1, Math.round(confidence * 100) / 100),
    matchedTokens,
  };
}
