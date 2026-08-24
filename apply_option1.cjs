const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Replace Header through Tabs and remove the horizontal pills entirely
const oldHeaderToTxsRegex = /\{\/\* ====== HEADER ====== \*\/\}[\s\S]*?\{\/\* ====== TRANSACTION LIST ====== \*\//;

const newOption1Header = `{/* ====== HEADER ====== */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
              {filter === "income" ? "Weekly Inflow" : filter === "expense" ? "Weekly Outflow" : filter === "transfer" ? "Weekly Transfers" : "Weekly Activity"}
            </p>
            <p className="text-[32px] font-extrabold tracking-tight leading-tight amount" style={{ color: "var(--text-primary)" }}>
              {formatRupiah(totalPeriodAmount)}
            </p>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>Past 7 days volume</p>
          </div>

          {/* Month Selector Trigger */}
          <button
            onClick={() => { setMonthPickerOpen(true); triggerHaptic("light"); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl active:scale-95 transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)"
            }}
          >
            <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
            <span className="text-[12px] font-extrabold" style={{ color: "var(--text-primary)" }}>
              {selectedMonthLabel}
            </span>
            <ChevronDown size={13} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* 7-DAY RADIANT GRADIENT BAR CHART */}
        <div className="h-[95px] w-full mb-3.5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicWeeklyData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="activeBarGradDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                  <stop offset="100%" stopColor="#D4D4D8" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="inactiveBarGradDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.18} />
                </linearGradient>
                <linearGradient id="activeBarGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#18181B" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3F3F46" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="inactiveBarGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#18181B" stopOpacity={0.50} />
                  <stop offset="100%" stopColor="#18181B" stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <Tooltip content={<GlassTooltip />} cursor={{ fill: "transparent" }} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--text-tertiary)", fontSize: 10, fontWeight: 700 }}
              />
              <YAxis hide domain={[0, maxBar * 1.15]} />
              <Bar dataKey="activeValue" radius={[6, 6, 6, 6]} maxBarSize={30}>
                {dynamicWeeklyData.map((_, index) => {
                  const isCurrentDay = index === dynamicWeeklyData.length - 1
                  const fillId = isDark
                    ? (isCurrentDay ? "url(#activeBarGradDark)" : "url(#inactiveBarGradDark)")
                    : (isCurrentDay ? "url(#activeBarGradLight)" : "url(#inactiveBarGradLight)")

                  return (
                    <Cell
                      key={\`cell-\${index}\`}
                      fill={fillId}
                      style={{ transition: "fill 0.3s ease" }}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Full-Width Search Bar with Inline Account Filter */}
        <div
          className="flex items-center pl-3.5 pr-2 py-1.5 rounded-2xl mb-3 glass-surface"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Search size={16} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search note, category, wallet..."
            className="w-full bg-transparent pl-2.5 pr-2 py-1 text-[13px] outline-none font-semibold"
            style={{ color: "var(--text-primary)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="p-1 rounded-full shrink-0 mr-1" style={{ color: "var(--text-tertiary)" }}>
              <X size={14} />
            </button>
          )}

          {/* Inline Account Filter Pill */}
          <div className="h-4 w-[1px] bg-white/10 shrink-0 mx-1" />
          <button
            onClick={() => { setAccountPickerOpen(true); triggerHaptic("light"); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl active:scale-95 transition-all shrink-0"
            style={{
              background: selectedWalletName ? "var(--accent)" : "var(--glass-fill)",
              color: selectedWalletName ? "var(--accent-ink)" : "var(--text-secondary)",
              border: selectedWalletName ? "1px solid var(--accent)" : "1px solid var(--glass-border)"
            }}
            title="Filter by Account"
          >
            <Wallet size={13} />
            <span className="text-[11px] font-extrabold max-w-[65px] truncate">
              {selectedWalletName || "Account"}
            </span>
            <ChevronDown size={11} className="opacity-70" />
          </button>
        </div>

        {/* Unified Clean Filter Tabs */}
        <div className="flex p-1 rounded-full glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {filterTabs.map(tab => {
            const isSelected = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); triggerHaptic("light"); }}
                className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--accent-ink)" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ====== TRANSACTION LIST ====== */`;

content = content.replace(oldHeaderToTxsRegex, newOption1Header);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Successfully implemented Option 1 in TransactionsPage.tsx");
