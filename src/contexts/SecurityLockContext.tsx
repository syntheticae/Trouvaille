import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  getSecuritySettings,
  saveSecuritySettings,
  updateLastActiveTimestamp,
  isLockTimeoutExceeded,
  isBiometricAvailable,
  registerBiometricPasskey,
  verifyBiometricPasskey,
  verifySecurityPin,
  setSecurityPin,
  clearSecurityPin,
  clearBiometricCredential,
  type SecuritySettings,
} from "../lib/biometricAuth";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

interface SecurityLockContextType {
  isLocked: boolean;
  isBiometricSupported: boolean;
  securitySettings: SecuritySettings;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockApp: () => void;
  updateSettings: (partial: Partial<SecuritySettings>) => void;
  enrollBiometric: (userEmail?: string) => Promise<boolean>;
  enrollPin: (pin: string) => Promise<boolean>;
  removePin: () => void;
  removeBiometric: () => void;
}

const SecurityLockContext = createContext<SecurityLockContextType | null>(null);

export function SecurityLockProvider({ children }: { children: ReactNode }) {
  const [securitySettings, setSecuritySettingsState] = useState<SecuritySettings>(
    () => getSecuritySettings(),
  );
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const s = getSecuritySettings();
    return s.enabled; // Locked initially on app start if enabled
  });

  // Check device biometric capabilities on mount
  useEffect(() => {
    isBiometricAvailable().then((supported) => {
      setIsBiometricSupported(supported);
    });
  }, []);

  // Sync settings helper
  const updateSettings = useCallback((partial: Partial<SecuritySettings>) => {
    const updated = saveSecuritySettings(partial);
    setSecuritySettingsState({ ...updated });
  }, []);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const verified = await verifyBiometricPasskey();
      if (verified) {
        setIsLocked(false);
        updateLastActiveTimestamp();
        triggerHaptic("medium");
        return true;
      }
      triggerHaptic("heavy");
      return false;
    } catch {
      triggerHaptic("heavy");
      return false;
    }
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const valid = await verifySecurityPin(pin);
    if (valid) {
      setIsLocked(false);
      updateLastActiveTimestamp();
      triggerHaptic("medium");
      return true;
    }
    triggerHaptic("heavy");
    return false;
  }, []);

  const lockApp = useCallback(() => {
    if (securitySettings.enabled) {
      setIsLocked(true);
      triggerHaptic("light");
    }
  }, [securitySettings.enabled]);

  const enrollBiometric = useCallback(
    async (userEmail?: string): Promise<boolean> => {
      try {
        const success = await registerBiometricPasskey(
          "trouvaille-user",
          userEmail || "owner@trouvaille.app",
        );
        if (success) {
          updateSettings({ hasBiometric: true });
          triggerSuccessHaptic();
          return true;
        }
        return false;
      } catch (e) {
        triggerHaptic("heavy");
        throw e;
      }
    },
    [updateSettings],
  );

  const enrollPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const success = await setSecurityPin(pin);
      if (success) {
        updateSettings({ hasPin: true });
        triggerSuccessHaptic();
      }
      return success;
    },
    [updateSettings],
  );

  const removePin = useCallback(() => {
    clearSecurityPin();
    updateSettings({ hasPin: false });
    triggerHaptic("light");
  }, [updateSettings]);

  const removeBiometric = useCallback(() => {
    clearBiometricCredential();
    updateSettings({ hasBiometric: false });
    triggerHaptic("light");
  }, [updateSettings]);

  // Visibility change & window focus/blur handler
  useEffect(() => {
    if (!securitySettings.enabled) return;

    let backgroundedAt = 0;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        backgroundedAt = Date.now();
        updateLastActiveTimestamp();
      } else {
        if (isLockTimeoutExceeded() || (securitySettings.timeoutMinutes === 0 && backgroundedAt > 0)) {
          setIsLocked(true);
        }
      }
    };

    const handleBlur = () => {
      backgroundedAt = Date.now();
      updateLastActiveTimestamp();
    };

    const handleFocus = () => {
      if (isLockTimeoutExceeded() || (securitySettings.timeoutMinutes === 0 && backgroundedAt > 0)) {
        setIsLocked(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    let appStateHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          backgroundedAt = Date.now();
          updateLastActiveTimestamp();
        } else {
          if (
            isLockTimeoutExceeded() ||
            (securitySettings.timeoutMinutes === 0 && backgroundedAt > 0)
          ) {
            setIsLocked(true);
          }
        }
      }).then((handle) => {
        appStateHandle = handle;
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (appStateHandle) {
        appStateHandle.remove();
      }
    };
  }, [securitySettings.enabled, securitySettings.timeoutMinutes]);

  return (
    <SecurityLockContext.Provider
      value={{
        isLocked,
        isBiometricSupported,
        securitySettings,
        unlockWithBiometric,
        unlockWithPin,
        lockApp,
        updateSettings,
        enrollBiometric,
        enrollPin,
        removePin,
        removeBiometric,
      }}
    >
      {children}
    </SecurityLockContext.Provider>
  );
}

export function useSecurityLock() {
  const ctx = useContext(SecurityLockContext);
  if (!ctx) {
    throw new Error("useSecurityLock must be used within a SecurityLockProvider");
  }
  return ctx;
}
