// ======================================================================
// TROUVAILLE ESSENTIAL CROSS-PAGE PRODUCT TOUR OVERLAY
// Ultra-luxury Apple Monochrome Glassmorphism
// 5-Step Macro Tour traversing:
// [1] Home (Executive Cockpit) -> [2] Assets (4 Pillars) -> [3] Transactions (Ledger) -> [4] Calendar (Bills) -> [5] Statistics (Diagnostics)
// Strictly compliant with GEMINI.md:
// - Vector Lucide outline icons only (zero native colored emojis)
// - Rule 6: 100% pure localization (zero bilingual mixing)
// - Rule 7: Strictly monochrome luxury palette
// - Dynamic safe area placement (no hardcoded notch collisions)
// ======================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Landmark,
  History,
  Calendar,
  PieChart,
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
  path: string;
  selector: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  icon: typeof Home;
}

const TOUR_STEPS: TourStep[] = [
  {
    path: "/",
    selector: '[data-tour="nav-home"]',
    titleId: "1. Beranda: Pusat Kendali Eksekutif",
    titleEn: "1. Home: Executive Command Center",
    descId:
      "Pusat kendali kekayaan Anda. Pantau modal likuid operasional, estimasi kekayaan bersih, dan ritme pengeluaran bulanan serta pencatatan kilat 1-ketukan.",
    descEn:
      "Your central wealth cockpit. Monitor liquid operating cash, net worth trajectory, monthly spending pacing, and 1-tap quick capture.",
    icon: Home,
  },
  {
    path: "/assets",
    selector: '[data-tour="nav-assets"]',
    titleId: "2. Aset: Neraca 4 Pilar & Portofolio",
    titleEn: "2. Assets: 4-Pillar Balance Sheet",
    descId:
      "Evaluasi struktur aset secara komprehensif: Kas Likuid, Portofolio Investasi, Aset Tetap, dan Liabilitas. Dilengkapi valuasi crypto USDT dengan kurs pasar real-time.",
    descEn:
      "Comprehensive balance sheet architecture: Liquid Cash, Investment Holdings, Fixed Assets, and Liabilities, with live USDT market valuation.",
    icon: Landmark,
  },
  {
    path: "/transactions",
    selector: '[data-tour="nav-transactions"]',
    titleId: "3. Transaksi: Buku Besar Mutasi & Riwayat",
    titleEn: "3. Transactions: Unified Financial Ledger",
    descId:
      "Buku besar mutasi tanpa batas. Telusuri riwayat belanja, filter per kategori atau dompet, dan temukan transaksi seketika dengan pencarian instan.",
    descEn:
      "Infinite cashflow ledger. Browse spending history, filter across categories or accounts, and find transactions instantly with real-time search.",
    icon: History,
  },
  {
    path: "/calendar",
    selector: '[data-tour="nav-calendar"]',
    titleId: "4. Kalender: Jadwal Arus Kas & Tagihan",
    titleEn: "4. Calendar: Cashflow Schedule & Bills",
    descId:
      "Visualisasi kalender arus kas harian dan pengingat tagihan berulang. Antisipasi jatuh tempo komitmen finansial agar likuiditas Anda senantiasa aman terlindungi.",
    descEn:
      "Interactive daily cashflow calendar and recurring bill commitments. Anticipate upcoming obligations so your liquidity runway is always safeguarded.",
    icon: Calendar,
  },
  {
    path: "/statistics",
    selector: '[data-tour="nav-statistics"]',
    titleId: "5. Statistik: Diagnostik & Analitik Finansial",
    titleEn: "5. Statistics: Financial Diagnostics & Analytics",
    descId:
      "Analisis cerdas pola pengeluaran, rasio tabungan, dan diagnostik kesehatan finansial. Dapatkan gambaran objektif untuk mengakselerasi kemandirian finansial Anda.",
    descEn:
      "Intelligent analytics on spending velocity, savings ratios, and wealth health diagnostics to accelerate your financial freedom.",
    icon: PieChart,
  },
];

export function ProductTourOverlay({
  isOpen,
  onClose,
  onComplete,
}: ProductTourOverlayProps) {
  const { isIndonesian } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const step = useMemo(() => TOUR_STEPS[currentStepIndex], [currentStepIndex]);

  // Navigate to step page whenever currentStepIndex updates
  useEffect(() => {
    if (!isOpen || !step) return;
    if (location.pathname !== step.path) {
      navigate(step.path);
    }
  }, [isOpen, currentStepIndex, step, location.pathname, navigate]);

  // Measure target DOM element bounding rectangle
  const measureTarget = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect(r);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      // Allow slight render buffer for route transition
      const timer = setTimeout(() => {
        measureTarget();
      }, 160);
      const handleResize = () => measureTarget();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize, true);
      return () => {
        clearTimeout(timer);
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
    navigate("/");
    if (onComplete) onComplete();
    onClose();
  };

  const handleSkip = () => {
    triggerHaptic("light");
    try {
      localStorage.setItem("trouvaille_tour_completed", "true");
      localStorage.removeItem("trouvaille_tour_pending");
    } catch {}
    navigate("/");
    onClose();
  };

  const IconComp = step.icon;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans"
      style={{ touchAction: "none" }}
    >
      {/* Dimmed Background Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-[4px] transition-opacity"
        onClick={handleSkip}
      />

      {/* Spotlight Cutout Halo around Target Navigation Element */}
      {targetRect && (
        <motion.div
          key={`spotlight-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="absolute pointer-events-none rounded-full"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.76), 0 0 24px rgba(255, 255, 255, 0.35)",
            border: "1.5px solid rgba(255, 255, 255, 0.85)",
          }}
        />
      )}

      {/* Tour Dialogue Card (Fixed cleanly above Bottom Dock) */}
      <div
        className="fixed left-4 right-4 z-50 max-w-sm mx-auto pointer-events-auto"
        style={{
          bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 82px), 94px)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`tour-card-${currentStepIndex}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="p-5 rounded-[26px] overflow-hidden relative"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 24px 60px -12px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)",
              backdropFilter: "blur(32px) saturate(190%)",
              WebkitBackdropFilter: "blur(32px) saturate(190%)",
            }}
          >
            {/* Top Bar: Icon + Step Counter + Close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <IconComp size={15} strokeWidth={2} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {currentStepIndex + 1} / {TOUR_STEPS.length}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSkip}
                className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--glass-border)",
                }}
                aria-label={isIndonesian ? "Lewati Tur" : "Skip Tour"}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>

            {/* Title & Body Description */}
            <h3
              className="text-[15px] font-bold tracking-tight mb-1.5 leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? step.titleId : step.titleEn}
            </h3>

            <p
              className="text-[12px] leading-relaxed font-normal mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {isIndonesian ? step.descId : step.descEn}
            </p>

            {/* Step Progress Indicators & Action Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-[var(--glass-border)]">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: idx === currentStepIndex ? "18px" : "6px",
                      background:
                        idx === currentStepIndex
                          ? "var(--text-primary)"
                          : "var(--glass-border)",
                    }}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)]"
                  >
                    <ChevronLeft size={13} strokeWidth={2} />
                    <span>{isIndonesian ? "Sebelumnya" : "Back"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                  style={{
                    background: "var(--text-primary)",
                    color: "var(--bg-canvas)",
                  }}
                >
                  {currentStepIndex === TOUR_STEPS.length - 1 ? (
                    <>
                      <Check size={13} strokeWidth={2.5} />
                      <span>{isIndonesian ? "Selesai" : "Done"}</span>
                    </>
                  ) : (
                    <>
                      <span>{isIndonesian ? "Lanjut" : "Next"}</span>
                      <ChevronRight size={13} strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
