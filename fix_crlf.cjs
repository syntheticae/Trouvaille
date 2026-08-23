const fs = require("fs");

// 1. Fix HomePage.tsx
let home = fs.readFileSync("src/pages/HomePage.tsx", "utf8").replace(/\r\n/g, "\n");
const oldHomeHeader = `<div className="flex items-baseline justify-between mb-1">
          <h2 className="text-[13px] font-extrabold tracking-wider text-white/90 leading-none">
            Net Portfolio
          </h2>
        </div>`;

const newHomeHeader = `<div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-extrabold tracking-wider text-white/90 leading-none">
            Net Portfolio
          </h2>
          <button
            onClick={toggleHideBalance}
            className="text-white/60 hover:text-white active:scale-90 transition-all p-1 -mr-1"
            title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
          >
            {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>`;

home = home.replace(oldHomeHeader, newHomeHeader);
fs.writeFileSync("src/pages/HomePage.tsx", home, "utf8");
console.log("HomePage CRLF fixed & replaced");

// 2. Fix StatisticsPage.tsx
let stats = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8").replace(/\r\n/g, "\n");

const oldStatsRange = `<div className="flex p-1 rounded-full glass-surface">
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

const newStatsRangeWithNav = `<div className="flex p-1 rounded-full glass-surface">
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

stats = stats.replace(oldStatsRange, newStatsRangeWithNav);
fs.writeFileSync("src/pages/StatisticsPage.tsx", stats, "utf8");
console.log("StatisticsPage CRLF fixed & replaced");
