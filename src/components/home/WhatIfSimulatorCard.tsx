import { useMemo, useState, useEffect } from "react";
import { SlidersHorizontal, CheckCircle2, AlertCircle, ChevronRight, BarChart3 } from "lucide-react";
import {
  calculateWhatIfScenario,
  type WhatIfScenarioType,
} from "../../lib/financialMath";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";

interface WhatIfSimulatorCardProps {
  monthlyIncome: number;
  monthlyExpense: number;
  hideBalance?: boolean;
  onOpenDetails?: () => void;
}

export function WhatIfSimulatorCard({
  monthlyIncome,
  monthlyExpense,
  hideBalance = false,
  onOpenDetails,
}: WhatIfSimulatorCardProps) {
  const { language } = useLanguage();
  const {
    preferredCurrency,
    currencyMeta,
    convertToIdr,
    formatCompactWithPreferred,
  } = useCurrency();
  const isIndonesian = language === "id";

  const scenarios: Array<{
    type: WhatIfScenarioType;
    label: string;
    inputLabel: string;
    presets: number[];
    presetLabels?: Record<number, string>;
  }> = useMemo(() => {
    const symbol = currencyMeta.symbol === "Rp" ? "" : currencyMeta.symbol;

    if (preferredCurrency === "IDR") {
      return [
        {
          type: "expense_cut",
          label: isIndonesian ? "Pangkas" : "Cut",
          inputLabel: isIndonesian ? "Pangkas beban" : "Cut expense",
          presets: [250000, 500000, 1000000],
          presetLabels: isIndonesian
            ? { 250000: "250k", 500000: "500k", 1000000: "1 Jt" }
            : { 250000: "250k", 500000: "500k", 1000000: "1M" },
        },
        {
          type: "income_boost",
          label: isIndonesian ? "Tambah" : "Boost",
          inputLabel: isIndonesian ? "Tambah masuk" : "Boost income",
          presets: [500000, 1000000, 2000000],
          presetLabels: isIndonesian
            ? { 500000: "500k", 1000000: "1 Jt", 2000000: "2 Jt" }
            : { 500000: "500k", 1000000: "1M", 2000000: "2M" },
        },
        {
          type: "expense_change_pct",
          label: isIndonesian ? "Beban %" : "Expense %",
          inputLabel: isIndonesian ? "Ubah beban" : "Change %",
          presets: [-10, 10, 20],
          presetLabels: {
            [-10]: "-10%",
            10: "+10%",
            20: "+20%",
          },
        },
        {
          type: "saving_plan",
          label: isIndonesian ? "Tabung" : "Save",
          inputLabel: isIndonesian ? "Target simpan" : "Target savings",
          presets: [500000, 1500000, 3000000],
          presetLabels: isIndonesian
            ? { 500000: "500k", 1500000: "1.5 Jt", 3000000: "3 Jt" }
            : { 500000: "500k", 1500000: "1.5M", 3000000: "3M" },
        },
      ];
    }

    // Units for foreign currencies
    let cutUnits = [20, 50, 100];
    let boostUnits = [30, 75, 150];
    let saveUnits = [30, 100, 200];
    const cutUnitLabels: Record<number, string> = {};
    const boostUnitLabels: Record<number, string> = {};
    const saveUnitLabels: Record<number, string> = {};

    if (preferredCurrency === "JPY") {
      cutUnits = [2500, 5000, 10000];
      boostUnits = [5000, 10000, 20000];
      saveUnits = [5000, 15000, 30000];
    } else if (preferredCurrency === "THB") {
      cutUnits = [500, 1000, 2000];
      boostUnits = [1000, 2000, 4000];
      saveUnits = [1000, 3000, 6000];
    }

    const cutPresets = cutUnits.map((u) => Math.round(convertToIdr(u, preferredCurrency)));
    const boostPresets = boostUnits.map((u) => Math.round(convertToIdr(u, preferredCurrency)));
    const savePresets = saveUnits.map((u) => Math.round(convertToIdr(u, preferredCurrency)));

    cutPresets.forEach((p, i) => {
      cutUnitLabels[p] = `${symbol}${cutUnits[i] >= 1000 ? `${(cutUnits[i] / 1000).toFixed(0)}k` : cutUnits[i]}`;
    });
    boostPresets.forEach((p, i) => {
      boostUnitLabels[p] = `${symbol}${boostUnits[i] >= 1000 ? `${(boostUnits[i] / 1000).toFixed(0)}k` : boostUnits[i]}`;
    });
    savePresets.forEach((p, i) => {
      saveUnitLabels[p] = `${symbol}${saveUnits[i] >= 1000 ? `${(saveUnits[i] / 1000).toFixed(0)}k` : saveUnits[i]}`;
    });

    return [
      {
        type: "expense_cut",
        label: isIndonesian ? "Pangkas" : "Cut",
        inputLabel: isIndonesian ? "Pangkas beban" : "Cut expense",
        presets: cutPresets,
        presetLabels: cutUnitLabels,
      },
      {
        type: "income_boost",
        label: isIndonesian ? "Tambah" : "Boost",
        inputLabel: isIndonesian ? "Tambah masuk" : "Boost income",
        presets: boostPresets,
        presetLabels: boostUnitLabels,
      },
      {
        type: "expense_change_pct",
        label: isIndonesian ? "Beban %" : "Expense %",
        inputLabel: isIndonesian ? "Ubah beban" : "Change %",
        presets: [-10, 10, 20],
        presetLabels: {
          [-10]: "-10%",
          10: "+10%",
          20: "+20%",
        },
      },
      {
        type: "saving_plan",
        label: isIndonesian ? "Tabung" : "Save",
        inputLabel: isIndonesian ? "Target simpan" : "Target savings",
        presets: savePresets,
        presetLabels: saveUnitLabels,
      },
    ];
  }, [preferredCurrency, currencyMeta.symbol, convertToIdr, isIndonesian]);

  const [scenarioType, setScenarioType] = useState<WhatIfScenarioType>("expense_cut");
  const [numericValue, setNumericValue] = useState<number>(() => scenarios[0]?.presets[1] ?? 500000);

  useEffect(() => {
    const cur = scenarios.find((s) => s.type === scenarioType);
    if (cur && !cur.presets.includes(numericValue)) {
      setNumericValue(cur.presets[1]);
    }
  }, [scenarios, scenarioType, numericValue]);

  const activeScenario =
    scenarios.find((item) => item.type === scenarioType) ?? scenarios[0];

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
    <section
      className="p-4 sm:p-5 rounded-[24px] glass-surface transition-all select-none space-y-2.5 flex flex-col justify-between hover:border-white/20"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <SlidersHorizontal size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  className="text-[13px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Stress Test & Skenario What-If" : "What-If Stress Test"}
                </h2>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    background: "var(--glass-fill-strong)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {isIndonesian ? "Interaktif" : "Interactive"}
                </span>
              </div>
              <p
                className="text-[11px] font-medium leading-tight mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Simulasi shock arus kas, beban & tabungan"
                  : "Cashflow shock & savings simulation"}
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Type Selector (Single Row 4-Tab Segmented Control) */}
        <div
          className="grid grid-cols-4 gap-1 p-1 rounded-xl mb-2.5"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {scenarios.map((s) => {
            const isActive = s.type === scenarioType;
            return (
              <button
                key={s.type}
                type="button"
                onClick={() => {
                  setScenarioType(s.type);
                  setNumericValue(s.presets[1]);
                  triggerHaptic("light");
                }}
                className="py-1 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer text-center truncate"
                style={{
                  background: isActive ? "var(--text-primary)" : "transparent",
                  color: isActive
                    ? "var(--bg-base)"
                    : "var(--text-secondary)",
                  boxShadow: isActive ? "0 1px 4px var(--shadow-strength)" : "none",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Presets & Input Simulation Container */}
        <div
          className="p-2.5 rounded-xl space-y-2 mb-2.5"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {/* Preset Buttons Row (Single Line) */}
          <div className="flex items-center justify-between text-xs gap-1.5">
            <span
              className="text-[10.5px] font-medium leading-none truncate shrink-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {activeScenario.inputLabel}:
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {activeScenario.presets.map((preset) => {
                const isSelected = numericValue === preset;
                const label =
                  activeScenario.presetLabels?.[preset] ??
                  (scenarioType === "expense_change_pct"
                    ? `${preset > 0 ? "+" : ""}${preset}%`
                    : formatCompactWithPreferred(preset));

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setNumericValue(preset);
                      triggerHaptic("light");
                    }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-all tabular-nums"
                    style={{
                      background: isSelected
                        ? "var(--text-primary)"
                        : "var(--bg-elevated)",
                      color: isSelected
                        ? "var(--bg-base)"
                        : "var(--text-secondary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Output Impact 3-Col (Ultra-compact 2-line layout) */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div
              className="p-1.5 rounded-lg"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9px] uppercase font-semibold block leading-none truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Saat Ini" : "Current"}
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span
                  className="text-[11.5px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {hideBalance ? "••••••" : formatCompactWithPreferred(result.currentAnnualRetainedCash)}
                </span>
                <span
                  className="text-[8.5px] opacity-60"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "/thn" : "/yr"}
                </span>
              </div>
            </div>

            <div
              className="p-1.5 rounded-lg"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9px] uppercase font-semibold block leading-none truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Disesuaikan" : "Adjusted"}
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span
                  className="text-[11.5px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hideBalance ? "••••••" : formatCompactWithPreferred(result.adjustedAnnualRetainedCash)}
                </span>
                <span
                  className="text-[8.5px] opacity-60"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "/thn" : "/yr"}
                </span>
              </div>
            </div>

            <div
              className="p-1.5 rounded-lg"
              style={{
                background: "var(--glass-fill-strong)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9px] uppercase font-semibold block leading-none truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Selisih" : "Net Diff"}
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span
                  className="text-[11.5px] font-bold tabular-nums whitespace-nowrap"
                  style={{
                    color:
                      result.annualDifference >= 0
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {hideBalance
                    ? "••••••"
                    : `${result.annualDifference >= 0 ? "+" : "-"}${formatCompactWithPreferred(Math.abs(result.annualDifference))}`}
                </span>
                <span
                  className="text-[8.5px] opacity-60"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "/thn" : "/yr"}
                </span>
              </div>
            </div>
          </div>

          {/* Verdict Pill */}
          <div
            className="flex items-start sm:items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] leading-tight"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {result.isOvercommitted ? (
              <AlertCircle size={13} className="shrink-0 mt-0.5 sm:mt-0 text-[var(--text-secondary)]" />
            ) : (
              <CheckCircle2 size={13} className="shrink-0 mt-0.5 sm:mt-0 text-[var(--text-primary)]" />
            )}
            <span>
              {result.isOvercommitted
                ? isIndonesian
                  ? "Beban melebihi kapasitas arus kas bulanan."
                  : "Overcommits monthly cashflow."
                : isIndonesian
                ? "Aman dalam batas arus kas bulanan."
                : "Within monthly cashflow limit."}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic("medium");
          onOpenDetails?.();
        }}
        className="w-full py-2 px-3 rounded-xl flex items-center justify-between text-[11.5px] font-semibold active:scale-[0.99] transition-transform select-none cursor-pointer"
        style={{
          background: "var(--glass-fill)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-primary)",
        }}
      >
        <span className="flex items-center gap-2">
          <BarChart3 size={13} style={{ color: "var(--text-tertiary)" }} />
          {isIndonesian
            ? "Detail Analisis Skenario"
            : "Detailed Scenario Analysis"}
        </span>
        <ChevronRight size={13} style={{ color: "var(--text-tertiary)" }} />
      </button>
    </section>
  );
}
