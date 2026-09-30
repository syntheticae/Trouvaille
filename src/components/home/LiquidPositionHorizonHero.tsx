import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

export type StockRange = "1D" | "1W" | "1M" | "6M" | "YTD" | "1Y" | "ALL";

export interface HorizonAssetData {
  currentBalance: number;
  diff: number;
  percent: number;
  chartData: { label: string; balance: number; occurred_on?: string }[];
  highBalance: number;
  lowBalance: number;
  periodInflow: number;
  periodOutflow: number;
}

interface LiquidPositionHorizonHeroProps {
  assetData: HorizonAssetData;
  stockRange: StockRange;
  onRangeChange: (range: StockRange) => void;
  stockRangeLabels: Record<StockRange, string>;
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance: boolean;
  onToggleHideBalance: () => void;
  isColdLoading?: boolean;
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div
        className="px-2.5 py-1.5 rounded-xl text-left border shadow-lg backdrop-blur-md"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--glass-border)",
        }}
      >
        <p className="text-[10px] text-[var(--text-tertiary)] font-medium">
          {label}
        </p>
        <p className="text-[12px] font-semibold text-[var(--text-primary)]">
          {formatRupiah(val)}
        </p>
      </div>
    );
  }
  return null;
};

function formatAxisY(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1000000000)
    return (abs / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1000000)
    return (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1000) return (abs / 1000).toFixed(0) + "k";
  return abs.toString();
}

export function LiquidPositionHorizonHero({
  assetData,
  stockRange,
  onRangeChange,
  stockRangeLabels,
  isDark,
  isIndonesian,
  hideBalance,
  onToggleHideBalance,
  isColdLoading = false,
}: LiquidPositionHorizonHeroProps) {
  return (
    <section
      data-tour="net-worth"
      className="card-contrast-hero p-4 pb-3 relative overflow-hidden"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between mb-1">
        <h2
          className={`text-[12px] font-semibold uppercase tracking-wider leading-none ${
            isDark ? "text-white/80" : "text-[var(--text-secondary)]"
          }`}
        >
          {isIndonesian ? "Posisi Kas Likuid" : "Liquid Position"}
        </h2>
        <button
          type="button"
          onClick={onToggleHideBalance}
          className={`p-1 -mr-1 cursor-pointer active:scale-90 transition-all ${
            isDark
              ? "text-white/60 hover:text-white"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          }`}
          title={
            hideBalance
              ? isIndonesian
                ? "Tampilkan Saldo"
                : "Show Balance"
              : isIndonesian
                ? "Sembunyikan Saldo"
                : "Hide Balance"
          }
        >
          {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {/* Amount */}
      <div className="mb-1.5">
        {isColdLoading ? (
          <div
            className={`h-8 w-44 rounded-xl animate-pulse my-1 ${
              isDark ? "bg-white/10" : "bg-black/10"
            }`}
          />
        ) : (
          <span
            className={`text-[28px] font-semibold tracking-tight amount leading-tight ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {hideBalance
              ? "Rp ••••••••"
              : formatRupiah(assetData.currentBalance)}
          </span>
        )}
      </div>

      {/* Change Line + Time Label Side by Side */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {isColdLoading ? (
          <div
            className={`h-4 w-28 rounded-lg animate-pulse ${
              isDark ? "bg-white/10" : "bg-black/10"
            }`}
          />
        ) : (
          <div
            className="flex items-center gap-1 text-[12px] font-semibold"
            style={{
              color: isDark
                ? assetData.diff >= 0
                  ? "#FFFFFF"
                  : "#A1A1AA"
                : assetData.diff >= 0
                  ? "#121214"
                  : "#71717a",
            }}
          >
            <ArrowUpRight
              size={13}
              className={assetData.diff < 0 ? "rotate-90" : ""}
            />
            <span>
              {hideBalance
                ? "••••"
                : `${assetData.diff >= 0 ? "+" : ""}${formatRupiah(assetData.diff)}`}
            </span>
            <span className="opacity-80">
              (
              {hideBalance
                ? "••••"
                : `${assetData.percent > 0 ? "+" : ""}${assetData.percent.toFixed(2)}%`}
              )
            </span>
          </div>
        )}
        <span
          className={`text-[11px] font-semibold shrink-0 ${
            isDark ? "text-white/50" : "text-[var(--text-tertiary)]"
          }`}
        >
          {stockRangeLabels[stockRange]} · IDR
        </span>
      </div>

      {/* Range Pill Selector (1D, 1W, 1M, 6M, YTD, 1Y, ALL) */}
      <div
        className={`flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 mb-1.5 rounded-full overflow-hidden ${
          isDark
            ? "bg-white/[0.045] border border-white/[0.055]"
            : "bg-black/[0.025] border border-black/[0.045]"
        }`}
        style={{
          boxShadow: isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.035)"
            : "inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {(
          ["1D", "1W", "1M", "6M", "YTD", "1Y", "ALL"] as StockRange[]
        ).map((r) => {
          const isActive = stockRange === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                onRangeChange(r);
                triggerHaptic("light");
              }}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-all cursor-pointer select-none"
              style={{
                background: isActive
                  ? isDark
                    ? "rgba(255,255,255,0.25)"
                    : "#18181b"
                  : isDark
                    ? "transparent"
                    : "#f4f4f7",
                color: isActive
                  ? "#FFFFFF"
                  : isDark
                    ? "rgba(255,255,255,0.55)"
                    : "#52525b",
                border: isActive
                  ? isDark
                    ? "1px solid rgba(255,255,255,0.35)"
                    : "1px solid #18181b"
                  : "1px solid transparent",
                boxShadow: isActive
                  ? isDark
                    ? "none"
                    : "0 2px 6px rgba(0,0,0,0.18)"
                  : "none",
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Chart with Right Y-Axis & Dotted Grid */}
      <div className="h-[120px] w-full mt-0.5">
        {isColdLoading ? (
          <div
            className={`h-full w-full rounded-2xl animate-pulse ${
              isDark ? "bg-white/5" : "bg-black/5"
            }`}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={assetData.chartData}
              margin={{ top: 4, right: 0, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="heroGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={isDark ? "#FFFFFF" : "#18181b"}
                    stopOpacity={isDark ? 0.25 : 0.12}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? "#FFFFFF" : "#18181b"}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 3"
                stroke={
                  isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"
                }
                vertical={true}
                horizontal={true}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 9,
                  fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
                  fontFamily: "Urbanist",
                  fontWeight: 600,
                }}
                axisLine={false}
                tickLine={false}
                dy={3}
              />
              <YAxis
                orientation="right"
                width={34}
                domain={["auto", "auto"]}
                tick={{
                  fontSize: 9,
                  fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
                  fontFamily: "Urbanist",
                  fontWeight: 700,
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisY}
                dx={-2}
              />
              <Tooltip content={<GlassTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={isDark ? "#FFFFFF" : "#18181b"}
                strokeWidth={2}
                fill="url(#heroGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: isDark ? "#FFFFFF" : "#18181b",
                  stroke: isDark
                    ? "rgba(0,0,0,0.5)"
                    : "rgba(255,255,255,0.9)",
                  strokeWidth: 1.5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stocks-Style Summary Footer (High, Low, Inflow, Outflow) */}
      <div
        className={`grid grid-cols-4 gap-1.5 pt-2.5 mt-1 border-t text-center ${
          isDark ? "border-white/10" : "border-black/[0.06]"
        }`}
      >
        <div>
          <p
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
            }`}
          >
            {isIndonesian ? "Tertinggi" : "High"}
          </p>
          <p
            className={`text-[11px] font-semibold amount mt-0.5 ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {hideBalance
              ? "••••"
              : assetData.highBalance >= 1000
                ? "Rp " + formatAxisY(assetData.highBalance)
                : formatRupiah(assetData.highBalance)}
          </p>
        </div>
        <div>
          <p
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
            }`}
          >
            {isIndonesian ? "Terendah" : "Low"}
          </p>
          <p
            className={`text-[11px] font-semibold amount mt-0.5 ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {hideBalance
              ? "••••"
              : assetData.lowBalance >= 1000
                ? "Rp " + formatAxisY(assetData.lowBalance)
                : formatRupiah(assetData.lowBalance)}
          </p>
        </div>
        <div>
          <p
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
            }`}
          >
            {isIndonesian ? "Masuk" : "Inflow"}
          </p>
          <p
            className={`text-[11px] font-semibold amount mt-0.5 ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {hideBalance
              ? "••••"
              : assetData.periodInflow > 0
                ? "+Rp " + formatAxisY(assetData.periodInflow)
                : "Rp 0"}
          </p>
        </div>
        <div>
          <p
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
            }`}
          >
            {isIndonesian ? "Keluar" : "Outflow"}
          </p>
          <p
            className={`text-[11px] font-semibold amount mt-0.5 ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {hideBalance
              ? "••••"
              : assetData.periodOutflow > 0
                ? "-Rp " + formatAxisY(assetData.periodOutflow)
                : "Rp 0"}
          </p>
        </div>
      </div>
    </section>
  );
}
