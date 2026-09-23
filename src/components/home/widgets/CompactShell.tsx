import React from "react";
import { Info } from "lucide-react";
import { triggerHaptic } from "../../../lib/haptics";
import { useCurrency } from "../../../contexts/CurrencyContext";
import { useLanguage } from "../../../contexts/LanguageContext";

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
  return (
    <section
      className="glass-surface p-3.5 rounded-[22px] flex flex-col justify-between h-[154px] min-h-[154px] max-h-[154px] w-full relative overflow-hidden select-none box-border"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
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
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
            title={isIndonesian ? "Lihat Detail" : "View Details"}
          >
            <Info size={11} />
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
