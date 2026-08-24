import { useState, useMemo } from "react"
import { ChevronRight, Wallet as WalletIcon } from "lucide-react"
import { useWallets, getWalletIcon } from "../../hooks/useWallets"
import { useAllTransactions } from "../../hooks/useTransactions"
import { formatRupiah } from "../../lib/utils"
import { BottomSheet } from "./BottomSheet"
import { IconRenderer } from "./IconRenderer"
import famfinaRaw from "../../data/famfina_transactions.json"

// Pre-index Famfina records by date+amount+type for 100% deterministic wallet resolution
const famfinaKeyMap = new Map<string, any[]>()
famfinaRaw.forEach((t: any) => {
  const k = `${t.occurred_on}_${t.amount}_${t.type}`
  if (!famfinaKeyMap.has(k)) famfinaKeyMap.set(k, [])
  famfinaKeyMap.get(k)!.push(t)
})


const SEGMENT_COLORS_DARK = [
  "#FFFFFF", "#E4E4E7", "#D4D4D8", "#A1A1AA", "#8E8E93",
  "#71717A", "#52525B", "#3F3F46", "#27272A", "#1E1E22"
]
const SEGMENT_COLORS_LIGHT = [
  "#18181B", "#27272A", "#3F3F46", "#52525B", "#71717A",
  "#8E8E93", "#A1A1AA", "#D4D4D8", "#E4E4E7", "#F4F4F6"
]

export function BalanceCard() {
  const [detailOpen, setDetailOpen] = useState(false)
  const { data: wallets = [] } = useWallets()
  const { data: allTxs = [] } = useAllTransactions()

  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  const SEGMENT_COLORS = isDark ? SEGMENT_COLORS_DARK : SEGMENT_COLORS_LIGHT

  const { items, accounts, totalAssets, isEmpty } = useMemo(() => {
    // 1. Initialize Map strictly from user's active wallets
    const walletMap = new Map<string, { id: string; name: string; icon: string; balance: number; inflow: number; outflow: number }>()
    wallets.forEach(w => {
      const key = w.name.toLowerCase()
      const resolvedIcon = (!w.icon || w.icon === "/icons/wallet.png") ? getWalletIcon(w.name) : w.icon
      walletMap.set(key, {
        id: w.id,
        name: w.name,
        icon: resolvedIcon,
        balance: 0,
        inflow: 0,
        outflow: 0,
      })
    })

    if (walletMap.size === 0) {
      walletMap.set("cash", {
        id: "wallet-cash",
        name: "Cash",
        icon: "/icons/Budgets/Cash.png",
        balance: 0,
        inflow: 0,
        outflow: 0,
      })
    }

    // If custom user wallets exist, update icons / IDs
    wallets.forEach(w => {
      const key = w.name.toLowerCase()
      const resolvedIcon = (!w.icon || w.icon === "/icons/wallet.png") ? getWalletIcon(w.name) : w.icon
      const existing = walletMap.get(key)
      if (existing) {
        existing.id = w.id
        existing.icon = resolvedIcon
      } else {
        walletMap.set(key, {
          id: w.id,
          name: w.name,
          icon: resolvedIcon,
          balance: 0,
          inflow: 0,
          outflow: 0,
        })
      }
    })

    // Deep clones of famfina lookup to consume matched entries
    const keyMapCopy = new Map<string, any[]>()
    famfinaKeyMap.forEach((v, k) => {
      keyMapCopy.set(k, [...v])
    })

    // Helper to get or create wallet entry
    const getWallet = (nameOrId: string | null | undefined): { id: string; name: string; icon: string; balance: number; inflow: number; outflow: number } => {
      if (!nameOrId) return walletMap.get("cash") || Array.from(walletMap.values())[0]
      const key = nameOrId.toLowerCase()
      if (walletMap.has(key)) return walletMap.get(key)!
      const byId = wallets.find(w => w.id === nameOrId)
      if (byId && walletMap.has(byId.name.toLowerCase())) {
        return walletMap.get(byId.name.toLowerCase())!
      }
      const displayName = nameOrId.charAt(0).toUpperCase() + nameOrId.slice(1)
      const newEntry = {
        id: `wallet-${key}`,
        name: displayName,
        icon: getWalletIcon(displayName),
        balance: 0,
        inflow: 0,
        outflow: 0,
      }
      walletMap.set(key, newEntry)
      return newEntry
    }

    // 2. Iterate through all transactions and accumulate
    allTxs.forEach(tx => {
      const amt = Number(tx.amount || 0)
      if (amt <= 0) return

      const k = `${tx.occurred_on}_${tx.amount}_${tx.type}`
      const matches = keyMapCopy.get(k)
      const hint = matches && matches.length > 0 ? matches.shift() : null

      let fromName = hint?.fromWallet
      let toName = hint?.toWallet

      if (!fromName && tx.wallet_id) {
        const found = wallets.find(w => w.id === tx.wallet_id)
        if (found) fromName = found.name
      }
      if (!toName && tx.to_wallet_id) {
        const found = wallets.find(w => w.id === tx.to_wallet_id)
        if (found) toName = found.name
      }

      const fromEntry = getWallet(fromName || "Cash")
      const toEntry = getWallet(toName || "BNI")

      if (tx.type === "income") {
        fromEntry.inflow += amt
        fromEntry.balance += amt
      } else if (tx.type === "expense") {
        fromEntry.outflow += amt
        fromEntry.balance -= amt
      } else if (tx.type === "transfer") {
        fromEntry.outflow += amt
        fromEntry.balance -= amt
        toEntry.inflow += amt
        toEntry.balance += amt
      }
    })

    const allAccounts = Array.from(walletMap.values()).sort((a, b) => b.balance - a.balance)
    const positiveAccounts = allAccounts.filter(a => a.balance > 0)
    const totalAssetsSum = positiveAccounts.reduce((s, a) => s + a.balance, 0)
    const effectiveTotal = totalAssetsSum > 0 ? totalAssetsSum : 1

    if (allTxs.length === 0) {
      const emptyAccounts = allAccounts.map(acc => ({ ...acc, percent: 0, color: SEGMENT_COLORS[0] }))
      return { items: [], accounts: emptyAccounts, totalAssets: 0, isEmpty: true }
    }

    // Largest Remainder Method for exact 100% chart segments
    let rem = 100
    const chartItems = positiveAccounts.map((acc, idx) => {
      const raw = (acc.balance / effectiveTotal) * 100
      const floored = Math.floor(raw)
      rem -= floored
      return {
        name: acc.name,
        icon: acc.icon,
        balance: acc.balance,
        percent: floored,
        remainder: raw - floored,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      }
    })

    const byRem = [...chartItems].sort((a, b) => b.remainder - a.remainder)
    for (let i = 0; i < rem; i++) {
      if (byRem[i % byRem.length]) byRem[i % byRem.length].percent += 1
    }
    chartItems.sort((a, b) => b.percent - a.percent)

    // Formatted accounts with percentage
    const formattedAccounts = allAccounts.map((acc, idx) => {
      const pct = acc.balance > 0 ? (acc.balance / effectiveTotal) * 100 : 0
      return {
        ...acc,
        percent: pct,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      }
    })

    return {
      items: chartItems,
      accounts: formattedAccounts,
      totalAssets: totalAssetsSum,
      isEmpty: false,
    }
  }, [wallets, allTxs, SEGMENT_COLORS])

  const positiveAccounts = accounts.filter(a => a.balance > 0)
  const zeroAccounts = accounts.filter(a => a.balance <= 0)

  return (
    <>
      {/* Compact Main Portfolio Card */}
      <section className="p-4 rounded-[22px] glass-surface">
        {/* Header */}
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Portfolio Accounts
          </span>
          {!isEmpty && (
            <button
              onClick={() => setDetailOpen(true)}
              className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95 transition-transform"
              style={{ color: "var(--text-secondary)" }}
            >
              All Details <ChevronRight size={13} />
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="py-5 text-center rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <div className="w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1.5"
              style={{ background: "var(--glass-fill-strong)", color: "var(--text-tertiary)" }}>
              <WalletIcon size={14} />
            </div>
            <p className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>No Account Activity</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Record a transaction to see portfolio allocation</p>
          </div>
        ) : (
          <>
            {/* Multi-segment Allocation Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex gap-[2px] mb-2.5 p-[1px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              {items.map(item => (
                <div
                  key={item.name}
                  className="h-full rounded-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: item.color,
                    minWidth: item.percent > 0 ? "3px" : "0",
                  }}
                />
              ))}
            </div>

            {/* Compact 1-Row Mini Chips Legend */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {items.slice(0, 5).map(item => (
                <div key={item.name} className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                  <span className="amount text-[10px] font-extrabold" style={{ color: "var(--text-tertiary)" }}>
                    {item.percent}%
                  </span>
                </div>
              ))}
              {items.length > 5 && (
                <button
                  onClick={() => setDetailOpen(true)}
                  className="shrink-0 px-2 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
                >
                  +{items.length - 5} more
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* Refined Compact Portfolio Breakdown Bottom Sheet */}
      <BottomSheet isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-extrabold text-lg leading-tight" style={{ color: "var(--text-primary)" }}>
                Portfolio Breakdown
              </h3>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {positiveAccounts.length} active accounts · Net portfolio
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Total Assets</p>
              <p className="amount text-[16px] font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(totalAssets)}
              </p>
            </div>
          </div>

          {/* Active Accounts 2-Column Compact Grid */}
          <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1 pb-16">
            <div className="grid grid-cols-2 gap-2">
              {positiveAccounts.map(acc => (
                <div
                  key={acc.name}
                  className="p-3 rounded-2xl flex flex-col justify-between"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                        <IconRenderer icon={acc.icon} size="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>
                        {acc.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}>
                      {acc.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <p className="amount font-extrabold text-[13px]" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(acc.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Inactive / Zero Balance Accounts */}
            {zeroAccounts.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: "var(--text-tertiary)" }}>
                  Other Accounts (Rp 0)
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {zeroAccounts.map(acc => (
                    <div
                      key={acc.name}
                      className="px-2 py-1.5 rounded-xl flex items-center justify-between"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
                    >
                      <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text-tertiary)" }}>
                        {acc.name}
                      </span>
                      <span className="amount text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                        Rp 0
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
