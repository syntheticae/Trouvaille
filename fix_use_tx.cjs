const fs = require("fs");
let content = fs.readFileSync("src/hooks/useTransactions.ts", "utf8");

content = content.replace(
  'interface TransactionInput {\n  type: TransactionType; amount: number\n  category_id: string | null; wallet_id?: string | null; to_wallet_id?: string | null; note?: string | null; occurred_on: string\n}',
  'interface TransactionInput {\n  type: TransactionType; amount: number\n  category_id: string | null; wallet_id?: string | null; to_wallet_id?: string | null; note?: string | null; occurred_on: string\n  created_at?: string\n}'
);

content = content.replace(
  'created_at: new Date().toISOString(),',
  'created_at: newTx.created_at || new Date().toISOString(),'
);

fs.writeFileSync("src/hooks/useTransactions.ts", content, "utf8");
console.log("useTransactions.ts audited and fixed");
