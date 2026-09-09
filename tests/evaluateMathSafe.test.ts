import { describe, it, expect } from "vitest";
import { evaluateMathSafe } from "../src/components/transactions/TransactionSheet";

describe("evaluateMathSafe (Zero-Eval Arithmetic Evaluator)", () => {
  it("evaluates simple addition and subtraction correctly", () => {
    expect(evaluateMathSafe("15000 + 5000")).toBe(20000);
    expect(evaluateMathSafe("50000 - 12500")).toBe(37500);
  });

  it("respects order of operations for multiplication and division", () => {
    expect(evaluateMathSafe("10000 + 5000 * 2")).toBe(20000);
    expect(evaluateMathSafe("50000 / 2 - 5000")).toBe(20000);
    expect(evaluateMathSafe("25000 * 4")).toBe(100000);
  });

  it("handles parentheses correctly", () => {
    expect(evaluateMathSafe("(10000 + 5000) * 2")).toBe(30000);
    expect(evaluateMathSafe("100000 / (2 + 3)")).toBe(20000);
  });

  it("handles Indonesian thousand dot separators and unicode symbols", () => {
    expect(evaluateMathSafe("15.000 + 5.000")).toBe(20000);
    expect(evaluateMathSafe("50.000 × 2")).toBe(100000);
    expect(evaluateMathSafe("60.000 ÷ 3")).toBe(20000);
  });

  it("handles raw digits and empty/invalid input safely without crashing", () => {
    expect(evaluateMathSafe("")).toBe(0);
    expect(evaluateMathSafe("50000")).toBe(50000);
    expect(evaluateMathSafe("abc")).toBe(0);
  });

  it("safely handles division by zero by returning 0", () => {
    expect(evaluateMathSafe("50000 / 0")).toBe(0);
  });
});
