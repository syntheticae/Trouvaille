import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ShieldCheck, X, RotateCcw, Sparkles } from "lucide-react";
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

  // Preload real icons
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

  // Adaptive luxury step progression
  useEffect(() => {
    if (isCompletedAll) return;

    const timer = setTimeout(() => {
      setActiveStepIndex((prev) => {
        const next = prev + 1;
        if (next < SYNC_STEPS.length - 1) {
          return next;
        }

        // Hold before final step until assets & data are confirmed in real sync
        if (!isPreview && (!isAssetsLoaded || !isDataReady)) {
          return prev;
        }

        if (next === SYNC_STEPS.length - 1) {
          return next;
        }

        setIsCompletedAll(true);
        return prev;
      });
    }, 620);

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
        }, 450);
        return () => clearTimeout(finishTimer);
      }, 850);
      return () => clearTimeout(exitTimer);
    }
  }, [activeStepIndex, isPreview, onComplete]);

  // Overall progress percentage
  const progressPercent = Math.min(
    100,
    Math.round(((activeStepIndex + (isCompletedAll ? 1 : 0.4)) / SYNC_STEPS.length) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none px-6 sm:px-10 overflow-hidden transition-colors duration-500"
      style={{
        backgroundColor: isDark ? "#08080a" : "#f4f4f7",
        color: isDark ? "#ffffff" : "#09090c",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* 1. ATMOSPHERIC MONOCHROME CINEMATIC AURORA LAYER */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/4 -left-36 w-96 h-96 rounded-full blur-[140px] transition-opacity duration-700 ${
            isDark ? "bg-white/[0.035]" : "bg-black/[0.02]"
          }`}
        />
        <div
          className={`absolute bottom-1/4 -right-36 w-96 h-96 rounded-full blur-[140px] transition-opacity duration-700 ${
            isDark ? "bg-white/[0.03]" : "bg-black/[0.02]"
          }`}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[170px] ${
            isDark ? "bg-white/[0.02]" : "bg-black/[0.015]"
          }`}
        />

        {/* Fluted Fractal Ribbed Texture */}
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: isDark
              ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 38px)"
              : "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 38px)",
          }}
        />
      </div>

      {/* 2. FLOATING PREVIEW CONTROLS (TOP RIGHT ONLY - NO TOP LEFT BRANDING) */}
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

      {/* 3. UNIFIED CENTRALLY ALIGNED CONTENT CONTAINER */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto my-auto flex flex-col items-center justify-center space-y-6">
        {/* Timeline Items */}
        <div className="w-full space-y-0 relative">
          {SYNC_STEPS.map((step, index) => {
            const isCompleted = isCompletedAll || activeStepIndex > index;
            const isActive = !isCompletedAll && activeStepIndex === index;
            const isLast = index === SYNC_STEPS.length - 1;

            const title = isIndonesian ? step.titleId : step.titleEn;
            const subtitle = isIndonesian
              ? step.subtitleId(totalCount)
              : step.subtitleEn(totalCount);

            return (
              <div key={step.id} className="relative flex items-start gap-4 sm:gap-4.5 group">
                {/* Vertical Rail + Step Squircle Indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative flex items-center justify-center">
                    {/* Active Breathing Glow Halo */}
                    {isActive && (
                      <motion.div
                        className="absolute -inset-1 rounded-[16px] pointer-events-none"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                          scale: [0.96, 1.05, 0.96],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{
                          boxShadow: isDark
                            ? "0 0 16px rgba(255, 255, 255, 0.16)"
                            : "0 0 14px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    )}

                    {/* Squircle Indicator (Frosted Luxury - Never stark white solid blocks) */}
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[13px] flex items-center justify-center transition-all duration-300 relative z-10 backdrop-blur-xl ${
                        isCompleted
                          ? isDark
                            ? "bg-white/[0.08] border border-white/20 text-white shadow-[0_2px_10px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
                            : "bg-black/[0.05] border border-black/15 text-zinc-900 shadow-sm"
                          : isActive
                          ? isDark
                            ? "bg-white/[0.14] border border-white/35 text-white shadow-[0_0_14px_rgba(255,255,255,0.12)]"
                            : "bg-black/[0.08] border border-black/25 text-zinc-950 shadow-sm"
                          : isDark
                          ? "bg-white/[0.02] border border-white/[0.07] text-white/20"
                          : "bg-black/[0.02] border border-black/[0.06] text-zinc-400/40"
                      }`}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                          <Check size={14} strokeWidth={2} />
                        </motion.div>
                      ) : isActive ? (
                        <Sparkles size={13} strokeWidth={1.75} className="animate-spin-slow" />
                      ) : (
                        <span className="text-[10px] font-mono font-medium">
                          0{index + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vertical Connecting Rail */}
                  {!isLast && (
                    <div
                      className={`w-[1.5px] h-7 sm:h-8 my-0.5 transition-all duration-500 ${
                        isCompleted
                          ? isDark
                            ? "bg-gradient-to-b from-white/35 to-white/15 shadow-[0_0_6px_rgba(255,255,255,0.25)]"
                            : "bg-gradient-to-b from-zinc-800/35 to-zinc-800/15"
                          : isDark
                          ? "bg-white/[0.05]"
                          : "bg-black/[0.05]"
                      }`}
                    />
                  )}
                </div>

                {/* Step Text Block with Decryption Wavefront */}
                <div
                  className={`flex-1 pt-1 pb-2.5 transition-opacity duration-300 ${
                    isActive
                      ? "opacity-100"
                      : isCompleted
                      ? "opacity-85"
                      : "opacity-30"
                  }`}
                >
                  <h3
                    className={`text-[13.5px] sm:text-[15px] tracking-tight leading-snug transition-colors ${
                      isActive
                        ? isDark
                          ? "text-white font-semibold"
                          : "text-zinc-950 font-semibold"
                        : isCompleted
                        ? isDark
                          ? "text-white/80 font-medium"
                          : "text-zinc-900 font-medium"
                        : isDark
                        ? "text-white/30 font-light"
                        : "text-zinc-500 font-light"
                    }`}
                  >
                    <EncryptedText
                      text={title}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      revealDelayMs={28}
                      encryptedClassName={
                        isDark
                          ? "text-white/50 font-mono tracking-wider"
                          : "text-zinc-950/50 font-mono tracking-wider"
                      }
                      revealedClassName={
                        isActive
                          ? isDark
                            ? "text-white font-semibold"
                            : "text-zinc-950 font-semibold"
                          : isDark
                          ? "text-white/85 font-medium"
                          : "text-zinc-900 font-medium"
                      }
                    />
                  </h3>

                  <p
                    className={`text-[11px] sm:text-[11.5px] font-normal mt-0.5 leading-relaxed transition-colors ${
                      isActive
                        ? isDark
                          ? "text-white/55"
                          : "text-zinc-600"
                        : isCompleted
                        ? isDark
                          ? "text-white/35"
                          : "text-zinc-500"
                        : isDark
                        ? "text-white/15"
                        : "text-zinc-400"
                    }`}
                  >
                    {subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integrated Centered Bottom Progress & Trust Badge */}
        <div className="w-full pt-2 space-y-3.5">
          {/* Hairline Liquid Progress Track */}
          <div className="w-full space-y-1.5">
            <div
              className={`w-full h-1 rounded-full overflow-hidden relative ${
                isDark ? "bg-white/[0.06]" : "bg-black/[0.05]"
              }`}
            >
              <motion.div
                className={`h-full rounded-full transition-all duration-300 ${
                  isDark
                    ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                    : "bg-zinc-950 shadow-[0_0_6px_rgba(0,0,0,0.25)]"
                }`}
                initial={{ width: "10%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>

            <div
              className={`flex justify-between items-center text-[9.5px] font-mono tracking-widest ${
                isDark ? "text-white/30" : "text-zinc-400"
              }`}
            >
              <span>
                {isIndonesian ? "PROTOKOL KEAMANAN AKTIF" : "SECURITY PROTOCOL ACTIVE"}
              </span>
              <span>{progressPercent}%</span>
            </div>
          </div>

          {/* Floating Trust Badge */}
          <div
            className={`flex items-center justify-center gap-1.5 text-[10.5px] font-medium ${
              isDark ? "text-white/35" : "text-zinc-500"
            }`}
          >
            <ShieldCheck size={12} strokeWidth={1.5} />
            <span>
              {isIndonesian
                ? "Enkripsi Klien Ujung-ke-Ujung · Nir-Pengetahuan"
                : "End-to-End Client Encryption · Zero-Knowledge"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
