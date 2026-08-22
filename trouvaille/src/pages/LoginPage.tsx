import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Lock, ArrowRight } from "lucide-react"
import { supabase } from "../lib/supabase"

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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
        // Logged in immediately (if confirm email is off)
      } else {
        setMessage("Pendaftaran berhasil! Silakan cek email untuk konfirmasi (jika diperlukan), atau langsung coba masuk.")
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-canvas)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <motion.div className="mb-12 text-center"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <div className="w-16 h-16 mx-auto mb-5 rounded-3xl glass flex items-center justify-center"><div className="w-6 h-6 rounded-full border-[3px] border-[var(--ink-primary)]"></div></div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>
          Trouvaille
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-secondary)" }}>Personal expense tracker</p>
      </motion.div>

      <motion.div className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}>
        
        <div className="glass-surface p-7 rounded-[28px]">
          <h2 className="text-2xl font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
            {isSignUp ? "Create your personal tracker account" : "Enter your email and password"}
          </p>
          
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
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-base active:scale-95 transition-all shadow-xl"
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

