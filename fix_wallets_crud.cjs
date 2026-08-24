const fs = require("fs");

let wContent = fs.readFileSync("src/hooks/useWallets.ts", "utf8").replace(/\r\n/g, "\n");

// 1. Remove BCA from DEFAULT_WALLETS
wContent = wContent.replace(
  '"Cash", "BNI", "BCA", "Crypto", "Dana", "Shopeepay", "Gopay", "Jago", "BLU", "Krom",\n  "Liabilities", "Piutang", "Saham", "Seabank", "Superbank", "Tapcash"',
  '"Cash", "BNI", "Crypto", "Dana", "Shopeepay", "Gopay", "Jago", "BLU", "Krom",\n  "Liabilities", "Piutang", "Saham", "Seabank", "Superbank", "Tapcash"'
);

// 2. Fix useDeleteWallet with transaction unlinking
const oldDeleteWalletRegex = /export function useDeleteWallet\(\) \{[\s\S]*?\}\n\}/;

const newDeleteWalletCode = `export function useDeleteWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        // 1. Unlink any transactions referencing this wallet first
        await supabase.from("transactions").update({ wallet_id: null }).eq("wallet_id", id)
        await supabase.from("transactions").update({ to_wallet_id: null }).eq("to_wallet_id", id)
      } catch (e) {
        console.warn("Unlinking transactions failed:", e)
      }
      const { error } = await supabase.from("wallets").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] })
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["all-transactions"] })
    },
  })
}`;

wContent = wContent.replace(oldDeleteWalletRegex, newDeleteWalletCode);

fs.writeFileSync("src/hooks/useWallets.ts", wContent, "utf8");
console.log("Updated useWallets.ts: removed BCA from defaults and added safe cascade deletion");
