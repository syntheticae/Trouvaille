import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import {
  calculateWhatIfScenario,
  type WhatIfScenarioType,
} from "../../lib/financialMath";

interface WhatIfSimulatorCardProps {
  monthlyIncome: number;
  monthlyExpense: number;
  hideBalance?: boolean;
}

const SCENARIOS: Array<{
  type: WhatIfScenarioType;
  label: string;
  inputLabel: string;
  helper: string;
  presets: number[];
}> = [
  {
    type: "expense_cut",
    label: "Expense ↓",
    inputLabel: "Reduce monthly expense by",
    helper: "Example: cut Rp500K/month",
    presets: [250000, 500000, 1000000],
  },
  {
    type: "income_boost",
    label: "Income ↑",
    inputLabel: "Increase monthly income by",
    helper: "Example: add Rp2M/month",
    presets: [500000, 1000000, 2000000],
  },
  {
    type: "expense_change_pct",
    label: "Expense %",
    inputLabel: "Change expense by percent",
    helper: "Positive raises expense, negative lowers it",
    presets: [-10, 10, 20],
  },
  {
    type: "saving_plan",
    label: "Save / mo",
    inputLabel: "Set dedicated monthly savings",
    helper: "Example: reserve Rp1.5M every month",
    presets: [500000, 1500000, 3000000],
  },
];

export function WhatIfSimulatorCard({
  monthlyIncome,
  monthlyExpense,
  hideBalance = false,
}: WhatIfSimulatorCardProps) {
  const [scenarioType, setScenarioType] = useState<WhatIfScenarioType>("expense_cut");
  const [rawValue, setRawValue] = useState("500000");

  const activeScenario =
    SCENARIOS.find((item) => item.type === scenarioType) ?? SCENARIOS[0];
  const numericValue = Number(rawValue || 0);

  const result = useMemo(
    () =>
      calculateWhatIfScenario({
        monthlyIncome,
        monthlyExpense,
        type: scenarioType,
        value: numericValue,
      }),
    [monthlyIncome, monthlyExpense, numericValue, scenarioType],
  );

  return (
    <section className="glass-surface p-4 rounded-[24px] space-y-3.5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={14} style={{ color: "var(--text-tertiary)" }} />
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
            What-if Simulator
          </p>
          <p className="text-[14px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
            Deterministic planning, not prediction
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((scenario) => {
          const isActive = scenario.type === scenarioType;
          return (
            <button
              key={scenario.type}
              type="button"
              onClick={() => setScenarioType(scenario.type)}
              className="px-3 py-2.5 rounded-2xl text-[11px] font-extrabold transition-all active:scale-95"
              style={{
                background: isActive ? "var(--accent)" : "var(--glass-fill)",
                color: isActive ? "var(--accent-ink)" : "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {scenario.label}
            </button>
          );
        })}
      </div>

      <div
        className="p-3.5 rounded-[20px] space-y-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div>
          <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
            {activeScenario.inputLabel}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {activeScenario.helper}
          </p>
        </div>

        <input
          type="number"
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
          placeholder={scenarioType === "expense_change_pct" ? "10" : "500000"}
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        />

        <div className="flex flex-wrap gap-2">
          {activeScenario.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setRawValue(String(preset))}
              className="px-2.5 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {scenarioType === "expense_change_pct"
                ? `${preset > 0 ? "+" : ""}${preset}%`
                : formatRupiah(preset)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Current / year</p>
            <p className="amount font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "Rp ••••••••" : formatRupiah(result.currentAnnualRetainedCash)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>After adjustment</p>
            <p className="amount font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "Rp ••••••••" : formatRupiah(result.adjustedAnnualRetainedCash)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Difference / year</p>
            <p
              className="amount font-extrabold mt-0.5"
              style={{
                color:
                  result.annualDifference >= 0
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              {hideBalance
                ? "Rp ••••••••"
                : `${result.annualDifference >= 0 ? "+" : ""}${formatRupiah(result.annualDifference)}`}
            </p>
          </div>
        </div>

        <div
          className="pt-2.5 text-[11px] space-y-1"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            Adjusted income: {hideBalance ? "Rp ••••••••" : formatRupiah(result.adjustedMonthlyIncome)} / month
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            Adjusted expense: {hideBalance ? "Rp ••••••••" : formatRupiah(result.adjustedMonthlyExpense)} / month
          </p>
          {result.suggestedMonthlySavings > 0 && (
            <p style={{ color: "var(--text-secondary)" }}>
              Dedicated savings: {hideBalance ? "Rp ••••••••" : formatRupiah(result.suggestedMonthlySavings)} / month
            </p>
          )}
          <p
            className="font-semibold"
            style={{
              color: result.isOvercommitted
                ? "var(--text-secondary)"
                : "var(--text-primary)",
            }}
          >
            {result.isOvercommitted
              ? "This scenario overcommits monthly cashflow."
              : "This scenario stays within your current monthly cashflow."}
          </p>
        </div>
      </div>
    </section>
  );
}
