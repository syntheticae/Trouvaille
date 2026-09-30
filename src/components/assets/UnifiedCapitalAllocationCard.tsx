import { useMemo } from "react";
import { ChevronRight, Layers } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { formatRupiah } from "../../lib/utils";
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
  onOpenConsolidatedDrawer: () => void;
}

function formatAxisNumber(val: number, isIndonesian: boolean): string {
  if (val === 0) return "0";
  if (Math.abs(val) >= 1_000_000_000) {
    const b = val / 1_000_000_000;
    return `${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)} ${isIndonesian ? "M" : "B"}`;
  }
  if (Math.abs(val) >= 1_000_000) {
    const m = val / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} ${isIndonesian ? "jt" : "M"}`;
  }
  if (Math.abs(val) >= 1_000) {
    const k = val / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} ${isIndonesian ? "rb" : "k"}`;
  }
  return String(val);
}

const CustomBarTooltip = ({
  active,
  payload,
  label,
  isStealthMode,
}: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 14,
        padding: "8px 12px",
        boxShadow: "var(--shadow-card)",
      }}
      className="space-y-1 select-none pointer-events-none z-50 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-semibold text-[var(--text-primary)]">
          {data?.fullName || label}
        </span>
        <span className="font-semibold text-[var(--text-secondary)] tabular-nums">
          {data?.percentage}%
        </span>
      </div>
      <p className="text-[13px] font-bold text-[var(--text-primary)] amount">
        {isStealthMode ? "••••••••" : formatRupiah(data?.amount ?? 0)}
      </p>
      <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">
        {data?.desc}
      </p>
    </div>
  );
};

export function UnifiedCapitalAllocationCard({
  liquidAssetsTotal,
  growthAssetsTotal,
  fixedAssetsTotal,
  liabilitiesTotal,
  totalGrossAssets,
  netWorth,
  solvencyScore: _solvencyScore,
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
  onOpenConsolidatedDrawer,
}: UnifiedCapitalAllocationCardProps) {
  // Chart dataset for 4 pillars with institutional finance terminology
  const chartData = useMemo(() => {
    return [
      {
        key: "liquid",
        name: isIndonesian ? "Aset Lancar" : "Liquid Assets",
        fullName: isIndonesian ? "Kas & Aset Lancar" : "Cash & Liquid Assets",
        amount: liquidAssetsTotal,
        percentage: liquidPct.toFixed(1),
        desc: isIndonesian
          ? "Kas tunai, saldo rekening & cadangan stablecoin"
          : "Cash on hand, bank balances & stablecoins",
        fillColor: isDark ? "#FFFFFF" : "#18181b",
        onClick: onOpenLiquidDetail,
      },
      {
        key: "growth",
        name: isIndonesian ? "Investasi" : "Investments",
        fullName: isIndonesian ? "Investasi & Portofolio Efek" : "Market Securities & Funds",
        amount: growthAssetsTotal,
        percentage: growthPct.toFixed(1),
        desc: isIndonesian
          ? "Saham, reksa dana, obligasi & aset kripto"
          : "Public equities, funds, bonds & crypto",
        fillColor: isDark ? "#A1A1AA" : "#52525b",
        onClick: onOpenGrowthDetail,
      },
      {
        key: "fixed",
        name: isIndonesian ? "Aset Riil" : "Real Assets",
        fullName: isIndonesian ? "Aset Riil & Berwujud" : "Real & Tangible Assets",
        amount: fixedAssetsTotal,
        percentage: fixedPct.toFixed(1),
        desc: isIndonesian
          ? "Emas batangan fisik, properti, tanah & barang berharga"
          : "Physical gold bullion, real estate & physical assets",
        fillColor: isDark ? "#71717A" : "#a1a1aa",
        onClick: onOpenFixedDetail,
      },
      {
        key: "debt",
        name: isIndonesian ? "Liabilitas" : "Liabilities",
        fullName: isIndonesian ? "Liabilitas & Kewajiban" : "Liabilities & Debt Obligations",
        amount: liabilitiesTotal,
        percentage: debtToAssetRatio.toFixed(1),
        desc: isIndonesian
          ? "Kartu kredit, paylater, pinjaman & kewajiban jatuh tempo"
          : "Credit cards, loans, paylater & obligations",
        fillColor: isDark ? "#3F3F46" : "#e4e4e7",
        onClick: onOpenDebtDetail,
      },
    ];
  }, [
    liquidAssetsTotal,
    growthAssetsTotal,
    fixedAssetsTotal,
    liabilitiesTotal,
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

  const maxVal = Math.max(
    liquidAssetsTotal,
    growthAssetsTotal,
    fixedAssetsTotal,
    liabilitiesTotal,
    1,
  );

  // Compute clean, round upper tick ceiling for Y-axis
  const yDomainMax = useMemo(() => {
    if (maxVal <= 0) return 1_000_000;
    const order = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const normalized = maxVal / order;
    let factor = 1.2;
    if (normalized <= 2) factor = 2;
    else if (normalized <= 5) factor = 5;
    else factor = 10;
    return Math.ceil(factor * order);
  }, [maxVal]);

  return (
    <div
      className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3.5 select-none"
      style={{
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Master Header (Short & Executive) ─────────────────────────── */}
      <div className="flex items-center justify-between">
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
            <h3 className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {isIndonesian ? "Struktur Neraca" : "Balance Sheet"}
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {isIndonesian
                ? "Komposisi aset & liabilitas"
                : "Asset & liability composition"}
            </p>
          </div>
        </div>

        {/* View Full Consolidated Sheet Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenConsolidatedDrawer();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] text-[10.5px] font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
          title={
            isIndonesian ? "Buka Neraca Konsolidasi" : "View Full Balance Sheet"
          }
        >
          <span>{isIndonesian ? "Lihat Semua" : "View All"}</span>
          <ChevronRight size={12} strokeWidth={2} />
        </button>
      </div>

      {/* ── 2. Financial Context Strip (Keterangan) ────────────────────────── */}
      <div className="flex items-center justify-between pt-0.5 px-0.5 border-b border-[var(--glass-border)] pb-2.5">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium block">
            {isIndonesian ? "Total Aset" : "Gross Assets"}
          </span>
          <span className="text-[13.5px] font-bold text-[var(--text-primary)] amount tracking-tight">
            {isStealthMode ? "••••••••" : formatRupiah(totalGrossAssets)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium block">
            {isIndonesian ? "Kekayaan Bersih" : "Net Worth"}
          </span>
          <span className="text-[13.5px] font-bold text-[var(--text-primary)] amount tracking-tight">
            {isStealthMode ? "••••••••" : formatRupiah(netWorth)}
          </span>
        </div>
      </div>

      {/* ── 3. Unified Bar Chart with Balanced Margins & Clean Ticks ─────── */}
      <div className="h-[145px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
            barSize={32}
          >
            <CartesianGrid
              strokeDasharray="2 3"
              stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10.5,
                fill: isDark ? "rgba(255,255,255,0.7)" : "#52525b",
                fontFamily: "Urbanist",
                fontWeight: 600,
              }}
              dy={5}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={38}
              tickFormatter={(v) => formatAxisNumber(v, isIndonesian)}
              domain={[0, yDomainMax]}
              tickCount={3}
              tick={{
                fontSize: 9.5,
                fill: isDark ? "rgba(255,255,255,0.4)" : "#a1a1aa",
                fontFamily: "Urbanist",
                fontWeight: 600,
              }}
            />
            <Tooltip
              content={
                <CustomBarTooltip
                  isStealthMode={isStealthMode}
                />
              }
              cursor={{
                fill: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
                radius: 8,
              }}
            />
            <Bar
              dataKey="amount"
              radius={[6, 6, 0, 0]}
              onClick={(item: any) => {
                triggerHaptic("light");
                if (item?.onClick) item.onClick();
              }}
              className="cursor-pointer"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.fillColor}
                  stroke={
                    entry.key === "debt"
                      ? isDark
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(0,0,0,0.25)"
                      : "transparent"
                  }
                  strokeDasharray={entry.key === "debt" ? "3 3" : undefined}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 4. Interactive Financial Legend ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-[var(--glass-border)]">
        {chartData.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              triggerHaptic("light");
              item.onClick();
            }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all cursor-pointer text-left group active:scale-[0.98]"
            title={item.fullName}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: item.fillColor }}
              />
              <span className="text-[10.5px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                {item.name}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[var(--text-primary)] tabular-nums pl-1 shrink-0">
              {item.percentage}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
