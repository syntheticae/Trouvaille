import { useState, useEffect } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Camera, Image as ImageIcon, ShieldCheck, Check } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import {
  checkMediaPermissions,
  requestPhotosPermission,
  requestCameraPermission,
  type MediaPermissionsState,
} from "../../lib/mediaPermissions";

interface MediaPermissionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MediaPermissionsSheet({
  isOpen,
  onClose,
}: MediaPermissionsSheetProps) {
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<MediaPermissionsState>({
    camera: "prompt",
    photos: "prompt",
  });
  const [loading, setLoading] = useState(false);

  const refreshPermissions = async () => {
    try {
      const state = await checkMediaPermissions();
      setPermissions(state);
    } catch (err) {
      console.warn("Failed to check media permissions:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPermissions();
    }
  }, [isOpen]);

  const handleRequestPhotos = async () => {
    triggerHaptic("medium");
    setLoading(true);
    try {
      const granted = await requestPhotosPermission();
      await refreshPermissions();
      if (granted) {
        showToast("Photo library access granted", "add", () => {});
      } else {
        showToast("Please allow Photos in iPhone Settings > Trouvaille", "delete", () => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCamera = async () => {
    triggerHaptic("medium");
    setLoading(true);
    try {
      const granted = await requestCameraPermission();
      await refreshPermissions();
      if (granted) {
        showToast("Camera access granted", "add", () => {});
      } else {
        showToast("Please allow Camera in iPhone Settings > Trouvaille", "delete", () => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isPhotosGranted = permissions.photos === "granted" || permissions.photos === "limited";
  const isCameraGranted = permissions.camera === "granted";

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Camera & Gallery Access">
      <div className="p-4 pb-8 space-y-4" style={{ fontFamily: "Urbanist, -apple-system, sans-serif" }}>
        {/* Header Summary */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <ShieldCheck size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
              Hardware & Media Privacy
            </h4>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
              Trouvaille processes all receipt images on-device with zero cloud telemetry.
            </p>
          </div>
        </div>

        {/* Permissions Items List */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
          }}
        >
          {/* Photo Library / Gallery */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <ImageIcon size={16} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-semibold block text-[var(--text-primary)] truncate">
                  Photo Library
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">
                  Import receipts & QRIS slips
                </span>
              </div>
            </div>

            {isPhotosGranted ? (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shrink-0"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <Check size={12} strokeWidth={2} />
                Granted
              </span>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleRequestPhotos}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shrink-0 border"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  boxShadow: "0 2px 8px rgba(255, 255, 255, 0.15)",
                }}
              >
                Request Access
              </button>
            )}
          </div>

          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Camera Hardware */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Camera size={16} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-semibold block text-[var(--text-primary)] truncate">
                  Camera Device
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">
                  Instant receipt photography
                </span>
              </div>
            </div>

            {isCameraGranted ? (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shrink-0"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <Check size={12} strokeWidth={2} />
                Granted
              </span>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleRequestCamera}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shrink-0 border"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  boxShadow: "0 2px 8px rgba(255, 255, 255, 0.15)",
                }}
              >
                Request Access
              </button>
            )}
          </div>
        </div>

        {/* Guidance Note */}
        <div
          className="p-3.5 rounded-2xl border text-[11px] leading-relaxed text-[var(--text-secondary)]"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            borderColor: "var(--glass-border)",
          }}
        >
          If access was previously denied, iOS requires permissions to be re-enabled under <span className="font-semibold text-[var(--text-primary)]">Settings &gt; Trouvaille &gt; Photos &amp; Camera</span>.
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="w-full py-3 rounded-2xl font-semibold text-[13px] active:scale-98 transition-all cursor-pointer text-center"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        >
          Done
        </button>
      </div>
    </BottomSheet>
  );
}
