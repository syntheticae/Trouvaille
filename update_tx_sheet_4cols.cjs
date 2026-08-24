const fs = require("fs");

let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8").replace(/\r\n/g, "\n");

const oldSheetsRegex = /\{\/\* More Categories Glass Sheet \*\/\}[\s\S]*?\{\/\* Date Picker Sheet \*\//;

const newSheetsCode = `{/* More Categories Glass Sheet (4-Columns Fullscreen Layout) */}
      <BottomSheet isOpen={moreCatOpen} onClose={() => setMoreCatOpen(false)}>
        <div className="p-5 pb-16 flex flex-col h-[85vh] max-h-[85vh]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="font-extrabold text-[18px] leading-tight" style={{ color: "var(--text-primary)" }}>
                Pilih Kategori
              </h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {categories.length} kategori tersedia
              </p>
            </div>
            <button
              onClick={() => setMoreCatOpen(false)}
              className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-3 overflow-y-auto pr-1 flex-1 pb-16">
            {categories.map(cat => {
              const isSelected = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setMoreCatOpen(false); triggerHaptic("light"); }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl active:scale-95 transition-all text-center"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--glass-border)",
                    boxShadow: isSelected ? "0 4px 16px rgba(255, 255, 255, 0.08)" : "none"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                  </div>
                  <span className="text-[10.5px] font-bold text-center line-clamp-1 truncate w-full px-0.5">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* More Accounts Glass Sheet (Tall 3-Column Layout with pb-16) */}
      <BottomSheet isOpen={moreWalletOpen} onClose={() => setMoreWalletOpen(false)}>
        <div className="p-5 pb-16 flex flex-col h-[85vh] max-h-[85vh]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="font-extrabold text-[18px] leading-tight" style={{ color: "var(--text-primary)" }}>
                Pilih Akun / Dompet
              </h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {walletTarget === "from" ? "Akun Asal" : "Akun Tujuan"} · {wallets.length} akun
              </p>
            </div>
            <button
              onClick={() => setMoreWalletOpen(false)}
              className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 overflow-y-auto pr-1 flex-1 pb-16">
            {wallets.map(w => {
              const isSelected = (walletTarget === "from" ? walletId : toWalletId) === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (walletTarget === "from") setWalletId(w.id)
                    else setToWalletId(w.id)
                    setMoreWalletOpen(false)
                    triggerHaptic("light")
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl active:scale-95 transition-all text-center"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--glass-border)",
                    boxShadow: isSelected ? "0 4px 16px rgba(255, 255, 255, 0.08)" : "none"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={w.icon} size="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-center">
                    {w.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Date Picker Sheet */`;

content = content.replace(oldSheetsRegex, newSheetsCode);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Updated TransactionSheet.tsx with 4-column fullscreen category picker");
