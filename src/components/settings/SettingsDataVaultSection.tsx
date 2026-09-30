import {
  Zap,
  User as UserIcon,
  ChevronRight,
  Cloud,
  Loader2,
  Check,
  RotateCcw,
  Trash2,
  Laptop,
  QrCode,
  FileSpreadsheet,
  Sparkles,
  LogOut,
} from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import {
  type AppReleaseInfo,
  APP_VERSION,
  APP_BUILD_NUMBER,
} from "../../lib/appUpdateService";

export interface SettingsProfileCardProps {
  isGuest: boolean;
  avatarUrl: string;
  displayName: string;
  email?: string;
  isIndonesian: boolean;
  onOpenProfile: () => void;
  onExitGuestMode: () => void;
}

export function SettingsProfileCard({
  isGuest,
  avatarUrl,
  displayName,
  email,
  isIndonesian,
  onOpenProfile,
  onExitGuestMode,
}: SettingsProfileCardProps) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          onOpenProfile();
        }}
        className="w-full glass-surface p-3.5 rounded-2xl flex items-center justify-between border border-[var(--glass-border)] active:scale-[0.99] transition-all cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {isGuest ? (
              <Zap size={18} style={{ color: "var(--text-secondary)" }} />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon
                size={18}
                style={{ color: "var(--text-secondary)" }}
              />
            )}
          </div>
          <div className="min-w-0">
            <p
              className="font-semibold text-[14px] truncate leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {isGuest
                ? isIndonesian
                  ? "Tamu Lokal"
                  : "Local Guest"
                : displayName}
            </p>
            <p
              className="text-[11px] font-medium truncate mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {isGuest
                ? isIndonesian
                  ? "Brankas Perangkat Offline"
                  : "Offline Device Vault"
                : email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            {isIndonesian ? "Ubah" : "Edit"}
          </span>
          <ChevronRight
            size={16}
            style={{ color: "var(--text-secondary)" }}
          />
        </div>
      </button>

      {isGuest && (
        <div
          className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-left"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
          }}
        >
          <p className="text-[11px] font-medium text-[var(--text-tertiary)] truncate">
            {isIndonesian
              ? "Data tersimpan offline · Hubungkan untuk cadangkan"
              : "Data stored offline · Connect to backup"}
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              onExitGuestMode();
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 active:scale-95 transition-transform cursor-pointer border"
            style={{
              background: "var(--text-primary)",
              borderColor: "var(--text-primary)",
              color: "var(--bg-primary)",
            }}
          >
            {isIndonesian ? "Hubungkan Cloud" : "Connect Cloud"}
          </button>
        </div>
      )}
    </div>
  );
}

export interface SettingsDataVaultSectionProps {
  hasDataVault: boolean;
  showCloudSync: boolean;
  showWebDashboard: boolean;
  showExportVault: boolean;
  searchQuery: string;
  isIndonesian: boolean;
  isGuest: boolean;
  hasAuthenticatedUser: boolean;
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncedTime: string;
  pendingMutationsCount: number;
  onSafeSync: () => void;
  onDiscardPendingAndRestore: () => void;
  onOpenWebDashboard: () => void;
  onOpenDataExportVault: () => void;
  onOpenImport?: () => void;
  checkingUpdate: boolean;
  releaseInfo: AppReleaseInfo | null;
  onCheckForUpdate: () => void;
  onSignOut: () => void;
}

export function SettingsDataVaultSection({
  hasDataVault,
  showCloudSync,
  showWebDashboard,
  showExportVault,
  searchQuery,
  isIndonesian,
  isGuest,
  hasAuthenticatedUser,
  syncStatus,
  lastSyncedTime,
  pendingMutationsCount,
  onSafeSync,
  onDiscardPendingAndRestore,
  onOpenWebDashboard,
  onOpenDataExportVault,
  onOpenImport,
  checkingUpdate,
  releaseInfo,
  onCheckForUpdate,
  onSignOut,
}: SettingsDataVaultSectionProps) {
  return (
    <>
      {/* 7. DATA & VAULT */}
      {hasDataVault && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {isIndonesian ? "Data & Brankas" : "Data & Vault"}
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Cloud Sync */}
            {showCloudSync && (
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[44px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Cloud size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-[13px] font-semibold block truncate leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Sinkronisasi Cloud" : "Cloud Sync"}
                    </span>
                    <span
                      className="text-[10px] font-normal block truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {syncStatus === "syncing"
                        ? isIndonesian
                          ? "Menyinkronkan..."
                          : "Syncing..."
                        : syncStatus === "error"
                          ? isIndonesian
                            ? "Offline · Tersimpan lokal"
                            : "Offline · Local preserved"
                          : isIndonesian
                            ? `Tersinkron ${lastSyncedTime}`
                            : `Synced ${lastSyncedTime}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onSafeSync}
                    disabled={syncStatus === "syncing"}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1 disabled:opacity-60 cursor-pointer shrink-0 border"
                    style={{
                      background:
                        syncStatus === "success"
                          ? "var(--text-primary)"
                          : "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                      color:
                        syncStatus === "success"
                          ? "var(--bg-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {syncStatus === "syncing" && (
                      <Loader2 size={11} className="animate-spin" />
                    )}
                    {syncStatus === "success" && <Check size={11} />}
                    <span>
                      {syncStatus === "syncing"
                        ? isIndonesian
                          ? "Menyinkronkan"
                          : "Syncing"
                        : syncStatus === "success"
                          ? isIndonesian
                            ? "Tersinkron"
                            : "Synced"
                          : syncStatus === "error"
                            ? isIndonesian
                              ? "Coba Lagi"
                              : "Retry"
                            : isIndonesian
                              ? "Sinkronkan"
                              : "Sync Now"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Pending Offline Mutations Banner */}
            {hasAuthenticatedUser && pendingMutationsCount > 0 && (
              <div
                className="p-3 mx-3 mb-2 rounded-xl flex flex-col gap-2 border"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <RotateCcw size={12} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[12px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian
                          ? "Antrean Mutasi Tertunda"
                          : "Pending Offline Mutations"}
                      </span>
                      <span
                        className="text-[10px]  px-1.5 py-0.5 rounded border"
                        style={{
                          background: "var(--bg-elevated)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {pendingMutationsCount}
                      </span>
                    </div>
                    <p
                      className="text-[11px] font-normal leading-relaxed mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian
                        ? "Ada transaksi uji coba atau mutasi lokal yang belum tersimpan di cloud dan sedang memotong saldo Anda. Anda dapat membatalkannya untuk memulihkan saldo dompet seketika."
                        : "There are local test transactions not saved to cloud that deducted your balance. Discard them to restore your wallet balance immediately."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={onDiscardPendingAndRestore}
                    disabled={syncStatus === "syncing"}
                    className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                    <span>
                      {isIndonesian
                        ? "Buang Antrean & Reset Saldo"
                        : "Discard Queue & Reset Balance"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onSafeSync}
                    disabled={syncStatus === "syncing"}
                    className="py-1.5 px-2.5 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Cloud size={12} strokeWidth={1.75} />
                    <span>
                      {isIndonesian ? "Kirim ke Cloud" : "Sync to Cloud"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Link Web Dashboard */}
            {showWebDashboard && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onOpenWebDashboard();
                }}
                className="flex items-center justify-between py-2.5 px-3.5 min-h-[44px] active:bg-black/[0.03] dark:active:bg-white/[0.04] hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-left w-full"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Laptop size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-[13px] font-semibold block truncate leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Tautkan Web Dashboard"
                        : "Link Web Dashboard"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <QrCode size={11} strokeWidth={1.75} />
                    <span>{isIndonesian ? "Pindai" : "Scan"}</span>
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
              </button>
            )}

            {/* Unified Report Export & Encrypted Vault */}
            {showExportVault && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onOpenDataExportVault();
                }}
                className="flex items-center justify-between py-2.5 px-3.5 min-h-[44px] active:bg-black/[0.03] dark:active:bg-white/[0.04] hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-left w-full"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileSpreadsheet size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-[13px] font-semibold block truncate leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Laporan & Cadangan Vault"
                        : "Report & Data Vault"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: "var(--glass-border)",
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    {isIndonesian ? "Ekspor & Cadangan" : "Export & Backup"}
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Bank Statement Ingestion */}
            {onOpenImport && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onOpenImport();
                }}
                className="flex items-center justify-between py-2.5 px-3.5 min-h-[44px] active:bg-black/[0.03] dark:active:bg-white/[0.04] hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-left w-full"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileSpreadsheet size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian
                      ? "Impor Rekening Koran"
                      : "Import Bank Statement"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian ? "Bank / Mutasi" : "Bank / CSV"}
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 8. ABOUT & APP UPDATES */}
      {!searchQuery.trim() && (
        <section className="space-y-1.5 pt-1">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {isIndonesian ? "Aplikasi & Pembaruan" : "App & Updates"}
          </div>

          <div
            className="rounded-2xl overflow-hidden backdrop-blur-md shadow-sm"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={onCheckForUpdate}
              disabled={checkingUpdate}
              className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px] active:bg-black/[0.03] dark:active:bg-white/[0.04] hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-left w-full disabled:opacity-60"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Sparkles size={14} strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Trouvaille v{APP_VERSION}
                  </span>
                  <span
                    className="text-[11px] truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian
                      ? `Rilis ${APP_BUILD_NUMBER} · Ketuk untuk periksa pembaruan`
                      : `Build ${APP_BUILD_NUMBER} · Tap to check for updates`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {checkingUpdate ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                ) : releaseInfo?.hasUpdate ? (
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--text-primary)",
                      color: "var(--bg-primary)",
                    }}
                  >
                    {isIndonesian ? "Pembaruan" : "Update"}
                  </span>
                ) : (
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isIndonesian ? "Periksa" : "Check"}
                  </span>
                )}
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* 9. SIGN OUT / EXIT GUEST */}
      {!searchQuery.trim() && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-3 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>
              {isGuest
                ? isIndonesian
                  ? "Keluar Mode Tamu"
                  : "Exit Guest Mode"
                : isIndonesian
                  ? "Keluar Akun"
                  : "Log Out"}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
