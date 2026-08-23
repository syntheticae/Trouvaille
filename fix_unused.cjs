const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8");

content = content.replace('  const spendingRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0\n', '');

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Removed unused spendingRatio in StatisticsPage.tsx");
