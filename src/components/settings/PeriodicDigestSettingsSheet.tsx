import { useState, useEffect } from "react";
import { CalendarClock, Clock, Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import {
  getWeeklyDigestDay,
  setWeeklyDigestDay,
  getWeeklyDigestTime,
  setWeeklyDigestTime,
  syncWeeklyDigestNotification,
  cancelWeeklyDigestNotification,
  getMonthEndReviewTime,
  setMonthEndReviewTime,
  syncMonthEndReviewNotification,
  cancelMonthEndReviewNotification,
  type DigestDay,
} from "../../lib/notifications";
import type { Transaction } from "../../types";

interface PeriodicDigestSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transactions?: Transaction[];
  onSaved?: (weeklyEnabled: boolean, monthEndEnabled: boolean) => void;
}

export function PeriodicDigestSettingsSheet({
  isOpen,
  onClose,
  transactions = [],
  onSaved,
}: PeriodicDigestSettingsSheetProps) {
  const { isIndonesian } = useLanguage();
  const { showToast } = useToast();

  const [weeklyEnabled, setWeeklyEnabled] = useState<boolean>(() => {
    return localStorage.getItem("trouvaille_weekly_digest_enabled") !== "false";
  });
  const [monthEndEnabled, setMonthEndEnabled] = useState<boolean>(() => {
    return localStorage.getItem("trouvaille_month_end_review_enabled") !== "false";
  });

  const [selectedDay, setSelectedDay] = useState<DigestDay>(() => {
    return getWeeklyDigestDay();
  });
  const [selectedWeeklyTime, setSelectedWeeklyTime] = useState<string>(() => {
    return getWeeklyDigestTime();
  });
  const [selectedMonthEndTime, setSelectedMonthEndTime] = useState<string>(() => {
    return getMonthEndReviewTime();
  });

  // Keep state in sync whenever opened
  useEffect(() => {
    if (isOpen) {
      setWeeklyEnabled(
        localStorage.getItem("trouvaille_weekly_digest_enabled") !== "false",
      );
      setMonthEndEnabled(
        localStorage.getItem("trouvaille_month_end_review_enabled") !== "false",
      );
      setSelectedDay(getWeeklyDigestDay());
      setSelectedWeeklyTime(getWeeklyDigestTime());
      setSelectedMonthEndTime(getMonthEndReviewTime());
    }
  }, [isOpen]);

  const dayOptions: { day: DigestDay; title: string; desc: string }[] = [
    {
      day: "sunday",
      title: isIndonesian ? "Minggu" : "Sunday",
      desc: isIndonesian ? "Persiapan pekan baru" : "Prepare upcoming week",
    },
    {
      day: "friday",
      title: isIndonesian ? "Jumat" : "Friday",
      desc: isIndonesian ? "Akhir pekan kerja" : "End of work week",
    },
    {
      day: "monday",
      title: isIndonesian ? "Senin" : "Monday",
      desc: isIndonesian ? "Awal pekan kerja" : "Start of work week",
    },
  ];

  const weeklyTimePresets = [
    { time: "19:30", label: isIndonesian ? "19:30 Malam" : "07:30 PM" },
    { time: "20:00", label: isIndonesian ? "20:00 Standar" : "08:00 PM" },
    { time: "21:00", label: isIndonesian ? "21:00 Santai" : "09:00 PM" },
  ];

  const handleSave = async () => {
    triggerSuccessHaptic();
    try {
      localStorage.setItem(
        "trouvaille_weekly_digest_enabled",
        weeklyEnabled ? "true" : "false",
      );
      localStorage.setItem(
        "trouvaille_month_end_review_enabled",
        monthEndEnabled ? "true" : "false",
      );
      setWeeklyDigestDay(selectedDay);
      setWeeklyDigestTime(selectedWeeklyTime);
      setMonthEndReviewTime(selectedMonthEndTime);

      if (weeklyEnabled) {
        await syncWeeklyDigestNotification(transactions, isIndonesian);
      } else {
        await cancelWeeklyDigestNotification();
      }

      if (monthEndEnabled) {
        await syncMonthEndReviewNotification(isIndonesian);
      } else {
        await cancelMonthEndReviewNotification();
      }

      showToast(
        isIndonesian
          ? "Pengaturan rekap berkala berhasil disimpan"
          : "Periodic digest preferences saved",
        "update",
        () => {},
      );

      if (onSaved) {
        onSaved(weeklyEnabled, monthEndEnabled);
      }
      onClose();
    } catch (err) {
      console.warn("Failed to save periodic digest settings:", err);
      onClose();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div
        className="p-5 space-y-4 font-sans select-none"
        style={{
          paddingBottom:
            "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 28px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <CalendarClock size={16} strokeWidth={1.75} />
          </div>
          <div>
            <h2
              className="text-[16px] font-semibold tracking-tight leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian
                ? "Rekap & Evaluasi Berkala"
                : "Periodic Financial Digests"}
            </h2>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Konfigurasi jadwal rekap pengeluaran mingguan dan evaluasi buku akhir bulan"
                : "Configure weekly expense summaries and month-end book review schedule"}
            </p>
          </div>
        </div>

        {/* Section 1: Weekly Financial Digest */}
        <div
          className="p-4 rounded-2xl border space-y-3.5 transition-all"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="space-y-0.5 pr-2">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Ringkasan Mingguan"
                  : "Weekly Expense Digest"}
              </span>
              <span
                className="text-[11px] block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Rekap total pengeluaran 7 hari terakhir beserta alokasi kas"
                  : "Digest of spend over the last 7 days and cash allocation"}
              </span>
            </div>
            <ToggleSwitch
              checked={weeklyEnabled}
              onChange={() => {
                triggerHaptic("light");
                setWeeklyEnabled((prev) => !prev);
              }}
              ariaLabel="Toggle weekly financial digest"
            />
          </div>

          {weeklyEnabled && (
            <div className="space-y-3.5 pt-2 border-t border-[var(--glass-border)]">
              {/* Day Selector */}
              <div>
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold block mb-1.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Hari Pengiriman" : "Delivery Day"}
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {dayOptions.map((opt) => {
                    const isSelected = selectedDay === opt.day;
                    return (
                      <button
                        key={opt.day}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedDay(opt.day);
                        }}
                        className="p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                        style={{
                          background: isSelected
                            ? "rgba(255, 255, 255, 0.08)"
                            : "var(--glass-fill)",
                          borderColor: isSelected
                            ? "var(--text-primary)"
                            : "var(--glass-border)",
                        }}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span
                            className="text-[12px] font-semibold"
                            style={{
                              color: isSelected
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {opt.title}
                          </span>
                          {isSelected && (
                            <Check
                              size={12}
                              strokeWidth={2.4}
                              style={{ color: "var(--text-primary)" }}
                            />
                          )}
                        </div>
                        <span
                          className="text-[9.5px] leading-tight"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selector */}
              <div>
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold block mb-1.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Jam Pengiriman" : "Delivery Time"}
                </span>

                <div className="flex items-center gap-2 mb-2">
                  <label
                    className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                    style={{
                      background: "var(--glass-fill)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <input
                      type="time"
                      value={selectedWeeklyTime}
                      onChange={(e) => {
                        if (e.target.value) {
                          triggerHaptic("light");
                          setSelectedWeeklyTime(e.target.value);
                        }
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      aria-label={
                        isIndonesian
                          ? "Pilih Jam Rekap"
                          : "Select Digest Time"
                      }
                    />
                    <Clock
                      size={15}
                      strokeWidth={1.75}
                      className="text-[var(--text-tertiary)]"
                    />
                    <span
                      className="text-[14px] font-semibold tracking-wide tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedWeeklyTime}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {weeklyTimePresets.map((preset) => {
                    const isSelected = selectedWeeklyTime === preset.time;
                    return (
                      <button
                        key={preset.time}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedWeeklyTime(preset.time);
                        }}
                        className="py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer"
                        style={{
                          background: isSelected
                            ? "rgba(255, 255, 255, 0.08)"
                            : "var(--glass-fill)",
                          borderColor: isSelected
                            ? "var(--text-primary)"
                            : "var(--glass-border)",
                        }}
                      >
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            color: isSelected
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                          }}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Month-End Wealth Review */}
        <div
          className="p-4 rounded-2xl border space-y-3.5 transition-all"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="space-y-0.5 pr-2">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Evaluasi Penutupan Akhir Bulan"
                  : "Month-End Wealth Review"}
              </span>
              <span
                className="text-[11px] block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Pemberitahuan penutupan buku pada hari terakhir setiap bulan"
                  : "Book closing summary delivered on the last calendar day of each month"}
              </span>
            </div>
            <ToggleSwitch
              checked={monthEndEnabled}
              onChange={() => {
                triggerHaptic("light");
                setMonthEndEnabled((prev) => !prev);
              }}
              ariaLabel="Toggle month-end review"
            />
          </div>

          {monthEndEnabled && (
            <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
              <span
                className="text-[10px] uppercase tracking-wider font-semibold block mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Jam Pengiriman Hari Terakhir Bulan"
                  : "Delivery Time on Last Day of Month"}
              </span>

              <label
                className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{
                  background: "var(--glass-fill)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <input
                  type="time"
                  value={selectedMonthEndTime}
                  onChange={(e) => {
                    if (e.target.value) {
                      triggerHaptic("light");
                      setSelectedMonthEndTime(e.target.value);
                    }
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  aria-label={
                    isIndonesian
                      ? "Pilih Jam Evaluasi Bulanan"
                      : "Select Month-End Time"
                  }
                />
                <Clock
                  size={15}
                  strokeWidth={1.75}
                  className="text-[var(--text-tertiary)]"
                />
                <span
                  className="text-[14px] font-semibold tracking-wide tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedMonthEndTime}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border text-[13px] font-semibold active:scale-95 transition-all cursor-pointer text-center"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {isIndonesian ? "Batal" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold active:scale-95 transition-all cursor-pointer text-center border"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
              borderColor: "var(--text-primary)",
            }}
          >
            {isIndonesian ? "Simpan Preferensi" : "Save Preferences"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
