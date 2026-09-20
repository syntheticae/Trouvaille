import { useState, useMemo, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Coins,
  Home,
  Clock,
  Sparkles,
  ArrowUpRight,
  Target,
  Scale,
  Zap,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import {
  getSavedHoldings,
  calculateHoldingValuation,
} from "../../lib/marketPriceService";
import { IconRenderer } from "../ui/IconRenderer";
import type { Wallet } from "../../lib/types";

interface AssetAnalyticsSectionProps {
  wallets: Wallet[];
  monthlyBurnRate?: number;
  hideBalance?: boolean;
  onOpenValuation?: () => void;
}

interface AllocationCategory {
  id: string;
  label: string;
  value: number;
  color: string;
  icon: any;
  share: number;
}

export function AssetAnalyticsSection({
  wallets = [],
  monthlyBurnRate = 3500000,
  hideBalance = false,
  onOpenValuation,
}: AssetAnalyticsSectionProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [viewMode, setViewMode] = useState<"net" | "market">("net");
  const {
    netWorth,
    totalLiabilities,
    balancesByName,
  } = useWalletBalances();

  // Retrieve saved market holdings & fixed assets reactively
  const [holdings, setHoldings] = useState(() => getSavedHoldings());
  const [usdtVersion, setUsdtVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setHoldings(getSavedHoldings());
      setUsdtVersion((v) => v + 1);
    };
    window.addEventListener("trouvaille_holdings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("trouvaille_holdings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // USDT holding detailed info
  const usdtInfo = useMemo(() => {
    let units = 1057;
    let rate = 17725;
    let costBasis = 14860559;
    try {
      const savedV2 = localStorage.getItem("trouvaille_usdt_valuation_v2");
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (parsed.units) units = Number(parsed.units);
        if (parsed.rate) rate = Number(parsed.rate);
        if (parsed.costBasis) costBasis = Number(parsed.costBasis);
      }
    } catch {}
    const marketValue = Math.round(units * rate);
    const floatingPnL = marketValue - costBasis;
    const floatingPnLPct = costBasis > 0 ? (floatingPnL / costBasis) * 100 : 0;
    return {
      id: "holding-usdt",
      symbol: "USDT",
      name: "Tether USD",
      costBasis,
      marketValue,
      floatingPnL,
      floatingPnLPct,
      icon: "Coins",
      asset_type: "crypto" as const,
      units,
    };
  }, [usdtVersion]);

  // Find crypto wallet if user tracks one in wallets table
  const cryptoWallet = useMemo(() => {
    return (
      wallets.find(
        (w) =>
          w.name.trim().toLowerCase() === "crypto" ||
          w.name.trim().toLowerCase() === "usdt" ||
          w.classification === "investment",
      ) || null
    );
  }, [wallets]);

  // Determine real recorded crypto cost basis
  const cryptoCostBasis = useMemo(() => {
    if (cryptoWallet) {
      return balancesByName[cryptoWallet.name.toLowerCase()] ?? usdtInfo.costBasis;
    }
    return usdtInfo.costBasis;
  }, [cryptoWallet, balancesByName, usdtInfo.costBasis]);

  // Cost basis of other holdings (stocks, gold, funds, fixed assets)
  const otherHoldingsCostBasis = useMemo(() => {
    return holdings.reduce((sum, h) => {
      if (h.asset_type === "crypto") return sum;
      return sum + calculateHoldingValuation(h).costBasis;
    }, 0);
  }, [holdings]);

  // Total recorded investment cost basis across crypto & other holdings
  const totalInvestmentsCostBasis = cryptoCostBasis + otherHoldingsCostBasis;

  // Real non-crypto liquid cash: guaranteed exact parity with Home screen Net Portfolio (netWorth)
  const nonCryptoLiquidCash = useMemo(() => {
    return Math.max(0, netWorth - totalInvestmentsCostBasis);
  }, [netWorth, totalInvestmentsCostBasis]);

  // Combined holdings list for the simplified Holdings card
  const allHoldings = useMemo(() => {
    const list = [
      usdtInfo,
      ...holdings.map((h) => {
        const val = calculateHoldingValuation(h);
        return {
          id: h.id,
          symbol: h.symbol,
          name: h.name,
          costBasis: val.costBasis,
          marketValue: val.marketValue,
          floatingPnL: val.floatingPnL,
          floatingPnLPct: val.floatingPnLPct,
          icon: h.icon || (h.asset_type === "fixed_asset" ? "Home" : "TrendingUp"),
          asset_type: h.asset_type,
          units: h.units,
        };
      }),
    ];
    return list;
  }, [usdtInfo, holdings]);

  // Total Floating P&L and Market Valuation across all investments
  const totalFloatingPnL = useMemo(() => {
    return allHoldings.reduce((sum, h) => sum + h.floatingPnL, 0);
  }, [allHoldings]);

  const totalInvestmentsMarketValue = useMemo(() => {
    return allHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  }, [allHoldings]);

  const totalFloatingPct =
    cryptoCostBasis + otherHoldingsCostBasis > 0
      ? (totalFloatingPnL / (cryptoCostBasis + otherHoldingsCostBasis)) * 100
      : 0;

  // Calculate Asset Allocation by Tier with 100% Home Page Net Worth Parity
  const allocation = useMemo(() => {
    let stocks = 0;
    let crypto = viewMode === "net" ? cryptoCostBasis : usdtInfo.marketValue;
    let gold = 0;
    let funds = 0;
    let fixedAssets = 0;

    holdings.forEach((h) => {
      const val = calculateHoldingValuation(h);
      const chosenVal = viewMode === "net" ? val.costBasis : val.marketValue;
      if (h.asset_type === "stock") stocks += chosenVal;
      else if (h.asset_type === "crypto") crypto += chosenVal;
      else if (h.asset_type === "gold") gold += chosenVal;
      else if (h.asset_type === "mutual_fund" || h.asset_type === "bond") funds += chosenVal;
      else if (h.asset_type === "fixed_asset") fixedAssets += chosenVal;
    });

    const liquidCash = nonCryptoLiquidCash;
    const totalAssets =
      viewMode === "net"
        ? netWorth
        : liquidCash + crypto + stocks + gold + funds + fixedAssets;

    const rawCategories = [
      {
        id: "crypto",
        label: "Crypto & USDT",
        value: crypto,
        color: isDark ? "#ffffff" : "#09090c",
        icon: Sparkles,
      },
      {
        id: "liquid",
        label: "Liquid Cash & Bank",
        value: liquidCash,
        color: isDark ? "rgba(255, 255, 255, 0.72)" : "rgba(0, 0, 0, 0.65)",
        icon: Coins,
      },
      {
        id: "equities",
        label: "Stocks & Funds",
        value: stocks + funds,
        color: isDark ? "rgba(255, 255, 255, 0.48)" : "rgba(0, 0, 0, 0.42)",
        icon: TrendingUp,
      },
      {
        id: "gold",
        label: "Gold & Metals",
        value: gold,
        color: isDark ? "rgba(255, 255, 255, 0.32)" : "rgba(0, 0, 0, 0.28)",
        icon: ShieldCheck,
      },
      {
        id: "fixed",
        label: "Fixed Assets (Property)",
        value: fixedAssets,
        color: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.16)",
        icon: Home,
      },
    ];

    const activeCategories: AllocationCategory[] = rawCategories
      .filter((c) => c.value > 0)
      .map((c) => ({
        ...c,
        share: totalAssets > 0 ? (c.value / totalAssets) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalAssets,
      categories: activeCategories,
      liquidShare: totalAssets > 0 ? (liquidCash / totalAssets) * 100 : 0,
      volatileShare:
        totalAssets > 0
          ? ((crypto + stocks + funds + gold) / totalAssets) * 100
          : 0,
      illiquidShare: totalAssets > 0 ? (fixedAssets / totalAssets) * 100 : 0,
      marketShare:
        totalAssets > 0 ? ((stocks + funds + gold) / totalAssets) * 100 : 0,
    };
  }, [
    viewMode,
    cryptoCostBasis,
    usdtInfo.marketValue,
    holdings,
    nonCryptoLiquidCash,
    netWorth,
    isDark,
  ]);

  // Selected slice for interaction
  const [selectedCategory, setSelectedCategory] = useState<AllocationCategory | null>(null);

  // Emergency Runway & Cushion Roadmap Calculations
  const burn = Math.max(1, monthlyBurnRate);
  const emergencyRunwayMonths = burn > 0 ? nonCryptoLiquidCash / burn : 0;
  const target3Month = burn * 3;
  const target6Month = burn * 6;
  const cushionGap = Math.max(0, target3Month - nonCryptoLiquidCash);
  const cushionProgress = Math.min(100, (nonCryptoLiquidCash / target3Month) * 100);

  // Debt-to-Asset Leverage
  const leverageRatio =
    allocation.totalAssets > 0
      ? (Math.max(0, totalLiabilities) / allocation.totalAssets) * 100
      : 0;

  // Single asset concentration check
  const topAsset = allocation.categories[0];
  const isHighConcentration = topAsset && topAsset.share >= 60;

  return (
    <div className="space-y-4">
      {/* 1. Asset Distribution Donut Chart Card */}
      <div
        className="p-5 rounded-[24px] space-y-4 relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-[14px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Capital Allocation
            </h3>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Portfolio diversification across asset classes
            </p>
          </div>

          {/* Segmented View Switcher: Net Portfolio (Cost) vs Live Market */}
          <div
            className="flex items-center gap-1 p-0.5 rounded-xl border border-[var(--glass-border)] shrink-0"
            style={{ background: "var(--glass-fill)" }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setViewMode("net");
                setSelectedCategory(null);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: viewMode === "net" ? "var(--bg-elevated)" : "transparent",
                color: viewMode === "net" ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: viewMode === "net" ? "0 1px 3px var(--shadow-strength)" : "none",
                border: viewMode === "net" ? "1px solid var(--glass-border)" : "1px solid transparent",
              }}
            >
              Net Portfolio
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setViewMode("market");
                setSelectedCategory(null);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: viewMode === "market" ? "var(--bg-elevated)" : "transparent",
                color: viewMode === "market" ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: viewMode === "market" ? "0 1px 3px var(--shadow-strength)" : "none",
                border: viewMode === "market" ? "1px solid var(--glass-border)" : "1px solid transparent",
              }}
            >
              Live Market
            </button>
          </div>
        </div>

        {/* Donut Chart with Center Readout (Inner radius 76 for generous non-overlapping padding) */}
        <div className="h-56 relative flex items-center justify-center">
          {allocation.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation.categories}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={76}
                  outerRadius={98}
                  paddingAngle={3}
                  onClick={(entry: any) => {
                    triggerHaptic("light");
                    const found = allocation.categories.find(c => c.id === entry?.id || c.label === entry?.name);
                    setSelectedCategory(
                      selectedCategory?.id === found?.id ? null : (found || null)
                    );
                  }}
                  cursor="pointer"
                >
                  {allocation.categories.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.color}
                      stroke="var(--bg-base)"
                      strokeWidth={2}
                      opacity={
                        selectedCategory && selectedCategory.id !== entry.id
                          ? 0.4
                          : 1
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload as AllocationCategory;
                    return (
                      <div
                        className="px-3 py-2 rounded-xl backdrop-blur-xl shadow-lg border"
                        style={{
                          background: "var(--bg-elevated)",
                          borderColor: "var(--glass-border)",
                        }}
                      >
                        <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
                          {data.label}
                        </p>
                        <p className="text-[12px] font-semibold font-mono mt-0.5" style={{ color: "var(--text-primary)" }}>
                          {hideBalance ? "Rp ••••••••" : formatRupiah(data.value)} ({data.share.toFixed(1)}%)
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center">
              <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                No active assets recorded
              </p>
            </div>
          )}

          {/* Center Donut Hole Readout (Perfect vertical centering & breathing room) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span
              className="text-[9px] font-bold uppercase tracking-wider leading-none"
              style={{ color: "var(--text-tertiary)" }}
            >
              {selectedCategory
                ? selectedCategory.label
                : viewMode === "net"
                  ? "Net Portfolio"
                  : "Gross Market Value"}
            </span>
            <span
              className="text-[17px] font-semibold amount tracking-tight leading-none my-1.5"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance
                ? "Rp ••••••••"
                : formatRupiah(
                    selectedCategory
                      ? selectedCategory.value
                      : allocation.totalAssets,
                  )}
            </span>
            {selectedCategory ? (
              <span
                className="text-[10px] font-bold font-mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {selectedCategory.share.toFixed(1)}% of portfolio
              </span>
            ) : viewMode === "net" ? (
              <span
                className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full whitespace-nowrap leading-tight"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                {totalFloatingPnL >= 0 ? "+" : ""}
                {hideBalance ? "••••" : formatRupiah(totalFloatingPnL)} (
                {totalFloatingPct >= 0 ? "+" : ""}
                {totalFloatingPct.toFixed(1)}%) Floating
              </span>
            ) : (
              <span
                className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full leading-tight"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                Marked-to-Market
              </span>
            )}
          </div>
        </div>

        {/* Category Legend & Breakdown Deck */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--glass-border)]">
          {allocation.categories.map((cat) => {
            const isSel = selectedCategory?.id === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedCategory(isSel ? null : cat);
                }}
                className="p-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                style={{
                  background: isSel
                    ? isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.05)"
                    : "var(--glass-fill)",
                  border: isSel
                    ? "1px solid var(--text-primary)"
                    : "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span
                    className="text-[11px] font-bold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                    {hideBalance ? "••••" : formatRupiah(cat.value)}
                  </span>
                  <span className="font-bold text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {cat.share.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Floating Yield & Unrealized Performance Card */}
      <div
        className="p-5 rounded-[24px] space-y-3.5 relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Unrealized Performance
            </h3>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Floating capital gain across market holdings
            </p>
          </div>

          {onOpenValuation && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenValuation();
              }}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-[var(--glass-border)] cursor-pointer active:scale-95 transition-all"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-primary)",
              }}
            >
              <span>Realize P&L</span>
              <ArrowUpRight size={11} />
            </button>
          )}
        </div>

        {/* Performance Key Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className="p-3 rounded-2xl space-y-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Floating P&L
            </span>
            <p
              className="text-[16px] font-semibold amount tracking-tight leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance ? "••••" : `${totalFloatingPnL >= 0 ? "+" : ""}${formatRupiah(totalFloatingPnL)}`}
            </p>
            <div className="flex items-center gap-1 pt-0.5">
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                  color: "var(--text-primary)",
                }}
              >
                {totalFloatingPct >= 0 ? "+" : ""}{totalFloatingPct.toFixed(1)}% ROI
              </span>
            </div>
          </div>

          <div
            className="p-3 rounded-2xl space-y-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Gross Valuation
            </span>
            <p
              className="text-[16px] font-semibold amount tracking-tight leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance ? "••••" : formatRupiah(totalInvestmentsMarketValue)}
            </p>
            <p
              className="text-[10px] font-medium truncate pt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Cost: {hideBalance ? "••••" : formatRupiah(cryptoCostBasis + otherHoldingsCostBasis)}
            </p>
          </div>
        </div>

        {/* Mini Visual Spread Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
            <span>Capital Expansion Ratio</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {(1 + (Math.max(0, totalFloatingPct) / 100)).toFixed(2)}x
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div
              className="h-full bg-white/40"
              style={{ width: `${Math.min(100, (100 / Math.max(100, 100 + totalFloatingPct)) * 100)}%` }}
              title="Cost Basis"
            />
            <div
              className="h-full bg-white"
              style={{ width: `${Math.min(100, (Math.max(0, totalFloatingPct) / Math.max(100, 100 + totalFloatingPct)) * 100)}%` }}
              title="Floating Gain"
            />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--text-tertiary)] pt-0.5">
            <span>Invested Cost Basis (100%)</span>
            <span>Floating Gain (+{totalFloatingPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* 3. Risk & Volatility Exposure Profile Card */}
      <div
        className="p-5 rounded-[24px] space-y-3.5 relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Risk & Volatility Profile
            </h3>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Capital distribution across volatility tiers
            </p>
          </div>
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Scale size={14} style={{ color: "var(--text-primary)" }} />
          </div>
        </div>

        {/* 2-Tier Breakdown */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Tier 1: Defensive */}
          <div
            className="p-3 rounded-2xl space-y-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Defensive & Liquid
              </span>
              <ShieldCheck size={12} style={{ color: "var(--text-secondary)" }} />
            </div>
            <p
              className="text-[15px] font-semibold amount tracking-tight leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance ? "••••" : formatRupiah(nonCryptoLiquidCash)}
            </p>
            <p className="text-[10px] font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
              {allocation.liquidShare.toFixed(1)}% of portfolio
            </p>
          </div>

          {/* Tier 2: Volatile / Growth */}
          <div
            className="p-3 rounded-2xl space-y-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Market Exposure
              </span>
              <Zap size={12} style={{ color: "var(--text-primary)" }} />
            </div>
            <p
              className="text-[15px] font-semibold amount tracking-tight leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance ? "••••" : formatRupiah(cryptoCostBasis + otherHoldingsCostBasis)}
            </p>
            <p className="text-[10px] font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
              {allocation.volatileShare.toFixed(1)}% of portfolio
            </p>
          </div>
        </div>

        {/* Dual Tone Segmented Bar */}
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${allocation.liquidShare}%`,
                background: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
              }}
              title="Defensive & Liquid"
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${allocation.volatileShare}%`,
                background: "var(--text-primary)",
              }}
              title="Market Volatile"
            />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--text-tertiary)] pt-0.5">
            <span>Defensive ({allocation.liquidShare.toFixed(1)}%)</span>
            <span>Market Volatile ({allocation.volatileShare.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Concentration Assessment Callout */}
        <div
          className="p-3 rounded-xl flex items-start gap-2.5"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="mt-0.5 shrink-0">
            {isHighConcentration ? (
              <ShieldAlert size={14} style={{ color: "var(--text-primary)" }} />
            ) : (
              <ShieldCheck size={14} style={{ color: "var(--text-primary)" }} />
            )}
          </div>
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold block" style={{ color: "var(--text-primary)" }}>
              {isHighConcentration
                ? `High Single-Asset Exposure (${topAsset?.label}: ${topAsset?.share.toFixed(1)}%)`
                : "Healthy Asset Diversification"}
            </span>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {isHighConcentration
                ? `Over 60% of capital is tied to ${topAsset?.label}. While benefiting from foreign currency strength, consider channeling upcoming income streams into liquid reserves to reduce portfolio drawdown exposure.`
                : "Capital is distributed across defensive cash and investment vehicles without excessive vulnerability to single-market downturns."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Simplified & User-Friendly Portfolio Holdings Card */}
      <div
        className="p-5 rounded-[24px] space-y-3 relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3
              className="text-[13px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Portfolio Holdings
            </h3>
            <span
              className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-tertiary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {allHoldings.length}
            </span>
          </div>

          {onOpenValuation && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenValuation();
              }}
              className="text-[11px] font-bold px-3 py-1 rounded-full active:scale-95 transition-transform cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              Manage
            </button>
          )}
        </div>

        {/* List of Holdings */}
        <div className="space-y-2 pt-0.5">
          {allHoldings.map((item) => {
            const isPositive = item.floatingPnL >= 0;
            return (
              <div
                key={item.symbol + item.name + item.id}
                onClick={() => {
                  if (onOpenValuation) {
                    triggerHaptic("light");
                    onOpenValuation();
                  }
                }}
                className="p-3 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-all"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {/* Left: Ticker & Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={item.icon || "TrendingUp"} size="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="font-semibold font-mono text-[11px] tracking-wide block leading-none"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.symbol}
                    </span>
                    <p
                      className="text-[11px] font-medium truncate mt-1 leading-tight"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {item.name}
                    </p>
                  </div>
                </div>

                {/* Right: Nominal Sekarang & Keuntungan/Rugi */}
                <div className="text-right shrink-0">
                  <span
                    className="amount font-semibold text-[13px] block leading-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {hideBalance ? "••••" : formatRupiah(item.marketValue)}
                  </span>
                  <span
                    className="text-[10px] font-mono font-bold mt-1 inline-block"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isPositive ? "+" : ""}
                    {hideBalance ? "••••" : formatRupiah(item.floatingPnL)} ({isPositive ? "+" : ""}
                    {item.floatingPnLPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Emergency Fund & Liquidity Cushion Roadmap Card */}
      <div
        className="p-5 rounded-[24px] space-y-3.5 relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Emergency Cushion Roadmap
            </h3>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Defensive cash moat relative to monthly burn ({hideBalance ? "••••" : formatRupiah(burn)}/mo)
            </p>
          </div>
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Target size={14} style={{ color: "var(--text-primary)" }} />
          </div>
        </div>

        {/* Stepped Cushion Targets */}
        <div className="grid grid-cols-3 gap-2">
          {/* 1 Month */}
          <div
            className="p-2.5 rounded-xl text-center space-y-1 transition-all"
            style={{
              background: emergencyRunwayMonths >= 1
                ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                : "var(--glass-fill)",
              border: emergencyRunwayMonths >= 1
                ? "1px solid var(--text-primary)"
                : "1px solid var(--glass-border)",
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
              1 Mo Basic
            </span>
            <p className="text-[11px] font-semibold amount" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "••••" : formatRupiah(burn * 1)}
            </p>
            <span className="text-[9px] font-bold block" style={{ color: emergencyRunwayMonths >= 1 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {emergencyRunwayMonths >= 1 ? "Achieved" : `${emergencyRunwayMonths.toFixed(1)}/1.0 mo`}
            </span>
          </div>

          {/* 3 Months */}
          <div
            className="p-2.5 rounded-xl text-center space-y-1 transition-all"
            style={{
              background: emergencyRunwayMonths >= 3
                ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                : "var(--glass-fill)",
              border: emergencyRunwayMonths >= 3
                ? "1px solid var(--text-primary)"
                : "1px solid var(--glass-border)",
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
              3 Mo Target
            </span>
            <p className="text-[11px] font-semibold amount" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "••••" : formatRupiah(target3Month)}
            </p>
            <span className="text-[9px] font-bold block" style={{ color: emergencyRunwayMonths >= 3 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {emergencyRunwayMonths >= 3 ? "Optimal" : `${cushionProgress.toFixed(0)}% funded`}
            </span>
          </div>

          {/* 6 Months */}
          <div
            className="p-2.5 rounded-xl text-center space-y-1 transition-all"
            style={{
              background: emergencyRunwayMonths >= 6
                ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
                : "var(--glass-fill)",
              border: emergencyRunwayMonths >= 6
                ? "1px solid var(--text-primary)"
                : "1px solid var(--glass-border)",
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
              6 Mo Fortified
            </span>
            <p className="text-[11px] font-semibold amount" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "••••" : formatRupiah(target6Month)}
            </p>
            <span className="text-[9px] font-bold block" style={{ color: emergencyRunwayMonths >= 6 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {emergencyRunwayMonths >= 6 ? "Fortified" : "Moat Target"}
            </span>
          </div>
        </div>

        {/* Progress Bar towards 3-month buffer */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
            <span>3-Month Cushion Progress</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {cushionProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${cushionProgress}%`,
                background: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Shortfall or Success Message */}
        <div
          className="p-3 rounded-xl"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {cushionGap > 0 ? (
              <>
                <strong>Cushion Gap:</strong> An additional{" "}
                <strong className="text-[var(--text-primary)]">{hideBalance ? "••••" : formatRupiah(cushionGap)}</strong> in liquid cash is needed to reach the recommended 3-month living cushion.
              </>
            ) : (
              <>
                <strong>Safety Moat Secured:</strong> You have {emergencyRunwayMonths.toFixed(1)} months of emergency cash. Further surplus cash can be safely deployed into investments.
              </>
            )}
          </p>
        </div>
      </div>

      {/* 6. Liquidity & Capital Health Matrix */}
      <div className="grid grid-cols-2 gap-3">
        {/* Emergency Runway */}
        <div
          className="p-4 rounded-[22px] space-y-2 relative"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Emergency Runway
            </span>
            <Clock size={13} style={{ color: "var(--text-tertiary)" }} />
          </div>

          <p
            className="text-[22px] font-semibold tracking-tight leading-none amount"
            style={{ color: "var(--text-primary)" }}
          >
            {emergencyRunwayMonths.toFixed(1)} <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">Months</span>
          </p>

          <p className="text-[11px] leading-tight" style={{ color: "var(--text-secondary)" }}>
            {emergencyRunwayMonths >= 6
              ? "Fortified buffer (6+ mo burn covered)"
              : emergencyRunwayMonths >= 3
              ? "Optimal safety buffer (3-6 mo burn covered)"
              : "Tight liquidity buffer (<3 mo burn covered)"}
          </p>

          {/* Runway Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (emergencyRunwayMonths / 6) * 100)}%`,
                background: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Liquidity Ratio */}
        <div
          className="p-4 rounded-[22px] space-y-2 relative"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Liquidity Ratio
            </span>
            <Coins size={13} style={{ color: "var(--text-tertiary)" }} />
          </div>

          <p
            className="text-[22px] font-semibold tracking-tight leading-none amount"
            style={{ color: "var(--text-primary)" }}
          >
            {allocation.liquidShare.toFixed(1)}%
          </p>

          <p className="text-[11px] leading-tight" style={{ color: "var(--text-secondary)" }}>
            {allocation.liquidShare >= 50
              ? "High agility · Readily accessible capital"
              : "Asset heavy · Capital tied to market holdings"}
          </p>

          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] pt-1">
            <span>Liquid: {allocation.liquidShare.toFixed(0)}%</span>
            <span>Market: {allocation.volatileShare.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 7. Actionable Wealth Intelligence */}
      <div
        className="p-4 rounded-[22px] space-y-2.5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} style={{ color: "var(--text-primary)" }} />
          <h4 className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
            Wealth Intelligence & Insights
          </h4>
        </div>

        <div className="space-y-2 text-[11px] leading-relaxed">
          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Currency Resilience:</strong> USDT & foreign-denominated holdings comprise{" "}
              {allocation.categories.find((c) => c.id === "crypto")?.share.toFixed(1) || 0}% of your total portfolio, offering a powerful hedge against local currency depreciation.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 opacity-70"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Solvency & Leverage:</strong> Total liabilities represent{" "}
              {leverageRatio.toFixed(1)}% of gross asset valuation (healthy threshold is &lt;30%).
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 opacity-50"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Capital Agility:</strong> Your emergency liquid capital provides{" "}
              {emergencyRunwayMonths.toFixed(1)} months of burn protection without requiring forced asset liquidation.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 opacity-30"
              style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
            />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Strategic Allocation:</strong>{" "}
              {cushionGap > 0
                ? "Prioritize funneling the next monthly surpluses into liquid cash to fortify your 3-month defense cushion before expanding high-volatility holdings."
                : "Your defensive foundation is secure. Surplus capital can be systematically deployed via DCA into yield-generating market assets."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
