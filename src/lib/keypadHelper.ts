import { evaluateMathSafe } from "./evaluateMathSafe";

export interface KeypadInputOptions {
  allowDecimals?: boolean;
  maxDecimals?: number;
}

function formatDecimalNumberToken(token: string, maxDecimals: number): string {
  const cleaned = token.replace(/,/g, "");
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
  const intFormatted = intDigits
    ? parseInt(intDigits, 10).toLocaleString("en-US")
    : hasDot
      ? "0"
      : "";
  return hasDot ? `${intFormatted}.${decDigits}` : intFormatted;
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
  const allowDecimals = options?.allowDecimals ?? false;
  const maxDecimals = options?.maxDecimals ?? 2;
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

    if (allowDecimals) {
      const nextRaw = trimmed.slice(0, -1).trim();
      if (!nextRaw || nextRaw === "0") {
        return { expression: "", numericValue: 0 };
      }
      if (!/[+\-*/×÷]/.test(nextRaw)) {
        const formatted = formatDecimalNumberToken(nextRaw, maxDecimals);
        const num = parseFloat(formatted.replace(/,/g, "")) || 0;
        return { expression: formatted, numericValue: num };
      } else {
        const parts = nextRaw.split(/(\s*[+\-*/×÷]\s*)/);
        const lastToken = parts[parts.length - 1];
        if (lastToken) {
          parts[parts.length - 1] = formatDecimalNumberToken(
            lastToken,
            maxDecimals,
          );
        }
        const joined = parts.join("");
        return { expression: joined, numericValue: evaluateMathSafe(joined) };
      }
    }

    // Remove last character (integer / IDR mode)
    let next = trimmed.slice(0, -1).trim();
    // If ending with trailing thousand separator dot, remove it too
    if (next.endsWith(".")) {
      next = next.slice(0, -1);
    }

    if (!next) {
      return { expression: "", numericValue: 0 };
    }

    // Reformat trailing number if not an expression
    if (!/[+\-*/×÷]/.test(next)) {
      const rawDigits = next.replace(/\D/g, "");
      if (!rawDigits) {
        return { expression: "", numericValue: 0 };
      }
      const num = parseInt(rawDigits, 10);
      return {
        expression: num.toLocaleString("id-ID"),
        numericValue: num,
      };
    } else {
      // Reformat the last token if it's a number
      const parts = next.split(/(\s*[+\-*/×÷]\s*)/);
      const lastToken = parts[parts.length - 1].replace(/\D/g, "");
      if (lastToken) {
        const numToken = parseInt(lastToken, 10).toLocaleString("id-ID");
        parts[parts.length - 1] = numToken;
        next = parts.join("");
      }
      const num = evaluateMathSafe(next);
      return { expression: next, numericValue: num };
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
      return { expression: "0.", numericValue: 0 };
    }
    if (/[+\-*/×÷]\s*$/.test(trimmed)) {
      const next = `${trimmed}0.`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
    if (!/[+\-*/×÷]/.test(trimmed)) {
      if (trimmed.includes(".")) {
        return {
          expression: trimmed,
          numericValue: parseFloat(trimmed.replace(/,/g, "")) || 0,
        };
      }
      const formatted = formatDecimalNumberToken(`${trimmed}.`, maxDecimals);
      return {
        expression: formatted,
        numericValue: parseFloat(formatted.replace(/,/g, "")) || 0,
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
      if (suffix.includes(".")) {
        return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
      }
      const nextSuffix = suffix
        ? formatDecimalNumberToken(`${suffix}.`, maxDecimals)
        : "0.";
      const next = `${prefix} ${nextSuffix}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
  }

  // 4. TRIPLE ZERO: "000"
  if (key === "000") {
    if (!trimmed || trimmed === "0") {
      return { expression: "", numericValue: 0 };
    }
    // If ends with an operator (e.g. "50.000 + "), cannot append 000 directly
    if (/[+\-*/×÷]\s*$/.test(trimmed)) {
      return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
    }

    if (allowDecimals) {
      if (!/[+\-*/×÷]/.test(trimmed)) {
        const formatted = formatDecimalNumberToken(
          `${trimmed}000`,
          maxDecimals,
        );
        const num = parseFloat(formatted.replace(/,/g, "")) || 0;
        return { expression: formatted, numericValue: num };
      }
      return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
    }

    // If pure number (IDR integer mode)
    if (!/[+\-*/×÷]/.test(trimmed)) {
      const rawDigits = trimmed.replace(/\D/g, "");
      if (!rawDigits || rawDigits === "0") {
        return { expression: "", numericValue: 0 };
      }
      // Limit to 12 digits (hundreds of billions)
      const newDigits = (rawDigits + "000").slice(0, 12);
      const num = parseInt(newDigits, 10);
      return {
        expression: num.toLocaleString("id-ID"),
        numericValue: num,
      };
    } else {
      // In math mode: find last number token
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
      const raw = suffix.replace(/\D/g, "");
      if (!raw || raw === "0") {
        return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
      }
      const newDigits = (raw + "000").slice(0, 12);
      const num = parseInt(newDigits, 10);
      const next = `${prefix} ${num.toLocaleString("id-ID")}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
  }

  // 5. DIGITS: "0" - "9"
  if (/^[0-9]$/.test(key)) {
    if (allowDecimals) {
      if (!trimmed || trimmed === "0") {
        if (key === "0") return { expression: "", numericValue: 0 };
        return { expression: key, numericValue: parseInt(key, 10) };
      }
      if (!/[+\-*/×÷]/.test(trimmed)) {
        const formatted = formatDecimalNumberToken(
          `${trimmed}${key}`,
          maxDecimals,
        );
        const num = parseFloat(formatted.replace(/,/g, "")) || 0;
        return { expression: formatted, numericValue: num };
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
        );
        const next = `${prefix} ${formatted}`;
        return { expression: next, numericValue: evaluateMathSafe(next) };
      }
    }

    if (!trimmed || trimmed === "0") {
      if (key === "0") return { expression: "", numericValue: 0 };
      return { expression: key, numericValue: parseInt(key, 10) };
    }

    if (!/[+\-*/×÷]/.test(trimmed)) {
      const rawDigits = (trimmed.replace(/\D/g, "") + key).slice(0, 12);
      const num = parseInt(rawDigits, 10);
      return {
        expression: num.toLocaleString("id-ID"),
        numericValue: num,
      };
    } else {
      // Math expression mode
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
      const raw = suffix.replace(/\D/g, "");
      const newDigits = (raw + key).slice(0, 12);
      const num = parseInt(newDigits, 10);
      const next = `${prefix} ${num.toLocaleString("id-ID")}`;
      return { expression: next, numericValue: evaluateMathSafe(next) };
    }
  }

  // 6. EVALUATE / DONE / "="
  if (key === "=" || key === "evaluate" || key === "done") {
    if (allowDecimals) {
      const num = Number(evaluateMathSafe(trimmed).toFixed(maxDecimals));
      const formatted =
        num === 0
          ? ""
          : num.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: maxDecimals,
            });
      return { expression: formatted, numericValue: num };
    }
    const num = evaluateMathSafe(trimmed);
    const formatted = num === 0 ? "" : num.toLocaleString("id-ID");
    return { expression: formatted, numericValue: num };
  }

  return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
}
