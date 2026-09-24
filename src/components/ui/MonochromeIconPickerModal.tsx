import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import {
  CURATED_ICON_GROUPS,
  ALL_CURATED_ICON_NAMES,
  ICON_KEYWORDS,
  ALL_ICONS_MAP,
} from "../../lib/iconRegistry";
import { triggerHaptic } from "../../lib/haptics";

interface MonochromeIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon?: string | null;
  onSelectIcon: (iconName: string) => void;
  title?: string;
}

export function MonochromeIconPickerModal({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon,
  title = "Choose Icon",
}: MonochromeIconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");

  // Normalize selected icon name
  const normalizedSelected = useMemo(() => {
    if (!selectedIcon) return "";
    const clean = selectedIcon
      .split("/")
      .pop()
      ?.replace(/\.(png|webp|jpg|jpeg|svg)$/i, "")
      .toLowerCase();
    return clean || "";
  }, [selectedIcon]);

  // Filter icons based on group & search query
  const filteredIcons = useMemo(() => {
    let pool = ALL_CURATED_ICON_NAMES;
    if (activeGroup !== "all") {
      const group = CURATED_ICON_GROUPS.find((g) => g.id === activeGroup);
      if (group) pool = group.icons;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return pool;

    return pool.filter((name) => {
      // Direct name match
      if (name.toLowerCase().includes(q)) return true;

      // Keyword lookup match
      const keywords = ICON_KEYWORDS[name] || [];
      return keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
    });
  }, [activeGroup, searchQuery]);

  const handleSelect = (iconName: string) => {
    triggerHaptic("medium");
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-16 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="font-semibold text-lg leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h3>
            <p
              className="text-[11px] font-semibold mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {filteredIcons.length} monochrome vector icons
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-95 shrink-0 cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search Bar */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Search size={15} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icon (e.g. bank, food, car, salary)..."
            className="bg-transparent text-[13px] font-semibold flex-1 outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Filter Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          <button
            type="button"
            onClick={() => {
              setActiveGroup("all");
              triggerHaptic("light");
            }}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer"
            style={{
              background:
                activeGroup === "all" ? "var(--text-primary)" : "var(--glass-fill)",
              color:
                activeGroup === "all" ? "var(--bg-base)" : "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            All
          </button>
          {CURATED_ICON_GROUPS.map((group) => {
            const isActive = activeGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setActiveGroup(group.id);
                  triggerHaptic("light");
                }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer whitespace-nowrap"
                style={{
                  background: isActive ? "var(--text-primary)" : "var(--glass-fill)",
                  color: isActive ? "var(--bg-base)" : "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Icon Grid (Luxury Frosted Squircles) */}
        <div
          className="grid grid-cols-4 gap-2.5 p-2 rounded-2xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {filteredIcons.map((iconName) => {
            const IconComponent = ALL_ICONS_MAP[iconName];
            if (!IconComponent) return null;

            const isSelected =
              normalizedSelected === iconName.toLowerCase() ||
              selectedIcon === iconName;

            return (
              <button
                key={iconName}
                type="button"
                onClick={() => handleSelect(iconName)}
                className="group relative flex flex-col items-center justify-center p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer text-center"
                style={{
                  background: isSelected
                    ? "var(--text-primary)"
                    : "var(--glass-fill)",
                  border: isSelected
                    ? "1px solid var(--text-primary)"
                    : "1px solid var(--glass-border)",
                }}
              >
                <div className="w-7 h-7 flex items-center justify-center mb-1">
                  <IconComponent
                    size={20}
                    strokeWidth={1.75}
                    style={{
                      color: isSelected
                        ? "var(--bg-base)"
                        : "var(--text-primary)",
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium truncate w-full px-0.5"
                  style={{
                    color: isSelected
                      ? "var(--bg-base)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {iconName}
                </span>

                {isSelected && (
                  <div
                    className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--bg-base)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Check size={8} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-4 py-8 text-center">
              <p
                className="text-[12px] font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                No vector icons found for "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-[11px] font-bold text-[var(--accent)] underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
