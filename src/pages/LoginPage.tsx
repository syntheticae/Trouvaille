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
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  authenticateWithBiometrics,
  getSecuritySettings,
  getBiometricLoginCredentials,
  saveBiometricLoginCredentials,
} from "../lib/biometricAuth";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";

interface ShowcaseSlide {
  title: string;
  tagline: string;
  visual: "chart" | "voice" | "vault" | "domain" | "runway";
}

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    title: "Trouvaille",
    tagline: "Your money. In one place.\nTrack, plan, and build a better tomorrow.",
    visual: "chart",
  },
  {
    title: "Frictionless Capture",
    tagline: "Record transactions effortlessly with voice\nor instant receipt scanning.",
    visual: "voice",
  },
  {
    title: "Zero-Knowledge Vault",
    tagline: "Your financial records stay exclusively on device.\nHardware-grade offline privacy.",
    visual: "vault",
  },
  {
    title: "Domain Isolation",
    tagline: "Strictly separate personal outlays from\nprofessional and side-hustle cashflow.",
    visual: "domain",
  },
  {
    title: "Runway & Net Worth",
    tagline: "Proactive cashflow telemetry and\nintelligent financial independence metrics.",
    visual: "runway",
  },
];

export function LoginPage() {
  const chartGradientId = useId();
  const { setSession, continueAsGuest } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [viewMode, setViewMode] = useState<"welcome" | "login">("welcome");

  // Email form state
  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);

  // Auto-advance showcase slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
    const s = getSecuritySettings();
    setHasBiometric(s.hasBiometric);
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

  const handleOpenEmailAuth = (signUpMode: boolean) => {
    triggerHaptic("light");
    setIsSignUp(signUpMode);
    setError(null);
    setMessage(null);
    setShowEmailSheet(true);
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

    if (isSignUp) {
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
      } else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password);
        setSession(data.session);
      } else {
        setMessage(
          "Account created successfully! Check your email for verification, or sign in directly.",
        );
        setIsSignUp(false);
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
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
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 20px), 28px)",
      }}
    >
      {/* ============================================================ */}
      {/* 1. CINEMATIC AMBIENT AURORA MESH */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft top-center aura */}
        <div className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-white/[0.06] blur-[110px]" />
        {/* Subtle mid-horizon glow */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full bg-white/[0.035] blur-[100px]" />
        {/* Subtle bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* ============================================================ */}
      {/* 2. CELESTIAL HORIZON ARC (PLANETARY CURVE IN THE DISTANCE) */}
      {/* ============================================================ */}
      <div
        className="absolute top-[28%] sm:top-[30%] left-1/2 -translate-x-1/2 w-[160vw] max-w-[850px] aspect-square rounded-[50%] pointer-events-none border-t border-white/20 transition-all duration-700"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 35%, transparent 65%)",
          boxShadow:
            "0 -8px 35px rgba(255, 255, 255, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.35)",
        }}
      />

      {/* ============================================================ */}
      {/* 3. TOP SECTION: CLEAN SHOWCASE WITHOUT LOGO */}
      {/* ============================================================ */}
      <div className="w-full max-w-sm px-6 relative z-10 flex flex-col items-center text-center pt-3 sm:pt-6">
        {/* Dynamic Showcase Slide Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-1.5 min-h-[76px]"
          >
            <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-white leading-tight">
              {currentSlide.title}
            </h1>
            <p className="text-[12.5px] sm:text-[13px] font-normal text-white/55 whitespace-pre-line leading-relaxed max-w-[300px] mx-auto">
              {currentSlide.tagline}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Mini Feature Visual Capsule (Chart / Wave / Telemetry) */}
        <div className="w-full max-w-[280px] h-[52px] mt-3 relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentSlide.visual === "chart" && (
              <motion.div
                key="vis-chart"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="w-full h-full flex items-center justify-center relative"
              >
                {/* Mini glowing SVG curve */}
                <svg className="w-full h-11 overflow-visible" viewBox="0 0 260 40">
                  <defs>
                    <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 10 32 Q 50 28, 90 20 T 170 12 T 250 4"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  />
                  <path
                    d="M 10 32 Q 50 28, 90 20 T 170 12 T 250 4 L 250 38 L 10 38 Z"
                    fill={`url(#${chartGradientId})`}
                  />
                  <circle cx="250" cy="4" r="3" fill="#ffffff" />
                  <circle
                    cx="250"
                    cy="4"
                    r="6"
                    fill="#ffffff"
                    className="animate-ping opacity-75"
                  />
                </svg>
              </motion.div>
            )}

            {currentSlide.visual === "voice" && (
              <motion.div
                key="vis-voice"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border bg-white/[0.04] border-white/15"
              >
                <Mic size={13} className="text-white/80" />
                <div className="flex items-center gap-1">
                  <span className="w-1 h-3 rounded-full bg-white animate-pulse" />
                  <span className="w-1 h-5 rounded-full bg-white/80 animate-pulse delay-75" />
                  <span className="w-1 h-2 rounded-full bg-white/60 animate-pulse delay-150" />
                  <span className="w-1 h-4 rounded-full bg-white animate-pulse delay-100" />
                </div>
                <span className="text-[11px] font-medium text-white/70">
                  "Coffee $4.50"
                </span>
              </motion.div>
            )}

            {currentSlide.visual === "vault" && (
              <motion.div
                key="vis-vault"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-white/[0.04] border-white/15"
              >
                <Shield size={13} className="text-white/80" />
                <span className="text-[11px] font-medium text-white/70 tracking-wide">
                  AES-256 · Local SQLite Vault
                </span>
              </motion.div>
            )}

            {currentSlide.visual === "domain" && (
              <motion.div
                key="vis-domain"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/[0.04] border-white/15"
              >
                <Layers size={13} className="text-white/80" />
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <span className="text-white">Personal</span>
                  <span className="text-white/30">/</span>
                  <span className="text-white/50">Business</span>
                </div>
              </motion.div>
            )}

            {currentSlide.visual === "runway" && (
              <motion.div
                key="vis-runway"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-white/[0.04] border-white/15"
              >
                <TrendingUp size={13} className="text-white/80" />
                <span className="text-[11px] font-medium text-white/80">
                  Runway: <span className="font-semibold text-white">14.2 Mos</span>
                </span>
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
      {/* 4. BOTTOM LIQUID GLASS SHEET (FULL WIDTH LEFT-TO-RIGHT) */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[480px] rounded-t-[36px] sm:rounded-t-[40px] px-6 pt-7 relative z-20 overflow-hidden border-t border-x border-white/[0.16]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(18, 18, 22, 0.96) 60%, #0c0c0e 100%)",
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
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full flex flex-col"
            >
              {/* Heading & Subtitle */}
              <div className="text-center space-y-1.5 mb-6 px-2">
                <h2 className="text-[22px] sm:text-[23px] font-semibold tracking-tight text-white">
                  Welcome to Trouvaille
                </h2>
                <p className="text-[12.5px] font-normal text-white/55 leading-relaxed max-w-[310px] mx-auto">
                  Track everyday cashflow and build lasting wealth clarity with effortless precision.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 w-full">
                {/* 1. Continue with Email (Opens sign-up) */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleOpenEmailAuth(true)}
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
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
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
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full flex flex-col"
            >
              {/* Heading & Subtitle */}
              <div className="text-center space-y-1.5 mb-6 px-2">
                <h2 className="text-[22px] sm:text-[23px] font-semibold tracking-tight text-white">
                  Welcome Back
                </h2>
                <p className="text-[12.5px] font-normal text-white/55 leading-relaxed max-w-[310px] mx-auto">
                  Sign in to access your synchronized wealth vault and transaction ledger.
                </p>
              </div>

              {/* Action Buttons for Log In */}
              <div className="space-y-2.5 w-full">
                {/* 1. Sign In with Face ID (if enrolled on this device) */}
                {hasBiometric && (
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
                      <span>Sign In with Face ID</span>
                    </div>
                    <ArrowRight size={15} strokeWidth={2} className="text-zinc-500" />
                  </button>
                )}

                {/* 2. Log in with Email */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleOpenEmailAuth(false)}
                  className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer ${
                    hasBiometric
                      ? "bg-white/[0.055] border border-white/16 text-white hover:bg-white/[0.08]"
                      : "bg-white text-zinc-950 shadow-xl hover:bg-zinc-100"
                  }`}
                  style={{
                    boxShadow: hasBiometric
                      ? "inset 0 1px 1px rgba(255, 255, 255, 0.15)"
                      : "0 8px 24px rgba(255, 255, 255, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Mail
                      size={17}
                      strokeWidth={1.75}
                      className={hasBiometric ? "text-white/80" : "text-zinc-900"}
                    />
                    <span>Log in with Email</span>
                  </div>
                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    className={hasBiometric ? "text-white/40" : "text-zinc-500"}
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
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
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

      {/* ============================================================ */}
      {/* 5. EMAIL AUTH SHEET / DRAWER (SLIDE-UP LIQUID GLASS) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showEmailSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md">
            {/* Backdrop click dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!loading) setShowEmailSheet(false);
              }}
              className="absolute inset-0"
            />

            {/* Slide-up Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="w-full max-w-[440px] rounded-t-[36px] p-6 relative z-10 border-t border-x border-white/20"
              style={{
                background: "rgba(18, 18, 22, 0.98)",
                backdropFilter: "blur(50px)",
                WebkitBackdropFilter: "blur(50px)",
                boxShadow:
                  "0 -24px 60px rgba(0, 0, 0, 0.9), inset 0 1px 1.5px rgba(255, 255, 255, 0.3)",
                paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 28px)",
              }}
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[18px] font-semibold text-white">
                    {isSignUp ? "Create Trouvaille Account" : "Sign in to Trouvaille"}
                  </h3>
                  <p className="text-[12px] text-white/50">
                    {isSignUp
                      ? "Cloud encrypted ledger & sync"
                      : "Enter your credentials to continue"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowEmailSheet(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="space-y-3">
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

                {error && (
                  <p className="text-[12px] font-medium text-red-400 px-1">{error}</p>
                )}
                {message && (
                  <p className="text-[12px] font-medium text-emerald-400 px-1">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] font-semibold text-[13.5px] active:scale-[0.98] transition-all shadow-md cursor-pointer bg-white text-zinc-950 mt-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>{isSignUp ? "Create Account" : "Sign In with Email"}</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* Mode switch & Forgot Password */}
              <div className="flex items-center justify-between pt-3 px-1 text-[11px] font-medium text-white/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setMessage(null);
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {isSignUp
                    ? "Already have an account? Sign In"
                    : "Need an account? Sign Up"}
                </button>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="hover:text-white transition-colors cursor-pointer text-white/40"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
