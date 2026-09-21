import { useState, useMemo } from "react";
import {
  X,
  Users,
  Copy,
  Check,
  Plus,
  Minus,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useWallets } from "../../hooks/useWallets";

export interface SplitBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordTransaction?: (data: {
    total: number;
    myShare: number;
    title: string;
    note: string;
  }) => void;
}

interface FriendItem {
  id: string;
  name: string;
  amount: number;
}

export function SplitBillSheet({
  isOpen,
  onClose,
  onRecordTransaction,
}: SplitBillSheetProps) {
  const { showToast } = useToast();
  const { data: wallets = [] } = useWallets();

  const [title, setTitle] = useState("Nongkrong & Makan");
  const [subtotal, setSubtotal] = useState<number>(180000);
  const [subtotalInput, setSubtotalInput] = useState("180.000");
  const [taxPct, setTaxPct] = useState<number>(10);
  const [servicePct, setServicePct] = useState<number>(5);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [peopleCount, setPeopleCount] = useState<number>(4);
  const [copied, setCopied] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  const [friends, setFriends] = useState<FriendItem[]>([
    { id: "1", name: "Gue", amount: 0 },
    { id: "2", name: "Teman 1", amount: 0 },
    { id: "3", name: "Teman 2", amount: 0 },
    { id: "4", name: "Teman 3", amount: 0 },
  ]);

  // Selected wallet for payment details in WhatsApp message
  const paymentWallet = useMemo(() => {
    if (!selectedWalletId && wallets.length > 0) return wallets[0];
    return wallets.find((w) => w.id === selectedWalletId) || wallets[0] || null;
  }, [wallets, selectedWalletId]);

  // Calculations
  const taxAmount = Math.round((subtotal * taxPct) / 100);
  const serviceAmount = Math.round((subtotal * servicePct) / 100);
  const totalBeforeDiscount = subtotal + taxAmount + serviceAmount;
  const grandTotal = Math.max(0, totalBeforeDiscount - discountAmount);

  // Equal share
  const equalPerPerson = peopleCount > 0 ? Math.round(grandTotal / peopleCount) : 0;

  // Update subtotal from input
  const handleSubtotalChange = (valStr: string) => {
    const raw = valStr.replace(/\D/g, "");
    const num = Number(raw) || 0;
    setSubtotal(num);
    setSubtotalInput(num > 0 ? num.toLocaleString("id-ID") : "");
  };

  // Stepper for equal split
  const handlePeopleChange = (delta: number) => {
    const next = Math.max(2, Math.min(20, peopleCount + delta));
    setPeopleCount(next);
    triggerHaptic("light");
  };

  // WhatsApp text copy
  const handleCopyWhatsApp = () => {
    triggerSuccessHaptic();

    let rincian = "";
    if (splitMode === "equal") {
      rincian = `Bagi rata ${peopleCount} orang: @${formatRupiah(equalPerPerson)}`;
    } else {
      rincian = friends
        .map((f, i) => `${i + 1}. ${f.name}: ${formatRupiah(f.amount || equalPerPerson)}`)
        .join("\n");
    }

    let transferInfo = "";
    if (paymentWallet) {
      transferInfo = `\n\nTransfer to:\n${paymentWallet.name} a/n John / Trouvaille`;
    }

    const message = `🧾 Split Bill Breakdown: ${title}
------------------------------
Subtotal: ${formatRupiah(subtotal)}${taxPct > 0 ? `\nTax (${taxPct}%): ${formatRupiah(taxAmount)}` : ""}${servicePct > 0 ? `\nService (${servicePct}%): ${formatRupiah(serviceAmount)}` : ""}${discountAmount > 0 ? `\nDiscount: -${formatRupiah(discountAmount)}` : ""}
Total Bill: ${formatRupiah(grandTotal)}

${rincian}${transferInfo}

Thank you everyone! 🙏✨`;

    navigator.clipboard.writeText(message);
    setCopied(true);
    showToast("Bill breakdown copied to clipboard!", "add", () => {});
    setTimeout(() => setCopied(false), 2500);
  };

  // Record to transaction ledger
  const handleRecord = () => {
    triggerSuccessHaptic();
    const myShare = splitMode === "equal" ? equalPerPerson : (friends[0]?.amount || equalPerPerson);
    if (onRecordTransaction) {
      onRecordTransaction({
        total: grandTotal,
        myShare,
        title,
        note: `Split Bill: ${title} (Total ${formatRupiah(grandTotal)}, my share ${formatRupiah(myShare)})`,
      });
    }
    showToast("Split bill transaction recorded!", "add", () => {});
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full max-h-[85vh] text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <ReceiptText size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight leading-snug">
                Split Bill Calculator
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] leading-none mt-0.5">
                Taxes, service charges & instant breakdown
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors active:scale-90"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
          {/* 1. Title / Event Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Venue / Event Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner, Coffee, Groceries..."
              className="w-full px-3.5 py-2.5 rounded-2xl text-[13px] font-medium outline-none transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* 2. Subtotal Amount Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Subtotal (Before Tax & Service)
            </label>
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={subtotalInput}
                onChange={(e) => handleSubtotalChange(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-[16px] font-semibold amount outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* 3. Tax & Service Charge Presets */}
          <div className="grid grid-cols-2 gap-3">
            {/* Tax */}
            <div
              className="p-3 rounded-2xl space-y-2"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Tax (PB1/VAT)
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {taxPct}%
                </span>
              </div>
              <div className="flex gap-1">
                {[0, 10, 11, 12].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setTaxPct(p);
                      triggerHaptic("light");
                    }}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      taxPct === p
                        ? "bg-white text-black shadow-sm"
                        : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] text-right amount">
                +{formatRupiah(taxAmount)}
              </p>
            </div>

            {/* Service Charge */}
            <div
              className="p-3 rounded-2xl space-y-2"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Service Charge
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {servicePct}%
                </span>
              </div>
              <div className="flex gap-1">
                {[0, 5, 7, 10].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setServicePct(p);
                      triggerHaptic("light");
                    }}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      servicePct === p
                        ? "bg-white text-black shadow-sm"
                        : "bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.08]"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] text-right amount">
                +{formatRupiah(serviceAmount)}
              </p>
            </div>
          </div>

          {/* Diskon / Potongan Promo */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Discount / Promo Voucher (Optional)
            </label>
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">
                Rp
              </span>
              <input
                type="number"
                value={discountAmount === 0 ? "" : discountAmount}
                onChange={(e) =>
                  setDiscountAmount(Math.max(0, Number(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full bg-transparent text-[14px] font-semibold amount outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Rekening Tujuan Transfer untuk WhatsApp */}
          {wallets.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
                Payment Destination Wallet (For WhatsApp Message)
              </label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWalletId(w.id);
                      triggerHaptic("light");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      (selectedWalletId || wallets[0]?.id) === w.id
                        ? "bg-white text-black shadow-sm"
                        : "bg-white/[0.04] text-[var(--text-secondary)] border border-white/[0.08]"
                    }`}
                  >
                    <span>{w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Split Mode Tabs */}
          <div
            className="flex p-1 rounded-xl glass-surface"
            style={{ background: "var(--glass-fill)" }}
          >
            <button
              type="button"
              onClick={() => {
                setSplitMode("equal");
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background:
                  splitMode === "equal" ? "var(--bg-elevated)" : "transparent",
                color:
                  splitMode === "equal"
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              Split Evenly ({peopleCount} People)
            </button>
            <button
              type="button"
              onClick={() => {
                setSplitMode("custom");
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background:
                  splitMode === "custom" ? "var(--bg-elevated)" : "transparent",
                color:
                  splitMode === "custom"
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              Custom Share
            </button>
          </div>

          {/* 5. Split Config Controls */}
          {splitMode === "equal" ? (
            <div
              className="p-3.5 rounded-2xl flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[var(--text-tertiary)]" />
                <span className="text-[13px] font-semibold">
                  Number of People
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePeopleChange(-1)}
                  disabled={peopleCount <= 2}
                  className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <Minus size={13} />
                </button>
                <span className="text-[14px] font-semibold px-2 min-w-[28px] text-center">
                  {peopleCount}
                </span>
                <button
                  type="button"
                  onClick={() => handlePeopleChange(1)}
                  disabled={peopleCount >= 20}
                  className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend, idx) => (
                <div
                  key={friend.id}
                  className="p-2.5 rounded-xl flex items-center justify-between gap-2"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <input
                    type="text"
                    value={friend.name}
                    onChange={(e) => {
                      const updated = [...friends];
                      updated[idx].name = e.target.value;
                      setFriends(updated);
                    }}
                    className="bg-transparent text-[12px] font-semibold outline-none w-28"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={friend.amount || ""}
                      onChange={(e) => {
                        const updated = [...friends];
                        updated[idx].amount = Number(e.target.value) || 0;
                        setFriends(updated);
                      }}
                      placeholder="0"
                      className="bg-transparent text-[12px] font-semibold amount text-right w-24 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. Calculation Breakdown Summary Bento */}
          <div
            className="p-4 rounded-2xl space-y-2 select-none"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex justify-between text-[11px] text-[var(--text-tertiary)]">
              <span>Subtotal</span>
              <span className="amount font-medium">{formatRupiah(subtotal)}</span>
            </div>
            {taxPct > 0 && (
              <div className="flex justify-between text-[11px] text-[var(--text-tertiary)]">
                <span>Tax ({taxPct}%)</span>
                <span className="amount font-medium">+{formatRupiah(taxAmount)}</span>
              </div>
            )}
            {servicePct > 0 && (
              <div className="flex justify-between text-[11px] text-[var(--text-tertiary)]">
                <span>Service ({servicePct}%)</span>
                <span className="amount font-medium">+{formatRupiah(serviceAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-black/5 dark:border-white/10 flex justify-between items-baseline">
              <span className="text-[12px] font-semibold">
                Total Bill
              </span>
              <span className="text-[16px] font-semibold amount text-[var(--text-primary)]">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            {/* Per person highlight */}
            <div
              className="mt-2 p-3 rounded-xl flex items-center justify-between"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--text-primary)]" />
                <span className="text-[12px] font-semibold">
                  Per Person Share
                </span>
              </div>
              <span className="text-[15px] font-semibold amount text-[var(--text-primary)]">
                {formatRupiah(equalPerPerson)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--bg-base)] space-y-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="w-full py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? "Copied to Clipboard!" : "Copy WhatsApp Breakdown"}</span>
          </button>

          <button
            type="button"
            onClick={handleRecord}
            className="w-full py-2.5 rounded-2xl text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-98 transition-all cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            Record My Share Expense ({formatRupiah(equalPerPerson)})
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
