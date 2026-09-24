import { useState, useMemo } from "react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { BottomSheet } from "../ui/BottomSheet";
import {
  Flame,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

interface FirePlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialNetWorth: number;
  defaultMonthlySavings: number;
  defaultMonthlyBurnRate: number;
  hideBalance?: boolean;
}

export function FirePlannerSheet({
  isOpen,
  onClose,
  initialNetWorth,
  defaultMonthlySavings,
  defaultMonthlyBurnRate,
  hideBalance = false,
}: FirePlannerSheetProps) {
  const [monthlyBurn, setMonthlyBurn] = useState<number>(
    Math.max(1000000, defaultMonthlyBurnRate || 3500000)
  );
  const [monthlySavings, setMonthlySavings] = useState<number>(
    Math.max(1000000, defaultMonthlySavings || 3000000)
  );
  const [swr, setSwr] = useState<number>(0.04);
  const [realReturn, setRealReturn] = useState<number>(0.06);

  const annualExpenses = monthlyBurn * 12;
  const standardFireTarget = Math.round(annualExpenses / swr);
  const leanFireTarget = Math.round(standardFireTarget * 0.7);
  const fatFireTarget = Math.round(standardFireTarget * 1.4);
  const baristaFireTarget = Math.round(standardFireTarget * 0.6);
  const coastFireTarget = Math.round(standardFireTarget / Math.pow(1 + realReturn, 15));

  const currentCapital = Math.max(0, initialNetWorth);
  const standardProgress = Math.min(100, Math.max(0, Number(((currentCapital / standardFireTarget) * 100).toFixed(1))));

  // Project years to Standard FIRE
  const yearsToFire = useMemo(() => {
    if (currentCapital >= standardFireTarget) return 0;
    const annualSavings = monthlySavings * 12;
    if (annualSavings <= 0) return null;

    let bal = currentCapital;
    for (let yr = 1; yr <= 40; yr++) {
      bal = (bal + annualSavings) * (1 + realReturn);
      if (bal >= standardFireTarget) return yr;
    }
    return ">40";
  }, [currentCapital, standardFireTarget, monthlySavings, realReturn]);

  const milestones = [
    {
      type: "lean",
      title: "Lean FIRE",
      desc: "Covers non-negotiable living essentials (food, shelter, basic utilities at 70%).",
      target: leanFireTarget,
      isMet: currentCapital >= leanFireTarget,
    },
    {
      type: "barista",
      title: "Barista FIRE",
      desc: "Portfolio covers 60% of lifestyle; light flexible/passion work covers the rest.",
      target: baristaFireTarget,
      isMet: currentCapital >= baristaFireTarget,
    },
    {
      type: "standard",
      title: "Standard FIRE",
      desc: "100% full financial independence maintaining your existing quality of life.",
      target: standardFireTarget,
      isMet: currentCapital >= standardFireTarget,
    },
    {
      type: "fat",
      title: "Fat FIRE",
      desc: "Generous abundance buffer (140%) enabling luxury travel, family care & contingencies.",
      target: fatFireTarget,
      isMet: currentCapital >= fatFireTarget,
    },
    {
      type: "coast",
      title: "Coast FIRE",
      desc: "Net capital needed today that will grow to Standard FIRE in 15 years with zero added savings.",
      target: coastFireTarget,
      isMet: currentCapital >= coastFireTarget,
    },
  ];

  const handleReset = () => {
    triggerHaptic("medium");
    setMonthlyBurn(Math.max(1000000, defaultMonthlyBurnRate || 3500000));
    setMonthlySavings(Math.max(1000000, defaultMonthlySavings || 3000000));
    setSwr(0.04);
    setRealReturn(0.06);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-24 space-y-4 safe-area-bottom select-none">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Flame size={20} strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold text-[16px] tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  FIRE Retirement Planner
                </h3>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    background: "var(--glass-fill-strong)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  Independence
                </span>
              </div>
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Safe withdrawal rates, milestone countdown & portfolio runway
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            title="Reset to Actuals"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Hero Card */}
        <div
          className="p-4 rounded-[22px]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Standard FIRE Goal
              </p>
              <p className="text-[26px] font-semibold tracking-tight mt-0.5 text-[var(--text-primary)]">
                {hideBalance ? "••••••" : formatRupiah(standardFireTarget)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Timeline
              </span>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] mt-0.5">
                {yearsToFire === 0 ? "Goal Met" : yearsToFire !== null ? `~${yearsToFire} Years` : "—"}
              </p>
            </div>
          </div>

          <div
            className="w-full h-2 rounded-full overflow-hidden mt-3"
            style={{ background: "var(--glass-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${standardProgress}%`,
                background: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] mt-2 text-[var(--text-secondary)]">
            <span>Net Worth: {hideBalance ? "••••••" : formatRupiah(currentCapital)}</span>
            <span className="font-bold text-[var(--text-primary)]">{standardProgress}% Funded</span>
          </div>
        </div>

        {/* Interactive Controls */}
        <div
          className="p-4 rounded-[22px] space-y-3"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Plan Parameters
          </span>

          {/* Monthly Living Spend */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span style={{ color: "var(--text-secondary)" }}>Monthly Living Expenses</span>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "••••••" : formatRupiah(monthlyBurn)} / mo
              </span>
            </div>
            <input
              type="range"
              min={1000000}
              max={30000000}
              step={500000}
              value={monthlyBurn}
              onChange={(e) => setMonthlyBurn(Number(e.target.value))}
              className="w-full accent-[var(--text-primary)] cursor-pointer"
            />
          </div>

          {/* Monthly Savings */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span style={{ color: "var(--text-secondary)" }}>Monthly Savings Contribution</span>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "••••••" : formatRupiah(monthlySavings)} / mo
              </span>
            </div>
            <input
              type="range"
              min={500000}
              max={25000000}
              step={500000}
              value={monthlySavings}
              onChange={(e) => setMonthlySavings(Number(e.target.value))}
              className="w-full accent-[var(--text-primary)] cursor-pointer"
            />
          </div>

          {/* Safe Withdrawal Rate Selector */}
          <div className="pt-2 border-t border-[var(--glass-border)] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Safe Withdrawal Rate (SWR)
            </span>
            <div className="flex items-center gap-1.5">
              {[0.03, 0.035, 0.04, 0.045].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    triggerHaptic("light");
                    setSwr(rate);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: swr === rate ? "var(--glass-fill-strong)" : "transparent",
                    color: swr === rate ? "var(--text-primary)" : "var(--text-tertiary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {(rate * 100).toFixed(1)}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Milestones Matrix */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1 block">
            Milestone Matrix
          </span>

          {milestones.map((m) => {
            const pct = Math.min(100, Math.max(0, Number(((currentCapital / m.target) * 100).toFixed(0))));
            return (
              <div
                key={m.type}
                className="p-3.5 rounded-[22px]"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      {m.title}
                    </span>
                    {m.isMet && (
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                        style={{
                          background: "var(--glass-fill-strong)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <CheckCircle2 size={10} /> Met
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {hideBalance ? "••••••" : formatRupiah(m.target)}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
                  {m.desc}
                </p>

                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--glass-border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: "var(--text-primary)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1.5 font-medium">
                  <span>Current: {pct}%</span>
                  <span>Multiplier: {(1 / swr).toFixed(0)}× annual spend</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* SWR Safe Rule Guidance */}
        <div
          className="p-3.5 rounded-[20px] flex items-start gap-2.5"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <ShieldCheck size={16} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            The 4% Safe Withdrawal Rule (Trinity Study) indicates that withdrawing 4% of your initial retirement portfolio
            (adjusted annually for inflation) provides an exceptionally high survival probability over a 30-year horizon.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
