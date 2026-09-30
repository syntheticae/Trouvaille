import { useState } from "react";
import { X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { triggerHaptic } from "../../lib/haptics";
import { useSecurityLock } from "../../contexts/SecurityLockContext";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PinSetupModal({ isOpen, onClose }: PinSetupModalProps) {
  const { securitySettings, enrollPin, removePin } = useSecurityLock();
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();

  const [pinStep, setPinStep] = useState<"create" | "confirm">("create");
  const [pinSetupValue, setPinSetupValue] = useState("");
  const [pinConfirmValue, setPinConfirmValue] = useState("");

  const resetForm = () => {
    setPinStep("create");
    setPinSetupValue("");
    setPinConfirmValue("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAction = async () => {
    if (pinStep === "create") {
      if (pinSetupValue.length < 4) return;
      setPinStep("confirm");
      triggerHaptic("light");
    } else {
      if (pinConfirmValue !== pinSetupValue) {
        showToast(
          isIndonesian ? "PIN tidak cocok. Coba lagi." : "PINs do not match",
          "delete",
          () => {},
        );
        setPinConfirmValue("");
        triggerHaptic("heavy");
        return;
      }
      await enrollPin(pinSetupValue);
      resetForm();
      onClose();
      showToast(
        isIndonesian
          ? "PIN cadangan berhasil disimpan"
          : "Backup PIN saved successfully",
        "update",
        () => {},
      );
    }
  };

  const handleRemove = () => {
    removePin();
    resetForm();
    onClose();
    showToast(
      isIndonesian ? "PIN cadangan dihapus" : "Backup PIN removed",
      "delete",
      () => {},
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="p-5 pb-[max(calc(env(safe-area-inset-bottom,0px)+12px),24px)] space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {pinStep === "create"
              ? isIndonesian
                ? "Buat PIN Cadangan"
                : "Enter Backup PIN"
              : isIndonesian
                ? "Konfirmasi PIN Cadangan"
                : "Confirm Backup PIN"}
          </h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {pinStep === "create"
            ? isIndonesian
              ? "Pilih 4 hingga 6 digit angka PIN sebagai akses darurat pembuka kunci."
              : "Choose a 4 to 6-digit numeric PIN to use as an emergency backup unlock."
            : isIndonesian
              ? "Masukkan kembali PIN Anda untuk mengonfirmasi."
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
          className="w-full text-center tracking-[0.8em] p-4 rounded-2xl outline-none font-semibold text-[22px]"
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
              className="py-3.5 px-4 rounded-2xl text-[13px] font-semibold cursor-pointer transition-all active:scale-95"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {isIndonesian ? "Hapus PIN" : "Remove PIN"}
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
            className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            {pinStep === "create"
              ? isIndonesian
                ? "Lanjutkan"
                : "Continue"
              : isIndonesian
                ? "Simpan PIN"
                : "Save PIN"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

