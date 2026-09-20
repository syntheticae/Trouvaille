import { ChevronRight } from "lucide-react";
import { IconRenderer } from "../ui/IconRenderer";
import { triggerHaptic } from "../../lib/haptics";
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
  return (
    <div className="mb-4.5">
      <div className="flex items-center justify-between mb-2 px-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          Category
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
          <span>All</span>
          <ChevronRight size={13} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
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
              className="whitespace-nowrap px-3.5 py-2 rounded-2xl text-[12px] font-medium flex items-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
              style={{
                background: isSelected
                  ? "rgba(255, 255, 255, 0.14)"
                  : "var(--bg-elevated)",
                border: isSelected
                  ? "1px solid rgba(255, 255, 255, 0.4)"
                  : "1px solid var(--glass-border)",
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                boxShadow: isSelected
                  ? "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.25)"
                  : "none",
              }}
            >
              <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onOpenMore();
          }}
          className="whitespace-nowrap px-3 py-2 rounded-2xl text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
          style={{
            background: "var(--glass-fill)",
            border: "1px dashed var(--glass-border)",
            color: "var(--text-tertiary)",
          }}
        >
          <span>+ More</span>
        </button>
      </div>
    </div>
  );
}
