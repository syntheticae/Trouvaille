const fs = require("fs");

// 1. Fix TransactionSheet.tsx
let sheetContent = fs.readFileSync("src/components/transactions/TransactionSheet.tsx", "utf8");
sheetContent = sheetContent.replace(
  'const foundTo = wallets.find(w => w.name.toLowerCase() === match.toWallet.toLowerCase())',
  'const toW = match?.toWallet\n          const foundTo = toW ? wallets.find(w => w.name.toLowerCase() === toW.toLowerCase()) : null'
);
fs.writeFileSync("src/components/transactions/TransactionSheet.tsx", sheetContent, "utf8");
console.log("Fixed TransactionSheet.tsx TS error");

// 2. Fix StatisticsPage.tsx
let statsContent = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8");

const walletStatsCode = `
  // Most Active Accounts Calculation (Apple macOS Style)
  const walletUsageStats = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; count: number; totalExpense: number; totalIncome: number }>()

    filteredTxs.forEach(tx => {
      if (tx.type === "transfer") return
      const resolved = resolveFamfinaWallet(tx, wallets)
      const walletName = resolved.from || "Cash"
      const amt = Number(tx.amount || 0)

      const entry = map.get(walletName) || {
        name: walletName,
        icon: getWalletIcon(walletName),
        count: 0,
        totalExpense: 0,
        totalIncome: 0
      }

      entry.count += 1
      if (tx.type === "expense") entry.totalExpense += amt
      else if (tx.type === "income") entry.totalIncome += amt

      map.set(walletName, entry)
    })

    const list = Array.from(map.values())
    if (walletFilterType === "expense") {
      return list.filter(w => w.totalExpense > 0).sort((a, b) => b.totalExpense - a.totalExpense)
    }
    if (walletFilterType === "income") {
      return list.filter(w => w.totalIncome > 0).sort((a, b) => b.totalIncome - a.totalIncome)
    }
    return list.sort((a, b) => (b.totalExpense + b.totalIncome) - (a.totalExpense + a.totalIncome))
  }, [filteredTxs, wallets, walletFilterType])

  const maxWalletVolume = useMemo(() => {
    if (walletUsageStats.length === 0) return 1
    return Math.max(...walletUsageStats.map(w =>
      walletFilterType === "expense" ? w.totalExpense : walletFilterType === "income" ? w.totalIncome : (w.totalExpense + w.totalIncome)
    ))
  }, [walletUsageStats, walletFilterType])
`;

if (!statsContent.includes("const walletUsageStats =")) {
  statsContent = statsContent.replace(
    '  // 4. Category breakdown',
    walletStatsCode + '\n  // 4. Category breakdown'
  );
}

fs.writeFileSync("src/pages/StatisticsPage.tsx", statsContent, "utf8");
console.log("Fixed StatisticsPage.tsx walletUsageStats injection");
