const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");
content = content.replace(
  'const { data: allTxs = [], isLoading } = useAllTransactions()',
  'const { data: allTxs = [], isLoading } = useAllTransactions()\n  const { data: categories = [] } = useCategories()'
);

content = content.replace(
  /let catName = tx\.categories\?\.name\s*let catEmoji = tx\.categories\?\.emoji/g,
  `let catName = tx.categories?.name
    let catEmoji = tx.categories?.emoji
    if (!catName || !catEmoji) {
      const fallbackCat = categories.find(c => c.id === tx.category_id)
      if (fallbackCat) {
        catName = fallbackCat.name
        catEmoji = fallbackCat.emoji
      }
    }`
);
fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Fixed TransactionsPage");
