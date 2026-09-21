import { useState, useMemo } from "react";
import { Plus, Trash2, Scale, Check, ChevronRight } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { MonochromeIconPickerModal } from "../ui/MonochromeIconPickerModal";
import {
  useWallets,
  useAddWallet,
  useUpdateWallet,
  useDeleteWallet,
  WALLET_PRESETS,
  getWalletIcon,
  resolveWalletClassification,
} from "../../hooks/useWallets";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useCategories } from "../../hooks/useCategories";
import { useAddTransaction } from "../../hooks/useTransactions";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { format } from "date-fns";
import type { AccountClassification } from "../../lib/types";

interface WalletManagementSheetsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletManagementSheets({
  isOpen,
  onClose,
}: WalletManagementSheetsProps) {
  const { data: wallets = [] } = useWallets();
  const addWallet = useAddWallet();
  const updateWallet = useUpdateWallet();
  const deleteWallet = useDeleteWallet();
  const { balancesById, balancesByName, totalAssets } = useWalletBalances();
  const { data: categories = [] } = useCategories();
  const addTx = useAddTransaction();
  const { showToast } = useToast();

  const [addBudgetOpen, setAddBudgetOpen] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [walletIcon, setWalletIcon] = useState("Wallet");
  const [hasCustomPickedWalletIcon, setHasCustomPickedWalletIcon] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<"add" | "edit" | null>(null);

  const [editWallet, setEditWallet] = useState<{
    id: string;
    name: string;
    icon: string;
    classification?: AccountClassification;
  } | null>(null);

  const [correctWallet, setCorrectWallet] = useState<{
    id: string;
    name: string;
    icon: string;
    currentBalance: number;
  } | null>(null);
  const [correctTargetBalance, setCorrectTargetBalance] = useState("");
  const [correctNote, setCorrectNote] = useState("");
  const [correctEffectiveDate, setCorrectEffectiveDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  const activeWalletNames = useMemo(
    () => new Set(wallets.map((w) => w.name.trim().toLowerCase())),
    [wallets],
  );

  const availableDefaultWallets = useMemo(
    () =>
      WALLET_PRESETS.filter(
        (name) => !activeWalletNames.has(name.toLowerCase()),
      ),
    [activeWalletNames],
  );

  const unusedZeroWallets = useMemo(() => {
    return wallets.filter((w) => {
      const bal = balancesById[w.id] ?? balancesByName[w.name.toLowerCase()] ?? 0;
      return bal === 0;
    });
  }, [wallets, balancesById, balancesByName]);

  const handleSaveBudget = () => {
    if (!budgetName.trim()) return;
    const name = budgetName.trim();
    const chosenIcon = walletIcon || getWalletIcon(name) || "Wallet";
    addWallet.mutate(
      { name, icon: chosenIcon },
      {
        onSuccess: () => {
          setAddBudgetOpen(false);
          setBudgetName("");
          setWalletIcon("Wallet");
          setHasCustomPickedWalletIcon(false);
          showToast("Account added", "add", () => {});
        },
      },
    );
  };

  const handleSaveCorrection = () => {
    if (!correctWallet || isSavingCorrection) return;
    const target = Number(correctTargetBalance || 0);
    const diff = target - correctWallet.currentBalance;
    if (diff === 0) {
      setCorrectWallet(null);
      showToast("No balance change", "update", () => {});
      return;
    }

    setIsSavingCorrection(true);
    const matchingWallet = wallets.find(
      (w) =>
        w.id === correctWallet.id ||
        w.name.toLowerCase() === correctWallet.name.toLowerCase(),
    );
    const isValidUuid = (id?: string | null) =>
      !!id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const walletIdToSave = isValidUuid(matchingWallet?.id)
      ? matchingWallet!.id
      : null;

    const isPositive = diff > 0;
    const noteToSave = correctNote.trim()
      ? `Correction (${isPositive ? "+" : "-"}) ${correctWallet.name}: ${correctNote.trim()}`
      : `Correction (${isPositive ? "+" : "-"}) ${correctWallet.name}`;

    const otherCat =
      categories.find((c) => c.name.toLowerCase() === "lainnya") ||
      categories[0];
    const catIdToSave = isValidUuid(otherCat?.id) ? otherCat.id : null;

    const txDate =
      correctEffectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(correctEffectiveDate)
        ? correctEffectiveDate
        : format(new Date(), "yyyy-MM-dd");

    addTx.mutate(
      {
        type: isPositive ? "income" : "expense",
        amount: Math.abs(diff),
        wallet_id: walletIdToSave,
        note: noteToSave,
        occurred_on: txDate,
        created_at: new Date(`${txDate}T12:00:00Z`).toISOString(),
        category_id: catIdToSave,
      },
      {
        onSuccess: () => {
          setIsSavingCorrection(false);
          setCorrectWallet(null);
          setCorrectEffectiveDate(format(new Date(), "yyyy-MM-dd"));
          showToast(`Balance corrected to ${formatRupiah(target)}`, "update");
        },
        onError: (err: any) => {
          setIsSavingCorrection(false);
          console.error("Balance correction error:", err);
          showToast(err?.message || "Failed to adjust balance", "delete");
        },
      },
    );
  };

  return (
    <>
      {/* Manage Accounts & Wallets Sheet */}
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-semibold text-lg leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Accounts & Wallets
              </h3>
              <p
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {wallets.length} active accounts · Tap card to edit
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => setAddBudgetOpen(true), 300);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 shrink-0 cursor-pointer"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Total Liquid Wealth Header */}
          <div
            className="p-3 rounded-2xl flex items-center justify-between border border-[var(--glass-border)] bg-[var(--bg-elevated)]"
          >
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
              >
                Total Liquid Assets
              </p>
              <p
                className="amount text-[18px] font-semibold mt-0.5 text-[var(--text-primary)]"
              >
                {formatRupiah(totalAssets)}
              </p>
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)]"
            >
              {wallets.length} Accounts
            </span>
          </div>

          {unusedZeroWallets.length >= 2 && wallets.length > 1 && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--glass-border)] text-[11.5px]">
              <span className="text-[var(--text-tertiary)] font-medium">
                {unusedZeroWallets.length} accounts with Rp 0 balance
              </span>
              <button
                type="button"
                onClick={() => {
                  if (
                    !confirm(
                      `Delete ${unusedZeroWallets.length} accounts with Rp 0 balance? Active accounts with positive balances will not be touched.`
                    )
                  ) {
                    return;
                  }
                  unusedZeroWallets.forEach((w) => deleteWallet.mutate(w.id));
                  showToast(`${unusedZeroWallets.length} empty accounts removed`, "delete");
                }}
                className="text-red-500 hover:text-red-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
              >
                Purge Unused
              </button>
            </div>
          )}

          {/* Apple iOS-Style Grouped Table for Accounts */}
          <div className="pb-8 max-h-[55vh] overflow-y-auto no-scrollbar">
            {wallets.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[var(--text-tertiary)]">
                No accounts found
              </div>
            ) : (
              <div
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)] overflow-hidden"
              >
                {wallets.map((w) => {
                  const bal =
                    balancesById[w.id] ?? balancesByName[w.name.toLowerCase()] ?? 0;
                  const isInvest =
                    (w.classification || resolveWalletClassification(w)) === "investment";
                  return (
                    <div
                      key={w.id}
                      onClick={() =>
                        setEditWallet({
                          id: w.id,
                          name: w.name,
                          icon: w.icon || getWalletIcon(w.name),
                          classification:
                            w.classification || resolveWalletClassification(w),
                        })
                      }
                      className="flex items-center justify-between py-2.5 px-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-[var(--glass-border)] bg-[var(--glass-fill)]"
                        >
                          <IconRenderer
                            icon={w.icon || getWalletIcon(w.name)}
                            size="w-4 h-4"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p
                              className="font-medium text-[13px] truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {w.name}
                            </p>
                            <span
                              className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded border ${
                                isInvest
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                  : "bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-tertiary)] border-black/10 dark:border-white/10"
                              }`}
                            >
                              {isInvest ? "Investment" : "Liquid"}
                            </span>
                          </div>
                          <p
                            className="amount text-[12px] font-semibold mt-0.5"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {formatRupiah(bal)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1.5 shrink-0 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setTimeout(() => {
                              setCorrectWallet({
                                id: w.id,
                                name: w.name,
                                icon: w.icon || getWalletIcon(w.name),
                                currentBalance: bal,
                              });
                              setCorrectTargetBalance(String(bal));
                              setCorrectNote("");
                              setCorrectEffectiveDate(format(new Date(), "yyyy-MM-dd"));
                            }, 300);
                          }}
                          className="h-7 px-2 flex items-center gap-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                          title="Adjust Balance"
                        >
                          <Scale size={11} strokeWidth={1.75} />
                          <span>Adjust</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm(`Delete account "${w.name}"?`)) return;
                            deleteWallet.mutate(w.id, {
                              onSuccess: () => {
                                showToast("Account deleted", "delete", () => {});
                              },
                              onError: (error: any) => {
                                showToast(
                                  error?.message || "Failed to delete account",
                                  "delete",
                                  () => {},
                                );
                              },
                            });
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>

                        <ChevronRight size={14} className="text-[var(--text-tertiary)] opacity-60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Balance Correction Sheet */}
      <BottomSheet
        isOpen={!!correctWallet}
        onClose={() => {
          if (!isSavingCorrection) setCorrectWallet(null);
        }}
      >
        <div className="p-5 pb-10 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <IconRenderer
                icon={correctWallet?.icon || "/icons/wallet.png"}
                size="w-6 h-6"
              />
            </div>
            <div>
              <h3
                className="font-semibold text-lg leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Adjust Balance ({correctWallet?.name})
              </h3>
              <p
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                Current Balance:{" "}
                <span className="amount font-bold text-[var(--text-primary)]">
                  {formatRupiah(correctWallet?.currentBalance || 0)}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Actual / Correct Balance (IDR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={
                correctTargetBalance
                  ? formatRupiah(Number(correctTargetBalance))
                  : ""
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setCorrectTargetBalance(raw);
              }}
              placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Difference Preview */}
          {correctWallet && (
            <div
              className="p-3.5 rounded-2xl flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                Adjustment Delta:
              </span>
              <span
                className="amount text-[13px] font-semibold"
                style={{
                  color:
                    Number(correctTargetBalance || 0) -
                      correctWallet.currentBalance >
                    0
                      ? "var(--text-primary)"
                      : Number(correctTargetBalance || 0) -
                            correctWallet.currentBalance <
                          0
                        ? "#ef4444"
                        : "var(--text-tertiary)",
                }}
              >
                {Number(correctTargetBalance || 0) -
                  correctWallet.currentBalance >
                0
                  ? "+"
                  : ""}
                {formatRupiah(
                  Number(correctTargetBalance || 0) -
                    correctWallet.currentBalance,
                )}{" "}
                <span className="text-[10px] font-bold uppercase">
                  {Number(correctTargetBalance || 0) -
                    correctWallet.currentBalance >
                  0
                    ? "(+)"
                    : Number(correctTargetBalance || 0) -
                          correctWallet.currentBalance <
                        0
                      ? "(-)"
                      : "(No Change)"}
                </span>
              </span>
            </div>
          )}

          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Effective Date
            </label>
            <input
              type="date"
              value={correctEffectiveDate}
              onChange={(e) => setCorrectEffectiveDate(e.target.value)}
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
            <p
              className="text-[10.5px] mt-1 px-1 leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              Select a past date (e.g. 2025-01-01) if setting an opening balance for historical statements.
            </p>
          </div>

          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              value={correctNote}
              onChange={(e) => setCorrectNote(e.target.value)}
              placeholder="e.g. Balance correction"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button
            disabled={isSavingCorrection}
            onClick={handleSaveCorrection}
            className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {isSavingCorrection ? "Saving Correction..." : "Save Correction"}
          </button>
        </div>
      </BottomSheet>

      {/* Edit Account Modal */}
      <BottomSheet isOpen={!!editWallet} onClose={() => setEditWallet(null)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="font-semibold text-lg"
              style={{ color: "var(--text-primary)" }}
            >
              Edit Account
            </h3>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIconPickerTarget("edit");
              }}
              className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
              title="Tap to change icon"
            >
              <IconRenderer
                icon={editWallet?.icon || getWalletIcon(editWallet?.name || "")}
                size="w-5 h-5"
              />
              <span className="text-[8px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Change
              </span>
            </button>
          </div>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Account Name
            </label>
            <input
              type="text"
              value={editWallet?.name || ""}
              onChange={(e) =>
                setEditWallet((prev) =>
                  prev ? { ...prev, name: e.target.value } : null,
                )
              }
              placeholder="Account Name"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Account Type (Neraca / Balance Sheet)
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  {
                    key: "liquid",
                    label: "Liquid Cash & Bank",
                    desc: "Cash, checking, savings, e-wallets (Aset Lancar)",
                  },
                  {
                    key: "investment",
                    label: "Investment Portfolio",
                    desc: "Stocks, crypto, mutual funds, gold (Aset Investasi)",
                  },
                  {
                    key: "receivable",
                    label: "Receivable (Piutang)",
                    desc: "Money lent out to others (Aset Piutang)",
                  },
                  {
                    key: "credit",
                    label: "Credit Card & PayLater",
                    desc: "Revolving lines of credit (Liabilitas Lancar)",
                  },
                  {
                    key: "loan",
                    label: "Term Loan & Liabilities",
                    desc: "Long-term debt, mortgages, loans (Liabilitas Jangka Panjang)",
                  },
                ] as const
              ).map((opt) => {
                const isSelected =
                  (editWallet?.classification || "liquid") === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setEditWallet((prev) =>
                        prev ? { ...prev, classification: opt.key } : null,
                      );
                      triggerHaptic("light");
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? "bg-black/[0.04] dark:bg-white/[0.08] border-black/30 dark:border-white/30"
                        : "bg-[var(--glass-fill)] border-[var(--glass-border)] hover:border-black/15 dark:hover:border-white/15"
                    }`}
                  >
                    <div>
                      <div
                        className="text-[12px] font-bold"
                        style={{
                          color: isSelected
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {opt.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--text-primary)",
                          color: "var(--bg-card)",
                        }}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              if (!editWallet?.name.trim()) return;
              updateWallet.mutate(
                {
                  id: editWallet.id,
                  name: editWallet.name.trim(),
                  icon: editWallet.icon || getWalletIcon(editWallet.name),
                  classification: editWallet.classification,
                },
                {
                  onSuccess: () => {
                    setEditWallet(null);
                    showToast("Account updated", "update", () => {});
                  },
                },
              );
            }}
            className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95 shadow-lg cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Changes
          </button>
        </div>
      </BottomSheet>

      {/* Add Account Modal with Available Defaults & Custom Creator */}
      <BottomSheet
        isOpen={addBudgetOpen}
        onClose={() => setAddBudgetOpen(false)}
      >
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="font-semibold text-lg"
              style={{ color: "var(--text-primary)" }}
            >
              Add Account
            </h3>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIconPickerTarget("add");
              }}
              className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
              title="Tap to change icon"
            >
              <IconRenderer
                icon={walletIcon}
                size="w-5 h-5"
              />
              <span className="text-[8px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Change
              </span>
            </button>
          </div>

          {/* Section 1: Quick Add Available Default Accounts */}
          {availableDefaultWallets.length > 0 && (
            <div>
              <label
                className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Available Preset Accounts ({availableDefaultWallets.length})
              </label>
              <div
                className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto p-1.5 rounded-2xl"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {availableDefaultWallets.map((name) => {
                  const icon = getWalletIcon(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        addWallet.mutate(
                          { name, icon },
                          {
                            onSuccess: () => {
                              setAddBudgetOpen(false);
                              showToast(`${name} added`, "add", () => {});
                            },
                          },
                        );
                        triggerHaptic("medium");
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl active:scale-95 transition-all text-left cursor-pointer"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <IconRenderer icon={icon} size="w-4 h-4" />
                      </div>
                      <span
                        className="text-[11px] font-bold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Create Custom Account */}
          <div className="pt-2 border-t border-[var(--glass-border)] space-y-3">
            <label
              className="text-[11px] font-bold uppercase tracking-wider block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Or Create Custom Account
            </label>
            <div
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setIconPickerTarget("add");
                }}
                className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
                title="Tap to change icon"
              >
                <IconRenderer icon={walletIcon} size="w-5 h-5" />
                <span className="text-[8px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Change
                </span>
              </button>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => {
                  const val = e.target.value;
                  setBudgetName(val);
                  if (!hasCustomPickedWalletIcon) {
                    setWalletIcon(getWalletIcon(val));
                  }
                }}
                placeholder="Account Name (e.g. Tabungan, Dompet Saku)"
                className="w-full bg-transparent outline-none font-semibold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <button
              onClick={handleSaveBudget}
              className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95 shadow-lg cursor-pointer"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              Save Custom Account
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Universal Monochrome Icon Picker Modal */}
      <MonochromeIconPickerModal
        isOpen={iconPickerTarget !== null}
        onClose={() => setIconPickerTarget(null)}
        selectedIcon={
          iconPickerTarget === "add" ? walletIcon : editWallet?.icon || "Wallet"
        }
        onSelectIcon={(iconName) => {
          if (iconPickerTarget === "add") {
            setWalletIcon(iconName);
            setHasCustomPickedWalletIcon(true);
          } else if (iconPickerTarget === "edit") {
            setEditWallet((prev) =>
              prev ? { ...prev, icon: iconName } : null,
            );
          }
        }}
        title={
          iconPickerTarget === "add"
            ? "Choose Account Icon"
            : "Edit Account Icon"
        }
      />
    </>
  );
}
