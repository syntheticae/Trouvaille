// ======================================================================
// TROUVAILLE NET CAPITAL TRAJECTORY CARD
// Cumulative net worth line / area chart with Apple Glass aesthetics
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import React from "react";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useCurrency } from "../../contexts/CurrencyContext";

interface NetCapitalTrajectoryCardProps {
  netWorth: number;
  hideBalance: boolean;
  rangeTitle: string;
  netWorthData: any[];
  colors: {
    lineStroke: string;
    [key: string]: any;
  };
  isDark: boolean;
  isIndonesian: boolean;
  GlassTooltip: React.ComponentType<any>;
}

export function NetCapitalTrajectoryCard({
  netWorth,
  hideBalance,
  rangeTitle,
  netWorthData,
  colors,
  isDark,
  isIndonesian,
  GlassTooltip,
}: NetCapitalTrajectoryCardProps) {
  const { formatWithPreferred } = useCurrency();

  return (
    <div className="p-5 rounded-[24px] glass-surface">
      <div className="flex items-center justify-between mb-3 select-none">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
          <div>
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Trajektori Modal Bersih" : "Net Capital Trajectory"}
            </h2>
            <p
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? `Perubahan kekayaan bersih kumulatif · ${rangeTitle}`
                : `Cumulative net worth change · ${rangeTitle}`}
            </p>
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        >
          {hideBalance ? "••••••" : formatWithPreferred(netWorth)}
        </div>
      </div>

      <div className="h-[130px] -mx-2 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={netWorthData}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="netG" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colors.lineStroke}
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor={colors.lineStroke}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fontSize: 10,
                fill: "var(--text-tertiary)",
                fontWeight: 500,
              }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis hide />
            <Tooltip
              content={<GlassTooltip />}
              cursor={{
                stroke: colors.lineStroke,
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="net"
              name="net"
              stroke={colors.lineStroke}
              strokeWidth={2}
              fill="url(#netG)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: colors.lineStroke }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
