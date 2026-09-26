import { useMemo } from "react";
import { useWallets } from "./useWallets";
import { useAllTransactions } from "./useTransactions";
import { useOptionalSpace } from "../contexts/SpaceContext";
import {
  calculateWalletBalances,
  type AccountBalanceItem,
  type WalletBalancesResult,
} from "../lib/financialMath";

export type { AccountBalanceItem, WalletBalancesResult };

export function useWalletBalances(targetSpaceId?: string) {
  const { data: wallets = [] } = useWallets();
  const { data: allTxs = [] } = useAllTransactions();
  const spaceCtx = useOptionalSpace();

  const activeSpaceId = targetSpaceId || spaceCtx?.activeSpaceId || "personal";

  return useMemo(() => {
    // 1. Filter transactions according to active space
    const scopedTxs = spaceCtx
      ? spaceCtx.filterTransactionsBySpace(allTxs, activeSpaceId)
      : allTxs;

    // 2. In custom ledgers (not 'personal' and not 'all'), wallets start cleanly from Rp 0
    const isCustomLedger =
      activeSpaceId !== "personal" && activeSpaceId !== "all";
    const scopedWallets = isCustomLedger
      ? wallets.map((w) => ({
          ...w,
          balance: 0,
          initial_balance: 0,
        }))
      : wallets;

    const result = calculateWalletBalances(scopedTxs, scopedWallets);
    const liquidAssets = result.liquidCapital;

    return {
      ...result,
      liquidAssets,
      wallets: scopedWallets,
      allTxs: scopedTxs,
    };
  }, [wallets, allTxs, activeSpaceId, spaceCtx]);
}

