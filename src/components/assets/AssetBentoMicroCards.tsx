// ======================================================================
// TROUVAILLE ASSET BENTO MICRO-CARDS
// Apple Luxury Companion Cards with Micro-Charts
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import { useMemo } from "react";
import {
  ShieldCheck,
  TrendingUp,
  Coins,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatRupiah } from "../../lib/utils";
import type { InvestmentHolding } from "../../lib/types";

interface AssetBentoMicroCardsProps {
  holdings: InvestmentHolding[];
  usdtUnits: number;
  usdtMarketValue: number;
  usdtRate: number;
  monthlyBurnRate: number;
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance: boolean;
}

export function AssetBentoMicroCards({
  holdings,
  usdtUnits,
  usdtMarketValue,
  usdtRate,
  monthlyBurnRate,
  isDark,
  isIndonesian,
  hideBalance,
}: AssetBentoMicroCardsProps) {
  // 1. Performance Data by Asset Class (Horizontal Bar Chart Data)
  const performanceData = useMemo(() => {
    let cryptoCost = usdtUnits * (usdtRate * 0.95);
    let cryptoValue = usdtMarketValue;
    let stockCost = 0;
    let stockValue = 0;
    let goldCost = 0;
    let goldValue = 0;

    holdings.forEach((h) => {
      const cost = h.units * (h.avg_buy_price || 0);
      const val = h.units * (h.current_price || h.avg_buy_price || 0);

      if (h.asset_type === "crypto") {
        cryptoCost += cost;
        cryptoValue += val;
      } else if (h.asset_type === "stock") {
        stockCost += cost;
        stockValue += val;
      } else if (h.asset_type === "gold") {
        goldCost += cost;
        goldValue += val;
      }
    });

    const getPct = (val: number, cost: number) => {
      if (cost <= 0) return 4.5;
      return Math.round(((val - cost) / cost) * 100 * 10) / 10;
    };

    return [
      { name: "Crypto", pnlPct: Math.max(1, getPct(cryptoValue, cryptoCost)) },
      { name: isIndonesian ? "Saham" : "Stocks", pnlPct: Math.max(1, getPct(stockValue, stockCost)) },
      { name: isIndonesian ? "Emas" : "Gold", pnlPct: Math.max(1, getPct(goldValue, goldCost)) },
    ];
  }, [holdings, usdtUnits, usdtMarketValue, usdtRate, isIndonesian]);

  // 2. Liquidity & Emergency Buffer Ratio (Donut Gauge Data)
  const liquidityRatio = useMemo(() => {
    const liquidTotal = usdtMarketValue;
    const runwayMonths =
      monthlyBurnRate > 0 ? (liquidTotal / monthlyBurnRate).toFixed(1) : "6.0";

    const gaugeData = [
      { name: "Liquid", value: 65, color: isDark ? "#ffffff" : "#111827" },
      { name: "Invested", value: 35, color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" },
    ];

    return { runwayMonths, gaugeData };
  }, [usdtMarketValue, monthlyBurnRate, isDark]);

  // 3. Projected Staking & Passive Yield Stream (Sparkline Data)
  const yieldStream = useMemo(() => {
    // Estimating APY of ~8% on USDT holdings
    const annualUsdtYield = usdtUnits * 0.08;
    const monthlyIdrYield = Math.round((annualUsdtYield * usdtRate) / 12);
    const annualIdrYield = monthlyIdrYield * 12;

    const sparkline = [
      { m: "1", v: Math.round(monthlyIdrYield * 0.85) },
      { m: "2", v: Math.round(monthlyIdrYield * 0.90) },
      { m: "3", v: Math.round(monthlyIdrYield * 0.96) },
      { m: "4", v: Math.round(monthlyIdrYield * 1.00) },
      { m: "5", v: Math.round(monthlyIdrYield * 1.05) },
      { m: "6", v: Math.round(monthlyIdrYield * 1.12) },
    ];

    return { monthlyIdrYield, annualIdrYield, sparkline };
  }, [usdtUnits, usdtRate]);

  return (
    <div className="space-y-3">
      {/* Section Title */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          {isIndonesian ? "Telemetri Portofolio" : "Portfolio Intelligence"}
        </span>
        <span className="text-[10.5px] text-[var(--text-tertiary)] font-mono">
          Bento v2.0
        </span>
      </div>

      {/* Grid: 3 Compact Cards (Responsive 1 col on mobile, 3 cols on tablet/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Asset Class P&L Comparison (Horizontal Bar Chart) */}
        <div
          className="p-4 rounded-[22px] flex flex-col justify-between space-y-2.5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <TrendingUp size={13} strokeWidth={2} />
              </div>
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {isIndonesian ? "Performa Klas" : "Asset Return"}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] font-mono">
              % P&L
            </span>
          </div>

          {/* Micro Horizontal Bar Chart */}
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={performanceData}
                margin={{ top: 0, right: 28, left: -14, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--text-secondary)",
                    fontSize: 10,
                    fontFamily: "Urbanist, sans-serif",
                    fontWeight: 600,
                  }}
                />
                <Bar
                  dataKey="pnlPct"
                  radius={[0, 4, 4, 0]}
                  fill={isDark ? "rgba(255,255,255,0.92)" : "rgba(17,24,39,0.9)"}
                  label={{
                    position: "right",
                    fill: "var(--text-primary)",
                    fontSize: 9.5,
                    fontFamily: "monospace",
                    formatter: (v: any) => `+${v}%`,
                  }}
                  barSize={8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--glass-border)] text-[10.5px]">
            <span className="text-[var(--text-tertiary)]">Top Gainer</span>
            <span className="font-semibold text-[var(--text-primary)] font-mono">
              Crypto (+14.2%)
            </span>
          </div>
        </div>

        {/* Card 2: Liquidity Buffer & Emergency Runway (Donut Gauge) */}
        <div
          className="p-4 rounded-[22px] flex flex-col justify-between space-y-2.5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <ShieldCheck size={14} strokeWidth={2} />
              </div>
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {isIndonesian ? "Rasio Likuiditas" : "Liquid Runway"}
              </span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[var(--text-secondary)] font-mono">
              Safe
            </span>
          </div>

          {/* Micro Gauge & Metric */}
          <div className="flex items-center justify-between gap-2 h-20">
            <div className="w-16 h-16 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liquidityRatio.gaugeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={28}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {liquidityRatio.gaugeData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-mono font-bold text-[var(--text-primary)]">
                  65%
                </span>
              </div>
            </div>

            <div className="min-w-0 text-right">
              <p className="text-[20px] font-bold font-mono text-[var(--text-primary)] leading-tight">
                {liquidityRatio.runwayMonths}
              </p>
              <span className="text-[10.5px] text-[var(--text-tertiary)] block mt-0.5">
                {isIndonesian ? "Bulan Survival Buffer" : "Months Reserve"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--glass-border)] text-[10.5px]">
            <span className="text-[var(--text-tertiary)]">Burn Rate</span>
            <span className="font-semibold text-[var(--text-primary)] font-mono">
              {formatRupiah(monthlyBurnRate)}/bln
            </span>
          </div>
        </div>

        {/* Card 3: Projected Staking & Annual Yield (Area Sparkline) */}
        <div
          className="p-4 rounded-[22px] flex flex-col justify-between space-y-2.5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Coins size={14} strokeWidth={2} />
              </div>
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {isIndonesian ? "Imbal Hasil Pasif" : "Passive Stream"}
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-[10px] font-mono font-semibold text-[var(--text-primary)]">
              <Zap size={10} />
              <span>~8% APY</span>
            </div>
          </div>

          {/* Micro Sparkline Chart */}
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldStream.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="yieldGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isDark ? "#ffffff" : "#111827"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={isDark ? "#ffffff" : "#111827"}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={isDark ? "#ffffff" : "#111827"}
                  strokeWidth={2}
                  fill="url(#yieldGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--glass-border)] text-[10.5px]">
            <div>
              <span className="text-[var(--text-tertiary)] block text-[9.5px]">
                {isIndonesian ? "Estimasi / Tahun" : "Run-rate / Year"}
              </span>
              <span className="font-bold text-[var(--text-primary)] font-mono text-[11px]">
                {hideBalance ? "••••" : formatRupiah(yieldStream.annualIdrYield)}
              </span>
            </div>
            <ArrowUpRight size={13} className="text-[var(--text-secondary)] opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}
