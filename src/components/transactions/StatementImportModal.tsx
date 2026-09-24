// ======================================================================
// TROUVAILLE BANK E-STATEMENT & TABULAR / CSV IMPORT MODAL
// Ultra-minimalist Apple Liquid Glass Edition
// Fully deterministic client-side batch ingestion with smart deduplication
// Strictly compliant with GEMINI.md: Monochrome luxury & zero native emojis
// ======================================================================

import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Clipboard,
  Check,
  CheckSquare,
  Square,
  CreditCard,
  Tag,
  ChevronDown,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { parseStatementText, type ParsedStatementItem, type StatementFormat } from "../../lib/statementParser";
import { useWallets } from "../../hooks/useWallets";
import { useCategories } from "../../hooks/useCategories";
import { useAllTransactions, useAddTransaction } from "../../hooks/useTransactions";
import { useToast } from "../../contexts/ToastContext";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import type { Category } from "../../lib/types";

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatementImportModal({ isOpen, onClose }: StatementImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const { data: allTxs = [] } = useAllTransactions();
  const addTx = useAddTransaction();
  const { showToast } = useToast();

  const [step, setStep] = useState<"input" | "review" | "importing">("input");
  const [inputText, setInputText] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(() => {
    return wallets.length > 0 ? wallets[0].id : null;
  });

  // Parsed results
  const [parsedFormat, setParsedFormat] = useState<StatementFormat>("generic_csv");
  const [parsedItems, setParsedItems] = useState<ParsedStatementItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  // Category picker drawer state
  const [activeItemForCategory, setActiveItemForCategory] = useState<string | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);

  // Active target wallet object
  const activeWallet = useMemo(() => {
    return wallets.find((w) => w.id === selectedWalletId) || wallets[0] || null;
  }, [wallets, selectedWalletId]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic("light");
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        processRawText(content);
      }
    };
    reader.readAsText(file);
  };

  // Handle Paste from Clipboard
  const handlePasteClipboard = async () => {
    try {
      triggerHaptic("light");
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        processRawText(text);
      } else {
        showToast("Clipboard is empty", "info", null, 2000);
      }
    } catch {
      showToast("Please paste text manually into the box", "info", null, 2500);
    }
  };

  // Parse Text and transition to Review step
  const processRawText = (text: string) => {
    if (!text.trim()) {
      showToast("Please provide statement text or CSV file", "info", null, 2500);
      return;
    }

    const result = parseStatementText(text, allTxs, categories);
    if (result.items.length === 0) {
      showToast("No transactions found in this text. Check format.", "delete", null, 3000);
      return;
    }

    setParsedFormat(result.detectedFormat);
    setParsedItems(result.items);
    setStep("review");
    triggerHaptic("medium");
  };

  // Toggle selection for a single row
  const toggleRow = (id: string) => {
    triggerHaptic("light");
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Toggle all rows
  const toggleAll = () => {
    triggerHaptic("medium");
    const anyUnselected = parsedItems.some((it) => !it.selected);
    setParsedItems((prev) => prev.map((it) => ({ ...it, selected: anyUnselected })));
  };

  // Change category of an item
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

  // Compute live review metrics
  const selectedItems = useMemo(() => parsedItems.filter((it) => it.selected), [parsedItems]);
  const totalInflow = useMemo(
    () => selectedItems.filter((it) => it.type === "income").reduce((s, it) => s + it.amount, 0),
    [selectedItems]
  );
  const totalOutflow = useMemo(
    () => selectedItems.filter((it) => it.type === "expense").reduce((s, it) => s + it.amount, 0),
    [selectedItems]
  );
  const duplicateCount = useMemo(() => parsedItems.filter((it) => it.isDuplicate).length, [parsedItems]);

  // Commit batch import
  const handleExecuteImport = async () => {
    if (selectedItems.length === 0) {
      showToast("No transactions selected for import", "info", null, 2500);
      return;
    }

    setStep("importing");
    triggerHaptic("heavy");

    const total = selectedItems.length;
    let imported = 0;

    for (const item of selectedItems) {
      try {
        await addTx.mutateAsync({
          amount: item.amount,
          type: item.type,
          category_id: item.suggestedCategoryId,
          wallet_id: selectedWalletId,
          occurred_on: item.date,
          note: item.cleanDescription || item.description,
        });
        imported++;
        setImportProgress(Math.round((imported / total) * 100));
      } catch (err) {
        console.warn("[StatementImport] Failed row:", item, err);
      }
    }

    triggerSuccessHaptic();
    showToast(`Successfully imported ${imported} transactions`, "add", null, 3000);
    onClose();
  };

  if (!isOpen) return null;

  const formatBadgeName: Record<StatementFormat, string> = {
    bca: "BCA E-Statement / Mutasi",
    mandiri: "Mandiri Livin Mutasi",
    jenius: "Jenius BTPN Statement",
    gopay: "GoPay / E-Wallet CSV",
    generic_csv: "Tabular CSV",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      {/* Liquid Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === "importing" ? undefined : onClose}
        className="absolute inset-0 backdrop-blur-xl bg-black/60"
      />

      {/* Main Glass Modal Card */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden glass-surface"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2">
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
                Bank Statement Ingestion
              </h2>
              <p className="text-[11px] font-normal" style={{ color: "var(--text-tertiary)" }}>
                {step === "input"
                  ? "BCA, Mandiri, Jenius, GoPay or CSV"
                  : `${formatBadgeName[parsedFormat]} · ${parsedItems.length} found`}
              </p>
            </div>
          </div>

          {step !== "importing" && (
            <button
              onClick={onClose}
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

        {/* STEP 1: INPUT VIEW (Upload or Paste) */}
        {step === "input" && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Target Wallet Selector Pill */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                Destination Wallet
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
                    {activeWallet?.name || "Select Wallet"}
                  </span>
                </div>
                <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>

            {/* Drag/Upload Box */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors active:scale-[0.99]"
              style={{
                borderColor: "var(--glass-border)",
                background: "var(--glass-fill)",
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <UploadCloud size={20} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
                Upload Bank Statement or CSV
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Supports .csv, .txt, .tsv mutasi files
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-[var(--glass-border)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Or Paste Statement Lines
              </span>
              <div className="h-[1px] flex-1 bg-[var(--glass-border)]" />
            </div>

            {/* Paste Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Copied from m-banking or web e-statement
                </span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 text-[11px] font-bold active:scale-95 transition-transform"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Clipboard size={11} />
                  Paste Clipboard
                </button>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={"05/09 TRSF E-BANKING CR GAJI 15.000.000,00\n12/09 QRIS KOPI KENANGAN 45.000,00 DB\n..."}
                rows={4}
                className="w-full rounded-2xl p-3 text-[12px] font-mono outline-none resize-none transition-all"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => processRawText(inputText)}
              disabled={!inputText.trim()}
              className="w-full py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-40"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              <Sparkles size={15} />
              <span>Parse & Review Transactions</span>
            </button>
          </div>
        )}

        {/* STEP 2: REVIEW VIEW */}
        {step === "review" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top KPI Ribbon */}
            <div
              className="px-5 py-3 border-b border-[var(--glass-border)] flex items-center justify-between text-[11px] font-bold shrink-0"
              style={{ background: "var(--glass-fill)" }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: "var(--accent)" }}>
                  +{formatRupiah(totalInflow)}
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  -{formatRupiah(totalOutflow)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {duplicateCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                    {duplicateCount} Duplicates Skipped
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1 active:scale-95 transition-transform"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedItems.length === parsedItems.length ? (
                    <CheckSquare size={13} />
                  ) : (
                    <Square size={13} />
                  )}
                  <span>{selectedItems.length}/{parsedItems.length}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Transaction Review List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-transparent">
              {parsedItems.map((item) => {
                const isIncome = item.type === "income";

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
                    <div className="shrink-0" style={{ color: item.selected ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {item.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                          {item.date}
                        </span>
                        {item.isDuplicate && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Duplicate
                          </span>
                        )}
                      </div>

                      <p className="text-[13px] font-bold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                        {item.cleanDescription}
                      </p>

                      {/* Category Pill Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveItemForCategory(item.id);
                          setCategorySheetOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mt-1 border active:scale-95 transition-transform"
                        style={{
                          background: "var(--bg-elevated)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Tag size={10} />
                        <span className="text-[10px] font-bold">
                          {item.suggestedCategoryName || "General"}
                        </span>
                      </button>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <span
                        className="text-[13px] font-semibold amount block"
                        style={{ color: isIncome ? "var(--accent)" : "var(--text-primary)" }}
                      >
                        {isIncome ? "+" : "-"}{formatRupiah(item.amount)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                        {isIncome ? "Inflow" : "Outflow"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Floating Commit Dock */}
            <div className="p-4 border-t border-[var(--glass-border)] shrink-0 flex items-center gap-2">
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
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={selectedItems.length === 0}
                className="flex-1 py-3 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-40"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <Check size={15} strokeWidth={2.5} />
                <span>Import {selectedItems.length} Transactions</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: IMPORTING PROGRESS */}
        {step === "importing" && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--accent)",
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Importing Ledger Records...
              </h3>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                Commiting transactions safely to local vault & Supabase
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs h-2 rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${importProgress}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
              {importProgress}%
            </span>
          </div>
        )}
      </motion.div>

      {/* Category Selection Drawer */}
      <BottomSheet
        isOpen={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title="Assign Category"
      >
        <div className="grid grid-cols-3 gap-2.5 p-2 pb-6">
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
              <span className="text-[11px] font-bold truncate max-w-full" style={{ color: "var(--text-primary)" }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Wallet Selection Drawer */}
      <BottomSheet
        isOpen={walletSheetOpen}
        onClose={() => setWalletSheetOpen(false)}
        title="Select Target Wallet"
      >
        <div className="space-y-2 p-2">
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
    </div>
  );
}
