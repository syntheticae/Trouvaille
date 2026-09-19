import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight, ScanFace } from "lucide-react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/AuthContext"
import {
  authenticateWithBiometrics,
  getSecuritySettings,
  getBiometricLoginCredentials,
  saveBiometricLoginCredentials,
} from "../lib/biometricAuth"
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics"

export function LoginPage() {
  const { setSession } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [hasBiometric, setHasBiometric] = useState(false)

  const handleBiometricLogin = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    triggerHaptic("medium")
    try {
      const res = await authenticateWithBiometrics()
      if (res.success && res.session) {
        triggerSuccessHaptic()
        setSession(res.session)
        return
      }

      if (res.email && !email) {
        setEmail(res.email)
      }

      if (res.error) {
        triggerHaptic("heavy")
        setError(res.error)
      }
    } catch (err: any) {
      triggerHaptic("heavy")
      setError(err?.message || "Biometric authentication failed.")
    } finally {
      setLoading(false)
    }
  }, [email, setSession])

  useEffect(() => {
    const s = getSecuritySettings()
    setHasBiometric(s.hasBiometric)
    const hint = getBiometricLoginCredentials()
    if (hint?.email && !email) {
      setEmail(hint.email)
    }

    if (s.hasBiometric && !isSignUp) {
      const timer = setTimeout(() => {
        handleBiometricLogin()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true); setError(null); setMessage(null)
    
    if (isSignUp) {
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) setError(error.message)
      else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password)
        setSession(data.session)
      } else {
        setMessage("Registration successful! Please check your email for confirmation (if required), or sign in directly.")
        setIsSignUp(false)
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setError(error.message)
      else if (data?.session) {
        saveBiometricLoginCredentials(email.trim(), data.session, password)
        setSession(data.session)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-canvas)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <motion.div className="mb-10 text-center"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <img src="/icon.png" alt="Trouvaille" className="w-16 h-16 mx-auto mb-4 rounded-2xl object-contain shadow-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Trouvaille
        </h1>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Personal expense tracker</p>
      </motion.div>

      <motion.div className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}>
        
        <div className="glass-surface p-7 rounded-[28px]">
          <h2 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
            {isSignUp ? "Create your personal tracker account" : "Enter your email and password"}
          </p>

          {hasBiometric && !isSignUp && (
            <div className="mb-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleBiometricLogin}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <ScanFace size={18} strokeWidth={1.75} />
                <span>Sign In with Face ID / Passkey</span>
              </button>

              <div className="flex items-center gap-3 my-4">
                <div
                  className="h-[1px] flex-1"
                  style={{ background: "var(--glass-border)" }}
                />
                <span
                  className="text-[10px] uppercase font-bold tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  or with password
                </span>
                <div
                  className="h-[1px] flex-1"
                  style={{ background: "var(--glass-border)" }}
                />
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com" required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
            </div>
            
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" required minLength={6}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
            </div>

            {error && <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{error}</p>}
            {message && <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{message}</p>}

            <motion.button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base active:scale-95 transition-all shadow-xl"
              style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 8px 24px var(--shadow-strength)" }}
              whileTap={{ scale: 0.97 }}>
              {loading ? "Processing..." : (<><span>{isSignUp ? "Sign Up" : "Sign In"}</span><ArrowRight size={16} /></>)}
            </motion.button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }} type="button"
              className="text-xs font-semibold transition-colors" style={{ color: "var(--text-secondary)" }}>
              {isSignUp ? "Already have an account? Sign in here" : "Don't have an account? Sign up here"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

