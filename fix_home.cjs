const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

// 1. Heatmap Amount
const oldHeatmapButton = /return \([\s\S]*?<div[\s\S]*?className="w-8 h-8 rounded-xl flex items-center justify-center text-\[12px\] font-extrabold\s*transition-all"[\s\S]*?style=\{\{[\s\S]*?\}\}[\s\S]*?>\s*\{format\(d, "d"\)\}\s*<\/div>\s*<\/button>\s*\)/g;

content = content.replace(oldHeatmapButton, (match) => {
  return match
    .replace('className="flex items-center justify-center rounded-xl', 'className="flex flex-col items-center justify-center rounded-xl')
    .replace('</div>\n                  </button>', '</div>\n                  {hasTx && (\n                    <span className="text-[9px] mt-1 font-bold tracking-tighter" style={{ color: isSurplus ? "var(--text-primary)" : "var(--text-tertiary)" }}>\n                      {isDeficit ? `-${Math.abs(Math.round(net/1000))}k` : `+${Math.round(net/1000)}k`}\n                    </span>\n                  )}\n                  </button>');
});

// 2. Move Upcoming Bills
// Find the whole upcoming bills section
const upcomingRegex = /\{\/\* 6\. UPCOMING BILLS[^\}]*?Upcoming Bills[\s\S]*?<\/section>\s*\)\}/;
const match = content.match(upcomingRegex);
if (match) {
  content = content.replace(match[0], "");
  // Insert it after Heatmap Calendar
  // Find closing of Heatmap Calendar section
  const heatmapEndRegex = /<\/section>\s*\{\/\* Selected Date Transactions \*\/\}/;
  content = content.replace(heatmapEndRegex, `</section>\n\n        ${match[0]}\n\n        {/* Selected Date Transactions */}`);
}

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Fixed HomePage layout");
