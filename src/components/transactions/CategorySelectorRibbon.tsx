import { ChevronRight } from "lucide-react";
import { IconRenderer } from "../ui/IconRenderer";
import { triggerHaptic } from "../../lib/haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import type { Category } from "../../lib/types";

export interface CategorySelectorRibbonProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onOpenMore: () => void;
}

export function CategorySelectorRibbon({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenMore,
}: CategorySelectorRibbonProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isIndonesian } = useLanguage();

  return (
    <div className="mb-4">
      {/* Header Label & More Action */}
      <div className="flex items-center justify-between mb-2 px-1 select-none">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {isIndonesian ? "Kategori" : "Category"}
        </span>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenMore();
          }}
          className="text-[11px] font-medium flex items-center gap-0.5 active:opacity-70 transition-opacity cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
        >
          <span>{isIndonesian ? "Semua" : "All"}</span>
          <ChevronRight size={13} strokeWidth={1.75} />
        </button>
      </div>

      {/* Horizontal Ribbon Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 select-none">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onSelectCategory(cat.id);
              }}
              className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
              style={{
                background: isSelected
                  ? isDark
                    ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.84) 48%, rgba(244,245,247,0.90) 100%)"
                    : "#18181b"
                  : "var(--bg-elevated)",
                border: isSelected
                  ? isDark
                    ? "1px solid rgba(255, 255, 255, 0.95)"
                    : "1px solid #18181b"
                  : "1px solid var(--glass-border)",
                color: isSelected
                  ? isDark
                    ? "#000000"
                    : "#ffffff"
                  : "var(--text-secondary)",
                boxShadow: isSelected
                  ? isDark
                    ? "inset 0 1px 0 #ffffff, 0 3px 12px rgba(0, 0, 0, 0.28)"
                    : "0 3px 10px rgba(0, 0, 0, 0.16)"
                  : "none",
              }}
            >
              <span className="shrink-0 flex items-center justify-center">
                <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold leading-none">{cat.name}</span>
            </button>
          );
        })}

        {/* Action Button: More */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenMore();
          }}
          className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-[0.96] cursor-pointer"
          style={{
            background: "var(--glass-fill)",
            border: "1px dashed var(--glass-border)",
            color: "var(--text-tertiary)",
          }}
        >
          <span>{isIndonesian ? "+ Lainnya" : "+ More"}</span>
        </button>
      </div>
    </div>
  );
}
