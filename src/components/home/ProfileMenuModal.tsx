// ======================================================================
// TROUVAILLE PROFILE BENTO IDENTITY CAPSULE
// Apple Luxury Frosted Glass Bento Popover
// Zero generic list chevrons, luxury squircle geometry, obsidian/alabaster
// Strictly compliant with GEMINI.md
// ======================================================================

import {
  Settings,
  HardDrive,
  CloudCheck,
  Layers,
  Laptop,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useSpace } from "../../contexts/SpaceContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../lib/haptics";
import { useNavigate } from "react-router-dom";

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileSettings: () => void;
  onOpenManageLedgers: () => void;
  onOpenWebDashboard?: () => void;
  displayName?: string;
  avatarUrl?: string;
}

export function ProfileMenuModal({
  isOpen,
  onClose,
  onOpenProfileSettings,
  onOpenManageLedgers,
  onOpenWebDashboard,
  displayName: propDisplayName,
  avatarUrl: propAvatarUrl,
}: ProfileMenuModalProps) {
  const { session, isGuest } = useAuth();
  const { activeSpace } = useSpace();
  const { theme } = useTheme();
  const { t } = useLanguage();
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
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-xs"
          />

          {/* Apple Luxury Bento Capsule Popover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -6 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
            className="absolute top-full left-0 mt-2.5 z-50 w-[290px] sm:w-[316px] rounded-[24px] p-3 shadow-2xl overflow-hidden select-none"
            style={{
              background: isDark
                ? "rgba(14, 14, 18, 0.88)"
                : "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(36px) saturate(190%)",
              WebkitBackdropFilter: "blur(36px) saturate(190%)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.12)"
                : "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: isDark
                ? "0 24px 50px -8px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.16)"
                : "0 20px 40px -8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
            }}
          >
            {/* 1. Identity Pill Card */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onClose();
                setTimeout(() => onOpenProfileSettings(), 100);
              }}
              className="w-full p-2.5 rounded-[18px] text-left transition-all active:scale-[0.98] cursor-pointer group relative overflow-hidden"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.03)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-[14px] overflow-hidden flex items-center justify-center shrink-0 relative"
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
                    <span className="font-semibold text-[13px] text-[var(--text-primary)]">
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {/* Micro sync pip */}
                  <span
                    className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-black/40 ${
                      isGuest ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-[13.5px] truncate text-[var(--text-primary)] leading-snug">
                      {displayName}
                    </p>
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] opacity-60 group-hover:opacity-100 transition-opacity">
                      {t("profile.edit", "Edit")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isGuest
                          ? "rgba(245, 158, 11, 0.12)"
                          : "rgba(16, 185, 129, 0.12)",
                        color: isGuest
                          ? isDark
                            ? "#fbbf24"
                            : "#d97706"
                          : isDark
                          ? "#34d399"
                          : "#059669",
                        border: isGuest
                          ? "1px solid rgba(245, 158, 11, 0.2)"
                          : "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      {isGuest ? (
                        <>
                          <HardDrive size={9} strokeWidth={2} />
                          <span>Local Vault</span>
                        </>
                      ) : (
                        <>
                          <CloudCheck size={9} strokeWidth={2} />
                          <span>Cloud Synced</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* 2. Bento Quick Tiles */}
            <div className="mt-2.5 flex flex-col gap-2">
              {/* Tile A: Active Ledger Space (Full width capsule) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onClose();
                  setTimeout(() => onOpenManageLedgers(), 100);
                }}
                className="w-full p-2.5 rounded-[16px] flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer group"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)",
                  border: isDark
                    ? "1px solid rgba(255, 255, 255, 0.08)"
                    : "1px solid rgba(0, 0, 0, 0.05)",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-[11px] flex items-center justify-center shrink-0"
                    style={{
                      background: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.06)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <Layers size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] block">
                      {t("profile.activeLedger", "Active Ledger")}
                    </span>
                    <p className="font-medium text-[12.5px] text-[var(--text-primary)] truncate leading-tight mt-0.5">
                      {activeSpace.name}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("profile.switch", "Switch")}
                </span>
              </button>

              {/* Bento Row: 2 Companion Tiles (Web Workstation + Settings) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Tile B: Web Dashboard */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                    if (onOpenWebDashboard) {
                      setTimeout(() => onOpenWebDashboard(), 100);
                    }
                  }}
                  className="p-2.5 rounded-[16px] flex flex-col justify-between text-left transition-all active:scale-[0.97] cursor-pointer group"
                  style={{
                    background: isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(0, 0, 0, 0.03)",
                    border: isDark
                      ? "1px solid rgba(255, 255, 255, 0.08)"
                      : "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{
                        background: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <Laptop size={13} strokeWidth={1.75} />
                    </div>
                    <ExternalLink
                      size={11}
                      className="text-[var(--text-tertiary)] opacity-40 group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-[12px] text-[var(--text-primary)] leading-tight">
                      {t("profile.webDashboard", "Web Link")}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5">
                      {t("profile.scanQr", "Connect via QR")}
                    </p>
                  </div>
                </button>

                {/* Tile C: Settings & Preferences */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                    navigate("/settings");
                  }}
                  className="p-2.5 rounded-[16px] flex flex-col justify-between text-left transition-all active:scale-[0.97] cursor-pointer group"
                  style={{
                    background: isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(0, 0, 0, 0.03)",
                    border: isDark
                      ? "1px solid rgba(255, 255, 255, 0.08)"
                      : "1px solid rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{
                        background: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.06)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <Settings size={13} strokeWidth={1.75} />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-[12px] text-[var(--text-primary)] leading-tight">
                      {t("profile.settings", "Settings")}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5">
                      {t("profile.preferences", "Preferences")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
