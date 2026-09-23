// ======================================================================
// TROUVAILLE CUSTOMIZE STATISTICS MODAL
// Apple Luxury Glassmorphism Customization Sheet for Analytics Bento Cards
// Strictly compliant with GEMINI.md:
// - Rule 1: No native colored system emojis, outline vector Lucide icons only
// - Rule 2: Monochrome luxury aesthetic with frosted glassmorphism
// - Rule 3: Zero icons/symbols in settings toggles, Apple iOS toggle switches
// ======================================================================

import { X, SlidersHorizontal } from "lucide-react";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import type { CardWidgetConfig, StatisticsPresetKey } from "../../lib/widgetLayoutTypes";
import { STATISTICS_PRESETS } from "../../lib/widgetLayoutTypes";

export interface CustomizeStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: CardWidgetConfig[];
  onToggleVisibility: (cardId: string) => void;
  onReset: () => void;
  onApplyPreset: (presetKey: StatisticsPresetKey) => void;
  onEnterGridEdit: () => void;
  activePresetKey?: StatisticsPresetKey | null;
  onSelectPresetKey?: (key: StatisticsPresetKey | null) => void;
}

export function CustomizeStatisticsModal({
  isOpen,
  onClose,
  widgets,
  onToggleVisibility,
  onReset,
  onApplyPreset,
  onEnterGridEdit,
  activePresetKey = "executive",
  onSelectPresetKey,
}: CustomizeStatisticsModalProps) {
  const { t, language } = useLanguage();
  const isIndonesian = language === "id";

  if (!isOpen) return null;

  const currentPresetDef = STATISTICS_PRESETS.find((p) => p.key === activePresetKey);

  const getPresetDescription = () => {
    if (!activePresetKey || !currentPresetDef) {
      return isIndonesian
        ? "Konfigurasi kustom sesuai preferensi Anda"
        : "Custom configuration tailored to your preference";
    }
    return t(
      `statistics.presets.${activePresetKey}Desc`,
      currentPresetDef.description,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+12px),16px)] sm:pb-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-statistics-title"
    >
      <div
        className="w-full max-w-md rounded-[28px] sm:rounded-3xl p-5 space-y-3.5 shadow-2xl animate-scale-up max-h-[82vh] sm:max-h-[80vh] flex flex-col"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title + Close Button */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3
              id="customize-statistics-title"
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {t("statistics.customizeCards", "Customize Analytics")}
            </h3>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t(
                "statistics.customizeCardsDesc",
                "Personalize analytics cards and dashboard sections",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95 shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-tertiary)",
            }}
            aria-label="Close"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Minimal 4-Preset Capsule Bar */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between px-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("statistics.presetsLabel", "Presets")}
            </span>
          </div>

          <div
            className="flex items-center p-1 rounded-full w-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {STATISTICS_PRESETS.map((preset) => {
              const isActive = activePresetKey === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    onSelectPresetKey?.(preset.key);
                    onApplyPreset(preset.key);
                  }}
                  className={`flex-1 py-1.5 px-1 text-center rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none truncate ${
                    isActive
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                  }`}
                >
                  {t(`statistics.presets.${preset.key}`, preset.label)}
                </button>
              );
            })}
          </div>

          <p className="text-[10.5px] text-[var(--text-tertiary)] text-center line-clamp-1 px-1 transition-opacity">
            {getPresetDescription()}
          </p>
        </div>

        {/* Mode Switch: Rearrange on Grid */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            onClose();
            onEnterGridEdit();
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-semibold cursor-pointer active:scale-[0.99] transition-all shrink-0"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <SlidersHorizontal size={12} strokeWidth={1.75} />
          <span>{t("statistics.rearrangeGrid", "Rearrange & Resize on Grid")}</span>
        </button>

        {/* Grouped Feature Rows for All Analytics Sections (Strictly Rule 3: Zero Icons in Toggles) */}
        <div className="space-y-3.5 overflow-y-auto no-scrollbar pr-0.5 flex-1 min-h-0">
          {[
            {
              title: isIndonesian ? "Laporan & Evaluasi" : "Report & Diagnostics",
              ids: [
                "financial_report",
                "monthly_review",
                "personal_baseline",
                "expense_structure",
              ],
            },
            {
              title: isIndonesian ? "Kecerdasan Finansial" : "Financial Intelligence",
              ids: [
                "health_score",
                "spending_patterns",
                "spending_density_heatmap",
                "zero_based_envelopes",
              ],
            },
            {
              title: isIndonesian ? "Arus Kas & Tren" : "Cashflow & Trend",
              ids: [
                "cashflow_summary",
                "category_breakdown",
                "cashflow_sankey",
                "inflow_outflow_trend",
                "cashflow_velocity",
              ],
            },
            {
              title: isIndonesian ? "Simulasi & Proyeksi" : "Simulation & Planning",
              ids: [
                "what_if_simulator",
                "monte_carlo",
                "fire_planner",
                "personal_financial_model",
                "debt_payoff",
                "cashflow_outlook",
                "liquidity_horizon",
              ],
            },
          ].map((group) => {
            const groupWidgets = widgets.filter((w) => group.ids.includes(w.id));
            if (groupWidgets.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1.5">
                <div className="px-1">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {group.title}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {groupWidgets.map((w) => {
                    const isEnabled = w.isVisible;
                    return (
                      <div
                        key={w.id}
                        onClick={() => {
                          onSelectPresetKey?.(null);
                          onToggleVisibility(w.id);
                        }}
                        className="flex items-center justify-between py-2.5 px-3.5 rounded-xl cursor-pointer active:scale-[0.99] transition-all duration-200 select-none"
                        style={{
                          background: isEnabled
                            ? "rgba(255, 255, 255, 0.05)"
                            : "var(--glass-fill)",
                          border: isEnabled
                            ? "1px solid rgba(255, 255, 255, 0.12)"
                            : "1px solid var(--glass-border)",
                          boxShadow: isEnabled
                            ? "0 4px 20px -2px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
                            : "none",
                          opacity: isEnabled ? 1 : 0.55,
                        }}
                      >
                        <div className="min-w-0 pr-3 text-left">
                          <p
                            className="text-[12.5px] font-semibold leading-snug truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {w.title}
                          </p>
                          <p
                            className="text-[10.5px] leading-relaxed mt-0.5 line-clamp-1"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {w.subtitle}
                          </p>
                        </div>
                        <div className="shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                          <ToggleSwitch
                            checked={isEnabled}
                            onChange={() => {
                              onSelectPresetKey?.(null);
                              onToggleVisibility(w.id);
                            }}
                            size="sm"
                            ariaLabel={`Toggle ${w.title}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Reset Defaults & Done */}
        <div className="flex gap-2.5 pt-3 border-t border-[var(--glass-border)] shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              onSelectPresetKey?.("executive");
              onReset();
            }}
            className="flex-1 h-10 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer text-center flex items-center justify-center"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {t("statistics.resetDefaults", "Reset Defaults")}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="flex-1 h-10 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer text-center flex items-center justify-center"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
            }}
          >
            {t("common.done", "Done")}
          </button>
        </div>
      </div>
    </div>
  );
}
