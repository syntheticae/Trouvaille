// ======================================================================
// TROUVAILLE CUSTOMIZE STATISTICS MODAL
// Apple Minimal / Luxury Glass Statistics Customization Sheet
//
// Design rules:
// - Monochrome luxury aesthetic
// - Frosted / translucent glass surfaces
// - No native colored emojis
// - Lucide icons only
// - Zero icons/symbols inside settings toggles
// - Theme is inherited entirely from existing CSS variables
// - Simulation / widget logic remains untouched
// ======================================================================

import { X } from "lucide-react";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import type {
  CardWidgetConfig,
  StatisticsPresetKey,
} from "../../lib/widgetLayoutTypes";
import { STATISTICS_PRESETS } from "../../lib/widgetLayoutTypes";

export interface CustomizeStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: CardWidgetConfig[];
  onToggleVisibility: (cardId: string) => void;
  onReset: () => void;
  onApplyPreset: (presetKey: StatisticsPresetKey) => void;
  onEnterGridEdit?: () => void;
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
  activePresetKey = "executive",
  onSelectPresetKey,
}: CustomizeStatisticsModalProps) {
  const { t, language } = useLanguage();
  const isIndonesian = language === "id";

  if (!isOpen) return null;

  const currentPresetDef = STATISTICS_PRESETS.find(
    (preset) => preset.key === activePresetKey,
  );

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

  const groups = [
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
  ];

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-end sm:items-center justify-center
        bg-black/65
        backdrop-blur-[18px]
        animate-fade-in
      "
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-statistics-title"
    >
      {/* ================================================================
          SHEET
          Full width on mobile, contained on desktop.
          The page/sheet is full bleed; feature groups remain inset.
      ================================================================= */}
      <div
        className="
          relative
          w-full
          max-w-md
          max-h-[90vh]
          sm:max-h-[82vh]
          flex
          flex-col
          overflow-hidden
          rounded-t-[30px]
          sm:rounded-[30px]
          animate-scale-up
        "
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow:
            "0 -8px 40px rgba(0,0,0,0.12), 0 24px 70px rgba(0,0,0,0.38)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* ================================================================
            HEADER
        ================================================================= */}
        <div
          className="
            shrink-0
            px-5
            pt-5
            pb-3.5
          "
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3
                id="customize-statistics-title"
                className="
                  text-[15px]
                  font-semibold
                  tracking-[-0.01em]
                  leading-tight
                "
                style={{
                  color: "var(--text-primary)",
                }}
              >
                {t("statistics.customizeCards", "Customize Analytics")}
              </h3>

              <p
                className="
                  mt-1
                  text-[11px]
                  font-medium
                  leading-relaxed
                "
                style={{
                  color: "var(--text-tertiary)",
                }}
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
              className="
                shrink-0
                w-8
                h-8
                rounded-full
                flex
                items-center
                justify-center
                cursor-pointer
                transition-all
                duration-200
                active:scale-90
              "
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-tertiary)",
              }}
              aria-label="Close"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ================================================================
            SCROLLABLE CONTENT
        ================================================================= */}
        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
            no-scrollbar
          "
        >
          {/* ==============================================================
              PRESETS
          =============================================================== */}
          <div className="px-5 pb-3.5">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.11em]
                "
                style={{
                  color: "var(--text-tertiary)",
                }}
              >
                {t("statistics.presetsLabel", "Presets")}
              </span>
            </div>

            <div
              className="
                flex
                items-center
                w-full
                p-1
                rounded-full
              "
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
                    className={`
                      flex-1
                      min-w-0
                      py-[7px]
                      px-1
                      rounded-full
                      text-[11px]
                      text-center
                      truncate
                      select-none
                      cursor-pointer
                      transition-all
                      duration-200
                      ${isActive ? "font-semibold shadow-sm" : "font-medium"}
                    `}
                    style={
                      isActive
                        ? {
                            background: "var(--text-primary)",
                            color: "var(--bg-base)",
                          }
                        : {
                            color: "var(--text-secondary)",
                          }
                    }
                  >
                    {t(`statistics.presets.${preset.key}`, preset.label)}
                  </button>
                );
              })}
            </div>

            <p
              className="
                mt-2
                px-1
                text-[10.5px]
                text-center
                leading-relaxed
                line-clamp-1
              "
              style={{
                color: "var(--text-tertiary)",
              }}
            >
              {getPresetDescription()}
            </p>
          </div>

          {/* ==============================================================
              FEATURE GROUPS

              IMPORTANT:
              The sheet itself is full width.
              These groups intentionally stay inset with mx-5.
          =============================================================== */}
          <div className="space-y-4 pb-5">
            {groups.map((group) => {
              const groupWidgets = widgets.filter((widget) =>
                group.ids.includes(widget.id),
              );

              if (groupWidgets.length === 0) {
                return null;
              }

              return (
                <section key={group.title} className="mx-5">
                  {/* Group title */}
                  <div className="px-1 mb-1.5">
                    <span
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.11em]
                      "
                      style={{
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {group.title}
                    </span>
                  </div>

                  {/* Group container */}
                  <div
                    className="
                      overflow-hidden
                      rounded-[17px]
                    "
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {groupWidgets.map((widget, index) => {
                      const isEnabled = widget.isVisible;

                      return (
                        <div
                          key={widget.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            onSelectPresetKey?.(null);
                            onToggleVisibility(widget.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();

                              onSelectPresetKey?.(null);

                              onToggleVisibility(widget.id);
                            }
                          }}
                          className="
                              flex
                              items-center
                              justify-between
                              gap-3
                              min-h-[58px]
                              px-3.5
                              py-2.5
                              cursor-pointer
                              select-none
                              transition-all
                              duration-200
                              active:bg-black/[0.03]
                            "
                          style={{
                            background: isEnabled
                              ? "rgba(255,255,255,0.035)"
                              : "transparent",
                            opacity: isEnabled ? 1 : 0.58,
                            borderTop:
                              index === 0
                                ? "none"
                                : "1px solid var(--glass-border)",
                          }}
                        >
                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p
                              className="
                                  text-[12.5px]
                                  font-semibold
                                  leading-snug
                                  truncate
                                "
                              style={{
                                color: "var(--text-primary)",
                              }}
                            >
                              {widget.title}
                            </p>

                            <p
                              className="
                                  mt-0.5
                                  text-[10.5px]
                                  leading-relaxed
                                  line-clamp-1
                                "
                              style={{
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {widget.subtitle}
                            </p>
                          </div>

                          {/* Toggle */}
                          <div
                            className="
                                shrink-0
                                ml-2
                              "
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <ToggleSwitch
                              checked={isEnabled}
                              onChange={() => {
                                onSelectPresetKey?.(null);
                                onToggleVisibility(widget.id);
                              }}
                              size="sm"
                              ariaLabel={`Toggle ${widget.title}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* ================================================================
            FOOTER
        ================================================================= */}
        <div
          className="
            shrink-0
            px-5
            pt-3
            pb-[max(calc(env(safe-area-inset-bottom,0px)+12px),24px)]
          "
          style={{
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex gap-2.5">
            {/* Reset */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                onSelectPresetKey?.("executive");
                onReset();
              }}
              className="
                flex-1
                h-10
                rounded-xl
                text-[12px]
                font-semibold
                cursor-pointer
                active:scale-[0.97]
                transition-transform
                flex
                items-center
                justify-center
              "
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
              }}
            >
              {t("statistics.resetDefaults", "Reset Defaults")}
            </button>

            {/* Done */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="
                flex-1
                h-10
                rounded-xl
                text-[12px]
                font-semibold
                cursor-pointer
                active:scale-[0.97]
                transition-transform
                flex
                items-center
                justify-center
              "
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-base)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
              }}
            >
              {t("common.done", "Done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
