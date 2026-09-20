import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";
import type { Transaction, Wallet, Category } from "./types";
import { formatRupiah } from "./utils";

export type ReportDateRange =
  | "this_month"
  | "last_month"
  | "ytd"
  | "last_year"
  | "all"
  | "custom";

export type ReportTransactionType = "all" | "expense" | "income" | "business_tax";

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
  netCashflow: number;
  savingsRate: number; // 0 to 100
  taxDeductibleTotal: number;
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
        // Must not have space_id or business/travel tag
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
          (target === "business" && (note.includes("#kantor") || note.includes("#reimburse") || note.includes("#pajak"))) ||
          (target === "travel" && note.includes("#liburan"));
        if (!matchesSpace) return false;
      }
    }

    // Transaction type filtering
    if (options.transactionType && options.transactionType !== "all") {
      if (options.transactionType === "business_tax") {
        const note = (tx.note || "").toLowerCase();
        const catName = (tx.categories?.name || "").toLowerCase();
        const isBusiness =
          tx.space_id === "business" ||
          note.includes("#business") ||
          note.includes("#kantor") ||
          note.includes("#reimburse") ||
          note.includes("#pajak") ||
          catName.includes("pajak") ||
          catName.includes("legal") ||
          catName.includes("admin");
        if (!isBusiness) return false;
      } else if (tx.type !== options.transactionType) {
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
  let taxDeductibleTotal = 0;
  const categoryMap = new Map<string, { amount: number; count: number }>();
  const walletMap = new Map<string, { inflow: number; outflow: number }>();

  // Initialize wallet map
  wallets.forEach((w) => {
    walletMap.set(w.id, { inflow: 0, outflow: 0 });
  });

  filteredTxs.forEach((tx) => {
    const amt = tx.amount || 0;
    const note = (tx.note || "").toLowerCase();
    const catName = tx.categories?.name || "General";

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

      // Check tax deductible / business
      const isTaxDeductible =
        tx.space_id === "business" ||
        note.includes("#business") ||
        note.includes("#kantor") ||
        note.includes("#reimburse") ||
        note.includes("#pajak") ||
        catName.toLowerCase().includes("pajak");
      if (isTaxDeductible) {
        taxDeductibleTotal += amt;
      }
    } else if (tx.type === "transfer") {
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
    netCashflow,
    savingsRate,
    taxDeductibleTotal,
    transactionCount: filteredTxs.length,
    topCategories,
    walletBreakdown,
  };
}

/**
 * Generate CSV formatted string with UTF-8 BOM
 */
export function generateCsvContent(
  transactions: Transaction[],
  wallets: Wallet[] = [],
): string {
  const headers = [
    "Date",
    "Time",
    "Type",
    "Amount (IDR)",
    "Category",
    "From Account",
    "To Account",
    "Space",
    "Tags",
    "Note",
    "Transaction ID",
  ];

  const walletMap = new Map<string, string>();
  wallets.forEach((w) => walletMap.set(w.id, w.name));

  const rows = transactions.map((t) => {
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
      amountStr,
      `"${catStr.replace(/"/g, '""')}"`,
      `"${fromAccount.replace(/"/g, '""')}"`,
      `"${toAccount.replace(/"/g, '""')}"`,
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
      net_cashflow: summary.netCashflow,
      savings_rate_pct: summary.savingsRate,
      tax_deductible_total: summary.taxDeductibleTotal,
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
    .map(
      (c) => `
      <div style="margin-bottom: 9px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span style="font-weight: 500; color: #18181b;">${c.name}</span>
          <span style="font-weight: 600; color: #09090c;">${formatRupiah(c.amount)} (${c.percentage}%)</span>
        </div>
        <div style="width: 100%; height: 4px; background: #f4f4f7; border-radius: 9999px; overflow: hidden;">
          <div style="width: ${Math.min(100, c.percentage)}%; height: 100%; background: #18181b; border-radius: 9999px;"></div>
        </div>
      </div>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Trouvaille Statement - ${summary.periodLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #09090c;
      background: #ffffff;
      padding: 40px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    @media print {
      body { padding: 20px; font-size: 11px; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      @page { margin: 15mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #09090c; padding-bottom: 20px; margin-bottom: 28px;">
    <div>
      <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.03em; text-transform: uppercase;">TROUVAILLE</div>
      <div style="font-size: 11px; font-weight: 600; color: #71717a; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 2px;">EXECUTIVE FINANCIAL REPORT</div>
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
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">${formatRupiah(summary.totalIncome)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Income & credits</div>
    </div>

    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">TOTAL OUTFLOW</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">${formatRupiah(summary.totalExpense)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Operating expenses</div>
    </div>

    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">NET CASH FLOW</div>
      <div style="font-size: 18px; font-weight: 700; color: ${summary.netCashflow >= 0 ? "#0d9488" : "#e11d48"}; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">${formatRupiah(summary.netCashflow)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Savings rate: ${summary.savingsRate}%</div>
    </div>

    <div style="background: #fafafc; border: 1px solid #e4e4e9; border-radius: 12px; padding: 14px 16px;">
      <div style="font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase;">BUSINESS / TAX DEDUCTIBLE</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090c; margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, monospace;">${formatRupiah(summary.taxDeductibleTotal)}</div>
      <div style="font-size: 10px; color: #a1a1aa; margin-top: 3px;">Tag: #business, #reimburse</div>
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
    <div>Confidential Document · For Personal or Tax Advisory Use Only</div>
  </div>

  <script>
    window.onload = function() {
      // Allow fonts to render then trigger print
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
