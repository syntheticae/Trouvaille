const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

// Move it properly
const upcomingRegex = /\{\/\* 6\. UPCOMING BILLS[^\n]*\n\s*\{upcomingBills[\s\S]*?<\/section>\s*\)\}/;
const match = content.match(upcomingRegex);
if (match) {
  content = content.replace(match[0], "");
  
  const heatmapEndRegex = /<\/section>\s*\{\/\* Day Transactions Sheet \*\/\}/;
  content = content.replace(heatmapEndRegex, `</section>\n\n        ${match[0]}\n\n        {/* Day Transactions Sheet */}`);
}

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Moved Upcoming Bills");
