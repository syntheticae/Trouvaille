const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

// 1. Imports
if (!content.includes("triggerHaptic")) {
  content = 'import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics"\n' + content;
}

// 2. handleNum and handleDel
content = content.replace(
  'const handleNum = (num: string) => {\n    if (amount === "0") setAmount(num)\n    else if (amount.length < 11) setAmount(amount + num)\n  }',
  `const handleNum = (num: string) => {
    triggerHaptic("light")
    if (amount === "0") setAmount(num)
    else if (amount.length < 11) setAmount(amount + num)
  }`
);

content = content.replace(
  'const handleDel = () => {\n    if (amount.length > 1) setAmount(amount.slice(0, -1))\n    else setAmount("0")\n  }',
  `const handleDel = () => {
    triggerHaptic("medium")
    if (amount.length > 1) setAmount(amount.slice(0, -1))
    else setAmount("0")
  }`
);

// 3. Tab change & save haptic
content = content.replace('onClick={() => setType(t)}', 'onClick={() => { setType(t); triggerHaptic("light"); }}');
content = content.replace('showToast("Transaksi diperbarui", "update", () => {})', 'triggerSuccessHaptic(); showToast("Transaksi diperbarui", "update", () => {})');
content = content.replace('showToast("Transaksi tersimpan", "add", () => {})', 'triggerSuccessHaptic(); showToast("Transaksi tersimpan", "add", () => {})');

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("Added haptics to TransactionSheet.tsx");
