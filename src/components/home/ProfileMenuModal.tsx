// ======================================================================
// TROUVAILLE PROFILE DYNAMIC ISLAND HORIZONTAL CAPSULE
// Apple Luxury Frosted Glass Dynamic Island Expansion
// Strictly compliant with GEMINI.md:
// - Rule 1: No native colored emojis, outline vector Lucide icons only
// - Rule 2: Monochrome luxury glassmorphism (obsidian / alabaster)
// - Rule 3: Zero icons in settings toggles
// ======================================================================

import {
  Bell,
  Layers,
  Laptop,
  X,
  HardDrive,
  CloudCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useSpace } from "../../contexts/SpaceContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUpcomingBills } from "../../hooks/useBills";
import { triggerHaptic } from "../../lib/haptics";

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileSettings: () => void;
  onOpenManageLedgers: () => void;
  onOpenWebDashboard?: () => void;
  onOpenNotifications?: () => void;
  displayName?: string;
  avatarUrl?: string;
}

export function ProfileMenuModal({
  isOpen,
  onClose,
  onOpenProfileSettings,
  onOpenManageLedgers,
  onOpenWebDashboard,
  onOpenNotifications,
  displayName: propDisplayName,
  avatarUrl: propAvatarUrl,
}: ProfileMenuModalProps) {
  const { session, isGuest } = useAuth();
  const { activeSpace } = useSpace();
  const { theme } = useTheme();
  const { isIndonesian } = useLanguage();
  const isDark = theme !== "light";
  const upcomingBills = useUpcomingBills();
  const hasNotifications = upcomingBills.length > 0;

  const displayName =
    propDisplayName ||
    session?.user?.user_metadata?.display_name ||
    session?.user?.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    propAvatarUrl ||
    session?.user?.user_metadata?.avatar_url ||
    localStorage.getItem("trouvaille_avatar") ||
    "";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle click-outside backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
          />

          {/* Apple Dynamic Island Horizontal Expansion Capsule */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.94, x: -6 }}
            transition={{ type: "spring", stiffness: 480, damping: 32 }}
            className="absolute top-0 left-0 z-50 h-11 rounded-full px-2 flex items-center gap-1.5 shadow-2xl overflow-hidden select-none max-w-[calc(100vw-36px)]"
            style={{
              background: isDark
                ? "rgba(14, 14, 18, 0.94)"
                : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(36px) saturate(190%)",
              WebkitBackdropFilter: "blur(36px) saturate(190%)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.14)"
                : "1px solid rgba(0, 0, 0, 0.09)",
              boxShadow: isDark
                ? "0 18px 45px -8px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.16)"
                : "0 16px 36px -8px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
            }}
          >
            {/* 1. Profile Identity Chip (Avatar + Name) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                setTimeout(() => onOpenProfileSettings(), 80);
              }}
              className="flex items-center gap-2 pl-0.5 pr-2 py-1 rounded-full hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer shrink-0 max-w-[140px]"
              title={isIndonesian ? "Profil Pengguna" : "User Profile"}
            >
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 relative"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-semibold text-[11px] text-[var(--text-primary)]">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {/* Micro sync pip */}
                <span
                  className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full border border-black/50 ${
                    isGuest ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
              </div>

              <div className="min-w-0 text-left">
                <p className="font-semibold text-[12px] truncate text-[var(--text-primary)] leading-none">
                  {displayName}
                </p>
                <div className="flex items-center gap-0.5 mt-0.5 opacity-60">
                  {isGuest ? (
                    <HardDrive size={8} className="shrink-0" />
                  ) : (
                    <CloudCheck size={8} className="shrink-0" />
                  )}
                  <span className="text-[9px] font-medium leading-none">
                    {isGuest ? "Local" : "Sync"}
                  </span>
                </div>
              </div>
            </button>

            {/* Hairline Divider */}
            <div
              className="h-4 w-[1px] shrink-0"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(0, 0, 0, 0.1)",
              }}
            />

            {/* 2. Active Space Ledger Capsule */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                setTimeout(() => onOpenManageLedgers(), 80);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-left transition-all active:scale-95 cursor-pointer shrink-0 max-w-[130px]"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.04)",
                border: "1px solid var(--glass-border)",
              }}
              title={isIndonesian ? "Ganti Buku / Space" : "Switch Space"}
            >
              <Layers size={12} strokeWidth={1.75} className="shrink-0 text-[var(--text-secondary)]" />
              <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                {activeSpace.name}
              </span>
            </button>

            {/* 3. Notification Button (Moved from Header) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                if (onOpenNotifications) {
                  setTimeout(() => onOpenNotifications(), 80);
                }
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center relative active:scale-95 transition-transform cursor-pointer shrink-0"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.04)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
              title={isIndonesian ? "Pemberitahuan" : "Notifications"}
            >
              <Bell size={13} strokeWidth={1.75} />
              {hasNotifications && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] ring-1 ring-black/40" />
              )}
            </button>

            {/* 4. Web Dashboard Link Button */}
            {onOpenWebDashboard && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                  setTimeout(() => onOpenWebDashboard(), 80);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(0, 0, 0, 0.04)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
                title={isIndonesian ? "Web Dashboard QR" : "Web Link"}
              >
                <Laptop size={13} strokeWidth={1.75} />
              </button>
            )}

            {/* 5. Collapse / Close Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer shrink-0 ml-0.5"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.03)",
              }}
              title={isIndonesian ? "Tutup" : "Close"}
              aria-label="Close"
            >
              <X size={11} strokeWidth={2} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
