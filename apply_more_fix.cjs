const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

// Add state for "More..." bottom sheets
content = content.replace(
  'const [shortcutType, setShortcutType] = useState<"expense" | "income">("expense")',
  'const [shortcutType, setShortcutType] = useState<"expense" | "income">("expense")\n  const [shortcutMoreCatOpen, setShortcutMoreCatOpen] = useState(false)\n  const [shortcutMoreWalletOpen, setShortcutMoreWalletOpen] = useState(false)'
);

// We will replace the entire Category and Wallet block in Add Shortcut sheet
const oldCategoryWalletRegex = /<div>\s*<label className="text-\[11px\] font-bold uppercase tracking-wider mb-1\.5 block px-1" style=\{\{ color: "var\(--text-tertiary\)" \}\}>Category<\/label>[\s\S]*?(?=<button onClick=\{\(\) => \{)/;

const newCategoryWalletUI = `
          <div>
            <div className="flex justify-between items-end mb-1.5 px-1">
              <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>Category</label>
              <button onClick={() => setShortcutMoreCatOpen(true)} className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95" style={{ color: "var(--text-secondary)" }}>
                More <MoreHorizontal size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-1">
              {categories.filter(c => c.type === shortcutType).slice(0, 3).map(cat => (
                <button key={cat.id} onClick={() => setShortcutCategoryId(cat.id)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: shortcutCategoryId === cat.id ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: shortcutCategoryId === cat.id ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)"
                  }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: shortcutCategoryId === cat.id ? "transparent" : "var(--glass-fill)" }}>
                    <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold truncate leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5 px-1">
              <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>Account / Wallet</label>
              <button onClick={() => setShortcutMoreWalletOpen(true)} className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95" style={{ color: "var(--text-secondary)" }}>
                More <MoreHorizontal size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-1">
              {wallets.slice(0, 3).map(w => (
                <button key={w.id} onClick={() => setShortcutWalletId(w.id)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: shortcutWalletId === w.id ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: shortcutWalletId === w.id ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)"
                  }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: shortcutWalletId === w.id ? "transparent" : "var(--glass-fill)" }}>
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold truncate leading-tight">{w.name}</span>
                </button>
              ))}
            </div>
          </div>
          
`;

content = content.replace(oldCategoryWalletRegex, newCategoryWalletUI);

// Append the two BottomSheets right after the Add Shortcut Sheet closes
const moreBottomSheets = `
      {/* Shortcut More Categories Sheet */}
      <BottomSheet isOpen={shortcutMoreCatOpen} onClose={() => setShortcutMoreCatOpen(false)}>
        <div className="p-5 pb-32">
          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Category</h3>
          <div className="grid grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {categories.filter(c => c.type === shortcutType).map(cat => {
              const isSelected = shortcutCategoryId === cat.id
              return (
                <button key={cat.id} onClick={() => { setShortcutCategoryId(cat.id); setShortcutMoreCatOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Shortcut More Wallets Sheet */}
      <BottomSheet isOpen={shortcutMoreWalletOpen} onClose={() => setShortcutMoreWalletOpen(false)}>
        <div className="p-5 pb-32">
          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Account</h3>
          <div className="grid grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {wallets.map(w => {
              const isSelected = shortcutWalletId === w.id
              return (
                <button key={w.id} onClick={() => { setShortcutWalletId(w.id); setShortcutMoreWalletOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">{w.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

    </div>
`;
content = content.replace('    </div>\n  )\n}', moreBottomSheets + '    </div>\n  )\n}');

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("Updated Shortcut Editor with More Button");
