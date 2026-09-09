import { useEffect } from "react";
import { Search, Command } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";

interface DesktopHeaderProps {
  title?: string;
  subtitle?: string;
  onOpenSearch?: () => void;
  onOpenAdd?: () => void;
}

export function DesktopHeader({
  title = "Command Center",
  subtitle = "Portfolio & Cashflow Overview",
  onOpenSearch,
  onOpenAdd,
}: DesktopHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { netWorth } = useWalletBalances();

  // Keyboard shortcut listener: Cmd+K / Ctrl+K opens quick add or search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        triggerHaptic("light");
        if (onOpenAdd) onOpenAdd();
        else if (onOpenSearch) onOpenSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenAdd, onOpenSearch]);

  return (
    <header
      className="w-full px-8 py-5 flex items-center justify-between select-none"
      style={{
        borderBottom: isDark
          ? "1px solid rgba(255, 255, 255, 0.06)"
          : "1px solid rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Left: Workspace Title & Live Status */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-[20px] font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                color: "var(--text-secondary)",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p
            className="text-[12px] font-medium mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Center/Right: Quick Search / Cmd+K Pill & Net Worth Glance */}
      <div className="flex items-center gap-4">
        {/* Cmd+K Search Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            if (onOpenSearch) onOpenSearch();
            else if (onOpenAdd) onOpenAdd();
          }}
          className="flex items-center gap-3 px-3.5 py-2 rounded-2xl transition-all hover:bg-white/[0.06] active:scale-95 cursor-pointer text-left"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
            color: "var(--text-secondary)",
          }}
        >
          <Search size={14} className="text-[var(--text-tertiary)]" />
          <span className="text-[12px] font-medium min-w-[140px]">
            Quick Command...
          </span>
          <div className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.08] text-[var(--text-tertiary)]">
            <Command size={10} />
            <span>K</span>
          </div>
        </button>

        {/* Vertical Divider */}
        <div
          className="w-[1px] h-8"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          }}
        />

        {/* Live Net Worth Hero Glancer */}
        <div className="text-right">
          <span
            className="text-[10px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            Net Worth
          </span>
          <div className="flex items-baseline gap-1.5 justify-end">
            <span
              className="text-[17px] font-black amount tracking-tight leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(netWorth)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
