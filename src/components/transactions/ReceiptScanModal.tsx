// ======================================================================
// TROUVAILLE RECEIPT & BANK SLIP SCANNER MODAL
// On-device WebAssembly OCR + Indonesian slip heuristic parser
// Strictly compliant with GEMINI.md Apple Monochrome Luxury theme
// ======================================================================

import { useState, useRef, useEffect, useMemo } from "react";
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
  ChevronRight,
  Search,
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
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { GlassDatePicker } from "../ui/GlassDatePicker";

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

  // BottomSheet Drawers
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [searchCatQuery, setSearchCatQuery] = useState("");
  const [searchWalletQuery, setSearchWalletQuery] = useState("");

  // Reset state when modal closed
  useEffect(() => {
    if (!isOpen) {
      setStep("idle");
      setImagePreview(null);
      setProgressPct(0);
      setParsedSlip(null);
      setErrorText(null);
      setCategorySheetOpen(false);
      setWalletSheetOpen(false);
      setDateSheetOpen(false);
      setSearchCatQuery("");
      setSearchWalletQuery("");
    }
  }, [isOpen]);

  // Selected item references
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.id === walletId),
    [wallets, walletId],
  );

  // Filtered lists for sheets
  const filteredCategories = useMemo(() => {
    const q = searchCatQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchCatQuery]);

  const filteredWallets = useMemo(() => {
    const q = searchWalletQuery.trim().toLowerCase();
    if (!q) return wallets;
    return wallets.filter((w) => w.name.toLowerCase().includes(q));
  }, [wallets, searchWalletQuery]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic("medium");
    setErrorText(null);
    setStep("processing");
    setProgressPct(5);

    // Create immediate preview
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
    <>
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

          {/* Modal Card */}
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
              fontFamily: "Urbanist, -apple-system, sans-serif",
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
                    Scan Nota & Bukti Bayar
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
                <div className="space-y-4 py-2 text-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-[28px] p-7 flex flex-col items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
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
                      <h4 className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                        Pilih Foto atau Screenshot
                      </h4>
                      <p className="text-[12px] font-medium mt-1 max-w-[280px] mx-auto leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                        Ambil foto nota belanja kasir atau upload tangkapan layar m-banking & e-wallet
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
                      <span>Buka Galeri / Kamera</span>
                    </button>
                  </div>

                  {/* Badges of Supported Platforms */}
                  <div className="grid grid-cols-3 gap-2 px-1 text-center">
                    <div
                      className="p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                        M-Banking
                      </p>
                      <p className="text-[11.5px] font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                        BCA, Mandiri, BRI, BNI
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                        QRIS & E-Wallet
                      </p>
                      <p className="text-[11.5px] font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                        GoPay, DANA, OVO
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-2xl"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                        Struk Kasir
                      </p>
                      <p className="text-[11.5px] font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                        Indomaret, SPBU, Cafe
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

                    <p className="text-[10.5px] font-medium pt-1" style={{ color: "var(--text-tertiary)" }}>
                      Memproses langsung di CPU perangkat Anda tanpa internet
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Result Verification & 1-Tap Save */}
              {step === "result" && parsedSlip && (
                <div className="space-y-3.5">
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
                      <span className="text-[12px] font-extrabold" style={{ color: "var(--text-primary)" }}>
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
                    className="p-4 rounded-3xl text-center relative overflow-hidden"
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
                      <span className="text-xl font-bold select-none" style={{ color: "var(--text-tertiary)" }}>
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount ? amount.toLocaleString("id-ID") : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setAmount(raw ? Number(raw) : 0);
                        }}
                        placeholder="0"
                        className="text-3xl sm:text-4xl font-black text-center bg-transparent outline-none max-w-[260px] tracking-tight"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "Urbanist, -apple-system, sans-serif",
                        }}
                      />
                    </div>
                    <p className="text-[11.5px] font-semibold mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {amount > 0 ? formatRupiah(amount) : "Masukkan nominal"}
                    </p>
                  </div>

                  {/* Interactive Details Grid (NO NATIVE SELECTS) */}
                  <div className="space-y-2">
                    {/* Category Selection Row */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setCategorySheetOpen(true);
                      }}
                      className="w-full p-3 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer text-left"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {selectedCategory ? (
                            <IconRenderer icon={selectedCategory.emoji} size="w-4 h-4" />
                          ) : (
                            <Tag size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
                            Kategori
                          </span>
                          <span className="text-[13px] font-extrabold block leading-tight" style={{ color: "var(--text-primary)" }}>
                            {selectedCategory ? selectedCategory.name : "Pilih Kategori"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                        <ChevronRight size={16} strokeWidth={2} />
                      </div>
                    </button>

                    {/* Wallet Selection Row */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setWalletSheetOpen(true);
                      }}
                      className="w-full p-3 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer text-left"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {selectedWallet ? (
                            <IconRenderer icon={selectedWallet.icon} size="w-4 h-4" />
                          ) : (
                            <CreditCard size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
                            Sumber Dana / Akun
                          </span>
                          <span className="text-[13px] font-extrabold block leading-tight" style={{ color: "var(--text-primary)" }}>
                            {selectedWallet ? selectedWallet.name : "Pilih Akun"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                        <ChevronRight size={16} strokeWidth={2} />
                      </div>
                    </button>

                    {/* Merchant / Note Row */}
                    <div
                      className="w-full p-3 rounded-2xl flex items-center gap-3"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--glass-fill)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <Pen size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
                          Catatan / Toko
                        </span>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Nama toko / keterangan"
                          className="w-full text-[13px] font-extrabold bg-transparent outline-none p-0 leading-tight"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "Urbanist, -apple-system, sans-serif",
                          }}
                        />
                      </div>
                    </div>

                    {/* Date Row */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setDateSheetOpen(true);
                      }}
                      className="w-full p-3 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer text-left"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <Calendar size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>
                            Tanggal Transaksi
                          </span>
                          <span className="text-[13px] font-extrabold block leading-tight" style={{ color: "var(--text-primary)" }}>
                            {format(date, "d MMMM yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                        <ChevronRight size={16} strokeWidth={2} />
                      </div>
                    </button>
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

      {/* Category BottomSheet Picker */}
      <BottomSheet
        isOpen={categorySheetOpen}
        onClose={() => {
          setCategorySheetOpen(false);
          setSearchCatQuery("");
        }}
        title="Pilih Kategori"
      >
        <div className="p-4 pb-10" style={{ fontFamily: "Urbanist, -apple-system, sans-serif" }}>
          {/* Search bar */}
          <div className="relative mb-3.5">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              value={searchCatQuery}
              onChange={(e) => setSearchCatQuery(e.target.value)}
              placeholder="Cari kategori..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-semibold bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
              style={{
                color: "var(--text-primary)",
                fontFamily: "Urbanist, sans-serif",
              }}
            />
            {searchCatQuery && (
              <button
                type="button"
                onClick={() => setSearchCatQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={13} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Kategori "{searchCatQuery}" tidak ditemukan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto no-scrollbar pr-0.5">
              {filteredCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCategoryId(cat.id);
                      setCategorySheetOpen(false);
                      setSearchCatQuery("");
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl active:scale-95 transition-all text-center cursor-pointer"
                    style={{
                      background: isSelected
                        ? "var(--glass-fill-strong)"
                        : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isSelected
                        ? "0 4px 16px var(--shadow-strength)"
                        : "none",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                      style={{
                        background: isSelected
                          ? "var(--dock-active-pill)"
                          : "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                    </div>
                    <span className="text-[10.5px] font-bold text-center truncate w-full px-0.5">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Wallet / Source Account BottomSheet Picker */}
      <BottomSheet
        isOpen={walletSheetOpen}
        onClose={() => {
          setWalletSheetOpen(false);
          setSearchWalletQuery("");
        }}
        title="Pilih Sumber Dana"
      >
        <div className="p-4 pb-10" style={{ fontFamily: "Urbanist, -apple-system, sans-serif" }}>
          {/* Search bar */}
          <div className="relative mb-3.5">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              value={searchWalletQuery}
              onChange={(e) => setSearchWalletQuery(e.target.value)}
              placeholder="Cari akun / rekening..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-semibold bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
              style={{
                color: "var(--text-primary)",
                fontFamily: "Urbanist, sans-serif",
              }}
            />
            {searchWalletQuery && (
              <button
                type="button"
                onClick={() => setSearchWalletQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={13} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>

          {filteredWallets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Akun "{searchWalletQuery}" tidak ditemukan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 max-h-[55vh] overflow-y-auto no-scrollbar pr-0.5">
              {filteredWallets.map((w) => {
                const isSelected = walletId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setWalletId(w.id);
                      setWalletSheetOpen(false);
                      setSearchWalletQuery("");
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl active:scale-95 transition-all text-center cursor-pointer"
                    style={{
                      background: isSelected
                        ? "var(--glass-fill-strong)"
                        : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isSelected
                        ? "0 4px 16px var(--shadow-strength)"
                        : "none",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                      style={{
                        background: isSelected
                          ? "var(--dock-active-pill)"
                          : "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={w.icon} size="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold truncate w-full text-center">
                      {w.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Date Picker BottomSheet */}
      <BottomSheet
        isOpen={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        title="Pilih Tanggal"
      >
        <div className="p-4 pb-8 flex flex-col items-center" style={{ fontFamily: "Urbanist, -apple-system, sans-serif" }}>
          <GlassDatePicker
            date={date}
            onChange={(d) => {
              triggerHaptic("light");
              setDate(d);
              setDateSheetOpen(false);
            }}
          />
        </div>
      </BottomSheet>
    </>
  );
}

