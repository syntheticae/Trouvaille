import { useState, useRef } from "react";
import {
  User as UserIcon,
  Camera,
  CloudCheck,
  Trash2,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Copy,
  Check,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { triggerHaptic } from "../../lib/haptics";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  onOpenDeleteAccount: () => void;
}

export function ProfileSheet({
  isOpen,
  onClose,
  avatarUrl,
  setAvatarUrl,
  displayName,
  setDisplayName,
  onOpenDeleteAccount,
}: ProfileSheetProps) {
  const { session, isGuest, exitGuestMode } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setAvatarUrl(compressed);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem("trouvaille_avatar", avatarUrl);
      if (session?.user?.id && !isGuest) {
        const { error } = await supabase.auth.updateUser({
          data: { display_name: displayName, avatar_url: avatarUrl },
        });
        if (error) throw error;
      }
      triggerHaptic("medium");
      onClose();
      showToast("Profile updated successfully", "update", () => {});
    } catch (e: any) {
      showToast(e.message || "Failed to update profile", "delete", () => {});
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyId = () => {
    if (!session?.user?.id) return;
    navigator.clipboard.writeText(session.user.id);
    setCopiedId(true);
    triggerHaptic("light");
    showToast("User ID copied to clipboard", "update", () => {});
    setTimeout(() => setCopiedId(false), 2500);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-10 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="font-semibold text-base tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Personal Profile
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Identity, cloud sync & security
            </p>
          </div>
        </div>

        {/* 1. Centered Apple-Style Avatar */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-[var(--glass-border)] bg-[var(--glass-fill)] shadow-md">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon
                  size={36}
                  style={{ color: "var(--text-secondary)" }}
                />
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#18181b] text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer border-2 border-[var(--bg-elevated)]"
              title="Change Photo"
            >
              <Camera size={13} strokeWidth={2} />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] mt-2 font-medium">
            Tap camera to change photo
          </span>
        </div>

        {/* 2. Apple iOS Grouped Card: Identity & Vault */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-sm">
          {/* Row 1: Display Name */}
          <div className="p-3.5 space-y-1.5">
            <label
              className="text-[10px] font-semibold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Display Name
            </label>
            <div className="w-full min-w-0">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full min-w-0 px-3 py-2 rounded-xl outline-none font-medium text-[13px] border border-[var(--glass-border)] bg-[var(--glass-fill)] focus:border-black/30 dark:focus:border-white/25 transition-colors"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Row 2: Vault Status */}
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Vault Status
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  isGuest
                    ? "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-[var(--text-secondary)]"
                    : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {isGuest ? (
                  <>
                    <HardDrive size={11} /> Local Vault (Offline)
                  </>
                ) : (
                  <>
                    <CloudCheck size={11} /> Cloud Synced
                  </>
                )}
              </span>
            </div>

            {isGuest ? (
              <div className="space-y-2 pt-0.5">
                <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                  Your data is stored locally. When you connect an email or Google account, all records will seamlessly migrate to your private cloud vault without losing any data.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    exitGuestMode();
                  }}
                  className="w-full py-2 px-3 rounded-xl font-semibold text-[12px] flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span>Connect Google or Email Account</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: "var(--text-tertiary)" }}>Email</span>
                  <span
                    className="font-medium truncate max-w-[200px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {session?.user?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: "var(--text-tertiary)" }}>User ID</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded-md border border-[var(--glass-border)] bg-[var(--glass-fill)] active:scale-95 cursor-pointer text-[var(--text-secondary)]"
                  >
                    <span>{session?.user?.id ? `${session.user.id.slice(0, 8)}...` : "—"}</span>
                    {copiedId ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Primary Action: Save Profile Changes */}
        <button
          type="button"
          onClick={handleUpdateProfile}
          disabled={isSaving}
          className="w-full h-11 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center justify-center disabled:opacity-50"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-base)",
          }}
        >
          {isSaving ? "Saving Changes..." : "Save Profile Changes"}
        </button>

        {/* 4. SECTION: Danger Zone */}
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] dark:bg-red-500/[0.05] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <AlertTriangle size={13} strokeWidth={1.75} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Danger Zone
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("heavy");
                onOpenDeleteAccount();
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 active:scale-95 transition-all text-red-600 dark:text-red-400 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              <span>Delete Account & Reset Vault</span>
            </button>
          </div>
          <p className="text-[10.5px] leading-relaxed text-[var(--text-tertiary)]">
            Permanently delete your account, wipe all transactions and accounts, and clear all local cache.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
