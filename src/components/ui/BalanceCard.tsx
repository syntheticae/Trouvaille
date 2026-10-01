import { useState, useMemo, Fragment } from "react";
import { ChevronRight, ChevronDown, Wallet as WalletIcon } from "lucide-react";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useBills } from "../../hooks/useBills";
import { useWallets } from "../../hooks/useWallets";
import { triggerHaptic } from "../../lib/haptics";
import { formatRupiah } from "../../lib/utils";
import { BottomSheet } from "./BottomSheet";
import { IconRenderer } from "./IconRenderer";
import { CashAccountDetailSheet } from "../assets/CashAccountDetailSheet";
import { WalletManagementSheets } from "../settings/WalletManagementSheets";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useLanguage } from "../../contexts/LanguageContext";
import type { Wallet } from "../../lib/types";

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
  const { data: wallets = [] } = useWallets();
  const { theme } = useTheme();

  // Selected cash wallet for detail sheet (unified with Assets page)
  const [selectedCashWallet, setSelectedCashWallet] = useState<Wallet | null>(null);
  const [isWalletManagementOpen, setIsWalletManagementOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  const handleOpenWalletModal = (acc: any) => {
    triggerHaptic("light");
    const matched = wallets.find((w) => w.id === acc.id) || {
      id: acc.id,
      user_id: acc.user_id || "",
      name: acc.name,
      icon: acc.icon,
      created_at: acc.created_at || new Date().toISOString(),
      classification: acc.classification,
      balance: acc.balance,
    };
    setSelectedCashWallet(matched);
  };

  const unpaidBills = useMemo(() => bills.filter((b) => !b.is_paid), [bills]);
  const committedAmount = useMemo(
    () => unpaidBills.reduce((s, b) => s + Number(b.amount || 0), 0),
    [unpaidBills],
  );
  const safeToSpend = Math.max(0, liquidCapital - committedAmount);

  const isDark = theme !== "light";
  const dividerGradient = isDark
    ? "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.06) 20%, rgba(255, 255, 255, 0.06) 80%, transparent 100%)"
    : "linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.04) 20%, rgba(0, 0, 0, 0.04) 80%, transparent 100%)";
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
          <div className="flex flex-col">
            <div
              className="h-[1px] w-full shrink-0"
              style={{ background: dividerGradient }}
            />
            {sortedPositiveAccounts.map((acc, index) => {
              const isAnchor = index === 0;
              return (
                <Fragment key={acc.id || acc.name}>
                  {index > 0 && (
                    <div
                      className="h-[1px] w-full shrink-0"
                      style={{ background: dividerGradient }}
                    />
                  )}
                  <div
                    onClick={() => handleOpenWalletModal(acc)}
                    className="py-3.5 flex items-center justify-between group cursor-pointer active:opacity-70 transition-opacity"
                  >
                    {/* Left Column: Clean Unboxed Icon + Name with Chevron + Subtitle */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
                        <IconRenderer icon={acc.icon} size="w-5 h-5" />
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
                </Fragment>
              );
            })}
            <div
              className="h-[1px] w-full shrink-0"
              style={{ background: dividerGradient }}
            />
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
                <div className="flex flex-col px-1 pt-1">
                  <div
                    className="h-[1px] w-full shrink-0"
                    style={{ background: dividerGradient }}
                  />
                  {zeroAccounts.map((acc, zIdx) => (
                    <Fragment key={acc.id || acc.name}>
                      {zIdx > 0 && (
                        <div
                          className="h-[1px] w-full shrink-0"
                          style={{ background: dividerGradient }}
                        />
                      )}
                      <div
                        onClick={() => handleOpenWalletModal(acc)}
                        className="py-2.5 flex items-center justify-between text-xs cursor-pointer active:opacity-70 transition-opacity"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
                            <IconRenderer icon={acc.icon} size="w-4 h-4" />
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
                    </Fragment>
                  ))}
                  <div
                    className="h-[1px] w-full shrink-0"
                    style={{ background: dividerGradient }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Dedicated Cash Account Detail Sheet (Identical to Assets Page) */}
      <CashAccountDetailSheet
        isOpen={!!selectedCashWallet}
        onClose={() => setSelectedCashWallet(null)}
        wallet={selectedCashWallet}
        onEditWallet={(w) => {
          setEditingWallet(w);
          setIsWalletManagementOpen(true);
        }}
        zIndex={1002}
      />

      {/* Direct Wallet Management Sheet for Account Card Detail */}
      <WalletManagementSheets
        isOpen={isWalletManagementOpen}
        onClose={() => {
          setIsWalletManagementOpen(false);
          setEditingWallet(null);
        }}
        initialWalletToEdit={editingWallet}
        zIndex={1005}
      />
    </>
  );
}
