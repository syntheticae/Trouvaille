import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { triggerHaptic } from "../lib/haptics";

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
      // If user hasn't explicitly set it, default to false so it doesn't trap users
      return val === "true";
    } catch {
      return false;
    }
  });

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
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
