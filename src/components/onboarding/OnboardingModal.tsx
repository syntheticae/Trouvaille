import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  Laptop,
  TrendingUp,
  SlidersHorizontal,
  Check,
  ArrowRight,
  ShieldCheck,
  Coffee,
  ShoppingBag,
  Car,
  Home,
  Receipt,
  HeartPulse,
  Utensils,
  Wallet,
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

export type PresetKey = "student" | "professional" | "business" | "investor" | "custom";

interface PresetOption {
  key: PresetKey;
  code: string;
  title: string;
  tagline: string;
  widgetPreset: HomePresetKey;
  icon: any;
  accounts: { name: string; icon: string }[];
  categories: { id: string; name: string; type: "expense" | "income" }[];
}

export const ONBOARDING_PRESETS: PresetOption[] = [
  {
    key: "student",
    code: "01",
    title: "Mahasiswa & Pelajar",
    tagline: "Sederhana untuk uang saku, kos & nongkrong santai",
    widgetPreset: "pulse",
    icon: GraduationCap,
    accounts: [
      { name: "Cash (Tunai)", icon: "Banknote" },
      { name: "GoPay / E-Wallet", icon: "Smartphone" },
      { name: "Rekening BCA", icon: "Landmark" },
    ],
    categories: [
      { id: "makanan", name: "Makanan", type: "expense" },
      { id: "kopi", name: "Kopi / Nongkrong", type: "expense" },
      { id: "transportasi", name: "Transportasi", type: "expense" },
      { id: "kuliah", name: "Kuliah & Buku", type: "expense" },
      { id: "kos", name: "Kos & Sewa", type: "expense" },
      { id: "hiburan", name: "Hiburan / Game", type: "expense" },
      { id: "uang_saku", name: "Uang Saku", type: "income" },
    ],
  },
  {
    key: "professional",
    code: "02",
    title: "Pekerja & Profesional",
    tagline: "Standar ideal gaji bulanan, tabungan & kebutuhan rutin",
    widgetPreset: "minimal",
    icon: Briefcase,
    accounts: [
      { name: "Rekening Gaji (BCA)", icon: "Landmark" },
      { name: "E-Wallet (GoPay/Dana)", icon: "Smartphone" },
      { name: "Tabungan Darurat", icon: "Wallet" },
    ],
    categories: [
      { id: "makanan", name: "Makanan", type: "expense" },
      { id: "groceries", name: "Belanja Bulanan", type: "expense" },
      { id: "transportasi", name: "Transportasi", type: "expense" },
      { id: "tagihan", name: "Tagihan & Listrik", type: "expense" },
      { id: "kopi", name: "Kopi / Kafe", type: "expense" },
      { id: "kesehatan", name: "Kesehatan", type: "expense" },
      { id: "tabungan", name: "Tabungan", type: "expense" },
      { id: "gaji", name: "Gaji Pokok", type: "income" },
      { id: "bonus", name: "Bonus / THR", type: "income" },
    ],
  },
  {
    key: "business",
    code: "03",
    title: "Bisnis & Freelance",
    tagline: "Arus kas usaha, klien, operasional & pajak",
    widgetPreset: "executive",
    icon: Laptop,
    accounts: [
      { name: "Rekening Operasional Bisnis", icon: "Landmark" },
      { name: "Rekening Pribadi", icon: "Landmark" },
      { name: "Kas Kecil (Petty Cash)", icon: "Banknote" },
      { name: "Piutang Klien", icon: "Wallet" },
    ],
    categories: [
      { id: "operasional", name: "Operasional Usaha", type: "expense" },
      { id: "vendor", name: "Jasa & Vendor", type: "expense" },
      { id: "transport_bisnis", name: "Transportasi Bisnis", type: "expense" },
      { id: "pajak", name: "Pajak & Legal", type: "expense" },
      { id: "gaji_tim", name: "Gaji Tim", type: "expense" },
      { id: "inflow_klien", name: "Inflow Pembayaran Klien", type: "income" },
      { id: "proyek", name: "Pendapatan Proyek", type: "income" },
    ],
  },
  {
    key: "investor",
    code: "04",
    title: "Investor & Wealth",
    tagline: "Portofolio lengkap aset investasi, dividen & ketahanan kas",
    widgetPreset: "executive",
    icon: TrendingUp,
    accounts: [
      { name: "Rekening Utama (BCA/Mandiri)", icon: "Landmark" },
      { name: "Portofolio Saham / RDN", icon: "TrendingUp" },
      { name: "Dompet Kripto / USDT", icon: "Coins" },
      { name: "Kas Likuid", icon: "Banknote" },
    ],
    categories: [
      { id: "makanan", name: "Kebutuhan Hidup", type: "expense" },
      { id: "lifestyle", name: "Gaya Hidup & Leisure", type: "expense" },
      { id: "asuransi", name: "Premi Asuransi", type: "expense" },
      { id: "pajak", name: "Pajak Tahunan", type: "expense" },
      { id: "investasi", name: "Investasi & Deposito", type: "expense" },
      { id: "gaji", name: "Active Inflow", type: "income" },
      { id: "dividen", name: "Dividen & Bunga Modal", type: "income" },
    ],
  },
];

const ALL_CUSTOM_CATEGORIES = [
  { id: "makanan", name: "Makanan", icon: Utensils },
  { id: "kopi", name: "Kopi & Kafe", icon: Coffee },
  { id: "groceries", name: "Groceries", icon: ShoppingBag },
  { id: "transportasi", name: "Transportasi", icon: Car },
  { id: "kos", name: "Sewa / Properti", icon: Home },
  { id: "tagihan", name: "Tagihan & Utilitas", icon: Receipt },
  { id: "kesehatan", name: "Kesehatan", icon: HeartPulse },
  { id: "gaji", name: "Gaji & Inflow", icon: Briefcase },
  { id: "investasi", name: "Investasi", icon: TrendingUp },
];

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("professional");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCategorySelection, setCustomCategorySelection] = useState<Record<string, boolean>>({
    makanan: true,
    kopi: true,
    groceries: true,
    transportasi: true,
    tagihan: true,
    gaji: true,
  });

  if (!isOpen) return null;

  const currentPreset =
    ONBOARDING_PRESETS.find((p) => p.key === selectedPreset) || ONBOARDING_PRESETS[1];

  const handleSelectPreset = (key: PresetKey) => {
    triggerHaptic("light");
    if (key === "custom") {
      setIsCustomMode(true);
      setSelectedPreset("custom");
    } else {
      setIsCustomMode(false);
      setSelectedPreset(key);
    }
  };

  const toggleCustomCategory = (id: string) => {
    triggerHaptic("light");
    setCustomCategorySelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFinish = () => {
    triggerSuccessHaptic();

    // 1. Apply Layout Preset
    try {
      const targetPreset = isCustomMode ? "minimal" : currentPreset.widgetPreset;
      const stored = loadStoredWidgets(localStorage.getItem(STORAGE_KEY), DEFAULT_HOME_WIDGETS);
      const updated = applyPresetToWidgets(stored, targetPreset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[OnboardingModal] Failed to write preset:", e);
    }

    // 2. Persist chosen onboarding preset and mark onboarded
    try {
      localStorage.setItem("trouvaille_onboarding_preset", selectedPreset);
      localStorage.setItem("trouvaille_onboarded", "true");
    } catch {}

    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col justify-between overflow-hidden select-none"
      style={{
        background: "var(--bg-canvas, #08080a)",
        fontFamily: "'Urbanist', sans-serif",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
      }}
    >
      {/* 1. ATMOSPHERIC LIQUID GLASS GLOW BACKDROP */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-28 w-96 h-96 rounded-full bg-white/[0.045] blur-[140px]" />
        <div className="absolute bottom-1/4 -right-28 w-96 h-96 rounded-full bg-white/[0.035] blur-[130px]" />
      </div>

      {/* 2. HEADER: MINIMAL & ELEGANT */}
      <div className="px-6 relative z-10 space-y-1 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-white/10 bg-white/[0.03] text-white/60">
          <span>Pengaturan Awal</span>
        </div>
        <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">
          Pilih Profil Finansialmu
        </h1>
        <p className="text-[12.5px] font-normal text-white/50 leading-snug">
          Konfigurasi cerdas siap pakai sesuai kebutuhan gaya hidupmu
        </p>
      </div>

      {/* 3. INTERACTIVE PRESET SELECTOR (LIQUID GLASS PODS) */}
      <div className="px-6 flex-1 overflow-y-auto no-scrollbar py-3 space-y-2.5 relative z-10">
        <div className="grid grid-cols-2 gap-2">
          {ONBOARDING_PRESETS.map((preset) => {
            const isSelected = !isCustomMode && selectedPreset === preset.key;
            const Icon = preset.icon;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleSelectPreset(preset.key)}
                className={`p-3.5 rounded-[26px] text-left transition-all cursor-pointer active:scale-95 border flex flex-col justify-between ${
                  isSelected
                    ? "bg-white/[0.09] border-white/30 shadow-lg"
                    : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04]"
                }`}
                style={{
                  minHeight: "124px",
                  boxShadow: isSelected
                    ? "inset 0 1px 1.5px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.4)"
                    : undefined,
                }}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-[10px] font-mono font-medium text-white/40">
                    {preset.code}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                      isSelected
                        ? "bg-white text-black border-white"
                        : "bg-white/[0.04] text-white/70 border-white/10"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </div>
                </div>

                <div className="mt-2">
                  <h3 className="text-[13px] font-semibold text-white leading-tight">
                    {preset.title}
                  </h3>
                  <p className="text-[10px] text-white/45 line-clamp-2 mt-1 leading-snug">
                    {preset.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 05 Kustom Mandiri Card */}
        <button
          type="button"
          onClick={() => handleSelectPreset("custom")}
          className={`w-full p-3.5 rounded-[24px] text-left transition-all cursor-pointer active:scale-98 border flex items-center justify-between ${
            isCustomMode
              ? "bg-white/[0.09] border-white/30 shadow-lg"
              : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04]"
          }`}
          style={{
            boxShadow: isCustomMode
              ? "inset 0 1px 1.5px rgba(255, 255, 255, 0.25)"
              : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isCustomMode
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.04] text-white/70 border-white/10"
              }`}
            >
              <SlidersHorizontal size={14} strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-white/40">05</span>
                <h4 className="text-[13px] font-semibold text-white">
                  Kustom Mandiri
                </h4>
              </div>
              <p className="text-[10.5px] text-white/45">
                Pilih sendiri kategori & akun sesuai kebutuhan pribadimu
              </p>
            </div>
          </div>
          <div
            className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
              isCustomMode
                ? "bg-white text-black border-white"
                : "border-white/20"
            }`}
          >
            {isCustomMode && <Check size={10} strokeWidth={3} />}
          </div>
        </button>

        {/* 4. DYNAMIC PREVIEW PANEL (LIQUID CHIPS) */}
        <div
          className="p-4 rounded-[26px] border space-y-3"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
          }}
        >
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-semibold text-white/80">
              {isCustomMode ? "Kustomisasi Kategori" : `Pratinjau Profil: ${currentPreset.title}`}
            </span>
            <span className="text-white/40 text-[10px]">
              {isCustomMode
                ? `${Object.values(customCategorySelection).filter(Boolean).length} dipilih`
                : `${currentPreset.categories.length} kategori & ${currentPreset.accounts.length} akun`}
            </span>
          </div>

          {/* Preset Preview vs Custom Selection */}
          <AnimatePresence mode="wait">
            {!isCustomMode ? (
              <motion.div
                key={currentPreset.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-2.5"
              >
                {/* Accounts Chips */}
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">
                    Akun & Dompet Awal
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPreset.accounts.map((acc) => (
                      <span
                        key={acc.name}
                        className="px-2.5 py-1 rounded-xl text-[10.5px] font-medium bg-white/[0.06] text-white/80 border border-white/10 flex items-center gap-1.5"
                      >
                        <Wallet size={11} strokeWidth={1.5} className="text-white/50" />
                        <span>{acc.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Categories Chips */}
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">
                    Kategori Transaksi
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPreset.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="px-2.5 py-1 rounded-xl text-[10.5px] font-medium bg-white/[0.04] text-white/70 border border-white/5"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Custom Chips Toggle Grid */
              <motion.div
                key="custom-selection"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap gap-1.5 pt-0.5"
              >
                {ALL_CUSTOM_CATEGORIES.map((cat) => {
                  const active = customCategorySelection[cat.id];
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCustomCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 ${
                        active
                          ? "bg-white text-black border-white shadow-sm"
                          : "bg-white/[0.03] text-white/60 border-white/10"
                      }`}
                    >
                      <Icon size={12} strokeWidth={1.75} />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 5. FLOATING BOTTOM ACTION POD (LIQUID GLASS BUTTON) */}
      <div className="px-6 pt-2 relative z-10 space-y-2">
        <motion.button
          type="button"
          onClick={handleFinish}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 px-5 rounded-[24px] font-semibold text-[14px] flex items-center justify-between cursor-pointer shadow-xl transition-transform bg-white text-zinc-950"
          style={{
            boxShadow:
              "0 12px 36px rgba(255, 255, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
          }}
        >
          <span className="font-semibold tracking-tight">
            Mulai Gunakan Trouvaille
          </span>
          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center">
            <ArrowRight size={14} strokeWidth={2} />
          </div>
        </motion.button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/35 text-center">
          <ShieldCheck size={11} strokeWidth={1.5} />
          <span>Pengaturan dapat diubah sewaktu-waktu di menu Settings</span>
        </div>
      </div>
    </div>
  );
}
