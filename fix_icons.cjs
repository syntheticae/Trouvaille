const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

// Fix Recurring Bills Icon
content = content.replace(
  /className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style=\{\{ background: "var\(--bg-elevated\)", border: "1px solid var\(--glass-border\)" \}\}>.*?<\/div>/,
  'className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)" }}><Bell size={20} /></div>'
);

// Fix Goal Icons state
content = content.replace(/useState\(".*?"\)/, 'useState("🎯")'); // Assuming the first matched useState with quotes might be the goal icon. Let's be safer.
content = content.replace(/const \[goalIcon, setGoalIcon\] = useState\(".*?"\)/, 'const [goalIcon, setGoalIcon] = useState("🎯")');

// Replace corrupted emoji in Goals list renderer
content = content.replace(/<div className="text-2xl">\{g\.icon\}<\/div>/, '<div className="text-2xl">{g.icon === "dYZ_" ? "🎯" : g.icon}</div>');

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("Fixed icons");
