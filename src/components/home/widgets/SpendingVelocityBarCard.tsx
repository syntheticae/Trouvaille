import { Info, TrendingUp } from "lucide-react";
import { formatRupiah } from "../../../lib/utils";
import type { WidgetSize } from "../../../lib/widgetLayoutTypes";
import { CompactShell } from "./CompactShell";

export function SpendingVelocityBarCard({
  dailyOutlays,
  dailyAverage,
  size = "half",
  onOpenDetail,
}: {
  dailyOutlays: { dayLabel: string; amount: number; dateStr?: string }[];
  dailyAverage: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const maxAmount = Math.max(1, ...dailyOutlays.map((d) => d.amount));
  const total7d = dailyOutlays.reduce((sum, d) => sum + d.amount, 0);
  const peakDay = dailyOutlays.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    dailyOutlays[0] || { dayLabel: "-", amount: 0 },
  );
  const aboveAvgDays = dailyOutlays.filter((d) => d.amount > dailyAverage).length;

  const bars = (
    <div className="flex items-end justify-between gap-1.5 h-11 w-full pt-1">
      {dailyOutlays.map((d, i) => {
        const heightPct = Math.min(100, Math.max(8, (d.amount / maxAmount) * 100));
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${heightPct}%`,
                background:
                  d.amount > dailyAverage * 1.3
                    ? "var(--text-primary)"
                    : "rgba(255,255,255,0.25)",
              }}
              title={`${d.dayLabel}: ${formatRupiah(d.amount)}`}
            />
            <span className="text-[8px] font-semibold text-[var(--text-tertiary)]">
              {d.dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (size === "half") {
    return (
      <CompactShell title="7D Velocity" onOpenDetail={onOpenDetail}>
        <div className="flex-1 flex items-center py-0.5">{bars}</div>
        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-white/5 shrink-0">
          <span>Avg Pace</span>
          <span className="font-semibold text-[var(--text-primary)] amount">
            {formatRupiah(dailyAverage)}/d
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
            <TrendingUp size={14} className="text-[var(--text-primary)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              7-Day Outflow Velocity
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Daily spending run rate vs monthly average benchmark
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full amount"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            Avg: {formatRupiah(dailyAverage)}/day
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

      {/* 3 Summary Metric Pills */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
            7-Day Total Outflow
          </span>
          <span className="text-[13px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(total7d)}
          </span>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
            7-Day Daily Run Rate
          </span>
          <span className="text-[13px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {formatRupiah(Math.round(total7d / 7))}/d
          </span>
        </div>
        <div
          className="p-2.5 rounded-xl text-center"
          style={{ background: "var(--glass-fill)" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Peak Outlay Day
          </span>
          <span className="text-[13px] font-semibold amount text-[var(--text-primary)] block mt-0.5">
            {peakDay.dayLabel} ({formatRupiah(peakDay.amount)})
          </span>
        </div>
      </div>

      {/* Taller Enhanced Bars with Exact Amounts */}
      <div className="pt-2">
        <div className="flex items-end justify-between gap-2 h-20 w-full relative">
          {/* Average Benchmark Guide Line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-white/20 pointer-events-none z-10"
            style={{
              bottom: `${Math.min(95, Math.max(10, (dailyAverage / maxAmount) * 100))}%`,
            }}
          >
            <span className="text-[8px] font-mono text-[var(--text-tertiary)] absolute right-0 -top-3.5 px-1 bg-black/40 rounded">
              Avg: {formatRupiah(dailyAverage)}
            </span>
          </div>

          {dailyOutlays.map((d, i) => {
            const heightPct = Math.min(100, Math.max(6, (d.amount / maxAmount) * 100));
            const isPeak = d.amount === peakDay.amount && d.amount > 0;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end z-20 group relative cursor-pointer"
              >
                {/* Amount Label Above Bar */}
                <span className="text-[8.5px] font-mono font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                  {d.amount > 0
                    ? `${Math.round(d.amount / 1000)}k`
                    : "0"}
                </span>

                <div
                  className="w-full rounded-md transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    background: isPeak
                      ? "var(--text-primary)"
                      : d.amount > dailyAverage
                        ? "rgba(255, 255, 255, 0.6)"
                        : d.amount > 0
                          ? "rgba(255, 255, 255, 0.22)"
                          : "rgba(255, 255, 255, 0.06)",
                    boxShadow: isPeak
                      ? "0 0 10px rgba(255, 255, 255, 0.35)"
                      : "none",
                  }}
                  title={`${d.dayLabel}: ${formatRupiah(d.amount)}`}
                />

                <span className="text-[9px] font-semibold text-[var(--text-tertiary)]">
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
        <span>
          {aboveAvgDays > 0
            ? `${aboveAvgDays} of 7 days exceeded daily average allowance.`
            : "All 7 days maintained below daily average allowance."}
        </span>
        <span className="font-semibold text-[var(--text-secondary)]">
          Pacing: {Math.round(total7d / 7) <= dailyAverage ? "Controlled" : "Elevated"}
        </span>
      </div>
    </section>
  );
}
