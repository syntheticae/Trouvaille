import { useMemo } from "react"
import { useWallets } from "./useWallets"
import { useAllTransactions } from "./useTransactions"
import { calculateWalletBalances, type AccountBalanceItem, type WalletBalancesResult } from "../lib/financialMath"

export type { AccountBalanceItem, WalletBalancesResult }

export function useWalletBalances() {
  const { data: wallets = [] } = useWallets()
  const { data: allTxs = [] } = useAllTransactions()

  return useMemo(() => {
    const result = calculateWalletBalances(allTxs, wallets)
    return {
      ...result,
      wallets,
      allTxs
    }
  }, [wallets, allTxs])
}
