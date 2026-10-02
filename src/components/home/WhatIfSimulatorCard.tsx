import { useMemo, useState, useEffect } from "react";
import { SlidersHorizontal, CheckCircle2, AlertCircle, ChevronRight, BarChart3 } from "lucide-react";
import {
  calculateWhatIfScenario,
  type WhatIfScenarioType,
} from "../../lib/financialMath";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useTheme } from "../../contexts/ThemeContext";

interface ScenarioItem {
  type: WhatIfScenarioType;
  label: string;
  inputLabel: string;
  presets: number[];
  presetLabels?: Record<string | number, string>;
}

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
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const isIndonesian = language === "id";

  const scenarios: ScenarioItem[] = useMemo(() => {
    const symbol = currencyMeta.symbol === "Rp" ? "" : currencyMeta.symbol;

    if (preferredCurrency === "IDR") {
      const idrScenarios: ScenarioItem[] = [
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
          type: "saving_plan",
          label: isIndonesian ? "Tabungan" : "Savings",
          inputLabel: isIndonesian ? "Target tabungan" : "Savings target",
          presets: [250000, 500000, 1000000],
          presetLabels: isIndonesian
            ? { 250000: "250k", 500000: "500k", 1000000: "1 Jt" }
            : { 250000: "250k", 500000: "500k", 1000000: "1M" },
        },
        {
          type: "expense_change_pct",
          label: isIndonesian ? "Inflasi" : "Shock",
          inputLabel: isIndonesian ? "Perubahan beban" : "Expense shock",
          presets: [-10, 10, 25],
          presetLabels: {
            "-10": "-10%",
            "10": "+10%",
            "25": "+25%",
          },
        },
      ];
      return idrScenarios;
    }

    // Currencies like USD, EUR, SGD, JPY, etc.
    const isHighUnit = (preferredCurrency as string) === "JPY" || (preferredCurrency as string) === "KRW";
    const cutPresets = isHighUnit ? [2500, 5000, 10000] : [25, 50, 100];
    const boostPresets = isHighUnit ? [5000, 10000, 20000] : [50, 100, 200];
    const commitPresets = isHighUnit ? [2500, 5000, 10000] : [25, 50, 100];

    const formatPresetLabel = (val: number) => {
      if (val >= 1000) return `${symbol}${val / 1000}k`;
      return `${symbol}${val}`;
    };

    const foreignScenarios: ScenarioItem[] = [
      {
        type: "expense_cut",
        label: isIndonesian ? "Pangkas" : "Cut",
        inputLabel: isIndonesian ? "Pangkas beban" : "Cut expense",
        presets: cutPresets.map((p) => convertToIdr(p)),
        presetLabels: cutPresets.reduce(
          (acc, p) => ({ ...acc, [convertToIdr(p)]: formatPresetLabel(p) }),
          {},
        ),
      },
      {
        type: "income_boost",
        label: isIndonesian ? "Tambah" : "Boost",
        inputLabel: isIndonesian ? "Tambah masuk" : "Boost income",
        presets: boostPresets.map((p) => convertToIdr(p)),
        presetLabels: boostPresets.reduce(
          (acc, p) => ({ ...acc, [convertToIdr(p)]: formatPresetLabel(p) }),
          {},
        ),
      },
      {
        type: "saving_plan",
        label: isIndonesian ? "Tabungan" : "Savings",
        inputLabel: isIndonesian ? "Target tabungan" : "Savings target",
        presets: commitPresets.map((p) => convertToIdr(p)),
        presetLabels: commitPresets.reduce(
          (acc, p) => ({ ...acc, [convertToIdr(p)]: formatPresetLabel(p) }),
          {},
        ),
      },
      {
        type: "expense_change_pct",
        label: isIndonesian ? "Inflasi" : "Shock",
        inputLabel: isIndonesian ? "Perubahan beban" : "Expense shock",
        presets: [-10, 10, 25],
        presetLabels: {
          "-10": "-10%",
          "10": "+10%",
          "25": "+25%",
        },
      },
    ];
    return foreignScenarios;
  }, [preferredCurrency, currencyMeta.symbol, isIndonesian, convertToIdr]);

  const [scenarioType, setScenarioType] =
    useState<WhatIfScenarioType>("expense_cut");

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.type === scenarioType) || scenarios[0],
    [scenarios, scenarioType],
  );

  const [numericValue, setNumericValue] = useState<number>(
    activeScenario.presets[1] ?? 500000,
  );

  useEffect(() => {
    setNumericValue(activeScenario.presets[1]);
  }, [activeScenario]);

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

  const cardBg = isDark
    ? "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)"
    : "linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 247, 250, 0.90) 100%)";

  const cardBorder = isDark
    ? "1px solid rgba(255, 255, 255, 0.08)"
    : "1px solid rgba(0, 0, 0, 0.06)";

  const cardShadow = isDark
    ? "0 18px 44px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
    : "0 10px 30px -8px rgba(31, 36, 48, 0.06), inset 0 1px 0 #ffffff";

  return (
    <section
      className="p-4 sm:p-5 rounded-[26px] transition-all select-none space-y-2.5 flex flex-col justify-between relative overflow-hidden"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Specular Rim Light Reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] right-[12%] top-[1px] h-[1.5px] rounded-full"
        style={{
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), rgba(255,255,255,0.45), rgba(255,255,255,0.25), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(255,255,255,1), rgba(255,255,255,0.8), transparent)",
        }}
      />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                border: cardBorder,
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
                  {isIndonesian
                    ? "Stress Test & Skenario What-If"
                    : "What-If Stress Test"}
                </h2>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    background: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.05)",
                    color: "var(--text-secondary)",
                    border: cardBorder,
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
          className="grid grid-cols-4 gap-1 p-1 rounded-2xl mb-2.5"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.035)",
            border: cardBorder,
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
                className="py-1 px-1 rounded-xl text-[10.5px] font-semibold transition-all cursor-pointer text-center truncate"
                style={{
                  background: isActive
                    ? isDark
                      ? "#FFFFFF"
                      : "#18181B"
                    : "transparent",
                  color: isActive
                    ? isDark
                      ? "#0A0A0B"
                      : "#FFFFFF"
                    : "var(--text-secondary)",
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Presets & Input Simulation Container (Unboxed Clean Flow) */}
        <div
          className="p-3 rounded-2xl space-y-2 mb-2.5"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.02)",
            border: cardBorder,
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
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all tabular-nums"
                    style={{
                      background: isSelected
                        ? isDark
                          ? "#FFFFFF"
                          : "#18181B"
                        : isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.04)",
                      color: isSelected
                        ? isDark
                          ? "#0A0A0B"
                          : "#FFFFFF"
                        : "var(--text-secondary)",
                      border: isSelected
                        ? "1px solid transparent"
                        : cardBorder,
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
              className="p-2 rounded-xl"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.025)",
                border: cardBorder,
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
                  {hideBalance
                    ? "••••••"
                    : formatCompactWithPreferred(result.currentAnnualRetainedCash)}
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
              className="p-2 rounded-xl"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.025)",
                border: cardBorder,
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
                  {hideBalance
                    ? "••••••"
                    : formatCompactWithPreferred(result.adjustedAnnualRetainedCash)}
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
              className="p-2 rounded-xl"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                border: cardBorder,
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
            className="flex items-start sm:items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10.5px] leading-tight"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.025)",
              border: cardBorder,
              color: "var(--text-secondary)",
            }}
          >
            {result.isOvercommitted ? (
              <AlertCircle
                size={13}
                className="shrink-0 mt-0.5 sm:mt-0 text-[var(--text-secondary)]"
              />
            ) : (
              <CheckCircle2
                size={13}
                className="shrink-0 mt-0.5 sm:mt-0 text-[var(--text-primary)]"
              />
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
        className="w-full py-2.5 px-3.5 rounded-xl flex items-center justify-between text-[11.5px] font-semibold active:scale-[0.99] transition-transform select-none cursor-pointer mt-1"
        style={{
          background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.035)",
          border: cardBorder,
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
