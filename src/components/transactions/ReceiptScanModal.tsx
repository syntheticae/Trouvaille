// ======================================================================
// TROUVAILLE RECEIPT & BANK SLIP SCANNER MODAL
// Minimalist Apple Luxury UI inspired by clean iOS document scanners
// Strictly compliant with GEMINI.md: Urbanist font scale & zero native emojis
// ======================================================================

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ScanLine,
  Camera,
  Image as ImageIcon,
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
  Plus,
  AlertCircle,
} from "lucide-react";
import { scanReceiptOrSlip, type OCRScanResult } from "../../lib/ocrEngine";
import type { ParsedSlipResult } from "../../lib/slipParser";
import { useWallets, useAddWallet, getWalletIcon } from "../../hooks/useWallets";
import { useCategories, useAddCategory } from "../../hooks/useCategories";
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const addWalletMutation = useAddWallet();
  const addCategoryMutation = useAddCategory();
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

  // Detected unmapped institution / category
  const [unregisteredWalletName, setUnregisteredWalletName] = useState<string | null>(null);
  const [unregisteredCategoryName, setUnregisteredCategoryName] = useState<string | null>(null);

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
      setUnregisteredWalletName(null);
      setUnregisteredCategoryName(null);
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
    setUnregisteredWalletName(null);
    setUnregisteredCategoryName(null);
    setStep("processing");
    setProgressPct(5);

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

      // Check wallet match
      const matchedWallet = wallets.find((w) => w.id === result.slip.sourceWalletId);
      if (matchedWallet) {
        setWalletId(matchedWallet.id);
        setUnregisteredWalletName(null);
      } else {
        // Detected institution not registered in user's wallets
        if (result.slip.detectedInstitution) {
          setUnregisteredWalletName(result.slip.detectedInstitution);
        }
        setWalletId(wallets[0]?.id || null);
      }

      // Check category match
      const matchedCat = categories.find((c) => c.id === result.slip.categoryId);
      if (matchedCat) {
        setCategoryId(matchedCat.id);
        setUnregisteredCategoryName(null);
      } else {
        if (result.slip.detectedCategory) {
          setUnregisteredCategoryName(result.slip.detectedCategory);
        }
        setCategoryId(categories[0]?.id || null);
      }

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

  const handleQuickAddWallet = async () => {
    if (!unregisteredWalletName) return;
    triggerHaptic("medium");
    try {
      addWalletMutation.mutate(
        {
          name: unregisteredWalletName,
          icon: getWalletIcon(unregisteredWalletName),
        },
        {
          onSuccess: (createdWallet: any) => {
            triggerSuccessHaptic();
            if (createdWallet?.id) {
              setWalletId(createdWallet.id);
            }
            setUnregisteredWalletName(null);
            showToast(`Akun "${unregisteredWalletName}" berhasil ditambahkan`, "add", () => {});
          },
          onError: () => {
            showToast("Gagal menambahkan akun", "delete", () => {});
          },
        },
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!unregisteredCategoryName) return;
    triggerHaptic("medium");
    try {
      addCategoryMutation.mutate(
        {
          name: unregisteredCategoryName,
          emoji: "🏷️",
          type: "expense",
        },
        {
          onSuccess: (createdCat: any) => {
            triggerSuccessHaptic();
            if (createdCat?.id) {
              setCategoryId(createdCat.id);
            }
            setUnregisteredCategoryName(null);
            showToast(`Kategori "${unregisteredCategoryName}" berhasil ditambahkan`, "add", () => {});
          },
          onError: () => {
            showToast("Gagal menambahkan kategori", "delete", () => {});
          },
        },
      );
    } catch (err) {
      console.error(err);
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
          showToast("Transaksi berhasil disimpan", "add", () => {});
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-5 relative z-10 flex flex-col max-h-[92dvh] overflow-hidden"
            style={{
              background: "var(--bg-canvas)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-card)",
              fontFamily: "Urbanist, -apple-system, sans-serif",
              paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
            }}
          >
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3
                  className="text-[16px] font-semibold tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Pindai Nota
                </h3>
                <p className="text-[12px] font-normal mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Foto nota belanja atau bukti transfer
                </p>
              </div>

              <button
                type="button"
                disabled={step === "processing"}
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Hidden File & Camera Inputs */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelected}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFileSelected}
              className="hidden"
            />

            {/* Error Message */}
            {errorText && (
              <div
                className="p-3 rounded-2xl text-[12px] font-medium border flex items-center gap-2 mb-2"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  borderColor: "rgba(239, 68, 68, 0.25)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle size={14} strokeWidth={1.75} className="shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Step 1: Idle (Clean Viewfinder Frame) */}
            {step === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center py-2 space-y-4">
                {/* Viewfinder simulation card */}
                <div
                  className="relative w-full aspect-[4/3] rounded-[24px] flex flex-col items-center justify-center overflow-hidden transition-all border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  {/* Subtle Corner Brackets */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 rounded-tl-lg pointer-events-none opacity-40" style={{ borderColor: "var(--text-primary)" }} />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 rounded-tr-lg pointer-events-none opacity-40" style={{ borderColor: "var(--text-primary)" }} />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 rounded-bl-lg pointer-events-none opacity-40" style={{ borderColor: "var(--text-primary)" }} />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 rounded-br-lg pointer-events-none opacity-40" style={{ borderColor: "var(--text-primary)" }} />

                  <div className="flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 shadow-sm"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ScanLine size={22} strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                      Arahkan nota ke dalam bingkai
                    </p>
                    <p className="text-[11px] font-normal mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Mendukung struk fisik, QRIS & m-banking
                    </p>
                  </div>
                </div>

                {/* Floating Action Controls */}
                <div className="flex items-center justify-center gap-6 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <div
                      className="w-13 h-13 rounded-full flex items-center justify-center transition-all group-active:scale-90 shadow-md"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <ImageIcon size={20} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      Galeri
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      cameraInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <div
                      className="w-15 h-15 rounded-full flex items-center justify-center transition-all group-active:scale-90 shadow-lg"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      <Camera size={24} strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      Ambil Foto
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Processing (Scanning Animation) */}
            {step === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-4 text-center">
                {imagePreview && (
                  <div
                    className="relative w-44 h-56 rounded-2xl overflow-hidden shadow-xl border"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <img
                      src={imagePreview}
                      alt="Receipt scanning"
                      className="w-full h-full object-cover filter brightness-95 contrast-110"
                    />

                    {/* Laser scanning line */}
                    <motion.div
                      animate={{ top: ["0%", "95%", "0%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.2,
                        ease: "easeInOut",
                      }}
                      className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 0 12px var(--accent)",
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
                  </div>
                )}

                <div className="space-y-1.5 w-full max-w-[240px]">
                  <div className="flex items-center justify-between text-[11px] font-medium px-0.5">
                    <span style={{ color: "var(--text-secondary)" }}>{progressStatus}</span>
                    <span style={{ color: "var(--text-primary)" }}>{progressPct}%</span>
                  </div>

                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "var(--accent)" }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Result Floating Sheet (Inspired by Reference UI) */}
            {step === "result" && parsedSlip && (
              <div className="flex-1 overflow-y-auto space-y-3 pt-1 no-scrollbar">
                {/* Suggestion / Status Pill Banner */}
                {unregisteredWalletName ? (
                  <div
                    className="p-2.5 px-3 rounded-2xl flex items-center justify-between gap-2 border"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-[11.5px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                        Akun <span className="font-semibold text-[var(--text-primary)]">{unregisteredWalletName}</span> belum terdaftar
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={addWalletMutation.isPending}
                      onClick={handleQuickAddWallet}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      {addWalletMutation.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} strokeWidth={2} />
                      )}
                      <span>Tambah Akun</span>
                    </button>
                  </div>
                ) : unregisteredCategoryName ? (
                  <div
                    className="p-2.5 px-3 rounded-2xl flex items-center justify-between gap-2 border"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-[11.5px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                        Kategori <span className="font-semibold text-[var(--text-primary)]">{unregisteredCategoryName}</span> belum ada
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={addCategoryMutation.isPending}
                      onClick={handleQuickAddCategory}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                      }}
                    >
                      {addCategoryMutation.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} strokeWidth={2} />
                      )}
                      <span>Tambah Kategori</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 border mx-auto w-fit"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      Nota berhasil dipindai • Akurasi {Math.round(parsedSlip.confidence * 100)}%
                    </span>
                  </div>
                )}

                {/* Hero Card: Merchant Avatar + Merchant Name + Total Amount */}
                <div
                  className="p-3.5 rounded-2xl flex items-center justify-between"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      {selectedCategory ? (
                        <IconRenderer icon={selectedCategory.emoji} size="w-5 h-5" />
                      ) : (
                        <Tag size={16} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4
                        className="text-[15px] font-semibold truncate leading-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {note || parsedSlip.merchantOrRecipient || "Transaksi Baru"}
                      </h4>
                      <p
                        className="text-[12px] font-normal truncate mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {selectedCategory ? selectedCategory.name : "Belum ada kategori"}
                      </p>
                    </div>
                  </div>

                  {/* Clean Amount Display (Editable) */}
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-[13px] font-normal select-none" style={{ color: "var(--text-tertiary)" }}>
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
                        className="text-[20px] sm:text-[22px] font-semibold text-right bg-transparent outline-none max-w-[140px] tracking-tight p-0"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "Urbanist, -apple-system, sans-serif",
                        }}
                      />
                    </div>
                    <span className="text-[10.5px] font-medium block" style={{ color: "var(--text-tertiary)" }}>
                      Total Nominal
                    </span>
                  </div>
                </div>

                {/* Details Hairline Rows */}
                <div
                  className="rounded-2xl divide-y overflow-hidden"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  {/* Category Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCategorySheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        Kategori
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {selectedCategory ? selectedCategory.name : "Pilih Kategori"}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Wallet Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setWalletSheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        Sumber Dana
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {selectedWallet ? selectedWallet.name : "Pilih Akun"}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Date Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setDateSheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        Tanggal
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {format(date, "d MMMM yyyy")}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Note Row */}
                  <div
                    className="w-full p-3 flex items-center justify-between"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Pen size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        Catatan
                      </span>
                    </div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nama toko / keterangan"
                      className="text-[12.5px] font-medium bg-transparent outline-none text-right flex-1 pl-4"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "Urbanist, -apple-system, sans-serif",
                      }}
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={addTx.isPending}
                    onClick={handleSaveTransaction}
                    className="w-full h-12 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {addTx.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} strokeWidth={2} />
                        <span>Simpan Transaksi ({formatRupiah(amount)})</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenInFullForm}
                      className="flex-1 h-9 rounded-xl font-medium text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <SlidersHorizontal size={13} strokeWidth={1.5} />
                      <span>Sesuaikan Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        fileInputRef.current?.click();
                      }}
                      className="flex-1 h-9 rounded-xl font-medium text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <RotateCcw size={13} strokeWidth={1.5} />
                      <span>Scan Ulang</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-medium bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
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
              <p className="text-[12px] font-normal" style={{ color: "var(--text-tertiary)" }}>
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
                    <span className="text-[10.5px] font-medium text-center truncate w-full px-0.5">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Wallet BottomSheet Picker */}
      <BottomSheet
        isOpen={walletSheetOpen}
        onClose={() => {
          setWalletSheetOpen(false);
          setSearchWalletQuery("");
        }}
        title="Pilih Sumber Dana"
      >
        <div className="p-4 pb-10" style={{ fontFamily: "Urbanist, -apple-system, sans-serif" }}>
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
              placeholder="Cari akun..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-medium bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
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
              <p className="text-[12px] font-normal" style={{ color: "var(--text-tertiary)" }}>
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
                    <span className="text-[11px] font-medium truncate w-full text-center">
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


