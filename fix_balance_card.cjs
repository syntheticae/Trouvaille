const fs = require("fs");

let content = fs.readFileSync("src/components/ui/BalanceCard.tsx", "utf8").replace(/\r\n/g, "\n");

// 1. Remove DEFAULT_PORTFOLIO_ACCOUNTS definition
const oldDefRegex = /const DEFAULT_PORTFOLIO_ACCOUNTS = \[[\s\S]*?\]\n/;
content = content.replace(oldDefRegex, "");

// 2. Update walletMap initialization to strictly use user wallets
const oldInitRegex = /\/\/ 1\. Initialize Map with all standard portfolio accounts[\s\S]*?\}\)\n    \}\)/;

const newInitCode = `// 1. Initialize Map strictly from user's active wallets
    wallets.forEach(w => {
      const key = w.name.toLowerCase()
      const resolvedIcon = (!w.icon || w.icon === "/icons/wallet.png") ? getWalletIcon(w.name) : w.icon
      walletMap.set(key, {
        id: w.id,
        name: w.name,
        icon: resolvedIcon,
        balance: 0,
        inflow: 0,
        outflow: 0,
      })
    })

    if (walletMap.size === 0) {
      walletMap.set("cash", {
        id: "wallet-cash",
        name: "Cash",
        icon: "/icons/Budgets/Cash.png",
        balance: 0,
        inflow: 0,
        outflow: 0,
      })
    }`;

content = content.replace(oldInitRegex, newInitCode);

// 3. Fix getWallet fallback
content = content.replace(
  'if (!nameOrId) return walletMap.get("cash")!',
  'if (!nameOrId) return walletMap.get("cash") || Array.from(walletMap.values())[0]'
);

// 4. Fix Portfolio Breakdown modal height from 55vh to 75vh with pb-16
content = content.replace(
  '<div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">',
  '<div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1 pb-16">'
);

fs.writeFileSync("src/components/ui/BalanceCard.tsx", content, "utf8");
console.log("Updated BalanceCard.tsx: removed hardcoded accounts, strictly use active wallets, expanded breakdown modal");
