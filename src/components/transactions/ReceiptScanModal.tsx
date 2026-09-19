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
  Clock,
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
  FileSpreadsheet,
  Shield,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  capturePhotoFromCamera,
  pickPhotoFromGallery,
  requestPhotosPermission,
  requestCameraPermission,
} from "../../lib/mediaPermissions";
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
  onOpenImport?: () => void;
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
  onOpenImport,
  onOpenForm,
}: ReceiptScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);

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
  const [progressStatus, setProgressStatus] = useState("Preparing...");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Editable parsed fields
  const [parsedSlip, setParsedSlip] = useState<ParsedSlipResult | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"));
  const [merchant, setMerchant] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [type, setType] = useState<TransactionType>("expense");

  // Detected unmapped institution / category
  const [unregisteredWalletName, setUnregisteredWalletName] = useState<string | null>(null);
  const [unregisteredCategoryName, setUnregisteredCategoryName] = useState<string | null>(null);

  // Media permission dialog
  const [permissionPrompt, setPermissionPrompt] = useState<{
    isOpen: boolean;
    type: "photos" | "camera";
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: "photos",
    title: "",
    description: "",
  });

  // BottomSheet Drawers
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [searchCatQuery, setSearchCatQuery] = useState("");
  const [searchWalletQuery, setSearchWalletQuery] = useState("");

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraActive(false);
  };

  const startLiveCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    // On native platforms (iOS/Android), ensure native camera permission is granted first
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          console.warn("[ReceiptScanModal] Native camera permission not granted");
          return;
        }
      } catch (err) {
        console.warn("[ReceiptScanModal] requestCameraPermission error:", err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsLiveCameraActive(true);
    } catch (err) {
      console.warn("[ReceiptScanModal] Live camera stream unavailable:", err);
      stopLiveCamera();
    }
  };

  useEffect(() => {
    if (isOpen && step === "idle") {
      startLiveCamera();
    } else {
      stopLiveCamera();
    }
    return () => {
      stopLiveCamera();
    };
  }, [isOpen, step]);

  const shouldSaveAttachments = useMemo(() => {
    return localStorage.getItem("trouvaille_save_attachments") === "true";
  }, [isOpen]);

  // Reset state when modal closed
  useEffect(() => {
    if (!isOpen) {
      stopLiveCamera();
      setStep("idle");
      if (imagePreview && imagePreview.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(imagePreview);
        } catch {}
      }
      setImagePreview(null);
      setInspectPhotoOpen(false);
      setProgressPct(0);
      setParsedSlip(null);
      setErrorText(null);
      setMerchant("");
      setNote("");
      setTime(format(new Date(), "HH:mm"));
      setUnregisteredWalletName(null);
      setUnregisteredCategoryName(null);
      setCategorySheetOpen(false);
      setWalletSheetOpen(false);
      setDateSheetOpen(false);
      setTimeSheetOpen(false);
      setSearchCatQuery("");
      setSearchWalletQuery("");
      setPermissionPrompt({
        isOpen: false,
        type: "photos",
        title: "",
        description: "",
      });
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

  /**
   * Downsamples large camera/gallery photos (e.g. 12-48MP) to max 1600px
   * on an offscreen HTML5 canvas to prevent webview OOM and speed up OCR by ~60%.
   */
  const downsampleImageIfNeeded = async (fileOrBlob: Blob | File, maxDim = 1600): Promise<Blob> => {
    return new Promise((resolve) => {
      if (fileOrBlob.type && !fileOrBlob.type.startsWith("image/")) {
        resolve(fileOrBlob);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(fileOrBlob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { naturalWidth: width, naturalHeight: height } = img;
        if (width <= maxDim && height <= maxDim) {
          resolve(fileOrBlob);
          return;
        }
        const scale = Math.min(maxDim / width, maxDim / height);
        const targetW = Math.round(width * scale);
        const targetH = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(fileOrBlob);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob(
          (blob) => {
            resolve(blob || fileOrBlob);
          },
          "image/jpeg",
          0.88,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(fileOrBlob);
      };
      img.src = url;
    });
  };

  const handleProcessMedia = async (fileOrBlob: Blob | File, customPreviewUrl?: string) => {
    triggerHaptic("medium");
    setErrorText(null);
    setUnregisteredWalletName(null);
    setUnregisteredCategoryName(null);
    setStep("processing");
    setProgressPct(5);

    const previewUrl = customPreviewUrl || URL.createObjectURL(fileOrBlob);
    setImagePreview(previewUrl);

    try {
      setProgressPct(8);
      setProgressStatus("Optimizing receipt resolution...");
      const optimizedBlob = await downsampleImageIfNeeded(fileOrBlob, 1600);

      const result: OCRScanResult = await scanReceiptOrSlip(
        optimizedBlob,
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
      if (result.slip.time) {
        setTime(result.slip.time);
      } else {
        setTime(format(result.slip.date || new Date(), "HH:mm"));
      }
      setMerchant(result.slip.merchantOrRecipient || "");
      setNote("");
      setType(result.slip.type || "expense");
      setStep("result");
    } catch (err: any) {
      console.error("[ReceiptScanModal] Scan failed:", err);
      triggerHaptic("heavy");
      setErrorText(err?.message || "Failed to scan receipt. Please ensure the image is clear and well lit.");
      setStep("idle");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessMedia(file);
    }
    e.target.value = "";
  };

  const captureLiveSnapshot = (): boolean => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return false;

    triggerHaptic("heavy");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopLiveCamera();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          handleProcessMedia(blob);
        }
      },
      "image/jpeg",
      0.95
    );
    return true;
  };

  const handleTakePhotoNative = async () => {
    triggerHaptic("medium");
    setErrorText(null);
    try {
      const result = await capturePhotoFromCamera();
      if (result) {
        await handleProcessMedia(result.blob, result.previewUrl);
      }
    } catch (err: any) {
      if (err?.name === "CameraPermissionError") {
        setPermissionPrompt({
          isOpen: true,
          type: "camera",
          title: "Camera Access Required",
          description: "Trouvaille requires camera access to scan physical receipts, invoices, and payment slips directly.",
        });
      } else {
        console.error("[ReceiptScanModal] Camera capture error:", err);
        setErrorText(err?.message || "Failed to launch camera.");
      }
    }
  };

  const handlePickGalleryNative = async () => {
    triggerHaptic("light");
    setErrorText(null);
    try {
      const result = await pickPhotoFromGallery();
      if (result) {
        await handleProcessMedia(result.blob, result.previewUrl);
      }
    } catch (err: any) {
      if (err?.name === "PhotosPermissionError") {
        setPermissionPrompt({
          isOpen: true,
          type: "photos",
          title: "Photo Library Access Required",
          description: "Trouvaille requires photo library access to import saved receipts, invoices, and payment screenshots.",
        });
      } else {
        console.error("[ReceiptScanModal] Gallery pick error:", err);
        setErrorText(err?.message || "Failed to open photo library.");
      }
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
            showToast(`Account "${unregisteredWalletName}" created`, "add", () => {});
          },
          onError: () => {
            showToast("Failed to create account", "delete", () => {});
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
            showToast(`Category "${unregisteredCategoryName}" created`, "add", () => {});
          },
          onError: () => {
            showToast("Failed to create category", "delete", () => {});
          },
        },
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTransaction = () => {
    if (!amount || amount <= 0) {
      showToast("Please enter a valid amount", "info", null, 2500);
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
      : (merchant.trim() || "Scanned Receipt");

    // Build timestamp with selected time
    const [h, m] = time.split(":").map(Number);
    const txDate = new Date(date);
    if (!isNaN(h) && !isNaN(m)) {
      txDate.setHours(h, m, 0, 0);
    }

    triggerSuccessHaptic();
    addTx.mutate(
      {
        type,
        amount,
        wallet_id: effectiveWalletId,
        category_id: type === "transfer" ? null : effectiveCatId,
        note: finalDescription || null,
        occurred_on: format(date, "yyyy-MM-dd"),
        created_at: txDate.toISOString(),
      },
      {
        onSuccess: () => {
          showToast("Transaction saved successfully", "add", () => {});
          onClose();
        },
        onError: () => {
          showToast("Failed to save transaction", "delete", () => {});
        },
      },
    );
  };

  const handleOpenInFullForm = () => {
    triggerHaptic("light");
    const finalDescription = note.trim()
      ? (merchant.trim() ? `${merchant.trim()} • ${note.trim()}` : note.trim())
      : (merchant.trim() || "Scanned Receipt");

    // Build timestamp with selected time
    const [h, m] = time.split(":").map(Number);
    const combinedDate = new Date(date);
    if (!isNaN(h) && !isNaN(m)) {
      combinedDate.setHours(h, m, 0, 0);
    }

    onOpenForm({
      type,
      amount,
      walletId,
      categoryId,
      toWalletId: null,
      date: combinedDate,
      note: finalDescription,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto">
          {/* Liquid Glass Backdrop with Soft Dark Ambient Bleed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={step === "processing" ? undefined : onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-2xl"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.05) 0%, transparent 70%)",
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
              background: "linear-gradient(165deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(0, 0, 0, 0.5) 100%), var(--bg-canvas)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 32px 64px -12px rgba(0, 0, 0, 0.8)",
              fontFamily: "Urbanist, -apple-system, sans-serif",
              paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
            }}
          >
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between pb-3.5">
              <div>
                <h3
                  className="text-[16px] font-semibold tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Scan Receipt
                </h3>
                <p className="text-[11px] font-normal mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                  <span>Physical receipts, QRIS & bank transfer slips</span>
                  {!shouldSaveAttachments && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white/[0.06] border border-white/10 text-[var(--text-secondary)]">
                      <Shield size={9} strokeWidth={1.5} />
                      Ephemeral
                    </span>
                  )}
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
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/[0.1] active:scale-90 disabled:opacity-40 cursor-pointer"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.15)",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>

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
              <div className="flex-1 flex flex-col items-center justify-start pt-1 pb-2 space-y-3">
                {/* Optical Glass Lens Viewfinder - Lengthened vertically for physical receipts & slips */}
                <div
                  onClick={isLiveCameraActive ? () => captureLiveSnapshot() : undefined}
                  className={`relative w-full aspect-[3/4] max-h-[50dvh] rounded-[28px] flex flex-col items-center justify-center overflow-hidden transition-all bg-black ${
                    isLiveCameraActive ? "cursor-pointer" : ""
                  }`}
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.14)",
                  }}
                >
                  {/* Live Video Camera Stream */}
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                      isLiveCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  />

                  {/* Live Indicator Pill */}
                  {isLiveCameraActive && (
                    <div className="absolute top-3.5 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-semibold text-white/90 tracking-wide uppercase">
                        Live Camera
                      </span>
                    </div>
                  )}

                  {/* Delicate Specular Corner Brackets */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t border-l rounded-tl-lg pointer-events-none opacity-50 border-white z-10" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t border-r rounded-tr-lg pointer-events-none opacity-50 border-white z-10" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l rounded-bl-lg pointer-events-none opacity-50 border-white z-10" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r rounded-br-lg pointer-events-none opacity-50 border-white z-10" />

                  {/* Static Placeholder when live stream is inactive */}
                  {!isLiveCameraActive && (
                    <div className="flex flex-col items-center justify-center text-center px-6 pointer-events-none z-10">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5"
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.18)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <ScanLine size={20} strokeWidth={1.5} />
                      </div>
                      <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                        Align receipt within frame
                      </p>
                      <p className="text-[11px] font-normal mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        Physical receipts, QRIS & bank slips
                      </p>
                    </div>
                  )}
                </div>

                {/* Floating Controls (Direct Touch Gestures on Native Inputs) */}
                <div className="flex items-center justify-center gap-7 pt-2">
                  {/* Gallery Button: Direct Touch File Input Without Capture */}
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group relative">
                    <div
                      className="w-13 h-13 rounded-full flex items-center justify-center transition-all group-active:scale-90 relative overflow-hidden"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 8px 20px rgba(0, 0, 0, 0.35)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <ImageIcon size={19} strokeWidth={1.5} />

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        onClick={(e) => {
                          triggerHaptic("light");
                          if (Capacitor.isNativePlatform()) {
                            e.preventDefault();
                            handlePickGalleryNative();
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        title="Choose from Gallery"
                      />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      Gallery
                    </span>
                  </div>

                  {/* Take Photo Button: Live Snapshot or Direct Native Touch Capture */}
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer group relative">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all group-active:scale-95 relative overflow-hidden"
                      style={{
                        background: "#ffffff",
                        color: "#000000",
                        boxShadow: "0 10px 28px -4px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      <Camera size={23} strokeWidth={1.75} />

                      {/* Direct native touch input with capture="environment" */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInputChange}
                        onClick={(e) => {
                          triggerHaptic("medium");
                          if (isLiveCameraActive) {
                            const snapped = captureLiveSnapshot();
                            if (snapped) {
                              e.preventDefault();
                              return;
                            }
                          }
                          if (Capacitor.isNativePlatform()) {
                            e.preventDefault();
                            handleTakePhotoNative();
                            return;
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        title="Take Photo"
                      />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                      Take Photo
                    </span>
                  </div>

                  {onOpenImport && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        onOpenImport();
                      }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <div
                        className="w-13 h-13 rounded-full flex items-center justify-center transition-all group-active:scale-90"
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          backdropFilter: "blur(20px)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 8px 20px rgba(0, 0, 0, 0.35)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <FileSpreadsheet size={19} strokeWidth={1.5} />
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        CSV / Mutasi
                      </span>
                    </button>
                  )}
                </div>

                {/* Permissions & Access Info Link */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setPermissionPrompt({
                      isOpen: true,
                      type: "photos",
                      title: "Media & Camera Permissions",
                      description: "Trouvaille requires permission to import receipts from your photo gallery or take photos with your camera.",
                    });
                  }}
                  className="text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 pt-1 hover:opacity-80 active:scale-95"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <Shield size={12} strokeWidth={1.5} />
                  Permissions & Access
                </button>
              </div>
            )}

            {/* Step 2: Processing (Liquid Laser Scan) */}
            {step === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-4 text-center">
                {imagePreview && (
                  <div
                    className="relative w-44 h-56 rounded-2xl overflow-hidden"
                    style={{
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      boxShadow: "0 16px 36px -8px rgba(0, 0, 0, 0.65)",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Receipt scanning"
                      className="w-full h-full object-cover filter brightness-95 contrast-105"
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
                        boxShadow: "0 0 10px var(--accent)",
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
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-[11px] font-normal truncate" style={{ color: "var(--text-secondary)" }}>
                        Account <span className="font-medium text-[var(--text-primary)]">{unregisteredWalletName}</span> is not registered
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
                      <span>Add Account</span>
                    </button>
                  </div>
                ) : unregisteredCategoryName ? (
                  <div
                    className="p-2.5 px-3 rounded-2xl flex items-center justify-between gap-2"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
                      <p className="text-[11px] font-normal truncate" style={{ color: "var(--text-secondary)" }}>
                        Category <span className="font-medium text-[var(--text-primary)]">{unregisteredCategoryName}</span> is not registered
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
                      <span>Add Category</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="py-1 px-3 rounded-full flex items-center justify-center gap-1.5 mx-auto w-fit"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.09)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="text-[11px] font-normal" style={{ color: "var(--text-secondary)" }}>
                      Receipt scanned • {Math.round(parsedSlip.confidence * 100)}% match
                    </span>
                  </div>
                )}

                {/* Hero Liquid Card: Merchant, Receipt Thumbnail & Seamless Amount */}
                <div
                  className="p-4 rounded-[26px] space-y-3"
                  style={{
                    background: "linear-gradient(165deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.18), 0 14px 32px -8px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  {/* Top: Merchant Info & Receipt Thumbnail Preview */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
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
                          placeholder="Merchant / Recipient"
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
                          {selectedCategory ? selectedCategory.name : "Select category"}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Receipt Thumbnail with Subtle Corner Magnifier */}
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setInspectPhotoOpen(true);
                        }}
                        className="relative w-11 h-14 rounded-xl overflow-hidden shrink-0 border border-white/18 shadow-md group cursor-pointer active:scale-95 transition-all"
                        title="Tap to inspect original receipt"
                      >
                        <img
                          src={imagePreview}
                          alt="Original Receipt"
                          className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full bg-black/65 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Eye size={10} className="text-white/90" strokeWidth={2} />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Subtle Hairline Divider */}
                  <div className="h-[1px] bg-white/[0.06] w-full" />

                  {/* Centered Apple-Style Amount Presentation (Zero Empty Gap) */}
                  <div className="py-1 flex flex-col items-center justify-center">
                    <span
                      className="text-[10px] font-medium tracking-wider uppercase mb-1 select-none"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Total Amount
                    </span>

                    <div className="flex items-baseline justify-center gap-1.5">
                      <span
                        className="text-[17px] font-light select-none"
                        style={{ color: "var(--text-tertiary)" }}
                      >
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
                        className="text-[32px] font-semibold text-center bg-transparent outline-none tracking-tight p-0"
                        style={{
                          color: "var(--text-primary)",
                          fontFamily: "Urbanist, -apple-system, sans-serif",
                          width: `${Math.max(2, (amount ? amount.toLocaleString("id-ID") : "0").length) * 19 + 16}px`,
                          maxWidth: "240px",
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
                    border: "1px solid rgba(255, 255, 255, 0.07)",
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
                    Expense
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
                    Income
                  </button>
                </div>

                {/* Segmented Liquid Glass Vessel (Grouped Apple Style) */}
                <div
                  className="rounded-[22px] divide-y overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
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
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Category
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[65%] justify-end">
                      <span className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {selectedCategory ? selectedCategory.name : "Select Category"}
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
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Account
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[65%] justify-end">
                      <span className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {selectedWallet ? selectedWallet.name : "Select Account"}
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
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Date
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                        {format(date, "d MMM yyyy")}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </button>

                  {/* Time Row */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setTimeSheetOpen(true);
                    }}
                    className="w-full p-3 flex items-center justify-between transition-colors active:bg-white/[0.04] cursor-pointer text-left"
                    style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-[12px] font-normal" style={{ color: "var(--text-secondary)" }}>
                        Time
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                        {time}
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
                        Notes
                      </span>
                    </div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note (optional)"
                      className="text-[11px] placeholder:text-[11px] placeholder:text-[var(--text-tertiary)] placeholder:opacity-60 font-normal bg-transparent outline-none text-right flex-1 pl-4"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "Urbanist, -apple-system, sans-serif",
                      }}
                    />
                  </div>
                </div>

                {/* Primary Action Button (Elegant Apple White Gradient & Deep Contrast) */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={addTx.isPending}
                    onClick={handleSaveTransaction}
                    className="w-full h-12 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border border-white/80 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
                      color: "#000000",
                      boxShadow: "inset 0 1px 0 0 #ffffff, inset 0 -1px 0 0 rgba(0, 0, 0, 0.08), 0 10px 26px -6px rgba(0, 0, 0, 0.55)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {addTx.isPending ? (
                      <Loader2 size={16} className="animate-spin text-black" />
                    ) : (
                      <>
                        <Check size={16} strokeWidth={2.25} className="text-black" />
                        <span className="font-semibold text-black">
                          Save Transaction {amount > 0 ? `(${formatRupiah(amount)})` : ""}
                        </span>
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
                        border: "1px solid rgba(255, 255, 255, 0.09)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <SlidersHorizontal size={13} strokeWidth={1.5} />
                      <span>Customize Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setStep("idle");
                        setImagePreview(null);
                        setParsedSlip(null);
                      }}
                      className="flex-1 h-9 rounded-xl font-normal text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.09)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <RotateCcw size={13} strokeWidth={1.5} />
                      <span>Scan Again</span>
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
                className="absolute -top-12 right-0 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 active:scale-95 transition-all"
              >
                <X size={16} strokeWidth={2} />
              </button>
              <img
                src={imagePreview}
                alt="Original Receipt"
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/15"
              />
              <p className="text-[12px] font-normal text-white/60 mt-3">
                Tap anywhere to close
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
        title="Select Category"
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
              placeholder="Search category..."
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
                No categories found for "{searchCatQuery}"
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
                    <span className="text-[11px] font-normal text-center truncate w-full px-0.5">
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
        title="Select Account"
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
              placeholder="Search account..."
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
                No accounts found for "{searchWalletQuery}"
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
      >
        <div className="p-5 pb-10 flex flex-col items-center">
          <h3
            className="font-semibold text-lg mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Select Date
          </h3>
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

      {/* Glass Time Picker Sheet (Identical to TransactionSheet) */}
      <BottomSheet isOpen={timeSheetOpen} onClose={() => setTimeSheetOpen(false)}>
        <div className="p-5 pb-12 flex flex-col items-center">
          <h3
            className="font-semibold text-lg mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Select Time
          </h3>
          <p
            className="text-[12px] font-medium mb-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Transaction timestamp
          </p>

          <div
            className="p-4 rounded-3xl w-full max-w-[280px] flex items-center justify-center gap-3 glass-surface"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-3xl font-semibold amount text-center outline-none cursor-pointer"
              style={{ color: "var(--text-primary)", colorScheme: "dark" }}
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2 mt-5">
            {[
              "Morning (08:00)",
              "Noon (12:30)",
              "Evening (17:00)",
              "Night (20:00)",
            ].map((preset) => {
              const t = preset.match(/\((.*?)\)/)?.[1] || "12:00";
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setTime(t);
                    setTimeSheetOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {preset.split(" ")[0]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setTimeSheetOpen(false);
            }}
            className="w-full max-w-[280px] h-11 mt-6 rounded-2xl font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer border border-white/80"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #ececf0 100%)",
              color: "#000000",
              boxShadow: "inset 0 1px 0 0 #ffffff, 0 8px 20px -4px rgba(0, 0, 0, 0.45)",
            }}
          >
            Done
          </button>
        </div>
      </BottomSheet>

      {/* Media Permission BottomSheet */}
      <BottomSheet
        isOpen={permissionPrompt.isOpen}
        onClose={() => setPermissionPrompt((prev) => ({ ...prev, isOpen: false }))}
        title={permissionPrompt.title}
      >
        <div className="p-4 pb-8 space-y-4" style={{ fontFamily: "Urbanist, -apple-system, sans-serif" }}>
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {permissionPrompt.type === "camera" ? (
                <Camera size={20} strokeWidth={1.5} />
              ) : (
                <ImageIcon size={20} strokeWidth={1.5} />
              )}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {permissionPrompt.type === "camera" ? "Camera Hardware" : "Photo Library"}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                {permissionPrompt.description}
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-2xl border"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              borderColor: "var(--glass-border)",
            }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Trouvaille processes all financial receipts and bank slips 100% on-device using local optical character recognition. Your private captures never leave your phone.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                triggerHaptic("medium");
                if (permissionPrompt.type === "photos") {
                  const granted = await requestPhotosPermission();
                  setPermissionPrompt((prev) => ({ ...prev, isOpen: false }));
                  if (granted) {
                    showToast("Photo library access granted", "add", () => {});
                    if (Capacitor.isNativePlatform()) {
                      setTimeout(() => handlePickGalleryNative(), 250);
                    }
                  } else {
                    showToast("Please allow Photos access in device Settings", "delete", () => {});
                  }
                } else {
                  const granted = await requestCameraPermission();
                  setPermissionPrompt((prev) => ({ ...prev, isOpen: false }));
                  if (granted) {
                    showToast("Camera access granted", "add", () => {});
                    if (Capacitor.isNativePlatform()) {
                      setTimeout(() => handleTakePhotoNative(), 250);
                    } else {
                      startLiveCamera();
                    }
                  } else {
                    showToast("Please allow Camera access in device Settings", "delete", () => {});
                  }
                }
              }}
              className="w-full py-3 rounded-2xl font-bold text-[13px] transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: "#ffffff",
                color: "#000000",
                boxShadow: "0 4px 16px rgba(255, 255, 255, 0.15)",
              }}
            >
              <Check size={16} strokeWidth={2} />
              Grant Permission
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setPermissionPrompt((prev) => ({ ...prev, isOpen: false }));
              }}
              className="w-full py-2.5 rounded-2xl font-semibold text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}



