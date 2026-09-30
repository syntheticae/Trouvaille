import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface RingData {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  percentage?: number | string;
  amount?: number;
  [key: string]: any;
}

export interface RingContextValue {
  data: RingData[];
  size: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  center: { x: number; y: number };
  startAngle: number;
  endAngle: number;
  strokeWidth: number;
  ringGap: number;
  isTopHalf: boolean;
  isLeftHalf: boolean;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  getRingRadius: (index: number) => number;
}

const RingContext = createContext<RingContextValue | null>(null);

export function useRing(): RingContextValue {
  const ctx = useContext(RingContext);
  if (!ctx) {
    throw new Error("useRing must be used within a RingChart provider");
  }
  return ctx;
}

export interface RingChartProps {
  data: RingData[];
  size?: number;
  startAngle?: number;
  endAngle?: number;
  strokeWidth?: number;
  ringGap?: number;
  baseInnerRadius?: number;
  order?: "outside-in" | "inside-out";
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  className?: string;
  children: React.ReactNode;
}

export function RingChart({
  data,
  size = 250,
  startAngle = -Math.PI / 2,
  endAngle = (3 * Math.PI) / 2,
  strokeWidth = 9,
  ringGap = 5.5,
  baseInnerRadius,
  order = "outside-in",
  hoveredIndex: controlledHoveredIndex,
  onHoverChange,
  className = "",
  children,
}: RingChartProps) {
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<number | null>(null);

  const isControlled = controlledHoveredIndex !== undefined;
  const hoveredIndex = isControlled ? controlledHoveredIndex : internalHoveredIndex;

  const setHoveredIndex = useCallback(
    (index: number | null) => {
      if (isControlled) {
        onHoverChange?.(index);
      } else {
        setInternalHoveredIndex(index);
      }
    },
    [isControlled, onHoverChange]
  );

  // Detect arc orientation:
  // 1. Top semi-circle gauge: startAngle ~ -PI, endAngle ~ 0
  const isTopHalf = Math.abs(startAngle + Math.PI) < 0.05 && Math.abs(endAngle) < 0.05;
  // 2. Left vertical semi-circle: startAngle ~ PI/2, endAngle ~ 3*PI/2 (or -PI/2)
  const isLeftHalf =
    (Math.abs(startAngle - Math.PI / 2) < 0.05 && Math.abs(endAngle - (3 * Math.PI) / 2) < 0.05) ||
    (Math.abs(startAngle - Math.PI / 2) < 0.05 && Math.abs(endAngle + Math.PI / 2) < 0.05);

  const padding = 10;
  const ringCount = Math.max(data.length, 1);

  let viewBoxWidth = size;
  let viewBoxHeight = size;
  let cx = size / 2;
  let cy = size / 2;
  let maxRadius = size / 2 - padding;

  if (isTopHalf) {
    viewBoxWidth = size;
    cx = size / 2;
    cy = size / 2 + 8;
    viewBoxHeight = Math.round(cy + strokeWidth + 6);
    maxRadius = cx - padding;
  } else if (isLeftHalf) {
    const pad = 4;
    viewBoxHeight = size;
    cy = size / 2;
    maxRadius = Math.max(10, (size - strokeWidth - 2 * pad) / 2);
    cx = pad + maxRadius + strokeWidth / 2;
    viewBoxWidth = Math.round(cx + maxRadius * 0.55);
  }

  const getRingRadius = useCallback(
    (index: number) => {
      const step = strokeWidth + ringGap;
      if (order === "outside-in") {
        // index 0 is outermost ring
        return maxRadius - index * step;
      } else {
        // index 0 is innermost ring
        const minRadius = baseInnerRadius ?? maxRadius - (ringCount - 1) * step;
        return minRadius + index * step;
      }
    },
    [maxRadius, strokeWidth, ringGap, order, baseInnerRadius, ringCount]
  );

  const contextValue: RingContextValue = useMemo(
    () => ({
      data,
      size,
      viewBoxWidth,
      viewBoxHeight,
      center: { x: cx, y: cy },
      startAngle,
      endAngle,
      strokeWidth,
      ringGap,
      isTopHalf,
      isLeftHalf,
      hoveredIndex,
      setHoveredIndex,
      getRingRadius,
    }),
    [
      data,
      size,
      viewBoxWidth,
      viewBoxHeight,
      cx,
      cy,
      startAngle,
      endAngle,
      strokeWidth,
      ringGap,
      isTopHalf,
      isLeftHalf,
      hoveredIndex,
      setHoveredIndex,
      getRingRadius,
    ]
  );

  // Separate SVG children from overlays
  const svgNodes: React.ReactNode[] = [];
  const overlayNodes: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && (child.type as any)?.displayName === "RingCenter") {
      overlayNodes.push(child);
    } else {
      svgNodes.push(child);
    }
  });

  return (
    <RingContext.Provider value={contextValue}>
      <div
        className={cn("relative inline-block w-full max-w-[250px] select-none", className)}
        style={{ aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}` }}
      >
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          {svgNodes}
        </svg>
        {overlayNodes}
      </div>
    </RingContext.Provider>
  );
}

export interface RingProps {
  index: number;
  color?: string;
  strokeWidth?: number;
  lineCap?: "round" | "butt";
  animate?: boolean;
  showGlow?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Ring({
  index,
  color: customColor,
  strokeWidth: customStrokeWidth,
  lineCap = "round",
  animate = true,
  showGlow = true,
  className = "",
  onClick,
}: RingProps) {
  const {
    data,
    center,
    startAngle,
    endAngle,
    strokeWidth: defaultStrokeWidth,
    hoveredIndex,
    setHoveredIndex,
    getRingRadius,
  } = useRing();

  const item = data[index];
  if (!item) return null;

  const r = getRingRadius(index);
  const strokeWidth = customStrokeWidth ?? defaultStrokeWidth;
  const color = customColor || item.color || "#FFFFFF";

  const progress = Math.min(1, Math.max(0, item.maxValue > 0 ? item.value / item.maxValue : 0));
  const isHovered = hoveredIndex === index;
  const isFaded = hoveredIndex !== null && !isHovered;

  const currentEndAngle = startAngle + (endAngle - startAngle) * progress;

  // Background arc from startAngle to endAngle
  const bgPath = useMemo(() => {
    return describeArc(center.x, center.y, r, startAngle, endAngle);
  }, [center.x, center.y, r, startAngle, endAngle]);

  // Progress arc from startAngle to currentEndAngle
  const progressPath = useMemo(() => {
    if (progress <= 0.001) return "";
    return describeArc(center.x, center.y, r, startAngle, currentEndAngle);
  }, [center.x, center.y, r, startAngle, currentEndAngle, progress]);

  const activeStrokeWidth = isHovered ? strokeWidth + 1.5 : strokeWidth;

  const handleClick = () => {
    onClick?.();
    item.onClick?.();
  };

  return (
    <g
      className={cn("transition-opacity cursor-pointer", className)}
      style={{
        opacity: isFaded ? 0.35 : 1,
        transition: "opacity 0.2s ease",
      }}
      onMouseEnter={() => setHoveredIndex(index)}
      onMouseLeave={() => setHoveredIndex(null)}
      onClick={handleClick}
    >
      {/* Background Track */}
      <path
        d={bgPath}
        fill="none"
        stroke="var(--glass-border)"
        strokeWidth={strokeWidth}
        strokeLinecap={lineCap}
      />

      {/* Active Progress Path */}
      {progressPath && (
        animate ? (
          <motion.path
            d={progressPath}
            fill="none"
            stroke={color}
            strokeWidth={activeStrokeWidth}
            strokeLinecap={lineCap}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.1 + index * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              filter: showGlow && isHovered ? `drop-shadow(0 0 6px ${color})` : undefined,
            }}
          />
        ) : (
          <path
            d={progressPath}
            fill="none"
            stroke={color}
            strokeWidth={activeStrokeWidth}
            strokeLinecap={lineCap}
            style={{
              filter: showGlow && isHovered ? `drop-shadow(0 0 6px ${color})` : undefined,
            }}
          />
        )
      )}
    </g>
  );
}

Ring.displayName = "Ring";

export interface RingCenterProps {
  children?:
    | React.ReactNode
    | ((props: { value: number; label: string; isHovered: boolean }) => React.ReactNode);
  className?: string;
  defaultLabel?: string;
}

export function RingCenter({ children, className = "", defaultLabel }: RingCenterProps) {
  const { data, hoveredIndex, isTopHalf, isLeftHalf, center, viewBoxWidth } = useRing();
  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  const leftPercent = isLeftHalf ? (center.x / viewBoxWidth) * 100 : 50;

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center justify-center text-center pointer-events-none select-none",
        isLeftHalf
          ? ""
          : isTopHalf
            ? "inset-x-0 bottom-2"
            : "inset-0",
        className
      )}
      style={
        isLeftHalf
          ? {
              top: "50%",
              left: `${leftPercent}%`,
              transform: "translate(-50%, -50%)",
            }
          : undefined
      }
    >
      {typeof children === "function" ? (
        children({
          value: hoveredItem ? hoveredItem.value : 0,
          label: hoveredItem ? hoveredItem.label : (defaultLabel || ""),
          isHovered: hoveredIndex !== null,
        })
      ) : children ? (
        children
      ) : (
        <>
          <span className="text-[20px] sm:text-[22px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight leading-none amount font-mono">
            {hoveredItem ? `${hoveredItem.percentage}%` : defaultLabel}
          </span>
          <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold mt-1 truncate max-w-[85px]">
            {hoveredItem ? hoveredItem.label : "Total"}
          </span>
        </>
      )}
    </div>
  );
}

RingCenter.displayName = "RingCenter";

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const angleDiff = Math.abs(endAngle - startAngle);
  if (angleDiff >= 2 * Math.PI - 0.001) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
  }

  if (angleDiff <= 0.0001) {
    return "";
  }

  const startX = cx + r * Math.cos(startAngle);
  const startY = cy + r * Math.sin(startAngle);
  const endX = cx + r * Math.cos(endAngle);
  const endY = cy + r * Math.sin(endAngle);

  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;
  const sweepFlag = endAngle >= startAngle ? 1 : 0;

  return `M ${startX.toFixed(3)} ${startY.toFixed(3)} A ${r.toFixed(3)} ${r.toFixed(3)} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(3)} ${endY.toFixed(3)}`;
}

export default RingChart;
