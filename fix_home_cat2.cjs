const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

content = content.replace(
  'const { data: allTxs = [] } = useAllTransactions()',
  'const { data: allTxs = [] } = useAllTransactions()\n  const { data: categories = [] } = useCategories()'
);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Fixed HomePage categories properly");
