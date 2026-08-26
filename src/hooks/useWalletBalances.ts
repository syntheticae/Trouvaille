import { useMemo } from "react"
import { useWallets, getWalletIcon } from "./useWallets"
import { useAllTransactions } from "./useTransactions"
import famfinaRaw from "../data/famfina_transactions.json"

// Pre-index Famfina records by date+amount+type for 100% deterministic wallet resolution
const famfinaKeyMap = new Map<string, any[]>()
famfinaRaw.forEach((t: any) => {
  const k = `${t.occurred_on}_${t.amount}_${t.type}`
  if (!famfinaKeyMap.has(k)) famfinaKeyMap.set(k, [])
  famfinaKeyMap.get(k)!.push(t)
})

export interface AccountBalanceItem {
  id: string
  name: string
  icon: string
  balance: number
  inflow: number
  outflow: number
}

export function useWalletBalances() {
  const { data: wallets = [] } = useWallets()
  const { data: allTxs = [] } = useAllTransactions()

  return useMemo(() => {
    // 1. Initialize Map from user's active wallets
    const walletMap = new Map<string, AccountBalanceItem>()
    
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

    // Deep copy of famfina lookup map
    const keyMapCopy = new Map<string, any[]>()
    famfinaKeyMap.forEach((v, k) => {
      keyMapCopy.set(k, [...v])
    })

    const getWallet = (nameOrId: string | null | undefined): AccountBalanceItem => {
      if (!nameOrId) return walletMap.get("cash") || Array.from(walletMap.values())[0]
      const key = nameOrId.toLowerCase()
      if (walletMap.has(key)) return walletMap.get(key)!
      const byId = wallets.find(w => w.id === nameOrId)
      if (byId && walletMap.has(byId.name.toLowerCase())) {
        return walletMap.get(byId.name.toLowerCase())!
      }
      const displayName = nameOrId.charAt(0).toUpperCase() + nameOrId.slice(1)
      const newEntry: AccountBalanceItem = {
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

    // 2. Iterate through all transactions and calculate balances
    allTxs.forEach(tx => {
      const amt = Number(tx.amount || 0)
      if (amt <= 0) return

      // 1. Explicit database wallet IDs have highest authoritative precedence
      let fromName = tx.wallet_id ? wallets.find(w => w.id === tx.wallet_id)?.name : null
      let toName = tx.to_wallet_id ? wallets.find(w => w.id === tx.to_wallet_id)?.name : null

      // 2. If not specified in DB record, fallback to Famfina historical match map
      if (!fromName || (!toName && tx.type === "transfer")) {
        const k = `${tx.occurred_on}_${tx.amount}_${tx.type}`
        const matches = keyMapCopy.get(k)
        const hint = matches && matches.length > 0 ? matches.shift() : null
        if (!fromName && hint?.fromWallet) fromName = hint.fromWallet
        if (!toName && hint?.toWallet) toName = hint.toWallet
      }

      // 3. If fromName is still not found, check if note mentions a known wallet name
      if (!fromName && tx.note) {
        for (const w of wallets) {
          if (tx.note.toLowerCase().includes(w.name.toLowerCase())) {
            fromName = w.name
            break
          }
        }
      }

      const fromEntry = getWallet(fromName || "Cash")
      const toEntry = getWallet(toName || "BNI")

      const isCorrection = tx.type === "adjustment" || tx.note?.toLowerCase().includes("correction") || tx.note?.toLowerCase().includes("balance adjustment") || tx.note?.toLowerCase().includes("koreksi saldo")

      if (isCorrection) {
        const isNegative = tx.note?.includes("(-)") || tx.type === "expense"
        if (isNegative) {
          fromEntry.balance -= amt
        } else {
          fromEntry.balance += amt
        }
      } else if (tx.type === "income") {
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
    const zeroAccounts = allAccounts.filter(a => a.balance <= 0)
    const totalAssets = positiveAccounts.reduce((s, a) => s + a.balance, 0)

    // Lookup map by wallet ID and name
    const balancesById: Record<string, number> = {}
    const balancesByName: Record<string, number> = {}
    allAccounts.forEach(a => {
      balancesById[a.id] = a.balance
      balancesByName[a.name.toLowerCase()] = a.balance
    })

    return {
      walletMap,
      balancesById,
      balancesByName,
      allAccounts,
      positiveAccounts,
      zeroAccounts,
      totalAssets,
      wallets,
      allTxs
    }
  }, [wallets, allTxs])
}
