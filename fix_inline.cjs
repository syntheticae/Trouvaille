const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");

content = content.replace(
  /tx\.categories\?\.name \|\| "General"/g,
  'tx.categories?.name || categories.find(c => c.id === tx.category_id)?.name || "General"'
);

content = content.replace(
  /tx\.categories\?\.emoji \|\| "\/icons\/lainnya\.png"/g,
  'tx.categories?.emoji || categories.find(c => c.id === tx.category_id)?.emoji || "/icons/lainnya.png"'
);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Fixed unused categories in TransactionsPage");
