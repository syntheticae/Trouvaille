import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pen,
  X,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  CreditCard,
  Calendar,
  Coins,
} from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { useWallets } from "../../hooks/useWallets";
import { useAddTransaction } from "../../hooks/useTransactions";
import { useToast } from "../../contexts/ToastContext";
import { useTheme } from "../../contexts/ThemeContext";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import {
  parseNaturalTransaction,
  type ParsedTransactionResult,
} from "../../lib/nlpParser";
import { format } from "date-fns";
import type { TransactionType } from "../../lib/types";

interface VoiceQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenForm: (initialValues: {
    type: TransactionType;
    amount: number;
    categoryId: string | null;
    walletId: string | null;
    toWalletId: string | null;
    date: Date;
    note: string;
  }) => void;
}

export function VoiceQuickAddModal({
  isOpen,
  onClose,
  onOpenForm,
}: VoiceQuickAddModalProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const addTx = useAddTransaction();
  const { showToast } = useToast();

  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setTranscript("");
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "id-ID";

      rec.onstart = () => {
        setIsListening(true);
        triggerHaptic("medium");
      };

      rec.onresult = (event: any) => {
        let current = "";
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript + " ";
        }
        setTranscript(current.trim());
      };

      rec.onerror = (e: any) => {
        console.warn("[VoiceQuickAdd] error:", e);
        if (e.error !== "no-speech") {
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } catch (err) {
      console.warn("[VoiceQuickAdd] Speech init exception:", err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      triggerHaptic("light");
    } else {
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRec) {
        setSpeechSupported(false);
        showToast("Speech recognition not available. You can type directly in the bar.", "info", null, 2500);
        return;
      }

      try {
        if (!recognitionRef.current) {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "id-ID";
          rec.onstart = () => {
            setIsListening(true);
            triggerHaptic("medium");
          };
          rec.onresult = (event: any) => {
            let current = "";
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + " ";
            }
            setTranscript(current.trim());
          };
          rec.onerror = (e: any) => {
            console.warn("[VoiceQuickAdd] error:", e);
            if (e.error !== "no-speech") {
              setIsListening(false);
            }
          };
          rec.onend = () => {
            setIsListening(false);
          };
          recognitionRef.current = rec;
        }
        recognitionRef.current.start();
        setIsListening(true);
        triggerHaptic("medium");
      } catch (err) {
        console.warn("[VoiceQuickAdd] Start failed, retrying reset:", err);
        try {
          recognitionRef.current?.stop();
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
              setIsListening(true);
            } catch {}
          }, 120);
        } catch {}
      }
    }
  };

  const resetVoice = () => {
    setTranscript("");
    triggerHaptic("light");
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch {
        // ignore
      }
    }
  };

  // Real-time NLP parsing
  const parsed: ParsedTransactionResult = useMemo(() => {
    return parseNaturalTransaction(transcript, categories, wallets, new Date());
  }, [transcript, categories, wallets]);

  const hasAmount = parsed.amount !== null && parsed.amount > 0;
  const hasMatches =
    hasAmount || parsed.categoryId !== null || parsed.walletId !== null;

  const resolvedType = parsed.type || "expense";
  const resolvedCategory =
    categories.find((c) => c.id === parsed.categoryId) ||
    (categories.length > 0 ? categories[0] : null);
  const resolvedWallet =
    wallets.find((w) => w.id === parsed.walletId) ||
    (wallets.length > 0 ? wallets[0] : null);
  const resolvedToWallet =
    resolvedType === "transfer"
      ? wallets.find((w) => w.id === parsed.toWalletId) ||
        wallets.find((w) => w.id !== resolvedWallet?.id) ||
        null
      : null;

  const handleDirectSave = () => {
    if (!hasAmount || !parsed.amount || isSubmitting) return;

    setIsSubmitting(true);
    triggerSuccessHaptic();

    const txDate = parsed.date || new Date();
    const payload = {
      type: resolvedType,
      amount: parsed.amount,
      note: parsed.note || (transcript.trim() ? transcript.trim() : null),
      occurred_on: format(txDate, "yyyy-MM-dd"),
      created_at: txDate.toISOString(),
      category_id:
        resolvedType === "transfer" ? null : resolvedCategory?.id || null,
      wallet_id: resolvedWallet?.id || null,
      to_wallet_id:
        resolvedType === "transfer" ? resolvedToWallet?.id || null : null,
    };

    addTx.mutate(payload, {
      onSuccess: () => {
        setIsSubmitting(false);
        showToast("Transaction recorded via voice", "add", () => {});
        onClose();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        showToast(
          err?.message || "Failed to save transaction",
          "delete",
          () => {}
        );
      },
    });
  };

  const handleOpenForm = () => {
    triggerHaptic("medium");
    onOpenForm({
      type: resolvedType,
      amount: parsed.amount || 0,
      categoryId: resolvedCategory?.id || null,
      walletId: resolvedWallet?.id || null,
      toWalletId: resolvedToWallet?.id || null,
      date: parsed.date || new Date(),
      note: parsed.note || transcript.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Dim backdrop to focus on speech bar */}
      <motion.div
        key="voice-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        className="fixed inset-0 z-[60]"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: isDark
            ? "rgba(9, 9, 12, 0.65)"
            : "rgba(244, 244, 247, 0.65)",
        }}
      />

      {/* Floating Speech Bar Container — Anchored right above bottom dock */}
      <motion.div
        key="voice-bar-container"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 440, damping: 32 }}
        className="fixed left-0 right-0 z-[61] px-4 pointer-events-none flex justify-center"
        style={{
          bottom: "calc(82px + env(safe-area-inset-bottom, 0px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-[420px] flex flex-col items-center gap-2.5 pointer-events-auto">

          {/* ══════════════════════════════════════════════════════════════════════
              MAIN FLOATING CAPSULE (Design directly inspired by reference image)
              ══════════════════════════════════════════════════════════════════════ */}
          <div
            className="w-full h-[56px] rounded-full flex items-center px-2.5 gap-2.5 transition-all select-none"
            style={{
              background: isDark
                ? "rgba(22, 22, 26, 0.85)"
                : "rgba(255, 255, 255, 0.88)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.16)"
                : "1px solid rgba(0, 0, 0, 0.09)",
              boxShadow: isDark
                ? "0 16px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)"
                : "0 16px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95)",
              backdropFilter: "blur(32px) saturate(190%)",
              WebkitBackdropFilter: "blur(32px) saturate(190%)",
            }}
          >
            {/* Left: Circular Pen Icon Button (edit speech result in form) */}
            <button
              type="button"
              onClick={handleOpenForm}
              aria-label="Edit in form"
              title="Edit in Form"
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer relative"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(0, 0, 0, 0.05)",
                color: "var(--text-primary)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.10)"
                  : "1px solid rgba(0, 0, 0, 0.04)",
              }}
            >
              <Pen size={15} strokeWidth={1.8} />
            </button>

            {/* Center: Live Speech Transcript / Interactive Text Input */}
            <div className="flex-1 min-w-0 px-1.5 flex items-center">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening..."
                    : speechSupported
                      ? "Tap waveform to speak, or type here..."
                      : "Type a transaction (e.g. BNI 50k Food)..."
                }
                className="w-full bg-transparent border-none outline-none text-[13.5px] font-semibold tracking-tight leading-tight placeholder:text-[var(--text-tertiary)] placeholder:font-normal placeholder:text-[12px]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            {/* Dismiss X button (compact) */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.04)",
                color: "var(--text-tertiary)",
              }}
            >
              <X size={13} strokeWidth={2} />
            </button>

            {/* Right: Dark Pill Container with Dynamic Waveform Bars */}
            <button
              type="button"
              onClick={toggleListening}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              title={isListening ? "Tap to pause" : "Tap to speak"}
              className="h-10 px-3.5 rounded-full flex items-center justify-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer select-none relative overflow-hidden"
              style={{
                background: isDark
                  ? "rgba(0, 0, 0, 0.85)"
                  : "rgba(18, 18, 20, 0.92)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.1)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
              }}
            >
              {/* Dynamic Waveform Audio Bars (5 bars matching reference) */}
              <div className="flex items-center gap-[3px] h-5">
                {[0.45, 0.8, 1.3, 0.85, 0.45].map((scale, i) => (
                  <motion.div
                    key={i}
                    animate={
                      isListening
                        ? {
                            height: [4, 16 * scale, 4],
                            opacity: [0.5, 1, 0.5],
                          }
                        : {
                            height: [4, 8, 14, 8, 4][i],
                            opacity: 0.85,
                          }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + i * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-[2.5px] rounded-full bg-white"
                  />
                ))}
              </div>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              BELOW THE BAR: KEYWORD CHIPS (e.g. "BNI" "Food" "50.000")
              ══════════════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {hasMatches && (
              <motion.div
                key="keyword-chips-container"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="w-full flex flex-col items-center gap-2 overflow-hidden px-1"
              >
                {/* Horizontal row of detected keyword chips */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {/* Amount keyword chip */}
                  {parsed.amount !== null && parsed.amount > 0 && (
                    <motion.span
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-3 py-1 rounded-full text-[11.5px] font-extrabold flex items-center gap-1.5 shadow-sm"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      <Coins size={11} strokeWidth={2} />
                      {formatRupiah(parsed.amount)}
                    </motion.span>
                  )}

                  {/* Category keyword chip */}
                  {parsed.categoryName && (
                    <motion.span
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.04 }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
                      style={{
                        background: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.05)",
                        color: "var(--text-primary)",
                        border: isDark
                          ? "1px solid rgba(255, 255, 255, 0.12)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      <Tag size={11} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                      {parsed.categoryName}
                    </motion.span>
                  )}

                  {/* Wallet keyword chip */}
                  {parsed.walletName && (
                    <motion.span
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.08 }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
                      style={{
                        background: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.05)",
                        color: "var(--text-primary)",
                        border: isDark
                          ? "1px solid rgba(255, 255, 255, 0.12)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      <CreditCard size={11} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                      {parsed.type === "transfer" && parsed.toWalletName
                        ? `${parsed.walletName} → ${parsed.toWalletName}`
                        : parsed.walletName}
                    </motion.span>
                  )}

                  {/* Date keyword chip */}
                  {parsed.dateLabel && parsed.dateLabel !== "Today" && parsed.dateLabel !== "Hari ini" && (
                    <motion.span
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.12 }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1"
                      style={{
                        background: isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.04)",
                        color: "var(--text-tertiary)",
                        border: isDark
                          ? "1px solid rgba(255, 255, 255, 0.08)"
                          : "1px solid rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      <Calendar size={11} strokeWidth={1.75} />
                      {parsed.dateLabel === "Hari ini" ? "Today" : parsed.dateLabel === "Kemarin" ? "Yesterday" : parsed.dateLabel}
                    </motion.span>
                  )}
                </div>

                {/* Direct Action Bar below keywords */}
                <div className="w-full flex items-center gap-2 pt-0.5">
                  {hasAmount && (
                    <button
                      type="button"
                      onClick={handleDirectSave}
                      disabled={isSubmitting}
                      className="flex-1 h-9 rounded-full flex items-center justify-center gap-1.5 text-[12px] font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      <Check size={13} strokeWidth={2.5} />
                      {isSubmitting ? "Saving..." : "Save Transaction"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenForm}
                    className="flex-1 h-9 rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold active:scale-95 transition-all cursor-pointer"
                    style={{
                      background: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.06)",
                      color: "var(--text-primary)",
                      border: isDark
                        ? "1px solid rgba(255, 255, 255, 0.12)"
                        : "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <SlidersHorizontal size={12} strokeWidth={1.75} />
                    Edit in Form
                  </button>

                  {transcript.length > 0 && (
                    <button
                      type="button"
                      onClick={resetVoice}
                      className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-all cursor-pointer shrink-0"
                      style={{
                        background: isDark
                          ? "rgba(255, 255, 255, 0.06)"
                          : "rgba(0, 0, 0, 0.04)",
                        color: "var(--text-tertiary)",
                        border: isDark
                          ? "1px solid rgba(255, 255, 255, 0.08)"
                          : "1px solid rgba(0, 0, 0, 0.06)",
                      }}
                      title="Retry Voice"
                    >
                      <RotateCcw size={12} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
