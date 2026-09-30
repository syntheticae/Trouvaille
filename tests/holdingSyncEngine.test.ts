import { describe, it, expect, beforeEach } from "vitest";
import {
  isInvestmentOrCryptoWallet,
  isUsdtWallet,
  syncTransactionWithHolding,
  reverseTransactionWithHolding,
  auditUsdtReconciliation,
  applyUsdtReconciliation,
  bridgeCryptoAccountToHolding,
  estimateHistoricalUsdtBuyRate,
} from "../src/lib/holdingSyncEngine";
import {
  getSavedUsdtPref,
  saveUsdtPref,
  setHoldingDirectUnits,
} from "../src/lib/marketPriceService";
import { resolveWalletClassification } from "../src/hooks/useWallets";
import { calculateWalletBalances } from "../src/lib/financialMath";
import type { Wallet, Transaction } from "../src/lib/types";

// Polyfill localStorage in node test environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k in store) {
      delete store[k];
    }
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() {
    return Object.keys(store).length;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe("Holding Sync Engine & Crypto Reconciliation", () => {
  const usdtWallet: Wallet = {
    id: "w-usdt",
    user_id: "user-1",
    name: "USDT",
    icon: "/icons/Budgets/USDT.png",
    classification: "investment",
    created_at: "2026-01-01T00:00:00Z",
  };

  const seaBankWallet: Wallet = {
    id: "w-seabank",
    user_id: "user-1",
    name: "SeaBank",
    icon: "/icons/Budgets/SeaBank.png",
    classification: "liquid",
    created_at: "2026-01-01T00:00:00Z",
  };

  const wallets = [usdtWallet, seaBankWallet];

  beforeEach(() => {
    mockLocalStorage.clear();
    // Initialize starting user state: 1057 USDT, rate 16415, costBasis = 1057 * 16400
    saveUsdtPref({
      units: 1057,
      rate: 16415,
      costBasis: 1057 * 16400,
    });
  });

  it("correctly identifies USDT and crypto investment wallets", () => {
    expect(isUsdtWallet(usdtWallet)).toBe(true);
    expect(isUsdtWallet(seaBankWallet)).toBe(false);

    expect(isInvestmentOrCryptoWallet(usdtWallet)).toBe(true);
    expect(isInvestmentOrCryptoWallet(seaBankWallet)).toBe(false);
  });

  it("audits unreconciled P2P transfer (Rp 89.624 withdrawal to SeaBank)", () => {
    const p2pTx: Transaction = {
      id: "tx-p2p-1",
      user_id: "user-1",
      wallet_id: "w-usdt",
      to_wallet_id: "w-seabank",
      type: "transfer",
      amount: 89624,
      note: "Transfer USDT to SeaBank via P2P",
      occurred_on: "2026-09-18",
      created_at: "2026-09-18T10:00:00Z",
    };

    const audit = auditUsdtReconciliation([p2pTx], wallets);
    expect(audit.hasDiscrepancy).toBe(true);
    expect(audit.currentUnits).toBe(1057);
    expect(audit.unreconciledTxs.length).toBe(1);
    expect(audit.totalUnitsToDeduct).toBeCloseTo(89624 / 16415, 2);
    // 1057 - (89624 / 16415) = 1057 - 5.46 = 1051.54 (~1052)
    expect(audit.suggestedReconciledUnits).toBeCloseTo(1051.54, 1);
  });

  it("applies USDT reconciliation to fix holding units to ~1051.54 and logs activity", () => {
    const p2pTx: Transaction = {
      id: "tx-p2p-1",
      user_id: "user-1",
      wallet_id: "w-usdt",
      to_wallet_id: "w-seabank",
      type: "transfer",
      amount: 89624,
      note: "Transfer USDT to SeaBank via P2P",
      occurred_on: "2026-09-18",
      created_at: "2026-09-18T10:00:00Z",
    };

    const audit = auditUsdtReconciliation([p2pTx], wallets);
    const result = applyUsdtReconciliation(audit);
    expect(result.updatedUnits).toBeCloseTo(1051.54, 1);

    const updated = getSavedUsdtPref();
    expect(updated.units).toBeCloseTo(1051.54, 1);

    // After applying, running audit again should report no discrepancy
    const secondAudit = auditUsdtReconciliation([p2pTx], wallets);
    expect(secondAudit.hasDiscrepancy).toBe(false);
  });

  it("persistently skips dismissed or already reconciled transaction IDs across app reloads", () => {
    const p2pTx: Transaction = {
      id: "tx-p2p-dismissed",
      user_id: "user-1",
      wallet_id: "w-usdt",
      to_wallet_id: "w-seabank",
      type: "transfer",
      amount: 89624,
      note: "Transfer USDT to SeaBank via P2P",
      occurred_on: "2026-09-18",
      created_at: "2026-09-18T10:00:00Z",
    };

    const firstAudit = auditUsdtReconciliation([p2pTx], wallets);
    expect(firstAudit.hasDiscrepancy).toBe(true);

    // User dismisses or reconciles
    applyUsdtReconciliation(firstAudit);

    // Simulate full app refresh / new audit instance
    const auditAfterReload = auditUsdtReconciliation([p2pTx], wallets);
    expect(auditAfterReload.hasDiscrepancy).toBe(false);
    expect(auditAfterReload.unreconciledTxs.length).toBe(0);
  });

  it("syncs transaction when recording daily staking yield (income)", () => {
    // Current units: 1057. Earn 0.2 USDT daily staking yield (~Rp 3.283)
    const yieldTx: Transaction = {
      id: "tx-yield-1",
      user_id: "user-1",
      wallet_id: "w-usdt",
      type: "income",
      amount: 3283, // 0.2 USDT * 16415
      note: "Staking USDT Daily Yield Binance Earn",
      occurred_on: "2026-09-21",
      created_at: "2026-09-21T08:00:00Z",
    };

    const syncResult = syncTransactionWithHolding(yieldTx, wallets);
    expect(syncResult.synced).toBe(true);
    expect(syncResult.unitsDelta).toBeCloseTo(0.2, 1);

    const updated = getSavedUsdtPref();
    expect(updated.units).toBeCloseTo(1057.2, 1);
  });

  it("reverses transaction and restores units if a transaction is deleted", () => {
    // 1. User records a transfer out of 5.46 USDT (Rp 89.624)
    const tx: Transaction = {
      id: "tx-test-delete",
      user_id: "user-1",
      wallet_id: "w-usdt",
      to_wallet_id: "w-seabank",
      type: "transfer",
      amount: 89624,
      note: "P2P withdrawal test",
      occurred_on: "2026-09-21",
      created_at: "2026-09-21T09:00:00Z",
    };

    syncTransactionWithHolding(tx, wallets);
    expect(getSavedUsdtPref().units).toBeCloseTo(1051.54, 1);

    // 2. User deletes or reverses the transaction
    const reverseResult = reverseTransactionWithHolding(tx, wallets);
    expect(reverseResult.synced).toBe(true);
    expect(reverseResult.unitsDelta).toBeCloseTo(5.46, 2);

    // Units should be restored back to 1057
    expect(getSavedUsdtPref().units).toBeCloseTo(1057, 1);
  });

  it("auto-upgrades legacy 'liquid' classification for USDT and Crypto wallets to 'investment'", () => {
    const legacyUsdtWallet: Wallet = {
      id: "w-legacy-usdt",
      user_id: "user-1",
      name: "USDT",
      classification: "liquid",
      created_at: "2026-01-01T00:00:00Z",
    };

    expect(resolveWalletClassification(legacyUsdtWallet)).toBe("investment");

    const txs: Transaction[] = [
      {
        id: "tx-buy-usdt",
        user_id: "user-1",
        wallet_id: "w-seabank",
        to_wallet_id: "w-legacy-usdt",
        type: "transfer",
        amount: 16000000,
        note: "Buy USDT @ 16000",
        occurred_on: "2024-05-10",
        created_at: "2024-05-10T10:00:00Z",
      },
    ];

    const balResult = calculateWalletBalances(txs, [legacyUsdtWallet, seaBankWallet]);
    expect(balResult.marketAccounts.some((a) => a.id === "w-legacy-usdt")).toBe(true);
    expect(balResult.liquidAccounts.some((a) => a.id === "w-legacy-usdt")).toBe(false);
  });

  it("bridges imported USDT wallet to holding with historical cost basis and anchors manual unit calibration", () => {
    mockLocalStorage.clear();
    const legacyUsdtWallet: Wallet = {
      id: "w-legacy-usdt",
      user_id: "guest_local_user",
      name: "USDT",
      classification: "liquid",
      created_at: "2026-01-01T00:00:00Z",
    };

    const txs: Transaction[] = [
      {
        id: "tx-in-1",
        user_id: "guest_local_user",
        wallet_id: "w-seabank",
        to_wallet_id: "w-legacy-usdt",
        type: "transfer",
        amount: 15950000,
        note: "Transfer to USDT",
        occurred_on: "2024-05-15",
        created_at: "2024-05-15T10:00:00Z",
      },
    ];

    expect(estimateHistoricalUsdtBuyRate("2024-05-15", "Transfer to USDT", 15950000)).toBe(15950);

    const bridged = bridgeCryptoAccountToHolding(
      [legacyUsdtWallet, seaBankWallet],
      txs,
      "guest_local_user",
    );
    expect(bridged).not.toBeNull();
    expect(bridged?.symbol).toBe("USDT");
    expect(bridged?.avg_buy_price).toBe(15950);
    expect(bridged?.units).toBe(1000);

    // Calibrate manual units while anchoring cost basis to 15,950,000 IDR
    const calibrated = setHoldingDirectUnits(
      bridged!.id,
      1050,
      "guest_local_user",
      "Koreksi Saldo Manual",
      15950000,
    );
    expect(calibrated.units).toBe(1050);
    expect(calibrated.avg_buy_price).toBeCloseTo(15950000 / 1050, 1);
    expect(getSavedUsdtPref("guest_local_user").costBasis).toBe(15950000);
  });
});

