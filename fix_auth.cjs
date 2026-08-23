const fs = require("fs");
const files = [
  "src/hooks/useWallets.ts", 
  "src/hooks/useCategories.ts", 
  "src/hooks/useTransactions.ts",
  "src/hooks/useBills.ts"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, "utf8");
  
  // Replace getUser() with getSession()
  content = content.replace(/await supabase\.auth\.getUser\(\)/g, "await supabase.auth.getSession()");
  content = content.replace(/const \{ data: \{ user \} \} =/g, "const { data: { session } } =");
  content = content.replace(/if \(!user\)/g, "const user = session?.user;\n      if (!user)");
  // Sometimes it's without try/catch, just replace the exact line if needed.
  // Actually, a regex might be tricky if formatting varies. Let's do a safer string replace:
  content = content.split("await supabase.auth.getUser()").join("await supabase.auth.getSession().then(({data}) => ({ data: { user: data.session?.user } }))");

  fs.writeFileSync(file, content, "utf8");
}
console.log("Fixed auth calls in hooks");
