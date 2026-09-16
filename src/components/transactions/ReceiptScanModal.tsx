// ======================================================================
// TROUVAILLE RECEIPT & BANK SLIP SCANNER MODAL
// On-device WebAssembly OCR + Indonesian slip heuristic parser
// Strictly compliant with GEMINI.md Apple Monochrome Luxury theme
// ======================================================================

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ScanLine,
  Camera,
  CreditCard,
  Tag,
  Calendar,
  Pen,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Loader2,
  Sparkles,
} from "lucide-react";
import { scanReceiptOrSlip, type OCRScanResult } from "../../lib/ocrEngine";
import type { ParsedSlipResult } from "../../lib/slipParser";
import { useWallets } from "../../hooks/useWallets";
import { useCategories } from "../../hooks/useCategories";
import { useAddTransaction } from "../../hooks/useTransactions";
import { useToast } from "../../contexts/ToastContext";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { format } from "date-fns";
import type { TransactionType } from "../../lib/types";

interface ReceiptScanModalProps {
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

export function ReceiptScanModal({
  isOpen,
  onClose,
  onOpenForm,
}: ReceiptScanModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const addTx = useAddTransaction();
  const { showToast } = useToast();

  const [step, setStep] = useState<"idle" | "processing" | "result">("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState("Menyiapkan pemindai...");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Editable parsed fields
  const [parsedSlip, setParsedSlip] = useState<ParsedSlipResult | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState<string>("");
  const [type, setType] = useState<TransactionType>("expense");

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setStep("idle");
      setImagePreview(null);
      setProgressPct(0);
      setParsedSlip(null);
      setErrorText(null);
    }
  }, [isOpen]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic("medium");
    setErrorText(null);
    setStep("processing");
    setProgressPct(5);

    // Create immediate local preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      const result: OCRScanResult = await scanReceiptOrSlip(
        file,
        wallets,
        categories,
        (pct, status) => {
          setProgressPct(pct);
          setProgressStatus(status);
        },
      );

      triggerSuccessHaptic();
      setParsedSlip(result.slip);
      setAmount(result.slip.amount || 0);

      const matchedWallet = wallets.find((w) => w.id === result.slip.sourceWalletId) || wallets[0];
      const matchedCat = categories.find((c) => c.id === result.slip.categoryId) || (categories.length > 0 ? categories[0] : null);

      setWalletId(matchedWallet?.id || null);
      setCategoryId(matchedCat?.id || null);
      setDate(result.slip.date || new Date());
      setNote(result.slip.merchantOrRecipient || "");
      setType(result.slip.type || "expense");
      setStep("result");
    } catch (err: any) {
      console.error("[ReceiptScanModal] Scan failed:", err);
      triggerHaptic("heavy");
      setErrorText(err?.message || "Gagal memindai struk. Silakan coba gambar yang lebih jelas.");
      setStep("idle");
    }
  };

  const handleSaveTransaction = () => {
    if (!amount || amount <= 0) {
      showToast("Nominal transaksi belum terisi", "info", null, 2500);
      return;
    }

    const isUUID = (id?: string | null) =>
      !!id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const effectiveWallet = wallets.find((w) => w.id === walletId) || wallets[0];
    const effectiveCategory = categories.find((c) => c.id === categoryId) || (categories.length > 0 ? categories[0] : null);

    const effectiveWalletId = effectiveWallet?.id && isUUID(effectiveWallet.id) ? effectiveWallet.id : null;
    const effectiveCatId = effectiveCategory?.id && isUUID(effectiveCategory.id) ? effectiveCategory.id : null;

    triggerSuccessHaptic();
    addTx.mutate(
      {
        type,
        amount,
        wallet_id: effectiveWalletId,
        category_id: type === "transfer" ? null : effectiveCatId,
        note: note || null,
        occurred_on: format(date, "yyyy-MM-dd"),
        created_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          showToast("Transaksi berhasil disimpan dari struk", "add", () => {});
          onClose();
        },
        onError: () => {
          showToast("Gagal menyimpan transaksi", "delete", () => {});
        },
      },
    );
  };

  const handleOpenInFullForm = () => {
    triggerHaptic("light");
    onOpenForm({
      type,
      amount,
      walletId,
      categoryId,
      toWalletId: null,
      date,
      note,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={step === "processing" ? undefined : onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 flex flex-col max-h-[92dvh] overflow-hidden"
          style={{
            background: "var(--bg-canvas)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
            paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)",
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <ScanLine size={18} strokeWidth={1.75} />
              </div>
              <div>
                <h3
                  className="text-[16px] font-extrabold tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Scan Nota & Bukti Transfer
                </h3>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  On-device OCR • Bebas Biaya • 100% Privat
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={step === "processing"}
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-75 disabled:opacity-40 cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
              }}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelected}
            className="hidden"
          />

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto pt-4 space-y-4 no-scrollbar">
            {errorText && (
              <div
                className="p-3.5 rounded-2xl text-[12px] font-semibold border flex items-center gap-2.5"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  borderColor: "rgba(239, 68, 68, 0.25)",
                  color: "#ef4444",
                }}
              >
                <span>{errorText}</span>
              </div>
            )}

            {/* Step 1: Idle (Select Image) */}
            {step === "idle" && (
              <div className="space-y-4 py-3 text-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-[28px] p-8 flex flex-col items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                  style={{
                    borderColor: "var(--glass-border)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
                    style={{
                      background: "var(--bg-canvas)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Camera size={26} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
                      Pilih Foto atau Screenshot
                    </h4>
                    <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                      Foto nota kertas, struk belanja, atau screenshot transfer m-banking & e-wallet
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-2 px-5 py-2.5 rounded-full text-[12px] font-extrabold inline-flex items-center gap-2 shadow-sm pointer-events-none"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    <ScanLine size={14} strokeWidth={2} />
                    <span>Buka Kamera / Galeri</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 px-1 text-center">
                  <div
                    className="p-2.5 rounded-2xl"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
                      M-Banking
                    </p>
                    <p className="text-[11px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                      BCA, Mandiri, BRI, BNI
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-2xl"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
                      E-Wallet & QRIS
                    </p>
                    <p className="text-[11px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                      GoPay, DANA, OVO
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-2xl"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
                      Struk Kasir
                    </p>
                    <p className="text-[11px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                      Indomaret, Resto, SPBU
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Processing (Scanning Animation) */}
            {step === "processing" && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
                {/* Image with Laser Sweep */}
                {imagePreview && (
                  <div
                    className="relative w-48 h-64 rounded-2xl overflow-hidden shadow-2xl border"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <img
                      src={imagePreview}
                      alt="Receipt scanning"
                      className="w-full h-full object-cover filter contrast-125 brightness-95"
                    />

                    {/* Laser scanning line */}
                    <motion.div
                      animate={{ top: ["0%", "95%", "0%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.2,
                        ease: "easeInOut",
                      }}
                      className="absolute left-0 right-0 h-[3px] shadow-lg pointer-events-none z-10"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 0 16px var(--accent), 0 0 28px var(--accent)",
                      }}
                    />

                    {/* Frosted vignette */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40 pointer-events-none" />
                  </div>
                )}

                <div className="space-y-2 w-full max-w-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold px-1">
                    <span style={{ color: "var(--text-secondary)" }}>{progressStatus}</span>
                    <span style={{ color: "var(--text-primary)" }}>{progressPct}%</span>
                  </div>

                  {/* High contrast progress track */}
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "var(--accent)" }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <p className="text-[10px] font-medium pt-1" style={{ color: "var(--text-tertiary)" }}>
                    Memproses langsung di CPU perangkat Anda tanpa internet
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Result Verification & 1-Tap Save */}
            {step === "result" && parsedSlip && (
              <div className="space-y-4">
                {/* Recognition Badge */}
                <div
                  className="p-3 rounded-2xl flex items-center justify-between"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} strokeWidth={1.75} style={{ color: "var(--text-primary)" }} />
                    <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                      {parsedSlip.detectedSlipType === "m_banking"
                        ? `Bukti Transfer ${parsedSlip.detectedInstitution || "Bank"}`
                        : parsedSlip.detectedSlipType === "ewallet"
                          ? `Transaksi E-Wallet`
                          : parsedSlip.detectedSlipType === "qris"
                            ? `Pembayaran QRIS`
                            : `Struk Kasir`}
                    </span>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Akurasi {Math.round(parsedSlip.confidence * 100)}%
                  </span>
                </div>

                {/* Hero Amount Box */}
                <div
                  className="p-4 rounded-2xl text-center relative overflow-hidden"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Nominal Terdeteksi
                  </label>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xl font-bold" style={{ color: "var(--text-tertiary)" }}>
                      Rp
                    </span>
                    <input
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="text-3xl font-black text-center bg-transparent outline-none max-w-[240px]"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-tertiary)" }}>
                    {formatRupiah(amount)}
                  </p>
                </div>

                {/* Detail Grid */}
                <div className="space-y-2.5">
                  {/* Category Selection */}
                  <div
                    className="p-3 rounded-2xl flex items-center justify-between"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                        Kategori
                      </span>
                    </div>
                    <select
                      value={categoryId || ""}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="text-[12px] font-bold bg-transparent outline-none cursor-pointer max-w-[180px] text-right"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {categories.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          style={{ background: "var(--bg-canvas)", color: "var(--text-primary)" }}
                        >
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Wallet Selection */}
                  <div
                    className="p-3 rounded-2xl flex items-center justify-between"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                        Sumber Dana
                      </span>
                    </div>
                    <select
                      value={walletId || ""}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="text-[12px] font-bold bg-transparent outline-none cursor-pointer max-w-[180px] text-right"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {wallets.map((w) => (
                        <option
                          key={w.id}
                          value={w.id}
                          style={{ background: "var(--bg-canvas)", color: "var(--text-primary)" }}
                        >
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Merchant / Note */}
                  <div
                    className="p-3 rounded-2xl flex items-center justify-between"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Pen size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                        Catatan
                      </span>
                    </div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nama toko / keterangan"
                      className="text-[12px] font-semibold bg-transparent outline-none text-right flex-1 pl-4"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Date */}
                  <div
                    className="p-3 rounded-2xl flex items-center justify-between"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
                        Tanggal
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {format(date, "d MMMM yyyy")}
                    </span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={addTx.isPending}
                    onClick={handleSaveTransaction}
                    className="w-full py-3.5 rounded-2xl font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {addTx.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} strokeWidth={2.5} />
                        <span>Simpan Transaksi ({formatRupiah(amount)})</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenInFullForm}
                      className="flex-1 py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <SlidersHorizontal size={13} strokeWidth={1.75} />
                      <span>Sesuaikan Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        fileInputRef.current?.click();
                      }}
                      className="flex-1 py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <RotateCcw size={13} strokeWidth={1.75} />
                      <span>Scan Ulang</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
