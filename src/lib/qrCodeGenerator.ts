// ======================================================================
// TROUVAILLE MONOCHROME APPLE LUXURY QR CODE GENERATOR
// Crisp vector SVG and Canvas DataURL generation (100% Offline)
// Adheres strictly to GEMINI.md: Monochrome palette, no external network calls
// ======================================================================

import QRCode from "qrcode";

export interface QrOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generate a monochrome Apple luxury QR code as an SVG string.
 * Perfect for responsive scaling and Retina displays without blurring.
 */
export async function generateQrSvg(
  text: string,
  options: QrOptions = {},
): Promise<string> {
  const {
    margin = 2,
    darkColor = "#000000",
    lightColor = "#ffffff",
  } = options;

  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return svg;
  } catch (error) {
    console.error("[generateQrSvg] Error generating QR SVG:", error);
    throw error;
  }
}

/**
 * Generate a monochrome Apple luxury QR code as a PNG data URL.
 */
export async function generateQrDataUrl(
  text: string,
  options: QrOptions = {},
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    darkColor = "#000000",
    lightColor = "#ffffff",
  } = options;

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("[generateQrDataUrl] Error generating QR Data URL:", error);
    throw error;
  }
}

/**
 * Helper to construct the standardized Trouvaille deep link and web join URL.
 */
export function buildJoinLedgerUrl(inviteCode: string): {
  deepLink: string;
  webUrl: string;
} {
  const cleanCode = inviteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return {
    deepLink: `trouvaille://join?code=${cleanCode}`,
    webUrl: `https://trouvaille.app/join?code=${cleanCode}`,
  };
}
