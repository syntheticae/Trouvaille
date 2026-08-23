const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");

// 1. Imports
if (!content.includes("triggerHaptic")) {
  content = 'import { triggerHaptic } from "../lib/haptics"\n' + content;
}

// 2. State
if (!content.includes("selectedWalletName")) {
  content = content.replace(
    'const [filter, setFilter] = useState<FilterType>("all")',
    'const [filter, setFilter] = useState<FilterType>("all")\n  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)'
  );
}

// 3. Filtered logic
const oldSearchFilter = '    if (debouncedSearch) {';
const newAccountFilter = `    if (selectedWalletName) {
      const target = selectedWalletName.toLowerCase()
      txs = txs.filter(t => {
        const { from, to } = resolveWalletNames(t)
        return from.toLowerCase() === target || (t.type === "transfer" && to.toLowerCase() === target)
      })
    }\n\n    if (debouncedSearch) {`;

content = content.replace(oldSearchFilter, newAccountFilter);
content = content.replace(
  '}, [allTxs, filter, debouncedSearch, timeRange, selectedCustomMonth, showArchived, wallets])',
  '}, [allTxs, filter, selectedWalletName, debouncedSearch, timeRange, selectedCustomMonth, showArchived, wallets])'
);

// 4. Render Account Filter Pills right below the Type Filter Tabs
const oldTabsEnd = `        {/* Unified Clean Filter Tabs */}
        <div className="flex p-1 rounded-full glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {filterTabs.map(tab => {
            const isSelected = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
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
        </div>`;

const newTabsAndAccountRow = `        {/* Unified Clean Filter Tabs */}
        <div className="flex p-1 rounded-full glass-surface mb-2.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
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

        {/* Horizontal Account Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          <button
            onClick={() => { setSelectedWalletName(null); triggerHaptic("light"); }}
            className="px-3 py-1 rounded-full text-[11px] font-extrabold shrink-0 transition-all active:scale-95"
            style={{
              background: selectedWalletName === null ? "var(--accent)" : "var(--bg-elevated)",
              color: selectedWalletName === null ? "var(--accent-ink)" : "var(--text-secondary)",
              border: selectedWalletName === null ? "1px solid var(--accent)" : "1px solid var(--glass-border)"
            }}
          >
            All Accounts
          </button>
          {wallets.map(w => {
            const isSelected = selectedWalletName === w.name
            return (
              <button
                key={w.id}
                onClick={() => {
                  setSelectedWalletName(isSelected ? null : w.name);
                  triggerHaptic("light");
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1.5 active:scale-95"
                style={{
                  background: isSelected ? "var(--accent)" : "var(--bg-elevated)",
                  color: isSelected ? "var(--accent-ink)" : "var(--text-primary)",
                  border: isSelected ? "1px solid var(--accent)" : "1px solid var(--glass-border)"
                }}
              >
                <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                  <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                </div>
                <span>{w.name}</span>
              </button>
            )
          })}
        </div>`;

content = content.replace(oldTabsEnd, newTabsAndAccountRow);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Updated TransactionsPage.tsx with Account Filter & Haptics");
