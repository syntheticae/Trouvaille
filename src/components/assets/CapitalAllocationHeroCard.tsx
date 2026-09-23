// ======================================================================
// TROUVAILLE CAPITAL ALLOCATION HERO CARD
// Apple Luxury Frosted Donut Chart & Multi-Asset Segment Breakdown
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  TrendingUp,
  Landmark,
  Home,
  Layers,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

export interface AssetAllocationItem {
  type: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface CapitalAllocationHeroCardProps {
  totalMarketValuation: number;
  totalCostBasis: number;
  totalFloatingProfit: number;
  totalFloatingProfitPct: number;
  usdtRate: number;
  allocationBreakdown: AssetAllocationItem[];
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance: boolean;
}

const CLASS_ICONS: Record<string, any> = {
  crypto: Coins,
  stock: TrendingUp,
  gold: Landmark,
  fund: Layers,
  fixed: Home,
};

export function CapitalAllocationHeroCard({
  totalMarketValuation,
  totalCostBasis,
  totalFloatingProfit,
  totalFloatingProfitPct,
  usdtRate,
  allocationBreakdown,
  isDark,
  isIndonesian,
  hideBalance,
}: CapitalAllocationHeroCardProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  // Monochrome Grayscale Luxury Palette for Pie Segments
  const monochromeColors = isDark
    ? ["#ffffff", "rgba(255,255,255,0.75)", "rgba(255,255,255,0.50)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0.18)"]
    : ["#111827", "rgba(17,24,39,0.78)", "rgba(17,24,39,0.52)", "rgba(17,24,39,0.34)", "rgba(17,24,39,0.18)"];

  const chartData = allocationBreakdown.map((item, idx) => ({
    ...item,
    chartColor: monochromeColors[idx % monochromeColors.length],
  }));

  const activeItem = hoveredType
    ? chartData.find((d) => d.type === hoveredType)
    : null;

  return (
    <div
      className="p-5 rounded-[26px] space-y-4 relative overflow-hidden"
      style={{
        background: isDark
          ? "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
          : "linear-gradient(145deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.015) 100%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* 1. Header with Live P&L Badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10.5px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isIndonesian ? "Total Valuasi Bersih" : "Total Net Valuation"}
        </span>

        {/* Monochrome Luxury P&L Badge */}
        <div
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap font-mono"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
            color: "var(--text-primary)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {totalFloatingProfit >= 0 ? (
            <ArrowUpRight size={12} strokeWidth={2.5} />
          ) : (
            <ArrowDownRight size={12} strokeWidth={2.5} />
          )}
          <span>
            {hideBalance
              ? "••••••••"
              : `${totalFloatingProfit >= 0 ? "+" : ""}${formatRupiah(totalFloatingProfit)} (${totalFloatingProfitPct >= 0 ? "+" : ""}${totalFloatingProfitPct.toFixed(1)}%)`}
          </span>
        </div>
      </div>

      {/* 2. Hero Valuation Number */}
      <p
        className="amount text-[34px] font-bold tracking-tight leading-none"
        style={{ color: "var(--text-primary)" }}
      >
        {hideBalance ? "••••••••" : formatRupiah(totalMarketValuation)}
      </p>

      {/* 3. Donut Chart & Interactive Allocation Rows */}
      {allocationBreakdown.length > 0 && (
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Donut Chart (5 cols) */}
          <div className="sm:col-span-5 h-36 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div
                        className="px-2.5 py-1.5 rounded-xl border border-[var(--glass-border)] text-left shadow-xl"
                        style={{
                          background: "var(--bg-elevated)",
                          backdropFilter: "blur(20px)",
                          fontFamily: "Urbanist, sans-serif",
                        }}
                      >
                        <p className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                          {d.label}
                        </p>
                        <p className="text-[12px] font-bold font-mono text-[var(--text-primary)]">
                          {hideBalance ? "••••" : formatRupiah(d.value)}
                        </p>
                        <p className="text-[9.5px] font-semibold text-[var(--text-secondary)]">
                          {d.pct.toFixed(1)}% of portfolio
                        </p>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={66}
                  paddingAngle={3}
                  dataKey="value"
                  stroke={isDark ? "rgba(0,0,0,0.5)" : "#ffffff"}
                  strokeWidth={2}
                  onMouseEnter={(_, idx) => {
                    triggerHaptic("light");
                    setHoveredType(chartData[idx]?.type || null);
                  }}
                  onMouseLeave={() => setHoveredType(null)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.type}`}
                      fill={entry.chartColor}
                      opacity={hoveredType && hoveredType !== entry.type ? 0.45 : 1}
                      className="transition-opacity duration-200 cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
                {activeItem ? activeItem.label : isIndonesian ? "Alokasi" : "Assets"}
              </span>
              <span className="text-[14px] font-bold text-[var(--text-primary)] font-mono leading-none mt-0.5">
                {activeItem ? `${activeItem.pct.toFixed(0)}%` : `${allocationBreakdown.length} Klas`}
              </span>
            </div>
          </div>

          {/* Asset Class List (7 cols) */}
          <div className="sm:col-span-7 space-y-2">
            {chartData.map((item) => {
              const Icon = CLASS_ICONS[item.type] || TrendingUp;
              const isHovered = hoveredType === item.type;

              return (
                <div
                  key={item.type}
                  onMouseEnter={() => setHoveredType(item.type)}
                  onMouseLeave={() => setHoveredType(null)}
                  className={`p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    isHovered ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.chartColor }}
                    />
                    <Icon size={13} className="text-[var(--text-tertiary)] shrink-0" />
                    <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-[11.5px] text-[var(--text-tertiary)]">
                      {hideBalance ? "••••" : formatRupiah(item.value)}
                    </span>
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-md text-[var(--text-primary)]"
                      style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
                    >
                      {item.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Cost Basis & Live USD Indicator Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--glass-border)] text-[11px]">
        <span style={{ color: "var(--text-tertiary)" }}>
          {isIndonesian ? "Modal Terinvestasi: " : "Cost Basis: "}
          <strong className="font-bold text-[var(--text-secondary)]">
            {hideBalance ? "••••••••" : formatRupiah(totalCostBasis)}
          </strong>
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>
          Live USD:{" "}
          <strong className="font-mono font-bold text-[var(--text-secondary)]">
            {formatRupiah(usdtRate)}
          </strong>
        </span>
      </div>
    </div>
  );
}
