import React, { useState, useMemo } from "react";
import {
  BookOpen,
  User,
  Briefcase,
  Store,
  Plane,
  Building2,
  Sparkles,
  Layers,
  Wallet,
  Landmark,
  TrendingUp,
  Coins,
  Plus,
  Check,
  Trash2,
  Edit3,
  AlertTriangle,
  ArrowRightLeft,
  Users,
  QrCode,
  Share2,
  Star,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { SharedLedgerDetailSheet } from "./SharedLedgerDetailSheet";
import { JoinLedgerContent } from "./JoinLedgerModal";
import { useSpace, type MoneySpace } from "../../contexts/SpaceContext";
import { useAllTransactions } from "../../hooks/useTransactions";
import type { Transaction } from "../../types";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface ManageLedgersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

const LEDGER_ICONS = [
  { name: "BookOpen", label: "General Book", labelId: "Buku Kas Umum", icon: BookOpen },
  { name: "Users", label: "Shared / Family", labelId: "Bersama / Keluarga", icon: Users },
  { name: "User", label: "Personal", labelId: "Pribadi", icon: User },
  { name: "Briefcase", label: "Business", labelId: "Bisnis / Kantor", icon: Briefcase },
  { name: "Store", label: "Merchant / Shop", labelId: "Toko / Usaha", icon: Store },
  { name: "Building2", label: "Corporate / Real Estate", labelId: "Properti / Korporasi", icon: Building2 },
  { name: "Plane", label: "Travel / Trip", labelId: "Perjalanan / Liburan", icon: Plane },
  { name: "Sparkles", label: "Lifestyle / Luxury", labelId: "Gaya Hidup", icon: Sparkles },
  { name: "Layers", label: "Consolidated", labelId: "Terkonsolidasi", icon: Layers },
  { name: "Wallet", label: "Savings", labelId: "Tabungan", icon: Wallet },
  { name: "Landmark", label: "Tax / Treasury", labelId: "Pajak / Kas Negara", icon: Landmark },
  { name: "TrendingUp", label: "Investments", labelId: "Investasi", icon: TrendingUp },
  { name: "Coins", label: "Crypto / Capital", labelId: "Kripto / Modal", icon: Coins },
];

const SPACE_CURRENCIES = ["IDR", "USD", "SGD", "EUR", "JPY", "MYR", "AUD"] as const;

export function ManageLedgersSheet({ isOpen, onClose, onOpenLogin }: ManageLedgersSheetProps) {
  const {
    activeSpaceId,
    spaces,
    defaultSpaceId,
    setActiveSpaceId,
    setDefaultLedger,
    addCustomSpace,
    updateCustomSpace,
    deleteCustomSpace,
  } = useSpace();

  const { data: transactions = [] } = useAllTransactions();
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();

  const [viewState, setViewState] = useState<"list" | "create" | "edit" | "delete_confirm" | "join">("list");
  const [selectedLedger, setSelectedLedger] = useState<MoneySpace | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("BookOpen");
  const [formCurrency, setFormCurrency] = useState("IDR");
  const [formIsShared, setFormIsShared] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [reassignToPersonal, setReassignToPersonal] = useState(true);

  // Collaboration sheets state
  const [sharedDetailOpen, setSharedDetailOpen] = useState(false);
  const [targetSharedLedger, setTargetSharedLedger] = useState<MoneySpace | null>(null);

  // Calculate transaction count per ledger
  const transactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    spaces.forEach((s) => {
      counts[s.id] = 0;
    });

    transactions.forEach((tx: Transaction) => {
      const targetId = tx.ledger_id || tx.space_id || "personal";
      if (counts[targetId] !== undefined) {
        counts[targetId] += 1;
      } else {
        counts["personal"] = (counts["personal"] || 0) + 1;
      }
    });

    return counts;
  }, [spaces, transactions]);

  const renderIcon = (iconName: string, size = 16) => {
    const matched = LEDGER_ICONS.find(
      (item) => item.name.toLowerCase() === (iconName || "").toLowerCase(),
    );
    const IconComp = matched ? matched.icon : BookOpen;
    return <IconComp size={size} strokeWidth={1.75} />;
  };

  const handleOpenCreate = () => {
    triggerHaptic("light");
    setFormName("");
    setFormDescription("");
    setFormIcon("Briefcase");
    setFormCurrency("IDR");
    setFormIsShared(false);
    setFormIsDefault(false);
    setViewState("create");
  };

  const handleOpenEdit = (ledger: MoneySpace, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    setSelectedLedger(ledger);
    setFormName(ledger.name);
    setFormDescription(ledger.description || "");
    setFormIcon(ledger.icon || "BookOpen");
    setFormCurrency(ledger.currency || "IDR");
    setFormIsShared(Boolean(ledger.is_shared));
    setFormIsDefault(ledger.id === defaultSpaceId);
    setViewState("edit");
  };

  const handleSetDefault = async (ledgerId: string, ledgerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("medium");
    await setDefaultLedger(ledgerId);
    showToast(
      isIndonesian
        ? `"${ledgerName}" dijadikan space utama bawaan.`
        : `"${ledgerName}" set as default space.`,
      "update",
      () => {},
    );
  };

  const handleOpenDelete = (ledger: MoneySpace, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("heavy");
    setSelectedLedger(ledger);
    setReassignToPersonal(true);
    setViewState("delete_confirm");
  };

  const handleSelectLedger = (id: string) => {
    const selected = spaces.find((s) => s.id === id);
    if (selected?.member_status === "pending") {
      triggerHaptic("heavy");
      showToast(
        isIndonesian
          ? `Space "${selected.name}" masih menunggu persetujuan dari pemilik.`
          : `Space "${selected.name}" is awaiting owner approval.`,
        "delete",
        () => {},
      );
      return;
    }

    triggerHaptic("medium");
    setActiveSpaceId(id);
    showToast(
      isIndonesian
        ? `Space aktif: ${selected?.name || "Space"}`
        : `Active space: ${selected?.name || "Space"}`,
      "update",
      () => {},
    );
    onClose();
  };

  const handleShareLedger = (ledger: MoneySpace, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    if (!ledger.is_shared) {
      updateCustomSpace(ledger.id, { is_shared: true });
      const updated = { ...ledger, is_shared: true };
      setTargetSharedLedger(updated);
    } else {
      setTargetSharedLedger(ledger);
    }
    setSharedDetailOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast(
        isIndonesian ? "Nama space wajib diisi" : "Space name is required",
        "delete",
        () => {},
      );
      return;
    }

    triggerHaptic("medium");
    const created = addCustomSpace({
      name: formName.trim(),
      description: formDescription.trim(),
      icon: formIcon,
      currency: formCurrency,
      is_shared: formIsShared,
    });

    if (formIsDefault) {
      await setDefaultLedger(created.id);
    }

    setActiveSpaceId(created.id);
    setViewState("list");
    showToast(
      isIndonesian
        ? `Space "${created.name}" berhasil dibuat`
        : `Space "${created.name}" created successfully`,
      "add",
      () => {},
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedger || !formName.trim()) return;

    triggerHaptic("medium");
    updateCustomSpace(selectedLedger.id, {
      name: formName.trim(),
      description: formDescription.trim(),
      icon: formIcon,
      currency: formCurrency,
      is_shared: formIsShared,
    });

    if (formIsDefault && selectedLedger.id !== defaultSpaceId) {
      await setDefaultLedger(selectedLedger.id);
    } else if (!formIsDefault && selectedLedger.id === defaultSpaceId) {
      await setDefaultLedger("personal");
    }

    setViewState("list");
    setSelectedLedger(null);
    showToast(
      isIndonesian ? "Space berhasil diperbarui" : "Space updated successfully",
      "update",
      () => {},
    );
  };

  const handleConfirmDelete = () => {
    if (!selectedLedger) return;

    triggerHaptic("medium");
    const deletedName = selectedLedger.name;
    const reassignTarget = reassignToPersonal ? "personal" : "";

    deleteCustomSpace(selectedLedger.id, reassignTarget);
    setViewState("list");
    setSelectedLedger(null);

    showToast(
      isIndonesian
        ? `Space "${deletedName}" dihapus`
        : `Space "${deletedName}" deleted`,
      "delete",
      () => {},
    );
  };

  const handleBackToList = () => {
    triggerHaptic("light");
    setViewState("list");
    setSelectedLedger(null);
  };

  return (
    <>
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        setViewState("list");
        onClose();
      }}
      title={
        viewState === "create"
          ? isIndonesian
            ? "Space Baru"
            : "Create New Space"
          : viewState === "edit"
            ? isIndonesian
              ? "Ubah Space"
              : "Edit Space"
            : viewState === "join"
              ? isIndonesian
                ? "Gabung Space Bersama"
                : "Join Shared Space"
              : viewState === "delete_confirm"
                ? isIndonesian
                  ? "Konfirmasi Hapus"
                  : "Delete Confirmation"
                : isIndonesian
                  ? "Kelola Space"
                  : "Manage Spaces"
      }
    >
      <div className="px-5 sm:px-6 space-y-5 pb-[calc(env(safe-area-inset-bottom,16px)+28px)] pt-1 select-none">
        {/* ============================================================ */}
        {/* VIEW 1: LIST VIEW */}
        {/* ============================================================ */}
        {viewState === "list" && (
          <div className="space-y-4">
            {/* Header Subtitle */}
            <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
              {isIndonesian
                ? "Isolasi pencatatan arus kas, akun, dan laporan keuangan ke dalam space mandiri."
                : "Isolate cashflows, accounts, and reports into independent financial spaces."}
            </p>

            {/* Ledgers List */}
            <div className="space-y-2.5">
              {spaces.map((ledger) => {
                const isActive = ledger.id === activeSpaceId;
                const isDefault = ledger.id === defaultSpaceId;
                const isConsolidated = ledger.id === "all";
                const txCount = isConsolidated
                  ? transactions.length
                  : transactionCounts[ledger.id] || 0;

                const displayLedgerName =
                  isConsolidated && ledger.name === "All Ledgers"
                    ? isIndonesian
                      ? "Semua Space"
                      : "All Spaces"
                    : ledger.id === "personal" && ledger.name === "Personal Space"
                      ? isIndonesian
                        ? "Space Pribadi"
                        : "Personal Space"
                      : ledger.name;

                const displayLedgerDesc =
                  isConsolidated &&
                  (!ledger.description ||
                    ledger.description === "Consolidated balance sheet across all financial ledgers")
                    ? isIndonesian
                      ? "Seluruh space aktif terkonsolidasi"
                      : "All active spaces consolidated"
                    : ledger.id === "personal" &&
                        (!ledger.description ||
                          ledger.description ===
                            "Daily personal cashflow, necessities, shopping & personal savings")
                      ? isIndonesian
                        ? "Arus kas harian pribadi, kebutuhan pokok, belanja & tabungan personal"
                        : "Daily personal cashflow, necessities, shopping & personal savings"
                      : ledger.description ||
                        (isIndonesian ? "Space finansial mandiri" : "Independent financial space");

                return (
                  <div
                    key={ledger.id}
                    onClick={() => handleSelectLedger(ledger.id)}
                    className={`p-3.5 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer transition-all select-none border ${
                      isActive
                        ? "bg-white/[0.06] dark:bg-white/[0.08] border-[var(--text-primary)]"
                        : "bg-[var(--glass-fill)] border-[var(--glass-border)] hover:opacity-90"
                    }`}
                    style={{
                      boxShadow: isActive
                        ? "inset 0 1px 0 rgba(255,255,255,0.1), var(--shadow-card)"
                        : "var(--shadow-card)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Squircle Vector Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isActive
                            ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] border-[var(--text-primary)]"
                            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--glass-border)]"
                        }`}
                      >
                        {renderIcon(ledger.icon, 16)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13.5px] font-semibold text-[var(--text-primary)] leading-tight">
                            {displayLedgerName}
                          </span>
                          {!isConsolidated && ledger.currency && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-semibold bg-white/[0.06] text-[var(--text-tertiary)] border border-[var(--glass-border)] shrink-0">
                              {ledger.currency}
                            </span>
                          )}
                          {isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-medium bg-white/[0.08] text-[var(--text-primary)] border border-[var(--glass-border)] inline-flex items-center gap-1 shrink-0">
                              <Star size={9} className="fill-current" />
                              <span>{isIndonesian ? "Bawaan" : "Default"}</span>
                            </span>
                          )}
                          {ledger.is_shared && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-white/[0.06] text-[var(--text-secondary)] border border-[var(--glass-border)] inline-flex items-center gap-1 shrink-0">
                              <Users size={9} strokeWidth={2} />
                              <span>{isIndonesian ? "Bersama" : "Shared"}</span>
                            </span>
                          )}
                          {ledger.member_status === "pending" && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-white/[0.08] text-[var(--text-secondary)] border border-[var(--glass-border)] inline-flex items-center gap-1 shrink-0">
                              <Clock size={9} strokeWidth={2} />
                              <span>{isIndonesian ? "Menunggu" : "Pending"}</span>
                            </span>
                          )}
                          {isConsolidated && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-medium bg-white/[0.06] text-[var(--text-tertiary)] border border-[var(--glass-border)] shrink-0">
                              {isIndonesian ? "Terkonsolidasi" : "Consolidated"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                          {displayLedgerDesc}
                        </p>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)] opacity-75 mt-0.5 inline-block">
                          {txCount} {isIndonesian ? "transaksi" : "transactions"}
                        </span>
                      </div>
                    </div>

                    {/* Actions / Active Status */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!isConsolidated && (
                        <>
                          {/* Toggle Default Ledger Button */}
                          <button
                            type="button"
                            onClick={(e) => handleSetDefault(ledger.id, displayLedgerName, e)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              isDefault
                                ? "text-[var(--text-primary)] bg-white/[0.08]"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]"
                            }`}
                            title={
                              isDefault
                                ? (isIndonesian ? "Space Bawaan Utama" : "Default Space")
                                : (isIndonesian ? "Jadikan Space Bawaan" : "Set as Default Space")
                            }
                          >
                            <Star size={14} className={isDefault ? "fill-current" : ""} strokeWidth={1.75} />
                          </button>

                          {/* Share Ledger Trigger */}
                          <button
                            type="button"
                            onClick={(e) => handleShareLedger(ledger, e)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              ledger.is_shared
                                ? "text-[var(--text-primary)] bg-white/[0.08]"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]"
                            }`}
                            title={isIndonesian ? "Bagikan Space" : "Share Space"}
                          >
                            <Share2 size={14} strokeWidth={1.75} />
                          </button>

                          {/* Edit Ledger Trigger */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(ledger, e)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                            title={isIndonesian ? "Ubah Space" : "Edit Space"}
                          >
                            <Edit3 size={14} strokeWidth={1.75} />
                          </button>

                          {/* Delete Ledger Trigger */}
                          {!isDefault && ledger.id !== "personal" && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenDelete(ledger, e)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                              title={isIndonesian ? "Hapus Space" : "Delete Space"}
                            >
                              <Trash2 size={14} strokeWidth={1.75} />
                            </button>
                          )}
                        </>
                      )}

                      {/* Active Indicator Radio/Check */}
                      <div
                        className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border transition-all ml-1.5 ${
                          isActive
                            ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-elevated)]"
                            : "border-[var(--glass-border)] bg-transparent opacity-40"
                        }`}
                      >
                        {isActive && <Check size={12} strokeWidth={2.5} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions: Create New & Join Shared Ledger */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 border border-dashed border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer font-medium text-[12.5px]"
              >
                <Plus size={14} strokeWidth={2} />
                <span>{isIndonesian ? "Space Baru" : "New Space"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setViewState("join");
                }}
                className="py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 border border-[var(--glass-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-white/[0.06] active:scale-[0.99] transition-all cursor-pointer font-semibold text-[12.5px] shadow-sm"
              >
                <QrCode size={14} strokeWidth={2} />
                <span>{isIndonesian ? "Gabung Space" : "Join Space"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2 & 3: CREATE / EDIT VIEW */}
        {/* ============================================================ */}
        {(viewState === "create" || viewState === "edit") && (
          <form
            onSubmit={viewState === "create" ? handleSaveCreate : handleSaveEdit}
            className="space-y-4.5 pt-1"
          >
            {/* Ledger Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
                {isIndonesian ? "Nama Space" : "Space Name"}
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={isIndonesian ? "Misal: Bisnis Kopi, Freelance, Tabungan" : "e.g. Business, Side Project, Travel"}
                className="w-full px-4 py-3 rounded-xl text-[13px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-all"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
                {isIndonesian ? "Deskripsi (Opsional)" : "Description (Optional)"}
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={isIndonesian ? "Tujuan atau keterangan space" : "Purpose or domain scope"}
                className="w-full px-4 py-3 rounded-xl text-[13px] bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-primary)] transition-all"
              />
            </div>

            {/* Icon Picker (Lucide Monochrome Squircles) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
                {isIndonesian ? "Ikon Representasi" : "Representation Icon"}
              </label>
              <div className="grid grid-cols-6 gap-2.5 pt-1.5">
                {LEDGER_ICONS.map((item) => {
                  const isSelected = formIcon.toLowerCase() === item.name.toLowerCase();
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setFormIcon(item.name);
                      }}
                      className={`h-11 rounded-xl flex items-center justify-center transition-all border ${
                        isSelected
                          ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] border-[var(--text-primary)] scale-105"
                          : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                      }`}
                      title={isIndonesian ? item.labelId : item.label}
                    >
                      <IconComponent size={16} strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Independent Space Currency Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-0.5">
                {isIndonesian ? "Mata Uang Dasar Space" : "Space Base Currency"}
              </label>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {SPACE_CURRENCIES.map((curr) => {
                  const isSelected = formCurrency === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setFormCurrency(curr);
                      }}
                      className={`py-2 rounded-xl text-[11px] font-mono font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] border-[var(--text-primary)]"
                          : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {curr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Ledger Toggle (Rule 3 layout) */}
            <div className="p-3.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                  <Star size={14} className={formIsDefault ? "fill-current" : ""} strokeWidth={1.75} />
                  <span>{isIndonesian ? "Space Bawaan Utama" : "Default Space"}</span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                  {isIndonesian
                    ? "Buka space ini secara otomatis saat aplikasi pertama kali dijalankan."
                    : "Automatically open this space whenever the app starts up."}
                </p>
              </div>
              <ToggleSwitch
                checked={formIsDefault}
                onChange={(val) => {
                  setFormIsDefault(val);
                }}
              />
            </div>

            {/* Shared Ledger Toggle (Rule 3 layout) */}
            <div className="p-3.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                  <Users size={14} strokeWidth={1.75} />
                  <span>{isIndonesian ? "Space Bersama" : "Shared Space"}</span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                  {isIndonesian
                    ? "Kelola keuangan bersama keluarga, pasangan, atau teman."
                    : "Manage finances collaboratively with family or friends."}
                </p>
              </div>
              <ToggleSwitch
                checked={formIsShared}
                onChange={(val) => {
                  setFormIsShared(val);
                  if (val && formIcon === "BookOpen") {
                    setFormIcon("Users");
                  }
                }}
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex-1 py-3 px-4 rounded-xl text-[13px] font-medium border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer"
              >
                {isIndonesian ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl text-[13px] font-semibold bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
              >
                {viewState === "create"
                  ? isIndonesian
                    ? "Buat Space"
                    : "Create Space"
                  : isIndonesian
                    ? "Simpan Perubahan"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: DELETE CONFIRMATION (Rule 7 Monochrome Luxury) */}
        {/* ============================================================ */}
        {viewState === "delete_confirm" && selectedLedger && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--glass-border)]">
                <AlertTriangle size={16} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {isIndonesian ? `Hapus "${selectedLedger.name}"?` : `Delete "${selectedLedger.name}"?`}
                </h4>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1 leading-relaxed">
                  {isIndonesian
                    ? "Space ini akan dihapus dari sistem. Pilih bagaimana transaksi yang sudah tercatat di dalamnya diperlakukan:"
                    : "This space will be removed. Choose how existing transactions recorded inside this space should be handled:"}
                </p>
              </div>
            </div>

            {/* Reassign Option */}
            <div
              onClick={() => setReassignToPersonal(!reassignToPersonal)}
              className="p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ArrowRightLeft size={15} strokeWidth={1.75} className="text-[var(--text-secondary)] shrink-0" />
                <div>
                  <span className="text-[12.5px] font-medium text-[var(--text-primary)] block">
                    {isIndonesian ? "Pindahkan ke Space Pribadi" : "Reassign to Personal Space"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block">
                    {isIndonesian
                      ? "Transaksi tidak dihapus, hanya dialihkan ke Space Pribadi."
                      : "Transactions will be preserved in your Personal Space."}
                  </span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  reassignToPersonal
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-elevated)]"
                    : "border-[var(--glass-border)] bg-transparent opacity-40"
                }`}
              >
                {reassignToPersonal && <Check size={11} strokeWidth={2.5} />}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex-1 py-3 px-4 rounded-xl text-[13px] font-medium border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer"
              >
                {isIndonesian ? "Batal" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-3 px-4 rounded-xl text-[13px] font-semibold bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
              >
                {isIndonesian ? "Hapus Sekarang" : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: JOIN SHARED LEDGER VIEW */}
        {/* ============================================================ */}
        {viewState === "join" && (
          <div className="space-y-4 pt-1">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              <span>{isIndonesian ? "Kembali ke Daftar Space" : "Back to Spaces List"}</span>
            </button>
            <JoinLedgerContent
              onSuccess={() => {
                setViewState("list");
              }}
              onCancel={handleBackToList}
              onOpenLogin={onOpenLogin}
              hideHeaderCapsule
            />
          </div>
        )}
      </div>
    </BottomSheet>

    {/* Shared Ledger Detail Sheet */}
    <SharedLedgerDetailSheet
      isOpen={sharedDetailOpen}
      ledger={targetSharedLedger}
      onClose={() => {
        setSharedDetailOpen(false);
        setTargetSharedLedger(null);
      }}
      onEditLedger={(l: MoneySpace) => {
        setSharedDetailOpen(false);
        setSelectedLedger(l);
        setFormName(l.name);
        setFormDescription(l.description || "");
        setFormIcon(l.icon || "BookOpen");
        setFormCurrency(l.currency || "IDR");
        setFormIsShared(Boolean(l.is_shared));
        setFormIsDefault(l.id === defaultSpaceId);
        setViewState("edit");
      }}
    />
    </>
  );
}
