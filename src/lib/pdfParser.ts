// ======================================================================
// TROUVAILLE PDF BANK STATEMENT TEXT EXTRACTOR
// Uses Mozilla's pdfjs-dist (same engine as Firefox/Chrome) to extract
// text from PDF mutasi files, 100% client-side — no server involved.
// ======================================================================

export interface ExtractedPDFResult {
  /** Full extracted text suitable for statementParser.parseStatementText() */
  text: string;
  /** Number of pages processed */
  pageCount: number;
  /** Detected bank institution from metadata or first page text */
  detectedBank: string | null;
}

// Lightweight institution name detector from raw PDF text
function detectBankFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("bank central asia") || t.includes("bca")) return "BCA";
  if (t.includes("livin") || t.includes("bank mandiri") || t.includes("mandiri")) return "Mandiri";
  if (t.includes("seabank") || t.includes("sea bank")) return "SeaBank";
  if (t.includes("jenius") || t.includes("btpn")) return "Jenius";
  if (t.includes("gopay") || t.includes("gojek")) return "GoPay";
  if (t.includes("ovo") || t.includes("pt visionet")) return "OVO";
  if (t.includes("dana") || t.includes("dompet digital")) return "DANA";
  if (t.includes("shopeepay") || t.includes("shopee pay")) return "ShopeePay";
  if (t.includes("brimo") || t.includes("bank rakyat") || t.includes("bri")) return "BRI";
  if (t.includes("wondr") || t.includes("bank negara") || t.includes("bni")) return "BNI";
  if (t.includes("permatanet") || t.includes("bank permata") || t.includes("permata")) return "Permata";
  if (t.includes("octo") || t.includes("cimb niaga") || t.includes("cimb")) return "CIMB";
  if (t.includes("bank mega") || t.includes("mega syariah")) return "Mega";
  if (t.includes("bank danamon") || t.includes("danamon")) return "Danamon";
  if (t.includes("blu by bca") || t.includes("blu bca")) return "Blu";
  if (t.includes("bank neo") || t.includes("neobank")) return "BNC";
  return null;
}

/**
 * Extracts all text from a PDF file using pdfjs-dist.
 *
 * The pdfjs worker is configured to use a CDN URL (via importScripts),
 * which avoids the need to bundle the ~300 KB worker script.
 * All text extraction happens in the browser — the file is never uploaded.
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedPDFResult> {
  // Lazy-load pdfjs-dist — it's ~900 KB, kept out of main bundle
  const pdfjsLib = await import("pdfjs-dist");

  // Use the bundled legacy worker to avoid cross-origin worker issues
  // in Capacitor/Ionic WebView environments
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    // Disable external font/image loading for security
    disableFontFace: true,
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct readable lines from text items
    // pdfjs returns items with x/y positions — we sort by y (row) then x (column)
    type TextItem = {
      str: string;
      transform: number[];
      width: number;
    };

    const items = textContent.items as TextItem[];

    // Group items into lines by their Y coordinate (with ±3px tolerance)
    const lineMap = new Map<number, { x: number; text: string }[]>();
    for (const item of items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3; // bucket to 3px
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x: item.transform[4], text: item.str });
    }

    // Sort lines by Y descending (PDF y=0 is bottom) then items by X
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const pageLines: string[] = [];
    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const lineText = lineItems.map((i) => i.text).join("  ").trim();
      if (lineText.length > 1) {
        pageLines.push(lineText);
      }
    }

    pageTexts.push(pageLines.join("\n"));
  }

  const fullText = pageTexts.join("\n\n");
  const detectedBank = detectBankFromText(fullText);

  return {
    text: fullText,
    pageCount,
    detectedBank,
  };
}
