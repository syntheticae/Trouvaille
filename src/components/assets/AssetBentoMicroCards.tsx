// ======================================================================
// TROUVAILLE ASSET BENTO MATRIX 2x2 (RESOLUSI 2)
// High-Density Executive Matrix:
// [1] Inflow Velocity Spark  | [2] Liquid Runway & Safety Buffer
// [3] Portfolio Dominance    | [4] 3-Tier Liquidity Structure
// Strictly ZERO DUMMY DATA: All telemetry computed directly from real user state
// Strictly Non-Mixed Localization (100% Consistent English / Indonesian)
// ======================================================================

import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck,
  ShieldAlert,
  PieChart,
  Layers,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import type { MonthlyDeploymentItem } from "./MonthlyDeploymentBarCard";
import type { LiquiditySummary } from "./CapitalAllocationCard";

export interface TopHoldingItem {
  id: string;
  symbol: string;
  name: string;
  marketValue: number;
  pct: number;
}

interface AssetBentoMicroCardsProps {
  topHoldings: TopHoldingItem[];
  deploymentHistory: MonthlyDeploymentItem[];
  liquidRunwayMonths: number;
  liquidReserves: number;
  monthlyBurnRate: number;
  liquiditySummary: LiquiditySummary;
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance?: boolean;
}

export function AssetBentoMicroCards({
  topHoldings,
  deploymentHistory,
  liquidRunwayMonths,
  liquidReserves,
  monthlyBurnRate,
  liquiditySummary,
  isDark,
  isIndonesian,
  hideBalance = false,
}: AssetBentoMicroCardsProps) {
  const cardStyle = {
    background: isDark
      ? "var(--bg-elevated)"
      : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
    border: isDark
      ? "1px solid var(--glass-border)"
      : "1px solid rgba(15,23,42,0.06)",
    boxShadow: isDark
      ? "var(--shadow-card)"
      : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
  };

  const totalDeployed = deploymentHistory.reduce((a, b) => a + b.deployed, 0);
  const activeCount = deploymentHistory.filter((d) => d.deployed > 0).length;
  const isRunwaySafe = liquidRunwayMonths >= 6;
  const top3 = topHoldings.slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-3 select-none">
      {/* ── CARD 1: INFLOW VELOCITY SPARK ─────────────────────────────────── */}
      <div className="p-3.5 rounded-[24px] space-y-2 flex flex-col justify-between" style={cardStyle}>
        <div>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {isIndonesian ? "Inflow Modal" : "Inflow Velocity"}
            </span>
            <span className="text-[10px] font-mono font-semibold text-[var(--text-secondary)] shrink-0">
              {activeCount}/6 {isIndonesian ? "bln" : "mo"}
            </span>
          </div>
          <p className="font-mono text-[15px] font-bold text-[var(--text-primary)] leading-tight">
            {hideBalance ? "••••" : formatRupiah(totalDeployed)}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">
            {isIndonesian ? "Total injeksi 6 bln" : "6-month capital deployed"}
          </p>
        </div>

        {/* Micro Spark Bar Chart */}
        <div className="h-[38px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deploymentHistory} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Bar
                dataKey="deployed"
                radius={[3, 3, 0, 0]}
                fill={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(24, 24, 27, 0.55)"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── CARD 2: LIQUID RUNWAY & SAFETY BUFFER ─────────────────────────── */}
      <div className="p-3.5 rounded-[24px] space-y-2 flex flex-col justify-between" style={cardStyle}>
        <div>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {isIndonesian ? "Daya Tahan" : "Liquid Runway"}
            </span>
            {isRunwaySafe ? (
              <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            ) : (
              <ShieldAlert size={13} className="text-amber-500 shrink-0" />
            )}
          </div>
          <p className="font-mono text-[15px] font-bold text-[var(--text-primary)] leading-tight">
            {liquidRunwayMonths > 0
              ? `${liquidRunwayMonths.toFixed(1)} ${isIndonesian ? "bln" : "mo"}`
              : `0 ${isIndonesian ? "bln" : "mo"}`}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">
            {isRunwaySafe
              ? isIndonesian ? "Cadangan likuid aman" : "Reserves safe"
              : isIndonesian ? "Perlu ditambah" : "Buffer low"}
          </p>
        </div>

        <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between text-[10px]">
          <span className="text-[var(--text-tertiary)] truncate">
            {isIndonesian ? "Burn:" : "Burn:"}{" "}
            <strong className="font-mono font-bold text-[var(--text-secondary)]">
              {hideBalance ? "••••" : formatRupiah(monthlyBurnRate)}
            </strong>
          </span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {hideBalance ? "••••" : formatRupiah(liquidReserves)}
          </span>
        </div>
      </div>

      {/* ── CARD 3: PORTFOLIO DOMINANCE ───────────────────────────────────── */}
      <div className="p-3.5 rounded-[24px] space-y-2 flex flex-col justify-between" style={cardStyle}>
        <div>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <PieChart size={11} className="shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                {isIndonesian ? "Dominasi" : "Dominance"}
              </span>
            </div>
            <span className="text-[9.5px] font-mono font-semibold text-[var(--text-secondary)]">
              Top {top3.length}
            </span>
          </div>

          {top3.length > 0 ? (
            <div className="space-y-1.5">
              {top3.map((h) => (
                <div key={h.id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-[var(--text-primary)] truncate max-w-[65px]">
                      {h.symbol}
                    </span>
                    <span className="font-mono font-semibold text-[var(--text-secondary)]">
                      {h.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden bg-white/[0.08] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(Math.max(h.pct, 4), 100)}%`,
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.75)"
                          : "rgba(24, 24, 27, 0.75)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-tertiary)] italic py-2">
              {isIndonesian ? "Belum ada aset" : "No assets recorded"}
            </p>
          )}
        </div>

        <p className="text-[9.5px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--glass-border)] truncate">
          {isIndonesian ? "Porsi dari total aset" : "Share of net wealth"}
        </p>
      </div>

      {/* ── CARD 4: 3-TIER LIQUIDITY STRUCTURE ────────────────────────────── */}
      <div className="p-3.5 rounded-[24px] space-y-2 flex flex-col justify-between" style={cardStyle}>
        <div>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] mb-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <Layers size={11} className="shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                {isIndonesian ? "Likuiditas" : "Liquidity"}
              </span>
            </div>
            <span className="text-[9.5px] font-mono font-semibold text-[var(--text-secondary)]">
              3-Tier
            </span>
          </div>

          <div className="space-y-1 text-[10.5px]">
            {/* Liquid */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-tertiary)]">
                {isIndonesian ? "Likuid" : "Liquid"}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {liquiditySummary.liquidPct.toFixed(0)}%
              </span>
            </div>

            {/* Growth */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-tertiary)]">
                {isIndonesian ? "Growth" : "Growth"}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {liquiditySummary.growthPct.toFixed(0)}%
              </span>
            </div>

            {/* Defensive */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-tertiary)]">
                {isIndonesian ? "Defensif" : "Defensive"}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {liquiditySummary.defensivePct.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Stacked mini progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-white/[0.08] dark:bg-white/[0.06] p-0.2 gap-0.5">
          <div
            style={{ width: `${Math.max(liquiditySummary.liquidPct, 5)}%` }}
            className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
          />
          <div
            style={{ width: `${Math.max(liquiditySummary.growthPct, 5)}%` }}
            className="h-full rounded-full bg-blue-500/80 transition-all duration-300"
          />
          <div
            style={{ width: `${Math.max(liquiditySummary.defensivePct, 5)}%` }}
            className="h-full rounded-full bg-amber-500/80 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
}
