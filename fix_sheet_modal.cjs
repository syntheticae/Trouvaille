const fs = require("fs");
let content = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");

// Select Category Modal
content = content.replace(
  '<BottomSheet isOpen={moreCatOpen} onClose={() => setMoreCatOpen(false)}>\n        <div className="p-5 pb-32">\n          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Category</h3>\n          <div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">',
  '<BottomSheet isOpen={moreCatOpen} onClose={() => setMoreCatOpen(false)}>\n        <div className="p-5 pb-12">\n          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Category</h3>\n          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">'
);

// Select Account Modal
content = content.replace(
  '<BottomSheet isOpen={moreWalletOpen} onClose={() => setMoreWalletOpen(false)}>\n        <div className="p-5 pb-32">\n          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Account</h3>\n          <div className="grid grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">',
  '<BottomSheet isOpen={moreWalletOpen} onClose={() => setMoreWalletOpen(false)}>\n        <div className="p-5 pb-12">\n          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Account</h3>\n          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">'
);

fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", content, "utf8");
console.log("TransactionSheet modals updated");
