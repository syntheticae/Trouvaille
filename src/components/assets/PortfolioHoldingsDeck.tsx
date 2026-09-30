import { Layers, Plus, ChevronRight } from "lucide-react";
import { formatRupiah, formatHoldingUnits } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { IconRenderer } from "../ui/IconRenderer";
import type { InvestmentHolding } from "../../lib/types";
import type { UsdtValuationPref } from "../../lib/marketPriceService";

export interface DisplayHoldingItem extends InvestmentHolding {
  valuation: {
    marketValue: number;
    floatingPnLPct: number;
  };
}

interface PortfolioHoldingsDeckProps {
  holdings: InvestmentHolding[];
  displayHoldings: DisplayHoldingItem[];
  usdtPref: UsdtValuationPref;
  recordedCryptoBalance: number;
  suggestedUsdtUnits: number;
  usdtMarketValue: number;
  usdtFloatingPnLPct: number;
  totalGrossAssets: number;
  isStealthMode: boolean;
  isIndonesian: boolean;
  onOpenAddAsset: () => void;
  onOpenUsdtDetail: () => void;
  onOpenHoldingDetail: (holding: InvestmentHolding) => void;
  onOpenConsolidatedDrawer: () => void;
}

export function PortfolioHoldingsDeck({
  holdings,
  displayHoldings,
  usdtPref,
  recordedCryptoBalance,
  suggestedUsdtUnits,
  usdtMarketValue,
  usdtFloatingPnLPct,
  totalGrossAssets,
  isStealthMode,
  isIndonesian,
  onOpenAddAsset,
  onOpenUsdtDetail,
  onOpenHoldingDetail,
  onOpenConsolidatedDrawer,
}: PortfolioHoldingsDeckProps) {
  const totalAssetCount =
    holdings.length +
    (usdtPref.units > 0 || recordedCryptoBalance > 0 ? 1 : 0);

  return (
    <section
      id="holdings-deck"
      className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3.5 select-none"
      style={{
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Layers
              size={15}
              strokeWidth={1.75}
              className="text-[var(--text-primary)]"
            />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
              {isIndonesian
                ? "Daftar Kepemilikan Portofolio"
                : "Portfolio Holdings"}
            </h4>
            <p className="text-[10.5px] text-[var(--text-tertiary)]">
              {isIndonesian
                ? "Valuasi pasar langsung & alokasi aset"
                : "Valuation & asset allocation"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
            {totalAssetCount} {isIndonesian ? "aset" : "assets"}
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              onOpenAddAsset();
            }}
            className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--text-primary)] text-[var(--bg-base)] active:scale-95 transition-transform cursor-pointer"
            title={isIndonesian ? "Tambah Aset" : "Add Asset"}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Compact List of Top 3 Assets */}
      <div className="space-y-2">
        {/* Core USDT Row */}
        {(usdtPref.units > 0 || recordedCryptoBalance > 0) && (
          <div
            onClick={onOpenUsdtDetail}
            className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)] hover:bg-[var(--glass-fill-strong)]"
            style={{ background: "var(--glass-fill)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0 font-semibold text-xs">
                ₮
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[13px] text-[var(--text-primary)]">
                    USDT
                  </span>
                  <span className="text-[8.5px] px-1.5 py-0.5 rounded font-semibold bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                    STABLECOIN
                  </span>
                </div>
                <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5">
                  {usdtPref.units > 0
                    ? `${formatHoldingUnits(usdtPref.units)} USDT · @${formatRupiah(usdtPref.rate)}`
                    : `${isIndonesian ? "Dompet tertaut" : "Wallet linked"} · ${formatHoldingUnits(suggestedUsdtUnits)} USDT`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <span className="text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(usdtMarketValue)}
              </span>
              <div className="flex items-center justify-end gap-1.5 text-[10px] mt-0.5">
                <span
                  style={{
                    color:
                      usdtFloatingPnLPct >= 0
                        ? "var(--accent)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {usdtFloatingPnLPct >= 0 ? "+" : ""}
                  {usdtFloatingPnLPct.toFixed(1)}%
                </span>
                <span className="text-[var(--text-tertiary)] opacity-60">
                  ·
                </span>
                <span className="text-[var(--text-tertiary)]">
                  {(
                    (usdtMarketValue / (totalGrossAssets || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Other Holdings (Top 3 in inline view) */}
        {displayHoldings.slice(0, 3).map((h) => {
          const val = h.valuation;
          const weight =
            totalGrossAssets > 0
              ? (val.marketValue / totalGrossAssets) * 100
              : 0;
          return (
            <div
              key={h.id}
              onClick={() => onOpenHoldingDetail(h)}
              className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)] hover:bg-[var(--glass-fill-strong)]"
              style={{ background: "var(--glass-fill)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0">
                  <IconRenderer
                    icon={h.icon || "TrendingUp"}
                    size="w-4 h-4"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[13px] text-[var(--text-primary)] truncate">
                      {h.symbol}
                    </span>
                    <span className="text-[8.5px] px-1.5 py-0.5 rounded font-medium bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                      {h.asset_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {h.name} · {formatHoldingUnits(h.units)}{" "}
                    {isIndonesian ? "unit" : "units"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                  {isStealthMode ? "••••••••" : formatRupiah(val.marketValue)}
                </span>
                <div className="flex items-center justify-end gap-1.5 text-[10px] mt-0.5">
                  <span
                    style={{
                      color:
                        val.floatingPnLPct >= 0
                          ? "var(--accent)"
                          : "var(--text-tertiary)",
                    }}
                  >
                    {val.floatingPnLPct >= 0 ? "+" : ""}
                    {val.floatingPnLPct.toFixed(1)}%
                  </span>
                  <span className="text-[var(--text-tertiary)] opacity-60">
                    ·
                  </span>
                  <span className="text-[var(--text-tertiary)]">
                    {weight.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Button to Open Consolidated Balance Sheet Drawer */}
        {(displayHoldings.length > 0 ||
          usdtPref.units > 0 ||
          recordedCryptoBalance > 0) && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onOpenConsolidatedDrawer();
            }}
            className="w-full py-2.5 rounded-2xl bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-strong)] border border-[var(--glass-border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all mt-1"
          >
            <Layers size={13} strokeWidth={2} />
            <span>
              {isIndonesian
                ? `Buka Neraca Lengkap (${totalAssetCount} Aset & Liabilitas)`
                : `Open Consolidated Balance Sheet (${totalAssetCount} Assets & Debt)`}
            </span>
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        )}

        {displayHoldings.length === 0 &&
          usdtPref.units <= 0 &&
          recordedCryptoBalance <= 0 && (
            <div className="py-6 text-center space-y-1 text-[var(--text-tertiary)]">
              <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                {isIndonesian
                  ? "Belum ada aset terdaftar"
                  : "No registered assets"}
              </p>
              <p className="text-[10.5px]">
                {isIndonesian
                  ? "Ketuk tombol (+) di atas untuk menambahkan portofolio."
                  : "Tap the (+) button above to add investment assets."}
              </p>
            </div>
          )}
      </div>
    </section>
  );
}
