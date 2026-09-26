// ======================================================================
// TROUVAILLE PORTFOLIO INSIGHT CARDS
// Reusing Visual Grammar from Financial Wrapped Modal & wrappedAnalytics:
// [1] Diversification Ring Gauge (Herfindahl Index Concentration Score)
// [2] Asset Allocation Horizontal Bars (Crypto / Stocks / Gold / Cash)
// [3] Unrealized Gain per Asset (Stacked Cascade Comparison Bars)
// [4] Preserved Risk & Volatility Profile + Wealth Intelligence & Insights
// Strictly Monochrome | Zero Dummy Data | English / Indonesian
// ======================================================================

import { useMemo } from "react";
import {
  Scale,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import {
  calculatePortfolioDiversification,
  calculateAssetClassAllocation,
  calculateUnrealizedGains,
} from "../../lib/portfolioAnalytics";
import type { InvestmentHolding } from "../../types";

interface PortfolioInsightCardsProps {
  holdings: InvestmentHolding[];
  usdtHolding: {
    symbol: string;
    name: string;
    units: number;
    costBasis: number;
    marketValue: number;
  };
  liquidCash: number;
  totalMarketValuation: number;
  monthlyBurnRate: number;
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance?: boolean;
  onSelectHolding?: (symbolOrId: string) => void;
}

export function PortfolioInsightCards({
  holdings,
  usdtHolding,
  liquidCash,
  totalMarketValuation,
  monthlyBurnRate,
  isDark,
  isIndonesian,
  hideBalance = false,
  onSelectHolding,
}: PortfolioInsightCardsProps) {
  const cardStyle = {
    background: "var(--bg-elevated)",
    boxShadow: "var(--shadow-card)",
  };

  // Compile combined holdings list for analytics
  const combinedHoldingsForAnalytics = useMemo(() => {
    const list: Array<{
      id: string;
      symbol: string;
      name: string;
      units: number;
      costBasis: number;
      marketValue: number;
      asset_type: any;
    }> = [];

    if (usdtHolding.units > 0 || usdtHolding.marketValue > 0) {
      list.push({
        id: "holding-usdt",
        symbol: "USDT",
        name: "Tether USD",
        units: usdtHolding.units,
        costBasis: usdtHolding.costBasis,
        marketValue: usdtHolding.marketValue,
        asset_type: "crypto",
      });
    }

    holdings.forEach((h) => {
      const costBasis =
        h.units * (h.avg_buy_price > 0 ? h.avg_buy_price : h.current_price);
      const marketVal = h.units * h.current_price;
      list.push({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        units: h.units,
        costBasis,
        marketValue: marketVal,
        asset_type: h.asset_type,
      });
    });

    return list;
  }, [holdings, usdtHolding]);

  // 1. Diversification Score (Herfindahl Index)
  const diversification = useMemo(() => {
    return calculatePortfolioDiversification(
      combinedHoldingsForAnalytics.map((h) => ({
        id: h.id,
        marketValue: h.marketValue,
      })),
      liquidCash,
    );
  }, [combinedHoldingsForAnalytics, liquidCash]);

  // 2. 4-Class Asset Allocation
  const allocation = useMemo(() => {
    return calculateAssetClassAllocation(
      combinedHoldingsForAnalytics.map((h) => ({
        asset_type: h.asset_type,
        marketValue: h.marketValue,
      })),
      liquidCash,
    );
  }, [combinedHoldingsForAnalytics, liquidCash]);

  // 3. Unrealized Gains per Asset (Sorted descending by highest gain)
  const unrealizedGains = useMemo(() => {
    return calculateUnrealizedGains(combinedHoldingsForAnalytics);
  }, [combinedHoldingsForAnalytics]);

  // SVG Concentric Ring Parameters
  const ringRadius = 26;
  const strokeWidth = 5.5;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset =
    circumference - (diversification.score / 100) * circumference;

  return (
    <div className="space-y-3.5 select-none pt-1">
      {/* Section Header */}
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
          {isIndonesian ? "Insight Portofolio" : "Portfolio Insights"}
        </h3>
        <span className="text-[10.5px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
          {isIndonesian ? "Diagnostik Cerdas" : "Smart Telemetry"}
        </span>
      </div>

      {/* Row 1: 2x2 Bento Matrix (Diversification + Asset Allocation) */}
      <div className="grid grid-cols-2 gap-3">
        {/* ── CARD 1: DIVERSIFICATION CONCENTRIC RING GAUGE ───────────────── */}
        <div
          className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3 flex flex-col justify-between"
          style={cardStyle}
        >
          <div>
            <h4 className="text-[13px] font-bold tracking-tight text-[var(--text-primary)]">
              {isIndonesian ? "Diversifikasi" : "Diversification"}
            </h4>
            <p className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
              {isIndonesian ? "Skor konsentrasi aset" : "Asset concentration score"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 pb-1">
            {/* Circular Ring Gauge */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 64 64">
                {/* Background Ring */}
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Active Score Arc */}
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  stroke={isDark ? "#FFFFFF" : "#18181B"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
            </div>

            {/* Score & Status */}
            <div className="text-right min-w-0 pr-1">
              <span className="font-mono text-[28px] font-light tracking-tight text-[var(--text-primary)] block leading-none">
                {diversification.score}
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] block mt-1 truncate">
                {isIndonesian
                  ? diversification.status === "Overexposed"
                    ? "Terkonsentrasi"
                    : diversification.status === "Balanced"
                      ? "Seimbang"
                      : "Terdiversifikasi"
                  : diversification.status}
              </span>
            </div>
          </div>
        </div>

        {/* ── CARD 2: ASSET ALLOCATION (4 HORIZONTAL BARS) ────────────────── */}
        <div
          className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between"
          style={cardStyle}
        >
          <div>
            <h4 className="text-[13px] font-bold tracking-tight text-[var(--text-primary)]">
              {isIndonesian ? "Alokasi Aset" : "Asset Allocation"}
            </h4>
            <p className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
              {isIndonesian
                ? `${allocation.activeClassesCount} dari 4 kelas terisi`
                : `${allocation.activeClassesCount} of 4 classes filled`}
            </p>
          </div>

          {/* 4 Strict Classes (Crypto, Stocks, Gold, Cash) */}
          <div className="space-y-2 pt-0.5">
            {allocation.categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 text-[11px]">
                <span className="text-[var(--text-secondary)] font-medium w-11 truncate shrink-0">
                  {isIndonesian
                    ? cat.id === "stock"
                      ? "Saham"
                      : cat.id === "gold"
                        ? "Emas"
                        : cat.id === "cash"
                          ? "Kas"
                          : "Crypto"
                    : cat.label}
                </span>

                {/* Progress Bar Track */}
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/[0.08] dark:bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, cat.sharePct))}%`,
                      backgroundColor:
                        cat.sharePct > 0
                          ? isDark
                            ? "rgba(255, 255, 255, 0.9)"
                            : "rgba(24, 24, 27, 0.9)"
                          : "transparent",
                    }}
                  />
                </div>

                {/* Percentage Share */}
                <span className="font-mono font-semibold text-[10.5px] text-[var(--text-primary)] text-right w-9 shrink-0">
                  {cat.sharePct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARD 3: UNREALIZED GAIN PER ASSET (STACKED CASCADE) ───────────── */}
      <div
        className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3 relative overflow-hidden"
        style={cardStyle}
      >
        <div>
          <h4 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Unrealized Gain per Aset" : "Unrealized Gain per Asset"}
          </h4>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            {isIndonesian
              ? "Cost basis vs nilai pasar saat ini"
              : "Cost basis vs current market value"}
          </p>
        </div>

        {/* List of Holdings Sorted by Gain */}
        <div className="space-y-2.5 pt-1">
          {unrealizedGains.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectHolding?.(item.symbol)}
              className={`p-3.5 rounded-2xl space-y-2 transition-all ${
                onSelectHolding ? "cursor-pointer active:scale-[0.99]" : ""
              }`}
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.025)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {/* Header: Symbol & Units + Monochrome Gain % */}
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-[var(--text-primary)]">
                    {item.symbol}
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-[var(--text-secondary)] font-medium">
                    {item.units.toLocaleString("id-ID", {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                </div>

                {/* Strictly Monochrome Gain Badge */}
                <span className="font-mono font-semibold text-[12px] text-[var(--text-primary)]">
                  {item.floatingProfitPct >= 0 ? "+" : ""}
                  {item.floatingProfitPct.toFixed(1)}%
                </span>
              </div>

              {/* Stacked Comparative Progress Bar (Cost Basis vs Market Value) */}
              <div className="w-full h-2 rounded-full overflow-hidden bg-white/[0.08] dark:bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(10, item.costRatioPct))}%`,
                    background: isDark
                      ? "linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.95) 100%)"
                      : "linear-gradient(90deg, rgba(24,24,27,0.65) 0%, rgba(24,24,27,0.9) 100%)",
                  }}
                />
              </div>

              {/* Footer: Cost Basis on Left, Current Valuation on Right */}
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--text-tertiary)]">
                  {isIndonesian ? "Modal: " : "Cost "}
                  {hideBalance ? "••••" : formatRupiah(item.costBasis)}
                </span>
                <span className="text-[var(--text-secondary)] font-medium">
                  {isIndonesian ? "Kini: " : "Current "}
                  {hideBalance ? "••••" : formatRupiah(item.marketValue)}
                </span>
              </div>
            </div>
          ))}

          {unrealizedGains.length === 0 && (
            <p className="text-center text-[12px] text-[var(--text-tertiary)] py-4">
              {isIndonesian
                ? "Belum ada aset pasar tercatat."
                : "No market assets recorded yet."}
            </p>
          )}
        </div>
      </div>

      {/* ── CARD 4: PRESERVED RISK & VOLATILITY PROFILE ───────────────────── */}
      <div
        className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3.5 relative overflow-hidden"
        style={cardStyle}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[13px] font-bold tracking-tight text-[var(--text-primary)]">
              {isIndonesian ? "Profil Risiko & Volatilitas" : "Risk & Volatility Profile"}
            </h4>
            <p className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
              {isIndonesian
                ? "Distribusi modal antar kelas ketahanan"
                : "Capital distribution across volatility tiers"}
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Scale size={14} className="text-[var(--text-primary)]" />
          </div>
        </div>

        {/* 2-Tier Breakdown */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Defensive & Liquid */}
          <div
            className="p-3 rounded-2xl space-y-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {isIndonesian ? "Defensif & Kas" : "Defensive & Cash"}
              </span>
              <ShieldCheck size={12} className="text-[var(--text-secondary)]" />
            </div>
            <p className="text-[14px] font-mono font-semibold text-[var(--text-primary)] leading-tight">
              {hideBalance ? "••••" : formatRupiah(liquidCash)}
            </p>
            <p className="text-[9.5px] text-[var(--text-tertiary)]">
              {totalMarketValuation > 0
                ? `${((liquidCash / totalMarketValuation) * 100).toFixed(1)}${isIndonesian ? "% portofolio" : "% portfolio"}`
                : "0%"}
            </p>
          </div>

          {/* Growth & Market Assets */}
          <div
            className="p-3 rounded-2xl space-y-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {isIndonesian ? "Pasar & Pertumbuhan" : "Market & Growth"}
              </span>
              <TrendingUp size={12} className="text-[var(--text-secondary)]" />
            </div>
            <p className="text-[14px] font-mono font-semibold text-[var(--text-primary)] leading-tight">
              {hideBalance
                ? "••••"
                : formatRupiah(Math.max(0, totalMarketValuation - liquidCash))}
            </p>
            <p className="text-[9.5px] text-[var(--text-tertiary)]">
              {totalMarketValuation > 0
                ? `${(((totalMarketValuation - liquidCash) / totalMarketValuation) * 100).toFixed(1)}${isIndonesian ? "% portofolio" : "% portfolio"}`
                : "0%"}
            </p>
          </div>
        </div>
      </div>

      {/* ── CARD 5: PRESERVED WEALTH INTELLIGENCE & INSIGHTS ──────────────── */}
      <div
        className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 relative overflow-hidden"
        style={cardStyle}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-[var(--text-primary)]" />
          <h4 className="text-[13px] font-bold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Kecerdasan Kekayaan & Rekomendasi" : "Wealth Intelligence & Insights"}
          </h4>
        </div>

        <div className="space-y-2 text-[11px] leading-relaxed pt-1">
          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p className="text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">
                {isIndonesian ? "Ketahanan Valuta:" : "Currency Resilience:"}
              </strong>{" "}
              {isIndonesian
                ? `Kepemilikan USDT & berdenominasi asing mencakup ${allocation.categories.find((c) => c.id === "crypto")?.sharePct.toFixed(1) || 0}% dari total portofolio Anda, memberi stabilitas lindung nilai terhadap volatilitas lokal.`
                : `USDT & foreign-denominated holdings comprise ${allocation.categories.find((c) => c.id === "crypto")?.sharePct.toFixed(1) || 0}% of your total portfolio, providing hedge stability against local volatility.`}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 opacity-70"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p className="text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">
                {isIndonesian ? "Ketangkasan Modal:" : "Capital Agility:"}
              </strong>{" "}
              {isIndonesian
                ? `Cadangan likuid Anda menyediakan ${monthlyBurnRate > 0 ? (liquidCash / monthlyBurnRate).toFixed(1) : "12.0"} bulan pertahanan tangguh tanpa perlu likuidasi paksa aset pasar.`
                : `Your liquid reserves provide ${monthlyBurnRate > 0 ? (liquidCash / monthlyBurnRate).toFixed(1) : "12.0"} months of resilient defense without forced liquidation of market holdings.`}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 opacity-50"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p className="text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">
                {isIndonesian ? "Alokasi Strategis:" : "Strategic Allocation:"}
              </strong>{" "}
              {isIndonesian
                ? diversification.status === "Overexposed"
                  ? "Modal Anda sangat terkonsentrasi pada satu aset. Pertimbangkan untuk mendiversifikasi secara sistematis ke kelas aset sekunder (saham, cadangan kas, emas)."
                  : "Alokasi modal Anda seimbang dengan baik. Lanjutkan disiplin DCA rutin ke aset-aset inti."
                : diversification.status === "Overexposed"
                  ? "Your capital is heavily concentrated in a single asset. Consider systematically spreading into secondary asset classes (equities, cash reserves, gold)."
                  : "Your capital allocation is well balanced. Continue regular DCA discipline into core assets."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
