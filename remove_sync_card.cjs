const fs = require("fs");
let content = fs.readFileSync("src/pages/SettingsPage.tsx", "utf8");

// Remove the sync card block
const syncCardRegex = /\{\/\* Re-link Wallets & Accounts \(Famfina Sync\) \*\/\}[\s\S]*?<div className="h-\[1px\] w-full" style=\{\{ background: "var\(--glass-border\)" \}\} \/>\n/;
content = content.replace(syncCardRegex, "");

// Remove unused state and import if any
content = content.replace('const [isSyncingFamfina, setIsSyncingFamfina] = useState(false)\n', '');
content = content.replace('import { syncAllTransactionsWithFamfina } from "../lib/famfinaResolver"\n', '');

fs.writeFileSync("src/pages/SettingsPage.tsx", content, "utf8");
console.log("Removed temporary Famfina sync card from SettingsPage.tsx");
