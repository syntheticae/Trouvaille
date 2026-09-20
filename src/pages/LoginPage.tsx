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

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setLoading(true);
    setError(null);
    setMessage(null);
    triggerHaptic("medium");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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
          "Registration successful! Please check your email for confirmation, or sign in directly.",
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
      className="min-h-dvh flex flex-col items-center justify-between px-6 py-8 relative overflow-hidden"
      style={{
        background: "var(--bg-canvas)",
        paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 24px), 36px)",
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 20px), 28px)",
      }}
    >
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-white/[0.02] blur-[100px]" />
      </div>

      {/* Top / Brand Hero */}
      <motion.div
        className="w-full max-w-sm text-center relative z-10 pt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="relative inline-block mb-4">
          <img
            src="/icon.png"
            alt="Trouvaille"
            className="w-20 h-20 mx-auto rounded-[24px] object-contain shadow-2xl"
            style={{
              border: "1px solid var(--glass-border)",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Trouvaille
        </h1>
        <p
          className="mt-1.5 text-[13px] font-normal tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Effortless financial telemetry & wealth clarity
        </p>
      </motion.div>

      {/* Center / Auth Actions */}
      <motion.div
        className="w-full max-w-sm space-y-4 relative z-10 my-auto py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
      >
        {/* Biometric Quick Login if Available */}
        {hasBiometric && !isSignUp && (
          <button
            type="button"
            disabled={loading}
            onClick={handleBiometricLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-semibold text-[14px] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <ScanFace size={18} strokeWidth={1.75} />
            <span>Sign In with Face ID / Touch ID</span>
          </button>
        )}

        {/* 1. Continue with Google */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuthLogin("google")}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl font-semibold text-[14px] active:scale-[0.98] transition-all cursor-pointer bg-white text-zinc-950 shadow-md hover:bg-zinc-100"
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

        {/* 2. Continue with Apple */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuthLogin("apple")}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-semibold text-[14px] active:scale-[0.98] transition-all cursor-pointer text-white shadow-sm"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.84-10.43-12.04-22.15-15.6-35.16-3.56-13.01-5.34-25.13-5.34-36.35 0-14.75 3.73-27.13 11.19-37.13 7.46-10 17.06-15.08 28.8-15.24 4.58 0 9.87 1.25 15.87 3.76 6 2.51 10.15 3.82 12.44 3.93 2.12 0 6.64-1.42 13.56-4.25 6.92-2.83 12.74-4.08 17.47-3.76 13.3.65 23.94 5.76 31.91 15.34-11.75 7.17-17.5 16.96-17.25 29.36.26 9.81 4.09 18.06 11.49 24.75 7.4 6.69 16.29 10.44 26.68 11.25-2.22 6.84-4.83 13.43-7.83 19.78zm-32.6-105.81c0-7.39 2.67-14.42 8.02-21.08 5.34-6.66 12.08-10.87 20.2-12.63.26 1.42.39 2.68.39 3.78 0 7.39-2.78 14.54-8.34 21.46-5.56 6.92-12.3 11.08-20.22 12.48-.05-1.3-.05-2.64-.05-4.01z" />
          </svg>
          <span>Continue with Apple</span>
        </button>

        {/* 3. CONTINUE WITHOUT AN ACCOUNT (GUEST MODE) */}
        <div className="pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={handleContinueAsGuest}
            className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer group"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-2.5 text-left">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Zap size={15} strokeWidth={1.75} />
              </div>
              <div>
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Continue without an account
                </p>
                <p
                  className="text-[11px] font-normal"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Start instantly · Local device storage
                </p>
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform"
            />
          </button>
        </div>

        {/* Divider: Or with email */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-[1px] flex-1" style={{ background: "var(--glass-border)" }} />
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="text-[11px] font-medium tracking-wide flex items-center gap-1 transition-colors cursor-pointer"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span>or sign in with email</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${
                showEmailForm ? "rotate-180" : ""
              }`}
            />
          </button>
          <div className="h-[1px] flex-1" style={{ background: "var(--glass-border)" }} />
        </div>

        {/* Email & Password Form Accordion */}
        <AnimatePresence>
          {showEmailForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="p-4 rounded-2xl space-y-3 mt-1"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl text-[13px] outline-none"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  {error && (
                    <p className="text-[12px] font-medium" style={{ color: "#ef4444" }}>
                      {error}
                    </p>
                  )}
                  {message && (
                    <p
                      className="text-[12px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {message}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all shadow-md cursor-pointer"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                    }}
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

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-[11px] font-medium transition-colors cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isSignUp
                      ? "Already have an account? Sign in"
                      : "Don't have an account? Create one"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom Privacy & Terms Badge */}
      <motion.div
        className="w-full max-w-sm text-center relative z-10 space-y-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-[11px] text-[var(--text-tertiary)]">
          <ShieldCheck size={13} strokeWidth={1.5} />
          <span>Private by default · End-to-end device security</span>
        </div>
      </motion.div>
    </div>
  );
}
