import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  Trash2,
  Zap,
  Users,
  Layers,
  Plus,
  Minus,
  Search,
  X,
  ScanLine,
  ChevronRight,
  Sparkles,
  Check,
  PenLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomSheet } from "../ui/BottomSheet";
import { useCategories } from "../../hooks/useCategories";
import { useWallets } from "../../hooks/useWallets";
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useAllTransactions,
} from "../../hooks/useTransactions";
import { useCategorySuggestions } from "../../hooks/useCategorySuggestions";
import { useWalletSuggestions } from "../../hooks/useWalletSuggestions";
import { useToast } from "../../contexts/ToastContext";
import { formatRupiah } from "../../lib/utils";
import { format, isToday, parseISO } from "date-fns";
import { IconRenderer } from "../ui/IconRenderer";
import { GlassDatePicker } from "../ui/GlassDatePicker";
import type { Transaction, TransactionType } from "../../lib/types";
import { useShortcuts } from "../../hooks/useShortcuts";
import { SmartQuickAddBar } from "./SmartQuickAddBar";
import { evaluateMathSafe } from "../../lib/evaluateMathSafe";

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  initialValues?: {
    type?: TransactionType;
    amount?: number;
    categoryId?: string | null;
    walletId?: string | null;
    toWalletId?: string | null;
    date?: Date;
    note?: string;
  } | null;
  onOpenScan?: () => void;
}

type TabType = TransactionType | "split";

export function TransactionSheet({
  isOpen,
  onClose,
  transaction,
  initialValues,
  onOpenScan,
}: TransactionSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    () => transaction?.type || initialValues?.type || "expense",
  );
  const [type, setType] = useState<TransactionType>(
    transaction?.type || initialValues?.type || "expense",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "0",
  );
  const [amountInput, setAmountInput] = useState(
    transaction && Number(transaction.amount) > 0
      ? Number(transaction.amount).toLocaleString("id-ID")
      : "",
  );
  const [note, setNote] = useState(transaction?.note || "");
  const [date, setDate] = useState<Date>(
    transaction?.occurred_on ? parseISO(transaction.occurred_on) : new Date(),
  );
  const [time, setTime] = useState<string>(
    transaction?.created_at
      ? format(new Date(transaction.created_at), "HH:mm")
      : format(new Date(), "HH:mm"),
  );
  const [isSaving, setIsSaving] = useState(false);

  const [categoryId, setCategoryId] = useState<string | null>(
    transaction?.category_id || null,
  );
  const [walletId, setWalletId] = useState<string | null>(
    transaction?.wallet_id || null,
  );
  const [toWalletId, setToWalletId] = useState<string | null>(
    transaction?.to_wallet_id || null,
  );
  const { shortcuts } = useShortcuts();

  const [moreCatOpen, setMoreCatOpen] = useState(false);
  const [moreWalletOpen, setMoreWalletOpen] = useState(false);
  const [searchCatQuery, setSearchCatQuery] = useState("");
  const [searchWalletQuery, setSearchWalletQuery] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [walletTarget, setWalletTarget] = useState<"from" | "to">("from");
  const [showSmartBar, setShowSmartBar] = useState(false);

  // Split Transaction & Piutang State (Innovation 2)
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"friends" | "categories">("friends");
  const [splitFriendType, setSplitFriendType] = useState<"equal" | "custom">("equal");
  const [peopleCount, setPeopleCount] = useState(2);
  const [friendNames, setFriendNames] = useState("");
  const [customMyShare, setCustomMyShare] = useState<number>(0);
  const [itemCatId2, setItemCatId2] = useState<string | null>(null);
  const [itemAmount1, setItemAmount1] = useState<number>(0);

  const { data: allCategories = [] } = useCategories();
  const categories = useMemo(() => {
    if (type === "transfer") return allCategories;
    return allCategories.filter((c) => c.type === type);
  }, [allCategories, type]);
  const { data: wallets = [] } = useWallets();
  const { data: allTxs = [] } = useAllTransactions();

  const addTx = useAddTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();
  const { showToast } = useToast();

  // Smart Contextual & Recency Category Ranking
  const suggestedCategories = useCategorySuggestions({
    categories,
    transactions: allTxs,
    type,
    selectedWalletId: walletId,
  });

  // Smart Contextual & Recency Wallet Ranking
  const suggestedFromWallets = useWalletSuggestions({
    wallets,
    transactions: allTxs,
    type,
    selectedCategoryId: categoryId,
    target: "from",
  });

  const suggestedToWallets = useWalletSuggestions({
    wallets,
    transactions: allTxs,
    type,
    target: "to",
  });

  const filteredMoreCategories = useMemo(() => {
    if (!searchCatQuery.trim()) return suggestedCategories;
    const q = searchCatQuery.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, suggestedCategories, searchCatQuery]);

  const filteredMoreWallets = useMemo(() => {
    const list =
      walletTarget === "to" ? suggestedToWallets : suggestedFromWallets;
    if (!searchWalletQuery.trim()) return list;
    const q = searchWalletQuery.toLowerCase();
    return wallets.filter((w) => w.name.toLowerCase().includes(q));
  }, [
    wallets,
    suggestedToWallets,
    suggestedFromWallets,
    walletTarget,
    searchWalletQuery,
  ]);

  // Resolution 5 Ribbons: Ensure selected items are always present in the horizontal list
  const displayCategories = useMemo(() => {
    if (!categoryId) return suggestedCategories.slice(0, 10);
    const inTop = suggestedCategories.slice(0, 10).some((c) => c.id === categoryId);
    if (inTop) return suggestedCategories.slice(0, 10);
    const selectedCat = categories.find((c) => c.id === categoryId);
    return selectedCat
      ? [selectedCat, ...suggestedCategories.filter((c) => c.id !== categoryId).slice(0, 9)]
      : suggestedCategories.slice(0, 10);
  }, [suggestedCategories, categories, categoryId]);

  const displayFromWallets = useMemo(() => {
    if (!walletId) return suggestedFromWallets.slice(0, 8);
    const inTop = suggestedFromWallets.slice(0, 8).some((w) => w.id === walletId);
    if (inTop) return suggestedFromWallets.slice(0, 8);
    const selectedW = wallets.find((w) => w.id === walletId);
    return selectedW
      ? [selectedW, ...suggestedFromWallets.filter((w) => w.id !== walletId).slice(0, 7)]
      : suggestedFromWallets.slice(0, 8);
  }, [suggestedFromWallets, wallets, walletId]);

  const displayToWallets = useMemo(() => {
    if (!toWalletId) return suggestedToWallets.slice(0, 8);
    const inTop = suggestedToWallets.slice(0, 8).some((w) => w.id === toWalletId);
    if (inTop) return suggestedToWallets.slice(0, 8);
    const selectedW = wallets.find((w) => w.id === toWalletId);
    return selectedW
      ? [selectedW, ...suggestedToWallets.filter((w) => w.id !== toWalletId).slice(0, 7)]
      : suggestedToWallets.slice(0, 8);
  }, [suggestedToWallets, wallets, toWalletId]);

  // Keep track of when modal opens or incoming transaction changes
  const prevOpenRef = useRef(false);
  const prevTxIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isOpening = isOpen && !prevOpenRef.current;
    const isTxChanged = transaction && transaction.id !== prevTxIdRef.current;

    if (isOpen && (isOpening || isTxChanged)) {
      setIsSaving(false);
      if (transaction) {
        setActiveTab(transaction.type);
        setType(transaction.type);
        setIsSplitOpen(false);
        setAmount(String(transaction.amount || "0"));
        setAmountInput(
          Number(transaction.amount) > 0
            ? Number(transaction.amount).toLocaleString("id-ID")
            : "",
        );
        setNote(transaction.note || "");
        setDate(
          transaction.occurred_on
            ? parseISO(transaction.occurred_on)
            : new Date(),
        );
        setTime(
          transaction.created_at
            ? format(new Date(transaction.created_at), "HH:mm")
            : format(new Date(), "HH:mm"),
        );

        // 1. Resolve Category accurately without resetting
        if (transaction.category_id) {
          setCategoryId(transaction.category_id);
        } else if (transaction.categories?.name) {
          const foundCat = allCategories.find(
            (c) =>
              c.name.toLowerCase() ===
              transaction.categories!.name.toLowerCase(),
          );
          if (foundCat) setCategoryId(foundCat.id);
        } else {
          let foundByNote = null;
          if (transaction.note) {
            const noteLower = transaction.note.toLowerCase();
            foundByNote = allCategories.find((c) =>
              noteLower.includes(c.name.toLowerCase()),
            );
          }
          setCategoryId(
            foundByNote
              ? foundByNote.id
              : categories.length > 0
                ? categories[0].id
                : null,
          );
        }

        // 2. Resolve Wallet (From Account)
        let resolvedFromWalletId: string | null = null;
        if (
          transaction.wallet_id &&
          wallets.some((w) => w.id === transaction.wallet_id)
        ) {
          resolvedFromWalletId = transaction.wallet_id;
        } else {
          if (transaction.note) {
            const noteLower = transaction.note.toLowerCase();
            const foundByNote = wallets.find((w) =>
              noteLower.includes(w.name.toLowerCase()),
            );
            if (foundByNote) resolvedFromWalletId = foundByNote.id;
          }
          if (!resolvedFromWalletId && wallets.length > 0) {
            const cashW = wallets.find((w) => w.name.toLowerCase() === "cash");
            resolvedFromWalletId = cashW ? cashW.id : wallets[0].id;
          }
        }
        setWalletId(resolvedFromWalletId);

        // 3. Resolve To Wallet (Transfer)
        let resolvedToWalletId: string | null = null;
        if (
          transaction.to_wallet_id &&
          wallets.some((w) => w.id === transaction.to_wallet_id)
        ) {
          resolvedToWalletId = transaction.to_wallet_id;
        } else {
          if (wallets.length > 1) {
            const other = wallets.find((w) => w.id !== resolvedFromWalletId);
            resolvedToWalletId = other ? other.id : wallets[1].id;
          }
        }
        setToWalletId(resolvedToWalletId);
      } else {
        const initType = initialValues?.type || "expense";
        const initAmt =
          initialValues?.amount !== undefined && initialValues?.amount !== null
            ? String(initialValues.amount)
            : "0";
        const initAmtInput =
          initialValues?.amount !== undefined && initialValues?.amount !== null && initialValues.amount > 0
            ? initialValues.amount.toLocaleString("id-ID")
            : "";
        const initNote = initialValues?.note || "";
        const initDate = initialValues?.date || new Date();

        setActiveTab(initType);
        setType(initType);
        setAmount(initAmt);
        setAmountInput(initAmtInput);
        setNote(initNote);
        setDate(initDate);
        setTime(format(new Date(), "HH:mm"));
        const defaultCatId =
          initialValues?.categoryId !== undefined
            ? initialValues.categoryId
            : (suggestedCategories[0]?.id ||
               (categories.length > 0 ? categories[0].id : null));
        const defaultFromId =
          initialValues?.walletId !== undefined
            ? initialValues.walletId
            : (suggestedFromWallets[0]?.id ||
               (wallets.length > 0 ? wallets[0].id : null));
        const defaultToId =
          initialValues?.toWalletId !== undefined
            ? initialValues.toWalletId
            : (suggestedToWallets.find((w) => w.id !== defaultFromId)?.id ||
               (wallets.length > 1 ? wallets[1].id : null));
        setCategoryId(defaultCatId);
        setWalletId(defaultFromId);
        setToWalletId(defaultToId);
        setIsSplitOpen(false);
        setSplitMode("friends");
        setSplitFriendType("equal");
        setPeopleCount(2);
        setFriendNames("");
        setCustomMyShare(0);
        setItemCatId2(null);
        setItemAmount1(0);
      }
    }

    prevOpenRef.current = isOpen;
    prevTxIdRef.current = transaction?.id || null;
  }, [
    isOpen,
    transaction,
    initialValues,
    allCategories,
    categories,
    wallets,
    suggestedCategories,
    suggestedFromWallets,
    suggestedToWallets,
  ]);

  // Ensure valid toWalletId when type is transfer
  useEffect(() => {
    if (type === "transfer") {
      if (!toWalletId && wallets.length > 1) {
        const other = wallets.find((w) => w.id !== walletId);
        setToWalletId(other ? other.id : wallets[1].id);
      } else if (toWalletId && toWalletId === walletId && wallets.length > 1) {
        const other = wallets.find((w) => w.id !== walletId);
        if (other) setToWalletId(other.id);
      }
    }
  }, [type, wallets, walletId, toWalletId]);

  // Split Calculated Shares (Innovation 2)
  const totalAmountNum = Number(amount) || 0;
  const myShareFriends =
    splitFriendType === "equal"
      ? (peopleCount > 0 ? Math.round(totalAmountNum / peopleCount) : totalAmountNum)
      : Math.min(totalAmountNum, Math.max(0, customMyShare));
  const friendsShare = Math.max(0, totalAmountNum - myShareFriends);
  const cat1Share = Math.min(
    totalAmountNum,
    Math.max(0, itemAmount1 || Math.round(totalAmountNum / 2)),
  );
  const cat2Share = Math.max(0, totalAmountNum - cat1Share);

  const handleSave = () => {
    const isUUID = (id?: string | null) =>
      !!id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );

    const numAmount = Number(amount);
    if (numAmount <= 0 || isSaving || addTx.isPending || updateTx.isPending)
      return;
    setIsSaving(true);

    // Ensure valid active database foreign keys
    const matchedFromWallet =
      wallets.find((w) => w.id === walletId) || wallets[0];
    const matchedToWallet =
      wallets.find((w) => w.id === toWalletId) ||
      (wallets.length > 1 ? wallets[1] : null);
    const matchedCat =
      categories.find((c) => c.id === categoryId) ||
      (categories.length > 0 ? categories[0] : null);

    const effectiveWalletId = matchedFromWallet?.id || null;
    const effectiveToWalletId = matchedToWallet?.id || null;
    const effectiveCatId = matchedCat?.id || null;

    if (type !== "transfer" && !isUUID(effectiveWalletId)) {
      setIsSaving(false);
      showToast("Choose a valid wallet before saving", "delete", () => {});
      return;
    }

    if (type === "transfer") {
      if (!isUUID(effectiveWalletId) || !isUUID(effectiveToWalletId)) {
        setIsSaving(false);
        showToast(
          "Choose both source and destination wallets",
          "delete",
          () => {},
        );
        return;
      }
      if (effectiveWalletId === effectiveToWalletId) {
        setIsSaving(false);
        showToast("Transfer wallets must be different", "delete", () => {});
        return;
      }
    }

    if (type !== "transfer" && !isUUID(effectiveCatId)) {
      setIsSaving(false);
      showToast("Choose a valid category before saving", "delete", () => {});
      return;
    }

    // Build timestamp with selected time
    const [h, m] = time.split(":").map(Number);
    const txDate = new Date(date);
    if (!isNaN(h) && !isNaN(m)) {
      txDate.setHours(h, m, 0, 0);
    }

    // Split transaction save logic (Innovation 2)
    if (isSplitOpen && !transaction && numAmount > 0 && type === "expense") {
      if (splitMode === "friends" && friendsShare > 0) {
        const piutangWallet = wallets.find(
          (w) => w.name.trim().toLowerCase() === "piutang",
        );
        const friendsLabel = friendNames.trim()
          ? friendNames.trim()
          : `${peopleCount - 1} friend${peopleCount - 1 > 1 ? "s" : ""}`;

        const myNote = note.trim()
          ? `${note.trim()} [Split: My share]`
          : "Split bill [My share]";
        const piutangNote = note.trim()
          ? `${note.trim()} [Piutang: ${friendsLabel}]`
          : `Piutang [${friendsLabel}]`;

        const tx1 = {
          type: "expense" as const,
          amount: myShareFriends,
          note: myNote,
          occurred_on: format(date, "yyyy-MM-dd"),
          created_at: txDate.toISOString(),
          category_id: isUUID(effectiveCatId) ? effectiveCatId : null,
          wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
          to_wallet_id: null,
        };

        const tx2 =
          piutangWallet && isUUID(piutangWallet.id)
            ? {
                type: "transfer" as const,
                amount: friendsShare,
                note: piutangNote,
                occurred_on: format(date, "yyyy-MM-dd"),
                created_at: new Date(txDate.getTime() + 1000).toISOString(),
                category_id: null,
                wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
                to_wallet_id: piutangWallet.id,
              }
            : {
                type: "expense" as const,
                amount: friendsShare,
                note: piutangNote,
                occurred_on: format(date, "yyyy-MM-dd"),
                created_at: new Date(txDate.getTime() + 1000).toISOString(),
                category_id: isUUID(effectiveCatId) ? effectiveCatId : null,
                wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
                to_wallet_id: null,
              };

        onClose();
        showToast("Saving split transaction...", "info", null, 1600);
        addTx.mutate(tx1, {
          onSuccess: () => {
            addTx.mutate(tx2, {
              onSuccess: () => {
                triggerSuccessHaptic();
                showToast("Split bill & Piutang recorded!", "add", () => {});
              },
            });
          },
        });
        return;
      }

      if (splitMode === "categories") {
        const cat1Amount = cat1Share;
        const cat2Amount = cat2Share;
        const effectiveCat2Id =
          itemCatId2 || (categories.length > 1 ? categories[1].id : effectiveCatId);

        if (cat2Amount > 0) {
          const tx1 = {
            type: "expense" as const,
            amount: cat1Amount,
            note: note.trim()
              ? `${note.trim()} [Part 1]`
              : "Multi-category [Part 1]",
            occurred_on: format(date, "yyyy-MM-dd"),
            created_at: txDate.toISOString(),
            category_id: isUUID(effectiveCatId) ? effectiveCatId : null,
            wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
            to_wallet_id: null,
          };
          const tx2 = {
            type: "expense" as const,
            amount: cat2Amount,
            note: note.trim()
              ? `${note.trim()} [Part 2]`
              : "Multi-category [Part 2]",
            occurred_on: format(date, "yyyy-MM-dd"),
            created_at: new Date(txDate.getTime() + 1000).toISOString(),
            category_id: isUUID(effectiveCat2Id) ? effectiveCat2Id : null,
            wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
            to_wallet_id: null,
          };

          onClose();
          showToast("Saving multi-category transaction...", "info", null, 1600);
          addTx.mutate(tx1, {
            onSuccess: () => {
              addTx.mutate(tx2, {
                onSuccess: () => {
                  triggerSuccessHaptic();
                  showToast("Multi-category transaction recorded!", "add", () => {});
                },
              });
            },
          });
          return;
        }
      }
    }

    const payload = {
      type,
      amount: numAmount,
      note: note || null,
      occurred_on: format(date, "yyyy-MM-dd"),
      created_at: txDate.toISOString(),
      category_id:
        type === "transfer"
          ? null
          : isUUID(effectiveCatId)
            ? effectiveCatId
            : null,
      wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
      to_wallet_id:
        type === "transfer" && isUUID(effectiveToWalletId)
          ? effectiveToWalletId
          : null,
    };

    if (!transaction) {
      showToast("Saving transaction...", "info", null, 1600);
    }

    // Close sheet immediately for instant response
    onClose();

    if (transaction && transaction.id) {
      updateTx.mutate(
        { id: transaction.id, ...payload },
        {
          onSuccess: () => {
            triggerSuccessHaptic();
            showToast("Transaction updated", "update", () => {});
          },
          onError: (err) => {
            console.error("Update tx error:", err);
            showToast("Failed to update transaction", "delete", () => {});
          },
        },
      );
    } else {
      addTx.mutate(payload, {
        onSuccess: () => {
          triggerSuccessHaptic();
          showToast("Transaction added", "add", () => {});
        },
        onError: () => {
          showToast("Failed to save transaction", "delete", () => {});
        },
      });
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    deleteTx.mutate(transaction.id, {
      onSuccess: () => {
        showToast("Transaction deleted", "delete", () => {});
        onClose();
      },
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-3.5 pb-8">
        {/* Header Utility Bar: Sheet Label & Quick Tools */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {transaction ? "Edit Transaction" : "New Transaction"}
          </span>

          {!transaction && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setShowSmartBar((prev) => !prev);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                style={{
                  background: showSmartBar
                    ? "var(--accent)"
                    : "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: showSmartBar
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
                }}
                title="AI / Natural Language Quick Add"
              >
                <Sparkles size={12} strokeWidth={1.75} />
                <span>AI</span>
              </button>

              {onOpenScan && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onOpenScan();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                  title="Scan Receipt / Slip"
                >
                  <ScanLine size={12} strokeWidth={1.75} />
                  <span>Scan</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Header: Full-Width Segmented Tabs */}
        <div
          className="flex p-1 rounded-full mb-5 glass-surface"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {(
            [
              {
                key: "expense" as TabType,
                label: "Expense",
                icon: <ArrowDownCircle size={13.5} strokeWidth={1.75} />,
              },
              {
                key: "income" as TabType,
                label: "Income",
                icon: <ArrowUpCircle size={13.5} strokeWidth={1.75} />,
              },
              {
                key: "transfer" as TabType,
                label: "Transfer",
                icon: <RefreshCcw size={13.5} strokeWidth={1.75} />,
              },
              ...(!transaction
                ? [
                    {
                      key: "split" as TabType,
                      label: "Split",
                      icon: <Users size={13.5} strokeWidth={1.75} />,
                    },
                  ]
                : []),
            ]
          ).map((t) => {
            const isSelected = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  if (t.key === "split") {
                    setType("expense");
                    setIsSplitOpen(true);
                  } else {
                    setType(t.key as TransactionType);
                    setIsSplitOpen(false);
                  }
                  triggerHaptic("light");
                }}
                className="flex-1 py-1.5 rounded-full text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
                  boxShadow: isSelected
                    ? "0 2px 8px rgba(0, 0, 0, 0.15)"
                    : "none",
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Smart Quick Add Drawer */}
        <AnimatePresence>
          {showSmartBar && !transaction && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SmartQuickAddBar
                categories={categories}
                wallets={wallets}
                onApply={(parsed) => {
                  if (parsed.amount !== null && parsed.amount > 0) {
                    setAmount(String(parsed.amount));
                    setAmountInput(parsed.amount.toLocaleString("id-ID"));
                  }
                  if (parsed.type) {
                    setActiveTab(parsed.type);
                    setType(parsed.type);
                    setIsSplitOpen(false);
                  }
                  if (parsed.categoryId) setCategoryId(parsed.categoryId);
                  if (parsed.walletId) setWalletId(parsed.walletId);
                  if (parsed.toWalletId) setToWalletId(parsed.toWalletId);
                  if (parsed.date) setDate(parsed.date);
                  if (parsed.note) setNote(parsed.note);
                  setShowSmartBar(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add Shortcuts */}
        {shortcuts.length > 0 && !transaction && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
            {shortcuts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveTab(s.type);
                  setType(s.type);
                  setIsSplitOpen(false);
                  setAmount(String(s.amount));
                  setAmountInput(Number(s.amount).toLocaleString("id-ID"));
                  setNote(s.note);
                  if (s.category_id) setCategoryId(s.category_id);
                  if (s.wallet_id) setWalletId(s.wallet_id);
                  triggerHaptic("light");
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10.5px] font-medium shrink-0 transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <Zap size={11} fill="currentColor" />
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hero Amount Input: Pre-Resolution Card Capsule with Enlarged Typography */}
        <div className="text-center py-1 mb-5">
          <div
            className="inline-flex items-baseline justify-center gap-2 px-6 py-3 rounded-2xl sm:rounded-3xl transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1.5px solid var(--glass-border)",
              boxShadow:
                "0 4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            }}
          >
            <span
              className="text-[20px] sm:text-[22px] font-bold select-none shrink-0"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "Urbanist, -apple-system, sans-serif",
              }}
            >
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amountInput}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9+\-*/×÷.,\s]*$/.test(val)) {
                  if (/[+\-*/×÷]/.test(val)) {
                    // Math mode: preserve expression like 50.000 + 20.000
                    setAmountInput(val);
                  } else {
                    // Pure numbers: instant live Indonesian thousand separator formatting
                    const rawDigits = val.replace(/\D/g, "");
                    if (!rawDigits) {
                      setAmount("0");
                      setAmountInput("");
                    } else {
                      const limited = rawDigits.slice(0, 11);
                      const num = parseInt(limited, 10);
                      setAmount(String(num));
                      setAmountInput(num.toLocaleString("id-ID"));
                    }
                  }
                }
              }}
              onBlur={() => {
                const evaluated = evaluateMathSafe(amountInput);
                setAmount(String(evaluated));
                setAmountInput(
                  evaluated === 0 ? "" : evaluated.toLocaleString("id-ID"),
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const evaluated = evaluateMathSafe(amountInput);
                  setAmount(String(evaluated));
                  setAmountInput(
                    evaluated === 0 ? "" : evaluated.toLocaleString("id-ID"),
                  );
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="0"
              className="text-[44px] sm:text-[48px] font-black amount tracking-tight leading-none bg-transparent outline-none text-left"
              style={{
                color: "var(--text-primary)",
                fontFamily: "Urbanist, -apple-system, sans-serif",
                width: `${Math.max(1.2, (amountInput || "0").length * 0.72 + 0.2)}ch`,
                maxWidth: "260px",
              }}
            />
          </div>

          {/* Inline Math Preview Badge */}
          {/[+\-*/×÷]/.test(amountInput) && (
            <div className="mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  const evaluated = evaluateMathSafe(amountInput);
                  setAmount(String(evaluated));
                  setAmountInput(
                    evaluated === 0 ? "" : evaluated.toLocaleString("id-ID"),
                  );
                }}
                className="px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer select-none"
                style={{
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
                  color: "#000000",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                }}
              >
                <span>= {formatRupiah(evaluateMathSafe(amountInput))}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  (Tap to apply)
                </span>
              </button>
            </div>
          )}

          {/* Quick Increment & Math Operator Strip: Pre-Resolution Style with Elegant Dark Gradient */}
          <div className="flex items-center justify-center gap-1.5 mt-3.5 px-2">
            {[
              { label: "+10K", add: 10000 },
              { label: "+50K", add: 50000 },
              { label: "+100K", add: 100000 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  const current = evaluateMathSafe(amountInput);
                  const next = current + preset.add;
                  setAmount(String(next));
                  setAmountInput(next.toLocaleString("id-ID"));
                }}
                className="px-3 py-1.5 rounded-xl text-[11.5px] font-bold active:scale-90 transition-transform cursor-pointer select-none"
                style={{
                  background:
                    "linear-gradient(155deg, #222227 0%, #141417 100%)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                  boxShadow:
                    "0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                }}
              >
                {preset.label}
              </button>
            ))}
            <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
            {["+", "-", "×"].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  const base = amountInput ? amountInput.trim() : "0";
                  setAmountInput(`${base} ${op} `);
                }}
                className="w-8 h-7.5 rounded-xl text-[12.5px] font-black flex items-center justify-center active:scale-90 transition-transform cursor-pointer select-none"
                style={{
                  background:
                    "linear-gradient(155deg, #222227 0%, #141417 100%)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  boxShadow:
                    "0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution 5: Horizontal Floating Ribbon & Dynamic Island Pill */}

        {/* 1. Category Ribbon (Zero Truncation, 1-Tap Instant Selection) */}
        {type !== "transfer" && (
          <div className="mb-4.5">
            <div className="flex items-center justify-between mb-2 px-1">
              <span
                className="text-[10.5px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Category
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setMoreCatOpen(true);
                }}
                className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>All</span>
                <ChevronRight size={13} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
              {displayCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCategoryId(cat.id);
                    }}
                    className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12.5px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
                    style={{
                      background: isSelected
                        ? "rgba(255, 255, 255, 0.14)"
                        : "var(--bg-elevated)",
                      border: isSelected
                        ? "1px solid rgba(255, 255, 255, 0.4)"
                        : "1px solid var(--glass-border)",
                      color: isSelected
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                      boxShadow: isSelected
                        ? "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.25)"
                        : "none",
                    }}
                  >
                    <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setMoreCatOpen(true);
                }}
                className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11.5px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px dashed var(--glass-border)",
                  color: "var(--text-tertiary)",
                }}
              >
                <span>+ More</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Account / Wallet Ribbon */}
        {type === "transfer" ? (
          <div className="space-y-3.5 mb-4.5">
            {/* From Account */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  From Account
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setWalletTarget("from");
                    setMoreWalletOpen(true);
                  }}
                  className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>All</span>
                  <ChevronRight size={13} strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                {displayFromWallets.map((w) => {
                  const isSelected = walletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setWalletId(w.id);
                      }}
                      className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12.5px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
                      style={{
                        background: isSelected
                          ? "rgba(255, 255, 255, 0.14)"
                          : "var(--bg-elevated)",
                        border: isSelected
                          ? "1px solid rgba(255, 255, 255, 0.4)"
                          : "1px solid var(--glass-border)",
                        color: isSelected
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        boxShadow: isSelected
                          ? "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.25)"
                          : "none",
                      }}
                    >
                      <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                      <span>{w.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setWalletTarget("from");
                    setMoreWalletOpen(true);
                  }}
                  className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11.5px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px dashed var(--glass-border)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <span>+ More</span>
                </button>
              </div>
            </div>

            {/* To Account */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  To Account
                </span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setWalletTarget("to");
                    setMoreWalletOpen(true);
                  }}
                  className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>All</span>
                  <ChevronRight size={13} strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                {displayToWallets.map((w) => {
                  const isSelected = toWalletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setToWalletId(w.id);
                      }}
                      className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12.5px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
                      style={{
                        background: isSelected
                          ? "rgba(255, 255, 255, 0.14)"
                          : "var(--bg-elevated)",
                        border: isSelected
                          ? "1px solid rgba(255, 255, 255, 0.4)"
                          : "1px solid var(--glass-border)",
                        color: isSelected
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        boxShadow: isSelected
                          ? "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.25)"
                          : "none",
                      }}
                    >
                      <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                      <span>{w.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setWalletTarget("to");
                    setMoreWalletOpen(true);
                  }}
                  className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11.5px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px dashed var(--glass-border)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <span>+ More</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4.5">
            <div className="flex items-center justify-between mb-2 px-1">
              <span
                className="text-[10.5px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Account
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setWalletTarget("from");
                  setMoreWalletOpen(true);
                }}
                className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>All</span>
                <ChevronRight size={13} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
              {displayFromWallets.map((w) => {
                const isSelected = walletId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setWalletId(w.id);
                    }}
                    className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12.5px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
                    style={{
                      background: isSelected
                        ? "rgba(255, 255, 255, 0.14)"
                        : "var(--bg-elevated)",
                      border: isSelected
                        ? "1px solid rgba(255, 255, 255, 0.4)"
                        : "1px solid var(--glass-border)",
                      color: isSelected
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                      boxShadow: isSelected
                        ? "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.25)"
                        : "none",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                    <span>{w.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setWalletTarget("from");
                  setMoreWalletOpen(true);
                }}
                className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11.5px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px dashed var(--glass-border)",
                  color: "var(--text-tertiary)",
                }}
              >
                <span>+ More</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Note & Date/Time Compact Island */}
        <div
          className="rounded-2xl p-3 px-4 mb-5 flex items-center gap-3"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <PenLine
            size={14}
            strokeWidth={1.5}
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="bg-transparent text-[13px] placeholder:text-[12px] placeholder:text-[var(--text-tertiary)] placeholder:opacity-60 font-normal flex-1 outline-none min-w-0"
            style={{
              color: "var(--text-primary)",
              fontFamily: "Urbanist, -apple-system, sans-serif",
            }}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setDateOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl text-[11.5px] font-medium active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <CalendarIcon
                size={12}
                strokeWidth={1.5}
                style={{ color: "var(--text-tertiary)" }}
              />
              <span>{isToday(date) ? "Today" : format(date, "dd/MM")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setTimeOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl text-[11.5px] font-medium active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Clock
                size={12}
                strokeWidth={1.5}
                style={{ color: "var(--text-tertiary)" }}
              />
              <span className="amount">{time}</span>
            </button>
          </div>
        </div>

        {/* Split Transaction & Piutang Configuration */}
        {activeTab === "split" && !transaction && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Split Configuration
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                {splitMode === "friends" ? `${peopleCount} People` : "Multi-Category"}
              </span>
            </div>

            <div
              className="rounded-2xl p-3.5 transition-all select-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="space-y-3">
                  {/* Sub-mode tabs */}
                  <div
                    className="flex p-1 rounded-xl glass-surface"
                    style={{ background: "var(--glass-fill)" }}
                  >
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode("friends");
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
                    style={{
                      background:
                        splitMode === "friends"
                          ? "var(--bg-elevated)"
                          : "transparent",
                      color:
                        splitMode === "friends"
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      boxShadow:
                        splitMode === "friends"
                          ? "var(--shadow-card)"
                          : "none",
                    }}
                  >
                    <Users size={12} />
                    Split with Friends
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode("categories");
                      triggerHaptic("light");
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
                    style={{
                      background:
                        splitMode === "categories"
                          ? "var(--bg-elevated)"
                          : "transparent",
                      color:
                        splitMode === "categories"
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      boxShadow:
                        splitMode === "categories"
                          ? "var(--shadow-card)"
                          : "none",
                    }}
                  >
                    <Layers size={12} />
                    Multi-Category
                  </button>
                </div>

                {splitMode === "friends" ? (
                  <div className="space-y-3">
                    {/* Equal vs Custom Split Toggle */}
                    <div
                      className="flex p-0.5 rounded-xl border border-[var(--glass-border)]"
                      style={{ background: "var(--glass-fill)" }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSplitFriendType("equal");
                          triggerHaptic("light");
                        }}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                        style={{
                          background:
                            splitFriendType === "equal"
                              ? "var(--bg-elevated)"
                              : "transparent",
                          color:
                            splitFriendType === "equal"
                              ? "var(--text-primary)"
                              : "var(--text-tertiary)",
                        }}
                      >
                        Split Equally
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitFriendType("custom");
                          if (customMyShare === 0 && totalAmountNum > 0) {
                            setCustomMyShare(Math.round(totalAmountNum / 2));
                          }
                          triggerHaptic("light");
                        }}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                        style={{
                          background:
                            splitFriendType === "custom"
                              ? "var(--bg-elevated)"
                              : "transparent",
                          color:
                            splitFriendType === "custom"
                              ? "var(--text-primary)"
                              : "var(--text-tertiary)",
                        }}
                      >
                        Custom Share
                      </button>
                    </div>

                    {/* People & Name Selection */}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Total People
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (peopleCount > 2) {
                              setPeopleCount((p) => p - 1);
                              triggerHaptic("light");
                            }
                          }}
                          disabled={peopleCount <= 2}
                          className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span
                          className="text-[12px] font-bold px-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {peopleCount} People
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (peopleCount < 15) {
                              setPeopleCount((p) => p + 1);
                              triggerHaptic("light");
                            }
                          }}
                          disabled={peopleCount >= 15}
                          className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30 cursor-pointer"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Friend Names Input */}
                    <div
                      className="rounded-xl px-3 py-2"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <input
                        type="text"
                        value={friendNames}
                        onChange={(e) => setFriendNames(e.target.value)}
                        placeholder="Friend names (e.g. Alex, Sam)"
                        className="bg-transparent text-[12px] font-medium w-full outline-none"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "Urbanist, sans-serif",
                        }}
                      />
                    </div>

                    {/* Custom Share Numeric Input & Percentage Quick Chips */}
                    {splitFriendType === "custom" && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className="font-medium"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Your Personal Share
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--glass-border)]"
                            style={{
                              background: "var(--glass-fill)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {totalAmountNum > 0
                              ? `${Math.round((myShareFriends / totalAmountNum) * 100)}%`
                              : "0%"}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-2 rounded-xl px-3 py-2"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <span
                            className="text-[12px] font-bold"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Rp
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={customMyShare === 0 ? "" : customMyShare}
                            onChange={(e) => {
                              const val = Math.max(
                                0,
                                Math.min(
                                  totalAmountNum,
                                  Number(e.target.value) || 0,
                                ),
                              );
                              setCustomMyShare(val);
                            }}
                            placeholder="Enter your share..."
                            className="bg-transparent text-[13px] font-bold w-full outline-none amount"
                            style={{ color: "var(--text-primary)" }}
                          />
                        </div>

                        {/* Quick Percentage Chips */}
                        <div className="flex gap-1.5">
                          {[
                            { label: "25%", ratio: 0.25 },
                            { label: "33%", ratio: 1 / 3 },
                            { label: "50%", ratio: 0.5 },
                            { label: "66%", ratio: 2 / 3 },
                            { label: "75%", ratio: 0.75 },
                          ].map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => {
                                setCustomMyShare(
                                  Math.round(totalAmountNum * chip.ratio),
                                );
                                triggerHaptic("light");
                              }}
                              className="flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 cursor-pointer"
                              style={{
                                background: "var(--glass-fill)",
                                border: "1px solid var(--glass-border)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Proportional Monochrome Distribution Bar */}
                    {totalAmountNum > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div
                          className="h-1 rounded-full overflow-hidden flex"
                          style={{ background: "var(--glass-fill)" }}
                        >
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  (myShareFriends / totalAmountNum) * 100,
                                ),
                              )}%`,
                              background: "var(--text-primary)",
                            }}
                          />
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  (friendsShare / totalAmountNum) * 100,
                                ),
                              )}%`,
                              background: "var(--text-tertiary)",
                              opacity: 0.35,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-medium text-[var(--text-tertiary)]">
                          <span>
                            Your Share:{" "}
                            {Math.round((myShareFriends / totalAmountNum) * 100)}
                            %
                          </span>
                          <span>
                            Friends' Share:{" "}
                            {Math.round((friendsShare / totalAmountNum) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dual Result Summary Cards - Monochrome Minimalist */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div
                        className="p-3 rounded-2xl space-y-0.5 border border-[var(--glass-border)]"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"
                        >
                          Your Share
                        </p>
                        <p
                          className="text-[13px] font-bold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(myShareFriends)}
                        </p>
                        <p
                          className="text-[9.5px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Personal Expense
                        </p>
                      </div>
                      <div
                        className="p-3 rounded-2xl space-y-0.5 border border-[var(--glass-border)]"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"
                        >
                          Friends' Share
                        </p>
                        <p
                          className="text-[13px] font-bold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(friendsShare)}
                        </p>
                        <p
                          className="text-[9.5px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Piutang ({peopleCount - 1} friend
                          {peopleCount - 1 > 1 ? "s" : ""}
                          {peopleCount > 2
                            ? ` · ~${formatRupiah(Math.round(friendsShare / (peopleCount - 1)))}/ea`
                            : ""}
                          )
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className="p-2.5 rounded-xl space-y-1"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Part 1 (Primary)
                        </span>
                        <p
                          className="text-[13px] font-extrabold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(cat1Share)}
                        </p>
                        <span
                          className="text-[10px] font-semibold block truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {categories.find((c) => c.id === categoryId)?.name ||
                            "Primary Category"}
                        </span>
                      </div>

                      <div
                        className="p-2.5 rounded-xl space-y-1"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Part 2
                          </span>
                          <select
                            value={itemCatId2 || ""}
                            onChange={(e) => setItemCatId2(e.target.value)}
                            className="bg-transparent text-[10px] font-extrabold outline-none"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {categories.map((c) => (
                              <option
                                key={c.id}
                                value={c.id}
                                style={{ background: "#18181B", color: "#fff" }}
                              >
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p
                          className="text-[13px] font-extrabold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(cat2Share)}
                        </p>
                        <span
                          className="text-[10px] font-semibold block truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {categories.find(
                            (c) =>
                              c.id ===
                              (itemCatId2 ||
                                (categories[1] ? categories[1].id : categoryId)),
                          )?.name || "Secondary Category"}
                        </span>
                      </div>
                    </div>

                    {totalAmountNum > 0 && (
                      <input
                        type="range"
                        min="0"
                        max={totalAmountNum}
                        step={Math.max(1000, Math.round(totalAmountNum / 100))}
                        value={cat1Share}
                        onChange={(e) => setItemAmount1(Number(e.target.value))}
                        className="w-full accent-white cursor-pointer"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* Action Button Bar */}
        <div className="flex items-center gap-2 mt-4 mb-2">
          {transaction && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 shrink-0 transition-all cursor-pointer"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
              title="Delete Transaction"
            >
              <Trash2 size={18} strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              Number(amount) <= 0 ||
              addTx.isPending ||
              updateTx.isPending
            }
            className="flex-1 h-12 rounded-2xl font-semibold text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-white/80"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
              color: "#000000",
              boxShadow:
                "inset 0 1px 0 0 #ffffff, inset 0 -1px 0 0 rgba(0, 0, 0, 0.08), 0 10px 26px -6px rgba(0, 0, 0, 0.55)",
              letterSpacing: "-0.01em",
            }}
          >
            {isSaving || addTx.isPending || updateTx.isPending ? (
              <span className="font-semibold text-black">Saving...</span>
            ) : (
              <>
                <Check size={16} strokeWidth={2.25} className="text-black" />
                <span className="font-semibold text-black">
                  {transaction
                    ? "Update Transaction"
                    : activeTab === "split"
                      ? "Split & Record Expense"
                      : "Save Transaction"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* More Categories Glass Sheet */}
      <BottomSheet
        isOpen={moreCatOpen}
        onClose={() => {
          setMoreCatOpen(false);
          setSearchCatQuery("");
        }}
      >
        <div className="p-5 pb-12">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3
                className="font-extrabold text-[18px] leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Select Category
              </h3>
              <p
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {filteredMoreCategories.length} categories available
              </p>
            </div>
            <button
              onClick={() => {
                setMoreCatOpen(false);
                setSearchCatQuery("");
              }}
              className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              Close
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-3.5">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              value={searchCatQuery}
              onChange={(e) => setSearchCatQuery(e.target.value)}
              placeholder="Search category..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-semibold bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
              style={{
                color: "var(--text-primary)",
                fontFamily: "Urbanist, sans-serif",
              }}
            />
            {searchCatQuery && (
              <button
                onClick={() => setSearchCatQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={13} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>

          {filteredMoreCategories.length === 0 ? (
            <div className="py-8 text-center">
              <p
                className="text-[12px] font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                No categories found matching "{searchCatQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-0.5">
              {filteredMoreCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategoryId(cat.id);
                      setMoreCatOpen(false);
                      setSearchCatQuery("");
                      triggerHaptic("light");
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl active:scale-95 transition-all text-center"
                    style={{
                      background: isSelected
                        ? "var(--glass-fill-strong)"
                        : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isSelected
                        ? "0 4px 16px var(--shadow-strength)"
                        : "none",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                      style={{
                        background: isSelected
                          ? "var(--dock-active-pill)"
                          : "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                    </div>
                    <span className="text-[10.5px] font-bold text-center line-clamp-1 truncate w-full px-0.5">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* More Accounts Glass Sheet */}
      <BottomSheet
        isOpen={moreWalletOpen}
        onClose={() => {
          setMoreWalletOpen(false);
          setSearchWalletQuery("");
        }}
      >
        <div className="p-5 pb-12">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3
                className="font-extrabold text-[18px] leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Select Account / Wallet
              </h3>
              <p
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {walletTarget === "from"
                  ? "Source Account"
                  : "Destination Account"}{" "}
                · {filteredMoreWallets.length} accounts
              </p>
            </div>
            <button
              onClick={() => {
                setMoreWalletOpen(false);
                setSearchWalletQuery("");
              }}
              className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              Close
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-3.5">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              value={searchWalletQuery}
              onChange={(e) => setSearchWalletQuery(e.target.value)}
              placeholder="Search account..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-semibold bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
              style={{
                color: "var(--text-primary)",
                fontFamily: "Urbanist, sans-serif",
              }}
            />
            {searchWalletQuery && (
              <button
                onClick={() => setSearchWalletQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={13} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>

          {filteredMoreWallets.length === 0 ? (
            <div className="py-8 text-center">
              <p
                className="text-[12px] font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                No accounts found matching "{searchWalletQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[60vh] overflow-y-auto no-scrollbar pr-0.5">
              {filteredMoreWallets.map((w) => {
                const isSelected =
                  (walletTarget === "from" ? walletId : toWalletId) === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      if (walletTarget === "from") setWalletId(w.id);
                      else setToWalletId(w.id);
                      setMoreWalletOpen(false);
                      setSearchWalletQuery("");
                      triggerHaptic("light");
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl active:scale-95 transition-all text-center"
                    style={{
                      background: isSelected
                        ? "var(--glass-fill-strong)"
                        : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isSelected
                        ? "0 4px 16px var(--shadow-strength)"
                        : "none",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                      style={{
                        background: isSelected
                          ? "var(--dock-active-pill)"
                          : "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={w.icon} size="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold truncate w-full text-center">
                      {w.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Date Picker Sheet */}
      <BottomSheet isOpen={dateOpen} onClose={() => setDateOpen(false)}>
        <div className="p-5 pb-10 flex flex-col items-center">
          <h3
            className="font-extrabold text-lg mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Select Date
          </h3>
          <GlassDatePicker
            date={date}
            onChange={(d) => {
              setDate(d);
              setDateOpen(false);
            }}
          />
        </div>
      </BottomSheet>

      {/* Glass Time Picker Sheet */}
      <BottomSheet isOpen={timeOpen} onClose={() => setTimeOpen(false)}>
        <div className="p-5 pb-12 flex flex-col items-center">
          <h3
            className="font-extrabold text-lg mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Select Time
          </h3>
          <p
            className="text-[12px] font-medium mb-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Transaction timestamp
          </p>

          <div
            className="p-4 rounded-3xl w-full max-w-[280px] flex items-center justify-center gap-3 glass-surface"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-3xl font-extrabold amount text-center outline-none cursor-pointer"
              style={{ color: "var(--text-primary)", colorScheme: "dark" }}
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2 mt-5">
            {[
              "Morning (08:00)",
              "Noon (12:30)",
              "Evening (17:00)",
              "Night (20:00)",
            ].map((preset) => {
              const t = preset.match(/\((.*?)\)/)?.[1] || "12:00";
              return (
                <button
                  key={preset}
                  onClick={() => {
                    setTime(t);
                    setTimeOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {preset.split(" ")[0]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setTimeOpen(false)}
            className="w-full max-w-[280px] h-11 mt-6 rounded-2xl font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer border border-white/80"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
              color: "#000000",
              boxShadow: "inset 0 1px 0 0 #ffffff, 0 8px 20px -4px rgba(0, 0, 0, 0.45)",
            }}
          >
            Done
          </button>
        </div>
      </BottomSheet>
    </BottomSheet>
  );
}
