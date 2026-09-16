// ======================================================================
// TROUVAILLE INDONESIAN FINANCIAL SLIP & RECEIPT PARSER
// Deterministic, offline heuristic parser for M-Banking, E-Wallets, QRIS & Struk Kasir
// ======================================================================

import { format } from "date-fns";
import type { Category, Wallet, TransactionType } from "./types";
import { formatRupiah } from "./utils";

export interface ParsedSlipResult {
  amount: number | null;
  amountFormatted: string | null;
  type: TransactionType;
  date: Date;
  dateFormatted: string;
  merchantOrRecipient: string;
  sourceWalletId: string | null;
  sourceWalletName: string | null;
  destinationWalletId: string | null;
  destinationWalletName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  detectedSlipType: "m_banking" | "ewallet" | "qris" | "receipt" | "general";
  detectedInstitution?: string;
  detectedCategory?: string;
  rawText: string;
  extractedLines: string[];
}

export interface CategorySynonymGroup {
  targetKeys: string[];
  keywords: string[];
}

export const CATEGORY_SYNONYMS: Record<string, CategorySynonymGroup> = {
  groceries: {
    targetKeys: ["groceries", "belanja", "minimarket", "supermarket", "sembako", "papan"],
    keywords: [
      "indomaret", "alfamart", "alfamidi", "superindo", "hypermart", "transmart",
      "grand lucky", "hero", "farmers", "lotte", "tokopedia", "shopee", "tiktok shop",
      "blibli", "lazada", "indomarco", "klikindomaret", "poinku", "gula", "mie", "minyak", "beras"
    ],
  },
  kopi: {
    targetKeys: ["kopi", "coffee", "cafe", "kafe", "minuman", "makanan", "pangan"],
    keywords: [
      "kopi", "coffee", "cafe", "kafe", "starbucks", "kenangan", "janji jiwa",
      "fore", "tomoro", "kulo", "point coffee", "kopsus", "latte", "espresso",
      "americano", "cappuccino", "brize", "dominance", "nogi", "kopikenangan"
    ],
  },
  makanan: {
    targetKeys: ["makanan", "food", "kuliner", "resto", "restoran", "cafe", "kafe", "pangan"],
    keywords: [
      "resto", "restoran", "makan", "bakso", "mie", "ayam", "bebek", "padang",
      "sederhana", "mcdonald", "mcd", "kfc", "hokben", "pizza", "burger", "d cost",
      "warung", "gofood", "grabfood", "shopeefood", "dapur", "baker", "roti",
      "sushi", "ramen", "solaria", "marugame", "steak", "soto", "sate",
      "chick", "wings", "tahu walik", "french fries", "odeng", "chikuwa"
    ],
  },
  minuman: {
    targetKeys: ["minuman", "beverage", "drink", "cafe", "kafe", "pangan"],
    keywords: [
      "tea", "teh", "juice", "jus", "boba", "chatime", "haus", "pure life", "aqua", "lemon tea", "ice tea"
    ],
  },
  transportasi: {
    targetKeys: ["transportasi", "bensin", "kendaraan", "transport"],
    keywords: [
      "pertamina", "spbu", "shell", "bp akr", "bensin", "pertamax", "pertalite",
      "solar", "parkir", "parking", "tol", "jasamarga", "gojek", "grab", "maxim",
      "bluebird", "kereta", "krl", "mrt", "lrt", "kai", "tiket.com", "traveloka"
    ],
  },
  hunian: {
    targetKeys: ["hunian", "papan", "tagihan", "utilitas", "internet"],
    keywords: [
      "pln", "listrik", "pdam", "air", "ipl", "indihome", "biznet", "myrepublic",
      "first media", "wifi", "kost", "kos", "kontrakan", "sewa"
    ],
  },
  hiburan: {
    targetKeys: ["hiburan", "entertainment", "rekreasi"],
    keywords: [
      "cinema", "xxi", "cgv", "cinepolis", "bioskop", "nonton", "netflix", "spotify",
      "youtube", "disney", "steam", "playstation", "nintendo", "game", "karaoke"
    ],
  },
  kesehatan: {
    targetKeys: ["kesehatan", "obat", "medical"],
    keywords: [
      "apotek", "apotik", "kimia farma", "k-24", "century", "halodoc", "alodokter",
      "klinik", "rumah sakit", "rs ", "lab", "pramita", "prodia", "optik", "dokter"
    ],
  },
};

export const BANK_ALIASES: Record<string, string[]> = {
  bca: ["bca", "klikbca", "m-bca", "mybca", "m-transfer", "bank central asia"],
  superbank: ["superbank", "super bank"],
  bni: ["bni", "wondr", "bank negara indonesia"],
  tapcash: ["tapcash", "bni tapcash"],
  mandiri: ["mandiri", "livin", "bank mandiri"],
  bri: ["bri", "brimo", "bank rakyat indonesia"],
  btn: ["btn", "bank tabungan negara"],
  cimb: ["cimb", "octo", "niaga"],
  jago: ["jago", "bank jago"],
  seabank: ["seabank", "sea bank"],
  blu: ["blu", "blubybcadigital"],
  jenius: ["jenius", "btpn"],
  permata: ["permata", "permatanet"],
  bsi: ["bsi", "bank syariah indonesia"],
  krom: ["krom", "bank krom"],
  gopay: ["gopay", "gojek"],
  ovo: ["ovo"],
  dana: ["dana"],
  shopeepay: ["shopeepay", "spay"],
  linkaja: ["linkaja"],
  cash: ["cash", "tunai"],
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesWord(text: string, word: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(word)}(?:[^a-z0-9]|$)`, "i").test(text);
}

/**
 * Normalizes Indonesian currency string (e.g. "Rp 150.000", "150.000,00", "150000", "49,000") to integer number.
 */
export function cleanCurrency(val: string): number {
  if (!val) return 0;

  // Remove currency symbol (Rp, IDR) and whitespace
  let clean = val.replace(/(?:rp\.?|idr)/gi, "").trim();

  // If format has ,00 decimal at the end (e.g. Rp39.075,00 or 44.075,00) -> remove ,00
  if (clean.includes(",") && clean.indexOf(",") === clean.length - 3) {
    clean = clean.slice(0, -3);
  } else if (clean.includes(".") && clean.indexOf(".") === clean.length - 3 && clean.length > 6) {
    // Rare .00 decimal e.g. 39075.00
    clean = clean.slice(0, -3);
  }

  // Remove dots, commas and whitespace
  clean = clean.replace(/[.,\s]/g, "");

  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses raw text extracted from a receipt / transfer slip.
 */
export function parseSlipText(
  rawText: string,
  userWallets: Wallet[] = [],
  userCategories: Category[] = [],
): ParsedSlipResult {
  if (!rawText || !rawText.trim()) {
    return {
      amount: null,
      amountFormatted: null,
      type: "expense",
      date: new Date(),
      dateFormatted: format(new Date(), "yyyy-MM-dd"),
      merchantOrRecipient: "",
      sourceWalletId: userWallets[0]?.id || null,
      sourceWalletName: userWallets[0]?.name || null,
      destinationWalletId: null,
      destinationWalletName: null,
      categoryId: userCategories[0]?.id || null,
      categoryName: userCategories[0]?.name || null,
      confidence: 0,
      detectedSlipType: "general",
      rawText: "",
      extractedLines: [],
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const fullTextLower = rawText.toLowerCase();

  // 1. Detect Slip Classification & Institution
  let detectedSlipType: ParsedSlipResult["detectedSlipType"] = "general";
  let detectedInstitution: string | undefined;

  if (fullTextLower.includes("qris") || fullTextLower.includes("nmid")) {
    detectedSlipType = "qris";
  } else if (
    fullTextLower.includes("gopay") ||
    fullTextLower.includes("gojek") ||
    fullTextLower.includes("shopeepay") ||
    fullTextLower.includes("ovo") ||
    (fullTextLower.includes("dana") && !fullTextLower.includes("sumber dana"))
  ) {
    detectedSlipType = "ewallet";
  } else if (
    fullTextLower.includes("transfer") ||
    fullTextLower.includes("m-transfer") ||
    fullTextLower.includes("superbank") ||
    fullTextLower.includes("livin") ||
    fullTextLower.includes("brimo") ||
    fullTextLower.includes("bca") ||
    fullTextLower.includes("mandiri") ||
    fullTextLower.includes("bni") ||
    fullTextLower.includes("wondr")
  ) {
    detectedSlipType = "m_banking";
  } else if (
    fullTextLower.includes("total") ||
    fullTextLower.includes("kasir") ||
    fullTextLower.includes("kembali") ||
    fullTextLower.includes("tunai")
  ) {
    detectedSlipType = "receipt";
  }

  // Detect institution: prioritize sender / funding lines over acquirer lines
  // Filter out lines that specify merchant's acquirer
  const nonAcquirerLines = lines.filter((l) => !/nama\s+acquirer|acquirer/i.test(l));
  const nonAcquirerText = nonAcquirerLines.join("\n").toLowerCase();

  for (const [instKey, aliases] of Object.entries(BANK_ALIASES)) {
    const matched = aliases.some((a) => {
      if (a === "dana") {
        return matchesWord(nonAcquirerText.replace(/sumber\s+dana/gi, ""), "dana");
      }
      return matchesWord(nonAcquirerText, a);
    });

    if (matched) {
      detectedInstitution = instKey.toUpperCase();
      break;
    }
  }

  // If slip explicitly says QRIS and no institution matched yet
  if (!detectedInstitution && (fullTextLower.includes("qris") || fullTextLower.includes("nmid"))) {
    detectedInstitution = "QRIS";
  }

  // 2. Extract Amount
  let detectedAmount: number | null = null;
  const candidateAmounts: { amount: number; score: number; line: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    const prevLineLower = i > 0 ? lines[i - 1].toLowerCase() : "";
    const contextLower = `${prevLineLower} ${lineLower}`.trim();

    // Skip lines with admin fees
    const isAdminFeeLine =
      contextLower.includes("admin") ||
      contextLower.includes("biaya transaksi") ||
      contextLower.includes("fee");

    // Skip card / account numbers / ref numbers (10+ digits without separator)
    if (/\b\d{10,19}\b/.test(line)) {
      continue;
    }

    // Skip phone numbers
    if (/\b08\d{8,12}\b/.test(line)) {
      continue;
    }

    // Search for currency numbers: e.g. Rp 150.000, 150.000,00, 49,000, 39.075,00
    const currencyMatches = line.match(
      /(?:rp\.?|idr)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:,[0-9]{2})?|[0-9]{4,9})/gi
    );

    if (currencyMatches) {
      for (const match of currencyMatches) {
        const amt = cleanCurrency(match);

        // Ignore small noise (< Rp 1.000) or massive unreasonable numbers (> Rp 500.000.000)
        if (amt < 1000 || amt > 500_000_000) continue;

        let score = 1;

        if (contextLower.includes("total belanja")) {
          score += 130;
        } else if (contextLower.includes("total bayar") || contextLower.includes("total pembayaran")) {
          score += 125;
        } else if (contextLower.includes("grand total") || contextLower.includes("total transaksi")) {
          score += 120;
        } else if (contextLower.includes("purchase")) {
          score += 115;
        } else if (contextLower.includes("non tunai") || contextLower.includes("nontunai")) {
          score += 110;
        } else if (contextLower.includes("transfer") && !contextLower.includes("biaya")) {
          score += 95;
        } else if (contextLower.includes("total") && !contextLower.includes("subtotal") && !contextLower.includes("sub total")) {
          score += 90;
        } else if (contextLower.includes("nominal transfer") || contextLower.includes("jumlah transfer") || contextLower.includes("jumlah")) {
          score += 75;
        } else if (contextLower.includes("nominal bayar")) {
          // Defer to Total Bayar when discounts exist
          score += 60;
        } else if (contextLower.includes("nominal") || contextLower.includes("amount")) {
          score += 50;
        } else if (lineLower.startsWith("rp") || lineLower.includes("rp.")) {
          score += 35;
        }

        // Penalty for subtotal, voucher, discount, admin fee
        if (contextLower.includes("subtotal") || contextLower.includes("sub total")) {
          score -= 30;
        }
        if (isAdminFeeLine) {
          score -= 70;
        }
        if (contextLower.includes("voucher") || contextLower.includes("diskon") || contextLower.includes("hemat") || contextLower.includes("potongan")) {
          score -= 90;
        }
        if (contextLower.includes("kembalian") || contextLower.includes("kembali") || contextLower.includes("change")) {
          score -= 60;
        }

        candidateAmounts.push({ amount: amt, score, line });
      }
    }
  }

  // Sort candidate amounts by score descending
  candidateAmounts.sort((a, b) => b.score - a.score);

  if (candidateAmounts.length > 0) {
    detectedAmount = candidateAmounts[0].amount;
  }

  // 3. Extract Date
  let detectedDate = new Date();
  const MONTHS: Record<string, number> = {
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

  const textDateMatch = rawText.match(
    /\b(\d{1,2})[\s/-]+(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec|[a-z]+)[\s/-]+(\d{2,4})\b/i
  );
  const numDateMatch = rawText.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);

  if (textDateMatch) {
    const day = parseInt(textDateMatch[1], 10);
    const monthStr = textDateMatch[2].toLowerCase();
    const month = MONTHS[monthStr] ?? -1;
    let year = parseInt(textDateMatch[3], 10);
    if (year < 100) year += 2000;

    if (month >= 0 && day >= 1 && day <= 31 && year >= 2020 && year <= 2040) {
      detectedDate = new Date(year, month, day);
    }
  } else if (numDateMatch) {
    const p1 = parseInt(numDateMatch[1], 10);
    const p2 = parseInt(numDateMatch[2], 10);
    let year = parseInt(numDateMatch[3], 10);
    if (year < 100) year += 2000;

    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12 && year >= 2020 && year <= 2040) {
      detectedDate = new Date(year, p2 - 1, p1);
    }
  }

  // 4. Extract Merchant / Note
  let merchantOrRecipient = "";

  // Check multi-line label: e.g. "Penerima" on line i, then merchant on line i+1
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i].trim();
    if (/^(?:penerima|tujuan|kepada|merchant|nama merchant|ke)$/i.test(l)) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length > 2 && !/^(?:total|nominal|rp|idr|\d+)/i.test(nextLine)) {
        merchantOrRecipient = nextLine.slice(0, 45);
        break;
      }
    }
  }

  // Check specific high-confidence merchant signatures first
  if (fullTextLower.includes("indomaret") || fullTextLower.includes("indomarco") || fullTextLower.includes("klikindomaret")) {
    // If QRIS Indomaret Tangerang ID, capture Tangerang
    const qrisIndoMatch = rawText.match(/indomaret\s+([a-z0-9\s]+?)(?:\s+id|\n|$)/i);
    if (qrisIndoMatch && qrisIndoMatch[1]) {
      merchantOrRecipient = `Indomaret ${qrisIndoMatch[1].trim()}`;
    } else {
      merchantOrRecipient = "Indomaret";
    }
  } else if (fullTextLower.includes("alfamart") || fullTextLower.includes("alfamidi")) {
    merchantOrRecipient = fullTextLower.includes("alfamidi") ? "Alfamidi" : "Alfamart";
  } else {
    // Check receipt headers or merchant indicators
    const merchantLinePatterns = [
      /(?:\bpenerima\b|\btujuan\b|\bkepada\b)\s*[:\-]?\s*([a-z0-9\s.]+)/i,
      /(?:\bmerchant\b|\bnama merchant\b|\btoko\b|\bmerchant name\b)\s*[:\-]?\s*([a-z0-9\s.]+)/i,
      /(?:\btransaksi\b|\bketerangan\b|\bberita\b)\s*[:\-]?\s*([a-z0-9\s.]+)/i,
      /\bke\s*[:\-]?\s*([a-z0-9\s.]+)/i,
    ];

    for (const pat of merchantLinePatterns) {
      const match = rawText.match(pat);
      if (match && match[1] && match[1].trim().length > 2) {
        merchantOrRecipient = match[1].trim().slice(0, 45);
        break;
      }
    }

    // Check top 3 lines of paper receipts
    if (!merchantOrRecipient && lines.length > 0) {
      for (let i = 0; i < Math.min(4, lines.length); i++) {
        const l = lines[i];
        if (
          !/struk|bukti|resi|selamat|selesai|receipt|invoice|\d{5,}|http|www/i.test(l) &&
          l.length >= 3 &&
          l.length <= 40
        ) {
          merchantOrRecipient = l;
          break;
        }
      }
    }
  }

  // Clean up merchant name (strip trailing symbols)
  if (merchantOrRecipient) {
    merchantOrRecipient = merchantOrRecipient.replace(/[\*\_\#\-\:]+$/g, "").trim();
  }

  if (!merchantOrRecipient && detectedInstitution) {
    merchantOrRecipient = `Transaksi ${detectedInstitution}`;
  }

  // 5. Match Source Wallet against User's Wallets
  let matchedWallet: Wallet | null = null;

  if (userWallets.length > 0) {
    // Priority 1: Match detectedInstitution if it's a known bank/wallet (not just generic QRIS)
    if (detectedInstitution && detectedInstitution !== "QRIS") {
      const instLower = detectedInstitution.toLowerCase();
      matchedWallet =
        userWallets.find((w) => {
          const wLower = w.name.toLowerCase();
          const aliases = BANK_ALIASES[instLower] || [instLower];
          return aliases.some((a) => wLower === a || matchesWord(wLower, a));
        }) || null;
    }

    // Priority 2: Look for user wallet name explicitly in non-acquirer lines
    if (!matchedWallet) {
      for (const line of nonAcquirerLines) {
        const lineLower = line.toLowerCase();
        if (lineLower.includes("penerima") || lineLower.includes("tujuan")) {
          continue;
        }

        for (const w of userWallets) {
          const wLower = w.name.toLowerCase();
          // Avoid matching "dana" when line is "sumber dana"
          if (wLower === "dana" && lineLower.includes("sumber dana")) {
            const afterSumberDana = lineLower.replace(/sumber\s+dana/gi, "");
            if (!matchesWord(afterSumberDana, "dana")) continue;
          }
          if (matchesWord(lineLower, wLower)) {
            matchedWallet = w;
            break;
          }
        }
        if (matchedWallet) break;
      }
    }

    // Priority 3: Check entire nonAcquirerText against BANK_ALIASES
    if (!matchedWallet) {
      for (const [instKey, aliases] of Object.entries(BANK_ALIASES)) {
        const matchedAlias = aliases.find((a) => {
          if (a === "dana") {
            const cleaned = nonAcquirerText.replace(/sumber\s+dana/gi, "");
            return matchesWord(cleaned, "dana");
          }
          return matchesWord(nonAcquirerText, a);
        });

        if (matchedAlias) {
          matchedWallet =
            userWallets.find((w) => {
              const wLower = w.name.toLowerCase();
              return wLower === instKey || aliases.some((a) => matchesWord(wLower, a));
            }) || null;
          if (matchedWallet) break;
        }
      }
    }

    // Fallback: Default to first user wallet
    if (!matchedWallet) {
      matchedWallet = userWallets[0];
    }
  }

  // 6. Match Category against User's Categories (Using CATEGORY_SYNONYMS)
  let matchedCategory: Category | null = null;
  let detectedCategory: string | undefined = undefined;

  const merchantLower = merchantOrRecipient.toLowerCase();

  // Priority 1: Match merchant name against CATEGORY_SYNONYMS keywords
  for (const group of Object.values(CATEGORY_SYNONYMS)) {
    const kwMatch = group.keywords.some((kw) => merchantLower.includes(kw));
    if (kwMatch) {
      detectedCategory = group.targetKeys[0].charAt(0).toUpperCase() + group.targetKeys[0].slice(1);
      if (userCategories.length > 0) {
        matchedCategory =
          userCategories.find((c) => {
            const cLower = c.name.toLowerCase();
            return group.targetKeys.some(
              (target) => cLower.includes(target) || target.includes(cLower)
            );
          }) || null;
      }
      if (matchedCategory) break;
    }
  }

  // Priority 2: Match full text against CATEGORY_SYNONYMS keywords
  if (!matchedCategory) {
    for (const group of Object.values(CATEGORY_SYNONYMS)) {
      const kwMatch = group.keywords.some((kw) => matchesWord(fullTextLower, kw) || fullTextLower.includes(kw));
      if (kwMatch) {
        if (!detectedCategory) {
          detectedCategory = group.targetKeys[0].charAt(0).toUpperCase() + group.targetKeys[0].slice(1);
        }
        if (userCategories.length > 0) {
          matchedCategory =
            userCategories.find((c) => {
              const cLower = c.name.toLowerCase();
              return group.targetKeys.some(
                (target) => cLower.includes(target) || target.includes(cLower)
              );
            }) || null;
        }
        if (matchedCategory) break;
      }
    }
  }

  // Priority 3: Direct name matching with user categories
  if (!matchedCategory && userCategories.length > 0) {
    for (const c of userCategories) {
      const cLower = c.name.toLowerCase();
      if (matchesWord(fullTextLower, cLower)) {
        matchedCategory = c;
        break;
      }
    }
  }

  // 7. Determine Transaction Type
  let type: TransactionType = "expense";
  if (
    fullTextLower.includes("dana masuk") ||
    fullTextLower.includes("transfer masuk") ||
    fullTextLower.includes("topup berhasil")
  ) {
    type = "income";
  }

  // 8. Confidence Calculation
  let confidence = 0.35;
  if (detectedAmount && detectedAmount > 0) confidence += 0.35;
  if (detectedInstitution) confidence += 0.15;
  if (merchantOrRecipient) confidence += 0.1;
  if (matchedWallet) confidence += 0.05;

  return {
    amount: detectedAmount,
    amountFormatted: detectedAmount ? formatRupiah(detectedAmount) : null,
    type,
    date: detectedDate,
    dateFormatted: format(detectedDate, "yyyy-MM-dd"),
    merchantOrRecipient,
    sourceWalletId: matchedWallet?.id || null,
    sourceWalletName: matchedWallet?.name || null,
    destinationWalletId: null,
    destinationWalletName: null,
    categoryId: matchedCategory?.id || null,
    categoryName: matchedCategory?.name || null,
    confidence: Math.min(1, Math.round(confidence * 100) / 100),
    detectedSlipType,
    detectedInstitution,
    detectedCategory,
    rawText,
    extractedLines: lines,
  };
}
