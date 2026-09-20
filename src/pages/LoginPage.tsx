import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  ArrowRight,
  ScanFace,
  ChevronDown,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
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

export function LoginPage() {
  const { setSession, continueAsGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);

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

    if (s.hasBiometric && !isSignUp) {
      const timer = setTimeout(() => {
        handleBiometricLogin();
      }, 400);
      return () => clearTimeout(timer);
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

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-between px-6 py-8 relative overflow-hidden select-none"
      style={{
        background: "var(--bg-canvas, #08080a)",
        fontFamily: "'Urbanist', sans-serif",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 24px), 36px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
      }}
    >
      {/* ============================================================ */}
      {/* 1. CINEMATIC MONOCHROME AURORA BACKDROP (SOFT BLOOM) */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft specular aura bloom orbs */}
        <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-white/[0.04] blur-[150px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-white/[0.03] blur-[130px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/[0.025] blur-[140px]" />

        {/* Fluted glass radial refraction */}
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 25%, rgba(255,255,255,0.06) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* ============================================================ */}
      {/* 2. TOP BRAND HERO: LIQUID GLASS LOGO POD */}
      {/* ============================================================ */}
      <motion.div
        className="w-full max-w-sm text-center relative z-10 pt-2"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <div className="relative inline-block mb-3.5">
          <div
            className="w-20 h-20 mx-auto rounded-[28px] p-2 flex items-center justify-center relative overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow:
                "0 24px 60px rgba(0, 0, 0, 0.65), inset 0 1px 1.5px rgba(255, 255, 255, 0.3)",
            }}
          >
            <img
              src="/icon.png"
              alt="Trouvaille"
              className="w-full h-full object-contain rounded-[20px]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>

        <h1 className="text-[30px] font-semibold tracking-tight text-white leading-tight">
          Trouvaille
        </h1>
        <p className="mt-1 text-[13px] font-normal tracking-wide text-white/55">
          Effortless financial telemetry & wealth clarity
        </p>
      </motion.div>

      {/* ============================================================ */}
      {/* 3. CENTER / AUTH ACTIONS (LIQUID GLASS PODS) */}
      {/* ============================================================ */}
      <motion.div
        className="w-full max-w-sm space-y-3 relative z-10 my-auto py-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.08 }}
      >
        {/* Biometric Quick Login (if enrolled) */}
        {hasBiometric && !isSignUp && (
          <button
            type="button"
            disabled={loading}
            onClick={handleBiometricLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-[24px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer text-white relative overflow-hidden group"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15)",
            }}
          >
            <ScanFace size={18} strokeWidth={1.75} className="text-white/80" />
            <span>Sign In with Face ID / Touch ID</span>
          </button>
        )}

        {/* 1. Continue with Google */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuthLogin("google")}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-[24px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 shadow-lg hover:bg-zinc-100"
          style={{
            boxShadow:
              "0 8px 24px rgba(255, 255, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8)",
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
        </button>

        {/* 2. CONTINUE WITHOUT AN ACCOUNT (LOCAL GUEST MODE) */}
        <button
          type="button"
          disabled={loading}
          onClick={handleContinueAsGuest}
          className="w-full flex items-center justify-between py-3.5 px-4 rounded-[24px] active:scale-[0.98] transition-all cursor-pointer group text-left relative overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                borderColor: "rgba(255, 255, 255, 0.16)",
              }}
            >
              <Zap size={15} strokeWidth={1.75} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">
                Continue without an account
              </p>
              <p className="text-[11px] font-normal text-white/50">
                Start instantly · Local device storage
              </p>
            </div>
          </div>
          <ArrowRight
            size={15}
            className="text-white/40 group-hover:translate-x-0.5 transition-transform"
          />
        </button>

        {/* Divider: Or with email */}
        <div className="flex items-center gap-3 pt-1">
          <div className="h-[1px] flex-1 bg-white/[0.08]" />
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="text-[11px] font-medium text-white/45 hover:text-white/80 flex items-center gap-1 transition-colors cursor-pointer py-1"
          >
            <span>or sign in with email</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${
                showEmailForm ? "rotate-180" : ""
              }`}
            />
          </button>
          <div className="h-[1px] flex-1 bg-white/[0.08]" />
        </div>

        {/* Email & Password Form Accordion */}
        <AnimatePresence>
          {showEmailForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div
                className="p-4 rounded-[26px] space-y-3 mt-1"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <form onSubmit={handleSubmit} className="space-y-2.5">
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
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none text-white placeholder:text-white/30"
                      style={{
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
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
                      className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] outline-none text-white placeholder:text-white/30"
                      style={{
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
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
                    <p className="text-[12px] font-medium text-red-400">
                      {error}
                    </p>
                  )}
                  {message && (
                    <p className="text-[12px] font-medium text-emerald-400">
                      {message}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all shadow-md cursor-pointer bg-white text-zinc-950"
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      "Processing..."
                    ) : (
                      <>
                        <span>{isSignUp ? "Create Account" : "Sign In with Email"}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="flex items-center justify-between pt-1 px-1 text-[11px] font-medium text-white/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setMessage(null);
                    }}
                    className="hover:text-white/80 transition-colors cursor-pointer"
                  >
                    {isSignUp
                      ? "Have an account? Sign in"
                      : "New to Trouvaille? Create account"}
                  </button>

                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="hover:text-white/80 transition-colors cursor-pointer text-white/40"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ============================================================ */}
      {/* 4. BOTTOM FLOATING PRIVACY POD */}
      {/* ============================================================ */}
      <motion.div
        className="w-full max-w-sm text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] text-white/45 border"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            borderColor: "rgba(255, 255, 255, 0.06)",
          }}
        >
          <ShieldCheck size={12} strokeWidth={1.5} />
          <span>Private by default · End-to-end device security</span>
        </div>
      </motion.div>
    </div>
  );
}
