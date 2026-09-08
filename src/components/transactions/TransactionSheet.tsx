import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { getFamfinaMatch } from "../../lib/famfinaResolver";

function getTop3Slots<T extends { id: string }>(
  items: T[],
  selectedId: string | null,
): T[] {
  if (items.length <= 3) return items;
  const idx = items.findIndex((item) => item.id === selectedId);
  if (idx === -1 || idx < 3) {
    return items.slice(0, 3);
  }
  return [items[0], items[1], items[idx]];
}

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  MoreHorizontal,
  Trash2,
  Zap,
  Users,
  Layers,
  Plus,
  Minus,
  Search,
  X,
} from "lucide-react";
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

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

export function TransactionSheet({
  isOpen,
  onClose,
  transaction,
}: TransactionSheetProps) {
  const [type, setType] = useState<TransactionType>(
    transaction?.type || "expense",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "0",
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

  // Split Transaction & Piutang State (Innovation 2)
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"friends" | "categories">("friends");
  const [peopleCount, setPeopleCount] = useState(2);
  const [friendNames, setFriendNames] = useState("");
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

  const topCategories = useMemo(() => {
    return getTop3Slots(suggestedCategories, categoryId);
  }, [suggestedCategories, categoryId]);

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

  // Keep track of when modal opens or incoming transaction changes
  const prevOpenRef = useRef(false);
  const prevTxIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isOpening = isOpen && !prevOpenRef.current;
    const isTxChanged = transaction && transaction.id !== prevTxIdRef.current;

    if (isOpen && (isOpening || isTxChanged)) {
      setIsSaving(false);
      if (transaction) {
        setType(transaction.type);
        setAmount(String(transaction.amount || "0"));
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
          const match = getFamfinaMatch(transaction);
          if (match?.categoryName) {
            const foundCat = allCategories.find(
              (c) => c.name.toLowerCase() === match.categoryName.toLowerCase(),
            );
            setCategoryId(
              foundCat
                ? foundCat.id
                : categories.length > 0
                  ? categories[0].id
                  : null,
            );
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
        }

        // 2. Resolve Wallet (From Account)
        let resolvedFromWalletId: string | null = null;
        if (
          transaction.wallet_id &&
          wallets.some((w) => w.id === transaction.wallet_id)
        ) {
          resolvedFromWalletId = transaction.wallet_id;
        } else {
          const match = getFamfinaMatch(transaction);
          if (match?.fromWallet) {
            const foundWallet = wallets.find(
              (w) => w.name.toLowerCase() === match.fromWallet.toLowerCase(),
            );
            if (foundWallet) resolvedFromWalletId = foundWallet.id;
          }
          if (!resolvedFromWalletId && transaction.note) {
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
          const match = getFamfinaMatch(transaction);
          if (match && match.toWallet) {
            const tw = match.toWallet.toLowerCase();
            const foundTo = wallets.find((w) => w.name.toLowerCase() === tw);
            if (foundTo) resolvedToWalletId = foundTo.id;
          }
          if (!resolvedToWalletId && wallets.length > 1) {
            const other = wallets.find((w) => w.id !== resolvedFromWalletId);
            resolvedToWalletId = other ? other.id : wallets[1].id;
          }
        }
        setToWalletId(resolvedToWalletId);
      } else {
        setType("expense");
        setAmount("0");
        setNote("");
        setDate(new Date());
        setTime(format(new Date(), "HH:mm"));
        const defaultCatId =
          suggestedCategories[0]?.id ||
          (categories.length > 0 ? categories[0].id : null);
        const defaultFromId =
          suggestedFromWallets[0]?.id ||
          (wallets.length > 0 ? wallets[0].id : null);
        const defaultToId =
          suggestedToWallets.find((w) => w.id !== defaultFromId)?.id ||
          (wallets.length > 1 ? wallets[1].id : null);
        setCategoryId(defaultCatId);
        setWalletId(defaultFromId);
        setToWalletId(defaultToId);
        setIsSplitOpen(false);
        setSplitMode("friends");
        setPeopleCount(2);
        setFriendNames("");
        setItemCatId2(null);
        setItemAmount1(0);
      }
    }

    prevOpenRef.current = isOpen;
    prevTxIdRef.current = transaction?.id || null;
  }, [
    isOpen,
    transaction,
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
    peopleCount > 0 ? Math.round(totalAmountNum / peopleCount) : totalAmountNum;
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

  const renderWalletRow = (
    selectedId: string | null,
    onSelect: (id: string) => void,
    label: string,
    isTo = false,
  ) => {
    const list = isTo ? suggestedToWallets : suggestedFromWallets;
    const top3 = getTop3Slots(list, selectedId);
    return (
      <div className="mb-3">
        <div className="flex justify-between items-end mb-1.5 px-1">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {label}
          </span>
          <button
            onClick={() => {
              setWalletTarget(isTo ? "to" : "from");
              setMoreWalletOpen(true);
            }}
            className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95"
            style={{ color: "var(--text-secondary)" }}
          >
            More <MoreHorizontal size={12} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {top3.map((w) => {
            const isSelected = selectedId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => onSelect(w.id)}
                className="flex items-center gap-2 p-2.5 rounded-2xl transition-all active:scale-95"
                style={{
                  background: isSelected
                    ? "var(--glass-fill-strong)"
                    : "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: isSelected
                    ? "1.5px solid var(--accent)"
                    : "1px solid var(--glass-border)",
                  boxShadow: isSelected
                    ? "0 0 0 1px var(--accent-glow)"
                    : "none",
                }}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isSelected
                      ? "var(--glass-fill-strong)"
                      : "var(--glass-fill)",
                  }}
                >
                  <IconRenderer icon={w.icon} size="w-4 h-4" />
                </div>
                <span className="text-[12px] font-bold truncate leading-tight">
                  {w.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-2 pb-8">
        {/* Header Segmented Tabs */}
        <div
          className="flex p-1 rounded-full mb-5 glass-surface"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {(["expense", "income", "transfer"] as TransactionType[]).map((t) => {
            const isSelected = type === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  triggerHaptic("light");
                }}
                className="flex-1 py-2 rounded-full text-[12px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
                }}
              >
                {t === "expense" && <ArrowDownCircle size={14} />}
                {t === "income" && <ArrowUpCircle size={14} />}
                {t === "transfer" && <RefreshCcw size={14} />}
                {t === "expense"
                  ? "Expense"
                  : t === "income"
                    ? "Income"
                    : "Transfer"}
              </button>
            );
          })}
        </div>

        {/* Quick Add Shortcuts (Moved below tabs) */}
        {shortcuts.length > 0 && !transaction && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1 mt-3">
            {shortcuts.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setType(s.type);
                  setAmount(String(s.amount));
                  setNote(s.note);
                  if (s.category_id) setCategoryId(s.category_id);
                  if (s.wallet_id) setWalletId(s.wallet_id);
                }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-transform active:scale-95 flex items-center gap-1.5"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Zap size={12} fill="currentColor" />
                {s.title}
              </button>
            ))}
          </div>
        )}

        {/* Hero Amount Input with Native iOS Numberpad */}
        <div className="text-center py-2 mb-3">
          <div
            className="inline-flex items-baseline justify-center gap-1.5 px-4 py-2.5 rounded-2xl transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1.5px solid var(--glass-border)",
            }}
          >
            <span
              className="text-lg font-extrabold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={
                amount === "0" ? "" : Number(amount).toLocaleString("id-ID")
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setAmount(raw === "" ? "0" : raw.slice(0, 11));
              }}
              placeholder="0"
              autoFocus={!transaction}
              className="text-[34px] font-black amount tracking-tight leading-none bg-transparent outline-none text-center min-w-[100px] max-w-[260px]"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Selectors */}
        <div className="space-y-2 mb-3">
          {type !== "transfer" && (
            <div className="mb-3">
              <div className="flex justify-between items-end mb-1.5 px-1">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Category
                </span>
                <button
                  onClick={() => setMoreCatOpen(true)}
                  className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95"
                  style={{ color: "var(--text-secondary)" }}
                >
                  More <MoreHorizontal size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {topCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className="flex items-center gap-2 p-2.5 rounded-2xl transition-all active:scale-95"
                      style={{
                        background: isSelected
                          ? "var(--glass-fill-strong)"
                          : "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        border: isSelected
                          ? "1.5px solid var(--accent)"
                          : "1px solid var(--glass-border)",
                        boxShadow: isSelected
                          ? "0 0 0 1px var(--accent-glow)"
                          : "none",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isSelected
                            ? "var(--glass-fill-strong)"
                            : "var(--glass-fill)",
                        }}
                      >
                        <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                      </div>
                      <span className="text-[12px] font-bold truncate leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {type === "transfer" ? (
            <>
              {renderWalletRow(walletId, setWalletId, "From Account")}
              {renderWalletRow(toWalletId, setToWalletId, "To Account", true)}
            </>
          ) : (
            renderWalletRow(walletId, setWalletId, "Account")
          )}

          {/* Note Input, Date Pill & Time Pill */}
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-2xl px-3.5 py-2.5 flex items-center gap-2"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="bg-transparent text-[14px] font-semibold w-full outline-none"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "Urbanist, sans-serif",
                }}
              />
            </div>
            <button
              onClick={() => setDateOpen(true)}
              className="rounded-2xl px-3 py-2.5 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <CalendarIcon
                size={14}
                style={{ color: "var(--text-secondary)" }}
              />
              <span className="text-[12px] font-bold">
                {isToday(date) ? "Today" : format(date, "dd/MM")}
              </span>
            </button>
            <button
              onClick={() => setTimeOpen(true)}
              className="rounded-2xl px-3 py-2.5 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Clock size={14} style={{ color: "var(--text-secondary)" }} />
              <span className="text-[12px] font-bold amount">{time}</span>
            </button>
          </div>
        </div>

        {/* Split Transaction & Piutang (Innovation 2) */}
        {type === "expense" && !transaction && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => {
                setIsSplitOpen(!isSplitOpen);
                triggerHaptic("light");
              }}
              className="w-full py-2 px-3.5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99]"
              style={{
                background: isSplitOpen
                  ? "var(--glass-fill-strong)"
                  : "var(--bg-elevated)",
                border: isSplitOpen
                  ? "1px solid var(--accent)"
                  : "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <div className="flex items-center gap-2">
                <Users
                  size={14}
                  style={{
                    color: isSplitOpen
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  }}
                />
                <span className="text-[12px] font-bold">
                  Split Transaction & Piutang
                </span>
              </div>
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                style={{
                  background: isSplitOpen
                    ? "var(--accent)"
                    : "var(--glass-fill)",
                  color: isSplitOpen
                    ? "var(--accent-ink)"
                    : "var(--text-tertiary)",
                }}
              >
                {isSplitOpen ? "Active" : "Off"}
              </span>
            </button>

            {isSplitOpen && (
              <div
                className="mt-2 p-3.5 rounded-2xl space-y-3 glass-surface"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
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
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Total Split
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
                          className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span
                          className="text-[12px] font-extrabold px-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {peopleCount} People
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (peopleCount < 10) {
                              setPeopleCount((p) => p + 1);
                              triggerHaptic("light");
                            }
                          }}
                          disabled={peopleCount >= 10}
                          className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-30"
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
                        placeholder="Friend names (e.g. Budi, Andi)"
                        className="bg-transparent text-[12px] font-semibold w-full outline-none"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "Urbanist, sans-serif",
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div
                        className="p-2.5 rounded-xl space-y-0.5"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Your Share
                        </p>
                        <p
                          className="text-[13px] font-extrabold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(myShareFriends)}
                        </p>
                        <p
                          className="text-[9px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Personal Expense
                        </p>
                      </div>
                      <div
                        className="p-2.5 rounded-xl space-y-0.5"
                        style={{ background: "var(--glass-fill)" }}
                      >
                        <p
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Friends' Share
                        </p>
                        <p
                          className="text-[13px] font-extrabold amount"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRupiah(friendsShare)}
                        </p>
                        <p
                          className="text-[9px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Piutang ({peopleCount - 1} friend
                          {peopleCount - 1 > 1 ? "s" : ""})
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
            )}
          </div>
        )}

        {/* Action Button Bar */}
        <div className="flex gap-2 mt-3 mb-2">
          {transaction && (
            <button
              onClick={handleDelete}
              className="w-[52px] rounded-[20px] flex items-center justify-center active:scale-95 shrink-0"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={
              isSaving ||
              Number(amount) <= 0 ||
              addTx.isPending ||
              updateTx.isPending
            }
            className="flex-1 font-extrabold text-[15px] rounded-[20px] py-3.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
              border: "1px solid var(--dock-border)",
            }}
          >
            {isSaving
              ? "Saving..."
              : transaction
                ? "Update Transaction"
                : "Save Transaction"}
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
            onClick={() => setTimeOpen(false)}
            className="w-full max-w-[280px] py-3 mt-6 rounded-2xl font-bold text-[14px] active:scale-95 transition-all"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Done
          </button>
        </div>
      </BottomSheet>
    </BottomSheet>
  );
}
