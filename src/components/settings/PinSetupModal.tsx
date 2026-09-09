import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { triggerHaptic } from "../../lib/haptics";
import { useSecurityLock } from "../../contexts/SecurityLockContext";
import { useToast } from "../../contexts/ToastContext";

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PinSetupModal({ isOpen, onClose }: PinSetupModalProps) {
  const { securitySettings, enrollPin, removePin } = useSecurityLock();
  const { showToast } = useToast();

  const [pinStep, setPinStep] = useState<"create" | "confirm">("create");
  const [pinSetupValue, setPinSetupValue] = useState("");
  const [pinConfirmValue, setPinConfirmValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPinStep("create");
      setPinSetupValue("");
      setPinConfirmValue("");
    }
  }, [isOpen]);

  const handleAction = async () => {
    if (pinStep === "create") {
      if (pinSetupValue.length < 4) return;
      setPinStep("confirm");
      triggerHaptic("light");
    } else {
      if (pinConfirmValue !== pinSetupValue) {
        showToast("PINs do not match", "delete", () => {});
        setPinConfirmValue("");
        triggerHaptic("heavy");
        return;
      }
      await enrollPin(pinSetupValue);
      onClose();
      showToast("Backup PIN saved successfully", "update", () => {});
    }
  };

  const handleRemove = () => {
    removePin();
    onClose();
    showToast("Backup PIN removed", "delete", () => {});
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-10 space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="font-extrabold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {pinStep === "create" ? "Enter Backup PIN" : "Confirm Backup PIN"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {pinStep === "create"
            ? "Choose a 4 to 6-digit numeric PIN to use as an emergency backup unlock."
            : "Re-enter your PIN to confirm."}
        </p>

        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinStep === "create" ? pinSetupValue : pinConfirmValue}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            if (pinStep === "create") setPinSetupValue(val);
            else setPinConfirmValue(val);
          }}
          placeholder="••••••"
          className="w-full text-center tracking-[0.8em] p-4 rounded-2xl outline-none font-black text-[22px]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        />

        <div className="flex gap-2 pt-2">
          {securitySettings.hasPin && (
            <button
              type="button"
              onClick={handleRemove}
              className="py-3.5 px-4 rounded-2xl text-[13px] font-bold cursor-pointer"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
              }}
            >
              Remove PIN
            </button>
          )}

          <button
            type="button"
            disabled={
              pinStep === "create"
                ? pinSetupValue.length < 4
                : pinConfirmValue.length < 4
            }
            onClick={handleAction}
            className="flex-1 py-3.5 rounded-2xl text-[13px] font-bold transition-all disabled:opacity-50 cursor-pointer"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            {pinStep === "create" ? "Continue" : "Save PIN"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
