import { useRef } from "react";
import { triggerHaptic } from "../../lib/haptics";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, History, Plus, PieChart, Landmark } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface BottomTabBarProps {
  onOpenAdd?: () => void;
  onOpenVoiceAdd?: () => void;
}

export function BottomTabBar({ onOpenAdd, onOpenVoiceAdd }: BottomTabBarProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const handlePointerDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic("heavy");
      if (onOpenVoiceAdd) {
        onOpenVoiceAdd();
      }
    }, 380);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    triggerHaptic("medium");
    if (onOpenAdd) onOpenAdd();
  };

  const tabs = [
    { path: "/", icon: Home, label: t("nav.home", "Home") },
    { path: "/transactions", icon: History, label: t("nav.transactions", "Transactions") },
    { action: "add", icon: Plus, label: t("nav.add", "Add") },
    { path: "/statistics", icon: PieChart, label: t("nav.analytics", "Analytics") },
    { path: "/assets", icon: Landmark, label: t("nav.assets", "Assets") },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pointer-events-none flex justify-center">
      <div
        className="w-full max-w-[370px] rounded-full p-1.5 flex items-center justify-between pointer-events-auto transition-all"
        style={{
          background: "var(--dock-bg)",
          border: "1.5px solid var(--dock-border)",
          boxShadow: "var(--dock-shadow)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          borderRadius: "9999px",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.action === "add") {
            return (
              <button
                key="add"
                onPointerDown={handlePointerDown}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                onClick={handleAddClick}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Add Transaction (Hold for Voice)"
                title="Tap to Add, Hold for Voice Dictation"
                className="w-10 h-10 flex items-center justify-center relative rounded-full active:scale-95 transition-transform select-none touch-manipulation cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                <Icon size={20} strokeWidth={2.5} />
              </button>
            );
          }

          const isActive = location.pathname === tab.path;

          return (
            <NavLink
              key={tab.path}
              to={tab.path!}
              onClick={() => triggerHaptic("light")}
              className="w-10 h-10 flex items-center justify-center relative rounded-full"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "var(--dock-active-pill)",
                    boxShadow: "var(--dock-active-shadow, 0 2px 8px rgba(0, 0, 0, 0.15))",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                size={19}
                className="relative z-10 transition-colors duration-200"
                style={{
                  color: isActive
                    ? "var(--dock-active-ink, #ffffff)"
                    : "var(--dock-inactive-ink, var(--text-tertiary))",
                }}
              />
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
