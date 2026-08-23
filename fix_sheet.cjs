const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

// 1. Remove isUUID
content = content.replace(
  /const isUUID = \(id: string \| null\) => id && \/\^\[0-9a-f\]\{8\}\-\[0-9a-f\]\{4\}\-\[0-9a-f\]\{4\}\-\[0-9a-f\]\{4\}\-\[0-9a-f\]\{12\}\$\/i\.test\(id\)/g,
  ''
);

// 2. Fix Payload
const payloadRegex = /const payload = \{[\s\S]*?to_wallet_id:[^\n]*\n\s*\}/;
const newPayload = `const payload = {
      type,
      amount: numAmount,
      note,
      occurred_on: format(date, "yyyy-MM-dd"),
      created_at: txDate.toISOString(),
      category_id: type === "transfer" ? null : effectiveCatId,
      wallet_id: effectiveWalletId,
      to_wallet_id: type === "transfer" ? effectiveToWalletId : null
    }`;
content = content.replace(payloadRegex, newPayload);

// 3. Fix Layout
// Remove "fixed bottom-[24px] left-5 right-5 z-50 flex gap-2"
content = content.replace(
  'className="fixed bottom-[24px] left-5 right-5 z-50 flex gap-2"',
  'className="flex gap-2 mt-4"'
);

// Reduce pb-36 to pb-10
content = content.replace(
  '<div className="px-5 pt-2 pb-36">',
  '<div className="px-5 pt-2 pb-8">'
);

// Change More Categories grid from grid-cols-4 to grid-cols-3
content = content.replace(
  '<div className="grid grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">',
  '<div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">'
);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Fixed TransactionSheet");
