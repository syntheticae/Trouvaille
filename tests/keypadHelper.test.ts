import { describe, it, expect } from "vitest";
import { applyKeypadInput } from "../src/lib/keypadHelper";

describe("Transaction Keypad Input Helper", () => {
  it("enters numbers sequentially", () => {
    let state = applyKeypadInput("", "5");
    expect(state.expression).toBe("5");
    expect(state.numericValue).toBe(5);

    state = applyKeypadInput(state.expression, "0");
    expect(state.expression).toBe("50");
    expect(state.numericValue).toBe(50);
  });

  it("appends 000 with Indonesian thousand separator", () => {
    // 5 -> 5.000
    let state = applyKeypadInput("5", "000");
    expect(state.expression).toBe("5.000");
    expect(state.numericValue).toBe(5000);

    // 75 -> 75.000
    state = applyKeypadInput("75", "000");
    expect(state.expression).toBe("75.000");
    expect(state.numericValue).toBe(75000);

    // 75.000 -> 75.000.000
    state = applyKeypadInput("75.000", "000");
    expect(state.expression).toBe("75.000.000");
    expect(state.numericValue).toBe(75000000);
  });

  it("handles backspace accurately", () => {
    let state = applyKeypadInput("50.000", "backspace");
    expect(state.expression).toBe("5.000");
    expect(state.numericValue).toBe(5000);

    state = applyKeypadInput("50.000 + ", "backspace");
    expect(state.expression).toBe("50.000");
    expect(state.numericValue).toBe(50000);
  });

  it("handles arithmetic operators and evaluation", () => {
    let state = applyKeypadInput("150.000", "÷");
    expect(state.expression).toBe("150.000 ÷ ");

    state = applyKeypadInput(state.expression, "3");
    expect(state.expression).toBe("150.000 ÷ 3");

    state = applyKeypadInput(state.expression, "=");
    expect(state.expression).toBe("50.000");
    expect(state.numericValue).toBe(50000);
  });

  it("handles split bill calculation with 000", () => {
    let state = applyKeypadInput("", "2");
    state = applyKeypadInput(state.expression, "5");
    state = applyKeypadInput(state.expression, "000"); // 25.000
    expect(state.expression).toBe("25.000");

    state = applyKeypadInput(state.expression, "×");
    state = applyKeypadInput(state.expression, "4");
    expect(state.expression).toBe("25.000 × 4");

    state = applyKeypadInput(state.expression, "=");
    expect(state.expression).toBe("100.000");
    expect(state.numericValue).toBe(100000);
  });

  it("clears correctly with C", () => {
    const state = applyKeypadInput("100.000", "C");
    expect(state.expression).toBe("");
    expect(state.numericValue).toBe(0);
  });

  it("handles decimal inputs with commas and dots seamlessly in Indonesian mode", () => {
    // 50.000 + , -> 50.000,
    let state = applyKeypadInput("50.000", ",");
    expect(state.expression).toBe("50.000,");
    expect(state.numericValue).toBe(50000);

    state = applyKeypadInput(state.expression, "5");
    expect(state.expression).toBe("50.000,5");
    expect(state.numericValue).toBe(50000.5);

    state = applyKeypadInput(state.expression, "0");
    expect(state.expression).toBe("50.000,50");
    expect(state.numericValue).toBe(50000.5);

    // Pressing . also maps to decimal separator in Indonesian mode
    let stateDot = applyKeypadInput("10.000", ".");
    expect(stateDot.expression).toBe("10.000,");
    expect(stateDot.numericValue).toBe(10000);

    stateDot = applyKeypadInput(stateDot.expression, "7");
    expect(stateDot.expression).toBe("10.000,7");
    expect(stateDot.numericValue).toBe(10000.7);
  });

  it("handles decimal inputs in English mode with dot separator", () => {
    let stateUS = applyKeypadInput("50,000", ".", { isIndonesian: false });
    expect(stateUS.expression).toBe("50,000.");
    expect(stateUS.numericValue).toBe(50000);

    stateUS = applyKeypadInput(stateUS.expression, "2", { isIndonesian: false });
    expect(stateUS.expression).toBe("50,000.2");
    expect(stateUS.numericValue).toBe(50000.2);

    stateUS = applyKeypadInput(stateUS.expression, "5", { isIndonesian: false });
    expect(stateUS.expression).toBe("50,000.25");
    expect(stateUS.numericValue).toBe(50000.25);
  });
});
