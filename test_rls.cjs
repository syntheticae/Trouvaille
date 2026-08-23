const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from("wallets").select("*");
  console.log("Select wallets result:", { data, error });

  // Check RLS on categories
  const { data: catData, error: catError } = await supabase.from("categories").select("*");
  console.log("Select categories result:", { count: catData ? catData.length : 0, error: catError });
}
test();
