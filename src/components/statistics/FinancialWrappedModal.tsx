import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Layers,
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
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      onClose();
    }
  }, [currentSlide, totalSlides, onClose]);

  const handlePrev = useCallback(() => {
    triggerHaptic("light");
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide]);

  // Auto-advance timer (5.5s per slide)
  useEffect(() => {
    if (!isOpen || isPaused) return;

    timerRef.current = setTimeout(() => {
      if (currentSlide < totalSlides - 1) {
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

  // Reset slide on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
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

  if (!isOpen) return null;

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

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] bg-[#0A0A0D] text-white flex flex-col justify-between overflow-hidden select-none"
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
          className="flex-1 flex flex-col justify-center px-6 pb-10 relative z-20 pointer-events-none max-w-lg mx-auto w-full"
          style={{
            paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 56px), 108px)",
          }}
        >
          <AnimatePresence mode="wait">
            {/* -------------------------------------------------------- */}
            {/* SLIDE 0: Editorial Brutalist Architectural Cover         */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 0 && (
              <motion.div
                key="slide-0"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.38, ease: "easeOut" }}
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
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
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
            {/* SLIDE 2: Stacked Cascade Chart (User Reference Image)    */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Sector Cascade · [03 / 09]
                    </span>
                    <div className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      <Layers size={11} />
                      <span>Stacked Weights</span>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Capital Allocation Cascade
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Structural dispersion stacked by category weight
                  </p>
                </div>

                {/* Overlapping Cascade Blocks */}
                {stats.cascadeCategories.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-[13px]">
                    No expenditure recorded for this reporting timeframe.
                  </div>
                ) : (
                  <div className="relative py-2 flex flex-col space-y-[-14px]">
                    {stats.cascadeCategories.map((cat, idx) => {
                      const cascadeAlignments = [
                        "w-[88%] ml-auto z-10",
                        "w-[86%] mr-auto z-20",
                        "w-[90%] ml-auto z-30",
                        "w-[84%] mr-auto z-40",
                        "w-[92%] mx-auto z-50",
                      ];
                      const glassStyles = [
                        "bg-white/[0.13] border-white/25 shadow-[0_16px_36px_rgba(0,0,0,0.6)]",
                        "bg-white/[0.10] border-white/20 shadow-[0_14px_30px_rgba(0,0,0,0.5)]",
                        "bg-white/[0.08] border-white/16 shadow-[0_12px_26px_rgba(0,0,0,0.4)]",
                        "bg-white/[0.06] border-white/12 shadow-[0_10px_22px_rgba(0,0,0,0.35)]",
                        "bg-white/[0.04] border-white/[0.09] shadow-[0_8px_18px_rgba(0,0,0,0.3)]",
                      ];

                      return (
                        <motion.div
                          key={cat.name}
                          initial={{ opacity: 0, y: 20 + idx * 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            delay: idx * 0.08,
                            duration: 0.45,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className={`p-3.5 sm:p-4 rounded-3xl border backdrop-blur-2xl transition-transform hover:scale-[1.01] ${cascadeAlignments[idx] || "w-full z-10"} ${glassStyles[idx] || glassStyles[0]}`}
                        >
                          <div className="flex items-center justify-between">
                            {/* Left: Big percentage (matching reference image) */}
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-none">
                                {cat.percentage}%
                              </span>
                            </div>

                            {/* Right: Category name & amounts */}
                            <div className="text-right min-w-0 flex-1 ml-4">
                              <p className="text-[13px] font-semibold text-white truncate">
                                {cat.name}
                              </p>
                              <p className="amount text-[11px] font-mono text-zinc-300 mt-0.5">
                                {formatRupiah(cat.total)}
                                <span className="text-white/40 ml-1.5 font-sans font-normal">
                                  · {cat.count} txs
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Hairline progress track within the block */}
                          <div className="h-[2px] w-full bg-white/10 rounded-full mt-2.5 overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(100, cat.percentage)}%` }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Floating Takeaway Footer */}
                {stats.topCat && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/10">
                    <span>#1 Sector Anchor</span>
                    <span className="text-white font-medium">
                      {stats.topCat.name} drove {stats.topCatPct}% of total outflows
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 3: Temporal Spending Heatmap (Heatmap Chart)       */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 3 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
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
            {/* SLIDE 4: Vital Efficiency Ratios (Ring Chart)            */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 4 && (
              <motion.div
                key="slide-4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-4 text-left"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                      Capital Benchmarks · [05 / 09]
                    </span>
                    <div className="inline-flex items-center gap-1 text-[10px] font-normal px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      <ShieldCheck size={11} />
                      <span>Concentric Ratios</span>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Vital Efficiency Ratios
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Concentric allocation analysis of cashflow fundamentals
                  </p>
                </div>

                {/* Concentric Ring Graphic + Readout */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                      {/* Ring 1 (Outer, r=76): Capital Retention */}
                      <circle
                        cx="100"
                        cy="100"
                        r="76"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="7"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="76"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="7"
                        strokeDasharray={477.5}
                        strokeDashoffset={477.5 * (1 - Math.min(100, stats.savingsRate) / 100)}
                        strokeLinecap="round"
                      />

                      {/* Ring 2 (Middle, r=56): Essential Living Needs */}
                      <circle
                        cx="100"
                        cy="100"
                        r="56"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="7"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="56"
                        fill="none"
                        stroke="rgba(255,255,255,0.65)"
                        strokeWidth="7"
                        strokeDasharray={351.8}
                        strokeDashoffset={351.8 * (1 - Math.min(100, stats.essentialPct) / 100)}
                        strokeLinecap="round"
                      />

                      {/* Ring 3 (Inner, r=36): Weekend Outflows */}
                      <circle
                        cx="100"
                        cy="100"
                        r="36"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="7"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="36"
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="7"
                        strokeDasharray={226.2}
                        strokeDashoffset={226.2 * (1 - Math.min(100, stats.weekendPct) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Center Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-2xl font-bold text-white tracking-tight">
                        {stats.disciplineScore}%
                      </span>
                      <span className="text-[8.5px] font-mono tracking-widest text-zinc-400 uppercase mt-0.5">
                        DISCIPLINE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Ring Legends */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                      <span className="text-white/90">Capital Retention</span>
                    </div>
                    <span className="font-semibold text-white">{stats.savingsRate}% Retained</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/65" />
                      <span className="text-white/80">Essential Needs</span>
                    </div>
                    <span className="font-medium text-white/90">{stats.essentialPct}% Allocated</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/35" />
                      <span className="text-white/70">Weekend Concentration</span>
                    </div>
                    <span className="font-medium text-white/80">{stats.weekendPct}% on Weekends</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 5: Multi-Horizon Runway Projection (Line Chart)    */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 5 && (
              <motion.div
                key="slide-5"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
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

                {/* Projection SVG Curve */}
                <div className="relative py-2">
                  <div className="absolute inset-x-0 inset-y-4 pointer-events-none flex flex-col justify-between opacity-15">
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                    <div className="border-b border-dashed border-white" />
                  </div>

                  <div className="w-full h-36 relative z-10">
                    <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="projGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.25" />
                        </linearGradient>
                      </defs>

                      {/* Projection Area Fill */}
                      <path
                        d="M 20 85 C 80 80, 160 55, 275 20 L 275 85 L 20 85 Z"
                        fill="url(#projGrad)"
                      />

                      {/* Solid baseline at Present */}
                      <circle cx="20" cy="85" r="4" fill="#FFFFFF" />

                      {/* Dashed forward projection curve */}
                      <path
                        d="M 20 85 C 80 80, 160 55, 275 20"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2.2"
                        strokeDasharray="5 4"
                      />

                      {/* Terminal +6M Anchor Pin */}
                      <circle cx="275" cy="20" r="5" fill="#FFFFFF" />
                      <circle cx="275" cy="20" r="10" fill="#FFFFFF" opacity="0.25" />
                    </svg>
                  </div>

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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
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
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
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
      </div>
    </AnimatePresence>
  );
}
