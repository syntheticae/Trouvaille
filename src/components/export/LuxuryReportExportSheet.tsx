import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Download,
  Share2,
  Sparkles,
  Check,
  X,
  FileText,
  FileJson,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useAllTransactions } from "../../hooks/useTransactions";
import { useWallets } from "../../hooks/useWallets";
import { useCategories } from "../../hooks/useCategories";
import { useSpace } from "../../contexts/SpaceContext";
import { useToast } from "../../contexts/ToastContext";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { formatRupiah } from "../../lib/utils";
import { format } from "date-fns";
import {
  filterTransactionsForReport,
  calculateReportSummary,
  generateCsvContent,
  generateJsonVaultContent,
  triggerPrintLuxuryReport,
  downloadExportFile,
  shareOrDownloadFile,
  type ReportDateRange,
  type ReportTransactionType,
  type ReportFilterOptions,
} from "../../lib/reportExportService";

export interface LuxuryReportExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSpaceId?: string;
}

type ExportFormat = "pdf" | "csv" | "json";

export function LuxuryReportExportSheet({
  isOpen,
  onClose,
  defaultSpaceId,
}: LuxuryReportExportSheetProps) {
  const { data: allTxs = [] } = useAllTransactions();
  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const { spaces, activeSpaceId } = useSpace();
  const { showToast } = useToast();

  const [dateRange, setDateRange] = useState<ReportDateRange>("this_month");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(() => {
    return defaultSpaceId || (activeSpaceId !== "all" ? activeSpaceId : "all");
  });
  const [transactionType, setTransactionType] = useState<ReportTransactionType>("all");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [isExporting, setIsExporting] = useState(false);

  // Custom date picker state
  const [customStart, setCustomStart] = useState(() => format(new Date(), "yyyy-MM-01"));
  const [customEnd, setCustomEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const spaceName = useMemo(() => {
    const s = spaces.find((sp) => sp.id === selectedSpaceId);
    return s ? s.name : "All Spaces";
  }, [spaces, selectedSpaceId]);

  const filterOptions: ReportFilterOptions = useMemo(() => {
    return {
      dateRange,
      customStartDate: dateRange === "custom" ? new Date(customStart) : undefined,
      customEndDate: dateRange === "custom" ? new Date(customEnd) : undefined,
      spaceId: selectedSpaceId,
      spaceName,
      transactionType,
    };
  }, [dateRange, customStart, customEnd, selectedSpaceId, spaceName, transactionType]);

  const filteredTransactions = useMemo(() => {
    return filterTransactionsForReport(allTxs, filterOptions);
  }, [allTxs, filterOptions]);

  const summary = useMemo(() => {
    return calculateReportSummary(filteredTransactions, filterOptions, wallets);
  }, [filteredTransactions, filterOptions, wallets]);

  const handleExport = async (action: "download" | "share" | "print") => {
    triggerHaptic("medium");
    if (filteredTransactions.length === 0 && action !== "print") {
      showToast("No transactions found in selected period", "delete", () => {});
      return;
    }

    setIsExporting(true);
    const dateStr = format(new Date(), "yyyyMMdd");
    const spaceSlug = selectedSpaceId !== "all" ? `_${selectedSpaceId}` : "";

    try {
      if (action === "print" || exportFormat === "pdf") {
        triggerSuccessHaptic();
        triggerPrintLuxuryReport(filteredTransactions, summary, wallets);
        showToast("Executive statement ready for print/PDF", "update", () => {});
      } else if (exportFormat === "csv") {
        const csvContent = generateCsvContent(filteredTransactions, wallets);
        const filename = `trouvaille_ledger_${dateStr}${spaceSlug}.csv`;

        if (action === "share") {
          const ok = await shareOrDownloadFile(csvContent, filename, "text/csv", "Trouvaille Ledger CSV");
          if (ok) {
            triggerSuccessHaptic();
            showToast("CSV shared successfully", "update", () => {});
          }
        } else {
          downloadExportFile(csvContent, filename, "text/csv;charset=utf-8;");
          triggerSuccessHaptic();
          showToast("CSV ledger downloaded", "update", () => {});
        }
      } else if (exportFormat === "json") {
        const jsonContent = generateJsonVaultContent(filteredTransactions, wallets, categories, summary);
        const filename = `trouvaille_vault_${dateStr}${spaceSlug}.json`;

        if (action === "share") {
          const ok = await shareOrDownloadFile(jsonContent, filename, "application/json", "Trouvaille Vault JSON");
          if (ok) {
            triggerSuccessHaptic();
            showToast("JSON vault shared successfully", "update", () => {});
          }
        } else {
          downloadExportFile(jsonContent, filename, "application/json;charset=utf-8;");
          triggerSuccessHaptic();
          showToast("JSON vault archive downloaded", "update", () => {});
        }
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to export report", "delete", () => {});
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-9 space-y-5 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <FileSpreadsheet size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight">
                Report & Tax Export
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                Editorial statements, CSV ledger & JSON vault
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* 1. Date Range Selector Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-wide uppercase">
              Time Period
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
              {summary.periodLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 rounded-2xl bg-[var(--glass-fill)] border border-[var(--glass-border)]">
            {(
              [
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "ytd", label: "YTD" },
                { id: "all", label: "All Time" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((item) => {
              const active = dateRange === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setDateRange(item.id);
                  }}
                  className={`py-2 px-2 text-[12px] font-medium rounded-xl transition-all cursor-pointer text-center ${
                    active
                      ? "bg-[var(--glass-active-fill,rgba(255,255,255,0.12))] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-sm font-semibold"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Space Scope & Tax Deductible Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-wide uppercase">
              Space & Tax Scope
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Filter by context
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {spaces.map((sp) => {
              const active = selectedSpaceId === sp.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedSpaceId(sp.id);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-[12px] font-medium whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                    active
                      ? "bg-[var(--glass-active-fill,rgba(255,255,255,0.12))] border-[var(--glass-border)] text-[var(--text-primary)] font-semibold shadow-sm"
                      : "bg-[var(--glass-fill)] border-[var(--glass-border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {sp.tag ? `${sp.name} (${sp.tag})` : sp.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2.5 Transaction Type Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-wide uppercase">
              Transaction Filter
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {transactionType === "all"
                ? "All ledger types"
                : transactionType === "expense"
                  ? "Expenses only"
                  : transactionType === "income"
                    ? "Income only"
                    : "Business deductible"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all" as const, label: "All Types" },
              { id: "expense" as const, label: "Expenses" },
              { id: "income" as const, label: "Income" },
              { id: "business_tax" as const, label: "Tax / Business" },
            ].map((t) => {
              const active = transactionType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setTransactionType(t.id);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-[12px] font-medium whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                    active
                      ? "bg-[var(--glass-active-fill,rgba(255,255,255,0.12))] border-[var(--glass-border)] text-[var(--text-primary)] font-semibold shadow-sm"
                      : "bg-[var(--glass-fill)] border-[var(--glass-border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Live Executive Summary Card */}
        <div
          className="p-4 rounded-2xl space-y-3"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Statement Preview ({summary.transactionCount} entries)
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-tertiary)]">
              {summary.spaceName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--glass-border)]">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] block">Total Inflow</span>
              <span className="text-[14px] font-semibold text-[var(--text-primary)] amount mt-0.5 block">
                {formatRupiah(summary.totalIncome)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--glass-border)]">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] block">Total Outflow</span>
              <span className="text-[14px] font-semibold text-[var(--text-primary)] amount mt-0.5 block">
                {formatRupiah(summary.totalExpense)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--glass-border)]">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] block">Net Flow</span>
              <span
                className="text-[14px] font-semibold amount mt-0.5 block"
                style={{
                  color: summary.netCashflow >= 0 ? "var(--accent)" : "var(--text-primary)",
                }}
              >
                {formatRupiah(summary.netCashflow)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--glass-border)]">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] block">Tax Deductible</span>
              <span className="text-[14px] font-semibold text-[var(--text-primary)] amount mt-0.5 block">
                {formatRupiah(summary.taxDeductibleTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Format Selection Tabs */}
        <div className="space-y-2">
          <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-wide uppercase block">
            Export Format
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: "pdf" as const,
                title: "PDF Statement",
                desc: "Editorial layout",
                icon: FileText,
              },
              {
                id: "csv" as const,
                title: "CSV Ledger",
                desc: "Excel / Sheets",
                icon: FileSpreadsheet,
              },
              {
                id: "json" as const,
                title: "JSON Vault",
                desc: "Structured backup",
                icon: FileJson,
              },
            ].map((fmt) => {
              const active = exportFormat === fmt.id;
              const Icon = fmt.icon;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setExportFormat(fmt.id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] ${
                    active
                      ? "bg-[var(--glass-active-fill,rgba(255,255,255,0.12))] border-[var(--glass-border)] shadow-sm"
                      : "bg-[var(--glass-fill)] border-[var(--glass-border)] opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={16} strokeWidth={1.75} className="text-[var(--text-primary)]" />
                    {active && <Check size={14} strokeWidth={2} className="text-[var(--text-primary)]" />}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] mt-1">
                      {fmt.title}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                      {fmt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Bottom Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          {exportFormat === "pdf" ? (
            <button
              type="button"
              onClick={() => handleExport("print")}
              disabled={isExporting}
              className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-primary)",
              }}
            >
              <Printer size={16} strokeWidth={1.75} />
              <span>Print / Save PDF Statement</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleExport("download")}
                disabled={isExporting}
                className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-primary)",
                }}
              >
                <Download size={16} strokeWidth={1.75} />
                <span>Download {exportFormat.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport("share")}
                disabled={isExporting}
                aria-label="Share"
                className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer active:scale-95 shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
                title="Share via AirDrop, Email or Messaging"
              >
                <Share2 size={16} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
