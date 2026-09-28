import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, CloudOff } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export type SyncStatusState = "idle" | "syncing" | "synced" | "error";

export interface SyncStatusDetail {
  status: SyncStatusState;
  count?: number;
  message?: string;
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
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleSyncStatus = (event: Event) => {
      const customEvent = event as CustomEvent<SyncStatusDetail>;
      const detail = customEvent.detail;
      if (!detail || !detail.status) return;

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      if (detail.status === "syncing") {
        setStatus("syncing");
        setVisible(true);
      } else if (detail.status === "synced") {
        setStatus("synced");
        setVisible(true);
        dismissTimerRef.current = setTimeout(() => {
          setVisible(false);
          setStatus("idle");
        }, 2200);
      } else if (detail.status === "error") {
        setStatus("error");
        setVisible(true);
        dismissTimerRef.current = setTimeout(() => {
          setVisible(false);
          setStatus("idle");
        }, 2500);
      } else {
        setVisible(false);
        setStatus("idle");
      }
    };

    window.addEventListener("trouvaille:sync-status", handleSyncStatus);
    return () => {
      window.removeEventListener("trouvaille:sync-status", handleSyncStatus);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const shouldRender = visible && !isBlocked && status !== "idle";

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
              ? "Sinkronisasi offline"
              : "Offline sync"
          }
          className="fixed z-[99990] left-0 right-0 mx-auto w-fit flex items-center justify-center pointer-events-none select-none px-4"
          style={{
            top: "max(calc(env(safe-area-inset-top, 0px) + 12px), 20px)",
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
            className="px-3.5 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-2xl transition-all shadow-lg"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 8px 32px var(--shadow-card)",
            }}
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
              {status === "syncing"
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
