// ======================================================================
// TROUVAILLE STATEMENT IMPORT MODAL v2.2 — Production Grade Edition
// Supports: CSV, Excel (.xlsx), PDF Mutasi, Paste Text
// Features:
// - Privacy-first 100% on-device processing
// - Quote-safe PapaParse integration
// - Smart column auto-detection with data-row heuristics
// - Interactive column confirmation step
// - Chunked batch ingestion (50 tx/chunk) via useBatchAddTransactions
// - Review controls: toggle Type (Masuk/Keluar/Transfer) & set Destination Wallet
// - Hide/Show duplicate filter toggle chip
// - Full active ledger (SpaceContext) integration
// Strictly compliant with GEMINI.md: Monochrome luxury, lucide-react only,
// 100% pure localization (isIndonesian), no artificial height caps.
// ======================================================================

import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileSpreadsheet,
  Clipboard,
  Check,
  CheckSquare,
  Square,
  CreditCard,
  Tag,
  ChevronDown,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  Table2,
  FileType,
  ArrowLeftRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { parseStatementText, type ParsedStatementItem, type StatementFormat } from "../../lib/statementParser";
import { detectColumns, columnRoleLabel, type DetectedColumnMap, type ColumnRole } from "../../lib/csvColumnDetector";
import { parseDelimitedText } from "../../lib/csvParser";
import { useWallets } from "../../hooks/useWallets";
import { useCategories } from "../../hooks/useCategories";
import { useAllTransactions, useBatchAddTransactions } from "../../hooks/useTransactions";
import { useSpace } from "../../contexts/SpaceContext";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import type { Category, TransactionType, Wallet } from "../../lib/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = "input" | "column_map" | "review" | "importing";
type ImportMethod = "csv" | "excel" | "pdf" | "paste";

interface ColumnAssignment {
  roles: ColumnRole[];
  userModified: boolean;
}

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------

const FORMAT_LABELS: Record<StatementFormat, string> = {
  bca: "BCA E-Statement / Mutasi",
  mandiri: "Mandiri Livin Mutasi",
  jenius: "Jenius BTPN Statement",
  gopay: "GoPay CSV",
  seabank: "SeaBank Mutasi",
  ovo: "OVO CSV",
  dana: "DANA CSV",
  bri: "BRI BRImo Mutasi",
  bni: "BNI wondr Mutasi",
  permata: "PermataNet Mutasi",
  cimb: "CIMB OCTO Mutasi",
  shopeepay: "ShopeePay CSV",
  generic_csv: "CSV / TSV",
  generic_pdf: "PDF Mutasi Bank",
};

const ALL_COLUMN_ROLES: ColumnRole[] = [
  "date",
  "description",
  "debit",
  "credit",
  "amount",
  "type",
  "balance",
  "ignore",
];

// Helper — build ColumnAssignment from DetectedColumnMap
function buildColumnAssignment(map: DetectedColumnMap, headerCount: number): ColumnAssignment {
  const roles: ColumnRole[] = Array(headerCount).fill("ignore");
  if (map.dateCol >= 0 && map.dateCol < headerCount) roles[map.dateCol] = "date";
  if (map.descCol >= 0 && map.descCol < headerCount) roles[map.descCol] = "description";
  if (map.debitCol !== null && map.debitCol < headerCount) roles[map.debitCol] = "debit";
  if (map.creditCol !== null && map.creditCol < headerCount) roles[map.creditCol] = "credit";
  if (map.amountCol !== null && map.amountCol < headerCount) roles[map.amountCol] = "amount";
  if (map.typeCol !== null && map.typeCol < headerCount) roles[map.typeCol] = "type";
  if (map.balanceCol !== null && map.balanceCol < headerCount) roles[map.balanceCol] = "balance";
  return { roles, userModified: false };
}

// Convert ColumnAssignment back to DetectedColumnMap
function assignmentToColumnMap(assignment: ColumnAssignment): DetectedColumnMap {
  const { roles } = assignment;
  return {
    dateCol: roles.indexOf("date"),
    descCol: roles.indexOf("description"),
    debitCol: roles.includes("debit") ? roles.indexOf("debit") : null,
    creditCol: roles.includes("credit") ? roles.indexOf("credit") : null,
    amountCol: roles.includes("amount") ? roles.indexOf("amount") : null,
    typeCol: roles.includes("type") ? roles.indexOf("type") : null,
    balanceCol: roles.includes("balance") ? roles.indexOf("balance") : null,
    confidence: 1.0,
  };
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function StatementImportModal({ isOpen, onClose }: StatementImportModalProps) {
  const { isIndonesian } = useLanguage();
  const { activeSpaceId } = useSpace();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const { data: allTxs = [] } = useAllTransactions();
  const batchAddTx = useBatchAddTransactions();
  const { showToast } = useToast();

  // --- Step & Navigation State ---
  const [step, setStep] = useState<ImportStep>("input");
  const [importMethod, setImportMethod] = useState<ImportMethod | null>(null);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(() =>
    wallets.length > 0 ? wallets[0].id : null
  );

  // --- Parsed Results ---
  const [parsedFormat, setParsedFormat] = useState<StatementFormat>("generic_csv");
  const [parsedItems, setParsedItems] = useState<ParsedStatementItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  // --- Filter Duplicates ---
  const [hideDuplicates, setHideDuplicates] = useState(false);

  // --- Column Mapping State (CSV / Excel) ---
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [columnAssignment, setColumnAssignment] = useState<ColumnAssignment | null>(null);
  const [rawTextForParsing, setRawTextForParsing] = useState("");

  // --- Drawer States ---
  const [activeItemForCategory, setActiveItemForCategory] = useState<string | null>(null);
  const [activeItemForDestWallet, setActiveItemForDestWallet] = useState<string | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [destWalletSheetOpen, setDestWalletSheetOpen] = useState(false);

  const activeWallet = useMemo(
    () => wallets.find((w) => w.id === selectedWalletId) || wallets[0] || null,
    [wallets, selectedWalletId]
  );

  // --- Filtered and Metric Calculations ---
  const visibleItems = useMemo(
    () => (hideDuplicates ? parsedItems.filter((it) => !it.isDuplicate) : parsedItems),
    [parsedItems, hideDuplicates]
  );

  const selectedItems = useMemo(
    () => parsedItems.filter((it) => it.selected),
    [parsedItems]
  );

  const totalInflow = useMemo(
    () => selectedItems.filter((it) => it.type === "income").reduce((s, it) => s + it.amount, 0),
    [selectedItems]
  );

  const totalOutflow = useMemo(
    () => selectedItems.filter((it) => it.type === "expense").reduce((s, it) => s + it.amount, 0),
    [selectedItems]
  );

  const totalTransfer = useMemo(
    () => selectedItems.filter((it) => it.type === "transfer").reduce((s, it) => s + it.amount, 0),
    [selectedItems]
  );

  const duplicateCount = useMemo(
    () => parsedItems.filter((it) => it.isDuplicate).length,
    [parsedItems]
  );

  // -----------------------------------------------------------------------
  // File Handling — CSV, Excel, PDF
  // -----------------------------------------------------------------------

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      triggerHaptic("light");

      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      if (ext === "xlsx" || ext === "xls") {
        await handleExcelFile(file);
      } else if (ext === "pdf") {
        await handlePDFFile(file);
      } else {
        // CSV / TXT / TSV
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if (content) {
            setImportMethod("csv");
            processRawText(content, "csv");
          }
        };
        reader.readAsText(file, "UTF-8");
      }

      e.target.value = "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTxs, categories, wallets]
  );

  const handleExcelFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingMsg(isIndonesian ? "Membaca file Excel…" : "Reading Excel file…");
    try {
      const { parseExcelFile, spreadsheetToTSV } = await import("../../lib/excelParser");
      const spreadsheet = await parseExcelFile(file);

      if (spreadsheet.headers.length > 0) {
        const detectedMap = detectColumns(spreadsheet.headers, spreadsheet.rows);
        const assignment = buildColumnAssignment(detectedMap, spreadsheet.headers.length);
        setCsvHeaders(spreadsheet.headers);
        setCsvPreviewRows(spreadsheet.rows.slice(0, 4));
        setColumnAssignment(assignment);
        setRawTextForParsing(spreadsheetToTSV(spreadsheet));
        setImportMethod("excel");
        setStep("column_map");
        triggerHaptic("medium");
      } else {
        showToast(
          isIndonesian ? "File Excel tidak memiliki kolom yang dapat dibaca" : "Excel file has no readable columns",
          "delete",
          null,
          3000
        );
      }
    } catch (err) {
      console.error("[StatementImport] Excel parse error:", err);
      showToast(
        isIndonesian ? "Gagal membaca file Excel. Coba format .csv" : "Failed to read Excel file. Try .csv format",
        "delete",
        null,
        3000
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePDFFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingMsg(isIndonesian ? "Mengekstrak teks dari PDF…" : "Extracting text from PDF…");
    try {
      const { extractTextFromPDF } = await import("../../lib/pdfParser");
      const result = await extractTextFromPDF(file);

      if (result.text.trim().length < 50) {
        showToast(
          isIndonesian
            ? "PDF tidak bisa dibaca sebagai teks. Coba upload CSV dari m-banking."
            : "PDF could not be read as text. Try uploading CSV from m-banking.",
          "delete",
          null,
          4000
        );
        return;
      }

      setImportMethod("pdf");
      processRawText(result.text, "pdf");
    } catch (err) {
      console.error("[StatementImport] PDF parse error:", err);
      showToast(
        isIndonesian
          ? "Gagal membaca PDF. Pastikan PDF tidak terenkripsi kata sandi."
          : "Failed to read PDF. Make sure it is not password protected.",
        "delete",
        null,
        3500
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      triggerHaptic("light");
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      } else {
        showToast(isIndonesian ? "Papan klip kosong" : "Clipboard is empty", "info", null, 2000);
      }
    } catch {
      showToast(
        isIndonesian ? "Tempel teks secara manual di kotak di bawah" : "Please paste text manually into the box below",
        "info",
        null,
        2500
      );
    }
  };

  // -----------------------------------------------------------------------
  // Parsing Core
  // -----------------------------------------------------------------------

  const processRawText = useCallback(
    (text: string, method?: ImportMethod, colMap?: DetectedColumnMap) => {
      if (!text.trim()) {
        showToast(
          isIndonesian ? "Teks kosong. Masukkan data mutasi dulu." : "Empty text. Please provide statement data.",
          "info",
          null,
          2500
        );
        return;
      }

      // If CSV/Excel and no explicit column map provided, check if we should show column map confirmation
      if (!colMap && (method === "csv" || method === "excel")) {
        const parsedCSV = parseDelimitedText(text);
        if (parsedCSV.headers.length >= 2 && parsedCSV.rows.length > 0) {
          const detectedMap = detectColumns(parsedCSV.headers, parsedCSV.rows);
          const assignment = buildColumnAssignment(detectedMap, parsedCSV.headers.length);
          setCsvHeaders(parsedCSV.headers);
          setCsvPreviewRows(parsedCSV.rows.slice(0, 4));
          setColumnAssignment(assignment);
          setRawTextForParsing(text);
          setInputText(text);
          setStep("column_map");
          triggerHaptic("medium");
          return;
        }
      }

      const result = parseStatementText(text, allTxs, categories, colMap, wallets);
      if (result.items.length === 0) {
        showToast(
          isIndonesian
            ? "Tidak ada transaksi ditemukan. Periksa format data."
            : "No transactions found. Check data format.",
          "delete",
          null,
          3500
        );
        return;
      }

      setParsedFormat(result.detectedFormat);
      setParsedItems(result.items);
      setStep("review");
      triggerHaptic("medium");
    },
    [allTxs, categories, wallets, isIndonesian, showToast]
  );

  const handleColumnMapConfirm = () => {
    if (!columnAssignment) return;
    triggerHaptic("medium");
    const colMap = assignmentToColumnMap(columnAssignment);
    processRawText(rawTextForParsing, importMethod || "csv", colMap);
  };

  // -----------------------------------------------------------------------
  // Review Row Actions
  // -----------------------------------------------------------------------

  const toggleRow = (id: string) => {
    triggerHaptic("light");
    setParsedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const toggleAll = () => {
    triggerHaptic("medium");
    const anyUnselected = visibleItems.some((it) => !it.selected);
    const visibleIds = new Set(visibleItems.map((v) => v.id));
    setParsedItems((prev) =>
      prev.map((it) => (visibleIds.has(it.id) ? { ...it, selected: anyUnselected } : it))
    );
  };

  // Cycle type: expense -> income -> transfer -> expense
  const cycleRowType = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    setParsedItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        let nextType: TransactionType = "expense";
        let nextDestId = it.destinationWalletId;
        let nextDestName = it.destinationWalletName;

        if (it.type === "expense") {
          nextType = "income";
          nextDestId = null;
          nextDestName = null;
        } else if (it.type === "income") {
          nextType = "transfer";
          // Auto suggest another wallet as destination if not already set
          if (!nextDestId && wallets.length > 1) {
            const other = wallets.find((w) => w.id !== selectedWalletId) || wallets[1];
            nextDestId = other.id;
            nextDestName = other.name;
          }
        } else {
          nextType = "expense";
          nextDestId = null;
          nextDestName = null;
        }

        return {
          ...it,
          type: nextType,
          destinationWalletId: nextDestId,
          destinationWalletName: nextDestName,
        };
      })
    );
  };

  const handleSelectCategory = (cat: Category) => {
    if (!activeItemForCategory) return;
    triggerHaptic("light");
    setParsedItems((prev) =>
      prev.map((it) =>
        it.id === activeItemForCategory
          ? {
              ...it,
              suggestedCategoryId: cat.id,
              suggestedCategoryName: cat.name,
              suggestedCategoryEmoji: cat.emoji,
            }
          : it
      )
    );
    setCategorySheetOpen(false);
    setActiveItemForCategory(null);
  };

  const handleSelectDestWallet = (w: Wallet) => {
    if (!activeItemForDestWallet) return;
    triggerHaptic("light");
    setParsedItems((prev) =>
      prev.map((it) =>
        it.id === activeItemForDestWallet
          ? {
              ...it,
              destinationWalletId: w.id,
              destinationWalletName: w.name,
            }
          : it
      )
    );
    setDestWalletSheetOpen(false);
    setActiveItemForDestWallet(null);
  };

  // -----------------------------------------------------------------------
  // Batch Execution (50 items per chunk)
  // -----------------------------------------------------------------------

  const handleExecuteImport = async () => {
    if (selectedItems.length === 0) {
      showToast(
        isIndonesian ? "Tidak ada transaksi yang dipilih" : "No transactions selected",
        "info",
        null,
        2500
      );
      return;
    }

    setStep("importing");
    triggerHaptic("heavy");

    const CHUNK_SIZE = 50;
    const total = selectedItems.length;
    let imported = 0;

    for (let i = 0; i < selectedItems.length; i += CHUNK_SIZE) {
      const chunk = selectedItems.slice(i, i + CHUNK_SIZE);

      const payload = chunk.map((item) => ({
        amount: item.amount,
        type: item.type,
        category_id: item.suggestedCategoryId,
        wallet_id: selectedWalletId,
        to_wallet_id: item.type === "transfer" ? item.destinationWalletId || null : null,
        occurred_on: item.date,
        note: item.cleanDescription || item.description,
        ledger_id: activeSpaceId !== "all" ? activeSpaceId : "personal",
        space_id: activeSpaceId !== "all" ? activeSpaceId : null,
      }));

      try {
        await batchAddTx.mutateAsync(payload);
        imported += chunk.length;
        setImportProgress(Math.round((imported / total) * 100));
      } catch (err) {
        console.warn("[StatementImport] Batch chunk error:", err);
      }
    }

    triggerSuccessHaptic();
    showToast(
      isIndonesian
        ? `${imported} transaksi berhasil dicatat ke buku kas`
        : `Successfully imported ${imported} transactions`,
      "add",
      null,
      3000
    );
    handleClose();
  };

  const handleClose = () => {
    setStep("input");
    setImportMethod(null);
    setInputText("");
    setParsedItems([]);
    setColumnAssignment(null);
    setCsvHeaders([]);
    setCsvPreviewRows([]);
    setRawTextForParsing("");
    setImportProgress(0);
    setHideDuplicates(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      {/* Liquid Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === "importing" ? undefined : handleClose}
        className="absolute inset-0 backdrop-blur-xl bg-black/60"
      />

      {/* Main Glass Card */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative w-full max-w-lg max-h-[92dvh] flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <FileSpreadsheet size={15} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {isIndonesian ? "Impor Mutasi Bank" : "Import Bank Statement"}
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {step === "input"
                  ? isIndonesian
                    ? "CSV, Excel, PDF atau tempel teks"
                    : "CSV, Excel, PDF or paste text"
                  : step === "column_map"
                  ? isIndonesian
                    ? "Konfirmasi pemetaan kolom"
                    : "Confirm column mapping"
                  : `${FORMAT_LABELS[parsedFormat]} · ${parsedItems.length} ${
                      isIndonesian ? "transaksi" : "transactions"
                    }`}
              </p>
            </div>
          </div>

          {step !== "importing" && (
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* STEP 1: INPUT                                                       */}
        {/* ------------------------------------------------------------------ */}
        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {/* Privacy Banner */}
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <ShieldCheck
                  size={16}
                  strokeWidth={1.5}
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                />
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {isIndonesian ? "100% Diproses di Perangkat Anda" : "100% Processed On Your Device"}
                  </p>
                  <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {isIndonesian
                      ? "File mutasi tidak pernah dikirim ke server manapun. Semua parsing dilakukan secara lokal dan privasi Anda sepenuhnya terlindungi."
                      : "Your statement files are never sent to any server. All parsing happens locally and your privacy is fully protected."}
                  </p>
                </div>
              </div>

              {/* Destination Wallet Selector */}
              <div>
                <label
                  className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Dompet Tujuan Ingestion" : "Destination Wallet"}
                </label>
                <button
                  type="button"
                  onClick={() => setWalletSheetOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl active:scale-[0.99] transition-all cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={15} style={{ color: "var(--text-secondary)" }} />
                    <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                      {activeWallet?.name || (isIndonesian ? "Pilih Dompet" : "Select Wallet")}
                    </span>
                  </div>
                  <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>

              {/* Upload Cards Grid */}
              <div>
                <label
                  className="text-[11px] font-bold uppercase tracking-wider block mb-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Pilih Metode Ingestion" : "Choose Ingestion Method"}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* CSV / Excel — Highlighted Primary Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = ".csv,.txt,.tsv,.xlsx,.xls";
                        fileInputRef.current.click();
                      }
                    }}
                    className="col-span-2 flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.99] transition-all cursor-pointer text-left"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Table2 size={18} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                        {isIndonesian ? "Upload File CSV atau Excel" : "Upload CSV or Excel File"}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {isIndonesian
                          ? ".csv, .xlsx, .tsv · Deteksi kolom cerdas"
                          : ".csv, .xlsx, .tsv · Smart column mapping"}
                      </p>
                    </div>
                    <div
                      className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                      style={{
                        background: "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {isIndonesian ? "Disarankan" : "Recommended"}
                    </div>
                  </button>

                  {/* PDF Mutasi Bank */}
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = ".pdf";
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl active:scale-[0.99] transition-all cursor-pointer text-left"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <FileType size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                        PDF
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {isIndonesian ? "Mutasi Rekening" : "Bank Statement"}
                      </p>
                    </div>
                  </button>

                  {/* Tempel Teks */}
                  <button
                    type="button"
                    onClick={() => setImportMethod("paste")}
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl active:scale-[0.99] transition-all cursor-pointer text-left"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Clipboard size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                        {isIndonesian ? "Tempel Teks" : "Paste Text"}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {isIndonesian ? "Salinan m-banking" : "From m-banking"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Hidden file input */}
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

              {/* Paste Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    {isIndonesian
                      ? "Atau tempel baris mutasi rekening langsung"
                      : "Or paste statement lines directly"}
                  </span>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1 text-[11px] font-bold active:scale-95 transition-transform"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Clipboard size={11} />
                    {isIndonesian ? "Tempel" : "Paste"}
                  </button>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isIndonesian
                      ? "05/09 TRSF E-BANKING CR GAJI 15.000.000,00\n12/09 QRIS KOPI KENANGAN 45.000,00 DB\n..."
                      : "05/09 TRSF E-BANKING CR SALARY 15.000.000,00\n12/09 QRIS KOPI KENANGAN 45.000,00 DB\n..."
                  }
                  rows={4}
                  className="w-full rounded-2xl p-3 text-[12px] font-mono outline-none resize-none transition-all"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Loading Indicator */}
              {isProcessing && (
                <div className="flex items-center gap-2 py-2" style={{ color: "var(--text-secondary)" }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[12px] font-medium">{processingMsg}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => {
                  setImportMethod("paste");
                  processRawText(inputText, "paste");
                }}
                disabled={!inputText.trim() || isProcessing}
                className="w-full py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                <Sparkles size={15} />
                <span>
                  {isIndonesian ? "Parse & Tinjau Transaksi" : "Parse & Review Transactions"}
                </span>
              </button>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STEP 2: COLUMN MAP CONFIRMATION                                   */}
          {/* ---------------------------------------------------------------- */}
          {step === "column_map" && columnAssignment && (
            <motion.div
              key="column_map"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div
                  className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <AlertCircle
                    size={14}
                    strokeWidth={1.5}
                    className="shrink-0 mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {isIndonesian
                      ? "Kolom terdeteksi otomatis dari struktur data Anda. Tap peran kolom untuk mengubahnya bila belum sesuai."
                      : "Columns detected automatically from your data structure. Tap any column role to adjust if needed."}
                  </p>
                </div>

                {/* Column Table */}
                <div className="space-y-2">
                  {csvHeaders.map((header, colIdx) => {
                    const currentRole = columnAssignment.roles[colIdx];
                    return (
                      <div
                        key={colIdx}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                        style={{
                          background: "var(--glass-fill)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[12px] font-semibold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {header}
                          </p>
                          {csvPreviewRows[0] && (
                            <p
                              className="text-[10px] truncate mt-0.5 font-mono"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {csvPreviewRows[0][colIdx] || "—"}
                            </p>
                          )}
                        </div>

                        <ArrowRight size={12} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />

                        <select
                          value={currentRole}
                          onChange={(e) => {
                            const newRole = e.target.value as ColumnRole;
                            setColumnAssignment((prev) => {
                              if (!prev) return prev;
                              const newRoles = [...prev.roles];
                              if (newRole !== "ignore") {
                                for (let i = 0; i < newRoles.length; i++) {
                                  if (i !== colIdx && newRoles[i] === newRole) {
                                    newRoles[i] = "ignore";
                                  }
                                }
                              }
                              newRoles[colIdx] = newRole;
                              return { roles: newRoles, userModified: true };
                            });
                          }}
                          className="text-[11px] font-bold rounded-xl px-2 py-1.5 outline-none cursor-pointer"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {ALL_COLUMN_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {columnRoleLabel(role, isIndonesian)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Preview Rows */}
                {csvPreviewRows.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian ? "Pratinjau Data Sampel" : "Sample Data Preview"}
                    </p>
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{ border: "1px solid var(--glass-border)" }}
                    >
                      {csvPreviewRows.slice(0, 3).map((row, ri) => (
                        <div
                          key={ri}
                          className="flex gap-2 px-3 py-2 text-[10px] font-mono"
                          style={{
                            background: ri % 2 === 0 ? "var(--glass-fill)" : "transparent",
                            color: "var(--text-secondary)",
                            borderBottom: ri < 2 ? "1px solid var(--glass-border)" : undefined,
                          }}
                        >
                          {row.slice(0, Math.min(csvHeaders.length, 5)).map((cell, ci) => (
                            <span key={ci} className="truncate flex-1">
                              {cell || "—"}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column Map Action Bar */}
              <div
                className="p-4 border-t border-[var(--glass-border)] shrink-0 flex items-center gap-2"
                style={{
                  paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="px-4 py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{isIndonesian ? "Kembali" : "Back"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleColumnMapConfirm}
                  disabled={
                    columnAssignment.roles.indexOf("date") === -1 ||
                    (columnAssignment.roles.indexOf("amount") === -1 &&
                      columnAssignment.roles.indexOf("debit") === -1 &&
                      columnAssignment.roles.indexOf("credit") === -1)
                  }
                  className="flex-1 py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  <Sparkles size={15} />
                  <span>{isIndonesian ? "Lanjut Parse Transaksi" : "Parse Transactions"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STEP 3: REVIEW                                                    */}
          {/* ---------------------------------------------------------------- */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* KPI & Filter Ribbon */}
              <div
                className="px-5 py-3 border-b border-[var(--glass-border)] flex items-center justify-between text-[11px] font-bold shrink-0"
                style={{ background: "var(--glass-fill)" }}
              >
                <div className="flex items-center gap-3">
                  {totalInflow > 0 && (
                    <span style={{ color: "var(--accent)" }}>+{formatRupiah(totalInflow)}</span>
                  )}
                  {totalOutflow > 0 && (
                    <span style={{ color: "var(--text-primary)" }}>−{formatRupiah(totalOutflow)}</span>
                  )}
                  {totalTransfer > 0 && (
                    <span style={{ color: "var(--text-secondary)" }}>⇄ {formatRupiah(totalTransfer)}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setHideDuplicates(!hideDuplicates)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold active:scale-95 transition-transform cursor-pointer"
                      style={{
                        background: hideDuplicates ? "var(--glass-fill-strong)" : "var(--glass-fill)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {hideDuplicates ? <Eye size={10} /> : <EyeOff size={10} />}
                      <span>
                        {hideDuplicates
                          ? isIndonesian
                            ? "Lihat Duplikat"
                            : "Show Duplicates"
                          : `${duplicateCount} ${isIndonesian ? "Duplikat" : "Duplicates"}`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center gap-1 active:scale-95 transition-transform"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {visibleItems.length > 0 && visibleItems.every((it) => it.selected) ? (
                      <CheckSquare size={13} />
                    ) : (
                      <Square size={13} />
                    )}
                    <span>
                      {selectedItems.length}/{parsedItems.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {visibleItems.map((item) => {
                  const isIncome = item.type === "income";
                  const isTransfer = item.type === "transfer";

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleRow(item.id)}
                      className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border ${
                        item.selected
                          ? "border-[var(--glass-border)] bg-[var(--glass-fill)]"
                          : "border-transparent opacity-50 bg-transparent"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className="shrink-0"
                        style={{
                          color: item.selected ? "var(--text-primary)" : "var(--text-tertiary)",
                        }}
                      >
                        {item.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>

                      {/* Middle Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {item.date}
                          </span>

                          {/* Type toggle chip */}
                          <button
                            type="button"
                            onClick={(e) => cycleRowType(item.id, e)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold border active:scale-95 transition-transform cursor-pointer"
                            style={{
                              background: "var(--bg-elevated)",
                              borderColor: "var(--glass-border)",
                              color: isIncome
                                ? "var(--accent)"
                                : isTransfer
                                ? "var(--text-secondary)"
                                : "var(--text-primary)",
                            }}
                          >
                            {isIncome
                              ? isIndonesian
                                ? "Pemasukan"
                                : "Income"
                              : isTransfer
                              ? isIndonesian
                                ? "Transfer"
                                : "Transfer"
                              : isIndonesian
                              ? "Pengeluaran"
                              : "Expense"}
                          </button>

                          {/* Duplicate badge */}
                          {item.isDuplicate && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                              style={{
                                background: "var(--glass-fill)",
                                border: "1px solid var(--glass-border)",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {isIndonesian ? "Duplikat" : "Duplicate"}
                            </span>
                          )}
                        </div>

                        <p
                          className="text-[13px] font-bold truncate mt-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.cleanDescription}
                        </p>

                        {/* Badges: Category & Destination Wallet */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {/* Category pill */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveItemForCategory(item.id);
                              setCategorySheetOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border active:scale-95 transition-transform"
                            style={{
                              background: "var(--bg-elevated)",
                              borderColor: "var(--glass-border)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <Tag size={10} />
                            <span className="text-[10px] font-bold">
                              {item.suggestedCategoryName || (isIndonesian ? "Umum" : "General")}
                            </span>
                          </button>

                          {/* Destination wallet pill if transfer */}
                          {isTransfer && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItemForDestWallet(item.id);
                                setDestWalletSheetOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border active:scale-95 transition-transform"
                              style={{
                                background: "var(--bg-elevated)",
                                borderColor: "var(--glass-border)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <ArrowLeftRight size={10} />
                              <span className="text-[10px] font-bold truncate max-w-[120px]">
                                {item.destinationWalletName || (isIndonesian ? "Pilih Tujuan" : "Select Target")}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <span
                          className="text-[13px] font-semibold block"
                          style={{
                            color: isIncome
                              ? "var(--accent)"
                              : isTransfer
                              ? "var(--text-secondary)"
                              : "var(--text-primary)",
                          }}
                        >
                          {isIncome ? "+" : isTransfer ? "⇄" : "−"}
                          {formatRupiah(item.amount)}
                        </span>
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIncome
                            ? isIndonesian
                              ? "Masuk"
                              : "Inflow"
                            : isTransfer
                            ? isIndonesian
                              ? "Transfer"
                              : "Transfer"
                            : isIndonesian
                            ? "Keluar"
                              : "Outflow"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Commit Dock */}
              <div
                className="p-4 border-t border-[var(--glass-border)] shrink-0 flex items-center gap-2"
                style={{
                  paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="px-4 py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{isIndonesian ? "Kembali" : "Back"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={selectedItems.length === 0}
                  className="flex-1 py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  <Check size={15} strokeWidth={2.5} />
                  <span>
                    {isIndonesian
                      ? `Simpan ${selectedItems.length} Transaksi`
                      : `Import ${selectedItems.length} Transactions`}
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STEP 4: IMPORTING PROGRESS                                        */}
          {/* ---------------------------------------------------------------- */}
          {step === "importing" && (
            <motion.div
              key="importing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-10 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--accent)",
                }}
              >
                <FileSpreadsheet size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {isIndonesian ? "Mengimpor Data…" : "Importing Records…"}
                </h3>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian
                    ? "Menyimpan batch transaksi ke vault lokal & Supabase"
                    : "Committing batch transactions to local vault & Supabase"}
                </p>
              </div>
              <div className="w-full max-w-xs h-2 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${importProgress}%`, background: "var(--accent)" }}
                />
              </div>
              <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
                {importProgress}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Category Selection Drawer */}
      <BottomSheet
        isOpen={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={isIndonesian ? "Pilih Kategori" : "Assign Category"}
      >
        <div
          className="grid grid-cols-3 gap-2.5 p-2"
          style={{
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 24px)",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat)}
              className="p-3 rounded-2xl flex flex-col items-center text-center transition-all cursor-pointer active:scale-95"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-1.5 bg-white/5">
                <IconRenderer icon={cat.emoji || "??"} />
              </div>
              <span
                className="text-[11px] font-bold truncate max-w-full"
                style={{ color: "var(--text-primary)" }}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Target Ingestion Wallet Drawer */}
      <BottomSheet
        isOpen={walletSheetOpen}
        onClose={() => setWalletSheetOpen(false)}
        title={isIndonesian ? "Pilih Dompet Ingestion" : "Select Destination Wallet"}
      >
        <div
          className="space-y-2 p-2"
          style={{
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 24px)",
          }}
        >
          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setSelectedWalletId(w.id);
                setWalletSheetOpen(false);
              }}
              className="w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-98"
              style={{
                background: selectedWalletId === w.id ? "var(--glass-fill-strong)" : "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={16} style={{ color: "var(--text-secondary)" }} />
                <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {w.name}
                </span>
              </div>
              {selectedWalletId === w.id && (
                <Check size={16} style={{ color: "var(--accent)" }} />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Per-row Transfer Destination Wallet Drawer */}
      <BottomSheet
        isOpen={destWalletSheetOpen}
        onClose={() => setDestWalletSheetOpen(false)}
        title={isIndonesian ? "Pilih Dompet Penerima Transfer" : "Select Transfer Target Wallet"}
      >
        <div
          className="space-y-2 p-2"
          style={{
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 24px)",
          }}
        >
          {wallets
            .filter((w) => w.id !== selectedWalletId)
            .map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleSelectDestWallet(w)}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-98"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={16} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                    {w.name}
                  </span>
                </div>
                <ArrowRight size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            ))}
        </div>
      </BottomSheet>
    </div>
  );
}
