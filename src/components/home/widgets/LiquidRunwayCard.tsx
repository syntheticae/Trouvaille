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
    runwayMonths >= 6
      ? "Comfort"
      : runwayMonths >= 3
        ? "Safe Buffer"
        : "Critical";

  const targetRunwayMonths = 6;
  const targetCoveragePct = Math.min(
    100,
    Math.round((runwayMonths / targetRunwayMonths) * 100),
  );

  if (size === "half") {
    return (
      <CompactShell title="Runway" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex flex-col justify-center py-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
              Survival Horizon
            </span>
            <span
              className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
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
              Capital survival horizon based on average monthly burn rate
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

      {/* Target Progress Bar */}
      <div className="pt-1">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
          <span>Target: 6 Months Emergency Reserve</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {targetCoveragePct}% Funded
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-700"
            style={{ width: `${targetCoveragePct}%` }}
          />
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>
          Liquid capital provides {runwayMonths.toFixed(1)} months of continuous survival runway.
        </span>
        <span className="font-semibold text-[var(--text-secondary)]">
          Target: {formatRupiah(monthlyBurn * targetRunwayMonths)}
        </span>
      </div>
    </section>
  );
}
