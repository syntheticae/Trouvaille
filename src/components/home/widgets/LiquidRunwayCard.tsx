import { Info, ShieldCheck } from "lucide-react";
import { formatRupiah } from "../../../lib/utils";
import type { WidgetSize } from "../../../lib/widgetLayoutTypes";
import { CompactShell } from "./CompactShell";
import { FinancialGlossaryTooltip } from "../../common/FinancialGlossaryTooltip";

export function LiquidRunwayCard({
  runwayMonths,
  liquidAssets,
  monthlyBurn,
  size = "half",
  onOpenDetail,
}: {
  runwayMonths: number;
  liquidAssets: number;
  monthlyBurn: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const status =
    runwayMonths >= 12
      ? "Fortress Reserve"
      : runwayMonths >= 6
        ? "Ideal Buffer"
        : runwayMonths >= 3
          ? "Safety Net"
          : "Critical";

  // CFP 3-Tier Emergency Fund Benchmarks (3, 6, 12 Months)
  const maxBenchmarkMonths = 12;
  const overallCoveragePct = Math.min(
    100,
    Math.round((runwayMonths / maxBenchmarkMonths) * 100),
  );

  const nextTierInfo = (() => {
    if (runwayMonths < 3) {
      const deficit = Math.max(0, 3 * monthlyBurn - liquidAssets);
      return {
        label: "Tier 1: Safety Net (3 Bln)",
        deficit,
        desc: `Perlu ${formatRupiah(deficit)} lagi untuk mencapai jaring pengaman darurat 3 bulan.`,
      };
    }
    if (runwayMonths < 6) {
      const deficit = Math.max(0, 6 * monthlyBurn - liquidAssets);
      return {
        label: "Tier 2: Ideal Buffer (6 Bln)",
        deficit,
        desc: `Perlu ${formatRupiah(deficit)} lagi untuk mencapai standar aman 6 bulan pengeluaran.`,
      };
    }
    if (runwayMonths < 12) {
      const deficit = Math.max(0, 12 * monthlyBurn - liquidAssets);
      return {
        label: "Tier 3: Fortress Reserve (12 Bln)",
        deficit,
        desc: `Perlu ${formatRupiah(deficit)} lagi untuk benteng ketahanan mandiri 1 tahun penuh.`,
      };
    }
    return {
      label: "Benteng Mandiri Penuh (≥12 Bln)",
      deficit: 0,
      desc: "Ketahanan kas melebihi 12 bulan pengeluaran. Likuiditas darurat dalam kondisi prima.",
    };
  })();

  if (size === "half") {
    return (
      <CompactShell title="Runway" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex flex-col justify-center py-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
              Survival Horizon
            </span>
            <span
              className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md truncate max-w-[90px]"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {status}
            </span>
          </div>
          <p className="text-[20px] font-semibold amount text-[var(--text-primary)] leading-tight mt-0.5">
            {runwayMonths.toFixed(1)}{" "}
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              Mos
            </span>
          </p>
        </div>

        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span>Burn Rate</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(monthlyBurn)}/m
          </span>
        </div>
      </CompactShell>
    );
  }

  return (
    <section className="glass-surface p-4 rounded-[22px] select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <ShieldCheck size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
                Liquid Reserve & Emergency Runway
              </h3>
              <FinancialGlossaryTooltip term="solvency_runway" />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Ketahanan kas darurat berdasarkan rata-rata pengeluaran bulanan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {status} ({runwayMonths.toFixed(1)} Mos)
          </span>
          {onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Survival Runway
          </span>
          <p className="text-[16px] font-semibold amount text-[var(--text-primary)] mt-0.5">
            {runwayMonths.toFixed(1)} Mos
          </p>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Liquid Assets
          </span>
          <p className="text-[13px] font-semibold amount text-[var(--text-primary)] mt-0.5 truncate">
            {formatRupiah(liquidAssets)}
          </p>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Monthly Burn
          </span>
          <p className="text-[13px] font-semibold amount text-[var(--text-primary)] mt-0.5 truncate">
            {formatRupiah(monthlyBurn)}/m
          </p>
        </div>
      </div>

      {/* CFP 3-Tier Emergency Fund Progress Bar */}
      <div className="pt-1 space-y-1.5">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
          <span>Benchmark Dana Darurat (CFP Standard)</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {nextTierInfo.label}
          </span>
        </div>

        {/* Multi-milestone Progress Bar (Scale to 12 Mos: 25%=3m, 50%=6m, 100%=12m) */}
        <div className="relative">
          <div className="w-full h-2 rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
              style={{ width: `${overallCoveragePct}%` }}
            />
          </div>

          {/* Marker pins for 3 Mo (25%) and 6 Mo (50%) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--bg-elevated)] opacity-80"
            style={{ left: "25%" }}
            title="Tier 1: 3 Bulan"
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--bg-elevated)] opacity-80"
            style={{ left: "50%" }}
            title="Tier 2: 6 Bulan"
          />
        </div>

        {/* Milestone Labels */}
        <div className="flex justify-between text-[9px] text-[var(--text-tertiary)]">
          <span>0 Bln</span>
          <span className="text-center">3 Bln (Min)</span>
          <span className="text-center">6 Bln (Ideal)</span>
          <span>12 Bln (Benteng)</span>
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span className="line-clamp-1 flex-1 pr-2">
          {nextTierInfo.desc}
        </span>
        <span className="font-semibold text-[var(--text-secondary)] shrink-0 amount">
          Cadangan: {formatRupiah(liquidAssets)}
        </span>
      </div>
    </section>
  );
}
