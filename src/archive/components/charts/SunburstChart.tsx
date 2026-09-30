import { useState, useMemo, useCallback } from "react";
import { formatRupiah } from "../../../lib/utils";
import { triggerHaptic } from "../../../lib/haptics";
import { useTheme } from "../../../contexts/ThemeContext";

export interface SunburstChildNode {
  id: string;
  name: string;
  value: number;
  color?: string;
  parentId: string;
  count?: number;
  metadata?: any;
}

export interface SunburstParentNode {
  id: string;
  name: string;
  value: number;
  color?: string;
  children: SunburstChildNode[];
  count?: number;
  metadata?: any;
}

export interface SunburstChartProps {
  data: SunburstParentNode[];
  totalValue?: number;
  title?: string;
  unitLabel?: string;
  onSelectNode?: (node: {
    id: string;
    name: string;
    value: number;
    tier: "parent" | "child" | "root";
    percentage: number;
    parentId?: string;
  } | null) => void;
  height?: number | string;
  className?: string;
}

interface ComputedArc {
  id: string;
  name: string;
  value: number;
  tier: "parent" | "child";
  parentId?: string;
  r0: number;
  r1: number;
  startAngle: number;
  endAngle: number;
  color: string;
  percentage: number;
  pathD: string;
}

/**
 * Converts polar coordinates to cartesian (x, y).
 * 0 degrees points straight UP (12 o'clock).
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generates an SVG path string for a ring arc segment.
 */
export function describeArc(
  cx: number,
  cy: number,
  r0: number, // inner radius
  r1: number, // outer radius
  startAngle: number,
  endAngle: number,
): string {
  // Clamp angle sweep
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return "";

  // If full circle (360 degrees), split into two 180 deg halves to avoid SVG arc glitch
  if (sweep >= 359.99) {
    const p1_outer = polarToCartesian(cx, cy, r1, 0);
    const p2_outer = polarToCartesian(cx, cy, r1, 180);
    const p1_inner = polarToCartesian(cx, cy, r0, 0);
    const p2_inner = polarToCartesian(cx, cy, r0, 180);

    return [
      `M ${p1_outer.x} ${p1_outer.y}`,
      `A ${r1} ${r1} 0 0 1 ${p2_outer.x} ${p2_outer.y}`,
      `A ${r1} ${r1} 0 0 1 ${p1_outer.x} ${p1_outer.y}`,
      `M ${p1_inner.x} ${p1_inner.y}`,
      `A ${r0} ${r0} 0 0 0 ${p2_inner.x} ${p2_inner.y}`,
      `A ${r0} ${r0} 0 0 0 ${p1_inner.x} ${p1_inner.y}`,
      "Z",
    ].join(" ");
  }

  const p0_outer = polarToCartesian(cx, cy, r1, startAngle);
  const p1_outer = polarToCartesian(cx, cy, r1, endAngle);
  const p1_inner = polarToCartesian(cx, cy, r0, endAngle);
  const p0_inner = polarToCartesian(cx, cy, r0, startAngle);

  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${p0_outer.x} ${p0_outer.y}`,
    `A ${r1} ${r1} 0 ${largeArcFlag} 1 ${p1_outer.x} ${p1_outer.y}`,
    `L ${p1_inner.x} ${p1_inner.y}`,
    `A ${r0} ${r0} 0 ${largeArcFlag} 0 ${p0_inner.x} ${p0_inner.y}`,
    "Z",
  ].join(" ");
}

// Monochrome luxury palettes (Parent Tier)
const MONOCHROME_PALETTE_DARK = [
  "#FFFFFF",
  "#E4E4E7", // zinc-200
  "#D4D4D8", // zinc-300
  "#A1A1AA", // zinc-400
  "#8E8E93", // apple system gray
  "#71717A", // zinc-500
  "#52525B", // zinc-600
  "#3F3F46", // zinc-700
];

const MONOCHROME_PALETTE_LIGHT = [
  "#18181B", // zinc-900
  "#27272A", // zinc-800
  "#3F3F46", // zinc-700
  "#52525B", // zinc-600
  "#71717A", // zinc-500
  "#8E8E93", // gray
  "#A1A1AA", // zinc-400
  "#D4D4D8", // zinc-300
];

export function SunburstChart({
  data,
  totalValue: explicitTotal,
  title: _title = "Total Allocation",
  unitLabel = "Outflow",
  onSelectNode,
  height = 320,
  className = "",
}: SunburstChartProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Compute aggregate total from data if not explicitly provided
  const computedTotal = useMemo(() => {
    if (explicitTotal !== undefined && explicitTotal > 0) return explicitTotal;
    return data.reduce((sum, p) => sum + (p.value || 0), 0);
  }, [data, explicitTotal]);

  const palette = isDark ? MONOCHROME_PALETTE_DARK : MONOCHROME_PALETTE_LIGHT;

  // Geometry constants
  const cx = 0;
  const cy = 0;
  const rTier1_in = 56;
  const rTier1_out = 94;
  const rTier2_in = 99;
  const rTier2_out = 138;
  const padAngle = 1.2; // degrees gap between segments

  // Calculate layout arcs for Tier 1 (Parents) and Tier 2 (Children)
  const computedArcs = useMemo(() => {
    if (computedTotal <= 0 || !data.length) return [];

    const arcs: ComputedArc[] = [];
    let currentParentStartAngle = 0;

    data.forEach((parent, pIndex) => {
      const parentVal = parent.value || 0;
      if (parentVal <= 0) return;

      const parentRatio = parentVal / computedTotal;
      const parentSweepAngle = parentRatio * 360;
      const parentEndAngle = currentParentStartAngle + parentSweepAngle;

      const parentEffectiveStart = currentParentStartAngle + padAngle / 2;
      const parentEffectiveEnd = Math.max(
        parentEffectiveStart,
        parentEndAngle - padAngle / 2,
      );

      const parentColor =
        parent.color || palette[pIndex % palette.length];

      // Tier 1 Arc
      const parentPath = describeArc(
        cx,
        cy,
        rTier1_in,
        rTier1_out,
        parentEffectiveStart,
        parentEffectiveEnd,
      );

      arcs.push({
        id: parent.id,
        name: parent.name,
        value: parentVal,
        tier: "parent",
        r0: rTier1_in,
        r1: rTier1_out,
        startAngle: parentEffectiveStart,
        endAngle: parentEffectiveEnd,
        color: parentColor,
        percentage: Math.round(parentRatio * 1000) / 10,
        pathD: parentPath,
      });

      // Compute Tier 2 Arcs (Children of this parent)
      const validChildren = (parent.children || []).filter((c) => (c.value || 0) > 0);
      const childSum = validChildren.reduce((s, c) => s + c.value, 0);

      if (validChildren.length > 0 && childSum > 0) {
        let currentChildStartAngle = currentParentStartAngle;

        validChildren.forEach((child, cIndex) => {
          const childProportionOfParent = child.value / childSum;
          const childSweepAngle = childProportionOfParent * parentSweepAngle;
          const childEndAngle = currentChildStartAngle + childSweepAngle;

          const childEffectiveStart = currentChildStartAngle + padAngle / 2;
          const childEffectiveEnd = Math.max(
            childEffectiveStart,
            childEndAngle - padAngle / 2,
          );

          // Subtly lighter/more translucent version of parent's hue
          const childColor =
            child.color ||
            (isDark
              ? `rgba(255, 255, 255, ${Math.max(0.25, 0.7 - cIndex * 0.12)})`
              : `rgba(24, 24, 27, ${Math.max(0.25, 0.7 - cIndex * 0.12)})`);

          const childRatio = child.value / computedTotal;
          const childPath = describeArc(
            cx,
            cy,
            rTier2_in,
            rTier2_out,
            childEffectiveStart,
            childEffectiveEnd,
          );

          arcs.push({
            id: child.id,
            name: child.name,
            value: child.value,
            tier: "child",
            parentId: parent.id,
            r0: rTier2_in,
            r1: rTier2_out,
            startAngle: childEffectiveStart,
            endAngle: childEffectiveEnd,
            color: childColor,
            percentage: Math.round(childRatio * 1000) / 10,
            pathD: childPath,
          });

          currentChildStartAngle = childEndAngle;
        });
      }

      currentParentStartAngle = parentEndAngle;
    });

    return arcs;
  }, [computedTotal, data, palette, isDark]);

  // Lookup map for fast active node inspection
  const arcMap = useMemo(() => {
    const map = new Map<string, ComputedArc>();
    computedArcs.forEach((a) => map.set(a.id, a));
    return map;
  }, [computedArcs]);

  // Handle slice interaction
  const handleSliceClick = useCallback(
    (arc: ComputedArc) => {
      triggerHaptic("light");
      if (activeNodeId === arc.id) {
        // Toggle off
        setActiveNodeId(null);
        if (onSelectNode) onSelectNode(null);
      } else {
        setActiveNodeId(arc.id);
        if (onSelectNode) {
          onSelectNode({
            id: arc.id,
            name: arc.name,
            value: arc.value,
            tier: arc.tier,
            percentage: arc.percentage,
            parentId: arc.parentId,
          });
        }
      }
    },
    [activeNodeId, onSelectNode],
  );

  const handleCenterClick = useCallback(() => {
    triggerHaptic("light");
    setActiveNodeId(null);
    if (onSelectNode) onSelectNode(null);
  }, [onSelectNode]);

  // Active slice telemetry
  const activeArc = activeNodeId ? arcMap.get(activeNodeId) : null;
  const parentOfActive =
    activeArc?.tier === "child" && activeArc.parentId
      ? arcMap.get(activeArc.parentId)
      : null;

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{ height }}
    >
      <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
        <svg
          viewBox="-145 -145 290 290"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Ambient inner halo filter */}
            <filter id="sunburstActiveGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor={isDark ? "#FFFFFF" : "#000000"}
                floodOpacity={isDark ? "0.45" : "0.3"}
              />
            </filter>
          </defs>

          {/* Background Concentric Subtle Track Guides */}
          <circle
            cx={0}
            cy={0}
            r={rTier1_in}
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
            strokeWidth="1"
          />
          <circle
            cx={0}
            cy={0}
            r={rTier1_out}
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx={0}
            cy={0}
            r={rTier2_out}
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
            strokeWidth="1"
          />

          {/* Render All Arc Segments */}
          {computedArcs.map((arc) => {
            const isSelfActive = activeNodeId === arc.id;
            const isFamilyActive =
              activeArc &&
              ((activeArc.tier === "parent" && arc.parentId === activeArc.id) ||
                (activeArc.tier === "child" &&
                  (arc.id === activeArc.parentId ||
                    (arc.parentId === activeArc.parentId &&
                      arc.id === activeArc.id))));

            const isDimmed =
              activeNodeId !== null && !isSelfActive && !isFamilyActive;

            return (
              <path
                key={arc.id}
                d={arc.pathD}
                fill={arc.color}
                stroke={isDark ? "#09090C" : "#FFFFFF"}
                strokeWidth={isSelfActive ? "2.5" : "1.2"}
                strokeLinejoin="round"
                filter={isSelfActive ? "url(#sunburstActiveGlow)" : undefined}
                className="cursor-pointer transition-all duration-300"
                style={{
                  opacity: isDimmed ? 0.22 : 1,
                  transform: isSelfActive ? "scale(1.02)" : "scale(1)",
                  transformOrigin: "0 0",
                }}
                onClick={() => handleSliceClick(arc)}
              >
                <title>
                  {`${arc.name} (${arc.tier === "parent" ? "Sector" : "Category"}): ${formatRupiah(arc.value)} (${arc.percentage}%)`}
                </title>
              </path>
            );
          })}

          {/* Center Donut Interactive Touch Target */}
          <circle
            cx={0}
            cy={0}
            r={rTier1_in - 3}
            fill="transparent"
            className="cursor-pointer"
            onClick={handleCenterClick}
          />
        </svg>

        {/* Center Donut Hole Content Overlay */}
        <div
          className="absolute flex flex-col items-center justify-center text-center pointer-events-auto cursor-pointer max-w-[104px] p-1"
          onClick={handleCenterClick}
        >
          {activeArc ? (
            <>
              {/* Active Slice Badge */}
              <span
                className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-0.5 truncate max-w-full"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {activeArc.tier === "parent"
                  ? "Sector"
                  : parentOfActive?.name || "Child"}
              </span>

              {/* Active Slice Name */}
              <p
                className="text-[12px] font-semibold truncate max-w-full leading-tight"
                style={{ color: "var(--text-primary)" }}
                title={activeArc.name}
              >
                {activeArc.name}
              </p>

              {/* Active Value */}
              <p
                className="amount text-[13px] font-bold tracking-tight mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(activeArc.value)}
              </p>

              {/* Percentage of Total */}
              <span
                className="text-[10px] font-mono mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {activeArc.percentage}% share
              </span>
            </>
          ) : (
            <>
              {/* Default Overview Readout */}
              <span
                className="text-[9px] font-mono uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {unitLabel}
              </span>

              <p
                className="amount text-[14px] sm:text-[15px] font-bold tracking-tight mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {computedTotal >= 1_000_000_000
                  ? `${(computedTotal / 1_000_000_000).toFixed(1)}B`
                  : computedTotal >= 1_000_000
                    ? `${(computedTotal / 1_000_000).toFixed(1)}M`
                    : formatRupiah(computedTotal)}
              </p>

              <span
                className="text-[9px] font-medium tracking-tight mt-0.5 block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {data.length} Sectors
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
