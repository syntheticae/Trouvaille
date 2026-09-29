import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Banknote,
  Landmark,
  Smartphone,
  TrendingUp,
  Globe,
  Coins,
  X,
  Zap,
  ChevronRight,
  Search,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { DEFAULT_HOME_WIDGETS } from "../../lib/widgetLayoutTypes";
import {
  applyPresetToWidgets,
  loadStoredWidgets,
  STORAGE_KEY,
} from "../../lib/widgetLayoutEngine";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  useCurrency,
  CURRENCY_METADATA,
  type SupportedCurrency,
} from "../../contexts/CurrencyContext";
import { BottomSheet } from "../ui/BottomSheet";
import { seedOnboardingWallets } from "../../hooks/useWallets";
import type { OnboardingWalletChoice } from "../../hooks/useWallets";
import {
  ArchetypeCardSelector,
  getArchetypeItems,
} from "./ArchetypeCardSelector";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { generateUUID } from "../../hooks/useTransactions";
import { getDefaultCategories } from "../../hooks/useCategories";
import type { Category } from "../../lib/types";

async function seedOnboardingCategories(
  userId: string | undefined,
  currency: string,
  isIndo: boolean,
  qc: QueryClient,
) {
  const categoryDefs = getDefaultCategories({ currency, isIndo });
  const isGuest = !userId || userId === "guest_local_user";

  const fullCategories: Category[] = categoryDefs.map((c) => ({
    id: generateUUID(),
    user_id: isGuest ? "guest_local_user" : userId,
    name: c.name,
    emoji: c.emoji,
    type: c.type,
    is_default: true,
    created_at: new Date().toISOString(),
  }));

  // 1. Immediately persist to local categories backup
  try {
    localStorage.setItem(
      "TROUVAILLE_CATEGORIES_BACKUP_V1",
      JSON.stringify(fullCategories),
    );
  } catch {}

  // 2. Prime QueryClient so UI reflects the newly selected regional taxonomy immediately
  qc.setQueryData(
    ["categories", isGuest ? "guest_local_user" : userId, null],
    fullCategories,
  );
  qc.setQueryData(
    ["categories", isGuest ? "guest_local_user" : userId, "expense"],
    fullCategories.filter((c) => c.type === "expense"),
  );
  qc.setQueryData(
    ["categories", isGuest ? "guest_local_user" : userId, "income"],
    fullCategories.filter((c) => c.type === "income"),
  );
  qc.invalidateQueries({ queryKey: ["categories"] });

  // 3. For authenticated cloud accounts, populate the categories table if empty
  if (!isGuest && userId) {
    try {
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("categories").insert(
          fullCategories.map((c) => ({
            id: c.id,
            user_id: userId,
            name: c.name,
            emoji: c.emoji,
            type: c.type,
            is_default: true,
          })),
        );
      }
    } catch (e) {
      console.warn("[seedOnboardingCategories] Cloud insertion warning:", e);
    }
  }
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type FocusKey = "expenses" | "budget" | "domain" | "wealth" | "complete";

interface AccountOption {
  id: string;
  nameEn: string;
  nameId: string;
  subEn: string;
  subId: string;
  icon: any;
  iconName: string;
  classification: "liquid" | "investment";
  region: "local" | "global";
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  // --- LOKAL (IDR) ---
  {
    id: "cash",
    nameEn: "Physical Cash",
    nameId: "Uang Tunai",
    subEn: "Cash notes & physical wallet",
    subId: "Uang tunai & dompet fisik",
    icon: Banknote,
    iconName: "Banknote",
    classification: "liquid",
    region: "local",
  },
  {
    id: "bca",
    nameEn: "BCA",
    nameId: "BCA",
    subEn: "Checking account & daily operations",
    subId: "Rekening perbankan & operasional harian",
    icon: Landmark,
    iconName: "Landmark",
    classification: "liquid",
    region: "local",
  },
  {
    id: "mandiri",
    nameEn: "Bank Mandiri / BNI",
    nameId: "Bank Mandiri / BNI",
    subEn: "Payroll account & domestic transfers",
    subId: "Rekening gaji & transfer nasional",
    icon: Landmark,
    iconName: "Landmark",
    classification: "liquid",
    region: "local",
  },
  {
    id: "jago",
    nameEn: "Bank Jago / SeaBank",
    nameId: "Bank Jago / SeaBank",
    subEn: "Digital banking & interest pockets",
    subId: "Bank digital & kantong bunga harian",
    icon: Landmark,
    iconName: "Landmark",
    classification: "liquid",
    region: "local",
  },
  {
    id: "gopay",
    nameEn: "GoPay",
    nameId: "GoPay",
    subEn: "QRIS payments & everyday outlays",
    subId: "Pembayaran QRIS & transaksi harian",
    icon: Smartphone,
    iconName: "Smartphone",
    classification: "liquid",
    region: "local",
  },
  {
    id: "dana_ovo",
    nameEn: "DANA / OVO",
    nameId: "DANA / OVO",
    subEn: "Digital wallet & online marketplace",
    subId: "Dompet digital & belanja daring",
    icon: Smartphone,
    iconName: "Smartphone",
    classification: "liquid",
    region: "local",
  },
  {
    id: "saham_idx",
    nameEn: "IDX Stocks & Mutual Funds",
    nameId: "Saham IDX & Reksa Dana",
    subEn: "Domestic capital market investments",
    subId: "Investasi pasar modal domestik",
    icon: TrendingUp,
    iconName: "TrendingUp",
    classification: "investment",
    region: "local",
  },

  // --- GLOBAL & MULTI-CURRENCY (USD/EUR/SGD) ---
  {
    id: "wise",
    nameEn: "Wise",
    nameId: "Wise",
    subEn: "Multi-currency borderless balance (USD/EUR/SGD)",
    subId: "Saldo multi-mata uang lintas batas (USD/EUR/SGD)",
    icon: Globe,
    iconName: "Globe",
    classification: "liquid",
    region: "global",
  },
  {
    id: "paypal",
    nameEn: "PayPal",
    nameId: "PayPal",
    subEn: "Global checkout & freelance earnings",
    subId: "Pembayaran global & pendapatan lepas",
    icon: Smartphone,
    iconName: "Smartphone",
    classification: "liquid",
    region: "global",
  },
  {
    id: "revolut",
    nameEn: "Revolut",
    nameId: "Revolut",
    subEn: "Global debit card & travel spending",
    subId: "Kartu debit global & pengeluaran perjalanan",
    icon: Globe,
    iconName: "Globe",
    classification: "liquid",
    region: "global",
  },
  {
    id: "global_broker",
    nameEn: "Global Brokerage",
    nameId: "Sekuritas Global",
    subEn: "US Equities, ETFs & index funds",
    subId: "Saham AS, ETF & reksa dana indeks",
    icon: TrendingUp,
    iconName: "TrendingUp",
    classification: "investment",
    region: "global",
  },
  {
    id: "crypto_vault",
    nameEn: "Crypto / USDT Vault",
    nameId: "Brankas Kripto / USDT",
    subEn: "Decentralized wallets & stablecoins",
    subId: "Dompet desentralisasi & koin stabil",
    icon: Coins,
    iconName: "Coins",
    classification: "investment",
    region: "global",
  },
];

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { language, setLanguage, isIndonesian } = useLanguage();
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

  // Step 3: Accounts & Region Tab
  const [accountRegionTab, setAccountRegionTab] = useState<"local" | "global">("local");
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, boolean>>({
    cash: true,
    bca: true,
    gopay: true,
    mandiri: false,
    jago: false,
    dana_ovo: false,
    saham_idx: false,
    wise: false,
    paypal: false,
    revolut: false,
    global_broker: false,
    crypto_vault: false,
  });

  // Step 4: Starting Balance
  const [startingBalance, setStartingBalance] = useState<number>(0);

  // Step 5: Daily Reminder
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderHour, setReminderHour] = useState<number>(20); // 20:00 (8 PM)

  // Base Currency Integration
  const { preferredCurrency, setPreferredCurrency, convertToIdr } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(
    () => preferredCurrency || "IDR",
  );
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");

  const activeCurrencyMeta =
    CURRENCY_METADATA[selectedCurrency] || CURRENCY_METADATA.IDR;

  const filteredCurrencies = useMemo(() => {
    const list = Object.values(CURRENCY_METADATA);
    if (!currencySearch.trim()) return list;
    const q = currencySearch.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q),
    );
  }, [currencySearch]);

  const quickIncrements = useMemo(() => {
    if (selectedCurrency === "IDR") return [250000, 500000, 1000000, 5000000];
    if (selectedCurrency === "JPY") return [5000, 10000, 50000, 100000];
    if (["USD", "EUR", "SGD", "GBP", "AUD", "USDT"].includes(selectedCurrency)) {
      return [100, 500, 1000, 5000];
    }
    return [500, 1000, 5000, 10000];
  }, [selectedCurrency]);

  const handleSelectCurrency = (curr: SupportedCurrency) => {
    triggerHaptic("medium");
    setSelectedCurrency(curr);
    if (curr !== "IDR") {
      setAccountRegionTab("global");
      setSelectedAccounts((prev) => ({
        ...prev,
        cash: true,
        wise: true,
        paypal: true,
        bca: false,
        gopay: false,
      }));
    } else {
      setAccountRegionTab("local");
      setSelectedAccounts((prev) => ({
        ...prev,
        cash: true,
        bca: true,
        gopay: true,
        wise: false,
        paypal: false,
      }));
    }
    setCurrencyPickerOpen(false);
  };

  const getCuratedWallets = (
    curr: SupportedCurrency,
    isIndo: boolean,
  ): OnboardingWalletChoice[] => {
    if (curr === "IDR") {
      return [
        {
          name: isIndo ? "Uang Tunai" : "Physical Cash",
          icon: "Banknote",
          classification: "liquid",
        },
        {
          name: "BCA",
          icon: "Landmark",
          classification: "liquid",
        },
        {
          name: "GoPay",
          icon: "Smartphone",
          classification: "liquid",
        },
      ];
    }
    return [
      {
        name: isIndo ? "Uang Tunai" : "Physical Cash",
        icon: "Banknote",
        classification: "liquid",
      },
      {
        name: isIndo ? "Rekening Utama" : "Main Bank Account",
        icon: "Landmark",
        classification: "liquid",
      },
      {
        name: isIndo ? "Dompet Digital (Wise)" : "Digital Wallet (Wise)",
        icon: "Globe",
        classification: "liquid",
      },
    ];
  };

  if (!isOpen) return null;

  const archetypeItems = getArchetypeItems(isIndonesian);
  const currentFocus =
    archetypeItems.find((f) => f.key === selectedFocus) || archetypeItems[0]!;

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

  // 1-Tap Quick Start: Instant zero-friction entry for users
  const handleQuickStart = async () => {
    triggerSuccessHaptic();

    // 1. Seed standard accounts (adaptive to currency)
    const standardWallets: OnboardingWalletChoice[] = getCuratedWallets(
      selectedCurrency,
      isIndonesian,
    );

    try {
      await seedOnboardingWallets(user?.id, standardWallets);
    } catch (err) {
      console.warn("[OnboardingModal] Failed quick seeding wallets:", err);
    }

    // 2. Seed standard categories (adaptive to currency & region)
    try {
      await seedOnboardingCategories(
        user?.id,
        selectedCurrency,
        isIndonesian,
        queryClient,
      );
    } catch (err) {
      console.warn("[OnboardingModal] Failed quick seeding categories:", err);
    }

    // 3. Set preferred currency
    try {
      setPreferredCurrency(selectedCurrency);
      localStorage.setItem("trouvaille_preferred_currency", selectedCurrency);
    } catch (e) {
      console.warn("[OnboardingModal] Failed setting preferred currency:", e);
    }

    // 3. Apply standard widget preset
    try {
      const stored = loadStoredWidgets(
        localStorage.getItem(STORAGE_KEY),
        DEFAULT_HOME_WIDGETS,
      );
      const updated = applyPresetToWidgets(stored, "minimal");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[OnboardingModal] Failed setting widgets:", e);
    }

    // 4. Set default reminder (20:00)
    try {
      localStorage.setItem("trouvaille_streak_reminder_enabled", "true");
      localStorage.setItem("trouvaille_streak_reminder_hour", "20");
    } catch {}

    // 5. Set user name if entered
    if (userName.trim()) {
      try {
        localStorage.setItem("trouvaille_user_name", userName.trim());
      } catch {}
    }

    // 6. Mark onboarded
    try {
      localStorage.setItem("trouvaille_preset_mode", "default");
      localStorage.setItem("trouvaille_onboarding_focus", "expenses");
      localStorage.setItem("trouvaille_onboarded", "true");
    } catch {}

    onComplete();
  };

  const handleNextStep = () => {
    triggerHaptic("medium");
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (presetMode === "default") {
        if (selectedCurrency === "IDR") {
          setSelectedAccounts({
            cash: true,
            bca: true,
            gopay: true,
            mandiri: false,
            jago: false,
            dana_ovo: false,
            saham_idx: false,
            wise: false,
            paypal: false,
            revolut: false,
            global_broker: false,
            crypto_vault: false,
          });
        } else {
          setSelectedAccounts({
            cash: true,
            bca: false,
            gopay: false,
            mandiri: false,
            jago: false,
            dana_ovo: false,
            saham_idx: false,
            wise: true,
            paypal: true,
            revolut: false,
            global_broker: false,
            crypto_vault: false,
          });
        }
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
    let chosenAccountConfigs: OnboardingWalletChoice[];
    if (presetMode === "default") {
      chosenAccountConfigs = getCuratedWallets(selectedCurrency, isIndonesian);
    } else {
      chosenAccountConfigs = ACCOUNT_OPTIONS.filter(
        (acc) => selectedAccounts[acc.id],
      ).map((acc) => ({
        name: isIndonesian ? acc.nameId : acc.nameEn,
        icon: acc.iconName,
        classification: acc.classification,
      }));
    }

    // Fallback if user unselected everything
    if (chosenAccountConfigs.length === 0) {
      chosenAccountConfigs.push({
        name: isIndonesian ? "Akun Utama" : "Main Account",
        icon: "Wallet",
        classification: "liquid",
      });
    }

    // Convert starting balance to base IDR
    const convertedStartingBalance =
      startingBalance > 0
        ? Math.round(convertToIdr(startingBalance, selectedCurrency))
        : undefined;

    try {
      await seedOnboardingWallets(
        user?.id,
        chosenAccountConfigs,
        convertedStartingBalance,
      );
    } catch (err) {
      console.warn("[OnboardingModal] Failed to seed wallets:", err);
    }

    // 2. Seed standard categories (adaptive to currency & region)
    try {
      await seedOnboardingCategories(
        user?.id,
        selectedCurrency,
        isIndonesian,
        queryClient,
      );
    } catch (err) {
      console.warn("[OnboardingModal] Failed seeding categories:", err);
    }

    // 3. Set preferred currency
    try {
      setPreferredCurrency(selectedCurrency);
      localStorage.setItem("trouvaille_preferred_currency", selectedCurrency);
    } catch (e) {
      console.warn("[OnboardingModal] Failed setting preferred currency:", e);
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
              className="space-y-4 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    {isIndonesian ? "Langkah 01" : "Step 01"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    {isIndonesian ? "Identitas & Pengaturan" : "Identity & Setup"}
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  {isIndonesian ? "Selamat Datang di " : "Welcome to "}
                  <span className="font-semibold">Trouvaille</span>
                </h1>
                <p className="text-[12.5px] font-normal text-white/50 leading-relaxed">
                  {isIndonesian
                    ? "Personalisasikan nama panggilan, bahasa tampilan, dan arsitektur awal space Anda."
                    : "Personalize your caller identity, interface language, and starting space architecture."}
                </p>
              </div>

              {/* 1. Name Input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-semibold text-white/40 tracking-wider uppercase block">
                  {isIndonesian ? "Nama / Identitas Anda" : "Your Name / Identity"}
                </label>
                <div className="relative flex items-center border-b border-white/15 focus-within:border-white transition-colors py-1">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={isIndonesian ? "misal: Alexander" : "e.g. Alexander"}
                    className="w-full bg-transparent text-[17px] sm:text-[18px] font-medium text-white placeholder:text-white/25 outline-none pr-8 transition-colors"
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

              {/* 2. Interface Language Customization (Rule 6 Strict Non-Mixed) */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-semibold text-white/40 tracking-wider uppercase block">
                    {isIndonesian ? "Bahasa Antarmuka" : "Interface Language"}
                  </label>
                  <span className="text-[10.5px] text-white/40">
                    {isIndonesian ? "Bahasa Indonesia (Aktif)" : "English (Default)"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setLanguage("en");
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                      language === "en"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setLanguage("id");
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                      language === "id"
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span>Bahasa Indonesia</span>
                  </button>
                </div>
              </div>

              {/* 3. Base Currency Selection */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-semibold text-white/40 tracking-wider uppercase block">
                    {isIndonesian ? "Mata Uang Dasar" : "Base Currency"}
                  </label>
                  <span className="text-[10.5px] text-white/40 font-mono">
                    {activeCurrencyMeta.code} ({activeCurrencyMeta.symbol})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setCurrencyPickerOpen(true);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                      {activeCurrencyMeta.symbol}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-white tracking-tight flex items-center gap-1.5 truncate">
                        <span>{activeCurrencyMeta.code}</span>
                        <span className="text-white/40 font-normal">·</span>
                        <span className="text-white/80 font-normal text-[12px] truncate">{activeCurrencyMeta.name}</span>
                      </div>
                      <div className="text-[10.5px] text-white/40 truncate">
                        {isIndonesian ? "Ketuk untuk memilih dari 13 mata uang" : "Tap to choose from 13 currencies"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-white/40 group-hover:text-white/80 transition-colors shrink-0 ml-2" />
                </button>
              </div>

              {/* 4. Preset Selection (Default vs Custom) */}
              <div className="space-y-2 pt-0.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-semibold text-white/40 tracking-wider uppercase block">
                    {isIndonesian ? "Arsitektur Ruang Kerja" : "Workspace Architecture"}
                  </label>
                  <span className="text-[10.5px] text-white/40">
                    {presetMode === "default"
                      ? isIndonesian
                        ? "Pilihan Standar"
                        : "Standard Curated"
                      : isIndonesian
                      ? "Rancangan Kustom"
                      : "Custom Blueprint"}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Option A: Preset Default */}
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      setPresetMode("default");
                    }}
                    className={`group p-3.5 rounded-[20px] text-left transition-all duration-300 border cursor-pointer relative ${
                      presetMode === "default"
                        ? "bg-white/[0.06] border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                        : "bg-white/[0.02] border-white/8 opacity-55 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] font-semibold text-white tracking-tight">
                            {isIndonesian ? "Preset Standar Pilihan" : "Default Curated Preset"}
                          </span>
                          <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                            {isIndonesian ? "Rekomendasi" : "Recommended"}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-white/50 leading-relaxed">
                          {isIndonesian
                            ? "Pengaturan instan tanpa hambatan. Menyiapkan 3 akun likuid dan 14 kategori utama secara otomatis."
                            : "Instant zero-friction setup. Auto-provisions 3 liquid accounts and 14 essential categories."}
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

                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-white/[0.06]">
                      {(selectedCurrency === "IDR"
                        ? isIndonesian
                          ? ["Uang Tunai", "BCA (Bank)", "GoPay (Dompet Digital)", "+14 Kategori Utama"]
                          : ["Physical Cash", "BCA (Bank)", "GoPay (E-Wallet)", "+14 Core Categories"]
                        : isIndonesian
                          ? ["Uang Tunai", "Rekening Utama", "Dompet Digital (Wise)", "+14 Kategori Utama"]
                          : ["Physical Cash", "Main Bank Account", "Digital Wallet (Wise)", "+14 Core Categories"]
                      ).map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60 border border-white/10"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Option B: Custom */}
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      setPresetMode("custom");
                    }}
                    className={`group p-3.5 rounded-[20px] text-left transition-all duration-300 border cursor-pointer relative ${
                      presetMode === "custom"
                        ? "bg-white/[0.06] border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                        : "bg-white/[0.02] border-white/8 opacity-55 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[13.5px] font-semibold text-white tracking-tight block">
                          {isIndonesian ? "Arsitektur Kustom" : "Custom Architecture"}
                        </span>
                        <p className="text-[11.5px] text-white/50 leading-relaxed">
                          {isIndonesian
                            ? "Pilih saluran pembayaran dan rekening Anda sendiri. Akun bank dan kategori personal dapat disesuaikan kapan saja."
                            : "Handpick your starting channels in the next step. Custom bank accounts, credit lines, and personal categories can be tailored anytime in Settings."}
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
                    {isIndonesian ? "Langkah 02" : "Step 02"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    {isIndonesian ? "Fokus Finansial" : "Financial Focus"}
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  {isIndonesian ? "Pilih fokus " : "Choose your "}
                  <span className="font-semibold">{isIndonesian ? "finansial Anda" : "archetype"}</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  {isIndonesian
                    ? "Kalibrasikan widget dasbor utama, metrik, dan prioritas pencatatan Anda."
                    : "Calibrate your home dashboard widgets, metrics, and tracking priority."}
                </p>
              </div>

              <ArchetypeCardSelector
                items={archetypeItems}
                activeIndex={Math.max(
                  0,
                  archetypeItems.findIndex((f) => f.key === selectedFocus),
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
              className="space-y-4 w-full text-left"
            >
              {/* Editorial Header */}
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">
                    {isIndonesian ? "Langkah 03" : "Step 03"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    {isIndonesian ? "Saluran Aktif" : "Active Channels"}
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  {isIndonesian ? "Pilih saluran " : "Select active "}
                  <span className="font-semibold">{isIndonesian ? "pembayaran" : "accounts"}</span>
                </h1>
                <p className="text-[12.5px] font-normal text-white/50 leading-relaxed">
                  {isIndonesian
                    ? "Pilih saluran pembayaran yang sering Anda gunakan untuk space yang rapi."
                    : "Toggle the payment channels you transact with regularly for a noise-free space."}
                </p>
              </div>

              {/* Regional Tabs: Lokal (IDR) vs Global (USD/EUR) */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-full">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setAccountRegionTab("local");
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    accountRegionTab === "local"
                      ? "bg-white/[0.12] text-white shadow-sm border border-white/20"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <span>Lokal (IDR)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
                    {ACCOUNT_OPTIONS.filter((a) => a.region === "local" && selectedAccounts[a.id]).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setAccountRegionTab("global");
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    accountRegionTab === "global"
                      ? "bg-white/[0.12] text-white shadow-sm border border-white/20"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <span>Global (USD/EUR)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
                    {ACCOUNT_OPTIONS.filter((a) => a.region === "global" && selectedAccounts[a.id]).length}
                  </span>
                </button>
              </div>

              {/* Open, unboxed vertical list with hairline dividers */}
              <div className="divide-y divide-white/[0.07] border-y border-white/[0.08]">
                {ACCOUNT_OPTIONS.filter((acc) => acc.region === accountRegionTab).map((acc) => {
                  const isChecked = Boolean(selectedAccounts[acc.id]);
                  const Icon = acc.icon;
                  const accName = isIndonesian ? acc.nameId : acc.nameEn;
                  const accSub = isIndonesian ? acc.subId : acc.subEn;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleToggleAccount(acc.id)}
                      className="w-full py-3 px-1 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
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
                            {accName}
                          </div>
                          <div className="text-[11px] text-white/40 mt-0.5">
                            {accSub}
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
                    {presetMode === "default"
                      ? isIndonesian
                        ? "Langkah 03"
                        : "Step 03"
                      : isIndonesian
                      ? "Langkah 04"
                      : "Step 04"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    {isIndonesian ? "Saldo Awal" : "Starting Baseline"}
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  {isIndonesian ? "Saldo kas " : "Initial "}
                  <span className="font-semibold">{isIndonesian ? "cadangan awal" : "cash reserve"}</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  {isIndonesian
                    ? "Masukkan saldo kas awal Anda untuk menghitung Kekayaan Bersih secara akurat."
                    : "Input your starting liquid balance to calibrate Net Worth calculations accurately."}
                </p>
              </div>

              {/* Unboxed fluid balance input */}
              <div className="space-y-6">
                <div className="space-y-2 border-b border-white/15 pb-3 focus-within:border-white transition-colors">
                  <label className="text-[11px] font-semibold text-white/40 tracking-wider uppercase block">
                    {isIndonesian
                      ? `Saldo Kas Likuid (${activeCurrencyMeta.code})`
                      : `Liquid Balance (${activeCurrencyMeta.code})`}
                  </label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[20px] sm:text-[22px] font-light text-white/40 select-none">
                      {activeCurrencyMeta.symbol}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={startingBalance === 0 ? "" : startingBalance.toLocaleString(isIndonesian ? "id-ID" : "en-US")}
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
                    {isIndonesian ? "Pilihan nominal cepat" : "Quick additive chips"}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {quickIncrements.map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => handleQuickAddBalance(inc)}
                        className="py-1.5 px-3 rounded-full text-[12px] font-medium amount border active:scale-95 transition-all cursor-pointer text-white/80 border-white/15 hover:border-white/40 hover:text-white bg-white/[0.04]"
                      >
                        +{inc >= 1000000 ? `${inc / 1000000}M` : inc >= 1000 ? `${inc / 1000}K` : inc}
                      </button>
                    ))}
                    {startingBalance > 0 && (
                      <button
                        type="button"
                        onClick={handleClearBalance}
                        className="py-1.5 px-3 rounded-full text-[12px] font-medium text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                      >
                        {isIndonesian ? "Setel ulang ke 0" : "Reset to 0"}
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
                    {presetMode === "default"
                      ? isIndonesian
                        ? "Langkah 04"
                        : "Step 04"
                      : isIndonesian
                      ? "Langkah 05"
                      : "Step 05"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                    {isIndonesian ? "Ritme Kebiasaan" : "Habit Rhythm"}
                  </span>
                </div>
                <h1 className="text-[25px] sm:text-[27px] font-light tracking-tight text-white leading-tight">
                  {isIndonesian ? "Pengingat " : "Daily "}
                  <span className="font-semibold">{isIndonesian ? "petang harian" : "evening nudge"}</span>
                </h1>
                <p className="text-[13px] font-normal text-white/50 leading-relaxed">
                  {isIndonesian
                    ? "Pengingat lembut untuk mencatat pengeluaran harian dalam 5 detik agar rekor tetap terjaga."
                    : "A subtle prompt to record your day's outlays under 5 seconds so streaks stay unbroken."}
                </p>
              </div>

              {/* Feature Toggle Row (Strictly adheres to GEMINI.md Rule 3) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.08]">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-[14px] font-semibold text-white">
                      {isIndonesian ? "Pengingat Rutinitas Harian" : "Daily Routine Reminder"}
                    </div>
                    <div className="text-[11px] text-white/45 leading-relaxed">
                      {isIndonesian
                        ? "Pemberitahuan hening setiap petang untuk mencatat transaksi"
                        : "Silent prompt each evening to capture transactions"}
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
                      {isIndonesian ? "Waktu Terjadwal" : "Scheduled Time"}
                    </label>
                    <span className="text-[12px] font-medium text-white/60 amount">
                      {reminderHour}:00 {isIndonesian ? "Waktu Lokal" : "Local Time"}
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
                    {isIndonesian
                      ? "Trouvaille berjalan hening di latar belakang tanpa mengganggu mode fokus perangkat Anda."
                      : "Trouvaille runs silently in the background without disturbing your device focus mode."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM ACTION BAR: 1-TAP QUICK START OR STEPPED CONTINUE  */}
      {/* ============================================================ */}
      <div className="px-3 sm:px-4 relative z-10 pt-2 max-w-md mx-auto w-full space-y-2">
        {step === 1 && presetMode === "default" ? (
          <div className="space-y-2">
            {/* Primary Action: 1-Tap Quick Start */}
            <button
              type="button"
              onClick={handleQuickStart}
              className="w-full py-3.5 rounded-full font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(255,255,255,0.2)] hover:bg-white/95"
            >
              <Zap size={15} strokeWidth={2.5} className="fill-zinc-950 text-zinc-950" />
              <span>{isIndonesian ? "Mulai Cepat 1-Ketukan" : "1-Tap Quick Start"}</span>
            </button>

            {/* Secondary Action: Customize Step-by-Step */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={handleNextStep}
                className="text-[11.5px] font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                {isIndonesian ? "Sesuaikan Langkah demi Langkah" : "Customize Step-by-Step"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full py-3.5 rounded-full font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(255,255,255,0.15)] hover:bg-white/95"
            >
              <span>
                {step === 5
                  ? isIndonesian
                    ? "Buka Trouvaille"
                    : "Enter Trouvaille"
                  : isIndonesian
                  ? "Lanjutkan"
                  : "Continue"}
              </span>
              <ArrowRight size={15} strokeWidth={2} />
            </button>

            {step === 4 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setStartingBalance(0);
                    setStep(5);
                  }}
                  className="text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {isIndonesian ? "Lewati saldo awal" : "Skip baseline balance"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Currency Selection BottomSheet */}
      <BottomSheet
        isOpen={currencyPickerOpen}
        onClose={() => {
          setCurrencyPickerOpen(false);
          setCurrencySearch("");
        }}
        zIndex={1100}
      >
        <div className="p-5 pb-8 space-y-4 text-left">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Coins size={16} strokeWidth={1.75} />
              </div>
              <div>
                <h2
                  className="text-[16px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Pilih Mata Uang Dasar" : "Select Base Currency"}
                </h2>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian
                    ? "Mata uang utama untuk seluruh pembukuan"
                    : "Primary currency for all financial tracking"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrencyPickerOpen(false);
                setCurrencySearch("");
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-tertiary)",
              }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Search Box */}
          <div
            className="relative flex items-center rounded-xl px-3 py-2 border"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--glass-border)",
            }}
          >
            <Search
              size={14}
              style={{ color: "var(--text-tertiary)" }}
              className="mr-2 shrink-0"
            />
            <input
              type="text"
              value={currencySearch}
              onChange={(e) => setCurrencySearch(e.target.value)}
              placeholder={
                isIndonesian
                  ? "Cari nama, kode (mis. USD), atau simbol..."
                  : "Search name, code (e.g. USD), or symbol..."
              }
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
              style={{ color: "var(--text-primary)" }}
            />
            {currencySearch && (
              <button
                type="button"
                onClick={() => setCurrencySearch("")}
                className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Currency List */}
          <div className="divide-y divide-white/[0.06] border-y border-white/[0.08]">
            {filteredCurrencies.map((curr) => {
              const isSelected = curr.code === selectedCurrency;
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => handleSelectCurrency(curr.code)}
                  className={`w-full py-3 px-2 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer text-left ${
                    isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[12px] border ${
                        isSelected
                          ? "bg-white text-zinc-950 border-white"
                          : "bg-white/[0.06] border-white/10 text-white/80"
                      }`}
                    >
                      {curr.symbol}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white flex items-center gap-2">
                        <span>{curr.code}</span>
                        <span className="text-white/40 font-normal">·</span>
                        <span className="text-white/70 font-normal text-[12px]">
                          {curr.name}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-white/40">
                        {curr.countryCode} · {curr.decimals}{" "}
                        {isIndonesian ? "desimal" : "decimals"}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-white border-white text-zinc-950"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
            {filteredCurrencies.length === 0 && (
              <div className="py-8 text-center text-[12px] text-white/40">
                {isIndonesian
                  ? "Mata uang tidak ditemukan"
                  : "No currency found matching search"}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
