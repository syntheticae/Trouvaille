import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
  parseISO,
} from "date-fns";
import { useMonthTransactions } from "../hooks/useTransactions";
import { useBills } from "../hooks/useBills";
import { BottomSheet } from "../components/ui/BottomSheet";
import { formatRupiah } from "../lib/utils";
import { IconRenderer } from "../components/ui/IconRenderer";
import { useTheme } from "../contexts/ThemeContext";

export function CalendarPage() {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { data: transactions = [] } = useMonthTransactions(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
  );
  const { data: bills = [] } = useBills();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const dayData = (date: Date) => {
    const dStr = format(date, "yyyy-MM-dd");
    const txs = transactions.filter((t) => t.occurred_on === dStr);
    const dayBills = bills.filter((b) => b.due_date === dStr);
    const income = txs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { txs, dayBills, income, expense };
  };

  const selectedData = selectedDay ? dayData(selectedDay) : null;
  const WEEKS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      className="px-5 py-5 min-h-screen space-y-6 pb-28"
      style={{ background: "var(--bg-base)" }}
    >
      <h1
        className="text-[24px] font-extrabold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Calendar
      </h1>

      <motion.div
        className="glass-surface p-5 rounded-[24px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5 px-1">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full glass-surface active:scale-95 transition-transform"
            style={{ color: "var(--text-primary)" }}
          >
            <ChevronLeft size={18} />
          </button>
          <span
            className="font-bold text-[15px]"
            style={{ color: "var(--text-primary)" }}
          >
            {format(currentDate, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-full glass-surface active:scale-95 transition-transform"
            style={{ color: "var(--text-primary)" }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
          {WEEKS.map((w) => (
            <div
              key={w}
              className="text-[11px] font-semibold mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {w}
            </div>
          ))}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((d) => {
            const { income, expense, dayBills } = dayData(d);
            const hasData = income > 0 || expense > 0 || dayBills.length > 0;
            const isSel = selectedDay && isSameDay(d, selectedDay);
            const isT = isToday(d);
            const isSurplus = hasData && income >= expense;
            const isDeficit = hasData && expense > income;

            let bg = "transparent";
            let textColor = "var(--text-tertiary)";
            let border = "none";

            if (isSurplus) {
              bg = isDark ? "#FFFFFF" : "#18181B";
              textColor = isDark ? "#121212" : "#FFFFFF";
            } else if (isDeficit) {
              bg = isDark ? "#3F3F46" : "#E4E4E7";
              textColor = isDark ? "#FFFFFF" : "#18181B";
            }

            if (isT && !hasData) {
              border = "1px solid var(--glass-border)";
              textColor = "var(--text-primary)";
            }

            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDay(d)}
                className="flex flex-col items-center justify-center rounded-[14px] py-1.5 transition-all active:scale-95"
                style={{
                  background: bg,
                  border,
                  boxShadow: isSel
                    ? isDark
                      ? "0 0 10px rgba(255,255,255,0.45), inset 0 0 0 1px #FFFFFF"
                      : "0 0 10px rgba(0,0,0,0.15), inset 0 0 0 1px #18181B"
                    : "none",
                }}
              >
                <span
                  className="text-[13px] font-bold"
                  style={{ color: textColor }}
                >
                  {format(d, "d")}
                </span>
                {hasData && (
                  <div className="flex gap-1 mt-1">
                    {income > 0 && (
                      <div
                        className="w-[4px] h-[4px] rounded-full"
                        style={{
                          background: isSurplus
                            ? isDark
                              ? "#121212"
                              : "#FFFFFF"
                            : isDark
                              ? "#FFFFFF"
                              : "#18181B",
                        }}
                      />
                    )}
                    {expense > 0 && (
                      <div
                        className="w-[4px] h-[4px] rounded-full"
                        style={{
                          background: isSurplus
                            ? isDark
                              ? "#71717A"
                              : "#D4D4D8"
                            : isDark
                              ? "#D4D4D8"
                              : "#71717A",
                        }}
                      />
                    )}
                    {dayBills.length > 0 && (
                      <div
                        className="w-[4px] h-[4px] rounded-full"
                        style={{
                          background: isSurplus
                            ? isDark
                              ? "#52525B"
                              : "#A1A1AA"
                            : isDark
                              ? "#A1A1AA"
                              : "#52525B",
                        }}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Upcoming bills */}
      {bills.filter((b) => !b.is_paid).length > 0 && (
        <section>
          <p
            className="text-[13px] font-bold mb-3 px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Upcoming Reminders
          </p>
          <div className="space-y-2">
            {bills
              .filter((b) => !b.is_paid)
              .slice(0, 5)
              .map((b) => (
                <div
                  key={b.id}
                  className="glass-surface flex items-center gap-3 px-4 py-3 rounded-2xl"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Bell size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-bold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {b.title}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {format(parseISO(b.due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                  {b.amount && (
                    <span
                      className="amount text-[13px] font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatRupiah(Number(b.amount))}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Day detail sheet */}
      <BottomSheet isOpen={!!selectedDay} onClose={() => setSelectedDay(null)}>
        <div className="px-5 pb-10">
          {selectedDay && selectedData && (
            <>
              <h2
                className="text-[20px] font-bold mb-5 tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {format(selectedDay, "dd MMMM yyyy")}
              </h2>
              <div className="flex gap-3 mb-6">
                <div className="flex-1 glass-surface p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowUpCircle
                      size={14}
                      style={{ color: "var(--text-primary)" }}
                    />
                    <p
                      className="text-[11px] font-bold"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Inflow
                    </p>
                  </div>
                  <p
                    className="amount text-[17px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(selectedData.income)}
                  </p>
                </div>
                <div className="flex-1 glass-surface p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowDownCircle
                      size={14}
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <p
                      className="text-[11px] font-bold"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Outflow
                    </p>
                  </div>
                  <p
                    className="amount text-[17px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatRupiah(selectedData.expense)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedData.txs.length === 0 ? (
                  <div className="glass-surface p-6 text-center rounded-2xl">
                    <p
                      className="text-[13px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      No transactions on this date.
                    </p>
                  </div>
                ) : (
                  selectedData.txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="glass-surface px-4 py-3 flex items-center gap-3 rounded-2xl"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <IconRenderer icon={tx.categories?.emoji ?? "??"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[14px] font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.categories?.name ?? "General"}
                        </p>
                        {tx.note && (
                          <p
                            className="text-[11px] truncate"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {tx.note}
                          </p>
                        )}
                      </div>
                      <span
                        className="amount text-[14px] font-bold"
                        style={{
                          color:
                            tx.type === "income"
                              ? "var(--accent)"
                              : "var(--text-primary)",
                        }}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatRupiah(Number(tx.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </BottomSheet>
      <div className="h-4" />
    </div>
  );
}
