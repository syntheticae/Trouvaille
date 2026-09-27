import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ShieldCheck, X } from "lucide-react";
import { preloadAllIcons } from "../../lib/assetPreloader";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface InitialSyncScreenProps {
  onComplete?: () => void;
  totalCount?: number;
  isDataReady?: boolean;
  progress?: number;
  statusText?: string;
  isPreview?: boolean;
}

const ROTATING_TIPS_EN = [
  "Private & Offline-first: Your data remains encrypted on this device.",
  "Monochrome clarity: Zero distractions, pure financial telemetry.",
  "Fast capture: Record expenses via voice NLP or camera scan in seconds.",
  "Daily streak discipline: Consistent logging transforms wealth clarity.",
];

const ROTATING_TIPS_ID = [
  "Privat & Mengutamakan Mode Luring: Data finansial Anda tetap terenkripsi di perangkat ini.",
  "Kejernihan Monokrom: Tanpa distraksi warna, murni telemetri finansial.",
  "Pencatatan Cepat: Catat transaksi lewat dikte suara atau pemindaian struk dalam hitungan detik.",
  "Disiplin Runtun Harian: Konsistensi pencatatan membentuk kejernihan finansial jangka panjang.",
];

export function InitialSyncScreen({
  onComplete,
  totalCount = 0,
  isDataReady = false,
  progress: externalProgress,
  statusText: externalStatusText,
  isPreview = false,
}: InitialSyncScreenProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();

  const [internalProgress, setInternalProgress] = useState(isPreview ? 20 : 25);
  const [internalStatusText, setInternalStatusText] = useState(
    isIndonesian
      ? "Menginisialisasi brankas enkripsi privat..."
      : "Initializing private encryption vault..."
  );
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const displayProgress =
    externalProgress !== undefined ? externalProgress : internalProgress;
  const displayStatus = externalStatusText || internalStatusText;

  // Rotate micro-tips every 2.4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % ROTATING_TIPS_EN.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // In preview mode: smoothly step up progress to showcase all states
  useEffect(() => {
    if (!isPreview) return;

    const timer1 = setTimeout(() => {
      setInternalProgress(55);
      setInternalStatusText(
        isIndonesian
          ? "Mengalibrasi telemetri keuangan & dompet..."
          : "Calibrating financial telemetry & accounts..."
      );
    }, 1200);

    const timer2 = setTimeout(() => {
      setInternalProgress(88);
      setInternalStatusText(
        isIndonesian
          ? "Menyelaraskan buku kas & model finansial..."
          : "Synchronizing ledger & financial models..."
      );
    }, 2400);

    const timer3 = setTimeout(() => {
      setInternalProgress(100);
      setInternalStatusText(
        isIndonesian
          ? "Sinkronisasi selesai · Brankas siap"
          : "Synchronization complete · Vault ready"
      );
    }, 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isPreview, isIndonesian]);

  useEffect(() => {
    let isMounted = true;

    preloadAllIcons()
      .then(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
        if (!isPreview) {
          setInternalProgress((prev) => Math.max(prev, 55));
          setInternalStatusText(
            isIndonesian
              ? "Mengalibrasi telemetri keuangan & dompet..."
              : "Calibrating financial telemetry & accounts..."
          );
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
        if (!isPreview) {
          setInternalProgress((prev) => Math.max(prev, 55));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isPreview, isIndonesian]);

  // Standard completion when data is ready and progress reaches 100% (non-preview)
  useEffect(() => {
    if (isPreview) return;
    if (displayProgress >= 100 && isAssetsLoaded && isDataReady) {
      const t = setTimeout(() => {
        onComplete?.();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [displayProgress, isAssetsLoaded, isDataReady, onComplete, isPreview]);

  // Safety fallback: prevents infinite spinning if network drops or offline (non-preview)
  useEffect(() => {
    if (isPreview) return;
    if (isDataReady) {
      const fallback = setTimeout(() => {
        onComplete?.();
      }, 1400);
      return () => clearTimeout(fallback);
    }
  }, [isDataReady, onComplete, isPreview]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none px-6 relative overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)] transition-colors duration-300"
      style={{
        backgroundColor: isDark ? "#08080a" : "#f4f4f7",
        color: isDark ? "#ffffff" : "#09090c",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* 1. ATMOSPHERIC CINEMATIC MONOCHROME AURORA BLOOM */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/3 -left-32 w-88 h-88 rounded-full blur-[140px] ${
            isDark ? "bg-white/[0.04]" : "bg-black/[0.03]"
          }`}
        />
        <div
          className={`absolute bottom-1/3 -right-32 w-88 h-88 rounded-full blur-[130px] ${
            isDark ? "bg-white/[0.035]" : "bg-black/[0.025]"
          }`}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full blur-[160px] ${
            isDark ? "bg-white/[0.02]" : "bg-black/[0.02]"
          }`}
        />

        {/* Fluted glass radial lines */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05) 0%, transparent 60%)"
              : "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.04) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Preview Dismiss Button */}
      {isPreview && (
        <button
          type="button"
          onClick={onComplete}
          className={`absolute right-4 sm:right-6 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl transition-all active:scale-95 cursor-pointer z-20 ${
            isDark
              ? "bg-white/[0.08] hover:bg-white/[0.14] text-white/80 border border-white/12"
              : "bg-black/[0.05] hover:bg-black/[0.09] text-zinc-800 border border-black/10"
          }`}
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 16px), 20px)",
          }}
        >
          <X size={12} strokeWidth={2} />
          <span>{isIndonesian ? "Tutup Pratinjau" : "Close Preview"}</span>
        </button>
      )}

      {/* 2. LIQUID GLASS HERO CONTAINER */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`w-full max-w-[340px] p-6.5 rounded-[32px] text-center relative z-10 flex flex-col items-center space-y-5 backdrop-blur-2xl transition-all ${
          isDark
            ? "bg-white/[0.03] border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)]"
            : "bg-white/90 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)]"
        }`}
      >
        {/* Animated Refraction Orb */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.65, 0.3],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-18 h-18 rounded-full"
            style={{
              background: isDark
                ? "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(0,0,0,0.12) 0%, transparent 70%)",
            }}
          />

          <div
            className={`w-14 h-14 rounded-[22px] flex items-center justify-center relative border transition-colors ${
              isDark
                ? "bg-white/[0.06] border-white/[0.18] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
                : "bg-black/[0.04] border-black/[0.1] text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
            }`}
          >
            {displayProgress >= 100 ? (
              <Check size={22} strokeWidth={2} />
            ) : (
              <Sparkles size={20} strokeWidth={1.75} />
            )}
          </div>
        </div>

        {/* Text & Status */}
        <div className="space-y-1 w-full">
          <h2
            className={`text-[17px] font-semibold tracking-tight leading-snug ${
              isDark ? "text-white" : "text-zinc-950"
            }`}
          >
            Trouvaille
          </h2>
          <p
            className={`text-[12px] font-medium line-clamp-1 h-5 ${
              isDark ? "text-white/60" : "text-zinc-600"
            }`}
          >
            {displayStatus}
          </p>
          {totalCount > 0 && (
            <p
              className={`text-[10px] font-semibold amount mt-0.5 ${
                isDark ? "text-white/40" : "text-zinc-500"
              }`}
            >
              {isIndonesian
                ? `${totalCount.toLocaleString()} catatan tersinkronisasi`
                : `${totalCount.toLocaleString()} records synchronized`}
            </p>
          )}
        </div>

        {/* Liquid Glass Progress Bar */}
        <div className="w-full space-y-2 pt-1">
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden relative p-[0.5px] ${
              isDark
                ? "bg-white/[0.08] border border-white/[0.08]"
                : "bg-black/[0.06] border border-black/[0.06]"
            }`}
          >
            <motion.div
              className={`h-full rounded-full relative ${
                isDark ? "bg-white" : "bg-zinc-950"
              }`}
              initial={{ width: "15%" }}
              animate={{
                width: `${Math.min(100, Math.max(10, displayProgress))}%`,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{
                boxShadow: isDark
                  ? "0 0 12px rgba(255, 255, 255, 0.6)"
                  : "0 0 10px rgba(0, 0, 0, 0.25)",
              }}
            />
          </div>

          <div
            className={`flex justify-between items-center text-[10px] font-medium px-0.5 ${
              isDark ? "text-white/40" : "text-zinc-500"
            }`}
          >
            <span>
              {isIndonesian ? "Keamanan Terverifikasi" : "Security Verified"}
            </span>
            <span className="amount">{Math.round(displayProgress)}%</span>
          </div>
        </div>

        {/* Rotating Micro-Telemetry Tip */}
        <div className="h-9 flex items-center justify-center w-full px-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className={`text-[10.5px] font-normal text-center leading-tight line-clamp-2 ${
                isDark ? "text-white/45" : "text-zinc-500"
              }`}
            >
              {isIndonesian
                ? ROTATING_TIPS_ID[tipIndex]
                : ROTATING_TIPS_EN[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Floating Trust Badge */}
      <div
        className={`absolute bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] flex items-center gap-1.5 text-[11px] font-medium ${
          isDark ? "text-white/35" : "text-zinc-500"
        }`}
      >
        <ShieldCheck size={12} strokeWidth={1.5} />
        <span>
          {isIndonesian
            ? "Enkripsi Klien Ujung-ke-Ujung"
            : "End-to-End Client Encryption"}
        </span>
      </div>
    </div>
  );
}
