const fs = require("fs");
const lines = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8").split("\n");
lines.forEach((l, i) => {
  if (l.includes("`")) console.log(i + 1, l);
});
