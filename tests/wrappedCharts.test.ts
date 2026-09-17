import { describe, it, expect } from "vitest";
import {
  buildCascadeCategories,
  buildSpendingHeatmap,
  buildRunwayProjection,
} from "../src/lib/wrappedAnalytics";
import type { Transaction } from "../src/lib/types";

describe("Financial Wrapped Analytics & Chart Engines", () => {
  describe("Stacked Cascade Categories Builder", () => {
    it("formats top categories with accurate rank and relative percentages", () => {
      const mockSortedCats = [
        { name: "Food & Dining", total: 3000000, count: 25 },
        { name: "Rock & Gear", total: 2400000, count: 12 },
        { name: "Rhythm & Blues", total: 1700000, count: 8 },
        { name: "Pop Music", total: 500000, count: 4 },
        { name: "Blues", total: 400000, count: 2 },
        { name: "Other", total: 200000, count: 1 },
      ];
      const totalExpense = 10000000; // 10 Million total

      const cascade = buildCascadeCategories(mockSortedCats, totalExpense, 5);

      expect(cascade).toHaveLength(5);
      expect(cascade[0].name).toBe("Food & Dining");
      expect(cascade[0].percentage).toBe(30);
      expect(cascade[0].rank).toBe(1);

      expect(cascade[1].name).toBe("Rock & Gear");
      expect(cascade[1].percentage).toBe(24);
      expect(cascade[1].rank).toBe(2);

      expect(cascade[2].name).toBe("Rhythm & Blues");
      expect(cascade[2].percentage).toBe(17);

      expect(cascade[3].name).toBe("Pop Music");
      expect(cascade[3].percentage).toBe(5);

      expect(cascade[4].name).toBe("Blues");
      expect(cascade[4].percentage).toBe(4);
    });

    it("handles empty categories gracefully", () => {
      const cascade = buildCascadeCategories([], 100000);
      expect(cascade).toEqual([]);
    });
  });

  describe("Spending Heatmap Matrix Engine", () => {
    it("calculates daily intensities across a month and identifies peak spend day", () => {
      const mockTxs: Transaction[] = [
        {
          id: "tx-1",
          user_id: "u1",
          amount: 50000,
          category_id: "c1",
          wallet_id: "w1",
          to_wallet_id: null,
          type: "expense",
          note: "Coffee",
          occurred_on: "2026-09-02",
          created_at: "2026-09-02T10:00:00Z",
        },
        {
          id: "tx-2",
          user_id: "u1",
          amount: 500000,
          category_id: "c1",
          wallet_id: "w1",
          to_wallet_id: null,
          type: "expense",
          note: "Big Dinner",
          occurred_on: "2026-09-15",
          created_at: "2026-09-15T20:00:00Z",
        },
      ];

      const heatmap = buildSpendingHeatmap(mockTxs, 2026, 9);

      expect(heatmap.days).toHaveLength(30); // September has 30 days
      expect(heatmap.peakDay).not.toBeNull();
      expect(heatmap.peakDay?.day).toBe(15);
      expect(heatmap.peakDay?.amount).toBe(500000);
      expect(heatmap.peakDay?.intensity).toBe(4);

      // Day 2 should have lower intensity
      const day2 = heatmap.days.find((d) => d.day === 2);
      expect(day2?.amount).toBe(50000);
      expect(day2?.intensity).toBeGreaterThan(0);

      // Day 1 has 0 spend
      const day1 = heatmap.days.find((d) => d.day === 1);
      expect(day1?.amount).toBe(0);
      expect(day1?.intensity).toBe(0);

      expect(heatmap.zeroSpendDaysCount).toBe(28);
      expect(heatmap.activeSpendDaysCount).toBe(2);
    });
  });

  describe("Multi-Horizon Runway Projection Engine", () => {
    it("extrapolates wealth retention across future periods", () => {
      const totalIncome = 10000000;
      const totalExpense = 6000000; // 4 Million net monthly surplus

      const projection = buildRunwayProjection(totalIncome, totalExpense);

      expect(projection.monthlyPace).toBe(4000000);
      expect(projection.points).toHaveLength(7);
      expect(projection.points[0].amount).toBe(0); // Present
      expect(projection.points[1].amount).toBe(4000000); // +1 Mo
      expect(projection.terminalProjectedSurplus).toBeGreaterThan(20000000); // +6 Mo
    });
  });
});
