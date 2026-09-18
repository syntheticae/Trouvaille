import { useState, useMemo } from "react";
import { Plus, Trash2, Scale, Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { MonochromeIconPickerModal } from "../ui/MonochromeIconPickerModal";
import {
  useWallets,
  useAddWallet,
  useUpdateWallet,
  useDeleteWallet,
  DEFAULT_WALLETS,
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
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  const activeWalletNames = useMemo(
    () => new Set(wallets.map((w) => w.name.trim().toLowerCase())),
    [wallets],
  );

  const availableDefaultWallets = useMemo(
    () =>
      DEFAULT_WALLETS.filter(
        (name) => !activeWalletNames.has(name.toLowerCase()),
      ),
    [activeWalletNames],
  );

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

    addTx.mutate(
      {
        type: isPositive ? "income" : "expense",
        amount: Math.abs(diff),
        wallet_id: walletIdToSave,
        note: noteToSave,
        occurred_on: format(new Date(), "yyyy-MM-dd"),
        created_at: new Date().toISOString(),
        category_id: catIdToSave,
      },
      {
        onSuccess: () => {
          setIsSavingCorrection(false);
          setCorrectWallet(null);
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
                className="font-extrabold text-lg leading-tight"
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
            className="p-4 rounded-2xl flex items-center justify-between"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <p
                className="text-[10px] font-extrabold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Total Liquid Assets
              </p>
              <p
                className="amount text-[20px] font-extrabold mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(totalAssets)}
              </p>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "var(--glass-fill-strong)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {wallets.length} Accounts
            </span>
          </div>

          {/* Clean Account Cards List */}
          <div className="space-y-2.5 pb-8 max-h-[55vh] overflow-y-auto no-scrollbar">
            {wallets.map((w) => {
              const bal =
                balancesById[w.id] ?? balancesByName[w.name.toLowerCase()] ?? 0;
              return (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl space-y-2.5 transition-all select-none"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {/* Top row: Icon, Account Name & Balance */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--glass-fill)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <IconRenderer
                          icon={w.icon || getWalletIcon(w.name)}
                          size="w-5 h-5"
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-extrabold text-[14px] truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {w.name}
                        </p>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Account
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className="amount text-[15px] font-extrabold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(bal)}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
                    <button
                      type="button"
                      onClick={() =>
                        setEditWallet({
                          id: w.id,
                          name: w.name,
                          icon: w.icon || getWalletIcon(w.name),
                          classification:
                            w.classification || resolveWalletClassification(w),
                        })
                      }
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "var(--glass-fill)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      Edit Account
                    </button>

                    <div className="flex items-center gap-1.5">
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
                          }, 300);
                        }}
                        className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full active:scale-95 transition-all cursor-pointer"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-ink)",
                        }}
                        title="Koreksi Saldo"
                      >
                        <Scale size={12} />
                        <span>Adjust Balance</span>
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
                        className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-transform text-red-400 hover:text-red-500 cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                className="font-extrabold text-lg leading-tight"
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
                className="amount text-[13px] font-extrabold"
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
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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
              className="font-extrabold text-lg"
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
              <span className="text-[7.5px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
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
                    className="p-2.5 rounded-xl text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between"
                    style={{
                      background: isSelected
                        ? "var(--bg-elevated)"
                        : "var(--glass-fill)",
                      border: isSelected
                        ? "1px solid var(--text-primary)"
                        : "1px solid var(--glass-border)",
                    }}
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
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg cursor-pointer"
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
              className="font-extrabold text-lg"
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
              <span className="text-[7.5px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
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
                <span className="text-[7.5px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
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
              className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg cursor-pointer"
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
