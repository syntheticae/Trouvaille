import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Tag,
  CreditCard,
  Calendar,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../lib/haptics";

export interface ShortcutRecordedTxData {
  amount: number;
  type?: "expense" | "income" | "transfer";
  categoryName: string;
  walletName: string;
  date: string;
  note?: string;
}

interface ShortcutSuccessDialogProps {
  data: ShortcutRecordedTxData | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function ShortcutSuccessDialog({
  data,
  onClose,
  onEdit,
}: ShortcutSuccessDialogProps) {
  const { isIndonesian } = useLanguage();

  useEffect(() => {
    if (!data) return;

    // Auto-dismiss after 6 seconds if user doesn't touch it
    const timer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => clearTimeout(timer);
  }, [data, onClose]);

  if (!data) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
            color: "var(--text-primary)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          }}
        >
          {/* Top Close Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={14} strokeWidth={1.75} />
          </button>

          {/* Header Status */}
          <div className="flex items-center gap-3 pr-8">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                background: "var(--glass-fill)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <CheckCircle2 size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight leading-tight">
                {isIndonesian
                  ? "Transaksi Berhasil Dicatat"
                  : "Transaction Recorded"}
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)] font-normal flex items-center gap-1 mt-0.5">
                <Sparkles size={11} strokeWidth={1.5} />
                <span>
                  {isIndonesian
                    ? "Tersimpan via Pintasan Apple"
                    : "Auto-saved via Apple Shortcut"}
                </span>
              </p>
            </div>
          </div>

          {/* Amount Box */}
          <div
            className="p-3.5 rounded-2xl border text-center space-y-0.5"
            style={{
              background: "var(--bg-base)",
              borderColor: "var(--glass-border)",
            }}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
              {data.type === "income"
                ? isIndonesian
                  ? "Pemasukan Masuk"
                  : "Income Logged"
                : isIndonesian
                ? "Pengeluaran Dicatat"
                : "Expense Logged"}
            </span>
            <div className="text-[24px] font-semibold tracking-tight">
              {formatRupiah(data.amount)}
            </div>
          </div>

          {/* Details Grid */}
          <div
            className="p-3 rounded-2xl border divide-y text-[12px] space-y-2 divide-[var(--glass-border)]"
            style={{
              background: "var(--bg-base)",
              borderColor: "var(--glass-border)",
            }}
          >
            {/* Category */}
            <div className="flex items-center justify-between pt-1 first:pt-0">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                <Tag size={13} strokeWidth={1.75} />
                <span>{isIndonesian ? "Kategori" : "Category"}</span>
              </div>
              <span className="font-medium text-[var(--text-primary)]">
                {data.categoryName}
              </span>
            </div>

            {/* Wallet / Account */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                <CreditCard size={13} strokeWidth={1.75} />
                <span>{isIndonesian ? "Rekening / Dompet" : "Account / Wallet"}</span>
              </div>
              <span className="font-medium text-[var(--text-primary)]">
                {data.walletName}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                <Calendar size={13} strokeWidth={1.75} />
                <span>{isIndonesian ? "Tanggal" : "Date"}</span>
              </div>
              <span className="font-medium text-[var(--text-primary)]">
                {data.date}
              </span>
            </div>

            {/* Note */}
            {data.note ? (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <FileText size={13} strokeWidth={1.75} />
                  <span>{isIndonesian ? "Catatan" : "Note"}</span>
                </div>
                <span className="font-medium text-[var(--text-primary)] max-w-[160px] truncate text-right">
                  {data.note}
                </span>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onEdit();
                }}
                className="py-2.5 px-3 rounded-xl text-[12px] font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                {isIndonesian ? "Ubah Rincian" : "Edit Details"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-[12px] font-semibold transition-all active:scale-95 cursor-pointer"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-canvas)",
              }}
            >
              {isIndonesian ? "Selesai" : "Done"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
