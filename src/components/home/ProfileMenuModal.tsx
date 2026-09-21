import {
  Settings,
  ChevronRight,
  HardDrive,
  CloudCheck,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useSpace } from "../../contexts/SpaceContext";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";
import { useNavigate } from "react-router-dom";

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileSettings: () => void;
  onOpenManageLedgers: () => void;
  displayName?: string;
  avatarUrl?: string;
}

export function ProfileMenuModal({
  isOpen,
  onClose,
  onOpenProfileSettings,
  onOpenManageLedgers,
  displayName: propDisplayName,
  avatarUrl: propAvatarUrl,
}: ProfileMenuModalProps) {
  const { session, isGuest } = useAuth();
  const { activeSpace } = useSpace();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const navigate = useNavigate();

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
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
          />

          {/* Unified Liquid Glass Floating Popover (Single Surface, No Double Card) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: "spring", stiffness: 440, damping: 30 }}
            className="absolute top-full left-0 mt-2 z-50 w-[275px] sm:w-[290px] rounded-[22px] p-1.5 shadow-2xl overflow-hidden"
            style={{
              background: isDark
                ? "rgba(18, 18, 22, 0.82)"
                : "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(36px) saturate(190%) brightness(1.05)",
              WebkitBackdropFilter: "blur(36px) saturate(190%) brightness(1.05)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.12)"
                : "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: isDark
                ? "0 20px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.4)"
                : "0 16px 36px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.04)",
            }}
          >
            {/* 1. Profile Identity Header (Interactive, no inner card border) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                setTimeout(() => onOpenProfileSettings(), 120);
              }}
              className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.06] active:bg-black/[0.06] dark:active:bg-white/[0.1] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
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
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate text-[var(--text-primary)] leading-tight">
                    {displayName}
                  </p>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 font-medium mt-0.5">
                    {isGuest ? (
                      <>
                        <HardDrive size={9.5} /> Local Vault
                      </>
                    ) : (
                      <>
                        <CloudCheck size={9.5} /> Cloud Synced
                      </>
                    )}
                  </span>
                </div>
              </div>
              <span className="text-[10.5px] font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors px-1.5 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                Edit
              </span>
            </button>

            {/* Hairline Separator */}
            <div className="h-[1px] bg-black/[0.06] dark:bg-white/[0.08] my-1 mx-1" />

            {/* 2. Floating Option 1: Manage Ledger */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                setTimeout(() => onOpenManageLedgers(), 120);
              }}
              className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.06] active:bg-black/[0.06] dark:active:bg-white/[0.1] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Layers size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[12.5px] text-[var(--text-primary)] leading-tight">
                    Manage Ledger
                  </p>
                  <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {activeSpace.name}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={13}
                className="text-[var(--text-tertiary)] opacity-40 group-hover:opacity-80 transition-opacity shrink-0"
              />
            </button>

            {/* 3. Floating Option 2: Settings & Preferences */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                navigate("/settings");
              }}
              className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.06] active:bg-black/[0.06] dark:active:bg-white/[0.1] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Settings size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[12.5px] text-[var(--text-primary)] leading-tight">
                    Settings & Preferences
                  </p>
                  <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5">
                    Security, vault & backup
                  </p>
                </div>
              </div>
              <ChevronRight
                size={13}
                className="text-[var(--text-tertiary)] opacity-40 group-hover:opacity-80 transition-opacity shrink-0"
              />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
