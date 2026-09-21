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
  X,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { DEFAULT_HOME_WIDGETS } from "../../lib/widgetLayoutTypes";
import {
  applyPresetToWidgets,
  loadStoredWidgets,
  STORAGE_KEY,
} from "../../lib/widgetLayoutEngine";
import { useAuth } from "../../contexts/AuthContext";
import { seedOnboardingWallets } from "../../hooks/useWallets";
import type { OnboardingWalletChoice } from "../../hooks/useWallets";
import {
  ArchetypeCardSelector,
  ARCHETYPE_ITEMS,
} from "./ArchetypeCardSelector";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type FocusKey = "expenses" | "budget" | "domain" | "wealth" | "complete";

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
    sub: "Everyday physical currency",
    icon: Banknote,
    classification: "liquid",
  },
  {
    id: "bank",
    name: "Checking & Bank",
    sub: "Direct deposit & checking accounts",
    icon: Landmark,
    classification: "liquid",
  },
  {
    id: "ewallet",
    name: "Digital E-Wallet",
    sub: "Mobile QR & digital payments",
    icon: Smartphone,
    classification: "liquid",
  },
  {
    id: "savings",
    name: "Savings & Reserve",
    sub: "Emergency buffer cushion",
    icon: PiggyBank,
    classification: "liquid",
  },
  {
    id: "invest",
    name: "Investments & Assets",
    sub: "Stocks, funds, crypto & bullion",
    icon: TrendingUp,
    classification: "investment",
  },
];

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Step 1: Focus
  const [selectedFocus, setSelectedFocus] = useState<FocusKey>("expenses");

  // Step 2: Name & Preset mode
  const [userName, setUserName] = useState<string>(() => {
    return (
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      ""
    );
  });
  const [presetMode, setPresetMode] = useState<"default" | "custom">("default");

  // Step 3: Accounts
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({
    cash: true,
    bank: true,
    ewallet: true,
    savings: false,
    invest: false,
  });

  // Step 4: Starting Balance
  const [startingBalance, setStartingBalance] = useState<number>(0);

  // Step 5: Daily Reminder
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderHour, setReminderHour] = useState<number>(20); // 20:00 (8 PM)

  if (!isOpen) return null;

  const currentFocus =
    ARCHETYPE_ITEMS.find((f) => f.key === selectedFocus) || ARCHETYPE_ITEMS[0];

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
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (presetMode === "default") {
        setSelectedAccounts({
          cash: true,
          bank: true,
          ewallet: true,
          savings: false,
          invest: false,
        });
        setStep(4);
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else {
      handleComplete();
    }
  };

  const handlePrevStep = () => {
    triggerHaptic("light");
    if (step === 4 && presetMode === "default") {
      setStep(2);
    } else if (step > 1) {
      setStep((prev) => prev - 1);
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

    // 3. Persist reminder preferences & request notification permission if enabled
    if (
      reminderEnabled &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    try {
      localStorage.setItem("trouvaille_streak_reminder_enabled", String(reminderEnabled));
      localStorage.setItem("trouvaille_streak_reminder_hour", String(reminderHour));
    } catch {}

    // 4. Persist user name and preset mode
    if (userName.trim()) {
      try {
        localStorage.setItem("trouvaille_user_name", userName.trim());
      } catch {}
    }
    try {
      localStorage.setItem("trouvaille_preset_mode", presetMode);
    } catch {}

    // 5. Mark onboarded
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
        {(() => {
          const totalSteps = presetMode === "default" ? 4 : 5;
          const currentStepNumber =
            presetMode === "default" && step >= 4 ? step - 1 : step;
          return (
            <>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      s === currentStepNumber
                        ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                        : s < currentStepNumber
                        ? "w-1.5 bg-white/40"
                        : "w-1.5 bg-white/15"
                    }`}
                  />
                ))}
              </div>

              <div className="w-9 text-right">
                <span className="text-[11px] font-semibold text-white/40 amount">
                  0{currentStepNumber}/0{totalSteps}
                </span>
              </div>
            </>
          );
        })()}
      </div>

      {/* ============================================================ */}
      {/* 3. STEP CONTENT CONTAINER (AIRY, UNCLUTTERED, FLUID)         */}
      {/* ============================================================ */}
      <div className="px-3 sm:px-4 flex-1 overflow-y-auto no-scrollbar py-3 relative z-10 flex flex-col justify-center max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* STEP 1: IDENTITY & WORKSPACE ARCHITECTURE PRESET         */}
          {/* ======================================================== */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-5 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    Step 01
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    Identity & Setup
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  Welcome to <span className="font-semibold">Trouvaille</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  Personalize your caller identity and select your starting workspace architecture.
                </p>
              </div>

              {/* 1. Name Input: Unboxed Luxury Hairline */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/40 tracking-wider uppercase block">
                  Your Name / Identity
                </label>
                <div className="relative flex items-center border-b border-white/15 focus-within:border-white transition-colors py-1.5">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Alexander"
                    className="w-full bg-transparent text-[17px] sm:text-[19px] font-medium text-white placeholder:text-white/25 outline-none pr-8 transition-colors"
                  />
                  {userName.trim() && (
                    <button
                      type="button"
                      onClick={() => setUserName("")}
                      className="text-white/30 hover:text-white/70 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Preset Selection (Default vs Custom) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-white/40 tracking-wider uppercase block">
                    Workspace Architecture
                  </label>
                  <span className="text-[11px] text-white/40">
                    {presetMode === "default" ? "Standard Curated" : "Custom Blueprint"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Option A: Preset Default */}
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      setPresetMode("default");
                    }}
                    className={`group p-4 rounded-[20px] text-left transition-all duration-300 border cursor-pointer relative ${
                      presetMode === "default"
                        ? "bg-white/[0.06] border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                        : "bg-white/[0.02] border-white/8 opacity-55 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-white tracking-tight">
                            Default Curated Preset
                          </span>
                          <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[12px] text-white/50 leading-relaxed">
                          Instant zero-friction setup. Auto-provisions 3 liquid accounts and 8 essential categories.
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                          presetMode === "default"
                            ? "bg-white border-white text-zinc-950"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {presetMode === "default" && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-white/[0.06]">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60 border border-white/10">
                        Physical Cash
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60 border border-white/10">
                        Checking & Bank
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60 border border-white/10">
                        Digital E-Wallet
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60 border border-white/10">
                        +8 Core Categories
                      </span>
                    </div>
                  </div>

                  {/* Option B: Custom */}
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      setPresetMode("custom");
                    }}
                    className={`group p-4 rounded-[20px] text-left transition-all duration-300 border cursor-pointer relative ${
                      presetMode === "custom"
                        ? "bg-white/[0.06] border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                        : "bg-white/[0.02] border-white/8 opacity-55 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[14px] font-semibold text-white tracking-tight block">
                          Custom Architecture
                        </span>
                        <p className="text-[12px] text-white/50 leading-relaxed">
                          Handpick your starting channels in the next step. Custom bank accounts, credit lines, and personal categories can be tailored anytime in Settings.
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                          presetMode === "custom"
                            ? "bg-white border-white text-zinc-950"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {presetMode === "custom" && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: LUXURY ARCHETYPE TELEMETRY CARD SELECTOR         */}
          {/* ======================================================== */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-3 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1.5 text-left mb-1">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    Step 02
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    Financial Focus
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  Choose your <span className="font-semibold">archetype</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  Calibrate your home dashboard widgets, metrics, and tracking priority.
                </p>
              </div>

              <ArchetypeCardSelector
                items={ARCHETYPE_ITEMS}
                activeIndex={Math.max(
                  0,
                  ARCHETYPE_ITEMS.findIndex((f) => f.key === selectedFocus),
                )}
                onActiveChange={(item) => setSelectedFocus(item.key as FocusKey)}
              />
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: ACTIVE ACCOUNTS (CUSTOM MODE ONLY)               */}
          {/* ======================================================== */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-5 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    Step 03
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    Active Channels
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  Select active <span className="font-semibold">accounts</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  Toggle the payment channels you transact with regularly for a noise-free ledger.
                </p>
              </div>

              {/* Open, unboxed vertical list with hairline dividers */}
              <div className="divide-y divide-white/[0.07] border-y border-white/[0.08]">
                {ACCOUNT_OPTIONS.map((acc) => {
                  const isChecked = Boolean(selectedAccounts[acc.id]);
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleToggleAccount(acc.id)}
                      className="w-full py-3.5 px-1 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                            isChecked
                              ? "bg-white/10 border-white/25 text-white"
                              : "bg-white/[0.03] border-white/10 text-white/40 group-hover:text-white/70"
                          }`}
                        >
                          <Icon size={16} strokeWidth={1.75} />
                        </div>
                        <div>
                          <div
                            className={`text-[13px] font-medium tracking-tight transition-colors ${
                              isChecked ? "text-white" : "text-white/50"
                            }`}
                          >
                            {acc.name}
                          </div>
                          <div className="text-[11px] text-white/40 mt-0.5">
                            {acc.sub}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isChecked
                            ? "bg-white border-white text-zinc-950"
                            : "border-white/20 bg-transparent group-hover:border-white/40"
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: STARTING BASELINE (OPEN FLUID NUMBER DISPLAY)     */}
          {/* ======================================================== */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    {presetMode === "default" ? "Step 03" : "Step 04"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    Starting Baseline
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  Initial <span className="font-semibold">cash reserve</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  Input your starting liquid balance to calibrate Net Worth calculations accurately.
                </p>
              </div>

              {/* Unboxed fluid balance input */}
              <div className="space-y-6">
                <div className="space-y-2 border-b border-white/15 pb-3 focus-within:border-white transition-colors">
                  <label className="text-[11px] font-semibold text-white/40 tracking-wider uppercase block">
                    Liquid Balance (IDR)
                  </label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[20px] sm:text-[22px] font-light text-white/40 select-none">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={startingBalance === 0 ? "" : startingBalance.toLocaleString("id-ID")}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setStartingBalance(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="0"
                      className="w-full text-[34px] sm:text-[40px] font-light tracking-tight text-white amount leading-none bg-transparent outline-none placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Quick Increment Chips */}
                <div className="space-y-2">
                  <span className="text-[11px] text-white/40 font-medium block">
                    Quick additive chips
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[250000, 500000, 1000000, 5000000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => handleQuickAddBalance(inc)}
                        className="py-1.5 px-3 rounded-full text-[12px] font-medium amount border active:scale-95 transition-all cursor-pointer text-white/80 border-white/15 hover:border-white/40 hover:text-white bg-white/[0.04]"
                      >
                        +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}K`}
                      </button>
                    ))}
                    {startingBalance > 0 && (
                      <button
                        type="button"
                        onClick={handleClearBalance}
                        className="py-1.5 px-3 rounded-full text-[12px] font-medium text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                      >
                        Reset to 0
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: DAILY LOGGING ROUTINE (HABIT FORMATION)           */}
          {/* ======================================================== */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    {presetMode === "default" ? "Step 04" : "Step 05"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    Habit Rhythm
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  Daily <span className="font-semibold">evening nudge</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  A subtle prompt to record your day's outlays under 5 seconds so streaks stay unbroken.
                </p>
              </div>

              {/* Feature Toggle Row (Strictly adheres to GEMINI.md Rule 3) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-[14px] font-semibold text-white">
                      Daily Routine Reminder
                    </div>
                    <div className="text-[11px] text-white/45 leading-relaxed">
                      Silent prompt each evening to capture transactions
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={reminderEnabled}
                    onClick={() => {
                      triggerHaptic("medium");
                      setReminderEnabled(!reminderEnabled);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 border ${
                      reminderEnabled
                        ? "bg-white border-white"
                        : "bg-white/10 border-white/15 opacity-60"
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

                {/* Schedule Selector */}
                <div className={`space-y-3 transition-opacity duration-300 ${reminderEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                  <div className="flex items-baseline justify-between">
                    <label className="text-[11px] font-semibold text-white/40 tracking-wider uppercase block">
                      Scheduled Time
                    </label>
                    <span className="text-[12px] font-medium text-white/60 amount">
                      {reminderHour}:00 Local Time
                    </span>
                  </div>

                  {/* Hour Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {[18, 19, 20, 21, 22].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setReminderHour(h);
                        }}
                        className={`py-2 px-3.5 rounded-full text-[12px] font-medium amount border transition-all cursor-pointer shrink-0 ${
                          reminderHour === h
                            ? "bg-white text-zinc-950 border-white font-semibold shadow-md"
                            : "bg-white/[0.04] text-white/60 border-white/10 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        {h}:00
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-white/40 leading-relaxed pt-1">
                    Trouvaille runs silently in the background without disturbing your device focus mode.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM ACTION PILL                                        */}
      {/* ============================================================ */}
      <div className="px-3 sm:px-4 relative z-10 pt-2 max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={handleNextStep}
          className="w-full py-3.5 rounded-full font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(255,255,255,0.15)] hover:bg-white/95"
        >
          <span>{step === 5 ? "Enter Trouvaille" : "Continue"}</span>
          <ArrowRight size={15} strokeWidth={2} />
        </button>

        {step === 4 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setStartingBalance(0);
                setStep(5);
              }}
              className="text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors cursor-pointer"
            >
              Skip baseline balance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
