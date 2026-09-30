import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

export type BalanceSheetRange = "1D" | "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";

function formatAxisY(val: number): string {
  if (Math.abs(val) >= 1000000000) return (val / 1000000000).toFixed(1) + "B";
  if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + "M";
  if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + "K";
  return String(val);
}

interface GlassTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  isStealthMode?: boolean;
}

const GlassTooltip = ({
  active,
  payload,
  label,
  isStealthMode,
}: GlassTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: "6px 10px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p
        style={{
          color: "var(--text-tertiary)",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {isStealthMode ? "••••••••" : formatRupiah(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
};

interface WealthHistoryTrajectoryCardProps {
  netWorth: number;
  assetTrend: {
    diff: number;
    percent: number;
    chartData: Array<{ label: string; balance: number }>;
  };
  bsRange: BalanceSheetRange;
  onChangeRange: (range: BalanceSheetRange) => void;
  bsRangeLabels: Record<BalanceSheetRange, string>;
  chartPeak: number;
  chartTrough: number;
  capitalDeployment: number;
  isStealthMode: boolean;
  onToggleStealthMode: () => void;
  isIndonesian: boolean;
  isDark: boolean;
}

export function WealthHistoryTrajectoryCard({
  netWorth,
  assetTrend,
  bsRange,
  onChangeRange,
  bsRangeLabels,
  chartPeak,
  chartTrough,
  capitalDeployment,
  isStealthMode,
  onToggleStealthMode,
  isIndonesian,
  isDark,
}: WealthHistoryTrajectoryCardProps) {
  return (
    <section className="card-contrast-hero relative overflow-hidden select-none p-4 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2
          className={`
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.075em]
            leading-none
            ${isDark ? "text-white/60" : "text-[var(--text-secondary)]"}
          `}
        >
          {isIndonesian ? "Riwayat Akumulasi Kekayaan" : "Wealth History"}
        </h2>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onToggleStealthMode();
          }}
          className={`
            -mr-1
            p-1.5
            rounded-full
            cursor-pointer
            transition-all
            duration-200
            active:scale-90
            ${
              isDark
                ? "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.035]"
            }
          `}
          title={
            isStealthMode
              ? isIndonesian
                ? "Tampilkan Saldo"
                : "Show Balance"
              : isIndonesian
                ? "Sembunyikan Saldo"
                : "Hide Balance"
          }
          aria-label={
            isStealthMode
              ? isIndonesian
                ? "Tampilkan Saldo"
                : "Show Balance"
              : isIndonesian
                ? "Sembunyikan Saldo"
                : "Hide Balance"
          }
        >
          {isStealthMode ? (
            <EyeOff size={15} strokeWidth={1.8} />
          ) : (
            <Eye size={15} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Primary Wealth Value */}
      <div className="mb-2">
        <span
          className={`
            amount
            block
            text-[25px]
            leading-[1.05]
            font-medium
            tracking-[-0.028em]
            tabular-nums
            ${isDark ? "text-white" : "text-[var(--text-primary)]"}
          `}
        >
          {isStealthMode ? "Rp ••••••••" : formatRupiah(netWorth)}
        </span>
      </div>

      {/* Performance / Period */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          className={`
            flex
            min-w-0
            items-center
            gap-1
            text-[11px]
            font-semibold
            leading-none
            tracking-[-0.005em]
            tabular-nums
            ${isDark ? "text-white/72" : "text-[var(--text-secondary)]"}
          `}
        >
          <ArrowUpRight
            size={13}
            strokeWidth={2.1}
            className={`
              shrink-0
              transition-transform
              ${assetTrend.diff < 0 ? "rotate-90" : ""}
            `}
          />

          <span className="truncate">
            {isStealthMode
              ? "••••"
              : `${assetTrend.diff >= 0 ? "+" : ""}${formatRupiah(
                  assetTrend.diff,
                )}`}
          </span>

          <span
            className={`
              shrink-0
              font-medium
              ${isDark ? "text-white/40" : "text-[var(--text-tertiary)]"}
            `}
          >
            (
            {isStealthMode
              ? "••••"
              : `${assetTrend.percent > 0 ? "+" : ""}${assetTrend.percent.toFixed(
                  2,
                )}%`}
            )
          </span>
        </div>

        <span
          className={`
            shrink-0
            text-[10px]
            font-medium
            leading-none
            tracking-[0.01em]
            ${isDark ? "text-white/38" : "text-[var(--text-tertiary)]"}
          `}
        >
          {bsRangeLabels[bsRange]} · IDR
        </span>
      </div>

      {/* Liquid Island Range Selector */}
      <div
        className={`
          relative
          flex
          items-center
          w-full
          h-[30px]
          p-[3px]
          rounded-full
          overflow-hidden
          ${
            isDark
              ? "bg-white/[0.045] border border-white/[0.055]"
              : "bg-black/[0.025] border border-black/[0.045]"
          }
        `}
        style={{
          boxShadow: isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.035)"
            : "inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {(
          ["1D", "7D", "1M", "3M", "6M", "1Y", "ALL"] as BalanceSheetRange[]
        ).map((r) => {
          const isActive = bsRange === r;

          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChangeRange(r);
                triggerHaptic("light");
              }}
              className={`
                relative
                z-10
                flex-1
                h-full
                min-w-0
                rounded-full
                text-[10px]
                font-semibold
                leading-none
                tracking-[-0.005em]
                cursor-pointer
                select-none
                transition-all
                duration-200
                active:scale-[0.94]
                ${
                  isActive
                    ? isDark
                      ? "text-white"
                      : "text-[var(--bg-base)]"
                    : isDark
                      ? "text-white/42 hover:text-white/68"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }
              `}
              style={{
                background: isActive
                  ? isDark
                    ? "rgba(255,255,255,0.14)"
                    : "var(--text-primary)"
                  : "transparent",

                border: isActive
                  ? isDark
                    ? "1px solid rgba(255,255,255,0.10)"
                    : "1px solid var(--text-primary)"
                  : "1px solid transparent",

                boxShadow: isActive
                  ? isDark
                    ? "0 1px 3px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "0 1px 4px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.10)"
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={assetTrend.chartData}
            margin={{ top: 4, right: 0, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="wealthHeroGradient"
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
              stroke={isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}
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
            <Tooltip
              content={<GlassTooltip isStealthMode={isStealthMode} />}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isDark ? "#FFFFFF" : "#18181b"}
              strokeWidth={2}
              fill="url(#wealthHeroGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: isDark ? "#FFFFFF" : "#18181b",
                stroke: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                strokeWidth: 1.5,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stocks-Style Summary Footer (4 columns: Tertinggi, Terendah, Injeksi MTD, Ekuitas Δ) */}
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
            {isStealthMode
              ? "••••"
              : chartPeak >= 1000
                ? "Rp " + formatAxisY(chartPeak)
                : formatRupiah(chartPeak)}
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
            {isStealthMode
              ? "••••"
              : chartTrough >= 1000
                ? "Rp " + formatAxisY(chartTrough)
                : formatRupiah(chartTrough)}
          </p>
        </div>
        <div>
          <p
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
            }`}
          >
            {isIndonesian ? "Injeksi MTD" : "Inflow MTD"}
          </p>
          <p
            className={`text-[11px] font-semibold amount mt-0.5 ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {isStealthMode
              ? "••••"
              : capitalDeployment > 0
                ? "+Rp " + formatAxisY(capitalDeployment)
                : "Rp 0"}
          </p>
        </div>
        <div>
          <p
            className={`text-[9px] font-semibold uppercase tracking-wider ${
              isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
            }`}
          >
            {isIndonesian ? "Ekuitas Δ" : "Equity Δ"}
          </p>
          <p
            className={`text-[11px] font-semibold amount mt-0.5 ${
              isDark ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {isStealthMode
              ? "••••"
              : `${assetTrend.diff >= 0 ? "+" : "-"}Rp ${formatAxisY(Math.abs(assetTrend.diff))}`}
          </p>
        </div>
      </div>
    </section>
  );
}
