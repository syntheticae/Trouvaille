import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  Pencil,
  X,
  Users,
  ArrowRight,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";
import type { TransactionType } from "../../types";

export interface DynamicIslandHUDData {
  amount: number;
  type?: TransactionType;
  categoryName?: string;
  walletName?: string;
  date?: string;
  note?: string;
  source?: "shortcut" | "partner_sync";
  partnerName?: string;
  ledgerId?: string;
  ledgerName?: string;
}

export type ShortcutRecordedTxData = DynamicIslandHUDData;

interface DynamicIslandHUDProps {
  data: DynamicIslandHUDData | null;
  onClose: () => void;
  onEdit?: () => void;
  onViewLedger?: (ledgerId: string) => void;
}

export function DynamicIslandHUD({
  data,
  onClose,
  onEdit,
  onViewLedger,
}: DynamicIslandHUDProps) {
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const isPartnerSync = data?.source === "partner_sync";

  useEffect(() => {
    if (!data) return;

    triggerHaptic("medium");

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [data, onClose]);

  const handleCardClick = () => {
    if (isPartnerSync && data?.ledgerId && onViewLedger) {
      triggerHaptic("light");
      onViewLedger(data.ledgerId);
      onClose();
    } else if (!isPartnerSync && onEdit) {
      triggerHaptic("light");
      onEdit();
    }
  };

  return (
    <AnimatePresence>
      {data && (
        <aside
          aria-label={
            isPartnerSync
              ? isIndonesian
                ? "Pemberitahuan Transaksi Space Bersama"
                : "Shared Space Activity Notification"
              : isIndonesian
                ? "Pemberitahuan Pencatatan Transaksi"
                : "Transaction Recorded Notification"
          }
          className="fixed z-[100000] left-4 right-4 max-w-md mx-auto pointer-events-none select-none font-sans"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
          }}
        >
          <motion.div
            initial={{
              opacity: 0,
              scaleX: 0.92,
              scaleY: 0.88,
              y: -18,
            }}
            animate={{
              opacity: 1,
              scaleX: 1,
              scaleY: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scaleX: 0.94,
              scaleY: 0.9,
              y: -14,
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 28,
              mass: 0.75,
            }}
            drag="y"
            dragConstraints={{ top: -60, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y < -20 || info.velocity.y < -120) {
                triggerHaptic("light");
                onClose();
              }
            }}
            className="pointer-events-auto relative w-full rounded-[28px] px-3.5 py-2.5 transition-all cursor-grab active:cursor-grabbing overflow-hidden box-border shadow-2xl"
            style={{
              background: isDark
                ? "linear-gradient(180deg, rgba(43,43,48,0.96) 0%, rgba(23,23,27,0.98) 48%, rgba(13,13,16,0.99) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,248,250,0.98) 50%, rgba(240,240,243,0.98) 100%)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.16)"
                : "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: isDark
                ? "0 22px 50px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.4)"
                : "0 18px 40px -8px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
              color: "var(--text-primary)",
            }}
          >
            {/* Subtle Top Reflection Line */}
            <div
              className="absolute top-0 left-6 right-6 h-[1px] pointer-events-none"
              style={{
                background: isDark
                  ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
              }}
            />

            <div className="flex items-center justify-between gap-3">
              {/* Left & Center: Clickable Content Area */}
              <div
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={handleCardClick}
              >
                {/* Status Glyphed Circle */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105"
                  style={{
                    background: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.05)",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.18)"
                      : "rgba(0, 0, 0, 0.08)",
                    color: "var(--text-primary)",
                  }}
                >
                  {isPartnerSync ? (
                    <Users size={14} strokeWidth={2} />
                  ) : (
                    <Check size={14} strokeWidth={2.4} />
                  )}
                </div>

                {/* Eyebrow, Amount & Metadata */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 min-w-0 leading-none">
                    <span
                      className="text-[10px] font-semibold tracking-wider uppercase truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isPartnerSync
                        ? data.partnerName || (isIndonesian ? "Rekan" : "Partner")
                        : isIndonesian
                        ? "Pencatatan Otomatis"
                        : "Auto Logged"}
                    </span>
                    {!isPartnerSync && (
                      <Sparkles
                        size={10}
                        strokeWidth={1.5}
                        className="opacity-70 shrink-0"
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    )}
                    {isPartnerSync && data.ledgerName && (
                      <>
                        <span className="text-[8px] opacity-40 shrink-0">•</span>
                        <span
                          className="text-[10px] font-medium truncate opacity-85"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {data.ledgerName}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Primary Amount & Tags */}
                  <div className="flex items-baseline gap-2 mt-1 min-w-0">
                    <span className="text-[14.5px] font-bold tracking-tight text-[var(--text-primary)] shrink-0">
                      {data.type === "expense" ? "-" : data.type === "income" ? "+" : ""}
                      {formatRupiah(data.amount)}
                    </span>

                    <div className="flex items-center gap-1.5 min-w-0 truncate text-[11px] text-[var(--text-tertiary)]">
                      {data.categoryName && (
                        <span className="truncate font-medium text-[var(--text-secondary)]">
                          {data.categoryName}
                        </span>
                      )}
                      {data.walletName && (
                        <>
                          <span className="opacity-40 text-[9px] shrink-0">•</span>
                          <span className="truncate">{data.walletName}</span>
                        </>
                      )}
                      {data.note && (
                        <>
                          <span className="opacity-40 text-[9px] shrink-0">•</span>
                          <span className="truncate italic opacity-80">
                            {data.note}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {isPartnerSync && data.ledgerId && onViewLedger && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      onViewLedger(data.ledgerId!);
                      onClose();
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer border"
                    style={{
                      background: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.04)",
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.12)"
                        : "rgba(0, 0, 0, 0.08)",
                      color: "var(--text-primary)",
                    }}
                    title={isIndonesian ? "Buka Space" : "Open Space"}
                    aria-label={isIndonesian ? "Buka Space" : "Open Space"}
                  >
                    <ArrowRight size={13} strokeWidth={2} />
                  </button>
                )}

                {!isPartnerSync && onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      onEdit();
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer border"
                    style={{
                      background: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.04)",
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.12)"
                        : "rgba(0, 0, 0, 0.08)",
                      color: "var(--text-secondary)",
                    }}
                    title={isIndonesian ? "Ubah Rincian" : "Edit Details"}
                    aria-label={isIndonesian ? "Ubah Rincian" : "Edit Details"}
                  >
                    <Pencil size={12} strokeWidth={1.8} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer border"
                  style={{
                    background: isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.04)",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.08)",
                    color: "var(--text-tertiary)",
                  }}
                  title={isIndonesian ? "Tutup" : "Dismiss"}
                  aria-label={isIndonesian ? "Tutup" : "Dismiss"}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Subtle Progress Bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              className="absolute bottom-0 left-0 right-0 h-[1.5px] origin-left"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.22)"
                  : "rgba(0, 0, 0, 0.18)",
              }}
            />
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
}

// Alias export for backward compatibility
export { DynamicIslandHUD as ShortcutSuccessDialog };
