import { useState, useMemo, useEffect } from "react";
import { X, Coins, Sparkles, Calendar, Wallet as WalletIcon } from "lucide-react";
import { GlassSelect, type GlassSelectOption } from "../ui/GlassSelect";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAddTransaction } from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import { syncTransactionWithHolding } from "../../lib/holdingSyncEngine";
import { format, subDays } from "date-fns";
import type { Wallet } from "../../lib/types";

export type StakingInputMode = "amount" | "apy";

interface StakingYieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdingSymbol?: string;
  holdingUnits: number;
  liveRate: number;
  wallets: Wallet[];
  defaultWalletId?: string;
  userId?: string;
  onSuccess?: () => void;
}

export function StakingYieldModal({
  isOpen,
  onClose,
  holdingSymbol = "USDT",
  holdingUnits,
  liveRate,
  wallets,
  defaultWalletId,
  userId,
  onSuccess,
}: StakingYieldModalProps) {
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const addTx = useAddTransaction();
  const { data: categories = [] } = useCategories();

  // State: Default to "amount" (Nominal USDT) as it represents 90% of user use cases
  const [inputMode, setInputMode] = useState<StakingInputMode>("amount");
  const [amountInput, setAmountInput] = useState<string>("0.15");
  const [apyInput, setApyInput] = useState<string>("8.5");
  const [noteInput, setNoteInput] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [isYesterday, setIsYesterday] = useState(false);

  // Default target wallet to USDT / crypto wallet
  useEffect(() => {
    if (defaultWalletId) {
      setSelectedWalletId(defaultWalletId);
    } else {
      const cryptoW = wallets.find(
        (w) =>
          w.name.toLowerCase().includes("usdt") ||
          w.name.toLowerCase().includes("crypto") ||
          w.classification === "investment",
      );
      setSelectedWalletId(cryptoW?.id || wallets[0]?.id || "");
    }
  }, [defaultWalletId, wallets]);

  // Wallet options for luxury GlassSelect
  const walletOptions: GlassSelectOption[] = useMemo(() => {
    return wallets.map((w) => ({
      value: w.id,
      label: w.name,
      sublabel: w.classification || "wallet",
      icon: w.icon,
      badge: w.name.toUpperCase().includes("USDT") ? "Crypto" : undefined,
    }));
  }, [wallets]);

  // Compute calculated units and IDR amount
  const { finalUnits, finalIdr } = useMemo(() => {
    const rate = liveRate > 0 ? liveRate : 16415;

    if (inputMode === "apy") {
      const apy = parseFloat(apyInput) || 0;
      if (apy <= 0 || holdingUnits <= 0) return { finalUnits: 0, finalIdr: 0 };
      // Daily yield from APY: (units * (apy / 100)) / 365
      const dailyYield = (holdingUnits * (apy / 100)) / 365;
      const idr = Math.round(dailyYield * rate);
      return {
        finalUnits: Number(dailyYield.toFixed(4)),
        finalIdr: idr,
      };
    } else {
      const val = parseFloat(amountInput) || 0;
      if (val <= 0) return { finalUnits: 0, finalIdr: 0 };
      return {
        finalUnits: Number(val.toFixed(4)),
        finalIdr: Math.round(val * rate),
      };
    }
  }, [inputMode, apyInput, amountInput, holdingUnits, liveRate]);

  if (!isOpen) return null;

  const handleSetToday = () => {
    triggerHaptic("light");
    setIsYesterday(false);
    setDateInput(format(new Date(), "yyyy-MM-dd"));
  };

  const handleSetYesterday = () => {
    triggerHaptic("light");
    setIsYesterday(true);
    setDateInput(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const handleConfirm = () => {
    if (finalUnits <= 0 || finalIdr <= 0) {
      showToast(
        isIndonesian ? "Masukkan nominal yield yang valid" : "Please enter a valid yield amount",
        "delete",
        () => {},
      );
      return;
    }

    triggerHaptic("medium");

    // Resolve category
    const incomeCat =
      categories.find(
        (c) =>
          c.type === "income" &&
          (c.name.toLowerCase().includes("invest") ||
            c.name.toLowerCase().includes("passive") ||
            c.name.toLowerCase().includes("yield") ||
            c.name.toLowerCase().includes("bunga") ||
            c.name.toLowerCase().includes("lain")),
      ) || categories.find((c) => c.type === "income");

    const smartNote =
      noteInput.trim() ||
      (inputMode === "apy"
        ? `Staking Yield (${apyInput}% APY · Harian)`
        : `Staking Yield (${finalUnits} ${holdingSymbol})`);

    const newTxId = `tx-staking-${Date.now()}`;
    const txPayload = {
      id: newTxId,
      user_id: userId || "",
      wallet_id: selectedWalletId,
      category_id: incomeCat?.id || null,
      type: "income" as const,
      amount: finalIdr,
      occurred_on: dateInput,
      note: smartNote,
      customUnits: finalUnits,
      customPrice: liveRate,
    };

    // 1. Record income transaction in the ledger
    addTx.mutate({
      wallet_id: selectedWalletId,
      category_id: incomeCat?.id || null,
      type: "income",
      amount: finalIdr,
      occurred_on: dateInput,
      note: smartNote,
    });

    // 2. Synchronize holding units
    syncTransactionWithHolding(txPayload, wallets, userId);

    showToast(
      isIndonesian
        ? `Berhasil mencatat yield +${finalUnits} ${holdingSymbol} (+${formatRupiah(finalIdr)})`
        : `Staking yield recorded: +${finalUnits} ${holdingSymbol} (+${formatRupiah(finalIdr)})`,
      "add",
      () => {},
    );

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-[28px] sm:rounded-2xl p-5 pb-[max(calc(env(safe-area-inset-bottom,0px)+16px),20px)] sm:pb-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[92dvh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Coins size={17} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
                {isIndonesian ? "Catat Imbal Hasil Staking" : "Record Staking Yield"}
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {isIndonesian
                  ? `Kredit yield otomatis ke ${holdingSymbol} & saldo kas`
                  : `Auto-credit yield to ${holdingSymbol} & cash balance`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* 1. Ultra-Minimalist Hero Yield Display */}
        <div
          className="p-4 rounded-2xl text-center space-y-1 relative overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <Sparkles size={11} strokeWidth={2} />
            <span>{isIndonesian ? "Imbal Hasil Masuk" : "Yield Credit"}</span>
          </div>

          <p className="text-[28px] font-bold font-mono tracking-tight text-[var(--text-primary)] leading-tight">
            +{finalUnits > 0 ? finalUnits.toFixed(4) : "0.0000"}{" "}
            <span className="text-[14px] font-sans font-semibold text-[var(--text-secondary)]">
              {holdingSymbol}
            </span>
          </p>

          <p className="text-[12px] font-medium text-[var(--text-tertiary)] font-mono">
            ≈ {formatRupiah(finalIdr)}{" "}
            <span className="text-[10px] text-[var(--text-tertiary)] opacity-70">
              (@ {formatRupiah(liveRate)})
            </span>
          </p>
        </div>

        {/* 2. Simplified 2-Way Input Switcher */}
        <div className="space-y-2">
          <div
            className="p-1 rounded-xl flex items-center gap-1"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setInputMode("amount");
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                inputMode === "amount"
                  ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isIndonesian ? "Nominal USDT" : "USDT Amount"}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setInputMode("apy");
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                inputMode === "apy"
                  ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isIndonesian ? "Estimasi APY (%)" : "Estimated APY (%)"}
            </button>
          </div>

          {/* Mode 1: Direct USDT Amount */}
          {inputMode === "amount" ? (
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.15"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[15px] font-mono font-semibold outline-none transition-colors"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-mono font-bold text-[var(--text-tertiary)]">
                  {holdingSymbol}
                </span>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {["0.05", "0.10", "0.25", "0.50", "1.00", "2.50"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setAmountInput(val);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-medium shrink-0 transition-all cursor-pointer border ${
                      amountInput === val
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-white/[0.04] text-[var(--text-secondary)] border-white/[0.08] hover:bg-white/[0.08]"
                    }`}
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Mode 2: Annual APY Percentage */
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={apyInput}
                  onChange={(e) => setApyInput(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="8.5"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[15px] font-mono font-semibold outline-none transition-colors"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-mono font-bold text-[var(--text-tertiary)]">
                  % APY
                </span>
              </div>

              {/* Quick APY Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {["5.0", "7.5", "8.5", "10.0", "12.0", "15.0"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setApyInput(val);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-medium shrink-0 transition-all cursor-pointer border ${
                      apyInput === val
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-white/[0.04] text-[var(--text-secondary)] border-white/[0.08] hover:bg-white/[0.08]"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Target Wallet Selector */}
        <div className="space-y-1">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5 flex items-center gap-1">
            <WalletIcon size={11} strokeWidth={1.75} />
            <span>{isIndonesian ? "Dompet Penerima" : "Credited Wallet"}</span>
          </label>
          <GlassSelect
            value={selectedWalletId}
            onChange={(val) => setSelectedWalletId(val)}
            options={walletOptions}
            placeholder={isIndonesian ? "Pilih Dompet" : "Select Wallet"}
          />
        </div>

        {/* 4. Smart Date Chips & Custom Date */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1">
              <Calendar size={11} strokeWidth={1.75} />
              <span>{isIndonesian ? "Tanggal Imbal Hasil" : "Yield Date"}</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSetToday}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer border ${
                  !isYesterday
                    ? "bg-white text-black font-semibold border-white"
                    : "bg-white/[0.04] text-[var(--text-secondary)] border-white/[0.08]"
                }`}
              >
                {isIndonesian ? "Hari Ini" : "Today"}
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer border ${
                  isYesterday
                    ? "bg-white text-black font-semibold border-white"
                    : "bg-white/[0.04] text-[var(--text-secondary)] border-white/[0.08]"
                }`}
              >
                {isIndonesian ? "Kemarin" : "Yesterday"}
              </button>
            </div>
          </div>

          <input
            type="date"
            value={dateInput}
            onChange={(e) => {
              setDateInput(e.target.value);
              setIsYesterday(false);
            }}
            className="w-full px-3 py-2 rounded-xl text-[12px] font-medium outline-none transition-colors"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* 5. Optional Note */}
        <div className="space-y-1">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder={isIndonesian ? "Catatan tambahan (opsional)..." : "Note (optional)..."}
            className="w-full px-3 py-2 rounded-xl text-[12px] font-medium outline-none transition-colors"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* 6. One-Tap Action Confirmation */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {isIndonesian ? "Batal" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[2] py-2.5 rounded-xl text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
            }}
          >
            {isIndonesian ? "Catat Imbal Hasil" : "Record Yield"}
          </button>
        </div>
      </div>
    </div>
  );
}
