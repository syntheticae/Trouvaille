const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

// Add state for Category and Wallet IDs
content = content.replace(
  'const [shortcutAmount, setShortcutAmount] = useState("")',
  'const [shortcutAmount, setShortcutAmount] = useState("")\n  const [shortcutCategoryId, setShortcutCategoryId] = useState("")\n  const [shortcutWalletId, setShortcutWalletId] = useState("")\n  const [shortcutType, setShortcutType] = useState<"expense" | "income">("expense")'
);

// We need to fetch categories and wallets inside the component. 
// Luckily, `const { data: categories = [] } = useCategories()` is already at the top of SettingsPage.tsx
// So is `wallets`.

const newAddShortcutSheet = `
      {/* Add Shortcut Sheet */}
      <BottomSheet isOpen={addShortcutOpen} onClose={() => setAddShortcutOpen(false)}>
        <div className="p-5 pb-10 space-y-4 max-h-[85vh] overflow-y-auto">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Shortcut</h3>
          
          <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["expense", "income"] as const).map(t => (
              <button key={t} onClick={() => setShortcutType(t)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: shortcutType === t ? "var(--accent)" : "transparent", color: shortcutType === t ? "var(--accent-ink)" : "var(--text-tertiary)" }}>
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Shortcut Title & Emoji</label>
            <input type="text" value={shortcutTitle} onChange={e => setShortcutTitle(e.target.value)} placeholder="e.g. ☕ Coffee"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[15px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Nominal Amount (IDR)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={shortcutAmount ? formatRupiah(Number(shortcutAmount)) : ""}
              onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setShortcutAmount(raw) }} placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Category</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.filter(c => c.type === shortcutType).map(cat => (
                <button key={cat.id} onClick={() => setShortcutCategoryId(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 transition-transform active:scale-95"
                  style={{
                    background: shortcutCategoryId === cat.id ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: shortcutCategoryId === cat.id ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)"
                  }}>
                  <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Account / Wallet</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {wallets.map(w => (
                <button key={w.id} onClick={() => setShortcutWalletId(w.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 transition-transform active:scale-95"
                  style={{
                    background: shortcutWalletId === w.id ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: shortcutWalletId === w.id ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)"
                  }}>
                  <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{w.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => {
            if (!shortcutTitle || !shortcutAmount || !shortcutCategoryId || !shortcutWalletId) {
              showToast("Please fill all fields", "delete", () => {});
              return;
            }
            saveShortcut({
              id: Date.now().toString(),
              title: shortcutTitle,
              amount: Number(shortcutAmount),
              type: shortcutType,
              note: shortcutTitle.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim(), // Remove emojis from note if any
              category_id: shortcutCategoryId,
              wallet_id: shortcutWalletId
            });
            setAddShortcutOpen(false);
            setShortcutTitle("");
            setShortcutAmount("");
            setShortcutCategoryId("");
            setShortcutWalletId("");
            showToast("Shortcut added", "add", () => {});
          }} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg mt-2"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Shortcut</button>
        </div>
      </BottomSheet>
`;

const regex = /\{\/\* Add Shortcut Sheet \*\/\}[\s\S]*?<\/BottomSheet>/;
content = content.replace(regex, newAddShortcutSheet);

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("Updated Add Shortcut Sheet");
