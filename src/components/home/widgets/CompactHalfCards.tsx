import { Zap, Clock } from "lucide-react";
import { formatRupiah } from "../../../lib/utils";
import { CompactShell } from "./CompactShell";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useCurrency } from "../../../contexts/CurrencyContext";

export function CompactSpendingStabilityHalf({
  level,
  dailyAvg,
  volatilityScore,
  onOpenDetail,
}: {
  level: "Low" | "Moderate" | "High";
  dailyAvg: number;
  volatilityScore: number;
  onOpenDetail?: () => void;
}) {
  const { language } = useLanguage();
  useCurrency();
  const isIndonesian = language === "id";

  const localizedLevel = isIndonesian
    ? level === "Low"
      ? "Rendah"
      : level === "Moderate"
        ? "Moderat"
        : "Tinggi"
    : level;

  return (
    <CompactShell title={isIndonesian ? "Stabilitas" : "Stability"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            {isIndonesian ? "Rerata Harian" : "Daily Outlay"}
          </span>
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {localizedLevel}
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(dailyAvg)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
          <span>{isIndonesian ? "Variansi" : "Variance"}</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {(volatilityScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(10, volatilityScore * 100))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactCashflowPulseHalf({
  netCashflow,
  consumedPct,
  isAheadOfPace,
  onOpenDetail,
}: {
  netCashflow: number;
  consumedPct: number;
  isAheadOfPace: boolean;
  onOpenDetail?: () => void;
}) {
  const { language } = useLanguage();
  useCurrency();
  const isIndonesian = language === "id";
  const isSurplus = netCashflow >= 0;

  const paceLabel = isAheadOfPace
    ? isIndonesian ? "Boros" : "Over Pace"
    : isIndonesian ? "Sesuai Jalur" : "On Track";

  return (
    <CompactShell title={isIndonesian ? "Arus Kas" : "Cashflow"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
            {isIndonesian ? "Sisa Kas" : "Net Retention"}
          </span>
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: isAheadOfPace ? "var(--text-secondary)" : "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {paceLabel}
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {isSurplus ? "+" : ""}
          {formatRupiah(netCashflow)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
          <span>{isIndonesian ? "Anggaran Terpakai" : "Budget Used"}</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {consumedPct.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, consumedPct))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactAIInsightsHalf({
  insightTitle,
  insightCategory,
  onOpenDetail,
}: {
  insightTitle: string;
  insightCategory?: string;
  onOpenDetail?: () => void;
}) {
  const { language } = useLanguage();
  const isIndonesian = language === "id";

  return (
    <CompactShell title={isIndonesian ? "Wawasan Finansial" : "Financial Insight"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex items-center py-1">
        <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-3">
          {insightTitle}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-white/5 text-[10px] font-medium text-[var(--text-tertiary)] shrink-0">
        <div className="flex items-center gap-1">
          <Zap size={11} />
          <span>{isIndonesian ? "Diagnostik" : "Diagnostic"}</span>
        </div>
        {insightCategory && (
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {insightCategory}
          </span>
        )}
      </div>
    </CompactShell>
  );
}

export function CompactGoalsHalf({
  goalTitle,
  progressPct,
  currentAmount,
  targetAmount,
  onOpenDetail,
}: {
  goalTitle: string;
  progressPct: number;
  currentAmount: number;
  targetAmount: number;
  onOpenDetail?: () => void;
}) {
  const { language } = useLanguage();
  useCurrency();
  const isIndonesian = language === "id";

  return (
    <CompactShell title={isIndonesian ? "Target Utama" : "Top Goal"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[85px]">
            {goalTitle}
          </p>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {progressPct.toFixed(0)}%
          </span>
        </div>
        <p className="text-[11px] amount text-[var(--text-tertiary)] mt-1 truncate">
          {formatRupiah(currentAmount)} / {formatRupiah(targetAmount)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

export function CompactBillsHalf({
  nextBillName,
  nextBillAmount,
  daysLeft,
  onOpenDetail,
}: {
  nextBillName: string;
  nextBillAmount: number;
  daysLeft: number;
  onOpenDetail?: () => void;
}) {
  const { language } = useLanguage();
  useCurrency();
  const isIndonesian = language === "id";

  const badgeLabel =
    daysLeft <= 0
      ? isIndonesian ? "Jatuh Tempo Hari Ini" : "Due Today"
      : isIndonesian ? `${daysLeft} hr lagi` : `In ${daysLeft}d`;

  return (
    <CompactShell title={isIndonesian ? "Tagihan" : "Next Bill"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[85px]">
            {nextBillName}
          </p>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {badgeLabel}
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(nextBillAmount)}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)] pt-1 border-t border-black/5 dark:border-white/5 shrink-0">
        <Clock size={11} />
        <span>{isIndonesian ? "Siklus mendatang" : "Upcoming cycle"}</span>
      </div>
    </CompactShell>
  );
}

export function CompactTopCategoriesHalf({
  topCategoryName,
  topCategoryAmount,
  topCategoryPct,
  onOpenDetail,
}: {
  topCategoryName: string;
  topCategoryAmount: number;
  topCategoryPct: number;
  onOpenDetail?: () => void;
}) {
  const { language } = useLanguage();
  useCurrency();
  const isIndonesian = language === "id";

  return (
    <CompactShell title={isIndonesian ? "Kategori Teratas" : "Top Category"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[85px]">
            {topCategoryName}
          </span>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {topCategoryPct.toFixed(0)}%
          </span>
        </div>
        <p className="text-[16px] font-semibold amount text-[var(--text-primary)] leading-tight mt-1">
          {formatRupiah(topCategoryAmount)}
        </p>
      </div>

      <div className="shrink-0">
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, topCategoryPct))}%` }}
          />
        </div>
      </div>
    </CompactShell>
  );
}

