import { useState, useRef } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import {
  Shield,
  Download,
  Upload,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useQueryClient } from "@tanstack/react-query";
import { useWallets } from "../../hooks/useWallets";
import { useCategories } from "../../hooks/useCategories";
import { useBills } from "../../hooks/useBills";
import { useGoals } from "../../hooks/useGoals";
import { useBudgetTarget } from "../../hooks/useBudgetTarget";
import { useShortcuts } from "../../hooks/useShortcuts";
import {
  fetchAllTransactionsFromSupabase,
} from "../../hooks/useTransactions";
import {
  encryptVault,
  decryptVault,
  downloadVaultFile,
  parseVaultFile,
  restoreVaultData,
  type EncryptedVaultPayload,
  type TrouvailleVaultData,
  type RestoreProgress,
} from "../../lib/vaultEncryption";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";
import { format } from "date-fns";

interface EncryptedVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "export" | "restore";
}

export function EncryptedVaultModal({
  isOpen,
  onClose,
  defaultTab = "export",
}: EncryptedVaultModalProps) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const { data: bills = [] } = useBills();
  const { goals } = useGoals();
  const { budgetTarget } = useBudgetTarget();
  const { shortcuts } = useShortcuts();

  const [activeTab, setActiveTab] = useState<"export" | "restore">(defaultTab);

  // Export State
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState("");
  const [showExportPassphrase, setShowExportPassphrase] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPayload, setParsedPayload] =
    useState<EncryptedVaultPayload | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [showRestorePassphrase, setShowRestorePassphrase] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] =
    useState<RestoreProgress | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Reset states when modal is closed
  const handleClose = () => {
    if (isExporting || isRestoring) return;
    setExportPassphrase("");
    setExportConfirmPassphrase("");
    setSelectedFile(null);
    setParsedPayload(null);
    setRestorePassphrase("");
    setRestoreProgress(null);
    setRestoreError(null);
    onClose();
  };

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    try {
      const payload = await parseVaultFile(file);
      setSelectedFile(file);
      setParsedPayload(payload);
      triggerHaptic("light");
    } catch (err: any) {
      triggerHaptic("heavy");
      setRestoreError(
        err.message || "Invalid or corrupt vault file. Please select a valid .trouvaille backup.",
      );
      setSelectedFile(null);
      setParsedPayload(null);
    }
  };

  // Execute Vault Export
  const handleExecuteExport = async () => {
    if (!exportPassphrase || exportPassphrase.length < 4) {
      showToast("Passphrase must be at least 4 characters", "delete", () => {});
      triggerHaptic("heavy");
      return;
    }

    if (exportPassphrase !== exportConfirmPassphrase) {
      showToast("Passphrases do not match", "delete", () => {});
      triggerHaptic("heavy");
      return;
    }

    setIsExporting(true);
    try {
      // 1. Fetch complete transactions from Supabase/cache
      let allTransactions: any[] = [];
      if (session?.user?.id) {
        allTransactions = await fetchAllTransactionsFromSupabase({
          userId: session.user.id,
        });
      }

      // 2. Package vault data
      const vaultData: TrouvailleVaultData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions: allTransactions,
        wallets,
        categories,
        bills,
        goals,
        budgetTarget,
        shortcuts,
      };

      // 3. Encrypt payload
      const encrypted = await encryptVault(vaultData, exportPassphrase);

      // 4. Download file
      const dateStr = format(new Date(), "yyyyMMdd_HHmm");
      downloadVaultFile(encrypted, `trouvaille_vault_${dateStr}.trouvaille`);

      triggerSuccessHaptic();
      showToast("Encrypted vault exported successfully", "add", () => {});
      handleClose();
    } catch (err: any) {
      console.error("[VaultExport] Failed:", err);
      triggerHaptic("heavy");
      showToast(err.message || "Failed to export vault", "delete", () => {});
    } finally {
      setIsExporting(false);
    }
  };

  // Execute Vault Decrypt & Restore
  const handleExecuteRestore = async () => {
    if (!parsedPayload) {
      showToast("Please choose a vault backup file", "delete", () => {});
      return;
    }

    if (!restorePassphrase) {
      showToast("Please enter the decryption passphrase", "delete", () => {});
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);

    try {
      // 1. Decrypt vault
      setRestoreProgress({ stage: "Decrypting vault payload...", progress: 10 });
      const decryptedData = await decryptVault(parsedPayload, restorePassphrase);

      // 2. Restore data into Supabase & localStorage
      const result = await restoreVaultData(decryptedData, {
        mode: restoreMode,
        onProgress: setRestoreProgress,
      });

      // 3. Invalidate React Query caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
      ]);

      triggerSuccessHaptic();
      showToast(
        `Restored ${result.restoredTransactions} transactions & ${result.restoredWallets} wallets`,
        "add",
        () => {},
      );
      handleClose();
    } catch (err: any) {
      console.error("[VaultRestore] Failed:", err);
      triggerHaptic("heavy");
      setRestoreError(
        err.message || "Decryption failed. Please verify your passphrase.",
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="p-5 pb-10 space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center space-y-1">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Shield size={22} strokeWidth={1.75} />
          </div>
          <h3
            className="text-[18px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Encrypted Local Vault
          </h3>
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            Client-side AES-GCM-256 backup with zero-knowledge encryption
          </p>
        </div>

        {/* Mode Selector Tabs (Rule 3 Compliant: Zero native emojis, Apple segmented glass) */}
        <div
          className="flex p-1 rounded-2xl"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("export");
              triggerHaptic("light");
            }}
            className="flex-1 py-2 text-[12px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              background:
                activeTab === "export"
                  ? "var(--bg-elevated)"
                  : "transparent",
              color:
                activeTab === "export"
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              boxShadow:
                activeTab === "export" ? "var(--shadow-card)" : "none",
            }}
          >
            <Download size={14} strokeWidth={1.75} />
            <span>Export Vault</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("restore");
              triggerHaptic("light");
            }}
            className="flex-1 py-2 text-[12px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              background:
                activeTab === "restore"
                  ? "var(--bg-elevated)"
                  : "transparent",
              color:
                activeTab === "restore"
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              boxShadow:
                activeTab === "restore" ? "var(--shadow-card)" : "none",
            }}
          >
            <Upload size={14} strokeWidth={1.75} />
            <span>Restore Vault</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: EXPORT VAULT */}
        {/* ============================================================== */}
        {activeTab === "export" && (
          <div className="space-y-4">
            {/* Telemetry Bento Summary */}
            <div
              className="p-4 rounded-2xl space-y-3"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Records to Encrypt
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  AES-GCM-256
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div
                  className="p-2.5 rounded-xl text-center"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="text-[15px] font-bold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {wallets.length}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Wallets
                  </span>
                </div>
                <div
                  className="p-2.5 rounded-xl text-center"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="text-[15px] font-bold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {categories.length}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Categories
                  </span>
                </div>
                <div
                  className="p-2.5 rounded-xl text-center"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="text-[15px] font-bold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {bills.length}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Bills
                  </span>
                </div>
              </div>

              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                All records, transactions, goals, and categories will be encrypted
                locally on your device. Only you possess the key.
              </p>
            </div>

            {/* Passphrase Input Fields */}
            <div className="space-y-3">
              <div>
                <label
                  className="text-[12px] font-semibold block mb-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  Set Vault Passphrase
                </label>
                <div
                  className="flex items-center px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <Lock
                    size={16}
                    className="shrink-0 mr-2.5"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <input
                    type={showExportPassphrase ? "text" : "password"}
                    placeholder="Enter strong passphrase or PIN"
                    value={exportPassphrase}
                    onChange={(e) => setExportPassphrase(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassphrase(!showExportPassphrase)}
                    className="p-1 cursor-pointer shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {showExportPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="text-[12px] font-semibold block mb-1.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  Confirm Passphrase
                </label>
                <div
                  className="flex items-center px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <Lock
                    size={16}
                    className="shrink-0 mr-2.5"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <input
                    type={showExportPassphrase ? "text" : "password"}
                    placeholder="Repeat passphrase"
                    value={exportConfirmPassphrase}
                    onChange={(e) => setExportConfirmPassphrase(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            </div>

            {/* Export Action Button */}
            <button
              type="button"
              disabled={isExporting || !exportPassphrase || !exportConfirmPassphrase}
              onClick={handleExecuteExport}
              className="w-full py-3 px-4 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-base)",
              }}
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Encrypting & Generating Vault...</span>
                </>
              ) : (
                <>
                  <Download size={16} strokeWidth={2} />
                  <span>Download Encrypted Vault (.trouvaille)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: RESTORE VAULT */}
        {/* ============================================================== */}
        {activeTab === "restore" && (
          <div className="space-y-4">
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".trouvaille,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File Dropzone Card */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-2xl text-center cursor-pointer transition-all border-dashed"
              style={{
                background: "var(--glass-fill)",
                border: "1px dashed var(--glass-border)",
              }}
            >
              {selectedFile && parsedPayload ? (
                <div className="space-y-2">
                  <div
                    className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center"
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      color: "#10b981",
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span
                      className="text-[13px] font-bold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedFile.name}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Exported:{" "}
                      {parsedPayload.createdAt
                        ? format(
                            new Date(parsedPayload.createdAt),
                            "dd MMM yyyy, HH:mm",
                          )
                        : "Encrypted Backup"}
                    </span>
                  </div>

                  {/* Envelope Item Badges */}
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {parsedPayload.metadata?.itemCounts?.transactions ?? 0} txs
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {parsedPayload.metadata?.itemCounts?.wallets ?? 0} wallets
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {parsedPayload.metadata?.itemCounts?.categories ?? 0} categories
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 py-2">
                  <Upload
                    size={22}
                    className="mx-auto"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Select Vault File (.trouvaille)
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Tap to browse files on your device
                  </p>
                </div>
              )}
            </div>

            {/* Error Banner if any */}
            {restoreError && (
              <div
                className="p-3 rounded-xl flex items-center gap-2"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle size={16} className="shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  {restoreError}
                </span>
              </div>
            )}

            {/* Passphrase Input */}
            <div>
              <label
                className="text-[12px] font-semibold block mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                Enter Decryption Passphrase
              </label>
              <div
                className="flex items-center px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Lock
                  size={16}
                  className="shrink-0 mr-2.5"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <input
                  type={showRestorePassphrase ? "text" : "password"}
                  placeholder="Passphrase used during export"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  className="w-full bg-transparent text-[13px] outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowRestorePassphrase(!showRestorePassphrase)}
                  className="p-1 cursor-pointer shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {showRestorePassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Mode: Merge vs Replace */}
            <div className="space-y-1.5">
              <label
                className="text-[12px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                Restoration Strategy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestoreMode("merge")}
                  className="p-2.5 rounded-xl text-left transition-all cursor-pointer"
                  style={{
                    background:
                      restoreMode === "merge"
                        ? "var(--bg-elevated)"
                        : "var(--glass-fill)",
                    border:
                      restoreMode === "merge"
                        ? "1px solid var(--text-primary)"
                        : "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="text-[12px] font-bold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Safe Merge
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Preserves current data, imports new items
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRestoreMode("replace")}
                  className="p-2.5 rounded-xl text-left transition-all cursor-pointer"
                  style={{
                    background:
                      restoreMode === "replace"
                        ? "var(--bg-elevated)"
                        : "var(--glass-fill)",
                    border:
                      restoreMode === "replace"
                        ? "1px solid var(--text-primary)"
                        : "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="text-[12px] font-bold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Clean Replace
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Purges existing transactions before import
                  </span>
                </button>
              </div>
            </div>

            {/* Progress Bar (if restoring) */}
            {isRestoring && restoreProgress && (
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: "var(--text-secondary)" }}>
                    {restoreProgress.stage}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {restoreProgress.progress}%
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${restoreProgress.progress}%`,
                      background: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Restore Action Button */}
            <button
              type="button"
              disabled={isRestoring || !parsedPayload || !restorePassphrase}
              onClick={handleExecuteRestore}
              className="w-full py-3 px-4 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-base)",
              }}
            >
              {isRestoring ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Decrypting & Restoring...</span>
                </>
              ) : (
                <>
                  <Upload size={16} strokeWidth={2} />
                  <span>Decrypt & Restore Data</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
