// ======================================================================
// TROUVAILLE ESSENTIAL CROSS-PAGE PRODUCT TOUR OVERLAY
// Ultra-luxury Apple Monochrome Glassmorphism
// 6-Step Macro Tour traversing:
// [1] Home (Executive Cockpit) -> [2] Quick Add (Voice & Scan) -> [3] Assets (4 Pillars) -> [4] Transactions (Ledger) -> [5] Calendar (Bills) -> [6] Statistics (Diagnostics)
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
  PlusCircle,
  Landmark,
  History,
  Calendar,
  PieChart,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Eye,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";

export interface ProductTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface TourStep {
  id: string;
  path: string;
  selector: string;
  badgeId: string;
  badgeEn: string;
  titleId: string;
  titleEn: string;
  descId: string;
  descEn: string;
  icon: typeof Home;
  highlightsId: string[];
  highlightsEn: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "home",
    path: "/",
    selector: '[data-tour="nav-home"]',
    badgeId: "KOKPIT UTAMA",
    badgeEn: "EXECUTIVE COCKPIT",
    titleId: "1. Beranda: Kendali Likuiditas & Aset",
    titleEn: "1. Home: Liquidity & Wealth Pacing",
    descId:
      "Pantau posisi keuangan secara komprehensif. Lacak modal kas likuid, estimasi kekayaan bersih, dan ritme pengeluaran bulanan dalam satu dasbor eksekutif.",
    descEn:
      "Comprehensive wealth overview. Monitor liquid operating cash, net worth trajectory, and monthly spending pacing in a unified executive cockpit.",
    icon: Home,
    highlightsId: [
      "Modal Likuid Operasional",
      "Plafon Belanja Aman",
      "Ruang Kas Bersama (Spaces)",
    ],
    highlightsEn: [
      "Liquid Operating Capital",
      "Safe Spending Velocity",
      "Shared Money Spaces",
    ],
  },
  {
    id: "quick-add",
    path: "/",
    selector: '[data-tour="quick-add"]',
    badgeId: "1-KETUKAN",
    badgeEn: "INSTANT CAPTURE",
    titleId: "2. Tambah Cepat: Suara Cerdas & Kamera",
    titleEn: "2. Quick Add: Smart Voice & Receipt Scan",
    descId:
      "Catat mutasi dalam hitungan detik. Gunakan Liquid Keypad dengan evaluasi matematika instan, dikte suara natural bebas format, atau pindai struk belanja otomatis.",
    descEn:
      "Capture transactions effortlessly within seconds. Use the arithmetic Liquid Keypad, natural voice logging, or automated camera receipt scanning.",
    icon: PlusCircle,
    highlightsId: [
      "Keypad Hitung Cepat (Matematika)",
      "Pencatatan Suara Natural (AI Voice)",
      "Pemindai Struk & Bukti Transfer",
    ],
    highlightsEn: [
      "Arithmetic Liquid Keypad",
      "Natural Voice Logging (AI Voice)",
      "Receipt & Slip Camera Scan",
    ],
  },
  {
    id: "assets",
    path: "/assets",
    selector: '[data-tour="nav-assets"]',
    badgeId: "NERACA 4 PILAR",
    badgeEn: "4-PILLAR CAPITAL",
    titleId: "3. Aset: Struktur Modal & Valuasi USDT",
    titleEn: "3. Assets: Capital Solvency & USDT",
    descId:
      "Evaluasi neraca 4 pilar: Kas Likuid (Tier 1), Portofolio Investasi (Tier 2), Aset Riil Fisik (Tier 3), dan Liabilitas Utang. Terintegrasi kurs live USDT dan rekonsiliasi mutasi.",
    descEn:
      "Comprehensive 4-pillar balance sheet: Liquid Cash (Tier 1), Investment Holdings (Tier 2), Real Tangibles (Tier 3), and Liabilities with live USDT pricing.",
    icon: Landmark,
    highlightsId: [
      "Valuasi Kripto USDT & Emas Live",
      "Solvabilitas 100% Bebas Utang",
      "Sinkronisasi Mutasi Otomatis",
    ],
    highlightsEn: [
      "Live USDT & Gold Valuation",
      "100% Debt-Free Solvency Score",
      "Auto-Reconciliation Engine",
    ],
  },
  {
    id: "transactions",
    path: "/transactions",
    selector: '[data-tour="nav-transactions"]',
    badgeId: "BUKU BESAR",
    badgeEn: "FINANCIAL LEDGER",
    titleId: "4. Transaksi: Mutasi & Impor Rekening",
    titleEn: "4. Transactions: Ledger & Statement Import",
    descId:
      "Audit mutasi keuangan tak terbatas. Telusuri riwayat belanja dengan multi-filter kategori dan rekening, serta impor mutasi rekening koran BCA, Mandiri, Seabank via Excel/CSV/PDF.",
    descEn:
      "Infinite cashflow audit trail. Filter spending across categories or accounts, and import bank statements seamlessly via Excel, CSV, or PDF.",
    icon: History,
    highlightsId: [
      "Pencarian Instan & Multi-Filter",
      "Impor Rekening Koran Bank",
      "Kategori Kustom & Ikon Vektor",
    ],
    highlightsEn: [
      "Instant Search & Multi-Filters",
      "Bank Statement Importer (Excel/PDF)",
      "Custom Categories & Vector Icons",
    ],
  },
  {
    id: "calendar",
    path: "/calendar",
    selector: '[data-tour="calendar-header"]',
    badgeId: "JADWAL KOMITMEN",
    badgeEn: "CASHFLOW CALENDAR",
    titleId: "5. Kalender: Arus Kas Harian & Tagihan",
    titleEn: "5. Calendar: Cashflow Schedule & Bills",
    descId:
      "Peta komitmen harian dan tagihan rutin berulang. Antisipasi tanggal jatuh tempo komitmen finansial agar cadangan likuiditas bulanan Anda senantiasa aman terkendali.",
    descEn:
      "Daily cashflow runway map and recurring bill commitments. Anticipate upcoming due dates so your liquidity reserves remain safeguarded.",
    icon: Calendar,
    highlightsId: [
      "Kalender Arus Kas Harian",
      "Pengingat Tagihan Berulang",
      "Proyeksi Likuiditas Runway",
    ],
    highlightsEn: [
      "Daily Cashflow Matrix",
      "Recurring Bill Reminders",
      "Liquidity Runway Forecasting",
    ],
  },
  {
    id: "statistics",
    path: "/statistics",
    selector: '[data-tour="nav-statistics"]',
    badgeId: "DIAGNOSTIK EKSEKUTIF",
    badgeEn: "EXECUTIVE DIAGNOSTICS",
    titleId: "6. Statistik: Analitik & Laporan Resmi",
    titleEn: "6. Statistics: Diagnostics & GAAP Reports",
    descId:
      "Diagnostik mendalam rasio tabungan, velocity pengeluaran, burn rate, kilas balik tahunan (Wrapped), serta ekspor laporan Neraca Keuangan resmi format Excel dan PDF.",
    descEn:
      "Deep diagnostics of savings velocity, burn rate, cashflow trajectory, annual Wrapped review, and official Balance Sheet export to Excel and PDF.",
    icon: PieChart,
    highlightsId: [
      "Velocity Pengeluaran & Burn Rate",
      "Ekspor Neraca Resmi (PDF/Excel)",
      "Kilas Balik Finansial (Wrapped)",
    ],
    highlightsEn: [
      "Spending Velocity & Burn Rate",
      "Official Report Export (Excel/PDF)",
      "Annual Financial Wrapped Review",
    ],
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
  const [isPeekMode, setIsPeekMode] = useState(false);
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
      setIsPeekMode(false);
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
      setIsPeekMode(false);
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
  const highlights = isIndonesian ? step.highlightsId : step.highlightsEn;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans pointer-events-auto"
      style={{ touchAction: isPeekMode ? "auto" : "none" }}
    >
      {/* ── 1. Soft Ambient Scrim (Not pitch black, not blurry, page is crisp & clearly visible) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isPeekMode ? 0.05 : 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: isPeekMode
            ? "transparent"
            : "rgba(0, 0, 0, 0.35)",
          backdropFilter: isPeekMode ? "none" : "blur(1px)",
          WebkitBackdropFilter: isPeekMode ? "none" : "blur(1px)",
        }}
        onClick={() => {
          if (isPeekMode) {
            setIsPeekMode(false);
          } else {
            handleSkip();
          }
        }}
      />

      {/* ── 2. Animated Glowing Spotlight Halo around Target Navigation Element ── */}
      {targetRect && !isPeekMode && (
        <motion.div
          key={`spotlight-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 26, stiffness: 360 }}
          className="absolute pointer-events-none rounded-full"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow:
              "0 0 0 9999px rgba(0, 0, 0, 0.38), 0 0 24px 2px rgba(255, 255, 255, 0.45)",
            border: "1.75px solid rgba(255, 255, 255, 0.92)",
          }}
        />
      )}

      {/* ── 3. Minimized Peek Mode Capsule (Allows user to inspect page and re-open guide) ── */}
      {isPeekMode && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            setIsPeekMode(false);
          }}
          className="fixed left-4 right-4 z-[100000] max-w-xs mx-auto py-3 px-4 rounded-2xl glass-surface border border-[var(--glass-border)] flex items-center justify-between shadow-2xl active:scale-95 transition-transform cursor-pointer"
          style={{
            bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 84px), 96px)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
        >
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-[var(--text-primary)]" />
            <span className="text-[12px] font-semibold">
              {isIndonesian ? "Lanjutkan Panduan Tur" : "Resume Product Tour"}
            </span>
          </div>
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
            {currentStepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </motion.button>
      )}

      {/* ── 4. Main Tour Dialogue Card (Fixed cleanly above Bottom Dock) ── */}
      {!isPeekMode && (
        <div
          className="fixed left-4 right-4 z-50 max-w-sm mx-auto pointer-events-auto"
          style={{
            bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 82px), 94px)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`tour-card-${currentStepIndex}`}
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 360 }}
              className="p-5 rounded-[26px] overflow-hidden relative"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow:
                  "0 24px 60px -12px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)",
                backdropFilter: "blur(32px) saturate(190%)",
                WebkitBackdropFilter: "blur(32px) saturate(190%)",
              }}
            >
              {/* Top Bar: Icon + Step Counter + Category Badge + Peek Button + Close */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {currentStepIndex + 1} / {TOUR_STEPS.length}
                    </span>
                    <span
                      className="text-[9.5px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full truncate opacity-80"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {isIndonesian ? step.badgeId : step.badgeEn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Peek / Preview Page Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setIsPeekMode(true);
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--glass-border)",
                    }}
                    title={
                      isIndonesian
                        ? "Lihat Tampilan Halaman"
                        : "Peek Screen View"
                    }
                    aria-label="Peek Screen View"
                  >
                    <Eye size={12} strokeWidth={2} />
                  </button>

                  {/* Close / Skip */}
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      color: "var(--text-tertiary)",
                      border: "1px solid var(--glass-border)",
                    }}
                    title={isIndonesian ? "Lewati Tur" : "Skip Tour"}
                    aria-label="Skip Tour"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Title & Body Description */}
              <h3
                className="text-[15px] font-bold tracking-tight mb-1.5 leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? step.titleId : step.titleEn}
              </h3>

              <p
                className="text-[12px] leading-relaxed font-normal mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                {isIndonesian ? step.descId : step.descEn}
              </p>

              {/* ── 3 Rich Power Highlights (Interactive Detail Pills) ── */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {highlights.map((highlight, hIdx) => (
                  <div
                    key={hIdx}
                    className="px-2.5 py-1 rounded-xl text-[10.5px] font-medium flex items-center gap-1.5 select-none"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Sparkles
                      size={10.5}
                      strokeWidth={2}
                      className="text-[var(--text-secondary)] shrink-0"
                    />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              {/* Step Progress Indicators & Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
                {/* Clickable Dots to Jump Directly */}
                <div className="flex items-center gap-1.5">
                  {TOUR_STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setCurrentStepIndex(idx);
                      }}
                      className="h-1.5 rounded-full transition-all duration-300 cursor-pointer p-0 border-0"
                      style={{
                        width: idx === currentStepIndex ? "18px" : "6px",
                        background:
                          idx === currentStepIndex
                            ? "var(--text-primary)"
                            : "var(--glass-border)",
                      }}
                      aria-label={`Step ${idx + 1}`}
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
                      color: "var(--bg-base)",
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
      )}
    </div>
  );
}
