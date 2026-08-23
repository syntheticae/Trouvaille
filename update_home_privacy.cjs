const fs = require("fs");
let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8");

// 1. Imports
if (!content.includes("EyeOff")) {
  content = content.replace(
    'import { Bell, ArrowUpRight, TrendingUp, TrendingDown, Sparkles, PiggyBank, Flame } from "lucide-react"',
    'import { Bell, ArrowUpRight, TrendingUp, TrendingDown, Sparkles, PiggyBank, Flame, Eye, EyeOff } from "lucide-react"'
  );
}
if (!content.includes("triggerHaptic")) {
  content = 'import { triggerHaptic } from "../lib/haptics"\n' + content;
}

// 2. State & toggle
const stateCode = `
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem("trouvaille_hide_balance") === "true")

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev
      localStorage.setItem("trouvaille_hide_balance", String(next))
      triggerHaptic("medium")
      return next
    })
  }
`;

if (!content.includes("const [hideBalance")) {
  content = content.replace(
    'const [stockRange, setStockRange] = useState<StockRange>("1M")',
    'const [stockRange, setStockRange] = useState<StockRange>("1M")\n' + stateCode
  );
}

// 3. Eye Button next to Title
content = content.replace(
  '<div className="flex items-baseline justify-between mb-1">\n          <h2 className="text-[13px] font-extrabold tracking-wider text-white/90 leading-none">\n            Net Portfolio\n          </h2>\n        </div>',
  `<div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-extrabold tracking-wider text-white/90 leading-none">
            Net Portfolio
          </h2>
          <button
            onClick={toggleHideBalance}
            className="text-white/60 hover:text-white active:scale-90 transition-all p-1 -mr-1"
            title={hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
          >
            {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>`
);

// 4. Balance masked when hideBalance is true
content = content.replace(
  '{formatRupiah(assetData.currentBalance)}',
  '{hideBalance ? "Rp ••••••••" : formatRupiah(assetData.currentBalance)}'
);

// 5. Pass hideBalance to BalanceCard
content = content.replace(
  '<BalanceCard allTxs={allTxs} />',
  '<BalanceCard allTxs={allTxs} hideBalance={hideBalance} />'
);

// 6. Add haptic on stockRange click
content = content.replace(
  'onClick={() => setStockRange(r)}',
  'onClick={() => { setStockRange(r); triggerHaptic("light"); }}'
);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Updated HomePage.tsx with Privacy Mode & Haptics");
