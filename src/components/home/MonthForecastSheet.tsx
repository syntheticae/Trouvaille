import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { getDaysInMonth } from "date-fns";
import type { Transaction } from "../../lib/types";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

interface MonthForecastSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transactions?: Transaction[];
  budgetTarget?: number;
  dailyAverage?: number;
  projectedMonthEnd?: number;
  totalExpense?: number;
  totalIncome?: number;
  actionInsight?: any;
  referenceDate?: Date;
}

export function MonthForecastSheet({
  isOpen,
  onClose,
  transactions = [],
  dailyAverage,
  projectedMonthEnd,
  totalExpense = 0,
  actionInsight: _actionInsight,
  referenceDate = new Date(),
}: MonthForecastSheetProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);

  const now = referenceDate;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const totalDays = getDaysInMonth(now);
  const daysElapsed = Math.min(now.getDate(), totalDays);
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // Calculate daily spend and cumulative actuals
  const { actualCumulative, computedTotalExpense } = useMemo(() => {
    const map = new Map<number, number>();
    let sumExpense = 0;

    transactions.forEach((t) => {
      if (t.type !== "expense" || !t.occurred_on) return;
      if (!t.occurred_on.startsWith(monthKey)) return;

      const isCorrection =
        t.note?.includes("[Correction]") ||
        t.note?.includes("Saldo Awal") ||
        t.note?.includes("Opening Balance");
      if (isCorrection) return;

      const amt = Number(t.amount || 0);
      sumExpense += amt;
      const day = parseInt(t.occurred_on.slice(8, 10), 10);
      if (!isNaN(day) && day >= 1 && day <= totalDays) {
        map.set(day, (map.get(day) || 0) + amt);
      }
    });

    const cumMap = new Map<number, number>();
    let running = 0;
    for (let d = 1; d <= daysElapsed; d++) {
      running += map.get(d) || 0;
      cumMap.set(d, running);
    }

    return {
      dailySpendMap: map,
      actualCumulative: cumMap,
      computedTotalExpense: sumExpense,
    };
  }, [transactions, monthKey, daysElapsed, totalDays]);

  const effectiveTotalExpense =
    totalExpense > 0 ? totalExpense : computedTotalExpense;

  const effectiveDailyAvg = useMemo(() => {
    if (typeof dailyAverage === "number" && dailyAverage > 0) {
      return dailyAverage;
    }
    return effectiveTotalExpense / Math.max(1, daysElapsed);
  }, [dailyAverage, effectiveTotalExpense, daysElapsed]);

  const effectiveProjectedTotal = useMemo(() => {
    if (typeof projectedMonthEnd === "number" && projectedMonthEnd > 0) {
      return projectedMonthEnd;
    }
    return Math.round(effectiveDailyAvg * totalDays);
  }, [projectedMonthEnd, effectiveDailyAvg, totalDays]);

  // Forecast points for remaining days
  const forecastCumulative = useMemo(() => {
    const map = new Map<number, number>();
    const anchor = actualCumulative.get(daysElapsed) || effectiveTotalExpense;
    map.set(daysElapsed, anchor);

    for (let d = daysElapsed + 1; d <= totalDays; d++) {
      const forecasted = anchor + effectiveDailyAvg * (d - daysElapsed);
      map.set(d, Math.round(forecasted));
    }
    return map;
  }, [actualCumulative, daysElapsed, totalDays, effectiveTotalExpense, effectiveDailyAvg]);

  // Chart dimensions (pure floating layout without card box)
  const svgWidth = 320;
  const svgHeight = 160;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 22;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const maxVal = Math.max(effectiveProjectedTotal, effectiveTotalExpense, 1) * 1.08;

  const getX = (d: number) =>
    padLeft + ((d - 1) / Math.max(1, totalDays - 1)) * plotWidth;

  const getY = (v: number) =>
    padTop + plotHeight - (Math.max(0, v) / maxVal) * plotHeight;

  // Solid Actual Path
  const actualPath = useMemo(() => {
    if (daysElapsed < 1) return "";
    let dStr = `M ${getX(1)} ${getY(actualCumulative.get(1) || 0)}`;
    for (let d = 2; d <= daysElapsed; d++) {
      const x = getX(d);
      const y = getY(actualCumulative.get(d) || 0);
      dStr += ` L ${x} ${y}`;
    }
    return dStr;
  }, [daysElapsed, actualCumulative, maxVal]);

  // Area Fill under Solid Actual Path
  const actualAreaPath = useMemo(() => {
    if (!actualPath || daysElapsed < 1) return "";
    const xLast = getX(daysElapsed);
    const xFirst = getX(1);
    const yBase = getY(0);
    return `${actualPath} L ${xLast} ${yBase} L ${xFirst} ${yBase} Z`;
  }, [actualPath, daysElapsed, maxVal]);

  // Dashed Forecast Path (from daysElapsed to totalDays)
  const forecastPath = useMemo(() => {
    if (daysElapsed >= totalDays) return "";
    const xStart = getX(daysElapsed);
    const yStart = getY(forecastCumulative.get(daysElapsed) || effectiveTotalExpense);
    const xEnd = getX(totalDays);
    const yEnd = getY(forecastCumulative.get(totalDays) || effectiveProjectedTotal);
    return `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
  }, [daysElapsed, totalDays, forecastCumulative, effectiveTotalExpense, effectiveProjectedTotal, maxVal]);

  // Pointer interactions for scrubber
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const boundedX = Math.max(padLeft, Math.min(padLeft + plotWidth, relX));
    const dayFraction = (boundedX - padLeft) / plotWidth;
    const day = Math.round(1 + dayFraction * (totalDays - 1));

    if (day !== hoveredDay) {
      setHoveredDay(day);
      triggerHaptic("light");
    }
  };

  const handlePointerLeave = () => {
    setHoveredDay(null);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 350) {
      triggerHaptic("light");
      onClose();
    }
  };

  // Active inspected day
  const activeInspectDay = hoveredDay !== null ? hoveredDay : null;
  const isHoverActual = activeInspectDay !== null && activeInspectDay <= daysElapsed;
  const displayHeroAmount =
    activeInspectDay !== null
      ? isHoverActual
        ? actualCumulative.get(activeInspectDay) || 0
        : forecastCumulative.get(activeInspectDay) || 0
      : effectiveProjectedTotal;

  // Axis scale labels
  const yLabelTop = Math.round(maxVal / 1000000) > 0
    ? `${(maxVal / 1000000).toFixed(1)}M`
    : `${Math.round(maxVal / 1000)}K`;
  const yLabelMid = Math.round(maxVal / 2000000) > 0
    ? `${(maxVal / 2000000).toFixed(1)}M`
    : `${Math.round(maxVal / 2000)}K`;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Ambient Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[998] bg-black/80 backdrop-blur-md"
          />

          {/* Minimalist Apple Luxury Bottom Sheet (Flush with bottom, swipe-to-dismiss) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-[999] shadow-2xl flex flex-col bg-[#111114] text-white select-none overflow-hidden"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "32px 32px 0 0",
              maxHeight: "92dvh",
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 32px)",
              fontFamily: "'Urbanist', sans-serif",
              touchAction: "pan-y",
            }}
          >
            {/* Top Grab Handle Area */}
            <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing w-full">
              <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
            </div>

            {/* Inner Content Container */}
            <div className="w-full max-w-md mx-auto px-6 flex flex-col overflow-y-auto">
              {/* Modal Header Row */}
              <div className="relative flex items-center justify-center py-1">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              Month Forecast
            </h2>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="absolute right-0 w-8 h-8 rounded-full bg-[#1e1e24] hover:bg-[#282830] active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
            >
              <X size={15} />
            </button>
          </div>

          {/* Hero Forecast Number & Elapsed Counter */}
          <div className="text-center pt-3 pb-1">
            <h1 className="text-4xl sm:text-[44px] font-bold font-mono tracking-tight text-white leading-tight">
              {formatRupiah(displayHeroAmount)}
            </h1>

            <p className="text-[12px] font-medium text-zinc-400 mt-1">
              {activeInspectDay !== null ? (
                <span>
                  Day {activeInspectDay} of {totalDays}{" "}
                  {isHoverActual ? "(Actual)" : "(Forecast)"}
                </span>
              ) : (
                <span>{daysElapsed} of {totalDays} days</span>
              )}
            </p>

            <p className="text-[12px] text-zinc-400 max-w-[270px] mx-auto mt-2 leading-relaxed font-light">
              If you keep spending at the same pace, here is what the full month will look like.
            </p>
          </div>

          {/* Floating Minimalist Dual-Curve Chart (No Container Card) */}
          <div className="w-full pt-3 pb-2 touch-none">
            <svg
              ref={chartRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible cursor-crosshair"
              onPointerDown={handlePointerMove}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerLeave}
              onPointerLeave={handlePointerLeave}
            >
              <defs>
                {/* Monochrome luminous fill gradient */}
                <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Baseline at bottom */}
              <line
                x1={padLeft}
                y1={padTop + plotHeight}
                x2={padLeft + plotWidth}
                y2={padTop + plotHeight}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />

              {/* Y-axis tick labels on left */}
              <text
                x={padLeft - 6}
                y={padTop + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize="8.5"
                fontFamily="monospace"
              >
                {yLabelTop}
              </text>
              <text
                x={padLeft - 6}
                y={padTop + plotHeight / 2 + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize="8.5"
                fontFamily="monospace"
              >
                {yLabelMid}
              </text>
              <text
                x={padLeft - 6}
                y={padTop + plotHeight}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize="8.5"
                fontFamily="monospace"
              >
                0
              </text>

              {/* Area fill under solid curve */}
              {actualAreaPath && (
                <path d={actualAreaPath} fill="url(#spentGradient)" />
              )}

              {/* Dashed Forecast Path (Future trajectory) */}
              {forecastPath && (
                <path
                  d={forecastPath}
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.75"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              )}

              {/* Solid Actual Spend Curve */}
              {actualPath && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Terminal marker dot on today */}
              {daysElapsed >= 1 && (
                <g>
                  <circle
                    cx={getX(daysElapsed)}
                    cy={getY(actualCumulative.get(daysElapsed) || effectiveTotalExpense)}
                    r="6"
                    fill="rgba(255,255,255,0.15)"
                  />
                  <circle
                    cx={getX(daysElapsed)}
                    cy={getY(actualCumulative.get(daysElapsed) || effectiveTotalExpense)}
                    r="3.5"
                    fill="#ffffff"
                    stroke="#111114"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* Interactive Scrubber Indicator */}
              {hoveredDay !== null && (
                <g>
                  <line
                    x1={getX(hoveredDay)}
                    y1={padTop}
                    x2={getX(hoveredDay)}
                    y2={padTop + plotHeight}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                  <circle
                    cx={getX(hoveredDay)}
                    cy={getY(
                      hoveredDay <= daysElapsed
                        ? actualCumulative.get(hoveredDay) || 0
                        : forecastCumulative.get(hoveredDay) || 0
                    )}
                    r="4"
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* X-axis tick labels at bottom */}
              <text
                x={padLeft}
                y={svgHeight - 6}
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                fontFamily="monospace"
              >
                1
              </text>
              <text
                x={padLeft + plotWidth}
                y={svgHeight - 6}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                fontFamily="monospace"
              >
                {totalDays}
              </text>
            </svg>

            {/* Minimalist Centered Legend */}
            <div className="flex items-center justify-center gap-6 mt-1 text-[11px] font-medium text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-4 h-[2px] bg-white rounded-full" />
                <span>Spent</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-[2px] rounded-full border-t border-dashed border-zinc-400"
                  style={{ borderTopWidth: "2px" }}
                />
                <span>Forecast</span>
              </div>
            </div>
          </div>

          {/* Minimalist Metric Cards (Side-by-Side Reference Layout) */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-4 rounded-2xl bg-[#1a1a1f] border border-white/[0.05] flex flex-col justify-between">
              <span className="text-[12px] font-medium text-zinc-400">
                Spent so far
              </span>
              <p className="text-xl font-bold font-mono text-white mt-1">
                {formatRupiah(effectiveTotalExpense)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#1a1a1f] border border-white/[0.05] flex flex-col justify-between">
              <span className="text-[12px] font-medium text-zinc-400">
                Daily average
              </span>
              <p className="text-xl font-bold font-mono text-white mt-1">
                {formatRupiah(Math.round(effectiveDailyAvg))}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>,
document.body
);
}

