import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { triggerHaptic } from "../lib/haptics";

const PRIVACY_STORAGE_KEY = "trouvaille_stealth_mode_v1";

interface PrivacyContextType {
  isStealthMode: boolean;
  toggleStealthMode: () => void;
  setStealthMode: (value: boolean) => void;
  maskAmount: (formattedText: string, placeholder?: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isStealthMode: false,
  toggleStealthMode: () => {},
  setStealthMode: () => {},
  maskAmount: (text) => text,
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isStealthMode, setIsStealthModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRIVACY_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

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
      if (!isStealthMode) return formattedText;
      if (formattedText.startsWith("Rp")) {
        return `Rp ${placeholder}`;
      }
      return placeholder;
    },
    [isStealthMode]
  );

  // Global listeners: 3-finger touch on mobile & Cmd+H / Ctrl+H on keyboard
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 3) {
        // 3-finger tap detected!
        toggleStealthMode();
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
          toggleStealthMode();
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleStealthMode]);

  return (
    <PrivacyContext.Provider
      value={{
        isStealthMode,
        toggleStealthMode,
        setStealthMode,
        maskAmount,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
