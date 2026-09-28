import { useState, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  ArrowRight,
  ScanFace,
  Eye,
  EyeOff,
  User,
  TrendingUp,
  Mic,
  Shield,
  Layers,
  Loader2,
  KeyRound,
  Delete,
  X,
  Activity,
  Check,
  Sparkles,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  authenticateWithBiometrics,
  getBiometricLoginCredentials,
  saveBiometricLoginCredentials,
  getSecuritySettings,
  authenticateWithPin,
} from "../lib/biometricAuth";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";

interface ShowcaseSlide {
  title: string;
  tagline: string;
  visual: "chart" | "voice" | "vault" | "domain" | "runway";
}

function formatAuthError(msg: string, isIndonesian: boolean): string {
  if (!msg) {
    return isIndonesian
      ? "Terjadi kesalahan tak terduga. Silakan coba lagi."
      : "An unexpected error occurred. Please try again.";
  }
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return isIndonesian
      ? "Surel atau kata sandi tidak cocok. Silakan periksa kembali."
      : "Incorrect email or password. Please check your credentials.";
  }
  if (lower.includes("email not confirmed")) {
    return isIndonesian
      ? "Silakan verifikasi surel Anda sebelum masuk, atau periksa folder spam."
      : "Please verify your email before signing in, or check your spam folder.";
  }
  if (lower.includes("user already registered")) {
    return isIndonesian
      ? "Akun dengan surel ini sudah terdaftar. Silakan masuk."
      : "An account with this email already exists. Please sign in instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return isIndonesian
      ? "Terlalu banyak percobaan. Harap tunggu sejenak lalu coba lagi."
      : "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("password should be at least")) {
    return isIndonesian
      ? "Kata sandi harus terdiri dari minimal 6 karakter."
      : "Password must contain at least 6 characters.";
  }
  return msg;
}

function getPasswordStrength(pwd: string, isIndonesian: boolean): { score: number; label: string } {
  if (!pwd) return { score: 0, label: "" };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  const labelsEn = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const labelsId = ["Terlalu pendek", "Lemah", "Cukup", "Kuat", "Sangat Kuat"];
  const labels = isIndonesian ? labelsId : labelsEn;
  return { score, label: labels[score] || (isIndonesian ? "Lemah" : "Weak") };
}

function getShowcaseSlides(isIndonesian: boolean): ShowcaseSlide[] {
  return [
    {
      title: "Trouvaille",
      tagline: isIndonesian
        ? "Seluruh keuangan Anda dalam satu tempat.\nCatat, rencanakan, dan raih kejelasan finansial sejati."
        : "Your money in one place.\nTrack, plan, and build lasting financial clarity.",
      visual: "chart",
    },
    {
      title: isIndonesian ? "Pencatatan Seketika" : "Frictionless Capture",
      tagline: isIndonesian
        ? "Catat pengeluaran dalam hitungan detik\ndengan suara percakapan atau pemindaian kamera."
        : "Log expenses in seconds\nwith conversational voice or camera receipt scanning.",
      visual: "voice",
    },
    {
      title: isIndonesian ? "Brankas Privasi Nol" : "Zero-Knowledge Vault",
      tagline: isIndonesian
        ? "Buku besar keuangan Anda dienkripsi penuh\ndan sepenuhnya privat di perangkat Anda."
        : "Your financial ledger stays encrypted\nand strictly private on your device.",
      visual: "vault",
    },
    {
      title: isIndonesian ? "Pemisahan Domain" : "Domain Isolation",
      tagline: isIndonesian
        ? "Pisahkan pengeluaran pribadi\ndari arus kas bisnis dan proyek sampingan secara tegas."
        : "Strictly separate personal outlays\nfrom professional and side-hustle cashflow.",
      visual: "domain",
    },
    {
      title: isIndonesian ? "Ketahanan Finansial" : "Runway & Independence",
      tagline: isIndonesian
        ? "Telemetri arus kas proaktif\ndan metrik ketahanan dana darurat yang cerdas."
        : "Proactive cashflow telemetry\nand intelligent financial runway metrics.",
      visual: "runway",
    },
  ];
}

interface DynamicShowcaseCapsuleProps {
  currentSlide: ShowcaseSlide;
  isDark: boolean;
  isIndonesian: boolean;
  chartGradientId: string;
  onNext: () => void;
  onPrev: () => void;
}

function DynamicShowcaseCapsule({
  currentSlide,
  isDark,
  isIndonesian,
  chartGradientId,
  onNext,
  onPrev,
}: DynamicShowcaseCapsuleProps) {
  const [isInteracted, setIsInteracted] = useState(false);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      onDragEnd={(_, info) => {
        if (info.offset.x < -40) {
          triggerHaptic("light");
          onNext();
        } else if (info.offset.x > 40) {
          triggerHaptic("light");
          onPrev();
        }
      }}
      onClick={() => {
        triggerHaptic("light");
        setIsInteracted((prev) => !prev);
      }}
      className="relative w-full max-w-[340px] sm:max-w-[365px] min-h-[165px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      <AnimatePresence mode="wait">
        {/* ============================================================ */}
        {/* SLIDE 0: MINIMALIST OPEN GLASS HORIZON & LIVE SPLINE        */}
        {/* ============================================================ */}
        {currentSlide.visual === "chart" && (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`w-full rounded-[26px] p-3.5 border flex flex-col gap-2.5 backdrop-blur-2xl transition-all duration-300 ${
              isDark
                ? "bg-[#121216]/75 border-white/[0.1] shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.18)]"
                : "bg-white/80 border-black/[0.07] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
            }`}
          >
            {/* Top Bar: Trajectory Telemetry */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <TrendingUp
                    size={11}
                    strokeWidth={2}
                    className={isDark ? "text-white" : "text-zinc-900"}
                  />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Trajektori Arus Kas" : "Cashflow Trajectory"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "bg-black/[0.05] border-black/10 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                }`}
              >
                {isIndonesian ? "+28.4% Bersih" : "+28.4% Net Inflow"}
              </div>
            </div>

            {/* Spline Wave Area */}
            <div className="relative h-18 w-full flex items-center justify-center overflow-hidden rounded-xl">
              <svg
                viewBox="0 0 320 80"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`${chartGradientId}-spline`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isDark ? "#ffffff" : "#000000"}
                      stopOpacity={isDark ? 0.22 : 0.12}
                    />
                    <stop
                      offset="100%"
                      stopColor={isDark ? "#ffffff" : "#000000"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 65 Q 40 45, 80 50 T 160 30 T 240 16 T 320 28 L 320 80 L 0 80 Z"
                  fill={`url(#${chartGradientId}-spline)`}
                />
                <path
                  d="M 0 65 Q 40 45, 80 50 T 160 30 T 240 16 T 320 28"
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.85)" : "rgba(18,18,22,0.85)"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Glowing Spline Node */}
                <circle
                  cx="240"
                  cy="16"
                  r="4"
                  fill={isDark ? "#ffffff" : "#121216"}
                  className="animate-pulse"
                />
                <circle
                  cx="240"
                  cy="16"
                  r="8"
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Baseline Month Markers */}
            <div
              className={`flex items-center justify-between text-[9.5px] font-mono tracking-wider px-1 pt-0.5 border-t ${
                isDark ? "border-white/[0.06] text-white/40" : "border-black/[0.06] text-zinc-400"
              }`}
            >
              <span>{isIndonesian ? "Jan" : "Jan"}</span>
              <span>{isIndonesian ? "Apr" : "Apr"}</span>
              <span>{isIndonesian ? "Jul" : "Jul"}</span>
              <span>{isIndonesian ? "Okt" : "Oct"}</span>
              <span>{isIndonesian ? "Des" : "Dec"}</span>
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 1: 3 STAGGERED CASCADING LIQUID GLASS PILLS           */}
        {/* ============================================================ */}
        {currentSlide.visual === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full flex flex-col gap-2.5 items-center justify-center py-1"
          >
            {/* Pill 1: Top, offset left by 12px */}
            <motion.div
              animate={{
                x: isInteracted ? -16 : -10,
                y: isInteracted ? -2 : 0,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`w-[92%] rounded-full py-2 px-3.5 border flex items-center justify-between backdrop-blur-2xl shadow-md ${
                isDark
                  ? "bg-white/[0.07] border-white/14 shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] text-white"
                  : "bg-white/90 border-black/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Mic size={11} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-tight">
                  {isIndonesian ? "Dikte Suara" : "Voice Dictation"}
                </span>
              </div>

              {/* Mini 6-bar live pulsing equalizer */}
              <div className="flex items-center gap-1">
                {[10, 16, 22, 14, 20, 12].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isInteracted ? [h * 0.6, h * 1.3, h] : [h * 0.8, h, h * 0.9],
                    }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.6 + i * 0.1 }}
                    className={`w-0.5 rounded-full ${isDark ? "bg-white/70" : "bg-zinc-800"}`}
                    style={{ height: `${h}px` }}
                  />
                ))}
                <span
                  className={`text-[9.5px] font-mono ml-1.5 px-1.5 py-0.5 rounded-md ${
                    isDark ? "bg-white/10 text-white/80" : "bg-black/5 text-zinc-700"
                  }`}
                >
                  {isIndonesian ? '"Kopi 35rb"' : '"$4.50 Coffee"'}
                </span>
              </div>
            </motion.div>

            {/* Pill 2: Middle, offset right by 14px (Hero prominence) */}
            <motion.div
              animate={{
                x: isInteracted ? 18 : 12,
                scale: isInteracted ? 1.02 : 1,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.04 }}
              className={`w-[95%] rounded-full py-2.5 px-4 border flex items-center justify-between backdrop-blur-2xl shadow-xl z-10 ${
                isDark
                  ? "bg-[#18181e]/90 border-white/18 shadow-[0_12px_28px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] text-white"
                  : "bg-white border-black/[0.1] shadow-[0_12px_28px_rgba(0,0,0,0.08),inset_0_1.5px_2px_rgba(255,255,255,1)] text-zinc-950"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/12 border-white/20" : "bg-black/6 border-black/12"
                  }`}
                >
                  <ScanFace size={13} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[11.5px] font-bold tracking-tight leading-none">
                    {isIndonesian ? "Pindai Bukti Bayar" : "Receipt Camera Scan"}
                  </div>
                  <div
                    className={`text-[8.5px] mt-0.5 font-medium ${
                      isDark ? "text-white/50" : "text-zinc-500"
                    }`}
                  >
                    {isIndonesian ? "Ekstraksi OCR Otomatis" : "Instant OCR Engine"}
                  </div>
                </div>
              </div>

              <div
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/10 border-white/15 text-white"
                    : "bg-black/5 border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "< 1 Detik" : "< 1s Engine"}
              </div>
            </motion.div>

            {/* Pill 3: Bottom, offset slightly left by 4px */}
            <motion.div
              animate={{
                x: isInteracted ? -6 : -2,
                y: isInteracted ? 2 : 0,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.08 }}
              className={`w-[88%] rounded-full py-1.5 px-3.5 border flex items-center justify-between backdrop-blur-2xl shadow-md ${
                isDark
                  ? "bg-white/[0.05] border-white/10 shadow-[0_6px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] text-white/90"
                  : "bg-white/85 border-black/[0.06] shadow-[0_6px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] text-zinc-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/12" : "bg-black/4 border-black/8"
                  }`}
                >
                  <Sparkles size={10} strokeWidth={2} />
                </div>
                <span className="text-[10.5px] font-medium">
                  {isIndonesian ? "Preset Cepat 1-Ketuk" : "1-Tap Preset"}
                </span>
              </div>

              <span className="text-[11px] font-bold font-mono tracking-tight">
                {isIndonesian ? "Rp 50.000" : "$50.00"}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 2: CRYPTOGRAPHIC CRYSTALLINE PLATE WITH 3 DIES         */}
        {/* ============================================================ */}
        {currentSlide.visual === "vault" && (
          <motion.div
            key="vault"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`w-full rounded-[26px] p-3.5 border flex flex-col gap-2.5 backdrop-blur-2xl ${
              isDark
                ? "bg-[#121216]/80 border-white/[0.12] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                : "bg-white/90 border-black/[0.08] shadow-[0_14px_32px_-8px_rgba(0,0,0,0.07),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
            }`}
          >
            {/* Top Shield Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Shield size={11} strokeWidth={2} className={isDark ? "text-white" : "text-zinc-900"} />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Brankas Kriptografi Klien" : "Client Cryptographic Vault"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white"
                    : "bg-black/[0.05] border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "Terkunci" : "Sealed"}
              </div>
            </div>

            {/* 3 Crystalline Security Dies */}
            <div className="grid grid-cols-3 gap-2 py-0.5">
              <div
                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 ${
                  isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
                }`}
              >
                <Lock size={12} className={isDark ? "text-white/80" : "text-zinc-800"} />
                <span className="text-[10px] font-bold tracking-tight">AES-256</span>
                <span className={`text-[8.5px] leading-tight ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                  {isIndonesian ? "Klien GCM" : "Client GCM"}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 ${
                  isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
                }`}
              >
                <Check size={12} className={isDark ? "text-white/80" : "text-zinc-800"} />
                <span className="text-[10px] font-bold tracking-tight">Zero-Log</span>
                <span className={`text-[8.5px] leading-tight ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                  {isIndonesian ? "Privasi Nol" : "Zero Trace"}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 ${
                  isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
                }`}
              >
                <ScanFace size={12} className={isDark ? "text-white/80" : "text-zinc-800"} />
                <span className="text-[10px] font-bold tracking-tight">Enclave</span>
                <span className={`text-[8.5px] leading-tight ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                  {isIndonesian ? "Kunci Lokal" : "Device Key"}
                </span>
              </div>
            </div>

            {/* Footnote */}
            <div
              className={`text-center py-1 rounded-xl text-[9px] font-medium border ${
                isDark ? "border-white/6 text-white/45" : "border-black/6 text-zinc-500"
              }`}
            >
              {isIndonesian
                ? "Kunci dekripsi tidak pernah meninggalkan memori perangkat"
                : "Decryption keys strictly confined to local device memory"}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 3: ASYMMETRIC SPLIT FLOATING SLABS                     */}
        {/* ============================================================ */}
        {currentSlide.visual === "domain" && (
          <motion.div
            key="domain"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full flex flex-col gap-2 items-center"
          >
            {/* Top Bar Header */}
            <div className="w-full flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Layers size={11} strokeWidth={2} className={isDark ? "text-white" : "text-zinc-900"} />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Pemisahan Buku Besar" : "Domain Ledger Isolation"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white"
                    : "bg-black/[0.05] border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "Partisi Tegas" : "Strict Partition"}
              </div>
            </div>

            {/* Two Asymmetric Split Floating Slabs */}
            <div className="w-full flex items-center justify-between gap-2.5 pt-0.5">
              {/* Left Slab: Personal (Shifted slightly up -2px) */}
              <motion.div
                animate={{ y: isInteracted ? -4 : -1 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`flex-1 rounded-[22px] p-3 border flex flex-col justify-between backdrop-blur-2xl shadow-lg ${
                  isDark
                    ? "bg-[#141418]/85 border-white/12 shadow-[0_10px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "bg-white/90 border-black/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)]"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                      isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                    }`}
                  >
                    <User size={10} className={isDark ? "text-white/80" : "text-zinc-800"} />
                  </div>
                  <span className="text-[10.5px] font-semibold tracking-tight">
                    {isIndonesian ? "Pribadi" : "Personal"}
                  </span>
                </div>
                <div className="text-[13.5px] font-bold font-mono tracking-tight">
                  {isIndonesian ? "Rp 64,5 Jt" : "$4,250.00"}
                </div>
                <span
                  className={`text-[8.5px] mt-1 ${isDark ? "text-white/45" : "text-zinc-500"}`}
                >
                  {isIndonesian ? "Gaya hidup & keluarga" : "Household & Living"}
                </span>
              </motion.div>

              {/* Right Slab: Venture (Shifted slightly down +2px) */}
              <motion.div
                animate={{ y: isInteracted ? 4 : 2 }}
                transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.04 }}
                className={`flex-1 rounded-[22px] p-3 border flex flex-col justify-between backdrop-blur-2xl shadow-lg ${
                  isDark
                    ? "bg-[#16161c]/90 border-white/15 shadow-[0_12px_26px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.22)]"
                    : "bg-white/95 border-black/[0.09] shadow-[0_10px_22px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,1)]"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                      isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                    }`}
                  >
                    <Activity size={10} className={isDark ? "text-white/80" : "text-zinc-800"} />
                  </div>
                  <span className="text-[10.5px] font-semibold tracking-tight">
                    {isIndonesian ? "Usaha" : "Venture"}
                  </span>
                </div>
                <div className="text-[13.5px] font-bold font-mono tracking-tight">
                  {isIndonesian ? "Rp 285 Jt" : "$18,920.00"}
                </div>
                <span
                  className={`text-[8.5px] mt-1 ${isDark ? "text-white/45" : "text-zinc-500"}`}
                >
                  {isIndonesian ? "Operasional & faktur" : "Operations & Invoices"}
                </span>
              </motion.div>
            </div>

            {/* Divider Firewall Tag */}
            <div
              className={`w-full text-center py-1 rounded-xl text-[9px] font-medium border ${
                isDark ? "border-white/6 text-white/40" : "border-black/6 text-zinc-500"
              }`}
            >
              {isIndonesian
                ? "Batas isolasi mencegah kontaminasi saldo antar domain"
                : "Strict firewall prevents cross-ledger contamination"}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* SLIDE 4: AEROSPACE RUNWAY DIAL & PROGRESS ARC                */}
        {/* ============================================================ */}
        {currentSlide.visual === "runway" && (
          <motion.div
            key="runway"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`w-full rounded-[26px] p-3.5 border flex flex-col gap-2.5 backdrop-blur-2xl ${
              isDark
                ? "bg-[#121216]/80 border-white/[0.12] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                : "bg-white/90 border-black/[0.08] shadow-[0_14px_32px_-8px_rgba(0,0,0,0.07),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
            }`}
          >
            {/* Top Runway Telemetry */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Sparkles size={11} strokeWidth={2} className={isDark ? "text-white" : "text-zinc-900"} />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Ketahanan Finansial" : "Runway Telemetry"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white"
                    : "bg-black/[0.05] border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "Aman" : "Safe Zone"}
              </div>
            </div>

            {/* Main Dial & Progress Arc */}
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-bold tracking-tight">8.4</span>
                  <span
                    className={`text-[11px] font-medium ${isDark ? "text-white/60" : "text-zinc-600"}`}
                  >
                    {isIndonesian ? "bulan cadangan" : "months runway"}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono ${isDark ? "text-white/45" : "text-zinc-500"}`}
                >
                  {isIndonesian ? "Target: 6 Bln" : "Target: 6 Mo"}
                </span>
              </div>

              {/* Multi-Segment Runway Progress Bar */}
              <div
                className={`h-2 w-full rounded-full overflow-hidden p-0.5 border ${
                  isDark ? "bg-black/40 border-white/10" : "bg-zinc-200 border-black/10"
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "70%" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isDark ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "bg-zinc-950"
                  }`}
                />
              </div>
            </div>

            {/* Bottom Dual Telemetry Pills */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div
                className={`flex-1 text-center py-1 rounded-xl text-[9px] font-semibold border ${
                  isDark
                    ? "bg-white/[0.04] border-white/8 text-white/60"
                    : "bg-black/[0.03] border-black/6 text-zinc-600"
                }`}
              >
                {isIndonesian ? "Pengeluaran: Aman" : "Burn Rate: Stable"}
              </div>
              <div
                className={`flex-1 text-center py-1 rounded-xl text-[9px] font-semibold border ${
                  isDark
                    ? "bg-white/[0.04] border-white/8 text-white/60"
                    : "bg-black/[0.03] border-black/6 text-zinc-600"
                }`}
              >
                {isIndonesian ? "Dana Darurat: 140%" : "Emergency Reserve: 140%"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function LoginPage() {
  const chartGradientId = useId();
  const { setSession, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();

  const [activeSlide, setActiveSlide] = useState(0);
  const [viewMode, setViewMode] = useState<"welcome" | "login">("welcome");

  // Inline email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => getBiometricLoginCredentials()?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Vault PIN Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinVerifying, setPinVerifying] = useState(false);
  const [hasVaultPin] = useState(() => getSecuritySettings().hasPin);

  const slides = getShowcaseSlides(isIndonesian);

  // Auto-advance showcase slides every 5.5 seconds (paused when user opens form or modal)
  useEffect(() => {
    if (showEmailForm || showPinModal) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [showEmailForm, showPinModal, slides.length]);

  const handleBiometricLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    triggerHaptic("medium");
    try {
      const res = await authenticateWithBiometrics();
      if (res.success && res.session) {
        triggerSuccessHaptic();
        setSession(res.session);
        return;
      }

      if (res.email && !email) {
        setEmail(res.email);
      }

      if (res.error) {
        triggerHaptic("heavy");
        setError(res.error);
      }
    } catch (err: any) {
      triggerHaptic("heavy");
      setError(err?.message || (isIndonesian ? "Autentikasi biometrik gagal." : "Biometric authentication failed."));
    } finally {
      setLoading(false);
    }
  }, [email, setSession, isIndonesian]);

  const handleOAuthLogin = async (provider: "google") => {
    setLoading(true);
    setError(null);
    setMessage(null);
    triggerHaptic("medium");
    try {
      const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
      const redirectUri = isNative
        ? "com.alhafidz.trouvaille://auth-callback"
        : typeof window !== "undefined"
          ? window.location.origin
          : undefined;

      if (isNative) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUri,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: "_system" });
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUri,
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err?.message || (isIndonesian ? `Gagal masuk dengan ${provider}.` : `Failed to sign in with ${provider}.`));
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    triggerHaptic("medium");
    continueAsGuest();
  };

  const handleToggleEmailForm = () => {
    triggerHaptic("light");
    setError(null);
    setMessage(null);
    setShowEmailForm((prev) => !prev);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(
        isIndonesian
          ? "Masukkan alamat surel Anda untuk menyetel ulang kata sandi."
          : "Please enter your email address to reset password.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const resetRedirectUri =
        typeof window !== "undefined" && Capacitor.isNativePlatform()
          ? "com.alhafidz.trouvaille://reset-password"
          : typeof window !== "undefined"
            ? `${window.location.origin}/?type=recovery`
            : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectUri,
      });
      if (error) throw error;
      setMessage(
        isIndonesian
          ? "Tautan pengaturan ulang kata sandi telah dikirim ke surel Anda."
          : "Password reset link sent to your email.",
      );
    } catch (err: any) {
      setError(
        err?.message ||
          (isIndonesian ? "Gagal mengirimkan tautan pengaturan ulang." : "Failed to send reset link."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const isSignUpMode = viewMode === "welcome";

    if (isSignUpMode) {
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(formatAuthError(error.message, isIndonesian));
      } else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password);
        setSession(data.session);
      } else {
        setMessage(
          isIndonesian
            ? "Akun berhasil dibuat. Periksa surel Anda untuk verifikasi, atau masuk langsung."
            : "Account created! Check your email to verify, or sign in directly.",
        );
        setViewMode("login");
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(formatAuthError(error.message, isIndonesian));
      } else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password);
        setSession(data.session);
      }
    }
    setLoading(false);
  };

  // PIN Unlock Modal submission
  const handlePinDigit = async (digit: string) => {
    if (pinInput.length >= 6 || pinVerifying) return;
    triggerHaptic("light");
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setPinError(null);

    if (nextPin.length >= 4) {
      setPinVerifying(true);
      try {
        const res = await authenticateWithPin(nextPin);
        if (res.success) {
          triggerSuccessHaptic();
          if (res.session) {
            setSession(res.session);
          } else if (res.email) {
            setEmail(res.email);
            setShowPinModal(false);
            setViewMode("login");
            setShowEmailForm(true);
          } else {
            setShowPinModal(false);
          }
        } else {
          triggerHaptic("heavy");
          setPinError(res.error || (isIndonesian ? "PIN tidak valid." : "Invalid PIN."));
          setTimeout(() => setPinInput(""), 600);
        }
      } catch (err: any) {
        triggerHaptic("heavy");
        setPinError(err?.message || (isIndonesian ? "Gagal memverifikasi PIN." : "Failed to verify PIN."));
        setTimeout(() => setPinInput(""), 600);
      } finally {
        setPinVerifying(false);
      }
    }
  };

  const handlePinDelete = () => {
    triggerHaptic("light");
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const currentSlide = slides[activeSlide] || slides[0];

  return (
    <div
      className={`min-h-dvh w-full flex flex-col justify-between items-center relative overflow-hidden select-none transition-colors duration-500 ${
        isDark ? "bg-[#060608] text-white" : "bg-[#f4f4f7] text-zinc-950"
      }`}
      style={{
        fontFamily: "'Urbanist', sans-serif",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 16px)",
      }}
    >
      {/* ============================================================ */}
      {/* 1. CINEMATIC AMBIENT AURORA MESH */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft top-center aura */}
        <div
          className={`absolute top-[8%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full blur-[110px] ${
            isDark ? "bg-white/[0.06]" : "bg-black/[0.02]"
          }`}
        />
        {/* Subtle mid-horizon glow */}
        <div
          className={`absolute top-[42%] left-1/2 -translate-x-1/2 w-[540px] h-[280px] rounded-full blur-[100px] ${
            isDark ? "bg-white/[0.04]" : "bg-black/[0.015]"
          }`}
        />
        {/* Subtle bottom vignette */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t ${
            isDark
              ? "from-black via-black/80 to-transparent"
              : "from-[#f4f4f7] via-[#f4f4f7]/80 to-transparent"
          }`}
        />
      </div>

      {/* ============================================================ */}
      {/* 2. CELESTIAL HORIZON ARC (CRADLES SHOWCASE ABOVE CARD) */}
      {/* ============================================================ */}
      <div
        className={`absolute top-[38%] sm:top-[40%] left-1/2 -translate-x-1/2 w-[170vw] max-w-[900px] aspect-square rounded-[50%] pointer-events-none border-t transition-all duration-700 ${
          isDark ? "border-white/20" : "border-black/10"
        }`}
        style={{
          background: isDark
            ? "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 35%, transparent 65%)"
            : "radial-gradient(ellipse at 50% 0%, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.01) 35%, transparent 65%)",
          boxShadow: isDark
            ? "0 -8px 35px rgba(255, 255, 255, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.35)"
            : "0 -8px 35px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.9)",
        }}
      />

      {/* ============================================================ */}
      {/* 3. TOP SECTION: BALANCED & ENRICHED 5-SLIDE SHOWCASE */}
      {/* ============================================================ */}
      <div className="flex-1 w-full max-w-sm px-5 relative z-10 flex flex-col justify-center items-center text-center py-2">
        {/* Dynamic Showcase Slide Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-1 mb-2.5"
          >
            <h1
              className={`text-[26px] sm:text-[28px] font-semibold tracking-tight leading-tight ${
                isDark ? "text-white" : "text-zinc-950"
              }`}
            >
              {currentSlide.title}
            </h1>
            <p
              className={`text-[12.5px] sm:text-[13px] font-normal whitespace-pre-line leading-relaxed max-w-[310px] mx-auto ${
                isDark ? "text-white/55" : "text-zinc-600"
              }`}
            >
              {currentSlide.tagline}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dynamic Showcase Display Stage (Architecturally Differentiated Glass Morphism) */}
        <div className="w-full flex justify-center items-center min-h-[165px] my-1">
          <DynamicShowcaseCapsule
            currentSlide={currentSlide}
            isDark={isDark}
            isIndonesian={isIndonesian}
            chartGradientId={chartGradientId}
            onNext={() => {
              triggerHaptic("light");
              setActiveSlide((prev) => (prev + 1) % slides.length);
            }}
            onPrev={() => {
              triggerHaptic("light");
              setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
            }}
          />
        </div>

        {/* 5 Pagination Dots (Interactive & Auto-Synced) */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveSlide(idx);
              }}
              aria-label={`Slide ${idx + 1}`}
              className="p-1 cursor-pointer"
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeSlide
                    ? isDark
                      ? "w-5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                      : "w-5 bg-zinc-950 shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                    : isDark
                      ? "w-1.5 bg-white/25 hover:bg-white/50"
                      : "w-1.5 bg-black/20 hover:bg-black/40"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. BOTTOM LIQUID GLASS SHEET WITH INLINE EXPANSION           */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`w-full max-w-[480px] rounded-t-[36px] sm:rounded-t-[40px] px-6 pt-6 relative z-20 overflow-hidden border-t border-x transition-all ${
          isDark ? "border-white/[0.16]" : "border-black/[0.08]"
        }`}
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(18, 18, 22, 0.96) 55%, #0c0c0e 100%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 248, 250, 0.98) 60%, #ffffff 100%)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          boxShadow: isDark
            ? "0 -24px 60px rgba(0, 0, 0, 0.85), inset 0 1.5px 1px rgba(255, 255, 255, 0.28)"
            : "0 -20px 50px rgba(0, 0, 0, 0.12), inset 0 1.5px 1px rgba(255, 255, 255, 1)",
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
        }}
      >
        {/* Ambient Top Inner Glow */}
        <div
          className={`absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-[40px] pointer-events-none ${
            isDark ? "bg-white/[0.08]" : "bg-black/[0.02]"
          }`}
        />

        <AnimatePresence mode="wait">
          {/* ========================================================== */}
          {/* VIEW MODE A: WELCOME / SIGN UP PAGE                       */}
          {/* ========================================================== */}
          {viewMode === "welcome" ? (
            <motion.div
              key="view-welcome"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full flex flex-col"
            >
              {/* Heading & Subtitle */}
              <div className="text-center space-y-1 mb-5 px-2">
                <h2
                  className={`text-[21px] sm:text-[22px] font-semibold tracking-tight ${
                    isDark ? "text-white" : "text-zinc-950"
                  }`}
                >
                  {isIndonesian ? "Selamat Datang di Trouvaille" : "Welcome to Trouvaille"}
                </h2>
                <p
                  className={`text-[12.5px] font-normal leading-relaxed max-w-[310px] mx-auto ${
                    isDark ? "text-white/55" : "text-zinc-600"
                  }`}
                >
                  {isIndonesian
                    ? "Pantau arus kas harian dan bangun kejelasan aset dengan presisi tinggi."
                    : "Track everyday cashflow and build lasting wealth clarity with effortless precision."}
                </p>
              </div>

              {/* Action Area (Inline Form or Buttons) */}
              <div className="space-y-2.5 w-full">
                {showEmailForm ? (
                  /* INLINE REGISTRATION FORM */
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    onSubmit={handleSubmit}
                    className="space-y-2.5 overflow-hidden"
                  >
                    <div className="relative">
                      <Mail
                        size={15}
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@domain.com"
                        required
                        disabled={loading}
                        className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none transition-all ${
                          isDark
                            ? "bg-white/[0.05] border border-white/14 text-white placeholder:text-white/30"
                            : "bg-black/[0.035] border border-black/12 text-zinc-900 placeholder:text-zinc-400"
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <Lock
                        size={15}
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          isIndonesian ? "Kata sandi (min 6 karakter)" : "Password (min 6 characters)"
                        }
                        required
                        minLength={6}
                        disabled={loading}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl text-[13px] outline-none transition-all ${
                          isDark
                            ? "bg-white/[0.05] border border-white/14 text-white placeholder:text-white/30"
                            : "bg-black/[0.035] border border-black/12 text-zinc-900 placeholder:text-zinc-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                          isDark ? "text-white/40 hover:text-white/80" : "text-zinc-400 hover:text-zinc-700"
                        }`}
                      >
                        {showPassword ? (
                          <EyeOff size={15} strokeWidth={1.75} />
                        ) : (
                          <Eye size={15} strokeWidth={1.75} />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator for Registration (Strict Monochrome Rule 7) */}
                    {password.length > 0 && (
                      <div className="px-1 space-y-1">
                        <div
                          className={`w-full h-1 rounded-full overflow-hidden flex gap-1 ${
                            isDark ? "bg-white/10" : "bg-black/10"
                          }`}
                        >
                          {[1, 2, 3, 4].map((s) => {
                            const strength = getPasswordStrength(password, isIndonesian);
                            const active = strength.score >= s;
                            return (
                              <div
                                key={s}
                                className={`h-full flex-1 transition-all rounded-full ${
                                  active
                                    ? isDark
                                      ? "bg-white"
                                      : "bg-zinc-950"
                                    : isDark
                                      ? "bg-white/10"
                                      : "bg-black/10"
                                }`}
                                style={{
                                  opacity: active ? (s === 1 ? 0.35 : s === 2 ? 0.55 : s === 3 ? 0.8 : 1) : 1,
                                }}
                              />
                            );
                          })}
                        </div>
                        <div
                          className={`flex items-center justify-between text-[10px] ${
                            isDark ? "text-white/40" : "text-zinc-500"
                          }`}
                        >
                          <span>{isIndonesian ? "Kekuatan Kata Sandi" : "Password Strength"}</span>
                          <span className={isDark ? "text-white/80 font-medium" : "text-zinc-900 font-medium"}>
                            {getPasswordStrength(password, isIndonesian).label}
                          </span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <p
                        className={`text-[12px] font-medium px-1 ${
                          isDark ? "text-zinc-300" : "text-zinc-700"
                        }`}
                      >
                        {error}
                      </p>
                    )}
                    {message && (
                      <p
                        className={`text-[12px] font-medium px-1 ${
                          isDark ? "text-white" : "text-zinc-900"
                        }`}
                      >
                        {message}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all shadow-md cursor-pointer mt-1 ${
                        isDark
                          ? "bg-white text-zinc-950 hover:bg-zinc-100"
                          : "bg-zinc-950 text-white hover:bg-zinc-900"
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>{isIndonesian ? "Membuat Akun..." : "Creating Account..."}</span>
                        </div>
                      ) : (
                        <>
                          <span>{isIndonesian ? "Buat Akun" : "Create Account"}</span>
                          <ArrowRight size={15} strokeWidth={2} />
                        </>
                      )}
                    </button>

                    <div
                      className={`flex items-center justify-between px-1 pt-1 text-[11px] font-medium ${
                        isDark ? "text-white/50" : "text-zinc-500"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowEmailForm(false);
                          setError(null);
                          setMessage(null);
                        }}
                        className={`transition-colors cursor-pointer ${
                          isDark ? "hover:text-white" : "hover:text-zinc-900"
                        }`}
                      >
                        {isIndonesian ? "Batal" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("login");
                          setShowEmailForm(true);
                          setError(null);
                          setMessage(null);
                        }}
                        className={`transition-colors cursor-pointer font-medium ${
                          isDark ? "text-white/80 hover:text-white" : "text-zinc-800 hover:text-zinc-950"
                        }`}
                      >
                        {isIndonesian ? "Sudah punya akun? Masuk" : "Already have an account? Sign in"}
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  /* DEFAULT BUTTONS LIST */
                  <>
                    {/* 1. Continue with Email */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleToggleEmailForm}
                      className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer ${
                        isDark
                          ? "bg-white text-zinc-950 shadow-xl hover:bg-zinc-100"
                          : "bg-zinc-950 text-white shadow-xl hover:bg-zinc-900"
                      }`}
                      style={{
                        boxShadow: isDark
                          ? "0 8px 24px rgba(255, 255, 255, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.8)"
                          : "0 8px 24px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Mail
                          size={17}
                          strokeWidth={1.75}
                          className={isDark ? "text-zinc-900" : "text-white"}
                        />
                        <span>{isIndonesian ? "Lanjutkan dengan Surel" : "Continue with Email"}</span>
                      </div>
                      <ArrowRight
                        size={15}
                        strokeWidth={2}
                        className={isDark ? "text-zinc-500" : "text-zinc-400"}
                      />
                    </button>

                    {/* 2. Continue with Google */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthLogin("google")}
                      className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer group border ${
                        isDark
                          ? "bg-white/[0.055] border-white/16 text-white hover:bg-white/[0.08]"
                          : "bg-white/90 border-black/10 text-zinc-900 hover:bg-white shadow-sm"
                      }`}
                      style={{
                        boxShadow: isDark ? "inset 0 1px 1px rgba(255, 255, 255, 0.15)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>{isIndonesian ? "Lanjutkan dengan Google" : "Continue with Google"}</span>
                      </div>
                      <ArrowRight
                        size={15}
                        className={`group-hover:translate-x-0.5 transition-transform ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                    </button>

                    {/* 3. Continue without an account */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleContinueAsGuest}
                      className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-medium text-[13.5px] active:scale-[0.98] transition-all cursor-pointer group border ${
                        isDark
                          ? "bg-white/[0.035] border-white/12 text-white/90 hover:bg-white/[0.06]"
                          : "bg-black/[0.03] border-black/8 text-zinc-800 hover:bg-black/[0.05]"
                      }`}
                      style={{
                        boxShadow: isDark ? "inset 0 1px 1px rgba(255, 255, 255, 0.1)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <User
                          size={17}
                          strokeWidth={1.75}
                          className={isDark ? "text-white/70" : "text-zinc-600"}
                        />
                        <span>{isIndonesian ? "Lanjutkan tanpa akun" : "Continue without an account"}</span>
                      </div>
                      <ArrowRight
                        size={15}
                        className={`group-hover:translate-x-0.5 transition-transform ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                    </button>
                    <p
                      className={`text-[10.5px] text-center pt-0.5 ${
                        isDark ? "text-white/40" : "text-zinc-500"
                      }`}
                    >
                      {isIndonesian
                        ? "Privat & hanya di perangkat · Tanpa pencadangan cloud"
                        : "Private & on-device only · No cloud backup"}
                    </p>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-3.5">
                <div className={`h-[1px] flex-1 ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
                <span
                  className={`text-[11px] font-normal ${
                    isDark ? "text-white/40" : "text-zinc-400"
                  }`}
                >
                  {isIndonesian ? "atau" : "or"}
                </span>
                <div className={`h-[1px] flex-1 ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
              </div>

              {/* Footer: Switch to Log in */}
              <div className="text-center pb-1">
                <p
                  className={`text-[12px] font-normal ${
                    isDark ? "text-white/50" : "text-zinc-500"
                  }`}
                >
                  {isIndonesian ? "Sudah memiliki akun? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setViewMode("login");
                      setShowEmailForm(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className={`font-semibold hover:underline cursor-pointer transition-colors ${
                      isDark ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    {isIndonesian ? "Masuk" : "Log in"}
                  </button>
                </p>
              </div>
            </motion.div>
          ) : (
            /* ========================================================== */
            /* VIEW MODE B: LOG IN PAGE                                   */
            /* ========================================================== */
            <motion.div
              key="view-login"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full flex flex-col"
            >
              {/* Heading & Subtitle */}
              <div className="text-center space-y-1 mb-5 px-2">
                <h2
                  className={`text-[21px] sm:text-[22px] font-semibold tracking-tight ${
                    isDark ? "text-white" : "text-zinc-950"
                  }`}
                >
                  {isIndonesian ? "Selamat Datang Kembali" : "Welcome Back"}
                </h2>
                <p
                  className={`text-[12.5px] font-normal leading-relaxed max-w-[310px] mx-auto ${
                    isDark ? "text-white/55" : "text-zinc-600"
                  }`}
                >
                  {isIndonesian
                    ? "Masuk untuk mengakses brankas aset dan ledger tersinkronisasi milik Anda."
                    : "Sign in to access your synchronized wealth vault and transaction ledger."}
                </p>
              </div>

              {/* Action Area (Inline Form or Buttons) */}
              <div className="space-y-2.5 w-full">
                {showEmailForm ? (
                  /* INLINE SIGN-IN FORM */
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    onSubmit={handleSubmit}
                    className="space-y-2.5 overflow-hidden"
                  >
                    <div className="relative">
                      <Mail
                        size={15}
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@domain.com"
                        required
                        disabled={loading}
                        className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none transition-all ${
                          isDark
                            ? "bg-white/[0.05] border border-white/14 text-white placeholder:text-white/30"
                            : "bg-black/[0.035] border border-black/12 text-zinc-900 placeholder:text-zinc-400"
                        }`}
                      />
                    </div>

                    <div className="relative">
                      <Lock
                        size={15}
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isIndonesian ? "Kata sandi" : "Password"}
                        required
                        disabled={loading}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl text-[13px] outline-none transition-all ${
                          isDark
                            ? "bg-white/[0.05] border border-white/14 text-white placeholder:text-white/30"
                            : "bg-black/[0.035] border border-black/12 text-zinc-900 placeholder:text-zinc-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                          isDark ? "text-white/40 hover:text-white/80" : "text-zinc-400 hover:text-zinc-700"
                        }`}
                      >
                        {showPassword ? (
                          <EyeOff size={15} strokeWidth={1.75} />
                        ) : (
                          <Eye size={15} strokeWidth={1.75} />
                        )}
                      </button>
                    </div>

                    {error && (
                      <p
                        className={`text-[12px] font-medium px-1 ${
                          isDark ? "text-zinc-300" : "text-zinc-700"
                        }`}
                      >
                        {error}
                      </p>
                    )}
                    {message && (
                      <p
                        className={`text-[12px] font-medium px-1 ${
                          isDark ? "text-white" : "text-zinc-900"
                        }`}
                      >
                        {message}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all shadow-md cursor-pointer mt-1 ${
                        isDark
                          ? "bg-white text-zinc-950 hover:bg-zinc-100"
                          : "bg-zinc-950 text-white hover:bg-zinc-900"
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>{isIndonesian ? "Sedang Masuk..." : "Signing In..."}</span>
                        </div>
                      ) : (
                        <>
                          <span>{isIndonesian ? "Masuk dengan Surel" : "Sign In with Email"}</span>
                          <ArrowRight size={15} strokeWidth={2} />
                        </>
                      )}
                    </button>

                    <div
                      className={`flex items-center justify-between px-1 pt-1 text-[11px] font-medium ${
                        isDark ? "text-white/50" : "text-zinc-500"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowEmailForm(false);
                          setError(null);
                          setMessage(null);
                        }}
                        className={`transition-colors cursor-pointer ${
                          isDark ? "hover:text-white" : "hover:text-zinc-900"
                        }`}
                      >
                        {isIndonesian ? "Batal" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className={`transition-colors cursor-pointer ${
                          isDark ? "text-white/50 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {isIndonesian ? "Lupa kata sandi?" : "Forgot password?"}
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  /* DEFAULT LOGIN BUTTONS */
                  <>
                    {/* 1. Sign In with Face ID / Passkey */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleBiometricLogin}
                      className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer ${
                        isDark
                          ? "bg-white text-zinc-950 shadow-xl hover:bg-zinc-100"
                          : "bg-zinc-950 text-white shadow-xl hover:bg-zinc-900"
                      }`}
                      style={{
                        boxShadow: isDark
                          ? "0 8px 24px rgba(255, 255, 255, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.8)"
                          : "0 8px 24px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <ScanFace
                          size={17}
                          strokeWidth={1.75}
                          className={isDark ? "text-zinc-900" : "text-white"}
                        />
                        <span>
                          {isIndonesian
                            ? "Masuk dengan Face ID / Kunci Sandi"
                            : "Sign In with Face ID / Passkey"}
                        </span>
                      </div>
                      <ArrowRight
                        size={15}
                        strokeWidth={2}
                        className={isDark ? "text-zinc-500" : "text-zinc-400"}
                      />
                    </button>

                    {/* 2. Unlock with Security PIN (If Enrolled) */}
                    {hasVaultPin && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setPinInput("");
                          setPinError(null);
                          setShowPinModal(true);
                          triggerHaptic("light");
                        }}
                        className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer border ${
                          isDark
                            ? "bg-white/[0.055] border-white/16 text-white hover:bg-white/[0.08]"
                            : "bg-white/90 border-black/10 text-zinc-900 hover:bg-white shadow-sm"
                        }`}
                        style={{
                          boxShadow: isDark ? "inset 0 1px 1px rgba(255, 255, 255, 0.15)" : undefined,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <KeyRound
                            size={17}
                            strokeWidth={1.75}
                            className={isDark ? "text-white/80" : "text-zinc-700"}
                          />
                          <span>{isIndonesian ? "Buka dengan PIN Brankas" : "Unlock with Vault PIN"}</span>
                        </div>
                        <ArrowRight
                          size={15}
                          strokeWidth={2}
                          className={isDark ? "text-white/40" : "text-zinc-400"}
                        />
                      </button>
                    )}

                    {/* 3. Log in with Email */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleToggleEmailForm}
                      className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer border ${
                        isDark
                          ? "bg-white/[0.055] border-white/16 text-white hover:bg-white/[0.08]"
                          : "bg-white/90 border-black/10 text-zinc-900 hover:bg-white shadow-sm"
                      }`}
                      style={{
                        boxShadow: isDark ? "inset 0 1px 1px rgba(255, 255, 255, 0.15)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Mail
                          size={17}
                          strokeWidth={1.75}
                          className={isDark ? "text-white/80" : "text-zinc-700"}
                        />
                        <span>{isIndonesian ? "Masuk dengan Surel" : "Log in with Email"}</span>
                      </div>
                      <ArrowRight
                        size={15}
                        strokeWidth={2}
                        className={isDark ? "text-white/40" : "text-zinc-400"}
                      />
                    </button>

                    {/* 4. Log in with Google */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthLogin("google")}
                      className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer group border ${
                        isDark
                          ? "bg-white/[0.055] border-white/16 text-white hover:bg-white/[0.08]"
                          : "bg-white/90 border-black/10 text-zinc-900 hover:bg-white shadow-sm"
                      }`}
                      style={{
                        boxShadow: isDark ? "inset 0 1px 1px rgba(255, 255, 255, 0.15)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>{isIndonesian ? "Masuk dengan Google" : "Log in with Google"}</span>
                      </div>
                      <ArrowRight
                        size={15}
                        className={`group-hover:translate-x-0.5 transition-transform ${
                          isDark ? "text-white/40" : "text-zinc-400"
                        }`}
                      />
                    </button>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-3.5">
                <div className={`h-[1px] flex-1 ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
                <span
                  className={`text-[11px] font-normal ${
                    isDark ? "text-white/40" : "text-zinc-400"
                  }`}
                >
                  {isIndonesian ? "atau" : "or"}
                </span>
                <div className={`h-[1px] flex-1 ${isDark ? "bg-white/[0.08]" : "bg-black/[0.08]"}`} />
              </div>

              {/* Footer: Switch back to Sign up */}
              <div className="text-center pb-1">
                <p
                  className={`text-[12px] font-normal ${
                    isDark ? "text-white/50" : "text-zinc-500"
                  }`}
                >
                  {isIndonesian ? "Belum memiliki akun? " : "Don't have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setViewMode("welcome");
                      setShowEmailForm(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className={`font-semibold hover:underline cursor-pointer transition-colors ${
                      isDark ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    {isIndonesian ? "Daftar" : "Sign up"}
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ============================================================ */}
      {/* 5. IN-APP VAULT PIN MODAL (MONOCHROME LUXURY)                 */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-end sm:justify-center p-4 bg-black/60 backdrop-blur-xl"
            style={{
              paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 24px)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`w-full max-w-sm rounded-[32px] p-6 border flex flex-col items-center relative shadow-2xl ${
                isDark
                  ? "bg-[#121216] border-white/16 text-white"
                  : "bg-white border-black/10 text-zinc-950"
              }`}
              style={{
                boxShadow: isDark
                  ? "0 24px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.2)"
                  : "0 20px 50px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,1)",
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setShowPinModal(false);
                  setPinInput("");
                  setPinError(null);
                }}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
                  isDark ? "text-white/40 hover:text-white bg-white/[0.04]" : "text-zinc-400 hover:text-zinc-800 bg-black/[0.04]"
                }`}
              >
                <X size={16} strokeWidth={2} />
              </button>

              {/* Header Icon & Title */}
              <div
                className={`w-12 h-12 rounded-[18px] flex items-center justify-center border mb-3 mt-1 ${
                  isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                }`}
              >
                <KeyRound size={20} strokeWidth={1.75} className={isDark ? "text-white" : "text-zinc-900"} />
              </div>

              <h3 className="text-[17px] font-semibold tracking-tight text-center">
                {isIndonesian ? "Masukkan PIN Brankas" : "Enter Vault PIN"}
              </h3>
              <p
                className={`text-[12px] text-center mt-1 mb-5 max-w-[240px] leading-relaxed ${
                  isDark ? "text-white/50" : "text-zinc-500"
                }`}
              >
                {isIndonesian
                  ? "Otorisasi pembukaan brankas aset di perangkat ini"
                  : "Authorize local vault access on this device"}
              </p>

              {/* PIN Dots Indicator */}
              <div className="flex items-center justify-center gap-3.5 mb-6">
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const isFilled = i < pinInput.length;
                  return (
                    <motion.div
                      key={i}
                      animate={pinError ? { x: [-6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.3 }}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        isFilled
                          ? isDark
                            ? "bg-white scale-110"
                            : "bg-zinc-950 scale-110"
                          : isDark
                            ? "bg-white/15 border border-white/25"
                            : "bg-black/10 border border-black/15"
                      }`}
                    />
                  );
                })}
              </div>

              {pinError && (
                <p className="text-[11.5px] font-medium text-red-400 mb-3 text-center px-2">
                  {pinError}
                </p>
              )}

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-[270px]">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={pinVerifying}
                    onClick={() => handlePinDigit(digit)}
                    className={`h-12 rounded-2xl flex items-center justify-center font-bold text-[18px] active:scale-95 transition-all cursor-pointer border select-none ${
                      isDark
                        ? "bg-white/[0.06] border-white/12 text-white hover:bg-white/[0.1]"
                        : "bg-black/[0.04] border-black/8 text-zinc-900 hover:bg-black/[0.07]"
                    }`}
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={pinVerifying}
                  onClick={() => {
                    triggerHaptic("light");
                    setPinInput("");
                  }}
                  className={`h-12 rounded-2xl flex items-center justify-center text-[11px] font-semibold active:scale-95 transition-all cursor-pointer border ${
                    isDark
                      ? "bg-white/[0.03] border-white/8 text-white/50 hover:text-white"
                      : "bg-black/[0.02] border-black/6 text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {isIndonesian ? "Hapus" : "Clear"}
                </button>

                <button
                  type="button"
                  disabled={pinVerifying}
                  onClick={() => handlePinDigit("0")}
                  className={`h-12 rounded-2xl flex items-center justify-center font-bold text-[18px] active:scale-95 transition-all cursor-pointer border select-none ${
                    isDark
                      ? "bg-white/[0.06] border-white/12 text-white hover:bg-white/[0.1]"
                      : "bg-black/[0.04] border-black/8 text-zinc-900 hover:bg-black/[0.07]"
                  }`}
                >
                  0
                </button>

                <button
                  type="button"
                  disabled={pinVerifying}
                  onClick={handlePinDelete}
                  className={`h-12 rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer border ${
                    isDark
                      ? "bg-white/[0.03] border-white/8 text-white/60 hover:text-white"
                      : "bg-black/[0.02] border-black/6 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Delete size={17} strokeWidth={1.75} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
