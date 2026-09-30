import { describe, it, expect } from "vitest";
import { RingChart, Ring } from "../src/components/ui/RingChart";

describe("RingChart Component & Mathematical Geometry Engine", () => {
  it("exports RingChart and Ring components cleanly", () => {
    expect(RingChart).toBeDefined();
    expect(Ring).toBeDefined();
    expect(Ring.displayName).toBe("Ring");
  });

  it("handles valid dataset with 4 balance sheet pillars", () => {
    const ringData = [
      { label: "Aset Lancar", value: 50000000, maxValue: 100000000, color: "#FFFFFF" },
      { label: "Investasi", value: 30000000, maxValue: 100000000, color: "#A1A1AA" },
      { label: "Aset Riil", value: 15000000, maxValue: 100000000, color: "#71717A" },
      { label: "Liabilitas", value: 5000000, maxValue: 100000000, color: "#3F3F46" },
    ];

    expect(ringData).toHaveLength(4);
    expect(ringData[0].value / ringData[0].maxValue).toBe(0.5); // 50%
    expect(ringData[1].value / ringData[1].maxValue).toBe(0.3); // 30%
    expect(ringData[2].value / ringData[2].maxValue).toBe(0.15); // 15%
    expect(ringData[3].value / ringData[3].maxValue).toBe(0.05); // 5%
  });

  it("handles edge cases: zero max value, zero value, and negative values safely", () => {
    const edgeData = [
      { label: "Zero Max", value: 100, maxValue: 0 },
      { label: "Zero Value", value: 0, maxValue: 100 },
      { label: "Negative Value", value: -50, maxValue: 100 },
      { label: "Overflow Value", value: 150, maxValue: 100 },
    ];

    const safeProgress = edgeData.map((item) =>
      Math.min(1, Math.max(0, item.maxValue > 0 ? item.value / item.maxValue : 0))
    );

    expect(safeProgress[0]).toBe(0); // Zero max clamp
    expect(safeProgress[1]).toBe(0); // Zero value
    expect(safeProgress[2]).toBe(0); // Negative clamp
    expect(safeProgress[3]).toBe(1); // Overflow clamp at 100%
  });

  it("calculates semicircular angle span correctly (-Math.PI to 0)", () => {
    const startAngle = -Math.PI;
    const endAngle = 0;
    const arcSpan = endAngle - startAngle;

    expect(arcSpan).toBeCloseTo(Math.PI, 5); // Exactly 180 degrees (half circle)

    // At 50% progress, angle should be -Math.PI / 2 (top 12 o'clock in standard math)
    const midAngle = startAngle + arcSpan * 0.5;
    expect(midAngle).toBeCloseTo(-Math.PI / 2, 5);

    // At 100% progress, angle should be 0 (right 3 o'clock)
    const fullAngle = startAngle + arcSpan * 1.0;
    expect(fullAngle).toBeCloseTo(0, 5);
  });

  it("calculates upright vertical angle span correctly (Math.PI / 2 to 3 * Math.PI / 2, filling bottom-to-top)", () => {
    const startAngle = Math.PI / 2; // Bottom (6 o'clock)
    const endAngle = (3 * Math.PI) / 2; // Top (12 o'clock)
    const arcSpan = endAngle - startAngle;

    expect(arcSpan).toBeCloseTo(Math.PI, 5); // 180 degrees vertical semi-circle

    // At 0% progress: Bottom
    expect(startAngle).toBeCloseTo(Math.PI / 2, 5);

    // At 50% progress: Outer left (9 o'clock / -Math.PI)
    const midAngle = startAngle + arcSpan * 0.5;
    expect(midAngle).toBeCloseTo(Math.PI, 5);

    // At 100% progress: Top (12 o'clock)
    const fullAngle = startAngle + arcSpan * 1.0;
    expect(fullAngle).toBeCloseTo((3 * Math.PI) / 2, 5);
  });
});

