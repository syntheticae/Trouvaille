import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Wallet as WalletIcon, Check, Scale, Edit3, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useBills } from "../../hooks/useBills";
import { useUpdateWallet, getWalletIcon } from "../../hooks/useWallets";
import { useAddTransaction } from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import { useToast } from "../../contexts/ToastContext";
import { triggerHaptic } from "../../lib/haptics";
import { formatRupiah } from "../../lib/utils";
import { BottomSheet } from "./BottomSheet";
import { IconRenderer } from "./IconRenderer";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { format } from "date-fns";
import type { AccountClassification } from "../../lib/types";

function getWalletRoleDescription(
  name: string,
  classification?: string,
  isAnchor?: boolean,
  isIndonesian?: boolean
): string {
  const n = (name || "").toLowerCase();
  if (isAnchor) {
    return isIndonesian ? "Rekening Utama" : "Primary Account";
  }
  if (n.includes("cash") || n.includes("tunai") || n.includes("dompet fisik")) {
    return isIndonesian ? "Kas Tunai" : "Physical Cash";
  }
  if (classification === "investment") {
    return isIndonesian ? "Aset Investasi" : "Investment Asset";
  }
  if (classification === "credit" || classification === "loan") {
    return isIndonesian ? "Liabilitas Lancar" : "Current Liability";
  }
  if (
    n.includes("seabank") ||
    n.includes("jago") ||
    n.includes("blu") ||
    n.includes("krom") ||
    n.includes("superbank") ||
    n.includes("jenius")
  ) {
    return isIndonesian ? "Bank Digital" : "Digital Bank";
  }
  if (
    n.includes("gopay") ||
    n.includes("ovo") ||
    n.includes("dana") ||
    n.includes("shopee") ||
    n.includes("linkaja")
  ) {
    return isIndonesian ? "Dompet Digital" : "Digital Wallet";
  }
  if (
    n.includes("tapcash") ||
    n.includes("flazz") ||
    n.includes("brizzi") ||
    n.includes("emoney") ||
    n.includes("e-money")
  ) {
    return isIndonesian ? "Uang Elektronik" : "Electronic Card";
  }
  return isIndonesian ? "Rekening Bank" : "Bank Account";
}

const SEGMENT_COLORS_DARK = [
  "#FFFFFF",
  "#E4E4E7",
  "#D4D4D8",
  "#A1A1AA",
  "#8E8E93",
  "#71717A",
  "#52525B",
  "#3F3F46",
  "#27272A",
  "#1E1E22",
];
const SEGMENT_COLORS_LIGHT = [
  "#18181B",
  "#27272A",
  "#3F3F46",
  "#52525B",
  "#71717A",
  "#8E8E93",
  "#A1A1AA",
  "#D4D4D8",
  "#E4E4E7",
  "#F4F4F6",
];

interface BalanceCardProps {
  hideBalance?: boolean;
}

export function BalanceCard({ hideBalance = false }: BalanceCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [showDormant, setShowDormant] = useState(false);
  const { isIndonesian } = useLanguage();
  useCurrency();
  const {
    liquidAccounts,
    liquidCapital,
    allTxs,
  } = useWalletBalances();
  const { data: bills = [] } = useBills();
  const { theme } = useTheme();

  const updateWallet = useUpdateWallet();
  const addTx = useAddTransaction();
  const { data: categories = [] } = useCategories();
  const { showToast } = useToast();

  // Selected wallet for detail & quick action modal
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [activeWalletTab, setActiveWalletTab] = useState<"detail" | "adjust" | "edit">("detail");
  const [adjustTarget, setAdjustTarget] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [isSavingAdjust, setIsSavingAdjust] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClassification, setEditClassification] = useState<AccountClassification>("liquid");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenWalletModal = (acc: any) => {
    triggerHaptic("light");
    setSelectedWallet(acc);
    setActiveWalletTab("detail");
    setAdjustTarget(String(acc.balance || 0));
    setAdjustNote("");
    setEditName(acc.name);
    setEditClassification(acc.classification || "liquid");
  };

  const handleSaveCorrection = () => {
    if (!selectedWallet) return;
    const target = parseFloat(adjustTarget.replace(/[^\d.-]/g, ""));
    if (isNaN(target)) {
      showToast(isIndonesian ? "Masukkan nominal yang valid" : "Enter a valid amount", "delete");
      return;
    }
    const current = selectedWallet.balance || 0;
    const diff = target - current;
    if (Math.abs(diff) < 0.01) {
      showToast(isIndonesian ? "Saldo tidak berubah" : "Balance unchanged", "info");
      setSelectedWallet(null);
      return;
    }

    setIsSavingAdjust(true);
    triggerHaptic("medium");

    const isPositive = diff > 0;
    const noteToSave = adjustNote.trim()
      ? (isIndonesian
          ? `Penyesuaian (${isPositive ? "+" : "-"}) ${selectedWallet.name}: ${adjustNote.trim()}`
          : `Correction (${isPositive ? "+" : "-"}) ${selectedWallet.name}: ${adjustNote.trim()}`)
      : (isIndonesian
          ? `Penyesuaian (${isPositive ? "+" : "-"}) ${selectedWallet.name}`
          : `Correction (${isPositive ? "+" : "-"}) ${selectedWallet.name}`);

    const otherCat =
      categories.find((c) => c.name.toLowerCase() === "lainnya") ||
      categories[0];
    const catIdToSave = otherCat?.id || null;
    const txDate = format(new Date(), "yyyy-MM-dd");

    addTx.mutate(
      {
        type: isPositive ? "income" : "expense",
        amount: Math.abs(diff),
        wallet_id: selectedWallet.id || null,
        note: noteToSave,
        occurred_on: txDate,
        created_at: new Date().toISOString(),
        category_id: catIdToSave,
      },
      {
        onSuccess: () => {
          setIsSavingAdjust(false);
          setSelectedWallet(null);
          showToast(
            isIndonesian
              ? `Saldo disesuaikan ke ${formatRupiah(target)}`
              : `Balance corrected to ${formatRupiah(target)}`,
            "update"
          );
        },
        onError: (err: any) => {
          setIsSavingAdjust(false);
          showToast(
            err?.message ||
              (isIndonesian ? "Gagal menyesuaikan saldo" : "Failed to adjust balance"),
            "delete"
          );
        },
      }
    );
  };

  const handleSaveEdit = () => {
    if (!selectedWallet) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast(isIndonesian ? "Nama akun tidak boleh kosong" : "Account name cannot be empty", "delete");
      return;
    }

    setIsSavingEdit(true);
    triggerHaptic("medium");

    updateWallet.mutate(
      {
        id: selectedWallet.id,
        name: trimmed,
        icon: selectedWallet.icon || getWalletIcon(trimmed),
        classification: editClassification,
      },
      {
        onSuccess: () => {
          setIsSavingEdit(false);
          setSelectedWallet(null);
          showToast(
            isIndonesian ? "Pengaturan akun disimpan" : "Account settings saved",
            "update"
          );
        },
        onError: (err: any) => {
          setIsSavingEdit(false);
          showToast(
            err?.message ||
              (isIndonesian ? "Gagal menyimpan akun" : "Failed to save account"),
            "delete"
          );
        },
      }
    );
  };

  const unpaidBills = useMemo(() => bills.filter((b) => !b.is_paid), [bills]);
  const committedAmount = useMemo(
    () => unpaidBills.reduce((s, b) => s + Number(b.amount || 0), 0),
    [unpaidBills],
  );
  const safeToSpend = Math.max(0, liquidCapital - committedAmount);

  const isDark = theme !== "light";
  const SEGMENT_COLORS = isDark ? SEGMENT_COLORS_DARK : SEGMENT_COLORS_LIGHT;

  const posLiquidAccs = useMemo(
    () => liquidAccounts.filter((a) => a.balance > 0),
    [liquidAccounts],
  );

  const { items, accounts, totalLiquidCapital, isEmpty } = useMemo(() => {
    const effectiveTotal = liquidCapital > 0 ? liquidCapital : 1;

    if (allTxs.length === 0) {
      const emptyAccounts = liquidAccounts.map((acc) => ({
        ...acc,
        percent: 0,
        color: SEGMENT_COLORS[0],
      }));
      return {
        items: [],
        accounts: emptyAccounts,
        totalLiquidCapital: 0,
        isEmpty: true,
      };
    }

    // Largest Remainder Method for exact 100% chart segments
    const rawItems = posLiquidAccs.map((acc, idx) => {
      const raw = (acc.balance / effectiveTotal) * 100;
      const floored = Math.floor(raw);
      return {
        name: acc.name,
        icon: acc.icon,
        balance: acc.balance,
        percent: floored,
        remainder: raw - floored,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      };
    });

    const totalFloored = rawItems.reduce((acc, item) => acc + item.percent, 0);
    const rem = Math.max(0, 100 - totalFloored);

    const sortedIndices = rawItems
      .map((item, idx) => ({ idx, remainder: item.remainder }))
      .sort((a, b) => b.remainder - a.remainder);

    const bonusMap = new Map<number, number>();
    if (sortedIndices.length > 0) {
      for (let i = 0; i < rem; i++) {
        const targetIdx = sortedIndices[i % sortedIndices.length].idx;
        bonusMap.set(targetIdx, (bonusMap.get(targetIdx) || 0) + 1);
      }
    }

    const chartItems = rawItems
      .map((item, idx) => ({
        name: item.name,
        icon: item.icon,
        balance: item.balance,
        percent: item.percent + (bonusMap.get(idx) || 0),
        remainder: item.remainder,
        color: item.color,
      }))
      .sort((a, b) => b.percent - a.percent);

    // Formatted accounts with percentage
    const formattedAccounts = liquidAccounts.map((acc, idx) => {
      const pct = acc.balance > 0 ? (acc.balance / effectiveTotal) * 100 : 0;
      return {
        ...acc,
        percent: pct,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      };
    });

    return {
      items: chartItems,
      accounts: formattedAccounts,
      totalLiquidCapital: liquidCapital,
      isEmpty: false,
    };
  }, [liquidAccounts, posLiquidAccs, liquidCapital, allTxs, SEGMENT_COLORS]);

  const sortedPositiveAccounts = useMemo(() => {
    return [...accounts.filter((a) => a.balance > 0)].sort(
      (a, b) => b.balance - a.balance
    );
  }, [accounts]);

  const zeroAccounts = useMemo(
    () => accounts.filter((a) => a.balance <= 0),
    [accounts]
  );

  return (
    <>
      {/* Compact Main Portfolio Card */}
      <section className="p-4 rounded-[22px] glass-surface">
        {/* Header */}
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[12px] font-semibold tracking-wider">
            {isIndonesian ? "Sumber Likuiditas" : "Liquidity Sources"}
          </span>
          {!isEmpty && (
            <button
              onClick={() => setDetailOpen(true)}
              className="text-[11px] font-semibold flex items-center gap-0.5 active:scale-95 transition-transform"
              style={{ color: "var(--text-secondary)" }}
            >
              {isIndonesian ? "Semua Detail" : "All Details"} <ChevronRight size={13} />
            </button>
          )}
        </div>

        {isEmpty ? (
          <div
            className="py-5 text-center rounded-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              className="w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1.5"
              style={{
                background: "var(--glass-fill-strong)",
                color: "var(--text-tertiary)",
              }}
            >
              <WalletIcon size={14} />
            </div>
            <p
              className="text-[12px] font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              {isIndonesian ? "Belum Ada Aktivitas Akun" : "No Account Activity"}
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Catat transaksi untuk melihat alokasi likuiditas"
                : "Record a transaction to see liquidity allocation"}
            </p>
          </div>
        ) : (
          <>
            {/* Multi-segment Allocation Bar */}
            <div
              className="w-full h-2.5 rounded-full overflow-hidden flex gap-[2px] mb-2.5 p-[1px]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {items.map((item) => (
                <div
                  key={item.name}
                  className="h-full rounded-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: item.color,
                    minWidth: item.percent > 0 ? "3px" : "0",
                  }}
                />
              ))}
            </div>

            {/* Compact 1-Row Mini Chips Legend */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {items.slice(0, 5).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="amount text-[10px] font-semibold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.percent}%
                  </span>
                </div>
              ))}
              {items.length > 5 && (
                <button
                  onClick={() => setDetailOpen(true)}
                  className="shrink-0 px-2 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                  }}
                >
                  +{items.length - 5} more
                </button>
              )}
            </div>

            {/* Balance Safety Buffer (Priority 11) */}
            {committedAmount > 0 && (
              <div className="mt-3 pt-2 border-t border-[var(--glass-border)] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--text-primary)" }}
                  />
                  <span
                    className="truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Aman Dibelanjakan:" : "Safe to Spend:"}
                  </span>
                  <span
                    className="amount font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {hideBalance ? "Rp ••••••••" : formatRupiah(safeToSpend)}
                  </span>
                </div>
                <div
                  className="text-right shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <span>{isIndonesian ? "Komitmen: " : "Committed: "}</span>
                  <span className="amount font-bold text-[var(--text-secondary)]">
                    {hideBalance
                      ? "Rp ••••••••"
                      : formatRupiah(committedAmount)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Refined Executive Streamlined Liquidity Breakdown Bottom Sheet */}
      <BottomSheet isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="p-5 space-y-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+24px),32px)]">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3
                className="font-semibold text-lg leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Sumber Likuiditas" : "Liquidity Sources"}
              </h3>
              <p
                className="text-[11px] font-medium mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {sortedPositiveAccounts.length}{" "}
                {isIndonesian ? "akun aktif · Posisi Modal Likuid" : "active accounts · Liquid Capital Position"}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Total Kas Likuid" : "Total Liquid Capital"}
              </p>
              <p
                className="amount text-[18px] font-bold leading-tight mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {hideBalance ? "Rp ••••••••" : formatRupiah(totalLiquidCapital)}
              </p>
            </div>
          </div>

          {/* Trouvaille Telemetry Strip: Safe to Spend & Committed Buffer */}
          {committedAmount > 0 && (
            <div
              className="p-3 rounded-2xl flex items-center justify-between text-[11px] border shadow-sm"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--text-primary)" }}
                />
                <span className="truncate" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Aman Dibelanjakan:" : "Safe to Spend:"}
                </span>
                <span
                  className="amount font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hideBalance ? "Rp ••••••••" : formatRupiah(safeToSpend)}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Komitmen: " : "Committed: "}
                </span>
                <span
                  className="amount font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {hideBalance ? "Rp ••••••••" : formatRupiah(committedAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Continuous Micro Allocation Spectrum */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <div
                className="w-full h-1.5 rounded-full overflow-hidden flex gap-[2px] p-[1px] border"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.name}
                    className="h-full rounded-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${Math.max(item.percent, 1)}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.name}: ${item.percent}%`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] px-0.5" style={{ color: "var(--text-tertiary)" }}>
                <span>
                  {sortedPositiveAccounts.length}{" "}
                  {isIndonesian ? "akun likuid" : "liquid accounts"}
                </span>
                <span>{isIndonesian ? "100% Tercakup" : "100% Accounted"}</span>
              </div>
            </div>
          )}

          {/* Sleek Streamlined Holdings List (Reference Style) */}
          <div
            className="divide-y border-y"
            style={{ borderColor: "var(--glass-border)" }}
          >
            {sortedPositiveAccounts.map((acc, index) => {
              const isAnchor = index === 0;
              return (
                <div
                  key={acc.id || acc.name}
                  onClick={() => handleOpenWalletModal(acc)}
                  className="py-3.5 flex items-center justify-between group cursor-pointer active:opacity-70 transition-opacity"
                >
                  {/* Left Column: Squircle Icon + Name with Chevron + Subtitle */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border"
                      style={{
                        background: "var(--glass-fill)",
                        borderColor: "var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={acc.icon} size="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[14.5px] font-semibold tracking-tight truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {acc.name}
                        </span>
                        <ChevronRight
                          size={13}
                          className="text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform shrink-0"
                        />
                        {isAnchor && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0"
                            style={{
                              background: "var(--glass-fill)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {isIndonesian ? "Utama" : "Core"}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[11px] font-medium mt-0.5 truncate"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <span
                          className="font-semibold"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {acc.percent.toFixed(1)}%
                        </span>
                        {" · "}
                        {getWalletRoleDescription(
                          acc.name,
                          acc.classification,
                          isAnchor,
                          isIndonesian
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Tabular Balance + Sublabel */}
                  <div className="text-right shrink-0 pl-2">
                    <p
                      className="amount text-[15px] font-bold leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance ? "Rp ••••••••" : formatRupiah(acc.balance)}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 font-medium"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {acc.percent.toFixed(1)}% {isIndonesian ? "alokasi" : "share"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapsible Dormant / Zero-Balance Accounts */}
          {zeroAccounts.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setShowDormant(!showDormant);
                }}
                className="w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-[11.5px] font-medium border transition-all cursor-pointer active:scale-[0.99]"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--text-tertiary)", opacity: 0.5 }}
                  />
                  <span
                    className="truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {zeroAccounts.length}{" "}
                    {isIndonesian
                      ? "Akun Dorman (Rp 0)"
                      : "Dormant Accounts (Rp 0)"}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <span className="text-[11px] font-medium">
                    {zeroAccounts.slice(0, 3).map((a) => a.name).join(", ")}
                    {zeroAccounts.length > 3 ? "..." : ""}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      showDormant ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {showDormant && (
                <div
                  className="divide-y border-b px-1 pt-1"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {zeroAccounts.map((acc) => (
                    <div
                      key={acc.id || acc.name}
                      onClick={() => handleOpenWalletModal(acc)}
                      className="py-2.5 flex items-center justify-between text-xs cursor-pointer active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{
                            background: "var(--glass-fill)",
                            borderColor: "var(--glass-border)",
                          }}
                        >
                          <IconRenderer icon={acc.icon} size="w-3.5 h-3.5" />
                        </div>
                        <span
                          className="truncate font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {acc.name}
                        </span>
                        <ChevronRight
                          size={12}
                          className="text-[var(--text-tertiary)]"
                        />
                      </div>
                      <span
                        className="amount text-[11px] font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Rp 0
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Wallet Detail & Quick Management Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedWallet}
        onClose={() => setSelectedWallet(null)}
      >
        <div className="p-5 space-y-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+24px),32px)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  background: "var(--glass-fill)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <IconRenderer icon={selectedWallet?.icon} size="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3
                  className="font-bold text-base leading-tight truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedWallet?.name}
                </h3>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block mt-0.5"
                  style={{
                    background: "var(--glass-fill)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {selectedWallet?.classification === "investment"
                    ? (isIndonesian ? "Investasi" : "Investment")
                    : selectedWallet?.classification === "credit" || selectedWallet?.classification === "loan"
                    ? (isIndonesian ? "Liabilitas" : "Liability")
                    : (isIndonesian ? "Kas & Rekening Likuid" : "Liquid Cash & Bank")}
                </span>
              </div>
            </div>

            {/* Close / Action Tab Switcher */}
            <div
              className="flex items-center p-1 rounded-xl border text-[11px] font-semibold"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveWalletTab("detail");
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeWalletTab === "detail"
                    ? "bg-[var(--glass-fill-strong)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {isIndonesian ? "Info" : "Info"}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveWalletTab("adjust");
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeWalletTab === "adjust"
                    ? "bg-[var(--glass-fill-strong)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {isIndonesian ? "Saldo" : "Balance"}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveWalletTab("edit");
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeWalletTab === "edit"
                    ? "bg-[var(--glass-fill-strong)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {isIndonesian ? "Edit" : "Edit"}
              </button>
            </div>
          </div>

          {/* TAB 1: DETAIL / OVERVIEW */}
          {activeWalletTab === "detail" && (
            <div className="space-y-4 pt-1">
              {/* Balance Hero Card */}
              <div
                className="p-4 rounded-2xl border space-y-1 text-center"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Saldo Saat Ini" : "Current Balance"}
                </p>
                <p
                  className="amount text-[24px] font-bold leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hideBalance ? "Rp ••••••••" : formatRupiah(selectedWallet?.balance || 0)}
                </p>
              </div>

              {/* Inflow & Outflow Telemetry */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "var(--text-tertiary)" }}>
                    <ArrowDownLeft size={13} />
                    <span>{isIndonesian ? "Total Masuk" : "Total Inflow"}</span>
                  </div>
                  <p
                    className="amount text-[14px] font-bold mt-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {hideBalance ? "Rp ••••••••" : formatRupiah(selectedWallet?.inflow || 0)}
                  </p>
                </div>

                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "var(--text-tertiary)" }}>
                    <ArrowUpRight size={13} />
                    <span>{isIndonesian ? "Total Keluar" : "Total Outflow"}</span>
                  </div>
                  <p
                    className="amount text-[14px] font-bold mt-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {hideBalance ? "Rp ••••••••" : formatRupiah(selectedWallet?.outflow || 0)}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveWalletTab("adjust");
                  }}
                  className="py-3 px-3.5 rounded-xl font-semibold text-[13px] border flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Scale size={14} />
                  <span>{isIndonesian ? "Sesuaikan Saldo" : "Adjust Balance"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveWalletTab("edit");
                  }}
                  className="py-3 px-3.5 rounded-xl font-semibold text-[13px] border flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Edit3 size={14} />
                  <span>{isIndonesian ? "Ubah Akun" : "Edit Account"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ADJUST BALANCE */}
          {activeWalletTab === "adjust" && (
            <div className="space-y-3 pt-1">
              <div>
                <label
                  className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Saldo Target Terkini" : "Target Balance"}
                </label>
                <input
                  type="number"
                  step="any"
                  value={adjustTarget}
                  onChange={(e) => setAdjustTarget(e.target.value)}
                  placeholder="0"
                  className="w-full p-3.5 rounded-2xl outline-none font-bold text-[18px] amount"
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
                  {isIndonesian ? "Catatan Penyesuaian (Opsional)" : "Correction Note (Optional)"}
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder={isIndonesian ? "cth. Rekonsiliasi mutasi" : "e.g. Reconciliation"}
                  className="w-full p-3.5 rounded-2xl outline-none font-medium text-[13px]"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <button
                type="button"
                disabled={isSavingAdjust}
                onClick={handleSaveCorrection}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] active:scale-98 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                {isSavingAdjust
                  ? (isIndonesian ? "Menyimpan..." : "Saving...")
                  : (isIndonesian ? "Simpan Penyesuaian Saldo" : "Save Balance Adjustment")}
              </button>
            </div>
          )}

          {/* TAB 3: EDIT ACCOUNT */}
          {activeWalletTab === "edit" && (
            <div className="space-y-3 pt-1">
              <div>
                <label
                  className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Nama Akun" : "Account Name"}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={isIndonesian ? "Nama Akun" : "Account Name"}
                  className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
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
                  {isIndonesian ? "Klasifikasi Akun" : "Account Classification"}
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(
                    [
                      {
                        key: "liquid",
                        label: isIndonesian ? "Kas & Rekening Likuid" : "Liquid Cash & Bank",
                        desc: isIndonesian ? "Uang tunai, bank, dompet digital" : "Cash, bank checking, e-wallets",
                      },
                      {
                        key: "investment",
                        label: isIndonesian ? "Portofolio Investasi" : "Investment Portfolio",
                        desc: isIndonesian ? "Saham, reksa dana, kripto, emas" : "Stocks, mutual funds, crypto, gold",
                      },
                      {
                        key: "receivable",
                        label: isIndonesian ? "Piutang" : "Receivable",
                        desc: isIndonesian ? "Dana yang dipinjamkan ke pihak lain" : "Money lent out to others",
                      },
                      {
                        key: "credit",
                        label: isIndonesian ? "Kartu Kredit & PayLater" : "Credit Card & PayLater",
                        desc: isIndonesian ? "Kredit bergulir / limit terpakai" : "Revolving lines of credit",
                      },
                      {
                        key: "loan",
                        label: isIndonesian ? "Pinjaman & Utang" : "Loan & Liability",
                        desc: isIndonesian ? "Utang jangka panjang, cicilan" : "Term debt, installment loans",
                      },
                    ] as const
                  ).map((opt) => {
                    const isSelected = editClassification === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setEditClassification(opt.key);
                        }}
                        className={`p-2.5 rounded-xl text-left transition-all active:scale-98 cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? "bg-white/[0.08] border-white/30"
                            : "bg-[var(--glass-fill)] border-[var(--glass-border)]"
                        }`}
                      >
                        <div>
                          <p
                            className="text-[12px] font-semibold"
                            style={{
                              color: isSelected
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {opt.label}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {opt.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <Check size={14} className="text-[var(--text-primary)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] active:scale-98 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                {isSavingEdit
                  ? (isIndonesian ? "Menyimpan..." : "Saving...")
                  : (isIndonesian ? "Simpan Perubahan Akun" : "Save Account Changes")}
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
