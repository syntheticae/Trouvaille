const fs = require("fs");
const data = JSON.parse(fs.readFileSync("src/data/famfina_transactions.json", "utf8"));
console.log(`Total famfina records: ${data.length}`);

// Sample signature tests
const keys = new Set();
data.forEach(t => {
  const key = `${t.occurred_on}_${t.amount}_${t.type}_${(t.note || "").trim().toLowerCase()}`;
  keys.add(key);
});
console.log(`Unique (occurred_on, amount, type, note) keys: ${keys.size} out of ${data.length}`);
