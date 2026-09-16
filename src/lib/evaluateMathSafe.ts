/**
 * Zero-eval safe arithmetic expression evaluator for financial transaction inputs.
 * Supports +, -, *, /, parentheses, Indonesian thousand separators (dot), and unicode symbols.
 */
export function evaluateMathSafe(expr: string): number {
  if (!expr) return 0;
  let normalized = expr.replace(/(\d)\.(\d{3})/g, "$1$2");
  normalized = normalized.replace(/,/g, "");
  normalized = normalized.replace(/×/g, "*").replace(/÷/g, "/");
  const sanitized = normalized.replace(/[^0-9+\-*/().]/g, "");
  if (!sanitized) return 0;

  try {
    const tokens: string[] = [];
    let numBuffer = "";
    for (let i = 0; i < sanitized.length; i++) {
      const ch = sanitized[i];
      if ((ch >= "0" && ch <= "9") || ch === ".") {
        numBuffer += ch;
      } else if ("+-*/()".includes(ch)) {
        if (numBuffer) {
          tokens.push(numBuffer);
          numBuffer = "";
        }
        tokens.push(ch);
      }
    }
    if (numBuffer) tokens.push(numBuffer);

    let index = 0;

    function parseFactor(): number {
      if (index >= tokens.length) return 0;
      const token = tokens[index];
      if (token === "(") {
        index++; // consume '('
        const result = parseExpression();
        if (index < tokens.length && tokens[index] === ")") index++; // consume ')'
        return result;
      }
      if (token === "-") {
        index++;
        return -parseFactor();
      }
      if (token === "+") {
        index++;
        return parseFactor();
      }
      index++;
      const val = parseFloat(token);
      return isNaN(val) ? 0 : val;
    }

    function parseTerm(): number {
      let result = parseFactor();
      while (index < tokens.length) {
        const op = tokens[index];
        if (op === "*" || op === "/") {
          index++;
          const nextFactor = parseFactor();
          result =
            op === "*"
              ? result * nextFactor
              : nextFactor !== 0
                ? result / nextFactor
                : 0;
        } else {
          break;
        }
      }
      return result;
    }

    function parseExpression(): number {
      let result = parseTerm();
      while (index < tokens.length) {
        const op = tokens[index];
        if (op === "+" || op === "-") {
          index++;
          const nextTerm = parseTerm();
          result = op === "+" ? result + nextTerm : result - nextTerm;
        } else {
          break;
        }
      }
      return result;
    }

    const res = parseExpression();
    if (typeof res === "number" && !isNaN(res) && isFinite(res) && res >= 0) {
      return Math.round(res);
    }
    return 0;
  } catch {
    return 0;
  }
}
