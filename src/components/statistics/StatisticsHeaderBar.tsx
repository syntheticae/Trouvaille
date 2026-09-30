import { format, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";

export type StatisticsRange = "week" | "month" | "year" | "all";
export type AnalyticsSubTab = "report" | "intelligence" | "cashflow" | "simulation";

interface StatisticsHeaderBarProps {
  isIndonesian: boolean;
  isDark: boolean;
  range: StatisticsRange;
  setRange: (r: StatisticsRange) => void;
  monthOffset: number;
  setMonthOffset: React.Dispatch<React.SetStateAction<number>>;
  selectedYear: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  availableYears: number[];
  now: Date;
  activeMonthDate: Date;
  rangeTitle: string;
  timeframeMenuOpen: boolean;
  setTimeframeMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomizeStatsOpen: (open: boolean) => void;
  setWrappedOpen: (open: boolean) => void;
  analyticsTabs: { key: AnalyticsSubTab; label: string }[];
  activeSubTab: AnalyticsSubTab;
  setAnalyticsSubTab: (tab: AnalyticsSubTab) => void;
}

export function StatisticsHeaderBar({
  isIndonesian,
  isDark,
  range,
  setRange,
  monthOffset,
  setMonthOffset,
  selectedYear,
  setSelectedYear,
  availableYears,
  now,
  activeMonthDate,
  rangeTitle,
  timeframeMenuOpen,
  setTimeframeMenuOpen,
  setCustomizeStatsOpen,
  setWrappedOpen,
  analyticsTabs,
  activeSubTab,
  setAnalyticsSubTab,
}: StatisticsHeaderBarProps) {
  return (
    <>
      {/* Header with Compact Timeframe Selector */}
      <div className="relative z-20 flex justify-between items-center">
        <div>
          <h1
            className="text-[22px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Statistik" : "Analytics"}
          </h1>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian
              ? "Kinerja & Distribusi"
              : "Performance & Distribution"}
          </p>
        </div>

        {/* Action Controls: Customize Button (Icon Only) + Compact Timeframe Dropdown Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCustomizeStatsOpen(true);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all select-none cursor-pointer shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-card)",
            }}
            aria-label={
              isIndonesian ? "Kustomisasi Analitik" : "Customize Analytics"
            }
            title={
              isIndonesian ? "Kustomisasi Analitik" : "Customize Analytics"
            }
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} />
          </button>

          {/* Compact Timeframe Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTimeframeMenuOpen((o) => !o);
                triggerHaptic("light");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight active:scale-95 transition-all select-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span className="truncate max-w-[120px]">{rangeTitle}</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${timeframeMenuOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--text-tertiary)" }}
              />
            </button>

            {/* Luxury Apple Glass Timeframe Popover Menu */}
            {timeframeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
                  onClick={() => setTimeframeMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-60 p-2 rounded-2xl z-50 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: isDark ? "#121214" : "#FFFFFF",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
                  }}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--glass-border)] mb-1">
                    {isIndonesian ? "Rentang Waktu" : "Timeframe"}
                  </div>

                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setRange("week");
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                      style={{
                        color:
                          range === "week"
                            ? "var(--accent)"
                            : "var(--text-primary)",
                        background:
                          range === "week"
                            ? "var(--glass-fill)"
                            : "transparent",
                      }}
                    >
                      <span>{isIndonesian ? "Minggu Ini" : "This Week"}</span>
                      {range === "week" && <Check size={14} />}
                    </button>

                    <button
                      onClick={() => {
                        setRange("month");
                        setMonthOffset(0);
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                      style={{
                        color:
                          range === "month" && monthOffset === 0
                            ? "var(--accent)"
                            : "var(--text-primary)",
                        background:
                          range === "month" && monthOffset === 0
                            ? "var(--glass-fill)"
                            : "transparent",
                      }}
                    >
                      <span>{isIndonesian ? "Bulan Ini" : "This Month"}</span>
                      {range === "month" && monthOffset === 0 && (
                        <Check size={14} />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setRange("year");
                        setSelectedYear(now.getFullYear());
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                      style={{
                        color:
                          range === "year" && selectedYear === now.getFullYear()
                            ? "var(--accent)"
                            : "var(--text-primary)",
                        background:
                          range === "year" && selectedYear === now.getFullYear()
                            ? "var(--glass-fill)"
                            : "transparent",
                      }}
                    >
                      <span>{isIndonesian ? "Tahun Ini" : "This Year"}</span>
                      {range === "year" &&
                        selectedYear === now.getFullYear() && (
                          <Check size={14} />
                        )}
                    </button>

                    <button
                      onClick={() => {
                        setRange("all");
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-colors hover:bg-white/5 cursor-pointer"
                      style={{
                        color:
                          range === "all"
                            ? "var(--accent)"
                            : "var(--text-primary)",
                        background:
                          range === "all" ? "var(--glass-fill)" : "transparent",
                      }}
                    >
                      <span>{isIndonesian ? "Semua Waktu" : "All Time"}</span>
                      {range === "all" && <Check size={14} />}
                    </button>
                  </div>

                  {/* Specific Month Stepper */}
                  <div className="mt-1 pt-1.5 border-t border-[var(--glass-border)]">
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                      <span>
                        {isIndonesian ? "Bulan Tertentu" : "Specific Month"}
                      </span>
                      {range === "month" && monthOffset > 0 && (
                        <span className="text-[9px] font-medium text-[var(--accent)]">
                          {isIndonesian ? "Aktif" : "Active"}
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center justify-between p-1 rounded-xl mt-1"
                      style={{ background: "var(--glass-fill)" }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange("month");
                          setMonthOffset((o) => o + 1);
                          triggerHaptic("light");
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        style={{ color: "var(--text-secondary)" }}
                        title={
                          isIndonesian ? "Bulan Sebelumnya" : "Previous Month"
                        }
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span
                        onClick={() => {
                          setRange("month");
                          setTimeframeMenuOpen(false);
                          triggerHaptic("light");
                        }}
                        className="text-[11px] font-semibold cursor-pointer hover:underline text-center"
                        style={{
                          color:
                            range === "month"
                              ? "var(--accent)"
                              : "var(--text-primary)",
                        }}
                      >
                        {format(subMonths(now, monthOffset), "MMM yyyy", {
                          locale: isIndonesian ? idLocale : undefined,
                        })}
                      </span>
                      <button
                        disabled={monthOffset === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange("month");
                          setMonthOffset((o) => Math.max(0, o - 1));
                          triggerHaptic("light");
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20 cursor-pointer"
                        style={{ color: "var(--text-secondary)" }}
                        title={isIndonesian ? "Bulan Berikutnya" : "Next Month"}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Specific Year Stepper & Available Years */}
                  <div className="mt-1 pt-1.5 border-t border-[var(--glass-border)]">
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                      <span>
                        {isIndonesian ? "Pilih Tahun" : "Select Year"}
                      </span>
                      {range === "year" &&
                        selectedYear !== now.getFullYear() && (
                          <span className="text-[9px] font-medium text-[var(--accent)]">
                            {isIndonesian ? "Aktif" : "Active"}
                          </span>
                        )}
                    </div>
                    <div
                      className="flex items-center justify-between p-1 rounded-xl mt-1"
                      style={{ background: "var(--glass-fill)" }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange("year");
                          setSelectedYear((y) => {
                            const prevYears = availableYears.filter(
                              (ay) => ay < y,
                            );
                            return prevYears.length > 0
                              ? Math.max(...prevYears)
                              : y - 1;
                          });
                          triggerHaptic("light");
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        style={{ color: "var(--text-secondary)" }}
                        title={
                          isIndonesian ? "Tahun Sebelumnya" : "Previous Year"
                        }
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span
                        onClick={() => {
                          setRange("year");
                          setTimeframeMenuOpen(false);
                          triggerHaptic("light");
                        }}
                        className="text-[11px] font-semibold cursor-pointer hover:underline text-center"
                        style={{
                          color:
                            range === "year"
                              ? "var(--accent)"
                              : "var(--text-primary)",
                        }}
                      >
                        {isIndonesian
                          ? `Tahun ${selectedYear}`
                          : `Year ${selectedYear}`}
                      </span>
                      <button
                        disabled={selectedYear >= now.getFullYear()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange("year");
                          setSelectedYear((y) => {
                            const nextYears = availableYears.filter(
                              (ay) => ay > y,
                            );
                            return nextYears.length > 0
                              ? Math.min(...nextYears)
                              : Math.min(now.getFullYear(), y + 1);
                          });
                          triggerHaptic("light");
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20 cursor-pointer"
                        style={{ color: "var(--text-secondary)" }}
                        title={isIndonesian ? "Tahun Berikutnya" : "Next Year"}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Available Year Chips */}
                    {availableYears.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
                        {availableYears.map((yr) => {
                          const isSelected =
                            range === "year" && selectedYear === yr;
                          return (
                            <button
                              key={yr}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRange("year");
                                setSelectedYear(yr);
                                setTimeframeMenuOpen(false);
                                triggerHaptic("light");
                              }}
                              className="flex-1 min-w-[50px] py-1 px-2 rounded-lg text-[10.5px] font-semibold text-center transition-all cursor-pointer select-none"
                              style={{
                                background: isSelected
                                  ? "var(--text-primary)"
                                  : "var(--glass-fill)",
                                color: isSelected
                                  ? isDark
                                    ? "#000000"
                                    : "#FFFFFF"
                                  : "var(--text-secondary)",
                                border: isSelected
                                  ? "1px solid transparent"
                                  : "1px solid var(--glass-border)",
                                boxShadow: isSelected
                                  ? "0 1px 4px var(--shadow-strength)"
                                  : "none",
                              }}
                            >
                              {yr}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Financial Wrapped: Flagship Hero Feature Entry (Persistent across Analytics) ── */}
      <section
        onClick={() => {
          setWrappedOpen(true);
          triggerHaptic("medium");
        }}
        className="p-3.5 sm:p-4 rounded-3xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform select-none relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Sparkles size={18} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p
                className="text-[13.5px] font-bold tracking-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Kilas Balik Finansial" : "Financial Wrapped"}
              </p>
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  background: "var(--glass-fill-strong)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {range === "year"
                  ? isIndonesian
                    ? selectedYear === now.getFullYear()
                      ? "Kilas Balik Tahun Ini"
                      : `Kilas Balik ${selectedYear}`
                    : selectedYear === now.getFullYear()
                      ? "Year in Review"
                      : `${selectedYear} Wrapped`
                  : isIndonesian
                    ? "Rekap Bulanan"
                    : "Monthly Recap"}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)] hidden sm:inline">
                {isIndonesian ? "9 bab" : "9 chapters"}
              </span>
            </div>
            <p
              className="text-[11px] font-medium truncate mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? `Kilas balik finansial ${range === "year" ? selectedYear : format(activeMonthDate, "MMMM yyyy", { locale: idLocale })}`
                : `Your financial recap for ${range === "year" ? selectedYear : format(activeMonthDate, "MMMM yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[var(--text-tertiary)] pl-2">
          <span className="text-[11px] font-medium hidden sm:inline">
            {range === "year"
              ? selectedYear
              : format(activeMonthDate, "MMM yyyy", {
                  locale: isIndonesian ? idLocale : undefined,
                })}
          </span>
          <ChevronRight size={16} />
        </div>
      </section>

      {/* 4-Tab Luxury Apple Glass Segmented Control Bar */}
      <div
        className="flex items-center p-1 rounded-2xl border border-[var(--glass-border)]"
        style={{
          background: "var(--glass-fill)",
        }}
      >
        {analyticsTabs.map((t) => {
          const isSelected = activeSubTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setAnalyticsSubTab(t.key);
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-200 active:scale-95 cursor-pointer select-none text-center truncate"
              style={{
                background: isSelected ? "var(--bg-elevated)" : "transparent",
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
                boxShadow: isSelected
                  ? "0 1px 4px var(--shadow-strength)"
                  : "none",
                border: isSelected
                  ? "1px solid var(--glass-border)"
                  : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Fallback Empty State when all cards/tabs are hidden */}
      {analyticsTabs.length === 0 && (
        <div
          className="p-8 rounded-[28px] text-center space-y-3"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <SlidersHorizontal
              size={20}
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              {isIndonesian
                ? "Semua Kartu Dinonaktifkan"
                : "All Analytics Cards Hidden"}
            </h3>
            <p className="text-[12px] text-[var(--text-tertiary)] max-w-xs mx-auto mt-1">
              {isIndonesian
                ? "Aktifkan kembali kartu analitik melalui menu kustomisasi untuk melihat data finansial Anda."
                : "Re-enable analytics cards from the customization menu to view your financial telemetry."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomizeStatsOpen(true)}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold text-[var(--bg-base)] bg-[var(--text-primary)] cursor-pointer active:scale-95 transition-transform"
          >
            {isIndonesian ? "Buka Kustomisasi" : "Customize Analytics"}
          </button>
        </div>
      )}
    </>
  );
}
