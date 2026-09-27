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
} from "lucide-react";
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

  // Auto-advance showcase slides every 6 seconds (paused when user opens form or modal)
  useEffect(() => {
    if (showEmailForm || showPinModal) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) setError(error.message);
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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

        {/* --- Rich Telemetry / Visual Micro-Dashboard --- */}
        <div className="w-full flex justify-center items-center min-h-[120px] my-1">
          <AnimatePresence mode="wait">
            {/* SLIDE 0: CASHFLOW SPLINE, ASSET STAT PILLS & YOY GAIN */}
            {currentSlide.visual === "chart" && (
              <motion.div
                key="vis-chart"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className={`w-full max-w-[325px] p-3 rounded-[22px] border backdrop-blur-xl space-y-2 text-left transition-all ${
                  isDark
                    ? "border-white/14 bg-white/[0.035]"
                    : "border-black/10 bg-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
                }`}
                style={{
                  boxShadow: isDark
                    ? "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "0 12px 28px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div>
                    <span
                      className={`text-[10px] uppercase font-semibold tracking-wider ${
                        isDark ? "text-white/40" : "text-zinc-500"
                      }`}
                    >
                      {isIndonesian ? "Lintasan Aset Bersih" : "Net Asset Trajectory"}
                    </span>
                    <div
                      className={`text-[14.5px] font-semibold tracking-tight amount ${
                        isDark ? "text-white" : "text-zinc-950"
                      }`}
                    >
                      Rp 128.450.000
                    </div>
                  </div>
                  {/* Rule 7: Luxury Monochrome Pill */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold ${
                      isDark
                        ? "bg-white/[0.08] border-white/20 text-white"
                        : "bg-black/[0.05] border-black/15 text-zinc-900"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        isDark ? "bg-white" : "bg-zinc-900"
                      }`}
                    />
                    <span>+24.8% YoY</span>
                  </div>
                </div>

                {/* Spline Area Chart */}
                <div className="w-full h-11 relative flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 280 44">
                    <defs>
                      <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={isDark ? "#ffffff" : "#09090b"}
                          stopOpacity={isDark ? "0.25" : "0.15"}
                        />
                        <stop
                          offset="100%"
                          stopColor={isDark ? "#ffffff" : "#09090b"}
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 6 34 Q 50 30, 90 20 T 175 14 T 245 7 T 274 3"
                      fill="none"
                      stroke={isDark ? "#ffffff" : "#09090b"}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    />
                    <path
                      d="M 6 34 Q 50 30, 90 20 T 175 14 T 245 7 T 274 3 L 274 42 L 6 42 Z"
                      fill={`url(#${chartGradientId})`}
                    />
                    <circle cx="274" cy="3" r="3" fill={isDark ? "#ffffff" : "#09090b"} />
                    <circle
                      cx="274"
                      cy="3"
                      r="6"
                      fill={isDark ? "#ffffff" : "#09090b"}
                      className="animate-ping opacity-60"
                    />
                  </svg>
                </div>

                {/* Micro Stat Pills */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 rounded-xl border ${
                      isDark
                        ? "bg-white/[0.04] border-white/8 text-white"
                        : "bg-black/[0.03] border-black/8 text-zinc-900"
                    }`}
                  >
                    <span className={isDark ? "text-white/50 text-[10px]" : "text-zinc-500 text-[10px]"}>
                      {isIndonesian ? "Pemasukan" : "Income"}
                    </span>
                    <span className="text-[11px] font-semibold amount">Rp 18.5M</span>
                  </div>
                  <div
                    className={`flex items-center justify-between px-2.5 py-1 rounded-xl border ${
                      isDark
                        ? "bg-white/[0.04] border-white/8 text-white/80"
                        : "bg-black/[0.03] border-black/8 text-zinc-800"
                    }`}
                  >
                    <span className={isDark ? "text-white/50 text-[10px]" : "text-zinc-500 text-[10px]"}>
                      {isIndonesian ? "Pengeluaran" : "Expense"}
                    </span>
                    <span className="text-[11px] font-semibold amount">Rp 6.2M</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SLIDE 1: VOICE EQUALIZER, LOG BUBBLE & OCR BADGE */}
            {currentSlide.visual === "voice" && (
              <motion.div
                key="vis-voice"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className={`w-full max-w-[325px] p-3 rounded-[22px] border backdrop-blur-xl space-y-2 text-left ${
                  isDark
                    ? "border-white/14 bg-white/[0.035]"
                    : "border-black/10 bg-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
                }`}
                style={{
                  boxShadow: isDark
                    ? "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "0 12px 28px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border ${
                        isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                      }`}
                    >
                      <Mic size={11} className={isDark ? "text-white" : "text-zinc-900"} />
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {isIndonesian ? "Aliran Masukan Suara" : "Voice Input Stream"}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 h-3.5">
                    {[10, 16, 8, 20, 12, 22, 14, 9, 18, 11].map((h, i) => (
                      <span
                        key={i}
                        className={`w-0.5 rounded-full animate-pulse ${
                          isDark ? "bg-white" : "bg-zinc-900"
                        }`}
                        style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-xl border ${
                    isDark ? "bg-white/[0.05] border-white/10" : "bg-black/[0.03] border-black/8"
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium leading-snug ${
                      isDark ? "text-white/90" : "text-zinc-800"
                    }`}
                  >
                    {isIndonesian
                      ? '"Makan malam bersama teman Rp 185.000 via BCA"'
                      : '"Dinner with friends Rp 185.000 via BCA Checking"'}
                  </p>
                </div>

                <div
                  className={`flex items-center justify-between text-[10px] font-medium ${
                    isDark ? "text-white/55" : "text-zinc-500"
                  }`}
                >
                  <span
                    className={`px-2 py-0.5 rounded-full border ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    {isIndonesian ? "Makanan & Minuman" : "Food & Dining"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    {isIndonesian ? "Dompet BCA" : "BCA Wallet"}
                  </span>
                  {/* Rule 7: Luxury Monochrome Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full border font-medium ${
                      isDark
                        ? "bg-white/[0.08] text-white border-white/20"
                        : "bg-black/[0.06] text-zinc-900 border-black/15"
                    }`}
                  >
                    {isIndonesian ? "Tercatat dalam 1,4 dtk" : "Logged in 1.4s"}
                  </span>
                </div>
              </motion.div>
            )}

            {/* SLIDE 2: HARDWARE ENCRYPTION, CIPHER METRICS & ZERO TELEMETRY */}
            {currentSlide.visual === "vault" && (
              <motion.div
                key="vis-vault"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className={`w-full max-w-[325px] p-3 rounded-[22px] border backdrop-blur-xl space-y-2 text-left ${
                  isDark
                    ? "border-white/14 bg-white/[0.035]"
                    : "border-black/10 bg-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
                }`}
                style={{
                  boxShadow: isDark
                    ? "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "0 12px 28px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border ${
                        isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                      }`}
                    >
                      <Shield size={11} className={isDark ? "text-white" : "text-zinc-900"} />
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {isIndonesian ? "Brankas Kunci Perangkat" : "Hardware Key Vault"}
                    </span>
                  </div>
                  {/* Rule 7: Luxury Monochrome Pill */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isDark
                        ? "bg-white/[0.08] text-white border-white/20"
                        : "bg-black/[0.06] text-zinc-900 border-black/15"
                    }`}
                  >
                    {isIndonesian ? "Terenkripsi" : "Encrypted"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div
                    className={`p-1.5 rounded-xl border text-center ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    <span
                      className={`text-[9px] block ${isDark ? "text-white/40" : "text-zinc-500"}`}
                    >
                      {isIndonesian ? "Sandi" : "Cipher"}
                    </span>
                    <span
                      className={`text-[10.5px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      AES-256
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-xl border text-center ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    <span
                      className={`text-[9px] block ${isDark ? "text-white/40" : "text-zinc-500"}`}
                    >
                      {isIndonesian ? "Penyimpanan" : "Storage"}
                    </span>
                    <span
                      className={`text-[10.5px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {isIndonesian ? "Di Perangkat" : "On-Device"}
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-xl border text-center ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    <span
                      className={`text-[9px] block ${isDark ? "text-white/40" : "text-zinc-500"}`}
                    >
                      {isIndonesian ? "Data Cloud" : "Cloud Data"}
                    </span>
                    <span
                      className={`text-[10.5px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {isIndonesian ? "0 Bita" : "0 Bytes"}
                    </span>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between px-1 text-[10px] ${
                    isDark ? "text-white/45" : "text-zinc-500"
                  }`}
                >
                  <span>{isIndonesian ? "Isolasi rantai kunci perangkat" : "Hardware keychain isolation"}</span>
                  <span className={isDark ? "text-white/70" : "text-zinc-800 font-medium"}>
                    {isIndonesian ? "Dilindungi biometrik" : "Biometric protected"}
                  </span>
                </div>
              </motion.div>
            )}

            {/* SLIDE 3: DOMAIN PARTITION, PERSONAL & VENTURE SPLIT */}
            {currentSlide.visual === "domain" && (
              <motion.div
                key="vis-domain"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className={`w-full max-w-[325px] p-3 rounded-[22px] border backdrop-blur-xl space-y-2 text-left ${
                  isDark
                    ? "border-white/14 bg-white/[0.035]"
                    : "border-black/10 bg-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
                }`}
                style={{
                  boxShadow: isDark
                    ? "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "0 12px 28px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border ${
                        isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                      }`}
                    >
                      <Layers size={11} className={isDark ? "text-white" : "text-zinc-900"} />
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {isIndonesian ? "Partisi Multi-Domain" : "Multi-Domain Partitions"}
                    </span>
                  </div>
                  <span className={`text-[10px] ${isDark ? "text-white/45" : "text-zinc-500"}`}>
                    {isIndonesian ? "Pembukuan Terpisah" : "Isolated Books"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`p-2 rounded-xl border text-left ${
                      isDark ? "bg-white/[0.06] border-white/16" : "bg-black/[0.04] border-black/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-[10.5px] font-semibold ${
                          isDark ? "text-white" : "text-zinc-900"
                        }`}
                      >
                        {isIndonesian ? "Pribadi" : "Personal"}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-white" : "bg-zinc-900"}`}
                      />
                    </div>
                    <div
                      className={`text-[12.5px] font-semibold amount ${
                        isDark ? "text-white" : "text-zinc-950"
                      }`}
                    >
                      Rp 8.450.000
                    </div>
                    <span
                      className={`text-[9px] ${isDark ? "text-white/45" : "text-zinc-500"}`}
                    >
                      {isIndonesian ? "3 Dompet · Batas 78%" : "3 Wallets · 78% Cap"}
                    </span>
                  </div>

                  <div
                    className={`p-2 rounded-xl border text-left opacity-80 ${
                      isDark ? "bg-white/[0.03] border-white/8" : "bg-black/[0.02] border-black/6"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-[10.5px] font-semibold ${
                          isDark ? "text-white/80" : "text-zinc-700"
                        }`}
                      >
                        {isIndonesian ? "Bisnis" : "Business"}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDark ? "bg-white/40" : "bg-zinc-400"
                        }`}
                      />
                    </div>
                    <div
                      className={`text-[12.5px] font-semibold amount ${
                        isDark ? "text-white/80" : "text-zinc-800"
                      }`}
                    >
                      Rp 24.120.000
                    </div>
                    <span
                      className={`text-[9px] ${isDark ? "text-white/40" : "text-zinc-400"}`}
                    >
                      {isIndonesian ? "2 Dompet · Proyek" : "2 Wallets · Projects"}
                    </span>
                  </div>
                </div>

                <div
                  className={`px-2 py-0.5 rounded-full border text-center text-[10px] ${
                    isDark
                      ? "bg-white/[0.04] border-white/8 text-white/55"
                      : "bg-black/[0.03] border-black/8 text-zinc-600"
                  }`}
                >
                  {isIndonesian
                    ? "Pemisahan menyeluruh antara gaya hidup dan operasional bisnis"
                    : "Complete separation between lifestyle and venture expenses"}
                </div>
              </motion.div>
            )}

            {/* SLIDE 4: RUNWAY TELEMETRY, GAUGE BAR & FIRE PROGRESS */}
            {currentSlide.visual === "runway" && (
              <motion.div
                key="vis-runway"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className={`w-full max-w-[325px] p-3 rounded-[22px] border backdrop-blur-xl space-y-2 text-left ${
                  isDark
                    ? "border-white/14 bg-white/[0.035]"
                    : "border-black/10 bg-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
                }`}
                style={{
                  boxShadow: isDark
                    ? "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "0 12px 28px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.8)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border ${
                        isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                      }`}
                    >
                      <TrendingUp size={11} className={isDark ? "text-white" : "text-zinc-900"} />
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {isIndonesian ? "Ketahanan Arus Kas" : "Cashflow Runway"}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold amount ${
                      isDark ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    {isIndonesian ? "14,2 Bulan Aman" : "14.2 Months Safe"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden p-0.5 border ${
                      isDark
                        ? "bg-white/10 border-white/10"
                        : "bg-black/10 border-black/10"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full ${
                        isDark
                          ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                          : "bg-zinc-950 shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                      }`}
                      style={{ width: "72%" }}
                    />
                  </div>
                  <div
                    className={`flex justify-between text-[9px] px-0.5 ${
                      isDark ? "text-white/45" : "text-zinc-500"
                    }`}
                  >
                    <span>{isIndonesian ? "Dasar: 6 Bln" : "Baseline: 6 Mos"}</span>
                    <span className={isDark ? "text-white/80" : "text-zinc-800 font-medium"}>
                      {isIndonesian ? "Zona Aman: 12+ Bln" : "Safety Zone: 12+ Mos"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div
                    className={`p-1 rounded-xl border flex items-center justify-between px-2 ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    <span
                      className={`text-[9.5px] ${isDark ? "text-white/50" : "text-zinc-500"}`}
                    >
                      {isIndonesian ? "Beban Harian" : "Daily Burn"}
                    </span>
                    <span
                      className={`text-[10.5px] font-semibold amount ${
                        isDark ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      Rp 320K
                    </span>
                  </div>
                  <div
                    className={`p-1 rounded-xl border flex items-center justify-between px-2 ${
                      isDark ? "bg-white/[0.04] border-white/8" : "bg-black/[0.03] border-black/8"
                    }`}
                  >
                    <span
                      className={`text-[9.5px] ${isDark ? "text-white/50" : "text-zinc-500"}`}
                    >
                      {isIndonesian ? "Target FIRE" : "FIRE Target"}
                    </span>
                    {/* Rule 7: Strict Luxury Monochrome */}
                    <span
                      className={`text-[10.5px] font-semibold amount ${
                        isDark ? "text-white" : "text-zinc-950"
                      }`}
                    >
                      {isIndonesian ? "68% Tercapai" : "68% Reached"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                    ? "Masuk untuk mengakses brankas aset dan buku kas tersinkronisasi milik Anda."
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
