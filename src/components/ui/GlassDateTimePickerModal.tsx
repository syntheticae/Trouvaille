// ======================================================================
// TROUVAILLE UNIFIED IOS DATE & TIME WHEEL PICKER MODAL
// Twin Roller Drums: Date (Day / Month / Year) + Time (Hour / Minute)
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { format, getDaysInMonth } from "date-fns";
import { id as idLocale, enUS as enLocale } from "date-fns/locale";

const ITEM_HEIGHT = 40; // px height per wheel item
const VISIBLE_ITEMS = 5; // 5 rows visible (2 above, 1 selected, 2 below)
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 200px

interface GlassDateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  title?: string;
}

interface WheelColumnProps<T> {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  widthClass?: string;
}

function WheelColumn<T>({
  items,
  selectedIndex,
  onSelect,
  renderItem,
  widthClass = "flex-1",
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync scroll position when selectedIndex changes externally or on mount
  useEffect(() => {
    if (!containerRef.current || isScrollingRef.current) return;
    const targetScroll = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(containerRef.current.scrollTop - targetScroll) > 2) {
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;
    const scrollTop = containerRef.current.scrollTop;
    const newIndex = Math.min(
      items.length - 1,
      Math.max(0, Math.round(scrollTop / ITEM_HEIGHT)),
    );

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (newIndex !== selectedIndex) {
        triggerHaptic("light");
        onSelect(newIndex);
      }
    }, 80);
  }, [items.length, selectedIndex, onSelect]);

  const handleItemClick = (index: number) => {
    triggerHaptic("light");
    onSelect(index);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className={`relative h-[${WHEEL_HEIGHT}px] overflow-hidden ${widthClass}`}
      style={{ height: WHEEL_HEIGHT }}
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory relative z-10"
        style={{
          scrollSnapType: "y mandatory",
          paddingTop: ITEM_HEIGHT * 2,
          paddingBottom: ITEM_HEIGHT * 2,
        }}
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const dist = Math.abs(idx - selectedIndex);
          const opacity = isSelected ? 1 : dist === 1 ? 0.45 : 0.18;

          return (
            <div
              key={idx}
              onClick={() => handleItemClick(idx)}
              className="flex items-center justify-center cursor-pointer transition-opacity duration-150 select-none snap-center"
              style={{
                height: ITEM_HEIGHT,
                opacity,
              }}
            >
              {renderItem(item, isSelected)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GlassDateTimePickerModal({
  isOpen,
  onClose,
  value,
  onChange,
}: GlassDateTimePickerModalProps) {
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [tempDate, setTempDate] = useState<Date>(() => new Date(value));

  // Reset internal state on open
  useEffect(() => {
    if (isOpen) {
      setTempDate(new Date(value));
    }
  }, [isOpen, value]);

  const currentYear = tempDate.getFullYear();
  const currentMonth = tempDate.getMonth(); // 0-indexed
  const currentDay = tempDate.getDate();
  const currentHour = tempDate.getHours();
  const currentMinute = tempDate.getMinutes();

  // Date Wheel Options
  const years = useMemo(() => {
    const list: number[] = [];
    const base = new Date().getFullYear();
    for (let y = base - 4; y <= base + 5; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const monthNames = useMemo(() => {
    if (isIndonesian) {
      return [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];
    }
    return [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
  }, [isIndonesian]);

  const maxDays = useMemo(() => {
    return getDaysInMonth(new Date(currentYear, currentMonth, 1));
  }, [currentYear, currentMonth]);

  const days = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= maxDays; d++) {
      list.push(d);
    }
    return list;
  }, [maxDays]);

  // Hours: 00 - 23
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  // Minutes: 00 - 59
  const minutes = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => i);
  }, []);

  // Selected Indices
  const selectedYearIdx = Math.max(0, years.indexOf(currentYear));
  const selectedMonthIdx = currentMonth;
  const selectedDayIdx = Math.min(days.length - 1, Math.max(0, currentDay - 1));
  const selectedHourIdx = currentHour;
  const selectedMinuteIdx = currentMinute;

  // Handlers for wheel updates
  const updateYear = (idx: number) => {
    const nextY = years[idx];
    const newDate = new Date(tempDate);
    newDate.setFullYear(nextY);
    // Clamp day if days in month change
    const newMaxDays = getDaysInMonth(newDate);
    if (newDate.getDate() > newMaxDays) {
      newDate.setDate(newMaxDays);
    }
    setTempDate(newDate);
  };

  const updateMonth = (idx: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(idx);
    const newMaxDays = getDaysInMonth(newDate);
    if (newDate.getDate() > newMaxDays) {
      newDate.setDate(newMaxDays);
    }
    setTempDate(newDate);
  };

  const updateDay = (idx: number) => {
    const nextD = days[idx];
    const newDate = new Date(tempDate);
    newDate.setDate(nextD);
    setTempDate(newDate);
  };

  const updateHour = (idx: number) => {
    const nextH = hours[idx];
    const newDate = new Date(tempDate);
    newDate.setHours(nextH);
    setTempDate(newDate);
  };

  const updateMinute = (idx: number) => {
    const nextM = minutes[idx];
    const newDate = new Date(tempDate);
    newDate.setMinutes(nextM);
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    triggerHaptic("medium");
    onChange(tempDate);
    onClose();
  };

  // Header display string: e.g. "8:36 PM - Sat, Sep 18, 2027" or "20:36 - Sab, 18 Sep 2027"
  const headerPreview = useMemo(() => {
    const activeLocale = isIndonesian ? idLocale : enLocale;
    return format(tempDate, "p - EEE, d MMM yyyy", { locale: activeLocale });
  }, [tempDate, isIndonesian]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Bottom Sheet Drum Roller Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="w-full max-w-md rounded-t-[36px] p-5 pb-8 relative z-10 flex flex-col overflow-hidden select-none"
            style={{
              background: isDark
                ? "rgba(18, 18, 22, 0.96)"
                : "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(36px)",
              WebkitBackdropFilter: "blur(36px)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.12)"
                : "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: isDark
                ? "0 -16px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.14)"
                : "0 -16px 40px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
            }}
          >
            {/* Top Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 dark:bg-white/20 mx-auto mb-3.5" />

            {/* Header Preview Date & Time */}
            <div className="text-center mb-3">
              <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                {headerPreview}
              </span>
            </div>

            {/* SECTION 1: DATE DRUM (Day | Month | Year) */}
            <div
              className="relative rounded-2xl mb-3 overflow-hidden p-1"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* Highlight Capsule for Active Date Row */}
              <div
                className="absolute inset-x-2 top-1/2 -translate-y-1/2 pointer-events-none rounded-xl"
                style={{
                  height: ITEM_HEIGHT,
                  background: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.06)",
                  border: isDark
                    ? "1px solid rgba(255, 255, 255, 0.14)"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                }}
              />

              <div className="flex items-center justify-between">
                {/* Day Wheel */}
                <WheelColumn
                  items={days}
                  selectedIndex={selectedDayIdx}
                  onSelect={updateDay}
                  widthClass="w-1/4"
                  renderItem={(d, isSelected) => (
                    <span
                      className={`text-[16px] ${
                        isSelected
                          ? "font-semibold text-[var(--text-primary)]"
                          : "font-normal text-[var(--text-secondary)]"
                      }`}
                    >
                      {d}
                    </span>
                  )}
                />

                {/* Month Wheel */}
                <WheelColumn
                  items={monthNames}
                  selectedIndex={selectedMonthIdx}
                  onSelect={updateMonth}
                  widthClass="w-1/2"
                  renderItem={(m, isSelected) => (
                    <span
                      className={`text-[15.5px] truncate px-1 text-center ${
                        isSelected
                          ? "font-semibold text-[var(--text-primary)]"
                          : "font-normal text-[var(--text-secondary)]"
                      }`}
                    >
                      {m}
                    </span>
                  )}
                />

                {/* Year Wheel */}
                <WheelColumn
                  items={years}
                  selectedIndex={selectedYearIdx}
                  onSelect={updateYear}
                  widthClass="w-1/4"
                  renderItem={(y, isSelected) => (
                    <span
                      className={`text-[16px] ${
                        isSelected
                          ? "font-semibold text-[var(--text-primary)]"
                          : "font-normal text-[var(--text-secondary)]"
                      }`}
                    >
                      {y}
                    </span>
                  )}
                />
              </div>
            </div>

            {/* SECTION 2: TIME DRUM (Hour : Minute) */}
            <div
              className="relative rounded-2xl mb-5 overflow-hidden p-1"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* Highlight Capsule for Active Time Row */}
              <div
                className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none rounded-xl"
                style={{
                  height: ITEM_HEIGHT,
                  background: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.06)",
                  border: isDark
                    ? "1px solid rgba(255, 255, 255, 0.14)"
                    : "1px solid rgba(0, 0, 0, 0.06)",
                }}
              />

              <div className="flex items-center justify-center max-w-[260px] mx-auto relative">
                {/* Hour Wheel */}
                <WheelColumn
                  items={hours}
                  selectedIndex={selectedHourIdx}
                  onSelect={updateHour}
                  widthClass="flex-1"
                  renderItem={(h, isSelected) => (
                    <span
                      className={`text-[17px] ${
                        isSelected
                          ? "font-semibold text-[var(--text-primary)]"
                          : "font-normal text-[var(--text-secondary)]"
                      }`}
                    >
                      {String(h).padStart(2, "0")}
                    </span>
                  )}
                />

                {/* Time Colon Divider */}
                <span className="text-[17px] font-bold text-[var(--text-tertiary)] opacity-60 px-1 pointer-events-none">
                  :
                </span>

                {/* Minute Wheel */}
                <WheelColumn
                  items={minutes}
                  selectedIndex={selectedMinuteIdx}
                  onSelect={updateMinute}
                  widthClass="flex-1"
                  renderItem={(m, isSelected) => (
                    <span
                      className={`text-[17px] ${
                        isSelected
                          ? "font-semibold text-[var(--text-primary)]"
                          : "font-normal text-[var(--text-secondary)]"
                      }`}
                    >
                      {String(m).padStart(2, "0")}
                    </span>
                  )}
                />
              </div>
            </div>

            {/* Bottom Select Date & Time Button */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full h-12 rounded-2xl font-semibold text-[14px] flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
              style={{
                background: isDark ? "#ffffff" : "#121214",
                color: isDark ? "#000000" : "#ffffff",
                boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.35)",
              }}
            >
              {isIndonesian ? "Pilih Tanggal & Waktu" : "Select date"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
