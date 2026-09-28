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
}

/**
 * Preprocesses a receipt or transfer slip image on HTML5 Canvas.
 *
 * Automatically detects whether the image is:
 * - A dark-background digital screenshot (e-banking/e-wallet app) — uses
 *   light-text-on-dark detection so white characters become black on white output.
 * - A light-background physical receipt or bright screenshot — uses standard
 *   dark-ink-on-white adaptive binarization.
 *
 * Processing pipeline:
 * 1. Rescale to max 1600px (better accuracy for long receipts).
 * 2. Convert to grayscale.
 * 3. Apply Bradley-Roth adaptive thresholding, mode-matched to image type.
 */
export async function preprocessReceiptImage(
  fileOrBlob: Blob | File,
  maxDimension = 1600,
): Promise<PreprocessedImageResult> {
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

        // 4. Adaptive Bradley-Roth thresholding
        const S = Math.min(72, Math.max(16, Math.floor(targetWidth / 8)));
        const sHalf = Math.floor(S / 2);
        // Mid-tone: use looser threshold (0.08) to avoid obliterating grey text
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

            // For dark screenshots: bright pixels are "ink" (text), output as black on white
            // For light/midtone images: dark pixels are ink, output as black on white
            let outputVal: number;
            if (isDarkScreenshot) {
              // Bright text on dark background → invert logic
              const isBrightText = pixelVal * count >= sum * (1 + T);
              outputVal = isBrightText ? 0 : 255; // text=black, bg=white
            } else {
              const isDarkText = pixelVal * count <= sum * (1 - T);
              outputVal = isDarkText ? 0 : 255; // ink=black, bg=white
            }

            data[dataIdx] = outputVal;
            data[dataIdx + 1] = outputVal;
            data[dataIdx + 2] = outputVal;
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
