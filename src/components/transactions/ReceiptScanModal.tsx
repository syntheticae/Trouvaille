// ======================================================================
// TROUVAILLE RECEIPT & BANK SLIP SCANNER MODAL
// Ultra-minimalist Apple Liquid Glass Edition
// Translucent specular highlights, lens viewfinder & tap-to-inspect
// Strictly compliant with GEMINI.md: Urbanist scale & zero native emojis
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
  Eye,
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
  const [inspectPhotoOpen, setInspectPhotoOpen] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStatus, setProgressStatus] = useState("Menyiapkan...");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Editable parsed fields
  const [parsedSlip, setParsedSlip] = useState<ParsedSlipResult | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [merchant, setMerchant] = useState<string>("");
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
      setInspectPhotoOpen(false);
      setProgressPct(0);
      setParsedSlip(null);
      setErrorText(null);
      setMerchant("");
      setNote("");
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

      // Check wallet match (never fallback to liabilities/debt)
      const spendableWallets = wallets.filter(
        (w) =>
          !w.name.toLowerCase().includes("liabilit") &&
          !w.name.toLowerCase().includes("hutang") &&
          !w.name.toLowerCase().includes("pinjam") &&
          !w.name.toLowerCase().includes("piutang") &&
          !w.name.toLowerCase().includes("crypto") &&
          !w.name.toLowerCase().includes("saham") &&
          !w.name.toLowerCase().includes("investasi")
      );
      const fallbackWallet =
        spendableWallets.find((w) => /cash|tunai/i.test(w.name)) ||
        spendableWallets.find((w) => /bca|mandiri|bri|bni/i.test(w.name)) ||
        spendableWallets[0] ||
        wallets[0];

      const matchedWallet = wallets.find((w) => w.id === result.slip.sourceWalletId);
      if (matchedWallet) {
        setWalletId(matchedWallet.id);
        setUnregisteredWalletName(null);
      } else {
        if (result.slip.detectedInstitution) {
          setUnregisteredWalletName(result.slip.detectedInstitution);
        }
        setWalletId(fallbackWallet?.id || null);
      }

      // Check category match (never blind fallback to Admin & Fee)
      const cleanCats = categories.filter(
        (c) =>
          !c.name.toLowerCase().includes("admin") &&
          !c.name.toLowerCase().includes("fee") &&
          !c.name.toLowerCase().includes("pajak") &&
          !c.name.toLowerCase().includes("legal") &&
          !c.name.toLowerCase().includes("kerugian")
      );
      const fallbackCat =
        cleanCats.find((c) => /makanan|kuliner|food|resto/i.test(c.name)) ||
        cleanCats.find((c) => /belanja|groceries/i.test(c.name)) ||
        cleanCats.find((c) => /lainnya|other/i.test(c.name)) ||
        cleanCats[0] ||
        categories[0];

      const matchedCat = categories.find((c) => c.id === result.slip.categoryId);
      if (matchedCat) {
        setCategoryId(matchedCat.id);
        setUnregisteredCategoryName(null);
      } else {
        if (result.slip.detectedCategory) {
          setUnregisteredCategoryName(result.slip.detectedCategory);
        }
        setCategoryId(fallbackCat?.id || null);
      }

      setDate(result.slip.date || new Date());
      setMerchant(result.slip.merchantOrRecipient || "");
      setNote("");
      setType(result.slip.type || "expense");
      setStep("result");
    } catch (err: any) {
      console.error("[ReceiptScanModal] Scan failed:", err);
      triggerHaptic("heavy");
      setErrorText(err?.message || "Gagal memindai struk. Pastikan gambar cukup terang dan jelas.");
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
            showToast(`Akun "${unregisteredWalletName}" berhasil dibuat`, "add", () => {});
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
            showToast(`Kategori "${unregisteredCategoryName}" berhasil dibuat`, "add", () => {});
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

    const finalDescription = note.trim()
      ? (merchant.trim() ? `${merchant.trim()} • ${note.trim()}` : note.trim())
      : (merchant.trim() || "Transaksi Pindai Nota");

    triggerSuccessHaptic();
    addTx.mutate(
      {
        type,
        amount,
        wallet_id: effectiveWalletId,
        category_id: type === "transfer" ? null : effectiveCatId,
        note: finalDescription || null,
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
    const finalDescription = note.trim()
      ? (merchant.trim() ? `${merchant.trim()} • ${note.trim()}` : note.trim())
      : (merchant.trim() || "Transaksi Pindai Nota");

    onOpenForm({
      type,
      amount,
      walletId,
      categoryId,
      toWalletId: null,
      date,
      note: finalDescription,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto">
          {/* Liquid Glass Backdrop with Radial Specular Bleed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={step === "processing" ? undefined : onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-2xl"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
            }}
          />

          {/* Liquid Glass Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 35 }}
            className="w-full max-w-md rounded-t-[36px] sm:rounded-[36px] p-5 relative z-10 flex flex-col max-h-[92dvh] overflow-hidden"
            style={{
              background: "linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.45) 100%), var(--bg-canvas)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.26), inset 0 -1px 0 0 rgba(255, 255, 255, 0.05), 0 32px 64px -12px rgba(0, 0, 0, 0.75)",
              fontFamily: "Urbanist, -apple-system, sans-serif",
              paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
            }}
          >
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3
                  className="text-[15px] font-medium tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Pindai Nota
                </h3>
                <p className="text-[11.5px] font-normal mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Foto struk belanja atau bukti transfer
                </p>
              </div>

              {/* Liquid Glass Bubble Close Button */}
              <button
                type="button"
                disabled={step === "processing"}
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-85 active:scale-90 disabled:opacity-40 cursor-pointer"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Hidden Inputs */}
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

            {/* Step 1: Idle (Liquid Glass Viewfinder Frame) */}
            {step === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center py-2 space-y-4">
                {/* Optical Glass Lens Viewfinder */}
                <div
                  className="relative w-full aspect-[4/3] rounded-[28px] flex flex-col items-center justify-center overflow-hidden transition-all"
                  style={{
                    background: "linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.13)",
                    boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.18), inset 0 0 28px rgba(255, 255, 255, 0.02)",
                  }}
                >
                  {/* Delicate Specular Corner Brackets */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t border-l rounded-tl-lg pointer-events-none opacity-50 border-white/60" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t border-r rounded-tr-lg pointer-events-none opacity-50 border-white/60" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l rounded-bl-lg pointer-events-none opacity-50 border-white/60" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r rounded-br-lg pointer-events-none opacity-50 border-white/60" />

                  <div className="flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5"
                      style={{
                        background: "rgba(255, 255, 255, 0.07)",
                        border: "1px solid rgba(255, 255, 255, 0.16)",
                        boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ScanLine size={20} strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                      Arahkan nota ke dalam bingkai
                    </p>
                    <p className="text-[11px] font-normal mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Struk fisik, QRIS & tangkapan layar bank
                    </p>
                  </div>
                </div>

                {/* Liquid Floating Controls */}
                <div className="flex items-center justify-center gap-7 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-active:scale-90"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.3)",
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
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all group-active:scale-90"
                      style={{
                        background: "#ffffff",
                        color: "#000000",
                        boxShadow: "0 4px 28px rgba(255, 255, 255, 0.28), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      <Camera size={24} strokeWidth={1.75} />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                      Ambil Foto
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Processing (Liquid Laser Scan) */}
            {step === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-4 text-center">
                {imagePreview && (
                  <div
                    className="relative w-44 h-56 rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Receipt scanning"
                      className="w-full h-full object-cover filter brightness-95 contrast-110"
                    />

                    {/* Liquid Laser Line */}
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
                        boxShadow: "0 0 14px var(--accent)",
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
                  </div>
                )}

                <div className="space-y-1.5 w-full max-w-[220px]">
                  <div className="flex items-center justify-between text-[11px] font-medium px-0.5">
                    <span style={{ color: "var(--text-secondary)" }}>{progressStatus}</span>
                    <span style={{ color: "var(--text-primary)" }}>{progressPct}%</span>
                  </div>

                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      boxShadow: "inset 0 1px 1px rgba(0, 0, 0, 0.3)",
                    }}
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

            {/* Step 3: Result Liquid Glass Sheet */}
            {step === "result" && parsedSlip && (
              <div className="flex-1 overflow-y-auto space-y-3 pt-1 no-scrollbar">
                {/* Contextual Suggestion / Status Capsule */}
                {unregisteredWalletName ? (
                  <div
                    className="p-2.5 px-3 rounded-2xl flex items-center justify-between gap-2"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.14)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-[11.5px] font-normal truncate" style={{ color: "var(--text-secondary)" }}>
                        Akun <span className="font-medium text-[var(--text-primary)]">{unregisteredWalletName}</span> belum terdaftar
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
                    className="p-2.5 px-3 rounded-2xl flex items-center justify-between gap-2"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.14)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-[11.5px] font-normal truncate" style={{ color: "var(--text-secondary)" }}>
                        Kategori <span className="font-medium text-[var(--text-primary)]">{unregisteredCategoryName}</span> belum ada
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
                    className="py-1 px-3 rounded-full flex items-center justify-center gap-1.5 mx-auto w-fit"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="text-[11px] font-normal" style={{ color: "var(--text-secondary)" }}>
                      Nota berhasil dipindai • Akurasi {Math.round(parsedSlip.confidence * 100)}%
                    </span>
                  </div>
                )}

                {/* Hero Liquid Card: Merchant, Receipt Thumbnail & Apple Amount */}
                <div
                  className="p-4 rounded-[26px] space-y-3"
                  style={{
                    background: "linear-gradient(165deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), 0 12px 32px -8px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {/* Top: Merchant Info & Receipt Thumbnail Preview */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        {selectedCategory ? (
                          <IconRenderer icon={selectedCategory.emoji} size="w-5 h-5" />
                        ) : (
                          <Tag size={16} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={merchant}
                          onChange={(e) => setMerchant(e.target.value)}
                          placeholder="Nama Toko / Penerima"
                          className="w-full text-[15px] font-semibold bg-transparent outline-none truncate leading-tight p-0"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "Urbanist, -apple-system, sans-serif",
                          }}
                        />
                        <p
                          className="text-[11px] font-normal mt-0.5 truncate"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {selectedCategory ? selectedCategory.name : "Kategori Transaksi"}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Receipt Thumbnail with Tap-to-Inspect badge */}
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setInspectPhotoOpen(true);
                        }}
                        className="relative w-11 h-14 rounded-xl overflow-hidden shrink-0 border border-white/20 shadow-md group cursor-pointer active:scale-95 transition-all"
                        title="Ketuk untuk melihat foto nota asli"
                      >
                        <img
                          src={imagePreview}
                          alt="Nota Asli"
                          className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center backdrop-blur-[0.5px]">
                          <Eye size={13} className="text-white/90 drop-shadow-sm" strokeWidth={2} />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Clean Prominent Amount Box */}
                  <div
                    className="p-3 rounded-2xl flex items-center justify-between"
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "var(--text-tertiary)" }}>
                        Total Tagihan
                      </span>
                      <span className="text-[11px] font-light" style={{ color: "var(--text-secondary)" }}>
                        {type === "expense" ? "Pengeluaran" : "Pemasukan"}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[15px] font-light select-none" style={{ color: "var(--text-tertiary)" }}>
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
                        className="text-[26px] font-semibold text-right bg-transparent outline-none max-w-[170px] tracking-tight p-0"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "Urbanist, -apple-system, sans-serif",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* iOS Segmented Type Switcher */}
                <div
                  className="p-1 rounded-2xl flex items-center gap-1"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setType("expense");
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-[12px] font-medium transition-all text-center cursor-pointer ${
                      type === "expense"
                        ? "bg-white/12 text-white shadow-sm border border-white/15"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setType("income");
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-[12px] font-medium transition-all text-center cursor-pointer ${
                      type === "income"
                        ? "bg-white/12 text-white shadow-sm border border-white/15"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>

                {/* Segmented Liquid Glass Vessel */}
                <div
                  className="rounded-[22px] divide-y overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    borderColor: "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {/* Category Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCategorySheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.05] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Kategori
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[65%] justify-end">
                      <span className="text-[12.5px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {selectedCategory ? selectedCategory.name : "Pilih Kategori"}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Wallet Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setWalletSheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.05] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Sumber Dana
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[65%] justify-end">
                      <span className="text-[12.5px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {selectedWallet ? selectedWallet.name : "Pilih Akun"}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Date Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setDateSheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.05] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Tanggal
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-medium" style={{ color: "var(--text-primary)" }}>
                        {format(date, "d MMMM yyyy")}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Note Row */}
                  <div
                    className="w-full p-3 flex items-center justify-between"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Pen size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Catatan
                      </span>
                    </div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Keterangan tambahan (opsional)"
                      className="text-[12.5px] font-normal bg-transparent outline-none text-right flex-1 pl-4"
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
                    className="w-full h-12 rounded-2xl font-medium text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      boxShadow: "0 8px 24px rgba(255, 255, 255, 0.18), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)",
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
                      className="flex-1 h-9 rounded-xl font-normal text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
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
                      className="flex-1 h-9 rounded-xl font-normal text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
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

      {/* Tap-to-Inspect Original Receipt Modal */}
      <AnimatePresence>
        {inspectPhotoOpen && imagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setInspectPhotoOpen(false)}
          >
            <div className="relative max-w-sm max-h-[85vh] w-full flex flex-col items-center">
              <button
                type="button"
                onClick={() => setInspectPhotoOpen(false)}
                className="absolute -top-12 right-0 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80"
              >
                <X size={16} strokeWidth={2} />
              </button>
              <img
                src={imagePreview}
                alt="Original Receipt"
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/15"
              />
              <p className="text-[12px] font-normal text-white/60 mt-3">
                Ketuk di mana saja untuk menutup
              </p>
            </div>
          </motion.div>
        )}
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
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-normal bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
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
                        ? "rgba(255, 255, 255, 0.08)"
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
                    <span className="text-[10.5px] font-normal text-center truncate w-full px-0.5">
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
              className="w-full pl-9 pr-8 py-2 rounded-xl text-[12px] font-normal bg-[var(--glass-fill)] border border-[var(--glass-border)] outline-none"
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
                        ? "rgba(255, 255, 255, 0.08)"
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
                    <span className="text-[11px] font-normal truncate w-full text-center">
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



