import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { preloadAllIcons } from "../../lib/assetPreloader";

interface InitialSyncScreenProps {
  onComplete?: () => void;
  totalCount?: number;
  isDataReady?: boolean;
  progress?: number;
  statusText?: string;
}

export function InitialSyncScreen({
  onComplete,
  totalCount = 0,
  isDataReady = false,
  progress: externalProgress,
  statusText: externalStatusText,
}: InitialSyncScreenProps) {
  const [internalProgress, setInternalProgress] = useState(25);
  const [internalStatusText, setInternalStatusText] = useState(
    "Menyiapkan brankas & enkripsi lokal...",
  );
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  const displayProgress =
    externalProgress !== undefined ? externalProgress : internalProgress;
  const displayStatus = externalStatusText || internalStatusText;

  useEffect(() => {
    let isMounted = true;

    preloadAllIcons()
      .then(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
        setInternalProgress((prev) => Math.max(prev, 45));
        setInternalStatusText("Menyelaraskan dompet & telemetry...");
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAssetsLoaded(true);
        setInternalProgress((prev) => Math.max(prev, 45));
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
      }, 400);
      return () => clearTimeout(t);
    }
  }, [displayProgress, isAssetsLoaded, isDataReady, onComplete]);

  // Safety fallback: prevents infinite spinning if network drops or offline
  useEffect(() => {
    if (isDataReady) {
      const fallback = setTimeout(() => {
        onComplete?.();
      }, 1500);
      return () => clearTimeout(fallback);
    }
  }, [isDataReady, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none px-6 relative overflow-hidden"
      style={{
        background: "var(--bg-canvas, #08080a)",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* 1. ATMOSPHERIC LIQUID GLASS GLOW ORBS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 -left-28 w-80 h-80 rounded-full bg-white/[0.04] blur-[130px]" />
        <div className="absolute bottom-1/3 -right-28 w-80 h-80 rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.02] blur-[150px]" />
      </div>

      {/* 2. LIQUID GLASS HERO CONTAINER */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[340px] p-6 rounded-[32px] text-center relative z-10 flex flex-col items-center space-y-5"
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
              scale: [1, 1.12, 1],
              opacity: [0.35, 0.65, 0.35],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-16 h-16 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
            }}
          />

          <div
            className="w-13 h-13 rounded-[20px] flex items-center justify-center relative border"
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
              {totalCount.toLocaleString("id-ID")} entri siap
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
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(8, displayProgress))}%`,
                background: "linear-gradient(90deg, rgba(255,255,255,0.7) 0%, #ffffff 100%)",
                boxShadow: "0 0 12px rgba(255, 255, 255, 0.5)",
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-white/40 font-medium px-0.5">
            <span>Inisialisasi</span>
            <span className="font-semibold text-white/70 amount">
              {Math.min(100, Math.round(displayProgress))}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Floating Bottom Pod */}
      <div className="absolute bottom-8 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] text-white/40 border border-white/5 bg-white/[0.02]">
        <ShieldCheck size={12} strokeWidth={1.5} />
        <span>Brankas Terenkripsi Lokal</span>
      </div>
    </div>
  );
}
