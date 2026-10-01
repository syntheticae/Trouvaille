import { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  ChevronRight,
  Search,
  X,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatRupiah, formatHoldingUnits } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { IconRenderer } from "../ui/IconRenderer";
import type { InvestmentHolding } from "../../lib/types";
import type { UsdtValuationPref } from "../../lib/marketPriceService";
import { calculateHoldingValuation } from "../../lib/marketPriceService";

export interface DisplayHoldingItem extends InvestmentHolding {
  valuation: {
    marketValue: number;
    floatingPnLPct: number;
    costBasis?: number;
    floatingPnL?: number;
  };
  isUsdt?: boolean;
}

type PresetCategory =
  | "all"
  | "crypto"
  | "stock_us"
  | "stock_id"
  | "gold"
  | "fixed_asset";

interface PortfolioHoldingsDeckProps {
  holdings: InvestmentHolding[];
  displayHoldings?: DisplayHoldingItem[];
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

function formatNativeQuote(h: InvestmentHolding): string {
  const isGold =
    h.asset_type === "gold" ||
    h.symbol?.toUpperCase() === "ANTAM" ||
    h.symbol?.toUpperCase() === "XAU" ||
    h.symbol?.toUpperCase() === "GOLD" ||
    h.symbol?.toUpperCase() === "EMAS";

  if (isGold) {
    const p = h.native_price || h.current_price || 0;
    return `${formatRupiah(p)} / g`;
  }
  if (h.native_currency === "USD" || h.currency === "USD") {
    const val =
      h.native_price || (h.current_price ? h.current_price / 16300 : 0);
    return `$${val >= 100 ? val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val.toFixed(2)}`;
  }
  if (h.native_currency === "USDT") {
    const val = h.native_price || 1;
    return `${val.toFixed(2)} USDT`;
  }
  return formatRupiah(h.native_price || h.current_price || 0);
}

function getCategoryBadgeLabel(
  h: InvestmentHolding,
  isIndonesian: boolean,
): string {
  if (h.symbol?.toUpperCase() === "USDT") {
    return "STABLECOIN";
  }
  const aType = h.asset_type || "stock";
  if (aType === "crypto") return isIndonesian ? "KRIPTO" : "CRYPTO";
  if (aType === "stock") {
    const isUs = h.currency === "USD" || h.native_currency === "USD";
    if (isUs) return isIndonesian ? "SAHAM AS" : "US EQUITY";
    return isIndonesian ? "SAHAM IDX" : "IDX EQUITY";
  }
  if (aType === "gold") return isIndonesian ? "LOGAM MULIA" : "GOLD";
  if (aType === "mutual_fund") return isIndonesian ? "REKSA DANA" : "FUND";
  if (aType === "bond") return isIndonesian ? "OBLIGASI" : "BOND";
  return isIndonesian ? "ASET TETAP" : "FIXED ASSET";
}

export function PortfolioHoldingsDeck({
  holdings,
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
  const [categoryFilter, setCategoryFilter] = useState<PresetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Synthesize Unified Holdings Array (Core USDT integrated automatically)
  const unifiedHoldings = useMemo<DisplayHoldingItem[]>(() => {
    const items: DisplayHoldingItem[] = [];

    // USDT Integration: Check if an explicit USDT holding already exists in holdings array
    const hasExplicitUsdt = holdings.some(
      (h) => h.symbol?.toUpperCase() === "USDT" || h.id.startsWith("usdt-"),
    );

    // If Core USDT preference or balance exists and not explicitly in holdings, synthesize it
    if (!hasExplicitUsdt && (usdtPref.units > 0 || recordedCryptoBalance > 0)) {
      const units = usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits;
      const rate = usdtPref.rate || 16300;
      const costBasis =
        usdtPref.costBasis && usdtPref.costBasis > 0
          ? usdtPref.costBasis
          : recordedCryptoBalance > 0
            ? recordedCryptoBalance
            : units * rate;
      const buyPrice = units > 0 ? Math.round(costBasis / units) : rate;

      items.push({
        id: "usdt-core-holding",
        symbol: "USDT",
        name: "Tether USD",
        asset_type: "crypto",
        units,
        avg_buy_price: buyPrice,
        current_price: rate,
        native_price: 1.0,
        native_currency: "USDT",
        currency: "IDR",
        icon: "Coins",
        price_source: "coingecko",
        valuation: {
          marketValue: usdtMarketValue,
          floatingPnLPct: usdtFloatingPnLPct,
          costBasis,
          floatingPnL: usdtMarketValue - costBasis,
        },
        isUsdt: true,
      });
    }

    // Process all other holdings
    for (const h of holdings) {
      const isUsdtItem =
        h.symbol?.toUpperCase() === "USDT" || h.id.startsWith("usdt-");
      const val = calculateHoldingValuation(h);
      items.push({
        ...h,
        valuation: {
          marketValue: isUsdtItem && usdtMarketValue > 0 ? usdtMarketValue : val.marketValue,
          floatingPnLPct: isUsdtItem && usdtFloatingPnLPct !== 0 ? usdtFloatingPnLPct : val.floatingPnLPct,
          costBasis: val.costBasis,
          floatingPnL: val.floatingPnL,
        },
        isUsdt: isUsdtItem,
      });
    }

    // Sort descending by market value
    return items.sort((a, b) => b.valuation.marketValue - a.valuation.marketValue);
  }, [
    holdings,
    usdtPref,
    recordedCryptoBalance,
    suggestedUsdtUnits,
    usdtMarketValue,
    usdtFloatingPnLPct,
  ]);

  // 2. Filter by Category & Search Query
  const filteredHoldings = useMemo(() => {
    return unifiedHoldings.filter((h) => {
      // Search matching
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchName = (h.name || "").toLowerCase().includes(query);
        const matchSymbol = (h.symbol || "").toLowerCase().includes(query);
        if (!matchName && !matchSymbol) return false;
      }

      // Category matching
      if (categoryFilter === "all") return true;

      const aType = h.asset_type || "stock";
      if (categoryFilter === "crypto") {
        return aType === "crypto" || h.symbol?.toUpperCase() === "USDT";
      }
      if (categoryFilter === "stock_us") {
        return (
          aType === "stock" &&
          (h.currency === "USD" || h.native_currency === "USD")
        );
      }
      if (categoryFilter === "stock_id") {
        return (
          aType === "stock" &&
          h.currency !== "USD" &&
          h.native_currency !== "USD"
        );
      }
      if (categoryFilter === "gold") {
        return (
          aType === "gold" ||
          h.symbol?.toUpperCase() === "ANTAM" ||
          h.symbol?.toUpperCase() === "XAU" ||
          h.symbol?.toUpperCase() === "GOLD" ||
          h.symbol?.toUpperCase() === "EMAS"
        );
      }
      if (categoryFilter === "fixed_asset") {
        return (
          aType === "fixed_asset" ||
          aType === "bond" ||
          aType === "mutual_fund"
        );
      }
      return true;
    });
  }, [unifiedHoldings, searchQuery, categoryFilter]);

  const totalAssetCount = unifiedHoldings.length;

  const categoryTabs: { id: PresetCategory; label: string }[] = [
    { id: "all", label: isIndonesian ? "Semua Aset" : "All Assets" },
    { id: "crypto", label: isIndonesian ? "Kripto" : "Crypto" },
    { id: "stock_us", label: isIndonesian ? "Saham AS" : "US Equities" },
    { id: "stock_id", label: isIndonesian ? "Saham IDX" : "IDX Equities" },
    { id: "gold", label: isIndonesian ? "Emas & Logam" : "Gold & Metal" },
    { id: "fixed_asset", label: isIndonesian ? "Aset Tetap" : "Fixed Assets" },
  ];

  return (
    <section
      id="holdings-deck"
      className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3.5 select-none"
      style={{
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── 1. Header Bar: Title, Count Badge & Add Asset Button ── */}
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
            <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
              {isIndonesian
                ? "Daftar Kepemilikan Portofolio"
                : "Portfolio Holdings"}
            </h3>
            <p className="text-[10.5px] text-[var(--text-tertiary)]">
              {isIndonesian
                ? "Valuasi pasar langsung & workstation aset"
                : "Live market valuation & asset workstation"}
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
            aria-label="Add Asset"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── 2. Filter & Search Controls (Adapted from Web Workstation) ── */}
      <div className="space-y-2.5 pt-1">
        {/* Segmented Category Filter Track */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 glass-scrollbar -mx-1 px-1">
          {categoryTabs.map((tab) => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setCategoryFilter(tab.id);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm"
                    : "bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.75]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isIndonesian ? "Cari ticker, aset..." : "Filter ticker, name..."
            }
            className="w-full pl-9 pr-8 py-2 rounded-xl text-[11.5px] font-medium border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-secondary)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setSearchQuery("");
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title={isIndonesian ? "Hapus pencarian" : "Clear search"}
              aria-label="Clear Search"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Holdings Content: Empty State OR Luxury Cards + Responsive Table ── */}
      {filteredHoldings.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] space-y-2">
          <Coins className="w-7 h-7 mx-auto opacity-30 stroke-[1.5] text-[var(--text-primary)]" />
          <p className="text-[12.5px] font-semibold text-[var(--text-secondary)]">
            {searchQuery
              ? isIndonesian
                ? "Tidak ada aset yang cocok dengan pencarian"
                : "No matching assets found"
              : isIndonesian
                ? "Tidak ada aset di kategori ini"
                : "No holdings in this category"}
          </p>
          <p className="text-[10.5px] text-[var(--text-tertiary)] max-w-xs mx-auto">
            {searchQuery
              ? isIndonesian
                ? "Periksa kembali ejaan ticker atau kata kunci yang dimasukkan."
                : "Check your search keywords or ticker spelling."
              : isIndonesian
                ? "Ketuk tombol (+) untuk mencatat portofolio baru ke akun Anda."
                : "Tap the (+) button to add new investment assets."}
          </p>
          {totalAssetCount === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  onOpenAddAsset();
                }}
                className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[var(--text-primary)] text-[var(--bg-base)] active:scale-95 transition-transform cursor-pointer"
              >
                {isIndonesian ? "+ Tambah Aset" : "+ Add Asset"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Mobile Dedicated Luxury Card List (Visible on screens < md) */}
          <div className="space-y-2.5 md:hidden">
            {filteredHoldings.map((h) => {
              const currentPrice = h.current_price || h.avg_buy_price || 0;
              const buyPrice = h.avg_buy_price || currentPrice;
              const totalVal = h.valuation.marketValue;
              const totalCost = (h.units || 0) * buyPrice;
              const pnl = h.valuation.floatingPnL ?? (totalVal - totalCost);
              const pnlPct = h.valuation.floatingPnLPct;
              const categoryBadge = getCategoryBadgeLabel(h, isIndonesian);
              const weightPct =
                totalGrossAssets > 0
                  ? Math.min(
                      Math.round((totalVal / totalGrossAssets) * 100),
                      100,
                    )
                  : 0;

              return (
                <div
                  key={h.id}
                  onClick={() => {
                    triggerHaptic("light");
                    if (h.isUsdt) {
                      onOpenUsdtDetail();
                    } else {
                      onOpenHoldingDetail(h);
                    }
                  }}
                  className="p-3.5 rounded-2xl flex flex-col gap-2.5 cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)] hover:bg-[var(--glass-fill-strong)]"
                  style={{ background: "var(--glass-fill)" }}
                >
                  {/* Top Row: Icon, Symbol, Category Badge & Live Price */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0 font-semibold text-xs">
                        {h.isUsdt ? (
                          <span>₮</span>
                        ) : (
                          <IconRenderer
                            icon={h.icon || "TrendingUp"}
                            size="w-4 h-4"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[13px] text-[var(--text-primary)] truncate">
                            {h.symbol}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-semibold uppercase tracking-wider border border-[var(--glass-border)] bg-white/[0.04] text-[var(--text-tertiary)]">
                            {categoryBadge}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5">
                          {h.name}
                        </p>
                      </div>
                    </div>

                    {/* Dual Display Native Price */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="tabular-nums text-[12.5px] font-bold text-[var(--text-primary)]">
                          {formatNativeQuote(h)}
                        </span>
                        {typeof h.change_24h_pct === "number" &&
                          h.change_24h_pct !== 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] tabular-nums font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]">
                              {h.change_24h_pct >= 0 ? (
                                <ArrowUpRight size={9} className="stroke-[2.2]" />
                              ) : (
                                <ArrowDownRight size={9} className="stroke-[2.2]" />
                              )}
                              <span>
                                {h.change_24h_pct >= 0 ? "+" : ""}
                                {h.change_24h_pct.toFixed(1)}%
                              </span>
                            </span>
                          )}
                      </div>
                      {(h.native_currency === "USD" || h.currency === "USD") && (
                        <div className="text-[9.5px] text-[var(--text-tertiary)] tabular-nums">
                          ≈ {formatRupiah(currentPrice)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider Hairline */}
                  <div className="border-t border-[var(--glass-border)]" />

                  {/* Bottom Row: Units, Total Market Value & Floating PnL */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-[var(--text-tertiary)]">
                        {isIndonesian ? "Jml: " : "Qty: "}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatHoldingUnits(h.units)}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-[12.5px] text-[var(--text-primary)] tabular-nums leading-tight">
                        {isStealthMode ? "••••••••" : formatRupiah(totalVal)}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] mt-0.5 tabular-nums">
                        <span
                          style={{
                            color:
                              pnlPct >= 0
                                ? "var(--accent)"
                                : "var(--text-tertiary)",
                          }}
                        >
                          {pnl >= 0 ? "+" : "−"}
                          {formatRupiah(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}
                          {pnlPct.toFixed(1)}%)
                        </span>
                        <span className="text-[var(--text-tertiary)] opacity-60">
                          ·
                        </span>
                        <span className="text-[var(--text-tertiary)]">
                          {weightPct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Weight Progress Bar */}
                  <div className="w-full h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      style={{ width: `${Math.max(weightPct, 2)}%` }}
                      className="h-full rounded-full bg-[var(--text-primary)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop/Tablet Responsive Table (Visible on screens >= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--glass-border)]">
            <table className="w-full text-left text-[11.5px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--glass-border)] bg-[var(--glass-fill)] text-[9.5px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                  <th className="py-2.5 px-4">{isIndonesian ? "Aset" : "Asset"}</th>
                  <th className="py-2.5 px-3">{isIndonesian ? "Kategori" : "Category"}</th>
                  <th className="py-2.5 px-3 text-right">
                    {isIndonesian ? "Kepemilikan / Unit" : "Holdings / Units"}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {isIndonesian ? "Harga Beli (DCA)" : "DCA / Buy Price"}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {isIndonesian ? "Harga Terkini" : "Live Price"}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {isIndonesian ? "Nilai Pasar" : "Market Value"}
                  </th>
                  <th className="py-2.5 px-3 text-right">Floating PnL</th>
                  <th className="py-2.5 px-3 w-28">{isIndonesian ? "Bobot" : "Weight"}</th>
                  <th className="py-2.5 px-4 text-center">{isIndonesian ? "Tindakan" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {filteredHoldings.map((h) => {
                  const currentPrice = h.current_price || h.avg_buy_price || 0;
                  const buyPrice = h.avg_buy_price || currentPrice;
                  const totalVal = h.valuation.marketValue;
                  const totalCost = (h.units || 0) * buyPrice;
                  const pnl = h.valuation.floatingPnL ?? (totalVal - totalCost);
                  const pnlPct = h.valuation.floatingPnLPct;
                  const categoryBadge = getCategoryBadgeLabel(h, isIndonesian);
                  const weightPct =
                    totalGrossAssets > 0
                      ? Math.min(
                          Math.round((totalVal / totalGrossAssets) * 100),
                          100,
                        )
                      : 0;

                  return (
                    <tr
                      key={h.id}
                      onClick={() => {
                        triggerHaptic("light");
                        if (h.isUsdt) {
                          onOpenUsdtDetail();
                        } else {
                          onOpenHoldingDetail(h);
                        }
                      }}
                      className="hover:bg-[var(--glass-fill)] transition-colors cursor-pointer"
                    >
                      {/* Asset & Ticker */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0 font-semibold text-[10px]">
                            {h.isUsdt ? (
                              <span>₮</span>
                            ) : (
                              <IconRenderer
                                icon={h.icon || "TrendingUp"}
                                size="w-3.5 h-3.5"
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[12px] text-[var(--text-primary)]">
                              {h.symbol}
                            </div>
                            <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[120px]">
                              {h.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-semibold uppercase tracking-wider border border-[var(--glass-border)] bg-white/[0.03] text-[var(--text-tertiary)]">
                          {categoryBadge}
                        </span>
                      </td>

                      {/* Units */}
                      <td className="py-3 px-3 text-right font-medium text-[var(--text-primary)] tabular-nums">
                        {formatHoldingUnits(h.units)}
                      </td>

                      {/* DCA Buy Price */}
                      <td className="py-3 px-3 text-right text-[var(--text-secondary)] tabular-nums text-[10.5px]">
                        {formatRupiah(buyPrice)}
                      </td>

                      {/* Live Price */}
                      <td className="py-3 px-3 text-right">
                        <div className="tabular-nums font-bold text-[var(--text-primary)]">
                          {formatNativeQuote(h)}
                        </div>
                        {(h.native_currency === "USD" || h.currency === "USD") && (
                          <div className="text-[9px] text-[var(--text-tertiary)] tabular-nums">
                            ≈ {formatRupiah(currentPrice)}
                          </div>
                        )}
                      </td>

                      {/* Market Value */}
                      <td className="py-3 px-3 text-right font-bold text-[var(--text-primary)] tabular-nums">
                        {isStealthMode ? "••••••••" : formatRupiah(totalVal)}
                      </td>

                      {/* PnL */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span
                          style={{
                            color:
                              pnlPct >= 0
                                ? "var(--accent)"
                                : "var(--text-tertiary)",
                          }}
                        >
                          {pnl >= 0 ? "+" : "−"}
                          {formatRupiah(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}
                          {pnlPct.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Weight */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] overflow-hidden">
                            <div
                              style={{ width: `${Math.max(weightPct, 2)}%` }}
                              className="h-full rounded-full bg-[var(--text-primary)]"
                            />
                          </div>
                          <span className="text-[9.5px] font-semibold text-[var(--text-tertiary)] w-6 text-right">
                            {weightPct}%
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic("light");
                            if (h.isUsdt) {
                              onOpenUsdtDetail();
                            } else {
                              onOpenHoldingDetail(h);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg text-[9.5px] font-bold border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-strong)] text-[var(--text-primary)] transition-all cursor-pointer"
                        >
                          {isIndonesian ? "Periksa" : "Inspect"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Open Consolidated Balance Sheet Button ── */}
      {totalAssetCount > 0 && (
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
    </section>
  );
}
