import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";
import { jsPDF } from "jspdf";
import { Capacitor } from "@capacitor/core";
import type { Transaction, Wallet, Category } from "./types";
import { formatRupiah } from "./utils";

export type ReportDateRange =
  | "this_month"
  | "last_month"
  | "ytd"
  | "last_year"
  | "all"
  | "custom";

export type ReportTransactionType = "all" | "expense" | "income" | "transfer";

export interface ReportFilterOptions {
  dateRange: ReportDateRange;
  customStartDate?: Date;
  customEndDate?: Date;
  spaceId?: string; // "all", "personal", or specific spaceId / tag
  spaceName?: string;
  transactionType?: ReportTransactionType;
}

export interface CategorySummaryItem {
  name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface WalletSummaryItem {
  name: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface ReportSummary {
  periodLabel: string;
  spaceName: string;
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  netCashflow: number;
  savingsRate: number; // 0 to 100
  transactionCount: number;
  topCategories: CategorySummaryItem[];
  walletBreakdown: WalletSummaryItem[];
}

/**
 * Filter transactions based on date range, space, and transaction type
 */
export function filterTransactionsForReport(
  transactions: Transaction[],
  options: ReportFilterOptions,
  now = new Date(),
): Transaction[] {
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (options.dateRange) {
    case "this_month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "last_month": {
      const prev = subMonths(now, 1);
      startDate = startOfMonth(prev);
      endDate = endOfMonth(prev);
      break;
    }
    case "ytd":
      startDate = startOfYear(now);
      endDate = now;
      break;
    case "last_year": {
      const prevYear = subYears(now, 1);
      startDate = startOfYear(prevYear);
      endDate = endOfYear(prevYear);
      break;
    }
    case "custom":
      startDate = options.customStartDate || startOfMonth(now);
      endDate = options.customEndDate || endOfMonth(now);
      break;
    case "all":
    default:
      startDate = null;
      endDate = null;
      break;
  }

  const startStr = startDate ? format(startDate, "yyyy-MM-dd") : null;
  const endStr = endDate ? format(endDate, "yyyy-MM-dd") : null;

  return transactions.filter((tx) => {
    const txDate = tx.occurred_on || (tx.created_at ? tx.created_at.slice(0, 10) : "");
    if (!txDate) return false;

    // Date bounds
    if (startStr && txDate < startStr) return false;
    if (endStr && txDate > endStr) return false;

    // Space filtering
    if (options.spaceId && options.spaceId !== "all") {
      if (options.spaceId === "personal") {
        const note = (tx.note || "").toLowerCase();
        if (tx.space_id || note.includes("#business") || note.includes("#travel") || note.includes("#kantor") || note.includes("#liburan")) {
          return false;
        }
      } else {
        const target = options.spaceId.toLowerCase().replace(/^#/, "");
        const txSpace = (tx.space_id || "").toLowerCase();
        const note = (tx.note || "").toLowerCase();
        const matchesSpace =
          txSpace === target ||
          note.includes(`#${target}`) ||
          (target === "business" && (note.includes("#kantor") || note.includes("#reimburse"))) ||
          (target === "travel" && note.includes("#liburan"));
        if (!matchesSpace) return false;
      }
    }

    // Transaction type filtering
    if (options.transactionType && options.transactionType !== "all") {
      if (tx.type !== options.transactionType) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute executive summary statistics
 */
export function calculateReportSummary(
  filteredTxs: Transaction[],
  options: ReportFilterOptions,
  wallets: Wallet[] = [],
  now = new Date(),
): ReportSummary {
  let periodLabel = "All Time";
  switch (options.dateRange) {
    case "this_month":
      periodLabel = format(now, "MMMM yyyy");
      break;
    case "last_month":
      periodLabel = format(subMonths(now, 1), "MMMM yyyy");
      break;
    case "ytd":
      periodLabel = `Year to Date (${format(now, "yyyy")})`;
      break;
    case "last_year":
      periodLabel = `Fiscal Year ${format(subYears(now, 1), "yyyy")}`;
      break;
    case "custom":
      periodLabel = `${options.customStartDate ? format(options.customStartDate, "dd MMM yyyy") : "Start"} – ${options.customEndDate ? format(options.customEndDate, "dd MMM yyyy") : "End"}`;
      break;
    case "all":
      periodLabel = "Complete Ledger Archive";
      break;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;
  const categoryMap = new Map<string, { amount: number; count: number }>();
  const walletMap = new Map<string, { inflow: number; outflow: number }>();

  // Initialize wallet map
  wallets.forEach((w) => {
    walletMap.set(w.id, { inflow: 0, outflow: 0 });
  });

  filteredTxs.forEach((tx) => {
    const amt = tx.amount || 0;
    const catName = tx.categories?.name || (tx.type === "transfer" ? "Transfer" : "General");

    if (tx.type === "income") {
      totalIncome += amt;
      if (tx.wallet_id) {
        const cur = walletMap.get(tx.wallet_id) || { inflow: 0, outflow: 0 };
        cur.inflow += amt;
        walletMap.set(tx.wallet_id, cur);
      }
    } else if (tx.type === "expense") {
      totalExpense += amt;
      const curCat = categoryMap.get(catName) || { amount: 0, count: 0 };
      curCat.amount += amt;
      curCat.count += 1;
      categoryMap.set(catName, curCat);

      if (tx.wallet_id) {
        const cur = walletMap.get(tx.wallet_id) || { inflow: 0, outflow: 0 };
        cur.outflow += amt;
        walletMap.set(tx.wallet_id, cur);
      }
    } else if (tx.type === "transfer") {
      totalTransfer += amt;
      if (tx.wallet_id) {
        const cur = walletMap.get(tx.wallet_id) || { inflow: 0, outflow: 0 };
        cur.outflow += amt;
        walletMap.set(tx.wallet_id, cur);
      }
      if (tx.to_wallet_id) {
        const cur = walletMap.get(tx.to_wallet_id) || { inflow: 0, outflow: 0 };
        cur.inflow += amt;
        walletMap.set(tx.to_wallet_id, cur);
      }
    }
  });

  const netCashflow = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netCashflow / totalIncome) * 100))) : 0;

  // Top categories sorted by expense amount descending
  const topCategories: CategorySummaryItem[] = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Wallet breakdown
  const walletBreakdown: WalletSummaryItem[] = Array.from(walletMap.entries())
    .map(([wId, data]) => {
      const wName = wallets.find((w) => w.id === wId)?.name || wId;
      return {
        name: wName,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.inflow - data.outflow,
      };
    })
    .filter((w) => w.inflow > 0 || w.outflow > 0);

  const spaceName =
    !options.spaceId || options.spaceId === "all"
      ? "All Spaces (Consolidated)"
      : options.spaceId === "personal"
        ? "Personal Space"
        : options.spaceName || `#${options.spaceId}`;

  return {
    periodLabel,
    spaceName,
    totalIncome,
    totalExpense,
    totalTransfer,
    netCashflow,
    savingsRate,
    transactionCount: filteredTxs.length,
    topCategories,
    walletBreakdown,
  };
}

/**
 * Generate CSV formatted string with UTF-8 BOM
 */
/**
 * Generate CSV formatted string with UTF-8 BOM and Executive Metadata
 */
export function generateCsvContent(
  transactions: Transaction[],
  wallets: Wallet[] = [],
  summary?: ReportSummary,
): string {
  const metaLines: string[] = [];
  if (summary) {
    metaLines.push(
      `# Trouvaille Private Wealth Architecture — Financial Statement & Ledger`,
      `# Period: ${summary.periodLabel}`,
      `# Scope: ${summary.spaceName}`,
      `# Summary: Total Inflow = ${formatRupiah(summary.totalIncome)} | Total Outflow = ${formatRupiah(summary.totalExpense)} | Net Cashflow = ${(summary.netCashflow >= 0 ? "+" : "") + formatRupiah(summary.netCashflow)} | Records = ${summary.transactionCount}`,
      `# Generated: ${format(new Date(), "dd MMMM yyyy, HH:mm:ss")}`,
      `#`
    );
  }

  const headers = [
    "Date",
    "Time",
    "Type",
    "Category",
    "From Account",
    "To Account",
    "Amount (IDR)",
    "Space",
    "Tags",
    "Note",
    "Transaction ID",
  ];

  const walletMap = new Map<string, string>();
  wallets.forEach((w) => walletMap.set(w.id, w.name));

  const sortedTxs = [...transactions].sort((a, b) => {
    const da = a.occurred_on || a.created_at || "";
    const db = b.occurred_on || b.created_at || "";
    return db.localeCompare(da);
  });

  const rows = sortedTxs.map((t) => {
    const dateStr = t.occurred_on || (t.created_at ? t.created_at.slice(0, 10) : "");
    const timeStr = t.created_at ? format(new Date(t.created_at), "HH:mm") : "";
    const typeStr =
      t.type === "income" ? "Income" : t.type === "expense" ? "Expense" : "Transfer";
    const amountStr = String(t.amount || 0);
    const catStr = t.categories?.name || (t.type === "transfer" ? "Transfer" : "General");
    const fromAccount = t.wallet_id ? walletMap.get(t.wallet_id) || t.wallet_id : "";
    const toAccount = t.to_wallet_id ? walletMap.get(t.to_wallet_id) || t.to_wallet_id : "";
    const spaceStr = t.space_id || "personal";

    // Extract #hashtags
    const note = t.note || "";
    const tags = (note.match(/#[a-zA-Z0-9_-]+/g) || []).join(" ");
    const cleanNote = note.replace(/"/g, '""');

    return [
      dateStr,
      timeStr,
      typeStr,
      `"${catStr.replace(/"/g, '""')}"`,
      `"${fromAccount.replace(/"/g, '""')}"`,
      `"${toAccount.replace(/"/g, '""')}"`,
      amountStr,
      spaceStr,
      `"${tags}"`,
      `"${cleanNote}"`,
      t.id || "",
    ].join(",");
  });

  const allLines = metaLines.length > 0
    ? [...metaLines, headers.join(","), ...rows]
    : [headers.join(","), ...rows];

  // Include UTF-8 BOM (\uFEFF) for native Excel UTF-8 support
  return "\uFEFF" + allLines.join("\r\n");
}

/**
 * Generate Structured JSON Vault backup
 */
export function generateJsonVaultContent(
  transactions: Transaction[],
  wallets: Wallet[],
  categories: Category[],
  summary: ReportSummary,
): string {
  const vault = {
    trouvaille_vault_version: "2.0",
    generated_at: new Date().toISOString(),
    system: "Trouvaille Luxury Wealth Engine",
    scope: {
      period: summary.periodLabel,
      space: summary.spaceName,
    },
    metrics: {
      total_income: summary.totalIncome,
      total_expense: summary.totalExpense,
      total_transfer: summary.totalTransfer,
      net_cashflow: summary.netCashflow,
      savings_rate_pct: summary.savingsRate,
      transaction_count: summary.transactionCount,
    },
    accounts: wallets.map((w) => ({
      id: w.id,
      name: w.name,
      balance: w.balance || 0,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      budget_amount: c.budget_amount || 0,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      occurred_on: t.occurred_on,
      created_at: t.created_at,
      category_name: t.categories?.name || null,
      wallet_id: t.wallet_id,
      to_wallet_id: t.to_wallet_id,
      space_id: t.space_id || null,
      note: t.note || null,
    })),
  };

  return JSON.stringify(vault, null, 2);
}

/**
 * Generate Printable Luxury HTML Report
 */
export function generateLuxuryPrintableHtml(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
): string {
  const walletMap = new Map<string, string>();
  wallets.forEach((w) => walletMap.set(w.id, w.name));

  const sortedTxs = [...transactions].sort((a, b) => {
    const da = a.occurred_on || a.created_at || "";
    const db = b.occurred_on || b.created_at || "";
    return db.localeCompare(da);
  });

  const rowsHtml = sortedTxs
    .map((tx) => {
      const date = tx.occurred_on || (tx.created_at ? tx.created_at.slice(0, 10) : "");
      const isExpense = tx.type === "expense";
      const isIncome = tx.type === "income";
      const sign = isIncome ? "+" : isExpense ? "-" : "⇄";
      const amtColor = isIncome ? "#0d9488" : isExpense ? "#09090c" : "#71717a";
      const cat = tx.categories?.name || (tx.type === "transfer" ? "Transfer" : "General");
      const account = tx.wallet_id ? walletMap.get(tx.wallet_id) || "Account" : "-";
      const toAccount = tx.to_wallet_id ? walletMap.get(tx.to_wallet_id) || "Account" : "";
      const accountLabel = tx.type === "transfer" && toAccount ? `${account} → ${toAccount}` : account;
      const note = tx.note || "";

      return `
        <tr style="border-bottom: 1px solid #f0f0f4; font-size: 11px;">
          <td style="padding: 9px 8px; color: #71717a; white-space: nowrap;">${date}</td>
          <td style="padding: 9px 8px; font-weight: 500; color: #09090c;">
            <div>${note || cat}</div>
            ${note && note !== cat ? `<div style="font-size: 10px; color: #a1a1aa;">${cat}</div>` : ""}
          </td>
          <td style="padding: 9px 8px; color: #52525b; white-space: nowrap;">${accountLabel}</td>
          <td style="padding: 9px 8px; text-align: right; font-family: -apple-system, BlinkMacSystemFont, monospace; font-weight: 600; color: ${amtColor}; white-space: nowrap;">
            ${sign} ${formatRupiah(tx.amount || 0)}
          </td>
        </tr>
      `;
    })
    .join("");

  const topCatsHtml = summary.topCategories
    .slice(0, 5)
    .map((c) => {
      return `
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="font-weight: 500; color: #18181b;">${c.name}</span>
            <span style="font-family: -apple-system, BlinkMacSystemFont, monospace; color: #71717a;">${formatRupiah(c.amount)} (${c.percentage.toFixed(1)}%)</span>
          </div>
          <div style="width: 100%; height: 5px; background: #f0f0f4; border-radius: 99px; overflow: hidden;">
            <div style="width: ${c.percentage}%; height: 100%; background: #27272a; border-radius: 99px;"></div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trouvaille Statement - ${summary.periodLabel}</title>
  <style>
    @media print {
      @page { margin: 15mm; size: A4 portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #09090c;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #09090c; padding-bottom: 14px; margin-bottom: 24px;">
    <div>
      <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #09090c;">TROUVAILLE</div>
      <div style="font-size: 11px; font-weight: 500; letter-spacing: 0.05em; color: #71717a; text-transform: uppercase; margin-top: 2px;">Private Wealth Architecture · Executive Statement</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px; font-weight: 600; color: #09090c;">${summary.periodLabel}</div>
      <div style="font-size: 11px; color: #71717a; margin-top: 2px;">${summary.spaceName}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 1px;">Generated on ${format(new Date(), "dd MMMM yyyy, HH:mm")}</div>
    </div>
  </div>

  <!-- Key Executive Metrics -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px;">
    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">TOTAL INFLOW</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">+${formatRupiah(summary.totalIncome)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Income & credits</div>
    </div>

    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">TOTAL OUTFLOW</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">-${formatRupiah(summary.totalExpense)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Expenses & debits</div>
    </div>

    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">NET CASH FLOW</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">${(summary.netCashflow >= 0 ? "+" : "") + formatRupiah(summary.netCashflow)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Net capital movement</div>
    </div>

    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">SAVINGS RATE</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">${summary.savingsRate.toFixed(1)}%</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Preservation ratio</div>
    </div>
  </div>

  ${
    summary.topCategories.length > 0
      ? `
  <!-- Top Expense Categories Breakdown -->
  <div style="margin-bottom: 28px; background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 16px 20px;">
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #09090c; margin-bottom: 12px;">Top Spending Categories</div>
    ${topCatsHtml}
  </div>
  `
      : ""
  }

  <!-- Transactions Ledger Table -->
  <div style="margin-bottom: 30px;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #09090c;">Transactions Ledger</div>
      <div style="font-size: 11px; color: #71717a;">${summary.transactionCount} records</div>
    </div>
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
      <thead>
        <tr style="border-bottom: 1.5px solid #09090c; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">
          <th style="padding: 8px; width: 85px;">Date</th>
          <th style="padding: 8px;">Description / Category</th>
          <th style="padding: 8px; width: 140px;">Account</th>
          <th style="padding: 8px; text-align: right; width: 130px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="4" style="padding: 24px; text-align: center; color: #a1a1aa;">No transactions found in this period.</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- Confidentiality Statement / Footer -->
  <div style="border-top: 1px solid #e4e4e9; padding-top: 14px; display: flex; justify-content: space-between; font-size: 10px; color: #a1a1aa;">
    <div>Trouvaille · Private Wealth Architecture</div>
    <div>Confidential Document · Executive Wealth Summary</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}

/**
 * Triggers direct luxury report printing via dedicated window/tab
 */
export function triggerPrintLuxuryReport(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
): void {
  const html = generateLuxuryPrintableHtml(transactions, summary, wallets);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback if popups blocked: inject iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }
}

/**
 * Download a file in the browser
 */
export function downloadExportFile(
  content: string,
  filename: string,
  mimeType = "text/csv;charset=utf-8;",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share or download file with Web Share API fallback
 */
export async function shareOrDownloadFile(
  content: string,
  filename: string,
  mimeType = "text/csv",
  title = "Trouvaille Financial Report",
): Promise<boolean> {
  const blob = new Blob([content], { type: mimeType });

  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `Here is the financial report export from Trouvaille (${filename}).`,
        });
        return true;
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.warn("[reportExportService] Web Share failed, falling back to download:", e);
      } else {
        return false;
      }
    }
  }

  // Fallback to standard download
  downloadExportFile(content, filename, mimeType);
  return true;
}

/**
 * Generates an executive luxury PDF document with full typography, summary cards, and paginated ledger.
 */
export function generateLuxuryPdf(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 523.28 pt

  let y = 46;

  // Header: Brand & Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(18, 18, 20); // obsidian
  doc.text("TROUVAILLE", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text("PRIVATE WEALTH ARCHITECTURE · EXECUTIVE STATEMENT", margin, y + 13);

  // Period, Scope & Generation Date (right aligned)
  const now = new Date();
  const docRef = `REF: TVL-${format(now, "yyyyMMdd-HHmm")}`;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text(summary.periodLabel, pageWidth - margin, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`${summary.spaceName} · ${docRef}`, pageWidth - margin, y + 11, { align: "right" });
  doc.text(`Generated: ${format(now, "dd MMM yyyy, HH:mm:ss")}`, pageWidth - margin, y + 21, { align: "right" });

  y += 32;

  // Hairline divider
  doc.setDrawColor(228, 228, 233);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);

  y += 14;

  // Key Financial Metrics Grid (4 columns)
  const colGap = 8;
  const colW = (contentWidth - colGap * 3) / 4;
  const metrics = [
    { label: "TOTAL INFLOW", val: `+${formatRupiah(summary.totalIncome)}`, sub: "Income & credits" },
    { label: "TOTAL OUTFLOW", val: `-${formatRupiah(summary.totalExpense)}`, sub: "Expenses & debits" },
    {
      label: "NET CASHFLOW",
      val: `${summary.netCashflow >= 0 ? "+" : ""}${formatRupiah(summary.netCashflow)}`,
      sub: "Net movement",
    },
    { label: "SAVINGS RATE", val: `${summary.savingsRate.toFixed(1)}%`, sub: "Preservation" },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (colW + colGap);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(x, y, colW, 46, 5, 5, "F");
    doc.setDrawColor(235, 235, 239);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, colW, 46, 5, 5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(113, 113, 122);
    doc.text(m.label, x + 8, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text(m.val, x + 8, y + 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(161, 161, 170);
    doc.text(m.sub, x + 8, y + 39);
  });

  y += 58;

  // Top Categories (Proportional Progress Bars)
  if (summary.topCategories.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(18, 18, 20);
    doc.text("EXPENSE DISTRIBUTION (TOP 5)", margin, y);

    y += 12;

    summary.topCategories.slice(0, 5).forEach((cat) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(39, 39, 42);
      doc.text(cat.name, margin, y);

      const amtText = `${formatRupiah(cat.amount)}  (${cat.percentage.toFixed(1)}%)`;
      doc.setFont("helvetica", "normal");
      doc.text(amtText, pageWidth - margin, y, { align: "right" });

      // Track bar
      y += 4;
      doc.setFillColor(240, 240, 244);
      doc.roundedRect(margin, y, contentWidth, 3.5, 1.5, 1.5, "F");

      // Progress bar
      const fillW = Math.max(3, (contentWidth * Math.min(100, cat.percentage)) / 100);
      doc.setFillColor(39, 39, 42);
      doc.roundedRect(margin, y, fillW, 3.5, 1.5, 1.5, "F");

      y += 12;
    });

    y += 8;
  }

  // Section Header: Transaction Ledger
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(18, 18, 20);
  doc.text(`LEDGER TRANSACTIONS (${transactions.length})`, margin, y);

  y += 10;

  // Table Header Function
  const renderTableHeader = (currY: number) => {
    doc.setFillColor(244, 244, 246);
    doc.rect(margin, currY, contentWidth, 16, "F");
    doc.setDrawColor(228, 228, 233);
    doc.setLineWidth(0.5);
    doc.line(margin, currY + 16, pageWidth - margin, currY + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text("DATE", margin + 6, currY + 11);
    doc.text("DESCRIPTION / CATEGORY", margin + 70, currY + 11);
    doc.text("ACCOUNT", margin + 310, currY + 11);
    doc.text("AMOUNT", pageWidth - margin - 6, currY + 11, { align: "right" });
  };

  renderTableHeader(y);
  y += 17;

  // Sort transactions by date descending
  const sortedTxs = [...transactions].sort((a, b) => {
    const da = a.occurred_on || a.created_at || "";
    const db = b.occurred_on || b.created_at || "";
    return db.localeCompare(da);
  });

  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  sortedTxs.forEach((tx, idx) => {
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 40;
      renderTableHeader(y);
      y += 17;
    }

    // Alternating row background tint
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 1, contentWidth, 16, "F");
    }

    const txDate = tx.occurred_on || tx.created_at?.slice(0, 10) || "";
    const fromName = tx.wallet_id ? walletMap.get(tx.wallet_id) || "Account" : "-";
    const toName = tx.to_wallet_id ? walletMap.get(tx.to_wallet_id) || "Account" : "";
    const accountLabel = tx.type === "transfer" && toName ? `${fromName} -> ${toName}` : fromName;

    const catName = tx.categories?.name || (tx.type === "transfer" ? "Transfer" : "General");
    const noteText = tx.note ? `${tx.note} (${catName})` : catName;
    const desc = noteText.length > 50 ? noteText.slice(0, 48) + "..." : noteText;

    const isIncome = tx.type === "income";
    const isExpense = tx.type === "expense";
    const prefix = isIncome ? "+" : isExpense ? "-" : "⇄ ";
    const amtStr = `${prefix}${formatRupiah(Number(tx.amount || 0))}`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 71, 78);
    doc.text(txDate, margin + 6, y + 10);
    doc.text(desc, margin + 70, y + 10);
    doc.text(accountLabel.slice(0, 26), margin + 310, y + 10);

    doc.setFont("helvetica", "bold");
    if (isIncome) {
      doc.setTextColor(13, 148, 136); // teal-600 for inflow
    } else {
      doc.setTextColor(24, 24, 27); // obsidian for outflow/transfer
    }
    doc.text(amtStr, pageWidth - margin - 6, y + 10, { align: "right" });

    doc.setDrawColor(240, 240, 244);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 15, pageWidth - margin, y + 15);

    y += 16;
  });

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(228, 228, 233);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text("Trouvaille · Private Wealth Architecture · Confidential Document", margin, pageHeight - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 14, { align: "right" });
  }

  return doc;
}

/**
 * Direct luxury PDF download: immediately triggers file saving without opening print dialog
 */
export async function downloadLuxuryPdf(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
  filename = "trouvaille_statement.pdf",
): Promise<void> {
  const doc = generateLuxuryPdf(transactions, summary, wallets);
  const blob = doc.output("blob");

  // In native Capacitor iOS WKWebView, <a download> is ignored; Web Share API prompts native "Save to Files"
  if (Capacitor.isNativePlatform() && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Trouvaille Financial Statement",
          text: `Here is the financial statement export from Trouvaille (${filename}).`,
        });
        return;
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
  }

  // Web browser / Safari / PWA direct download
  doc.save(filename);
}

/**
 * Direct luxury PDF share with Web Share API fallback
 */
export async function shareLuxuryPdf(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
  filename = "trouvaille_statement.pdf",
): Promise<boolean> {
  const doc = generateLuxuryPdf(transactions, summary, wallets);
  const blob = doc.output("blob");

  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Trouvaille Financial Statement",
          text: `Here is the financial statement export from Trouvaille (${filename}).`,
        });
        return true;
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.warn("[reportExportService] Web Share failed, falling back to download:", e);
      } else {
        return false;
      }
    }
  }

  doc.save(filename);
  return true;
}

