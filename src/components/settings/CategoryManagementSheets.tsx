import { useState } from "react";
import { Plus, Trash2, Search, X } from "lucide-react";
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

  const [manageCatTab, setManageCatTab] = useState<"expense" | "income">("expense");
  const [categorySearch, setCategorySearch] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);
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

  const handleSaveCategory = () => {
    if (!catName.trim()) return;
    const finalIcon = catIcon || autoSuggestIcon(catName) || "Tag";
    addCategory.mutate(
      { name: catName.trim(), emoji: finalIcon, type: catType },
      {
        onSuccess: () => {
          setAddCatOpen(false);
          setCatName("");
          setCatIcon("Tag");
          setHasCustomPickedAddIcon(false);
          showToast("Category added", "add", () => {});
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
          setEditCategory(null);
          showToast("Category updated", "update", () => {});
        },
      },
    );
  };

  return (
    <>
      {/* Manage Categories Sheet */}
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="font-extrabold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Categories
              </h3>
              <p
                className="text-[11px] font-semibold mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {categories.length} total categories · Tap card to edit
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => setAddCatOpen(true), 300);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 shrink-0 cursor-pointer"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Search size={15} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search category name..."
              className="bg-transparent text-[13px] font-semibold flex-1 outline-none"
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

          {/* Segmented Filter Tab: Expense vs Income */}
          <div
            className="flex p-1 rounded-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {(["expense", "income"] as const).map((t) => {
              const count = categories.filter((c) => c.type === t).length;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setManageCatTab(t)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all capitalize cursor-pointer"
                  style={{
                    background:
                      manageCatTab === t ? "var(--accent)" : "transparent",
                    color:
                      manageCatTab === t
                        ? "var(--accent-ink)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {t} ({count})
                </button>
              );
            })}
          </div>

          {/* Clean iOS-Style Grouped List */}
          <div className="space-y-2 pb-8 max-h-[55vh] overflow-y-auto no-scrollbar">
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
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[18px]"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-bold text-[14px] truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {cat.name}
                      </p>
                      <p
                        className="text-[11px] font-semibold mt-0.5 truncate"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {cat.budget_amount && cat.budget_amount > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            Limit {formatRupiah(cat.budget_amount)}
                          </span>
                        ) : (
                          <span>No monthly limit</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
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
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer"
                      style={{
                        background: "var(--glass-fill-strong)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Delete "${cat.name}"?`)) return;
                        deleteCategory.mutate(cat.id, {
                          onSuccess: () => {
                            showToast("Category deleted", "delete", () => {});
                          },
                          onError: (error: any) => {
                            showToast(
                              error?.message || "Failed to delete category",
                              "delete",
                              () => {},
                            );
                          },
                        });
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-full active:scale-90 transition-transform text-red-400 hover:text-red-500 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </BottomSheet>

      {/* Edit Category Sheet */}
      <BottomSheet
        isOpen={!!editCategory}
        onClose={() => setEditCategory(null)}
      >
        <div className="p-5 pb-16 space-y-4">
          <h3
            className="font-extrabold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Edit Category
          </h3>
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Category Icon & Name
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setIconPickerTarget("edit");
                }}
                className="w-13 h-13 rounded-2xl flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
                title="Tap to change icon"
              >
                <IconRenderer icon={editCategory?.emoji || "Tag"} size="w-6 h-6" />
                <span className="text-[8.5px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Change
                </span>
              </button>
              <input
                type="text"
                value={editCategory?.name || ""}
                onChange={(e) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                placeholder="Category Name"
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {editCategory?.type === "expense" && (
            <div>
              <label
                className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Monthly Budget Target (Optional)
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
                placeholder="e.g. Rp 1.000.000 (leave blank for no budget)"
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
              <p
                className="text-[10px] font-medium mt-1 px-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Used to track category envelope progress in Statistics.
              </p>
            </div>
          )}

          <button
            onClick={handleUpdateCategory}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Changes
          </button>
        </div>
      </BottomSheet>

      {/* Add Category Sheet */}
      <BottomSheet isOpen={addCatOpen} onClose={() => setAddCatOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <h3
            className="font-extrabold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Add Category
          </h3>
          <div
            className="flex p-1 rounded-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCatType(t)}
                className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                style={{
                  background: catType === t ? "var(--accent)" : "transparent",
                  color:
                    catType === t
                      ? "var(--accent-ink)"
                      : "var(--text-tertiary)",
                }}
              >
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Category Icon & Name
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setIconPickerTarget("add");
                }}
                className="w-13 h-13 rounded-2xl flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
                title="Tap to change icon"
              >
                <IconRenderer icon={catIcon} size="w-6 h-6" />
                <span className="text-[8.5px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Change
                </span>
              </button>
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
                placeholder="Category Name (e.g. Kopi, Liburan)"
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSaveCategory}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Category
          </button>
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
