const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");

content = content.replace(/â‡„/g, "⇄");
content = content.replace(/Â·/g, "·");

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Cleaned TransactionsPage characters");
