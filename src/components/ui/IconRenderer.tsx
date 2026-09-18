import type { CSSProperties } from "react";
import { resolveIconComponent } from "../../lib/iconRegistry";

interface IconRendererProps {
  icon?: string | null;
  size?: string;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function IconRenderer({
  icon,
  size = "text-xl",
  className = "",
  strokeWidth = 1.75,
  style,
}: IconRendererProps) {
  if (!icon) {
    const Fallback = resolveIconComponent(null);
    return (
      <Fallback
        className={`inline-block shrink-0 ${size} ${className}`}
        strokeWidth={strokeWidth}
        style={{ color: "var(--text-tertiary)", ...style }}
      />
    );
  }

  // Check if string contains custom unmapped emoji or character
  // If it's a raw emoji not mapped in the registry and contains non-ascii
  const isRawUnmappedEmoji =
    /[^\u0000-\u007F]/.test(icon) &&
    !icon.includes("/") &&
    !icon.includes(".") &&
    resolveIconComponent(icon).name === "Tag" &&
    icon.length <= 4;

  if (isRawUnmappedEmoji) {
    return <span className={`inline-block leading-none ${size} ${className}`} style={style}>{icon}</span>;
  }

  const Component = resolveIconComponent(icon);

  // If size contains Tailwind width/height classes (e.g. w-4 h-4, w-6 h-6)
  const hasExplicitDimensions = size.includes("w-") || size.includes("h-") || className.includes("w-") || className.includes("h-");

  const inlineDimensionStyle: CSSProperties = hasExplicitDimensions
    ? {}
    : { width: "1.15em", height: "1.15em" };

  return (
    <Component
      className={`inline-block shrink-0 ${size} ${className}`}
      strokeWidth={strokeWidth}
      style={{
        ...inlineDimensionStyle,
        ...style,
      }}
    />
  );
}
