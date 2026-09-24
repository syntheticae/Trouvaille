import { useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { MonochromeIconPickerModal } from "../ui/MonochromeIconPickerModal";
import { autoSuggestIcon } from "../../lib/iconRegistry";
import { triggerHaptic } from "../../lib/haptics";
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../../hooks/useCategories";
import { formatRupiah } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";

interface CategoryManagementSheetsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManagementSheets({
  isOpen,
  onClose,
}: CategoryManagementSheetsProps) {
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<"list" | "edit" | "add">("list");
  const [manageCatTab, setManageCatTab] = useState<"expense" | "income">("expense");
  const [categorySearch, setCategorySearch] = useState("");
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catIcon, setCatIcon] = useState("Tag");
  const [hasCustomPickedAddIcon, setHasCustomPickedAddIcon] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<"add" | "edit" | null>(null);

  const [editCategory, setEditCategory] = useState<{
    id: string;
    name: string;
    emoji: string;
    budget_amount?: number | null;
    type?: string;
  } | null>(null);
  const [editCategoryBudget, setEditCategoryBudget] = useState("");

  const handleCloseAll = () => {
    setViewMode("list");
    setEditCategory(null);
    onClose();
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) return;
    const finalIcon = catIcon || autoSuggestIcon(catName) || "Tag";
    addCategory.mutate(
      { name: catName.trim(), emoji: finalIcon, type: catType },
      {
        onSuccess: () => {
          setViewMode("list");
          setCatName("");
          setCatIcon("Tag");
          setHasCustomPickedAddIcon(false);
          showToast("Category created", "add", () => {});
        },
      },
    );
  };

  const handleUpdateCategory = () => {
    if (!editCategory?.name.trim()) return;
    const numBudget = editCategoryBudget.trim()
      ? Number(editCategoryBudget.replace(/\D/g, ""))
      : null;
    updateCategory.mutate(
      {
        id: editCategory.id,
        name: editCategory.name.trim(),
        budget_amount: numBudget,
        emoji: editCategory.emoji || "Tag",
      },
      {
        onSuccess: () => {
          setViewMode("list");
          setEditCategory(null);
          showToast("Category updated", "update", () => {});
        },
      },
    );
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    deleteCategory.mutate(id, {
      onSuccess: () => {
        if (editCategory?.id === id) {
          setViewMode("list");
          setEditCategory(null);
        }
        showToast("Category deleted", "delete", () => {});
      },
      onError: (error: any) => {
        showToast(error?.message || "Failed to delete category", "delete", () => {});
      },
    });
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleCloseAll}>
        <div className="p-5 pb-10 space-y-4">
          {/* Header Bar */}
          {viewMode === "list" ? (
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="font-semibold text-base tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Categories
                </h3>
                <p
                  className="text-[12px] mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {categories.length} total categories · Tap to edit
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setCatName("");
                    setCatType(manageCatTab);
                    setCatIcon("Tag");
                    setHasCustomPickedAddIcon(false);
                    setViewMode("add");
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm active:scale-95 cursor-pointer"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                  }}
                  title="Add Category"
                >
                  <Plus size={16} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] active:scale-95 transition-colors"
                  title="Close"
                >
                  <X size={15} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setViewMode("list");
                }}
                className="flex items-center gap-1 py-1 px-2 -ml-2 rounded-xl text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} strokeWidth={2} />
                <span>Categories</span>
              </button>
              <h3
                className="font-semibold text-base tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {viewMode === "edit" ? "Edit Category" : "New Category"}
              </h3>
              <button
                type="button"
                onClick={handleCloseAll}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] active:scale-95 transition-colors"
                title="Close"
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* VIEW: LIST */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {viewMode === "list" && (
            <div className="space-y-3.5">
              {/* Quick Search */}
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] shadow-sm"
              >
                <Search size={15} style={{ color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search category name..."
                  className="bg-transparent text-[13px] font-medium flex-1 outline-none min-w-0"
                  style={{ color: "var(--text-primary)" }}
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={() => setCategorySearch("")}
                    className="w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Segmented Tab: Expense vs Income */}
              <div
                className="flex p-1 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)]"
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setManageCatTab("expense");
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer text-center ${
                    manageCatTab === "expense"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Expense ({expenseCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setManageCatTab("income");
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer text-center ${
                    manageCatTab === "income"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Income ({incomeCategories.length})
                </button>
              </div>

              {/* Apple iOS Inset Grouped Table */}
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-sm">
                {categories
                  .filter((c) => c.type === manageCatTab)
                  .filter(
                    (c) =>
                      !categorySearch.trim() ||
                      c.name
                        .toLowerCase()
                        .includes(categorySearch.toLowerCase().trim()),
                  )
                  .map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        triggerHaptic("light");
                        setEditCategory({
                          id: cat.id,
                          name: cat.name,
                          emoji: cat.emoji || "Tag",
                          budget_amount: cat.budget_amount,
                          type: cat.type,
                        });
                        setEditCategoryBudget(
                          cat.budget_amount ? String(cat.budget_amount) : "",
                        );
                        setViewMode("edit");
                      }}
                      className="flex items-center justify-between py-2.5 px-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] active:bg-black/[0.04] dark:active:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-[var(--glass-border)] bg-[var(--glass-fill)]"
                        >
                          <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-medium text-[13px] truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {cat.name}
                          </p>
                          <p className="text-[11px] mt-0.5 truncate">
                            {cat.budget_amount && cat.budget_amount > 0 ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                Limit {formatRupiah(cat.budget_amount)}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-tertiary)" }}>
                                No monthly limit
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 shrink-0 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                        <ChevronRight size={14} className="text-[var(--text-tertiary)] opacity-60" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* VIEW: EDIT */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {viewMode === "edit" && editCategory && (
            <div className="space-y-4 pt-1">
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-sm">
                {/* Row 1: Icon & Name */}
                <div className="p-3.5 space-y-1.5">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Icon & Name
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIconPickerTarget("edit");
                      }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:border-black/20 dark:hover:border-white/25"
                      title="Change Icon"
                    >
                      <IconRenderer icon={editCategory.emoji || "Tag"} size="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={editCategory.name}
                        onChange={(e) =>
                          setEditCategory((prev) =>
                            prev ? { ...prev, name: e.target.value } : null,
                          )
                        }
                        placeholder="Category Name"
                        className="w-full min-w-0 px-3.5 py-2.5 rounded-xl outline-none font-medium text-[13px] border border-[var(--glass-border)] bg-[var(--glass-fill)] focus:border-black/30 dark:focus:border-white/25 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Budget Limit (If Expense) */}
                {editCategory.type === "expense" && (
                  <div className="p-3.5 space-y-1.5">
                    <label
                      className="text-[10px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Monthly Budget Limit (Optional)
                    </label>
                    <input
                      type="text"
                      value={
                        editCategoryBudget
                          ? formatRupiah(
                              Number(editCategoryBudget.replace(/\D/g, "")),
                            )
                          : ""
                      }
                      onChange={(e) =>
                        setEditCategoryBudget(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="e.g. Rp 1.000.000 (leave blank for no limit)"
                      className="w-full min-w-0 px-3.5 py-2.5 rounded-xl outline-none font-medium text-[13px] border border-[var(--glass-border)] bg-[var(--glass-fill)] focus:border-black/30 dark:focus:border-white/25 transition-colors font-mono"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleUpdateCategory}
                  className="w-full h-11 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  style={{
                    background: "var(--text-primary)",
                    color: "var(--bg-base)",
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(editCategory.id, editCategory.name)}
                  className="w-full h-10 rounded-xl font-semibold text-[12px] active:scale-[0.98] transition-all cursor-pointer border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  <span>Delete Category</span>
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* VIEW: ADD */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {viewMode === "add" && (
            <div className="space-y-4 pt-1">
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)] overflow-hidden shadow-sm">
                {/* Row 1: Type Pill */}
                <div className="p-3.5 space-y-1.5">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Classification
                  </label>
                  <div className="flex p-1 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)]">
                    {(["expense", "income"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCatType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer text-center ${
                          catType === t
                            ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {t === "expense" ? "Expense" : "Income"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2: Icon & Name */}
                <div className="p-3.5 space-y-1.5">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Icon & Name
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIconPickerTarget("add");
                      }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:border-black/20 dark:hover:border-white/25"
                      title="Tap to change icon"
                    >
                      <IconRenderer icon={catIcon} size="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={catName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCatName(val);
                          if (!hasCustomPickedAddIcon) {
                            const suggested = autoSuggestIcon(val);
                            if (suggested) setCatIcon(suggested);
                          }
                        }}
                        placeholder="e.g. Coffee, Streaming, Groceries"
                        className="w-full min-w-0 px-3.5 py-2.5 rounded-xl outline-none font-medium text-[13px] border border-[var(--glass-border)] bg-[var(--glass-fill)] focus:border-black/30 dark:focus:border-white/25 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={!catName.trim()}
                className="w-full h-11 rounded-xl font-semibold text-[13px] active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center justify-center disabled:opacity-40"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                Create Category
              </button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Universal Monochrome Icon Picker Modal */}
      <MonochromeIconPickerModal
        isOpen={iconPickerTarget !== null}
        onClose={() => setIconPickerTarget(null)}
        selectedIcon={
          iconPickerTarget === "add" ? catIcon : editCategory?.emoji || "Tag"
        }
        onSelectIcon={(iconName) => {
          if (iconPickerTarget === "add") {
            setCatIcon(iconName);
            setHasCustomPickedAddIcon(true);
          } else if (iconPickerTarget === "edit") {
            setEditCategory((prev) =>
              prev ? { ...prev, emoji: iconName } : null,
            );
          }
        }}
        title={
          iconPickerTarget === "add"
            ? "Choose Category Icon"
            : "Edit Category Icon"
        }
      />
    </>
  );
}
