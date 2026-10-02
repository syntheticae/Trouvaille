import React from "react";
import { Info } from "lucide-react";
import { triggerHaptic } from "../../../lib/haptics";
import { useCurrency } from "../../../contexts/CurrencyContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useTheme } from "../../../contexts/ThemeContext";

export interface CompactShellProps {
  title: string;
  badge?: string;
  onOpenDetail?: () => void;
  children: React.ReactNode;
}

export function CompactShell({
  title,
  onOpenDetail,
  children,
}: CompactShellProps) {
  useCurrency();
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const cardBg = isDark
    ? "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)"
    : "linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 247, 250, 0.90) 100%)";

  const cardBorder = isDark
    ? "1px solid rgba(255, 255, 255, 0.08)"
    : "1px solid rgba(0, 0, 0, 0.06)";

  const cardShadow = isDark
    ? "0 18px 44px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
    : "0 10px 30px -8px rgba(31, 36, 48, 0.06), inset 0 1px 0 #ffffff";

  return (
    <section
      className="p-3.5 rounded-[22px] flex flex-col justify-between h-[154px] min-h-[154px] max-h-[154px] w-full relative overflow-hidden select-none box-border transition-all"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Specular Rim Light Reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] right-[12%] top-[1px] h-[1.5px] rounded-full"
        style={{
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), rgba(255,255,255,0.45), rgba(255,255,255,0.25), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(255,255,255,1), rgba(255,255,255,0.8), transparent)",
        }}
      />

      {/* Top Header with Title and Info Button */}
      <div className="flex items-center justify-between gap-1.5 shrink-0 mb-1">
        <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)] truncate flex-1 leading-snug">
          {title}
        </span>

        {onOpenDetail && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic("light");
              onOpenDetail();
            }}
            className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
              border: cardBorder,
            }}
            title={isIndonesian ? "Lihat Detail" : "View Details"}
          >
            <Info size={11} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Center & Bottom Content */}
      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
        {children}
      </div>
    </section>
  );
}
