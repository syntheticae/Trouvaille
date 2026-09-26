import { useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  runMonteCarloSimulation,
  type MonteCarloSimulationResult,
} from "../../lib/monteCarloEngine";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import {
  Flame,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface MonteCarloFireCardProps {
  netWorth: number;
  monthlyBurnRate: number;
  monthlySavings: number;
  hideBalance?: boolean;
  onOpenSimulator: () => void;
}

export function MonteCarloFireCard({
  netWorth,
  monthlyBurnRate,
  monthlySavings,
  hideBalance = false,
  onOpenSimulator,
}: MonteCarloFireCardProps) {
  const { isIndonesian } = useLanguage();

  // Run baseline Monte Carlo simulation with real user finances
  const simulation: MonteCarloSimulationResult = useMemo(() => {
    const annualExpenses = Math.max(12000000, monthlyBurnRate * 12);
    return runMonteCarloSimulation({
      initialNetWorth: Math.max(0, netWorth),
      monthlyContribution: Math.max(0, monthlySavings),
      annualExpenses,
      years: 20,
      expectedAnnualReturn: 0.085,
      annualVolatility: 0.15,
      annualInflation: 0.035,
      safeWithdrawalRate: 0.04,
      iterations: 350,
      language: isIndonesian ? "id" : "en",
    });
  }, [netWorth, monthlyBurnRate, monthlySavings, isIndonesian]);

  const { fireMilestones, successRate, resilienceRating, yearlyTrajectory } =
    simulation;

  const localizedResilience = isIndonesian
    ? resilienceRating === "Exceptional"
      ? "Sangat Tangguh"
      : resilienceRating === "High Resilience"
        ? "Ketahanan Tinggi"
        : resilienceRating === "Moderate"
          ? "Moderat"
          : resilienceRating === "Vulnerable"
            ? "Rentan"
            : "Kritis"
    : resilienceRating;

  // Chart data sampled every 2 years to keep the card chart lightweight
  const chartData = useMemo(() => {
    return yearlyTrajectory
      .filter((_, idx) => idx % 2 === 0 || idx === yearlyTrajectory.length - 1)
      .map((item) => ({
        yearLabel: item.year === 0 ? (isIndonesian ? "Sekarang" : "Now") : isIndonesian ? `Thn ${item.year}` : `Y${item.year}`,
        p10: item.p10,
        p50: item.p50,
        p90: item.p90,
        fireTarget: item.fireTarget,
      }));
  }, [yearlyTrajectory, isIndonesian]);

  const standardMilestone = fireMilestones.standard;
  const progressPercent = Math.min(100, Math.max(0, standardMilestone.currentProgressPct));

  return (
    <section
      className="p-5 rounded-[24px] glass-surface transition-all select-none"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Flame size={16} strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2
                className="text-[13px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Prospek Monte Carlo & FIRE" : "Monte Carlo & FIRE Outlook"}
              </h2>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  background: "var(--glass-fill-strong)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {isIndonesian ? "Lab Stokastik" : "Stochastic Lab"}
              </span>
            </div>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Prakiraan kemandirian probabilistik 1.000 lintasan"
                : "1,000-path probabilistic independence forecast"}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic("light");
            onOpenSimulator();
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
          title={isIndonesian ? "Konfigurasi Lab Simulasi Monte Carlo" : "Configure Monte Carlo Simulation Lab"}
          aria-label={isIndonesian ? "Konfigurasi Lab Simulasi Monte Carlo" : "Configure Monte Carlo Simulation Lab"}
        >
          <SlidersHorizontal size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Hero Bento Statistics */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Left: FIRE Progress */}
        <div
          className="p-3.5 rounded-2xl flex flex-col justify-between"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Progres FIRE" : "FIRE Progress"}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[20px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {progressPercent}%
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "dari Target" : "of Goal"}
              </span>
            </div>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden mt-2.5"
            style={{ background: "var(--glass-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                background: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Right: Monte Carlo Probability */}
        <div
          className="p-3.5 rounded-2xl flex flex-col justify-between"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Probabilitas Sukses" : "Success Probability"}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[20px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {successRate}%
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Keyakinan" : "Confidence"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {successRate >= 75 ? (
              <ShieldCheck size={12} style={{ color: "var(--text-secondary)" }} />
            ) : (
              <ShieldAlert size={12} style={{ color: "var(--text-tertiary)" }} />
            )}
            <span
              className="text-[10px] font-bold tracking-tight"
              style={{ color: "var(--text-secondary)" }}
            >
              {localizedResilience}
            </span>
          </div>
        </div>
      </div>

      {/* Stochastic Fan Chart Preview */}
      <div
        className="p-3 rounded-2xl mb-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex justify-between items-center mb-2 px-1">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Dispersi P10 / Median / P90" : "P10 / Median / P90 Dispersion"}
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
              <span className="w-2 h-0.5 rounded-full bg-[var(--text-tertiary)]" /> Bear
            </span>
            <span className="flex items-center gap-1 font-bold" style={{ color: "var(--text-primary)" }}>
              <span className="w-2 h-0.5 rounded-full bg-[var(--text-primary)]" /> Median
            </span>
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              <span className="w-2 h-0.5 rounded-full bg-[var(--text-secondary)]" /> Bull
            </span>
          </div>
        </div>

        <div className="h-[125px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--text-primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--text-primary)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="yearLabel"
                tick={{
                  fontSize: 9,
                  fill: "var(--text-tertiary)",
                  fontWeight: 600,
                  fontFamily: "Urbanist",
                }}
                axisLine={false}
                tickLine={false}
                dy={3}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div
                      className="p-2.5 rounded-xl text-[11px] font-medium"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        boxShadow: "0 8px 24px var(--shadow-strength)",
                      }}
                    >
                      <p className="font-bold text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                        {isIndonesian ? "Garis Waktu" : "Timeline"}: {label}
                      </p>
                      <p className="text-[var(--text-primary)]">
                        Median: {hideBalance ? "••••••" : formatRupiah(data.p50)}
                      </p>
                      <p className="text-[var(--text-tertiary)] text-[10px]">
                        Bear (P10): {hideBalance ? "••••••" : formatRupiah(data.p10)}
                      </p>
                      <p className="text-[var(--text-secondary)] text-[10px]">
                        Bull (P90): {hideBalance ? "••••••" : formatRupiah(data.p90)}
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={standardMilestone.targetAmount}
                stroke="var(--glass-border)"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="p90"
                stroke="none"
                fill="url(#mcBand)"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="p50"
                stroke="var(--text-primary)"
                strokeWidth={2}
                fill="none"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="p10"
                stroke="var(--text-tertiary)"
                strokeWidth={1}
                strokeDasharray="2 2"
                fill="none"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3 FIRE Milestones Bento */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[fireMilestones.lean, fireMilestones.standard, fireMilestones.fat].map((m) => (
          <div
            key={m.type}
            className="p-2.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider truncate"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {m.label}
                </span>
                {m.isAchieved && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
                )}
              </div>
              <p
                className="text-[12px] font-bold tracking-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {hideBalance ? "••••••" : formatRupiah(m.targetAmount)}
              </p>
            </div>
            <div className="mt-2 pt-1.5 border-t border-[var(--glass-border)]">
              <span
                className="text-[10px] font-bold block truncate"
                style={{
                  color: m.isAchieved
                    ? "var(--text-primary)"
                    : m.estimatedYearsMedian !== null
                    ? "var(--text-secondary)"
                    : "var(--text-tertiary)",
                }}
              >
                {m.isAchieved
                  ? (isIndonesian ? "Tercapai" : "Achieved")
                  : m.estimatedYearsMedian !== null
                  ? `~${m.estimatedYearsMedian} ${isIndonesian ? "thn" : "yrs"}`
                  : (isIndonesian ? ">20 thn" : ">20 yrs")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA to Launch Simulator */}
      <button
        onClick={() => {
          triggerHaptic("medium");
          onOpenSimulator();
        }}
        className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between font-bold text-[12px] active:scale-[0.99] transition-transform select-none"
        style={{
          background: "var(--glass-fill)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-primary)",
        }}
      >
        <span className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--text-tertiary)" }} />
          {isIndonesian ? "Buka Lab Simulasi Monte Carlo & FIRE" : "Launch Monte Carlo & FIRE Simulation Lab"}
        </span>
        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
      </button>
    </section>
  );
}
