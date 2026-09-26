import { useMemo, useState } from "react";
import { ChevronRight, Layers3 } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import type { LiquidityHorizonResult } from "../../hooks/useFinancialIntelligence";

export type ModelLayer = "actual" | "baseline" | "scenario";

export interface ModelFlowValues {
  income: number;
  committedExpenses: number;
  variableExpenses: number;
  retainedCash: number;
  savingsInvestment: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface PersonalFinancialModelInsights {
  currentNetWorth: number;
  historicalTrendLabel: string;
  historicalTrendValue: string;
  currentCashflow: number;
  personalBaseline: string;
  upcomingCommitments: number;
  goalTrajectory: string;
  scenarioImpact: string;
}

interface PersonalFinancialModelCardProps {
  hideBalance?: boolean;
  actual: ModelFlowValues;
  baseline: ModelFlowValues;
  scenario: ModelFlowValues;
  insights: PersonalFinancialModelInsights;
  liquidityHorizon?: LiquidityHorizonResult;
  onOpenDetails?: () => void;
}

export function PersonalFinancialModelCard({
  hideBalance = false,
  actual,
  baseline,
  scenario,
  liquidityHorizon,
  onOpenDetails,
}: PersonalFinancialModelCardProps) {
  const { language } = useLanguage();
  useCurrency();
  const isIndonesian = language === "id";

  const [layer, setLayer] = useState<ModelLayer>("actual");

  const active = useMemo(() => {
    if (layer === "baseline") return baseline;
    if (layer === "scenario") return scenario;
    return actual;
  }, [actual, baseline, layer, scenario]);

  const coverageMonths = liquidityHorizon && liquidityHorizon.status === "sufficient"
    ? liquidityHorizon.totalCoverageMonths
    : 3.5;

  const isStrong = liquidityHorizon
    ? liquidityHorizon.resilienceTier === "STRONG" || liquidityHorizon.resilienceTier === "EXCEPTIONAL"
    : true;

  return (
    <section
      className="p-5 rounded-[24px] glass-surface transition-all select-none space-y-3.5 flex flex-col justify-between hover:border-white/20"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div>
        {/* Header (1 line) */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Layers3 size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2
                  className="text-[13px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Model Struktural & Horizon Likuiditas" : "Structural Model & Liquidity"}
                </h2>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    background: "var(--glass-fill-strong)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {isIndonesian ? "3 Lapisan" : "3 Layers"}
                </span>
              </div>
              <p
                className="text-[11px] font-medium leading-tight mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Baseline finansial personal, perbandingan skenario & cadangan darurat"
                  : "Personal financial baseline, scenario comparison & emergency buffer"}
              </p>
            </div>
          </div>
        </div>

        {/* Layer Switcher */}
        <div
          className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl mb-3.5"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {(["actual", "baseline", "scenario"] as ModelLayer[]).map((item) => {
            const isActive = item === layer;
            const itemLabel =
              item === "actual"
                ? isIndonesian ? "Aktual" : "Actual"
                : item === "baseline"
                  ? isIndonesian ? "Garis Dasar" : "Baseline"
                  : isIndonesian ? "Skenario" : "Scenario";

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setLayer(item);
                  triggerHaptic("light");
                }}
                className="py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center"
                style={{
                  background: isActive ? "var(--text-primary)" : "transparent",
                  color: isActive
                    ? "var(--bg-base)"
                    : "var(--text-secondary)",
                  boxShadow: isActive ? "0 1px 4px var(--shadow-strength)" : "none",
                }}
              >
                {itemLabel}
              </button>
            );
          })}
        </div>

        {/* Flow Matrix Rows */}
        <div
          className="p-3.5 rounded-2xl space-y-2 mb-3.5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {isIndonesian ? "Pemasukan Bulanan" : "Monthly Income"}
            </span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "••••••" : formatRupiah(active.income)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {isIndonesian ? "Pengeluaran Rutin (Committed)" : "Committed Expenses"}
            </span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {hideBalance ? "••••••" : formatRupiah(active.committedExpenses)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {isIndonesian ? "Pengeluaran Fleksibel" : "Variable Expenses"}
            </span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {hideBalance ? "••••••" : formatRupiah(active.variableExpenses)}
            </span>
          </div>

          <div
            className="flex items-center justify-between text-xs pt-1.5"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {isIndonesian ? "Sisa Kas Ditahan" : "Retained Cash"}
            </span>
            <span
              className="text-[12px] font-bold tabular-nums"
              style={{
                color: active.retainedCash >= 0 ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {hideBalance ? "••••••" : formatRupiah(active.retainedCash)}
            </span>
          </div>
        </div>

        {/* Integrated Telemetry Strip: Liquidity & Debt Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div
            className="p-2.5 rounded-xl flex items-center justify-between"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <span
                className="text-[9px] uppercase font-semibold block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Cadangan Likuiditas" : "Liquidity Buffer"}
              </span>
              <span
                className="font-bold tabular-nums text-[13px] block mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {hideBalance ? "•••" : `${coverageMonths.toFixed(1)} ${isIndonesian ? "Bulan" : "mo"}`}
              </span>
            </div>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{
                background: "var(--glass-fill-strong)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
              }}
            >
              {isStrong ? (isIndonesian ? "Kuat" : "Strong") : (isIndonesian ? "Aman" : "Safe")}
            </span>
          </div>

          <div
            className="p-2.5 rounded-xl flex items-center justify-between"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <span
                className="text-[9px] uppercase font-semibold block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Akselerator Utang" : "Debt Accelerator"}
              </span>
              <span
                className="font-bold tabular-nums text-[13px] block mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                Avalanche
              </span>
            </div>
            <span
              className="text-[9px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Bebas 2027" : "Free 2027"}
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
        className="w-full py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs font-semibold active:scale-[0.99] transition-transform select-none cursor-pointer"
        style={{
          background: "var(--glass-fill)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-primary)",
        }}
      >
        <span className="flex items-center gap-2">
          <Layers3 size={14} style={{ color: "var(--text-tertiary)" }} />
          {isIndonesian ? "Buka Lembar Model Finansial Lengkap" : "Open Full Financial Model Sheet"}
        </span>
        <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
      </button>
    </section>
  );
}
