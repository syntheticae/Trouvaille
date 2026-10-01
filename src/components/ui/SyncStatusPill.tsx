import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, CloudOff } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export type SyncStatusState = "idle" | "syncing" | "synced" | "error";

export interface SyncStatusDetail {
  status: SyncStatusState;
  count?: number;
  message?: string;
  forceShow?: boolean;
}

export function emitSyncStatus(detail: SyncStatusDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trouvaille:sync-status", { detail }));
  }
}

interface SyncStatusPillProps {
  isBlocked?: boolean;
}

export function SyncStatusPill({ isBlocked = false }: SyncStatusPillProps) {
  const { isIndonesian } = useLanguage();
  const [status, setStatus] = useState<SyncStatusState>("idle");
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [isToastActive, setIsToastActive] = useState(false);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWakeupTimestampRef = useRef<number>(Date.now());

  // Track app switching / tab focus to enforce a wake-up grace period
  useEffect(() => {
    const markWakeup = () => {
      lastWakeupTimestampRef.current = Date.now();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markWakeup();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", markWakeup);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", markWakeup);
    };
  }, []);

  // Listen to toast activity so SyncStatusPill never clashes with Dynamic Island HUD
  useEffect(() => {
    const handleToastActive = (e: Event) => {
      const custom = e as CustomEvent<{ active: boolean }>;
      setIsToastActive(!!custom.detail?.active);
    };
    window.addEventListener("trouvaille:toast-active", handleToastActive);
    return () => window.removeEventListener("trouvaille:toast-active", handleToastActive);
  }, []);

  // Native online / offline network event listeners
  useEffect(() => {
    const handleOnline = () => {
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current);
        offlineDebounceRef.current = null;
      }
      // If was previously showing offline error, provide brief reassuring confirmation
      if (status === "error") {
        setStatus("synced");
        setCustomMessage(null);
        dismissTimerRef.current = setTimeout(() => {
          setVisible(false);
          setStatus("idle");
        }, 1500);
      } else {
        setVisible(false);
        setStatus("idle");
      }
    };

    const handleOffline = () => {
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current);
      }
      // Require 3.5s of persistent offline state to prevent flickering on momentary switch
      offlineDebounceRef.current = setTimeout(() => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setStatus("error");
          setCustomMessage(null);
          setVisible(true);
        }
      }, 3500);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [status]);

  useEffect(() => {
    const handleSyncStatus = (event: Event) => {
      const customEvent = event as CustomEvent<SyncStatusDetail>;
      const detail = customEvent.detail;
      if (!detail || !detail.status) return;

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current);
        offlineDebounceRef.current = null;
      }

      if (detail.status === "syncing") {
        setCustomMessage(detail.message || null);
        setStatus("syncing");
        setVisible(true);
      } else if (detail.status === "synced") {
        setCustomMessage(detail.message || null);
        setStatus("synced");
        setVisible(true);
        dismissTimerRef.current = setTimeout(() => {
          setVisible(false);
          setStatus("idle");
          setCustomMessage(null);
        }, 2000);
      } else if (detail.status === "error") {
        const isActuallyOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
        const timeSinceWakeup = Date.now() - lastWakeupTimestampRef.current;
        const isWithinWakeupGracePeriod = timeSinceWakeup < 4000;

        // 1. If device is online or waking up from app switch, strictly suppress offline false-positive pill
        if (isActuallyOnline || isWithinWakeupGracePeriod) {
          if (!detail.forceShow) {
            setVisible(false);
            setStatus("idle");
            return;
          }
        }

        // 2. Only show offline pill if device is genuinely offline and stays offline for 3.5s
        offlineDebounceRef.current = setTimeout(() => {
          const stillOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
          if (stillOffline || detail.forceShow) {
            setCustomMessage(detail.message || null);
            setStatus("error");
            setVisible(true);
            dismissTimerRef.current = setTimeout(() => {
              setVisible(false);
              setStatus("idle");
              setCustomMessage(null);
            }, 3500);
          } else {
            setVisible(false);
            setStatus("idle");
          }
        }, 3500);
      } else {
        setVisible(false);
        setStatus("idle");
        setCustomMessage(null);
      }
    };

    window.addEventListener("trouvaille:sync-status", handleSyncStatus);
    return () => {
      window.removeEventListener("trouvaille:sync-status", handleSyncStatus);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current);
    };
  }, []);

  const shouldRender = visible && !isBlocked && !isToastActive && status !== "idle";

  return (
    <AnimatePresence>
      {shouldRender && (
        <aside
          aria-label={
            status === "syncing"
              ? isIndonesian
                ? "Menyinkronkan transaksi"
                : "Syncing transactions"
              : status === "synced"
              ? isIndonesian
                ? "Data transaksi mutakhir"
                : "Transactions up to date"
              : isIndonesian
              ? "Bekerja secara offline"
              : "Working offline"
          }
          className="fixed z-[99990] left-4 right-4 max-w-md mx-auto flex items-center justify-center select-none pointer-events-none"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 18px), 28px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.92 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 350,
            }}
            drag="y"
            dragConstraints={{ top: -40, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y < -12 || info.velocity.y < -120) {
                setVisible(false);
                setStatus("idle");
              }
            }}
            onClick={() => {
              setVisible(false);
              setStatus("idle");
            }}
            className="pointer-events-auto cursor-pointer px-3.5 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-2xl transition-all shadow-lg active:scale-95 touch-manipulation"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 8px 32px var(--shadow-card)",
            }}
            title={isIndonesian ? "Ketuk atau geser ke atas untuk menutup" : "Tap or swipe up to dismiss"}
          >
            {status === "syncing" && (
              <Loader2
                size={13}
                strokeWidth={2}
                className="animate-spin text-[var(--text-secondary)]"
              />
            )}
            {status === "synced" && (
              <Check
                size={13}
                strokeWidth={2.2}
                className="text-[var(--text-primary)]"
              />
            )}
            {status === "error" && (
              <CloudOff
                size={13}
                strokeWidth={1.75}
                className="text-[var(--text-secondary)]"
              />
            )}
            <span
              className="text-[11.5px] font-medium tracking-tight"
              style={{ color: "var(--text-secondary)" }}
            >
              {customMessage
                ? customMessage
                : status === "syncing"
                ? isIndonesian
                  ? "Menyinkronkan transaksi..."
                  : "Syncing transactions..."
                : status === "synced"
                ? isIndonesian
                  ? "Data mutakhir"
                  : "Up to date"
                : isIndonesian
                ? "Bekerja secara offline"
                : "Working offline"}
            </span>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
}
