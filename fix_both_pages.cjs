const fs = require("fs");

// 1. Fix HomePage.tsx
let homeContent = fs.readFileSync("src/pages/HomePage.tsx", "utf8");
if (!homeContent.includes("const [hideBalance")) {
  homeContent = homeContent.replace(
    'const [stockRange, setStockRange] = useState<StockRange>("1W")',
    `const [stockRange, setStockRange] = useState<StockRange>("1W")
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem("trouvaille_hide_balance") === "true")

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev
      localStorage.setItem("trouvaille_hide_balance", String(next))
      triggerHaptic("medium")
      return next
    })
  }`
  );
}
fs.writeFileSync("src/pages/HomePage.tsx", homeContent, "utf8");
console.log("Fixed HomePage.tsx hideBalance declaration");

// 2. Fix StatisticsPage.tsx
let statsContent = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8");

// Fix rangeTitle
statsContent = statsContent.replace(
  'const rangeTitle = range === "week" ? "This Week" : range === "month" ? "This Month" : range === "year" ? "This Year" : "All Time"',
  `const rangeTitle = useMemo(() => {
    if (range === "week") return "This Week"
    if (range === "month") {
      return format(subMonths(now, monthOffset), "MMMM yyyy")
    }
    if (range === "year") return "This Year"
    return "All Time"
  }, [range, monthOffset])`
);

// Add Month Navigator below Range Toggle
const oldRangeToggle = `      {/* Range Toggle */}
      <div className="flex p-1 rounded-full glass-surface">
        {(["week", "month", "year", "all"] as Range[]).map(r => (
          <motion.button key={r}
            onClick={() => { setRange(r); triggerHaptic("light"); }}
            className="flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200"
            style={{
              background: range === r ? "var(--accent)" : "transparent",
              color: range === r ? "var(--accent-ink)" : "var(--text-secondary)",
            }}
            whileTap={{ scale: 0.97 }}>
            {r === "week" ? "Week" : r === "month" ? "Month" : r === "year" ? "Year" : "All"}
          </motion.button>
        ))}
      </div>`;

const newRangeToggleWithNav = `      {/* Range Toggle */}
      <div className="flex p-1 rounded-full glass-surface">
        {(["week", "month", "year", "all"] as Range[]).map(r => (
          <motion.button key={r}
            onClick={() => { setRange(r); triggerHaptic("light"); }}
            className="flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200"
            style={{
              background: range === r ? "var(--accent)" : "transparent",
              color: range === r ? "var(--accent-ink)" : "var(--text-secondary)",
            }}
            whileTap={{ scale: 0.97 }}>
            {r === "week" ? "Week" : r === "month" ? "Month" : r === "year" ? "Year" : "All"}
          </motion.button>
        ))}
      </div>

      {/* Month Navigator when Month is active */}
      {range === "month" && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          <button
            onClick={() => { setMonthOffset(o => o + 1); triggerHaptic("light"); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-extrabold text-[13px]" style={{ color: "var(--text-primary)" }}>
            {format(subMonths(now, monthOffset), "MMMM yyyy")}
          </span>
          <button
            disabled={monthOffset === 0}
            onClick={() => { setMonthOffset(o => Math.max(0, o - 1)); triggerHaptic("light"); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none"
            style={{ background: "var(--glass-fill)", color: "var(--text-primary)" }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}`;

statsContent = statsContent.replace(oldRangeToggle, newRangeToggleWithNav);

fs.writeFileSync("src/pages/StatisticsPage.tsx", statsContent, "utf8");
console.log("Fixed StatisticsPage.tsx month navigation");
