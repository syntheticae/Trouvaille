import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { WidgetSize } from "../../../lib/widgetLayoutTypes";
import { CompactShell } from "./CompactShell";

export function CalendarCard({
  monthTransactionsCount = 0,
  activeDaysCount = 0,
  size: _size = "half",
  onOpenDetail,
}: {
  monthTransactionsCount?: number;
  activeDaysCount?: number;
  size?: WidgetSize;
  onOpenDetail?: () => void;
}) {
  const now = new Date();
  const dayStr = format(now, "EEE, d MMM");
  const monthName = format(now, "MMMM yyyy");

  return (
    <div onClick={onOpenDetail} className="cursor-pointer">
      <CompactShell title="Calendar" onOpenDetail={onOpenDetail}>
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
              {activeDaysCount}d Active
            </span>
          </div>
          <p className="text-[18px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight mt-0.5 truncate">
            {monthTransactionsCount}{" "}
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Entries
            </span>
          </p>
        </div>

        <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 border-t border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <CalendarDays size={11} strokeWidth={1.75} className="text-[var(--text-secondary)] shrink-0" />
            <span className="truncate">{monthName}</span>
          </div>
          <span className="text-[9px] font-medium text-[var(--text-secondary)] opacity-80 shrink-0">
            Tap to view calendar
          </span>
        </div>
      </CompactShell>
    </div>
  );
}
