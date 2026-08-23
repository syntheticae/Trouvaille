const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");

if (!content.trim().endsWith("}")) {
  content = content.trim() + "\n}\n";
  fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
  console.log("Appended closing brace to TransactionsPage.tsx");
}
