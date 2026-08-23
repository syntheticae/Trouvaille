const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const replacements = [
  { from: /Â·/g, to: "·" },
  { from: /â€”/g, to: "—" },
  { from: /â†‘/g, to: "↑" },
  { from: /â†“/g, to: "↓" },
  { from: /âœ“/g, to: "✓" },
  { from: /â‡„/g, to: "⇄" },
  { from: /Â/g, to: "" }, // Any remaining rogue Â
];

let cleanedCount = 0;
walkDir("src", (filePath) => {
  if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts") && !filePath.endsWith(".json") && !filePath.endsWith(".html") && !filePath.endsWith(".css")) return;
  let content = fs.readFileSync(filePath, "utf8");
  let original = content;
  
  for (const r of replacements) {
    content = content.replace(r.from, r.to);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Cleaned: ${filePath}`);
    cleanedCount++;
  }
});

console.log(`Total files cleaned: ${cleanedCount}`);
