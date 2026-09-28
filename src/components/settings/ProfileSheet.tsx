import { useState, useRef } from "react";
import {
  User as UserIcon,
  Camera,
  CloudCheck,
  Trash2,
  ArrowRight,
  HardDrive,
  Copy,
  Check,
  MoreVertical,
  RotateCcw,
  Sparkles,
  Shield,
  ShieldCheck,
  Mail,
  Key,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../lib/haptics";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  onOpenDeleteAccount: () => void;
  onOpenResetTransactions?: () => void;
  onReRunCustomization?: () => void;
}

export function ProfileSheet({
  isOpen,
  onClose,
  avatarUrl,
  setAvatarUrl,
  displayName,
  setDisplayName,
  onOpenDeleteAccount,
  onOpenResetTransactions,
  onReRunCustomization,
}: ProfileSheetProps) {
  const { session, isGuest, exitGuestMode } = useAuth();
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isDangerMenuOpen, setIsDangerMenuOpen] = useState(false);

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
      <div className="p-5 pb-10 space-y-4">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-semibold text-base tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Profil Pengguna" : "Personal Profile"}
              </h3>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Identitas, sinkronisasi cloud & keamanan" : "Identity, cloud sync & security"}
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setIsDangerMenuOpen((prev) => !prev);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center glass-surface border transition-all cursor-pointer ${
                  isDangerMenuOpen
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
                title={isIndonesian ? "Aksi Data & Vault" : "Data & Vault Actions"}
                aria-label="Vault Actions"
              >
                <MoreVertical size={16} strokeWidth={1.75} />
              </button>

              {/* 3-Action Danger Menu Dropdown */}
              {isDangerMenuOpen && (
                <div
                  className="absolute right-0 top-10 w-72 rounded-2xl p-1.5 shadow-2xl z-50 border backdrop-blur-2xl space-y-0.5"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="px-2.5 py-1.5 border-b border-[var(--glass-border)] mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      {isIndonesian ? "Tindakan Lanjutan" : "Vault Operations"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setIsDangerMenuOpen(false);
                      onClose();
                      onOpenResetTransactions?.();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0">
                      <RotateCcw size={13} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {isIndonesian ? "Atur Ulang Data Transaksi" : "Reset Transaction Data"}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {isIndonesian
                          ? "Kosongkan transaksi pada space aktif"
                          : "Wipe transactions in active space"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setIsDangerMenuOpen(false);
                      onClose();
                      onReRunCustomization?.();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0">
                      <Sparkles size={13} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {isIndonesian ? "Jalankan Ulang Kustomisasi" : "Re-run Customization"}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {isIndonesian
                          ? "Buka kembali wizard setup awal"
                          : "Re-run initial onboarding wizard"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setIsDangerMenuOpen(false);
                      onClose();
                      window.dispatchEvent(
                        new CustomEvent("trouvaille:preview-initial-sync")
                      );
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0">
                      <ShieldCheck size={13} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {isIndonesian
                          ? "Pratinjau Layar Sinkronisasi"
                          : "Preview Initial Sync Screen"}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                        {isIndonesian
                          ? "Lihat animasi sinkronisasi awal tanpa mereset data"
                          : "View initial sync animation without resetting data"}
                      </p>
                    </div>
                  </button>

                  <div className="border-t border-[var(--glass-border)] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("heavy");
                      setIsDangerMenuOpen(false);
                      onClose();
                      onOpenDeleteAccount();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-red-500/[0.08] transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                      <Trash2 size={13} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-red-600 dark:text-red-400">
                        {isIndonesian ? "Hapus Akun & Reset Vault" : "Delete Account & Reset Vault"}
                      </p>
                      <p className="text-[10px] text-red-500/70 truncate">
                        {isIndonesian
                          ? "Hapus permanen akun & seluruh data"
                          : "Permanently wipe account & all data"}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
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

        {/* 2. Apple iOS Grouped Card: Identity */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] overflow-hidden shadow-sm">
          {/* Row 1: Display Name */}
          <div className="p-3.5 space-y-1.5">
            <label
              className="text-[10px] font-semibold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Nama Tampilan" : "Display Name"}
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

          {/* Guest prompt to link account if not signed in */}
          {isGuest && (
            <div className="p-3.5 pt-0 border-t border-[var(--glass-border)] space-y-2 mt-1">
              <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)] pt-2">
                {isIndonesian
                  ? "Data tersimpan secara lokal di perangkat. Hubungkan akun Google atau Email untuk sinkronisasi cloud otomatis."
                  : "Your data is stored locally. Connect an email or Google account to seamlessly sync your records to the private cloud vault."}
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
                <span>{isIndonesian ? "Hubungkan Akun Google atau Email" : "Connect Google or Email Account"}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
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
          {isSaving
            ? isIndonesian
              ? "Menyimpan Perubahan..."
              : "Saving Changes..."
            : isIndonesian
              ? "Simpan Perubahan Profil"
              : "Save Profile Changes"}
        </button>

        {/* 4. SECTION: Account & Vault Information */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
              <span className="text-[12px] font-semibold text-[var(--text-primary)] tracking-tight">
                {isIndonesian ? "Informasi Akun & Keamanan" : "Account & Security Vault"}
              </span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] flex items-center gap-1.5">
              {isGuest ? (
                <>
                  <HardDrive size={11} strokeWidth={1.5} />
                  <span>{isIndonesian ? "Vault Lokal (Offline)" : "Local Vault (Offline)"}</span>
                </>
              ) : (
                <>
                  <CloudCheck size={11} strokeWidth={1.5} />
                  <span>{isIndonesian ? "Tersinkronisasi Cloud" : "Cloud Synced"}</span>
                </>
              )}
            </span>
          </div>

          <div className="space-y-1.5 text-[12px] pt-1">
            <div className="flex items-center justify-between py-1.5 border-b border-[var(--glass-border)]">
              <span className="text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Mail size={12} strokeWidth={1.5} />
                <span>Email</span>
              </span>
              <span className="font-medium text-[var(--text-primary)] truncate max-w-[210px]">
                {session?.user?.email || (isIndonesian ? "Pengguna Tamu (Offline)" : "Guest User (Offline)")}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-[var(--glass-border)]">
              <span className="text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Key size={12} strokeWidth={1.5} />
                <span>{isIndonesian ? "ID Pengguna" : "User ID"}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                disabled={!session?.user?.id}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border border-[var(--glass-border)] bg-[var(--glass-fill)] active:scale-95 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
              >
                <span>{session?.user?.id ? `${session.user.id.slice(0, 8)}...` : (isIndonesian ? "Lokal" : "Local")}</span>
                {copiedId ? (
                  <Check size={11} className="text-[var(--text-primary)]" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Shield size={12} strokeWidth={1.5} />
                <span>{isIndonesian ? "Protokol Vault" : "Vault Protocol"}</span>
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                {isGuest ? "IndexedDB + LocalStorage" : "Supabase RLS + AES-GCM"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
