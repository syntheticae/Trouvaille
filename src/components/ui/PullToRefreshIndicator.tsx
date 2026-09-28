import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 65,
}: PullToRefreshIndicatorProps) {
  const { isIndonesian } = useLanguage();

  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(1, pullDistance / threshold);
  const rotation = isRefreshing ? undefined : progress * 360;

  return (
    <div
      className="fixed left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-transform duration-200 select-none"
      style={{
        top: "max(calc(env(safe-area-inset-top, 0px) + 8px), 16px)",
        transform: `translateY(${Math.max(0, pullDistance - 20)}px)`,
        opacity: Math.min(1, progress * 1.2),
      }}
    >
      <div
        className="px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-2xl"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 4px 20px var(--shadow-card)",
        }}
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: rotation }}
          transition={
            isRefreshing
              ? { duration: 0.8, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }
          style={{ color: "var(--text-primary)" }}
        >
          <RefreshCw size={13} strokeWidth={1.75} />
        </motion.div>
        <span
          className="text-[11.5px] font-medium tracking-tight"
          style={{ color: "var(--text-secondary)" }}
        >
          {isRefreshing
            ? isIndonesian
              ? "Menyinkronkan..."
              : "Syncing..."
            : progress >= 1
            ? isIndonesian
              ? "Lepas untuk menyegarkan"
              : "Release to refresh"
            : isIndonesian
            ? "Tarik untuk menyegarkan"
            : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
