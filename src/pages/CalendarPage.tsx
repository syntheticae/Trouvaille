import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  CalendarDays,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  isSameMonth,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  useMonthTransactions,
  useAllTransactions,
} from "../hooks/useTransactions";
import { useBills, useAddBill, useMarkBillPaid } from "../hooks/useBills";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { useCategories } from "../hooks/useCategories";
import {
  detectRecurringTransactions,
  calculatePersonalBaselines,
  type DetectedRecurringItem,
} from "../lib/financialMath";
import { calculateMonthCalendarRunway } from "../lib/calendarForecasting";
import { formatRupiah } from "../lib/utils";
import { formatCompactRupiah } from "../lib/currency";
import { useTheme } from "../contexts/ThemeContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import {
  CalendarRunwayBento,
  CalendarMonthlyMatrix,
  CalendarUpcomingBillsSection,
  CalendarDayDetailSheet,
  PayBillModal,
  BillDailyReminderSheet,
  BillManagementSheets,
} from "../components/bills";
import type { Bill, RepeatRule } from "../lib/types";
import { triggerHaptic } from "../lib/haptics";

export function CalendarPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isStealthMode, toggleStealthMode } = usePrivacy();
  const { t, isIndonesian } = useLanguage();
  const { showToast } = useToast();
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [isManageBillsOpen, setIsManageBillsOpen] = useState(false);
  const [isReminderSheetOpen, setIsReminderSheetOpen] = useState(false);

  const dateLocale = isIndonesian ? idLocale : undefined;
  const displayRupiah = (val: number) =>
    isStealthMode ? "Rp ••••••••" : formatRupiah(val);
  const displayCompact = (val: number) =>
    isStealthMode ? "••••" : formatCompactRupiah(val);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [customViewMode, setCustomViewMode] = useState<
    "activity" | "runway" | null
  >(null);
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const viewMode =
    customViewMode ?? (viewParam === "runway" ? "runway" : "activity");
  const setViewMode = (mode: "activity" | "runway") => setCustomViewMode(mode);
  const [slideDirection, setSlideDirection] = useState<number>(0);

  const { data: monthTxs = [] } = useMonthTransactions(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
  );
  const { data: allTxs = [] } = useAllTransactions();
  const { data: bills = [] } = useBills();
  const { liquidAssets = 0 } = useWalletBalances();
  const { data: categories = [] } = useCategories();
  const addBillMutation = useAddBill();
  const markBillPaidMutation = useMarkBillPaid();

  // Ignored recurring IDs state for DetectedRecurringSection
  const [ignoredRecurringIds, setIgnoredRecurringIds] = useState<string[]>(
    () => {
      try {
        const raw = localStorage.getItem("trouvaille_ignored_recurring_ids");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
  );
  const [confirmingRecurringId, setConfirmingRecurringId] = useState<
    string | null
  >(null);

  // Baseline Discretionary Burn & Recurring Inflows Detection
  const personalBaselines = useMemo(() => {
    return calculatePersonalBaselines(
      allTxs,
      categories,
      new Date(),
      isIndonesian ? "id" : "en",
    );
  }, [allTxs, categories, isIndonesian]);

  const detectedRecurring = useMemo(() => {
    return detectRecurringTransactions(allTxs, bills, categories, new Date());
  }, [allTxs, bills, categories]);

  const detectedRecurringExpenseItems = useMemo(() => {
    return detectedRecurring.filter(
      (item) =>
        item.type === "expense" &&
        item.status === "detected" &&
        !ignoredRecurringIds.includes(item.id),
    );
  }, [detectedRecurring, ignoredRecurringIds]);

  const handleIgnoreRecurring = (item: DetectedRecurringItem) => {
    if (ignoredRecurringIds.includes(item.id)) return;
    const nextIds = [...ignoredRecurringIds, item.id];
    setIgnoredRecurringIds(nextIds);
    localStorage.setItem(
      "trouvaille_ignored_recurring_ids",
      JSON.stringify(nextIds),
    );
    triggerHaptic("light");
    showToast(
      isIndonesian
        ? `${item.title} disembunyikan dari saran tagihan rutin`
        : `${item.title} hidden from recurring suggestions`,
      "update",
      () => {},
    );
  };

  const handleConfirmRecurring = (item: DetectedRecurringItem) => {
    const repeatRule: RepeatRule =
      item.frequency === "weekly"
        ? "weekly"
        : item.frequency === "monthly"
          ? "monthly"
          : item.frequency === "yearly"
            ? "yearly"
            : "none";
    const freqLabelId =
      item.frequency === "weekly"
        ? "mingguan"
        : item.frequency === "monthly"
          ? "bulanan"
          : item.frequency === "yearly"
            ? "tahunan"
            : item.frequency;
    const note = isIndonesian
      ? repeatRule === "none"
        ? `Pola transaksi berulang ${freqLabelId} terdeteksi dari riwayat. Tinjau jadwal pembayaran secara manual setelah konfirmasi.`
        : `Dikonfirmasi dari pola transaksi berulang ${freqLabelId} yang terdeteksi.`
      : repeatRule === "none"
        ? `Detected ${item.frequency} recurring pattern from transaction history. Review cadence manually after confirmation.`
        : `Confirmed from detected ${item.frequency} recurring transaction pattern.`;

    setConfirmingRecurringId(item.id);
    addBillMutation.mutate(
      {
        title: item.title,
        amount: Math.round(item.typicalAmount),
        due_date: item.nextExpectedDate,
        repeat_rule: repeatRule,
        note,
        is_paid: false,
      },
      {
        onSuccess: () => {
          setConfirmingRecurringId(null);
          triggerHaptic("medium");
          showToast(
            isIndonesian
              ? `${item.title} ditambahkan ke tagihan rutin`
              : `${item.title} added to recurring bills`,
            "add",
            () => {},
          );
        },
        onError: () => {
          setConfirmingRecurringId(null);
          showToast(
            isIndonesian
              ? "Gagal mengonfirmasi transaksi rutin yang terdeteksi"
              : "Failed to confirm detected recurring item",
            "delete",
            () => {},
          );
        },
      },
    );
  };

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

  // Selected Day Forecast & Actuals (Normalized for full ISO timestamps per Rule 8.1)
  const selectedDayForecast = useMemo(() => {
    if (!selectedDay) return null;
    const dStr = format(selectedDay, "yyyy-MM-dd");
    return runwayTelemetry.days.find((d) => d.date === dStr) ?? null;
  }, [selectedDay, runwayTelemetry.days]);

  const selectedDayTxs = useMemo(() => {
    if (!selectedDay) return [];
    const dStr = format(selectedDay, "yyyy-MM-dd");
    return monthTxs.filter(
      (tx) => (tx.occurred_on || "").slice(0, 10) === dStr,
    );
  }, [selectedDay, monthTxs]);

  const handlePrevMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic("light");
    setSlideDirection(-1);
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleBack = () => {
    triggerHaptic("light");
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const isCurrentMonthView = isSameMonth(currentDate, new Date());

  return (
    <div
      className="px-5 min-h-screen space-y-6 pb-28"
      style={{
        background: "var(--bg-base)",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 14px), 20px)",
      }}
    >
      {/* Header & View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation cursor-pointer select-none shrink-0 relative z-10"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
            title={isIndonesian ? "Kembali" : "Back"}
            aria-label={isIndonesian ? "Kembali" : "Back"}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className="text-[18px] font-semibold tracking-tight truncate leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {t("calendar.title", isIndonesian ? "Kalender" : "Calendar")}
            </h1>
            <p
              className="text-[11px] font-medium truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {viewMode === "runway"
                ? t(
                    "calendar.runwaySubtitle",
                    isIndonesian
                      ? "Ketahanan Kas & Proyeksi"
                      : "Runway & Projections",
                  )
                : t(
                    "calendar.activitySubtitle",
                    isIndonesian
                      ? "Aktivitas & Jadwal Tagihan"
                      : "Activity & Schedule",
                  )}
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
            title={
              isStealthMode
                ? isIndonesian
                  ? "Nonaktifkan Mode Samaran"
                  : "Disable Stealth Mode"
                : isIndonesian
                  ? "Aktifkan Mode Samaran (atau ketuk 3 jari)"
                  : "Enable Stealth Mode (or 3-finger tap)"
            }
          >
            {isStealthMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <div
            className="flex p-0.5 rounded-full glass-surface"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <button
              type="button"
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
              {t(
                "calendar.activityTab",
                isIndonesian ? "Aktivitas" : "Activity",
              )}
            </button>
            <button
              type="button"
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
              {t("calendar.runwayTab", isIndonesian ? "Ketahanan" : "Runway")}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Runway Telemetry Bento Banner (Runway Mode) */}
      <CalendarRunwayBento
        viewMode={viewMode}
        runwayTelemetry={runwayTelemetry}
        isIndonesian={isIndonesian}
        dateLocale={dateLocale}
        displayRupiah={displayRupiah}
      />

      {/* 2. Monthly Matrix & Heatmap Grid + Legend */}
      <CalendarMonthlyMatrix
        currentDate={currentDate}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        days={days}
        startPad={startPad}
        slideDirection={slideDirection}
        isCurrentMonthView={isCurrentMonthView}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onResetToToday={handleResetToToday}
        viewMode={viewMode}
        runwayTelemetry={runwayTelemetry}
        isDark={isDark}
        isIndonesian={isIndonesian}
        dateLocale={dateLocale}
        displayCompact={displayCompact}
        t={t}
      />

      {/* 3. Subscription, Recurring Bill Tracker & Detected Recurring Patterns */}
      <CalendarUpcomingBillsSection
        bills={bills}
        detectedRecurringItems={detectedRecurringExpenseItems}
        confirmingRecurringId={confirmingRecurringId}
        onConfirmRecurring={handleConfirmRecurring}
        onIgnoreRecurring={handleIgnoreRecurring}
        onPayBill={(bill) => setPayingBill(bill)}
        onOpenManageBills={() => setIsManageBillsOpen(true)}
        onOpenReminderSettings={() => setIsReminderSheetOpen(true)}
        isIndonesian={isIndonesian}
        dateLocale={dateLocale}
        displayRupiah={displayRupiah}
      />

      {/* 4. Daily Obligation & Transaction Drawer */}
      <CalendarDayDetailSheet
        selectedDay={selectedDay}
        selectedDayForecast={selectedDayForecast}
        selectedDayTxs={selectedDayTxs}
        bills={bills}
        onClose={() => setSelectedDay(null)}
        onPayBill={(bill) => setPayingBill(bill)}
        isIndonesian={isIndonesian}
        dateLocale={dateLocale}
        displayRupiah={displayRupiah}
      />

      {/* 5. Pay Bill Settlement Modal */}
      {payingBill && (
        <PayBillModal
          isOpen={!!payingBill}
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          isPending={markBillPaidMutation.isPending}
          onConfirmPaid={({ bill, recordTransaction, walletId }) => {
            markBillPaidMutation.mutate(
              { bill, paid: true, recordTransaction, walletId },
              {
                onSuccess: () => {
                  setPayingBill(null);
                  showToast(
                    isIndonesian
                      ? `${bill.title} berhasil ditandai lunas`
                      : `${bill.title} marked as paid`,
                    "add",
                    () => {},
                  );
                },
                onError: (error: any) => {
                  showToast(
                    error?.message ||
                      (isIndonesian
                        ? `Gagal menandai ${bill.title}`
                        : `Failed to mark ${bill.title} as paid`),
                    "delete",
                    () => {},
                  );
                },
              },
            );
          }}
        />
      )}

      {/* 6. Recurring Bill Management Sheets */}
      <BillManagementSheets
        isOpen={isManageBillsOpen}
        onClose={() => setIsManageBillsOpen(false)}
      />

      {/* 7. Bill & Daily Log Reminder Settings Sheet */}
      <BillDailyReminderSheet
        isOpen={isReminderSheetOpen}
        onClose={() => setIsReminderSheetOpen(false)}
        bills={bills}
      />

      <div className="h-4" />
    </div>
  );
}
