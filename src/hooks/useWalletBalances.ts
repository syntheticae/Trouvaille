import { useMemo } from "react";
import { useWallets } from "./useWallets";
import { useAllTransactions } from "./useTransactions";
import {
  calculateWalletBalances,
  isLiquidAccountName,
  type AccountBalanceItem,
  type WalletBalancesResult,
} from "../lib/financialMath";

export type { AccountBalanceItem, WalletBalancesResult };

export function useWalletBalances() {
  const { data: wallets = [] } = useWallets();
  const { data: allTxs = [] } = useAllTransactions();

  return useMemo(() => {
    const result = calculateWalletBalances(allTxs, wallets);
    const liquidAccounts = result.positiveAccounts.filter((account) =>
      isLiquidAccountName(account.name),
    );
    const liquidAssets = liquidAccounts.reduce(
      (sum, account) => sum + account.balance,
      0,
    );

    return {
      ...result,
      liquidAccounts,
      liquidAssets,
      wallets,
      allTxs,
    };
  }, [wallets, allTxs]);
}
