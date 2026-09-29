import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, Layers } from "lucide-react";
import type { Category, Wallet, Transaction } from "../../lib/types";
import {
  parseBankNotification,
  type DetectedBankNotification,
} from "../../lib/bankNotificationParser";
import { parseSlipText } from "../../lib/slipParser";
import {
  isMultiTransactionHistoryText,
  parseScreenshotHistory,
} from "../../lib/screenshotHistoryParser";
import type { ParsedStatementItem } from "../../lib/statementParser";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";

interface ClipboardTransactionBannerProps {
  categories: Category[];
  wallets: Wallet[];
  existingTransactions?: Transaction[];
  onAddTransaction: (detected: DetectedBankNotification) => void;
  onReviewBatch?: (items: ParsedStatementItem[], appName: string) => void;
}

interface DetectedBatch {
  appName: string;
  items: ParsedStatementItem[];
  rawText: string;
}

export function ClipboardTransactionBanner({
  categories,
  wallets,
  existingTransactions = [],
  onAddTransaction,
  onReviewBatch,
}: ClipboardTransactionBannerProps) {
  const { isIndonesian } = useLanguage();
  const [detectedSingle, setDetectedSingle] = useState<DetectedBankNotification | null>(null);
  const [detectedBatch, setDetectedBatch] = useState<DetectedBatch | null>(null);
  const lastCheckedText = useRef<string>("");

  const checkClipboard = useCallback(async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;

    try {
      // Avoid querying clipboard if page is hidden
      if (document.visibilityState !== "visible") return;

      const text = await navigator.clipboard.readText();
      if (!text || text === lastCheckedText.current) return;

      // Check if already dismissed in this session
      const dismissed = sessionStorage.getItem(`dismissed_clip_${text.slice(0, 30)}`);
      if (dismissed) {
        lastCheckedText.current = text;
        return;
      }

      const trimmed = text.trim();

      // 1. Check for multi-transaction screenshot history first
      if (isMultiTransactionHistoryText(trimmed)) {
        const batchItems = parseScreenshotHistory(trimmed, existingTransactions, categories, wallets);
        if (batchItems && batchItems.length >= 2) {
          lastCheckedText.current = text;
          let appName = "Riwayat";
          const low = trimmed.toLowerCase();
          if (low.includes("gopay")) appName = "GoPay";
          else if (low.includes("shopee")) appName = "Shopee";
          else if (low.includes("bca")) appName = "BCA";
          else if (low.includes("mandiri") || low.includes("livin")) appName = "Mandiri";

          setDetectedBatch({
            appName,
            items: batchItems,
            rawText: trimmed,
          });
          setDetectedSingle(null);
          triggerHaptic("light");
          return;
        }
      }

      // 2. Check for bank notification
      const bankRes = parseBankNotification(trimmed, categories, wallets);
      if (bankRes && bankRes.amount > 0) {
        lastCheckedText.current = text;
        setDetectedSingle(bankRes);
        setDetectedBatch(null);
        triggerHaptic("light");
        return;
      }

      // 3. Fallback: Check for single transfer slip / receipt
      if (trimmed.length > 30) {
        const slipRes = parseSlipText(trimmed, wallets, categories);
        if (slipRes && slipRes.amount && slipRes.amount > 0) {
          lastCheckedText.current = text;
          setDetectedSingle({
            rawText: trimmed,
            sourceApp: slipRes.detectedInstitution || (isIndonesian ? "Resi Pembayaran" : "Payment Slip"),
            amount: slipRes.amount,
            merchantOrNote: slipRes.merchantOrRecipient || "",
            type: slipRes.type,
            suggestedWalletId: slipRes.sourceWalletId || undefined,
            suggestedWalletName: slipRes.sourceWalletName || undefined,
            suggestedToWalletId: slipRes.destinationWalletId || undefined,
            suggestedToWalletName: slipRes.destinationWalletName || undefined,
            suggestedCategoryId: slipRes.categoryId || undefined,
            suggestedCategoryName: slipRes.categoryName || undefined,
          });
          setDetectedBatch(null);
          triggerHaptic("light");
          return;
        }
      }
    } catch {
      // Clipboard permission might be denied or unsupported in current context
    }
  }, [categories, wallets, existingTransactions, isIndonesian]);

  useEffect(() => {
    checkClipboard();

    const handleFocus = () => checkClipboard();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkClipboard();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkClipboard]);

  const handleDismiss = () => {
    const rawToDismiss = detectedBatch?.rawText || detectedSingle?.rawText;
    if (rawToDismiss) {
      sessionStorage.setItem(
        `dismissed_clip_${rawToDismiss.slice(0, 30)}`,
        "true"
      );
    }
    setDetectedSingle(null);
    setDetectedBatch(null);
  };

  const handleConfirmSingle = () => {
    if (!detectedSingle) return;
    triggerHaptic("medium");
    onAddTransaction(detectedSingle);
    handleDismiss();
  };

  const handleConfirmBatch = () => {
    if (!detectedBatch || !onReviewBatch) return;
    triggerHaptic("medium");
    onReviewBatch(detectedBatch.items, detectedBatch.appName);
    handleDismiss();
  };

  if (!detectedSingle && !detectedBatch) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Transaction notification banner"
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full mb-3 select-none pointer-events-auto"
      >
        <div
          className="p-3.5 rounded-[22px] glass-surface backdrop-blur-2xl flex items-center justify-between gap-3 border shadow-sm"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
            boxShadow: "var(--shadow-card)",
            fontFamily: "'Urbanist', sans-serif",
            color: "var(--text-primary)",
          }}
        >
          {/* Left: Indicator Icon & Content */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 glass-surface"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {detectedBatch ? (
                <Layers size={14} />
              ) : (
                <Sparkles size={14} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {detectedBatch ? (
                /* Multi-Transaction Batch View */
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {detectedBatch.appName} · {isIndonesian ? "Riwayat Transaksi" : "Transaction History"}
                    </span>
                  </div>
                  <p
                    className="text-[13px] font-semibold truncate mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span>
                      {detectedBatch.items.length}{" "}
                      {isIndonesian ? "Transaksi Terdeteksi" : "Transactions Detected"}
                    </span>
                    <span
                      className="font-normal ml-1.5 text-[12px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      · {isIndonesian ? "Ketuk untuk meninjau" : "Tap to review"}
                    </span>
                  </p>
                </div>
              ) : detectedSingle ? (
                /* Single Transaction View */
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {detectedSingle.sourceApp} · {isIndonesian ? "Pemberitahuan Baru" : "New Notification"}
                    </span>
                    {detectedSingle.suggestedCategoryName && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                        style={{
                          background: "var(--glass-fill)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {detectedSingle.suggestedCategoryName}
                      </span>
                    )}
                  </div>

                  <p
                    className="text-[13px] font-semibold truncate mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span className="amount">
                      {formatRupiah(detectedSingle.amount)}
                    </span>
                    {detectedSingle.merchantOrNote && (
                      <span
                        className="font-normal ml-1.5 text-[12px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        · {detectedSingle.merchantOrNote}
                      </span>
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {detectedBatch ? (
              <button
                type="button"
                onClick={handleConfirmBatch}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                <span>{isIndonesian ? "Tinjau" : "Review"}</span>
                <ArrowRight size={12} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmSingle}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                <span>{isIndonesian ? "Catat" : "Log"}</span>
                <ArrowRight size={12} />
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center glass-surface active:scale-95 transition-all cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-tertiary)",
              }}
              title="Close"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
