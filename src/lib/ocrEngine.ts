// ======================================================================
// TROUVAILLE ON-DEVICE OCR ENGINE (TESSERACT.JS WEBASSEMBLY)
// Zero-cost, 100% client-side text recognition in background Web Worker
// ======================================================================

import { createWorker, type Worker } from "tesseract.js";
import { preprocessReceiptImage } from "./imagePreprocessor";
import { parseSlipText, type ParsedSlipResult } from "./slipParser";
import type { Wallet, Category } from "./types";

export interface OCRScanResult {
  slip: ParsedSlipResult;
  rawText: string;
  processedImageUrl: string;
}

export type OCRProgressCallback = (percent: number, statusText: string) => void;

let workerPromise: Promise<Worker> | null = null;

/**
 * Lazily gets or initializes a reusable Tesseract Web Worker.
 * Using 'eng' is optimal for Indonesian financial slips & receipts because
 * all numerals, currency symbols, and banking/retail terms use standard Latin script.
 */
async function getOCRWorker(
  onProgress?: OCRProgressCallback,
  language: "id" | "en" = "en",
): Promise<Worker> {
  const isId = language === "id";
  if (!workerPromise) {
    workerPromise = (async () => {
      onProgress?.(
        10,
        isId
          ? "Menginisialisasi OCR pada perangkat..."
          : "Initializing on-device OCR...",
      );
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            const pct = Math.round(30 + m.progress * 65);
            onProgress?.(
              pct,
              isId
                ? `Membaca teks struk (${Math.round(m.progress * 100)}%)...`
                : `Reading receipt text (${Math.round(m.progress * 100)}%)...`,
            );
          } else if (m.status === "loading tesseract core") {
            onProgress?.(
              15,
              isId ? "Memuat mesin OCR..." : "Loading OCR engine...",
            );
          } else if (m.status === "loading language traineddata") {
            onProgress?.(
              25,
              isId
                ? "Memuat kamus karakter..."
                : "Loading character dictionary...",
            );
          }
        },
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Scans a receipt photo or transfer slip screenshot:
 * 1. Preprocesses image on Canvas (grayscale + contrast binarization).
 * 2. Runs Tesseract OCR on the enhanced image.
 * 3. Feeds extracted text to deterministic Indonesian slip parser.
 * 4. Auto-matches against user's wallets and categories.
 */
export async function scanReceiptOrSlip(
  fileOrBlob: Blob | File,
  userWallets: Wallet[] = [],
  userCategories: Category[] = [],
  onProgress?: OCRProgressCallback,
  language: "id" | "en" = "en",
): Promise<OCRScanResult> {
  const isId = language === "id";
  onProgress?.(
    5,
    isId
      ? "Meningkatkan ketajaman & kontras gambar..."
      : "Enhancing image clarity & contrast...",
  );

  // 1. Preprocess on Canvas
  const preprocessed = await preprocessReceiptImage(fileOrBlob);

  onProgress?.(
    30,
    isId ? "Memindai teks di perangkat..." : "Scanning text on-device...",
  );

  // 2. Get OCR Worker
  const worker = await getOCRWorker(onProgress, language);

  // 3. Recognize
  const { data } = await worker.recognize(preprocessed.dataUrl);
  const rawText = data.text || "";

  onProgress?.(
    95,
    isId ? "Mengekstrak nominal & merchant..." : "Extracting amount & merchant...",
  );

  // 4. Parse Indonesian financial structure
  const slip = parseSlipText(rawText, userWallets, userCategories);

  onProgress?.(100, isId ? "Selesai!" : "Done!");

  return {
    slip,
    rawText,
    processedImageUrl: preprocessed.dataUrl,
  };
}

/**
 * Terminates the OCR worker to free WebAssembly memory when needed.
 */
export async function terminateOCRWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {}
    workerPromise = null;
  }
}
