import type { ReactNode } from "react";
import { DesktopDock } from "./DesktopDock";
import { DesktopHeader } from "./DesktopHeader";
import { useTheme } from "../../contexts/ThemeContext";

interface DesktopShellProps {
  children: ReactNode;
  onOpenAdd: () => void;
  title?: string;
  subtitle?: string;
}

export function DesktopShell({
  children,
  onOpenAdd,
  title,
  subtitle,
}: DesktopShellProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  return (
    <div
      className="min-h-screen w-full relative flex flex-col font-sans transition-colors duration-300"
      style={{
        background: isDark ? "#09090c" : "#f4f4f7",
        color: "var(--text-primary)",
      }}
    >
      {/* Ambient Gradient Mesh Background (Subtle Obsidian Monochrome) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[140px] opacity-60"
          style={{
            background: isDark
              ? "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.04) 0%, rgba(20, 20, 26, 0.01) 70%, transparent 100%)"
              : "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.02) 0%, rgba(220, 220, 230, 0.01) 70%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-0 right-10 w-[600px] h-[400px] rounded-full blur-[130px] opacity-40"
          style={{
            background: isDark
              ? "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.02) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Floating Vertical Navigation Dock (Fixed on Left) */}
      <DesktopDock onOpenAdd={onOpenAdd} />

      {/* Main Content Workspace Wrapper (Offset left for dock on desktop) */}
      <div className="flex-1 flex flex-col lg:pl-28 z-10 relative">
        <DesktopHeader
          title={title}
          subtitle={subtitle}
          onOpenAdd={onOpenAdd}
        />
        <main className="flex-1 w-full pb-16">{children}</main>
      </div>
    </div>
  );
}
