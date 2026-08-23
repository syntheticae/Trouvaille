const fs = require("fs");
let content = fs.readFileSync("src/lib/famfinaResolver.ts", "utf8");

// Enhance syncAllTransactionsWithFamfina to ensure wallets exist in Supabase
const oldSyncRegex = /export async function syncAllTransactionsWithFamfina[\s\S]*?const walletByName = new Map<string, string>\(\)/;

const newSyncHeader = `export async function syncAllTransactionsWithFamfina(
  onProgress?: (current: number, total: number) => void
): Promise<{ updated: number; total: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error("Not authenticated. Please log in first.")

  // 1. Fetch or Auto-Seed user wallets in Supabase
  let { data: userWallets, error: wErr } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)

  const DEFAULT_WALLETS = [
    "Cash", "BNI", "BCA", "Crypto", "Dana", "Shopeepay", "Gopay", "Jago", "BLU", "Krom",
    "Liabilities", "Piutang", "Saham", "Seabank", "Superbank", "Tapcash"
  ]

  if (!userWallets || userWallets.length === 0) {
    console.log("Wallets empty in Supabase, auto-seeding default wallets...")
    const { data: seeded, error: seedErr } = await supabase
      .from("wallets")
      .insert(
        DEFAULT_WALLETS.map(name => ({
          name,
          icon: \`/icons/Budgets/\${name}.png\`,
          user_id: user.id
        }))
      )
      .select()

    if (seedErr) {
      console.error("Auto-seed error:", seedErr)
      throw new Error("Gagal membuat data akun di Supabase: " + seedErr.message)
    }
    userWallets = seeded || []
  }

  const walletByName = new Map<string, string>()`;

content = content.replace(oldSyncRegex, newSyncHeader);
fs.writeFileSync("src/lib/famfinaResolver.ts", content, "utf8");
console.log("Enhanced syncAllTransactionsWithFamfina with auto-seeding");
