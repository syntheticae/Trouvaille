import React, { memo, useMemo, useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import { ArrowLeftRight, Clock, Scale, Trash2, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { formatRupiah } from "../../lib/utils";
import { IconRenderer } from "../ui/IconRenderer";
import { resolveTransactionCategory } from "../../lib/categoryResolver";
import { triggerHaptic } from "../../lib/haptics";
import type { Transaction, Category } from "../../lib/types";
import { isCorrectionTx } from "../../lib/financialMath";
import { usePrivacy } from "../../contexts/PrivacyContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface TransactionItemProps {
  tx: Transaction;
  categories: Category[];
  categoryMap?: Map<string, Category>;
  fromWalletName: string;
  toWalletName: string;
  isUnusual?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onClick: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
  onDuplicate?: (tx: Transaction) => void;
  onToggleSelect?: (tx: Transaction) => void;
  onLongPress?: (tx: Transaction) => void;
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({
  tx,
  categories,
  categoryMap,
  fromWalletName,
  toWalletName,
  isUnusual,
  isSelectMode,
  isSelected,
  onClick,
  onDelete,
  onDuplicate,
  onToggleSelect,
  onLongPress,
}) => {
  const { isStealthMode } = usePrivacy();
  const { isIndonesian } = useLanguage();
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const isCorrection = isCorrectionTx(tx);
  const isPositiveCorrection =
    isCorrection && (tx.note?.includes("(+)") || tx.type === "income");
  const timeLabel = tx.created_at
    ? format(new Date(tx.created_at), "HH:mm")
    : "";

  const resolvedCategory = useMemo(() => {
    return resolveTransactionCategory(tx, categoryMap || categories);
  }, [tx, categoryMap, categories]);

  const categoryDisplayName = resolvedCategory.name;
  const categoryDisplayEmoji = resolvedCategory.emoji;

  const isDraggingRef = useRef(false);
  const longPressTimerRef = useRef<any>(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    clearLongPress();
    if (!isSelectMode && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          triggerHaptic("heavy");
          onLongPress(tx);
        }
      }, 550);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    clearLongPress();
    // Swipe Left: Delete (Threshold -75px or velocity < -350)
    if (info.offset.x < -75 || info.velocity.x < -350) {
      triggerHaptic("heavy");
      onDelete?.(tx);
    }
    // Swipe Right: Duplicate (Threshold +75px or velocity > +350)
    else if (info.offset.x > 75 || info.velocity.x > 350) {
      triggerHaptic("medium");
      onDuplicate?.(tx);
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleTapOrClick = () => {
    clearLongPress();
    if (isDraggingRef.current) return;
    if (isSelectMode) {
      triggerHaptic("light");
      onToggleSelect?.(tx);
    } else {
      onClick(tx);
    }
  };

  return (
    <div className="relative rounded-[22px] overflow-hidden select-none touch-pan-y">
      {/* Background Actions Reveal Layer */}
      {!isSelectMode && (
        <div
          className="absolute inset-0 flex items-center justify-between px-5 rounded-[22px]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {/* Left Side: Duplicate (revealed on swipe right) */}
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-semibold text-[12px]">
            <Copy size={16} />
            <span>{isIndonesian ? "Duplikasi" : "Duplicate"}</span>
          </div>

          {/* Right Side: Delete (revealed on swipe left) */}
          <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold text-[12px]">
            <span>{isIndonesian ? "Hapus" : "Delete"}</span>
            <Trash2 size={16} />
          </div>
        </div>
      )}

      {/* Foreground Swipeable Card */}
      <motion.div
        drag={isSelectMode ? false : "x"}
        dragDirectionLock
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        dragSnapToOrigin
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onDragStart={() => {
          clearLongPress();
          isDraggingRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        onTap={handleTapOrClick}
        className="p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-98 transition-transform relative z-10"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          background: isSelected
            ? "rgba(255, 255, 255, 0.07)"
            : "var(--bg-elevated)",
          border: isSelected
            ? "1px solid var(--accent)"
            : "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Selection Checkbox */}
          {isSelectMode && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="shrink-0 mr-0.5"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: isSelected
                    ? "var(--accent)"
                    : "rgba(255, 255, 255, 0.06)",
                  border: isSelected
                    ? "none"
                    : "1.5px solid var(--glass-border)",
                  color: "var(--accent-ink)",
                }}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </div>
            </motion.div>
          )}

          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center relative shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {isCorrection ? (
              <Scale size={18} style={{ color: "var(--text-primary)" }} />
            ) : isTransfer ? (
              <ArrowLeftRight
                size={18}
                style={{ color: "var(--text-primary)" }}
              />
            ) : (
              <IconRenderer icon={categoryDisplayEmoji} size="w-6 h-6" />
            )}
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow"
              style={{
                background: isCorrection
                  ? "var(--text-primary)"
                  : isTransfer
                    ? "var(--text-primary)"
                    : isIncome
                      ? "var(--accent)"
                      : "var(--bg-elevated)",
                color: isCorrection
                  ? "var(--bg-base)"
                  : isTransfer
                    ? "var(--bg-base)"
                    : isIncome
                      ? "var(--accent-ink)"
                      : "var(--text-tertiary)",
                border: "1.5px solid var(--bg-elevated)",
              }}
            >
              {isCorrection ? (
                <Scale size={8} />
              ) : isTransfer ? (
                <ArrowLeftRight size={8} />
              ) : (
                <span className="text-[9px] font-semibold leading-none">
                  {isIncome ? "+" : "−"}
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p
                className="font-bold text-[14px] leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isCorrection
                  ? tx.note ||
                    (isIndonesian
                      ? `Koreksi (${fromWalletName})`
                      : `Correction (${fromWalletName})`)
                  : isTransfer
                    ? `${fromWalletName} ${isIndonesian ? "ke" : "to"} ${toWalletName}`
                    : categoryDisplayName}
              </p>
              {isUnusual && (
                <span
                  className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "var(--glass-fill-strong)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {isIndonesian ? "Lebih tinggi dari biasa" : "Higher than usual"}
                </span>
              )}
            </div>
            <div
              className="flex items-center gap-1.5 text-[11px] font-semibold mt-0.5 truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {timeLabel && (
                <span className="flex items-center gap-0.5 font-bold amount">
                  <Clock size={10} />
                  {timeLabel} ·
                </span>
              )}
              <span className="truncate">
                {isCorrection
                  ? fromWalletName
                  : tx.note || (isTransfer ? "Transfer" : fromWalletName)}
              </span>
              {tx.created_by_name && (
                <span className="flex items-center gap-0.5 text-[9.5px] opacity-80 font-normal shrink-0">
                  · {isIndonesian ? "oleh" : "by"} {tx.created_by_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className="amount font-semibold text-[14px]"
            style={{
              color: isCorrection
                ? isPositiveCorrection
                  ? "var(--accent)"
                  : "var(--text-primary)"
                : isTransfer
                  ? "var(--text-primary)"
                  : isIncome
                    ? "var(--accent)"
                    : "var(--text-primary)",
            }}
          >
            {isStealthMode ? (
              "Rp ••••••••"
            ) : (
              <>
                {isTransfer
                  ? ""
                  : isCorrection
                    ? isPositiveCorrection
                      ? "+"
                      : "-"
                    : isIncome
                      ? "+"
                      : "-"}
                {formatRupiah(Number(tx.amount))}
              </>
            )}
          </div>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isCorrection
              ? isIndonesian
                ? "Koreksi"
                : "Correction"
              : isTransfer
                ? "Transfer"
                : isIncome
                  ? isIndonesian
                    ? "Pemasukan"
                    : "Inflow"
                  : isIndonesian
                    ? "Pengeluaran"
                    : "Outflow"}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const TransactionItem = memo(TransactionItemComponent, (prev, next) => {
  return (
    prev.tx.id === next.tx.id &&
    prev.tx.amount === next.tx.amount &&
    prev.tx.note === next.tx.note &&
    prev.tx.category_id === next.tx.category_id &&
    prev.tx.categories?.name === next.tx.categories?.name &&
    prev.tx.categories?.emoji === next.tx.categories?.emoji &&
    prev.fromWalletName === next.fromWalletName &&
    prev.toWalletName === next.toWalletName &&
    prev.isUnusual === next.isUnusual &&
    prev.isSelectMode === next.isSelectMode &&
    prev.isSelected === next.isSelected
  );
});
