const fs = require("fs");
let content = fs.readFileSync("src/hooks/useWallets.ts", "utf8");

// Change useEnsureDefaultWallets so it doesn't resurrect deleted wallets
content = content.replace(
  /if \(existing && existing\.length > 0\) \{[\s\S]*?\} else \{/,
  'if (existing && existing.length > 0) {\n          // If any wallets exist, do NOT auto-recreate missing ones (user might have deleted them).\n          return\n        } else {'
);

fs.writeFileSync("src/hooks/useWallets.ts", content, "utf8");
console.log("Fixed useWallets");
