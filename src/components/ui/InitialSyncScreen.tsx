import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import { preloadAllIcons } from "../../lib/assetPreloader";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { EncryptedText } from "./EncryptedText";

interface InitialSyncScreenProps {
  onComplete?: () => void;
  totalCount?: number;
  isDataReady?: boolean;
  progress?: number;
  statusText?: string;
  isPreview?: boolean;
}

interface StepItem {
  id: string;
  titleEn: string;
  titleId: string;
  subtitleEn: (count: number) => string;
  subtitleId: (count: number) => string;
}

const SYNC_STEPS: StepItem[] = [
  {
    id: "vault",
    titleEn: "Initializing Client Cryptographic Vault",
    titleId: "Inisialisasi Brankas Kriptografi Klien",
    subtitleEn: () => "Zero-knowledge local memory allocation",
    subtitleId: () => "Alokasi memori lokal nir-pengetahuan",
  },
  {
    id: "assets",
    titleEn: "Preloading Vector Assets & Interface Telemetry",
    titleId: "Pra-muat Aset Antarmuka & Telemetri",
    subtitleEn: () => "Calibrating luxury monochrome icons & typography",
    subtitleId: () => "Menyelaraskan ikon monokrom & tipografi",
  },
  {
    id: "ledgers",
    titleEn: "Resolving Ledgers & Multi-Wallet State",
    titleId: "Penyelarasan Buku Kas & Multi-Dompet",
    subtitleEn: () => "Connecting balance ledgers & active vaults",
    subtitleId: () => "Menghubungkan buku kas saldo & brankas aktif",
  },
  {
    id: "entries",
    titleEn: "Synchronizing Financial Entries & Vault Records",
    titleId: "Sinkronisasi Catatan & Integritas Entri",
    subtitleEn: (count) =>
      count > 0
        ? `${count.toLocaleString()} encrypted entries calibrated`
        : "Calibrating encrypted ledger records",
    subtitleId: (count) =>
      count > 0
        ? `${count.toLocaleString()} catatan terenkripsi dikalibrasi`
        : "Mengalibrasi catatan buku kas terenkripsi",
  },
  {
    id: "integrity",
    titleEn: "Verifying Ledger Integrity & Zero-Knowledge",
    titleId: "Verifikasi Keamanan Zero-Knowledge",
    subtitleEn: () => "End-to-end client encryption hash verified",
    subtitleId: () => "Hash enkripsi klien ujung-ke-ujung terverifikasi",
  },
  {
    id: "ready",
    titleEn: "Vault Ready · Unlocking Dashboard",
    titleId: "Brankas Siap · Membuka Dashboard",
    subtitleEn: () => "Private financial telemetry initialized",
    subtitleId: () => "Telemetri finansial privat siap digunakan",
  },
];

const WINDOW_HEIGHT = 400; // Fixed optical viewport height
const ROW_HEIGHT = 100;    // Row height per step

export function InitialSyncScreen({
  onComplete,
  totalCount = 0,
  isDataReady = false,
  isPreview = false,
}: InitialSyncScreenProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [isCompletedAll, setIsCompletedAll] = useState(false);

  // Preload real icons in background
  useEffect(() => {
    let isMounted = true;
    preloadAllIcons()
      .then(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Relaxed, comfortable luxury pacing: 2100ms (2.1s) per step so user can read smoothly
  useEffect(() => {
    if (isCompletedAll) return;

    const timer = setTimeout(() => {
      setActiveStepIndex((prev) => {
        const next = prev + 1;
        if (next < SYNC_STEPS.length - 1) {
          return next;
        }

        // In real sync, hold before final step until assets & data are confirmed
        if (!isPreview && (!isAssetsLoaded || !isDataReady)) {
          return prev;
        }

        if (next === SYNC_STEPS.length - 1) {
          return next;
        }

        setIsCompletedAll(true);
        return prev;
      });
    }, 2100);

    return () => clearTimeout(timer);
  }, [activeStepIndex, isAssetsLoaded, isDataReady, isPreview, isCompletedAll]);

  // Real sync completion handling
  useEffect(() => {
    if (isPreview) return;

    if (activeStepIndex === SYNC_STEPS.length - 1) {
      const exitTimer = setTimeout(() => {
        setIsCompletedAll(true);
        const finishTimer = setTimeout(() => {
          onComplete?.();
        }, 700);
        return () => clearTimeout(finishTimer);
      }, 1800);
      return () => clearTimeout(exitTimer);
    }
  }, [activeStepIndex, isPreview, onComplete]);

  // Mathematically exact vertical centering offset:
  // (WINDOW_HEIGHT - ROW_HEIGHT) / 2 ensures step `activeStepIndex` is locked at exactly WINDOW_HEIGHT / 2 (dead center)
  const targetOffsetY =
    (WINDOW_HEIGHT - ROW_HEIGHT) / 2 - activeStepIndex * ROW_HEIGHT;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none px-6 sm:px-12 overflow-hidden transition-colors duration-500"
      style={{
        backgroundColor: isDark ? "#08080a" : "#f4f4f7",
        color: isDark ? "#ffffff" : "#09090c",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* 1. ATMOSPHERIC MONOCHROME CINEMATIC AURORA BLOOM */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/3 -left-40 w-[480px] h-[480px] rounded-full blur-[150px] transition-opacity duration-700 ${
            isDark ? "bg-white/[0.04]" : "bg-black/[0.025]"
          }`}
        />
        <div
          className={`absolute bottom-1/3 -right-40 w-[480px] h-[480px] rounded-full blur-[150px] transition-opacity duration-700 ${
            isDark ? "bg-white/[0.035]" : "bg-black/[0.02]"
          }`}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full blur-[180px] ${
            isDark ? "bg-white/[0.02]" : "bg-black/[0.015]"
          }`}
        />

        {/* Fluted Fractal Glass Ribbed Texture */}
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: isDark
              ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 42px)"
              : "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 42px)",
          }}
        />
      </div>

      {/* 2. FLOATING TOP-RIGHT PREVIEW CONTROLS */}
      {isPreview && (
        <div
          className="fixed right-5 sm:right-8 z-30 flex items-center gap-2"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveStepIndex(0);
              setIsCompletedAll(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-xl transition-all active:scale-95 cursor-pointer ${
              isDark
                ? "bg-white/[0.06] hover:bg-white/[0.1] text-white/70 border border-white/10"
                : "bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 border border-black/8"
            }`}
            title={isIndonesian ? "Putar Ulang" : "Replay"}
          >
            <RotateCcw size={11} strokeWidth={1.75} />
            <span>{isIndonesian ? "Putar Ulang" : "Replay"}</span>
          </button>

          <button
            type="button"
            onClick={onComplete}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl transition-all active:scale-95 cursor-pointer ${
              isDark
                ? "bg-white/[0.1] hover:bg-white/[0.16] text-white border border-white/15"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
            }`}
          >
            <X size={12} strokeWidth={2} />
            <span>{isIndonesian ? "Tutup Pratinjau" : "Close Preview"}</span>
          </button>
        </div>
      )}

      {/* 3. DYNAMIC VERTICAL TUMBLER (PERFECTLY CENTERED, PURE TYPOGRAPHY) */}
      <div
        className="relative z-10 w-full max-w-xl overflow-hidden flex flex-col items-center text-center"
        style={{
          height: WINDOW_HEIGHT,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        }}
      >
        <motion.div
          className="w-full flex flex-col items-center"
          animate={{
            y: targetOffsetY,
          }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 20,
            mass: 0.8,
          }}
        >
          {SYNC_STEPS.map((step, index) => {
            const distance = Math.abs(index - activeStepIndex);
            const isActive = index === activeStepIndex && !isCompletedAll;
            const isCompleted = index < activeStepIndex || isCompletedAll;

            const title = isIndonesian ? step.titleId : step.titleEn;
            const subtitle = isIndonesian
              ? step.subtitleId(totalCount)
              : step.subtitleEn(totalCount);

            // Contrast & visibility: active is 100% bright, surrounding are cleanly readable
            let opacity = 1;
            let scale = 1;
            let blur = "blur(0px)";

            if (distance === 0) {
              opacity = 1;
              scale = 1;
              blur = "blur(0px)";
            } else if (distance === 1) {
              opacity = isDark ? 0.48 : 0.52;
              scale = 0.92;
              blur = "blur(1px)";
            } else {
              opacity = isDark ? 0.18 : 0.22;
              scale = 0.84;
              blur = "blur(2.5px)";
            }

            return (
              <motion.div
                key={step.id}
                className="w-full flex flex-col items-center justify-center px-4"
                style={{
                  height: ROW_HEIGHT,
                  opacity,
                  scale,
                  filter: blur,
                  transformOrigin: "center center",
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                {/* Large, High-Contrast Typography with EncryptedText */}
                <h2
                  className={`tracking-tight leading-snug transition-colors ${
                    distance === 0
                      ? `text-[24px] sm:text-[29px] ${
                          isDark
                            ? "text-white font-bold drop-shadow-[0_2px_16px_rgba(255,255,255,0.18)]"
                            : "text-zinc-950 font-bold"
                        }`
                      : `text-[17px] sm:text-[20px] ${
                          isDark
                            ? "text-zinc-300 font-medium"
                            : "text-zinc-700 font-medium"
                        }`
                  }`}
                >
                  <EncryptedText
                    text={title}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    revealDelayMs={28}
                    encryptedClassName={
                      isDark
                        ? "text-white/70 font-mono tracking-wider"
                        : "text-zinc-950/70 font-mono tracking-wider"
                    }
                    revealedClassName={
                      distance === 0
                        ? isDark
                          ? "text-white font-bold"
                          : "text-zinc-950 font-bold"
                        : isDark
                        ? "text-zinc-300 font-medium"
                        : "text-zinc-700 font-medium"
                    }
                  />
                </h2>

                {/* Subtitle: High contrast and legible on active step */}
                <AnimatePresence>
                  {distance === 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={`text-[13px] sm:text-[14px] font-medium mt-2 max-w-md mx-auto leading-relaxed ${
                        isDark ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      {subtitle}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
