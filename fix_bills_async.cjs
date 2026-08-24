const fs = require("fs");

let content = fs.readFileSync("src/hooks/useBills.ts", "utf8").replace(/\r\n/g, "\n");

content = content.replace(
  'syncBillNotifications(bills).catch(() => {})',
  'setTimeout(() => { syncBillNotifications(bills).catch(() => {}) }, 300)'
);

fs.writeFileSync("src/hooks/useBills.ts", content, "utf8");
console.log("Updated useBills.ts: non-blocking notification scheduling");
