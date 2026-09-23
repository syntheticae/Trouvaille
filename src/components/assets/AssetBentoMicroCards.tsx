// ======================================================================
// TROUVAILLE ASSET BENTO PILLARS (STRICTLY MONOCHROME)
// 2 Spacious Core Pillar Cards (1 Row x 2 Columns):
// [1] Inflow Velocity Spark    | [2] Liquid Runway & Buffer
// Strictly ZERO DUMMY DATA: All telemetry computed directly from real user state
// Strictly Non-Mixed Localization (100% Consistent English / Indonesian)
// Strictly ZERO Non-Monochrome Colors (Monochrome Apple Luxury Theme)
// ======================================================================

import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import type { MonthlyDeploymentItem } from "./MonthlyDeploymentBarCard";

interface AssetBentoMicroCardsProps {
  deploymentHistory: MonthlyDeploymentItem[];
  liquidRunwayMonths: number;
  liquidReserves: number;
  monthlyBurnRate: number;
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance?: boolean;
}

export function AssetBentoMicroCards({
  deploymentHistory,
  liquidRunwayMonths,
  liquidReserves,
  monthlyBurnRate,
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

  return (
    <div className="grid grid-cols-2 gap-3 select-none">
      {/* ── CARD 1: INFLOW VELOCITY SPARK ─────────────────────────────────── */}
      <div className="p-4 rounded-[26px] space-y-2.5 flex flex-col justify-between" style={cardStyle}>
        <div>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {isIndonesian ? "Inflow Modal" : "Inflow Velocity"}
            </span>
            <span className="text-[10px] font-mono font-semibold text-[var(--text-secondary)] shrink-0">
              {activeCount}/6 {isIndonesian ? "bln" : "mo"}
            </span>
          </div>
          <p className="font-mono text-[16px] font-bold text-[var(--text-primary)] leading-tight">
            {hideBalance ? "••••" : formatRupiah(totalDeployed)}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">
            {isIndonesian ? "Total injeksi 6 bln" : "6-month capital deployed"}
          </p>
        </div>

        {/* Micro Spark Bar Chart */}
        <div className="h-[44px] w-full pt-1">
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
      <div className="p-4 rounded-[26px] space-y-2.5 flex flex-col justify-between" style={cardStyle}>
        <div>
          <div className="flex items-center justify-between text-[var(--text-tertiary)] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {isIndonesian ? "Daya Tahan" : "Liquid Runway"}
            </span>

            {/* STRICTLY MONOCHROME BADGE */}
            <div
              className="px-2 py-0.5 rounded-full flex items-center gap-1 font-mono text-[9.5px] font-semibold shrink-0"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <ShieldCheck size={11} strokeWidth={2} className="text-[var(--text-primary)]" />
              <span>
                {isRunwaySafe
                  ? isIndonesian ? "Aman" : "Safe"
                  : isIndonesian ? "Waspada" : "Low"}
              </span>
            </div>
          </div>

          <p className="font-mono text-[16px] font-bold text-[var(--text-primary)] leading-tight">
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

        {/* Clean Stacked Breakdown (NO TEXT COLLISION OR TRUNCATION) */}
        <div className="pt-2 border-t border-[var(--glass-border)] space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--text-tertiary)] truncate">
              {isIndonesian ? "Kas Likuid:" : "Liquid Cash:"}
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {hideBalance ? "••••" : formatRupiah(liquidReserves)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="text-[var(--text-tertiary)] truncate">
              {isIndonesian ? "Pengeluaran:" : "Burn Rate:"}
            </span>
            <span className="font-mono font-semibold text-[var(--text-secondary)]">
              {hideBalance ? "••••" : formatRupiah(monthlyBurnRate)}/{isIndonesian ? "bln" : "mo"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
