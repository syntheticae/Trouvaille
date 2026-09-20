import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  savePersistentSession,
  getPersistentSession,
  clearPersistentSession,
  clearBiometricLoginCredentials,
} from "../lib/biometricAuth";

export const GUEST_USER_ID = "guest_local_user";

export const GUEST_USER: User = {
  id: GUEST_USER_ID,
  app_metadata: { provider: "guest" },
  user_metadata: { display_name: "Guest" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "guest@trouvaille.local",
  role: "authenticated",
} as User;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  setSession: () => {},
  signOut: async () => {},
  continueAsGuest: () => {},
  exitGuestMode: () => {},
});

function getStoredSupabaseSession(): Session | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.access_token || parsed.user)) {
            return parsed as Session;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("trouvaille_guest_mode") === "true";
  });

  const continueAsGuest = () => {
    localStorage.setItem("trouvaille_guest_mode", "true");
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    localStorage.removeItem("trouvaille_guest_mode");
    setIsGuest(false);
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (data?.session) {
          savePersistentSession(data.session);
          setSession(data.session);
          setIsGuest(false);
          localStorage.removeItem("trouvaille_guest_mode");
          setLoading(false);
          return;
        }

        // If Supabase getSession returned null or threw, check session vault or stored tokens
        const vault = getPersistentSession() || getStoredSupabaseSession();
        if (vault) {
          if (vault.refresh_token) {
            try {
              const { data: refreshed } = await supabase.auth.setSession({
                access_token: vault.access_token || "",
                refresh_token: vault.refresh_token,
              });
              if (refreshed?.session && isMounted) {
                savePersistentSession(refreshed.session);
                setSession(refreshed.session);
                setIsGuest(false);
                localStorage.removeItem("trouvaille_guest_mode");
                setLoading(false);
                return;
              }
            } catch (rErr) {
              console.warn("[AuthContext] Background token refresh failed, holding offline session:", rErr);
            }
          }

          // If offline or network error occurred during refresh, do not log user out
          const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
          if (isOffline || (error && error.message?.toLowerCase().includes("fetch"))) {
            console.info("[AuthContext] Network unavailable: preserving session from vault");
            if (isMounted) {
              setSession(vault);
              setLoading(false);
              return;
            }
          }
        }

        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[AuthContext] initAuth exception:", err);
        const vault = getPersistentSession() || getStoredSupabaseSession();
        if (vault && isMounted) {
          setSession(vault);
        } else if (isMounted) {
          setSession(null);
        }
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        clearPersistentSession();
        clearBiometricLoginCredentials();
        setSession(null);
        setLoading(false);
        return;
      }

      if (newSession) {
        savePersistentSession(newSession);
        setSession(newSession);
        setIsGuest(false);
        localStorage.removeItem("trouvaille_guest_mode");
        setLoading(false);
        return;
      }

      // If newSession is null, only clear if no stored session remains in local storage or vault
      const vault = getPersistentSession() || getStoredSupabaseSession();
      if (!vault) {
        setSession(null);
        setLoading(false);
      } else {
        console.info("[AuthContext] newSession is null, preserving active session vault");
      }
    });

    const handleOnline = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session && isMounted) {
          savePersistentSession(data.session);
          setSession(data.session);
        }
      } catch {}
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem("TROUVAILLE_OFFLINE_CACHE_V1");
      localStorage.removeItem("TROUVAILLE_TX_BACKUP_V1");
      localStorage.removeItem("trouvaille_guest_mode");
      clearPersistentSession();
      clearBiometricLoginCredentials();
    } catch {}
    await supabase.auth.signOut();
    setSession(null);
    setIsGuest(false);
  };

  const effectiveUser = session?.user ?? (isGuest ? GUEST_USER : null);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: effectiveUser,
        loading,
        isGuest,
        setSession: (s) => {
          if (s) {
            setIsGuest(false);
            localStorage.removeItem("trouvaille_guest_mode");
          }
          setSession(s);
        },
        signOut,
        continueAsGuest,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
