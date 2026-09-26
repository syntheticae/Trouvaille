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
  Search,
  X,
  ScanLine,
  Sparkles,
  Check,
  PenLine,
  AlertCircle,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { TransactionKeypadSheet } from "./TransactionKeypadSheet";
import { CategorySelectorRibbon } from "./CategorySelectorRibbon";
import { WalletSelectorRibbon } from "./WalletSelectorRibbon";
import { SplitTransactionSection } from "./SplitTransactionSection";
import { motion, AnimatePresence } from "framer-motion";
import { BottomSheet } from "../ui/BottomSheet";
import { useCategories } from "../../hooks/useCategories";
import { useWallets } from "../../hooks/useWallets";
import {
  useAddTransaction,
  useBatchAddTransactions,
  useUpdateTransaction,
  useDeleteTransaction,
  useAllTransactions,
} from "../../hooks/useTransactions";
import { useCategorySuggestions } from "../../hooks/useCategorySuggestions";
import { useWalletSuggestions } from "../../hooks/useWalletSuggestions";
import { useMerchantMemory } from "../../hooks/useMerchantMemory";
import { useBudgetTarget } from "../../hooks/useBudgetTarget";
import { useToast } from "../../contexts/ToastContext";
import { formatRupiah } from "../../lib/utils";
import { format, isToday, parseISO } from "date-fns";
import { IconRenderer } from "../ui/IconRenderer";
import { GlassDatePicker } from "../ui/GlassDatePicker";
import type { Transaction, TransactionType } from "../../lib/types";
import { useShortcuts } from "../../hooks/useShortcuts";
import { SmartQuickAddBar } from "./SmartQuickAddBar";
import { evaluateMathSafe } from "../../lib/evaluateMathSafe";
import { useSpace } from "../../contexts/SpaceContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  isInvestmentOrCryptoWallet,
  syncTransactionWithHolding,
  reverseTransactionWithHolding,
} from "../../lib/holdingSyncEngine";
import {
  getSavedUsdtPref,
  fetchUsdtPriceInIDR,
  USD_IDR_ESTIMATE,
} from "../../lib/marketPriceService";

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
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();
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
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Keypad style preference: liquid custom keypad vs default system keyboard
  const [useCustomKeypad] = useState<boolean>(() => {
    const saved = localStorage.getItem("trouvaille_keypad_mode");
    return saved !== "system";
  });

  // Keypad & Calculator Pad State
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (useCustomKeypad) {
        const timer = setTimeout(() => {
          setIsKeypadOpen(true);
        }, 120);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          amountInputRef.current?.focus();
        }, 180);
        return () => clearTimeout(timer);
      }
    } else {
      setIsKeypadOpen(false);
    }
  }, [isOpen, useCustomKeypad]);

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
  const { user } = useAuth();
  const { data: wallets = [] } = useWallets();

  // Crypto Asset Units and Sync State
  const fromWallet = useMemo(
    () => wallets.find((w) => w.id === walletId),
    [wallets, walletId],
  );
  const toWallet = useMemo(
    () => wallets.find((w) => w.id === toWalletId),
    [wallets, toWalletId],
  );

  const isFromCrypto = useMemo(
    () => isInvestmentOrCryptoWallet(fromWallet),
    [fromWallet],
  );
  const isToCrypto = useMemo(
    () => isInvestmentOrCryptoWallet(toWallet),
    [toWallet],
  );
  const isCryptoInvolved = isFromCrypto || (type === "transfer" && isToCrypto);

  const [cryptoRate, setCryptoRate] = useState<number>(() => {
    return getSavedUsdtPref(user?.id).rate || USD_IDR_ESTIMATE;
  });
  const [cryptoUnits, setCryptoUnits] = useState<string>("");
  const [isUnitsInputMode, setIsUnitsInputMode] = useState<boolean>(false);

  useEffect(() => {
    if (isCryptoInvolved) {
      fetchUsdtPriceInIDR()
        .then((rate) => {
          if (rate > 5000 && rate < 50000) setCryptoRate(rate);
        })
        .catch(() => {});
    }
  }, [isCryptoInvolved]);

  useEffect(() => {
    if (isCryptoInvolved && !isUnitsInputMode) {
      const num = Number(amount) || 0;
      if (num > 0 && cryptoRate > 0) {
        setCryptoUnits(Number((num / cryptoRate).toFixed(4)).toString());
      } else {
        setCryptoUnits("");
      }
    }
  }, [amount, cryptoRate, isCryptoInvolved, isUnitsInputMode]);

  const handleCryptoUnitsChange = (valStr: string) => {
    setCryptoUnits(valStr);
    const u = parseFloat(valStr);
    if (!isNaN(u) && u > 0 && cryptoRate > 0) {
      const calcAmount = Math.round(u * cryptoRate);
      setAmount(String(calcAmount));
      setAmountInput(calcAmount.toLocaleString("id-ID"));
    } else if (!valStr) {
      setAmount("0");
      setAmountInput("");
    }
  };

  const [moreCatOpen, setMoreCatOpen] = useState(false);
  const [moreWalletOpen, setMoreWalletOpen] = useState(false);
  const [searchCatQuery, setSearchCatQuery] = useState("");
  const [searchWalletQuery, setSearchWalletQuery] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [walletTarget, setWalletTarget] = useState<"from" | "to">("from");
  const [showSmartBar, setShowSmartBar] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);

  const activeTags = useMemo(() => {
    if (!note) return [];
    const matches = note.match(/#([a-zA-Z0-9_-]+)/g);
    return matches ? matches.map((m) => m.toLowerCase()) : [];
  }, [note]);

  const { activeSpace, activeSpaceId } = useSpace();

  const selectedSpaceId = useMemo<string>(() => {
    if (transaction?.ledger_id) return transaction.ledger_id;
    if (transaction?.space_id) return transaction.space_id;
    if (
      transaction?.note?.toLowerCase().includes("#business") ||
      transaction?.note?.toLowerCase().includes("#kantor")
    )
      return "business";
    if (
      transaction?.note?.toLowerCase().includes("#travel") ||
      transaction?.note?.toLowerCase().includes("#liburan")
    )
      return "travel";
    return activeSpaceId !== "all" ? activeSpaceId : "personal";
  }, [transaction, activeSpaceId]);

  const handleToggleTag = (tag: string) => {
    triggerHaptic("light");
    const normalized = tag.startsWith("#")
      ? tag.toLowerCase()
      : `#${tag.toLowerCase()}`;
    if (activeTags.includes(normalized)) {
      const regex = new RegExp(`\\s*${normalized}\\b`, "gi");
      const updated = note.replace(regex, "").trim();
      setNote(updated);
    } else {
      const updated = note.trim() ? `${note.trim()} ${normalized}` : normalized;
      setNote(updated);
    }
  };

  // Split Transaction & Piutang State (Innovation 2)
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"friends" | "categories">(
    "friends",
  );
  const [splitFriendType, setSplitFriendType] = useState<"equal" | "custom">(
    "equal",
  );
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
  const { data: allTxs = [] } = useAllTransactions();

  const addTx = useAddTransaction();
  const batchAddTx = useBatchAddTransactions();
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

  const { budgetTarget } = useBudgetTarget();
  const { getMemoryForNote } = useMerchantMemory(allTxs);

  // Smart Merchant & Context Memory
  const merchantPrediction = useMemo(() => {
    if (!note || note.trim().length < 2) return null;
    return getMemoryForNote(note);
  }, [note, getMemoryForNote]);

  const predictedCategory = useMemo(() => {
    if (!merchantPrediction?.categoryId) return null;
    return (
      allCategories.find((c) => c.id === merchantPrediction.categoryId) || null
    );
  }, [merchantPrediction, allCategories]);

  const predictedWallet = useMemo(() => {
    if (!merchantPrediction?.walletId) return null;
    return wallets.find((w) => w.id === merchantPrediction.walletId) || null;
  }, [merchantPrediction, wallets]);

  // Duplicate Transaction Warning Detection (15 min window)
  const isDuplicateDetected = useMemo(() => {
    const currentVal = evaluateMathSafe(amountInput);
    if (!currentVal || currentVal <= 0 || allTxs.length === 0) return false;
    const refTime = date ? date.getTime() : 0;
    if (!refTime) return false;
    return allTxs.some((tx) => {
      if (transaction && tx.id === transaction.id) return false;
      if (tx.amount !== currentVal) return false;
      if (type !== "transfer" && categoryId && tx.category_id !== categoryId)
        return false;
      if (walletId && tx.wallet_id !== walletId) return false;
      const txTime = new Date(tx.created_at || tx.occurred_on).getTime();
      const diffMinutes = Math.abs(refTime - txTime) / (1000 * 60);
      return diffMinutes <= 15;
    });
  }, [amountInput, allTxs, transaction, type, categoryId, walletId, date]);

  // Budget Impact Preview (Expense MTD projection)
  const budgetImpact = useMemo(() => {
    if (type !== "expense" || !categoryId) return null;
    const numFromState = Number(amount);
    const currentVal = /[+\-*/×÷]/.test(amountInput)
      ? evaluateMathSafe(amountInput)
      : !isNaN(numFromState) && numFromState > 0
        ? numFromState
        : evaluateMathSafe(amountInput);
    if (currentVal <= 0) return null;

    const now = date || new Date();
    const currentMonthStr = format(now, "yyyy-MM");

    const existingSpent = allTxs
      .filter((tx) => {
        if (tx.type !== "expense" || tx.category_id !== categoryId)
          return false;
        if (transaction && tx.id === transaction.id) return false;
        const txDateStr = tx.occurred_on || tx.created_at;
        return txDateStr && txDateStr.startsWith(currentMonthStr);
      })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const projectedSpent = existingSpent + currentVal;
    const selectedCat = allCategories.find((c) => c.id === categoryId);
    const catBudget = selectedCat?.budget_amount || null;

    if (catBudget && catBudget > 0) {
      const isOver = projectedSpent > catBudget;
      const remaining = Math.max(0, catBudget - projectedSpent);
      // Remaining budget percentage: 100% when full, 0% when empty or over
      const remainingPct = Math.max(
        0,
        Math.round(((catBudget - projectedSpent) / catBudget) * 100),
      );
      return {
        hasBudget: true,
        categoryName:
          selectedCat?.name || (isIndonesian ? "Kategori" : "Category"),
        projectedSpent,
        budget: catBudget,
        pct: remainingPct,
        isOver,
        remaining,
        diff: projectedSpent - catBudget,
      };
    }

    if (budgetTarget && budgetTarget > 0) {
      const monthExpenses = allTxs
        .filter((tx) => {
          if (tx.type !== "expense") return false;
          if (transaction && tx.id === transaction.id) return false;
          const txDateStr = tx.occurred_on || tx.created_at;
          return txDateStr && txDateStr.startsWith(currentMonthStr);
        })
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const totalProjected = monthExpenses + currentVal;
      const isOver = totalProjected > budgetTarget;
      const remaining = Math.max(0, budgetTarget - totalProjected);
      const remainingPct = Math.max(
        0,
        Math.round(((budgetTarget - totalProjected) / budgetTarget) * 100),
      );

      return {
        hasBudget: true,
        categoryName: isIndonesian ? "Total Anggaran" : "Overall Budget",
        projectedSpent: totalProjected,
        budget: budgetTarget,
        pct: remainingPct,
        isOver,
        remaining,
        diff: totalProjected - budgetTarget,
      };
    }

    return {
      hasBudget: false,
      categoryName:
        selectedCat?.name || (isIndonesian ? "Kategori" : "Category"),
      projectedSpent,
      budget: null,
      pct: null,
      isOver: false,
      remaining: 0,
      diff: 0,
    };
  }, [
    type,
    categoryId,
    amount,
    amountInput,
    date,
    allTxs,
    transaction,
    allCategories,
    budgetTarget,
    isIndonesian,
  ]);

  const filteredMoreCategories = useMemo(() => {
    if (!moreCatOpen) return [];
    if (!searchCatQuery.trim()) return suggestedCategories;
    const q = searchCatQuery.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [moreCatOpen, categories, suggestedCategories, searchCatQuery]);

  const filteredMoreWallets = useMemo(() => {
    if (!moreWalletOpen) return [];
    const list =
      walletTarget === "to" ? suggestedToWallets : suggestedFromWallets;
    if (!searchWalletQuery.trim()) return list;
    const q = searchWalletQuery.toLowerCase();
    return wallets.filter((w) => w.name.toLowerCase().includes(q));
  }, [
    moreWalletOpen,
    wallets,
    suggestedToWallets,
    suggestedFromWallets,
    walletTarget,
    searchWalletQuery,
  ]);

  // Resolution 5 Ribbons: Ensure selected items are always present in the horizontal list
  const displayCategories = useMemo(() => {
    if (!categoryId) return suggestedCategories.slice(0, 10);
    const inTop = suggestedCategories
      .slice(0, 10)
      .some((c) => c.id === categoryId);
    if (inTop) return suggestedCategories.slice(0, 10);
    const selectedCat = categories.find((c) => c.id === categoryId);
    return selectedCat
      ? [
          selectedCat,
          ...suggestedCategories.filter((c) => c.id !== categoryId).slice(0, 9),
        ]
      : suggestedCategories.slice(0, 10);
  }, [suggestedCategories, categories, categoryId]);

  const displayFromWallets = useMemo(() => {
    if (!walletId) return suggestedFromWallets.slice(0, 8);
    const inTop = suggestedFromWallets
      .slice(0, 8)
      .some((w) => w.id === walletId);
    if (inTop) return suggestedFromWallets.slice(0, 8);
    const selectedW = wallets.find((w) => w.id === walletId);
    return selectedW
      ? [
          selectedW,
          ...suggestedFromWallets.filter((w) => w.id !== walletId).slice(0, 7),
        ]
      : suggestedFromWallets.slice(0, 8);
  }, [suggestedFromWallets, wallets, walletId]);

  const displayToWallets = useMemo(() => {
    if (!toWalletId) return suggestedToWallets.slice(0, 8);
    const inTop = suggestedToWallets
      .slice(0, 8)
      .some((w) => w.id === toWalletId);
    if (inTop) return suggestedToWallets.slice(0, 8);
    const selectedW = wallets.find((w) => w.id === toWalletId);
    return selectedW
      ? [
          selectedW,
          ...suggestedToWallets.filter((w) => w.id !== toWalletId).slice(0, 7),
        ]
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
          initialValues?.amount !== undefined &&
          initialValues?.amount !== null &&
          initialValues.amount > 0
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
            : suggestedCategories[0]?.id ||
              (categories.length > 0 ? categories[0].id : null);
        const defaultFromId =
          initialValues?.walletId !== undefined
            ? initialValues.walletId
            : suggestedFromWallets[0]?.id ||
              (wallets.length > 0 ? wallets[0].id : null);
        const defaultToId =
          initialValues?.toWalletId !== undefined
            ? initialValues.toWalletId
            : suggestedToWallets.find((w) => w.id !== defaultFromId)?.id ||
              (wallets.length > 1 ? wallets[1].id : null);
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
      ? peopleCount > 0
        ? Math.round(totalAmountNum / peopleCount)
        : totalAmountNum
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
      showToast(
        isIndonesian
          ? "Pilih akun yang valid sebelum menyimpan"
          : "Choose a valid wallet before saving",
        "delete",
        () => {},
      );
      return;
    }

    if (type === "transfer") {
      if (!isUUID(effectiveWalletId) || !isUUID(effectiveToWalletId)) {
        setIsSaving(false);
        showToast(
          isIndonesian
            ? "Pilih akun asal dan akun tujuan"
            : "Choose both source and destination wallets",
          "delete",
          () => {},
        );
        return;
      }
      if (effectiveWalletId === effectiveToWalletId) {
        setIsSaving(false);
        showToast(
          isIndonesian
            ? "Akun transfer harus berbeda"
            : "Transfer wallets must be different",
          "delete",
          () => {},
        );
        return;
      }
    }

    if (type !== "transfer" && !isUUID(effectiveCatId)) {
      setIsSaving(false);
      showToast(
        isIndonesian
          ? "Pilih kategori yang valid sebelum menyimpan"
          : "Choose a valid category before saving",
        "delete",
        () => {},
      );
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
          ? `${note.trim()} [Split: ${isIndonesian ? "Porsi saya" : "My share"}]`
          : isIndonesian
            ? "Patungan [Porsi saya]"
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
        showToast(
          isIndonesian
            ? "Menyimpan transaksi patungan..."
            : "Saving split transaction...",
          "info",
          null,
          1600,
        );
        addTx.mutate(tx1, {
          onSuccess: () => {
            addTx.mutate(tx2, {
              onSuccess: () => {
                triggerSuccessHaptic();
                showToast(
                  isIndonesian
                    ? "Patungan & Piutang berhasil dicatat!"
                    : "Split bill & Piutang recorded!",
                  "add",
                  () => {},
                );
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
          itemCatId2 ||
          (categories.length > 1 ? categories[1].id : effectiveCatId);

        if (cat2Amount > 0) {
          const tx1 = {
            type: "expense" as const,
            amount: cat1Amount,
            note: note.trim()
              ? `${note.trim()} [${isIndonesian ? "Bagian 1" : "Part 1"}]`
              : isIndonesian
                ? "Multi-kategori [Bagian 1]"
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
              ? `${note.trim()} [${isIndonesian ? "Bagian 2" : "Part 2"}]`
              : isIndonesian
                ? "Multi-kategori [Bagian 2]"
                : "Multi-category [Part 2]",
            occurred_on: format(date, "yyyy-MM-dd"),
            created_at: new Date(txDate.getTime() + 1000).toISOString(),
            category_id: isUUID(effectiveCat2Id) ? effectiveCat2Id : null,
            wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
            to_wallet_id: null,
          };

          onClose();
          showToast(
            isIndonesian
              ? "Menyimpan transaksi multi-kategori..."
              : "Saving multi-category transaction...",
            "info",
            null,
            1600,
          );
          addTx.mutate(tx1, {
            onSuccess: () => {
              addTx.mutate(tx2, {
                onSuccess: () => {
                  triggerSuccessHaptic();
                  showToast(
                    isIndonesian
                      ? "Transaksi multi-kategori berhasil dicatat!"
                      : "Multi-category transaction recorded!",
                    "add",
                    () => {},
                  );
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
      space_id: selectedSpaceId === "personal" ? null : selectedSpaceId,
      ledger_id: selectedSpaceId || "personal",
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
      showToast(
        isIndonesian ? "Menyimpan transaksi..." : "Saving transaction...",
        "info",
        null,
        1600,
      );
    }

    // Synchronize with investment holding if crypto/investment wallet is involved
    const effectiveUnits = cryptoUnits ? parseFloat(cryptoUnits) : undefined;
    if (isCryptoInvolved) {
      syncTransactionWithHolding(
        {
          type,
          amount: numAmount,
          wallet_id: effectiveWalletId,
          to_wallet_id: effectiveToWalletId,
          occurred_on: format(date, "yyyy-MM-dd"),
          note,
          customUnits: effectiveUnits,
          customPrice: cryptoRate,
        },
        wallets,
        user?.id,
      );
    }

    // Close sheet immediately for instant response
    onClose();

    if (transaction && transaction.id) {
      updateTx.mutate(
        { id: transaction.id, ...payload },
        {
          onSuccess: () => {
            triggerSuccessHaptic();
            showToast(
              isIndonesian ? "Transaksi diperbarui" : "Transaction updated",
              "update",
              () => {},
            );
          },
          onError: (err) => {
            console.error("Update tx error:", err);
            showToast(
              isIndonesian
                ? "Gagal memperbarui transaksi"
                : "Failed to update transaction",
              "delete",
              () => {},
            );
          },
        },
      );
    } else {
      addTx.mutate(payload, {
        onSuccess: () => {
          triggerSuccessHaptic();
          showToast(
            isIndonesian ? "Transaksi ditambahkan" : "Transaction added",
            "add",
            () => {},
          );
        },
        onError: () => {
          showToast(
            isIndonesian
              ? "Gagal menyimpan transaksi"
              : "Failed to save transaction",
            "delete",
            () => {},
          );
        },
      });
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    if (isCryptoInvolved) {
      reverseTransactionWithHolding(
        {
          type: transaction.type,
          amount: Number(transaction.amount),
          wallet_id: transaction.wallet_id,
          to_wallet_id: transaction.to_wallet_id,
          occurred_on: transaction.occurred_on,
          note: transaction.note,
        },
        wallets,
        user?.id,
      );
    }
    deleteTx.mutate(transaction.id, {
      onSuccess: () => {
        showToast(
          isIndonesian ? "Transaksi dihapus" : "Transaction deleted",
          "delete",
          () => {},
        );
        onClose();
      },
    });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div
        className={`px-5 pt-3.5 transition-all duration-300 ${
          isKeypadOpen && useCustomKeypad ? "pb-[270px]" : "pb-8"
        }`}
      >
        {/* Header: Full-Width Segmented Tabs */}
        <div
          className="flex p-1 rounded-full mb-5 glass-surface"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {[
            {
              key: "expense" as TabType,
              label: isIndonesian ? "Pengeluaran" : "Expense",
              icon: <ArrowDownCircle size={13.5} strokeWidth={1.75} />,
            },
            {
              key: "income" as TabType,
              label: isIndonesian ? "Pemasukan" : "Income",
              icon: <ArrowUpCircle size={13.5} strokeWidth={1.75} />,
            },
            {
              key: "transfer" as TabType,
              label: isIndonesian ? "Transfer" : "Transfer",
              icon: <RefreshCcw size={13.5} strokeWidth={1.75} />,
            },
            ...(!transaction
              ? [
                  {
                    key: "split" as TabType,
                    label: isIndonesian ? "Patungan" : "Split",
                    icon: <Users size={13.5} strokeWidth={1.75} />,
                  },
                ]
              : []),
          ].map((t) => {
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
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
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

        {/* Hero Amount Input: Centered, Elongated Luxury Card Capsule */}
        <div className="text-center py-1 mb-5">
          <div
            onClick={() => {
              if (useCustomKeypad) {
                triggerHaptic("light");
                setIsKeypadOpen(true);
              } else {
                amountInputRef.current?.focus();
              }
            }}
            className={`w-full max-w-[320px] sm:max-w-[350px] mx-auto flex items-baseline justify-center gap-2.5 px-6 py-3.5 rounded-2xl sm:rounded-3xl transition-all cursor-pointer select-none ${
              isKeypadOpen && useCustomKeypad
                ? "border-white/35 dark:border-white/40 ring-2 ring-white/10"
                : "active:border-white/20"
            }`}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: isDark
                ? "0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
                : "0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 0 #ffffff",
            }}
          >
            <span
              onClick={() => {
                if (useCustomKeypad) {
                  triggerHaptic("light");
                  setIsKeypadOpen(true);
                } else {
                  amountInputRef.current?.focus();
                }
              }}
              className="text-[20px] sm:text-[22px] font-bold select-none shrink-0 cursor-pointer"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "Urbanist, -apple-system, sans-serif",
              }}
            >
              Rp
            </span>
            <input
              ref={amountInputRef}
              type="text"
              readOnly={useCustomKeypad}
              inputMode={useCustomKeypad ? "none" : "numeric"}
              pattern="[0-9]*"
              value={amountInput}
              onClick={() => {
                if (useCustomKeypad) {
                  triggerHaptic("light");
                  setIsKeypadOpen(true);
                }
              }}
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
              className="text-[42px] sm:text-[46px] font-semibold amount tracking-tight leading-none bg-transparent outline-none text-left min-w-[60px] max-w-[240px] cursor-pointer"
              style={{
                color: "var(--text-primary)",
                fontFamily: "Urbanist, -apple-system, sans-serif",
                width: `${Math.max(1.8, (amountInput || "0").length + 1)}ch`,
              }}
            />
          </div>

          {/* Inline Math Preview Badge (Only if manually typed in system mode) */}
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
                className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer select-none"
                style={{
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
                  color: "#000000",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                }}
              >
                <span>= {formatRupiah(evaluateMathSafe(amountInput))}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  {isIndonesian ? "(Ketuk untuk terapkan)" : "(Tap to apply)"}
                </span>
              </button>
            </div>
          )}

          {/* Quick Increment Chips: Clean, Single Minimalist Row */}
          <div className="flex items-center justify-center gap-2 mt-3 px-2">
            {[
              { label: "+10K", add: 10000 },
              { label: "+50K", add: 50000 },
              { label: "+100K", add: 100000 },
              { label: "+500K", add: 500000 },
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
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold active:scale-95 transition-all cursor-pointer select-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                  boxShadow: isDark
                    ? "0 1px 4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
                    : "0 1px 3px rgba(0, 0, 0, 0.03), inset 0 1px 0 #ffffff",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Crypto & Asset Execution Helper (Monochrome Apple Luxury) */}
          {isCryptoInvolved && (
            <div
              className="mt-3.5 p-3 rounded-2xl max-w-[340px] mx-auto text-left space-y-2 select-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins
                    size={13}
                    strokeWidth={1.75}
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <span
                    className="text-[11px] font-semibold tracking-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isFromCrypto && type === "transfer"
                      ? isIndonesian
                        ? "Penarikan P2P"
                        : "P2P Withdrawal / Penarikan"
                      : isToCrypto && type === "transfer"
                        ? isIndonesian
                          ? "Pembelian / Setoran P2P"
                          : "P2P Purchase / Deposit"
                        : type === "income"
                          ? isIndonesian
                            ? "Hasil Staking / Pemasukan"
                            : "Staking Yield / Income"
                          : isIndonesian
                            ? "Eksekusi Aset Kripto"
                            : "Crypto Asset Execution"}
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  1 USDT ≈ Rp {cryptoRate.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Units Input & Live Preview */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--glass-border)]/40">
                <div className="flex-1">
                  <div
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Kuantitas Koin" : "Coin Quantity"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      step="any"
                      value={cryptoUnits}
                      onFocus={() => setIsUnitsInputMode(true)}
                      onBlur={() => setIsUnitsInputMode(false)}
                      onChange={(e) => handleCryptoUnitsChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-[13px] font-mono font-semibold bg-transparent outline-none py-0.5 px-1.5 rounded-md"
                      style={{
                        color: "var(--text-primary)",
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    />
                    <span
                      className="text-[11px] font-semibold uppercase shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      USDT
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Dampak Kepemilikan" : "Holding Impact"}
                  </div>
                  <div
                    className="text-[12px] font-mono font-semibold mt-1"
                    style={{
                      color:
                        isFromCrypto &&
                        (type === "transfer" || type === "expense")
                          ? "#ef4444"
                          : "var(--accent, #10b981)",
                    }}
                  >
                    {isFromCrypto && (type === "transfer" || type === "expense")
                      ? `-${cryptoUnits || "0"} USDT`
                      : `+${cryptoUnits || "0"} USDT`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Transaction Warning (Monochrome Apple Luxury Alert) */}
          {isDuplicateDetected && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 mx-2 px-3 py-2 rounded-xl flex items-center gap-2 text-[12px] font-medium"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#fca5a5",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <AlertCircle size={14} className="shrink-0" strokeWidth={2} />
              <span>
                {isIndonesian
                  ? "Kemungkinan duplikat: transaksi serupa tercatat dalam 15 menit terakhir"
                  : "Possible duplicate: similar transaction recorded within 15 mins"}
              </span>
            </motion.div>
          )}

          {/* Budget Impact Preview (Live Financial Feedback) */}
          {budgetImpact && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2.5 mx-2 px-3 py-2 rounded-xl flex items-center justify-between text-[11px] font-medium"
              style={{
                background: budgetImpact.isOver
                  ? "rgba(239, 68, 68, 0.12)"
                  : "var(--glass-fill)",
                border: budgetImpact.isOver
                  ? "1px solid rgba(239, 68, 68, 0.35)"
                  : "1px solid var(--glass-border)",
                color: budgetImpact.isOver
                  ? "#fca5a5"
                  : "var(--text-secondary)",
              }}
            >
              <div className="flex items-center gap-1.5 truncate pr-2">
                {budgetImpact.isOver ? (
                  <AlertTriangle
                    size={13}
                    strokeWidth={1.75}
                    className="shrink-0 text-red-400"
                  />
                ) : (
                  <span
                    className="font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {budgetImpact.categoryName}
                  </span>
                )}
                <span>·</span>
                <span className="truncate">
                  {budgetImpact.hasBudget
                    ? budgetImpact.isOver
                      ? isIndonesian
                        ? `Melebihi Anggaran: +${formatRupiah(budgetImpact.diff)}`
                        : `Budget Exceeded: +${formatRupiah(budgetImpact.diff)}`
                      : isIndonesian
                        ? `Sisa: ${formatRupiah(budgetImpact.remaining)}`
                        : `Remaining: ${formatRupiah(budgetImpact.remaining)}`
                    : isIndonesian
                      ? `Total Bulan: ${formatRupiah(budgetImpact.projectedSpent)}`
                      : `Month Total: ${formatRupiah(budgetImpact.projectedSpent)}`}
                </span>
              </div>
              {budgetImpact.hasBudget && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: budgetImpact.isOver
                        ? "rgba(239, 68, 68, 0.25)"
                        : "var(--bg-elevated)",
                      color: budgetImpact.isOver
                        ? "#fca5a5"
                        : "var(--text-primary)",
                      border: budgetImpact.isOver
                        ? "1px solid rgba(239, 68, 68, 0.4)"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    {budgetImpact.pct}% {isIndonesian ? "tersisa" : "left"}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Resolution 5: Horizontal Floating Ribbon & Dynamic Island Pill */}

        {/* 1. Category Ribbon (Zero Truncation, 1-Tap Instant Selection) */}
        {type !== "transfer" && (
          <CategorySelectorRibbon
            categories={displayCategories}
            selectedCategoryId={categoryId}
            onSelectCategory={(id) => setCategoryId(id)}
            onOpenMore={() => setMoreCatOpen(true)}
          />
        )}

        {/* 2. Account / Wallet Ribbon */}
        <WalletSelectorRibbon
          type={type}
          displayFromWallets={displayFromWallets}
          displayToWallets={displayToWallets}
          walletId={walletId}
          toWalletId={toWalletId}
          onSelectWallet={(id) => setWalletId(id)}
          onSelectToWallet={(id) => setToWalletId(id)}
          onOpenMore={(target) => {
            setWalletTarget(target);
            setMoreWalletOpen(true);
          }}
        />
        {/* 3. Note & Date/Time Compact Island with Dynamic Focus Animation */}
        <div
          className="rounded-2xl p-3 px-4 mb-3.5 flex items-center gap-3 transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: isNoteFocused
              ? isDark
                ? "1px solid rgba(255, 255, 255, 0.3)"
                : "1px solid rgba(0, 0, 0, 0.25)"
              : "1px solid var(--glass-border)",
            boxShadow: isNoteFocused
              ? isDark
                ? "0 4px 14px rgba(0, 0, 0, 0.35)"
                : "0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 #ffffff"
              : isDark
                ? "none"
                : "0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 0 #ffffff",
          }}
        >
          <PenLine
            size={14}
            strokeWidth={1.5}
            style={{
              color: isNoteFocused
                ? "var(--text-primary)"
                : "var(--text-tertiary)",
            }}
          />
          <input
            type="text"
            value={note}
            onFocus={() => setIsNoteFocused(true)}
            onBlur={() => setIsNoteFocused(false)}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isIndonesian
                ? "Tambah catatan (opsional)..."
                : "Add a note (optional)..."
            }
            className="bg-transparent text-[13px] placeholder:text-[12px] placeholder:text-[var(--text-tertiary)] placeholder:opacity-60 font-normal flex-1 outline-none min-w-0"
            style={{
              color: "var(--text-primary)",
              fontFamily: "Urbanist, -apple-system, sans-serif",
            }}
          />

          {/* Smooth hiding of Date and Time pills when typing note so text expands full width */}
          <AnimatePresence>
            {!isNoteFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-1.5 shrink-0 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setDateOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-medium active:scale-95 transition-all cursor-pointer flex items-center gap-1"
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
                  <span>
                    {isToday(date)
                      ? isIndonesian
                        ? "Hari Ini"
                        : "Today"
                      : format(date, "dd/MM")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setTimeOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-medium active:scale-95 transition-all cursor-pointer flex items-center gap-1"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dedicated Ledger Active Notice */}
        {activeSpace &&
          activeSpace.id !== "all" &&
          activeSpace.id !== "personal" && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>
                  Ledger:{" "}
                  <strong className="text-[var(--text-primary)]">
                    {activeSpace.name}
                  </strong>
                </span>
              </div>
              {activeSpace.tag ? (
                <button
                  type="button"
                  onClick={() => handleToggleTag(activeSpace.tag!)}
                  className="text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  {activeTags.includes(activeSpace.tag.toLowerCase())
                    ? isIndonesian
                      ? "Tertaut"
                      : "Tagged"
                    : isIndonesian
                      ? `Lampirkan ${activeSpace.tag}`
                      : `Attach ${activeSpace.tag}`}
                </button>
              ) : (
                <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full">
                  {isIndonesian ? "Otomatis tertaut" : "Auto-linked"}
                </span>
              )}
            </div>
          )}

        {/* Reimbursable Highlight Notice */}
        {activeTags.includes("#reimburse") && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>
              {isIndonesian ? (
                <>
                  Tag <strong>#reimburse</strong> aktif · Ditandai untuk klaim
                  penggantian biaya
                </>
              ) : (
                <>
                  Tag <strong>#reimburse</strong> active · Marked for expense
                  reimbursement claim
                </>
              )}
            </span>
          </div>
        )}

        {/* Smart Merchant & Context Memory Suggestion Chip */}
        {merchantPrediction && (predictedCategory || predictedWallet) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 px-1 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                if (merchantPrediction.categoryId)
                  setCategoryId(merchantPrediction.categoryId);
                if (merchantPrediction.walletId)
                  setWalletId(merchantPrediction.walletId);
              }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer select-none"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Sparkles size={12} className="text-[var(--accent)] shrink-0" />
              <span>{isIndonesian ? "Cocok pintar:" : "Smart match:"}</span>
              {predictedCategory && (
                <span
                  className="font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {predictedCategory.name}
                </span>
              )}
              {predictedWallet && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  ({predictedWallet.name})
                </span>
              )}
              <span
                className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                {isIndonesian ? "Terapkan" : "Apply"}
              </span>
            </button>
          </motion.div>
        )}

        {/* Collapsible Smart Quick Add Drawer (Positioned Directly Below Note Island) */}
        <AnimatePresence>
          {showSmartBar && !transaction && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
                onBatchApply={(parsedList) => {
                  triggerSuccessHaptic();
                  const payloads = parsedList.map((item) => {
                    const itemType = item.type || "expense";
                    const itemCat =
                      categories.find((c) => c.id === item.categoryId) ||
                      (categories.length > 0 ? categories[0] : null);
                    const itemWallet =
                      wallets.find((w) => w.id === item.walletId) ||
                      (wallets.length > 0 ? wallets[0] : null);
                    const itemToWallet =
                      itemType === "transfer"
                        ? wallets.find((w) => w.id === item.toWalletId) ||
                          wallets.find((w) => w.id !== itemWallet?.id) ||
                          null
                        : null;
                    const txDate = item.date || new Date();

                    return {
                      type: itemType,
                      amount: item.amount || 0,
                      note: item.note || null,
                      occurred_on: format(txDate, "yyyy-MM-dd"),
                      created_at: txDate.toISOString(),
                      category_id:
                        itemType === "transfer" ? null : itemCat?.id || null,
                      wallet_id: itemWallet?.id || null,
                      to_wallet_id:
                        itemType === "transfer"
                          ? itemToWallet?.id || null
                          : null,
                    };
                  });

                  batchAddTx.mutate(payloads, {
                    onSuccess: () => {
                      showToast(
                        `${parsedList.length} ${
                          isIndonesian
                            ? "transaksi disimpan"
                            : "transactions saved"
                        }`,
                        "add",
                        () => {},
                      );
                      setShowSmartBar(false);
                      onClose();
                    },
                    onError: (err: any) => {
                      showToast(
                        err?.message ||
                          (isIndonesian
                            ? "Gagal menyimpan transaksi"
                            : "Failed to save transactions"),
                        "delete",
                        () => {},
                      );
                    },
                  });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split Transaction & Piutang Configuration */}
        {activeTab === "split" && !transaction && (
          <SplitTransactionSection
            splitMode={splitMode}
            setSplitMode={setSplitMode}
            splitFriendType={splitFriendType}
            setSplitFriendType={setSplitFriendType}
            peopleCount={peopleCount}
            setPeopleCount={setPeopleCount}
            friendNames={friendNames}
            setFriendNames={setFriendNames}
            customMyShare={customMyShare}
            setCustomMyShare={setCustomMyShare}
            totalAmountNum={totalAmountNum}
            wallets={wallets}
            categories={categories}
            categoryId={categoryId}
            itemCatId2={itemCatId2}
            setItemCatId2={(id) => setItemCatId2(id)}
            cat1Share={cat1Share}
            cat2Share={cat2Share}
            setItemAmount1={(amt) => setItemAmount1(amt)}
            myShareFriends={myShareFriends}
            friendsShare={friendsShare}
          />
        )}

        {/* Action Button Bar: Scan (Left), Save (Center), Quick Add (Right) */}
        <div className="flex items-center gap-2.5 mt-4 mb-2">
          {transaction ? (
            <button
              type="button"
              onClick={handleDelete}
              className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 shrink-0 transition-all cursor-pointer"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
              title={isIndonesian ? "Hapus Transaksi" : "Delete Transaction"}
            >
              <Trash2 size={18} strokeWidth={1.75} />
            </button>
          ) : onOpenScan ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onOpenScan();
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer select-none"
              style={{
                background: isDark
                  ? "linear-gradient(155deg, #1f1f24 0%, #121215 100%)"
                  : "linear-gradient(180deg, #ffffff 0%, #f4f4f7 100%)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                boxShadow: isDark
                  ? "0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
                  : "0 2px 6px rgba(0, 0, 0, 0.04), inset 0 1px 0 #ffffff",
              }}
              title={
                isIndonesian
                  ? "Pindai Struk / Bukti Transfer"
                  : "Scan Receipt / Slip"
              }
              aria-label={
                isIndonesian
                  ? "Pindai Struk atau Bukti Transfer"
                  : "Scan Receipt or Slip"
              }
            >
              <ScanLine size={18} strokeWidth={1.75} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              Number(amount) <= 0 ||
              addTx.isPending ||
              updateTx.isPending
            }
            className="flex-1 h-12 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: isDark
                ? "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)"
                : "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
              color: isDark ? "#000000" : "#ffffff",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.8)"
                : "1px solid #18181b",
              boxShadow: isDark
                ? "inset 0 1px 0 0 #ffffff, inset 0 -1px 0 0 rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.4)"
                : "inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 4px 14px rgba(0, 0, 0, 0.15)",
              letterSpacing: "-0.01em",
            }}
          >
            {isSaving || addTx.isPending || updateTx.isPending ? (
              <span className="font-semibold">
                {isIndonesian ? "Menyimpan..." : "Saving..."}
              </span>
            ) : (
              <>
                <Check size={16} strokeWidth={2.25} />
                <span className="font-semibold">
                  {transaction
                    ? isIndonesian
                      ? "Perbarui Transaksi"
                      : "Update Transaction"
                    : activeTab === "split"
                      ? isIndonesian
                        ? "Bagi & Catat Pengeluaran"
                        : "Split & Record Expense"
                      : isIndonesian
                        ? "Simpan Transaksi"
                        : "Save Transaction"}
                </span>
              </>
            )}
          </button>

          {!transaction && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setShowSmartBar((prev) => !prev);
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer select-none"
              style={{
                background: showSmartBar
                  ? "var(--accent)"
                  : isDark
                    ? "linear-gradient(155deg, #1f1f24 0%, #121215 100%)"
                    : "linear-gradient(180deg, #ffffff 0%, #f4f4f7 100%)",
                border: "1px solid var(--glass-border)",
                color: showSmartBar
                  ? "var(--accent-ink)"
                  : "var(--text-primary)",
                boxShadow: isDark
                  ? "0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
                  : "0 2px 6px rgba(0, 0, 0, 0.04), inset 0 1px 0 #ffffff",
              }}
              title={
                isIndonesian
                  ? "Tambah Cepat Suara / Teks Alami"
                  : "Voice / Natural Language Quick Add"
              }
              aria-label={isIndonesian ? "Tambah Cepat" : "Quick Add"}
            >
              <Sparkles size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* ================================================================
    MORE CATEGORIES — MILKY LIQUID GLASS / 3-COLUMN PILL GRID
    ================================================================ */}
      <BottomSheet
        isOpen={moreCatOpen}
        onClose={() => {
          setMoreCatOpen(false);
          setSearchCatQuery("");
        }}
      >
        <div className="px-4 pt-1 pb-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h3
                className="
            font-semibold
            text-[17px]
            leading-[1.15]
            tracking-[-0.02em]
          "
                style={{
                  color: "var(--text-primary)",
                }}
              >
                {isIndonesian ? "Pilih Kategori" : "Select Category"}
              </h3>

              <p
                className="text-[10px] font-medium mt-1"
                style={{
                  color: "var(--text-tertiary)",
                }}
              >
                {filteredMoreCategories.length}{" "}
                {isIndonesian ? "kategori tersedia" : "categories available"}
              </p>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                setMoreCatOpen(false);
                setSearchCatQuery("");
              }}
              className="
          shrink-0
          h-8
          px-3.5
          rounded-full
          text-[11px]
          font-semibold
          cursor-pointer
          select-none
          transition-all
          duration-150
          active:scale-[0.96]
        "
              style={{
                background: isDark
                  ? "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.045) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.8) 100%)",
                color: "var(--text-secondary)",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(255,255,255,0.92)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 10px rgba(0,0,0,0.18)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.1)",
                backdropFilter: "blur(18px) saturate(155%)",
                WebkitBackdropFilter: "blur(18px) saturate(155%)",
              }}
            >
              {isIndonesian ? "Tutup" : "Close"}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={15}
              strokeWidth={1.8}
              className="
          absolute
          left-3.5
          top-1/2
          -translate-y-1/2
          pointer-events-none
        "
              style={{
                color: "var(--text-tertiary)",
              }}
            />

            <input
              type="text"
              value={searchCatQuery}
              onChange={(e) => setSearchCatQuery(e.target.value)}
              placeholder={
                isIndonesian ? "Cari kategori..." : "Search category..."
              }
              className="
          w-full
          h-11
          pl-10
          pr-9
          rounded-[14px]
          text-[12px]
          font-medium
          outline-none
          transition-all
          duration-200
        "
              style={{
                background: isDark
                  ? "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.70) 100%)",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.10)"
                  : "1px solid rgba(205,205,205,0.38)",
                color: "var(--text-primary)",
                fontFamily: "Urbanist, sans-serif",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 10px rgba(0,0,0,0.12)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 12px rgba(15,23,42,0.145)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
              }}
            />

            {searchCatQuery && (
              <button
                type="button"
                onClick={() => setSearchCatQuery("")}
                className="
            absolute
            right-2.5
            top-1/2
            -translate-y-1/2
            w-6
            h-6
            rounded-full
            flex
            items-center
            justify-center
            cursor-pointer
            active:scale-90
            transition-transform
          "
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(255,255,255,0.82)",
                  color: "var(--text-tertiary)",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.10)"
                    : "1px solid rgba(255,255,255,0.78)",
                  boxShadow: isDark
                    ? "inset 0 1px 0 rgba(255,255,255,0.10)"
                    : "inset 0 1px 0 rgba(255,255,255,1)",
                }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredMoreCategories.length === 0 ? (
            <div className="py-12 text-center">
              <p
                className="text-[12px] font-medium"
                style={{
                  color: "var(--text-tertiary)",
                }}
              >
                {isIndonesian
                  ? `Kategori "${searchCatQuery}" tidak ditemukan`
                  : `No categories found matching "${searchCatQuery}"`}
              </p>
            </div>
          ) : (
            /* ============================================================
         3-COLUMN CATEGORY PILL GRID
         ============================================================ */
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-2.5">
              {filteredMoreCategories.map((cat) => {
                const isSelected = categoryId === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setMoreCatOpen(false);
                      setSearchCatQuery("");
                      triggerHaptic("light");
                    }}
                    className="
                relative
                min-w-0
                w-full
                h-10
                px-2.5
                rounded-full
                flex
                items-center
                justify-start
                gap-1.5
                cursor-pointer
                select-none
                transition-all
                duration-150
                active:scale-[0.96]
              "
                    style={{
                      background: isSelected
                        ? isDark
                          ? "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.90) 48%, rgba(240,241,244,0.94) 100%)"
                        : isDark
                          ? "linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.028) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.84) 48%, rgba(244,245,247,0.90) 100%)",

                      color: isSelected
                        ? isDark
                          ? "rgba(255,255,255,0.96)"
                          : "var(--text-primary)"
                        : "var(--text-secondary)",

                      border: isSelected
                        ? isDark
                          ? "1px solid rgba(255,255,255,0.24)"
                          : "1px solid rgba(255,255,255,0.96)"
                        : isDark
                          ? "1px solid rgba(255,255,255,0.09)"
                          : "1px solid rgba(255,255,255,0.86)",

                      boxShadow: isSelected
                        ? isDark
                          ? [
                              "inset 0 1px 0 rgba(255,255,255,0.20)",
                              "inset 0 -1px 0 rgba(255,255,255,0.04)",
                              "0 4px 12px rgba(0,0,0,0.18)",
                            ].join(", ")
                          : [
                              "inset 0 1px 0 rgba(255,255,255,1)",
                              "inset 0 -1px 0 rgba(15,23,42,0.025)",
                              "0 5px 14px rgba(15,23,42,0.185)",
                            ].join(", ")
                        : isDark
                          ? "inset 0 1px 0 rgba(255,255,255,0.075)"
                          : [
                              "inset 0 1px 0 rgba(255,255,255,1)",
                              "inset 0 -1px 0 rgba(255,255,255,0.40)",
                              "0 3px 10px rgba(15,23,42,0.185)",
                            ].join(", "),

                      backdropFilter: "blur(18px) saturate(155%)",
                      WebkitBackdropFilter: "blur(18px) saturate(155%)",
                    }}
                  >
                    {/* Icon */}
                    <span
                      className="
                  w-[23px]
                  h-[23px]
                  rounded-full
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
                      style={{
                        background: isSelected
                          ? isDark
                            ? "rgba(255,255,255,0.10)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.90), rgba(235,236,240,0.82))"
                          : isDark
                            ? "rgba(255,255,255,0.055)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(238,239,243,0.72))",

                        border: isSelected
                          ? isDark
                            ? "1px solid rgba(255,255,255,0.14)"
                            : "1px solid rgba(255,255,255,0.92)"
                          : isDark
                            ? "1px solid rgba(255,255,255,0.075)"
                            : "1px solid rgba(255,255,255,0.80)",

                        boxShadow: isDark
                          ? "inset 0 1px 0 rgba(255,255,255,0.10)"
                          : "inset 0 1px 0 rgba(255,255,255,1)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-[15px] h-[15px]" />
                    </span>

                    {/* Category Name */}
                    <span
                      className="
                  min-w-0
                  text-[10.5px]
                  leading-none
                  font-semibold
                  tracking-[-0.012em]
                  whitespace-nowrap
                  truncate
                "
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ================================================================
    MORE ACCOUNTS / WALLET — MILKY LIQUID GLASS / 3-COLUMN PILL GRID
    ================================================================ */}
      <BottomSheet
        isOpen={moreWalletOpen}
        onClose={() => {
          setMoreWalletOpen(false);
          setSearchWalletQuery("");
        }}
      >
        <div className="px-4 pt-1 pb-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 pr-3">
              <h3
                className="
            font-semibold
            text-[17px]
            leading-[1.15]
            tracking-[-0.02em]
          "
                style={{
                  color: "var(--text-primary)",
                }}
              >
                {isIndonesian
                  ? "Pilih Akun / Dompet"
                  : "Select Account / Wallet"}
              </h3>

              <p
                className="text-[10px] font-medium mt-1"
                style={{
                  color: "var(--text-tertiary)",
                }}
              >
                {walletTarget === "from"
                  ? isIndonesian
                    ? "Akun Asal"
                    : "Source Account"
                  : isIndonesian
                    ? "Akun Tujuan"
                    : "Destination Account"}{" "}
                · {filteredMoreWallets.length}{" "}
                {isIndonesian ? "akun" : "accounts"}
              </p>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                setMoreWalletOpen(false);
                setSearchWalletQuery("");
              }}
              className="
          shrink-0
          h-8
          px-3.5
          rounded-full
          text-[11px]
          font-semibold
          cursor-pointer
          select-none
          transition-all
          duration-150
          active:scale-[0.96]
        "
              style={{
                background: isDark
                  ? "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.045) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.78) 100%)",
                color: "var(--text-secondary)",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(255,255,255,0.92)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 10px rgba(0,0,0,0.18)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.06)",
                backdropFilter: "blur(18px) saturate(155%)",
                WebkitBackdropFilter: "blur(18px) saturate(155%)",
              }}
            >
              {isIndonesian ? "Tutup" : "Close"}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={15}
              strokeWidth={1.8}
              className="
          absolute
          left-3.5
          top-1/2
          -translate-y-1/2
          pointer-events-none
        "
              style={{
                color: "var(--text-tertiary)",
              }}
            />

            <input
              type="text"
              value={searchWalletQuery}
              onChange={(e) => setSearchWalletQuery(e.target.value)}
              placeholder={
                isIndonesian ? "Cari akun..." : "Search account..."
              }
              className="
          w-full
          h-11
          pl-10
          pr-9
          rounded-[14px]
          text-[12px]
          font-medium
          outline-none
          transition-all
          duration-200
        "
              style={{
                background: isDark
                  ? "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.70) 100%)",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.10)"
                  : "1px solid rgba(255,255,255,0.88)",
                color: "var(--text-primary)",
                fontFamily: "Urbanist, sans-serif",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 10px rgba(0,0,0,0.12)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 12px rgba(15,23,42,0.045)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
              }}
            />

            {searchWalletQuery && (
              <button
                type="button"
                onClick={() => setSearchWalletQuery("")}
                className="
            absolute
            right-2.5
            top-1/2
            -translate-y-1/2
            w-6
            h-6
            rounded-full
            flex
            items-center
            justify-center
            cursor-pointer
            active:scale-90
            transition-transform
          "
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(255,255,255,0.82)",
                  color: "var(--text-tertiary)",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.10)"
                    : "1px solid rgba(255,255,255,0.78)",
                  boxShadow: isDark
                    ? "inset 0 1px 0 rgba(255,255,255,0.10)"
                    : "inset 0 1px 0 rgba(255,255,255,1)",
                }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredMoreWallets.length === 0 ? (
            <div className="py-12 text-center">
              <p
                className="text-[12px] font-medium"
                style={{
                  color: "var(--text-tertiary)",
                }}
              >
                {isIndonesian
                  ? `Akun "${searchWalletQuery}" tidak ditemukan`
                  : `No accounts found matching "${searchWalletQuery}"`}
              </p>
            </div>
          ) : (
            /* ============================================================
         3-COLUMN ACCOUNT PILL GRID
         ============================================================ */
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-2.5">
              {filteredMoreWallets.map((w) => {
                const isSelected =
                  (walletTarget === "from" ? walletId : toWalletId) === w.id;

                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      if (walletTarget === "from") {
                        setWalletId(w.id);
                      } else {
                        setToWalletId(w.id);
                      }

                      setMoreWalletOpen(false);
                      setSearchWalletQuery("");
                      triggerHaptic("light");
                    }}
                    className="
                relative
                min-w-0
                w-full
                h-10
                px-2.5
                rounded-full
                flex
                items-center
                justify-start
                gap-1.5
                cursor-pointer
                select-none
                transition-all
                duration-150
                active:scale-[0.96]
              "
                    style={{
                      background: isSelected
                        ? isDark
                          ? "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.90) 48%, rgba(240,241,244,0.94) 100%)"
                        : isDark
                          ? "linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.028) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.84) 48%, rgba(244,245,247,0.90) 100%)",

                      color: isSelected
                        ? isDark
                          ? "rgba(255,255,255,0.96)"
                          : "var(--text-primary)"
                        : "var(--text-secondary)",

                      border: isSelected
                        ? isDark
                          ? "1px solid rgba(255,255,255,0.24)"
                          : "1px solid rgba(255,255,255,0.96)"
                        : isDark
                          ? "1px solid rgba(255,255,255,0.09)"
                          : "1px solid rgba(255,255,255,0.86)",

                      boxShadow: isSelected
                        ? isDark
                          ? [
                              "inset 0 1px 0 rgba(255,255,255,0.20)",
                              "inset 0 -1px 0 rgba(255,255,255,0.04)",
                              "0 4px 12px rgba(0,0,0,0.18)",
                            ].join(", ")
                          : [
                              "inset 0 1px 0 rgba(255,255,255,1)",
                              "inset 0 -1px 0 rgba(15,23,42,0.025)",
                              "0 5px 14px rgba(15,23,42,0.085)",
                            ].join(", ")
                        : isDark
                          ? "inset 0 1px 0 rgba(255,255,255,0.075)"
                          : [
                              "inset 0 1px 0 rgba(255,255,255,1)",
                              "inset 0 -1px 0 rgba(255,255,255,0.30)",
                              "0 3px 10px rgba(15,23,42,0.045)",
                            ].join(", "),

                      backdropFilter: "blur(18px) saturate(155%)",
                      WebkitBackdropFilter: "blur(18px) saturate(155%)",
                    }}
                  >
                    {/* Account Icon */}
                    <span
                      className="
                  w-[23px]
                  h-[23px]
                  rounded-full
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
                      style={{
                        background: isSelected
                          ? isDark
                            ? "rgba(255,255,255,0.10)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.90), rgba(235,236,240,0.82))"
                          : isDark
                            ? "rgba(255,255,255,0.055)"
                            : "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(238,239,243,0.72))",

                        border: isSelected
                          ? isDark
                            ? "1px solid rgba(255,255,255,0.14)"
                            : "1px solid rgba(255,255,255,0.92)"
                          : isDark
                            ? "1px solid rgba(255,255,255,0.075)"
                            : "1px solid rgba(255,255,255,0.80)",

                        boxShadow: isDark
                          ? "inset 0 1px 0 rgba(255,255,255,0.10)"
                          : "inset 0 1px 0 rgba(255,255,255,1)",
                      }}
                    >
                      <IconRenderer icon={w.icon} size="w-[15px] h-[15px]" />
                    </span>

                    {/* Account Name */}
                    <span
                      className="
                  min-w-0
                  text-[10.5px]
                  leading-none
                  font-semibold
                  tracking-[-0.012em]
                  whitespace-nowrap
                  truncate
                "
                    >
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
            className="font-semibold text-lg mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Pilih Tanggal" : "Select Date"}
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
            className="font-semibold text-lg mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Pilih Waktu" : "Select Time"}
          </h3>
          <p
            className="text-[12px] font-medium mb-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Waktu transaksi" : "Transaction timestamp"}
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
              className="bg-transparent text-3xl font-semibold amount text-center outline-none cursor-pointer"
              style={{ color: "var(--text-primary)", colorScheme: "dark" }}
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2 mt-5">
            {[
              { label: isIndonesian ? "Pagi" : "Morning", time: "08:00" },
              { label: isIndonesian ? "Siang" : "Noon", time: "12:30" },
              { label: isIndonesian ? "Sore" : "Evening", time: "17:00" },
              { label: isIndonesian ? "Malam" : "Night", time: "20:00" },
            ].map((preset) => (
              <button
                key={preset.time}
                onClick={() => {
                  setTime(preset.time);
                  setTimeOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTimeOpen(false)}
            className="w-full max-w-[280px] h-11 mt-6 rounded-2xl font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer border border-white/80"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
              color: "#000000",
              boxShadow:
                "inset 0 1px 0 0 #ffffff, 0 8px 20px -4px rgba(0, 0, 0, 0.45)",
            }}
          >
            {isIndonesian ? "Selesai" : "Done"}
          </button>
        </div>
      </BottomSheet>

      {/* Liquid Glass On-Screen Keypad Drawer */}
      <TransactionKeypadSheet
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        expression={amountInput}
        onExpressionChange={(newExpr, numericVal) => {
          setAmountInput(newExpr);
          setAmount(String(numericVal));
        }}
        onDone={() => {
          setIsKeypadOpen(false);
          const evaluated = evaluateMathSafe(amountInput);
          setAmount(String(evaluated));
          setAmountInput(
            evaluated === 0 ? "" : evaluated.toLocaleString("id-ID"),
          );
        }}
      />
    </BottomSheet>
  );
}
