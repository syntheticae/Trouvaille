import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";
import { jsPDF } from "jspdf";
import { Capacitor } from "@capacitor/core";
import type { Transaction, Wallet, Category } from "./types";
import { formatRupiah } from "./utils";
import { generateFinancialReportPackage } from "./financialAccounting";

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
 * Generate CSV formatted string with UTF-8 BOM (pure clean CSV without '#' lines)
 */
export function generateCsvContent(
  transactions: Transaction[],
  wallets: Wallet[] = [],
): string {
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

  // Include UTF-8 BOM (\uFEFF) for native Excel UTF-8 support
  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
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
 * Download a file in the browser (supports text or binary Blob)
 */
export function downloadExportFile(
  content: string | Blob,
  filename: string,
  mimeType = "text/csv;charset=utf-8;",
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
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
 * Share or download file with Web Share API fallback (supports text or binary Blob)
 */
export async function shareOrDownloadFile(
  content: string | Blob,
  filename: string,
  mimeType = "text/csv",
  title = "Trouvaille Financial Report",
): Promise<boolean> {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });

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
  downloadExportFile(blob, filename, mimeType);
  return true;
}

/**
 * Helper to turn off gridlines on all sheets in generated XLSX binary
 */
function patchGridlinesInUint8Array(buffer: Uint8Array): Uint8Array {
  const target = new TextEncoder().encode('<sheetView workbookViewId="0"/>');
  const replace = new TextEncoder().encode('<sheetView showGridLines="0" />');
  const n = buffer.length;
  const m = target.length;
  for (let i = 0; i <= n - m; i++) {
    let match = true;
    for (let j = 0; j < m; j++) {
      if (buffer[i + j] !== target[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      buffer.set(replace, i);
      i += m - 1;
    }
  }
  return buffer;
}

/**
 * Generates an executive Excel workbook (.xlsx) with clean typography, column widths,
 * 4 dedicated sheets (Buku Kas, Neraca, Arus Kas, CaLK), and gridlines turned off for monochrome luxury.
 */
export async function generateLuxuryExcelBlob(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
  categories: Category[] = [],
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const walletMap = new Map<string, string>();
  wallets.forEach((w) => walletMap.set(w.id, w.name));

  const reportPkg = generateFinancialReportPackage(wallets, transactions, categories, {
    periodLabel: summary.periodLabel,
  });
  const { balanceSheet, cashFlow, calk } = reportPkg;

  const sortedTxs = [...transactions].sort((a, b) => {
    const da = a.occurred_on || a.created_at || "";
    const db = b.occurred_on || b.created_at || "";
    return db.localeCompare(da);
  });

  // ==========================================
  // SHEET 1: Buku Kas (Financial Ledger)
  // ==========================================
  const aoaLedger: any[][] = [
    ["TROUVAILLE — BUKU KAS TRANSAKSI (FINANCIAL LEDGER)"],
    [`Periode: ${summary.periodLabel}   |   Ruang: ${summary.spaceName}   |   Dibuat: ${format(new Date(), "dd MMMM yyyy, HH:mm:ss")}`],
    [],
    [
      "Tanggal",
      "Waktu",
      "Jenis",
      "Kategori",
      "Dari Akun",
      "Ke Akun",
      "Nominal (IDR)",
      "Ruang",
      "Catatan / Deskripsi",
      "Tag",
      "ID Transaksi",
    ],
  ];

  sortedTxs.forEach((t) => {
    const dateStr = t.occurred_on || (t.created_at ? t.created_at.slice(0, 10) : "");
    const timeStr = t.created_at ? format(new Date(t.created_at), "HH:mm") : "";
    const typeStr =
      t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer";
    const catStr = t.categories?.name || (t.type === "transfer" ? "Transfer" : "General");
    const fromAccount = t.wallet_id ? walletMap.get(t.wallet_id) || t.wallet_id : "";
    const toAccount = t.to_wallet_id ? walletMap.get(t.to_wallet_id) || t.to_wallet_id : "";
    const spaceStr = t.space_id || "personal";
    const note = t.note || "";
    const tags = (note.match(/#[a-zA-Z0-9_-]+/g) || []).join(" ");

    aoaLedger.push([
      dateStr,
      timeStr,
      typeStr,
      catStr,
      fromAccount,
      toAccount,
      Number(t.amount || 0),
      spaceStr,
      note,
      tags,
      t.id || "",
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(aoaLedger);
  ws1["!cols"] = [
    { wch: 14 }, // Tanggal
    { wch: 10 }, // Waktu
    { wch: 14 }, // Jenis
    { wch: 22 }, // Kategori
    { wch: 20 }, // Dari Akun
    { wch: 20 }, // Ke Akun
    { wch: 18 }, // Nominal (IDR)
    { wch: 16 }, // Ruang
    { wch: 34 }, // Catatan
    { wch: 18 }, // Tag
    { wch: 36 }, // ID
  ];
  ws1["!autofilter"] = { ref: `A4:K${aoaLedger.length}` };

  // Apply number format to Amount column
  for (let r = 5; r <= aoaLedger.length; r++) {
    const cell = ws1[`G${r}`];
    if (cell && typeof cell.v === "number") {
      cell.z = "#,##0";
    }
  }
  XLSX.utils.book_append_sheet(wb, ws1, "Buku Kas");

  // ==========================================
  // SHEET 2: Neraca (Balance Sheet)
  // ==========================================
  const aoaNeraca: any[][] = [
    ["TROUVAILLE — LAPORAN POSISI KEUANGAN (NERACA / BALANCE SHEET)"],
    [`Posisi Keuangan per: ${summary.periodLabel}   |   Ruang: ${summary.spaceName}`],
    [],
    ["1. ASET (ASSETS)", "Nominal (IDR)", "Porsi dari Total Aset (%)"],
    ["ASET LANCAR (LIQUID ASSETS)", balanceSheet.liquidAssets.total, "Subtotal"],
  ];

  balanceSheet.liquidAssets.items.forEach((item) => {
    aoaNeraca.push([`   • ${item.name}`, item.balance, `${item.percentageOfTotal}%`]);
  });

  aoaNeraca.push(
    ["ASET INVESTASI (INVESTMENTS)", balanceSheet.investmentAssets.total, "Subtotal"]
  );
  balanceSheet.investmentAssets.items.forEach((item) => {
    aoaNeraca.push([`   • ${item.name}`, item.balance, `${item.percentageOfTotal}%`]);
  });

  aoaNeraca.push(
    ["PIUTANG (RECEIVABLES)", balanceSheet.receivableAssets.total, "Subtotal"]
  );
  balanceSheet.receivableAssets.items.forEach((item) => {
    aoaNeraca.push([`   • ${item.name}`, item.balance, `${item.percentageOfTotal}%`]);
  });

  aoaNeraca.push(
    ["TOTAL ASET (TOTAL ASSETS)", balanceSheet.totalAssets, "100.0%"],
    [],
    ["2. LIABILITAS & UTANG (LIABILITIES)", "Nominal (IDR)", "Porsi dari Total Liabilitas (%)"],
    ["LIABILITAS LANCAR (CURRENT LIABILITIES)", balanceSheet.currentLiabilities.total, "Subtotal"]
  );
  balanceSheet.currentLiabilities.items.forEach((item) => {
    aoaNeraca.push([`   • ${item.name}`, item.balance, `${item.percentageOfTotal}%`]);
  });

  aoaNeraca.push(
    ["LIABILITAS JANGKA PANJANG (LONG-TERM LIABILITIES)", balanceSheet.longTermLiabilities.total, "Subtotal"]
  );
  balanceSheet.longTermLiabilities.items.forEach((item) => {
    aoaNeraca.push([`   • ${item.name}`, item.balance, `${item.percentageOfTotal}%`]);
  });

  aoaNeraca.push(
    ["TOTAL LIABILITAS (TOTAL LIABILITIES)", balanceSheet.totalLiabilities, "100.0%"],
    [],
    ["3. EKUITAS & KEKAYAAN BERSIH (NET WORTH)", "Nominal (IDR)", "Keterangan"],
    ["KEKAYAAN BERSIH (NET WORTH)", balanceSheet.netWorth, "Total Aset - Total Liabilitas"],
    [
      "STATUS KESEIMBANGAN AKUNTANSI",
      balanceSheet.isBalanced ? "TERVERIFIKASI SEIMBANG" : "SELISIH AUDIT",
      balanceSheet.isBalanced ? "Aset = Liabilitas + Ekuitas (100% Seimbang)" : `Selisih: ${formatRupiah(balanceSheet.discrepancy)}`,
    ]
  );

  const ws2 = XLSX.utils.aoa_to_sheet(aoaNeraca);
  ws2["!cols"] = [{ wch: 44 }, { wch: 22 }, { wch: 32 }];

  // Format currency in Sheet 2
  for (let r = 4; r <= aoaNeraca.length; r++) {
    const cell = ws2[`B${r}`];
    if (cell && typeof cell.v === "number") {
      cell.z = "#,##0";
    }
  }
  XLSX.utils.book_append_sheet(wb, ws2, "Neraca");

  // ==========================================
  // SHEET 3: Arus Kas (Cash Flow Statement)
  // ==========================================
  const aoaCashFlow: any[][] = [
    ["TROUVAILLE — LAPORAN ARUS KAS (CASH FLOW STATEMENT)"],
    [`Periode: ${summary.periodLabel}   |   Ruang: ${summary.spaceName}`],
    [],
    ["1. ARUS KAS DARI AKTIVITAS OPERASI (OPERATING CASH FLOW)", "Nominal (IDR)", "Status"],
    ["Arus Masuk Operasi (Operating Inflow)", cashFlow.operatingInflow, "Penerimaan rutin"],
    ["Arus Keluar Operasi (Operating Outflow)", cashFlow.operatingOutflow, "Pengeluaran belanja"],
    [
      "ARUS KAS BERSIH OPERASI (NET OPERATING CASH FLOW)",
      cashFlow.netOperatingCashFlow,
      cashFlow.netOperatingCashFlow >= 0 ? "Surplus Operasi" : "Defisit Operasi",
    ],
    [],
    ["2. ARUS KAS DARI AKTIVITAS INVESTASI (INVESTING CASH FLOW)", "Nominal (IDR)", "Status"],
    ["Arus Masuk Investasi (Investing Inflow)", cashFlow.investingInflow, "Penjualan aset / dividen"],
    ["Arus Keluar Investasi (Investing Outflow)", cashFlow.investingOutflow, "Pembelian instrumen investasi"],
    [
      "ARUS KAS BERSIH INVESTASI (NET INVESTING CASH FLOW)",
      cashFlow.netInvestingCashFlow,
      cashFlow.netInvestingCashFlow >= 0 ? "Surplus Investasi" : "Defisit Investasi",
    ],
    [],
    ["3. ARUS KAS DARI AKTIVITAS PENDANAAN (FINANCING CASH FLOW)", "Nominal (IDR)", "Status"],
    ["Arus Masuk Pendanaan (Financing Inflow)", cashFlow.financingInflow, "Penerimaan pinjaman / utang"],
    ["Arus Keluar Pendanaan (Financing Outflow)", cashFlow.financingOutflow, "Pelunasan cicilan / utang"],
    [
      "ARUS KAS BERSIH PENDANAAN (NET FINANCING CASH FLOW)",
      cashFlow.netFinancingCashFlow,
      cashFlow.netFinancingCashFlow >= 0 ? "Surplus Pendanaan" : "Defisit Pendanaan",
    ],
    [],
    ["4. REKAPITULASI ARUS KAS KONSOLIDASI", "Nominal (IDR)", "Keterangan"],
    ["Total Pemasukan Kas Seluruh Aktivitas", cashFlow.totalInflow, "Total Inflow"],
    ["Total Pengeluaran Kas Seluruh Aktivitas", cashFlow.totalOutflow, "Total Outflow"],
    [
      "PERUBAHAN KAS BERSIH (NET CHANGE IN CASH)",
      cashFlow.netCashFlow,
      cashFlow.netCashFlow >= 0 ? "Surplus Kas Konsolidasi" : "Defisit Kas Konsolidasi",
    ],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(aoaCashFlow);
  ws3["!cols"] = [{ wch: 48 }, { wch: 22 }, { wch: 30 }];

  for (let r = 4; r <= aoaCashFlow.length; r++) {
    const cell = ws3[`B${r}`];
    if (cell && typeof cell.v === "number") {
      cell.z = "#,##0";
    }
  }
  XLSX.utils.book_append_sheet(wb, ws3, "Arus Kas");

  // ==========================================
  // SHEET 4: CaLK & Rasio (Notes & Disclosures)
  // ==========================================
  const aoaCalk: any[][] = [
    ["TROUVAILLE — CATATAN ATAS LAPORAN KEUANGAN & ANALISIS RASIO (CALK)"],
    [`Periode: ${summary.periodLabel}   |   Ruang: ${summary.spaceName}`],
    [],
    ["1. ANALISIS KETAHANAN KEUANGAN & SOLVENSI", "Nilai", "Status Penilaian", "Analisis Kualitatif"],
    [
      "Runway Likuiditas / Dana Darurat",
      `${calk.solvencyRunwayMonths} Bulan`,
      calk.solvencyRunwayRating.toUpperCase(),
      calk.solvencyDescription,
    ],
    [
      "Rasio Utang terhadap Aset (Debt-to-Asset)",
      `${calk.debtToAssetRatioPct}%`,
      calk.debtRating.toUpperCase(),
      calk.debtDescription,
    ],
    [
      "Laju Arus Kas Bebas (Free Cash Flow Rate)",
      `${calk.freeCashflowRatePct}%`,
      calk.freeCashflowRating.toUpperCase(),
      calk.freeCashflowDescription,
    ],
    [],
    [
      "2. PENGUNGKAPAN TRANSAKSI PENGELUARAN MATERIAL (>= 5% DARI TOTAL PENGELUARAN)",
      "Kategori",
      "Nominal (IDR)",
      "Porsi Pengeluaran (%)",
    ],
  ];

  if (calk.materialTransactions.length > 0) {
    calk.materialTransactions.forEach((item) => {
      aoaCalk.push([
        `${item.date} - ${item.note}`,
        item.categoryName,
        item.amount,
        `${item.percentageOfTotalExpense}%`,
      ]);
    });
  } else {
    aoaCalk.push([
      "Tidak ada transaksi pengeluaran tunggal yang mencapai ambang batas material 5%.",
      "-",
      0,
      "-",
    ]);
  }

  aoaCalk.push(
    [],
    ["3. REKONSILIASI & INTEGRITAS DATA AKUNTANSI", "Status Audit", "Keterangan Lengkap"],
    [
      "Status Rekonsiliasi Neraca",
      calk.reconciliation.auditStatus === "CERTIFIED_BALANCED" ? "TERVERIFIKASI SEIMBANG" : "PERINGATAN AUDIT",
      calk.reconciliation.notes,
    ]
  );

  const ws4 = XLSX.utils.aoa_to_sheet(aoaCalk);
  ws4["!cols"] = [{ wch: 40 }, { wch: 22 }, { wch: 22 }, { wch: 54 }];

  XLSX.utils.book_append_sheet(wb, ws4, "CaLK & Rasio");

  // Generate uncompressed XLSX binary
  const rawUint8 = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: false });

  // Patch all sheet views to disable gridlines (<sheetView showGridLines="0" />)
  const patchedUint8 = patchGridlinesInUint8Array(new Uint8Array(rawUint8));

  return new Blob([patchedUint8.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Direct luxury Excel (.xlsx) download
 */
export async function downloadLuxuryExcel(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
  categories: Category[] = [],
  filename = "trouvaille_statement.xlsx",
): Promise<void> {
  const blob = await generateLuxuryExcelBlob(transactions, summary, wallets, categories);

  if (Capacitor.isNativePlatform() && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Trouvaille Excel Statement",
          text: `Here is the financial statement export from Trouvaille (${filename}).`,
        });
        return;
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
  }

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
 * Direct luxury Excel (.xlsx) share with Web Share API fallback
 */
export async function shareLuxuryExcel(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
  categories: Category[] = [],
  filename = "trouvaille_statement.xlsx",
): Promise<boolean> {
  const blob = await generateLuxuryExcelBlob(transactions, summary, wallets, categories);

  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Trouvaille Excel Statement",
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

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Generates an executive luxury PDF document structured into formal wealth sections:
 * Page 1: Executive Summary, Key Metrics, Balance Sheet (Neraca) & Top Spending
 * Page 2: Statement of Cash Flows (Arus Kas) & Notes to Financial Statements (CaLK)
 * Page 3+: Paginated Ledger Transactions Table
 */
export function generateLuxuryPdf(
  transactions: Transaction[],
  summary: ReportSummary,
  wallets: Wallet[] = [],
  categories: Category[] = [],
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

  const reportPkg = generateFinancialReportPackage(wallets, transactions, categories, {
    periodLabel: summary.periodLabel,
  });
  const { balanceSheet, cashFlow, calk } = reportPkg;

  const now = new Date();
  const docRef = `REF: TVL-${format(now, "yyyyMMdd-HHmm")}`;

  // ==========================================
  // PAGE 1: Executive Statement & Neraca
  // ==========================================
  let y = 46;

  // Header Brand & Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(18, 18, 20); // obsidian
  doc.text("TROUVAILLE", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text("PRIVATE WEALTH ARCHITECTURE · EXECUTIVE STATEMENT", margin, y + 13);

  // Period, Scope & Generation Date (right aligned)
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

  y += 18;

  // 1. Key Financial Metrics Grid (4 columns)
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

  y += 66;

  // 2. Neraca / Statement of Financial Position (Balance Sheet)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(18, 18, 20);
  doc.text("LAPORAN POSISI KEUANGAN (NERACA / BALANCE SHEET)", margin, y);

  y += 14;

  const bsBoxW = (contentWidth - 10) / 2;
  const bsBoxH = 68;

  // Box A: Total Assets
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(margin, y, bsBoxW, bsBoxH, 5, 5, "F");
  doc.setDrawColor(235, 235, 239);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, bsBoxW, bsBoxH, 5, 5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text("TOTAL ASET (TOTAL ASSETS)", margin + 10, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text(formatRupiah(balanceSheet.totalAssets), margin + 10, y + 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `Lancar: ${formatRupiah(balanceSheet.liquidAssets.total)}   Investasi: ${formatRupiah(balanceSheet.investmentAssets.total)}`,
    margin + 10,
    y + 46
  );
  doc.text(
    `Piutang: ${formatRupiah(balanceSheet.receivableAssets.total)}`,
    margin + 10,
    y + 58
  );

  // Box B: Total Liabilities
  const rightX = margin + bsBoxW + 10;
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(rightX, y, bsBoxW, bsBoxH, 5, 5, "F");
  doc.setDrawColor(235, 235, 239);
  doc.setLineWidth(0.5);
  doc.roundedRect(rightX, y, bsBoxW, bsBoxH, 5, 5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text("TOTAL LIABILITAS (TOTAL LIABILITIES)", rightX + 10, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text(formatRupiah(balanceSheet.totalLiabilities), rightX + 10, y + 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `Lancar: ${formatRupiah(balanceSheet.currentLiabilities.total)}`,
    rightX + 10,
    y + 46
  );
  doc.text(
    `Jangka Panjang: ${formatRupiah(balanceSheet.longTermLiabilities.total)}`,
    rightX + 10,
    y + 58
  );

  y += bsBoxH + 8;

  // Box C: Net Worth (Full-width card)
  doc.setFillColor(244, 244, 247);
  doc.roundedRect(margin, y, contentWidth, 38, 5, 5, "F");
  doc.setDrawColor(228, 228, 233);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 38, 5, 5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text("KEKAYAAN BERSIH (NET WORTH = ASET - LIABILITAS)", margin + 10, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(18, 18, 20);
  doc.text(formatRupiah(balanceSheet.netWorth), margin + 10, y + 29);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text(
    balanceSheet.isBalanced
      ? "Keseimbangan: Aset = Liabilitas + Ekuitas (100% Seimbang)"
      : `Selisih: ${formatRupiah(balanceSheet.discrepancy)}`,
    pageWidth - margin - 10,
    y + 24,
    { align: "right" }
  );

  y += 54;

  // 3. Top Expense Distribution
  if (summary.topCategories.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(18, 18, 20);
    doc.text("DISTRIBUSI PENGELUARAN (TOP 5 SPENDING)", margin, y);

    y += 14;

    summary.topCategories.slice(0, 5).forEach((cat) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(39, 39, 42);
      doc.text(cat.name, margin, y);

      const amtText = `${formatRupiah(cat.amount)}  (${cat.percentage.toFixed(1)}%)`;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(113, 113, 122);
      doc.text(amtText, pageWidth - margin, y, { align: "right" });

      y += 4;
      doc.setFillColor(240, 240, 244);
      doc.roundedRect(margin, y, contentWidth, 3, 1.5, 1.5, "F");

      const fillW = Math.max(3, (contentWidth * Math.min(100, cat.percentage)) / 100);
      doc.setFillColor(39, 39, 42);
      doc.roundedRect(margin, y, fillW, 3, 1.5, 1.5, "F");

      y += 14;
    });
  }

  // ==========================================
  // PAGE 2: Arus Kas & CaLK
  // ==========================================
  doc.addPage();
  y = 46;

  // Page 2 Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(18, 18, 20);
  doc.text("TROUVAILLE", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text("LAPORAN ARUS KAS & CATATAN ATAS LAPORAN KEUANGAN (CALK)", margin, y + 13);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 24, 27);
  doc.text(summary.periodLabel, pageWidth - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`${summary.spaceName} · ${docRef}`, pageWidth - margin, y + 11, { align: "right" });

  y += 28;
  doc.setDrawColor(228, 228, 233);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);

  y += 18;

  // Section: Laporan Arus Kas (3 Activity Cards)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(18, 18, 20);
  doc.text("LAPORAN ARUS KAS (STATEMENT OF CASH FLOWS)", margin, y);

  y += 12;

  const cfColW = (contentWidth - 16) / 3;
  const cfBoxH = 62;
  const cfActivities = [
    {
      title: "AKTIVITAS OPERASI",
      inflow: cashFlow.operatingInflow,
      outflow: cashFlow.operatingOutflow,
      net: cashFlow.netOperatingCashFlow,
    },
    {
      title: "AKTIVITAS INVESTASI",
      inflow: cashFlow.investingInflow,
      outflow: cashFlow.investingOutflow,
      net: cashFlow.netInvestingCashFlow,
    },
    {
      title: "AKTIVITAS PENDANAAN",
      inflow: cashFlow.financingInflow,
      outflow: cashFlow.financingOutflow,
      net: cashFlow.netFinancingCashFlow,
    },
  ];

  cfActivities.forEach((act, idx) => {
    const x = margin + idx * (cfColW + 8);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(x, y, cfColW, cfBoxH, 5, 5, "F");
    doc.setDrawColor(235, 235, 239);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cfColW, cfBoxH, 5, 5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(113, 113, 122);
    doc.text(act.title, x + 8, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text(`Masuk: +${formatRupiah(act.inflow)}`, x + 8, y + 27);
    doc.text(`Keluar: -${formatRupiah(act.outflow)}`, x + 8, y + 39);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(24, 24, 27);
    doc.text(`Bersih: ${(act.net >= 0 ? "+" : "") + formatRupiah(act.net)}`, x + 8, y + 52);
  });

  y += cfBoxH + 10;

  // Net Cash Change Bar
  doc.setFillColor(244, 244, 247);
  doc.roundedRect(margin, y, contentWidth, 24, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(18, 18, 20);
  doc.text("PERUBAHAN KAS BERSIH (NET CHANGE IN CASH)", margin + 8, y + 15);
  doc.text(
    `${cashFlow.netCashFlow >= 0 ? "+" : ""}${formatRupiah(cashFlow.netCashFlow)}`,
    pageWidth - margin - 8,
    y + 15,
    { align: "right" }
  );

  y += 42;

  // Section: CaLK & Analisis Rasio
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(18, 18, 20);
  doc.text("CATATAN ATAS LAPORAN KEUANGAN (CALK) & ANALISIS RASIO", margin, y);

  y += 12;

  // 3 Metric Badges
  const rColW = (contentWidth - 16) / 3;
  const ratios = [
    {
      title: "RUNWAY LIKUIDITAS",
      val: `${calk.solvencyRunwayMonths} Bulan`,
      rating: calk.solvencyRunwayRating.toUpperCase(),
    },
    {
      title: "RASIO UTANG (DAR)",
      val: `${calk.debtToAssetRatioPct}%`,
      rating: calk.debtRating.toUpperCase(),
    },
    {
      title: "ARUS KAS BEBAS (FCF)",
      val: `${calk.freeCashflowRatePct}%`,
      rating: calk.freeCashflowRating.toUpperCase(),
    },
  ];

  ratios.forEach((r, idx) => {
    const x = margin + idx * (rColW + 8);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(x, y, rColW, 40, 4, 4, "F");
    doc.setDrawColor(235, 235, 239);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, rColW, 40, 4, 4, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(113, 113, 122);
    doc.text(r.title, x + 8, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(24, 24, 27);
    doc.text(r.val, x + 8, y + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(113, 113, 122);
    doc.text(r.rating, x + rColW - 8, y + 26, { align: "right" });
  });

  y += 50;

  // Material Transactions Table (>= 5% threshold)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(18, 18, 20);
  doc.text("PENGUNGKAPAN TRANSAKSI MATERIAL (>= 5% DARI TOTAL PENGELUARAN)", margin, y);

  y += 10;

  // CaLK Table Header
  doc.setFillColor(244, 244, 246);
  doc.rect(margin, y, contentWidth, 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text("TANGGAL", margin + 6, y + 10);
  doc.text("DESKRIPSI / KATEGORI", margin + 70, y + 10);
  doc.text("PORSI BELANJA", margin + 340, y + 10);
  doc.text("NOMINAL", pageWidth - margin - 6, y + 10, { align: "right" });

  y += 16;

  if (calk.materialTransactions.length > 0) {
    calk.materialTransactions.slice(0, 5).forEach((item, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(margin, y - 1, contentWidth, 15, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 71, 78);
      doc.text(item.date || "", margin + 6, y + 9);
      doc.text(`${item.note.slice(0, 36)} (${item.categoryName})`, margin + 70, y + 9);
      doc.text(`${item.percentageOfTotalExpense}%`, margin + 340, y + 9);
      doc.text(formatRupiah(item.amount), pageWidth - margin - 6, y + 9, { align: "right" });

      doc.setDrawColor(240, 240, 244);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 13, pageWidth - margin, y + 13);
      y += 15;
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text("Tidak ada transaksi tunggal yang melebihi ambang batas material 5%.", margin + 6, y + 10);
    y += 16;
  }

  y += 10;

  // Audit Reconciliation Banner
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(margin, y, contentWidth, 30, 4, 4, "F");
  doc.setDrawColor(235, 235, 239);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 30, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(18, 18, 20);
  doc.text("REKONSILIASI & INTEGRITAS AUDIT INTERNAL", margin + 8, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(113, 113, 122);
  doc.text(
    calk.reconciliation.auditStatus === "CERTIFIED_BALANCED"
      ? "Status: TERVERIFIKASI SEIMBANG — Seluruh saldo akun dan mutasi kas konsisten 100% tanpa selisih."
      : `Status: PERINGATAN — Ditemukan selisih ${formatRupiah(calk.reconciliation.discrepancyAmount)}.`,
    margin + 8,
    y + 22
  );

  // ==========================================
  // PAGE 3+: Buku Kas Transaksi (Ledger)
  // ==========================================
  doc.addPage();
  y = 46;

  // Table Header Function
  const renderLedgerHeader = (currY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(18, 18, 20);
    doc.text(`BUKU KAS TRANSAKSI (${transactions.length} CATATAN)`, margin, currY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(`${summary.spaceName} · ${summary.periodLabel}`, pageWidth - margin, currY, { align: "right" });

    currY += 12;

    doc.setFillColor(244, 244, 246);
    doc.rect(margin, currY, contentWidth, 16, "F");
    doc.setDrawColor(228, 228, 233);
    doc.setLineWidth(0.5);
    doc.line(margin, currY + 16, pageWidth - margin, currY + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text("TANGGAL", margin + 6, currY + 11);
    doc.text("DESKRIPSI / KATEGORI", margin + 70, currY + 11);
    doc.text("AKUN", margin + 310, currY + 11);
    doc.text("NOMINAL", pageWidth - margin - 6, currY + 11, { align: "right" });

    return currY + 18;
  };

  y = renderLedgerHeader(y);

  const sortedTxs = [...transactions].sort((a, b) => {
    const da = a.occurred_on || a.created_at || "";
    const db = b.occurred_on || b.created_at || "";
    return db.localeCompare(da);
  });

  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  sortedTxs.forEach((tx, idx) => {
    if (y > pageHeight - 55) {
      doc.addPage();
      y = renderLedgerHeader(44);
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
    const noteText = tx.type === "transfer"
      ? (tx.note ? `${tx.note} (Transfer)` : "Transfer")
      : (tx.note ? `${tx.note} (${catName})` : catName);
    const desc = noteText.length > 50 ? noteText.slice(0, 48) + "..." : noteText;

    const isIncome = tx.type === "income";
    const isExpense = tx.type === "expense";

    // Clean formatting without broken Unicode characters
    const prefix = isIncome ? "+" : isExpense ? "-" : "";
    const amtStr = `${prefix}${formatRupiah(Number(tx.amount || 0))}`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 71, 78);
    doc.text(txDate, margin + 6, y + 10);
    doc.text(desc, margin + 70, y + 10);
    doc.text(accountLabel.slice(0, 26), margin + 310, y + 10);

    // Regular font weight for all line amounts
    if (isIncome) {
      doc.setTextColor(13, 148, 136); // teal-600 for inflow
    } else if (isExpense) {
      doc.setTextColor(24, 24, 27); // obsidian for outflow
    } else {
      doc.setTextColor(113, 113, 122); // zinc-500 neutral for transfer
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
    doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text("Trouvaille · Private Wealth Architecture · Confidential Document", margin, pageHeight - 12);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: "right" });
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
  categories: Category[] = [],
  filename = "trouvaille_statement.pdf",
): Promise<void> {
  const doc = generateLuxuryPdf(transactions, summary, wallets, categories);
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
  categories: Category[] = [],
  filename = "trouvaille_statement.pdf",
): Promise<boolean> {
  const doc = generateLuxuryPdf(transactions, summary, wallets, categories);
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

