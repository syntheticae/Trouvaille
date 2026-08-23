const fs = require("fs");
let content = fs.readFileSync("src/lib/famfinaResolver.ts", "utf8");

content = content.replace(
  'let { data: userWallets, error: wErr } = await supabase',
  'let { data: userWallets } = await supabase'
);

fs.writeFileSync("src/lib/famfinaResolver.ts", content, "utf8");
console.log("Fixed unused wErr in famfinaResolver.ts");
