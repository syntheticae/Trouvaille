import React, { useState } from "react";
import {
  User,
  Briefcase,
  Plane,
  Layers,
  Plus,
  Check,
  Trash2,
  X,
  Compass,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useSpace, type MoneySpace } from "../../contexts/SpaceContext";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";

interface SpaceSwitcherSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpaceSwitcherSheet({ isOpen, onClose }: SpaceSwitcherSheetProps) {
  const {
    activeSpaceId,
    spaces,
    setActiveSpaceId,
    addCustomSpace,
    deleteCustomSpace,
  } = useSpace();
  const { showToast } = useToast();

  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceTag, setNewSpaceTag] = useState("");
  const [newSpaceIcon, setNewSpaceIcon] = useState("Compass");

  const getSpaceIcon = (iconName: string) => {
    const props = { size: 16, strokeWidth: 1.75 };
    switch (iconName.toLowerCase()) {
      case "user":
        return <User {...props} />;
      case "briefcase":
        return <Briefcase {...props} />;
      case "plane":
        return <Plane {...props} />;
      case "layers":
        return <Layers {...props} />;
      default:
        return <Compass {...props} />;
    }
  };

  const handleSelectSpace = (id: string) => {
    triggerHaptic("medium");
    setActiveSpaceId(id);
    const selected = spaces.find((s) => s.id === id);
    showToast(`Switched to ${selected?.name || "Space"}`, "update", () => {});
    onClose();
  };

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) {
      showToast("Space name is required", "delete", () => {});
      return;
    }

    triggerHaptic("medium");
    const created = addCustomSpace({
      name: newSpaceName,
      tag: newSpaceTag,
      icon: newSpaceIcon,
    });

    setActiveSpaceId(created.id);
    setIsAddingSpace(false);
    setNewSpaceName("");
    setNewSpaceTag("");
    showToast(`Created space "${created.name}"`, "add", () => {});
    onClose();
  };

  const handleDeleteSpace = (e: React.MouseEvent, space: MoneySpace) => {
    e.stopPropagation();
    triggerHaptic("light");
    deleteCustomSpace(space.id);
    showToast(`Removed space "${space.name}"`, "delete", () => {});
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Money Spaces">
      <div className="space-y-4 pb-6 pt-1">
        {/* Header Subtitle */}
        <p className="text-[12px] text-[var(--text-tertiary)] -mt-2">
          Organize cashflow, split budgets, and isolate expenses into dedicated spaces.
        </p>

        {/* Spaces List */}
        <div className="space-y-2">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            return (
              <div
                key={space.id}
                onClick={() => handleSelectSpace(space.id)}
                className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all select-none active:scale-[0.99] border ${
                  isActive
                    ? "bg-white/[0.06] border-white/20 shadow-sm"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isActive
                        ? "bg-white text-black border-white"
                        : "bg-white/[0.05] text-[var(--text-secondary)] border-white/10"
                    }`}
                  >
                    {getSpaceIcon(space.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                        {space.name}
                      </span>
                      {space.tag && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/[0.06] text-[var(--text-secondary)] border border-white/10">
                          {space.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {space.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!space.isDefault && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSpace(e, space)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-400 active:scale-90 transition-colors"
                      title="Delete Space"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-white text-black border-white"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {isActive && <Check size={12} strokeWidth={2.5} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Space Expandable Section */}
        {!isAddingSpace ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsAddingSpace(true);
            }}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-semibold text-[var(--text-secondary)] bg-white/[0.03] border border-dashed border-white/15 hover:bg-white/[0.06] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={1.75} />
            <span>Create New Custom Space</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateSpace}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                New Custom Money Space
              </span>
              <button
                type="button"
                onClick={() => setIsAddingSpace(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">
                Space Name
              </label>
              <input
                type="text"
                value={newSpaceName}
                onChange={(e) => {
                  setNewSpaceName(e.target.value);
                  if (!newSpaceTag) {
                    setNewSpaceTag(`#${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
                  }
                }}
                placeholder="e.g. Side Hustle, Wedding Fund"
                className="w-full px-3 py-2 rounded-xl text-[12px] font-medium bg-white/[0.04] border border-white/10 text-[var(--text-primary)] outline-none focus:border-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">
                  Tag Identifier
                </label>
                <input
                  type="text"
                  value={newSpaceTag}
                  onChange={(e) => setNewSpaceTag(e.target.value)}
                  placeholder="#sidehustle"
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-mono font-medium bg-white/[0.04] border border-white/10 text-[var(--text-primary)] outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">
                  Icon
                </label>
                <select
                  value={newSpaceIcon}
                  onChange={(e) => setNewSpaceIcon(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-medium bg-white/[0.04] border border-white/10 text-[var(--text-primary)] outline-none cursor-pointer"
                >
                  <option value="Compass">Compass</option>
                  <option value="Briefcase">Briefcase</option>
                  <option value="Plane">Plane</option>
                  <option value="User">User</option>
                  <option value="Layers">Layers</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingSpace(false)}
                className="flex-1 py-2 rounded-xl text-[11px] font-medium text-[var(--text-tertiary)] bg-white/[0.04] border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] py-2 rounded-xl text-[11px] font-semibold text-black bg-white active:scale-95 transition-transform"
              >
                Save Space
              </button>
            </div>
          </form>
        )}

        {/* Done Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="w-full py-3 rounded-xl text-[13px] font-semibold text-black bg-white active:scale-98 transition-transform cursor-pointer"
        >
          Done
        </button>
      </div>
    </BottomSheet>
  );
}
