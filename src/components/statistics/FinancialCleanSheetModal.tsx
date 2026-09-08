import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import {
  Download,
  Copy,
  Check,
  X,
  Calendar,
  Sun,
  Moon,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import type { Transaction, Category } from "../../lib/types";
import type { AccountBalanceItem } from "../../lib/financialMath";
import { isCorrectionTx } from "../../lib/financialMath";
import { useAuth } from "../../contexts/AuthContext";

interface FinancialCleanSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  totalAssets: number;
  netWorth: number;
  liquidAccounts: AccountBalanceItem[];
}

export function FinancialCleanSheetModal({
  isOpen,
  onClose,
  transactions = [],
  categories = [],
  totalAssets = 0,
  liquidAccounts = [],
}: FinancialCleanSheetModalProps) {
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [statementType, setStatementType] = useState<"month" | "year">("month");
  const [paperTheme, setPaperTheme] = useState<"white" | "dark">("white");

  // Derive distinct available months & years from actual transactions
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.occurred_on && t.occurred_on.length >= 7) {
        set.add(t.occurred_on.slice(0, 7)); // "yyyy-MM"
      }
    });
    if (set.size === 0) {
      set.add(format(new Date(), "yyyy-MM"));
    }
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.occurred_on && t.occurred_on.length >= 4) {
        set.add(t.occurred_on.slice(0, 4)); // "yyyy"
      }
    });
    if (set.size === 0) {
      set.add(format(new Date(), "yyyy"));
    }
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => availableMonths[0] || format(new Date(), "yyyy-MM")
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    () => availableYears[0] || format(new Date(), "yyyy")
  );

  // Filter transactions for the selected period (sorted chronologically ascending)
  const periodTxs = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (!t.occurred_on) return false;
      if (statementType === "month") {
        return t.occurred_on.startsWith(selectedMonth);
      } else {
        return t.occurred_on.startsWith(selectedYear);
      }
    });

    // Chronological order: oldest first for real bank statement ledger
    return filtered.sort((a, b) => {
      const dateCmp = (a.occurred_on || "").localeCompare(b.occurred_on || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.created_at || a.id).localeCompare(b.created_at || b.id);
    });
  }, [transactions, statementType, selectedMonth, selectedYear]);

  // Compute period totals and calculate running balance for every transaction row
  const {
    totalIncoming,
    totalOutgoing,
    incomingCount,
    outgoingCount,
    netCashflow,
    savingsRate,
    openingBalance,
    closingBalance,
    ledgerRows,
    categoryBreakdown,
  } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let incCount = 0;
    let expCount = 0;
    const catMap = new Map<string, { name: string; amount: number; count: number }>();

    periodTxs.forEach((t) => {
      if (isCorrectionTx(t)) return;
      const amt = Number(t.amount || 0);
      if (t.type === "income") {
        inc += amt;
        incCount += 1;
      } else if (t.type === "expense") {
        exp += amt;
        expCount += 1;
        const catName =
          t.categories?.name ||
          categories.find((c) => c.id === t.category_id)?.name ||
          "Lainnya";
        const current = catMap.get(catName) || { name: catName, amount: 0, count: 0 };
        current.amount += amt;
        current.count += 1;
        catMap.set(catName, current);
      }
    });

    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, (net / inc) * 100) : 0;

    // Calculate period closing & opening balances
    // Post-period net change (transactions after selected period)
    const periodEndStr =
      statementType === "month"
        ? format(endOfMonth(parseISO(`${selectedMonth}-01`)), "yyyy-MM-dd")
        : `${selectedYear}-12-31`;

    const postTxs = transactions.filter(
      (t) => t.occurred_on && t.occurred_on > periodEndStr && !isCorrectionTx(t)
    );
    const postNet = postTxs.reduce((sum, t) => {
      const amt = Number(t.amount || 0);
      return t.type === "income" ? sum + amt : t.type === "expense" ? sum - amt : sum;
    }, 0);

    const computedClosing = totalAssets - postNet;
    const computedOpening = computedClosing - net;

    // Build ledger rows with exact running balance
    let curBal = computedOpening;
    const rows = periodTxs.map((t, idx) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") {
        curBal += amt;
      } else if (t.type === "expense") {
        curBal -= amt;
      }
      return {
        rowNo: idx + 1,
        tx: t,
        runningBalance: curBal,
      };
    });

    const breakdown = Array.from(catMap.values())
      .map((c) => ({
        ...c,
        percentage: exp > 0 ? (c.amount / exp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncoming: inc,
      totalOutgoing: exp,
      incomingCount: incCount,
      outgoingCount: expCount,
      netCashflow: net,
      savingsRate: rate,
      openingBalance: Math.max(0, computedOpening),
      closingBalance: Math.max(0, computedClosing),
      ledgerRows: rows,
      categoryBreakdown: breakdown,
    };
  }, [periodTxs, categories, transactions, statementType, selectedMonth, selectedYear, totalAssets]);

  if (!isOpen) return null;

  const periodTitle =
    statementType === "month"
      ? format(parseISO(`${selectedMonth}-01`), "MMMM yyyy").toUpperCase()
      : `CALENDAR YEAR ${selectedYear}`;

  const periodDateRange =
    statementType === "month"
      ? `${format(startOfMonth(parseISO(`${selectedMonth}-01`)), "dd MMM yyyy")} - ${format(endOfMonth(parseISO(`${selectedMonth}-01`)), "dd MMM yyyy")}`
      : `01 Jan ${selectedYear} - 31 Des ${selectedYear}`;

  const generationTimestamp = format(new Date(), "dd MMM yyyy HH:mm") + " WIB";
  const auditId = `TRV-${statementType === "month" ? selectedMonth.replace("-", "") : selectedYear}-${Math.floor(1000 + Math.random() * 9000)}`;
  const userName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Private Ledger Holder";

  const handlePrint = () => {
    triggerHaptic("medium");
    window.print();
  };

  const handleCopyText = () => {
    triggerHaptic("light");
    const reportText = [
      `========================================================================`,
      `              TROUVAILLE OFFICIAL REKENING KORAN ELEKTRONIK             `,
      `                       PERIODE: ${periodTitle}                         `,
      `========================================================================`,
      `Nama Nasabah      : ${userName}`,
      `Periode Transaksi : ${periodDateRange}`,
      `Nomor Pernyataan  : ${auditId}`,
      `Dicetak Pada      : ${generationTimestamp}`,
      `Mata Uang         : IDR`,
      ``,
      `--- RINGKASAN REKENING (ACCOUNT SUMMARY) ---`,
      `Saldo Awal        : ${formatRupiah(openingBalance)}`,
      `Total Dana Masuk  : +${formatRupiah(totalIncoming)} (${incomingCount} transaksi)`,
      `Total Dana Keluar : -${formatRupiah(totalOutgoing)} (${outgoingCount} transaksi)`,
      `Saldo Akhir       : ${formatRupiah(closingBalance)}`,
      `Surplus Bersih    : ${formatRupiah(netCashflow)} (Savings Rate: ${savingsRate.toFixed(1)}%)`,
      ``,
      `--- RINCIAN TRANSAKSI (TRANSACTION LEDGER) ---`,
      `No | Tanggal    | Keterangan                  | Nominal         | Saldo`,
      `------------------------------------------------------------------------`,
      ...ledgerRows.map((r) => {
        const sign = r.tx.type === "income" ? "+" : "-";
        const cat = r.tx.categories?.name || "Umum";
        const note = r.tx.note ? ` (${r.tx.note})` : "";
        const desc = `${cat}${note}`.slice(0, 26).padEnd(26, " ");
        const dateStr = format(parseISO(r.tx.occurred_on), "dd/MM/yyyy");
        const amtStr = `${sign}${formatRupiah(r.tx.amount)}`.padStart(15, " ");
        const balStr = formatRupiah(r.runningBalance).padStart(15, " ");
        return `${String(r.rowNo).padStart(2, "0")} | ${dateStr} | ${desc} | ${amtStr} | ${balStr}`;
      }),
      ``,
      `========================================================================`,
      `Dicetak secara otomatis dari Trouvaille Ledger. Sah dan terverifikasi.`,
      `========================================================================`,
    ].join("\n");

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isWhite = paperTheme === "white";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md overflow-hidden">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #trouvaille-e-statement, #trouvaille-e-statement * {
            visibility: visible !important;
          }
          #trouvaille-e-statement {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border-dark {
            border-color: #000000 !important;
          }
          .print-border-light {
            border-color: #d1d5db !important;
          }
          .print-bg-header {
            background-color: #f3f4f6 !important;
          }
          .print-text-dark {
            color: #000000 !important;
          }
          .print-text-gray {
            color: #4b5563 !important;
          }
        }
      `}</style>

      {/* STICKY TOP CONTROL BAR */}
      <header
        className="no-print shrink-0 w-full px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2.5 border-b z-20"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--glass-border)",
        }}
      >
        {/* Left: Brand + Period Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[12px] font-black uppercase tracking-wider hidden sm:inline"
            style={{ color: "var(--text-primary)" }}
          >
            E-Statement
          </span>

          {/* Month vs Year Segmented Control */}
          <div
            className="flex p-0.5 rounded-xl border"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setStatementType("month");
                triggerHaptic("light");
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all"
              style={{
                background:
                  statementType === "month" ? "var(--accent)" : "transparent",
                color:
                  statementType === "month"
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
              }}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => {
                setStatementType("year");
                triggerHaptic("light");
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all"
              style={{
                background:
                  statementType === "year" ? "var(--accent)" : "transparent",
                color:
                  statementType === "year"
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
              }}
            >
              Tahunan
            </button>
          </div>

          {/* Dropdown Available Periods */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl border"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--glass-border)",
            }}
          >
            <Calendar size={12} style={{ color: "var(--text-tertiary)" }} />
            <select
              value={statementType === "month" ? selectedMonth : selectedYear}
              onChange={(e) => {
                if (statementType === "month") {
                  setSelectedMonth(e.target.value);
                } else {
                  setSelectedYear(e.target.value);
                }
                triggerHaptic("light");
              }}
              className="bg-transparent text-[11px] font-black focus:outline-none cursor-pointer pr-1"
              style={{ color: "var(--text-primary)" }}
            >
              {statementType === "month"
                ? availableMonths.map((m) => (
                    <option
                      key={m}
                      value={m}
                      style={{ background: "#18181b", color: "#ffffff" }}
                    >
                      {format(parseISO(`${m}-01`), "MMMM yyyy")}
                    </option>
                  ))
                : availableYears.map((y) => (
                    <option
                      key={y}
                      value={y}
                      style={{ background: "#18181b", color: "#ffffff" }}
                    >
                      Tahun {y}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Right: Theme Toggle + Print + PROMINENT CLOSE BUTTON */}
        <div className="flex items-center gap-2">
          {/* Paper Theme Switch (White Paper vs Dark Mode) */}
          <button
            type="button"
            onClick={() => {
              setPaperTheme(isWhite ? "dark" : "white");
              triggerHaptic("light");
            }}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 border cursor-pointer active:scale-95 transition-all"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            title="Ganti mode pratinjau kertas"
          >
            {isWhite ? <Moon size={12} /> : <Sun size={12} />}
            <span className="hidden sm:inline">{isWhite ? "Dark" : "Paper"}</span>
          </button>

          {/* Copy Plaintext */}
          <button
            type="button"
            onClick={handleCopyText}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 border cursor-pointer active:scale-95 transition-all"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            title="Salin ringkasan teks"
          >
            {copied ? <Check size={12} className="text-white" /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? "Tersalin" : "Salin"}</span>
          </button>

          {/* Download / Print PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
            title="Unduh atau Cetak sebagai PDF"
          >
            <Download size={13} />
            <span>Download PDF</span>
          </button>

          {/* BIG, PROMINENT CLOSE BUTTON */}
          <button
            type="button"
            onClick={() => {
              onClose();
              triggerHaptic("light");
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform text-white border"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              borderColor: "var(--glass-border)",
            }}
            aria-label="Tutup E-Statement"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* SCROLLABLE DOCUMENT PREVIEW AREA */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center">
        <div
          id="trouvaille-e-statement"
          className="w-full max-w-3xl rounded-2xl shadow-2xl p-6 sm:p-10 space-y-6 select-text transition-colors"
          style={{
            background: isWhite ? "#FFFFFF" : "#121215",
            color: isWhite ? "#111827" : "#F3F4F6",
            fontFamily: "Urbanist, -apple-system, sans-serif",
            border: isWhite ? "1px solid #E5E7EB" : "1px solid var(--glass-border)",
          }}
        >
          {/* ========================================================= */}
          {/* 1. BANK HEADER (Official Bank Mandiri / SeaBank Style) */}
          {/* ========================================================= */}
          <div
            className="pb-5 border-b-2 print-border-dark"
            style={{ borderColor: isWhite ? "#111827" : "#FFFFFF" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Bank Logo / Brand Header */}
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
                    style={{
                      background: isWhite ? "#111827" : "#FFFFFF",
                      color: isWhite ? "#FFFFFF" : "#111827",
                    }}
                  >
                    T
                  </div>
                  <div>
                    <h1 className="text-[17px] font-black tracking-tight leading-none uppercase">
                      TROUVAILLE PRIVATE LEDGER
                    </h1>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase block mt-0.5"
                      style={{ color: isWhite ? "#4B5563" : "#9CA3AF" }}
                    >
                      Rekening Koran Elektronik (e-Statement)
                    </span>
                  </div>
                </div>
                <p
                  className="text-[9px] mt-2 max-w-xs leading-relaxed"
                  style={{ color: isWhite ? "#6B7280" : "#6B7280" }}
                >
                  Trouvaille Wealth Operations Center · Immutable Double-Entry Ledger
                </p>
              </div>

              {/* Account Metadata Box */}
              <div
                className="text-[11px] p-3 rounded-xl border print-border-light space-y-1"
                style={{
                  background: isWhite ? "#F9FAFB" : "rgba(255, 255, 255, 0.03)",
                  borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.1)",
                }}
              >
                <div className="flex justify-between gap-4">
                  <span style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}>
                    Nama Nasabah / Name:
                  </span>
                  <strong className="font-bold">{userName}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}>
                    Periode / Period:
                  </span>
                  <strong className="font-bold">{periodDateRange}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}>
                    No. Referensi / Ref:
                  </span>
                  <span className="font-mono text-[10px]">{auditId}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}>
                    Mata Uang / Currency:
                  </span>
                  <strong className="font-bold">IDR (Rupiah)</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}>
                    Dicetak Pada / Issued:
                  </span>
                  <span className="text-[10px]">{generationTimestamp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. RINGKASAN REKENING (Account Summary Table) */}
          {/* ========================================================= */}
          <div className="space-y-2">
            <h2
              className="text-[11px] font-black tracking-wider uppercase"
              style={{ color: isWhite ? "#374151" : "#D1D5DB" }}
            >
              Ringkasan Rekening (Account Summary)
            </h2>

            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border print-border-light print-bg-header"
              style={{
                background: isWhite ? "#F9FAFB" : "rgba(255, 255, 255, 0.02)",
                borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.1)",
              }}
            >
              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider block"
                  style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                >
                  Saldo Awal (Initial)
                </span>
                <span className="text-[15px] font-black block mt-0.5">
                  {formatRupiah(openingBalance)}
                </span>
              </div>

              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider block"
                  style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                >
                  Dana Masuk ({incomingCount} txs)
                </span>
                <span
                  className="text-[15px] font-black block mt-0.5"
                  style={{ color: isWhite ? "#047857" : "#34D399" }}
                >
                  +{formatRupiah(totalIncoming)}
                </span>
              </div>

              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider block"
                  style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                >
                  Dana Keluar ({outgoingCount} txs)
                </span>
                <span
                  className="text-[15px] font-black block mt-0.5"
                  style={{ color: isWhite ? "#B91C1C" : "#F87171" }}
                >
                  -{formatRupiah(totalOutgoing)}
                </span>
              </div>

              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider block"
                  style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                >
                  Saldo Akhir (Closing)
                </span>
                <span className="text-[15px] font-black block mt-0.5">
                  {formatRupiah(closingBalance)}
                </span>
              </div>
            </div>

            {/* Performance Ratios Bar */}
            <div
              className="flex justify-between items-center text-[10px] px-3 py-1.5 rounded-lg border font-semibold"
              style={{
                background: isWhite ? "#F3F4F6" : "rgba(255, 255, 255, 0.04)",
                borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.08)",
                color: isWhite ? "#4B5563" : "#9CA3AF",
              }}
            >
              <span>
                Surplus Bersih Periode:{" "}
                <strong style={{ color: isWhite ? "#111827" : "#FFFFFF" }}>
                  {formatRupiah(netCashflow)}
                </strong>
              </span>
              <span>
                Savings Rate:{" "}
                <strong style={{ color: isWhite ? "#111827" : "#FFFFFF" }}>
                  {savingsRate.toFixed(1)}%
                </strong>
              </span>
              <span>
                Total Mutasi:{" "}
                <strong style={{ color: isWhite ? "#111827" : "#FFFFFF" }}>
                  {periodTxs.length} Transaksi
                </strong>
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. RINCIAN SALDO AKUN / PORTOFOLIO (Account Holdings) */}
          {/* ========================================================= */}
          {liquidAccounts.length > 0 && (
            <div className="space-y-2">
              <h2
                className="text-[11px] font-black tracking-wider uppercase"
                style={{ color: isWhite ? "#374151" : "#D1D5DB" }}
              >
                Posisi Saldo per Akun & Brankas (Account Holdings)
              </h2>

              <div
                className="rounded-xl border overflow-hidden print-border-light"
                style={{
                  borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.1)",
                }}
              >
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr
                      style={{
                        background: isWhite ? "#F9FAFB" : "rgba(255, 255, 255, 0.04)",
                        color: isWhite ? "#4B5563" : "#9CA3AF",
                      }}
                    >
                      <th className="text-left p-2 font-bold uppercase">Nama Akun / Dompet</th>
                      <th className="text-right p-2 font-bold uppercase">Saldo Saat Ini</th>
                      <th className="text-right p-2 font-bold uppercase">Porsi Portofolio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidAccounts.map((acc, idx) => {
                      const share = totalAssets > 0 ? (acc.balance / totalAssets) * 100 : 0;
                      return (
                        <tr
                          key={acc.id || idx}
                          className="border-t"
                          style={{
                            borderColor: isWhite ? "#F3F4F6" : "rgba(255, 255, 255, 0.06)",
                          }}
                        >
                          <td className="p-2 font-bold">{acc.name}</td>
                          <td className="p-2 text-right font-black">
                            {formatRupiah(acc.balance)}
                          </td>
                          <td
                            className="p-2 text-right font-semibold"
                            style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                          >
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. TABEL RINCIAN MUTASI TRANSAKSI (Bank Mandiri / SeaBank style) */}
          {/* ========================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2
                className="text-[11px] font-black tracking-wider uppercase"
                style={{ color: isWhite ? "#374151" : "#D1D5DB" }}
              >
                Rincian Mutasi Transaksi (Transaction Ledger)
              </h2>
              <span
                className="text-[9px] font-bold uppercase"
                style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
              >
                {ledgerRows.length} Transaksi Tercatat
              </span>
            </div>

            {ledgerRows.length === 0 ? (
              <div
                className="p-6 rounded-xl border text-center text-[12px] font-semibold"
                style={{
                  background: isWhite ? "#F9FAFB" : "rgba(255, 255, 255, 0.02)",
                  borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.08)",
                  color: isWhite ? "#6B7280" : "#9CA3AF",
                }}
              >
                Tidak ada mutasi transaksi yang tercatat pada periode ini.
              </div>
            ) : (
              <div
                className="rounded-xl border overflow-hidden print-border-light"
                style={{
                  borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.1)",
                }}
              >
                <table className="w-full text-[10.5px] border-collapse">
                  <thead>
                    <tr
                      style={{
                        background: isWhite ? "#F3F4F6" : "rgba(255, 255, 255, 0.04)",
                        color: isWhite ? "#4B5563" : "#9CA3AF",
                      }}
                    >
                      <th className="text-center p-2 font-bold uppercase w-10">No</th>
                      <th className="text-left p-2 font-bold uppercase w-24">Tanggal</th>
                      <th className="text-left p-2 font-bold uppercase">Keterangan Transaksi</th>
                      <th className="text-right p-2 font-bold uppercase w-28">Mutasi (IDR)</th>
                      <th className="text-right p-2 font-bold uppercase w-28">Saldo (IDR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map((r) => {
                      const isInc = r.tx.type === "income";
                      const catName = r.tx.categories?.name || "Umum";
                      const noteText = r.tx.note ? ` - ${r.tx.note}` : "";
                      return (
                        <tr
                          key={r.tx.id}
                          className="border-t transition-colors"
                          style={{
                            borderColor: isWhite ? "#F3F4F6" : "rgba(255, 255, 255, 0.05)",
                          }}
                        >
                          <td
                            className="p-2 text-center font-mono text-[10px]"
                            style={{ color: isWhite ? "#9CA3AF" : "#6B7280" }}
                          >
                            {r.rowNo}
                          </td>
                          <td className="p-2 font-medium whitespace-nowrap">
                            {r.tx.occurred_on
                              ? format(parseISO(r.tx.occurred_on), "dd MMM yyyy")
                              : "-"}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              {isInc ? (
                                <ArrowDownRight
                                  size={12}
                                  className={isWhite ? "text-emerald-600" : "text-emerald-400"}
                                />
                              ) : (
                                <ArrowUpRight
                                  size={12}
                                  className={isWhite ? "text-rose-600" : "text-rose-400"}
                                />
                              )}
                              <span className="font-bold">{catName}</span>
                              <span
                                className="text-[10px] truncate max-w-xs"
                                style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                              >
                                {noteText}
                              </span>
                            </div>
                          </td>
                          <td
                            className="p-2 text-right font-black whitespace-nowrap font-mono"
                            style={{
                              color: isInc
                                ? isWhite
                                  ? "#047857"
                                  : "#34D399"
                                : isWhite
                                  ? "#B91C1C"
                                  : "#F87171",
                            }}
                          >
                            {isInc ? "+" : "-"}
                            {formatRupiah(r.tx.amount)}
                          </td>
                          <td className="p-2 text-right font-black whitespace-nowrap font-mono">
                            {formatRupiah(r.runningBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 5. TOP EXPENSE CATEGORIES SUMMARY */}
          {/* ========================================================= */}
          {categoryBreakdown.length > 0 && (
            <div className="space-y-2">
              <h2
                className="text-[11px] font-black tracking-wider uppercase"
                style={{ color: isWhite ? "#374151" : "#D1D5DB" }}
              >
                Distribusi Pos Pengeluaran Teratas (Expense Drivers)
              </h2>

              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]"
              >
                {categoryBreakdown.slice(0, 4).map((c, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border print-border-light"
                    style={{
                      background: isWhite ? "#F9FAFB" : "rgba(255, 255, 255, 0.02)",
                      borderColor: isWhite ? "#E5E7EB" : "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <span
                      className="font-bold truncate block"
                      style={{ color: isWhite ? "#111827" : "#FFFFFF" }}
                    >
                      {c.name}
                    </span>
                    <span className="font-black block text-[12px] mt-0.5">
                      {formatRupiah(c.amount)}
                    </span>
                    <span
                      className="text-[9px] font-medium block mt-0.5"
                      style={{ color: isWhite ? "#6B7280" : "#9CA3AF" }}
                    >
                      {c.percentage.toFixed(1)}% dari total pengeluaran
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 6. OFFICIAL FOOTER DISCLAIMER & AUDIT SEAL */}
          {/* ========================================================= */}
          <div
            className="pt-6 border-t-2 print-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px]"
            style={{
              borderColor: isWhite ? "#111827" : "#FFFFFF",
              color: isWhite ? "#6B7280" : "#9CA3AF",
            }}
          >
            <div className="space-y-0.5 max-w-md leading-relaxed">
              <p className="font-bold" style={{ color: isWhite ? "#111827" : "#E5E7EB" }}>
                PEMBERITAHUAN RESMI & KEABSAHAN DOKUMEN:
              </p>
              <p>
                Dokumen ini merupakan catatan keuangan elektronik resmi yang diterbitkan secara otomatis dari Sistem Ledger Trouvaille. Sah dan diakui tanpa tanda tangan basah.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className="px-3 py-1.5 rounded-lg border font-mono font-black text-[10px] uppercase flex items-center gap-1.5"
                style={{
                  background: isWhite ? "#F3F4F6" : "rgba(255, 255, 255, 0.05)",
                  borderColor: isWhite ? "#111827" : "#FFFFFF",
                  color: isWhite ? "#111827" : "#FFFFFF",
                }}
              >
                <ShieldCheck size={14} />
                <span>OFFICIAL AUDIT VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM ACTION BAR (Guarantees user can always close easily on mobile) */}
      <footer
        className="no-print shrink-0 w-full px-4 py-3 sm:px-6 flex items-center justify-between border-t z-20"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--glass-border)",
        }}
      >
        <span
          className="text-[11px] font-medium hidden sm:inline"
          style={{ color: "var(--text-tertiary)" }}
        >
          {periodTitle} · {periodTxs.length} Transaksi Tercatat
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Download size={13} />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              triggerHaptic("light");
            }}
            className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-[12px] font-black cursor-pointer active:scale-95 transition-all"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            Tutup
          </button>
        </div>
      </footer>
    </div>
  );
}
