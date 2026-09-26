import { CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { WidgetSize } from "../../../lib/widgetLayoutTypes";
import { CompactShell } from "./CompactShell";
import { useLanguage } from "../../../contexts/LanguageContext";

export function CalendarCard({
  monthTransactionsCount = 0,
  activeDaysCount = 0,
  size = "full",
  onOpenDetail,
}: {
  monthTransactionsCount?: number;
  activeDaysCount?: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const { isIndonesian } = useLanguage();
  const now = new Date();
  const locale = isIndonesian ? idLocale : undefined;
  const dayStr = format(now, "EEE, d MMM", { locale });
  const fullDateStr = format(now, "EEEE, d MMMM", { locale });
  const monthName = format(now, "MMMM yyyy", { locale });

  if (size === "full") {
    return (
      <div
        onClick={onOpenDetail}
        className="glass-surface p-4 rounded-3xl cursor-pointer active:scale-[0.99] transition-transform flex items-center justify-between border border-[var(--glass-border)]"
        style={{
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <CalendarDays size={18} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[14px] font-semibold tracking-tight truncate leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {fullDateStr}
            </p>
            <p
              className="text-[11px] mt-0.5 truncate leading-tight"
              style={{ color: "var(--text-tertiary)" }}
            >
              {monthTransactionsCount} {isIndonesian ? "transaksi bulan ini" : "transactions this month"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {activeDaysCount} {isIndonesian ? "Hari Aktif" : "d Active"}
          </span>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <ChevronRight size={13} strokeWidth={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <CompactShell title={isIndonesian ? "Kalender" : "Calendar"} onOpenDetail={onOpenDetail}>
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] truncate">
            {dayStr}
          </span>
          <span
            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md truncate max-w-[85px]"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {activeDaysCount} {isIndonesian ? "Hari Aktif" : "d Active"}
          </span>
        </div>
        <p className="text-[18px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight mt-0.5 truncate">
          {monthTransactionsCount}{" "}
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
            {isIndonesian ? "Transaksi" : "Entries"}
          </span>
        </p>
      </div>

      <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-black/5 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <CalendarDays size={11} strokeWidth={1.75} className="text-[var(--text-secondary)] shrink-0" />
          <span className="truncate">{monthName}</span>
        </div>
        <span className="text-[9px] font-medium text-[var(--text-secondary)] opacity-80 shrink-0">
          {isIndonesian ? "Ringkasan" : "Overview"}
        </span>
      </div>
    </CompactShell>
  );
}
