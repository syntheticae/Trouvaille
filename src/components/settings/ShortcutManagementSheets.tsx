import { useState } from "react";
import { Plus, Trash2, MoreHorizontal, Smartphone, ChevronRight } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { BackTapGuideModal } from "./BackTapGuideModal";
import { useShortcuts } from "../../hooks/useShortcuts";
import { useCategories } from "../../hooks/useCategories";
import { useWallets } from "../../hooks/useWallets";
import { formatRupiah } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";

interface ShortcutManagementSheetsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutManagementSheets({
  isOpen,
  onClose,
}: ShortcutManagementSheetsProps) {
  const { shortcuts, saveShortcut, deleteShortcut } = useShortcuts();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const { showToast } = useToast();

  const [addShortcutOpen, setAddShortcutOpen] = useState(false);
  const [shortcutTitle, setShortcutTitle] = useState("");
  const [shortcutAmount, setShortcutAmount] = useState("");
  const [shortcutCategoryId, setShortcutCategoryId] = useState("");
  const [shortcutWalletId, setShortcutWalletId] = useState("");
  const [shortcutType, setShortcutType] = useState<"expense" | "income">("expense");
  const [shortcutMoreCatOpen, setShortcutMoreCatOpen] = useState(false);
  const [shortcutMoreWalletOpen, setShortcutMoreWalletOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const handleSave = () => {
    if (
      !shortcutTitle ||
      !shortcutAmount ||
      !shortcutCategoryId ||
      !shortcutWalletId
    ) {
      showToast("Please fill all fields", "delete", () => {});
      return;
    }
    saveShortcut({
      id: Date.now().toString(),
      title: shortcutTitle,
      amount: Number(shortcutAmount),
      type: shortcutType,
      note: shortcutTitle.replace(/[🌀-🧿]/gu, "").trim(),
      category_id: shortcutCategoryId,
      wallet_id: shortcutWalletId,
    });
    setAddShortcutOpen(false);
    setShortcutTitle("");
    setShortcutAmount("");
    setShortcutCategoryId("");
    setShortcutWalletId("");
    showToast("Shortcut added", "add", () => {});
  };

  return (
    <>
      {/* Shortcuts List Sheet */}
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 pb-2">
            <div>
              <div className="flex justify-between items-center w-full">
                <h3
                  className="font-semibold text-lg"
                  style={{ color: "var(--text-primary)" }}
                >
                  Quick-Add Shortcuts
                </h3>
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(() => setAddShortcutOpen(true), 300);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 cursor-pointer"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Tap chips on transaction form for fast entry
              </p>
            </div>
          </div>
          {/* iOS Back Tap Automation Banner */}
          <div
            onClick={() => setGuideOpen(true)}
            className="p-3.5 rounded-2xl flex items-center justify-between border cursor-pointer active:scale-[0.99] transition-all"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Smartphone size={15} strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  iPhone Back Tap Automation
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Double-tap back of iPhone to log m-Banking
                </p>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
          </div>

          <div className="space-y-2">
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-2xl flex items-center justify-between"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div>
                  <p className="font-bold text-[13px]">{s.title}</p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatRupiah(s.amount)}
                  </p>
                </div>
                <button
                  onClick={() => deleteShortcut(s.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {shortcuts.length === 0 && (
              <p
                className="text-[12px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                No shortcuts yet. (Default ones apply if cleared)
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Add Shortcut Sheet */}
      <BottomSheet
        isOpen={addShortcutOpen}
        onClose={() => setAddShortcutOpen(false)}
      >
        <div className="p-5 pb-12 space-y-4">
          <h3
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Add Shortcut
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
                onClick={() => setShortcutType(t)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                style={{
                  background:
                    shortcutType === t ? "var(--accent)" : "transparent",
                  color:
                    shortcutType === t
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
              Shortcut Title
            </label>
            <input
              type="text"
              value={shortcutTitle}
              onChange={(e) => setShortcutTitle(e.target.value)}
              placeholder="e.g. Coffee"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[15px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Nominal Amount (IDR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={shortcutAmount ? formatRupiah(Number(shortcutAmount)) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setShortcutAmount(raw);
              }}
              placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5 px-1">
              <label
                className="text-[11px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Category
              </label>
              <button
                onClick={() => setShortcutMoreCatOpen(true)}
                className="text-[11px] font-semibold flex items-center gap-0.5 active:scale-95 cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                More <MoreHorizontal size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-1">
              {categories
                .filter((c) => c.type === shortcutType)
                .slice(0, 3)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setShortcutCategoryId(cat.id)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95 cursor-pointer"
                    style={{
                      background:
                        shortcutCategoryId === cat.id
                          ? "var(--glass-fill-strong)"
                          : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border:
                        shortcutCategoryId === cat.id
                          ? "1.5px solid var(--accent)"
                          : "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background:
                          shortcutCategoryId === cat.id
                            ? "transparent"
                            : "var(--glass-fill)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold truncate leading-tight">
                      {cat.name}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5 px-1">
              <label
                className="text-[11px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Account / Wallet
              </label>
              <button
                onClick={() => setShortcutMoreWalletOpen(true)}
                className="text-[11px] font-semibold flex items-center gap-0.5 active:scale-95 cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                More <MoreHorizontal size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-1">
              {wallets.slice(0, 3).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setShortcutWalletId(w.id)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95 cursor-pointer"
                  style={{
                    background:
                      shortcutWalletId === w.id
                        ? "var(--glass-fill-strong)"
                        : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border:
                      shortcutWalletId === w.id
                        ? "1.5px solid var(--accent)"
                        : "1px solid var(--glass-border)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background:
                        shortcutWalletId === w.id
                          ? "transparent"
                          : "var(--glass-fill)",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold truncate leading-tight">
                    {w.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95 shadow-lg mt-2 cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Shortcut
          </button>
        </div>
      </BottomSheet>

      {/* Shortcut More Categories Sheet */}
      <BottomSheet
        isOpen={shortcutMoreCatOpen}
        onClose={() => setShortcutMoreCatOpen(false)}
      >
        <div className="p-5 pb-12">
          <h3
            className="font-semibold text-lg mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Select Category
          </h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {categories
              .filter((c) => c.type === shortcutType)
              .map((cat) => {
                const isSelected = shortcutCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setShortcutCategoryId(cat.id);
                      setShortcutMoreCatOpen(false);
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform cursor-pointer"
                    style={{
                      background: isSelected
                        ? "var(--glass-fill-strong)"
                        : "transparent",
                      color: "var(--text-primary)",
                      border: isSelected
                        ? "1.5px solid var(--accent)"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: isSelected
                          ? "var(--dock-active-pill)"
                          : "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-center line-clamp-1">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </BottomSheet>

      {/* Shortcut More Wallets Sheet */}
      <BottomSheet
        isOpen={shortcutMoreWalletOpen}
        onClose={() => setShortcutMoreWalletOpen(false)}
      >
        <div className="p-5 pb-12">
          <h3
            className="font-semibold text-lg mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Select Account
          </h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {wallets.map((w) => {
              const isSelected = shortcutWalletId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    setShortcutWalletId(w.id);
                    setShortcutMoreWalletOpen(false);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform cursor-pointer"
                  style={{
                    background: isSelected
                      ? "var(--glass-fill-strong)"
                      : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected
                      ? "1.5px solid var(--accent)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: isSelected
                        ? "var(--dock-active-pill)"
                        : "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {w.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      <BackTapGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}
