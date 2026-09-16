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
  rawText: string;
  extractedLines: string[];
}

const CATEGORY_MERCHANT_ALIASES: Record<string, string[]> = {
  kopi: [
    "kopi", "coffee", "cafe", "starbucks", "kenangan", "janji jiwa",
    "fore", "tomoro", "kulo", "point coffee", "kopsus", "latte", "espresso"
  ],
  makanan: [
    "resto", "restoran", "makan", "bakso", "mie", "ayam", "bebek", "padang",
    "sederhana", "mcdonald", "mcd", "kfc", "hokben", "pizza", "burger", "d cost",
    "warung", "gofood", "grabfood", "shopeefood", "dapur", "baker", "roti",
    "sushi", "ramen", "solaria", "marugame", "steak", "soto", "sate"
  ],
  belanja: [
    "indomaret", "alfamart", "alfamidi", "superindo", "hypermart", "transmart",
    "grand lucky", "hero", "farmers", "lotte", "tokopedia", "shopee", "tiktok shop",
    "blibli", "lazada", "uniqlo", "zara", "h&m", "miniso", "mr diy", "ace hardware",
    "watson", "guardian", "gramedia"
  ],
  transportasi: [
    "pertamina", "spbu", "shell", "bp akr", "bensin", "pertamax", "pertalite",
    "solar", "parkir", "parking", "tol", "jasamarga", "gojek", "grab", "maxim",
    "bluebird", "kereta", "krl", "mrt", "lrt", "kai", "tiket.com", "traveloka"
  ],
  hunian: [
    "pln", "listrik", "pdam", "air", "ipl", "indihome", "biznet", "myrepublic",
    "first media", "wifi", "kost", "kos", "kontrakan", "sewa"
  ],
  hiburan: [
    "cinema", "xxi", "cgv", "cinepolis", "bioskop", "nonton", "netflix", "spotify",
    "youtube", "disney", "steam", "playstation", "nintendo", "game", "karaoke"
  ],
  kesehatan: [
    "apotek", "apotik", "kimia farma", "k-24", "century", "halodoc", "alodokter",
    "klinik", "rumah sakit", "rs ", "lab", "pramita", "prodia", "optik", "dokter"
  ],
};

const BANK_ALIASES: Record<string, string[]> = {
  bca: ["bca", "klikbca", "m-bca", "mybca", "m-transfer", "bank central asia"],
  mandiri: ["mandiri", "livin", "bank mandiri"],
  bri: ["bri", "brimo", "bank rakyat indonesia"],
  bni: ["bni", "wondr", "bank negara indonesia"],
  cimb: ["cimb", "octo", "niaga"],
  jago: ["jago", "bank jago"],
  seabank: ["seabank", "sea bank"],
  blu: ["blu", "blubybcadigital"],
  jenius: ["jenius", "btpn"],
  permata: ["permata", "permatanet"],
  bsi: ["bsi", "bank syariah indonesia"],
  gopay: ["gopay", "gojek"],
  ovo: ["ovo"],
  dana: ["dana"],
  shopeepay: ["shopeepay", "spay"],
  linkaja: ["linkaja"],
  cash: ["cash", "tunai"],
};

/**
 * Normalizes Indonesian currency string (e.g. "Rp 150.000", "150.000,00", "150000") to integer number.
 */
export function cleanCurrency(val: string): number {
  if (!val) return 0;

  // Remove currency symbol (Rp, IDR) and whitespace
  let clean = val.replace(/(?:rp\.?|idr)/gi, "").trim();

  // If format is 150.000,00 -> remove ,00 decimal
  if (clean.includes(",") && clean.indexOf(",") === clean.length - 3) {
    clean = clean.slice(0, -3);
  }

  // Remove dots and commas
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

  // 1. Detect Slip Classification
  let detectedSlipType: ParsedSlipResult["detectedSlipType"] = "general";
  let detectedInstitution: string | undefined;

  if (fullTextLower.includes("qris") || fullTextLower.includes("nmid")) {
    detectedSlipType = "qris";
    detectedInstitution = "QRIS";
  } else if (
    fullTextLower.includes("gopay") ||
    fullTextLower.includes("gojek") ||
    fullTextLower.includes("shopeepay") ||
    fullTextLower.includes("dana") ||
    fullTextLower.includes("ovo")
  ) {
    detectedSlipType = "ewallet";
  } else if (
    fullTextLower.includes("transfer") ||
    fullTextLower.includes("m-transfer") ||
    fullTextLower.includes("livin") ||
    fullTextLower.includes("brimo") ||
    fullTextLower.includes("bca") ||
    fullTextLower.includes("mandiri") ||
    fullTextLower.includes("bni")
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

  // Detect institution name
  for (const [instKey, aliases] of Object.entries(BANK_ALIASES)) {
    if (aliases.some((a) => fullTextLower.includes(a))) {
      detectedInstitution = instKey.toUpperCase();
      break;
    }
  }

  // 2. Extract Amount
  // Priority 1: High-confidence lines with Total / Jumlah / Nominal
  let detectedAmount: number | null = null;
  const candidateAmounts: { amount: number; score: number; line: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // Skip lines with admin fees (e.g. 2.500 or 6.500)
    const isAdminFeeLine =
      lineLower.includes("admin") ||
      lineLower.includes("biaya transaksi") ||
      lineLower.includes("fee");

    // Skip card / account numbers (e.g. 10+ digits without separator)
    if (/\b\d{10,19}\b/.test(line)) {
      continue;
    }

    // Skip phone numbers
    if (/\b08\d{8,12}\b/.test(line)) {
      continue;
    }

    // Search for currency numbers: e.g. Rp 150.000 or 150.000
    const currencyMatches = line.match(/(?:rp\.?|idr)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:,[0-9]{2})?|[0-9]{4,9})/gi);

    if (currencyMatches) {
      for (const match of currencyMatches) {
        const amt = cleanCurrency(match);

        // Ignore small noise (< Rp 1.000) or massive unreasonable numbers (> Rp 500.000.000)
        if (amt < 1000 || amt > 500_000_000) continue;

        let score = 1;

        if (lineLower.includes("total belanja") || lineLower.includes("grand total")) {
          score += 100;
        } else if (lineLower.includes("total bayar") || lineLower.includes("total pembayaran") || lineLower.includes("total transaksi")) {
          score += 90;
        } else if (lineLower.includes("total") && !lineLower.includes("subtotal")) {
          score += 80;
        } else if (lineLower.includes("nominal transfer") || lineLower.includes("jumlah transfer") || lineLower.includes("jumlah")) {
          score += 70;
        } else if (lineLower.includes("nominal") || lineLower.includes("amount")) {
          score += 50;
        } else if (lineLower.startsWith("rp") || lineLower.includes("rp.")) {
          score += 30;
        }

        if (isAdminFeeLine) {
          score -= 60; // De-prioritize admin fee
        }

        if (lineLower.includes("subtotal") || lineLower.includes("sub total")) {
          score -= 20; // De-prioritize subtotal if Grand Total exists
        }

        if (lineLower.includes("kembalian") || lineLower.includes("kembali") || lineLower.includes("change")) {
          score -= 50;
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
  // Indonesian month dictionary
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

  // Check date patterns e.g. "16 Sep 2026", "16/09/2026", "16-09-2026"
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

    // Indonesian convention is DD/MM/YYYY
    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12 && year >= 2020 && year <= 2040) {
      detectedDate = new Date(year, p2 - 1, p1);
    }
  }

  // 4. Extract Merchant / Note
  let merchantOrRecipient = "";

  // Check receipt headers or merchant indicators
  const merchantLinePatterns = [
    /(?:\bke\b|\bpenerima\b|\btujuan\b|\bkepada\b)\s*[:\-]?\s*([a-z0-9\s.]+)/i,
    /(?:\bmerchant\b|\bnama merchant\b|\btoko\b|\bmerchant name\b)\s*[:\-]?\s*([a-z0-9\s.]+)/i,
    /(?:\btransaksi\b|\bketerangan\b|\bberita\b)\s*[:\-]?\s*([a-z0-9\s.]+)/i,
  ];

  for (const pat of merchantLinePatterns) {
    const match = rawText.match(pat);
    if (match && match[1] && match[1].trim().length > 2) {
      merchantOrRecipient = match[1].trim().slice(0, 45);
      break;
    }
  }

  // If still empty and it's a receipt, check top 3 lines
  if (!merchantOrRecipient && lines.length > 0) {
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const l = lines[i];
      // Ignore words like "STRUK", "BUKTI", "RESI", date, or pure numbers
      if (
        !/struk|bukti|resi|selamat|selesai|receipt|invoice|\d{5,}/i.test(l) &&
        l.length >= 3 &&
        l.length <= 40
      ) {
        merchantOrRecipient = l;
        break;
      }
    }
  }

  if (!merchantOrRecipient && detectedInstitution) {
    merchantOrRecipient = `Transaksi ${detectedInstitution}`;
  }

  // 5. Match Source Wallet against User's Wallets
  let matchedWallet: Wallet | null = null;

  if (userWallets.length > 0) {
    // Check if detectedInstitution matches any user wallet
    if (detectedInstitution) {
      const instLower = detectedInstitution.toLowerCase();
      matchedWallet =
        userWallets.find((w) => {
          const wName = w.name.toLowerCase();
          const aliases = BANK_ALIASES[instLower] || [instLower];
          return aliases.some((a) => wName.includes(a) || a.includes(wName));
        }) || null;
    }

    // Direct string search across all user wallets
    if (!matchedWallet) {
      for (const w of userWallets) {
        const wLower = w.name.toLowerCase();
        if (fullTextLower.includes(wLower)) {
          matchedWallet = w;
          break;
        }
      }
    }

    // Default to first user wallet
    if (!matchedWallet) {
      matchedWallet = userWallets[0];
    }
  }

  // 6. Match Category against User's Categories
  let matchedCategory: Category | null = null;

  if (userCategories.length > 0) {
    const merchantLower = merchantOrRecipient.toLowerCase();

    // Priority 1: Match merchant directly (e.g. Indomaret -> Belanja, Starbucks -> Kopi)
    if (merchantLower) {
      for (const [catKey, keywords] of Object.entries(CATEGORY_MERCHANT_ALIASES)) {
        const matchedKw = keywords.find((kw) => merchantLower.includes(kw));
        if (matchedKw) {
          matchedCategory =
            userCategories.find((c) => {
              const cLower = c.name.toLowerCase();
              return (
                cLower.includes(catKey) ||
                catKey.includes(cLower) ||
                cLower.includes(matchedKw)
              );
            }) || null;
          if (matchedCategory) break;
        }
      }
    }

    // Priority 2: Match against full text if merchant didn't directly match
    if (!matchedCategory) {
      for (const [catKey, keywords] of Object.entries(CATEGORY_MERCHANT_ALIASES)) {
        const matchedKeyword = keywords.find((kw) => fullTextLower.includes(kw));
        if (matchedKeyword) {
          matchedCategory =
            userCategories.find((c) => {
              const cLower = c.name.toLowerCase();
              return (
                cLower.includes(catKey) ||
                catKey.includes(cLower) ||
                cLower.includes(matchedKeyword)
              );
            }) || null;
          if (matchedCategory) break;
        }
      }
    }

    // Direct name matching with user categories
    if (!matchedCategory) {
      for (const c of userCategories) {
        const cLower = c.name.toLowerCase();
        if (fullTextLower.includes(cLower)) {
          matchedCategory = c;
          break;
        }
      }
    }

    // Default to first user category
    if (!matchedCategory) {
      matchedCategory = userCategories[0];
    }
  }

  // 7. Determine Transaction Type
  let type: TransactionType = "expense";
  if (fullTextLower.includes("dana masuk") || fullTextLower.includes("transfer masuk") || fullTextLower.includes("topup berhasil")) {
    type = "income";
  }

  // 8. Confidence Calculation
  let confidence = 0.3;
  if (detectedAmount && detectedAmount > 0) confidence += 0.35;
  if (detectedInstitution) confidence += 0.15;
  if (merchantOrRecipient) confidence += 0.1;
  if (matchedWallet) confidence += 0.05;
  if (matchedCategory) confidence += 0.05;

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
    rawText,
    extractedLines: lines,
  };
}
