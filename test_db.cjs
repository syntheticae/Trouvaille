const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: w } = await supabase.from('wallets').select('id, name').limit(3);
  console.log("Wallets:", w);
  const { data: t } = await supabase.from('transactions').select('id, wallet_id, amount').limit(3);
  console.log("Transactions:", t);
}
check();
