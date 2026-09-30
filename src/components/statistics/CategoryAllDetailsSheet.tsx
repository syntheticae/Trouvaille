import { Layers } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { triggerHaptic } from "../../lib/haptics";
import type { CategoryMoMShift } from "../../lib/financialMath";

interface CategoryStatItem {
  name: string;
  emoji: string;
  total: number;
  count: number;
  budget_amount: number | null;
}

interface ParentCategoryStatItem {
  name: string;
  emoji: string;
  total: number;
  count: number;
  categoriesCount: number;
  categoriesList: Array<{
    name: string;
    emoji: string;
    total: number;
    count: number;
  }>;
}

interface CategoryAllDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isIndonesian: boolean;
  breakdownType: "expense" | "income";
  groupMode: "category" | "parent";
  setGroupMode: (mode: "category" | "parent") => void;
  categoryStats: CategoryStatItem[];
  parentCategoryStats: ParentCategoryStatItem[];
  totalBreakdownAmount: number;
  donutColors: string[];
  categoryShifts: CategoryMoMShift[];
  onSelectCategoryShift: (shift: CategoryMoMShift) => void;
  formatWithPreferred: (amount: number) => string;
}

export function CategoryAllDetailsSheet({
  isOpen,
  onClose,
  isIndonesian,
  breakdownType,
  groupMode,
  setGroupMode,
  categoryStats,
  parentCategoryStats,
  totalBreakdownAmount,
  donutColors,
  categoryShifts,
  onSelectCategoryShift,
  formatWithPreferred,
}: CategoryAllDetailsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-[max(calc(env(safe-area-inset-bottom,0px)+16px),28px)] space-y-3.5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3
              className="font-semibold text-base"
              style={{ color: "var(--text-primary)" }}
            >
              {breakdownType === "expense"
                ? isIndonesian
                  ? "Rincian Pengeluaran Kategori"
                  : "Expense Breakdown Details"
                : isIndonesian
                  ? "Rincian Pemasukan Kategori"
                  : "Income Breakdown Details"}
            </h3>
            <p
              className="text-[12px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {groupMode === "parent"
                ? parentCategoryStats.length
                : categoryStats.length}{" "}
              {groupMode === "parent"
                ? isIndonesian
                  ? "grup induk"
                  : "parent groups"
                : isIndonesian
                  ? "kategori"
                  : "categories"}{" "}
              · Total {formatWithPreferred(totalBreakdownAmount)}
            </p>
          </div>
        </div>

        {/* Group Mode Toggle Inside BottomSheet */}
        <div
          className="flex items-center gap-1.5 p-1 rounded-xl w-fit"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setGroupMode("category");
              triggerHaptic("light");
            }}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
            style={{
              background:
                groupMode === "category"
                  ? "var(--glass-fill-strong)"
                  : "transparent",
              color:
                groupMode === "category"
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            {isIndonesian ? "Per Kategori" : "By Category"}
          </button>
          <button
            type="button"
            onClick={() => {
              setGroupMode("parent");
              triggerHaptic("light");
            }}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
            style={{
              background:
                groupMode === "parent"
                  ? "var(--glass-fill-strong)"
                  : "transparent",
              color:
                groupMode === "parent"
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            <Layers size={11} />
            <span>{isIndonesian ? "Per Induk" : "By Parent"}</span>
          </button>
        </div>

        {/* 2-Column Modern Compact Card Grid */}
        <div className="grid grid-cols-2 gap-2.5 pb-6 pr-0.5">
          {groupMode === "category"
            ? categoryStats.map((cat, i) => {
                const pct =
                  totalBreakdownAmount > 0
                    ? ((cat.total / totalBreakdownAmount) * 100).toFixed(1)
                    : "0.0";
                const barColor = donutColors[i % donutColors.length];
                const shift = categoryShifts.find(
                  (s) => s.name.toLowerCase() === cat.name.toLowerCase(),
                );

                return (
                  <div
                    key={cat.name}
                    onClick={() => {
                      if (shift) {
                        onSelectCategoryShift(shift);
                        triggerHaptic("light");
                      }
                    }}
                    className="p-3 rounded-2xl flex flex-col justify-between cursor-pointer active:scale-97 transition-all select-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      minHeight: "105px",
                    }}
                  >
                    {/* Top Row: Icon + Name + Percentage */}
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                        </div>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full amount shrink-0"
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <p
                        className="text-[12px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                        title={cat.name}
                      >
                        {cat.name}
                      </p>
                    </div>

                    {/* Bottom Row: Amount + Sub-detail + Progress */}
                    <div className="pt-2">
                      <p
                        className="amount text-[13px] truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatWithPreferred(cat.total)}
                      </p>
                      <div
                        className="flex items-center justify-between text-[10px] mt-0.5 mb-1.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <span>
                          {cat.count} {isIndonesian ? "transaksi" : "txs"}
                        </span>
                        {shift && (
                          <span
                            style={{
                              color: shift.isIncrease
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {shift.isIncrease ? "↑" : "↓"}
                            {shift.pctChange}%
                          </span>
                        )}
                      </div>
                      <div
                        className="w-full h-1 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            : parentCategoryStats.map((parent, i) => {
                const pct =
                  totalBreakdownAmount > 0
                    ? ((parent.total / totalBreakdownAmount) * 100).toFixed(1)
                    : "0.0";
                const barColor = donutColors[i % donutColors.length];

                return (
                  <div
                    key={parent.name}
                    className="p-3 rounded-2xl flex flex-col justify-between select-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      minHeight: "105px",
                    }}
                  >
                    {/* Top Row: Icon + Name + Percentage */}
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <IconRenderer icon={parent.emoji} size="w-4 h-4" />
                        </div>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full amount shrink-0"
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <p
                        className="text-[12px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                        title={parent.name}
                      >
                        {parent.name}
                      </p>
                    </div>

                    {/* Bottom Row: Amount + Sub-detail + Progress */}
                    <div className="pt-2">
                      <p
                        className="amount text-[13px] truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatWithPreferred(parent.total)}
                      </p>
                      <div
                        className="flex items-center justify-between text-[10px] mt-0.5 mb-1.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <span>
                          {parent.categoriesCount}{" "}
                          {isIndonesian ? "kategori" : "categories"}
                        </span>
                        <span>
                          {parent.count} {isIndonesian ? "transaksi" : "txs"}
                        </span>
                      </div>
                      <div
                        className="w-full h-1 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </BottomSheet>
  );
}
