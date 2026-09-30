import { useState, useEffect } from "react";
import { Bell, Clock, Check, Sparkles } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import {
  getDailyStreakReminderTime,
  setDailyStreakReminderTime,
  syncDailyStreakReminder,
  cancelDailyStreakReminder,
} from "../../lib/notifications";

interface DailyReminderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (enabled: boolean, time: string) => void;
}

export function DailyReminderSheet({
  isOpen,
  onClose,
  onSaved,
}: DailyReminderSheetProps) {
  const { isIndonesian } = useLanguage();
  const { showToast } = useToast();

  const [enabled, setEnabled] = useState<boolean>(() => {
    return localStorage.getItem("trouvaille_daily_reminder_enabled") !== "false";
  });
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    return getDailyStreakReminderTime();
  });

  // Keep state in sync whenever opened
  useEffect(() => {
    if (isOpen) {
      setEnabled(localStorage.getItem("trouvaille_daily_reminder_enabled") !== "false");
      setSelectedTime(getDailyStreakReminderTime());
    }
  }, [isOpen]);

  const handleToggle = () => {
    triggerHaptic("medium");
    setEnabled((prev) => !prev);
  };

  const handlePresetSelect = (time: string) => {
    triggerHaptic("light");
    setSelectedTime(time);
  };

  const handleSave = async () => {
    triggerHaptic("medium");
    try {
      localStorage.setItem(
        "trouvaille_daily_reminder_enabled",
        enabled ? "true" : "false",
      );
      setDailyStreakReminderTime(selectedTime);

      if (enabled) {
        await syncDailyStreakReminder(false);
      } else {
        await cancelDailyStreakReminder();
      }

      showToast(
        enabled
          ? isIndonesian
            ? `Pengingat harian aktif pukul ${selectedTime}`
            : `Daily reminder set for ${selectedTime}`
          : isIndonesian
            ? "Pengingat harian dinonaktifkan"
            : "Daily reminder disabled",
        "update",
        () => {},
      );

      if (onSaved) {
        onSaved(enabled, selectedTime);
      }
      onClose();
    } catch (err) {
      console.warn("Failed to save daily reminder settings:", err);
      onClose();
    }
  };

  const presets = [
    { time: "08:00", label: isIndonesian ? "Pagi 08:00" : "08:00 AM" },
    { time: "12:30", label: isIndonesian ? "Siang 12:30" : "12:30 PM" },
    { time: "19:00", label: isIndonesian ? "Malam 19:00" : "07:00 PM" },
    { time: "20:00", label: isIndonesian ? "Standar 20:00" : "08:00 PM" },
    { time: "21:30", label: isIndonesian ? "Larut 21:30" : "09:30 PM" },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div
        className="p-5 space-y-4"
        style={{
          paddingBottom:
            "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 28px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Bell size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2
                className="text-[16px] font-semibold tracking-tight leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Pengingat Streak Harian"
                  : "Daily Streak Reminder"}
              </h2>
              <p
                className="text-[11px] font-medium mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Pemberitahuan lembut untuk menjaga konsistensi kas"
                  : "Gentle alert to maintain financial logging streak"}
              </p>
            </div>
          </div>
        </div>

        {/* Master Activation Card */}
        <div
          onClick={handleToggle}
          className="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none"
          style={{
            background: enabled
              ? "rgba(255, 255, 255, 0.04)"
              : "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="space-y-0.5 pr-3">
            <span
              className="text-[13px] font-semibold block"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Aktifkan Pengingat" : "Enable Reminder"}
            </span>
            <span
              className="text-[11px] block"
              style={{ color: "var(--text-tertiary)" }}
            >
              {enabled
                ? isIndonesian
                  ? "Pemberitahuan aktif setiap hari"
                  : "Notifications scheduled daily"
                : isIndonesian
                  ? "Pemberitahuan dinonaktifkan"
                  : "No notifications will be sent"}
            </span>
          </div>

          {/* High-contrast Apple iOS Toggle */}
          <div
            className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center shrink-0 ${
              enabled
                ? "bg-[var(--text-primary)]"
                : "bg-black/15 dark:bg-white/15"
            }`}
          >
            <div
              className={`w-4.5 h-4.5 rounded-full transition-transform transform shadow-sm ${
                enabled
                  ? "translate-x-5 bg-[var(--bg-canvas)]"
                  : "translate-x-0.5 bg-white dark:bg-zinc-300"
              }`}
            />
          </div>
        </div>

        {/* Time Configuration Section (Only if enabled) */}
        {enabled && (
          <div
            className="p-4 rounded-2xl border space-y-4 transition-all"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--glass-border)",
            }}
          >
            {/* Digital Clock Display & Native Time Picker Trigger */}
            <div className="flex flex-col items-center justify-center py-2 space-y-1">
              <span
                className="text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Jadwal Pemberitahuan" : "Scheduled Time"}
              </span>

              <label
                className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{
                  background: "var(--glass-fill)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => {
                    if (e.target.value) {
                      triggerHaptic("light");
                      setSelectedTime(e.target.value);
                    }
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  aria-label={
                    isIndonesian
                      ? "Pilih Jam Pengingat"
                      : "Select Reminder Time"
                  }
                />
                <Clock
                  size={18}
                  strokeWidth={1.75}
                  className="text-[var(--text-tertiary)]"
                />
                <span
                  className="text-3xl font-mono font-bold tracking-widest tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedTime}
                </span>
              </label>

              <span
                className="text-[10px] text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Ketuk angka di atas untuk memutar jam"
                  : "Tap digits above to adjust custom time"}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 pt-1 border-t border-[var(--glass-border)]">
              <span
                className="text-[10px] font-mono uppercase tracking-[0.14em] block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Preset Pilihan:" : "Quick Presets:"}
              </span>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {presets.map((preset) => {
                  const isActive = selectedTime === preset.time;
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => handlePresetSelect(preset.time)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                        isActive
                          ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-transparent shadow-sm"
                          : "bg-[var(--glass-fill)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--glass-border)]"
                      }`}
                    >
                      <span className="font-mono text-[12px] font-bold">
                        {preset.time}
                      </span>
                      <span className="text-[9px] opacity-75">
                        {preset.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Motivational Insight Note */}
        <div
          className="p-3 rounded-2xl border flex items-start gap-2.5"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <Sparkles
            size={14}
            className="text-[var(--text-tertiary)] shrink-0 mt-0.5"
            strokeWidth={1.75}
          />
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {isIndonesian
              ? "Pemberitahuan hanya terpicu jika Anda belum mencatat transaksi sama sekali pada hari tersebut, memastikan streak konsistensi Anda tetap terjaga."
              : "Reminders only trigger if zero transactions have been logged today, safeguarding your financial consistency streak."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-[13px] font-semibold border cursor-pointer transition-all active:scale-[0.98]"
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
            className="flex-1 py-3 rounded-2xl text-[13px] font-semibold border cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-canvas)",
              borderColor: "transparent",
            }}
          >
            <Check size={14} strokeWidth={2} />
            <span>{isIndonesian ? "Simpan Perubahan" : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
