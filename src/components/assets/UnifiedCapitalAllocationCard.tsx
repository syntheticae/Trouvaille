import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { RingChart, Ring, RingCenter } from "../ui/RingChart";
import { triggerHaptic } from "../../lib/haptics";

export interface UnifiedCapitalAllocationCardProps {
  liquidAssetsTotal: number;
  growthAssetsTotal: number;
  fixedAssetsTotal: number;
  liabilitiesTotal: number;
  totalGrossAssets: number;
  netWorth: number;
  solvencyScore: number;
  debtToAssetRatio: number;
  liquidPct: number;
  growthPct: number;
  fixedPct: number;
  capitalDeployment: number;
  isStealthMode: boolean;
  isIndonesian: boolean;
  isDark: boolean;
  onOpenLiquidDetail: () => void;
  onOpenGrowthDetail: () => void;
  onOpenFixedDetail: () => void;
  onOpenDebtDetail: () => void;
  onOpenConsolidatedDrawer?: () => void;
}

function formatAxisNumber(val: number, isIndonesian: boolean): string {
  if (val === 0) return "Rp 0";
  if (Math.abs(val) >= 1_000_000_000) {
    const b = val / 1_000_000_000;
    return `Rp ${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)} ${isIndonesian ? "M" : "B"}`;
  }
  if (Math.abs(val) >= 1_000_000) {
    const m = val / 1_000_000;
    return `Rp ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} ${isIndonesian ? "jt" : "M"}`;
  }
  if (Math.abs(val) >= 1_000) {
    const k = val / 1_000;
    return `Rp ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} ${isIndonesian ? "rb" : "k"}`;
  }
  return `Rp ${val.toLocaleString()}`;
}

export function UnifiedCapitalAllocationCard({
  liquidAssetsTotal,
  growthAssetsTotal,
  fixedAssetsTotal,
  liabilitiesTotal,
  totalGrossAssets,
  netWorth: _netWorth,
  solvencyScore,
  debtToAssetRatio,
  liquidPct,
  growthPct,
  fixedPct,
  capitalDeployment: _capitalDeployment,
  isStealthMode,
  isIndonesian,
  isDark,
  onOpenLiquidDetail,
  onOpenGrowthDetail,
  onOpenFixedDetail,
  onOpenDebtDetail,
  onOpenConsolidatedDrawer: _onOpenConsolidatedDrawer,
}: UnifiedCapitalAllocationCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Dataset for the 4 pillars formatted for RingChart
  const ringData = useMemo(() => {
    // Baseline maximum for arc progress calculation
    const baselineMax = Math.max(totalGrossAssets, liabilitiesTotal, 1);

    return [
      {
        key: "liquid",
        label: isIndonesian ? "Aset Lancar" : "Liquid Assets",
        fullName: isIndonesian ? "Kas & Aset Lancar" : "Cash & Liquid Assets",
        value: liquidAssetsTotal,
        maxValue: baselineMax,
        amount: liquidAssetsTotal,
        percentage: Number(liquidPct.toFixed(1)),
        desc: isIndonesian
          ? "Kas tunai, saldo rekening & cadangan stablecoin"
          : "Cash on hand, bank balances & stablecoins",
        color: isDark ? "#FFFFFF" : "#18181b",
        onClick: onOpenLiquidDetail,
      },
      {
        key: "growth",
        label: isIndonesian ? "Investasi" : "Investments",
        fullName: isIndonesian ? "Investasi & Portofolio Efek" : "Market Securities & Funds",
        value: growthAssetsTotal,
        maxValue: baselineMax,
        amount: growthAssetsTotal,
        percentage: Number(growthPct.toFixed(1)),
        desc: isIndonesian
          ? "Saham, reksa dana, obligasi & aset kripto"
          : "Public equities, funds, bonds & crypto",
        color: isDark ? "rgba(255, 255, 255, 0.70)" : "#52525b",
        onClick: onOpenGrowthDetail,
      },
      {
        key: "fixed",
        label: isIndonesian ? "Aset Riil" : "Real Assets",
        fullName: isIndonesian ? "Aset Riil & Berwujud" : "Real & Tangible Assets",
        value: fixedAssetsTotal,
        maxValue: baselineMax,
        amount: fixedAssetsTotal,
        percentage: Number(fixedPct.toFixed(1)),
        desc: isIndonesian
          ? "Emas batangan fisik, properti, tanah & barang berharga"
          : "Physical gold bullion, real estate & physical assets",
        color: isDark ? "rgba(255, 255, 255, 0.42)" : "#71717a",
        onClick: onOpenFixedDetail,
      },
      {
        key: "debt",
        label: isIndonesian ? "Liabilitas" : "Liabilities",
        fullName: isIndonesian ? "Liabilitas & Kewajiban" : "Liabilities & Debt Obligations",
        value: liabilitiesTotal,
        maxValue: baselineMax,
        amount: liabilitiesTotal,
        percentage: Number(debtToAssetRatio.toFixed(1)),
        desc: isIndonesian
          ? "Kartu kredit, paylater, pinjaman & kewajiban jatuh tempo"
          : "Credit cards, loans, paylater & obligations",
        color: isDark ? "rgba(255, 255, 255, 0.22)" : "#a1a1aa",
        onClick: onOpenDebtDetail,
      },
    ];
  }, [
    liquidAssetsTotal,
    growthAssetsTotal,
    fixedAssetsTotal,
    liabilitiesTotal,
    totalGrossAssets,
    liquidPct,
    growthPct,
    fixedPct,
    debtToAssetRatio,
    isIndonesian,
    isDark,
    onOpenLiquidDetail,
    onOpenGrowthDetail,
    onOpenFixedDetail,
    onOpenDebtDetail,
  ]);

  return (
    <div
      className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3 select-none"
      style={{
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Minimalist Header ────────────────── */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Layers
            size={15}
            strokeWidth={1.75}
            className="text-[var(--text-primary)]"
          />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
            {isIndonesian ? "Struktur Neraca" : "Balance Sheet"}
          </h3>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            {isIndonesian
              ? "Komposisi aset & liabilitas"
              : "Asset & liability composition"}
          </p>
        </div>
      </div>

      {/* ── 2. Two-Column Minimalist Layout (Left: Ring Gauge with Center Stat, Right: Legend) ────────── */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 pt-1">
        {/* Left Column: Upright Ring Gauge with Center Stat */}
        <div className="w-[125px] sm:w-[135px] shrink-0 flex items-center justify-center relative">
          <RingChart
            data={ringData}
            endAngle={(3 * Math.PI) / 2}
            size={120}
            strokeWidth={5.5}
            ringGap={3.2}
            startAngle={Math.PI / 2}
            hoveredIndex={hoveredIndex}
            onHoverChange={setHoveredIndex}
          >
            {ringData.map((item, index) => (
              <Ring index={index} key={item.label} />
            ))}
            <RingCenter defaultLabel={`${Math.round(solvencyScore)}%`}>
              {({ isHovered }) => (
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-[18px] sm:text-[20px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight leading-none amount ">
                    {isHovered && hoveredIndex !== null
                      ? `${ringData[hoveredIndex]?.percentage}%`
                      : `${Math.round(solvencyScore)}%`}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold mt-0.5 truncate max-w-[80px]">
                    {isHovered && hoveredIndex !== null
                      ? ringData[hoveredIndex]?.label
                      : isIndonesian
                        ? "Solvensi"
                        : "Solvency"}
                  </span>
                </div>
              )}
            </RingCenter>
          </RingChart>
        </div>

        {/* Right Column: Financial Legend */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
          {ringData.map((item, index) => {
            const isHovered = hoveredIndex === index;
            const isFaded = hoveredIndex !== null && !isHovered;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  item.onClick();
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`w-full py-1.5 px-2 rounded-lg transition-all text-left cursor-pointer group flex items-center justify-between border ${
                  isHovered
                    ? "bg-white/[0.08] dark:bg-white/[0.08] border-white/20 dark:border-white/20 shadow-xs"
                    : isFaded
                      ? "bg-transparent border-transparent opacity-35"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04]"
                }`}
                title={item.fullName}
              >
                <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                    style={{ background: item.color }}
                  />
                  <span className="text-[11px] sm:text-[11.5px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right ">
                  <span className="text-[9.5px] font-medium text-[var(--text-tertiary)] tabular-nums">
                    {item.percentage}%
                  </span>
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--text-primary)] tabular-nums">
                    {isStealthMode ? "••••" : formatAxisNumber(item.amount, isIndonesian)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
