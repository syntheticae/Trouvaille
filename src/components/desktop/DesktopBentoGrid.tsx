import { useState, useMemo } from "react";
import {
  TrendingUp,
  ReceiptText,
  Search,
  ChevronRight,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useAllTransactions, useMonthSummary } from "../../hooks/useTransactions";
import { useTheme } from "../../contexts/ThemeContext";
import { DesktopWalletDeck } from "./DesktopWalletDeck";
import { DesktopRadarHealth } from "./DesktopRadarHealth";
import { DesktopAssetBar } from "./DesktopAssetBar";
import { triggerHaptic } from "../../lib/haptics";
import { format } from "date-fns";

interface DesktopBentoGridProps {
  onOpenAdd: () => void;
  onSelectTransaction?: (tx: any) => void;
}

export function DesktopBentoGrid({
  onOpenAdd,
  onSelectTransaction,
}: DesktopBentoGridProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const now = new Date();

  const { netWorth, liquidAssets, allAccounts, wallets } = useWalletBalances();

  const liabilities = useMemo(() => {
    let debt = 0;
    const map = new Map<string, string>();
    wallets.forEach((w) => {
      if (w.classification) {
        map.set(w.id, w.classification);
        map.set(w.name.toLowerCase(), w.classification);
      }
    });
    allAccounts.forEach((acc) => {
      const cls = map.get(acc.id) || map.get(acc.name.toLowerCase());
      if (cls === "loan" || cls === "credit" || acc.balance < 0) {
        debt += Math.abs(acc.balance);
      }
    });
    return debt;
  }, [allAccounts, wallets]);

  const { totalExpense, savingsRate } = useMonthSummary(
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const { data: allTransactions = [] } = useAllTransactions();

  // Search & Filter state for Desktop Ledger
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expense" | "income" | "transfer">("all");

  // Filtered transactions (last 12 for desktop overview stream)
  const filteredTxs = useMemo(() => {
    return allTransactions
      .filter((tx) => {
        if (filterType !== "all" && tx.type !== filterType) return false;
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (tx.categories?.name && tx.categories.name.toLowerCase().includes(q)) ||
          String(tx.amount).includes(q)
        );
      })
      .slice(0, 8);
  }, [allTransactions, filterType, searchTerm]);

  // Compute Runway (Months of liquid runway)
  const monthlyBurn = totalExpense > 0 ? totalExpense : 3000000;
  const runwayMonths = (liquidAssets / monthlyBurn).toFixed(1);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-8 py-6 space-y-6 select-none">
      {/* ══════════════════════════════════════════════════════════════════════
          ROW 1: HERO NET WORTH & LIQUIDITY RUNWAY (BENTO) + 3D WALLET DECK
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Left Bento: Hero Net Worth & Liquidity Horizon Card (Col 7) */}
        <div
          className="col-span-12 xl:col-span-7 rounded-[28px] p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(22, 22, 26, 0.85) 0%, rgba(12, 12, 14, 0.95) 100%)"
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(244, 244, 248, 0.95) 100%)",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.10)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark ? "var(--shadow-card)" : "0 16px 40px rgba(0,0,0,0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Subtle Ambient Mesh Glow */}
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none blur-[90px]"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
            }}
          />

          {/* Top Label Strip */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--glass-border)]"
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  color: "var(--text-secondary)",
                }}
              >
                Comprehensive Net Wealth
              </span>
              <span
                className="text-[11px] font-semibold text-[var(--text-tertiary)]"
              >
                Total Assets - Liabilities
              </span>
            </div>

            {/* Monthly Savings Rate Chip */}
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-bold"
              style={{
                background: isDark ? "#ffffff" : "#09090c",
                color: isDark ? "#09090c" : "#ffffff",
              }}
            >
              <TrendingUp size={13} strokeWidth={2.5} />
              <span>{savingsRate.toFixed(0)}% Savings Rate</span>
            </span>
          </div>

          {/* Main Hero Amount & Sparkline Curve */}
          <div className="my-6 z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span
                className="text-[12px] font-bold uppercase tracking-wider block mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Net Asset Value
              </span>
              <h2
                className="text-[44px] xl:text-[48px] font-black amount tracking-tight leading-none"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(netWorth)}
              </h2>
            </div>

            {/* Smooth SVG Trend Line (Inspired by Meridial Image 1 & 2) */}
            <div className="w-full md:w-56 h-16 relative flex items-end">
              <svg
                viewBox="0 0 200 60"
                fill="none"
                className="w-full h-full overflow-visible"
              >
                <path
                  d="M0,50 C40,48 70,30 100,32 C130,34 160,15 200,8"
                  stroke={isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)"}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle
                  cx="200"
                  cy="8"
                  r="4"
                  fill={isDark ? "#ffffff" : "#09090c"}
                />
              </svg>
            </div>
          </div>

          {/* Bottom Horizon & Solvency Strip */}
          <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/[0.08] z-10">
            {/* Liquid Runway */}
            <div
              className="p-3.5 rounded-2xl"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider block truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                Liquidity Runway
              </span>
              <p
                className="text-[16px] font-black amount mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {runwayMonths} Months
              </p>
              <span className="text-[10px] text-[var(--text-tertiary)] block">
                At current burn rate
              </span>
            </div>

            {/* Total Liquid Assets */}
            <div
              className="p-3.5 rounded-2xl"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider block truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                Liquid Cash & Bank
              </span>
              <p
                className="text-[16px] font-black amount mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(liquidAssets)}
              </p>
              <span className="text-[10px] text-[var(--text-tertiary)] block">
                Ready deployable
              </span>
            </div>

            {/* Total Liabilities */}
            <div
              className="p-3.5 rounded-2xl"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider block truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                Liabilities / Debt
              </span>
              <p
                className="text-[16px] font-black amount mt-0.5"
                style={{
                  color: liabilities > 0 ? "var(--text-primary)" : "var(--text-tertiary)",
                }}
              >
                {formatRupiah(liabilities)}
              </p>
              <span className="text-[10px] text-[var(--text-tertiary)] block">
                {liabilities === 0 ? "Debt Free" : "Total obligations"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Bento: 3D Interactive Luxury Wallet Vault Deck (Col 5) */}
        <div className="col-span-12 xl:col-span-5">
          <DesktopWalletDeck onOpenAddWallet={onOpenAdd} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ROW 2: ASSET ALLOCATION BAR & FINANCIAL HEALTH RADAR MATRIX
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Asset Allocation Bar (Col 6) */}
        <div className="col-span-12 xl:col-span-6">
          <DesktopAssetBar />
        </div>

        {/* Financial Health Radar Matrix (Col 6) */}
        <div className="col-span-12 xl:col-span-6">
          <DesktopRadarHealth />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ROW 3: EXPANDED REAL-TIME DESKTOP TRANSACTION STREAM
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-[28px] p-6 transition-all duration-300 select-none"
        style={{
          background: isDark ? "rgba(18, 18, 22, 0.65)" : "rgba(255, 255, 255, 0.72)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
          backdropFilter: "blur(24px)",
          boxShadow: isDark ? "var(--shadow-card)" : "0 12px 36px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header with Search & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                color: "var(--text-primary)",
              }}
            >
              <ReceiptText size={15} strokeWidth={1.75} />
            </div>
            <div>
              <h3
                className="text-[13px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Transaction Stream
              </h3>
              <span
                className="text-[10.5px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Live Multi-Account Ledger ({allTransactions.length} Total Records)
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div
              className="flex p-0.5 rounded-xl border border-[var(--glass-border)]"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              }}
            >
              {(["all", "expense", "income", "transfer"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setFilterType(t);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-all cursor-pointer"
                  style={{
                    background:
                      filterType === t
                        ? isDark
                          ? "#ffffff"
                          : "#09090c"
                        : "transparent",
                    color:
                      filterType === t
                        ? isDark
                          ? "#09090c"
                          : "#ffffff"
                        : "var(--text-tertiary)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Quick Ledger Search Box */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[var(--glass-border)] min-w-[180px]"
              style={{
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
              }}
            >
              <Search size={12} className="text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter transactions..."
                className="bg-transparent text-[11.5px] font-medium w-full outline-none placeholder:text-[var(--text-tertiary)]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>

        {/* Transactions Table / Stream */}
        <div className="divide-y divide-white/[0.05]">
          {filteredTxs.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-[var(--text-tertiary)]">
              No transactions matching your query
            </div>
          ) : (
            filteredTxs.map((tx) => {
              const isExpense = tx.type === "expense";
              const isIncome = tx.type === "income";

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    triggerHaptic("light");
                    if (onSelectTransaction) onSelectTransaction(tx);
                  }}
                  className="py-3 px-2 flex items-center justify-between rounded-xl transition-all hover:bg-white/[0.04] cursor-pointer group"
                >
                  {/* Left: Category Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
                      }}
                    >
                      {tx.categories?.emoji?.startsWith("/") ? (
                        <img
                          src={tx.categories.emoji}
                          alt={tx.categories.name}
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        <ReceiptText size={16} strokeWidth={1.5} style={{ color: "var(--text-primary)" }} />
                      )}
                    </div>
                    <div>
                      <span
                        className="text-[13px] font-bold block"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tx.note || tx.categories?.name || "Transaction"}
                      </span>
                      <span
                        className="text-[10.5px] font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {format(new Date(tx.occurred_on), "dd MMM yyyy")}
                        {tx.categories?.name ? ` · ${tx.categories.name}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount & Type Indicator */}
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span
                        className="text-[14px] font-black amount block tracking-tight leading-tight"
                        style={{
                          color: isIncome
                            ? "var(--text-primary)"
                            : "var(--text-primary)",
                        }}
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}
                        {formatRupiah(tx.amount)}
                      </span>
                      <span
                        className="text-[9.5px] uppercase font-bold tracking-wider opacity-60"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {tx.type}
                      </span>
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
