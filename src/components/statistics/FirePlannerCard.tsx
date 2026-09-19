import { useMemo } from "react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import {
  Flame,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  Hourglass,
} from "lucide-react";

interface FirePlannerCardProps {
  netWorth: number;
  monthlyBurnRate: number;
  monthlySavings: number;
  hideBalance?: boolean;
  onOpenPlanner: () => void;
}

export function FirePlannerCard({
  netWorth,
  monthlyBurnRate,
  monthlySavings,
  hideBalance = false,
  onOpenPlanner,
}: FirePlannerCardProps) {
  // SWR default 4% (25x rule)
  const swr = 0.04;
  const annualExpenses = Math.max(12000000, (monthlyBurnRate || 3500000) * 12);

  const standardFireNumber = Math.round(annualExpenses / swr);
  const leanFireNumber = Math.round(standardFireNumber * 0.7);
  const fatFireNumber = Math.round(standardFireNumber * 1.4);

  const currentCapital = Math.max(0, netWorth);
  const progressPct = Math.min(100, Math.max(0, Number(((currentCapital / standardFireNumber) * 100).toFixed(1))));

  // Estimate years to standard FIRE using compound growth formula at 7% real return
  const estimatedYears = useMemo(() => {
    if (currentCapital >= standardFireNumber) return 0;
    const annualSavings = Math.max(0, monthlySavings * 12);
    if (annualSavings === 0) return null;

    const r = 0.06; // 6% real net return
    let balance = currentCapital;
    for (let yr = 1; yr <= 40; yr++) {
      balance = (balance + annualSavings) * (1 + r);
      if (balance >= standardFireNumber) {
        return yr;
      }
    }
    return ">40";
  }, [currentCapital, standardFireNumber, monthlySavings]);

  const milestones = [
    {
      label: "Lean FIRE",
      sub: "Essential Living (70%)",
      target: leanFireNumber,
      isAchieved: currentCapital >= leanFireNumber,
    },
    {
      label: "Standard FIRE",
      sub: "Full Independence (100%)",
      target: standardFireNumber,
      isAchieved: currentCapital >= standardFireNumber,
    },
    {
      label: "Fat FIRE",
      sub: "Luxury & Buffer (140%)",
      target: fatFireNumber,
      isAchieved: currentCapital >= fatFireNumber,
    },
  ];

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
                FIRE Planner
              </h2>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  background: "var(--glass-fill-strong)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                Retire Early
              </span>
            </div>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Financial Independence milestones & safe withdrawal runway
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic("light");
            onOpenPlanner();
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
          title="Configure FIRE Parameters"
          aria-label="Configure FIRE Parameters"
        >
          <SlidersHorizontal size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Hero Progress Banner */}
      <div
        className="p-4 rounded-[22px] mb-4"
        style={{
          background: "var(--glass-fill)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Standard FIRE Progress
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[26px] font-semibold tracking-tight leading-none text-[var(--text-primary)]">
                {progressPct}%
              </span>
              <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                of {hideBalance ? "••••••" : formatRupiah(standardFireNumber)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)]">
            <Hourglass size={12} className="text-[var(--text-secondary)]" />
            <span className="text-[11px] font-bold text-[var(--text-primary)]">
              {estimatedYears === 0
                ? "Achieved"
                : estimatedYears !== null
                ? `~${estimatedYears} yrs to FIRE`
                : "Extend Savings"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full h-2 rounded-full overflow-hidden mt-2"
          style={{ background: "var(--glass-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* 3 Bento Milestones */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {milestones.map((m) => (
          <div
            key={m.label}
            className="p-3 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] truncate">
                  {m.label}
                </span>
                {m.isAchieved && (
                  <CheckCircle2 size={11} className="text-[var(--text-primary)] shrink-0" />
                )}
              </div>
              <p className="text-[12px] font-bold tracking-tight text-[var(--text-primary)] truncate">
                {hideBalance ? "••••••" : formatRupiah(m.target)}
              </p>
            </div>
            <div className="mt-2 pt-1.5 border-t border-[var(--glass-border)]">
              <span
                className="text-[10px] font-bold block truncate"
                style={{
                  color: m.isAchieved ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {m.isAchieved ? "Met" : `${((currentCapital / m.target) * 100).toFixed(0)}% reached`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <button
        onClick={() => {
          triggerHaptic("medium");
          onOpenPlanner();
        }}
        className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between font-bold text-[12px] active:scale-[0.99] transition-transform select-none"
        style={{
          background: "var(--glass-fill)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-primary)",
        }}
      >
        <span className="flex items-center gap-2">
          <Flame size={14} style={{ color: "var(--text-tertiary)" }} />
          Open FIRE Milestones & Runway Planner
        </span>
        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
      </button>
    </section>
  );
}
