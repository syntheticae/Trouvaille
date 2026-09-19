import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isToday } from "date-fns"

interface GlassDatePickerProps {
  date: Date
  onChange: (d: Date) => void
}

export function GlassDatePicker({ date, onChange }: GlassDatePickerProps) {
  const [month, setMonth] = useState(startOfMonth(date))
  
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const pad = getDay(start)

  return (
    <div className="p-4 rounded-[24px] glass-surface w-full max-w-[300px] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-1.5 rounded-lg active:scale-95" style={{ color: "var(--text-primary)" }}>
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-[14px]" style={{ color: "var(--text-primary)" }}>{format(month, "MMMM yyyy")}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-1.5 rounded-lg active:scale-95" style={{ color: "var(--text-primary)" }}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(w => (
          <span key={w} className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{w}</span>
        ))}
        {Array.from({ length: pad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(d => {
          const selected = isSameDay(d, date)
          const today = isToday(d)
          return (
            <button key={d.toISOString()} onClick={() => onChange(d)}
              className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-[12px] font-bold transition-all active:scale-90"
              style={{
                background: selected ? "var(--accent)" : today ? "var(--glass-fill-strong)" : "transparent",
                color: selected ? "var(--accent-ink)" : "var(--text-primary)",
                border: today && !selected ? "1px solid var(--glass-border)" : "none"
              }}>
              {format(d, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}
