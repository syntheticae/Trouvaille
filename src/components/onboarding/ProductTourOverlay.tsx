// ======================================================================
// TROUVAILLE INTERACTIVE FEATURE & PRODUCT TOUR OVERLAY
// Ultra-luxury Apple Monochrome Glassmorphism
// 5-Step Dynamic Spotlight Highlighting Real UI Elements
// Strictly compliant with GEMINI.md:
// - Vector Lucide outline icons only (zero native colored emojis)
// - Rule 6: 100% pure localization (zero bilingual mixing)
// - Rule 7: Strictly monochrome luxury palette
// - Dynamic safe area placement (no hardcoded notch collisions)
// ======================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  PieChart,
  Plus,
  Landmark,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";

export interface ProductTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface TourStep {
  selector: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  icon: typeof Users;
  preferredPlacement?: "top" | "bottom";
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="space-capsule"]',
    titleId: "Space Finansial & Kolaborasi",
    titleEn: "Financial Spaces & Ledgers",
    descId:
      "Kelola keuangan pribadi, bisnis, hingga space bersama keluarga dalam satu wadah mandiri. Ketuk untuk beralih space kapan saja.",
    descEn:
      "Isolate personal cashflow, business finances, and collaborative shared spaces. Tap to switch spaces anytime.",
    icon: Users,
    preferredPlacement: "bottom",
  },
  {
    selector: '[data-tour="net-worth"]',
    titleId: "Nilai Bersih & Posisi Kas",
    titleEn: "Net Worth & Cash Position",
    descId:
      "Pantau akumulasi modal likuid, kekayaan bersih, dan indikator pertumbuhan aset keuangan Anda secara terpadu.",
    descEn:
      "Monitor total liquid capital, net wealth, and your financial growth indicators in real-time.",
    icon: TrendingUp,
    preferredPlacement: "bottom",
  },
  {
    selector: '[data-tour="quick-cashflow"]',
    titleId: "Arus Kas & Analisis Bulanan",
    titleEn: "Cashflow & Monthly Analytics",
    descId:
      "Lacak perbandingan pemasukan, pengeluaran, dan ritme pengeluaran bulanan agar rencana finansial Anda tetap tepat sasaran.",
    descEn:
      "Track income vs. expense velocity and pacing to keep your budget on target throughout the month.",
    icon: PieChart,
    preferredPlacement: "top",
  },
  {
    selector: '[data-tour="quick-add"]',
    titleId: "Pencatatan Kilat 1-Ketukan",
    titleEn: "1-Tap Quick Capture",
    descId:
      "Catat transaksi dalam detik. Ketuk untuk pencatatan cepat, atau tahan dan geser untuk asisten suara atau pindai struk.",
    descEn:
      "Log transactions in seconds. Tap for rapid manual entry, or hold and glide for voice dictation or receipt scanning.",
    icon: Plus,
    preferredPlacement: "top",
  },
  {
    selector: '[data-tour="nav-assets"]',
    titleId: "4 Pilar Neraca Keuangan",
    titleEn: "4 Balance Sheet Pillars",
    descId:
      "Akses tab Aset untuk evaluasi portofolio investasi, crypto USDT dengan kurs langsung, aset tetap, dan liabilitas.",
    descEn:
      "Open the Assets tab to evaluate investment holdings, USDT with live market rates, fixed assets, and liabilities.",
    icon: Landmark,
    preferredPlacement: "top",
  },
];

export function ProductTourOverlay({
  isOpen,
  onClose,
  onComplete,
}: ProductTourOverlayProps) {
  const { isIndonesian } = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const step = useMemo(() => TOUR_STEPS[currentStepIndex], [currentStepIndex]);

  // Measure target DOM element bounding rectangle
  const measureTarget = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      // Scroll into view gently if outside viewport
      const r = el.getBoundingClientRect();
      const inView =
        r.top >= 50 &&
        r.bottom <= window.innerHeight - 80 &&
        r.left >= 0 &&
        r.right <= window.innerWidth;

      if (!inView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          const freshRect = el.getBoundingClientRect();
          setTargetRect(freshRect);
        }, 300);
      } else {
        setTargetRect(r);
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      measureTarget();
      const handleResize = () => measureTarget();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize, true);
      };
    } else {
      setCurrentStepIndex(0);
      setTargetRect(null);
    }
  }, [isOpen, currentStepIndex, measureTarget]);

  if (!isOpen) return null;

  const handleNext = () => {
    triggerHaptic("medium");
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    triggerHaptic("light");
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    triggerSuccessHaptic();
    try {
      localStorage.setItem("trouvaille_tour_completed", "true");
      localStorage.removeItem("trouvaille_tour_pending");
    } catch {}
    if (onComplete) onComplete();
    onClose();
  };

  const handleSkip = () => {
    triggerHaptic("light");
    try {
      localStorage.setItem("trouvaille_tour_completed", "true");
      localStorage.removeItem("trouvaille_tour_pending");
    } catch {}
    onClose();
  };

  const IconComp = step.icon;

  // Tooltip positioning computation
  const tooltipStyle = (() => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "340px",
        width: "calc(100vw - 32px)",
      };
    }

    const pad = 12;
    const tooltipWidth = Math.min(340, window.innerWidth - 32);
    let top = 0;

    if (step.preferredPlacement === "top") {
      top = Math.max(70, targetRect.top - 200);
      if (top < 70) {
        top = Math.min(window.innerHeight - 240, targetRect.bottom + pad);
      }
    } else {
      top = Math.min(window.innerHeight - 240, targetRect.bottom + pad);
      if (top > window.innerHeight - 220) {
        top = Math.max(70, targetRect.top - 200);
      }
    }

    return {
      top: `${top}px`,
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: `${tooltipWidth}px`,
      width: "calc(100vw - 32px)",
    };
  })();

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{ touchAction: "none" }}
    >
      {/* Dimmed Background Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 transition-opacity"
        onClick={handleSkip}
      />

      {/* Spotlight Cutout Halo around Target Element */}
      {targetRect && (
        <motion.div
          layoutId="tour-spotlight-cutout"
          transition={{ type: "spring", stiffness: 350, damping: 32 }}
          className="absolute pointer-events-none rounded-3xl"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow:
              "0 0 0 9999px rgba(0, 0, 0, 0.72), 0 0 24px rgba(255, 255, 255, 0.2)",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
          }}
        />
      )}

      {/* Floating Skip Capsule (Safe Area Dynamically Placed) */}
      <div
        className="absolute right-4 z-10"
        style={{
          top: "max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)",
        }}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="py-1.5 px-3.5 rounded-full border border-[var(--glass-border)] bg-[var(--bg-elevated)]/90 backdrop-blur-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
        >
          <span>{isIndonesian ? "Lewati Panduan" : "Skip Tour"}</span>
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Floating Apple Luxury Step Card */}
      <div className="absolute z-20 pointer-events-auto" style={tooltipStyle}>
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="p-5 rounded-3xl border shadow-2xl space-y-4 backdrop-blur-2xl"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* Header Row: Icon + Step Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--glass-fill)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                <IconComp size={15} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[var(--text-tertiary)] uppercase">
                {isIndonesian ? "LANGKAH" : "STEP"} {currentStepIndex + 1} /{" "}
                {TOUR_STEPS.length}
              </span>
            </div>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? "w-4 bg-[var(--text-primary)]"
                      : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Title & Body */}
          <div className="space-y-1.5">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
              {isIndonesian ? step.titleId : step.titleEn}
            </h3>
            <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
              {isIndonesian ? step.descId : step.descEn}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 gap-2">
            {currentStepIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="py-2.5 px-3.5 rounded-2xl text-[12px] font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={13} strokeWidth={2} />
                <span>{isIndonesian ? "Kembali" : "Back"}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="py-2.5 px-4 rounded-2xl text-[12px] font-semibold bg-[var(--text-primary)] text-[var(--bg-canvas)] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md ml-auto"
            >
              <span>
                {currentStepIndex === TOUR_STEPS.length - 1
                  ? isIndonesian
                    ? "Mulai Menjelajah"
                    : "Get Started"
                  : isIndonesian
                    ? "Lanjut"
                    : "Next"}
              </span>
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <Check size={13} strokeWidth={2.5} />
              ) : (
                <ChevronRight size={13} strokeWidth={2} />
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
