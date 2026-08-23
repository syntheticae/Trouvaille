const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

// 1. Remove topCategories auto-sort
const oldTopCat = /const topCategories = useMemo\(\(\) => \{[\s\S]*?return list\.slice\(0, 3\)\n  \}, \[categories, categoryId\]\)/;
const newTopCat = `const topCategories = useMemo(() => {
    return categories.slice(0, 3)
  }, [categories])`;
content = content.replace(oldTopCat, newTopCat);

// 2. Remove renderWalletRow auto-sort
const oldRenderWallet = /const renderWalletRow = \(selectedId: string \| null, onSelect: \(id: string\) => void, label: string, isTo = false\) => \{[\s\S]*?const top3 = list\.slice\(0, 3\)/;
const newRenderWallet = `const renderWalletRow = (selectedId: string | null, onSelect: (id: string) => void, label: string, isTo = false) => {
    const top3 = wallets.slice(0, 3)`;
content = content.replace(oldRenderWallet, newRenderWallet);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Fixed auto-sorting UX");
