import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Database,
  Key,
  Radio,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

export interface CardTheme {
  id: string;
  name: string;
  subtitle: string;
  gradient: string;
  border: string;
  textColor: string;
  chipColor: string;
  glowColor: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "obsidian",
    name: "Obsidian Onyx",
    subtitle: "Deep reflective obsidian with diamond hairline border",
    gradient:
      "linear-gradient(135deg, rgba(30,30,36,0.95) 0%, rgba(9,9,12,0.98) 50%, rgba(18,18,22,1) 100%)",
    border: "rgba(255, 255, 255, 0.22)",
    textColor: "#ffffff",
    chipColor: "rgba(255, 255, 255, 0.18)",
    glowColor: "rgba(255, 255, 255, 0.15)",
  },
  {
    id: "titanium",
    name: "Titanium Slate",
    subtitle: "Frosted brushed metallic titanium with platinum accents",
    gradient:
      "linear-gradient(135deg, rgba(60,60,68,0.9) 0%, rgba(26,26,30,0.95) 55%, rgba(40,40,46,1) 100%)",
    border: "rgba(255, 255, 255, 0.28)",
    textColor: "#ffffff",
    chipColor: "rgba(255, 255, 255, 0.22)",
    glowColor: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "alabaster",
    name: "Alabaster Frost",
    subtitle: "Frosted pearl white smoke with matte charcoal contrast",
    gradient:
      "linear-gradient(135deg, rgba(245,245,248,0.95) 0%, rgba(220,220,226,0.92) 55%, rgba(235,235,240,0.98) 100%)",
    border: "rgba(0, 0, 0, 0.14)",
    textColor: "#09090c",
    chipColor: "rgba(0, 0, 0, 0.12)",
    glowColor: "rgba(0, 0, 0, 0.08)",
  },
];

interface OrbitCardSelectorProps {
  selectedThemeId?: string;
  onThemeChange?: (theme: CardTheme) => void;
  className?: string;
  displayName?: string;
}

export function OrbitCardSelector({
  selectedThemeId = "obsidian",
  onThemeChange,
  className,
  displayName = "SOVEREIGN VAULT",
}: OrbitCardSelectorProps) {
  const [activeThemeId, setActiveThemeId] = useState(selectedThemeId);

  const activeTheme =
    CARD_THEMES.find((t) => t.id === activeThemeId) || CARD_THEMES[0]!;

  const handleSelectTheme = (theme: CardTheme) => {
    triggerHaptic("light");
    setActiveThemeId(theme.id);
    onThemeChange?.(theme);
    try {
      localStorage.setItem("trouvaille_vault_card_theme", theme.id);
    } catch {}
  };

  return (
    <div className={cn("w-full flex flex-col items-center select-none space-y-4", className)}>
      {/* ============================================================ */}
      {/* 1. ORBITING SATELLITE CANVAS WITH 3D MONOCHROME CARD         */}
      {/* ============================================================ */}
      <div className="relative w-full h-[220px] flex items-center justify-center overflow-hidden">
        {/* Ambient Back Glow */}
        <div
          className="absolute w-[220px] h-[140px] rounded-full blur-[60px] pointer-events-none transition-all duration-700"
          style={{ background: activeTheme.glowColor }}
        />

        {/* Orbit Ring 1: Inner Concentric Circle */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
          className="absolute w-[280px] h-[280px] rounded-full border border-white/[0.08] pointer-events-none"
        >
          {/* Satellite 1A: Shield */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
              className="px-2 py-1 rounded-full bg-[#0a0a0e]/90 border border-white/16 flex items-center gap-1 shadow-md"
            >
              <Shield size={11} className="text-white/80" />
              <span className="text-[9px] font-semibold text-white/70">AES-256</span>
            </motion.div>
          </div>

          {/* Satellite 1B: Zero Telemetry */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
              className="px-2 py-1 rounded-full bg-[#0a0a0e]/90 border border-white/16 flex items-center gap-1 shadow-md"
            >
              <Lock size={11} className="text-white/80" />
              <span className="text-[9px] font-semibold text-white/70">0 Bytes Cloud</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Orbit Ring 2: Outer Concentric Circle */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
          className="absolute w-[350px] h-[350px] rounded-full border border-white/[0.05] pointer-events-none"
        >
          {/* Satellite 2A: Biometric Key */}
          <div className="absolute top-1/2 -right-3 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
              className="px-2 py-1 rounded-full bg-[#0a0a0e]/90 border border-white/16 flex items-center gap-1 shadow-md"
            >
              <Key size={11} className="text-white/80" />
              <span className="text-[9px] font-semibold text-white/70">Enclave</span>
            </motion.div>
          </div>

          {/* Satellite 2B: Local Database */}
          <div className="absolute top-1/2 -left-3 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
              className="px-2 py-1 rounded-full bg-[#0a0a0e]/90 border border-white/16 flex items-center gap-1 shadow-md"
            >
              <Database size={11} className="text-white/80" />
              <span className="text-[9px] font-semibold text-white/70">Encrypted</span>
            </motion.div>
          </div>
        </motion.div>

        {/* ========================================================== */}
        {/* CENTERPIECE: 3D MONOCHROME LUXURY VAULT CARD               */}
        {/* ========================================================== */}
        <motion.div
          key={activeTheme.id}
          initial={{ scale: 0.95, opacity: 0.8, y: 4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative z-10 w-[260px] sm:w-[280px] h-[155px] sm:h-[165px] rounded-[20px] p-4 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            background: activeTheme.gradient,
            border: `1px solid ${activeTheme.border}`,
            color: activeTheme.textColor,
            boxShadow:
              "0 20px 40px rgba(0,0,0,0.65), inset 0 1.5px 1px rgba(255,255,255,0.22)",
          }}
        >
          {/* Subtle Fractal Slits Texture Overlay */}
          <div
            className="absolute inset-0 opacity-[0.22] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px)",
            }}
          />

          {/* Card Top Row: Wordmark & EMV Contactless Icon */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold tracking-[0.24em] uppercase">
                Trouvaille
              </span>
              <Sparkles size={11} className="opacity-70" />
            </div>
            <Radio size={15} strokeWidth={1.75} className="opacity-70 rotate-90" />
          </div>

          {/* Card Middle: EMV Microchip & Vault Class */}
          <div className="flex items-center justify-between relative z-10 my-auto">
            {/* Frosted Gold/Silver Microchip */}
            <div
              className="w-8.5 h-6 rounded-[7px] border flex items-center justify-center relative overflow-hidden"
              style={{
                background: activeTheme.chipColor,
                borderColor: activeTheme.border,
              }}
            >
              <div className="w-full h-[1px] bg-white/20 absolute top-1/2 -translate-y-1/2" />
              <div className="h-full w-[1px] bg-white/20 absolute left-1/2 -translate-x-1/2" />
              <div className="w-4 h-3 rounded-[3px] border border-white/25" />
            </div>

            <span className="text-[9.5px] font-semibold tracking-wider opacity-60 uppercase">
              Sovereign Ledger
            </span>
          </div>

          {/* Card Bottom: Number & Cardholder */}
          <div className="flex items-end justify-between relative z-10">
            <div>
              <div className="text-[13px] font-mono tracking-widest font-semibold amount">
                •••• 8842
              </div>
              <div className="text-[9.5px] font-semibold uppercase tracking-wider opacity-65 truncate max-w-[140px] mt-0.5">
                {displayName}
              </div>
            </div>

            <span
              className="text-[8.5px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
              style={{
                background: "rgba(255,255,255,0.08)",
                borderColor: activeTheme.border,
              }}
            >
              Vault Edition
            </span>
          </div>
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/* 2. LUXURY MONOCHROME GRADIENT PALETTE SELECTOR               */}
      {/* ============================================================ */}
      <div className="w-full max-w-xs space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {CARD_THEMES.map((theme) => {
            const isSelected = activeThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme)}
                className={`py-2 px-2 rounded-[18px] text-[11px] font-semibold transition-all active:scale-95 cursor-pointer text-center border flex flex-col items-center gap-1 ${
                  isSelected
                    ? "bg-white text-zinc-950 border-white shadow-lg"
                    : "bg-white/[0.04] border-white/12 text-white/70 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/25"
                  style={{ background: theme.gradient }}
                />
                <span className="truncate w-full">{theme.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic theme description */}
        <p className="text-[11px] text-center text-white/45 leading-relaxed px-2">
          {activeTheme.subtitle}
        </p>
      </div>
    </div>
  );
}
