import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight } from "lucide-react";
import type { Category, Wallet } from "../../lib/types";
import {
  parseBankNotification,
  type DetectedBankNotification,
} from "../../lib/bankNotificationParser";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

interface ClipboardTransactionBannerProps {
  categories: Category[];
  wallets: Wallet[];
  onAddTransaction: (detected: DetectedBankNotification) => void;
}

export function ClipboardTransactionBanner({
  categories,
  wallets,
  onAddTransaction,
}: ClipboardTransactionBannerProps) {
  const [detected, setDetected] = useState<DetectedBankNotification | null>(null);
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

      const res = parseBankNotification(text, categories, wallets);
      if (res && res.amount > 0) {
        lastCheckedText.current = text;
        setDetected(res);
        triggerHaptic("light");
      }
    } catch {
      // Clipboard permission might be denied or unsupported in current context
    }
  }, [categories, wallets]);

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
    if (detected) {
      sessionStorage.setItem(
        `dismissed_clip_${detected.rawText.slice(0, 30)}`,
        "true",
      );
    }
    setDetected(null);
  };

  const handleConfirm = () => {
    if (!detected) return;
    triggerHaptic("medium");
    onAddTransaction(detected);
    handleDismiss();
  };

  if (!detected) return null;

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
          className="p-3.5 rounded-[22px] glass-surface backdrop-blur-2xl flex items-center justify-between gap-3"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
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
              <Sparkles size={14} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {detected.sourceApp} Notification
                </span>
                {detected.suggestedCategoryName && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {detected.suggestedCategoryName}
                  </span>
                )}
              </div>

              <p
                className="text-[13px] font-semibold truncate mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                <span className="amount">
                  {formatRupiah(detected.amount)}
                </span>
                <span
                  className="font-normal ml-1.5 text-[12px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  · {detected.merchantOrNote}
                </span>
              </p>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleConfirm}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-base)",
              }}
            >
              <span>Catat</span>
              <ArrowRight size={12} />
            </button>

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
