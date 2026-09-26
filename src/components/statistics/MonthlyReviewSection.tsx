import { useState } from "react";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MonthlyFinancialReviewData } from "../../lib/financialMath";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useTheme } from "../../contexts/ThemeContext";

interface MonthlyReviewSectionProps {
  review: MonthlyFinancialReviewData;
  healthScore?: number;
  onCategoryClick?: (categoryName: string) => void;
}

export function MonthlyReviewSection({
  review,
  healthScore,
  onCategoryClick,
}: MonthlyReviewSectionProps) {
  const { formatWithPreferred } = useCurrency();
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const [showFullDetails, setShowFullDetails] = useState(false);

  const { overview } = review;
  const isSurplus = overview.netCashflow >= 0;
  const totalVolume = (overview.income || 0) + (overview.expense || 0);
  const incomePct = totalVolume > 0 ? ((overview.income || 0) / totalVolume) * 100 : 50;
  const expensePct = totalVolume > 0 ? ((overview.expense || 0) / totalVolume) * 100 : 50;

  const healthRating =
    healthScore !== undefined
      ? healthScore >= 85
        ? isIndonesian ? "Prima" : "Excellent"
        : healthScore >= 70
          ? isIndonesian ? "Sehat" : "Good"
          : healthScore >= 50
            ? isIndonesian ? "Moderat" : "Moderate"
            : healthScore >= 16
              ? isIndonesian ? "Defisit" : "Deficit"
              : isIndonesian ? "Kritis" : "Critical"
      : undefined;

  return (
    <section
      className="glass-surface rounded-[28px] p-5 sm:p-6 transition-all select-none space-y-4"
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Top Editorial Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <TrendingUp size={14} strokeWidth={1.75} />
          </div>
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {review.monthName} {review.year} · {isIndonesian ? "Kinerja" : "Review"}
          </span>
        </div>

        {healthScore !== undefined && (
          <div
            className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {isIndonesian ? "Skor" : "Score"} {healthScore} ({healthRating})
          </div>
        )}
      </div>

      {/* ── 2. Large Hero Number (Urbanist font-light, NO font-mono) ───────── */}
      <div className="space-y-1">
        <div
          className="text-[32px] sm:text-[38px] font-light tracking-tight tabular-nums leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {isSurplus ? "+" : ""}
          {formatWithPreferred(overview.netCashflow)}
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {isSurplus
            ? isIndonesian
              ? `Surplus bersih bulan ${review.monthName} terjaga sebesar ${formatWithPreferred(overview.netCashflow)} dengan tingkat tabungan ${overview.savingsRate.toFixed(0)}%.`
              : `Net surplus for ${review.monthName} preserved at ${formatWithPreferred(overview.netCashflow)} with a ${overview.savingsRate.toFixed(0)}% savings rate.`
            : isIndonesian
              ? `Defisit bersih bulan ${review.monthName} terjadi karena total belanja ${formatWithPreferred(overview.expense || 0)} melampaui pemasukan ${formatWithPreferred(overview.income || 0)}.`
              : `Net deficit for ${review.monthName} as total outflow ${formatWithPreferred(overview.expense || 0)} exceeded inflow ${formatWithPreferred(overview.income || 0)}.`}
        </p>
      </div>

      {/* ── 3. Fluid Segmented Progress Line ───────────────────────────────── */}
      <div className="space-y-2 pt-1">
        <div className="h-2 w-full rounded-full overflow-hidden flex bg-white/[0.08] dark:bg-white/[0.08] p-0.5 gap-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(4, Math.min(96, incomePct))}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)",
            }}
            title={`Income: ${incomePct.toFixed(0)}%`}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(4, Math.min(96, expensePct))}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="h-full rounded-full"
            style={{
              background: isDark ? "#ffffff" : "#18181b",
            }}
            title={`Expense: ${expensePct.toFixed(0)}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          <span>
            {isIndonesian ? "Pemasukan:" : "Inflow:"}{" "}
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatWithPreferred(overview.income || 0)}
            </strong>{" "}
            ({incomePct.toFixed(0)}%)
          </span>
          <span>
            {isIndonesian ? "Pengeluaran:" : "Outflow:"}{" "}
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatWithPreferred(overview.expense || 0)}
            </strong>{" "}
            ({expensePct.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* ── 3. Top MoM Shifts (Clean Stacked Chips) ─────────────────────────── */}
      {review.whatChanged.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--glass-border)]">
          <div className="flex items-center justify-between px-0.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Pergeseran Terbesar"
                : "Key Category Shifts"}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {review.whatChanged.length} {isIndonesian ? "pos" : "shifts"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {review.whatChanged.slice(0, 4).map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onCategoryClick?.(item.label);
                }}
                className="p-2.5 rounded-xl text-left active:scale-[0.98] transition-all cursor-pointer border flex flex-col justify-between"
                style={{
                  background: "var(--glass-fill)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className="text-[12px] font-semibold truncate block"
                    style={{ color: "var(--text-primary)" }}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-[10px] font-bold shrink-0 ml-1"
                    style={{
                      color: item.isUp ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {item.isUp ? "↑" : "↓"}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium tabular-nums"
                  style={{
                    color: item.isUp ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {item.changeText}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Key Highlights (Single Concise Editorial Takeaway) ───────────── */}
      {(review.whatWentWell.length > 0 || review.whatNeedsAttention.length > 0) && (
        <div
          className="p-2.5 rounded-xl flex items-center gap-2 text-[11px] border"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <TrendingUp
            size={13}
            className="shrink-0"
            style={{ color: "var(--text-primary)" }}
          />
          <span className="truncate">
            {isSurplus
              ? (review.whatWentWell[0] || (isIndonesian ? "Surplus arus kas terjaga dengan baik." : "Healthy net cash surplus maintained."))
              : (review.whatNeedsAttention[0] || (isIndonesian ? `Defisit bersih ${formatWithPreferred(Math.abs(overview.netCashflow))} karena belanja melampaui pemasukan.` : `Net deficit of ${formatWithPreferred(Math.abs(overview.netCashflow))} this cycle.`))}
          </span>
        </div>
      )}

      {/* ── 5. Expandable Full Diagnostic Context ──────────────────────────── */}
      {(review.whatWentWell.length > 1 ||
        review.whatNeedsAttention.length > 1 ||
        review.nextMonthBaseline) && (
        <div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowFullDetails(!showFullDetails);
            }}
            className="w-full pt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span>
              {showFullDetails
                ? isIndonesian
                  ? "Sembunyikan Catatan Lengkap"
                  : "Hide Detailed Notes"
                : isIndonesian
                  ? "Lihat Catatan Evaluasi Lengkap"
                  : "View Full Diagnostic Notes"}
            </span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${
                showFullDetails ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {showFullDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2 pt-2.5"
              >
                {review.whatWentWell.slice(1).map((pt, i) => (
                  <div
                    key={`well-${i}`}
                    className="p-2.5 rounded-xl flex items-start gap-2 text-[11px] leading-snug"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <CheckCircle2
                      size={13}
                      className="shrink-0 mt-0.5 text-[var(--text-primary)]"
                    />
                    <span>{pt}</span>
                  </div>
                ))}
                {review.whatNeedsAttention.slice(1).map((pt, i) => (
                  <div
                    key={`att-${i}`}
                    className="p-2.5 rounded-xl flex items-start gap-2 text-[11px] leading-snug"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <AlertCircle
                      size={13}
                      className="shrink-0 mt-0.5 text-[var(--text-tertiary)]"
                    />
                    <span>{pt}</span>
                  </div>
                ))}
                {review.nextMonthBaseline && (
                  <div
                    className="p-2.5 rounded-xl text-[10.5px] italic leading-relaxed"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    "{review.nextMonthBaseline}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
