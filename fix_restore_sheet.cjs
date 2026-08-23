const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

const cleanModals = `      {/* More Categories Glass Sheet */}
      <BottomSheet isOpen={moreCatOpen} onClose={() => setMoreCatOpen(false)}>
        <div className="p-5 pb-12">
          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Category</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
            {categories.map(cat => {
              const isSelected = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setMoreCatOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* More Accounts Glass Sheet */}
      <BottomSheet isOpen={moreWalletOpen} onClose={() => setMoreWalletOpen(false)}>
        <div className="p-5 pb-12">
          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Account</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
            {wallets.map(w => {
              const isSelected = (walletTarget === "from" ? walletId : toWalletId) === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (walletTarget === "from") setWalletId(w.id)
                    else setToWalletId(w.id)
                    setMoreWalletOpen(false)
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--glass-border)",
                    boxShadow: isSelected ? "0 0 0 1px rgba(255, 255, 255, 0.15)" : "none"
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--glass-fill)" }}>
                    <IconRenderer icon={w.icon} size="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-bold truncate">
                    {w.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Date Picker Sheet */}
      <BottomSheet isOpen={dateOpen} onClose={() => setDateOpen(false)}>
        <div className="p-5 pb-10 flex flex-col items-center">
          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Date</h3>
          <GlassDatePicker date={date} onChange={(d) => { setDate(d); setDateOpen(false) }} />
        </div>
      </BottomSheet>`;

// Replace from action button bar closing to timeOpen
const matchTarget = /<\/div>\s*<\/div>\s*<\/div>\s*<\/BottomSheet>\s*\{\/\* Glass Time Picker Sheet \*\//;
content = content.replace(matchTarget, `        </div>\n      </div>\n\n${cleanModals}\n\n      {/* Glass Time Picker Sheet */}`);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Restored and updated TransactionSheet modals with 68vh and pb-12");
