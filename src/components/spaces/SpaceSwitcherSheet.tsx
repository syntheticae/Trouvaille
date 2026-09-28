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
import { useLanguage } from "../../contexts/LanguageContext";

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
  const { isIndonesian } = useLanguage();

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
    showToast(
      isIndonesian
        ? `Beralih ke ${selected?.name || "Ledger"}`
        : `Switched to ${selected?.name || "Ledger"}`,
      "update",
      () => {},
    );
    onClose();
  };

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) {
      showToast(
        isIndonesian ? "Nama ledger wajib diisi" : "Ledger name is required",
        "delete",
        () => {},
      );
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
    showToast(
      isIndonesian
        ? `Ledger "${created.name}" berhasil dibuat`
        : `Ledger "${created.name}" created successfully`,
      "add",
      () => {},
    );
    onClose();
  };

  const handleDeleteSpace = (e: React.MouseEvent, space: MoneySpace) => {
    e.stopPropagation();
    triggerHaptic("light");
    deleteCustomSpace(space.id);
    showToast(
      isIndonesian ? `Ledger "${space.name}" dihapus` : `Ledger "${space.name}" deleted`,
      "delete",
      () => {},
    );
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isIndonesian ? "Daftar Ledger" : "Financial Ledgers"}
    >
      <div className="px-5 sm:px-6 space-y-4 pb-[calc(env(safe-area-inset-bottom,16px)+28px)] pt-1 select-none">
        {/* Header Subtitle */}
        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
          {isIndonesian
            ? "Kelola arus kas, pisahkan transaksi, dan pantau keuangan dalam ledger tersendiri."
            : "Manage cashflow, isolate transactions, and track finances across dedicated ledgers."}
        </p>

        {/* Domains List */}
        <div className="space-y-2">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            return (
              <div
                key={space.id}
                onClick={() => handleSelectSpace(space.id)}
                className={`p-3.5 rounded-[22px] flex items-center justify-between gap-3 cursor-pointer transition-all select-none active:scale-[0.99] border ${
                  isActive
                    ? "bg-[var(--glass-fill-strong)] border-[var(--text-primary)] shadow-md"
                    : "bg-[var(--glass-fill)] border-[var(--glass-border)] hover:opacity-90"
                }`}
                style={{
                  boxShadow: isActive
                    ? "inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 4px 16px rgba(0, 0, 0, 0.12)"
                    : undefined,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isActive
                        ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] border-[var(--text-primary)]"
                        : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)]"
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--glass-fill)] text-[var(--text-secondary)] border border-[var(--glass-border)]">
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
                      title={isIndonesian ? "Hapus Ledger" : "Delete Ledger"}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isActive
                        ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] border-[var(--text-primary)]"
                        : "border-[var(--glass-border)] bg-transparent"
                    }`}
                  >
                    {isActive && <Check size={12} strokeWidth={2.5} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Domain Expandable Section */}
        {!isAddingSpace ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsAddingSpace(true);
            }}
            className="w-full py-3 rounded-[22px] flex items-center justify-center gap-2 text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--glass-fill)] border border-dashed border-[var(--glass-border)] hover:text-[var(--text-primary)] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={1.75} />
            <span>{isIndonesian ? "Tambah Ledger Baru" : "Create New Custom Ledger"}</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateSpace}
            className="p-4 rounded-[22px] bg-[var(--glass-fill)] border border-[var(--glass-border)] space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {isIndonesian ? "Ledger Baru" : "New Custom Ledger"}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingSpace(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">
                {isIndonesian ? "Nama Ledger" : "Ledger Name"}
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
                placeholder={isIndonesian ? "cth. Usaha Sampingan, Dana Darurat, Tabungan Nikah" : "e.g. Side Venture, Emergency Fund, Wedding"}
                className="w-full px-3 py-2 rounded-xl text-[12px] font-medium bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none focus:border-black/30 dark:focus:border-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">
                  {isIndonesian ? "Pengidentifikasi Tag (#)" : "Tag Identifier (#)"}
                </label>
                <input
                  type="text"
                  value={newSpaceTag}
                  onChange={(e) => setNewSpaceTag(e.target.value)}
                  placeholder="#project"
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-mono font-medium bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none focus:border-black/30 dark:focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[var(--text-tertiary)] block mb-1">
                  {isIndonesian ? "Ikon" : "Icon"}
                </label>
                <select
                  value={newSpaceIcon}
                  onChange={(e) => setNewSpaceIcon(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-medium bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none cursor-pointer"
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
                className="flex-1 py-2 rounded-xl text-[11px] font-medium text-[var(--text-tertiary)] bg-[var(--glass-fill)] border border-[var(--glass-border)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                {isIndonesian ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                className="flex-[2] py-2 rounded-xl text-[11px] font-semibold active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                {isIndonesian ? "Simpan Ledger" : "Save Ledger"}
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
          className="w-full py-3 rounded-2xl text-[13px] font-semibold active:scale-98 transition-transform cursor-pointer"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-base)",
          }}
        >
          {isIndonesian ? "Selesai" : "Done"}
        </button>
      </div>
    </BottomSheet>
  );
}
