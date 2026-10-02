// ======================================================================
// TROUVAILLE INFLOW VS OUTFLOW TREND CARD
// Apple Stocks Smooth Spline Trajectory with cubic Bézier curve & baseline
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme (No font-mono)
// ======================================================================

import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";
import { useCurrency } from "../../contexts/CurrencyContext";

interface InflowOutflowTrendCardProps {
  rangeTitle: string;
  trendData: any[];
  range: string;
  colors?: {
    barHigh?: string;
    barMid?: string;
    barLow?: string;
    cursorFill?: string;
    [key: string]: any;
  };
  isDark: boolean;
  isIndonesian: boolean;
  GlassTooltip: React.ComponentType<any>;
}

export function InflowOutflowTrendCard({
  rangeTitle,
  trendData,
  range: _range,
  colors: _colors,
  isDark,
  isIndonesian,
  GlassTooltip,
}: InflowOutflowTrendCardProps) {
  const { formatWithPreferred } = useCurrency();

  const processedData = useMemo(() => {
    return (trendData || []).map((d) => {
      const income = Number(d.income || 0);
      const expense = Number(d.expense || 0);
      const net = income - expense;
      return {
        ...d,
        income,
        expense,
        net,
      };
    });
  }, [trendData]);

  const peakIndex = useMemo(() => {
    if (!processedData.length) return -1;
    let maxIdx = 0;
    let maxVal = processedData[0].net;
    processedData.forEach((d, idx) => {
      if (d.net > maxVal) {
        maxVal = d.net;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }, [processedData]);

  const startLabel = processedData[0]?.label || (isIndonesian ? "Awal" : "Start");
  const endLabel =
    processedData[processedData.length - 1]?.label ||
    (isIndonesian ? "Akhir" : "End");

  return (
    <div
      className="relative overflow-hidden p-5 rounded-[24px] select-none space-y-3"
      style={{
        background: isDark
          ? "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)"
          : "linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 247, 250, 0.90) 100%)",
        border: isDark
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(0, 0, 0, 0.06)",
        boxShadow: isDark
          ? "0 18px 44px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
          : "0 10px 30px -8px rgba(31, 36, 48, 0.06), inset 0 1px 0 #ffffff",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Specular Rim Light Reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] right-[12%] top-[1px] h-[1.5px] rounded-full"
        style={{
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), rgba(255,255,255,0.45), rgba(255,255,255,0.25), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(255,255,255,1), rgba(255,255,255,0.8), transparent)",
        }}
      />

      {/* 1-Line Header with Vector Icon */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
              color: "var(--text-primary)",
            }}
          >
            <TrendingUp size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[13px] font-semibold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Lintasan Tren Arus Kas" : "Inflow vs Outflow Trend"}
            </h2>
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? `Ritme saldo bersih kas · ${rangeTitle}`
                : `Net cash pace trajectory · ${rangeTitle}`}
            </p>
          </div>
        </div>

        <div
          className="px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isDark ? "#FFFFFF" : "#18181B" }}
          />
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {peakIndex >= 0 && processedData[peakIndex]
              ? `${isIndonesian ? "Puncak" : "Peak"}: ${processedData[peakIndex].label}`
              : isIndonesian
                ? "Net Dinamis"
                : "Dynamic Net"}
          </span>
        </div>
      </div>

      {/* Apple Stocks Smooth Spline Chart */}
      <div
        className="p-3 rounded-2xl space-y-1.5"
        style={{
          background: isDark ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.02)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="h-[72px] -mx-1 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedData}
              margin={{ top: 6, right: 10, left: 10, bottom: 2 }}
            >
              <defs>
                <linearGradient id="cfSplineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isDark ? "#FFFFFF" : "#18181B"}
                    stopOpacity={isDark ? 0.25 : 0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? "#FFFFFF" : "#18181B"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <ReferenceLine
                y={0}
                stroke={
                  isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
                }
                strokeDasharray="3 3"
              />
              <Tooltip
                content={<GlassTooltip />}
                cursor={{
                  stroke: isDark
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.15)",
                  strokeWidth: 1,
                  strokeDasharray: "2 2",
                }}
              />
              <Area
                type="monotone"
                dataKey="net"
                name="net"
                stroke={isDark ? "#FFFFFF" : "#18181B"}
                strokeWidth={2}
                fill="url(#cfSplineGrad)"
                dot={(props: any) => {
                  if (props.index === peakIndex) {
                    return (
                      <circle
                        key={props.key || props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={4}
                        fill={isDark ? "#FFFFFF" : "#18181B"}
                        stroke={isDark ? "#09090c" : "#FFFFFF"}
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={props.key || props.index} r={0} />;
                }}
                activeDot={{
                  r: 4.5,
                  stroke: isDark ? "#FFFFFF" : "#18181B",
                  strokeWidth: 2,
                  fill: isDark ? "#09090c" : "#FFFFFF",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="flex items-center justify-between text-[10px] tabular-nums pt-1 border-t border-[var(--glass-border)]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>{startLabel}</span>
          <span
            className="font-medium truncate px-2 text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            {peakIndex >= 0 && processedData[peakIndex]?.net > 0
              ? `${isIndonesian ? "Surplus Maksimum" : "Max Surplus"} (${formatWithPreferred(processedData[peakIndex].net)})`
              : isIndonesian
                ? "Lintasan Arus Seimbang"
                : "Balanced Trajectory"}
          </span>
          <span>{endLabel}</span>
        </div>
      </div>
    </div>
  );
}
