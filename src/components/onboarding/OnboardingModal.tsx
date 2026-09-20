import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
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
  title: string;
  desc: string;
  badge: string;
  widgetPreset: HomePresetKey;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    key: "expenses",
    title: "Daily Expenses & Cashflow",
    desc: "Fast logging to monitor burn rate with zero clutter",
    badge: "Minimalist",
    widgetPreset: "minimal",
  },
  {
    key: "budget",
    title: "Budgeting & Spending Caps",
    desc: "Enforce category spending caps and reach target reserves",
    badge: "Disciplined",
    widgetPreset: "minimal",
  },
  {
    key: "domain",
    title: "Dual Domain Separation",
    desc: "Strictly isolate personal spending from side-projects",
    badge: "Partitioned",
    widgetPreset: "executive",
  },
  {
    key: "wealth",
    title: "Net Worth & Asset Velocity",
    desc: "Monitor portfolio velocity, investments and runway",
    badge: "Wealth",
    widgetPreset: "executive",
  },
  {
    key: "complete",
    title: "Complete Financial Command",
    desc: "Full comprehensive telemetry with complete widget suite",
    badge: "Executive",
    widgetPreset: "executive",
  },
];

interface AccountOption {
  id: string;
  name: string;
  sub: string;
  classification: "liquid" | "investment";
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  {
    id: "cash",
    name: "Physical Cash",
    sub: "Everyday wallet cash & daily liquidity",
    classification: "liquid",
  },
  {
    id: "bank",
    name: "Main Bank",
    sub: "Payroll & checking account (e.g. BCA, Mandiri)",
    classification: "liquid",
  },
  {
    id: "ewallet",
    name: "Digital E-Wallet",
    sub: "Mobile QRIS & micro payments (GoPay, OVO)",
    classification: "liquid",
  },
  {
    id: "savings",
    name: "Savings & Reserve",
    sub: "Emergency fund cushion & high-yield vault",
    classification: "liquid",
  },
  {
    id: "invest",
    name: "Investments & Assets",
    sub: "Capital market stocks, mutual funds & crypto",
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
          radial-gradient(ellipse 90% 55% at 50% 15%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 45%, transparent 75%),
          radial-gradient(ellipse 70% 40% at 50% 90%, rgba(255, 255, 255, 0.04) 0%, transparent 60%),
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
        <div className="absolute top-1/4 -left-32 w-[380px] h-[380px] rounded-full bg-white/[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-[340px] h-[340px] rounded-full bg-white/[0.03] blur-[110px]" />
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
      {/* 3. STEP CONTENT CONTAINER (RESOLUSI 2: SINGLE GLASS SHEET)   */}
      {/* ============================================================ */}
      <div className="px-2 flex-1 overflow-y-auto no-scrollbar py-2 relative z-10 flex flex-col justify-center max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* STEP 1: FINANCIAL FOCUS (APPLE INSET GROUPED TABLE)      */}
          {/* ======================================================== */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 01 · Objective
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Choose financial focus
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  Configure your workspace hierarchy and default widgets
                </p>
              </div>

              {/* Single Glass Sheet (Apple Settings Inset Grouped Table) */}
              <div
                className="rounded-[24px] overflow-hidden border border-white/12 bg-white/[0.035] backdrop-blur-2xl divide-y divide-white/[0.06]"
                style={{
                  boxShadow:
                    "0 16px 36px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                }}
              >
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
                      className={`w-full px-4 py-3.5 text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white/[0.07] opacity-100"
                          : "opacity-60 hover:opacity-85 active:bg-white/[0.04]"
                      }`}
                    >
                      <div className="space-y-0.5 pr-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[13px] font-semibold tracking-tight ${
                              isSelected ? "text-white" : "text-white/80"
                            }`}
                          >
                            {opt.title}
                          </span>
                          {opt.badge && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/12 whitespace-nowrap">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/45 leading-snug">
                          {opt.desc}
                        </p>
                      </div>

                      {/* Apple Settings Checkmark Indicator */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                          isSelected
                            ? "bg-white border-white text-zinc-950 shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={2.75} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: ACTIVE CHANNELS (APPLE INSET SWITCH TABLE)        */}
          {/* ======================================================== */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 02 · Channels
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Active accounts
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  Toggle channels you actively use for a clean, noise-free ledger
                </p>
              </div>

              {/* Single Glass Sheet (Apple Settings Inset Grouped Table with Switches) */}
              <div
                className="rounded-[24px] overflow-hidden border border-white/12 bg-white/[0.035] backdrop-blur-2xl divide-y divide-white/[0.06]"
                style={{
                  boxShadow:
                    "0 16px 36px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                }}
              >
                {ACCOUNT_OPTIONS.map((acc) => {
                  const isChecked = Boolean(selectedAccounts[acc.id]);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleToggleAccount(acc.id)}
                      className={`w-full px-4 py-3.5 flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? "bg-white/[0.05] opacity-100"
                          : "opacity-60 hover:opacity-85 active:bg-white/[0.03]"
                      }`}
                    >
                      <div className="space-y-0.5 pr-3 min-w-0">
                        <div className="text-[13px] font-semibold text-white tracking-tight">
                          {acc.name}
                        </div>
                        <p className="text-[11px] text-white/45 leading-snug">
                          {acc.sub}
                        </p>
                      </div>

                      {/* Apple iOS Switch (w-10 h-5.5 with w-4.5 h-4.5 knob) */}
                      <div
                        className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                          isChecked
                            ? "bg-white border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                            : "bg-white/10 border-white/10"
                        }`}
                      >
                        <motion.div
                          animate={{ x: isChecked ? 18 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 32 }}
                          className={`w-4.5 h-4.5 rounded-full shadow-sm ${
                            isChecked ? "bg-zinc-950" : "bg-white/60"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: STARTING BASELINE (SINGLE GLASS INSET CARD)       */}
          {/* ======================================================== */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 03 · Starting Baseline
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Set starting balance
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  Seeds your baseline Net Worth so your analytics start with real figures
                </p>
              </div>

              {/* Single Glass Sheet (Apple Settings Inset Grouped Table) */}
              <div
                className="rounded-[24px] overflow-hidden border border-white/12 bg-white/[0.035] backdrop-blur-2xl divide-y divide-white/[0.06]"
                style={{
                  boxShadow:
                    "0 16px 36px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                }}
              >
                {/* Row 1: Readout */}
                <div className="px-5 py-6 text-center space-y-1 bg-white/[0.02]">
                  <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
                    Primary Liquid Reserve
                  </span>
                  <div className="text-[36px] sm:text-[40px] font-semibold text-white tracking-tight amount leading-tight">
                    {formatRupiah(startingBalance)}
                  </div>
                  <span className="text-[11px] text-white/40 block">
                    Adjustable anytime from Wallet Management
                  </span>
                </div>

                {/* Row 2: Segmented Quick Presets */}
                <div className="p-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[250000, 500000, 1000000, 5000000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => handleQuickAddBalance(inc)}
                        className="py-2.5 px-1 rounded-[16px] text-[11px] font-semibold amount border border-white/10 bg-white/[0.04] active:scale-95 transition-all cursor-pointer text-white text-center hover:bg-white/10"
                      >
                        +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}K`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Reset Row */}
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-white/40">Reset to baseline zero</span>
                  <button
                    type="button"
                    onClick={handleClearBalance}
                    className="text-[11px] font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    Reset to Rp 0
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: DAILY HABIT (APPLE INSET TOGGLE & TIME ROW)       */}
          {/* ======================================================== */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase block">
                  Step 04 · Habit Formation
                </span>
                <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                  Daily logging routine
                </h1>
                <p className="text-[12px] font-normal text-white/50 leading-snug max-w-xs mx-auto">
                  A subtle evening nudge to capture your day's outlays under 5 seconds
                </p>
              </div>

              {/* Single Glass Sheet (Apple Settings Inset Grouped Table) */}
              <div
                className="rounded-[24px] overflow-hidden border border-white/12 bg-white/[0.035] backdrop-blur-2xl divide-y divide-white/[0.06]"
                style={{
                  boxShadow:
                    "0 16px 36px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                }}
              >
                {/* Row 1: Evening Nudge Switch */}
                <div
                  onClick={() => {
                    triggerHaptic("medium");
                    setReminderEnabled(!reminderEnabled);
                  }}
                  className="px-4 py-3.5 flex items-center justify-between transition-all cursor-pointer bg-white/[0.04] active:bg-white/[0.07]"
                >
                  <div className="space-y-0.5 pr-3 min-w-0">
                    <div className="text-[13px] font-semibold text-white tracking-tight">
                      Daily Evening Nudge
                    </div>
                    <p className="text-[11px] text-white/45 leading-snug">
                      Capture daily expenses in under 5 seconds
                    </p>
                  </div>

                  {/* Apple iOS Switch */}
                  <div
                    className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 border ${
                      reminderEnabled
                        ? "bg-white border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                        : "bg-white/10 border-white/10"
                    }`}
                  >
                    <motion.div
                      animate={{ x: reminderEnabled ? 18 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      className={`w-4.5 h-4.5 rounded-full shadow-sm ${
                        reminderEnabled ? "bg-zinc-950" : "bg-white/60"
                      }`}
                    />
                  </div>
                </div>

                {/* Row 2: Scheduled Time & Hour Selectors */}
                <div
                  className={`p-4 space-y-3 transition-opacity ${
                    reminderEnabled ? "opacity-100" : "opacity-35 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/50">Scheduled Local Time</span>
                    <span className="text-[18px] font-semibold text-white amount">
                      {reminderHour}:00
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[19, 20, 21, 22].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setReminderHour(h);
                        }}
                        className={`py-2 rounded-[14px] text-[11px] font-semibold amount border transition-all cursor-pointer text-center ${
                          reminderHour === h
                            ? "bg-white text-zinc-950 border-white shadow-md"
                            : "bg-white/5 text-white/60 border-white/10 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {h}:00
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM ACTION PILL                                        */}
      {/* ============================================================ */}
      <div className="px-2 relative z-10 pt-2 max-w-sm mx-auto w-full">
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
