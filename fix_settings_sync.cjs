const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

// Imports
if (!content.includes("syncAllTransactionsWithFamfina")) {
  content = 'import { syncAllTransactionsWithFamfina } from "../lib/famfinaResolver"\n' + content;
}

// State
content = content.replace(
  'const [shortcutsOpen, setShortcutsOpen] = useState(false)',
  'const [shortcutsOpen, setShortcutsOpen] = useState(false)\n  const [isSyncingFamfina, setIsSyncingFamfina] = useState(false)'
);

// Modals
content = content.replace(
  '<BottomSheet isOpen={shortcutMoreCatOpen} onClose={() => setShortcutMoreCatOpen(false)}>\n        <div className="p-5 pb-32">\n          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Category</h3>\n          <div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">',
  '<BottomSheet isOpen={shortcutMoreCatOpen} onClose={() => setShortcutMoreCatOpen(false)}>\n        <div className="p-5 pb-12">\n          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Category</h3>\n          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">'
);

content = content.replace(
  '<BottomSheet isOpen={shortcutMoreWalletOpen} onClose={() => setShortcutMoreWalletOpen(false)}>\n        <div className="p-5 pb-32">\n          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Account</h3>\n          <div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">',
  '<BottomSheet isOpen={shortcutMoreWalletOpen} onClose={() => setShortcutMoreWalletOpen(false)}>\n        <div className="p-5 pb-12">\n          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Account</h3>\n          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">'
);

// Data & Storage Sync Card
const syncCard = `          {/* Re-link Wallets & Accounts (Famfina Sync) */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <RotateCcw size={16} className={isSyncingFamfina ? "animate-spin" : ""} />
              </div>
              <div>
                <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Sinkronkan Akun Transaksi</span>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Hubungkan 887 transaksi ke akun aslinya</p>
              </div>
            </div>
            <button
              disabled={isSyncingFamfina}
              onClick={async () => {
                try {
                  setIsSyncingFamfina(true)
                  showToast("Menyinkronkan akun transaksi...", "update", () => {})
                  const res = await syncAllTransactionsWithFamfina()
                  showToast(\`Sukses! \${res.updated} transaksi terhubung ke akun masing-masing\`, "add", () => {})
                  window.location.reload()
                } catch (e: any) {
                  showToast("Gagal sinkronisasi: " + (e.message || "Error"), "delete", () => {})
                } finally {
                  setIsSyncingFamfina(false)
                }
              }}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {isSyncingFamfina ? "Syncing..." : "Sinkronkan"}
            </button>
          </div>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />\n`;

content = content.replace(
  '          {/* Offline Storage */}\n          <div className="flex items-center justify-between p-4">',
  syncCard + '          {/* Offline Storage */}\n          <div className="flex items-center justify-between p-4">'
);

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("SettingsPage updated with Famfina Sync card");
