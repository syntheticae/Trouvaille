import { AddAssetModal } from "./AddAssetModal";
import { ConvertWalletToAssetModal } from "./ConvertWalletToAssetModal";
import { ConsolidatedBalanceSheetDrawer } from "./ConsolidatedBalanceSheetDrawer";
import {
  AssetMetricDrillDownSheet,
  type MetricDrillDownData,
} from "./AssetMetricDrillDownSheet";
import { AssetDetailSheet } from "../settings/AssetDetailSheet";
import { StakingYieldModal } from "../settings/StakingYieldModal";
import {
  getSavedHoldings,
  getSavedUsdtPref,
  saveUsdtPref,
  upsertHolding,
  type UsdtValuationPref,
} from "../../lib/marketPriceService";
import type { InvestmentHolding, Wallet } from "../../lib/types";

interface AssetsModalsContainerProps {
  userId?: string;
  isAddAssetModalOpen: boolean;
  onCloseAddAssetModal: () => void;
  isConvertModalOpen: boolean;
  onCloseConvertModal: () => void;
  unlinkedCryptoWallet: Wallet | null;
  selectedDetailHolding: InvestmentHolding | null;
  onSelectDetailHolding: (holding: InvestmentHolding | null) => void;
  onDeleteHolding: (id: string, name: string) => void;
  isStakingModalOpen: boolean;
  onCloseStakingModal: () => void;
  isConsolidatedDrawerOpen: boolean;
  onCloseConsolidatedDrawer: () => void;
  selectedMetricDrillDown: MetricDrillDownData | null;
  onCloseMetricDrillDown: () => void;
  holdings: InvestmentHolding[];
  onHoldingsChange: (holdings: InvestmentHolding[]) => void;
  usdtPref: UsdtValuationPref;
  onUsdtPrefChange: (pref: UsdtValuationPref) => void;
  usdtUnits: number;
  usdtRate: number;
  usdtCostBasis: number;
  usdtMarketValue: number;
  usdtFloatingPnLPct: number;
  suggestedUsdtUnits: number;
  recordedCryptoBalance: number;
  netWorth: number;
  totalGrossAssets: number;
  liabilitiesTotal: number;
  liquidAssetsTotal: number;
  growthAssetsTotal: number;
  fixedAssetsTotal: number;
  wallets: Wallet[];
  balancesById: Record<string, number>;
  liquidHoldings: InvestmentHolding[];
  fixedHoldings: InvestmentHolding[];
  onOpenUsdtDetail: () => void;
  onOpenHoldingDetail: (holding: InvestmentHolding) => void;
  isStealthMode: boolean;
  isIndonesian: boolean;
  isDark: boolean;
}

export function AssetsModalsContainer({
  userId,
  isAddAssetModalOpen,
  onCloseAddAssetModal,
  isConvertModalOpen,
  onCloseConvertModal,
  unlinkedCryptoWallet,
  selectedDetailHolding,
  onSelectDetailHolding,
  onDeleteHolding,
  isStakingModalOpen,
  onCloseStakingModal,
  isConsolidatedDrawerOpen,
  onCloseConsolidatedDrawer,
  selectedMetricDrillDown,
  onCloseMetricDrillDown,
  holdings,
  onHoldingsChange,
  usdtPref,
  onUsdtPrefChange,
  usdtUnits,
  usdtRate,
  usdtCostBasis,
  usdtMarketValue,
  usdtFloatingPnLPct,
  suggestedUsdtUnits,
  recordedCryptoBalance,
  netWorth,
  totalGrossAssets,
  liabilitiesTotal,
  liquidAssetsTotal,
  growthAssetsTotal,
  fixedAssetsTotal,
  wallets,
  balancesById,
  liquidHoldings,
  fixedHoldings,
  onOpenUsdtDetail,
  onOpenHoldingDetail,
  isStealthMode,
  isIndonesian,
  isDark,
}: AssetsModalsContainerProps) {
  return (
    <>
      {/* ── Add Asset Modal (Modular iOS 27 Fluid Glass) ──────────────── */}
      <AddAssetModal
        isOpen={isAddAssetModalOpen}
        onClose={onCloseAddAssetModal}
        onSaveHolding={(newH) => {
          const updated = upsertHolding(newH, userId);
          onHoldingsChange(updated);
        }}
        onSaveUsdtPref={(newPref) => {
          onUsdtPrefChange(newPref);
          saveUsdtPref(newPref, userId);
        }}
        usdtRate={usdtPref.rate}
        userId={userId}
      />

      {/* ── Convert / Link Legacy Wallet to Asset Modal ──────────────────── */}
      <ConvertWalletToAssetModal
        isOpen={isConvertModalOpen}
        onClose={onCloseConvertModal}
        wallet={unlinkedCryptoWallet}
        liveRate={usdtPref.rate}
        userId={userId}
        onSuccess={(_h, pref) => {
          onUsdtPrefChange(pref);
          onHoldingsChange(getSavedHoldings(userId));
        }}
      />

      {/* ── Asset Detail Sheet with Transaction Bridge ──────────────────── */}
      <AssetDetailSheet
        isOpen={!!selectedDetailHolding}
        onClose={() => onSelectDetailHolding(null)}
        holding={selectedDetailHolding}
        onHoldingUpdated={() => {
          const freshHoldings = getSavedHoldings(userId);
          onHoldingsChange(freshHoldings);
          const freshUsdt = getSavedUsdtPref(userId);
          onUsdtPrefChange(freshUsdt);
          if (selectedDetailHolding) {
            const refreshed = freshHoldings.find(
              (x) =>
                x.id === selectedDetailHolding.id ||
                (x.symbol &&
                  x.symbol.toUpperCase() ===
                    selectedDetailHolding.symbol?.toUpperCase()),
            );
            if (refreshed) onSelectDetailHolding(refreshed);
          }
        }}
        onDeleteHolding={(id, name) => {
          onDeleteHolding(id, name);
          onSelectDetailHolding(null);
        }}
      />

      {/* ── Passive Yield & Dividends Modal ─────────────────────────────── */}
      <StakingYieldModal
        isOpen={isStakingModalOpen}
        onClose={onCloseStakingModal}
        holdingUnits={usdtUnits}
        liveRate={usdtRate}
        wallets={wallets}
        holdings={holdings}
        userId={userId}
        onSuccess={() => {
          onUsdtPrefChange(getSavedUsdtPref(userId));
          onHoldingsChange(getSavedHoldings(userId));
        }}
      />

      {/* ── Consolidated Balance Sheet Drawer (All Assets & Liabilities) ── */}
      <ConsolidatedBalanceSheetDrawer
        isOpen={isConsolidatedDrawerOpen}
        onClose={onCloseConsolidatedDrawer}
        netWorth={netWorth}
        totalGrossAssets={totalGrossAssets}
        liabilitiesTotal={liabilitiesTotal}
        liquidAssetsTotal={liquidAssetsTotal}
        growthAssetsTotal={growthAssetsTotal}
        fixedAssetsTotal={fixedAssetsTotal}
        usdtPref={{
          units: usdtUnits,
          rate: usdtRate,
          costBasis: usdtCostBasis,
        }}
        usdtMarketValue={usdtMarketValue}
        usdtFloatingPnLPct={usdtFloatingPnLPct}
        suggestedUsdtUnits={suggestedUsdtUnits}
        recordedCryptoBalance={recordedCryptoBalance}
        wallets={wallets}
        balancesById={balancesById}
        liquidHoldings={liquidHoldings}
        fixedHoldings={fixedHoldings}
        onOpenUsdtDetail={onOpenUsdtDetail}
        onOpenHoldingDetail={onOpenHoldingDetail}
        isStealthMode={isStealthMode}
        isIndonesian={isIndonesian}
        isDark={isDark}
      />

      {/* ── Metric Telemetry Drill-Down Sheet (6 Half-Cards) ── */}
      <AssetMetricDrillDownSheet
        data={selectedMetricDrillDown}
        onClose={onCloseMetricDrillDown}
        isStealthMode={isStealthMode}
        isIndonesian={isIndonesian}
      />
    </>
  );
}
