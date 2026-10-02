import React from "react";
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
export type AnalyticsSubTab =
  | "report"
  | "intelligence"
  | "cashflow"
  | "simulation";

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
  // ── Liquid Glass Tactile Materials ──
  const controlBg = isDark
    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.035) 100%)"
    : "linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(246, 247, 250, 0.72) 100%)";

  const controlBorder = isDark
    ? "1px solid rgba(255, 255, 255, 0.09)"
    : "1px solid rgba(0, 0, 0, 0.065)";

  const controlShadow = isDark
    ? "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.22)"
    : "inset 0 1px 0 #ffffff, 0 1px 3px rgba(30, 35, 50, 0.035)";

  const gradientDivider = {
    background: isDark
      ? "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 15%, rgba(255, 255, 255, 0.08) 85%, transparent 100%)"
      : "linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.06) 15%, rgba(0, 0, 0, 0.06) 85%, transparent 100%)",
    height: "1px",
    width: "100%",
  };

  return (
    <>
      {/* ── 1. Header Bar: Title & Action Capsule Controls ── */}
      <div className="relative z-20 flex justify-between items-center select-none pt-0.5">
        <div>
          <h1
            className="text-[22px] font-bold tracking-tight leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Statistik" : "Analytics"}
          </h1>
          <p
            className="text-[10.5px] font-semibold uppercase tracking-wider mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian
              ? "Kinerja & Distribusi"
              : "Performance & Distribution"}
          </p>
        </div>

        {/* Action Controls: Customize Button + Timeframe Dropdown Capsule */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setCustomizeStatsOpen(true);
            }}
            className="w-8.5 h-8.5 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
            style={{
              background: controlBg,
              border: controlBorder,
              color: "var(--text-secondary)",
              boxShadow: controlShadow,
            }}
            aria-label={
              isIndonesian ? "Kustomisasi Analitik" : "Customize Analytics"
            }
            title={
              isIndonesian ? "Kustomisasi Analitik" : "Customize Analytics"
            }
          >
            <SlidersHorizontal size={13.5} strokeWidth={1.8} />
          </button>

          {/* Timeframe Dropdown Capsule */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTimeframeMenuOpen((o) => !o);
                triggerHaptic("light");
              }}
              className="flex items-center gap-1.5 h-8.5 px-3 rounded-full text-[11.5px] font-semibold tracking-tight active:scale-95 transition-all cursor-pointer"
              style={{
                background: controlBg,
                border: controlBorder,
                color: "var(--text-primary)",
                boxShadow: controlShadow,
              }}
            >
              <span className="truncate max-w-[125px]">{rangeTitle}</span>
              <ChevronDown
                size={12.5}
                className={`transition-transform duration-200 opacity-70 ${
                  timeframeMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Apple Luxury Glass Popover Menu */}
            {timeframeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                  onClick={() => setTimeframeMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-2xl z-50 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none"
                  style={{
                    background: isDark
                      ? "linear-gradient(160deg, rgba(26, 26, 32, 0.98) 0%, rgba(14, 14, 18, 0.99) 100%)"
                      : "linear-gradient(160deg, rgba(255, 255, 255, 0.99) 0%, rgba(246, 247, 250, 0.98) 100%)",
                    border: controlBorder,
                    boxShadow: isDark
                      ? "0 18px 48px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.16)"
                      : "0 14px 36px rgba(0, 0, 0, 0.12), inset 0 1px 0 #ffffff",
                    backdropFilter: "blur(28px) saturate(180%)",
                    WebkitBackdropFilter: "blur(28px) saturate(180%)",
                  }}
                >
                  <div className="px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                    {isIndonesian ? "Rentang Waktu" : "Timeframe"}
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRange("week");
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background:
                          range === "week"
                            ? isDark
                              ? "rgba(255, 255, 255, 0.12)"
                              : "rgba(0, 0, 0, 0.06)"
                            : "transparent",
                        color:
                          range === "week"
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <span>{isIndonesian ? "Minggu Ini" : "This Week"}</span>
                      {range === "week" && (
                        <Check size={13} strokeWidth={2.8} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRange("month");
                        setMonthOffset(0);
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background:
                          range === "month" && monthOffset === 0
                            ? isDark
                              ? "rgba(255, 255, 255, 0.12)"
                              : "rgba(0, 0, 0, 0.06)"
                            : "transparent",
                        color:
                          range === "month" && monthOffset === 0
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <span>{isIndonesian ? "Bulan Ini" : "This Month"}</span>
                      {range === "month" && monthOffset === 0 && (
                        <Check size={13} strokeWidth={2.8} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRange("year");
                        setSelectedYear(now.getFullYear());
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background:
                          range === "year" && selectedYear === now.getFullYear()
                            ? isDark
                              ? "rgba(255, 255, 255, 0.12)"
                              : "rgba(0, 0, 0, 0.06)"
                            : "transparent",
                        color:
                          range === "year" && selectedYear === now.getFullYear()
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <span>{isIndonesian ? "Tahun Ini" : "This Year"}</span>
                      {range === "year" &&
                        selectedYear === now.getFullYear() && (
                          <Check size={13} strokeWidth={2.8} />
                        )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRange("all");
                        setTimeframeMenuOpen(false);
                        triggerHaptic("light");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background:
                          range === "all"
                            ? isDark
                              ? "rgba(255, 255, 255, 0.12)"
                              : "rgba(0, 0, 0, 0.06)"
                            : "transparent",
                        color:
                          range === "all"
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <span>{isIndonesian ? "Semua Waktu" : "All Time"}</span>
                      {range === "all" && <Check size={13} strokeWidth={2.8} />}
                    </button>
                  </div>

                  {/* Specific Month Stepper */}
                  <div className="mt-1.5 pt-1.5">
                    <div style={gradientDivider} className="mb-2" />
                    <div className="px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                      <span>
                        {isIndonesian ? "Bulan Tertentu" : "Specific Month"}
                      </span>
                      {range === "month" && monthOffset > 0 && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[var(--text-primary)]">
                          {isIndonesian ? "Aktif" : "Active"}
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center justify-between p-1 rounded-xl mt-1"
                      style={{
                        background: controlBg,
                        border: controlBorder,
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange("month");
                          setMonthOffset((o) => o + 1);
                          triggerHaptic("light");
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title={
                          isIndonesian ? "Bulan Sebelumnya" : "Previous Month"
                        }
                      >
                        <ChevronLeft size={13.5} strokeWidth={2} />
                      </button>
                      <span
                        onClick={() => {
                          setRange("month");
                          setTimeframeMenuOpen(false);
                          triggerHaptic("light");
                        }}
                        className="text-[11.5px] font-semibold cursor-pointer hover:underline text-center truncate px-1 text-[var(--text-primary)]"
                      >
                        {format(subMonths(now, monthOffset), "MMM yyyy", {
                          locale: isIndonesian ? idLocale : undefined,
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={monthOffset === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange("month");
                          setMonthOffset((o) => Math.max(0, o - 1));
                          triggerHaptic("light");
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title={isIndonesian ? "Bulan Berikutnya" : "Next Month"}
                      >
                        <ChevronRight size={13.5} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {/* Specific Year Stepper */}
                  <div className="mt-1.5 pt-1">
                    <div style={gradientDivider} className="mb-2" />
                    <div className="px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                      <span>
                        {isIndonesian ? "Pilih Tahun" : "Select Year"}
                      </span>
                      {range === "year" &&
                        selectedYear !== now.getFullYear() && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[var(--text-primary)]">
                            {isIndonesian ? "Aktif" : "Active"}
                          </span>
                        )}
                    </div>
                    <div
                      className="flex items-center justify-between p-1 rounded-xl mt-1"
                      style={{
                        background: controlBg,
                        border: controlBorder,
                      }}
                    >
                      <button
                        type="button"
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title={
                          isIndonesian ? "Tahun Sebelumnya" : "Previous Year"
                        }
                      >
                        <ChevronLeft size={13.5} strokeWidth={2} />
                      </button>
                      <span
                        onClick={() => {
                          setRange("year");
                          setTimeframeMenuOpen(false);
                          triggerHaptic("light");
                        }}
                        className="text-[11.5px] font-semibold cursor-pointer hover:underline text-center text-[var(--text-primary)]"
                      >
                        {isIndonesian
                          ? `Tahun ${selectedYear}`
                          : `Year ${selectedYear}`}
                      </span>
                      <button
                        type="button"
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title={isIndonesian ? "Tahun Berikutnya" : "Next Year"}
                      >
                        <ChevronRight size={13.5} strokeWidth={2} />
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRange("year");
                                setSelectedYear(yr);
                                setTimeframeMenuOpen(false);
                                triggerHaptic("light");
                              }}
                              className="flex-1 min-w-[50px] py-1 px-2 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer active:scale-95"
                              style={{
                                background: isSelected
                                  ? isDark
                                    ? "#ffffff"
                                    : "#18181b"
                                  : controlBg,
                                color: isSelected
                                  ? isDark
                                    ? "#000000"
                                    : "#ffffff"
                                  : "var(--text-secondary)",
                                border: isSelected
                                  ? isDark
                                    ? "1px solid #ffffff"
                                    : "1px solid #18181b"
                                  : controlBorder,
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

      {/* ── 2. Financial Wrapped: Flagship Hero Feature Entry ── */}
      <section
        onClick={() => {
          setWrappedOpen(true);
          triggerHaptic("medium");
        }}
        className="p-3 sm:p-3.5 rounded-3xl flex items-center justify-between cursor-pointer active:scale-[0.985] transition-all select-none relative overflow-hidden"
        style={{
          background: controlBg,
          border: controlBorder,
          boxShadow: controlShadow,
        }}
      >
        {/* Specular Rim Light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[12%] right-[12%] top-[1px] h-[1.5px] rounded-full"
          style={{
            background: isDark
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), rgba(255,255,255,0.5), rgba(255,255,255,0.3), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(255,255,255,1), rgba(255,255,255,0.8), transparent)",
          }}
        />

        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.05)",
              border: controlBorder,
              color: "var(--text-primary)",
            }}
          >
            <Sparkles size={16} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <p
                className="text-[13px] font-bold tracking-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Kilas Balik Finansial" : "Financial Wrapped"}
              </p>
              <span
                className="text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider border leading-none"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.04)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-tertiary)",
                }}
              >
                {range === "year"
                  ? isIndonesian
                    ? selectedYear === now.getFullYear()
                      ? "Tahun Ini"
                      : `${selectedYear}`
                    : selectedYear === now.getFullYear()
                      ? "Year Review"
                      : `${selectedYear}`
                  : isIndonesian
                    ? "Bulanan"
                    : "Monthly"}
              </span>
            </div>
            <p className="text-[10.5px] font-medium text-[var(--text-tertiary)] truncate mt-1 leading-none">
              {isIndonesian
                ? `Kilas balik ${range === "year" ? selectedYear : format(activeMonthDate, "MMMM yyyy", { locale: idLocale })}`
                : `Recap for ${range === "year" ? selectedYear : format(activeMonthDate, "MMMM yyyy")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[var(--text-tertiary)] pl-2">
          <span className="text-[10.5px] font-medium hidden sm:inline">
            {range === "year"
              ? selectedYear
              : format(activeMonthDate, "MMM yyyy", {
                  locale: isIndonesian ? idLocale : undefined,
                })}
          </span>
          <ChevronRight size={14} strokeWidth={2} className="opacity-70" />
        </div>
      </section>

      {/* ── 3. Segmented Control Sub-Tabs (macOS / iOS Parity) ── */}
      {analyticsTabs.length > 0 && (
        <div
          className="flex items-center p-1 rounded-2xl select-none"
          style={{
            background: controlBg,
            border: controlBorder,
            boxShadow: controlShadow,
          }}
        >
          {analyticsTabs.map((t) => {
            const isSelected = activeSubTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setAnalyticsSubTab(t.key);
                  triggerHaptic("light");
                }}
                className="flex-1 py-1.5 px-1 rounded-xl text-[11px] tracking-tight transition-all duration-150 active:scale-[0.97] cursor-pointer text-center truncate"
                style={{
                  background: isSelected
                    ? isDark
                      ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.84) 48%, rgba(244,245,247,0.90) 100%)"
                      : "#18181b"
                    : "transparent",
                  color: isSelected
                    ? isDark
                      ? "#000000"
                      : "#ffffff"
                    : "var(--text-tertiary)",
                  border: isSelected
                    ? isDark
                      ? "1px solid rgba(255, 255, 255, 0.95)"
                      : "1px solid #18181b"
                    : "1px solid transparent",
                  boxShadow: isSelected
                    ? isDark
                      ? "inset 0 1px 0 #ffffff, 0 2px 6px rgba(0, 0, 0, 0.25)"
                      : "0 2px 6px rgba(0, 0, 0, 0.14)"
                    : "none",
                  fontWeight: isSelected ? 600 : 500,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 4. Fallback Empty State (When all cards/tabs are hidden) ── */}
      {analyticsTabs.length === 0 && (
        <div
          className="p-8 rounded-3xl text-center space-y-3 select-none"
          style={{
            background: controlBg,
            border: controlBorder,
            boxShadow: controlShadow,
          }}
        >
          <div
            className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center"
            style={{
              background: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)",
              border: controlBorder,
            }}
          >
            <SlidersHorizontal
              size={18}
              strokeWidth={1.8}
              className="text-[var(--text-tertiary)]"
            />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
              {isIndonesian
                ? "Semua Kartu Dinonaktifkan"
                : "All Analytics Cards Hidden"}
            </h3>
            <p className="text-[11.5px] text-[var(--text-tertiary)] max-w-xs mx-auto mt-1 leading-relaxed">
              {isIndonesian
                ? "Aktifkan kembali kartu analitik melalui menu kustomisasi untuk melihat telemetri finansial Anda."
                : "Re-enable analytics cards from the customization menu to view your financial telemetry."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomizeStatsOpen(true)}
            className="h-9 px-4 rounded-full text-[11.5px] font-semibold cursor-pointer active:scale-95 transition-transform shadow-sm"
            style={{
              background: isDark ? "#ffffff" : "#18181b",
              color: isDark ? "#000000" : "#ffffff",
            }}
          >
            {isIndonesian ? "Buka Kustomisasi" : "Customize Analytics"}
          </button>
        </div>
      )}
    </>
  );
}
