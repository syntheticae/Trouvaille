import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  const displayRupiah = (val: number) => (isStealthMode ? "Rp ••••••••" : formatRupiah(val));
  const displayCompact = (val: number) => (isStealthMode ? "••••" : formatCompactRupiah(val));

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"activity" | "runway">("activity");
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate(-1);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation cursor-pointer select-none"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
            title="Kembali"
            aria-label="Kembali"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1
              className="text-[20px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Calendar
            </h1>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {viewMode === "runway"
                ? "Cashflow Runway & Liquidity Forecasting"
                : "Ledger Activity & Scheduled Reminders"}
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
            className="flex p-1 rounded-2xl glass-surface"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => {
                setViewMode("activity");
                triggerHaptic("light");
              }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "activity"
                  ? isDark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-zinc-900 text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <CalendarDays size={13} strokeWidth={1.75} />
              Activity
            </button>
            <button
              onClick={() => {
                setViewMode("runway");
                triggerHaptic("light");
              }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "runway"
                  ? isDark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-zinc-900 text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <TrendingUp size={13} strokeWidth={1.75} />
              Runway
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
                    style={{
                      color:
                        runwayTelemetry.lowestDipStatus === "critical"
                          ? "#ef4444"
                          : runwayTelemetry.lowestDipStatus === "caution"
                          ? "#f59e0b"
                          : "var(--text-primary)",
                    }}
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
              {format(currentDate, "MMMM yyyy")}
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
                Today
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

              const isSurplus =
                hasData && (forecast?.actualInflow ?? 0) >= (forecast?.actualOutflow ?? 0);
              const isDeficit =
                hasData && (forecast?.actualOutflow ?? 0) > (forecast?.actualInflow ?? 0);

              let bg = "transparent";
              let textColor = "var(--text-tertiary)";
              let border = "none";

              if (isSurplus) {
                bg = isDark ? "#FFFFFF" : "#18181B";
                textColor = isDark ? "#121212" : "#FFFFFF";
              } else if (isDeficit) {
                bg = isDark ? "#3F3F46" : "#E4E4E7";
                textColor = isDark ? "#FFFFFF" : "#18181B";
              }

              if (isT && !hasData) {
                border = "1px solid var(--glass-border)";
                textColor = "var(--text-primary)";
              }

              // No-Spend Day styling (Apple frosted silver halo)
              const isNoSpend = forecast?.isNoSpendDay;

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => {
                    setSelectedDay(d);
                    triggerHaptic("light");
                  }}
                  className="flex flex-col items-center justify-center rounded-[14px] py-1.5 transition-all active:scale-95 cursor-pointer relative min-h-[46px]"
                  style={{
                    background: bg,
                    border,
                    boxShadow: isSel
                      ? isDark
                        ? "0 0 10px rgba(255,255,255,0.45), inset 0 0 0 1px #FFFFFF"
                        : "0 0 10px rgba(0,0,0,0.15), inset 0 0 0 1px #18181B"
                      : isNoSpend
                      ? isDark
                        ? "inset 0 0 0 1.5px rgba(255,255,255,0.3)"
                        : "inset 0 0 0 1.5px rgba(0,0,0,0.15)"
                      : "none",
                  }}
                >
                  {/* Day Number */}
                  <span
                    className="text-[13px] font-semibold leading-tight"
                    style={{ color: textColor }}
                  >
                    {format(d, "d")}
                  </span>

                  {/* Activity View Markers */}
                  {viewMode === "activity" && hasData && (
                    <div className="flex gap-1 mt-1">
                      {(forecast?.actualInflow ?? 0) > 0 && (
                        <div
                          className="w-[4px] h-[4px] rounded-full"
                          style={{
                            background: isSurplus
                              ? isDark
                                ? "#121212"
                                : "#FFFFFF"
                              : isDark
                              ? "#FFFFFF"
                              : "#18181B",
                          }}
                        />
                      )}
                      {(forecast?.actualOutflow ?? 0) > 0 && (
                        <div
                          className="w-[4px] h-[4px] rounded-full"
                          style={{
                            background: isSurplus
                              ? isDark
                                ? "#71717A"
                                : "#D4D4D8"
                              : isDark
                              ? "#D4D4D8"
                              : "#71717A",
                          }}
                        />
                      )}
                      {(forecast?.scheduledBills.length ?? 0) > 0 && (
                        <div
                          className="w-[4px] h-[4px] rounded-full"
                          style={{
                            background: isSurplus
                              ? isDark
                                ? "#52525B"
                                : "#A1A1AA"
                              : isDark
                              ? "#A1A1AA"
                              : "#52525B",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Runway Mode Telemetry Micro-Badge */}
                  {viewMode === "runway" && (
                    <div className="flex flex-col items-center mt-0.5">
                      {forecast?.isFuture || forecast?.isToday ? (
                        <span
                          className={`text-[9px] font-semibold tracking-tight ${
                            forecast?.isLowestDip
                              ? "text-amber-400 font-semibold"
                              : isSurplus
                              ? isDark
                                ? "text-zinc-900"
                                : "text-white"
                              : "text-[var(--text-tertiary)]"
                          }`}
                        >
                          {displayCompact(forecast?.projectedBalance ?? 0)}
                        </span>
                      ) : forecast?.isNoSpendDay ? (
                        <span className="text-[9px] font-semibold opacity-60">0</span>
                      ) : (
                        <span className="text-[9px] font-semibold opacity-40">
                          {forecast?.transactionsCount ? `${forecast.transactionsCount} tx` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Special Indicator Badges (Payday or Lowest Dip or Unpaid Bill) */}
                  {forecast?.isPayday && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400"
                      title="Expected Payday"
                    />
                  )}
                  {hasUnpaidBills && (
                    <span
                      className={`absolute top-1 ${forecast?.isPayday ? "left-1" : "right-1"} w-1.5 h-1.5 rounded-full`}
                      style={{
                        background: isSurplus
                          ? (isDark ? "#121212" : "#FFFFFF")
                          : (isDark ? "#FFFFFF" : "#18181B"),
                        boxShadow: isDark
                          ? "0 0 4px rgba(255,255,255,0.6)"
                          : "0 0 4px rgba(0,0,0,0.3)",
                      }}
                      title="Unpaid Bill Due"
                    />
                  )}
                  {forecast?.isLowestDip && viewMode === "runway" && (
                    <span
                      className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-400"
                      title="Runway Dip Floor"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

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
                  className="glass-surface flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                  style={{ border: "1px solid var(--glass-border)" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Bell size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-semibold truncate"
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
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
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
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400"
                              style={{
                                background: "var(--bg-elevated)",
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
                                className="text-[11px] text-emerald-400 font-semibold"
                              >
                                Scheduled Payday
                              </span>
                            </div>
                          </div>
                          <span
                            className="text-[13px] font-semibold text-emerald-400"
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
