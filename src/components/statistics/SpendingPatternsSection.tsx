import { useState } from "react";
import { Activity, CheckCircle2, Sparkles, ChevronDown } from "lucide-react";
import type { BehavioralPattern } from "../../lib/financialMath";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useTheme } from "../../contexts/ThemeContext";

interface SpendingPatternsSectionProps {
  patterns: BehavioralPattern[];
}

export function SpendingPatternsSection({
  patterns,
}: SpendingPatternsSectionProps) {
  useCurrency();
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const [showAll, setShowAll] = useState(false);

  if (!patterns || patterns.length === 0) {
    return null;
  }

  const visiblePatterns = showAll ? patterns : patterns.slice(0, 2);

  return (
    <section
      className="glass-surface rounded-[24px] p-5 transition-all select-none space-y-4"
      style={{
        border: "1px solid var(--glass-border)",
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Activity size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {isIndonesian ? "Dinamika Kategori & Perilaku" : "Behavioral Patterns & Shifts"}
            </h3>
            <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Observasi ritme & kebiasaan kas" : "Rhythm observations & spending cues"}
            </p>
          </div>
        </div>

        {/* Pattern Count Badge (Single Line) */}
        <div
          className="px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {patterns.length} {isIndonesian ? "Pola Terdeteksi" : "Patterns"}
          </span>
        </div>
      </div>

      {/* ── 2. Clean Pattern Cards ─────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {visiblePatterns.map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-2xl border space-y-2 transition-all"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            {/* Top Row: Category Type Badge + Sparkles */}
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.05)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {p.badge}
              </span>
              <Sparkles size={13} className="text-[var(--text-tertiary)] shrink-0" />
            </div>

            {/* Pattern Headline - full width, natural wrap, NO truncate */}
            <h4
              className="text-[13px] font-semibold leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {p.title}
            </h4>

            {/* Subtitle explanation */}
            <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {p.subtitle}
            </p>

            {/* Evidence row: wraps naturally, NO truncate so numbers & amounts are never clipped */}
            <div
              className="pt-2 border-t flex items-start gap-1.5 text-[11px] leading-relaxed"
              style={{
                borderColor: "var(--glass-border)",
                color: "var(--text-tertiary)",
              }}
            >
              <CheckCircle2
                size={12}
                className="shrink-0 mt-0.5 text-[var(--text-primary)]"
              />
              <span className="leading-relaxed">{p.evidence}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Toggle for Additional Patterns ───────────────────────────────── */}
      {patterns.length > 2 && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setShowAll(!showAll);
          }}
          className="w-full pt-1 flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>
            {showAll
              ? isIndonesian
                ? "Tampilkan Lebih Sedikit"
                : "Show Less"
              : isIndonesian
                ? `Tampilkan ${patterns.length - 2} Pola Lainnya`
                : `View ${patterns.length - 2} More Patterns`}
          </span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${
              showAll ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </section>
  );
}
