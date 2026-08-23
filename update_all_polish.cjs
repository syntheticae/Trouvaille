const fs = require("fs");

// ==========================================
// 1. UPDATE TransactionsPage.tsx
// ==========================================
let txPage = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Clean Header (remove stacked dropdowns, keep clean title)
const oldHeaderRegex = /<div className="flex items-center justify-between mb-3">\s*<div>\s*<p className="text-\[12px\] font-semibold"[\s\S]*?<\/div>\s*\{\/\* Month & Account Dropdown Triggers \*\/\}[\s\S]*?<\/div>\s*<\/div>/;

const newCleanHeader = `<div className="mb-3">
          <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
            {filter === "income" ? "Weekly Inflow" : filter === "expense" ? "Weekly Outflow" : filter === "transfer" ? "Weekly Transfers" : "Weekly Activity"}
          </p>
          <p className="text-[32px] font-extrabold tracking-tight leading-tight amount" style={{ color: "var(--text-primary)" }}>
            {formatRupiah(totalPeriodAmount)}
          </p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>Past 7 days volume</p>
        </div>`;

txPage = txPage.replace(oldHeaderRegex, newCleanHeader);

// Replace Search Bar area with Search + Month Trigger + Account Trigger in 1 clean row
const oldSearchBarRegex = /\{\/\* Search Bar \*\/\}[\s\S]*?\{\/\* Unified Clean Filter Tabs \*\//;

const newSearchAndFilterRow = `{/* Search & Dropdown Filter Row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search note, category..."
              className="w-full pl-8 pr-7 py-2 rounded-2xl text-[13px] outline-none font-semibold"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)"
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full" style={{ color: "var(--text-tertiary)" }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Month Selector Trigger */}
          <button
            onClick={() => { setMonthPickerOpen(true); triggerHaptic("light"); }}
            className="flex items-center gap-1 px-2.5 py-2 rounded-2xl active:scale-95 transition-all shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)"
            }}
            title="Filter Month"
          >
            <Calendar size={13} style={{ color: "var(--text-secondary)" }} />
            <span className="text-[11px] font-extrabold max-w-[65px] truncate" style={{ color: "var(--text-primary)" }}>
              {selectedMonthLabel}
            </span>
            <ChevronDown size={11} style={{ color: "var(--text-tertiary)" }} />
          </button>

          {/* Account Selector Trigger */}
          <button
            onClick={() => { setAccountPickerOpen(true); triggerHaptic("light"); }}
            className="flex items-center gap-1 px-2.5 py-2 rounded-2xl active:scale-95 transition-all shrink-0"
            style={{
              background: selectedWalletName ? "var(--accent)" : "var(--bg-elevated)",
              border: selectedWalletName ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)"
            }}
            title="Filter Account"
          >
            <Wallet size={13} style={{ color: selectedWalletName ? "var(--accent-ink)" : "var(--text-secondary)" }} />
            <span className="text-[11px] font-extrabold max-w-[60px] truncate" style={{ color: selectedWalletName ? "var(--accent-ink)" : "var(--text-primary)" }}>
              {selectedWalletName || "Account"}
            </span>
            <ChevronDown size={11} style={{ color: selectedWalletName ? "var(--accent-ink)" : "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* Unified Clean Filter Tabs */`;

txPage = txPage.replace(oldSearchBarRegex, newSearchAndFilterRow);

// Remove the leftover horizontal scrollable pills row completely
const oldHorizontalPillsRegex = /\{\/\* Horizontal Account Filter Pills \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* ====== TRANSACTION LIST ======\*\//;
txPage = txPage.replace(
  oldHorizontalPillsRegex,
  '</div>\n\n      {/* ====== TRANSACTION LIST ======'
);

fs.writeFileSync("src/pages/TransactionsPage.tsx", txPage, "utf8");
console.log("Updated TransactionsPage.tsx clean search+filter row");


// ==========================================
// 2. UPDATE StatisticsPage.tsx
// ==========================================
let stats = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Dynamic continuous financial health calculation
const oldHealthScoreRegex = /const healthScore = useMemo\(\(\) => \{[\s\S]*?\}, \[totalIncome, totalExpense, spendingRatio\]\)/;

const newHealthScore = `const healthScore = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return 80
    if (totalIncome === 0) {
      // Only expenses: score decreases dynamically with expense volume
      return Math.max(20, Math.round(55 - Math.min(35, totalExpense / 400000)))
    }
    const ratio = totalExpense / totalIncome
    if (ratio <= 0.3) return Math.min(100, Math.round(95 + (0.3 - ratio) * 16))
    if (ratio <= 0.6) return Math.round(85 + (0.6 - ratio) * 33)
    if (ratio <= 0.9) return Math.round(70 + (0.9 - ratio) * 50)
    if (ratio <= 1.0) return Math.round(60 + (1.0 - ratio) * 100)
    if (ratio <= 1.3) return Math.round(45 - (ratio - 1.0) * 50)
    return Math.max(15, Math.round(30 - Math.min(15, (ratio - 1.3) * 10)))
  }, [totalIncome, totalExpense])`;

stats = stats.replace(oldHealthScoreRegex, newHealthScore);

// Clean Period Summary nominal formatting
const oldPeriodSummaryGridRegex = /\{\/\* Net Income Summary Row \*\/\}[\s\S]*?\{\/\* Hashtag Summary \*\//;

const newPeriodSummaryGrid = `{/* Net Income Summary Row */}
      <div className="p-5 rounded-[24px]"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>
          Period Summary · {rangeTitle}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total In", value: totalIncome, icon: "↑" },
            { label: "Total Out", value: totalExpense, icon: "↓" },
            { label: "Net", value: totalIncome - totalExpense, icon: "=" },
          ].map(({ label, value, icon }) => {
            const isNet = label === "Net"
            const abs = Math.abs(value)
            let formatted = "0"
            if (abs >= 1000000) {
              formatted = (abs / 1000000).toFixed(1).replace(/\\.0$/, "") + "M"
            } else if (abs >= 1000) {
              formatted = (abs / 1000).toFixed(0) + "K"
            } else {
              formatted = abs.toLocaleString("id-ID")
            }
            const sign = isNet ? (value < 0 ? "-" : value > 0 ? "+" : "") : ""
            return (
              <div key={label} className="text-center p-2 rounded-2xl" style={{ background: "var(--glass-fill)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-tertiary)" }}>{icon} {label}</p>
                <p className="amount text-[14px] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {sign}{formatted}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hashtag Summary */`;

stats = stats.replace(oldPeriodSummaryGridRegex, newPeriodSummaryGrid);

fs.writeFileSync("src/pages/StatisticsPage.tsx", stats, "utf8");
console.log("Updated StatisticsPage.tsx dynamic health score & clean period summary");
