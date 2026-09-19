import { evaluateMathSafe } from "./evaluateMathSafe";

/**
 * Handles keypad input events for transaction amounts.
 * Supports digits (0-9), triple zero ("000"), operators (+, -, ×, ÷), backspace ("backspace"),
 * clear ("clear"), and evaluation ("evaluate" / "=").
 */
export function applyKeypadInput(
  currentExpr: string,
  key: string
): { expression: string; numericValue: number } {
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

    // Remove last character
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

  // 4. TRIPLE ZERO: "000"
  if (key === "000") {
    if (!trimmed || trimmed === "0") {
      return { expression: "", numericValue: 0 };
    }
    // If ends with an operator (e.g. "50.000 + "), cannot append 000 directly
    if (/[+\-*/×÷]\s*$/.test(trimmed)) {
      return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
    }

    // If pure number
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
        trimmed.lastIndexOf("/")
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
        trimmed.lastIndexOf("/")
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
    const num = evaluateMathSafe(trimmed);
    const formatted = num === 0 ? "" : num.toLocaleString("id-ID");
    return { expression: formatted, numericValue: num };
  }

  return { expression: trimmed, numericValue: evaluateMathSafe(trimmed) };
}
