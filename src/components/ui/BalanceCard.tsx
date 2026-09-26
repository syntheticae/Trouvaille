import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Wallet as WalletIcon } from "lucide-react";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useBills } from "../../hooks/useBills";
import { formatRupiah } from "../../lib/utils";
import { BottomSheet } from "./BottomSheet";
import { IconRenderer } from "./IconRenderer";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useLanguage } from "../../contexts/LanguageContext";

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

  const primaryAccount = sortedPositiveAccounts[0] || null;
  const secondaryAccounts = useMemo(
    () => sortedPositiveAccounts.slice(1),
    [sortedPositiveAccounts]
  );
  const secondaryTotal = useMemo(
    () => secondaryAccounts.reduce((sum, acc) => sum + acc.balance, 0),
    [secondaryAccounts]
  );
  const secondaryPct = useMemo(
    () => secondaryAccounts.reduce((sum, acc) => sum + acc.percent, 0),
    [secondaryAccounts]
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

      {/* Refined Executive Tiered Treasury Breakdown Bottom Sheet */}
      <BottomSheet isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="p-5 space-y-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+24px),32px)]">
          {/* Header */}
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3
                className="font-semibold text-lg leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Rincian Sumber Likuiditas" : "Liquidity Sources Breakdown"}
              </h3>
              <p
                className="text-[11px] font-medium mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {sortedPositiveAccounts.length}{" "}
                {isIndonesian ? "akun aktif · Posisi Kas Likuid" : "active accounts · Liquid Position"}
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
                className="amount text-[16px] font-semibold leading-tight mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {hideBalance ? "Rp ••••••••" : formatRupiah(totalLiquidCapital)}
              </p>
            </div>
          </div>

          {/* Continuous Liquidity Allocation Spectrum */}
          {items.length > 0 && (
            <div
              className="p-3.5 rounded-2xl space-y-2.5 transition-all shadow-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between text-[10.5px]">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Spektrum Alokasi Modal" : "Capital Allocation Spectrum"}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {isIndonesian ? "100% Tercakup" : "100% Accounted"}
                </span>
              </div>

              {/* Multi-tone segmented bar */}
              <div
                className="w-full h-2 rounded-full overflow-hidden flex gap-0.5 p-0.5"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.name}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                    style={{
                      width: `${Math.max(item.percent, 1)}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.name}: ${item.percent}%`}
                  />
                ))}
              </div>

              {/* Spectrum Legend Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5 text-[10px]">
                {items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="font-bold truncate max-w-[100px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.name}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      {item.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dominant Anchor Card (Core Treasury Reserve) */}
          {primaryAccount && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Aset Utama Likuiditas" : "Core Treasury Anchor"}
                </span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  ANCHOR
                </span>
              </div>

              <div
                className="p-4 rounded-[22px] relative overflow-hidden transition-all shadow-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                {/* Subtle ambient backlight */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none blur-2xl"
                  style={{
                    background: "radial-gradient(circle, var(--text-primary) 0%, transparent 70%)",
                    opacity: 0.05,
                  }}
                />

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <IconRenderer icon={primaryAccount.icon} size="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4
                        className="text-[15px] font-bold truncate leading-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {primaryAccount.name}
                      </h4>
                      <p
                        className="text-[11px] truncate mt-0.5 font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {isIndonesian
                          ? "Instrumen Likuid Utama · Settlement Instan"
                          : "Primary Liquid Vehicle · Instant Settlement"}
                      </p>
                    </div>
                  </div>

                  {/* Share Badge */}
                  <div className="text-right shrink-0">
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {primaryAccount.percent.toFixed(1)}%
                    </span>
                    <span
                      className="text-[9px] block font-medium"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "dari total" : "of total"}
                    </span>
                  </div>
                </div>

                {/* Balance & Status Row */}
                <div className="mt-3.5 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "Nilai Terlokasi" : "Allocated Value"}
                    </p>
                    <p
                      className="amount text-[19px] font-bold mt-0.5 leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance ? "Rp ••••••••" : formatRupiah(primaryAccount.balance)}
                    </p>
                  </div>

                  <div
                    className="px-2.5 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1.5"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "var(--text-primary)", opacity: 0.7 }}
                    />
                    <span>{isIndonesian ? "Vault Aktif" : "Active Vault"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Tier: Operational Flow (2-Column Luxury Pill Grid) */}
          {secondaryAccounts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Saluran Operasional" : "Operational Channels"} (
                  {secondaryAccounts.length}{" "}
                  {isIndonesian ? "Akun" : "Accounts"} ·{" "}
                  {hideBalance ? "Rp ••••••••" : formatRupiah(secondaryTotal)})
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {secondaryPct.toFixed(1)}% {isIndonesian ? "porsi" : "share"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {secondaryAccounts.map((acc) => (
                  <div
                    key={acc.name}
                    className="p-3 rounded-[18px] flex flex-col justify-between gap-2 shadow-sm transition-all"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <IconRenderer icon={acc.icon} size="w-3.5 h-3.5" />
                        </div>
                        <span
                          className="text-[12.5px] font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {acc.name}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                        style={{
                          background: "var(--glass-fill)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {acc.percent.toFixed(1)}%
                      </span>
                    </div>

                    <p
                      className="amount text-[12px] font-semibold pt-1 border-t border-[var(--glass-border)]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {hideBalance ? "Rp ••••••••" : formatRupiah(acc.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dormant / Inactive Accounts (Collapsible Section) */}
          {zeroAccounts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDormant(!showDormant)}
                className="w-full p-3 rounded-2xl flex items-center justify-between text-[11.5px] font-medium transition-all cursor-pointer text-left active:scale-[0.99]"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: "var(--text-tertiary)", opacity: 0.5 }}
                  />
                  <span
                    className="truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {zeroAccounts.length}{" "}
                    {isIndonesian
                      ? "Akun Dorman / Saldo Nol"
                      : "Dormant Accounts (Rp 0)"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Rp 0
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${showDormant ? "rotate-180" : ""}`}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
              </button>

              {showDormant && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  {zeroAccounts.map((acc) => (
                    <div
                      key={acc.name}
                      className="px-2.5 py-2 rounded-xl flex items-center justify-between gap-1.5"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--glass-fill)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <IconRenderer icon={acc.icon} size="w-3 h-3" />
                        </div>
                        <span
                          className="text-[11px] font-medium truncate"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {acc.name}
                        </span>
                      </div>
                      <span
                        className="amount text-[10px] font-medium shrink-0"
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
    </>
  );
}
