import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ShieldCheck, X, Lock, RotateCcw, Sparkles } from "lucide-react";
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

    // Minimum pacing per step: 650ms for elegant cipher readability
    const timer = setTimeout(() => {
      setActiveStepIndex((prev) => {
        const next = prev + 1;
        // Step 0 to 4 advance sequentially
        if (next < SYNC_STEPS.length - 1) {
          return next;
        }

        // Before entering final step ("Vault Ready"), wait for assets & data readiness if in real sync
        if (!isPreview && (!isAssetsLoaded || !isDataReady)) {
          return prev; // hold at step 4 until assets & data are confirmed
        }

        if (next === SYNC_STEPS.length - 1) {
          return next;
        }

        // Finished all steps
        setIsCompletedAll(true);
        return prev;
      });
    }, 680);

    return () => clearTimeout(timer);
  }, [activeStepIndex, isAssetsLoaded, isDataReady, isPreview, isCompletedAll]);

  // If in real sync: when reached final step and finished, smoothly complete
  useEffect(() => {
    if (isPreview) return;

    if (activeStepIndex === SYNC_STEPS.length - 1) {
      const exitTimer = setTimeout(() => {
        setIsCompletedAll(true);
        const finishTimer = setTimeout(() => {
          onComplete?.();
        }, 500);
        return () => clearTimeout(finishTimer);
      }, 900);
      return () => clearTimeout(exitTimer);
    }
  }, [activeStepIndex, isPreview, onComplete]);

  // Overall progress percentage based on step completion
  const progressPercent = Math.min(
    100,
    Math.round(((activeStepIndex + (isCompletedAll ? 1 : 0.4)) / SYNC_STEPS.length) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between select-none px-6 sm:px-12 relative overflow-hidden transition-colors duration-500"
      style={{
        backgroundColor: isDark ? "#08080a" : "#f4f4f7",
        color: isDark ? "#ffffff" : "#09090c",
        fontFamily: "'Urbanist', sans-serif",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 20px), 24px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 24px)",
      }}
    >
      {/* 1. ATMOSPHERIC MONOCHROME CINEMATIC AURORA LAYER (NO CARDS) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Fluid Mesh Blobs */}
        <div
          className={`absolute top-1/4 -left-36 w-96 h-96 rounded-full blur-[140px] transition-opacity duration-700 ${
            isDark ? "bg-white/[0.035]" : "bg-black/[0.025]"
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
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: isDark
              ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 40px)"
              : "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 40px)",
          }}
        />
      </div>

      {/* 2. TOP TELEMETRY HEADER */}
      <div className="relative z-10 w-full max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isDark
                ? "bg-white/[0.06] border border-white/10 text-white"
                : "bg-black/[0.04] border border-black/8 text-zinc-900"
            }`}
          >
            <Lock size={14} strokeWidth={1.75} />
          </div>
          <div>
            <h1
              className={`text-[16px] font-bold tracking-tight leading-none ${
                isDark ? "text-white" : "text-zinc-950"
              }`}
            >
              Trouvaille
            </h1>
            <p
              className={`text-[10.5px] font-medium tracking-wide mt-0.5 ${
                isDark ? "text-white/40" : "text-zinc-500"
              }`}
            >
              {isIndonesian ? "Telemetri Brankas Privat" : "Private Vault Telemetry"}
            </p>
          </div>
        </div>

        {/* Action Controls & Preview Capsule */}
        <div className="flex items-center gap-2">
          {isPreview && (
            <>
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
            </>
          )}

          {!isPreview && (
            <div
              className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider transition-colors ${
                isDark
                  ? "bg-white/[0.05] border border-white/10 text-white/60"
                  : "bg-black/[0.04] border border-black/8 text-zinc-700"
              }`}
            >
              {progressPercent}%
            </div>
          )}
        </div>
      </div>

      {/* 3. CENTER: IMMERSIVE FULL-SCREEN VERTICAL MULTI-STEP TIMELINE (NO CARD) */}
      <div className="relative z-10 w-full max-w-xl mx-auto my-auto py-8 sm:py-12">
        <div className="space-y-0 relative">
          {SYNC_STEPS.map((step, index) => {
            const isCompleted = isCompletedAll || activeStepIndex > index;
            const isActive = !isCompletedAll && activeStepIndex === index;
            const isLast = index === SYNC_STEPS.length - 1;

            const title = isIndonesian ? step.titleId : step.titleEn;
            const subtitle = isIndonesian
              ? step.subtitleId(totalCount)
              : step.subtitleEn(totalCount);

            return (
              <div key={step.id} className="relative flex items-start gap-4 sm:gap-5 group">
                {/* Vertical Rail + Step Squircle Indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative flex items-center justify-center">
                    {/* Active Pulse Ring */}
                    {isActive && (
                      <motion.div
                        layoutId="activeRing"
                        className="absolute -inset-1.5 rounded-[18px] pointer-events-none"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{
                          opacity: [0.35, 0.7, 0.35],
                          scale: [0.95, 1.08, 0.95],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        style={{
                          border: isDark
                            ? "1px solid rgba(255, 255, 255, 0.35)"
                            : "1px solid rgba(0, 0, 0, 0.25)",
                        }}
                      />
                    )}

                    {/* Step Squircle Container */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center transition-all duration-300 relative z-10 ${
                        isCompleted
                          ? isDark
                            ? "bg-white text-zinc-950 shadow-[0_0_16px_rgba(255,255,255,0.2)]"
                            : "bg-zinc-950 text-white shadow-md"
                          : isActive
                          ? isDark
                            ? "bg-white/[0.12] border border-white/30 text-white"
                            : "bg-black/[0.08] border border-black/20 text-zinc-950"
                          : isDark
                          ? "bg-white/[0.03] border border-white/[0.08] text-white/25"
                          : "bg-black/[0.02] border border-black/[0.06] text-zinc-400/40"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={16} strokeWidth={2.5} />
                      ) : isActive ? (
                        <Sparkles size={16} strokeWidth={1.75} className="animate-spin-slow" />
                      ) : (
                        <span className="text-[11px] font-mono font-medium">
                          0{index + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vertical Connecting Line Rail */}
                  {!isLast && (
                    <div
                      className={`w-[1.5px] h-8 sm:h-10 my-1 transition-all duration-500 ${
                        isCompleted
                          ? isDark
                            ? "bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            : "bg-zinc-900/40"
                          : isDark
                          ? "bg-white/[0.06]"
                          : "bg-black/[0.06]"
                      }`}
                    />
                  )}
                </div>

                {/* Step Text Block with EncryptedText Decoder */}
                <div
                  className={`flex-1 pt-1.5 pb-3 transition-opacity duration-300 ${
                    isActive
                      ? "opacity-100"
                      : isCompleted
                      ? "opacity-85"
                      : "opacity-35"
                  }`}
                >
                  <h3
                    className={`text-[14.5px] sm:text-[16px] tracking-tight leading-snug transition-colors ${
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
                          ? "text-white/40 font-mono tracking-wider"
                          : "text-zinc-950/40 font-mono tracking-wider"
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
                    className={`text-[11.5px] sm:text-[12px] font-normal mt-0.5 leading-relaxed transition-colors ${
                      isActive
                        ? isDark
                          ? "text-white/60"
                          : "text-zinc-600"
                        : isCompleted
                        ? isDark
                          ? "text-white/40"
                          : "text-zinc-500"
                        : isDark
                        ? "text-white/20"
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
      </div>

      {/* 4. BOTTOM TELEMETRY FOOTER & PROGRESS RAIL */}
      <div className="relative z-10 w-full max-w-xl mx-auto space-y-4">
        {/* Minimalist Liquid Progress Track */}
        <div className="w-full space-y-1.5">
          <div
            className={`w-full h-1 rounded-full overflow-hidden relative ${
              isDark ? "bg-white/[0.06]" : "bg-black/[0.05]"
            }`}
          >
            <motion.div
              className={`h-full rounded-full transition-all duration-300 ${
                isDark
                  ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                  : "bg-zinc-950 shadow-[0_0_8px_rgba(0,0,0,0.3)]"
              }`}
              initial={{ width: "10%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div
            className={`flex justify-between items-center text-[10px] font-mono tracking-wider ${
              isDark ? "text-white/35" : "text-zinc-500"
            }`}
          >
            <span>
              {isIndonesian ? "STATUS KEAMANAN AKTIF" : "SECURITY PROTOCOL ACTIVE"}
            </span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        {/* Floating Trust Badge */}
        <div
          className={`flex items-center justify-center gap-1.5 text-[11px] font-medium pt-1 ${
            isDark ? "text-white/35" : "text-zinc-500"
          }`}
        >
          <ShieldCheck size={13} strokeWidth={1.5} />
          <span>
            {isIndonesian
              ? "Enkripsi Klien Ujung-ke-Ujung · Nir-Pengetahuan"
              : "End-to-End Client Encryption · Zero-Knowledge"}
          </span>
        </div>
      </div>
    </div>
  );
}
