const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

content = content.replace(
  'import { useAuth } from "../contexts/AuthContext"',
  'import { useAuth } from "../contexts/AuthContext"\nimport { useCategories } from "../hooks/useCategories"'
);

content = content.replace(
  'const { data: allTxs = [], isLoading } = useAllTransactions()',
  'const { data: allTxs = [], isLoading } = useAllTransactions()\n  const { data: categories = [] } = useCategories()'
);

content = content.replace(
  /tx\.categories\?\.name \|\| "Transfer"/g,
  'tx.categories?.name || categories.find(c => c.id === tx.category_id)?.name || "Transfer"'
);

content = content.replace(
  /tx\.categories\?\.emoji \|\| "\/icons\/lainnya\.png"/g,
  'tx.categories?.emoji || categories.find(c => c.id === tx.category_id)?.emoji || "/icons/lainnya.png"'
);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Fixed HomePage categories");
