const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8");

content = content.replace(/filteredTxs/g, "rangeTxs");

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Replaced filteredTxs with rangeTxs");
