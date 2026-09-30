import { useState } from "react";
import { Compass, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PersonalBaselineResult } from "../../lib/financialMath";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useTheme } from "../../contexts/ThemeContext";

interface PersonalBaselineSectionProps {
  baselines: PersonalBaselineResult;
  onCategoryClick?: (categoryName: string) => void;
}

export function PersonalBaselineSection({
  baselines,
  onCategoryClick,
}: PersonalBaselineSectionProps) {
  const { formatWithPreferred } = useCurrency();
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  if (baselines.status === "insufficient") {
    return (
      <section
        className="glass-surface rounded-[24px] p-5 border select-none"
        style={{
          borderColor: "var(--glass-border)",
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Compass size={18} strokeWidth={1.75} />
          </div>
          <div>
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Garis Dasar Personal" : "Personal Baseline"}
            </span>
            <h3
              className="text-[14px] font-bold mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Mengumpulkan Siklus Historis" : "Building Baseline History"}
            </h3>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {isIndonesian
            ? "Perlu minimal 2 siklus bulanan penuh untuk mengukur rentang belanja normal Anda."
            : "Requires at least 2 full monthly cycles to compute your historical normal spending range."}
        </p>
      </section>
    );
  }

  const [minRange, maxRange] = baselines.typicalExpenseRange;
  const current = baselines.currentMonthExpense;
  const isAbove = baselines.currentMonthStatus === "above_range";
  const isBelow = baselines.currentMonthStatus === "below_range";

  // Position calculation for visual range bar (0 to 100%)
  const span = maxRange - minRange || 1;
  const rawPct = ((current - minRange) / span) * 100;
  const markerPct = Math.max(4, Math.min(96, rawPct));

  return (
    <section
      className="glass-surface rounded-[24px] p-5 transition-all select-none space-y-4"
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Compass size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {isIndonesian ? "Garis Dasar Personal" : "Personal Baseline"}
            </h3>
            <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Tolok Ukur Belanja" : "Spending Norms"}
            </p>
          </div>
        </div>

        {/* Status Badge (Monochrome) */}
        <div
          className="text-right px-2.5 py-1 rounded-xl shrink-0"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.04)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="text-[9px] font-medium uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Status" : "Status"}
          </span>
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {isAbove
              ? isIndonesian
                ? "Di Atas Normal"
                : "Above Band"
              : isBelow
                ? isIndonesian
                  ? "Di Bawah Normal"
                  : "Below Band"
                : isIndonesian
                  ? "Rentang Wajar"
                  : "Normal Band"}
          </span>
        </div>
      </div>

      {/* ── 2. Visual Range Gauge Chart ────────────────────────────────────── */}
      <div
        className="p-3.5 rounded-2xl space-y-3 border"
        style={{
          background: "var(--glass-fill)",
          borderColor: "var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian ? "Pengeluaran Bulan Ini" : "Current Month Outflow"}
          </span>
          <span className="tabular-nums font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>
            {formatWithPreferred(current)}
          </span>
        </div>

        {/* Range Gauge Track */}
        <div className="relative pt-2 pb-1">
          {/* Base Track */}
          <div className="h-2 w-full rounded-full bg-white/[0.06] relative overflow-hidden flex">
            {/* Normal Band Highlight (20% to 80%) */}
            <div
              className="h-full rounded-full"
              style={{
                width: "100%",
                background: isDark
                  ? "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.08) 100%)"
                  : "linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.06) 100%)",
              }}
            />
          </div>

          {/* Marker Knob with Position Indicator */}
          <motion.div
            initial={{ left: "50%" }}
            animate={{ left: `${markerPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute top-1 -translate-x-1/2 flex flex-col items-center"
          >
            <div
              className="w-4 h-4 rounded-full shadow-lg border-2 border-[var(--bg-elevated)]"
              style={{
                background: isDark ? "#ffffff" : "#18181b",
              }}
            />
          </motion.div>
        </div>

        {/* Min, Median, Max Range Footers */}
        <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-1 tabular-nums">
          <div>
            <span className="block opacity-60 uppercase tracking-wider text-[8.5px]">Min</span>
            <span>{formatWithPreferred(minRange)}</span>
          </div>
          <div className="text-center">
            <span className="block opacity-60 uppercase tracking-wider text-[8.5px]">Median</span>
            <span className="text-[var(--text-primary)] font-bold">
              {formatWithPreferred(baselines.medianExpense)}
            </span>
          </div>
          <div className="text-right">
            <span className="block opacity-60 uppercase tracking-wider text-[8.5px]">Max</span>
            <span>{formatWithPreferred(maxRange)}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Executive Insight ────────────────────────────────────────────── */}
      <div
        className="p-3 rounded-2xl flex items-center justify-between border text-[11px]"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          borderColor: "var(--glass-border)",
        }}
      >
        <div className="flex items-center gap-2">
          {isAbove ? (
            <AlertCircle size={14} className="text-[var(--text-tertiary)] shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="text-[var(--text-primary)] shrink-0" />
          )}
          <span style={{ color: "var(--text-secondary)" }}>
            {isIndonesian
              ? `Pengeluaran Anda berdeviasi ${Math.abs(baselines.currentMonthDeviationPct)}% ${
                  baselines.currentMonthDeviationPct >= 0 ? "di atas" : "di bawah"
                } median historis (${baselines.historicalMonthsCount} siklus).`
              : `Current outflow is ${Math.abs(baselines.currentMonthDeviationPct)}% ${
                  baselines.currentMonthDeviationPct >= 0 ? "above" : "below"
                } your median baseline across ${baselines.historicalMonthsCount} cycles.`}
          </span>
        </div>
      </div>

      {/* ── 4. Optional Category Details Toggle ─────────────────────────────── */}
      {baselines.categoryBaselines && baselines.categoryBaselines.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowCategoryDetails(!showCategoryDetails);
            }}
            className="w-full pt-1 flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span>
              {showCategoryDetails
                ? isIndonesian
                  ? "Sembunyikan Pos Kategori"
                  : "Hide Category Norms"
                : isIndonesian
                  ? "Lihat Garis Dasar Per Kategori"
                  : "View Category Norms"}
            </span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${
                showCategoryDetails ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {showCategoryDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-1.5 pt-2"
              >
                {baselines.categoryBaselines.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onCategoryClick?.(cat.name);
                    }}
                    className="w-full p-2.5 rounded-xl border flex items-center justify-between text-left active:scale-[0.99] transition-all cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div>
                      <span className="font-bold text-[11.5px] text-[var(--text-primary)] block">
                        {cat.name}
                      </span>
                      <span className="text-[9.5px] text-[var(--text-tertiary)] tabular-nums">
                        Median: {formatWithPreferred(cat.medianMonthlyTotal)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold tabular-nums text-[11.5px] text-[var(--text-primary)] block">
                        {formatWithPreferred(cat.currentMonthTotal)}
                      </span>
                      <span
                        className="text-[9.5px] tabular-nums text-[var(--text-secondary)]"
                      >
                        {cat.deviationPct >= 0 ? "+" : ""}
                        {cat.deviationPct.toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
