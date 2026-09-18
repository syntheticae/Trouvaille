import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  X,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Share2,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Activity,
} from "lucide-react";
import type { Transaction, Category } from "../../lib/types";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { format, parseISO, getDay } from "date-fns";
import { resolveTransactionCategory } from "../../lib/categoryResolver";
import {
  buildCascadeCategories,
  buildSpendingHeatmap,
  buildRunwayProjection,
} from "../../lib/wrappedAnalytics";

interface TopCategoryStat {
  total: number;
  count: number;
  name: string;
  emoji?: string;
}

interface FinancialWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  mode: "month" | "year";
  targetDate?: Date;
}

export function FinancialWrappedModal({
  isOpen,
  onClose,
  transactions,
  categories,
  mode,
  targetDate = new Date(),
}: FinancialWrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const totalSlides = 9;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute period boundaries
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1;
  const monthKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const yearKey = String(targetYear);

  const periodTitle =
    mode === "month" ? format(targetDate, "MMMM yyyy") : `Year ${targetYear}`;

  const periodTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.occurred_on) return false;
      if (mode === "month") {
        return t.occurred_on.startsWith(monthKey);
      }
      return t.occurred_on.startsWith(yearKey);
    });
  }, [transactions, mode, monthKey, yearKey]);

  // Aggregates & Insights
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap = new Map<
      string,
      { total: number; count: number; name: string; emoji?: string }
    >();
    const dailySpendMap = new Map<string, number>();
    const dailyIncomeMap = new Map<string, number>();
    const weekdaySpend = [0, 0, 0, 0, 0, 0, 0]; // Sun=0, Mon=1, ..., Sat=6

    const catLookup = new Map<string, Category>();
    categories.forEach((c) => catLookup.set(c.id, c));

    let maxSingleExpense = 0;
    let maxExpenseNote = "";
    let maxExpenseDate = "";

    // Track essential spending (Food, Transport, Bills, Utilities, Health, Education)
    let essentialSpend = 0;

    periodTxs.forEach((t) => {
      const amt = Number(t.amount || 0);
      const isCorrection =
        t.note?.includes("[Correction]") ||
        t.note?.includes("Saldo Awal") ||
        t.note?.includes("Opening Balance");

      if (isCorrection) return;

      const d = t.occurred_on.slice(0, 10);

      if (t.type === "income") {
        totalIncome += amt;
        dailyIncomeMap.set(d, (dailyIncomeMap.get(d) || 0) + amt);
      } else if (t.type === "expense") {
        totalExpense += amt;
        dailySpendMap.set(d, (dailySpendMap.get(d) || 0) + amt);

        if (amt > maxSingleExpense) {
          maxSingleExpense = amt;
          maxExpenseNote = t.note || "Expense";
          maxExpenseDate = d;
        }

        const resolvedCat = resolveTransactionCategory(t, categories);
        const catName = resolvedCat.name;
        const existing = catMap.get(catName) || {
          total: 0,
          count: 0,
          name: catName,
          emoji: resolvedCat.emoji,
        };
        existing.total += amt;
        existing.count += 1;
        catMap.set(catName, existing);

        // Check essential categories
        const lowerName = catName.toLowerCase();
        if (
          lowerName.includes("makan") ||
          lowerName.includes("food") ||
          lowerName.includes("belanja") ||
          lowerName.includes("transport") ||
          lowerName.includes("tagihan") ||
          lowerName.includes("bill") ||
          lowerName.includes("listrik") ||
          lowerName.includes("sewa") ||
          lowerName.includes("kesehatan") ||
          lowerName.includes("edukasi") ||
          lowerName.includes("pendidikan")
        ) {
          essentialSpend += amt;
        }

        try {
          const wDay = getDay(parseISO(d));
          weekdaySpend[wDay] += amt;
        } catch {
          // ignore date parse error
        }
      }
    });

    const netCashflow = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0
        ? Math.max(
            0,
            Math.round(((totalIncome - totalExpense) / totalIncome) * 100),
          )
        : 0;

    // Top Categories Sorted
    const sortedCats = Array.from(catMap.values()).sort(
      (a, b) => b.total - a.total,
    );
    const topCat: TopCategoryStat | null = sortedCats[0] || null;
    const top4Cats = sortedCats.slice(0, 4);

    // Peak Spending Day
    let peakDate: string | null = null;
    let peakAmount = 0;
    const spendEntries = Array.from(dailySpendMap.entries());
    for (let i = 0; i < spendEntries.length; i++) {
      const [d, amt] = spendEntries[i];
      if (amt > peakAmount) {
        peakAmount = amt;
        peakDate = d;
      }
    }

    const spendValues = spendEntries.map((e) => e[1]);
    const avgDaily =
      spendValues.length > 0 ? totalExpense / spendValues.length : 0;

    // Weekend vs Weekday Spend Ratio
    const weekendSpend = weekdaySpend[0] + weekdaySpend[6];
    const weekendPct =
      totalExpense > 0 ? Math.round((weekendSpend / totalExpense) * 100) : 0;

    // Essential Needs Ratio
    const essentialPct =
      totalExpense > 0 ? Math.min(100, Math.round((essentialSpend / totalExpense) * 100)) : 50;

    // Budget Discipline Score (based on savings rate and consistency)
    const disciplineScore = Math.min(
      98,
      Math.max(45, Math.round(50 + (savingsRate * 0.4) + (essentialPct * 0.1))),
    );

    // Max weekday volume for step bars
    const maxWeekdaySpend = Math.max(...weekdaySpend, 1);

    // Generate normalized curve points for Waves Chart (Image 1 style)
    // Create 10 timeline sample buckets across the period
    const curvePointsCount = 10;
    const sortedDailySpend = Array.from(dailySpendMap.entries()).sort(
      (a, b) => a[0].localeCompare(b[0]),
    );
    const maxDayVal = Math.max(
      ...Array.from(dailySpendMap.values()),
      ...Array.from(dailyIncomeMap.values()),
      1,
    );

    const wavePoints: {
      x: number;
      inflowY: number;
      outflowY: number;
      dateLabel: string;
      isPeak: boolean;
    }[] = [];

    const bucketSize = Math.max(1, Math.floor(sortedDailySpend.length / curvePointsCount));
    for (let b = 0; b < curvePointsCount; b++) {
      const slice = sortedDailySpend.slice(b * bucketSize, (b + 1) * bucketSize);
      const sumOutflow = slice.reduce((acc, curr) => acc + curr[1], 0);
      const avgOutflow = slice.length > 0 ? sumOutflow / slice.length : 0;

      // Approximate inflow distribution
      const approxInflow = (totalIncome / curvePointsCount) * (0.6 + 0.8 * Math.sin(b * 0.7));

      const normOutflowY = Math.min(75, Math.max(15, 80 - (avgOutflow / maxDayVal) * 65));
      const normInflowY = Math.min(75, Math.max(12, 80 - (approxInflow / maxDayVal) * 60));

      const hasPeak = slice.some((item) => item[0] === peakDate);

      wavePoints.push({
        x: (b / (curvePointsCount - 1)) * 300,
        inflowY: normInflowY,
        outflowY: normOutflowY,
        dateLabel: slice[0]?.[0]?.slice(5) || `Day ${b * 3 + 1}`,
        isPeak: hasPeak || b === 6,
      });
    }

    // Financial Archetype (English, thoughtful, non-cliché)
    let persona = "The Balanced Achiever";
    let personaTag = "OPTIMAL CAPITAL EQUILIBRIUM";
    let personaDesc =
      "You sustain an enjoyable lifestyle with measured discipline, consistently maintaining a positive capital cushion for future expansion.";
    let volatilityLabel = "STABLE";
    let efficiencyGrade = "A-";

    if (savingsRate >= 35 && totalExpense > 0) {
      persona = "The Capital Architect";
      personaTag = "FORTRESS-TIER CAPITAL RETENTION";
      personaDesc =
        "Your retention rate exceeds 35%. Wealth accumulation operates under rigorous financial discipline and strategic multi-asset balance.";
      volatilityLabel = "LOW";
      efficiencyGrade = "A+";
    } else if (totalExpense > totalIncome * 1.15 && totalIncome > 0) {
      persona = "The Dynamic Allocator";
      personaTag = "EXPANSION & REINVESTMENT CYCLE";
      personaDesc =
        "An active capital deployment phase with elevated outflow. Cash velocity is high, laying ground for subsequent wealth cycles.";
      volatilityLabel = "DYNAMIC";
      efficiencyGrade = "B";
    } else if (totalExpense === 0 && totalIncome > 0) {
      persona = "The Pure Accumulator";
      personaTag = "MAXIMUM ABSORPTION";
      personaDesc =
        "Complete inflow retention with zero expenditure recorded across this reporting timeframe.";
      volatilityLabel = "MINIMAL";
      efficiencyGrade = "A+";
    } else if (savingsRate >= 15) {
      persona = "The Steady Builder";
      personaTag = "CONSISTENT COMPOUNDING";
      personaDesc =
        "Well-controlled cashflow with predictable monthly margins and dependable surplus stability.";
      volatilityLabel = "STABLE";
      efficiencyGrade = "A";
    }

    // Stacked Cascade Categories (User reference image style)
    const cascadeCategories = buildCascadeCategories(sortedCats, totalExpense, 5);

    // Spending Heatmap (bklit heatmap matrix)
    let heatmapMonth = targetMonth;
    if (mode === "year") {
      const monthSums = new Array(12).fill(0);
      periodTxs.forEach((t) => {
        if (t.type === "expense" && t.occurred_on) {
          const m = parseInt(t.occurred_on.slice(5, 7), 10);
          if (m >= 1 && m <= 12) monthSums[m - 1] += Number(t.amount || 0);
        }
      });
      const maxMIndex = monthSums.indexOf(Math.max(...monthSums));
      heatmapMonth = maxMIndex >= 0 && monthSums[maxMIndex] > 0 ? maxMIndex + 1 : targetMonth;
    }
    const heatmap = buildSpendingHeatmap(periodTxs, targetYear, heatmapMonth);

    // Multi-horizon Runway Projection (bklit projection curve)
    const runway = buildRunwayProjection(totalIncome, totalExpense);

    return {
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      turnover: totalIncome + totalExpense,
      txCount: periodTxs.length,
      topCat,
      top4Cats,
      topCatPct:
        totalExpense > 0 && topCat
          ? Math.round((topCat.total / totalExpense) * 100)
          : 0,
      peakDate,
      peakAmount,
      avgDaily,
      weekdaySpend,
      maxWeekdaySpend,
      maxSingleExpense,
      maxExpenseNote,
      maxExpenseDate,
      weekendPct,
      essentialPct,
      disciplineScore,
      wavePoints,
      persona,
      personaTag,
      personaDesc,
      volatilityLabel,
      efficiencyGrade,
      cascadeCategories,
      heatmap,
      heatmapMonth,
      runway,
    };
  }, [periodTxs, categories, targetYear, targetMonth, mode]);

  const handleNext = useCallback(() => {
    triggerHaptic("light");
    setDirection(1);
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      onClose();
    }
  }, [currentSlide, totalSlides, onClose]);

  const handlePrev = useCallback(() => {
    triggerHaptic("light");
    setDirection(-1);
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide]);

  // Auto-advance timer (5.5s per slide)
  useEffect(() => {
    if (!isOpen || isPaused) return;

    timerRef.current = setTimeout(() => {
      if (currentSlide < totalSlides - 1) {
        setDirection(1);
        setCurrentSlide((s) => s + 1);
      }
    }, 5500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, currentSlide, isPaused, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset slide on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setDirection(1);
      setIsCopied(false);
    }
  }, [isOpen]);

  const handleShare = () => {
    triggerHaptic("medium");
    const summaryText = `FINANCIAL WRAPPED · ${periodTitle.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Executive Persona : ${stats.persona}
Total Turnover    : ${formatRupiah(stats.turnover)} (${stats.txCount} txs)
Capital Inflow    : +${formatRupiah(stats.totalIncome)}
Capital Outflow   : -${formatRupiah(stats.totalExpense)}
Net Surplus       : ${stats.netCashflow >= 0 ? "+" : ""}${formatRupiah(stats.netCashflow)} (${stats.savingsRate}% Retained)
Dominant Category : ${stats.topCat ? `${stats.topCat.name} (${stats.topCatPct}%)` : "N/A"}
Peak Spend Day    : ${stats.peakDate ? `${stats.peakDate} (${formatRupiah(stats.peakAmount)})` : "N/A"}
Runway Horizon    : +${formatRupiah(stats.runway.terminalProjectedSurplus)} (in 6 Months)
Capital Benchmark : Retention Tier ${stats.efficiencyGrade} · Discipline ${stats.disciplineScore}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Trouvaille Private Financial`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Compute smooth SVG path string from wave points
  const outflowPath = stats.wavePoints.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.outflowY}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.outflowY}, ${cx} ${pt.outflowY}, ${pt.x} ${pt.outflowY}`;
  }, "");

  const inflowPath = stats.wavePoints.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.inflowY}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.inflowY}, ${cx} ${pt.inflowY}, ${pt.x} ${pt.inflowY}`;
  }, "");

  const peakPoint = stats.wavePoints.find((p) => p.isPeak) || stats.wavePoints[6];

  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.8 },
        opacity: { duration: 0.28, ease: "easeOut" },
        scale: { duration: 0.28, ease: "easeOut" },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.8 },
        opacity: { duration: 0.2, ease: "easeIn" },
        scale: { duration: 0.2, ease: "easeIn" },
      },
    }),
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-[999] bg-[#0A0A0D] text-white flex flex-col justify-between overflow-hidden select-none"
          style={{ fontFamily: "'Urbanist', sans-serif" }}
        >
        {/* ============================================================ */}
        {/* 1. APPLE FRACTAL GLASS & MONOCHROME GRADIENT MESH BACKDROP */}
        {/* ============================================================ */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Radial Mesh Layers (Silver / Cool White / Deep Slate) */}
          <div className="absolute -top-36 -left-36 w-[480px] h-[480px] rounded-full bg-white/[0.045] blur-[130px]" />
          <div className="absolute top-1/4 -right-36 w-[420px] h-[420px] rounded-full bg-zinc-400/[0.035] blur-[140px]" />
          <div className="absolute -bottom-36 left-1/4 w-[500px] h-[500px] rounded-full bg-white/[0.04] blur-[150px]" />

          {/* Fluted Fractal Glass Slats (Vertical Light Refraction Texture) */}
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 34px)",
            }}
          />

          {/* Subtle Ambient Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, rgba(10,10,13,0.85) 100%)",
            }}
          />
        </div>

        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* 2. TOP STORY PROGRESS BAR & NAVIGATION HEADER */}
        {/* ============================================================ */}
        <div
          className="absolute top-0 left-0 right-0 z-40 px-4 pb-2 flex flex-col gap-2"
          style={{
            paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 24px)",
          }}
        >
          {/* Multi-segment story progress line */}
          <div className="flex gap-1.5 w-full mb-1">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div
                key={i}
                className="h-[2.5px] flex-1 rounded-full overflow-hidden bg-white/20 backdrop-blur-md"
              >
                <motion.div
                  key={`${i}-${currentSlide}`}
                  className="h-full bg-white rounded-full"
                  initial={{ width: i < currentSlide ? "100%" : "0%" }}
                  animate={{
                    width:
                      i < currentSlide
                        ? "100%"
                        : i === currentSlide
                          ? "100%"
                          : "0%",
                  }}
                  transition={{
                    duration: i === currentSlide ? 5.5 : 0,
                    ease: "linear",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Elegant Apple Story Header (Single Row, Never Wraps) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-xl text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                <div className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />
                <span className="text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap truncate max-w-[170px] sm:max-w-xs text-white/90">
                  Wrapped · {periodTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="h-8 px-3 rounded-full bg-white/[0.08] border border-white/15 flex items-center gap-1.5 text-[11px] font-semibold text-white/90 hover:text-white hover:bg-white/[0.14] transition-all active:scale-95 cursor-pointer backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                title="Share Summary"
              >
                {isCopied ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <Share2 size={12} />
                )}
                <span>{isCopied ? "Copied" : "Share"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center active:scale-90 transition-transform text-white/90 hover:text-white hover:bg-white/[0.14] cursor-pointer backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. TAP ZONES FOR SLIDE NAVIGATION */}
        {/* ============================================================ */}
        <div
          className="absolute inset-0 z-10 flex"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="w-2/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* ============================================================ */}
        {/* 4. DYNAMIC SLIDE CONTENT */}
        {/* ============================================================ */}
        <div
          className="flex-1 flex flex-col justify-center px-6 pb-6 relative z-20 max-w-lg mx-auto w-full overflow-hidden"
          style={{
            paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 56px), 108px)",
          }}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {/* -------------------------------------------------------- */}
            {/* SLIDE 0: Editorial Brutalist Architectural Cover         */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 0 && (
              <motion.div
                key="slide-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col text-left space-y-6"
              >
                {/* Asymmetric Technical Tag */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase">
                    SYS.ARCHIVE // {periodTitle.toUpperCase()}
                  </span>
                  <span className="text-[10.5px] font-mono font-medium text-white/40">
                    [01 / 09]
                  </span>
                </div>

                {/* Hero Typographic Stacking */}
                <div>
                  <h1 className="text-4xl sm:text-5xl font-light tracking-tighter text-white leading-none">
                    {mode === "month" ? "MONTHLY" : "ANNUAL"}
                    <span className="block font-semibold text-white mt-1">
                      WRAPPED.
                    </span>
                  </h1>
                  <p className="text-[12px] font-normal tracking-wider text-zinc-400 mt-2.5">
                    Executive Intelligence · Private Financial Audit
                  </p>
                </div>

                {/* Open Floating Turnover Display */}
                <div className="pt-2">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                      TOTAL CAPITAL TURNOVER
                    </span>
                    <span className="text-[10.5px] font-mono text-zinc-400">
                      {stats.txCount} OPS
                    </span>
                  </div>

                  <p className="amount text-4xl sm:text-5xl font-light text-white tracking-tight leading-tight">
                    {formatRupiah(stats.turnover)}
                  </p>
                </div>

                {/* Minimalist Floating Stat Row */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <span className="text-[9.5px] font-mono text-zinc-400 uppercase tracking-wider block">
                      BURN RATE / DAY
                    </span>
                    <span className="text-[15px] font-medium text-white mt-1 block">
                      ~{formatRupiah(stats.avgDaily)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-mono text-zinc-400 uppercase tracking-wider block">
                      RETENTION EFFICIENCY
                    </span>
                    <span className="text-[15px] font-medium text-white mt-1 block">
                      {stats.savingsRate}% Retained
                    </span>
                  </div>
                </div>

                {/* Geometric Telemetry Footer Pill */}
                <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300">
                    <span>TIER: {stats.efficiencyGrade}</span>
                    <span className="text-white/20">|</span>
                    <span>DISCIPLINE: {stats.disciplineScore}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-light text-zinc-400 tracking-wider">
                    <span>Tap to inspect</span>
                    <ChevronRight size={13} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 1: Dual Waves of Capital (Cardless Inflow/Outflow)  */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 1 && (
              <motion.div
                key="slide-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Waves of Capital · [02 / 09]
                    </span>
                    <span className="text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Dual Trajectory
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Inflow & Outflow Dynamics
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Continuous comparative volume curve across the period
                  </p>
                </div>

                {/* SVG Wave Canvas floating with horizontal reference guidelines */}
                <div className="relative py-2">
                  <div className="absolute inset-x-0 inset-y-4 pointer-events-none flex flex-col justify-between opacity-15">
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                  </div>

                  <div className="w-full h-40 relative z-10">
                    <svg viewBox="0 0 300 95" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="outflowWaveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Inflow curve (Muted dashed line) */}
                      <path
                        d={inflowPath}
                        fill="none"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                      />

                      {/* Outflow area fill and solid curve */}
                      <path
                        d={`${outflowPath} L 300 95 L 0 95 Z`}
                        fill="url(#outflowWaveGrad)"
                      />
                      <path
                        d={outflowPath}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2.2"
                      />

                      {/* Illuminated Peak Pinpoint */}
                      {peakPoint && (
                        <g>
                          <line
                            x1={peakPoint.x}
                            y1={peakPoint.outflowY}
                            x2={peakPoint.x}
                            y2={95}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <circle cx={peakPoint.x} cy={peakPoint.outflowY} r="4" fill="#FFFFFF" />
                          <circle cx={peakPoint.x} cy={peakPoint.outflowY} r="8" fill="#FFFFFF" opacity="0.25" />
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Floating Legend */}
                  <div className="flex justify-between items-center text-[11px] text-white/70 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      <span>Outflow: -{formatRupiah(stats.totalExpense)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-white/50 border-b border-dashed border-white" />
                      <span>Inflow: +{formatRupiah(stats.totalIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* Floating Peak Callout */}
                {stats.peakDate && (
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-between text-left">
                    <div className="min-w-0 pr-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        PEAK CAPITAL DISRUPTION
                      </span>
                      <p className="text-[12px] font-normal text-white truncate mt-0.5">
                        {format(parseISO(stats.peakDate), "EEE, dd MMM yyyy")}
                        {stats.maxExpenseNote ? ` · "${stats.maxExpenseNote}"` : ""}
                      </p>
                    </div>
                    <p className="amount text-[13px] font-medium text-white shrink-0">
                      {formatRupiah(stats.peakAmount)}
                    </p>
                  </div>
                )}

                {/* Floating Net Retention Strip */}
                <div className="flex items-center justify-between pt-1 text-[12px] text-zinc-300">
                  <span>Net Retention Surplus:</span>
                  <span className="font-semibold text-white">
                    {stats.netCashflow >= 0 ? "+" : ""}{formatRupiah(stats.netCashflow)} ({stats.savingsRate}%)
                  </span>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 2: Key Numbers Editorial Prospectus (Reference)   */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-3 sm:space-y-4 text-left"
              >
                {/* Header with Superscript Footnote 1 */}
                <div className="flex justify-between items-baseline mb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-400 block mb-1">
                      SYS.METRICS // PROSPECTUS · [03 / 09]
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                      Key Numbers<sup className="text-sm font-light text-zinc-400 ml-0.5">1</sup>
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/[0.08] text-white/80 border border-white/15">
                    Private Audit
                  </span>
                </div>

                {/* Editorial Rows with crisp hairline dividers */}
                <div className="border-t border-b border-white/20 divide-y divide-white/15">
                  {/* Row 1: Net Cumulative Capital Turnover */}
                  <div className="py-2.5 sm:py-3.5 flex items-center justify-between">
                    <div className="pr-3 max-w-[60%]">
                      <span className="text-[12.5px] sm:text-[13.5px] font-normal text-zinc-200 leading-snug">
                        <span className="text-zinc-400 mr-1.5">→</span>
                        Net Capital Turnover<sup className="text-[9px] text-zinc-400 ml-0.5">2</sup>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">
                        {stats.turnover >= 1_000_000
                          ? `Rp ${(stats.turnover / 1_000_000).toFixed(1)}M`
                          : formatRupiah(stats.turnover)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Retained Capital Surplus */}
                  <div className="py-2.5 sm:py-3.5 flex items-center justify-between">
                    <div className="pr-3 max-w-[60%]">
                      <span className="text-[12.5px] sm:text-[13.5px] font-normal text-zinc-200 leading-snug">
                        <span className="text-zinc-400 mr-1.5">→</span>
                        Retained Capital Surplus<sup className="text-[9px] text-zinc-400 ml-0.5">3</sup>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">
                        {stats.savingsRate >= 50 ? ">" : ""}{stats.savingsRate}%
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Net Operating Cushion */}
                  <div className="py-2.5 sm:py-3.5 flex items-center justify-between">
                    <div className="pr-3 max-w-[60%]">
                      <span className="text-[12.5px] sm:text-[13.5px] font-normal text-zinc-200 leading-snug">
                        <span className="text-zinc-400 mr-1.5">→</span>
                        Net Operating Cushion<sup className="text-[9px] text-zinc-400 ml-0.5">4</sup>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">
                        {stats.netCashflow >= 0 ? "+" : "-"}
                        {Math.abs(stats.netCashflow) >= 1_000_000
                          ? `Rp ${(Math.abs(stats.netCashflow) / 1_000_000).toFixed(1)}M`
                          : formatRupiah(Math.abs(stats.netCashflow))}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: Essential Living Allocation Index */}
                  <div className="py-2.5 sm:py-3.5 flex items-center justify-between">
                    <div className="pr-3 max-w-[60%]">
                      <span className="text-[12.5px] sm:text-[13.5px] font-normal text-zinc-200 leading-snug">
                        <span className="text-zinc-400 mr-1.5">→</span>
                        Essential Allocation Index<sup className="text-[9px] text-zinc-400 ml-0.5">5</sup>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">
                        {stats.essentialPct >= 50 ? ">" : ""}{stats.essentialPct}%
                      </span>
                    </div>
                  </div>

                  {/* Row 5: Audit Discipline & Consistency */}
                  <div className="py-2.5 sm:py-3.5 flex items-center justify-between">
                    <div className="pr-3 max-w-[60%]">
                      <span className="text-[12.5px] sm:text-[13.5px] font-normal text-zinc-200 leading-snug">
                        <span className="text-zinc-400 mr-1.5">→</span>
                        Discipline & Consistency<sup className="text-[9px] text-zinc-400 ml-0.5">6</sup>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="amount text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-tight">
                        {stats.disciplineScore >= 80 ? ">" : ""}{stats.disciplineScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Editorial Footnotes Section */}
                <div className="pt-2 text-[8.5px] sm:text-[9.5px] font-normal text-zinc-400 leading-relaxed space-y-1">
                  <p>
                    <span className="font-mono text-zinc-500">1)</span> Audited private performance indicators across internal Trouvaille ledger for {periodTitle}.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-500">2)</span> Aggregate gross transaction turnover recorded across active accounts.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-500">3)</span> Net liquid surplus retained relative to total period income.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-500">4)</span> Cumulative operational cushion preserved post living commitments.
                  </p>
                  <p>
                    <span className="font-mono text-zinc-500">5)</span> Non-discretionary baseline spending index (food, housing, utilities, mobility).
                  </p>
                  <p>
                    <span className="font-mono text-zinc-500">6)</span> Behavioral adherence composite factoring spending volatility and budget targets.
                  </p>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 3: Temporal Spending Heatmap (Heatmap Chart)       */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 3 && (
              <motion.div
                key="slide-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Temporal Matrix · [04 / 09]
                    </span>
                    <div className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      <Calendar size={11} />
                      <span>Intensity Grid</span>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Spending Heatmap
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Day-by-day outflow intensity across {format(new Date(targetYear, stats.heatmapMonth - 1, 1), "MMMM yyyy")}
                  </p>
                </div>

                {/* 7-Column Heatmap Grid */}
                <div className="py-2">
                  {/* Day of Week Labels (Mon - Sun) */}
                  <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                    {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
                      <span key={i} className="text-[10px] font-mono text-zinc-400">
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Grid of Day Tiles */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Leading blanks for alignment (Monday-first) */}
                    {Array.from({
                      length: ((stats.heatmap.days[0]?.weekday ?? 0) + 6) % 7 || 0,
                    }).map((_, i) => (
                      <div key={`blank-${i}`} className="aspect-square rounded-xl bg-transparent" />
                    ))}

                    {/* Calendar days */}
                    {stats.heatmap.days.map((day) => {
                      const intensityClasses = [
                        "bg-white/[0.03] text-white/30 border border-white/[0.04]",
                        "bg-white/[0.12] text-white/70 border border-white/[0.08]",
                        "bg-white/[0.28] text-white font-medium border border-white/[0.15]",
                        "bg-white/[0.55] text-white font-semibold border border-white/[0.25]",
                        "bg-white text-black font-bold border border-white shadow-[0_0_14px_rgba(255,255,255,0.7)]",
                      ];

                      return (
                        <div
                          key={day.day}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center text-[10.5px] transition-all relative ${intensityClasses[day.intensity]}`}
                          title={`${day.dateStr}: ${formatRupiah(day.amount)}`}
                        >
                          <span>{day.day}</span>
                          {day.isPeak && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white ring-2 ring-black" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-3 mt-2 border-t border-white/10">
                    <span>Intensity</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-zinc-400">Less</span>
                      <span className="w-3 h-3 rounded-md bg-white/[0.04] border border-white/[0.05]" />
                      <span className="w-3 h-3 rounded-md bg-white/[0.15]" />
                      <span className="w-3 h-3 rounded-md bg-white/[0.35]" />
                      <span className="w-3 h-3 rounded-md bg-white/[0.6]" />
                      <span className="w-3 h-3 rounded-md bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                      <span className="text-[9px] text-zinc-400">More</span>
                    </div>
                  </div>
                </div>

                {/* Floating Metrics Summary */}
                <div className="flex items-center justify-between text-[11.5px] text-zinc-300 pt-1">
                  <span>{stats.heatmap.activeSpendDaysCount} active spend days</span>
                  <span className="text-white font-medium">{stats.heatmap.zeroSpendDaysCount} zero-spend days</span>
                </div>

                {/* Peak Day Callout */}
                {stats.heatmap.peakDay && (
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-between text-left">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        PEAK INTENSITY SPIKE
                      </span>
                      <p className="text-[12px] font-normal text-white mt-0.5">
                        {format(parseISO(stats.heatmap.peakDay.dateStr), "EEEE, dd MMMM")}
                      </p>
                    </div>
                    <p className="amount text-[13px] font-medium text-white">
                      {formatRupiah(stats.heatmap.peakDay.amount)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 4: Vital Efficiency Ratios (Bleeding Stadium Bars) */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 4 && (
              <motion.div
                key="slide-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Capital Benchmarks · [05 / 09]
                    </span>
                    <div className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      <ShieldCheck size={11} />
                      <span>Vital Ratios</span>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Vital Efficiency Ratios
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Allocation and behavioral metrics across monthly cashflow
                  </p>
                </div>

                {/* Bleeding Stadium Bars (Reference media_1789625343517.png) */}
                <div className="space-y-3.5 sm:space-y-4 py-2 -mx-6">
                  {(() => {
                    const benchmarks = [
                      {
                        percentage: stats.savingsRate,
                        label:
                          "Capital retention surplus successfully preserved into net worth",
                      },
                      {
                        percentage: stats.essentialPct,
                        label:
                          "Essential baseline commitments (Food, Housing, Utilities, Health)",
                      },
                      {
                        percentage: stats.disciplineScore,
                        label:
                          "Budget adherence & non-impulsive spending consistency index",
                      },
                      {
                        percentage: stats.weekendPct,
                        label:
                          "Weekend outflow share compared to weekday consumption rhythm",
                      },
                      {
                        percentage: Math.min(
                          95,
                          Math.max(
                            25,
                            Math.round(
                              100 -
                                (stats.totalExpense > 0
                                  ? (stats.maxSingleExpense /
                                      stats.totalExpense) *
                                    100
                                  : 20),
                            ),
                          ),
                        ),
                        label:
                          "Operational resilience absorbing single-day spending shocks",
                      },
                    ];

                    const maxPct = Math.max(
                      ...benchmarks.map((b) => b.percentage),
                      1,
                    );

                    return benchmarks.map((bm, idx) => {
                      const isHero = bm.percentage === maxPct;
                      const barWidthPct = Math.min(
                        95,
                        Math.max(38, 28 + (bm.percentage / 100) * 65),
                      );

                      return (
                        <div key={idx} className="relative select-none">
                          {/* Bleeding horizontal stadium pill */}
                          <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: `${barWidthPct}%`, opacity: 1 }}
                            transition={{
                              delay: 0.08 + idx * 0.08,
                              duration: 0.55,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className={`h-11 sm:h-12 rounded-r-full flex items-center justify-end pr-4 transition-transform hover:scale-[1.01] ${
                              isHero
                                ? "bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.35)]"
                                : idx === 1
                                ? "bg-zinc-200 text-zinc-950 shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
                                : idx === 2
                                ? "bg-white/[0.16] text-white border-y border-r border-white/25 backdrop-blur-xl shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
                                : idx === 3
                                ? "bg-zinc-800/90 text-zinc-100 border-y border-r border-white/15 backdrop-blur-lg"
                                : "bg-white/[0.08] text-white/90 border-y border-r border-white/10"
                            }`}
                          >
                            <span
                              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none ${
                                isHero
                                  ? "text-black"
                                  : idx === 1
                                  ? "text-zinc-950"
                                  : "text-white"
                              }`}
                            >
                              {bm.percentage}%
                            </span>
                          </motion.div>

                          {/* Descriptive statement below each bar */}
                          <p className="text-[11.5px] sm:text-[12px] text-zinc-300 ml-6 mt-1 leading-snug font-medium max-w-sm">
                            {bm.label}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 5: Multi-Horizon Runway Projection (Line Chart)    */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 5 && (
              <motion.div
                key="slide-5"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Runway Horizon · [06 / 09]
                    </span>
                    <div className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      <TrendingUp size={11} />
                      <span>+6 Mo Forecast</span>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Capital Runway & Forecast
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Forward extrapolation of surplus accumulation over 6 months
                  </p>
                </div>

                {/* Dynamic Multi-Horizon Projection SVG Curve */}
                <div className="relative py-2">
                  <div className="absolute inset-x-0 inset-y-4 pointer-events-none flex flex-col justify-between opacity-15">
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                  </div>

                  {(() => {
                    const rSvgW = 320;
                    const rSvgH = 130;
                    const rPadL = 20;
                    const rPadR = 24;
                    const rPadT = 24;
                    const rPadB = 26;
                    const rPlotW = rSvgW - rPadL - rPadR;
                    const rPlotH = rSvgH - rPadT - rPadB;
                    const rMaxVal = Math.max(1, stats.runway.terminalProjectedSurplus);

                    const rPoints = stats.runway.points.map((pt, i) => {
                      const x = rPadL + (i / 6) * rPlotW;
                      const y = rPadT + rPlotH - (pt.amount / rMaxVal) * rPlotH;
                      return { ...pt, x, y };
                    });

                    const rPath = rPoints.reduce((acc, pt, i, arr) => {
                      if (i === 0) return `M ${pt.x} ${pt.y}`;
                      const prev = arr[i - 1];
                      const cx = (prev.x + pt.x) / 2;
                      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
                    }, "");

                    const rAreaPath = `${rPath} L ${rPoints[6].x} ${rPadT + rPlotH} L ${rPoints[0].x} ${rPadT + rPlotH} Z`;

                    return (
                      <div className="w-full h-36 relative z-10">
                        <svg viewBox={`0 0 ${rSvgW} ${rSvgH}`} className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.01" />
                            </linearGradient>
                          </defs>

                          {/* Projection Area Fill */}
                          <path d={rAreaPath} fill="url(#projGrad)" />

                          {/* Baseline */}
                          <line
                            x1={rPadL}
                            y1={rPadT + rPlotH}
                            x2={rPadL + rPlotW + 4}
                            y2={rPadT + rPlotH}
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth="1"
                          />

                          {/* Dashed forward projection curve */}
                          <path
                            d={rPath}
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2.2"
                            strokeDasharray="5 4"
                            strokeLinecap="round"
                          />

                          {/* Milestone nodes at Present, +2M, +4M */}
                          <circle cx={rPoints[0].x} cy={rPoints[0].y} r="4" fill="#FFFFFF" />
                          <circle cx={rPoints[2].x} cy={rPoints[2].y} r="3" fill="#FFFFFF" opacity="0.8" />
                          <circle cx={rPoints[4].x} cy={rPoints[4].y} r="3" fill="#FFFFFF" opacity="0.8" />

                          {/* Terminal +6M Anchor Pin with glowing halo */}
                          <circle cx={rPoints[6].x} cy={rPoints[6].y} r="10" fill="#FFFFFF" opacity="0.2" />
                          <circle cx={rPoints[6].x} cy={rPoints[6].y} r="4.5" fill="#FFFFFF" />

                          {/* Terminal Value Badge */}
                          <text
                            x={rPoints[6].x}
                            y={rPoints[6].y - 8}
                            textAnchor="end"
                            fill="#FFFFFF"
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            +{formatRupiah(stats.runway.terminalProjectedSurplus)}
                          </text>
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Period Timeline Points */}
                  <div className="flex justify-between text-[9.5px] font-mono text-zinc-400 pt-1">
                    <span>Present</span>
                    <span>+2 Mo</span>
                    <span>+4 Mo</span>
                    <span className="text-white font-medium">+6 Mo Horizon</span>
                  </div>
                </div>

                {/* Floating Horizon Callout Pills */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                      MONTHLY SURPLUS PACE
                    </span>
                    <p className="amount text-[15px] font-semibold text-white mt-0.5">
                      +{formatRupiah(stats.runway.monthlyPace)}
                      <span className="text-[10px] font-normal text-zinc-400">/mo</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                      ESTIMATED 6-MO CUSHION
                    </span>
                    <p className="amount text-[15px] font-semibold text-white mt-0.5">
                      +{formatRupiah(stats.runway.terminalProjectedSurplus)}
                    </p>
                  </div>
                </div>

                {/* Trajectory Status Pill */}
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <Activity size={13} className="text-white/80" />
                    <span className="text-[11.5px] font-normal text-white">
                      {stats.runway.monthlyPace > 0
                        ? "Positive expansion trajectory with compounding surplus"
                        : "Break-even cashflow velocity requiring capital conservation"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 6: Weekly Rhythm & Outliers (Step Bars)            */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 6 && (
              <motion.div
                key="slide-6"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Temporal Rhythm · [07 / 09]
                    </span>
                    <span className="text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Weekday Distribution
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Weekly Rhythm & Outliers
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Day-of-week volume concentration and singular milestones
                  </p>
                </div>

                {/* Step Bars floating without enclosing card box */}
                <div className="py-2">
                  <div className="flex items-end justify-between gap-1.5 h-28 px-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dName, idx) => {
                      const val = stats.weekdaySpend[idx];
                      const pct = Math.max(10, Math.round((val / stats.maxWeekdaySpend) * 100));
                      const isWeekend = idx === 0 || idx === 6;

                      return (
                        <div
                          key={dName}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                        >
                          <span className="text-[8.5px] font-mono text-zinc-400">
                            {val > 0
                              ? val >= 1000000
                                ? `${(val / 1000000).toFixed(1)}m`
                                : `${Math.round(val / 1000)}k`
                              : "-"}
                          </span>
                          <div
                            className="w-full rounded-lg transition-all duration-700"
                            style={{
                              height: `${pct}%`,
                              background: isWeekend
                                ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.25) 100%)"
                                : "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 100%)",
                            }}
                          />
                          <span
                            className={`text-[9.5px] ${isWeekend ? "font-semibold text-white" : "font-normal text-zinc-400"}`}
                          >
                            {dName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Single Largest Outflow Spotlight */}
                {stats.maxSingleExpense > 0 && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex justify-between items-center text-left">
                    <div className="min-w-0 pr-3">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block mb-0.5">
                        MAX DISRUPTION EVENT
                      </span>
                      <p className="text-[13px] font-medium text-white truncate">
                        "{stats.maxExpenseNote}"
                      </p>
                      {stats.maxExpenseDate && (
                        <p className="text-[10.5px] font-mono text-zinc-400 mt-0.5">
                          {format(parseISO(stats.maxExpenseDate), "EEE, dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono text-zinc-400 uppercase block">OUTFLOW</span>
                      <p className="amount text-[15px] font-semibold text-white mt-0.5">
                        {formatRupiah(stats.maxSingleExpense)}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 7: Financial Archetype Persona                     */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 7 && (
              <motion.div
                key="slide-7"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Persona Intelligence · [08 / 09]
                    </span>
                    <span className="text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Executive Profile
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Capital Archetype
                  </h2>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-white/90 text-[9.5px] font-mono tracking-widest uppercase">
                    <Sparkles size={11} />
                    <span>{stats.personaTag}</span>
                  </div>

                  <div>
                    <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                      {stats.persona}
                    </h3>
                  </div>

                  {/* 4-Metric Grid (Cardless, minimal dividing hairlines) */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10">
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        RETENTION RATE
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        {stats.savingsRate}% Saved
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        VOLATILITY INDEX
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        {stats.volatilityLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        DISCIPLINE SCORE
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        {stats.disciplineScore} / 100
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                        EFFICIENCY GRADE
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        Grade {stats.efficiencyGrade}
                      </p>
                    </div>
                  </div>

                  <p className="text-[13px] font-light text-zinc-300 leading-relaxed">
                    {stats.personaDesc}
                  </p>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 8: Shareable Recap Poster                          */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 8 && (
              <motion.div
                key="slide-8"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 text-left"
              >
                {/* Ashurst-style Dark Luxury Report Poster */}
                <div
                  className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.16] backdrop-blur-3xl relative overflow-hidden text-left"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.22), 0 25px 50px -12px rgba(0,0,0,0.8)",
                  }}
                >
                  {/* Fluted glass background slats within the card */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 28px)",
                    }}
                  />

                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-white/[0.1] pb-3 mb-3 relative z-10">
                    <div>
                      <p className="text-[9.5px] font-mono tracking-[0.25em] uppercase text-zinc-400">
                        Trouvaille Financial Intelligence
                      </p>
                      <h4 className="text-xl font-medium tracking-tight text-white mt-0.5">
                        Executive Recap
                      </h4>
                      <p className="text-[11px] font-light text-zinc-300">
                        {periodTitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                        {stats.persona}
                      </span>
                    </div>
                  </div>

                  {/* 4 Summary Matrix Columns */}
                  <div className="grid grid-cols-2 gap-2.5 py-1 relative z-10">
                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Capital Inflow
                      </span>
                      <p className="amount text-[14px] font-medium text-white mt-0.5">
                        +{formatRupiah(stats.totalIncome)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Capital Outflow
                      </span>
                      <p className="amount text-[14px] font-medium text-white mt-0.5">
                        -{formatRupiah(stats.totalExpense)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Net Surplus
                      </span>
                      <p className="amount text-[14px] font-medium text-white mt-0.5">
                        {stats.netCashflow >= 0 ? "+" : ""}{formatRupiah(stats.netCashflow)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Capital Saved
                      </span>
                      <p className="text-[14px] font-medium text-white mt-0.5">
                        {stats.savingsRate}% Retained
                      </p>
                    </div>
                  </div>

                  {/* Additional Highlights Footer */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex justify-between items-center text-[10.5px] font-light text-zinc-400 relative z-10">
                    <span>{stats.txCount} recorded operations</span>
                    <span>Discipline score: {stats.disciplineScore}%</span>
                  </div>
                </div>

                {/* Share Action Pill */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-3 rounded-2xl bg-white text-black text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-lg"
                >
                  {isCopied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{isCopied ? "Summary Copied to Clipboard" : "Copy Executive Summary"}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================ */}
        {/* 5. BOTTOM SLIDE NAVIGATION CONTROLS                          */}
        {/* ============================================================ */}
        <div className="relative z-30 p-4 pb-5 flex items-center justify-between border-t border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <button
            type="button"
            disabled={currentSlide === 0}
            onClick={handlePrev}
            className={`flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              currentSlide === 0
                ? "opacity-30 border-transparent text-white/30 cursor-not-allowed"
                : "opacity-80 hover:opacity-100 border-white/10 text-white active:scale-95"
            }`}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <span className="text-[11px] font-light text-white/40 tracking-widest">
            {currentSlide + 1} of {totalSlides}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 text-[11px] font-medium px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white active:scale-95 transition-all cursor-pointer"
          >
            <span>{currentSlide === totalSlides - 1 ? "Finish" : "Next"}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>,
  document.body
);
}
