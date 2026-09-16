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

        // 1. Calculate average luminance for adaptive threshold baseline
        let sumLuminance = 0;
        const step = 4 * 4; // Sample every 4th pixel for speed
        let sampledCount = 0;

        for (let i = 0; i < len; i += step) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sumLuminance += lum;
          sampledCount++;
        }

        const avgLuminance = sampledCount > 0 ? sumLuminance / sampledCount : 128;
        // Adaptive threshold with slight bias towards text clarity
        const threshold = Math.min(Math.max(avgLuminance * 0.92, 90), 170);

        // 2. High-contrast thresholding with edge preservation
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Standard ITU-R BT.601 perceptual grayscale
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Contrast curve
          const val = gray < threshold ? Math.max(0, gray * 0.45) : Math.min(255, 255 - (255 - gray) * 0.5);

          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          // Keep original alpha
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
