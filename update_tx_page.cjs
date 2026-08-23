const fs = require("fs");
let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8");

content = content.replace(
  'import famfinaRaw from "../data/famfina_transactions.json"\n\nconst famfinaMap = new Map<string, any>()\nfamfinaRaw.forEach((t: any) => {\n  famfinaMap.set(`${t.occurred_on}_${t.amount}_${t.type}_${t.created_at}`, t)\n})',
  'import { resolveFamfinaWallet } from "../lib/famfinaResolver"'
);

content = content.replace(
  /const resolveWalletNames = \(tx: Transaction\) => \{[\s\S]*?return \{\s*from: fromName \|\| "Cash",\s*to: toName \|\| "BNI"\s*\}\s*\}/,
  'const resolveWalletNames = (tx: Transaction) => resolveFamfinaWallet(tx, wallets)'
);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Updated TransactionsPage to use resolveFamfinaWallet");
