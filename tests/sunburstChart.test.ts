import { describe, it, expect } from "vitest";
import { polarToCartesian, describeArc } from "../src/archive/components/charts/SunburstChart";

describe("SunburstChart Polar Geometry Engine", () => {
  it("converts polar angles to cartesian coordinates correctly (12 o'clock = 0 deg)", () => {
    const cx = 0;
    const cy = 0;
    const r = 100;

    // 0 deg: Top (12 o'clock) -> x ~ 0, y ~ -100
    const top = polarToCartesian(cx, cy, r, 0);
    expect(top.x).toBeCloseTo(0, 5);
    expect(top.y).toBeCloseTo(-100, 5);

    // 90 deg: Right (3 o'clock) -> x ~ 100, y ~ 0
    const right = polarToCartesian(cx, cy, r, 90);
    expect(right.x).toBeCloseTo(100, 5);
    expect(right.y).toBeCloseTo(0, 5);

    // 180 deg: Bottom (6 o'clock) -> x ~ 0, y ~ 100
    const bottom = polarToCartesian(cx, cy, r, 180);
    expect(bottom.x).toBeCloseTo(0, 5);
    expect(bottom.y).toBeCloseTo(100, 5);

    // 270 deg: Left (9 o'clock) -> x ~ -100, y ~ 0
    const left = polarToCartesian(cx, cy, r, 270);
    expect(left.x).toBeCloseTo(-100, 5);
    expect(left.y).toBeCloseTo(0, 5);
  });

  it("generates a valid SVG path for standard annular arc slices", () => {
    const path = describeArc(0, 0, 50, 100, 0, 90);
    expect(path).toBeTruthy();
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).not.toContain("NaN");
  });

  it("handles large angle sweeps (> 180 degrees) with largeArcFlag=1", () => {
    const path = describeArc(0, 0, 50, 100, 0, 240);
    expect(path).toContain(" 1 1 ");
    expect(path).not.toContain("NaN");
  });

  it("returns empty string when sweep angle is zero or inverted", () => {
    const emptyPathZero = describeArc(0, 0, 50, 100, 90, 90);
    expect(emptyPathZero).toBe("");

    const emptyPathNegative = describeArc(0, 0, 50, 100, 120, 60);
    expect(emptyPathNegative).toBe("");
  });

  it("handles full 360-degree circle without SVG rendering glitches", () => {
    const fullCircle = describeArc(0, 0, 50, 100, 0, 360);
    expect(fullCircle).toBeTruthy();
    expect(fullCircle.startsWith("M ")).toBe(true);
    expect(fullCircle.endsWith("Z")).toBe(true);
    expect(fullCircle).not.toContain("NaN");
  });
});

describe("Sunburst Hierarchical Partition Invariants", () => {
  it("correctly partitions parent and child angles proportionally", () => {
    const totalAmount = 1000000;
    const parentAmount = 600000; // 60% of total -> 216 deg
    const child1Amount = 400000; // 40% of total (66.6% of parent)
    const child2Amount = 200000; // 20% of total (33.3% of parent)

    const parentSweep = (parentAmount / totalAmount) * 360;
    expect(parentSweep).toBeCloseTo(216, 5);

    const child1Sweep = (child1Amount / parentAmount) * parentSweep;
    const child2Sweep = (child2Amount / parentAmount) * parentSweep;

    expect(child1Sweep + child2Sweep).toBeCloseTo(parentSweep, 5);
    expect(child1Sweep).toBeCloseTo(144, 5);
    expect(child2Sweep).toBeCloseTo(72, 5);
  });
});
