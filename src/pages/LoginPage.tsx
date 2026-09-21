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
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  authenticateWithBiometrics,
  getBiometricLoginCredentials,
  saveBiometricLoginCredentials,
} from "../lib/biometricAuth";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";

interface ShowcaseSlide {
  title: string;
  tagline: string;
  visual: "chart" | "voice" | "vault" | "domain" | "runway";
}

function formatAuthError(msg: string): string {
  if (!msg) return "An unexpected error occurred. Please try again.";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Please check your credentials.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email before signing in, or check your spam folder.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must contain at least 6 characters.";
  }
  return msg;
}

function getPasswordStrength(pwd: string): { score: number; label: string } {
  if (!pwd) return { score: 0, label: "" };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] || "Weak" };
}

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    title: "Trouvaille",
    tagline: "Your money in one place.\nTrack, plan, and build lasting financial clarity.",
    visual: "chart",
  },
  {
    title: "Frictionless Capture",
    tagline: "Log expenses in seconds\nwith conversational voice or camera receipt scanning.",
    visual: "voice",
  },
  {
    title: "Zero-Knowledge Vault",
    tagline: "Your financial ledger stays encrypted\nand strictly private on your device.",
    visual: "vault",
  },
  {
    title: "Domain Isolation",
    tagline: "Strictly separate personal outlays\nfrom professional and side-hustle cashflow.",
    visual: "domain",
  },
  {
    title: "Runway & Independence",
    tagline: "Proactive cashflow telemetry\nand intelligent financial runway metrics.",
    visual: "runway",
  },
];

export function LoginPage() {
  const chartGradientId = useId();
  const { setSession, continueAsGuest } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [viewMode, setViewMode] = useState<"welcome" | "login">("welcome");

  // Inline email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Auto-advance showcase slides every 6 seconds (paused when user opens form)
  useEffect(() => {
    if (showEmailForm) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [showEmailForm]);

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
      setError(err?.message || "Biometric authentication failed.");
    } finally {
      setLoading(false);
    }
  }, [email, setSession]);

  useEffect(() => {
    const hint = getBiometricLoginCredentials();
    if (hint?.email && !email) {
      setEmail(hint.email);
    }
  }, []);

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
      setError(err?.message || `Failed to sign in with ${provider}.`);
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
      setError("Please enter your email address to reset password.");
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
      setMessage("Password reset link sent to your email.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link.");
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
        setError(formatAuthError(error.message));
      } else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password);
        setSession(data.session);
      } else {
        setMessage(
          "Account created! Check your email to verify, or sign in directly.",
        );
        setViewMode("login");
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(formatAuthError(error.message));
      } else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password);
        setSession(data.session);
      }
    }
    setLoading(false);
  };

  const currentSlide = SHOWCASE_SLIDES[activeSlide];

  return (
    <div
      className="min-h-dvh w-full flex flex-col justify-between items-center relative overflow-hidden select-none bg-[#060608]"
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
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-white/[0.06] blur-[110px]" />
        {/* Subtle mid-horizon glow */}
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 w-[540px] h-[280px] rounded-full bg-white/[0.04] blur-[100px]" />
        {/* Subtle bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* ============================================================ */}
      {/* 2. CELESTIAL HORIZON ARC (CRADLES SHOWCASE ABOVE CARD) */}
      {/* ============================================================ */}
      <div
        className="absolute top-[38%] sm:top-[40%] left-1/2 -translate-x-1/2 w-[170vw] max-w-[900px] aspect-square rounded-[50%] pointer-events-none border-t border-white/20 transition-all duration-700"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 35%, transparent 65%)",
          boxShadow:
            "0 -8px 35px rgba(255, 255, 255, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.35)",
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
            <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
              {currentSlide.title}
            </h1>
            <p className="text-[12.5px] sm:text-[13px] font-normal text-white/55 whitespace-pre-line leading-relaxed max-w-[310px] mx-auto">
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
                className="w-full max-w-[325px] p-3 rounded-[22px] border border-white/14 bg-white/[0.035] backdrop-blur-xl space-y-2 text-left"
                style={{
                  boxShadow: "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider">
                      Net Asset Trajectory
                    </span>
                    <div className="text-[14.5px] font-semibold text-white tracking-tight amount">
                      Rp 128.450.000
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10.5px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>+24.8% YoY</span>
                  </div>
                </div>

                {/* Spline Area Chart */}
                <div className="w-full h-11 relative flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 280 44">
                    <defs>
                      <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 6 34 Q 50 30, 90 20 T 175 14 T 245 7 T 274 3"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    />
                    <path
                      d="M 6 34 Q 50 30, 90 20 T 175 14 T 245 7 T 274 3 L 274 42 L 6 42 Z"
                      fill={`url(#${chartGradientId})`}
                    />
                    <circle cx="274" cy="3" r="3" fill="#ffffff" />
                    <circle cx="274" cy="3" r="6" fill="#ffffff" className="animate-ping opacity-60" />
                  </svg>
                </div>

                {/* Micro Stat Pills */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/8">
                    <span className="text-[10px] text-white/50">Income</span>
                    <span className="text-[11px] font-semibold text-white amount">Rp 18.5M</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/8">
                    <span className="text-[10px] text-white/50">Expense</span>
                    <span className="text-[11px] font-semibold text-white/80 amount">Rp 6.2M</span>
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
                className="w-full max-w-[325px] p-3 rounded-[22px] border border-white/14 bg-white/[0.035] backdrop-blur-xl space-y-2 text-left"
                style={{
                  boxShadow: "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                      <Mic size={11} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white">Voice Input Stream</span>
                  </div>
                  <div className="flex items-center gap-0.5 h-3.5">
                    {[10, 16, 8, 20, 12, 22, 14, 9, 18, 11].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full bg-white animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10">
                  <p className="text-[11px] font-medium text-white/90 leading-snug">
                    "Dinner with friends Rp 185.000 via BCA Checking"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-medium text-white/55">
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/8">
                    Food & Dining
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/8">
                    BCA Wallet
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Logged in 1.4s
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
                className="w-full max-w-[325px] p-3 rounded-[22px] border border-white/14 bg-white/[0.035] backdrop-blur-xl space-y-2 text-left"
                style={{
                  boxShadow: "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                      <Shield size={11} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white">Hardware Key Vault</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Encrypted
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-1.5 rounded-xl bg-white/[0.04] border border-white/8 text-center">
                    <span className="text-[9px] text-white/40 block">Cipher</span>
                    <span className="text-[10.5px] font-semibold text-white">AES-256</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/[0.04] border border-white/8 text-center">
                    <span className="text-[9px] text-white/40 block">Storage</span>
                    <span className="text-[10.5px] font-semibold text-white">On-Device</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/[0.04] border border-white/8 text-center">
                    <span className="text-[9px] text-white/40 block">Cloud Data</span>
                    <span className="text-[10.5px] font-semibold text-white">0 Bytes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1 text-[10px] text-white/45">
                  <span>Hardware keychain isolation</span>
                  <span className="text-white/70">Device biometric protected</span>
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
                className="w-full max-w-[325px] p-3 rounded-[22px] border border-white/14 bg-white/[0.035] backdrop-blur-xl space-y-2 text-left"
                style={{
                  boxShadow: "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                      <Layers size={11} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white">Multi-Domain Partitions</span>
                  </div>
                  <span className="text-[10px] text-white/45">Isolated Books</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/16 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10.5px] font-semibold text-white">Personal</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="text-[12.5px] font-semibold text-white amount">Rp 8.450.000</div>
                    <span className="text-[9px] text-white/45">3 Wallets · 78% Cap</span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/8 text-left opacity-80">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10.5px] font-semibold text-white/80">Business</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    </div>
                    <div className="text-[12.5px] font-semibold text-white/80 amount">Rp 24.120.000</div>
                    <span className="text-[9px] text-white/40">2 Wallets · Projects</span>
                  </div>
                </div>

                <div className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/8 text-center text-[10px] text-white/55">
                  Complete separation between lifestyle and venture expenses
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
                className="w-full max-w-[325px] p-3 rounded-[22px] border border-white/14 bg-white/[0.035] backdrop-blur-xl space-y-2 text-left"
                style={{
                  boxShadow: "0 12px 28px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
                      <TrendingUp size={11} className="text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white">Cashflow Runway</span>
                  </div>
                  <span className="text-[11px] font-semibold text-white amount">14.2 Months Safe</span>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                      style={{ width: "72%" }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/45 px-0.5">
                    <span>Baseline: 6 Mos</span>
                    <span className="text-white/80">Safety Zone: 12+ Mos</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="p-1 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-between px-2">
                    <span className="text-[9.5px] text-white/50">Daily Burn</span>
                    <span className="text-[10.5px] font-semibold text-white amount">Rp 320K</span>
                  </div>
                  <div className="p-1 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-between px-2">
                    <span className="text-[9.5px] text-white/50">FIRE Target</span>
                    <span className="text-[10.5px] font-semibold text-emerald-400 amount">68% Reached</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5 Pagination Dots (Interactive & Auto-Synced) */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {SHOWCASE_SLIDES.map((_, idx) => (
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
                    ? "w-5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    : "w-1.5 bg-white/25 hover:bg-white/50"
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
        className="w-full max-w-[480px] rounded-t-[36px] sm:rounded-t-[40px] px-6 pt-6 relative z-20 overflow-hidden border-t border-x border-white/[0.16]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(18, 18, 22, 0.96) 55%, #0c0c0e 100%)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          boxShadow:
            "0 -24px 60px rgba(0, 0, 0, 0.85), inset 0 1.5px 1px rgba(255, 255, 255, 0.28)",
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
        }}
      >
        {/* Ambient Top Inner Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full bg-white/[0.08] blur-[40px] pointer-events-none" />

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
                <h2 className="text-[21px] sm:text-[22px] font-semibold tracking-tight text-white">
                  Welcome to Trouvaille
                </h2>
                <p className="text-[12.5px] font-normal text-white/55 leading-relaxed max-w-[310px] mx-auto">
                  Track everyday cashflow and build lasting wealth clarity with effortless precision.
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
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@domain.com"
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none text-white placeholder:text-white/30"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                        }}
                      />
                    </div>

                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (min 6 characters)"
                        required
                        minLength={6}
                        disabled={loading}
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] outline-none text-white placeholder:text-white/30"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff size={15} strokeWidth={1.75} />
                        ) : (
                          <Eye size={15} strokeWidth={1.75} />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator for Registration */}
                    {password.length > 0 && (
                      <div className="px-1 space-y-1">
                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden flex gap-1">
                          {[1, 2, 3, 4].map((s) => {
                            const strength = getPasswordStrength(password);
                            const active = strength.score >= s;
                            const barColor =
                              strength.score <= 1
                                ? "bg-red-400"
                                : strength.score === 2
                                ? "bg-amber-400"
                                : strength.score === 3
                                ? "bg-blue-400"
                                : "bg-emerald-400";
                            return (
                              <div
                                key={s}
                                className={`h-full flex-1 transition-all rounded-full ${
                                  active ? barColor : "bg-white/10"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/40">
                          <span>Password Strength</span>
                          <span className="text-white/70 font-medium">
                            {getPasswordStrength(password).label}
                          </span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <p className="text-[12px] font-medium text-red-400 px-1">{error}</p>
                    )}
                    {message && (
                      <p className="text-[12px] font-medium text-emerald-400 px-1">{message}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all shadow-md cursor-pointer bg-white text-zinc-950 mt-1"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating Account...</span>
                        </div>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight size={15} strokeWidth={2} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-medium text-white/50">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowEmailForm(false);
                          setError(null);
                          setMessage(null);
                        }}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("login");
                          setShowEmailForm(true);
                          setError(null);
                          setMessage(null);
                        }}
                        className="hover:text-white transition-colors cursor-pointer text-white/70"
                      >
                        Already have an account? Sign in
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
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 shadow-xl hover:bg-zinc-100"
                      style={{
                        boxShadow:
                          "0 8px 24px rgba(255, 255, 255, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Mail size={17} strokeWidth={1.75} className="text-zinc-900" />
                        <span>Continue with Email</span>
                      </div>
                      <ArrowRight size={15} strokeWidth={2} className="text-zinc-500" />
                    </button>

                    {/* 2. Continue with Google */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthLogin("google")}
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer group text-white border"
                      style={{
                        background: "rgba(255, 255, 255, 0.055)",
                        borderColor: "rgba(255, 255, 255, 0.16)",
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
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
                        <span>Continue with Google</span>
                      </div>
                      <ArrowRight
                        size={15}
                        className="text-white/40 group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>

                    {/* 3. Continue without an account */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleContinueAsGuest}
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-medium text-[13.5px] active:scale-[0.98] transition-all cursor-pointer group text-white/90 border"
                      style={{
                        background: "rgba(255, 255, 255, 0.035)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <User size={17} strokeWidth={1.75} className="text-white/70" />
                        <span>Continue without an account</span>
                      </div>
                      <ArrowRight
                        size={15}
                        className="text-white/40 group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                    <p className="text-[10.5px] text-white/40 text-center pt-0.5">
                      Private & on-device only · No cloud backup
                    </p>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-3.5">
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
                <span className="text-[11px] text-white/40 font-normal">or</span>
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
              </div>

              {/* Footer: Switch to Log in */}
              <div className="text-center pb-1">
                <p className="text-[12px] text-white/50 font-normal">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setViewMode("login");
                      setShowEmailForm(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-white font-semibold hover:underline cursor-pointer transition-colors"
                  >
                    Log in
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
                <h2 className="text-[21px] sm:text-[22px] font-semibold tracking-tight text-white">
                  Welcome Back
                </h2>
                <p className="text-[12.5px] font-normal text-white/55 leading-relaxed max-w-[310px] mx-auto">
                  Sign in to access your synchronized wealth vault and transaction ledger.
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
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@domain.com"
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none text-white placeholder:text-white/30"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                        }}
                      />
                    </div>

                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] outline-none text-white placeholder:text-white/30"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff size={15} strokeWidth={1.75} />
                        ) : (
                          <Eye size={15} strokeWidth={1.75} />
                        )}
                      </button>
                    </div>

                    {error && (
                      <p className="text-[12px] font-medium text-red-400 px-1">{error}</p>
                    )}
                    {message && (
                      <p className="text-[12px] font-medium text-emerald-400 px-1">{message}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all shadow-md cursor-pointer bg-white text-zinc-950 mt-1"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Signing In...</span>
                        </div>
                      ) : (
                        <>
                          <span>Sign In with Email</span>
                          <ArrowRight size={15} strokeWidth={2} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-medium text-white/50">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowEmailForm(false);
                          setError(null);
                          setMessage(null);
                        }}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="hover:text-white transition-colors cursor-pointer text-white/40"
                      >
                        Forgot password?
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
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 shadow-xl hover:bg-zinc-100"
                      style={{
                        boxShadow:
                          "0 8px 24px rgba(255, 255, 255, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <ScanFace size={17} strokeWidth={1.75} className="text-zinc-900" />
                        <span>Sign In with Face ID / Passkey</span>
                      </div>
                      <ArrowRight size={15} strokeWidth={2} className="text-zinc-500" />
                    </button>

                    {/* 2. Log in with Email */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleToggleEmailForm}
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer bg-white/[0.055] border border-white/16 text-white hover:bg-white/[0.08]"
                      style={{
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Mail
                          size={17}
                          strokeWidth={1.75}
                          className="text-white/80"
                        />
                        <span>Log in with Email</span>
                      </div>
                      <ArrowRight
                        size={15}
                        strokeWidth={2}
                        className="text-white/40"
                      />
                    </button>

                    {/* 3. Log in with Google */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthLogin("google")}
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer group text-white border"
                      style={{
                        background: "rgba(255, 255, 255, 0.055)",
                        borderColor: "rgba(255, 255, 255, 0.16)",
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
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
                        <span>Log in with Google</span>
                      </div>
                      <ArrowRight
                        size={15}
                        className="text-white/40 group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-3.5">
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
                <span className="text-[11px] text-white/40 font-normal">or</span>
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
              </div>

              {/* Footer: Switch back to Sign up */}
              <div className="text-center pb-1">
                <p className="text-[12px] text-white/50 font-normal">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setViewMode("welcome");
                      setShowEmailForm(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-white font-semibold hover:underline cursor-pointer transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
