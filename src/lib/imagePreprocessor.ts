// ======================================================================
// TROUVAILLE RECEIPT & SLIP IMAGE PREPROCESSOR
// Accelerates OCR accuracy and speed via on-device Canvas Binarization
// ======================================================================

export interface PreprocessedImageResult {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
  modeUsed?: "adaptive_binarize" | "enhanced_grayscale";
}

export interface PreprocessReceiptOptions {
  maxDimension?: number;
  mode?: "adaptive_binarize" | "enhanced_grayscale";
}

/**
 * Preprocesses a receipt or transfer slip image on HTML5 Canvas.
 *
 * Supports two operational modes:
 * - 'adaptive_binarize' (Pass 1): Bradley-Roth adaptive thresholding for crisp, high-contrast black/white output.
 * - 'enhanced_grayscale' (Pass 2): Non-destructive contrast stretching & gamma enhancement preserving subtle dot-matrix thermal ink and low-contrast text.
 *
 * Automatically detects dark-background screenshots and inverts accordingly so Tesseract always reads dark text on light background.
 */
export async function preprocessReceiptImage(
  fileOrBlob: Blob | File,
  optionsOrMaxDim?: number | PreprocessReceiptOptions,
): Promise<PreprocessedImageResult> {
  const maxDimension =
    typeof optionsOrMaxDim === "number"
      ? optionsOrMaxDim
      : optionsOrMaxDim?.maxDimension ?? 1600;
  const mode: "adaptive_binarize" | "enhanced_grayscale" =
    typeof optionsOrMaxDim === "object" && optionsOrMaxDim.mode
      ? optionsOrMaxDim.mode
      : "adaptive_binarize";

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Canvas preprocessing requires a browser environment"));
    }

    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        return reject(new Error("Unable to create canvas 2D rendering context"));
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      try {
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;
        const len = data.length;

        // 1. Grayscale
        const totalPixels = targetWidth * targetHeight;
        const grayscale = new Uint8ClampedArray(totalPixels);
        let sumLum = 0;

        for (let i = 0, p = 0; i < len; i += 4, p++) {
          const gray = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
          );
          grayscale[p] = gray;
          sumLum += gray;
        }
        const globalMean = sumLum / totalPixels;

        // 2. Detect image mode:
        //   globalMean < 100 → dark-background screenshot (e.g. dark-mode banking app)
        //   globalMean 100–160 → mid-tone (could be grey UI background or shadowed receipt)
        //   globalMean > 160 → light background (physical receipt, bright screenshot)
        const isDarkScreenshot = globalMean < 110;
        // Mid-tone images (grey background app screenshots) need a softer threshold
        const isMidTone = !isDarkScreenshot && globalMean < 165;

        if (mode === "enhanced_grayscale") {
          // Mode: Enhanced Contrast Grayscale (Pass 2 Fallback)
          // Non-destructive dynamic range stretching + gamma correction.
          // Preserves faint dot-matrix printer dots & faded thermal paper without binary clipping.
          const hist = new Uint32Array(256);
          for (let p = 0; p < totalPixels; p++) {
            hist[grayscale[p]]++;
          }

          // 2nd and 98th percentiles to avoid extreme border noise
          const pLowCount = totalPixels * 0.02;
          const pHighCount = totalPixels * 0.98;
          let running = 0;
          let minLum = 0;
          let maxLum = 255;
          for (let i = 0; i < 256; i++) {
            running += hist[i];
            if (minLum === 0 && running >= pLowCount) minLum = i;
            if (running >= pHighCount) {
              maxLum = i;
              break;
            }
          }
          if (maxLum <= minLum) {
            minLum = 0;
            maxLum = 255;
          }
          const range = maxLum - minLum || 1;

          for (let p = 0; p < totalPixels; p++) {
            const rawVal = grayscale[p];
            const normalized = Math.min(1, Math.max(0, (rawVal - minLum) / range));
            let enhanced = Math.round(Math.pow(normalized, 0.85) * 255);

            // Invert dark-mode screenshots so Tesseract reads dark text on light canvas
            if (isDarkScreenshot) {
              enhanced = 255 - enhanced;
            }

            const dataIdx = p * 4;
            data[dataIdx] = enhanced;
            data[dataIdx + 1] = enhanced;
            data[dataIdx + 2] = enhanced;
          }
        } else {
          // Mode: Bradley-Roth Adaptive Binarization (Pass 1)
          // 3. Integral image for O(1) window sums
          const integral = new Uint32Array(totalPixels);
          for (let y = 0; y < targetHeight; y++) {
            let lineSum = 0;
            const rowOffset = y * targetWidth;
            const prevRowOffset = (y - 1) * targetWidth;
            for (let x = 0; x < targetWidth; x++) {
              lineSum += grayscale[rowOffset + x];
              integral[rowOffset + x] =
                y === 0
                  ? lineSum
                  : integral[prevRowOffset + x] + lineSum;
            }
          }

          // 4. Adaptive thresholding
          const S = Math.min(72, Math.max(16, Math.floor(targetWidth / 8)));
          const sHalf = Math.floor(S / 2);
          const T = isMidTone ? 0.08 : 0.13;

          for (let y = 0; y < targetHeight; y++) {
            const y1 = Math.max(0, y - sHalf);
            const y2 = Math.min(targetHeight - 1, y + sHalf);
            const rowOffset = y * targetWidth;

            for (let x = 0; x < targetWidth; x++) {
              const x1 = Math.max(0, x - sHalf);
              const x2 = Math.min(targetWidth - 1, x + sHalf);
              const count = (x2 - x1 + 1) * (y2 - y1 + 1);

              let sum = integral[y2 * targetWidth + x2];
              if (x1 > 0) sum -= integral[y2 * targetWidth + (x1 - 1)];
              if (y1 > 0) sum -= integral[(y1 - 1) * targetWidth + x2];
              if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * targetWidth + (x1 - 1)];

              const pixelIdx = rowOffset + x;
              const pixelVal = grayscale[pixelIdx];
              const dataIdx = pixelIdx * 4;

              let outputVal: number;
              if (isDarkScreenshot) {
                const isBrightText = pixelVal * count >= sum * (1 + T);
                outputVal = isBrightText ? 0 : 255;
              } else {
                const isDarkText = pixelVal * count <= sum * (1 - T);
                outputVal = isDarkText ? 0 : 255;
              }

              data[dataIdx] = outputVal;
              data[dataIdx + 1] = outputVal;
              data[dataIdx + 2] = outputVal;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        resolve({
          dataUrl,
          originalWidth,
          originalHeight,
          processedWidth: targetWidth,
          processedHeight: targetHeight,
          modeUsed: mode,
        });
      } catch {
        // Fallback: return unprocessed rescaled canvas
        const fallbackDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        resolve({
          dataUrl: fallbackDataUrl,
          originalWidth,
          originalHeight,
          processedWidth: targetWidth,
          processedHeight: targetHeight,
          modeUsed: mode,
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load receipt image for preprocessing"));
    };

    img.src = objectUrl;
  });
}
