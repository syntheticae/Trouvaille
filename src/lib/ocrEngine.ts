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

  // 1. Pass 1: Standard Adaptive Binarization
  const preprocessed1 = await preprocessReceiptImage(fileOrBlob, {
    mode: "adaptive_binarize",
  });

  onProgress?.(
    30,
    isId ? "Memindai teks di perangkat..." : "Scanning text on-device...",
  );

  // 2. Get OCR Worker
  const worker = await getOCRWorker(onProgress, language);

  // 3. Recognize Pass 1
  const { data: data1 } = await worker.recognize(preprocessed1.dataUrl);
  const rawText1 = data1.text || "";

  onProgress?.(
    80,
    isId ? "Menganalisis struktur finansial..." : "Analyzing financial structure...",
  );

  // 4. Parse Indonesian financial structure (Pass 1)
  const slip1 = parseSlipText(rawText1, userWallets, userCategories);

  let finalSlip = slip1;
  let finalRawText = rawText1;
  let finalProcessedImageUrl = preprocessed1.dataUrl;

  // 5. Dual-Pass OCR Fallback:
  // If Pass 1 failed to extract amount, or has low confidence (< 0.55),
  // or extracted text is very short (< 25 chars) which indicates aggressive binarization
  // erased faint thermal print or washed out low-contrast characters:
  const shouldRunPass2 =
    slip1.amount === null ||
    slip1.confidence < 0.55 ||
    rawText1.trim().length < 25;

  if (shouldRunPass2) {
    onProgress?.(
      60,
      isId
        ? "Meningkatkan kontras untuk nota redup/kusut..."
        : "Enhancing contrast for faint/glared receipt...",
    );

    try {
      const preprocessed2 = await preprocessReceiptImage(fileOrBlob, {
        mode: "enhanced_grayscale",
      });
      const { data: data2 } = await worker.recognize(preprocessed2.dataUrl);
      const rawText2 = data2.text || "";
      const slip2 = parseSlipText(rawText2, userWallets, userCategories);

      // Evaluate whether Pass 2 is superior:
      const pass2IsBetter =
        (slip2.amount !== null && slip1.amount === null) ||
        (slip2.amount !== null && slip2.confidence > slip1.confidence) ||
        (slip2.confidence >= slip1.confidence + 0.1);

      if (pass2IsBetter) {
        finalSlip = slip2;
        finalRawText = rawText2;
        finalProcessedImageUrl = preprocessed2.dataUrl;
      }
    } catch (pass2Err) {
      console.warn("[ocrEngine] Pass 2 fallback encountered error, using Pass 1 result:", pass2Err);
    }
  }

  onProgress?.(100, isId ? "Selesai!" : "Done!");

  return {
    slip: finalSlip,
    rawText: finalRawText,
    processedImageUrl: finalProcessedImageUrl,
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
