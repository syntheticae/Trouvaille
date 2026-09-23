import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ShieldCheck } from "lucide-react";
import { preloadAllIcons } from "../../lib/assetPreloader";

interface InitialSyncScreenProps {
  onComplete?: () => void;
  totalCount?: number;
  isDataReady?: boolean;
  progress?: number;
  statusText?: string;
}

const ROTATING_TIPS = [
  "Private & Offline-first: Your data remains encrypted on this device.",
  "Monochrome clarity: Zero distractions, pure financial telemetry.",
  "Fast capture: Record expenses via voice NLP or camera scan in seconds.",
  "Daily streak discipline: Consistent logging transforms wealth clarity.",
];

export function InitialSyncScreen({
  onComplete,
  totalCount = 0,
  isDataReady = false,
  progress: externalProgress,
  statusText: externalStatusText,
}: InitialSyncScreenProps) {
  const [internalProgress, setInternalProgress] = useState(25);
  const [internalStatusText, setInternalStatusText] = useState(
    "Initializing private encryption vault...",
  );
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const displayProgress =
    externalProgress !== undefined ? externalProgress : internalProgress;
  const displayStatus = externalStatusText || internalStatusText;

  // Rotate micro-tips every 2.4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % ROTATING_TIPS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    preloadAllIcons()
      .then(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
        setInternalProgress((prev) => Math.max(prev, 55));
        setInternalStatusText("Calibrating financial telemetry & accounts...");
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
        setInternalProgress((prev) => Math.max(prev, 55));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Standard completion when data is ready and progress reaches 100%
  useEffect(() => {
    if (displayProgress >= 100 && isAssetsLoaded && isDataReady) {
      const t = setTimeout(() => {
        onComplete?.();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [displayProgress, isAssetsLoaded, isDataReady, onComplete]);

  // Safety fallback: prevents infinite spinning if network drops or offline
  useEffect(() => {
    if (isDataReady) {
      const fallback = setTimeout(() => {
        onComplete?.();
      }, 1400);
      return () => clearTimeout(fallback);
    }
  }, [isDataReady, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none px-6 relative overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]"
      style={{
        background: "var(--bg-canvas, #08080a)",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* 1. ATMOSPHERIC CINEMATIC MONOCHROME AURORA BLOOM */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 -left-32 w-88 h-88 rounded-full bg-white/[0.04] blur-[140px]" />
        <div className="absolute bottom-1/3 -right-32 w-88 h-88 rounded-full bg-white/[0.035] blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-white/[0.02] blur-[160px]" />

        {/* Fluted glass radial lines */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* 2. LIQUID GLASS HERO CONTAINER */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[340px] p-6.5 rounded-[32px] text-center relative z-10 flex flex-col items-center space-y-5"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
        }}
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
              background:
                "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
            }}
          />

          <div
            className="w-14 h-14 rounded-[22px] flex items-center justify-center relative border"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              borderColor: "rgba(255, 255, 255, 0.18)",
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.25)",
            }}
          >
            {displayProgress >= 100 ? (
              <Check size={22} strokeWidth={2} className="text-white" />
            ) : (
              <Sparkles size={20} strokeWidth={1.75} className="text-white/80" />
            )}
          </div>
        </div>

        {/* Text & Status */}
        <div className="space-y-1 w-full">
          <h2 className="text-[17px] font-semibold text-white tracking-tight leading-snug">
            Trouvaille
          </h2>
          <p className="text-[12px] text-white/60 font-medium line-clamp-1 h-5">
            {displayStatus}
          </p>
          {totalCount > 0 && (
            <p className="text-[10px] font-semibold text-white/40 amount mt-0.5">
              {totalCount.toLocaleString()} records synchronized
            </p>
          )}
        </div>

        {/* Liquid Glass Progress Bar */}
        <div className="w-full space-y-2 pt-1">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden relative p-[0.5px]"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <motion.div
              className="h-full rounded-full bg-white relative"
              initial={{ width: "15%" }}
              animate={{ width: `${Math.min(100, Math.max(10, displayProgress))}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{
                boxShadow: "0 0 12px rgba(255, 255, 255, 0.6)",
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-medium text-white/40 px-0.5">
            <span>Security Verified</span>
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
              className="text-[10.5px] font-normal text-white/45 text-center leading-tight line-clamp-2"
            >
              {ROTATING_TIPS[tipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Floating Trust Badge */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] flex items-center gap-1.5 text-[11px] font-medium text-white/35">
        <ShieldCheck size={12} strokeWidth={1.5} />
        <span>End-to-End Client Encryption</span>
      </div>
    </div>
  );
}
