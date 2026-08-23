const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");
content = content.replace(
  'import { useWallets } from "../hooks/useWallets"`nimport { useCategories } from "../hooks/useCategories"',
  'import { useWallets } from "../hooks/useWallets"\nimport { useCategories } from "../hooks/useCategories"'
);
fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Fixed TransactionsPage import");
