const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8");

// 1. Imports
if (!content.includes("ChevronLeft")) {
  content = content.replace('ChevronRight } from "lucide-react"', 'ChevronRight, ChevronLeft } from "lucide-react"');
}
if (!content.includes("triggerHaptic")) {
  content = 'import { triggerHaptic } from "../lib/haptics"\n' + content;
}

// 2. State
if (!content.includes("monthOffset")) {
  content = content.replace(
    'const [walletFilterType, setWalletFilterType] = useState<"all" | "expense" | "income">("all")',
    'const [walletFilterType, setWalletFilterType] = useState<"all" | "expense" | "income">("all")\n  const [monthOffset, setMonthOffset] = useState(0)'
  );
}

// 3. RangeTxs calculation
const oldRangeMonth = '    } else if (range === "month") {\n      start = startOfMonth(now)\n      end = endOfMonth(now)';
const newRangeMonth = `    } else if (range === "month") {
      const targetMonth = subMonths(now, monthOffset)
      start = startOfMonth(targetMonth)
      end = endOfMonth(targetMonth)`;

content = content.replace(oldRangeMonth, newRangeMonth);
content = content.replace('}, [allTxs, range])', '}, [allTxs, range, monthOffset])');

// 4. TrendData for month
const oldTrendMonth = 'const currentYear = now.getFullYear()\n      const currentMonth = now.getMonth()';
const newTrendMonth = `const target = subMonths(now, monthOffset)
      const currentYear = target.getFullYear()
      const currentMonth = target.getMonth()`;

content = content.replace(oldTrendMonth, newTrendMonth);
content = content.replace('}, [allTxs, range])', '}, [allTxs, range, monthOffset])');

// 5. RangeTitle
const oldRangeTitle = `  const rangeTitle = useMemo(() => {
    if (range === "week") return "This Week"
    if (range === "month") return "This Month"
    if (range === "year") return "This Year"
    return "All Time"
  }, [range])`;

const newRangeTitle = `  const rangeTitle = useMemo(() => {
    if (range === "week") return "This Week"
    if (range === "month") {
      return format(subMonths(now, monthOffset), "MMMM yyyy")
    }
    if (range === "year") return "This Year"
    return "All Time"
  }, [range, monthOffset])`;

content = content.replace(oldRangeTitle, newRangeTitle);

// 6. Range buttons with haptics
content = content.replace(
  'onClick={() => setRange(r)}',
  'onClick={() => { setRange(r); triggerHaptic("light"); }}'
);

// 7. Month Navigator UI right below the Range selector pills
const oldRangeSelectorDiv = `        {/* Segmented Range Selector */}
        <div className="flex p-1 rounded-full glass-surface"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {(["week", "month", "year", "all"] as Range[]).map(r => (
            <motion.button key={r} onClick={() => { setRange(r); triggerHaptic("light"); }}
              className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all capitalize"
              style={{
                background: range === r ? "var(--accent)" : "transparent",
                color: range === r ? "var(--accent-ink)" : "var(--text-secondary)",
              }}
              whileTap={{ scale: 0.97 }}>
              {r === "week" ? "Week" : r === "month" ? "Month" : r === "year" ? "Year" : "All"}
            </motion.button>
          ))}
        </div>`;

const newRangeSelectorWithMonthNav = `        {/* Segmented Range Selector */}
        <div className="flex p-1 rounded-full glass-surface"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {(["week", "month", "year", "all"] as Range[]).map(r => (
            <motion.button key={r} onClick={() => { setRange(r); triggerHaptic("light"); }}
              className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all capitalize"
              style={{
                background: range === r ? "var(--accent)" : "transparent",
                color: range === r ? "var(--accent-ink)" : "var(--text-secondary)",
              }}
              whileTap={{ scale: 0.97 }}>
              {r === "week" ? "Week" : r === "month" ? "Month" : r === "year" ? "Year" : "All"}
            </motion.button>
          ))}
        </div>

        {/* Interactive Month Navigator (When Month is active) */}
        {range === "month" && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <button
              onClick={() => { setMonthOffset(o => o + 1); triggerHaptic("light"); }}
              className="p-1.5 rounded-xl active:scale-90 transition-transform flex items-center justify-center"
              style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
              title="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-extrabold text-[13px]" style={{ color: "var(--text-primary)" }}>
              {format(subMonths(now, monthOffset), "MMMM yyyy")}
            </span>
            <button
              disabled={monthOffset === 0}
              onClick={() => { setMonthOffset(o => Math.max(0, o - 1)); triggerHaptic("light"); }}
              className="p-1.5 rounded-xl active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
              style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
              title="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}`;

content = content.replace(oldRangeSelectorDiv, newRangeSelectorWithMonthNav);

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Updated StatisticsPage.tsx with Month Navigator & Haptics");
