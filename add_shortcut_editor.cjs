const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

// Add state for Add Shortcut
content = content.replace(
  'const [shortcutsOpen, setShortcutsOpen] = useState(false)',
  'const [shortcutsOpen, setShortcutsOpen] = useState(false)\n  const [addShortcutOpen, setAddShortcutOpen] = useState(false)\n  const [shortcutTitle, setShortcutTitle] = useState("")\n  const [shortcutAmount, setShortcutAmount] = useState("")'
);

// Import saveShortcut
content = content.replace(
  'const { shortcuts, deleteShortcut } = useShortcuts()',
  'const { shortcuts, saveShortcut, deleteShortcut } = useShortcuts()'
);

// Modify Shortcuts Modal header to add a Plus button
content = content.replace(
  '<h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Quick-Add Shortcuts</h3>',
  '<div className="flex justify-between items-center w-full"><h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Quick-Add Shortcuts</h3><button onClick={() => { setShortcutsOpen(false); setTimeout(() => setAddShortcutOpen(true), 300) }} className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Plus size={16} /></button></div>'
);

// Append Add Shortcut Sheet
const addShortcutSheet = `
      {/* Add Shortcut Sheet */}
      <BottomSheet isOpen={addShortcutOpen} onClose={() => setAddShortcutOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Shortcut</h3>
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
          <button onClick={() => {
            if (!shortcutTitle || !shortcutAmount) return;
            saveShortcut({
              id: Date.now().toString(),
              title: shortcutTitle,
              amount: Number(shortcutAmount),
              type: "expense",
              note: shortcutTitle,
              category_id: "",
              wallet_id: ""
            });
            setAddShortcutOpen(false);
            setShortcutTitle("");
            setShortcutAmount("");
            showToast("Shortcut added", "add", () => {});
          }} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg mt-2"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Shortcut</button>
        </div>
      </BottomSheet>
    </div>
  )
}
`;

content = content.replace('    </div>\n  )\n}', addShortcutSheet);

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("Added Shortcut Editor");
