const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8");

// 1. Imports
if (!content.includes("useWallets")) {
  content = 'import { useWallets, getWalletIcon } from "../hooks/useWallets"\nimport { resolveFamfinaWallet } from "../lib/famfinaResolver"\nimport { CreditCard } from "lucide-react"\n' + content;
}

// 2. State & Hook inside component
content = content.replace(
  'const { data: allTxs = [] } = useAllTransactions()',
  'const { data: allTxs = [] } = useAllTransactions()\n  const { data: wallets = [] } = useWallets()\n  const [walletFilterType, setWalletFilterType] = useState<"all" | "expense" | "income">("all")'
);

// 3. Compute walletUsageStats
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

content = content.replace(
  '// 6. Category breakdown stats',
  walletStatsCode + '\n  // 6. Category breakdown stats'
);

// 4. Render Account Activity Card (Insert right after Category Breakdown)
const accountActivityCardUI = `
      {/* 🍎 Apple macOS Style: Most Active Accounts & Volume Distribution */}
      <div className="p-5 rounded-[24px] glass-surface">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} style={{ color: "var(--text-tertiary)" }} />
              <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                Most Active Accounts
              </h2>
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {walletUsageStats.length} accounts · {rangeTitle}
            </p>
          </div>
          <div className="flex p-1 rounded-full" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["all", "expense", "income"] as const).map(t => (
              <button
                key={t}
                onClick={() => setWalletFilterType(t)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all"
                style={{
                  background: walletFilterType === t ? "var(--accent)" : "transparent",
                  color: walletFilterType === t ? "var(--accent-ink)" : "var(--text-secondary)"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {walletUsageStats.length > 0 ? (
          <div className="space-y-2.5">
            {walletUsageStats.slice(0, 6).map((w, idx) => {
              const activeVal = walletFilterType === "expense" ? w.totalExpense : walletFilterType === "income" ? w.totalIncome : (w.totalExpense + w.totalIncome)
              const pct = maxWalletVolume > 0 ? Math.min(100, Math.max(8, (activeVal / maxWalletVolume) * 100)) : 0

              return (
                <div
                  key={w.name}
                  className="p-3.5 rounded-2xl transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--shadow-card)"
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                      >
                        <IconRenderer icon={w.icon} size="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>{w.name}</p>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "var(--glass-fill-strong)", color: "var(--text-tertiary)", border: "1px solid var(--glass-border)" }}
                          >
                            {w.count} txs
                          </span>
                        </div>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {walletFilterType === "all" ? \`In: \${formatRupiah(w.totalIncome)} · Out: \${formatRupiah(w.totalExpense)}\` : \`Total \${walletFilterType}\`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount font-extrabold text-[14px]" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(activeVal)}
                      </span>
                    </div>
                  </div>

                  {/* macOS Sleek Progress Gauge */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: \`\${pct}%\`,
                        background: idx === 0 ? "var(--accent)" : idx === 1 ? "var(--text-primary)" : "var(--text-secondary)",
                        opacity: idx === 0 ? 1 : idx === 1 ? 0.75 : 0.45
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>No account activity recorded</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>Try selecting another timeframe</p>
          </div>
        )}
      </div>
`;

content = content.replace(
  '      {/* Inflow vs Outflow Bar Chart */}',
  accountActivityCardUI + '\n      {/* Inflow vs Outflow Bar Chart */}'
);

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Added macOS Style Most Active Accounts card to StatisticsPage.tsx");
