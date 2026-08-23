const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

content = content.replace(
  /<div className="grid grid-cols-4 gap-2\.5 max-h-\[50vh\] overflow-y-auto pr-1">/g,
  '<div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">'
);

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("Fixed SettingsPage grid cols");
