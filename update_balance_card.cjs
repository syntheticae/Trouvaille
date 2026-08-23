const fs = require("fs");
let content = fs.readFileSync("src/components/ui/BalanceCard.tsx", "utf8");

content = content.replace(
  'export function BalanceCard({ allTxs: propTxs }: { allTxs?: any[] }) {',
  'export function BalanceCard({ allTxs: propTxs, hideBalance }: { allTxs?: any[]; hideBalance?: boolean }) {'
);

content = content.replace(
  '{formatRupiah(w.balance)}',
  '{hideBalance ? "Rp ••••••" : formatRupiah(w.balance)}'
);

content = content.replace(
  '{formatRupiah(selectedAccount.balance)}',
  '{hideBalance ? "Rp ••••••" : formatRupiah(selectedAccount.balance)}'
);

fs.writeFileSync("src/components/ui/BalanceCard.tsx", content, "utf8");
console.log("Updated BalanceCard.tsx with hideBalance support");
