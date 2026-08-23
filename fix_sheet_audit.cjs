const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

// 1. Helper getTop3
if (!content.includes("function getTop3Slots")) {
  const helper = `
function getTop3Slots<T extends { id: string }>(items: T[], selectedId: string | null): T[] {
  if (items.length <= 3) return items
  const idx = items.findIndex(item => item.id === selectedId)
  if (idx === -1 || idx < 3) {
    return items.slice(0, 3)
  }
  return [items[0], items[1], items[idx]]
}
`;
  content = helper + "\n" + content;
}

// 2. Fix topCategories useMemo
content = content.replace(
  /const topCategories = useMemo\(\(\) => \{[\s\S]*?return list\.slice\(0, 3\)\n  \}, \[categories, categoryId\]\)/,
  'const topCategories = useMemo(() => getTop3Slots(categories, categoryId), [categories, categoryId])'
);

// 3. Fix renderWalletRow top3
content = content.replace(
  'const top3 = wallets.slice(0, 3)',
  'const top3 = getTop3Slots(wallets, selectedId)'
);

// 4. Move Action Bar inside the inner padded div
const oldEndBlockRegex = /<\/div>\s*<\/div>\s*\{\/\* Floating Glass Action Bar \*\/\}[\s\S]*?<\/div>\s*\{\/\* More Categories Glass Sheet \*\/\}/;

const newEndBlock = `        </div>

        {/* Action Button Bar */}
        <div className="flex gap-2 mt-3 mb-2">
          {transaction && (
            <button
              onClick={handleDelete}
              className="w-[52px] rounded-[20px] flex items-center justify-center active:scale-95 shrink-0"
              style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || Number(amount) <= 0}
            className="flex-1 font-extrabold text-[15px] rounded-[20px] py-3.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
              border: "1px solid var(--dock-border)"
            }}
          >
            {isSaving ? "Menyimpan..." : (transaction ? "Update Transaction" : "Save Transaction")}
          </button>
        </div>
      </div>

      {/* More Categories Glass Sheet */}`;

content = content.replace(oldEndBlockRegex, newEndBlock);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("TransactionSheet audited and fixed successfully");
