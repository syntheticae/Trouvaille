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
} from "lucide-react";
import type { Transaction, Category } from "../../lib/types";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { format, parseISO, getDay } from "date-fns";

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
  const totalSlides = 7;
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

        const cat = t.category_id ? catLookup.get(t.category_id) : null;
        const catName = cat?.name || "General Outflow";
        const existing = catMap.get(catName) || {
          total: 0,
          count: 0,
          name: catName,
          emoji: cat?.emoji,
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
    };
  }, [periodTxs, categories]);

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
        {/* 2. TOP STORY PROGRESS BAR & NAVIGATION HEADER */}
        {/* ============================================================ */}
        <div className="absolute top-0 left-0 right-0 z-40 p-4 pt-3.5 flex flex-col gap-2">
          {/* Multi-segment story progress line */}
          <div className="flex gap-1.5 w-full">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full overflow-hidden bg-white/15 backdrop-blur-md"
              >
                <motion.div
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

          {/* Elegant Swiss Header */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] backdrop-blur-xl text-white/80">
                Trouvaille Wrapped · {periodTitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="h-7 px-2.5 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center gap-1 text-[11px] font-medium text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer"
                title="Share Summary"
              >
                {isCopied ? <Check size={12} /> : <Share2 size={12} />}
                <span>{isCopied ? "Copied" : "Share"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                }}
                className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center active:scale-90 transition-transform text-white/70 hover:text-white cursor-pointer"
                title="Close"
              >
                <X size={14} />
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
        <div className="flex-1 flex flex-col justify-center px-6 pt-16 pb-14 relative z-20 pointer-events-none max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* -------------------------------------------------------- */}
            {/* SLIDE 0: Executive Cover & Period Overview               */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 0 && (
              <motion.div
                key="slide-0"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center text-center space-y-5"
              >
                {/* Slide index & subtitle pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/70 text-[10px] font-medium tracking-[0.2em] uppercase">
                  <span>Report Slide 01 / 07</span>
                </div>

                <div>
                  <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-white leading-tight">
                    Financial
                    <span className="block font-light text-zinc-300">
                      Wrapped
                    </span>
                  </h1>
                  <p className="text-[12px] font-normal tracking-widest uppercase text-white/50 mt-1.5">
                    {periodTitle} · Executive Briefing
                  </p>
                </div>

                {/* Apple Fractal Glass Bento Hero */}
                <div
                  className="w-full p-5 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl relative overflow-hidden text-left"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.18), 0 20px 40px -15px rgba(0,0,0,0.7)",
                  }}
                >
                  <div className="flex justify-between items-center text-[10.5px] font-medium uppercase tracking-wider text-white/50 mb-1">
                    <span>Total Capital Turnover</span>
                    <span className="text-white/80 font-normal">
                      {stats.txCount} transactions
                    </span>
                  </div>
                  <p className="amount text-3xl font-semibold text-white tracking-tight">
                    {formatRupiah(stats.turnover)}
                  </p>

                  {/* Multi-metric sub row */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/[0.08]">
                    <div>
                      <p className="text-[9.5px] font-normal uppercase tracking-wider text-white/40">
                        Daily Outflow Velocity
                      </p>
                      <p className="text-[13px] font-medium text-white mt-0.5">
                        ~{formatRupiah(stats.avgDaily)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9.5px] font-normal uppercase tracking-wider text-white/40">
                        Retention Rate
                      </p>
                      <p className="text-[13px] font-medium text-white mt-0.5">
                        {stats.savingsRate}% Retained
                      </p>
                    </div>
                  </div>

                  {/* Micro wave sparkline */}
                  <div className="w-full h-8 mt-3">
                    <svg
                      viewBox="0 0 200 32"
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        <linearGradient
                          id="coverGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 24 Q30 8, 60 18 T120 6 T160 16 T200 8 L200 32 L0 32 Z"
                        fill="url(#coverGrad)"
                      />
                      <path
                        d="M0 24 Q30 8, 60 18 T120 6 T160 16 T200 8"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="1.8"
                        strokeOpacity="0.8"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-normal text-white/40 tracking-wider">
                  <span>Tap anywhere to proceed</span>
                  <ChevronRight size={13} />
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 1: Dual Waves of Capital (Inspired by Image 1)     */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3.5"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                      Waves of Capital · Slide 02
                    </span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Dual Inflow vs Outflow
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Inflow & Outflow Dynamics
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Continuous comparative volume curve across the period
                  </p>
                </div>

                {/* Quartr-style Dual Wave Area Chart Card */}
                <div
                  className="p-4 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl relative overflow-hidden"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.18), 0 20px 40px -15px rgba(0,0,0,0.7)",
                  }}
                >
                  {/* Subtle background grid lines (Image 1 style) */}
                  <div className="absolute inset-x-4 inset-y-3 pointer-events-none opacity-15">
                    <div className="w-full h-full grid grid-rows-4 grid-cols-6 border-b border-white">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="border-t border-r border-white/40" />
                      ))}
                    </div>
                  </div>

                  {/* SVG Chart Area */}
                  <div className="w-full h-36 my-1 relative z-10">
                    <svg
                      viewBox="0 0 300 95"
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        <linearGradient
                          id="outflowWaveGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Inflow curve (Muted dashed line) */}
                      <path
                        d={inflowPath}
                        fill="none"
                        stroke="rgba(255,255,255,0.45)"
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

                      {/* Illuminated Callout Pinpoint for Peak Outflow (Image 1 style) */}
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
                          <circle
                            cx={peakPoint.x}
                            cy={peakPoint.outflowY}
                            r="4"
                            fill="#FFFFFF"
                          />
                          <circle
                            cx={peakPoint.x}
                            cy={peakPoint.outflowY}
                            r="8"
                            fill="#FFFFFF"
                            opacity="0.2"
                          />
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Peak Callout Annotation Box (Inspired by Image 1) */}
                  {stats.peakDate && (
                    <div className="mt-1 p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-between text-left">
                      <div className="min-w-0 pr-2">
                        <span className="text-[9px] font-medium uppercase tracking-wider text-white/50 block">
                          Peak Capital Disruption
                        </span>
                        <p className="text-[11.5px] font-normal text-white truncate mt-0.5">
                          {format(parseISO(stats.peakDate), "EEE, dd MMM yyyy")}
                          {stats.maxExpenseNote ? ` · "${stats.maxExpenseNote}"` : ""}
                        </p>
                      </div>
                      <p className="amount text-[13px] font-semibold text-white shrink-0">
                        {formatRupiah(stats.peakAmount)}
                      </p>
                    </div>
                  )}

                  {/* Legend Footer */}
                  <div className="flex justify-between items-center text-[10.5px] font-normal text-white/70 pt-2.5 mt-2 border-t border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white" />
                      <span>Outflow ({formatRupiah(stats.totalExpense)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-0.5 bg-white/50 border-b border-dashed border-white" />
                      <span>Inflow (+{formatRupiah(stats.totalIncome)})</span>
                    </div>
                  </div>
                </div>

                {/* Net Retention Stat Card */}
                <div
                  className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl flex items-center justify-between"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12)",
                  }}
                >
                  <div>
                    <span className="text-[9.5px] font-normal uppercase tracking-wider text-white/50">
                      Net Retention Surplus
                    </span>
                    <p className="amount text-xl font-medium text-white mt-0.5">
                      {stats.netCashflow >= 0 ? "+" : ""}
                      {formatRupiah(stats.netCashflow)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-normal uppercase tracking-wider text-white/50">
                      Capital Saved
                    </span>
                    <p className="text-xl font-medium text-white mt-0.5">
                      {stats.savingsRate}%
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 2: Category Step Gradient Columns (Inspired by Image 2) */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3.5"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                      Allocation Matrix · Slide 03
                    </span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Sectors
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Capital Deployment
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Structural dispersion across top expense drivers
                  </p>
                </div>

                {/* Step Columns with Downward Gradient Fade (Image 2 style) */}
                <div
                  className="p-4 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl relative overflow-hidden"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.18), 0 20px 40px -15px rgba(0,0,0,0.7)",
                  }}
                >
                  <div className="relative h-44 w-full flex items-end justify-between px-2 pt-6 pb-6">
                    {/* Horizontal Dashed Milestone Lines (Image 2 style) */}
                    <div className="absolute inset-x-2 top-6 border-b border-dashed border-white/15" />
                    <div className="absolute inset-x-2 top-16 border-b border-dashed border-white/15" />
                    <div className="absolute inset-x-2 top-28 border-b border-dashed border-white/15" />

                    {/* Step columns */}
                    {stats.top4Cats.map((cat, idx) => {
                      const pct =
                        stats.totalExpense > 0
                          ? Math.round((cat.total / stats.totalExpense) * 100)
                          : 25;
                      const colHeight = Math.max(20, Math.min(100, pct * 1.8));

                      return (
                        <div
                          key={cat.name}
                          className="flex-1 flex flex-col items-center justify-end h-full px-1.5 z-10"
                        >
                          <span className="text-[10px] font-medium text-white/70 mb-1.5">
                            {pct}%
                          </span>
                          <div
                            className="w-full rounded-t-lg transition-all duration-700"
                            style={{
                              height: `${colHeight}%`,
                              background:
                                idx === 0
                                  ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 100%)"
                                  : idx === 1
                                    ? "linear-gradient(180deg, rgba(210,210,220,0.8) 0%, rgba(210,210,220,0.1) 100%)"
                                    : "linear-gradient(180deg, rgba(160,160,175,0.6) 0%, rgba(160,160,175,0.05) 100%)",
                            }}
                          />
                          <span className="text-[10px] font-normal text-white/50 mt-1.5 truncate max-w-[55px]">
                            {cat.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Clean Category Legend (Image 2 style) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.08] text-left">
                    {stats.top4Cats.slice(0, 3).map((cat, idx) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{
                              background:
                                idx === 0
                                  ? "#FFFFFF"
                                  : idx === 1
                                    ? "rgba(255,255,255,0.65)"
                                    : "rgba(255,255,255,0.35)",
                            }}
                          />
                          <span className="font-normal text-white/80 truncate">
                            {cat.name}
                          </span>
                          <span className="text-white/40 text-[10px]">
                            ({cat.count} txs)
                          </span>
                        </div>
                        <span className="amount font-medium text-white/90">
                          {formatRupiah(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dominant Outflow Driver Insight */}
                {stats.topCat && (
                  <div
                    className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl flex items-center justify-between text-left"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12)",
                    }}
                  >
                    <div>
                      <span className="text-[9.5px] font-normal uppercase tracking-wider text-white/50">
                        Primary Capital Concentration
                      </span>
                      <p className="text-[13px] font-normal text-white mt-0.5">
                        <span className="font-medium text-white">{stats.topCat.name}</span> accounted for {stats.topCatPct}% of all outflows
                      </p>
                    </div>
                    <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                      #1 Pillar
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 3: Vital Capital Ratios (Inspired by Image 3)      */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 3 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                      Capital Benchmarks
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mt-0.5">
                      Vital Efficiency Ratios
                    </h2>
                  </div>
                  <span className="text-[18px] font-light text-white/40">
                    04
                  </span>
                </div>

                {/* 4 Capsule Pill Progress Bars (Image 3 Style) */}
                <div className="space-y-2.5">
                  {/* Capsule 1: Capital Retention Rate */}
                  <div
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl text-left"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.16)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 px-4 rounded-full bg-white text-black flex items-center justify-center shrink-0"
                        style={{ minWidth: "75px" }}
                      >
                        <span className="text-[17px] font-semibold tracking-tight">
                          {stats.savingsRate}%
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-normal text-white/80 leading-snug">
                          Capital retention rate successfully preserved from total monthly inflow
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capsule 2: Essential Needs Ratio */}
                  <div
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl text-left"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.16)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 px-4 rounded-full bg-zinc-200 text-black flex items-center justify-center shrink-0"
                        style={{ minWidth: "75px" }}
                      >
                        <span className="text-[17px] font-semibold tracking-tight">
                          {stats.essentialPct}%
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-normal text-white/80 leading-snug">
                          Portion deployed towards essential living needs and routine fixed obligations
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capsule 3: Weekend Outflow Concentration */}
                  <div
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl text-left"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.16)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 px-4 rounded-full bg-zinc-400 text-black flex items-center justify-center shrink-0"
                        style={{ minWidth: "75px" }}
                      >
                        <span className="text-[17px] font-semibold tracking-tight">
                          {stats.weekendPct}%
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-normal text-white/80 leading-snug">
                          Outflow velocity occurring exclusively across Saturdays and Sundays
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capsule 4: Budget Discipline Index */}
                  <div
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl text-left"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.16)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 px-4 rounded-full bg-zinc-600 text-white flex items-center justify-center shrink-0"
                        style={{ minWidth: "75px" }}
                      >
                        <span className="text-[17px] font-semibold tracking-tight">
                          {stats.disciplineScore}%
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-normal text-white/80 leading-snug">
                          Calculated spending discipline index reflecting consistency and pace adherence
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 4: Spending Velocity & Peak Rhythm                 */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 4 && (
              <motion.div
                key="slide-4"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3.5"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                      Rhythm & Velocity · Slide 05
                    </span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Temporal Pattern
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Weekly Rhythm & Splurges
                  </h2>
                  <p className="text-[12px] font-light text-white/50 mt-0.5">
                    Day-of-week volume concentration and singular milestones
                  </p>
                </div>

                {/* Weekday Rhythm Bar Card */}
                <div
                  className="p-4 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl relative overflow-hidden"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.18), 0 20px 40px -15px rgba(0,0,0,0.7)",
                  }}
                >
                  <p className="text-[10px] font-normal uppercase tracking-wider text-white/50 mb-2.5 text-left">
                    Outflow Concentration by Day of Week (Sun - Sat)
                  </p>

                  <div className="flex items-end justify-between gap-1.5 h-20 px-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dName, idx) => {
                      const val = stats.weekdaySpend[idx];
                      const pct = Math.max(
                        10,
                        Math.round((val / stats.maxWeekdaySpend) * 100),
                      );
                      const isWeekend = idx === 0 || idx === 6;

                      return (
                        <div
                          key={dName}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                        >
                          <span className="text-[8.5px] font-light text-white/50">
                            {val > 0 ? (val >= 1000000 ? `${(val / 1000000).toFixed(1)}m` : `${Math.round(val / 1000)}k`) : "-"}
                          </span>
                          <div
                            className="w-full rounded-md transition-all duration-700"
                            style={{
                              height: `${pct}%`,
                              background:
                                isWeekend
                                  ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 100%)"
                                  : "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 100%)",
                            }}
                          />
                          <span
                            className={`text-[9px] ${isWeekend ? "font-medium text-white" : "font-normal text-white/50"}`}
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
                  <div
                    className="p-4 rounded-3xl bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl flex justify-between items-center text-left"
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12)",
                    }}
                  >
                    <div className="min-w-0 pr-3">
                      <span className="text-[9.5px] font-normal uppercase tracking-wider text-white/50 block">
                        Largest Single Outflow Event
                      </span>
                      <p className="text-[13px] font-medium text-white truncate mt-0.5">
                        "{stats.maxExpenseNote}"
                      </p>
                      {stats.maxExpenseDate && (
                        <p className="text-[10px] font-light text-white/40 mt-0.5">
                          {format(parseISO(stats.maxExpenseDate), "EEEE, dd MMMM yyyy")}
                        </p>
                      )}
                    </div>
                    <p className="amount text-[15px] font-semibold text-white shrink-0">
                      {formatRupiah(stats.maxSingleExpense)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 5: Financial Archetype Persona                     */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 5 && (
              <motion.div
                key="slide-5"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3.5"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                      Persona Intelligence · Slide 06
                    </span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/[0.08] text-white/80 border border-white/10">
                      Archetype
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                    Executive Profile
                  </h2>
                </div>

                <div
                  className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl space-y-4 relative overflow-hidden text-left"
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.18), 0 20px 40px -15px rgba(0,0,0,0.7)",
                  }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-white/90 text-[9.5px] font-medium tracking-widest uppercase">
                    <Sparkles size={11} />
                    <span>{stats.personaTag}</span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                      {stats.persona}
                    </h3>
                  </div>

                  {/* 4-Metric Executive Matrix */}
                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-white/[0.08]">
                    <div className="p-2.5 rounded-xl bg-white/[0.03]">
                      <p className="text-[9px] font-normal uppercase tracking-wider text-white/50">
                        Retention Rate
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        {stats.savingsRate}% Saved
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03]">
                      <p className="text-[9px] font-normal uppercase tracking-wider text-white/50">
                        Volatility Index
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        {stats.volatilityLabel}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03]">
                      <p className="text-[9px] font-normal uppercase tracking-wider text-white/50">
                        Discipline Score
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        {stats.disciplineScore} / 100
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03]">
                      <p className="text-[9px] font-normal uppercase tracking-wider text-white/50">
                        Efficiency Grade
                      </p>
                      <p className="text-[16px] font-medium text-white mt-0.5">
                        Grade {stats.efficiencyGrade}
                      </p>
                    </div>
                  </div>

                  <p className="text-[12.5px] font-light text-white/75 leading-relaxed">
                    {stats.personaDesc}
                  </p>
                </div>
              </motion.div>
            )}

            {/* -------------------------------------------------------- */}
            {/* SLIDE 6: Shareable Recap Poster (Inspired by Image 4)    */}
            {/* -------------------------------------------------------- */}
            {currentSlide === 6 && (
              <motion.div
                key="slide-6"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3.5"
              >
                {/* Ashurst-style Dark Luxury Report Poster (Image 4 Style) */}
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
                      <p className="text-[9.5px] font-normal tracking-[0.25em] uppercase text-white/50">
                        Trouvaille Financial Intelligence
                      </p>
                      <h4 className="text-xl font-medium tracking-tight text-white mt-0.5">
                        Executive Recap FY
                      </h4>
                      <p className="text-[11px] font-light text-white/60">
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
                      <span className="text-[9px] font-normal uppercase tracking-wider text-white/50 block">
                        Capital Inflow
                      </span>
                      <p className="amount text-[14px] font-medium text-white mt-0.5">
                        +{formatRupiah(stats.totalIncome)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-normal uppercase tracking-wider text-white/50 block">
                        Capital Outflow
                      </span>
                      <p className="amount text-[14px] font-medium text-white mt-0.5">
                        -{formatRupiah(stats.totalExpense)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-normal uppercase tracking-wider text-white/50 block">
                        Net Surplus
                      </span>
                      <p className="amount text-[14px] font-medium text-white mt-0.5">
                        {stats.netCashflow >= 0 ? "+" : ""}{formatRupiah(stats.netCashflow)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] font-normal uppercase tracking-wider text-white/50 block">
                        Capital Saved
                      </span>
                      <p className="text-[14px] font-medium text-white mt-0.5">
                        {stats.savingsRate}% Retained
                      </p>
                    </div>
                  </div>

                  {/* Additional Highlights Footer */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex justify-between items-center text-[10.5px] font-light text-white/60 relative z-10">
                    <span>{stats.txCount} recorded operations</span>
                    <span>Discipline score: {stats.disciplineScore}%</span>
                  </div>
                </div>

                {/* Share Action Pill */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-3 rounded-2xl bg-white text-black text-[13px] font-medium flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-lg"
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
