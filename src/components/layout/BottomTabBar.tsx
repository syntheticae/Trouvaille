import { useState, useRef, useEffect, useCallback } from "react";
import { triggerHaptic } from "../../lib/haptics";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  History,
  Plus,
  PieChart,
  Landmark,
  Mic,
  Camera,
  FileText,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";

interface BottomTabBarProps {
  onOpenAdd?: () => void;
  onOpenVoiceAdd?: () => void;
  onOpenScan?: () => void;
}

type HoldOption = "manual" | "voice" | "scan";

export function BottomTabBar({
  onOpenAdd,
  onOpenVoiceAdd,
  onOpenScan,
}: BottomTabBarProps) {
  const { t, isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const location = useLocation();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<HoldOption | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const selectedOptionRef = useRef<HoldOption | null>(null);

  // Keep ref in sync for event callbacks
  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPressRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsFlyoutOpen(true);
      setSelectedOption("voice"); // Default center (1)
      triggerHaptic("heavy");
    }, 320);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current) return;

    const deltaX = e.clientX - pointerStartPosRef.current.x;
    const deltaY = e.clientY - pointerStartPosRef.current.y;

    if (!isLongPressRef.current) {
      // If moved too much before hold threshold, cancel long press
      if (Math.hypot(deltaX, deltaY) > 20) {
        clearLongPress();
      }
      return;
    }

    const dist = Math.hypot(deltaX, deltaY);

    // Cancel selection if dragged too far down or excessively far away
    if (deltaY > 60 || dist > 180) {
      if (selectedOptionRef.current !== null) {
        setSelectedOption(null);
      }
      return;
    }

    let newOption: HoldOption;
    if (dist < 15) {
      // Close to origin -> default to Option 1 (Voice / Center)
      newOption = "voice";
    } else {
      // Radial angle in degrees (screen Y is inverted: negative is upwards)
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      if (angle < -112) {
        // Towards Upper Left (Option 2: Manual)
        newOption = "manual";
      } else if (angle > -68 && angle < 0) {
        // Towards Upper Right (Option 3: Scan)
        newOption = "scan";
      } else {
        // Towards Upper Center (Option 1: Voice)
        newOption = "voice";
      }
    }

    if (newOption !== selectedOptionRef.current) {
      triggerHaptic("light");
      setSelectedOption(newOption);
    }
  };

  const executeOption = (option: HoldOption) => {
    triggerHaptic("medium");
    if (option === "manual") {
      onOpenAdd?.();
    } else if (option === "voice") {
      onOpenVoiceAdd?.();
    } else if (option === "scan") {
      onOpenScan?.();
    }
  };

  const handlePointerUp = () => {
    clearLongPress();

    if (isLongPressRef.current) {
      const chosen = selectedOptionRef.current;
      setIsFlyoutOpen(false);
      setSelectedOption(null);
      pointerStartPosRef.current = null;

      if (chosen) {
        executeOption(chosen);
      }
      return;
    }

    pointerStartPosRef.current = null;
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

  // Radial Arc Option Definitions matching the user's diagram:
  //      (1)
  //  (2)     (3)
  // [A B  C  D E]
  // 1: Center elevated (Voice)
  // 2: Left (Manual)
  // 3: Right (Scan)
  const arcOptions: {
    id: HoldOption;
    numLabel: string;
    icon: any;
    label: string;
    x: number;
    y: number;
    iconSize: number;
  }[] = [
    {
      id: "manual",
      numLabel: "2",
      icon: FileText,
      label: isIndonesian ? "Transaksi Manual" : "Manual Transaction",
      x: -54,
      y: -46,
      iconSize: 18,
    },
    {
      id: "voice",
      numLabel: "1",
      icon: Mic,
      label: isIndonesian ? "Input Suara" : "Voice Quick-Add",
      x: 0,
      y: -76,
      iconSize: 20,
    },
    {
      id: "scan",
      numLabel: "3",
      icon: Camera,
      label: isIndonesian ? "Pindai Struk" : "Scan Receipt",
      x: 54,
      y: -46,
      iconSize: 18,
    },
  ];

  // Requested Tab Order:
  // 1. Home (/) [A]
  // 2. Assets (/assets) [B]
  // 3. + (Add) [C]
  // 4. Transactions (/transactions) [D]
  // 5. Analytics (/statistics) [E]
  const tabs = [
    { path: "/", icon: Home, label: t("nav.home", "Home") },
    { path: "/assets", icon: Landmark, label: t("nav.assets", "Assets") },
    { action: "add", icon: Plus, label: t("nav.add", "Add") },
    { path: "/transactions", icon: History, label: t("nav.transactions", "Transactions") },
    { path: "/statistics", icon: PieChart, label: t("nav.analytics", "Analytics") },
  ];

  return (
    <>
      {/* Backdrop for Flyout Dismissal */}
      <AnimatePresence>
        {isFlyoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsFlyoutOpen(false);
              setSelectedOption(null);
            }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] pointer-events-auto"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pointer-events-none flex justify-center">
        <div
          className="w-full max-w-[370px] rounded-full p-1.5 flex items-center justify-between pointer-events-auto transition-all relative"
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
                <div
                  key="add"
                  className="relative flex items-center justify-center"
                >
                  {/* Radial Arc Fan Menu (Buttons 2, 1, 3 above C) */}
                  <AnimatePresence>
                    {isFlyoutOpen && (
                      <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
                        {/* Dynamic Action Floating Title Pill above the Arc */}
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          className="absolute -top-[106px] left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide shadow-xl whitespace-nowrap pointer-events-none select-none z-20"
                          style={{
                            background: isDark
                              ? "rgba(18, 18, 22, 0.94)"
                              : "rgba(255, 255, 255, 0.96)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--glass-border)",
                            backdropFilter: "blur(20px)",
                            boxShadow: isDark
                              ? "0 8px 24px rgba(0, 0, 0, 0.7)"
                              : "0 6px 20px rgba(0, 0, 0, 0.12)",
                          }}
                        >
                          {selectedOption === "manual" &&
                            (isIndonesian ? "Transaksi Manual" : "Manual Add")}
                          {selectedOption === "voice" &&
                            (isIndonesian ? "Input Suara" : "Voice Quick-Add")}
                          {selectedOption === "scan" &&
                            (isIndonesian ? "Pindai Struk" : "Scan Receipt")}
                          {!selectedOption &&
                            (isIndonesian ? "Arahkan Jari" : "Glide to Select")}
                        </motion.div>

                        {/* Arc Floating Buttons (2, 1, 3) */}
                        {arcOptions.map((item) => {
                          const ItemIcon = item.icon;
                          const isSelected = selectedOption === item.id;

                          return (
                            <motion.button
                              key={item.id}
                              type="button"
                              initial={{
                                opacity: 0,
                                scale: 0.2,
                                x: 0,
                                y: 0,
                              }}
                              animate={{
                                opacity: 1,
                                scale: isSelected ? 1.18 : 1,
                                x: item.x,
                                y: item.y,
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.2,
                                x: 0,
                                y: 0,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 480,
                                damping: 26,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsFlyoutOpen(false);
                                executeOption(item.id);
                              }}
                              className={`w-11 h-11 rounded-full flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-colors duration-150 cursor-pointer select-none ${
                                isSelected ? "shadow-2xl z-10" : "shadow-lg z-0"
                              }`}
                              style={{
                                background: isSelected
                                  ? "var(--text-primary)"
                                  : isDark
                                    ? "rgba(20, 20, 26, 0.90)"
                                    : "rgba(255, 255, 255, 0.94)",
                                color: isSelected
                                  ? "var(--bg-base)"
                                  : "var(--text-primary)",
                                border: isSelected
                                  ? "1.5px solid var(--text-primary)"
                                  : isDark
                                    ? "1px solid rgba(255, 255, 255, 0.16)"
                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                boxShadow: isSelected
                                  ? isDark
                                    ? "0 12px 28px rgba(255, 255, 255, 0.25)"
                                    : "0 10px 24px rgba(0, 0, 0, 0.25)"
                                  : isDark
                                    ? "0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.18)"
                                    : "0 6px 18px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
                                backdropFilter: "blur(24px) saturate(180%)",
                                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                              }}
                              title={item.label}
                              aria-label={item.label}
                            >
                              <ItemIcon
                                size={item.iconSize}
                                strokeWidth={isSelected ? 2.2 : 1.85}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Center Add Button [C] */}
                  <button
                    data-tour="quick-add"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={clearLongPress}
                    onPointerCancel={clearLongPress}
                    onClick={handleAddClick}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label={
                      isIndonesian
                        ? "Tambah Transaksi (Tahan & Geser untuk Suara atau Pindai)"
                        : "Add Transaction (Hold & Glide for Voice or Scan)"
                    }
                    title={
                      isIndonesian
                        ? "Ketuk untuk Tambah, Tahan & Geser: Manual, Suara, Pindai"
                        : "Tap to Add, Hold & Glide: Manual, Voice, Scan"
                    }
                    className={`w-10 h-10 flex items-center justify-center relative rounded-full active:scale-95 transition-all select-none touch-manipulation cursor-pointer ${
                      isFlyoutOpen ? "scale-105" : ""
                    }`}
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={2.5}
                      className={`transition-transform duration-200 ${
                        isFlyoutOpen ? "rotate-45" : ""
                      }`}
                    />
                  </button>
                </div>
              );
            }

            const isActive = location.pathname === tab.path;

            return (
              <NavLink
                key={tab.path}
                to={tab.path!}
                data-tour={
                  tab.path === "/"
                    ? "nav-home"
                    : tab.path === "/assets"
                    ? "nav-assets"
                    : tab.path === "/transactions"
                    ? "nav-transactions"
                    : tab.path === "/statistics"
                    ? "nav-statistics"
                    : undefined
                }
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
    </>
  );
}
