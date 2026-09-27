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
 * Preprocesses a receipt or transfer slip image on HTML5 Canvas:
 * 1. Rescales large camera photos down to max 1280px (maintaining aspect ratio).
 * 2. Applies luminance grayscaling.
 * 3. Applies high-contrast adaptive thresholding to eliminate shadows and background noise.
 */
export async function preprocessReceiptImage(
  fileOrBlob: Blob | File,
  maxDimension = 1280,
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

      // Calculate constrained dimensions
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

      // Draw rescaled image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      try {
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;
        const len = data.length;

        // 1. Convert to grayscale 1D array
        const totalPixels = targetWidth * targetHeight;
        const grayscale = new Uint8ClampedArray(totalPixels);
        let sumLum = 0;

        for (let i = 0, p = 0; i < len; i += 4, p++) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          grayscale[p] = gray;
          sumLum += gray;
        }
        const globalMean = sumLum / totalPixels;

        // 2. Build 2D Integral Image (Summed-Area Table) for O(1) window queries
        const integral = new Uint32Array(totalPixels);

        for (let y = 0; y < targetHeight; y++) {
          let lineSum = 0;
          const rowOffset = y * targetWidth;
          const prevRowOffset = (y - 1) * targetWidth;
          for (let x = 0; x < targetWidth; x++) {
            lineSum += grayscale[rowOffset + x];
            if (y === 0) {
              integral[rowOffset + x] = lineSum;
            } else {
              integral[rowOffset + x] = integral[prevRowOffset + x] + lineSum;
            }
          }
        }

        // 3. Adaptive Local-Window Thresholding (Bradley-Roth Algorithm)
        // Window size S = width / 8 (clamped between 16 and 64 for thermal print size)
        const S = Math.min(64, Math.max(16, Math.floor(targetWidth / 8)));
        const sHalf = Math.floor(S / 2);
        const T = 0.13; // 13% darker than local mean denotes ink

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

            // Ink test: pixelVal * count <= sum * (1 - T)
            const isDarkText = pixelVal * count <= sum * (1 - T);

            // Handle dark-mode digital receipts vs physical white receipts
            const outputVal = globalMean < 90
              ? (isDarkText ? 255 : 0)
              : (isDarkText ? 0 : 255);

            data[dataIdx] = outputVal;
            data[dataIdx + 1] = outputVal;
            data[dataIdx + 2] = outputVal;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve({
          dataUrl,
          originalWidth,
          originalHeight,
          processedWidth: targetWidth,
          processedHeight: targetHeight,
        });
      } catch (err) {
        // Fallback: return canvas without custom pixel processing if security or context fails
        const fallbackDataUrl = canvas.toDataURL("image/jpeg", 0.85);
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
