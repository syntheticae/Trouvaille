import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  Pencil,
  X,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";

export interface ShortcutRecordedTxData {
  amount: number;
  type?: "expense" | "income" | "transfer";
  categoryName: string;
  walletName: string;
  date: string;
  note?: string;
}

interface DynamicIslandHUDProps {
  data: ShortcutRecordedTxData | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function DynamicIslandHUD({
  data,
  onClose,
  onEdit,
}: DynamicIslandHUDProps) {
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";

  useEffect(() => {
    if (!data) return;

    triggerHaptic("medium");

    // Auto-dismiss after 4.5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [data, onClose]);

  return (
    <AnimatePresence>
      {data && (
        <aside
          aria-label={isIndonesian ? "Pemberitahuan Pencatatan Transaksi" : "Transaction Recorded Notification"}
          className="fixed z-[100000] left-3.5 right-3.5 max-w-sm mx-auto pointer-events-none select-none font-sans"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 12px), 24px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -45, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -38, scale: 0.9 }}
            transition={{
              type: "spring",
              damping: 24,
              stiffness: 340,
              mass: 0.8,
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
            className="pointer-events-auto w-full rounded-[24px] p-3.5 border transition-all cursor-grab active:cursor-grabbing overflow-hidden"
            style={{
              background: isDark
                ? "rgba(18, 18, 22, 0.92)"
                : "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.14)"
                : "rgba(0, 0, 0, 0.08)",
              boxShadow: isDark
                ? "0 18px 45px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.16)"
                : "0 14px 34px -8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
              color: "var(--text-primary)",
            }}
          >
            {/* Top Row: Icon + Status + Amount + Actions */}
            <div className="flex items-center justify-between gap-2.5">
              <div
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  if (onEdit) {
                    triggerHaptic("light");
                    onEdit();
                  }
                }}
              >
                {/* Status Icon Circle */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    background: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.06)",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.18)"
                      : "rgba(0, 0, 0, 0.1)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Check size={13} strokeWidth={2.5} />
                </div>

                {/* Eyebrow & Main Amount */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9.5px] font-semibold tracking-wider uppercase truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "Pencatatan Otomatis" : "Auto Logged"}
                    </span>
                    <Sparkles size={9} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight leading-tight truncate">
                    {formatRupiah(data.amount)}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit & Close */}
              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("light");
                      onEdit();
                    }}
                    className="p-1.5 rounded-full flex items-center justify-center transition-colors cursor-pointer border"
                    style={{
                      background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
                      color: "var(--text-secondary)",
                    }}
                    title={isIndonesian ? "Ubah Rincian" : "Edit Details"}
                    aria-label={isIndonesian ? "Ubah Rincian" : "Edit Details"}
                  >
                    <Pencil size={12} strokeWidth={2} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="p-1.5 rounded-full flex items-center justify-center transition-colors cursor-pointer border"
                  style={{
                    background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
                    color: "var(--text-tertiary)",
                  }}
                  title={isIndonesian ? "Tutup" : "Dismiss"}
                  aria-label={isIndonesian ? "Tutup" : "Dismiss"}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Bottom Row: Metadata Badges (Category · Wallet · Note) */}
            <div
              className="flex items-center gap-1.5 mt-2 pt-2 border-t text-[11px] font-medium overflow-hidden cursor-pointer"
              style={{
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                color: "var(--text-secondary)",
              }}
              onClick={() => {
                if (onEdit) {
                  triggerHaptic("light");
                  onEdit();
                }
              }}
            >
              <span
                className="px-2 py-0.5 rounded-md shrink-0 border"
                style={{
                  background: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.04)",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
                  color: "var(--text-primary)",
                }}
              >
                {data.categoryName}
              </span>

              <span
                className="px-2 py-0.5 rounded-md shrink-0 border"
                style={{
                  background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                  color: "var(--text-secondary)",
                }}
              >
                {data.walletName}
              </span>

              {data.note && (
                <span className="truncate opacity-80 pl-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {data.note}
                </span>
              )}
            </div>

            {/* Subtle Progress Bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4.5, ease: "linear" }}
              className="absolute bottom-0 left-0 right-0 h-[1.5px] origin-left"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.18)",
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
