import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  ScanFace,
  KeyRound,
  LogOut,
  Delete,
  RotateCcw,
} from "lucide-react";
import { useSecurityLock } from "../../contexts/SecurityLockContext";
import { useAuth } from "../../contexts/AuthContext";
import { triggerHaptic } from "../../lib/haptics";

export function BiometricLockOverlay() {
  const {
    isLocked,
    unlockWithBiometric,
    unlockWithPin,
    securitySettings,
    isBiometricSupported,
  } = useSecurityLock();
  const { signOut } = useAuth();

  const [pinMode, setPinMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Auto-prompt Face ID / Biometrics upon lock mount
  useEffect(() => {
    if (isLocked && !pinMode) {
      if (securitySettings.hasBiometric || isBiometricSupported) {
        const timer = setTimeout(() => {
          handleBiometricUnlock();
        }, 350);
        return () => clearTimeout(timer);
      } else if (securitySettings.hasPin) {
        setPinMode(true);
      }
    }
  }, [isLocked, pinMode, securitySettings.hasBiometric, isBiometricSupported, securitySettings.hasPin]);

  const handleBiometricUnlock = async () => {
    setIsVerifying(true);
    triggerHaptic("medium");
    try {
      const ok = await unlockWithBiometric();
      if (!ok && securitySettings.hasPin) {
        setPinMode(true);
      }
    } catch (err) {
      console.warn("[BiometricLock] Unlock failed:", err);
      if (securitySettings.hasPin) {
        setPinMode(true);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinDigit = async (digit: string) => {
    if (pinInput.length >= 6) return;
    triggerHaptic("light");
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setPinError(false);

    // Auto-check on 6 digits (or 4 if user set 4)
    if (nextPin.length >= 4) {
      const ok = await unlockWithPin(nextPin);
      if (!ok && nextPin.length >= 6) {
        setPinError(true);
        triggerHaptic("heavy");
        setTimeout(() => setPinInput(""), 600);
      }
    }
  };

  const handlePinDelete = () => {
    triggerHaptic("light");
    setPinInput((p) => p.slice(0, -1));
    setPinError(false);
  };

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-between p-6 select-none"
        style={{
          background: "var(--bg-canvas)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 24px), 32px)",
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 24px), 32px)",
        }}
      >
        {/* Top Minimal Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 pt-8">
          <div
            className="w-16 h-16 rounded-[22px] flex items-center justify-center shadow-2xl relative"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Lock size={26} strokeWidth={1.5} style={{ color: "var(--text-primary)" }} />
          </div>

          <h2
            className="text-[24px] font-black tracking-tight mt-2"
            style={{ color: "var(--text-primary)" }}
          >
            Trouvaille Locked
          </h2>
          <p
            className="text-[12px] font-medium max-w-[260px] leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            {pinMode
              ? "Enter your security PIN to unlock"
              : "Biometric authentication required to view your financial portfolio"}
          </p>
        </div>

        {/* Middle Interactive Zone: Biometric or PIN */}
        <div className="w-full max-w-xs flex flex-col items-center justify-center my-auto">
          {!pinMode ? (
            <div className="flex flex-col items-center space-y-5 w-full">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                disabled={isVerifying}
                onClick={handleBiometricUnlock}
                className="w-full py-4 rounded-[22px] flex items-center justify-center gap-3 font-bold text-[15px] shadow-xl cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  boxShadow: "0 8px 30px var(--shadow-strength)",
                }}
              >
                <ScanFace size={20} strokeWidth={1.75} />
                <span>{isVerifying ? "Verifying..." : "Unlock with Face ID"}</span>
              </motion.button>

              {securitySettings.hasPin ? (
                <button
                  type="button"
                  onClick={() => {
                    setPinMode(true);
                    setPinInput("");
                    triggerHaptic("light");
                  }}
                  className="flex items-center gap-2 text-[12px] font-bold transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <KeyRound size={14} strokeWidth={1.75} />
                  <span>Use Security PIN</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    triggerHaptic("medium");
                    await signOut();
                  }}
                  className="flex items-center gap-2 text-[12px] font-bold transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <RotateCcw size={14} strokeWidth={1.75} />
                  <span>Reset Lock via Account Sign In</span>
                </button>
              )}
            </div>
          ) : (
            /* PIN Numeric Keypad */
            <div className="w-full space-y-6">
              {/* PIN Dots Indicator */}
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const isFilled = i < pinInput.length;
                  return (
                    <motion.div
                      key={i}
                      animate={pinError ? { x: [-6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.3 }}
                      className="w-3.5 h-3.5 rounded-full transition-all duration-200"
                      style={{
                        background: pinError
                          ? "#ff453a"
                          : isFilled
                            ? "var(--text-primary)"
                            : "var(--glass-fill)",
                        border: isFilled
                          ? "none"
                          : "1px solid var(--glass-border)",
                      }}
                    />
                  );
                })}
              </div>

              {/* Number Keypad Grid */}
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(digit)}
                    className="h-14 rounded-2xl flex items-center justify-center font-bold text-[19px] active:scale-92 transition-all cursor-pointer select-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setPinMode(false);
                    setPinInput("");
                    triggerHaptic("light");
                  }}
                  className="h-14 rounded-2xl flex items-center justify-center text-[11px] font-bold active:scale-92 transition-all cursor-pointer"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handlePinDigit("0")}
                  className="h-14 rounded-2xl flex items-center justify-center font-bold text-[19px] active:scale-92 transition-all cursor-pointer select-none"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-14 rounded-2xl flex items-center justify-center active:scale-92 transition-all cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Delete size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Emergency Sign Out */}
        <div className="pt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={async () => {
              triggerHaptic("medium");
              await signOut();
            }}
            className="flex items-center gap-1.5 text-[11.5px] font-semibold py-2 px-3 rounded-full transition-opacity opacity-70 hover:opacity-100"
            style={{
              color: "var(--text-tertiary)",
            }}
          >
            <LogOut size={13} strokeWidth={1.75} />
            <span>Sign Out from this Device</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
