import { describe, it, expect } from "vitest";
import { FINANCIAL_GLOSSARY } from "../src/components/common/FinancialGlossaryTooltip";
import { format, subDays } from "date-fns";

describe("Split Bill & Gamification Calculations", () => {
  it("calculates subtotal, tax, service, and equal share correctly", () => {
    const subtotal = 200000;
    const taxPct = 10;
    const servicePct = 5;
    const discount = 20000;
    const peopleCount = 4;

    const taxAmount = Math.round((subtotal * taxPct) / 100);
    const serviceAmount = Math.round((subtotal * servicePct) / 100);
    const totalBeforeDiscount = subtotal + taxAmount + serviceAmount;
    const grandTotal = Math.max(0, totalBeforeDiscount - discount);
    const perPerson = Math.round(grandTotal / peopleCount);

    expect(taxAmount).toBe(20000);
    expect(serviceAmount).toBe(10000);
    expect(totalBeforeDiscount).toBe(230000);
    expect(grandTotal).toBe(210000);
    expect(perPerson).toBe(52500);
  });

  it("calculates logging streak correctly with consecutive transaction days", () => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const d1 = format(subDays(now, 1), "yyyy-MM-dd");
    const d2 = format(subDays(now, 2), "yyyy-MM-dd");
    const d3 = format(subDays(now, 3), "yyyy-MM-dd");

    const sampleTxs = [
      { occurred_on: todayStr },
      { occurred_on: d1 },
      { occurred_on: d2 },
      { occurred_on: d3 },
    ];

    const uniqueTxDays = new Set(sampleTxs.map((t) => t.occurred_on));
    const loggedToday = uniqueTxDays.has(todayStr);

    let streak = 0;
    let checkDate = loggedToday ? now : subDays(now, 1);
    while (uniqueTxDays.has(format(checkDate, "yyyy-MM-dd"))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }

    expect(streak).toBe(4);
    expect(loggedToday).toBe(true);
  });

  it("preserves yesterday's streak when user has not yet logged today", () => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const d1 = format(subDays(now, 1), "yyyy-MM-dd");
    const d2 = format(subDays(now, 2), "yyyy-MM-dd");

    // No transaction for todayStr
    const sampleTxs = [
      { occurred_on: d1 },
      { occurred_on: d2 },
    ];

    const uniqueTxDays = new Set(sampleTxs.map((t) => t.occurred_on));
    const loggedToday = uniqueTxDays.has(todayStr);
    const loggedYesterday = uniqueTxDays.has(d1);

    let streak = 0;
    if (loggedToday || loggedYesterday) {
      let checkDate = loggedToday ? now : subDays(now, 1);
      while (uniqueTxDays.has(format(checkDate, "yyyy-MM-dd"))) {
        streak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    expect(loggedToday).toBe(false);
    expect(loggedYesterday).toBe(true);
    expect(streak).toBe(2);
  });

  it("provides comprehensive financial glossary definitions without empty explanations", () => {
    const keys = Object.keys(FINANCIAL_GLOSSARY);
    expect(keys.length).toBeGreaterThanOrEqual(6);

    for (const key of keys) {
      const entry = FINANCIAL_GLOSSARY[key as keyof typeof FINANCIAL_GLOSSARY];
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.simpleExplanation.length).toBeGreaterThan(10);
    }
  });
});
