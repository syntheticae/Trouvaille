import { useState, useEffect, useMemo } from "react";
import {
  Check,
  Sparkles,
  AlertCircle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CheckSquare,
  Square,
  Bookmark,
  ChevronRight,
  X,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import type { Category, Wallet, TransactionType } from "../../lib/types";
import type { ParsedStatementItem } from "../../lib/statementParser";
import { formatRupiah } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { useBills, useMarkBillPaid } from "../../hooks/useBills";
import { saveMerchantMemory } from "../../lib/merchantCategoryMemory";
import { findBestMatchingBill } from "../../lib/billMatchingEngine";

interface BatchTransactionReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: ParsedStatementItem[];
  categories: Category[];
  wallets: Wallet[];
  onConfirmBatch: (items: ParsedStatementItem[]) => Promise<void>;
  onSaveDraft: (items: ParsedStatementItem[]) => void;
  sourceTitle?: string;
}

export function BatchTransactionReviewSheet({
  isOpen,
  onClose,
  items: initialItems,
  categories,
  wallets,
  onConfirmBatch,
  onSaveDraft,
  sourceTitle,
}: BatchTransactionReviewSheetProps) {
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: bills = [] } = useBills();
  const markBillPaid = useMarkBillPaid();

  const [items, setItems] = useState<ParsedStatementItem[]>(initialItems);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category picker sheet state
  const [activeItemForCategory, setActiveItemForCategory] = useState<string | null>(null);

  // Sync state when initialItems change or sheet opens
  useEffect(() => {
    if (isOpen && initialItems.length > 0) {
      setItems(initialItems);
      const selMap: Record<string, boolean> = {};
      initialItems.forEach((it) => {
        selMap[it.id] = it.selected; // Duplicates are already false by default!
      });
      setSelectedMap(selMap);
    }
  }, [isOpen, initialItems]);

  // Evaluate bills match if not already attached
  useEffect(() => {
    if (bills && bills.length > 0) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.matchedBill) return it;
          const match = findBestMatchingBill(it.cleanDescription, it.amount, bills);
          if (match) {
            return {
              ...it,
              matchedBill: {
                id: match.bill.id,
                title: match.bill.title,
                amount: match.bill.amount,
                exactAmountMatch: match.exactAmountMatch,
                confirmedPaid: true,
              },
            };
          }
          return it;
        })
      );
    }
  }, [bills]);

  const selectedCount = useMemo(() => {
    return items.filter((it) => selectedMap[it.id]).length;
  }, [items, selectedMap]);

  const totalSelectedAmount = useMemo(() => {
    return items
      .filter((it) => selectedMap[it.id] && it.type === "expense")
      .reduce((acc, it) => acc + it.amount, 0);
  }, [items, selectedMap]);

  const allSelected = items.length > 0 && selectedCount === items.length;

  const handleToggleAll = () => {
    triggerHaptic("light");
    const nextState = !allSelected;
    const nextMap: Record<string, boolean> = {};
    items.forEach((it) => {
      nextMap[it.id] = nextState;
    });
    setSelectedMap(nextMap);
  };

  const handleToggleItem = (id: string) => {
    triggerHaptic("light");
    setSelectedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleType = (id: string) => {
    triggerHaptic("light");
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        let nextType: TransactionType = "expense";
        if (it.type === "expense") nextType = "income";
        else if (it.type === "income") nextType = "transfer";
        else nextType = "expense";
        return { ...it, type: nextType };
      })
    );
  };

  const handleToggleBillPaid = (id: string) => {
    triggerHaptic("light");
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id || !it.matchedBill) return it;
        return {
          ...it,
          matchedBill: {
            ...it.matchedBill,
            confirmedPaid: !it.matchedBill.confirmedPaid,
          },
        };
      })
    );
  };

  const handleSelectCategory = (cat: Category) => {
    if (!activeItemForCategory) return;
    triggerHaptic("light");
    const targetItem = items.find((it) => it.id === activeItemForCategory);
    if (targetItem) {
      saveMerchantMemory(targetItem.cleanDescription, cat.id, cat.name);
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === activeItemForCategory
          ? {
              ...it,
              suggestedCategoryId: cat.id,
              suggestedCategoryName: cat.name,
              suggestedCategoryEmoji: cat.emoji,
              needsReview: false,
              confidence: 0.95,
            }
          : it
      )
    );
    setActiveItemForCategory(null);
  };

  const handleApprove = async () => {
    const selectedItems = items.filter((it) => selectedMap[it.id]);
    if (selectedItems.length === 0) return;

    try {
      setIsSubmitting(true);
      triggerSuccessHaptic();

      // Auto-settle matched bills if confirmed by user
      for (const item of selectedItems) {
        if (item.matchedBill?.confirmedPaid && bills.length > 0) {
          const targetBill = bills.find((b) => b.id === item.matchedBill?.id);
          if (targetBill) {
            try {
              await markBillPaid.mutateAsync({
                bill: targetBill,
                paid: true,
                recordTransaction: false, // Already being recorded in this batch
              });
            } catch (billErr) {
              console.warn("[BatchReview] Failed to auto-settle bill:", billErr);
            }
          }
        }
      }

      await onConfirmBatch(selectedItems);
      onClose();
    } catch (err) {
      console.error("[BatchReview] Confirm batch failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToDraft = () => {
    const selectedItems = items.filter((it) => selectedMap[it.id]);
    const itemsToDraft = selectedItems.length > 0 ? selectedItems : items;
    triggerSuccessHaptic();
    onSaveDraft(itemsToDraft);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div
        className="px-4 pt-3 pb-[max(calc(env(safe-area-inset-bottom,0px)+16px),24px)] max-w-lg mx-auto select-none font-sans"
        style={{ color: "var(--text-primary)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <Sparkles size={15} className="text-[var(--text-primary)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {isIndonesian ? "Tinjau Transaksi Massal" : "Review Batch Transactions"}
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                {sourceTitle || (isIndonesian ? "Tangkapan Layar Riwayat" : "Screenshot History")}
                {" · "}
                {items.length} {isIndonesian ? "terdeteksi" : "detected"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Multi-Select Control Bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            type="button"
            onClick={handleToggleAll}
            className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity cursor-pointer hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            {allSelected ? (
              <CheckSquare size={14} className="text-[var(--text-primary)]" />
            ) : (
              <Square size={14} className="text-[var(--text-tertiary)]" />
            )}
            <span>
              {allSelected
                ? isIndonesian
                  ? "Batal Pilih Semua"
                  : "Deselect All"
                : isIndonesian
                ? "Pilih Semua"
                : "Select All"}
            </span>
          </button>

          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
            {selectedCount} {isIndonesian ? "dari" : "of"} {items.length}{" "}
            {isIndonesian ? "dipilih" : "selected"}
            {totalSelectedAmount > 0 ? ` · ${formatRupiah(totalSelectedAmount)}` : ""}
          </span>
        </div>

        {/* Transaction List Cards */}
        <div className="space-y-2.5 mb-4">
          {items.map((it) => {
            const isSelected = Boolean(selectedMap[it.id]);
            const isOutflow = it.type === "expense";
            const isTransfer = it.type === "transfer";

            return (
              <div
                key={it.id}
                onClick={() => handleToggleItem(it.id)}
                className="p-3 rounded-2xl transition-all border cursor-pointer select-none"
                style={{
                  background: isSelected
                    ? isDark
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.03)"
                    : "transparent",
                  borderColor: isSelected
                    ? "var(--glass-border)"
                    : isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.04)",
                  opacity: isSelected ? 1 : 0.55,
                }}
              >
                <div className="flex items-start gap-2.5">
                  {/* Checkbox */}
                  <div
                    className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all"
                    style={{
                      background: isSelected
                        ? "var(--text-primary)"
                        : "transparent",
                      borderColor: isSelected
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                      color: isSelected ? "var(--bg-base)" : "transparent",
                    }}
                  >
                    {isSelected && <Check size={12} strokeWidth={2.5} />}
                  </div>

                  {/* Transaction Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className="text-[13px] font-semibold truncate leading-snug"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {it.cleanDescription || it.description}
                      </p>
                      <span
                        className="text-[13px] font-bold shrink-0 tracking-tight"
                        style={{
                          color: isOutflow
                            ? "var(--text-primary)"
                            : "var(--accent, #ffffff)",
                        }}
                      >
                        {isOutflow ? "-" : "+"}
                        {formatRupiah(it.amount)}
                      </span>
                    </div>

                    {/* Metadata & Quick Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {/* Type Toggle Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleType(it.id);
                        }}
                        className="h-5 px-2 rounded-full text-[10px] font-semibold flex items-center gap-1 border cursor-pointer active:scale-95 transition-transform"
                        style={{
                          background: "var(--glass-fill)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {isTransfer ? (
                          <ArrowLeftRight size={10} />
                        ) : isOutflow ? (
                          <ArrowUpRight size={10} />
                        ) : (
                          <ArrowDownLeft size={10} />
                        )}
                        <span>
                          {isTransfer
                            ? "Transfer"
                            : isOutflow
                            ? isIndonesian
                              ? "Keluar"
                              : "Expense"
                            : isIndonesian
                            ? "Masuk"
                            : "Income"}
                        </span>
                      </button>

                      {/* Category Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveItemForCategory(it.id);
                        }}
                        className="h-5 px-2 rounded-full text-[10px] font-medium flex items-center gap-1 border cursor-pointer active:scale-95 transition-transform"
                        style={{
                          background: "var(--glass-fill)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {it.suggestedCategoryEmoji && (
                          <IconRenderer
                            icon={it.suggestedCategoryEmoji}
                            size="w-3 h-3"
                          />
                        )}
                        <span className="truncate max-w-[90px]">
                          {it.suggestedCategoryName ||
                            (isIndonesian ? "Kategori" : "Category")}
                        </span>
                      </button>

                      {/* Wallet Pill */}
                      {wallets.length > 0 && (
                        <div
                          className="h-5 px-2 rounded-full text-[10px] font-medium flex items-center gap-1 border"
                          style={{
                            background: "var(--glass-fill)",
                            borderColor: "var(--glass-border)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          <span className="truncate max-w-[80px]">
                            {wallets.find((w) => w.id === it.walletId)?.name || it.walletName || wallets[0].name}
                          </span>
                        </div>
                      )}

                      {/* Date & Time */}
                      <div
                        className="h-5 px-1.5 rounded-md text-[10px] flex items-center gap-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Calendar size={10} />
                        <span>{it.date}</span>
                        {it.time && (
                          <>
                            <span>·</span>
                            <Clock size={10} />
                            <span>{it.time}</span>
                          </>
                        )}
                      </div>

                      {/* Needs Review Badge (Pilar 3) */}
                      {(it.needsReview || (it.confidence !== undefined && it.confidence < 0.65)) && (
                        <div
                          className="h-5 px-2 rounded-full text-[10px] font-medium flex items-center gap-1 border border-dashed"
                          style={{
                            borderColor: "var(--glass-border)",
                            color: "var(--text-tertiary)",
                            background: isDark
                              ? "rgba(255, 255, 255, 0.03)"
                              : "rgba(0, 0, 0, 0.02)",
                          }}
                        >
                          <AlertCircle size={9} className="shrink-0 text-[var(--text-tertiary)]" />
                          <span>{isIndonesian ? "Perlu Ditinjau" : "Needs Review"}</span>
                        </div>
                      )}
                    </div>

                    {/* Bill Auto-Matching Badge (Pilar 2) */}
                    {it.matchedBill && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBillPaid(it.id);
                        }}
                        className="mt-2 flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border cursor-pointer active:scale-[0.99] transition-transform select-none"
                        style={{
                          background: it.matchedBill.confirmedPaid
                            ? isDark
                              ? "rgba(255, 255, 255, 0.06)"
                              : "rgba(0, 0, 0, 0.04)"
                            : "transparent",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Bookmark size={11} className="shrink-0 text-[var(--text-secondary)]" />
                          <span className="truncate">
                            {isIndonesian ? `Tagihan: ${it.matchedBill.title}` : `Bill: ${it.matchedBill.title}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--text-secondary)] font-medium">
                          <span>
                            {it.matchedBill.confirmedPaid
                              ? (isIndonesian ? "Tandai Lunas" : "Mark as Paid")
                              : (isIndonesian ? "Jangan Tandai" : "Keep Unpaid")}
                          </span>
                          <div
                            className="w-3.5 h-3.5 rounded flex items-center justify-center border transition-all"
                            style={{
                              background: it.matchedBill.confirmedPaid ? "var(--text-primary)" : "transparent",
                              borderColor: it.matchedBill.confirmedPaid ? "var(--text-primary)" : "var(--text-tertiary)",
                              color: it.matchedBill.confirmedPaid ? "var(--bg-base)" : "transparent",
                            }}
                          >
                            {it.matchedBill.confirmedPaid && <Check size={9} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Duplicate Warning Badge */}
                    {it.isDuplicate && (
                      <div
                        className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
                        style={{
                          background: isDark
                            ? "rgba(255, 255, 255, 0.06)"
                            : "rgba(0, 0, 0, 0.05)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <AlertCircle size={11} className="shrink-0" />
                        <span className="truncate">
                          {isIndonesian
                            ? "Kemungkinan duplikat (tidak dicentang otomatis)"
                            : "Possible duplicate (unchecked by default)"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls Bar */}
        <div className="pt-2 border-t border-[var(--glass-border)] flex items-center gap-2">
          {/* Save to Draft Button */}
          <button
            type="button"
            onClick={handleSaveToDraft}
            className="flex-1 py-3 px-3 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 select-none"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Bookmark size={13} />
            <span>{isIndonesian ? "Simpan ke Draft" : "Save to Draft"}</span>
          </button>

          {/* Confirm & Record Button */}
          <button
            type="button"
            disabled={selectedCount === 0 || isSubmitting}
            onClick={handleApprove}
            className="flex-1 py-3 px-3 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none shadow-sm"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
            }}
          >
            {isSubmitting ? (
              <span className="animate-pulse">
                {isIndonesian ? "Mencatat..." : "Saving..."}
              </span>
            ) : (
              <>
                <span>
                  {isIndonesian
                    ? `Catat ${selectedCount} Transaksi`
                    : `Record ${selectedCount} Items`}
                </span>
                <Check size={13} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>

        {/* Category Picker Popover Sheet */}
        {activeItemForCategory && (
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-md"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setActiveItemForCategory(null)}
          >
            <div
              className="w-full max-w-sm rounded-[24px] p-4 border select-none max-h-[75vh] flex flex-col"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--glass-border)]">
                <h4 className="text-[14px] font-semibold">
                  {isIndonesian ? "Pilih Kategori" : "Select Category"}
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveItemForCategory(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCategory(c)}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-[var(--glass-fill)] cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <IconRenderer icon={c.emoji} size="w-4 h-4" />
                      <span className="text-[13px] font-medium">{c.name}</span>
                    </div>
                    <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
