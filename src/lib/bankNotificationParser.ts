import type { Category, Wallet, TransactionType } from "./types";
import { parseNaturalTransaction } from "./nlpParser";

export interface DetectedBankNotification {
  rawText: string;
  sourceApp: string; // e.g., "BCA", "Mandiri Livin", "GoPay", "QRIS", "ShopeePay"
  amount: number;
  merchantOrNote: string;
  type: TransactionType;
  suggestedWalletId?: string;
  suggestedWalletName?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
}

/**
 * Detects if a text string looks like an Indonesian m-Banking, SMS, or e-Wallet payment notification
 * and extracts financial tokens.
 */
export function parseBankNotification(
  text: string,
  categories: Category[] = [],
  wallets: Wallet[] = [],
): DetectedBankNotification | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();
  if (clean.length < 8 || clean.length > 500) return null;

  const lower = clean.toLowerCase();

  // 1. Check for banking / e-wallet signal keywords
  const bankSignals = [
    "bca",
    "livin",
    "mandiri",
    "brimo",
    "bri",
    "bni",
    "cimb",
    "jago",
    "seabank",
    "gopay",
    "ovo",
    "shopeepay",
    "dana",
    "qris",
    "transfer berhasil",
    "pembayaran berhasil",
    "pembayaran sukses",
    "transaksi berhasil",
    "debit",
    "kamu telah bayar",
    "berhasil bayar",
  ];

  const hasSignal = bankSignals.some((sig) => lower.includes(sig));
  if (!hasSignal) return null;

  // 2. Extract amount (e.g. "Rp 50.000", "Rp. 50.000", "Rp50000", "IDR 50.000")
  const amountRegex = /(?:rp\.?|idr)\s*([\d.,]+)/i;
  const amountMatch = clean.match(amountRegex);

  let amount = 0;
  if (amountMatch && amountMatch[1]) {
    const rawNum = amountMatch[1].trim();
    // Normalize Indonesian numbers: 50.000 or 50.000,00
    let normalized = rawNum;
    if (normalized.includes(".") && normalized.includes(",")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (normalized.includes(".")) {
      const parts = normalized.split(".");
      if (parts[parts.length - 1].length === 3) {
        normalized = normalized.replace(/\./g, "");
      }
    } else if (normalized.includes(",")) {
      const parts = normalized.split(",");
      if (parts[parts.length - 1].length === 3) {
        normalized = normalized.replace(/,/g, "");
      } else {
        normalized = normalized.replace(",", ".");
      }
    }
    const parsedNum = parseFloat(normalized);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      amount = parsedNum;
    }
  }

  // Fallback: look for standalone numbers if "berhasil" or "qris" is present
  if (amount <= 0) {
    const fallbackNum = clean.match(/\b(\d{2,3}(?:\.\d{3})+)\b/);
    if (fallbackNum && fallbackNum[1]) {
      const num = parseFloat(fallbackNum[1].replace(/\./g, ""));
      if (!isNaN(num) && num >= 1000) amount = num;
    }
  }

  if (amount <= 0) return null;

  // 3. Detect Source Bank / E-Wallet
  let sourceApp = "Bank / E-Wallet";
  let matchedWallet: Wallet | undefined;

  if (lower.includes("bca")) {
    sourceApp = "BCA";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("bca"));
  } else if (lower.includes("livin") || lower.includes("mandiri")) {
    sourceApp = "Mandiri Livin";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("mandiri"));
  } else if (lower.includes("gopay")) {
    sourceApp = "GoPay";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("gopay"));
  } else if (lower.includes("shopeepay")) {
    sourceApp = "ShopeePay";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("shopee"));
  } else if (lower.includes("ovo")) {
    sourceApp = "OVO";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("ovo"));
  } else if (lower.includes("dana")) {
    sourceApp = "DANA";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("dana"));
  } else if (lower.includes("qris")) {
    sourceApp = "QRIS";
  } else if (lower.includes("seabank")) {
    sourceApp = "SeaBank";
    matchedWallet = wallets.find((w) => w.name.toLowerCase().includes("seabank"));
  }

  // 4. Extract Merchant / Note
  let merchantOrNote = "";
  // Try pattern "ke [Merchant]" or "di [Merchant]"
  const targetMatch = clean.match(/(?:ke|di|pada)\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:berhasil|sebesar|rp|tanggal|\.|\n|$))/i);
  if (targetMatch && targetMatch[1]) {
    merchantOrNote = targetMatch[1].trim();
  }

  if (!merchantOrNote || merchantOrNote.length < 2) {
    // Clean boilerplate words and keep remainder
    let remaining = clean
      .replace(/(?:rp\.?|idr)\s*[\d.,]+/gi, "")
      .replace(/transfer|berhasil|sukses|pembayaran|sebesar|transaksi|debit|rekening|kamu telah bayar/gi, "")
      .replace(/[0-9]{6,}/g, "") // remove account numbers
      .trim();
    merchantOrNote = remaining.slice(0, 35) || `${sourceApp} Payment`;
  }

  // 5. Determine Transaction Type
  const isIncome =
    lower.includes("dana masuk") ||
    lower.includes("transfer masuk") ||
    lower.includes("diterima dari") ||
    lower.includes("kredit");
  const type: TransactionType = isIncome ? "income" : "expense";

  // 6. Suggest Category using NLP parser
  const nlpResult = parseNaturalTransaction(merchantOrNote, categories, wallets);

  return {
    rawText: clean,
    sourceApp,
    amount,
    merchantOrNote,
    type,
    suggestedWalletId: matchedWallet?.id || undefined,
    suggestedWalletName: matchedWallet?.name || undefined,
    suggestedCategoryId: nlpResult.categoryId || undefined,
    suggestedCategoryName: nlpResult.categoryName || undefined,
  };
}
