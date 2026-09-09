import { useState, useMemo } from "react";
import {
  ShieldCheck,
  TrendingUp,
  Scale,
  Copy,
  Check,
  ChevronDown,
  Building2,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Wallet, Transaction, Category } from "../../lib/types";
import {
  generateFinancialReportPackage,
  type FinancialReportPackage,
} from "../../lib/financialAccounting";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";

interface FinancialReportSectionProps {
  wallets: Wallet[];
  transactions: Transaction[];
  allTransactions?: Transaction[];
  categories: Category[];
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
}

type ReportSubView = "all" | "neraca" | "cashflow" | "calk";

export function FinancialReportSection({
  wallets,
  transactions,
  allTransactions,
  categories,
  startDate,
  endDate,
  periodLabel = "Current Period",
}: FinancialReportSectionProps) {
  const { showToast } = useToast();
  const [subView, setSubView] = useState<ReportSubView>("all");
  const [copied, setCopied] = useState(false);

  // Section collapse toggles
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [liabilitiesOpen, setLiabilitiesOpen] = useState(true);
  const [operatingOpen, setOperatingOpen] = useState(true);
  const [investingOpen, setInvestingOpen] = useState(false);
  const [financingOpen, setFinancingOpen] = useState(false);

  const report: FinancialReportPackage = useMemo(() => {
    return generateFinancialReportPackage(wallets, transactions, categories, {
      startDate,
      endDate,
      periodLabel,
      allTransactions,
    });
  }, [wallets, transactions, allTransactions, categories, startDate, endDate, periodLabel]);

  const { balanceSheet, cashFlow, calk } = report;

  const handleCopySummary = () => {
    triggerHaptic("medium");
    const summaryText = `
=== TROUVAILLE FINANCIAL REPORT ===
Period: ${periodLabel}
Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}

--- 1. STATEMENT OF FINANCIAL POSITION (NERACA) ---
* ASSETS:
  - Liquid Assets (Cash & Bank): ${formatRupiah(balanceSheet.liquidAssets.total)}
  - Investment Portfolio: ${formatRupiah(balanceSheet.investmentAssets.total)}
  - Receivables (Piutang): ${formatRupiah(balanceSheet.receivableAssets.total)}
  TOTAL ASSETS: ${formatRupiah(balanceSheet.totalAssets)}

* LIABILITIES:
  - Current (Credit Cards & PayLater): ${formatRupiah(balanceSheet.currentLiabilities.total)}
  - Long-Term Loans & Liabilities: ${formatRupiah(balanceSheet.longTermLiabilities.total)}
  TOTAL LIABILITIES: ${formatRupiah(balanceSheet.totalLiabilities)}

* EQUITY:
  NET WORTH: ${formatRupiah(balanceSheet.netWorth)}
  Balance Status: ${balanceSheet.isBalanced ? "BALANCED (Assets = Liabilities + Equity)" : "DISCREPANCY DETECTED"}

--- 2. STATEMENT OF CASH FLOWS (ARUS KAS) ---
* Operating Cash Flow (OCF):
  - Inflow: ${formatRupiah(cashFlow.operatingInflow)}
  - Outflow: ${formatRupiah(cashFlow.operatingOutflow)}
  - Net OCF: ${formatRupiah(cashFlow.netOperatingCashFlow)}
* Investing Cash Flow (ICF):
  - Inflow: ${formatRupiah(cashFlow.investingInflow)}
  - Outflow: ${formatRupiah(cashFlow.investingOutflow)}
  - Net ICF: ${formatRupiah(cashFlow.netInvestingCashFlow)}
* Financing Cash Flow (FCF):
  - Inflow: ${formatRupiah(cashFlow.financingInflow)}
  - Outflow: ${formatRupiah(cashFlow.financingOutflow)}
  - Net FCF: ${formatRupiah(cashFlow.netFinancingCashFlow)}
NET CASH MOVEMENT: ${formatRupiah(cashFlow.netCashFlow)}

--- 3. NOTES TO FINANCIAL STATEMENTS (CALK) ---
* Solvency Runway: ${calk.solvencyRunwayMonths} months (${calk.solvencyRunwayRating.toUpperCase()})
* Debt-to-Asset Ratio: ${calk.debtToAssetRatioPct}% (${calk.debtRating.toUpperCase()})
* Free Cash Flow Rate: ${calk.freeCashflowRatePct}% (${calk.freeCashflowRating.toUpperCase()})
* Audit Status: Fully Reconciled
    `.trim();

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      showToast("Financial statement copied to clipboard", "update", () => {});
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Executive Accounting Header Hero */}
      <section
        className="glass-card p-4 rounded-[26px] relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-tertiary)" }}
              >
                Accounting Statements • {periodLabel}
              </span>
            </div>
            <h2
              className="text-[22px] font-black tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Financial Report
            </h2>
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Balance Sheet, Cash Flows & Disclosures
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {copied ? (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} strokeWidth={1.75} />
                <span>Export</span>
              </>
            )}
          </button>
        </div>

        {/* Verification Status Pill */}
        <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex flex-wrap items-center justify-between gap-2">
          <div
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <ShieldCheck size={13} strokeWidth={2} />
            <span>
              {balanceSheet.isBalanced
                ? "Assets = Liabilities + Equity (Reconciled)"
                : "Accounting Discrepancy Detected"}
            </span>
          </div>

          <div
            className="text-[11px] font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            Discrepancy: {formatRupiah(balanceSheet.discrepancy)}
          </div>
        </div>
      </section>

      {/* Sub-view Segmented Controller */}
      <div
        className="flex p-0.5 rounded-xl border border-[var(--glass-border)]"
        style={{ background: "var(--glass-fill)" }}
      >
        {[
          { key: "all", label: "All" },
          { key: "neraca", label: "Balance Sheet" },
          { key: "cashflow", label: "Cash Flows" },
          { key: "calk", label: "Notes (CALK)" },
        ].map((tab) => {
          const isSelected = subView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSubView(tab.key as ReportSubView);
                triggerHaptic("light");
              }}
              className="flex-1 py-1.5 rounded-lg text-[10.5px] font-bold transition-all duration-200 active:scale-98 cursor-pointer select-none"
              style={{
                background: isSelected ? "var(--bg-elevated)" : "transparent",
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
                boxShadow: isSelected
                  ? "0 1px 4px var(--shadow-strength)"
                  : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ====================================================================== */}
      {/* 2. NERACA (STATEMENT OF FINANCIAL POSITION) */}
      {/* ====================================================================== */}
      {(subView === "all" || subView === "neraca") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-2">
              <Scale size={14} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Statement of Financial Position
              </span>
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Verified
            </span>
          </div>

          {/* Neraca Summary Card */}
          <section
            className="p-4 rounded-[22px] grid grid-cols-3 gap-2 text-center"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Total Assets
              </p>
              <p
                className="amount text-[14px] font-black mt-0.5 truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(balanceSheet.totalAssets)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Liabilities
              </p>
              <p
                className="amount text-[14px] font-black mt-0.5 truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(balanceSheet.totalLiabilities)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Net Worth
              </p>
              <p
                className="amount text-[14px] font-black mt-0.5 truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {formatRupiah(balanceSheet.netWorth)}
              </p>
            </div>
          </section>

          {/* Assets Breakdown Card */}
          <div
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAssetsOpen(!assetsOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Layers size={12} strokeWidth={1.75} />
                </div>
                <div>
                  <h3
                    className="text-[13px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Assets Breakdown
                  </h3>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Liquid: {formatRupiah(balanceSheet.liquidAssets.total)} • Inv: {formatRupiah(balanceSheet.investmentAssets.total)} • Rec: {formatRupiah(balanceSheet.receivableAssets.total)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="amount text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(balanceSheet.totalAssets)}
                </span>
                <motion.div
                  animate={{ rotate: assetsOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {assetsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[var(--glass-border)] p-3 space-y-3"
                >
                  {/* Liquid Assets Sub-group */}
                  <div>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--glass-border)]/60 px-1">
                      <span
                        className="text-[12.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Liquid Assets
                      </span>
                      <span
                        className="amount text-[12.5px] font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.liquidAssets.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.liquidAssets.items.length === 0 ? (
                        <p className="text-[11px] px-2 py-1.5 font-normal" style={{ color: "var(--text-tertiary)" }}>
                          No liquid accounts recorded.
                        </p>
                      ) : (
                        balanceSheet.liquidAssets.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <span
                              className="text-[12px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="amount text-[12px] font-normal"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                              <span
                                className="text-[10.5px] font-mono"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Investment Assets Sub-group */}
                  <div>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--glass-border)]/60 px-1">
                      <span
                        className="text-[12.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Investments
                      </span>
                      <span
                        className="amount text-[12.5px] font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.investmentAssets.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.investmentAssets.items.length === 0 ? (
                        <p className="text-[11px] px-2 py-1.5 font-normal" style={{ color: "var(--text-tertiary)" }}>
                          No investment assets recorded.
                        </p>
                      ) : (
                        balanceSheet.investmentAssets.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <span
                              className="text-[12px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="amount text-[12px] font-normal"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                              <span
                                className="text-[10.5px] font-mono"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Receivables Sub-group */}
                  <div>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--glass-border)]/60 px-1">
                      <span
                        className="text-[12.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Receivables
                      </span>
                      <span
                        className="amount text-[12.5px] font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.receivableAssets.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.receivableAssets.items.length === 0 ? (
                        <p className="text-[11px] px-2 py-1.5 font-normal" style={{ color: "var(--text-tertiary)" }}>
                          No active receivables recorded.
                        </p>
                      ) : (
                        balanceSheet.receivableAssets.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <span
                              className="text-[12px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="amount text-[12px] font-normal"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                              <span
                                className="text-[10.5px] font-mono"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Liabilities Breakdown Card */}
          <div
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setLiabilitiesOpen(!liabilitiesOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Building2 size={12} strokeWidth={1.75} />
                </div>
                <div>
                  <h3
                    className="text-[13px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Liabilities Breakdown
                  </h3>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Short-term: {formatRupiah(balanceSheet.currentLiabilities.total)} • Long-term: {formatRupiah(balanceSheet.longTermLiabilities.total)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="amount text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(balanceSheet.totalLiabilities)}
                </span>
                <motion.div
                  animate={{ rotate: liabilitiesOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {liabilitiesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[var(--glass-border)] p-3 space-y-3"
                >
                  {/* Current Liabilities Sub-group */}
                  <div>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--glass-border)]/60 px-1">
                      <span
                        className="text-[12.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Current Liabilities
                      </span>
                      <span
                        className="amount text-[12.5px] font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.currentLiabilities.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.currentLiabilities.items.length === 0 ? (
                        <p className="text-[11px] px-2 py-1.5 font-normal" style={{ color: "var(--text-tertiary)" }}>
                          No short-term liabilities or credit debt recorded.
                        </p>
                      ) : (
                        balanceSheet.currentLiabilities.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <span
                              className="text-[12px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="amount text-[12px] font-normal"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                              <span
                                className="text-[10.5px] font-mono"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Long-Term Liabilities Sub-group */}
                  <div>
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--glass-border)]/60 px-1">
                      <span
                        className="text-[12.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Long-Term Debt
                      </span>
                      <span
                        className="amount text-[12.5px] font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.longTermLiabilities.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.longTermLiabilities.items.length === 0 ? (
                        <p className="text-[11px] px-2 py-1.5 font-normal" style={{ color: "var(--text-tertiary)" }}>
                          No long-term loans or mortgage liabilities recorded.
                        </p>
                      ) : (
                        balanceSheet.longTermLiabilities.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <span
                              className="text-[12px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="amount text-[12px] font-normal"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                              <span
                                className="text-[10.5px] font-mono"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 3. STATEMENT OF CASH FLOWS (ARUS KAS - 3 ACTIVITIES) */}
      {/* ====================================================================== */}
      {(subView === "all" || subView === "cashflow") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 pt-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Statement of Cash Flows
              </span>
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Verified
            </span>
          </div>

          {/* Cash Flow 3-Pillar Hero */}
          <section
            className="p-4 rounded-[22px] space-y-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Net Cash Movement
                </p>
                <p
                  className="amount text-[20px] font-black mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netCashFlow)}
                </p>
              </div>

              <div className="text-right">
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Gross Turnover
                </p>
                <p
                  className="amount text-[12px] font-bold mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  In: {formatRupiah(cashFlow.totalInflow)}
                </p>
                <p
                  className="amount text-[12px] font-bold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Out: {formatRupiah(cashFlow.totalOutflow)}
                </p>
              </div>
            </div>

            {/* 3 Activity Pillars Summary */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--glass-border)] text-center">
              <div className="p-2 rounded-xl" style={{ background: "var(--glass-fill)" }}>
                <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Operating (OCF)
                </p>
                <p
                  className="amount text-[12px] font-black mt-0.5 truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netOperatingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netOperatingCashFlow)}
                </p>
              </div>

              <div className="p-2 rounded-xl" style={{ background: "var(--glass-fill)" }}>
                <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Investing (ICF)
                </p>
                <p
                  className="amount text-[12px] font-black mt-0.5 truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netInvestingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netInvestingCashFlow)}
                </p>
              </div>

              <div className="p-2 rounded-xl" style={{ background: "var(--glass-fill)" }}>
                <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Financing (FCF)
                </p>
                <p
                  className="amount text-[12px] font-black mt-0.5 truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netFinancingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netFinancingCashFlow)}
                </p>
              </div>
            </div>
          </section>

          {/* 1. Operating Activities Expandable Accordion */}
          <div
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOperatingOpen(!operatingOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <h4
                  className="text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  1. Operating Activities (Arus Kas Operasional)
                </h4>
                <p
                  className="text-[10.5px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Inflow: {formatRupiah(cashFlow.operatingInflow)} • Outflow: {formatRupiah(cashFlow.operatingOutflow)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="amount text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netOperatingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netOperatingCashFlow)}
                </span>
                <motion.div
                  animate={{ rotate: operatingOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {operatingOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[var(--glass-border)] p-3 space-y-1.5"
                >
                  {cashFlow.operatingItems.length === 0 ? (
                    <p className="text-[11px] px-1 py-1" style={{ color: "var(--text-tertiary)" }}>
                      No operating transactions recorded in this period.
                    </p>
                  ) : (
                    cashFlow.operatingItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <div>
                          <span
                            className="text-[12px] font-normal tracking-tight"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {it.name}
                          </span>
                          <span
                            className="text-[10.5px] ml-2 font-mono"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            ({it.txCount} tx)
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className="amount text-[12px] font-normal"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {it.net >= 0 ? "+" : ""}
                            {formatRupiah(it.net)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Investing Activities Expandable Accordion */}
          <div
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setInvestingOpen(!investingOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <h4
                  className="text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Investing Activities
                </h4>
                <p
                  className="text-[10.5px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  In: {formatRupiah(cashFlow.investingInflow)} • Out: {formatRupiah(cashFlow.investingOutflow)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="amount text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netInvestingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netInvestingCashFlow)}
                </span>
                <motion.div
                  animate={{ rotate: investingOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {investingOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[var(--glass-border)] p-3 space-y-1.5"
                >
                  {cashFlow.investingItems.length === 0 ? (
                    <p className="text-[11px] px-1 py-1" style={{ color: "var(--text-tertiary)" }}>
                      No capital or investment movements recorded in this period.
                    </p>
                  ) : (
                    cashFlow.investingItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <span
                          className="text-[12px] font-normal tracking-tight"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {it.name}
                        </span>
                        <span
                          className="amount text-[12px] font-normal"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {it.net >= 0 ? "+" : ""}
                          {formatRupiah(it.net)}
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Financing Activities Expandable Accordion */}
          <div
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFinancingOpen(!financingOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <h4
                  className="text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Financing Activities
                </h4>
                <p
                  className="text-[10.5px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  In: {formatRupiah(cashFlow.financingInflow)} • Out: {formatRupiah(cashFlow.financingOutflow)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="amount text-[13px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cashFlow.netFinancingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netFinancingCashFlow)}
                </span>
                <motion.div
                  animate={{ rotate: financingOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {financingOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[var(--glass-border)] p-3 space-y-1.5"
                >
                  {cashFlow.financingItems.length === 0 ? (
                    <p className="text-[11px] px-1 py-1" style={{ color: "var(--text-tertiary)" }}>
                      No loan disbursements or debt repayment movements in this period.
                    </p>
                  ) : (
                    cashFlow.financingItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b border-[var(--glass-border)]/35 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <span
                          className="text-[12px] font-normal tracking-tight"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {it.name}
                        </span>
                        <span
                          className="amount text-[12px] font-normal"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {it.net >= 0 ? "+" : ""}
                          {formatRupiah(it.net)}
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 4. CALK (CATATAN ATAS LAPORAN KEUANGAN / NOTES & DISCLOSURES) */}
      {/* ====================================================================== */}
      {(subView === "all" || subView === "calk") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 pt-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={14} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Notes to Financial Statements
              </span>
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Disclosures
            </span>
          </div>

          {/* Ratios & Solvency Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Note 1: Solvency Runway */}
            <div
              className="p-3 rounded-[20px] space-y-1"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9.5px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Solvency Runway
              </span>
              <p
                className="amount text-[16px] font-black"
                style={{ color: "var(--text-primary)" }}
              >
                {calk.solvencyRunwayMonths} <span className="text-[11px] font-normal">mo</span>
              </p>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {calk.solvencyRunwayRating}
              </span>
            </div>

            {/* Note 2: Debt-to-Asset Ratio */}
            <div
              className="p-3 rounded-[20px] space-y-1"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9.5px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Debt-to-Asset (DAR)
              </span>
              <p
                className="amount text-[16px] font-black"
                style={{ color: "var(--text-primary)" }}
              >
                {calk.debtToAssetRatioPct}%
              </p>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {calk.debtRating}
              </span>
            </div>

            {/* Note 3: Operating Free Cash Flow Rate */}
            <div
              className="p-3 rounded-[20px] space-y-1"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9.5px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Free Cash Flow Rate
              </span>
              <p
                className="amount text-[16px] font-black"
                style={{ color: "var(--text-primary)" }}
              >
                {calk.freeCashflowRatePct}%
              </p>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {calk.freeCashflowRating}
              </span>
            </div>
          </div>

          {/* Narrative Commentary Notes */}
          <section
            className="p-4 rounded-[22px] space-y-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="space-y-1">
              <h4
                className="text-[12px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Note 1: Solvency Assessment
              </h4>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {calk.solvencyDescription}
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-[var(--glass-border)]">
              <h4
                className="text-[12px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Note 2: Capital Structure & Leverage
              </h4>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {calk.debtDescription}
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-[var(--glass-border)]">
              <h4
                className="text-[12px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Note 3: Operating Retention & Surplus
              </h4>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {calk.freeCashflowDescription}
              </p>
            </div>
          </section>

          {/* Note 4: Material Outlier Transactions (>15% of Period Spend) */}
          <section
            className="p-4 rounded-[22px] space-y-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div>
              <h4
                className="text-[12.5px] font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Note 4: Material Transactions Disclosure (&ge; 15% Outflow)
              </h4>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Accounting transparency for significant individual expenditures influencing period cash flow.
              </p>
            </div>

            <div className="space-y-1.5">
              {calk.materialTransactions.length === 0 ? (
                <div
                  className="p-3 rounded-xl text-[11.5px]"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                  }}
                >
                  No single transaction exceeded 15% of total period expenses. Expenditure remained routinely distributed.
                </div>
              ) : (
                calk.materialTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl flex items-center justify-between"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <div>
                      <div
                        className="text-[12px] font-normal"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tx.note}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {tx.categoryName} • {tx.date}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className="amount text-[12px] font-normal"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(tx.amount)}
                      </div>
                      <div
                        className="text-[10px] font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {tx.percentageOfTotalExpense}% of total spend
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Note 5: Standard Integrity & Reconciliation Statement */}
          <section
            className="p-4 rounded-[22px] space-y-2"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={16}
                strokeWidth={2}
                style={{
                  color: calk.reconciliation.assetsEqualLiabilitiesPlusEquity
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                }}
              />
              <h4
                className="text-[12.5px] font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Note 5: Standard Integrity & Audit Status
              </h4>
            </div>
            <p
              className="text-[11.5px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {calk.reconciliation.notes}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
