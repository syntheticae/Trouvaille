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
        className="w-full mb-3 select-none"
      >
        <div
          className="p-3.5 rounded-[22px] bg-[#141418] border border-white/18 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] text-white flex items-center justify-between gap-3"
          style={{ fontFamily: "'Urbanist', sans-serif" }}
        >
          {/* Left: Indicator Icon & Content */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
              <Sparkles size={14} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {detected.sourceApp} Notification
                </span>
                {detected.suggestedCategoryName && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-white/80 font-medium">
                    {detected.suggestedCategoryName}
                  </span>
                )}
              </div>

              <p className="text-[13px] font-bold text-white truncate mt-0.5">
                <span className="font-mono text-white">
                  {formatRupiah(detected.amount)}
                </span>
                <span className="text-zinc-400 font-normal ml-1.5 text-[12px]">
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
              className="px-3.5 py-1.5 rounded-full bg-white text-black text-[12px] font-bold flex items-center gap-1 hover:bg-zinc-200 active:scale-95 transition-all shadow-md"
            >
              <span>Catat</span>
              <ArrowRight size={12} />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
