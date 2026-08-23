const fs = require("fs");
let content = fs.readFileSync("src/hooks/useShortcuts.ts", "utf8");

content = content.replace('title: "? Coffee"', 'title: "☕ Coffee"');
content = content.replace('title: "? Gas"', 'title: "⛽ Gas"');
content = content.replace('title: "??? Parking"', 'title: "🅿️ Parking"');

fs.writeFileSync("src/hooks/useShortcuts.ts", content, "utf8");
console.log("Fixed useShortcuts emojis");
