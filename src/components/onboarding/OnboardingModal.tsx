import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Banknote,
  Landmark,
  Smartphone,
  PiggyBank,
  TrendingUp,
  Bell,
  Sparkles,
  Layers,
  PieChart,
  Zap,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import type { HomePresetKey } from "../../lib/widgetLayoutTypes";
import { DEFAULT_HOME_WIDGETS } from "../../lib/widgetLayoutTypes";
import {
  applyPresetToWidgets,
  loadStoredWidgets,
  STORAGE_KEY,
} from "../../lib/widgetLayoutEngine";
import { useAuth } from "../../contexts/AuthContext";
import { seedOnboardingWallets } from "../../hooks/useWallets";
import type { OnboardingWalletChoice } from "../../hooks/useWallets";
import { formatRupiah } from "../../lib/utils";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type FocusKey = "expenses" | "budget" | "domain" | "wealth" | "complete";

interface FocusOption {
  key: FocusKey;
  chipLabel: string;
  title: string;
  desc: string;
  badge: string;
  metric: string;
  subMetric: string;
  widgetPreset: HomePresetKey;
  icon: any;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    key: "expenses",
    chipLabel: "Daily Cashflow",
    title: "Daily Expenses & Cashflow",
    desc: "Fast, distraction-free logging to monitor daily burn rate.",
    badge: "Minimalist Mode",
    metric: "Daily Burn: Rp 140.000",
    subMetric: "Zero clutter · Sub-second voice & receipt entry",
    widgetPreset: "minimal",
    icon: Zap,
  },
  {
    key: "budget",
    chipLabel: "Budget & Caps",
    title: "Budgeting & Savings Discipline",
    desc: "Enforce category spending caps & reach target reserves.",
    badge: "Budget Guardian",
    metric: "Caps: 64% Utilized",
    subMetric: "Spending limit alerts & emergency reserve tracker",
    widgetPreset: "minimal",
    icon: PieChart,
  },
  {
    key: "domain",
    chipLabel: "Personal & Work",
    title: "Dual Domain Separation",
    desc: "Strictly isolate personal spending from side-projects.",
    badge: "Partitioned Books",
    metric: "Personal ↔ Business",
    subMetric: "Zero co-mingling of personal and venture funds",
    widgetPreset: "executive",
    icon: Layers,
  },
  {
    key: "wealth",
    chipLabel: "Net Worth",
    title: "Net Worth & Asset Intelligence",
    desc: "Monitor portfolio velocity, investment growth & runway.",
    badge: "Wealth Intelligence",
    metric: "+24.8% Portfolio Growth",
    subMetric: "Multi-currency assets, crypto & runway telemetry",
    widgetPreset: "executive",
    icon: TrendingUp,
  },
  {
    key: "complete",
    chipLabel: "Full Command",
    title: "Complete Financial Command",
    desc: "All-in-one comprehensive telemetry with full widget suite.",
    badge: "Executive Suite",
    metric: "All 12 Widgets Active",
    subMetric: "Forecasting, debt simulators, sankey & analytics",
    widgetPreset: "executive",
    icon: Sparkles,
  },
];

interface AccountOption {
  id: string;
  name: string;
  sub: string;
  icon: any;
  classification: "liquid" | "investment";
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  {
    id: "cash",
    name: "Physical Cash",
    sub: "Everyday wallet cash",
    icon: Banknote,
    classification: "liquid",
  },
  {
    id: "bank",
    name: "Main Bank",
    sub: "Payroll & checking (BCA)",
    icon: Landmark,
    classification: "liquid",
  },
  {
    id: "ewallet",
    name: "Digital E-Wallet",
    sub: "Mobile QRIS & payments",
    icon: Smartphone,
    classification: "liquid",
  },
  {
    id: "savings",
    name: "Savings & Reserve",
    sub: "Emergency fund cushion",
    icon: PiggyBank,
    classification: "liquid",
  },
  {
    id: "invest",
    name: "Investments & Assets",
    sub: "Stocks, funds & crypto",
    icon: TrendingUp,
    classification: "investment",
  },
];

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Focus
  const [selectedFocus, setSelectedFocus] = useState<FocusKey>("expenses");

  // Step 2: Accounts
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({
    cash: true,
    bank: true,
    ewallet: true,
    savings: false,
    invest: false,
  });

  // Step 3: Starting Balance
  const [startingBalance, setStartingBalance] = useState<number>(1500000);

  // Step 4: Daily Reminder
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderHour, setReminderHour] = useState<number>(20); // 20:00 (8 PM)

  if (!isOpen) return null;

  const currentFocus =
    FOCUS_OPTIONS.find((f) => f.key === selectedFocus) || FOCUS_OPTIONS[0];

  const handleToggleAccount = (id: string) => {
    triggerHaptic("light");
    setSelectedAccounts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleQuickAddBalance = (amount: number) => {
    triggerHaptic("medium");
    setStartingBalance((prev) => prev + amount);
  };

  const handleClearBalance = () => {
    triggerHaptic("light");
    setStartingBalance(0);
  };

  const handleNextStep = () => {
    triggerHaptic("medium");
    if (step < 4) {
      setStep((prev) => (prev + 1) as any);
    } else {
      handleComplete();
    }
  };

  const handlePrevStep = () => {
    triggerHaptic("light");
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleComplete = async () => {
    triggerSuccessHaptic();

    // 1. Build and seed selected accounts
    const chosenAccountConfigs: OnboardingWalletChoice[] = ACCOUNT_OPTIONS.filter(
      (acc) => selectedAccounts[acc.id],
    ).map((acc) => ({
      name: acc.name,
      icon: acc.name.includes("Cash")
        ? "Banknote"
        : acc.name.includes("Bank")
        ? "Landmark"
        : acc.name.includes("Wallet")
        ? "Smartphone"
        : acc.name.includes("Savings")
        ? "PiggyBank"
        : "TrendingUp",
      classification: acc.classification,
    }));

    // Fallback if user unselected everything
    if (chosenAccountConfigs.length === 0) {
      chosenAccountConfigs.push({
        name: "Main Wallet",
        icon: "Wallet",
        classification: "liquid",
      });
    }

    try {
      await seedOnboardingWallets(
        user?.id,
        chosenAccountConfigs,
        startingBalance > 0 ? startingBalance : undefined,
      );
    } catch (err) {
      console.warn("[OnboardingModal] Failed to seed wallets:", err);
    }

    // 2. Apply widget preset based on chosen focus
    try {
      const stored = loadStoredWidgets(
        localStorage.getItem(STORAGE_KEY),
        DEFAULT_HOME_WIDGETS,
      );
      const updated = applyPresetToWidgets(stored, currentFocus.widgetPreset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[OnboardingModal] Failed to write widget preset:", e);
    }

    // 3. Persist reminder preferences
    try {
      localStorage.setItem("trouvaille_streak_reminder_enabled", String(reminderEnabled));
      localStorage.setItem("trouvaille_streak_reminder_hour", String(reminderHour));
    } catch {}

    // 4. Mark onboarded
    try {
      localStorage.setItem("trouvaille_onboarding_focus", selectedFocus);
      localStorage.setItem("trouvaille_onboarded", "true");
    } catch {}

    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col justify-between overflow-hidden select-none px-4 sm:px-6"
      style={{
        background: `
          radial-gradient(ellipse 90% 55% at 50% 15%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 45%, transparent 75%),
          radial-gradient(ellipse 70% 40% at 50% 90%, rgba(255, 255, 255, 0.05) 0%, transparent 60%),
          #060608
        `,
        fontFamily: "'Urbanist', sans-serif",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
      }}
    >
      {/* ============================================================ */}
      {/* 1. CINEMATIC MONOCHROME AURORA BLOOM                         */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] rounded-full bg-white/[0.05] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-[360px] h-[360px] rounded-full bg-white/[0.04] blur-[110px]" />
      </div>

      {/* ============================================================ */}
      {/* 2. TOP NAV: STEP INDICATOR & BACK BUTTON                     */}
      {/* ============================================================ */}
      <div className="px-3 relative z-10 flex items-center justify-between pt-1">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePrevStep}
            className="w-9 h-9 rounded-full flex items-center justify-center border active:scale-95 transition-all cursor-pointer text-white/70 hover:text-white"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
        ) : (
          <div className="w-9" />
        )}

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  : s < step
                  ? "w-1.5 bg-white/40"
                  : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="w-9 text-right">
          <span className="text-[11px] font-semibold text-white/40 amount">
            0{step}/04
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. STEP CONTENT CONTAINER (AIRY, UNCLUTTERED, FLUID)         */}
      {/* ============================================================ */}
      <div className="px-3 flex-1 overflow-y-auto no-scrollbar py-2 relative z-10 flex flex-col justify-center max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* STEP 1: RESOLUSI 1 (LIVE PREVIEW CARD + SEGMENTED CHIPS) */}
          {/* ======================================================== */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 01 · Intent
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Choose your financial focus
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  Select an objective to dynamically tailor your workspace
                </p>
              </div>

              {/* 1. Live Interactive Preview Card */}
              <motion.div
                key={currentFocus.key}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full p-4 rounded-[26px] border border-white/14 bg-white/[0.035] backdrop-blur-2xl space-y-2.5 text-left"
                style={{
                  boxShadow:
                    "0 14px 32px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                      <currentFocus.icon size={12} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/70">
                      Workspace Simulation
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                    {currentFocus.badge}
                  </span>
                </div>

                <div className="p-3 rounded-[18px] bg-white/[0.04] border border-white/8 space-y-1">
                  <div className="text-[14px] font-semibold text-white tracking-tight">
                    {currentFocus.title}
                  </div>
                  <div className="text-[11px] font-semibold text-white/85">
                    {currentFocus.metric}
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    {currentFocus.subMetric}
                  </p>
                </div>
              </motion.div>

              {/* 2. Segmented Minimalist Chips Grid */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_OPTIONS.slice(0, 4).map((opt) => {
                    const isSelected = selectedFocus === opt.key;
                    const OptIcon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedFocus(opt.key);
                        }}
                        className={`py-2.5 px-2 rounded-[20px] text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer text-center border flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-white text-zinc-950 border-white shadow-lg"
                            : "bg-white/[0.035] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <OptIcon size={12} strokeWidth={1.75} className={isSelected ? "text-zinc-950" : "text-white/60"} />
                        <span>{opt.chipLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 5th Option (Full Width) */}
                {(() => {
                  const opt = FOCUS_OPTIONS[4];
                  const isSelected = selectedFocus === opt.key;
                  const OptIcon = opt.icon;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setSelectedFocus(opt.key);
                      }}
                      className={`w-full py-2.5 px-3 rounded-[20px] text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer text-center border flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-white text-zinc-950 border-white shadow-lg"
                          : "bg-white/[0.035] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <OptIcon size={12} strokeWidth={1.75} className={isSelected ? "text-zinc-950" : "text-white/60"} />
                      <span>{opt.chipLabel}</span>
                    </button>
                  );
                })()}
              </div>

              {/* Dynamic 1-sentence descriptor */}
              <p className="text-[11px] text-center text-white/45 px-2">
                {currentFocus.desc}
              </p>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: ACTIVE ACCOUNTS (COMPACT SQUIRCLE TILES GRID)     */}
          {/* ======================================================== */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 02 · Channels
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Select your active accounts
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  Only include accounts you actually use for a clean, noise-free ledger
                </p>
              </div>

              {/* 2-Column Compact Squircle Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {ACCOUNT_OPTIONS.slice(0, 4).map((acc) => {
                  const isChecked = Boolean(selectedAccounts[acc.id]);
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleToggleAccount(acc.id)}
                      className={`p-3.5 rounded-[22px] text-left transition-all active:scale-[0.98] cursor-pointer border relative overflow-hidden ${
                        isChecked
                          ? "bg-white/[0.08] border-white/28 shadow-lg"
                          : "bg-white/[0.025] border-white/8 opacity-55 hover:opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8.5 h-8.5 rounded-[13px] flex items-center justify-center border ${
                            isChecked
                              ? "bg-white/15 border-white/30 text-white"
                              : "bg-white/5 border-white/10 text-white/40"
                          }`}
                        >
                          <Icon size={16} strokeWidth={1.75} />
                        </div>
                        <div
                          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-all ${
                            isChecked
                              ? "bg-white border-white text-zinc-950"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isChecked && <Check size={10} strokeWidth={2.5} />}
                        </div>
                      </div>
                      <div className="text-[12px] font-semibold text-white leading-tight">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-white/45 mt-0.5 leading-snug">
                        {acc.sub}
                      </div>
                    </button>
                  );
                })}

                {/* 5th Option: Investments & Assets (Full Width Tile) */}
                <div className="col-span-2">
                  {(() => {
                    const acc = ACCOUNT_OPTIONS[4];
                    const isChecked = Boolean(selectedAccounts[acc.id]);
                    const Icon = acc.icon;
                    return (
                      <button
                        type="button"
                        onClick={() => handleToggleAccount(acc.id)}
                        className={`w-full p-3.5 rounded-[22px] text-left transition-all active:scale-[0.98] cursor-pointer border flex items-center justify-between ${
                          isChecked
                            ? "bg-white/[0.08] border-white/28 shadow-lg"
                            : "bg-white/[0.025] border-white/8 opacity-55 hover:opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8.5 h-8.5 rounded-[13px] flex items-center justify-center border ${
                              isChecked
                                ? "bg-white/15 border-white/30 text-white"
                                : "bg-white/5 border-white/10 text-white/40"
                            }`}
                          >
                            <Icon size={16} strokeWidth={1.75} />
                          </div>
                          <div>
                            <div className="text-[12px] font-semibold text-white leading-tight">
                              {acc.name}
                            </div>
                            <div className="text-[11px] text-white/45">
                              {acc.sub}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-all ${
                            isChecked
                              ? "bg-white border-white text-zinc-950"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isChecked && <Check size={10} strokeWidth={2.5} />}
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: STARTING BASELINE (MINIMAL LUXURY TYPOGRAPHY)     */}
          {/* ======================================================== */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="space-y-5 text-center"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 03 · Starting Baseline
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Set starting cash balance
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  Seeds your baseline Net Worth so your analytics start with real figures
                </p>
              </div>

              {/* Clean Floating Number Centerpiece (No Heavy Bounding Box) */}
              <div className="py-3">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest block mb-1">
                  Primary Liquid Reserve
                </span>
                <div className="text-[38px] sm:text-[44px] font-semibold text-white tracking-tight amount leading-none">
                  {formatRupiah(startingBalance)}
                </div>
                <p className="text-[11px] text-white/40 mt-2">
                  Can be adjusted anytime from Wallet Management
                </p>
              </div>

              {/* Quick Preset Chips */}
              <div className="space-y-2.5 max-w-xs mx-auto">
                <div className="grid grid-cols-4 gap-2">
                  {[250000, 500000, 1000000, 5000000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleQuickAddBalance(inc)}
                      className="py-2.5 px-1 rounded-[16px] text-[11px] font-semibold amount border active:scale-95 transition-all cursor-pointer text-white text-center hover:bg-white/10"
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}K`}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleClearBalance}
                    className="text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    Reset to Rp 0
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: DAILY HABIT & REMINDER (COMPACT LUMINOUS DIAL)    */}
          {/* ======================================================== */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="space-y-4 text-center"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 04 · Habit Formation
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Daily Logging Routine
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  A subtle evening nudge to capture your day's outlays under 5 seconds
                </p>
              </div>

              {/* Compact Luminous Glass Pod */}
              <div
                className="p-5 rounded-[28px] relative overflow-hidden border flex flex-col items-center justify-center space-y-4"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(32px)",
                  WebkitBackdropFilter: "blur(32px)",
                  borderColor: "rgba(255, 255, 255, 0.14)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                }}
              >
                {/* Switch Bar */}
                <div className="w-full flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Bell size={15} strokeWidth={1.75} className="text-white/80" />
                    <span className="text-[13px] font-semibold text-white">
                      Daily Evening Nudge
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setReminderEnabled(!reminderEnabled);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer border ${
                      reminderEnabled
                        ? "bg-white border-white"
                        : "bg-white/10 border-white/10"
                    }`}
                  >
                    <motion.div
                      animate={{ x: reminderEnabled ? 20 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`w-5 h-5 rounded-full shadow-sm ${
                        reminderEnabled ? "bg-zinc-950" : "bg-white/60"
                      }`}
                    />
                  </button>
                </div>

                {/* Minimal LED Time Display */}
                <div className="py-1">
                  <div className="text-[42px] font-semibold tracking-wider text-white amount leading-none">
                    {reminderHour}:00
                  </div>
                  <span className="text-[11px] font-medium text-white/45 tracking-wider uppercase block mt-1.5">
                    {reminderHour === 20 ? "8:00 PM · Evening Catchup" : `${reminderHour}:00 Local Time`}
                  </span>
                </div>

                {/* Hour Selectors */}
                <div className="flex items-center gap-2">
                  {[19, 20, 21, 22].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setReminderHour(h);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold amount border transition-all cursor-pointer ${
                        reminderHour === h
                          ? "bg-white text-zinc-950 border-white"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {h}:00
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM ACTION PILL                                        */}
      {/* ============================================================ */}
      <div className="px-3 relative z-10 pt-2 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={handleNextStep}
          className="w-full py-3.5 rounded-[22px] font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 shadow-xl flex items-center justify-center gap-2"
          style={{
            boxShadow:
              "0 10px 30px rgba(255, 255, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
          }}
        >
          <span>{step === 4 ? "Enter Trouvaille" : "Continue"}</span>
          <ArrowRight size={16} strokeWidth={2} />
        </button>

        {step === 3 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setStartingBalance(0);
                setStep(4);
              }}
              className="text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              Skip baseline balance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
