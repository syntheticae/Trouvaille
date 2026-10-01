import { evaluateMathSafe } from "./evaluateMathSafe";

export interface KeypadInputOptions {
  allowDecimals?: boolean;
  maxDecimals?: number;
  isIndonesian?: boolean;
}

function formatDecimalNumberToken(
  token: string,
  maxDecimals: number,
  isIndonesian: boolean = true,
): string {
  const decSep = isIndonesian ? "," : ".";

  // Clean token according to locale
  let cleaned = token;
  if (isIndonesian) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }

  const parts = cleaned.split(".");
  const hasDot = parts.length > 1;
  const intDigits = (parts[0] || "").replace(/\D/g, "").slice(0, 12);
  const decDigits = hasDot
    ? parts
        .slice(1)
        .join("")
        .replace(/\D/g, "")
        .slice(0, maxDecimals)
    : "";

  let intFormatted = "";
  if (intDigits) {
    const num = parseInt(intDigits, 10);
    intFormatted = num.toLocaleString(isIndonesian ? "id-ID" : "en-US");
  } else if (hasDot) {
    intFormatted = "0";
  }

  return hasDot ? `${intFormatted}${decSep}${decDigits}` : intFormatted;
}

/**
 * Handles keypad input events for transaction amounts.
 * Supports digits (0-9), triple zero ("000"), decimal separator ("." / ","),
 * operators (+, -, ×, ÷), backspace ("backspace"), clear ("clear"), and evaluation ("evaluate" / "=").
 */
export function applyKeypadInput(
  currentExpr: string,
  key: string,
  options?: KeypadInputOptions,
): { expression: string; numericValue: number } {
  const allowDecimals = options?.allowDecimals ?? true;
  const maxDecimals = options?.maxDecimals ?? 2;
  const isIndonesian = options?.isIndonesian ?? true;
  const decSep = isIndonesian ? "," : ".";
  const trimmed = currentExpr ? currentExpr.trim() : "";

  // 1. CLEAR
  if (key === "clear" || key === "C") {
    return { expression: "", numericValue: 0 };
  }

  // 2. BACKSPACE
  if (key === "backspace" || key === "⌫") {
    if (!trimmed || trimmed === "0") {
      return { expression: "", numericValue: 0 };
    }

    // If ends with whitespace and operator like " + ", remove that operator and spaces
    if (/\s[+\-*/×÷]\s?$/.test(trimmed)) {
      const next = trimmed.replace(/\s*[+\-*/×÷]\s*$/, "").trim();
      const num = evaluateMathSafe(next);
      return { expression: next, numericValue: num };
    }

    const nextRaw = trimmed.slice(0, -1).trim();
    if (!nextRaw || nextRaw === "0") {
      return { expression: "", numericValue: 0 };
    }

    if (!/[+\-*/×÷]/.test(nextRaw)) {
      const formatted = formatDecimalNumberToken(nextRaw, maxDecimals, isIndonesian);
      return { expression: formatted, numericValue: evaluateMathSafe(formatted) };
    } else {
      const parts = nextRaw.split(/(\s*[+\-*/×÷]\s*)/);
      const lastToken = parts[parts.length - 1];
      if (lastToken) {
        parts[parts.length - 1] = formatDecimalNumberToken(
          lastToken,
          maxDecimals,
          isIndonesian,
        );
      }
      const joined = parts.join("");
      return { expression: joined, numericValue: evaluateMathSafe(joined) };
    }
  }

  // 3. OPERATORS: +, -, ×, ÷
  const isOperator = ["+", "-", "×", "*", "÷", "/"].includes(key);
  if (isOperator) {
    const op = key === "*" ? "×" : key === "/" ? "÷" : key;
    if (!trimmed) {
      return { expression: `0 ${op} `, numericValue: 0 };
    }
    // If already ends with an operator, replace it
    if (/[+\-*/×÷]\s*$/.test(trimmed)) {
      const next = trimmed.replace(/[+\-*/×÷]\s*$/, `${op} `);
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
    const next = `${trimmed} ${op} `;
    return { expression: next, numericValue: evaluateMathSafe(next) };
  }

  // 3b. DECIMAL POINT: "." or ","
  if (key === "." || key === ",") {
    if (!allowDecimals) {
      return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
    }
    if (!trimmed || trimmed === "0") {
      return { expression: `0${decSep}`, numericValue: 0 };
    }
    if (/[+\-*/×÷]\s*$/.test(trimmed)) {
      const next = `${trimmed}0${decSep}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
    if (!/[+\-*/×÷]/.test(trimmed)) {
      // Check if already contains decimal separator
      const alreadyHasDec = isIndonesian
        ? trimmed.includes(",")
        : trimmed.includes(".");
      if (alreadyHasDec) {
        return {
          expression: trimmed,
          numericValue: evaluateMathSafe(trimmed),
        };
      }
      const formatted = formatDecimalNumberToken(
        `${trimmed}${decSep}`,
        maxDecimals,
        isIndonesian,
      );
      return {
        expression: formatted,
        numericValue: evaluateMathSafe(formatted),
      };
    } else {
      const lastOpIndex = Math.max(
        trimmed.lastIndexOf("+"),
        trimmed.lastIndexOf("-"),
        trimmed.lastIndexOf("×"),
        trimmed.lastIndexOf("*"),
        trimmed.lastIndexOf("÷"),
        trimmed.lastIndexOf("/"),
      );
      const prefix = trimmed.slice(0, lastOpIndex + 1);
      const suffix = trimmed.slice(lastOpIndex + 1).trim();
      const alreadyHasDec = isIndonesian
        ? suffix.includes(",")
        : suffix.includes(".");
      if (alreadyHasDec) {
        return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
      }
      const nextSuffix = suffix
        ? formatDecimalNumberToken(`${suffix}${decSep}`, maxDecimals, isIndonesian)
        : `0${decSep}`;
      const next = `${prefix} ${nextSuffix}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
  }

  // 4. TRIPLE ZERO: "000"
  if (key === "000") {
    if (!trimmed || trimmed === "0") {
      return { expression: "", numericValue: 0 };
    }
    // If ends with an operator, cannot append 000 directly
    if (/[+\-*/×÷]\s*$/.test(trimmed)) {
      return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
    }

    if (!/[+\-*/×÷]/.test(trimmed)) {
      // If already has decimal part, do not append 000
      const hasDec = isIndonesian ? trimmed.includes(",") : trimmed.includes(".");
      if (hasDec) {
        return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
      }
      const formatted = formatDecimalNumberToken(
        `${trimmed}000`,
        maxDecimals,
        isIndonesian,
      );
      return {
        expression: formatted,
        numericValue: evaluateMathSafe(formatted),
      };
    } else {
      // In math mode: check last number token
      const lastOpIndex = Math.max(
        trimmed.lastIndexOf("+"),
        trimmed.lastIndexOf("-"),
        trimmed.lastIndexOf("×"),
        trimmed.lastIndexOf("*"),
        trimmed.lastIndexOf("÷"),
        trimmed.lastIndexOf("/"),
      );
      const prefix = trimmed.slice(0, lastOpIndex + 1);
      const suffix = trimmed.slice(lastOpIndex + 1).trim();
      const hasDec = isIndonesian ? suffix.includes(",") : suffix.includes(".");
      if (hasDec) {
        return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
      }
      const formatted = formatDecimalNumberToken(
        `${suffix}000`,
        maxDecimals,
        isIndonesian,
      );
      const next = `${prefix} ${formatted}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
  }

  // 5. DIGITS: "0" - "9"
  if (/^[0-9]$/.test(key)) {
    if (!trimmed || trimmed === "0") {
      if (key === "0") return { expression: "", numericValue: 0 };
      return { expression: key, numericValue: parseInt(key, 10) };
    }

    if (!/[+\-*/×÷]/.test(trimmed)) {
      const formatted = formatDecimalNumberToken(
        `${trimmed}${key}`,
        maxDecimals,
        isIndonesian,
      );
      return {
        expression: formatted,
        numericValue: evaluateMathSafe(formatted),
      };
    } else {
      const lastOpIndex = Math.max(
        trimmed.lastIndexOf("+"),
        trimmed.lastIndexOf("-"),
        trimmed.lastIndexOf("×"),
        trimmed.lastIndexOf("*"),
        trimmed.lastIndexOf("÷"),
        trimmed.lastIndexOf("/"),
      );
      const prefix = trimmed.slice(0, lastOpIndex + 1);
      const suffix = trimmed.slice(lastOpIndex + 1).trim();
      const formatted = formatDecimalNumberToken(
        `${suffix}${key}`,
        maxDecimals,
        isIndonesian,
      );
      const next = `${prefix} ${formatted}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
  }

  // 6. EVALUATE / DONE / "="
  if (key === "=" || key === "evaluate" || key === "done") {
    const num = Number(evaluateMathSafe(trimmed).toFixed(maxDecimals));
    if (num === 0) {
      return { expression: "", numericValue: 0 };
    }
    const formatted = num.toLocaleString(isIndonesian ? "id-ID" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
    return { expression: formatted, numericValue: num };
  }

  return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
}
