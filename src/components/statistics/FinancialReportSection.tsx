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
  type CALKReport,
} from "../../lib/financialAccounting";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface FinancialReportSectionProps {
  wallets: Wallet[];
  transactions: Transaction[];
  allTransactions?: Transaction[];
  categories: Category[];
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
}

const getSolvencyRatingLabel = (rating: string, isIndonesian: boolean) => {
  if (isIndonesian) {
    switch (rating) {
      case "fortress":
        return "Sangat Kuat";
      case "optimal":
        return "Sehat";
      case "caution":
        return "Waspada";
      case "critical":
        return "Kritis";
      default:
        return rating;
    }
  }
  switch (rating) {
    case "fortress":
      return "Fortress";
    case "optimal":
      return "Optimal";
    case "caution":
      return "Caution";
    case "critical":
      return "Critical";
    default:
      return rating;
  }
};

const getDebtRatingLabel = (rating: string, isIndonesian: boolean) => {
  if (isIndonesian) {
    switch (rating) {
      case "debt-free":
        return "Bebas Utang";
      case "conservative":
        return "Konservatif";
      case "moderate":
        return "Moderat";
      case "elevated":
        return "Tinggi";
      default:
        return rating;
    }
  }
  switch (rating) {
    case "debt-free":
      return "Debt-Free";
    case "conservative":
      return "Conservative";
    case "moderate":
      return "Moderate";
    case "elevated":
      return "Elevated";
    default:
      return rating;
  }
};

const getFreeCashflowRatingLabel = (rating: string, isIndonesian: boolean) => {
  if (isIndonesian) {
    switch (rating) {
      case "superior":
        return "Prima";
      case "healthy":
        return "Sehat";
      case "tight":
        return "Ketat";
      case "deficit":
        return "Defisit";
      default:
        return rating;
    }
  }
  switch (rating) {
    case "superior":
      return "Superior";
    case "healthy":
      return "Healthy";
    case "tight":
      return "Tight";
    case "deficit":
      return "Deficit";
    default:
      return rating;
  }
};

const getSolvencyDescription = (calk: CALKReport, isIndonesian: boolean) => {
  if (!isIndonesian) return calk.solvencyDescription;
  if (calk.solvencyRunwayRating === "fortress") {
    return `Likuiditas sangat kokoh: Cadangan kas Anda menopang ${calk.solvencyRunwayMonths} bulan pengeluaran operasional tanpa memerlukan pemasukan tambahan.`;
  }
  if (calk.solvencyRunwayRating === "optimal") {
    return `Likuiditas sehat: Cadangan kas menopang ${calk.solvencyRunwayMonths} bulan biaya hidup, memenuhi batas aman rekomendasi 3–6 bulan.`;
  }
  if (calk.solvencyRunwayRating === "caution") {
    return `Cadangan kas ketat: Ketahanan kas Anda ${calk.solvencyRunwayMonths} bulan. Disarankan memperbesar bantalan dana darurat untuk mengantisipasi risiko tak terduga.`;
  }
  return `Likuiditas kritis: Ketahanan kas di bawah 1 bulan (${calk.solvencyRunwayMonths} bln). Alokasi segera ke cadangan kas likuid darurat sangat disarankan.`;
};

const getDebtDescription = (calk: CALKReport, isIndonesian: boolean) => {
  if (!isIndonesian) return calk.debtDescription;
  if (calk.debtRating === "debt-free") {
    return "Neraca murni: Bebas liabilitas atau pinjaman berjalan. Seluruh aset merupakan 100% ekuitas bersih.";
  }
  if (calk.debtRating === "conservative") {
    return `Leverage konservatif: Liabilitas hanya menyumbang ${calk.debtToAssetRatioPct}% dari total aset, berada dalam batas aman solvabilitas.`;
  }
  if (calk.debtRating === "moderate") {
    return `Leverage moderat: Utang mencapai ${calk.debtToAssetRatioPct}% dari nilai aset. Beban cicilan perlu terus dipantau secara berkala.`;
  }
  return `Beban utang tinggi: Liabilitas mencapai ${calk.debtToAssetRatioPct}% dari total aset. Prioritaskan percepatan pengurangan pokok pinjaman.`;
};

const getFreeCashflowDescription = (calk: CALKReport, isIndonesian: boolean) => {
  if (!isIndonesian) return calk.freeCashflowDescription;
  if (calk.freeCashflowRating === "superior") {
    return `Laju tabungan prima: Anda mempertahankan ${calk.freeCashflowRatePct}% pemasukan sebagai surplus arus kas operasional.`;
  }
  if (calk.freeCashflowRating === "healthy") {
    return `Akumulasi sehat: Rasio kas tersisa sebesar ${calk.freeCashflowRatePct}%, mendorong pertumbuhan modal secara konsisten.`;
  }
  if (calk.freeCashflowRating === "tight") {
    return `Margin ketat: Surplus kas tersisa sebesar ${calk.freeCashflowRatePct}%. Penekanan belanja diskresioner akan meningkatkan tabungan.`;
  }
  return `Defisit operasional: Arus kas keluar melampaui pemasukan periode ini sebesar ${Math.abs(calk.freeCashflowRatePct)}%.`;
};

const getReconciliationNotes = (calk: CALKReport, isIndonesian: boolean) => {
  if (!isIndonesian) return calk.reconciliation.notes;
  if (calk.reconciliation.assetsEqualLiabilitiesPlusEquity) {
    return "Seluruh pos neraca telah terekonsiliasi sempurna dengan selisih Rp 0 terhadap total aset tercatat sesuai standar prinsip akuntansi.";
  }
  return `Perhatian: Terdeteksi diskrepansi sebesar ${formatRupiah(Math.abs(calk.reconciliation.discrepancyAmount))} antara Total Aset dan Liabilitas + Ekuitas.`;
};

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
  const { isIndonesian } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Section collapse toggles (default folded for clean luxury presentation)
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [liabilitiesOpen, setLiabilitiesOpen] = useState(false);
  const [equityOpen, setEquityOpen] = useState(false);
  const [operatingOpen, setOperatingOpen] = useState(false);
  const [investingOpen, setInvestingOpen] = useState(false);
  const [financingOpen, setFinancingOpen] = useState(false);

  const report: FinancialReportPackage = useMemo(() => {
    return generateFinancialReportPackage(wallets, transactions, categories, {
      startDate,
      endDate,
      periodLabel,
      allTransactions,
    });
  }, [
    wallets,
    transactions,
    allTransactions,
    categories,
    startDate,
    endDate,
    periodLabel,
  ]);

  const { balanceSheet, cashFlow, calk } = report;

  const handleCopySummary = () => {
    triggerHaptic("medium");
    const summaryText = isIndonesian
      ? `
=== LAPORAN KEUANGAN TROUVAILLE ===
Periode: ${periodLabel}
Tanggal Dibuat: ${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}

--- 1. LAPORAN POSISI KEUANGAN (NERACA) ---
* ASET:
  - Aset Likuid (Kas & Bank): ${formatRupiah(balanceSheet.liquidAssets.total)}
  - Portofolio Investasi: ${formatRupiah(balanceSheet.investmentAssets.total)}
  - Piutang Tertunda: ${formatRupiah(balanceSheet.receivableAssets.total)}
  TOTAL ASET: ${formatRupiah(balanceSheet.totalAssets)}

* LIABILITAS:
  - Jangka Pendek (Kartu Kredit & PayLater): ${formatRupiah(balanceSheet.currentLiabilities.total)}
  - Jangka Panjang (Pinjaman & Cicilan): ${formatRupiah(balanceSheet.longTermLiabilities.total)}
  TOTAL LIABILITAS: ${formatRupiah(balanceSheet.totalLiabilities)}

* EKUITAS:
  KEKAYAAN BERSIH: ${formatRupiah(balanceSheet.netWorth)}
  Status Keseimbangan: ${balanceSheet.isBalanced ? "SEIMBANG (Aset = Liabilitas + Ekuitas)" : "DISKREPANSI TERDETEKSI"}

--- 2. LAPORAN ARUS KAS ---
* Arus Kas Operasional (OCF):
  - Masuk: ${formatRupiah(cashFlow.operatingInflow)}
  - Keluar: ${formatRupiah(cashFlow.operatingOutflow)}
  - Bersih OCF: ${formatRupiah(cashFlow.netOperatingCashFlow)}
* Arus Kas Investasi (ICF):
  - Masuk: ${formatRupiah(cashFlow.investingInflow)}
  - Keluar: ${formatRupiah(cashFlow.investingOutflow)}
  - Bersih ICF: ${formatRupiah(cashFlow.netInvestingCashFlow)}
* Arus Kas Pendanaan (FCF):
  - Masuk: ${formatRupiah(cashFlow.financingInflow)}
  - Keluar: ${formatRupiah(cashFlow.financingOutflow)}
  - Bersih FCF: ${formatRupiah(cashFlow.netFinancingCashFlow)}
PERGERAKAN KAS BERSIH: ${formatRupiah(cashFlow.netCashFlow)}

--- 3. CATATAN ATAS LAPORAN KEUANGAN (CALK) ---
* Ketahanan Kas: ${calk.solvencyRunwayMonths} bulan (${getSolvencyRatingLabel(calk.solvencyRunwayRating, true)})
* Rasio Utang terhadap Aset (DAR): ${calk.debtToAssetRatioPct}% (${getDebtRatingLabel(calk.debtRating, true)})
* Tingkat Arus Kas Bebas: ${calk.freeCashflowRatePct}% (${getFreeCashflowRatingLabel(calk.freeCashflowRating, true)})
* Status Audit: ${balanceSheet.isBalanced ? "Terekonsiliasi Penuh" : "Perlu Ditinjau"}
      `.trim()
      : `
=== TROUVAILLE FINANCIAL REPORT ===
Period: ${periodLabel}
Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}

--- 1. STATEMENT OF FINANCIAL POSITION (BALANCE SHEET) ---
* ASSETS:
  - Liquid Assets (Cash & Bank): ${formatRupiah(balanceSheet.liquidAssets.total)}
  - Investment Portfolio: ${formatRupiah(balanceSheet.investmentAssets.total)}
  - Receivables: ${formatRupiah(balanceSheet.receivableAssets.total)}
  TOTAL ASSETS: ${formatRupiah(balanceSheet.totalAssets)}

* LIABILITIES:
  - Current (Credit Cards & PayLater): ${formatRupiah(balanceSheet.currentLiabilities.total)}
  - Long-Term Debt & Loans: ${formatRupiah(balanceSheet.longTermLiabilities.total)}
  TOTAL LIABILITIES: ${formatRupiah(balanceSheet.totalLiabilities)}

* EQUITY:
  NET WORTH: ${formatRupiah(balanceSheet.netWorth)}
  Balance Status: ${balanceSheet.isBalanced ? "BALANCED (Assets = Liabilities + Equity)" : "DISCREPANCY DETECTED"}

--- 2. STATEMENT OF CASH FLOWS ---
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

--- 3. NOTES TO FINANCIAL STATEMENTS (DISCLOSURES) ---
* Solvency Runway: ${calk.solvencyRunwayMonths} months (${getSolvencyRatingLabel(calk.solvencyRunwayRating, false)})
* Debt-to-Asset Ratio: ${calk.debtToAssetRatioPct}% (${getDebtRatingLabel(calk.debtRating, false)})
* Free Cash Flow Rate: ${calk.freeCashflowRatePct}% (${getFreeCashflowRatingLabel(calk.freeCashflowRating, false)})
* Audit Status: ${balanceSheet.isBalanced ? "Fully Reconciled" : "Discrepancy Under Review"}
      `.trim();

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      showToast(
        isIndonesian
          ? "Laporan keuangan berhasil disalin ke clipboard"
          : "Financial statement copied to clipboard",
        "update",
        () => {},
      );
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Executive Accounting Header Hero */}
      <section
        className="glass-card p-4 sm:p-5 rounded-[24px] relative overflow-hidden space-y-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "Laporan" : "Statements"} • {periodLabel}
              </span>
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                {isIndonesian ? "Terverifikasi SAK" : "IFRS Verified"}
              </span>
            </div>
            <h2
              className="text-[20px] sm:text-[22px] font-semibold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Laporan Keuangan" : "Financial Report"}
            </h2>
            <p
              className="text-[11px] font-medium truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {isIndonesian
                ? "Neraca Posisi Keuangan, Arus Kas & Catatan Pengungkapan"
                : "Balance Sheet, Cash Flows & Disclosures"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all cursor-pointer shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {copied ? (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>{isIndonesian ? "Tersalin" : "Copied"}</span>
              </>
            ) : (
              <>
                <Copy size={12} strokeWidth={1.75} />
                <span>{isIndonesian ? "Ekspor" : "Export"}</span>
              </>
            )}
          </button>
        </div>

        {/* Status Keseimbangan Neraca (Strictly 1 Baris) */}
        <div
          className="pt-2.5 border-t flex items-center justify-between gap-2"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            <ShieldCheck size={13} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">
              {balanceSheet.isBalanced
                ? isIndonesian
                  ? "Aset = Liabilitas + Ekuitas"
                  : "Assets = Liabilities + Equity"
                : isIndonesian
                  ? "Diskrepansi Akuntansi Terdeteksi"
                  : "Accounting Discrepancy Detected"}
            </span>
          </div>

          <div
            className="text-[10.5px] font-semibold whitespace-nowrap shrink-0 tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Selisih" : "Discrepancy"}: {formatRupiah(balanceSheet.discrepancy)}
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* CONTAINER 1: STATEMENT OF FINANCIAL POSITION (BALANCE SHEET) */}
      {/* ====================================================================== */}
      <section
        className="p-4 sm:p-5 rounded-[24px] glass-card space-y-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header: Judul, Subjudul & Badge Kanan Strictly 1 Baris */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <Scale size={15} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3
                className="text-[13px] font-semibold tracking-tight leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "1. Laporan Posisi Keuangan (Neraca)"
                  : "1. Statement of Financial Position"}
              </h3>
              <p
                className="text-[11px] mt-0.5 leading-tight truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Struktur aset, liabilitas & ekuitas bersih"
                  : "Asset structure, liabilities & net worth equity"}
              </p>
            </div>
          </div>
          {/* Badge Kanan 1 Baris */}
          <span
            className="whitespace-nowrap shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {isIndonesian ? "Terverifikasi" : "Verified"}
          </span>
        </div>

        {/* 3-Col KPI Bento */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Total Aset" : "Total Assets"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(balanceSheet.totalAssets)}
            </span>
          </div>
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Total Liabilitas" : "Total Liabilities"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatRupiah(balanceSheet.totalLiabilities)}
            </span>
          </div>
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Kekayaan Bersih" : "Net Worth"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(balanceSheet.netWorth)}
            </span>
          </div>
        </div>

        {/* Baris Accordion Terpadu */}
        <div className="space-y-2 pt-1">
          {/* Accordion 1: Assets Breakdown */}
          <div
            className="rounded-xl overflow-hidden border transition-colors"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAssetsOpen(!assetsOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Layers size={13} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-[12.5px] font-bold truncate leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Rincian Aset" : "Assets Breakdown"}
                  </h4>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Kas/Bank: ${formatRupiah(balanceSheet.liquidAssets.total)} • Investasi: ${formatRupiah(balanceSheet.investmentAssets.total)} • Piutang: ${formatRupiah(balanceSheet.receivableAssets.total)}`
                      : `Liquid: ${formatRupiah(balanceSheet.liquidAssets.total)} • Inv: ${formatRupiah(balanceSheet.investmentAssets.total)} • Rec: ${formatRupiah(balanceSheet.receivableAssets.total)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="amount text-[12px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(balanceSheet.totalAssets)}
                </span>
                <motion.div
                  animate={{ rotate: assetsOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={15} />
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
                  className="border-t p-3 space-y-3"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {/* Liquid Assets Sub-group */}
                  <div>
                    <div
                      className="flex items-center justify-between mb-1 pb-1 border-b px-1"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <span
                        className="text-[11.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Aset Likuid (Kas & Bank)" : "Liquid Assets (Cash & Bank)"}
                      </span>
                      <span
                        className="amount text-[11.5px] font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.liquidAssets.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.liquidAssets.items.length === 0 ? (
                        <p
                          className="text-[11px] px-2 py-1 font-normal"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian
                            ? "Belum ada akun kas & bank tercatat."
                            : "No liquid accounts recorded."}
                        </p>
                      ) : (
                        balanceSheet.liquidAssets.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                            style={{ borderColor: "var(--glass-border)" }}
                          >
                            <span
                              className="text-[11.5px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="text-[10.5px] tabular-nums"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                              <span
                                className="amount text-[11.5px] font-normal tabular-nums"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Investment Portfolio Sub-group */}
                  <div>
                    <div
                      className="flex items-center justify-between mb-1 pb-1 border-b px-1"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <span
                        className="text-[11.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Portofolio Investasi" : "Investment Portfolio"}
                      </span>
                      <span
                        className="amount text-[11.5px] font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.investmentAssets.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.investmentAssets.items.length === 0 ? (
                        <p
                          className="text-[11px] px-2 py-1 font-normal"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian
                            ? "Belum ada portofolio investasi tercatat."
                            : "No investment assets recorded."}
                        </p>
                      ) : (
                        balanceSheet.investmentAssets.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                            style={{ borderColor: "var(--glass-border)" }}
                          >
                            <span
                              className="text-[11.5px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="text-[10.5px] tabular-nums"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                              <span
                                className="amount text-[11.5px] font-normal tabular-nums"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Receivables Sub-group */}
                  <div>
                    <div
                      className="flex items-center justify-between mb-1 pb-1 border-b px-1"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <span
                        className="text-[11.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Piutang Tertunda" : "Receivables"}
                      </span>
                      <span
                        className="amount text-[11.5px] font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.receivableAssets.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.receivableAssets.items.length === 0 ? (
                        <p
                          className="text-[11px] px-2 py-1 font-normal"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian
                            ? "Belum ada piutang aktif tercatat."
                            : "No active receivables recorded."}
                        </p>
                      ) : (
                        balanceSheet.receivableAssets.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                            style={{ borderColor: "var(--glass-border)" }}
                          >
                            <span
                              className="text-[11.5px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="text-[10.5px] tabular-nums"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                              <span
                                className="amount text-[11.5px] font-normal tabular-nums"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
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

          {/* Accordion 2: Liabilities Breakdown */}
          <div
            className="rounded-xl overflow-hidden border transition-colors"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setLiabilitiesOpen(!liabilitiesOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Building2 size={13} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-[12.5px] font-bold truncate leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Rincian Liabilitas" : "Liabilities Breakdown"}
                  </h4>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Jangka Pendek: ${formatRupiah(balanceSheet.currentLiabilities.total)} • Jangka Panjang: ${formatRupiah(balanceSheet.longTermLiabilities.total)}`
                      : `Current: ${formatRupiah(balanceSheet.currentLiabilities.total)} • Long-Term: ${formatRupiah(balanceSheet.longTermLiabilities.total)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="amount text-[12px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatRupiah(balanceSheet.totalLiabilities)}
                </span>
                <motion.div
                  animate={{ rotate: liabilitiesOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={15} />
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
                  className="border-t p-3 space-y-3"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {/* Current Liabilities */}
                  <div>
                    <div
                      className="flex items-center justify-between mb-1 pb-1 border-b px-1"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <span
                        className="text-[11.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Liabilitas Jangka Pendek (Utang Lancar)" : "Current Liabilities"}
                      </span>
                      <span
                        className="amount text-[11.5px] font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.currentLiabilities.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.currentLiabilities.items.length === 0 ? (
                        <p
                          className="text-[11px] px-2 py-1 font-normal"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian
                            ? "Tidak ada utang lancar atau tagihan kartu tercatat."
                            : "No short-term liabilities or credit debt recorded."}
                        </p>
                      ) : (
                        balanceSheet.currentLiabilities.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                            style={{ borderColor: "var(--glass-border)" }}
                          >
                            <span
                              className="text-[11.5px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="text-[10.5px] tabular-nums"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                              <span
                                className="amount text-[11.5px] font-normal tabular-nums"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Long-Term Debt */}
                  <div>
                    <div
                      className="flex items-center justify-between mb-1 pb-1 border-b px-1"
                      style={{ borderColor: "var(--glass-border)" }}
                    >
                      <span
                        className="text-[11.5px] font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Liabilitas Jangka Panjang" : "Long-Term Debt"}
                      </span>
                      <span
                        className="amount text-[11.5px] font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(balanceSheet.longTermLiabilities.total)}
                      </span>
                    </div>
                    <div>
                      {balanceSheet.longTermLiabilities.items.length === 0 ? (
                        <p
                          className="text-[11px] px-2 py-1 font-normal"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian
                            ? "Tidak ada pinjaman jangka panjang tercatat."
                            : "No long-term loans or mortgage liabilities recorded."}
                        </p>
                      ) : (
                        balanceSheet.longTermLiabilities.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                            style={{ borderColor: "var(--glass-border)" }}
                          >
                            <span
                              className="text-[11.5px] font-normal tracking-tight"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {it.name}
                            </span>
                            <div className="text-right flex items-baseline gap-2.5">
                              <span
                                className="text-[10.5px] tabular-nums"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {it.percentageOfTotal.toFixed(1)}%
                              </span>
                              <span
                                className="amount text-[11.5px] font-normal tabular-nums"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatRupiah(it.balance)}
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

          {/* Accordion 3: Equity & Capital Structure */}
          <div
            className="rounded-xl overflow-hidden border transition-colors"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setEquityOpen(!equityOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <ShieldCheck size={13} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-[12.5px] font-bold truncate leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Struktur Modal & Ekuitas" : "Equity & Capital Structure"}
                  </h4>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Solvabilitas: ${balanceSheet.totalAssets > 0 ? ((balanceSheet.netWorth / balanceSheet.totalAssets) * 100).toFixed(1) + "%" : "100%"} • Kekayaan Bersih`
                      : `Solvency: ${balanceSheet.totalAssets > 0 ? ((balanceSheet.netWorth / balanceSheet.totalAssets) * 100).toFixed(1) + "%" : "100%"} • Net Worth`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="amount text-[12px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(balanceSheet.netWorth)}
                </span>
                <motion.div
                  animate={{ rotate: equityOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={15} />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {equityOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t p-3 space-y-2 text-[11px]"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  <div
                    className="flex items-center justify-between py-1 border-b"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {isIndonesian ? "Total Modal Ekuitas Bersih" : "Total Net Worth Equity"}
                    </span>
                    <span
                      className="amount font-bold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatRupiah(balanceSheet.netWorth)}
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between py-1 border-b"
                    style={{ borderColor: "var(--glass-border)" }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {isIndonesian
                        ? "Rasio Solvabilitas (Aset terhadap Utang)"
                        : "Solvency Ratio (Assets to Debt)"}
                    </span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {balanceSheet.totalLiabilities > 0
                        ? `${((balanceSheet.netWorth / balanceSheet.totalAssets) * 100).toFixed(1)}% (${isIndonesian ? "Sangat Kuat" : "Very Strong"})`
                        : isIndonesian
                          ? "100.0% (Bebas Liabilitas)"
                          : "100.0% (Debt-Free)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {isIndonesian ? "Status Keseimbangan Neraca" : "Balance Sheet Status"}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {balanceSheet.isBalanced
                        ? isIndonesian
                          ? "100% Seimbang (Selisih Rp 0)"
                          : "100% Balanced (Zero Discrepancy)"
                        : isIndonesian
                          ? `Selisih: ${formatRupiah(balanceSheet.discrepancy)}`
                          : `Discrepancy: ${formatRupiah(balanceSheet.discrepancy)}`}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* CONTAINER 2: STATEMENT OF CASH FLOWS (3 CORE ACTIVITIES) */}
      {/* ====================================================================== */}
      <section
        className="p-4 sm:p-5 rounded-[24px] glass-card space-y-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header: Judul, Subjudul & Nilai Bersih Kas Strictly 1 Baris */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <TrendingUp size={15} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3
                className="text-[13px] font-semibold tracking-tight leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "2. Laporan Arus Kas" : "2. Statement of Cash Flows"}
              </h3>
              <p
                className="text-[11px] mt-0.5 leading-tight truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Rekonsiliasi kas 3 aktivitas utama"
                  : "Cash reconciliation across 3 core activities"}
              </p>
            </div>
          </div>
          {/* Badge Kanan Net Kas 1 Baris */}
          <span
            className="whitespace-nowrap shrink-0 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full tabular-nums"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {cashFlow.netCashFlow >= 0 ? "+" : ""}
            {formatRupiah(cashFlow.netCashFlow)}
          </span>
        </div>

        {/* 3-Col KPI Bento */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Operasional (OCF)" : "Operating (OCF)"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {cashFlow.netOperatingCashFlow >= 0 ? "+" : ""}
              {formatRupiah(cashFlow.netOperatingCashFlow)}
            </span>
          </div>
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Investasi (ICF)" : "Investing (ICF)"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {cashFlow.netInvestingCashFlow >= 0 ? "+" : ""}
              {formatRupiah(cashFlow.netInvestingCashFlow)}
            </span>
          </div>
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Pendanaan (FCF)" : "Financing (FCF)"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {cashFlow.netFinancingCashFlow >= 0 ? "+" : ""}
              {formatRupiah(cashFlow.netFinancingCashFlow)}
            </span>
          </div>
        </div>

        {/* Ringkasan Perputaran Kas Bruto */}
        <div
          className="px-3 py-2 rounded-xl border flex items-center justify-between text-[11px]"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Perputaran Kas Bruto" : "Gross Turnover"}
          </span>
          <div className="flex items-center gap-3 tabular-nums">
            <span style={{ color: "var(--text-secondary)" }}>
              {isIndonesian ? "Masuk" : "In"}:{" "}
              <span style={{ color: "var(--text-primary)" }}>
                {formatRupiah(cashFlow.totalInflow)}
              </span>
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {isIndonesian ? "Keluar" : "Out"}:{" "}
              <span style={{ color: "var(--text-primary)" }}>
                {formatRupiah(cashFlow.totalOutflow)}
              </span>
            </span>
          </div>
        </div>

        {/* Baris Accordion Terpadu */}
        <div className="space-y-2 pt-1">
          {/* 1. Aktivitas Operasional Accordion */}
          <div
            className="rounded-xl overflow-hidden border transition-colors"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOperatingOpen(!operatingOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <TrendingUp size={13} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-[12.5px] font-bold truncate leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "1. Aktivitas Operasional (OCF)" : "1. Operating Activities (OCF)"}
                  </h4>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Masuk: ${formatRupiah(cashFlow.operatingInflow)} • Keluar: ${formatRupiah(cashFlow.operatingOutflow)}`
                      : `Inflow: ${formatRupiah(cashFlow.operatingInflow)} • Outflow: ${formatRupiah(cashFlow.operatingOutflow)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="amount text-[12px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap"
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
                  <ChevronDown size={15} />
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
                  className="border-t p-3 space-y-1.5"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {cashFlow.operatingItems.length === 0 ? (
                    <p
                      className="text-[11px] px-1 py-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian
                        ? "Tidak ada transaksi operasional pada periode ini."
                        : "No operating transactions recorded in this period."}
                    </p>
                  ) : (
                    cashFlow.operatingItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                        style={{ borderColor: "var(--glass-border)" }}
                      >
                        <div className="min-w-0">
                          <span
                            className="text-[11.5px] font-normal tracking-tight truncate block"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {it.name}
                          </span>
                          <span
                            className="text-[10px] tabular-nums"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {it.txCount} {isIndonesian ? "transaksi" : "tx"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className="amount text-[11.5px] font-normal tabular-nums"
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

          {/* 2. Aktivitas Investasi Accordion */}
          <div
            className="rounded-xl overflow-hidden border transition-colors"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setInvestingOpen(!investingOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Layers size={13} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-[12.5px] font-bold truncate leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "2. Aktivitas Investasi (ICF)" : "2. Investing Activities (ICF)"}
                  </h4>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Masuk: ${formatRupiah(cashFlow.investingInflow)} • Keluar: ${formatRupiah(cashFlow.investingOutflow)}`
                      : `In: ${formatRupiah(cashFlow.investingInflow)} • Out: ${formatRupiah(cashFlow.investingOutflow)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="amount text-[12px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {cashFlow.netInvestingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netInvestingCashFlow)}
                </span>
                <motion.div
                  animate={{ rotate: investingOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={15} />
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
                  className="border-t p-3 space-y-1.5"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {cashFlow.investingItems.length === 0 ? (
                    <p
                      className="text-[11px] px-1 py-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian
                        ? "Tidak ada pergerakan investasi pada periode ini."
                        : "No capital or investment movements recorded in this period."}
                    </p>
                  ) : (
                    cashFlow.investingItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                        style={{ borderColor: "var(--glass-border)" }}
                      >
                        <span
                          className="text-[11.5px] font-normal tracking-tight truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {it.name}
                        </span>
                        <span
                          className="amount text-[11.5px] font-normal tabular-nums shrink-0"
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

          {/* 3. Aktivitas Pendanaan Accordion */}
          <div
            className="rounded-xl overflow-hidden border transition-colors"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFinancingOpen(!financingOpen);
                triggerHaptic("light");
              }}
              className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Building2 size={13} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-[12.5px] font-bold truncate leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "3. Aktivitas Pendanaan (FCF)" : "3. Financing Activities (FCF)"}
                  </h4>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Masuk: ${formatRupiah(cashFlow.financingInflow)} • Keluar: ${formatRupiah(cashFlow.financingOutflow)}`
                      : `In: ${formatRupiah(cashFlow.financingInflow)} • Out: ${formatRupiah(cashFlow.financingOutflow)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="amount text-[12px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {cashFlow.netFinancingCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(cashFlow.netFinancingCashFlow)}
                </span>
                <motion.div
                  animate={{ rotate: financingOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ChevronDown size={15} />
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
                  className="border-t p-3 space-y-1.5"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {cashFlow.financingItems.length === 0 ? (
                    <p
                      className="text-[11px] px-1 py-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian
                        ? "Tidak ada mutasi pinjaman atau pembiayaan pada periode ini."
                        : "No loan disbursements or debt repayments in this period."}
                    </p>
                  ) : (
                    cashFlow.financingItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-1.5 pl-2 pr-1 border-b last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                        style={{ borderColor: "var(--glass-border)" }}
                      >
                        <span
                          className="text-[11.5px] font-normal tracking-tight truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {it.name}
                        </span>
                        <span
                          className="amount text-[11.5px] font-normal tabular-nums shrink-0"
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
      </section>

      {/* ====================================================================== */}
      {/* CONTAINER 3: NOTES TO FINANCIAL STATEMENTS (CALK & DISCLOSURES) */}
      {/* ====================================================================== */}
      <section
        className="p-4 sm:p-5 rounded-[24px] glass-card space-y-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header: Judul, Subjudul & Badge Pengungkapan Strictly 1 Baris */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <FileSpreadsheet size={15} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3
                className="text-[13px] font-semibold tracking-tight leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "3. Catatan atas Laporan Keuangan (CaLK)"
                  : "3. Notes to Financial Statements"}
              </h3>
              <p
                className="text-[11px] mt-0.5 leading-tight truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Pengungkapan & catatan kaki"
                  : "Disclosures & explanatory footnotes"}
              </p>
            </div>
          </div>
          {/* Badge Kanan 1 Baris */}
          <span
            className="whitespace-nowrap shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {isIndonesian ? "Pengungkapan" : "Disclosures"}
          </span>
        </div>

        {/* 3-Col KPI Bento */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Ketahanan Kas" : "Solvency Runway"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {calk.solvencyRunwayMonths}{" "}
              <span className="text-[10px] font-normal">
                {isIndonesian ? "bln" : "mo"}
              </span>
            </span>
            <span
              className="text-[9px] block mt-0.5 font-medium truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {getSolvencyRatingLabel(calk.solvencyRunwayRating, isIndonesian)}
            </span>
          </div>
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Rasio Utang (DAR)" : "Debt-to-Asset"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {calk.debtToAssetRatioPct}%
            </span>
            <span
              className="text-[9px] block mt-0.5 font-medium truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {getDebtRatingLabel(calk.debtRating, isIndonesian)}
            </span>
          </div>
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              className="text-[9px] uppercase font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Arus Kas Bebas" : "Free Cashflow"}
            </span>
            <span
              className="amount text-[12.5px] sm:text-[13.5px] font-bold mt-0.5 block truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {calk.freeCashflowRatePct}%
            </span>
            <span
              className="text-[9px] block mt-0.5 font-medium truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {getFreeCashflowRatingLabel(calk.freeCashflowRating, isIndonesian)}
            </span>
          </div>
        </div>

        {/* 5 CATATAN DETAIL LENGKAP */}
        <div className="space-y-3 pt-1">
          {/* Kotak 1: Catatan Naratif 1, 2, 3 */}
          <div
            className="p-3.5 sm:p-4 rounded-[20px] border space-y-3"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            {/* Catatan 1 */}
            <div className="space-y-1">
              <h4
                className="text-[12px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Catatan 1: Penilaian Solvabilitas"
                  : "Note 1: Solvency Assessment"}
              </h4>
              <p
                className="text-[11.5px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {getSolvencyDescription(calk, isIndonesian)}
              </p>
            </div>

            {/* Catatan 2 */}
            <div
              className="space-y-1 pt-2.5 border-t"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <h4
                className="text-[12px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Catatan 2: Struktur Modal & Leverage"
                  : "Note 2: Capital Structure & Leverage"}
              </h4>
              <p
                className="text-[11.5px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {getDebtDescription(calk, isIndonesian)}
              </p>
            </div>

            {/* Catatan 3 */}
            <div
              className="space-y-1 pt-2.5 border-t"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <h4
                className="text-[12px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Catatan 3: Retensi & Surplus Arus Kas"
                  : "Note 3: Operating Retention & Surplus"}
              </h4>
              <p
                className="text-[11.5px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {getFreeCashflowDescription(calk, isIndonesian)}
              </p>
            </div>
          </div>

          {/* Kotak 2: Catatan 4 Pengungkapan Mutasi Transaksi Material */}
          <div
            className="p-3.5 sm:p-4 rounded-[20px] border space-y-2.5"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div>
              <h4
                className="text-[12px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Catatan 4: Pengungkapan Transaksi Material (≥ 15% Belanja)"
                  : "Note 4: Material Transactions Disclosure (≥ 15% Outflow)"}
              </h4>
              <p
                className="text-[11px] mt-0.5 leading-snug"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? "Transparansi akuntansi untuk transaksi bernilai signifikan terhadap arus kas keluar periode ini."
                  : "Accounting transparency for significant individual expenditures influencing period cash flow."}
              </p>
            </div>

            <div className="space-y-1.5">
              {calk.materialTransactions.length === 0 ? (
                <div
                  className="p-3 rounded-xl text-[11px]"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isIndonesian
                    ? "Tidak ada transaksi individual yang melebihi 15% dari total pengeluaran periode ini. Distribusi belanja berlangsung rutin."
                    : "No single transaction exceeded 15% of total period expenses. Expenditure remained routinely distributed."}
                </div>
              ) : (
                calk.materialTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2"
                    style={{
                      background: "var(--glass-fill)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-[12px] sm:text-[12.5px] font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tx.note || (isIndonesian ? "Transaksi" : "Transaction")}
                      </div>
                      <div
                        className="text-[10px] sm:text-[10.5px] mt-0.5 truncate"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {tx.categoryName} • {tx.date}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="amount text-[12px] sm:text-[12.5px] font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatRupiah(tx.amount)}
                      </div>
                      <div
                        className="text-[10px] sm:text-[10.5px] font-medium mt-0.5 tabular-nums"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {tx.percentageOfTotalExpense.toFixed(1)}%{" "}
                        {isIndonesian ? "dari total belanja" : "of total spend"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kotak 3: Catatan 5 Integritas Standar & Status Rekonsiliasi Audit */}
          <div
            className="p-3.5 sm:p-4 rounded-[20px] border space-y-1.5"
            style={{
              background: "var(--glass-fill)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={15}
                strokeWidth={2}
                style={{
                  color: calk.reconciliation.assetsEqualLiabilitiesPlusEquity
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                }}
                className="shrink-0"
              />
              <h4
                className="text-[12px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian
                  ? "Catatan 5: Integritas Standar & Status Rekonsiliasi Audit"
                  : "Note 5: Standard Integrity & Audit Status"}
              </h4>
            </div>
            <p
              className="text-[11.5px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {getReconciliationNotes(calk, isIndonesian)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
