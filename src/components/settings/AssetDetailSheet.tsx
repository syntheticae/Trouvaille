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
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { GlassSelect, type GlassSelectOption } from "../ui/GlassSelect";
import { formatRupiah, formatHoldingUnits } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useWallets } from "../../hooks/useWallets";
import { useAddTransaction, useAllTransactions } from "../../hooks/useTransactions";
import { isInvestmentOrCryptoWallet } from "../../lib/holdingSyncEngine";
import {
  recordHoldingActivity,
  undoHoldingActivity,
  setHoldingDirectUnits,
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

const getTypeBadge = (type: AssetType, isIndonesian: boolean): string => {
  const badges: Record<AssetType, { en: string; id: string }> = {
    crypto: { en: "Crypto", id: "Kripto" },
    stock: { en: "Equities", id: "Saham" },
    gold: { en: "Gold 24K", id: "Emas 24K" },
    mutual_fund: { en: "Mutual Fund", id: "Reksa Dana" },
    bond: { en: "Government Bond", id: "Surat Berharga Negara" },
    fixed_asset: { en: "Fixed Asset", id: "Aset Tetap" },
  };
  return isIndonesian ? badges[type]?.id || type : badges[type]?.en || type;
};

const getStockRangeLabel = (range: string, isIndonesian: boolean): string => {
  const labels: Record<string, { en: string; id: string }> = {
    "1D": { en: "Past Day", id: "1 Hari Terakhir" },
    "1W": { en: "Past Week", id: "1 Minggu Terakhir" },
    "1M": { en: "Past Month", id: "1 Bulan Terakhir" },
    "6M": { en: "Past 6 Months", id: "6 Bulan Terakhir" },
    YTD: { en: "Year to Date", id: "Awal Tahun Hingga Kini" },
    "1Y": { en: "Past 1 Year", id: "1 Tahun Terakhir" },
    ALL: { en: "All Time", id: "Semua Waktu" },
  };
  return isIndonesian ? labels[range]?.id || range : labels[range]?.en || range;
};

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: "6px 10px",
        boxShadow: "0 8px 24px var(--shadow-strength)",
      }}
    >
      <p style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}>
        {formatRupiah(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
};

function formatAxisY(val: number): string {
  if (Math.abs(val) >= 1000000000) return (val / 1000000000).toFixed(1) + "B";
  if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + "M";
  if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + "K";
  return String(val);
}

export function AssetDetailSheet({
  isOpen,
  onClose,
  holding,
  onHoldingUpdated,
  onDeleteHolding,
  onStartEditHolding,
}: AssetDetailSheetProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const { data: wallets = [] } = useWallets();
  const addTx = useAddTransaction();

  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "6M" | "YTD" | "1Y" | "ALL">("1M");

  // Buy / Sell action modal states
  const [actionModal, setActionModal] = useState<"none" | "buy" | "sell">("none");
  const [modalPriceMode, setModalPriceMode] = useState<"auto" | "custom">("auto");
  const [inputNominal, setInputNominal] = useState<string>("");
  const [inputUnits, setInputUnits] = useState<string>("");
  const [inputPrice, setInputPrice] = useState<string>("");
  const [inputDate, setInputDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [inputNote, setInputNote] = useState<string>("");
  const [linkToWallet, setLinkToWallet] = useState<boolean>(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  // Direct Unit Balance Correction modal states
  const [isEditingDirectUnits, setIsEditingDirectUnits] = useState<boolean>(false);
  const [directUnitsInput, setDirectUnitsInput] = useState<string>("");

  // Valuation computations
  const valuation = useMemo(() => {
    if (!holding) return null;
    return calculateHoldingValuation(holding);
  }, [holding]);

  const { data: allTxs = [] } = useAllTransactions();

  // Position history activities with smart transaction bridge
  const activities: HoldingActivity[] = useMemo(() => {
    if (!holding) return [];
    const directActivities = getHoldingActivities(holding);
    const isUsdt =
      holding.symbol?.toUpperCase() === "USDT" ||
      holding.id.startsWith("usdt-");

    const cryptoWallets = wallets.filter(isInvestmentOrCryptoWallet);
    const cryptoWalletIds = new Set(cryptoWallets.map((w) => w.id));

    const linkedTxActivities: HoldingActivity[] = [];
    allTxs.forEach((tx) => {
      let isMatch = false;
      let actType: "buy" | "sell" = "buy";
      let note = tx.note || "";

      if (isUsdt) {
        if (tx.type === "income" && tx.wallet_id && cryptoWalletIds.has(tx.wallet_id)) {
          isMatch = true;
          actType = "buy";
          note = tx.note || "Staking Yield / Bunga";
        } else if (tx.to_wallet_id && cryptoWalletIds.has(tx.to_wallet_id)) {
          // Incoming to crypto wallet (transfer in or deposit)
          isMatch = true;
          actType = "buy";
          const fromW = wallets.find((w) => w.id === tx.wallet_id);
          note = tx.note || (fromW ? `Deposit dari ${fromW.name}` : "P2P Purchase / Deposit");
        } else if (tx.wallet_id && cryptoWalletIds.has(tx.wallet_id)) {
          // Outgoing from crypto wallet (transfer out to bank or expense)
          isMatch = true;
          actType = "sell";
          const toW = wallets.find((w) => w.id === tx.to_wallet_id);
          note = tx.note || (toW ? `Transfer ke ${toW.name}` : "P2P Withdrawal / Penarikan");
        }
      } else if (holding.symbol) {
        const sym = holding.symbol.toUpperCase();
        if (tx.note && tx.note.toUpperCase().includes(sym)) {
          isMatch = true;
          actType = tx.type === "expense" ? "sell" : "buy";
        }
      }

      if (isMatch) {
        // Try extracting specific execution rate from note first (e.g. "@ 16300", "Rate 16.350", "Kurs 16400")
        let rate: number | undefined = (tx as any).customPrice;
        if (!rate && tx.note) {
          const match = tx.note.match(/(?:rate|kurs|@)\s*[:=]?\s*([0-9.,]+)/i);
          if (match && match[1]) {
            const parsed = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
            if (!isNaN(parsed) && parsed > 1000) {
              rate = parsed;
            }
          }
        }
        // If not found in note, check if directActivities has an activity recorded for this transaction
        if (!rate) {
          const matchingDirect = directActivities.find(
            (d) => d.date === tx.occurred_on && Math.abs((d.total_amount || 0) - tx.amount) < 100,
          );
          if (matchingDirect && matchingDirect.price_per_unit > 0) {
            rate = matchingDirect.price_per_unit;
          }
        }
        // If still not found: for transactions from today, use holding.current_price;
        // for past historical transactions, use holding.avg_buy_price or baseline rate (16200 for USDT)
        // so that historical activities DO NOT change whenever today's market price fluctuates!
        if (!rate) {
          const isToday = tx.occurred_on === format(new Date(), "yyyy-MM-dd");
          rate = isToday
            ? holding.current_price || holding.avg_buy_price || 16400
            : holding.avg_buy_price || 16200;
        }

        const units =
          (tx as any).customUnits ||
          (rate > 0 ? Number((tx.amount / rate).toFixed(4)) : 0);

        linkedTxActivities.push({
          id: `tx-bridge-${tx.id}`,
          holding_id: holding.id,
          type: actType,
          date: tx.occurred_on,
          units: Math.abs(units),
          price_per_unit: rate,
          total_amount: tx.amount,
          note,
          created_at: tx.created_at || new Date().toISOString(),
        });
      }
    });

    // Merge and deduplicate by date & amount or ID
    const merged = [...directActivities];
    linkedTxActivities.forEach((linked) => {
      const alreadyHas = merged.some(
        (m) =>
          m.id === linked.id ||
          (m.date === linked.date && Math.abs(m.total_amount - linked.total_amount) < 100),
      );
      if (!alreadyHas) {
        merged.push(linked);
      }
    });

    // Remove synthetic initial if there are real activities
    const nonInitial = merged.filter((a) => !a.id.startsWith("act-initial-"));
    const finalActivities = nonInitial.length > 0 ? nonInitial : merged;
    return finalActivities.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [holding, allTxs, wallets]);

  // Chart data points
  const chartData = useMemo(() => {
    if (!holding) return [];
    return generateAssetHistoryCurve(holding, timeframe, holding.current_price);
  }, [holding, timeframe]);

  // Wallet options for custom luxury GlassSelect
  const walletOptions: GlassSelectOption[] = useMemo(() => {
    return wallets.map((w) => ({
      value: w.id,
      label: w.name,
      sublabel: w.classification || "wallet",
      icon: w.icon,
      badge: w.name.toUpperCase().includes("USDT") ? "Crypto" : undefined,
    }));
  }, [wallets]);

  if (!holding || !valuation) return null;

  const currentPrice = holding.current_price || holding.avg_buy_price;
  const isProfitable = valuation.floatingPnL >= 0;

  // Open Buy Action Modal with smart DCA auto-fill
  const handleOpenBuy = () => {
    triggerHaptic("light");
    setInputNominal("");
    setInputUnits("");
    setInputPrice(String(currentPrice));
    setModalPriceMode("auto");
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
    setModalPriceMode("auto");
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
          ? `Unit melebihi kepemilikan (${formatHoldingUnits(holding.units)} ${holding.symbol})`
          : `Units exceed current holding (${formatHoldingUnits(holding.units)} ${holding.symbol})`,
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
          ? `Berhasil membeli ${formatHoldingUnits(units)} ${holding.symbol}`
          : `Successfully bought ${formatHoldingUnits(units)} ${holding.symbol}`,
        "add",
        () => {},
      );
    } else {
      const pnlMsg = result.realizedPnL >= 0
        ? `+${formatRupiah(result.realizedPnL)}`
        : `-${formatRupiah(Math.abs(result.realizedPnL))}`;
      showToast(
        isIndonesian
          ? `Berhasil menjual ${formatHoldingUnits(units)} ${holding.symbol} (Realized P&L: ${pnlMsg})`
          : `Successfully sold ${formatHoldingUnits(units)} ${holding.symbol} (Realized P&L: ${pnlMsg})`,
        "update",
        () => {},
      );
    }
  };

  // Directly correct/set holding unit balance
  const handleSaveDirectUnits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holding) return;
    const parsed = parseFloat(directUnitsInput.replace(/,/g, "."));
    if (isNaN(parsed) || parsed < 0) {
      showToast(
        isIndonesian ? "Jumlah unit tidak valid" : "Invalid unit amount",
        "delete",
        () => {},
      );
      return;
    }
    triggerHaptic("medium");
    try {
      setHoldingDirectUnits(holding.id, parsed, user?.id, "Koreksi Saldo Manual");
      setIsEditingDirectUnits(false);
      onHoldingUpdated();
      showToast(
        isIndonesian
          ? `Saldo unit berhasil dipulihkan menjadi ${formatHoldingUnits(parsed)} ${holding.symbol}`
          : `Unit balance restored to ${formatHoldingUnits(parsed)} ${holding.symbol}`,
        "update",
        () => {},
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to update units", "delete", () => {});
    }
  };

  // Revert / Undo a recorded holding activity
  const handleUndoActivity = (act: HoldingActivity) => {
    if (!holding) return;
    triggerHaptic("medium");
    try {
      undoHoldingActivity(holding.id, act.id, user?.id, act);
      onHoldingUpdated();
      showToast(
        isIndonesian ? "Aktivitas berhasil dibatalkan. Saldo unit dipulihkan." : "Activity reverted. Unit balance restored.",
        "update",
        () => {},
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to revert activity", "delete", () => {});
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
                    {getTypeBadge(holding.asset_type, isIndonesian)}
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
                  title={isIndonesian ? "Ubah Aset" : "Edit Asset"}
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
                title={isIndonesian ? "Hapus Aset" : "Delete Asset"}
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

          {/* Performance Chart (Net Portfolio / Apple Stock Parity) */}
          <div className="pt-2 border-t border-[var(--glass-border)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                {getStockRangeLabel(timeframe, isIndonesian)} · {holding.currency || "IDR"}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                {isIndonesian ? "Langsung:" : "Live:"} {formatRupiah(currentPrice)} / unit
              </span>
            </div>

            {/* Apple Stock Pill Range Selector */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
              {(["1D", "1W", "1M", "6M", "YTD", "1Y", "ALL"] as const).map((r) => {
                const isActive = timeframe === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setTimeframe(r);
                      triggerHaptic("light");
                    }}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-all cursor-pointer select-none"
                    style={{
                      background: isActive
                        ? isDark
                          ? "rgba(255,255,255,0.25)"
                          : "#18181b"
                        : isDark
                          ? "transparent"
                          : "#f4f4f7",
                      color: isActive
                        ? "#FFFFFF"
                        : isDark
                          ? "rgba(255,255,255,0.55)"
                          : "#52525b",
                      border: isActive
                        ? isDark
                          ? "1px solid rgba(255,255,255,0.35)"
                          : "1px solid #18181b"
                        : isDark
                          ? "1px solid transparent"
                          : "1px solid rgba(0,0,0,0.04)",
                      boxShadow: isActive
                        ? isDark
                          ? "none"
                          : "0 2px 6px rgba(0,0,0,0.18)"
                        : "none",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {/* Chart with Right Y-Axis & Dotted Grid */}
            <div className="h-[125px] w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 0, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="assetHeroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={isDark ? "#FFFFFF" : "#18181b"}
                        stopOpacity={isDark ? 0.25 : 0.12}
                      />
                      <stop
                        offset="100%"
                        stopColor={isDark ? "#FFFFFF" : "#18181b"}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 3"
                    stroke={isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}
                    vertical={true}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                      fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
                      fontFamily: "Urbanist",
                      fontWeight: 600,
                    }}
                    axisLine={false}
                    tickLine={false}
                    dy={3}
                  />
                  <YAxis
                    orientation="right"
                    width={34}
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 9,
                      fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
                      fontFamily: "Urbanist",
                      fontWeight: 700,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatAxisY}
                    dx={-2}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isDark ? "#FFFFFF" : "#18181b"}
                    strokeWidth={2}
                    fill="url(#assetHeroGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: isDark ? "#FFFFFF" : "#18181b",
                      stroke: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                      strokeWidth: 1.5,
                    }}
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
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-[var(--text-tertiary)]">
                {isIndonesian ? "Unit Dimiliki" : "Units Owned"}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setDirectUnitsInput(String(holding.units));
                  setIsEditingDirectUnits(true);
                }}
                className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                title={isIndonesian ? "Koreksi / Pulihkan Saldo Unit" : "Correct / Restore Unit Balance"}
              >
                <Edit3 size={11} strokeWidth={1.75} />
              </button>
            </div>
            <div className="text-right font-mono">
              <span className="text-[13px] font-bold text-[var(--text-primary)]">
                {formatHoldingUnits(holding.units)} {holding.symbol}
              </span>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {isIndonesian ? "Basis biaya: " : "Cost basis: "}
                {formatRupiah(valuation.costBasis)}
              </p>
            </div>
          </div>

          {/* Row 2: Average Buy Price */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {isIndonesian ? "Harga Rata-rata" : "Average Price"}
            </span>
            <span className="text-[13px] font-bold text-[var(--text-primary)] font-mono">
              {formatRupiah(holding.avg_buy_price)}
            </span>
          </div>

          {/* Row 3: Current Market Price (Clean & Non-Cluttered) */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {isIndonesian ? "Harga Pasar" : "Market Price"}
            </span>
            <div className="text-right font-mono">
              <span className="text-[13px] font-bold text-[var(--text-primary)] block">
                {formatRupiah(currentPrice)}
              </span>
              <span className="text-[9.5px] font-mono text-[var(--text-tertiary)]">
                Live Market API
              </span>
            </div>
          </div>

          {/* Row 4: Unrealized Profit / Loss */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {isIndonesian ? "P&L Belum Terealisasi" : "Unrealized P&L"}
            </span>
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
            <span>{isIndonesian ? "Tambah Unit" : "Add Units"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSell}
            className="flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)] font-semibold text-[13px] hover:bg-white/[0.06] transition-all cursor-pointer active:scale-[0.99]"
          >
            <Minus size={14} strokeWidth={2} />
            <span>{isIndonesian ? "Kurangi Unit" : "Reduce Units"}</span>
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
              {activities.length} {isIndonesian ? "entri" : activities.length === 1 ? "entry" : "entries"}
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

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono">
                        <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {formatRupiah(act.total_amount)}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {isBuy ? "+" : "—"}
                          {act.units.toLocaleString()} {holding.symbol}
                        </p>
                      </div>

                      {act.type !== "initial" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUndoActivity(act);
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
                          title={isIndonesian ? "Batalkan aktivitas (Undo)" : "Revert activity (Undo)"}
                        >
                          <RotateCcw size={12.5} strokeWidth={1.75} />
                        </button>
                      )}
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
                      {actionModal === "buy"
                        ? isIndonesian
                          ? `Tambah Unit ${holding.symbol}`
                          : `Add ${holding.symbol} Units`
                        : isIndonesian
                          ? `Kurangi Unit ${holding.symbol}`
                          : `Reduce ${holding.symbol} Units`}
                    </h3>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {actionModal === "buy"
                        ? isIndonesian
                          ? "Tambahkan ke portofolio investasi"
                          : "Add to investment portfolio"
                        : isIndonesian
                          ? "Likuidasi posisi aset"
                          : "Liquidate asset position"}
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
                  {actionModal === "buy"
                    ? isIndonesian
                      ? "Nominal Investasi (IDR)"
                      : "Investment Amount (IDR)"
                    : isIndonesian
                      ? "Nominal Likuidasi (IDR)"
                      : "Liquidated Amount (IDR)"}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputNominal}
                  onChange={(e) => handleNominalChange(e.target.value)}
                  placeholder={isIndonesian ? "cth. 500000" : "e.g. 500000"}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                  autoFocus
                />
              </div>

              {/* Input 2: Units Received / Liquidated */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {actionModal === "buy"
                      ? isIndonesian
                        ? "Unit yang Ditambah"
                        : "Units to Add"
                      : isIndonesian
                        ? "Unit yang Dikurangi"
                        : "Units to Reduce"}
                  </label>
                  {actionModal === "sell" ? (
                    <button
                      type="button"
                      onClick={() => handleUnitsChange(String(holding.units))}
                      className="text-[10px] text-[var(--text-primary)] hover:underline cursor-pointer font-bold"
                    >
                      {isIndonesian ? `Maks: ${holding.units.toLocaleString()} (Semua)` : `Max: ${holding.units.toLocaleString()} (All)`}
                    </button>
                  ) : (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {isIndonesian ? "Dimiliki:" : "Hold:"} {holding.units.toLocaleString()}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputUnits}
                  onChange={(e) => handleUnitsChange(e.target.value)}
                  placeholder={isIndonesian ? `Jumlah unit dalam ${holding.symbol}` : `Units in ${holding.symbol}`}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              {/* Input 3: Price Per Unit with Auto (API) vs Custom Broker Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {isIndonesian ? "Harga Eksekusi per Unit" : "Execution Price per Unit"}
                  </label>
                  {/* Option: Auto (API) vs Broker Kustom */}
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/20 border border-[var(--glass-border)]">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setModalPriceMode("auto");
                        handlePriceChange(String(currentPrice));
                      }}
                      className={`px-2 py-0.5 rounded-md text-[9.5px] font-semibold transition-all cursor-pointer ${
                        modalPriceMode === "auto"
                          ? isDark
                            ? "bg-white text-black shadow-xs font-bold"
                            : "bg-black text-white shadow-xs font-bold"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      Auto (API)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setModalPriceMode("custom");
                      }}
                      className={`px-2 py-0.5 rounded-md text-[9.5px] font-semibold transition-all cursor-pointer ${
                        modalPriceMode === "custom"
                          ? isDark
                            ? "bg-white text-black shadow-xs font-bold"
                            : "bg-black text-white shadow-xs font-bold"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      {isIndonesian ? "Broker Kustom" : "Custom Broker"}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputPrice}
                    onChange={(e) => {
                      setModalPriceMode("custom");
                      handlePriceChange(e.target.value);
                    }}
                    placeholder={modalPriceMode === "auto" ? (isIndonesian ? "Harga pasar" : "Market price") : (isIndonesian ? "cth. 16350" : "e.g. 16350")}
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                  />
                  {modalPriceMode === "auto" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/[0.08] text-[var(--text-secondary)] border border-[var(--glass-border)] pointer-events-none">
                      {isIndonesian ? "Pasar Langsung" : "Live Spot"}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-[var(--text-tertiary)] px-0.5 mt-0.5">
                  {modalPriceMode === "auto"
                    ? (isIndonesian
                        ? "Dihitung otomatis berdasarkan harga pasar terkini (API)."
                        : "Calculated automatically based on latest market price (API).")
                    : (isIndonesian
                        ? "Harga disesuaikan dengan kurs broker atau transaksi riil Anda."
                        : "Customized according to your broker or P2P execution rate.")}
                </p>
              </div>

              {/* Input 4: Purchase / Execution Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
                  {isIndonesian ? "Tanggal" : "Date"}
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
                        {actionModal === "buy"
                          ? (isIndonesian ? "Potong dari Saldo Akun" : "Deduct from Account")
                          : (isIndonesian ? "Setor ke Saldo Akun" : "Deposit to Account")}
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
                    <GlassSelect
                      value={selectedWalletId}
                      onChange={setSelectedWalletId}
                      options={walletOptions}
                      placeholder={isIndonesian ? "Pilih akun..." : "Select account..."}
                      className="mt-2"
                    />
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
                  {isIndonesian ? "Batal" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-[13px] font-bold bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  {actionModal === "buy"
                    ? (isIndonesian ? "Konfirmasi Beli" : "Confirm Add")
                    : (isIndonesian ? "Konfirmasi Jual" : "Confirm Reduce")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. MODAL: DIRECT UNIT BALANCE CORRECTION / RESTORE */}
        {/* ============================================================ */}
        {isEditingDirectUnits && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <form
              onSubmit={handleSaveDirectUnits}
              className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                    <Edit3 size={15} className="text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                      {isIndonesian ? `Koreksi Saldo ${holding.symbol}` : `Correct ${holding.symbol} Balance`}
                    </h3>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {isIndonesian ? "Sesuaikan total unit ke saldo riil portofolio" : "Align total units to your actual portfolio balance"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingDirectUnits(false)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between px-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {isIndonesian ? "Total Unit Riil Baru" : "New Total Units"}
                  </label>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                    {isIndonesian ? "Saat ini:" : "Current:"} {holding.units.toLocaleString()} {holding.symbol}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={directUnitsInput}
                  onChange={(e) => setDirectUnitsInput(e.target.value)}
                  placeholder="e.g. 1002.41"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px] font-bold bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
                  autoFocus
                />
                <p className="text-[10px] text-[var(--text-tertiary)] px-0.5">
                  {isIndonesian
                    ? "Saldo unit akan langsung diperbarui dan disinkronkan ke cloud Supabase."
                    : "The unit balance will be immediately updated and synchronized to Supabase."}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDirectUnits(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)] font-semibold text-[13px] hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  {isIndonesian ? "Batal" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-elevated)] font-semibold text-[13px] hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  {isIndonesian ? "Simpan Saldo" : "Save Balance"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
