import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { triggerHaptic } from "../lib/haptics";
import { ShieldCheck } from "lucide-react";
import { App as CapApp } from "@capacitor/app";

const PRIVACY_STORAGE_KEY = "trouvaille_stealth_mode_v1";
const SHIELD_STORAGE_KEY = "trouvaille_privacy_shield_enabled_v1";

interface PrivacyContextType {
  isStealthMode: boolean;
  toggleStealthMode: () => void;
  setStealthMode: (value: boolean) => void;
  isPrivacyShieldEnabled: boolean;
  togglePrivacyShield: () => void;
  setPrivacyShieldEnabled: (value: boolean) => void;
  maskAmount: (formattedText: string, placeholder?: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isStealthMode: false,
  toggleStealthMode: () => {},
  setStealthMode: () => {},
  isPrivacyShieldEnabled: false,
  togglePrivacyShield: () => {},
  setPrivacyShieldEnabled: () => {},
  maskAmount: (text) => text,
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Master Privacy Shield setting (controls app switcher overlay & auto-masking)
  const [isPrivacyShieldEnabled, setIsPrivacyShieldEnabledState] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(SHIELD_STORAGE_KEY);
      return val === "true";
    } catch {
      return false;
    }
  });

  // App Switcher blur state (true when app is backgrounded or in app switcher)
  const [isAppBlurred, setIsAppBlurred] = useState(false);

  // Stealth mode (masks monetary figures in UI)
  const [isStealthMode, setIsStealthModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRIVACY_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const setPrivacyShieldEnabled = useCallback((val: boolean) => {
    setIsPrivacyShieldEnabledState(val);
    if (!val) {
      setIsStealthModeState(false);
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, "false");
      } catch {}
    }
    try {
      localStorage.setItem(SHIELD_STORAGE_KEY, String(val));
    } catch {}
  }, []);

  const togglePrivacyShield = useCallback(() => {
    setIsPrivacyShieldEnabledState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SHIELD_STORAGE_KEY, String(next));
      } catch {}
      if (!next) {
        setIsStealthModeState(false);
        try {
          localStorage.setItem(PRIVACY_STORAGE_KEY, "false");
        } catch {}
      }
      triggerHaptic("medium");
      return next;
    });
  }, []);

  const setStealthMode = useCallback((val: boolean) => {
    setIsStealthModeState(val);
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  }, []);

  const toggleStealthMode = useCallback(() => {
    setIsStealthModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      triggerHaptic("medium");
      return next;
    });
  }, []);

  const maskAmount = useCallback(
    (formattedText: string, placeholder = "••••••••") => {
      if (!isStealthMode && !isPrivacyShieldEnabled) return formattedText;
      if (formattedText.startsWith("Rp")) {
        return `Rp ${placeholder}`;
      }
      return placeholder;
    },
    [isStealthMode, isPrivacyShieldEnabled]
  );

  // iOS App Switcher & Background Privacy Shield overlay listeners
  useEffect(() => {
    if (!isPrivacyShieldEnabled) {
      setIsAppBlurred(false);
      return;
    }

    const handleBlur = () => setIsAppBlurred(true);
    const handleFocus = () => setIsAppBlurred(false);
    const handleVisibility = () => {
      if (document.hidden) {
        setIsAppBlurred(true);
      } else {
        setIsAppBlurred(false);
      }
    };
    const handlePageHide = () => setIsAppBlurred(true);
    const handlePageShow = () => setIsAppBlurred(false);

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    let capListenerHandle: any;
    try {
      capListenerHandle = CapApp.addListener("appStateChange", ({ isActive }) => {
        setIsAppBlurred(!isActive);
      });
    } catch {}

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      if (capListenerHandle) {
        capListenerHandle.then((h: any) => h.remove?.()).catch(() => {});
      }
    };
  }, [isPrivacyShieldEnabled]);

  // Global listeners: 3-finger touch on mobile & Cmd+H / Ctrl+H on keyboard
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 3) {
        // 3-finger tap detected!
        togglePrivacyShield();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "h") {
        // Avoid intercepting browser history if inside input field
        const target = e.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          togglePrivacyShield();
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePrivacyShield]);

  return (
    <PrivacyContext.Provider
      value={{
        isStealthMode,
        toggleStealthMode,
        setStealthMode,
        isPrivacyShieldEnabled,
        togglePrivacyShield,
        setPrivacyShieldEnabled,
        maskAmount,
      }}
    >
      {children}

      {/* iOS App Switcher & Multitasking Privacy Shield Overlay */}
      {isPrivacyShieldEnabled && isAppBlurred && (
        <div
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn"
          style={{
            background: "var(--bg-base)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
          }}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3 shadow-2xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <ShieldCheck
              size={32}
              strokeWidth={1.5}
              className="text-[var(--text-primary)]"
            />
          </div>
          <h3
            className="text-[17px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Trouvaille
          </h3>
          <p
            className="text-[12px] font-medium mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Financial Privacy Shield Active
          </p>
        </div>
      )}
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
