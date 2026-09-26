// ======================================================================
// TROUVAILLE CAPITAL ALLOCATION & LIQUIDITY CARD
// Multi-Tier Liquidity Structure & Stacked Asset Class Segments
// Complies with GEMINI.md Apple Monochrome Luxury & Milky Glass Design
// ======================================================================

import { PieChart, Shield, Zap, Lock } from "lucide-react";
import { formatRupiah } from "../../lib/utils";

export interface AssetAllocationItem {
  type: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface LiquiditySummary {
  liquid: number;
  liquidPct: number;
  growth: number;
  growthPct: number;
  defensive: number;
  defensivePct: number;
}

interface CapitalAllocationCardProps {
  totalMarketValuation: number;
  allocationBreakdown: AssetAllocationItem[];
  liquiditySummary: LiquiditySummary;
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance?: boolean;
}

export function CapitalAllocationCard({
  totalMarketValuation,
  allocationBreakdown,
  liquiditySummary,
  isDark,
  isIndonesian,
  hideBalance = false,
}: CapitalAllocationCardProps) {
  return (
    <div
      className="p-5 rounded-[26px] space-y-4 relative overflow-hidden select-none transition-all"
      style={{
        background: isDark
          ? "var(--bg-elevated)"
          : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
        border: isDark
          ? "1px solid var(--glass-border)"
          : "1px solid rgba(15,23,42,0.06)",
        boxShadow: isDark
          ? "var(--shadow-card)"
          : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <PieChart size={16} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
              {isIndonesian ? "Alokasi Modal & Likuiditas" : "Capital Allocation & Liquidity"}
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
              {isIndonesian
                ? "Profil diversifikasi & ketahanan modal"
                : "Diversification profile & liquidity depth"}
            </p>
          </div>
        </div>

        {/* Total Metric */}
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            {isIndonesian ? "Valuasi Total" : "Total Assets"}
          </span>
          <span className="font-mono text-[13px] font-bold text-[var(--text-primary)]">
            {hideBalance ? "••••••••" : formatRupiah(totalMarketValuation)}
          </span>
        </div>
      </div>

      {/* Segmented Stacked Bar */}
      {allocationBreakdown.length > 0 ? (
        <div className="space-y-2">
          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-white/[0.06] border border-white/10 p-0.5 gap-0.5">
            {allocationBreakdown.map((item) => (
              <div
                key={item.type}
                style={{
                  width: `${Math.max(item.pct, 3)}%`,
                  backgroundColor: item.color,
                }}
                className="h-full rounded-full transition-all duration-300"
                title={`${item.label}: ${item.pct.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Allocation Legend Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {allocationBreakdown.map((item) => (
              <div
                key={item.type}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[var(--text-secondary)]">{item.label}</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {item.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-[var(--text-tertiary)] italic">
          {isIndonesian ? "Belum ada alokasi aset tercatat" : "No asset allocations recorded"}
        </p>
      )}

      {/* Three Liquidity Tier Capsules */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--glass-border)]">
        {/* Tier 1: Liquid */}
        <div
          className="p-3 rounded-2xl space-y-1"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.02)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <Shield size={12} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isIndonesian ? "Likuid" : "Liquid"}
            </span>
          </div>
          <p className="text-[14px] font-bold font-mono text-[var(--text-primary)] leading-tight">
            {liquiditySummary.liquidPct.toFixed(0)}%
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
            {hideBalance ? "••••" : formatRupiah(liquiditySummary.liquid)}
          </p>
        </div>

        {/* Tier 2: Growth */}
        <div
          className="p-3 rounded-2xl space-y-1"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.02)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <Zap size={12} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isIndonesian ? "Bertumbuh" : "Growth"}
            </span>
          </div>
          <p className="text-[14px] font-bold font-mono text-[var(--text-primary)] leading-tight">
            {liquiditySummary.growthPct.toFixed(0)}%
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
            {hideBalance ? "••••" : formatRupiah(liquiditySummary.growth)}
          </p>
        </div>

        {/* Tier 3: Defensive */}
        <div
          className="p-3 rounded-2xl space-y-1"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(0, 0, 0, 0.02)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <Lock size={12} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isIndonesian ? "Defensif" : "Defensive"}
            </span>
          </div>
          <p className="text-[14px] font-bold font-mono text-[var(--text-primary)] leading-tight">
            {liquiditySummary.defensivePct.toFixed(0)}%
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
            {hideBalance ? "••••" : formatRupiah(liquiditySummary.defensive)}
          </p>
        </div>
      </div>
    </div>
  );
}
