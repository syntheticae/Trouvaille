import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ShieldCheck,
  TrendingUp,
  Coins,
  Home,
  Clock,
  Sparkles,
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
  monthlyBurnRate = 3500000,
  hideBalance = false,
  onOpenValuation,
}: AssetAnalyticsSectionProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const { liquidCapital, totalLiabilities } = useWalletBalances();

  // Retrieve saved market holdings & fixed assets
  const holdings = useMemo(() => getSavedHoldings(), []);

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
  }, []);

  const usdtValuation = usdtInfo.marketValue;

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

  // Calculate Asset Allocation by Tier
  const allocation = useMemo(() => {
    let stocks = 0;
    let crypto = usdtValuation;
    let gold = 0;
    let funds = 0;
    let fixedAssets = 0;

    holdings.forEach((h) => {
      const val = calculateHoldingValuation(h);
      if (h.asset_type === "stock") stocks += val.marketValue;
      else if (h.asset_type === "crypto") crypto += val.marketValue;
      else if (h.asset_type === "gold") gold += val.marketValue;
      else if (h.asset_type === "mutual_fund" || h.asset_type === "bond") funds += val.marketValue;
      else if (h.asset_type === "fixed_asset") fixedAssets += val.marketValue;
    });

    const liquidCash = Math.max(0, liquidCapital);
    const totalAssets = liquidCash + crypto + stocks + gold + funds + fixedAssets;

    const rawCategories = [
      {
        id: "liquid",
        label: "Liquid Cash & Bank",
        value: liquidCash,
        color: isDark ? "#ffffff" : "#09090c",
        icon: Coins,
      },
      {
        id: "crypto",
        label: "Crypto & USDT",
        value: crypto,
        color: isDark ? "rgba(255, 255, 255, 0.72)" : "rgba(0, 0, 0, 0.65)",
        icon: Sparkles,
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
      liquidShare: totalAssets > 0 ? ((liquidCash + crypto) / totalAssets) * 100 : 0,
      illiquidShare: totalAssets > 0 ? (fixedAssets / totalAssets) * 100 : 0,
      marketShare: totalAssets > 0 ? ((stocks + funds + gold) / totalAssets) * 100 : 0,
    };
  }, [liquidCapital, usdtValuation, holdings, isDark]);

  // Selected slice for interaction
  const [selectedCategory, setSelectedCategory] = useState<AllocationCategory | null>(null);

  // Emergency Runway Calculations
  const burn = Math.max(1, monthlyBurnRate);
  const emergencyRunwayMonths = allocation.totalAssets > 0
    ? (liquidCapital / burn)
    : 0;

  // Debt-to-Asset Leverage
  const leverageRatio = allocation.totalAssets > 0
    ? (Math.max(0, totalLiabilities) / allocation.totalAssets) * 100
    : 0;

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
              className="text-[14px] font-extrabold tracking-tight"
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
          <span
            className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {allocation.categories.length} Asset Classes
          </span>
        </div>

        {/* Donut Chart with Center Readout */}
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
                  innerRadius={68}
                  outerRadius={95}
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
                        <p className="text-[12px] font-extrabold font-mono mt-0.5" style={{ color: "var(--text-primary)" }}>
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

          {/* Center Donut Hole Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span
              className="text-[9.5px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {selectedCategory ? selectedCategory.label : "Gross Assets"}
            </span>
            <span
              className="text-[16px] font-extrabold amount tracking-tight leading-tight mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {hideBalance
                ? "Rp ••••••••"
                : formatRupiah(
                    selectedCategory
                      ? selectedCategory.value
                      : allocation.totalAssets
                  )}
            </span>
            <span
              className="text-[10px] font-bold font-mono mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {selectedCategory
                ? `${selectedCategory.share.toFixed(1)}% of wealth`
                : "100% Total"}
            </span>
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
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-extrabold font-mono" style={{ color: "var(--text-primary)" }}>
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

      {/* 2. Simplified & User-Friendly Portfolio Holdings Card */}
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
              className="text-[13.5px] font-bold"
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-bold font-mono text-[10.5px] px-1.5 py-0.5 rounded text-[var(--text-primary)]"
                        style={{ background: "var(--glass-fill-strong)" }}
                      >
                        {item.symbol}
                      </span>
                      <span
                        className="font-semibold text-[13px] truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <p
                      className="text-[10px] font-medium mt-0.5 truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Cost: {hideBalance ? "••••" : formatRupiah(item.costBasis)}
                    </p>
                  </div>
                </div>

                {/* Right: Nominal Sekarang & Keuntungan/Rugi */}
                <div className="text-right shrink-0">
                  <span
                    className="amount font-extrabold text-[13.5px] block leading-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {hideBalance ? "••••" : formatRupiah(item.marketValue)}
                  </span>
                  <span
                    className="text-[9.5px] font-mono font-bold mt-1 inline-block"
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

      {/* 3. Liquidity & Capital Health Matrix */}
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
            className="text-[22px] font-extrabold tracking-tight leading-none amount"
            style={{ color: "var(--text-primary)" }}
          >
            {emergencyRunwayMonths.toFixed(1)} <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">Months</span>
          </p>

          <p className="text-[10.5px] leading-tight" style={{ color: "var(--text-secondary)" }}>
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
            className="text-[22px] font-extrabold tracking-tight leading-none amount"
            style={{ color: "var(--text-primary)" }}
          >
            {allocation.liquidShare.toFixed(1)}%
          </p>

          <p className="text-[10.5px] leading-tight" style={{ color: "var(--text-secondary)" }}>
            {allocation.liquidShare >= 50
              ? "High agility · Readily accessible capital"
              : "Asset heavy · Capital locked in long-term"}
          </p>

          <div className="flex justify-between text-[9.5px] text-[var(--text-tertiary)] pt-1">
            <span>Liquid: {allocation.liquidShare.toFixed(0)}%</span>
            <span>Fixed: {allocation.illiquidShare.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 3. Actionable Wealth Intelligence */}
      <div
        className="p-4 rounded-[22px] space-y-2.5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} style={{ color: "var(--text-primary)" }} />
          <h4 className="text-[12.5px] font-bold" style={{ color: "var(--text-primary)" }}>
            Portfolio Insights
          </h4>
        </div>

        <div className="space-y-2 text-[11.5px] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Currency Resilience:</strong> USDT & foreign denominated holdings comprise{" "}
              {allocation.categories.find((c) => c.id === "crypto")?.share.toFixed(1) || 0}% of your total portfolio, offering a hedge against local currency volatility.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 shrink-0" />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Solvency & Leverage:</strong> Total liabilities represent{" "}
              {leverageRatio.toFixed(1)}% of gross asset valuation (healthy threshold is &lt;30%).
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
            <p style={{ color: "var(--text-secondary)" }}>
              <strong>Capital Agility:</strong> Your emergency liquid capital provides{" "}
              {emergencyRunwayMonths.toFixed(1)} months of burn protection without requiring forced asset liquidation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
