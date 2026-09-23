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
      setSelectedOption("voice");
      triggerHaptic("heavy");
    }, 280);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current) return;

    const deltaX = e.clientX - pointerStartPosRef.current.x;
    const deltaY = e.clientY - pointerStartPosRef.current.y;

    if (!isLongPressRef.current) {
      // If moved too much before hold threshold, cancel long press
      if (Math.hypot(deltaX, deltaY) > 12) {
        clearLongPress();
      }
      return;
    }

    // Interactive Drag-to-Select Logic
    // If dragged too far upward or downward, cancel selection
    if (deltaY < -160 || deltaY > 90) {
      if (selectedOptionRef.current !== null) {
        setSelectedOption(null);
      }
      return;
    }

    let newOption: HoldOption;
    if (deltaX < -32) {
      newOption = "manual";
    } else if (deltaX > 32) {
      newOption = "scan";
    } else {
      newOption = "voice";
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

  // Requested Tab Order:
  // 1. Home (/)
  // 2. Assets (/assets) [moved from pos 5]
  // 3. + (Add)
  // 4. Transactions (/transactions) [moved from pos 2]
  // 5. Analytics (/statistics) [moved from pos 4]
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
          {/* Apple Dynamic Island Floating Action Dock (Triggered on Hold) */}
          <AnimatePresence>
            {isFlyoutOpen && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 480, damping: 30 }}
                className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none"
              >
                {/* Active Action Floating Text Pill */}
                <div
                  className="mb-2 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide transition-all shadow-md"
                  style={{
                    background: isDark
                      ? "rgba(18, 18, 22, 0.92)"
                      : "rgba(255, 255, 255, 0.95)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {selectedOption === "manual" &&
                    (isIndonesian ? "Transaksi Manual" : "Manual Add")}
                  {selectedOption === "voice" &&
                    (isIndonesian ? "Input Suara" : "Voice Quick-Add")}
                  {selectedOption === "scan" &&
                    (isIndonesian ? "Pindai Struk" : "Scan Receipt")}
                  {!selectedOption &&
                    (isIndonesian ? "Geser ke Pilihan" : "Glide to Select")}
                </div>

                {/* 3-Button Dynamic Island Capsule */}
                <div
                  className="p-1.5 rounded-full flex items-center gap-1.5 shadow-2xl transition-all"
                  style={{
                    background: isDark
                      ? "rgba(16, 16, 20, 0.92)"
                      : "rgba(255, 255, 255, 0.95)",
                    border: isDark
                      ? "1px solid rgba(255, 255, 255, 0.14)"
                      : "1px solid rgba(0, 0, 0, 0.08)",
                    boxShadow: isDark
                      ? "0 20px 48px -6px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18)"
                      : "0 18px 40px -6px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(32px) saturate(200%)",
                    WebkitBackdropFilter: "blur(32px) saturate(200%)",
                  }}
                >
                  {/* Button 1: Left - Manual Transaction */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlyoutOpen(false);
                      executeOption("manual");
                    }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      selectedOption === "manual"
                        ? "scale-110 shadow-lg"
                        : "opacity-65 hover:opacity-100"
                    }`}
                    style={{
                      background:
                        selectedOption === "manual"
                          ? "var(--text-primary)"
                          : "var(--glass-fill)",
                      color:
                        selectedOption === "manual"
                          ? "var(--bg-base)"
                          : "var(--text-primary)",
                      border: "1px solid var(--glass-border)",
                    }}
                    title={isIndonesian ? "Transaksi Manual" : "Manual Transaction"}
                  >
                    <FileText size={17} strokeWidth={selectedOption === "manual" ? 2.2 : 1.75} />
                  </button>

                  {/* Button 2: Center - Voice Quick-Add */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlyoutOpen(false);
                      executeOption("voice");
                    }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      selectedOption === "voice"
                        ? "scale-110 shadow-lg"
                        : "opacity-65 hover:opacity-100"
                    }`}
                    style={{
                      background:
                        selectedOption === "voice"
                          ? "var(--text-primary)"
                          : "var(--glass-fill)",
                      color:
                        selectedOption === "voice"
                          ? "var(--bg-base)"
                          : "var(--text-primary)",
                      border: "1px solid var(--glass-border)",
                    }}
                    title={isIndonesian ? "Input Suara" : "Voice Quick-Add"}
                  >
                    <Mic size={18} strokeWidth={selectedOption === "voice" ? 2.2 : 1.75} />
                  </button>

                  {/* Button 3: Right - Receipt Scan */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlyoutOpen(false);
                      executeOption("scan");
                    }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      selectedOption === "scan"
                        ? "scale-110 shadow-lg"
                        : "opacity-65 hover:opacity-100"
                    }`}
                    style={{
                      background:
                        selectedOption === "scan"
                          ? "var(--text-primary)"
                          : "var(--glass-fill)",
                      color:
                        selectedOption === "scan"
                          ? "var(--bg-base)"
                          : "var(--text-primary)",
                      border: "1px solid var(--glass-border)",
                    }}
                    title={isIndonesian ? "Scan Foto / Struk" : "Scan Receipt"}
                  >
                    <Camera size={17} strokeWidth={selectedOption === "scan" ? 2.2 : 1.75} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.action === "add") {
              return (
                <button
                  key="add"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onClick={handleAddClick}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label="Add Transaction (Hold & Glide for Voice/Scan)"
                  title="Tap to Add, Hold to Glide: Manual, Voice, Scan"
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
    </>
  );
}
