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
  num: string;
  title: string;
  desc: string;
  widgetPreset: HomePresetKey;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    key: "expenses",
    num: "01",
    title: "Daily Expenses & Cashflow",
    desc: "Capture everyday outlays & monitor daily burn rate.",
    widgetPreset: "minimal",
  },
  {
    key: "budget",
    num: "02",
    title: "Budgeting & Savings Discipline",
    desc: "Enforce category spending caps & reach target reserves.",
    widgetPreset: "minimal",
  },
  {
    key: "domain",
    num: "03",
    title: "Dual Domain (Personal & Work)",
    desc: "Strictly isolate personal expenses from side-hustles & projects.",
    widgetPreset: "executive",
  },
  {
    key: "wealth",
    num: "04",
    title: "Net Worth & Asset Intelligence",
    desc: "Monitor portfolio velocity, investment allocations & growth.",
    widgetPreset: "executive",
  },
  {
    key: "complete",
    num: "05",
    title: "Complete Financial Command",
    desc: "All-in-one comprehensive telemetry with full widget suite.",
    widgetPreset: "executive",
  },
];

interface AccountOption {
  id: string;
  name: string;
  sub: string;
  icon: any;
  classification: "liquid" | "investment";
  defaultSelected: boolean;
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  {
    id: "cash",
    name: "Physical Cash",
    sub: "Wallet cash & everyday paper notes",
    icon: Banknote,
    classification: "liquid",
    defaultSelected: true,
  },
  {
    id: "bank",
    name: "Main Bank Account",
    sub: "Payroll & daily checking account (e.g. BCA, Mandiri)",
    icon: Landmark,
    classification: "liquid",
    defaultSelected: true,
  },
  {
    id: "ewallet",
    name: "Digital E-Wallet",
    sub: "Quick mobile QRIS & payments (e.g. GoPay, OVO, Dana)",
    icon: Smartphone,
    classification: "liquid",
    defaultSelected: true,
  },
  {
    id: "savings",
    name: "Savings & Reserve",
    sub: "Emergency fund & high-yield cushion",
    icon: PiggyBank,
    classification: "liquid",
    defaultSelected: false,
  },
  {
    id: "invest",
    name: "Investments & Holdings",
    sub: "Stocks, mutual funds, or crypto assets",
    icon: TrendingUp,
    classification: "investment",
    defaultSelected: false,
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
          radial-gradient(ellipse 90% 55% at 50% 15%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 45%, transparent 75%),
          radial-gradient(ellipse 70% 40% at 50% 90%, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
          #060608
        `,
        fontFamily: "'Urbanist', sans-serif",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 20px), 28px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
      }}
    >
      {/* ============================================================ */}
      {/* 1. CINEMATIC MONOCHROME AURORA BLOOM (SOFT GLOW) */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-[420px] h-[420px] rounded-full bg-white/[0.065] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-[380px] h-[380px] rounded-full bg-white/[0.045] blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-white/[0.03] blur-[140px]" />
      </div>

      {/* ============================================================ */}
      {/* 2. TOP NAV: STEP INDICATOR & BACK BUTTON */}
      {/* ============================================================ */}
      <div className="px-6 relative z-10 flex items-center justify-between pt-1">
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
                  ? "w-6 bg-white"
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
      {/* 3. STEP CONTENT CAROUSEL */}
      {/* ============================================================ */}
      <div className="px-6 flex-1 overflow-y-auto no-scrollbar py-3 relative z-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* -------------------------------------------------------- */}
          {/* STEP 1: FINANCIAL FOCUS (MONVEO-STYLE GOALS) */}
          {/* -------------------------------------------------------- */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10.5px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 01 · Intent
                </span>
                <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">
                  What is your primary financial focus?
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-snug">
                  Choose the objective that reflects your lifestyle and telemetry needs
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {FOCUS_OPTIONS.map((opt) => {
                  const isSelected = selectedFocus === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setSelectedFocus(opt.key);
                      }}
                      className="w-full p-4 rounded-[26px] text-left transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden group"
                      style={{
                        background: isSelected
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.025)",
                        backdropFilter: "blur(28px)",
                        WebkitBackdropFilter: "blur(28px)",
                        border: isSelected
                          ? "1px solid rgba(255, 255, 255, 0.3)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: isSelected
                          ? "0 12px 30px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)"
                          : "none",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <span
                            className="text-[12px] font-bold amount pt-0.5 tracking-wider"
                            style={{
                              color: isSelected
                                ? "rgba(255, 255, 255, 0.9)"
                                : "rgba(255, 255, 255, 0.35)",
                            }}
                          >
                            {opt.num}
                          </span>
                          <div className="space-y-0.5">
                            <h3
                              className="text-[14px] font-semibold leading-tight"
                              style={{
                                color: isSelected
                                  ? "#ffffff"
                                  : "rgba(255, 255, 255, 0.85)",
                              }}
                            >
                              {opt.title}
                            </h3>
                            <p className="text-[12px] font-normal text-white/50 leading-relaxed">
                              {opt.desc}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                            isSelected
                              ? "bg-white border-white text-zinc-950"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={2.5} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 2: ACTIVE PAYMENT ACCOUNTS (CLEAN SEEDING) */}
          {/* -------------------------------------------------------- */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10.5px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 02 · Accounts
                </span>
                <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Select your active accounts
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-snug">
                  Only include accounts you actually use for a distraction-free ledger
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {ACCOUNT_OPTIONS.map((acc) => {
                  const isChecked = Boolean(selectedAccounts[acc.id]);
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleToggleAccount(acc.id)}
                      className="w-full p-3.5 rounded-[24px] text-left transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden"
                      style={{
                        background: isChecked
                          ? "rgba(255, 255, 255, 0.065)"
                          : "rgba(255, 255, 255, 0.02)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: isChecked
                          ? "1px solid rgba(255, 255, 255, 0.22)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-[16px] flex items-center justify-center border"
                            style={{
                              background: isChecked
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(255, 255, 255, 0.04)",
                              borderColor: isChecked
                                ? "rgba(255, 255, 255, 0.25)"
                                : "rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <Icon
                              size={17}
                              strokeWidth={1.75}
                              className={isChecked ? "text-white" : "text-white/50"}
                            />
                          </div>
                          <div>
                            <h4
                              className="text-[13.5px] font-semibold leading-tight"
                              style={{
                                color: isChecked ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                              }}
                            >
                              {acc.name}
                            </h4>
                            <p className="text-[11px] font-normal text-white/45">
                              {acc.sub}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isChecked
                              ? "bg-white border-white text-zinc-950"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={2.5} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 3: STARTING BALANCE (THE "AHA!" MOMENT) */}
          {/* -------------------------------------------------------- */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <span className="text-[10.5px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 03 · Starting Baseline
                </span>
                <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Set starting cash balance
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-snug">
                  Seeds your baseline Net Worth so your analytics start with real data
                </p>
              </div>

              {/* Central Luminous Number Card */}
              <div
                className="p-6 rounded-[32px] text-center relative overflow-hidden border"
                style={{
                  background: "rgba(255, 255, 255, 0.035)",
                  backdropFilter: "blur(32px)",
                  WebkitBackdropFilter: "blur(32px)",
                  borderColor: "rgba(255, 255, 255, 0.14)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                }}
              >
                <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider block">
                  Primary Account Balance
                </span>
                <div className="text-[34px] font-semibold text-white tracking-tight amount mt-2 leading-none">
                  {formatRupiah(startingBalance)}
                </div>
                <p className="text-[11px] font-normal text-white/45 mt-2">
                  Can be adjusted anytime from Wallet Management
                </p>
              </div>

              {/* Quick Increment Chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-white/50 block">
                  Quick Amount Presets
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[250000, 500000, 1000000, 5000000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleQuickAddBalance(inc)}
                      className="py-2.5 px-1 rounded-[16px] text-[11px] font-semibold amount border active:scale-95 transition-all cursor-pointer text-white text-center"
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}K`}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
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

          {/* -------------------------------------------------------- */}
          {/* STEP 4: DAILY HABIT & REMINDER (MEDIA REFERENCE) */}
          {/* -------------------------------------------------------- */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10.5px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 04 · Habit Formation
                </span>
                <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Daily Logging Reminder
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-snug">
                  Protect your daily streak and capture expenses in under 5 seconds
                </p>
              </div>

              {/* Luminous Bloom Dial Pod (Inspired by media_1789874376503.png) */}
              <div
                className="p-6 rounded-[34px] relative overflow-hidden border flex flex-col items-center justify-center min-h-[220px]"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(36px)",
                  WebkitBackdropFilter: "blur(36px)",
                  borderColor: "rgba(255, 255, 255, 0.14)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                }}
              >
                {/* Central Soft Monochrome Glow Sphere */}
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.35, 0.6, 0.35],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute w-48 h-48 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
                  }}
                />

                {/* Top Pill Switch */}
                <div className="w-full flex items-center justify-between relative z-10 px-2">
                  <div className="flex items-center gap-2">
                    <Bell size={15} strokeWidth={1.75} className="text-white/80" />
                    <span className="text-[13px] font-semibold text-white">
                      Daily Reminder
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

                {/* Dotted LED Time Display */}
                <div className="my-6 text-center relative z-10">
                  <div className="text-[44px] font-semibold tracking-wider text-white amount leading-none">
                    {reminderHour}:00
                  </div>
                  <span className="text-[11px] font-medium text-white/45 tracking-widest uppercase block mt-1.5">
                    {reminderHour === 20 ? "8:00 PM · Evening Nudge" : `${reminderHour}:00 Local Time`}
                  </span>
                </div>

                {/* Hour Selectors */}
                <div className="flex items-center gap-2 relative z-10">
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
      {/* 4. BOTTOM ACTION PILL */}
      {/* ============================================================ */}
      <div className="px-6 relative z-10 pt-2">
        <button
          type="button"
          onClick={handleNextStep}
          className="w-full py-4 rounded-[24px] font-semibold text-[14px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 shadow-xl flex items-center justify-center gap-2"
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
