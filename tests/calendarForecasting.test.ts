import { describe, it, expect } from "vitest";
import { calculateMonthCalendarRunway } from "../src/lib/calendarForecasting";
import type { Transaction, Bill } from "../src/lib/types";
import type { DetectedRecurringItem } from "../src/lib/financialMath";

describe("Calendar Cashflow Runway Forecasting Engine Suite", () => {
  const referenceDate = new Date("2026-09-15T12:00:00Z");

  const mockTransactions: Transaction[] = [
    // Past income
    {
      id: "t1",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-salary",
      amount: 15000000,
      type: "income",
      occurred_on: "2026-09-01",
      created_at: "2026-09-01T00:00:00Z",
    },
    // Past expense on Sep 2
    {
      id: "t2",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-food",
      amount: 150000,
      type: "expense",
      occurred_on: "2026-09-02",
      created_at: "2026-09-02T00:00:00Z",
    },
    // Sep 3 was a No-Spend Day (no transactions)
    // Expense on Sep 4
    {
      id: "t3",
      user_id: "u1",
      wallet_id: "w1",
      category_id: "c-transport",
      amount: 50000,
      type: "expense",
      occurred_on: "2026-09-04",
      created_at: "2026-09-04T00:00:00Z",
    },
  ];

  const mockBills: Bill[] = [
    // Past paid bill
    {
      id: "b1",
      user_id: "u1",
      title: "Internet",
      amount: 450000,
      due_date: "2026-09-05",
      is_paid: true,
      created_at: "2026-09-01T00:00:00Z",
    },
    // Upcoming unpaid bill on Sep 20
    {
      id: "b2",
      user_id: "u1",
      title: "Rent",
      amount: 3500000,
      due_date: "2026-09-20",
      is_paid: false,
      created_at: "2026-09-01T00:00:00Z",
    },
    // Upcoming unpaid bill on Sep 25
    {
      id: "b3",
      user_id: "u1",
      title: "Electricity",
      amount: 750000,
      due_date: "2026-09-25",
      is_paid: false,
      created_at: "2026-09-01T00:00:00Z",
    },
  ];

  const mockRecurring: DetectedRecurringItem[] = [
    {
      id: "rec-salary",
      title: "Main Salary",
      normalizedMerchant: "company",
      categoryId: "c-salary",
      categoryName: "Salary",
      categoryEmoji: "briefcase",
      walletId: "w1",
      type: "income",
      frequency: "monthly",
      typicalAmount: 18000000,
      amountRange: [18000000, 18000000],
      confidence: "strong",
      occurrencesCount: 6,
      lastOccurrenceDate: "2026-08-28",
      nextExpectedDate: "2026-09-28",
      status: "confirmed",
      matchingTransactionIds: [],
      explanation: "Consistent monthly paycheck",
    },
  ];

  it("classifies past, today, and future days correctly", () => {
    const result = calculateMonthCalendarRunway({
      year: 2026,
      month: 9,
      transactions: mockTransactions,
      bills: mockBills,
      currentLiquidAssets: 10000000,
      recurringItems: mockRecurring,
      referenceDate,
    });

    expect(result.days.length).toBe(30);

    const day1 = result.days.find((d) => d.date === "2026-09-01");
    expect(day1?.isPast).toBe(true);
    expect(day1?.isToday).toBe(false);
    expect(day1?.isFuture).toBe(false);

    const day15 = result.days.find((d) => d.date === "2026-09-15");
    expect(day15?.isToday).toBe(true);
    expect(day15?.isPast).toBe(false);
    expect(day15?.isFuture).toBe(false);

    const day20 = result.days.find((d) => d.date === "2026-09-20");
    expect(day20?.isFuture).toBe(true);
    expect(day20?.isToday).toBe(false);
  });

  it("calculates No-Spend Days accurately for past dates", () => {
    const result = calculateMonthCalendarRunway({
      year: 2026,
      month: 9,
      transactions: mockTransactions,
      bills: mockBills,
      currentLiquidAssets: 10000000,
      recurringItems: mockRecurring,
      referenceDate,
    });

    const day2 = result.days.find((d) => d.date === "2026-09-02");
    expect(day2?.actualOutflow).toBe(150000);
    expect(day2?.isNoSpendDay).toBe(false);

    const day3 = result.days.find((d) => d.date === "2026-09-03");
    expect(day3?.actualOutflow).toBe(0);
    expect(day3?.isNoSpendDay).toBe(true);

    // Days 1 through 14 are past (14 days). Sep 2 and Sep 4 had expenses.
    // 14 - 2 = 12 No-Spend Days
    expect(result.totalPastDaysCount).toBe(14);
    expect(result.noSpendDaysCount).toBe(12);
  });

  it("forward-projects daily liquid balance with bills and recurring salary", () => {
    const startBalance = 10000000;
    const dailyBurn = 100000;

    const result = calculateMonthCalendarRunway({
      year: 2026,
      month: 9,
      transactions: mockTransactions,
      bills: mockBills,
      currentLiquidAssets: startBalance,
      recurringItems: mockRecurring,
      dailyBaselineBurn: dailyBurn,
      referenceDate,
    });

    // Sep 16 (first future day): startBalance - dailyBurn = 9.9M
    const day16 = result.days.find((d) => d.date === "2026-09-16");
    expect(day16?.projectedBalance).toBe(startBalance - dailyBurn);

    // Sep 20: 5 future days (16..20) * 100k burn = 500k + 3.5M Rent = 4.0M deducted
    // 10M - 4M = 6.0M
    const day20 = result.days.find((d) => d.date === "2026-09-20");
    expect(day20?.billsTotal).toBe(3500000);
    expect(day20?.projectedBalance).toBe(6000000);

    // Sep 28 is Payday (+18M)
    const day28 = result.days.find((d) => d.date === "2026-09-28");
    expect(day28?.isPayday).toBe(true);
    expect(day28?.expectedInflowsTotal).toBe(18000000);
    expect(day28?.projectedBalance).toBeGreaterThan(20000000);
  });

  it("detects lowest cash dip (runway floor) and days countdown", () => {
    const result = calculateMonthCalendarRunway({
      year: 2026,
      month: 9,
      transactions: mockTransactions,
      bills: mockBills,
      currentLiquidAssets: 10000000,
      recurringItems: mockRecurring,
      dailyBaselineBurn: 100000,
      referenceDate,
    });

    // Lowest dip happens right before the Payday on Sep 28 (likely Sep 27 after Sep 20 & Sep 25 bills)
    expect(result.lowestDipDate).toBe("2026-09-27");
    expect(result.lowestDipAmount).toBeLessThan(6000000);
    expect(result.daysUntilLowestDip).toBe(12); // Sep 15 to Sep 27 = 12 days

    const dipDay = result.days.find((d) => d.date === result.lowestDipDate);
    expect(dipDay?.isLowestDip).toBe(true);
  });

  it("detects Payday horizon countdown accurately", () => {
    const result = calculateMonthCalendarRunway({
      year: 2026,
      month: 9,
      transactions: mockTransactions,
      bills: mockBills,
      currentLiquidAssets: 10000000,
      recurringItems: mockRecurring,
      referenceDate,
    });

    expect(result.nextPaydayDate).toBe("2026-09-28");
    expect(result.daysUntilPayday).toBe(13); // Sep 15 to Sep 28 = 13 days
    expect(result.nextPaydayAmount).toBe(18000000);
  });

  it("matches transactions with full ISO timestamps (YYYY-MM-DDTHH:mm:ss) to their calendar day", () => {
    const isoTransactions: Transaction[] = [
      ...mockTransactions,
      {
        id: "t-iso-1",
        user_id: "u1",
        wallet_id: "w1",
        category_id: "c-food",
        amount: 275000,
        type: "expense",
        occurred_on: "2026-09-06T14:25:10",
        created_at: "2026-09-06T14:25:10Z",
      },
      {
        id: "t-iso-2",
        user_id: "u1",
        wallet_id: "w1",
        category_id: "c-bonus",
        amount: 500000,
        type: "income",
        occurred_on: "2026-09-06T19:05:00",
        created_at: "2026-09-06T19:05:00Z",
      },
    ];

    const result = calculateMonthCalendarRunway({
      year: 2026,
      month: 9,
      transactions: isoTransactions,
      bills: mockBills,
      currentLiquidAssets: 10000000,
      recurringItems: mockRecurring,
      referenceDate,
    });

    const day6 = result.days.find((d) => d.date === "2026-09-06");
    expect(day6?.transactionsCount).toBe(2);
    expect(day6?.actualOutflow).toBe(275000);
    expect(day6?.actualInflow).toBe(500000);
    expect(day6?.netActualCashflow).toBe(225000);
    expect(day6?.isNoSpendDay).toBe(false);
  });
});
