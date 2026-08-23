const fs = require("fs");

// ==========================================
// 1. UPDATE StatisticsPage.tsx
// ==========================================
let stats = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Fix rangeTxs calculation for Month
stats = stats.replace(
  'start = startOfMonth(now)\n      end = endOfMonth(now)',
  'const targetMonth = subMonths(now, monthOffset)\n      start = startOfMonth(targetMonth)\n      end = endOfMonth(targetMonth)'
);

// Fix trendData calculation for Month
const oldTrendMonthCode = `      // 5 Weeks of the current month
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()`;

const newTrendMonthCode = `      // 5 Weeks of the selected month
      const targetMonthDate = subMonths(now, monthOffset)
      const currentYear = targetMonthDate.getFullYear()
      const currentMonth = targetMonthDate.getMonth()`;

stats = stats.replace(oldTrendMonthCode, newTrendMonthCode);

// Fix Year calculation in trendData to respect monthOffset if relevant, or keep currentYear
// And ensure trendData deps include monthOffset
stats = stats.replace(
  '}, [allTxs, range])',
  '}, [allTxs, range, monthOffset])'
);

fs.writeFileSync("src/pages/StatisticsPage.tsx", stats, "utf8");
console.log("Updated StatisticsPage.tsx with accurate Month synchronization");


// ==========================================
// 2. UPDATE TransactionsPage.tsx
// ==========================================
let txPage = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Add accountPickerOpen state
if (!txPage.includes("accountPickerOpen")) {
  txPage = txPage.replace(
    'const [monthPickerOpen, setMonthPickerOpen] = useState(false)',
    'const [monthPickerOpen, setMonthPickerOpen] = useState(false)\n  const [accountPickerOpen, setAccountPickerOpen] = useState(false)'
  );
}

// Replace header trigger with side-by-side / clean stacked buttons
const oldMonthTrigger = `          {/* Month Selector Trigger */}
          <button
            onClick={() => setMonthPickerOpen(true)}
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
          </button>`;

const newDualTriggers = `          {/* Month & Account Dropdown Triggers */}
          <div className="flex flex-col gap-1.5 items-end">
            <button
              onClick={() => { setMonthPickerOpen(true); triggerHaptic("light"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl active:scale-95 transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "0 2px 8px var(--shadow-strength)"
              }}
            >
              <Calendar size={13} style={{ color: "var(--text-secondary)" }} />
              <span className="text-[11px] font-extrabold max-w-[85px] truncate" style={{ color: "var(--text-primary)" }}>
                {selectedMonthLabel}
              </span>
              <ChevronDown size={12} style={{ color: "var(--text-tertiary)" }} />
            </button>

            <button
              onClick={() => { setAccountPickerOpen(true); triggerHaptic("light"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl active:scale-95 transition-all"
              style={{
                background: selectedWalletName ? "var(--accent)" : "var(--bg-elevated)",
                border: selectedWalletName ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                boxShadow: "0 2px 8px var(--shadow-strength)"
              }}
            >
              <Wallet size={13} style={{ color: selectedWalletName ? "var(--accent-ink)" : "var(--text-secondary)" }} />
              <span className="text-[11px] font-extrabold max-w-[85px] truncate" style={{ color: selectedWalletName ? "var(--accent-ink)" : "var(--text-primary)" }}>
                {selectedWalletName || "All Accounts"}
              </span>
              <ChevronDown size={12} style={{ color: selectedWalletName ? "var(--accent-ink)" : "var(--text-tertiary)" }} />
            </button>
          </div>`;

txPage = txPage.replace(oldMonthTrigger, newDualTriggers);

// Remove the horizontal cut-off scrollable pills row
const oldScrollablePillsRegex = /\{\/\* Horizontal Account Filter Pills \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* ====== TRANSACTION LIST ======\*\//;
txPage = txPage.replace(
  oldScrollablePillsRegex,
  '</div>\n      </div>\n\n      {/* ====== TRANSACTION LIST ======'
);

// Add Account Picker Bottom Sheet at the bottom before closing tag
const accountSheetModal = `      {/* Account Picker Glass Sheet */}
      <BottomSheet isOpen={accountPickerOpen} onClose={() => setAccountPickerOpen(false)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Filter by Account</h3>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Tampilkan transaksi dari akun tertentu</p>
            </div>
            {selectedWalletName && (
              <button
                onClick={() => { setSelectedWalletName(null); setAccountPickerOpen(false); triggerHaptic("light"); }}
                className="text-[12px] font-bold px-3 py-1 rounded-full"
                style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {/* All Accounts Option */}
            <button
              onClick={() => { setSelectedWalletName(null); setAccountPickerOpen(false); triggerHaptic("light"); }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
              style={{
                background: selectedWalletName === null ? "var(--glass-fill-strong)" : "transparent",
                color: "var(--text-primary)",
                border: selectedWalletName === null ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: selectedWalletName === null ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <Wallet size={18} style={{ color: "var(--text-primary)" }} />
              </div>
              <span className="text-[11px] font-bold text-center line-clamp-1">
                All Accounts
              </span>
            </button>

            {/* Wallets */}
            {wallets.map(w => {
              const isSelected = selectedWalletName === w.name
              return (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWalletName(w.name); setAccountPickerOpen(false); triggerHaptic("light"); }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {w.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  )`;

txPage = txPage.replace(/\s*<\/div>\s*\)\s*\}\s*$/, `\n\n${accountSheetModal}`);

fs.writeFileSync("src/pages/TransactionsPage.tsx", txPage, "utf8");
console.log("Updated TransactionsPage.tsx with Account Picker Dropdown Bottom Sheet");
