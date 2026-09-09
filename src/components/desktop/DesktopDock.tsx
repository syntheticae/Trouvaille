import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ReceiptText,
  CalendarDays,
  Activity,
  SlidersHorizontal,
  Plus,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";

interface DesktopDockProps {
  onOpenAdd: () => void;
  onOpenVoiceAdd?: () => void;
}

export function DesktopDock({ onOpenAdd }: DesktopDockProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme !== "light";

  const navItems = [
    {
      label: "Overview",
      path: "/",
      icon: LayoutGrid,
    },
    {
      label: "Ledger",
      path: "/transactions",
      icon: ReceiptText,
    },
    {
      label: "Calendar",
      path: "/calendar",
      icon: CalendarDays,
    },
    {
      label: "Intelligence",
      path: "/statistics",
      icon: Activity,
    },
    {
      label: "Settings",
      path: "/settings",
      icon: SlidersHorizontal,
    },
  ];

  const currentPath = location.pathname;

  return (
    <aside
      aria-label="Desktop Navigation Dock"
      className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center select-none"
    >
      <div
        className="p-2.5 rounded-[28px] flex flex-col items-center gap-2 transition-all duration-300"
        style={{
          background: isDark
            ? "rgba(18, 18, 22, 0.72)"
            : "rgba(255, 255, 255, 0.78)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.10)"
            : "1px solid rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          boxShadow: isDark
            ? "0 20px 48px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
            : "0 20px 48px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
        }}
      >
        {/* Trouvaille Monogram / Logo Mark */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            navigate("/");
          }}
          className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm tracking-tighter mb-1 transition-transform active:scale-95 group relative"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))"
              : "linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))",
            color: "var(--text-primary)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(0,0,0,0.06)",
          }}
          title="Trouvaille Home"
        >
          <span className="font-extrabold text-[15px]">T</span>
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
            Trouvaille
          </span>
        </button>

        <div
          className="w-6 h-[1px] my-0.5"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          }}
        />

        {/* Navigation Items */}
        <div className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  navigate(item.path);
                }}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 group active:scale-90 cursor-pointer ${
                  isActive
                    ? isDark
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "bg-black/[0.08] text-black shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]"
                }`}
                style={{
                  border: isActive
                    ? isDark
                      ? "1px solid rgba(255, 255, 255, 0.16)"
                      : "1px solid rgba(0, 0, 0, 0.12)"
                    : "1px solid transparent",
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />

                {/* Apple Floating Tooltip */}
                <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-normal whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-lg z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                  {item.label}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                  <span
                    className="absolute -right-1.5 w-1 h-3 rounded-full"
                    style={{
                      background: "var(--text-primary)",
                      boxShadow: "0 0 8px var(--text-primary)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          className="w-6 h-[1px] my-0.5"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          }}
        />

        {/* Quick Add Core Action Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            onOpenAdd();
          }}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer group relative shadow-md"
          style={{
            background: isDark ? "#ffffff" : "#09090c",
            color: isDark ? "#09090c" : "#ffffff",
          }}
          title="New Transaction"
        >
          <Plus size={19} strokeWidth={2.4} />
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-lg z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
            Add Transaction (Cmd+K)
          </span>
        </button>

        <div
          className="w-6 h-[1px] my-0.5"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
          }}
        />

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            toggleTheme();
          }}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer group relative text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.05]"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={17} strokeWidth={1.6} /> : <Moon size={17} strokeWidth={1.6} />}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-normal whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-lg z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* User Signout or Avatar */}
        {user && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              signOut();
            }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer group relative text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10"
            title="Sign Out"
          >
            <LogOut size={16} strokeWidth={1.6} />
            <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-normal whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-lg z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
              Sign Out
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
