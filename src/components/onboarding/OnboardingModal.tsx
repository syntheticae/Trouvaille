import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MinusCircle,
  Wallet,
  PieChart,
  Check,
  ChevronLeft,
  ArrowRight,
  Info,
  X,
  Coffee,
  ShoppingBag,
  Car,
  Home,
  Receipt,
  Tag,
  HeartPulse,
  Utensils,
  Sparkles,
  Plane,
  GraduationCap,
  Users,
  Fuel,
  Dumbbell,
  Gift,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  Laptop,
  HandCoins,
} from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import type { HomePresetKey } from "../../lib/widgetLayoutTypes";
import { DEFAULT_HOME_WIDGETS } from "../../lib/widgetLayoutTypes";
import {
  applyPresetToWidgets,
  loadStoredWidgets,
  STORAGE_KEY,
} from "../../lib/widgetLayoutEngine";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type ScopeKey = "expense_only" | "expense_income" | "net_worth";

interface ScopeOption {
  key: ScopeKey;
  title: string;
  subtitle: string;
  preset: HomePresetKey;
  icon: typeof MinusCircle;
  bullets: string[];
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    key: "expense_only",
    title: "Expense Only",
    subtitle: "I just want to know where my money goes.",
    preset: "pulse",
    icon: MinusCircle,
    bullets: [
      "Streamlined daily spending pulse",
      "Category breakdown & budget pacing",
      "Quick transaction input & camera receipt scan",
    ],
  },
  {
    key: "expense_income",
    title: "Expense & Income",
    subtitle: "I want to manage cashflow, wallets, budgets, and transfers.",
    preset: "minimal",
    icon: Wallet,
    bullets: [
      "Income vs expense monthly pacing",
      "Multi-wallet cash & bank balance tracking",
      "Upcoming recurring bills and payroll calendar",
    ],
  },
  {
    key: "net_worth",
    title: "Full Net Worth",
    subtitle: "I want to track what I own, what I owe, and my total financial health.",
    preset: "executive",
    icon: PieChart,
    bullets: [
      "Wallet balances feed Cash & Liquidity",
      "Net Worth tab for owns and owes",
      "Track investments, fixed assets, receivables, and debt",
    ],
  },
];

const INITIAL_EXPENSE_CATEGORIES = [
  { id: "coffee", name: "Coffee", icon: Coffee, defaultSelected: true },
  { id: "groceries", name: "Groceries", icon: ShoppingBag, defaultSelected: true },
  { id: "transport", name: "Transport", icon: Car, defaultSelected: true },
  { id: "rent", name: "Rent", icon: Home, defaultSelected: true },
  { id: "bills", name: "Bills", icon: Receipt, defaultSelected: true },
  { id: "shopping", name: "Shopping", icon: Tag, defaultSelected: true },
  { id: "health", name: "Health", icon: HeartPulse, defaultSelected: true },
  { id: "dining", name: "Dining", icon: Utensils, defaultSelected: true },
  { id: "subscriptions", name: "Subscriptions", icon: Sparkles, defaultSelected: false },
  { id: "travel", name: "Travel", icon: Plane, defaultSelected: false },
  { id: "education", name: "Education", icon: GraduationCap, defaultSelected: false },
  { id: "family", name: "Family", icon: Users, defaultSelected: false },
  { id: "fuel", name: "Fuel", icon: Fuel, defaultSelected: false },
  { id: "gym", name: "Gym", icon: Dumbbell, defaultSelected: false },
  { id: "gifts", name: "Gifts", icon: Gift, defaultSelected: false },
  { id: "insurance", name: "Insurance", icon: ShieldCheck, defaultSelected: false },
];

const INITIAL_INCOME_CATEGORIES = [
  { id: "salary", name: "Salary / Gaji", icon: Briefcase, defaultSelected: true },
  { id: "bonus", name: "Bonus", icon: Sparkles, defaultSelected: true },
  { id: "investments", name: "Investasi", icon: TrendingUp, defaultSelected: true },
  { id: "side_job", name: "Side Job", icon: Laptop, defaultSelected: false },
  { id: "gift", name: "Hadiah", icon: Gift, defaultSelected: false },
  { id: "cashback", name: "Cashback", icon: HandCoins, defaultSelected: false },
];

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedScope, setSelectedScope] = useState<ScopeKey>("net_worth");
  const [infoModalScope, setInfoModalScope] = useState<ScopeOption | null>(null);

  const [categoryTypeTab, setCategoryTypeTab] = useState<"expense" | "income">("expense");
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    INITIAL_EXPENSE_CATEGORIES.forEach((c) => {
      initial[c.id] = c.defaultSelected;
    });
    INITIAL_INCOME_CATEGORIES.forEach((c) => {
      initial[c.id] = c.defaultSelected;
    });
    return initial;
  });

  if (!isOpen) return null;

  const currentOption = SCOPE_OPTIONS.find((o) => o.key === selectedScope) || SCOPE_OPTIONS[2];

  const toggleCategory = (id: string) => {
    triggerHaptic("light");
    setSelectedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFinish = () => {
    triggerSuccessHaptic();

    // 1. Apply Preset to Widgets
    try {
      const stored = loadStoredWidgets(localStorage.getItem(STORAGE_KEY), DEFAULT_HOME_WIDGETS);
      const updated = applyPresetToWidgets(stored, currentOption.preset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[OnboardingModal] Failed to write preset:", e);
    }

    // 2. Persist chosen onboarding scope and mark onboarded
    try {
      localStorage.setItem("trouvaille_onboarding_scope", selectedScope);
      localStorage.setItem("trouvaille_onboarded", "true");
    } catch {}

    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col justify-between overflow-hidden"
      style={{
        background: "var(--bg-canvas)",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 28px)",
      }}
    >
      {/* Top Segmented Progress Bar */}
      <div className="px-6 w-full max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: "var(--text-primary)",
              opacity: step >= 1 ? 0.9 : 0.2,
            }}
          />
          <div
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: "var(--text-primary)",
              opacity: step >= 2 ? 0.9 : 0.2,
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 w-full max-w-md mx-auto flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="space-y-6 my-auto"
            >
              {/* Header */}
              <div className="space-y-2">
                <h1
                  className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-[1.15]"
                  style={{ color: "var(--text-primary)" }}
                >
                  What do you want to track?
                </h1>
                <p
                  className="text-[13px] sm:text-[14px] leading-relaxed font-normal"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Choose how Trouvaille shapes your home, analytics, and main navigation. You can change this later.
                </p>
              </div>

              {/* Selection List */}
              <div
                className="rounded-[24px] p-2 space-y-2 border"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                {SCOPE_OPTIONS.map((option) => {
                  const isSelected = selectedScope === option.key;
                  const Icon = option.icon;

                  return (
                    <div
                      key={option.key}
                      onClick={() => {
                        triggerHaptic("medium");
                        setSelectedScope(option.key);
                      }}
                      className={`relative flex items-center justify-between p-3.5 rounded-[18px] transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-white/[0.08] border border-white/20 shadow-sm"
                          : "hover:bg-white/[0.03] border border-transparent opacity-80"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 pr-2">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                          style={{
                            background: isSelected ? "var(--bg-base)" : "var(--glass-fill)",
                            borderColor: "var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Icon size={19} strokeWidth={1.75} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[14px] font-semibold tracking-tight"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {option.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic("light");
                                setInfoModalScope(option);
                              }}
                              className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                              <Info size={13} />
                            </button>
                          </div>
                          <p
                            className="text-[11px] leading-tight font-normal mt-0.5 line-clamp-1"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {option.subtitle}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-white text-zinc-950 font-bold"
                            : "border border-[var(--glass-border)] opacity-40"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="space-y-5 my-auto"
            >
              {/* Header */}
              <div className="space-y-1.5">
                <h1
                  className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-[1.15]"
                  style={{ color: "var(--text-primary)" }}
                >
                  Pick your first categories.
                </h1>
                <p
                  className="text-[13px] leading-relaxed font-normal"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Choose the spending groups you want Trouvaille to recognize first. You can customize them anytime.
                </p>
              </div>

              {/* Category Container */}
              <div
                className="rounded-[24px] p-4 space-y-4 border"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                {/* Segmented Control (Expense vs Income) */}
                <div
                  className="flex items-center p-1 rounded-2xl border"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCategoryTypeTab("expense");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                      categoryTypeTab === "expense"
                        ? "bg-white/[0.1] text-white shadow-sm border border-white/15"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                    <span>Expense</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setCategoryTypeTab("income");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                      categoryTypeTab === "income"
                        ? "bg-white/[0.1] text-white shadow-sm border border-white/15"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                    <span>Income</span>
                  </button>
                </div>

                {/* Chips Grid */}
                <div className="flex flex-wrap gap-2 pt-1 max-h-[320px] overflow-y-auto pr-1">
                  {(categoryTypeTab === "expense"
                    ? INITIAL_EXPENSE_CATEGORIES
                    : INITIAL_INCOME_CATEGORIES
                  ).map((cat) => {
                    const isChecked = !!selectedCategories[cat.id];
                    const Icon = cat.icon;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-medium transition-all active:scale-95 cursor-pointer select-none ${
                          isChecked
                            ? "bg-white/[0.12] border border-white/25 text-white shadow-sm"
                            : "bg-white/[0.03] border border-white/5 text-[var(--text-secondary)] opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Icon size={14} strokeWidth={1.5} />
                        <span>{cat.name}</span>
                        {isChecked && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Actions Bar */}
        <div className="pt-6 flex items-center gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setStep(1);
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 active:scale-95 transition-transform cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                triggerHaptic("medium");
                setStep(2);
              } else {
                handleFinish();
              }
            }}
            className="flex-1 py-4 px-6 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl cursor-pointer"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            <span>{step === 1 ? "Next" : "Get Started"}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Info Popup Sheet (Monveo Style) */}
      <AnimatePresence>
        {infoModalScope && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-[28px] p-6 border relative overflow-hidden shadow-2xl space-y-5"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setInfoModalScope(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08] text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>

              {/* Graphic Mock Card */}
              <div
                className="p-4 rounded-2xl border space-y-2"
                style={{
                  background: "var(--bg-base)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    {infoModalScope.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
                    Preset: {infoModalScope.preset}
                  </span>
                </div>
                <div className="text-[20px] font-semibold text-[var(--text-primary)]">
                  {infoModalScope.key === "expense_only"
                    ? "Rp 4.250.000"
                    : infoModalScope.key === "expense_income"
                      ? "Net Cashflow"
                      : "Total Net Worth"}
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 bg-white/80 rounded-full" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h3
                  className="text-[19px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {infoModalScope.title}
                </h3>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {infoModalScope.subtitle}
                </p>
              </div>

              {/* Bullet Points */}
              <div className="space-y-2.5 pt-1">
                {infoModalScope.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[12px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 shrink-0" />
                    <span style={{ color: "var(--text-tertiary)" }}>{b}</span>
                  </div>
                ))}
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={() => setInfoModalScope(null)}
                className="w-full py-3 rounded-xl font-semibold text-[13px] bg-white/[0.1] hover:bg-white/[0.15] text-white border border-white/10 transition-colors cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
