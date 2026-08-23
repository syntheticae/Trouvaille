const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

content = content.replace('{/* Glass Time Picker Sheet */}}', '{/* Glass Time Picker Sheet */}');

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Fixed typo in TransactionSheet.tsx");
