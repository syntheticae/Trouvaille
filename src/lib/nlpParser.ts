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
  kopi: [
    "kopi",
    "coffee",
    "cafe",
    "kafe",
    "starbucks",
    "kopsus",
    "americano",
    "latte",
    "espresso",
    "cappuccino",
    "janji jiwa",
    "kenangan",
    "tuku",
    "point coffee",
    "fore",
    "tomoro",
    "anomali",
    "flash coffee",
  ],
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
    "resto",
    "warung",
    "snack",
    "jajan",
    "gorengan",
    "sate",
    "pecel",
    "geprek",
    "seblak",
    "martabak",
    "roti",
    "siomay",
    "batagor",
    "indomie",
    "mcd",
    "mcdonalds",
    "kfc",
    "hokben",
    "burger",
    "pizza",
    "soto",
    "rendang",
    "rawon",
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
    "goride",
    "gocar",
    "grabride",
    "grabcar",
    "maxim",
    "ojol",
    "kereta",
    "mrt",
    "krl",
    "lrt",
    "busway",
    "transjakarta",
    "taxi",
    "taksi",
    "angkot",
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
    "myrepublic",
    "firstmedia",
    "ipl",
    "apartemen",
    "gas",
    "lpg",
  ],
  hiburan: [
    "hiburan",
    "nonton",
    "bioskop",
    "xxi",
    "cgv",
    "cinepolis",
    "netflix",
    "spotify",
    "youtube",
    "disney",
    "game",
    "steam",
    "playstation",
    "topup game",
    "diamond",
    "mlbb",
    "genshin",
    "valorant",
    "liburan",
    "karaoke",
    "tiket",
  ],
  kesehatan: [
    "kesehatan",
    "obat",
    "dokter",
    "apotek",
    "klinik",
    "rs",
    "rumah sakit",
    "vitamin",
    "halodoc",
    "alodokter",
    "optik",
    "kacamata",
  ],
  fashion: [
    "fashion",
    "baju",
    "sepatu",
    "celana",
    "kaos",
    "zara",
    "uniqlo",
    "h&m",
    "pakaian",
    "tas",
    "jaket",
    "hoodie",
    "skincare",
  ],
  belanja: [
    "belanja",
    "groceries",
    "supermarket",
    "indomaret",
    "alfamart",
    "alfamidi",
    "superindo",
    "hypermart",
    "shopee",
    "tokopedia",
    "tiktok shop",
    "lazada",
    "sayur",
    "pasar",
    "buah",
  ],
  tagihan: [
    "tagihan",
    "pulsa",
    "kuota",
    "paket data",
    "telkomsel",
    "byu",
    "indosat",
    "xl",
    "tri",
    "smartfren",
    "bpjs",
    "asuransi",
    "pajak",
  ],
  pendidikan: [
    "pendidikan",
    "kursus",
    "buku",
    "kuliah",
    "spp",
    "sekolah",
    "udemy",
    "les",
  ],
  amal: [
    "zakat",
    "infaq",
    "sedekah",
    "donasi",
    "amal",
    "masjid",
    "gereja",
    "kitabisa",
  ],
  gaji: ["gaji", "salary", "payroll", "upah"],
  bonus: [
    "bonus",
    "thr",
    "insentif",
    "komisi",
    "tips",
    "cashback",
    "dividen",
    "bunga",
    "hadiah",
  ],
};

function parseWordMultiplier(word?: string): number {
  if (!word) return 1;
  const clean = word.trim().toLowerCase();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  switch (clean) {
    case "se":
    case "satu":
    case "1":
      return 1;
    case "dua":
    case "2":
      return 2;
    case "tiga":
    case "3":
      return 3;
    case "empat":
    case "4":
      return 4;
    case "lima":
    case "5":
      return 5;
    default:
      return 1;
  }
}

const INDONESIAN_SLANG_AMOUNTS: Array<{
  pattern: RegExp;
  baseValue: number;
  tokenName: string;
}> = [
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(setengah\s+juta|setengah\s+jt)\b/i,
    baseValue: 500000,
    tokenName: "setengah juta",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(gopek\s+ceng|gopek\s+ribu)\b/i,
    baseValue: 500000,
    tokenName: "gopek ceng",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(cepek\s+ceng|cepek\s+ribu)\b/i,
    baseValue: 100000,
    tokenName: "cepek ceng",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(pego\s+ceng|pego\s+ribu)\b/i,
    baseValue: 150000,
    tokenName: "pego ceng",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(sejutaan|sejuta|satu\s+juta)\b/i,
    baseValue: 1000000,
    tokenName: "sejuta",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(gocap(?:an)?)\b/i,
    baseValue: 50000,
    tokenName: "gocap",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(nocap)\b/i,
    baseValue: 20000,
    tokenName: "nocap",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(ceban(?:an)?|seceban)\b/i,
    baseValue: 10000,
    tokenName: "ceban",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(goceng(?:an)?)\b/i,
    baseValue: 5000,
    tokenName: "goceng",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(noceng)\b/i,
    baseValue: 2000,
    tokenName: "noceng",
  },
  {
    pattern: /\b(?:(\d+|se|satu|dua|tiga|empat|lima)\s+)?(seceng(?:an)?)\b/i,
    baseValue: 1000,
    tokenName: "seceng",
  },
  {
    pattern: /\b(cepek)\b/i,
    baseValue: 100000,
    tokenName: "cepek",
  },
];

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

  // 0. Pre-clean STT artifacts: trailing periods on numbers, phonetic cash, and STT mishearings
  text = text.replace(/(\d{1,3}(?:\.\d{3})+)\./g, "$1");
  text = text.replace(/\bbahkan\b/gi, "makan");

  const hasCashWallet = wallets.some((w) => {
    const n = w.name.toLowerCase();
    return n.includes("cash") || n.includes("tunai");
  });

  if (hasCashWallet) {
    text = text
      .replace(/\b(?:pake|pakai|lewat|dari|di|bayar)\s+(?:gas|kes|ces|kas|kesh)\b/gi, " cash ")
      .replace(/(?<=\d[\d.,]*\s*(?:[.,]\s*)?)(gas|kes|ces|kas|kesh)\b/gi, " cash ")
      .replace(/[.\s]+(gas|kes|ces|kas|kesh)$/gi, " cash");
  }

  // 1. Transaction Type & Transfer Route Detection
  let detectedType: TransactionType = "expense";
  let fromWalletId: string | null = null;
  let fromWalletName: string | null = null;
  let toWalletId: string | null = null;
  let toWalletName: string | null = null;

  // Check transfer or e-wallet top-up keywords
  const isTransferKeyword = /\b(transfer|pindah|kirim|tf)\b/i.test(text);
  const isTopUpKeyword = /\b(top\s*up|topup|isi\s*saldo|isi)\b/i.test(text);

  if (isTransferKeyword || isTopUpKeyword) {
    detectedType = "transfer";
    confidence += 0.3;

    // Pattern A: "top up gopay 100k dari bca" or "topup dana pake bca"
    const topUpRouteMatch = text.match(
      /(?:top\s*up|topup|isi\s*(?:saldo)?)\s+(\w+)(?:.*?)(?:dari|pake|pakai|lewat)\s+(\w+)/i,
    );

    // Pattern B: "dari X ke Y" or "X ke Y"
    const standardRouteMatch = text.match(/(?:dari\s+)?(\w+)\s+ke\s+(\w+)/i);

    if (topUpRouteMatch) {
      const targetStr = topUpRouteMatch[1].toLowerCase();
      const sourceStr = topUpRouteMatch[2].toLowerCase();

      const matchedFrom = wallets.find((w) =>
        w.name.toLowerCase().includes(sourceStr),
      );
      const matchedTo = wallets.find((w) =>
        w.name.toLowerCase().includes(targetStr),
      );

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
    } else if (standardRouteMatch) {
      const fromStr = standardRouteMatch[1].toLowerCase();
      const toStr = standardRouteMatch[2].toLowerCase();

      const matchedFrom = wallets.find((w) =>
        w.name.toLowerCase().includes(fromStr),
      );
      const matchedTo = wallets.find((w) =>
        w.name.toLowerCase().includes(toStr),
      );

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

      text = text.replace(standardRouteMatch[0], " ").trim();
    }

    text = text
      .replace(/\b(transfer|pindah|kirim|tf|top\s*up|topup|isi\s*saldo|isi)\b/gi, " ")
      .trim();
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

  // Slang numbers: "gocap", "ceban", "2 goceng", "setengah juta", "cepek ceng", etc.
  if (detectedAmount === null) {
    for (const slang of INDONESIAN_SLANG_AMOUNTS) {
      const slangMatch = text.match(slang.pattern);
      if (slangMatch) {
        const mult = parseWordMultiplier(slangMatch[1]);
        detectedAmount = mult * slang.baseValue;
        amountStr = slangMatch[0];
        matchedTokens.amountToken = amountStr.trim();
        confidence += 0.35;
        text = text.replace(slangMatch[0], " ");
        break;
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

    // Check alias "tunai" or phonetic cash "gas"/"kes" -> matches "cash" or "tunai"
    if (!fromWalletId && /\b(tunai|cash|gas|kes|ces|kas|kesh|kontan)\b/i.test(text)) {
      const cashWallet = wallets.find((w) => {
        const n = w.name.toLowerCase();
        return n.includes("cash") || n.includes("tunai");
      });
      if (cashWallet) {
        fromWalletId = cashWallet.id;
        fromWalletName = cashWallet.name;
        matchedTokens.walletToken = cashWallet.name;
        confidence += 0.2;
        text = text.replace(/\b(tunai|cash|gas|kes|ces|kas|kesh|kontan)\b/i, " ");
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
  // Remove filler words and strip stray periods/commas left over by speech recognition
  let cleanNote = text
    .replace(/\b(dari|ke|di|beli|bayar|untuk|buat|at|in|for|pada)\b/gi, " ")
    .replace(/[.,;:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If cleanNote is empty or just punctuation, default to category name or raw title
  if ((!cleanNote || /^[.\s,;:-]+$/.test(cleanNote)) && detectedCategoryName) {
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

const AMOUNT_DETECTION_REGEX =
  /(?:\d+(?:[.,]\d+)?\s*(?:jt|juta|mio|m|rb|ribu|k)\b|\d{1,3}(?:\.\d{3})+|\b\d{3,}\b|\b(?:gocap|nocap|ceban|goceng|seceng|cepek|seceban|pego|gopek|setengah\s+juta|sejutaan|sejuta)\b)/i;

export function splitSegmentByAmounts(
  segment: string,
  wallets: Wallet[] = [],
): string[] {
  const amountRegex = new RegExp(AMOUNT_DETECTION_REGEX.source, "gi");
  const matches: Array<{ match: string; index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = amountRegex.exec(segment)) !== null) {
    matches.push({ match: m[0], index: m.index, length: m[0].length });
  }

  if (matches.length <= 1) {
    return [segment];
  }

  const walletKeywords = new Set([
    "cash",
    "tunai",
    "gas",
    "kes",
    "ces",
    "kas",
    "kesh",
    "kontan",
    "bca",
    "mandiri",
    "bri",
    "bni",
    "jago",
    "gopay",
    "ovo",
    "dana",
    "shopeepay",
    "seabank",
    "jenius",
    "kartu",
    "kredit",
    "debit",
    "pake",
    "pakai",
    "lewat",
    "dari",
    "ke",
  ]);

  for (const w of wallets) {
    w.name
      .toLowerCase()
      .split(/\s+/)
      .forEach((part) => {
        if (part.length > 1) walletKeywords.add(part);
      });
  }

  const dateKeywords = new Set([
    "kemarin",
    "semalam",
    "tadi",
    "siang",
    "pagi",
    "sore",
    "malam",
    "hari",
    "ini",
  ]);

  const clauses: string[] = [];
  let currentStart = 0;

  for (let i = 0; i < matches.length - 1; i++) {
    const currMatch = matches[i];
    const nextMatch = matches[i + 1];

    const afterCurrAmount = currMatch.index + currMatch.length;
    const beforeNextAmount = nextMatch.index;
    const interText = segment.slice(afterCurrAmount, beforeNextAmount);

    const wordRegex = /\S+/g;
    const words: Array<{ word: string; start: number; end: number }> = [];
    let wm: RegExpExecArray | null;
    while ((wm = wordRegex.exec(interText)) !== null) {
      words.push({
        word: wm[0],
        start: wm.index,
        end: wm.index + wm[0].length,
      });
    }

    let splitOffset = 0;
    let foundBoundary = false;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const w = words[wIdx];
      const cleanWord = w.word.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (walletKeywords.has(cleanWord) || dateKeywords.has(cleanWord)) {
        splitOffset = w.end;
      } else {
        splitOffset = w.start;
        foundBoundary = true;
        break;
      }
    }

    if (!foundBoundary && words.length > 0) {
      splitOffset = words[words.length - 1].end;
    }

    const cutIndex = afterCurrAmount + splitOffset;
    let rawClause = segment.slice(currentStart, cutIndex).trim();
    rawClause = rawClause
      .replace(/^(?:dan|sama|juga|serta|plus|lalu|terus)\s+/i, "")
      .replace(/[\s,.;]+$/, "")
      .trim();
    if (rawClause) {
      clauses.push(rawClause);
    }
    currentStart = cutIndex;
  }

  let finalClause = segment.slice(currentStart).trim();
  finalClause = finalClause
    .replace(/^(?:dan|sama|juga|serta|plus|lalu|terus)\s+/i, "")
    .replace(/[\s,.;]+$/, "")
    .trim();
  if (finalClause) {
    clauses.push(finalClause);
  }

  return clauses.length > 0 ? clauses : [segment];
}

export function splitIntoClauses(
  input: string,
  wallets: Wallet[] = [],
): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // 1. Normalize sequential conjunctions & line breaks into delimiter " ||| "
  const normalized = trimmed
    .replace(/[\n;]+/g, " ||| ")
    .replace(/\b(?:habis\s+itu|setelah\s+itu)\b/gi, " ||| ")
    .replace(/\b(?:terus|lalu|kemudian|sekalian)\b/gi, " ||| ");

  const rawSegments = normalized
    .split("|||")
    .map((s) => s.trim())
    .filter(Boolean);

  const finalClauses: string[] = [];
  for (const seg of rawSegments) {
    const subClauses = splitSegmentByAmounts(seg, wallets);
    finalClauses.push(...subClauses);
  }

  return finalClauses.filter((c) => c.trim().length > 0);
}

export function parseMultiNaturalTransactions(
  input: string,
  categories: Category[] = [],
  wallets: Wallet[] = [],
  referenceDate = new Date(),
): ParsedTransactionResult[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [parseNaturalTransaction("", categories, wallets, referenceDate)];
  }

  const clauses = splitIntoClauses(trimmed, wallets);
  if (clauses.length <= 1) {
    return [parseNaturalTransaction(trimmed, categories, wallets, referenceDate)];
  }

  // Parse each clause individually
  const parsedItems = clauses.map((clause) =>
    parseNaturalTransaction(clause, categories, wallets, referenceDate),
  );

  // Filter items that successfully resolved an amount
  const validItems = parsedItems.filter(
    (item) => item.amount !== null && item.amount > 0,
  );

  // If fewer than 2 valid items were detected, fallback to single parse of full input
  if (validItems.length < 2) {
    return [parseNaturalTransaction(trimmed, categories, wallets, referenceDate)];
  }

  // Context Inheritance across detected transactions:
  // 1. Date inheritance: if one clause specified a date (e.g. "yesterday"), propagate to others without explicit date
  const explicitDateItem = validItems.find(
    (it) => it.matchedTokens.dateToken && it.dateLabel !== "Today",
  );
  if (explicitDateItem) {
    for (const it of validItems) {
      if (!it.matchedTokens.dateToken || it.dateLabel === "Today") {
        it.date = explicitDateItem.date;
        it.dateLabel = explicitDateItem.dateLabel;
        it.matchedTokens.dateToken = explicitDateItem.matchedTokens.dateToken;
      }
    }
  }

  // 2. Wallet inheritance: if only one specific wallet was mentioned across the input,
  // or all mentioned wallets are identical, propagate to other clauses that didn't mention a wallet
  const itemsWithWallet = validItems.filter((it) => it.walletId !== null);
  if (itemsWithWallet.length > 0) {
    const uniqueWalletIds = Array.from(
      new Set(itemsWithWallet.map((it) => it.walletId)),
    );
    if (uniqueWalletIds.length === 1) {
      const primaryWallet = itemsWithWallet[0];
      for (const it of validItems) {
        if (!it.walletId) {
          it.walletId = primaryWallet.walletId;
          it.walletName = primaryWallet.walletName;
          it.matchedTokens.walletToken = primaryWallet.matchedTokens.walletToken;
          it.confidence = Math.min(1, it.confidence + 0.15);
        }
      }
    }
  }

  return validItems;
}

