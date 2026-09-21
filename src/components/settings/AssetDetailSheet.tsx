import React, { useState, useMemo } from "react";
import {
  Plus,
  Minus,
  Edit3,
  Trash2,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useWallets } from "../../hooks/useWallets";
import { useAddTransaction } from "../../hooks/useTransactions";
import {
  recordHoldingActivity,
  getHoldingActivities,
  generateAssetHistoryCurve,
  calculateHoldingValuation,
} from "../../lib/marketPriceService";
import type { InvestmentHolding, HoldingActivity, AssetType } from "../../types";
import { format } from "date-fns";

interface AssetDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  holding: InvestmentHolding | null;
  onHoldingUpdated: () => void;
  onDeleteHolding: (id: string, name: string) => void;
  onStartEditHolding?: (holding: InvestmentHolding) => void;
}

const TYPE_BADGES: Record<AssetType, string> = {
  crypto: "Crypto",
  stock: "Equities",
  gold: "Gold 24K",
  mutual_fund: "Mutual Fund",
  bond: "Government Bond",
  fixed_asset: "Fixed Asset",
};

export function AssetDetailSheet({
  isOpen,
  onClose,
  holding,
  onHoldingUpdated,
  onDeleteHolding,
  onStartEditHolding,
}: AssetDetailSheetProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const { data: wallets = [] } = useWallets();
  const addTx = useAddTransaction();

  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "1Y" | "ALL">("1M");

  // Buy / Sell action modal states
  const [actionModal, setActionModal] = useState<"none" | "buy" | "sell">("none");
  const [inputNominal, setInputNominal] = useState<string>("");
  const [inputUnits, setInputUnits] = useState<string>("");
  const [inputPrice, setInputPrice] = useState<string>("");
  const [inputDate, setInputDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [inputNote, setInputNote] = useState<string>("");
  const [linkToWallet, setLinkToWallet] = useState<boolean>(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  // Valuation computations
  const valuation = useMemo(() => {
    if (!holding) return null;
    return calculateHoldingValuation(holding);
  }, [holding]);

  // Position history activities
  const activities: HoldingActivity[] = useMemo(() => {
    if (!holding) return [];
    return getHoldingActivities(holding);
  }, [holding]);

  // Chart data points
  const chartData = useMemo(() => {
    if (!holding) return [];
    return generateAssetHistoryCurve(holding, timeframe, holding.current_price);
  }, [holding, timeframe]);

  if (!holding || !valuation) return null;

  const currentPrice = holding.current_price || holding.avg_buy_price;
  const isProfitable = valuation.floatingPnL >= 0;

  // Open Buy Action Modal with smart DCA auto-fill
  const handleOpenBuy = () => {
    triggerHaptic("light");
    setInputNominal("");
    setInputUnits("");
    setInputPrice(String(currentPrice));
    setInputDate(format(new Date(), "yyyy-MM-dd"));
    setInputNote("DCA Purchase");
    setLinkToWallet(false);
    setSelectedWalletId(wallets[0]?.id || "");
    setActionModal("buy");
  };

  // Open Sell Action Modal
  const handleOpenSell = () => {
    triggerHaptic("light");
    setInputNominal("");
    setInputUnits("");
    setInputPrice(String(currentPrice));
    setInputDate(format(new Date(), "yyyy-MM-dd"));
    setInputNote("Position Sell");
    setLinkToWallet(false);
    setSelectedWalletId(wallets[0]?.id || "");
    setActionModal("sell");
  };

  // Dual-Input Smart Handler: When user types Invested Amount (IDR)
  const handleNominalChange = (valStr: string) => {
    setInputNominal(valStr);
    const nominal = parseFloat(valStr.replace(/[^0-9.]/g, ""));
    const price = parseFloat(inputPrice) || currentPrice;
    if (!isNaN(nominal) && nominal > 0 && price > 0) {
      const computedUnits = nominal / price;
      // Format units cleanly (e.g. 8 decimals for crypto, 4 for gold/stocks)
      const decimals = holding.asset_type === "crypto" ? 8 : holding.asset_type === "gold" ? 4 : 2;
      setInputUnits(Number(computedUnits.toFixed(decimals)).toString());
    } else {
      setInputUnits("");
    }
  };

  // Dual-Input Smart Handler: When user types Units
  const handleUnitsChange = (valStr: string) => {
    setInputUnits(valStr);
    const units = parseFloat(valStr);
    const price = parseFloat(inputPrice) || currentPrice;
    if (!isNaN(units) && units > 0 && price > 0) {
      const computedNominal = Math.round(units * price);
      setInputNominal(String(computedNominal));
    } else {
      setInputNominal("");
    }
  };

  // When user customizes the execution price
  const handlePriceChange = (valStr: string) => {
    setInputPrice(valStr);
    const price = parseFloat(valStr);
    const units = parseFloat(inputUnits);
    if (!isNaN(price) && price > 0 && !isNaN(units) && units > 0) {
      setInputNominal(String(Math.round(units * price)));
    }
  };

  // Confirm Buy or Sell execution
  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    const units = parseFloat(inputUnits);
    const price = parseFloat(inputPrice) || currentPrice;
    const totalAmount = parseFloat(inputNominal) || units * price;

    if (isNaN(units) || units <= 0) {
      showToast(
        isIndonesian ? "Jumlah unit harus lebih dari 0" : "Units must be greater than 0",
        "delete",
        () => {},
      );
      return;
    }

    if (actionModal === "sell" && units > holding.units) {
      showToast(
        isIndonesian
          ? `Unit melebihi kepemilikan (${holding.units.toLocaleString()} ${holding.symbol})`
          : `Units exceed current holding (${holding.units.toLocaleString()} ${holding.symbol})`,
        "delete",
        () => {},
      );
      return;
    }

    triggerHaptic("medium");

    const result = recordHoldingActivity(holding.id, {
      type: actionModal === "buy" ? "buy" : "sell",
      units,
      price_per_unit: price,
      total_amount: totalAmount,
      date: inputDate,
      note: inputNote || (actionModal === "buy" ? `Buy ${holding.symbol}` : `Sell ${holding.symbol}`),
    });

    // Optional: Record corresponding transaction in wallet
    if (linkToWallet && selectedWalletId) {
      addTx.mutate({
        type: actionModal === "buy" ? "expense" : "income",
        amount: totalAmount,
        category_id: null,
        wallet_id: selectedWalletId,
        occurred_on: inputDate,
        note: actionModal === "buy" ? `Invest: Buy ${holding.symbol}` : `Liquidate: Sell ${holding.symbol}`,
      });
    }

    setActionModal("none");
    onHoldingUpdated();

    if (actionModal === "buy") {
      showToast(
        isIndonesian
          ? `Berhasil membeli ${units} ${holding.symbol}`
          : `Successfully bought ${units} ${holding.symbol}`,
        "add",
        () => {},
      );
    } else {
      const pnlMsg = result.realizedPnL >= 0
        ? `+${formatRupiah(result.realizedPnL)}`
        : `-${formatRupiah(Math.abs(result.realizedPnL))}`;
      showToast(
        isIndonesian
          ? `Berhasil menjual ${units} ${holding.symbol} (Realized P&L: ${pnlMsg})`
          : `Successfully sold ${units} ${holding.symbol} (Realized P&L: ${pnlMsg})`,
        "update",
        () => {},
      );
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={holding.name}>
      <div className="px-5 sm:px-6 space-y-4 pb-[calc(env(safe-area-inset-bottom,16px)+28px)] pt-1 select-none">
        {/* ============================================================ */}
        {/* 1. HERO & BALANCE (Apple Luxury Minimalist) */}
        {/* ============================================================ */}
        <div className="p-5 rounded-2xl bg-[var(--glass-fill)] border border-[var(--glass-border)] shadow-[var(--shadow-card)] space-y-4">
          {/* Header Row: Icon, Asset Name/Type, Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                <IconRenderer icon={holding.icon || "TrendingUp"} size="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[var(--text-primary)] truncate">
                    {holding.symbol}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-[var(--text-secondary)] border border-[var(--glass-border)]">
                    {TYPE_BADGES[holding.asset_type] || holding.asset_type}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                  {holding.name}
                </p>
              </div>
            </div>

            {/* Actions: Edit / Delete */}
            <div className="flex items-center gap-1">
              {onStartEditHolding && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onStartEditHolding(holding);
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Edit Asset"
                >
                  <Edit3 size={14} strokeWidth={1.75} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("heavy");
                  onDeleteHolding(holding.id, holding.name);
                }}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Delete Asset"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Big Balance & Floating PnL */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              {isIndonesian ? "Total Nilai Pasar" : "Total Market Value"}
            </p>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="text-[26px] font-bold tracking-tight text-[var(--text-primary)] font-mono">
                {formatRupiah(valuation.marketValue)}
              </h2>
              <div
                className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold font-mono flex items-center gap-1 shrink-0 ${
                  isProfitable
                    ? "bg-white/[0.06] border-[var(--glass-border)] text-[var(--text-primary)]"
                    : "bg-white/[0.04] border-[var(--glass-border)] text-[var(--text-secondary)]"
                }`}
              >
                {isProfitable ? (
                  <ArrowUpRight size={13} strokeWidth={2} />
                ) : (
                  <ArrowDownRight size={13} strokeWidth={2} />
                )}
                <span>
                  {isProfitable ? "+" : ""}
                  {formatRupiah(valuation.floatingPnL)} ({isProfitable ? "+" : ""}
                  {valuation.floatingPnLPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Performance Sparkline Chart with Quiet Timeframes */}
          <div className="pt-2 border-t border-[var(--glass-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                Performance
              </span>
              <div className="flex items-center gap-1">
                {(["1D", "1W", "1M", "1Y", "ALL"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setTimeframe(tf);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                      timeframe === tf
                        ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="assetDetailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={isDark ? "#FFFFFF" : "#18181b"}
                        stopOpacity={isDark ? 0.22 : 0.12}
                      />
                      <stop
                        offset="100%"
                        stopColor={isDark ? "#FFFFFF" : "#18181b"}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] shadow-lg text-[11px] font-mono">
                            <p className="text-[var(--text-tertiary)] text-[9px] mb-0.5">{data.date}</p>
                            <p className="font-bold text-[var(--text-primary)]">
                              {formatRupiah(data.value)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isDark ? "rgba(255,255,255,0.8)" : "#18181b"}
                    strokeWidth={1.5}
                    fill="url(#assetDetailGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. KEY HOLDING METRICS (Apple Card List Style) */}
        {/* ============================================================ */}
        <div className="rounded-2xl bg-[var(--glass-fill)] border border-[var(--glass-border)] shadow-[var(--shadow-card)] overflow-hidden divide-y divide-[var(--glass-border)]">
          {/* Row 1: Units Owned */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">Units Owned</span>
            <div className="text-right font-mono">
              <span className="text-[13px] font-bold text-[var(--text-primary)]">
                {holding.units.toLocaleString()} {holding.symbol}
              </span>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Cost basis: {formatRupiah(valuation.costBasis)}
              </p>
            </div>
          </div>

          {/* Row 2: Average Buy Price */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">Average Price</span>
            <span className="text-[13px] font-bold text-[var(--text-primary)] font-mono">
              {formatRupiah(holding.avg_buy_price)}
            </span>
          </div>

          {/* Row 3: Current Market Price */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">Market Price</span>
            <span className="text-[13px] font-bold text-[var(--text-primary)] font-mono">
              {formatRupiah(currentPrice)}
            </span>
          </div>

          {/* Row 4: Unrealized Profit / Loss */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">Unrealized P&L</span>
            <div className="text-right font-mono">
              <span className="text-[13px] font-bold text-[var(--text-primary)]">
                {isProfitable ? "+" : ""}
                {formatRupiah(valuation.floatingPnL)}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] block">
                {isProfitable ? "+" : ""}
                {valuation.floatingPnLPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. PRIMARY ACTIONS: Add Units & Reduce Units */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleOpenBuy}
            className="flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-elevated)] font-semibold text-[13px] hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Units</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSell}
            className="flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)] font-semibold text-[13px] hover:bg-white/[0.06] transition-all cursor-pointer active:scale-[0.99]"
          >
            <Minus size={14} strokeWidth={2} />
            <span>Reduce Units</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 4. ACTIVITY HISTORY */}
        {/* ============================================================ */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {isIndonesian ? "Riwayat Aktivitas" : "Activity History"}
            </h3>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              {activities.length} {activities.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="space-y-1.5">
            {activities.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)] text-center text-[11px] text-[var(--text-tertiary)]">
                {isIndonesian ? "Belum ada riwayat transaksi" : "No activity recorded yet"}
              </div>
            ) : (
              activities.map((act) => {
                const isBuy = act.type === "buy" || act.type === "initial";
                return (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold ${
                          isBuy
                            ? "bg-white/[0.08] text-[var(--text-primary)] border border-[var(--glass-border)]"
                            : "bg-white/[0.04] text-[var(--text-secondary)] border border-[var(--glass-border)]"
                        }`}
                      >
                        {isBuy ? "+" : "—"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                            {act.type === "initial"
                              ? (isIndonesian ? "Saldo Awal" : "Initial Position")
                              : act.type === "buy"
                              ? (isIndonesian ? "Beli Unit" : "Add Units")
                              : (isIndonesian ? "Jual Unit" : "Reduce Units")}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                            {act.date}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                          @ {formatRupiah(act.price_per_unit)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {formatRupiah(act.total_amount)}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {isBuy ? "+" : "—"}
                        {act.units.toLocaleString()} {holding.symbol}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 6. MODAL: SMART DCA BUY / SELL FORM */}
        {/* ============================================================ */}
        {actionModal !== "none" && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <form
              onSubmit={handleConfirmAction}
              className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                    <IconRenderer icon={holding.icon || "TrendingUp"} size="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                      {actionModal === "buy" ? `Add ${holding.symbol} Units` : `Reduce ${holding.symbol} Units`}
                    </h3>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {actionModal === "buy" ? "Add to investment portfolio" : "Liquidate asset position"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionModal("none")}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              {/* Input 1: Invested / Realized Amount in IDR */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
                  {actionModal === "buy" ? "Investment Amount (IDR)" : "Liquidated Amount (IDR)"}
                </label>
                <input
                  type="text"
                  value={inputNominal}
                  onChange={(e) => handleNominalChange(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-mono bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                  autoFocus
                />
              </div>

              {/* Input 2: Units Received / Liquidated */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {actionModal === "buy" ? "Units to Add" : "Units to Reduce"}
                  </label>
                  {actionModal === "sell" ? (
                    <button
                      type="button"
                      onClick={() => handleUnitsChange(String(holding.units))}
                      className="text-[10px] font-mono text-[var(--text-primary)] hover:underline cursor-pointer font-bold"
                    >
                      Max: {holding.units.toLocaleString()} (All)
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                      Hold: {holding.units.toLocaleString()}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={inputUnits}
                  onChange={(e) => handleUnitsChange(e.target.value)}
                  placeholder={`Units in ${holding.symbol}`}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-mono bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              {/* Input 3: Price Per Unit (Auto-filled with Market Price) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
                  Execution Price per Unit (IDR)
                </label>
                <input
                  type="text"
                  value={inputPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="Market price"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-mono bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                />
                <p className="text-[10px] text-[var(--text-tertiary)] px-0.5 mt-0.5">
                  Calculated automatically based on the latest market price. You can customize this field.
                </p>
              </div>

              {/* Input 4: Purchase / Execution Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
                  Date
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              {/* Optional Wallet Synchronization */}
              {wallets.length > 0 && (
                <div className="pt-1">
                  <div
                    onClick={() => setLinkToWallet(!linkToWallet)}
                    className="p-3 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)] flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">
                        {actionModal === "buy" ? "Deduct from Wallet" : "Deposit to Wallet"}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        linkToWallet
                          ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-elevated)]"
                          : "border-[var(--glass-border)] opacity-40"
                      }`}
                    >
                      {linkToWallet && <Check size={11} strokeWidth={2.5} />}
                    </div>
                  </div>

                  {linkToWallet && (
                    <select
                      value={selectedWalletId}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                      className="w-full mt-2 px-3.5 py-2.5 rounded-xl text-[12px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal("none")}
                  className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-medium border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-bold bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  {actionModal === "buy" ? "Confirm Add" : "Confirm Reduce"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
