import { useState, useMemo, useEffect } from "react";
import { X, Coins } from "lucide-react";
import { GlassSelect, type GlassSelectOption } from "../ui/GlassSelect";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAddTransaction } from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import { syncTransactionWithHolding } from "../../lib/holdingSyncEngine";
import { format } from "date-fns";
import type { Wallet } from "../../lib/types";

export type StakingPeriod = "daily" | "weekly" | "monthly" | "annual";
export type StakingInputMode = "amount" | "percentage";
export type StakingCurrency = "USDT" | "IDR" | "USD";

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

const PERIOD_LABELS: Record<StakingPeriod, { en: string; id: string; divisor: number }> = {
  daily: { en: "Daily", id: "Harian", divisor: 365 },
  weekly: { en: "Weekly", id: "Mingguan", divisor: 52 },
  monthly: { en: "Monthly", id: "Bulanan", divisor: 12 },
  annual: { en: "Annual (APY)", id: "Tahunan (APY)", divisor: 1 },
};

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

  // State
  const [period, setPeriod] = useState<StakingPeriod>("daily");
  const [inputMode, setInputMode] = useState<StakingInputMode>("percentage");
  const [currency, setCurrency] = useState<StakingCurrency>("USDT");
  const [amountInput, setAmountInput] = useState<string>("0.15");
  const [percentageInput, setPercentageInput] = useState<string>("8.5");
  const [noteInput, setNoteInput] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

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

  // Compute calculated units and IDR amount
  const { finalUnits, finalIdr } = useMemo(() => {
    const rate = liveRate > 0 ? liveRate : 16415;

    if (inputMode === "percentage") {
      const pct = parseFloat(percentageInput) || 0;
      if (pct <= 0 || holdingUnits <= 0) return { finalUnits: 0, finalIdr: 0 };
      const divisor = PERIOD_LABELS[period].divisor;
      const annualYieldUnits = holdingUnits * (pct / 100);
      const periodYieldUnits = annualYieldUnits / divisor;
      const idr = Math.round(periodYieldUnits * rate);
      return {
        finalUnits: Number(periodYieldUnits.toFixed(4)),
        finalIdr: idr,
      };
    } else {
      const val = parseFloat(amountInput) || 0;
      if (val <= 0) return { finalUnits: 0, finalIdr: 0 };

      if (currency === "USDT" || currency === "USD") {
        return {
          finalUnits: Number(val.toFixed(4)),
          finalIdr: Math.round(val * rate),
        };
      } else {
        // IDR
        const units = val / rate;
        return {
          finalUnits: Number(units.toFixed(4)),
          finalIdr: Math.round(val),
        };
      }
    }
  }, [inputMode, percentageInput, amountInput, period, currency, holdingUnits, liveRate]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (finalUnits <= 0 || finalIdr <= 0) {
      showToast(
        isIndonesian ? "Masukkan yield yang valid" : "Please enter a valid yield amount",
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
      (inputMode === "percentage"
        ? `Staking Yield (${percentageInput}% APY · ${PERIOD_LABELS[period].en})`
        : `Staking Yield (${PERIOD_LABELS[period].en})`);

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

    // 1. Record income transaction
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div
        className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
              <Coins size={16} strokeWidth={1.75} className="text-[var(--text-primary)]" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                {isIndonesian ? "Catat Staking Yield" : "Record Staking Yield"}
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {isIndonesian
                  ? "Tambahkan yield ke saldo kas & unit holding"
                  : "Credit yield to wallet & increase holding units"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* 1. Periodicity Selector: Daily / Weekly / Monthly / Annual */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
            {isIndonesian ? "Frekuensi Yield" : "Yield Period / Frequency"}
          </label>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)]">
            {(["daily", "weekly", "monthly", "annual"] as StakingPeriod[]).map((p) => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setPeriod(p);
                  }}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                    isActive
                      ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isIndonesian ? PERIOD_LABELS[p].id : PERIOD_LABELS[p].en}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Calculation Mode Switcher: Fixed Amount vs Percentage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {isIndonesian ? "Metode Input" : "Input Mode"}
            </label>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              Holdings: {holdingUnits.toLocaleString()} {holdingSymbol}
            </span>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)]">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setInputMode("percentage");
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                inputMode === "percentage"
                  ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isIndonesian ? "Persentase (% APY)" : "Percentage (% APY)"}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setInputMode("amount");
              }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                inputMode === "amount"
                  ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isIndonesian ? "Nominal Langsung" : "Fixed Amount"}
            </button>
          </div>
        </div>

        {/* 3. Dynamic Inputs depending on mode */}
        {inputMode === "percentage" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {isIndonesian ? "Tingkat Bunga Tahunan (% APY)" : "Annual Yield Rate (% APY)"}
              </label>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                {PERIOD_LABELS[period].en} rate
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={percentageInput}
                onChange={(e) => setPercentageInput(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="e.g. 8.5"
                className="w-full px-3.5 py-2.5 rounded-xl text-[14px] font-mono bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-colors pr-10"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-mono font-bold text-[var(--text-tertiary)]">
                %
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {isIndonesian ? "Nominal Yield & Mata Uang" : "Yield Amount & Currency"}
              </label>
              <div className="flex items-center gap-1">
                {(["USDT", "IDR", "USD"] as StakingCurrency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCurrency(c);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      currency === c
                        ? "bg-[var(--text-primary)] text-[var(--bg-elevated)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={`Amount in ${currency}`}
              className="w-full px-3.5 py-2.5 rounded-xl text-[14px] font-mono bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-colors"
            />
          </div>
        )}

        {/* Computed Reward Preview Card */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--glass-border)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
              {isIndonesian ? "Estimasi Hasil Diterima" : "Estimated Reward"}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              Rate: {formatRupiah(liveRate)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[16px] font-bold font-mono text-[var(--text-primary)]">
              +{finalUnits} {holdingSymbol}
            </span>
            <span className="text-[12px] font-mono text-[var(--text-secondary)]">
              +{formatRupiah(finalIdr)}
            </span>
          </div>
        </div>

        {/* 4. Target Wallet Selector (Apple Luxury GlassSelect) */}
        <GlassSelect
          label={isIndonesian ? "Rekening Tujuan" : "Destination Wallet"}
          value={selectedWalletId}
          onChange={setSelectedWalletId}
          options={walletOptions}
          placeholder="Select destination wallet"
        />

        {/* 5. Custom Note (Optional) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
            {isIndonesian ? "Catatan / Sumber (Opsional)" : "Note / Source (Optional)"}
          </label>
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder={
              inputMode === "percentage"
                ? `Staking Yield (${percentageInput}% APY · ${PERIOD_LABELS[period].en})`
                : "e.g. Binance Flexible Earn"
            }
            className="w-full px-3.5 py-2 rounded-xl text-[12px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-colors"
          />
        </div>

        {/* 6. Execution Date */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-0.5">
            {isIndonesian ? "Tanggal Efektif" : "Date"}
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-[12px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--glass-border)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-[12px] font-medium border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            {isIndonesian ? "Batal" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-[12px] font-bold bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            {isIndonesian
              ? `Simpan Yield (+${finalUnits} ${holdingSymbol})`
              : `Record Yield (+${finalUnits} ${holdingSymbol})`}
          </button>
        </div>
      </div>
    </div>
  );
}
