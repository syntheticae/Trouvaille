import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  ArrowUpCircle,
  ArrowDownCircle,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Coins,
  CheckCircle2,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useMonthTransactions, useAllTransactions } from "../hooks/useTransactions";
import { useBills, useMarkBillPaid } from "../hooks/useBills";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { useCategories } from "../hooks/useCategories";
import {
  detectRecurringTransactions,
  calculatePersonalBaselines,
} from "../lib/financialMath";
import { calculateMonthCalendarRunway } from "../lib/calendarForecasting";
import { BottomSheet } from "../components/ui/BottomSheet";
import { formatRupiah } from "../lib/utils";
import { IconRenderer } from "../components/ui/IconRenderer";
import { useTheme } from "../contexts/ThemeContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { triggerHaptic } from "../lib/haptics";

function formatCompactRupiah(val: number): string {
  const abs = Math.abs(val);
  let formatted = "";
  if (abs >= 1000000000) {
    formatted = (abs / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  } else if (abs >= 1000000) {
    formatted = (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  } else if (abs >= 1000) {
    formatted = Math.round(abs / 1000) + "k";
  } else {
    formatted = abs.toString();
  }
  return val < 0 ? `-${formatted}` : formatted;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isStealthMode, toggleStealthMode } = usePrivacy();
  const { t, isIndonesian } = useLanguage();
  const dateLocale = isIndonesian ? idLocale : undefined;
  const displayRupiah = (val: number) => (isStealthMode ? "Rp ••••••••" : formatRupiah(val));
  const displayCompact = (val: number) => (isStealthMode ? "••••" : formatCompactRupiah(val));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view") === "runway" ? "runway" : "activity";
  const [viewMode, setViewMode] = useState<"activity" | "runway">(initialView);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "runway") {
      setViewMode("runway");
    } else if (viewParam === "activity") {
      setViewMode("activity");
    }
  }, [searchParams]);
  const [slideDirection, setSlideDirection] = useState<number>(0);

  const { data: monthTxs = [] } = useMonthTransactions(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
  );
  const { data: allTxs = [] } = useAllTransactions();
  const { data: bills = [] } = useBills();
  const { liquidAssets = 0 } = useWalletBalances();
  const { data: categories = [] } = useCategories();
  const markBillPaidMutation = useMarkBillPaid();

  // Baseline Discretionary Burn & Recurring Inflows Detection
  const personalBaselines = useMemo(() => {
    return calculatePersonalBaselines(allTxs, categories, new Date());
  }, [allTxs, categories]);

  const detectedRecurring = useMemo(() => {
    return detectRecurringTransactions(allTxs, bills, categories, new Date());
  }, [allTxs, bills, categories]);

  const dailyBaselineBurn = useMemo(() => {
    const monthlyMedian =
      personalBaselines.medianExpense || personalBaselines.meanExpense || 0;
    return Math.round(monthlyMedian / 30);
  }, [personalBaselines]);

  // Calendar Runway Forecast Telemetry
  const runwayTelemetry = useMemo(() => {
    return calculateMonthCalendarRunway({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      transactions: monthTxs,
      bills,
      currentLiquidAssets: liquidAssets,
      recurringItems: detectedRecurring,
      dailyBaselineBurn,
      referenceDate: new Date(),
    });
  }, [
    currentDate,
    monthTxs,
    bills,
    liquidAssets,
    detectedRecurring,
    dailyBaselineBurn,
  ]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  // Selected Day Forecast & Actuals
  const selectedDayForecast = useMemo(() => {
    if (!selectedDay) return null;
    const dStr = format(selectedDay, "yyyy-MM-dd");
    return runwayTelemetry.days.find((d) => d.date === dStr) ?? null;
  }, [selectedDay, runwayTelemetry.days]);

  const selectedDayTxs = useMemo(() => {
    if (!selectedDay) return [];
    const dStr = format(selectedDay, "yyyy-MM-dd");
    return monthTxs.filter((t) => t.occurred_on === dStr);
  }, [selectedDay, monthTxs]);

  const handlePrevMonth = () => {
    triggerHaptic("light");
    setSlideDirection(-1);
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic("light");
    setSlideDirection(1);
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleResetToToday = () => {
    triggerHaptic("medium");
    setSlideDirection(0);
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const isCurrentMonthView = isSameMonth(currentDate, new Date());
  const WEEKS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      className="px-5 py-5 min-h-screen space-y-6 pb-28"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate(-1);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation cursor-pointer select-none shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
            title={isIndonesian ? "Kembali" : "Back"}
            aria-label={isIndonesian ? "Kembali" : "Back"}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className="text-[18px] font-semibold tracking-tight truncate leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {t("calendar.title", "Calendar")}
            </h1>
            <p
              className="text-[11px] font-medium truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {viewMode === "runway"
                ? t("calendar.runwaySubtitle", "Runway & Projections")
                : t("calendar.activitySubtitle", "Activity & Schedule")}
            </p>
          </div>
        </div>

        {/* Apple Luxury Segmented Pill & Stealth Mode Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleStealthMode}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation cursor-pointer select-none no-pull"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: isStealthMode ? "var(--accent)" : "var(--text-secondary)",
            }}
            title={isStealthMode ? "Disable Stealth Mode" : "Enable Stealth Mode (or 3-finger tap)"}
          >
            {isStealthMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <div
            className="flex p-0.5 rounded-full glass-surface"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => {
                setViewMode("activity");
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer select-none ${
                viewMode === "activity"
                  ? isDark
                    ? "bg-white/12 text-white shadow-sm"
                    : "bg-black/[0.08] text-zinc-900 shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <CalendarDays size={12} strokeWidth={1.75} />
              {t("calendar.activityTab", "Activity")}
            </button>
            <button
              onClick={() => {
                setViewMode("runway");
                triggerHaptic("light");
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer select-none ${
                viewMode === "runway"
                  ? isDark
                    ? "bg-white/12 text-white shadow-sm"
                    : "bg-black/[0.08] text-zinc-900 shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <TrendingUp size={12} strokeWidth={1.75} />
              {t("calendar.runwayTab", "Runway")}
            </button>
          </div>
        </div>
      </div>

      {/* Runway Telemetry Bento Banner (Runway Mode) */}
      <AnimatePresence>
        {viewMode === "runway" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2.5">
              {/* Card 1: Runway Floor / Lowest Dip */}
              <div
                className="glass-surface p-3.5 rounded-2xl flex flex-col justify-between"
                style={{ border: "1px solid var(--glass-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Runway Floor
                  </span>
                  <TrendingDown size={13} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div>
                  <p
                    className="text-[14px] font-semibold tracking-tight truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {displayRupiah(runwayTelemetry.lowestDipAmount)}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {runwayTelemetry.lowestDipDate
                      ? `Dip on ${format(parseISO(runwayTelemetry.lowestDipDate), "dd MMM")}`
                      : "Stable runway"}
                  </p>
                </div>
              </div>

              {/* Card 2: Payday Horizon */}
              <div
                className="glass-surface p-3.5 rounded-2xl flex flex-col justify-between"
                style={{ border: "1px solid var(--glass-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Payday Horizon
                  </span>
                  <Coins size={13} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div>
                  <p
                    className="text-[14px] font-semibold tracking-tight truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {runwayTelemetry.daysUntilPayday !== null
                      ? `${runwayTelemetry.daysUntilPayday}d to Payday`
                      : "No Payday"}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {runwayTelemetry.nextPaydayAmount > 0
                      ? `+${displayRupiah(runwayTelemetry.nextPaydayAmount)}`
                      : "Check recurring"}
                  </p>
                </div>
              </div>

              {/* Card 3: No-Spend Days */}
              <div
                className="glass-surface p-3.5 rounded-2xl flex flex-col justify-between"
                style={{ border: "1px solid var(--glass-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    No-Spend Days
                  </span>
                  <ShieldCheck size={13} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div>
                  <p
                    className="text-[14px] font-semibold tracking-tight truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {runwayTelemetry.noSpendDaysCount} Days
                  </p>
                  <p
                    className="text-[10px] mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {runwayTelemetry.noSpendRatioPct}% of elapsed days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Calendar Card with Touch Swipe Gestures */}
      <motion.div
        className="glass-surface p-5 rounded-[24px] relative"
        style={{ border: "1px solid var(--glass-border)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        {/* Month Navigation Bar */}
        <div className="flex items-center justify-between mb-5 px-1">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full glass-surface active:scale-95 transition-transform cursor-pointer"
            style={{ color: "var(--text-primary)" }}
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <span
              className="font-semibold text-[15px] tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
            </span>
            {!isCurrentMonthView && (
              <button
                onClick={handleResetToToday}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold glass-surface active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                style={{
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <RotateCcw size={10} />
                {t("common.today", "Today")}
              </button>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full glass-surface active:scale-95 transition-transform cursor-pointer"
            style={{ color: "var(--text-primary)" }}
            aria-label="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Swipeable Calendar Grid Container */}
        <motion.div
          key={currentDate.toISOString().slice(0, 7)}
          initial={{ opacity: 0, x: slideDirection * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -slideDirection * 30 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x > 50) {
              handlePrevMonth();
            } else if (info.offset.x < -50) {
              handleNextMonth();
            }
          }}
          className="touch-pan-y"
        >
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
            {WEEKS.map((w) => (
              <div
                key={w}
                className="text-[11px] font-semibold mb-1 uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {w}
              </div>
            ))}

            {/* Leading padding for month alignment */}
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {/* Days Matrix */}
            {days.map((d) => {
              const dStr = format(d, "yyyy-MM-dd");
              const forecast = runwayTelemetry.days.find((df) => df.date === dStr);
              const isSel = selectedDay && isSameDay(d, selectedDay);
              const isT = isToday(d);

              const hasUnpaidBills = (forecast?.scheduledBills || []).some((b) => !b.isPaid);

              const hasData =
                (forecast?.actualInflow ?? 0) > 0 ||
                (forecast?.actualOutflow ?? 0) > 0 ||
                (forecast?.scheduledBills.length ?? 0) > 0;

              // Minimalist Apple Luxury Day Appearance
              let bg = "transparent";
              let textColor = "var(--text-tertiary)";
              let border = "1px solid transparent";
              let shadow = "none";
              let isBold = false;

              if (isT) {
                // Today: Iconic Apple solid contrast pill highlight
                bg = isDark ? "#FFFFFF" : "#18181B";
                textColor = isDark ? "#09090C" : "#FFFFFF";
                shadow = isDark
                  ? "0 2px 10px rgba(255,255,255,0.25)"
                  : "0 2px 10px rgba(0,0,0,0.18)";
                isBold = true;
              } else if (isSel) {
                // Selected Day: Frosted glass container with hairline ring
                bg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                border = isDark
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid rgba(0,0,0,0.2)";
                textColor = "var(--text-primary)";
                isBold = true;
              } else if (hasData) {
                // Active ledger day: Crisp typography
                textColor = "var(--text-primary)";
              } else {
                // Inactive day: Soft muted typography
                textColor = "var(--text-tertiary)";
              }

              // Determine sub-figure (angka pada tiap tanggal)
              let subFigure: string | null = null;
              let subFigureColor = isT
                ? (isDark ? "text-zinc-900" : "text-white")
                : isSel
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)]";

              if (viewMode === "activity") {
                if (forecast) {
                  if (forecast.actualInflow > 0 && forecast.actualOutflow === 0) {
                    subFigure = `+${displayCompact(forecast.actualInflow)}`;
                    if (!isT && !isSel) subFigureColor = "text-[var(--text-primary)] font-semibold";
                  } else if (forecast.actualOutflow > 0 && forecast.actualInflow === 0) {
                    subFigure = `-${displayCompact(forecast.actualOutflow)}`;
                    if (!isT && !isSel) subFigureColor = "text-[var(--text-secondary)] font-medium";
                  } else if (forecast.actualInflow > 0 && forecast.actualOutflow > 0) {
                    if (forecast.netActualCashflow >= 0) {
                      subFigure = `+${displayCompact(forecast.netActualCashflow)}`;
                      if (!isT && !isSel) subFigureColor = "text-[var(--text-primary)] font-semibold";
                    } else {
                      subFigure = `-${displayCompact(Math.abs(forecast.netActualCashflow))}`;
                      if (!isT && !isSel) subFigureColor = "text-[var(--text-secondary)] font-medium";
                    }
                  } else if (forecast.isNoSpendDay) {
                    subFigure = "0";
                    if (!isT && !isSel) subFigureColor = "text-[var(--text-tertiary)] opacity-60";
                  } else if (forecast.billsTotal > 0 && forecast.isFuture) {
                    subFigure = `-${displayCompact(forecast.billsTotal)}`;
                    if (!isT && !isSel) subFigureColor = "text-[var(--text-secondary)]";
                  } else if (forecast.expectedInflowsTotal > 0 && forecast.isFuture) {
                    subFigure = `+${displayCompact(forecast.expectedInflowsTotal)}`;
                    if (!isT && !isSel) subFigureColor = "text-[var(--text-primary)] font-semibold";
                  }
                }
              } else {
                // Runway mode
                if (forecast?.isFuture || forecast?.isToday) {
                  subFigure = displayCompact(forecast?.projectedBalance ?? 0);
                  if (!isT && !isSel) {
                    subFigureColor = forecast?.isLowestDip
                      ? "text-[var(--text-primary)] font-bold"
                      : "text-[var(--text-secondary)] font-medium";
                  }
                } else if (forecast?.isNoSpendDay) {
                  subFigure = "0";
                  if (!isT && !isSel) subFigureColor = "text-[var(--text-tertiary)] opacity-60";
                } else if (forecast?.actualOutflow) {
                  subFigure = `-${displayCompact(forecast.actualOutflow)}`;
                  if (!isT && !isSel) subFigureColor = "text-[var(--text-tertiary)]";
                }
              }

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => {
                    setSelectedDay(d);
                    triggerHaptic("light");
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl py-1 transition-all active:scale-95 cursor-pointer relative min-h-[46px] overflow-hidden"
                  style={{
                    background: bg,
                    border,
                    boxShadow: shadow,
                  }}
                >
                  {/* Day Number */}
                  <span
                    className={`text-[13px] leading-tight ${
                      isBold ? "font-bold" : "font-medium"
                    }`}
                    style={{ color: textColor }}
                  >
                    {format(d, "d")}
                  </span>

                  {/* Figure Under Date (Angka pada tiap tanggal) */}
                  {subFigure !== null ? (
                    <span
                      className={`text-[9px] tracking-tight truncate leading-none mt-0.5 max-w-[92%] ${subFigureColor}`}
                    >
                      {subFigure}
                    </span>
                  ) : (
                    <span className="text-[9px] leading-none mt-0.5 opacity-0 select-none">
                      -
                    </span>
                  )}

                  {/* Special Indicator Badges (STRICT MONOCHROME: NO GREEN, RED, YELLOW) */}
                  {forecast?.isPayday && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: isT
                          ? (isDark ? "#09090C" : "#FFFFFF")
                          : "var(--text-primary)",
                        boxShadow: isDark
                          ? "0 0 4px rgba(255,255,255,0.45)"
                          : "0 0 4px rgba(0,0,0,0.25)",
                      }}
                      title={isIndonesian ? "Pemasukan Gaji" : "Expected Payday"}
                    />
                  )}

                  {hasUnpaidBills && !isT && (
                    <span
                      className={`absolute top-1 ${forecast?.isPayday ? "left-1" : "right-1"} w-1.5 h-1.5 rounded-full`}
                      style={{
                        border: isDark
                          ? "1.5px solid rgba(255,255,255,0.7)"
                          : "1.5px solid rgba(0,0,0,0.6)",
                        background: "transparent",
                      }}
                      title={isIndonesian ? "Tagihan Belum Bayar" : "Unpaid Bill Due"}
                    />
                  )}

                  {forecast?.isLowestDip && viewMode === "runway" && !isT && (
                    <span
                      className="absolute bottom-0.5 w-1 h-1 rounded-full"
                      style={{
                        background: "var(--text-primary)",
                        opacity: 0.8,
                      }}
                      title="Runway Dip Floor"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* Monochrome Apple Luxury Calendar Legend / Keterangan */}
      <div
        className="glass-surface p-3.5 rounded-2xl border border-[var(--glass-border)]"
        style={{
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("calendar.legendTitle", "Calendar Legend")}
          </span>
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {viewMode === "activity"
              ? (isIndonesian ? "Mode Aktivitas" : "Activity Mode")
              : (isIndonesian ? "Mode Runway" : "Runway Mode")}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
          {/* 1. Today */}
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{
                background: isDark ? "#FFFFFF" : "#18181B",
                color: isDark ? "#09090C" : "#FFFFFF",
                boxShadow: isDark
                  ? "0 1px 4px rgba(255,255,255,0.2)"
                  : "0 1px 4px rgba(0,0,0,0.15)",
              }}
            >
              {format(new Date(), "d")}
            </span>
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {t("calendar.legendToday", "Today")}
            </span>
          </div>

          {/* 2. Figures / Activity */}
          <div className="flex items-center gap-2">
            <span
              className="px-1.5 h-5 rounded-lg flex items-center justify-center text-[9px] font-semibold shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {viewMode === "runway" ? "15M" : "-50k"}
            </span>
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {viewMode === "runway"
                ? (isIndonesian ? "Saldo Proyeksi" : "Projected Balance")
                : t("calendar.legendActivity", "Cashflow Activity")}
            </span>
          </div>

          {/* 3. Payday Inflow */}
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--text-primary)",
                  boxShadow: isDark
                    ? "0 0 4px rgba(255,255,255,0.45)"
                    : "0 0 4px rgba(0,0,0,0.25)",
                }}
              />
            </div>
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {t("calendar.legendPayday", "Payday Inflow")}
            </span>
          </div>

          {/* 4. Scheduled Bill */}
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  border: isDark
                    ? "1.5px solid rgba(255,255,255,0.7)"
                    : "1.5px solid rgba(0,0,0,0.6)",
                  background: "transparent",
                }}
              />
            </div>
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {t("calendar.legendBill", "Scheduled Bill")}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      {bills.filter((b) => !b.is_paid).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Upcoming Reminders
            </p>
            <span
              className="text-[11px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              {bills.filter((b) => !b.is_paid).length} pending
            </span>
          </div>

          <div className="space-y-2">
            {bills
              .filter((b) => !b.is_paid)
              .slice(0, 5)
              .map((b) => (
                <div
                  key={b.id}
                  className="glass-surface flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all"
                  style={{ border: "1px solid var(--glass-border)" }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Bell size={14} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {b.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {format(parseISO(b.due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                  {b.amount && (
                    <span
                      className="amount text-[13px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatRupiah(Number(b.amount))}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Day Detail Bottom Sheet */}
      <BottomSheet isOpen={!!selectedDay} onClose={() => setSelectedDay(null)}>
        <div className="px-5 pb-10">
          {selectedDay && selectedDayForecast && (
            <>
              {/* Sheet Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className="text-[20px] font-semibold tracking-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {format(selectedDay, "EEEE, dd MMMM yyyy")}
                  </h2>
                  <p
                    className="text-[12px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {selectedDayForecast.isToday
                      ? "Today"
                      : selectedDayForecast.isFuture
                      ? "Future Projection"
                      : "Past Ledger"}
                  </p>
                </div>

                {/* No-Spend Day Celebration Badge */}
                {selectedDayForecast.isNoSpendDay && (
                  <div
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <ShieldCheck size={12} />
                    No-Spend Day
                  </div>
                )}
              </div>

              {/* Future Forecast Breakdown */}
              {selectedDayForecast.isFuture ? (
                <div className="space-y-4 mb-6">
                  {/* Projected Closing Balance Card */}
                  <div
                    className="glass-surface p-4 rounded-2xl"
                    style={{ border: "1px solid var(--glass-border)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Projected Liquid Balance
                      </span>
                      {selectedDayForecast.isLowestDip && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          Lowest Dip Floor
                        </span>
                      )}
                    </div>
                    <p
                      className="amount text-[22px] tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatRupiah(selectedDayForecast.projectedBalance)}
                    </p>
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Expected liquidity based on scheduled bills, recurring income, and daily burn.
                    </p>
                  </div>

                  {/* Projected Inflows & Outflows for this day */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="glass-surface p-3.5 rounded-2xl"
                      style={{ border: "1px solid var(--glass-border)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <ArrowUpCircle size={14} style={{ color: "var(--text-secondary)" }} />
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Expected Inflow
                        </span>
                      </div>
                      <p
                        className="amount text-[16px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(selectedDayForecast.expectedInflowsTotal)}
                      </p>
                    </div>

                    <div
                      className="glass-surface p-3.5 rounded-2xl"
                      style={{ border: "1px solid var(--glass-border)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <ArrowDownCircle size={14} style={{ color: "var(--text-tertiary)" }} />
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Bills & Est. Burn
                        </span>
                      </div>
                      <p
                        className="amount text-[16px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {displayRupiah(
                          selectedDayForecast.billsTotal + selectedDayForecast.estimatedBurn,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Bills for this specific future date */}
                  {selectedDayForecast.scheduledBills.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p
                        className="text-[12px] font-semibold px-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Scheduled Obligations
                      </p>
                      {selectedDayForecast.scheduledBills.map((b) => (
                        <div
                          key={b.id}
                          className="glass-surface p-3.5 rounded-2xl flex items-center justify-between"
                          style={{ border: "1px solid var(--glass-border)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center"
                              style={{
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--glass-border)",
                              }}
                            >
                              <Bell size={14} />
                            </div>
                            <div>
                              <p
                                className="text-[13px] font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {b.title}
                              </p>
                              <span
                                className="text-[11px]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {b.isPaid ? "Paid" : "Due"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className="text-[13px] font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {displayRupiah(b.amount)}
                            </span>
                            {!b.isPaid && (
                              <button
                                onClick={() => {
                                  const originalBill = bills.find((item) => item.id === b.id);
                                  if (originalBill) {
                                    markBillPaidMutation.mutate({
                                      bill: originalBill,
                                      paid: true,
                                    });
                                    triggerHaptic("medium");
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold glass-surface active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                style={{
                                  border: "1px solid var(--glass-border)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                <CheckCircle2 size={12} />
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expected Inflows (e.g. Salary / Payday) */}
                  {selectedDayForecast.expectedInflows.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p
                        className="text-[12px] font-semibold px-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Expected Income Inflow
                      </p>
                      {selectedDayForecast.expectedInflows.map((inf, idx) => (
                        <div
                          key={idx}
                          className="glass-surface p-3.5 rounded-2xl flex items-center justify-between"
                          style={{ border: "1px solid var(--glass-border)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-primary)]"
                              style={{
                                background: "var(--glass-fill)",
                                border: "1px solid var(--glass-border)",
                              }}
                            >
                              <Coins size={14} />
                            </div>
                            <div>
                              <p
                                className="text-[13px] font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {inf.title}
                              </p>
                              <span
                                className="text-[11px] text-[var(--text-secondary)] font-semibold"
                              >
                                Scheduled Payday
                              </span>
                            </div>
                          </div>
                          <span
                            className="text-[13px] font-semibold text-[var(--text-primary)]"
                          >
                            +{displayRupiah(inf.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Past Days & Today Actual Cashflow */
                <>
                  <div className="flex gap-3 mb-6">
                    <div
                      className="flex-1 glass-surface p-4 rounded-2xl"
                      style={{ border: "1px solid var(--glass-border)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowUpCircle
                          size={14}
                          style={{ color: "var(--text-primary)" }}
                        />
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Inflow
                        </p>
                      </div>
                      <p
                        className="amount text-[17px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {displayRupiah(selectedDayForecast.actualInflow)}
                      </p>
                    </div>

                    <div
                      className="flex-1 glass-surface p-4 rounded-2xl"
                      style={{ border: "1px solid var(--glass-border)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowDownCircle
                          size={14}
                          style={{ color: "var(--text-tertiary)" }}
                        />
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Outflow
                        </p>
                      </div>
                      <p
                        className="amount text-[17px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {displayRupiah(selectedDayForecast.actualOutflow)}
                      </p>
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div className="space-y-2">
                    {selectedDayTxs.length === 0 ? (
                      <div
                        className="glass-surface p-6 text-center rounded-2xl"
                        style={{ border: "1px solid var(--glass-border)" }}
                      >
                        <p
                          className="text-[13px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {selectedDayForecast.isNoSpendDay
                            ? "Zero spend day! No expenses recorded."
                            : "No transactions on this date."}
                        </p>
                      </div>
                    ) : (
                      selectedDayTxs.map((tx) => (
                        <div
                          key={tx.id}
                          className="glass-surface px-4 py-3 flex items-center gap-3 rounded-2xl"
                          style={{ border: "1px solid var(--glass-border)" }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            <IconRenderer icon={tx.categories?.emoji ?? "??"} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[14px] font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {tx.categories?.name ?? "General"}
                            </p>
                            {tx.note && (
                              <p
                                className="text-[11px] truncate"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {tx.note}
                              </p>
                            )}
                          </div>
                          <span
                            className="amount text-[14px] font-semibold"
                            style={{
                              color:
                                tx.type === "income"
                                  ? "var(--accent)"
                                  : "var(--text-primary)",
                            }}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {displayRupiah(Number(tx.amount))}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </BottomSheet>

      <div className="h-4" />
    </div>
  );
}
