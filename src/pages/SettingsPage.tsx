import { useState } from "react";
import { triggerHaptic } from "../lib/haptics";
import {
  ChevronRight,
  CreditCard,
  LayoutGrid,
  Target,
  Sun,
  User as UserIcon,
  Bell,
  Zap,
  Check,
  Loader2,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBills } from "../hooks/useBills";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSecurityLock } from "../contexts/SecurityLockContext";
import { useCategories, categoryKeys } from "../hooks/useCategories";
import { useWallets, walletKeys } from "../hooks/useWallets";
import { useGoals } from "../hooks/useGoals";
import { useBudgetTarget } from "../hooks/useBudgetTarget";
import { useShortcuts } from "../hooks/useShortcuts";
import { formatRupiah } from "../lib/utils";
import { format, isToday } from "date-fns";
import { supabase } from "../lib/supabase";
import {
  fetchAllTransactionsFromSupabase,
  transactionKeys,
} from "../hooks/useTransactions";
import { useWalletBalances } from "../hooks/useWalletBalances";
import { ResetTransactionsSheet } from "../components/ui/ResetTransactionsSheet";
import { requestNotificationPermission } from "../lib/notifications";
import { flushPendingMutations } from "../lib/syncEngine";
import { EncryptedVaultModal } from "../components/security/EncryptedVaultModal";

import { ProfileSheet } from "../components/settings/ProfileSheet";
import { BillManagementSheets } from "../components/settings/BillManagementSheets";
import { CategoryManagementSheets } from "../components/settings/CategoryManagementSheets";
import { WalletManagementSheets } from "../components/settings/WalletManagementSheets";
import { GoalManagementSheets } from "../components/settings/GoalManagementSheets";
import { ShortcutManagementSheets } from "../components/settings/ShortcutManagementSheets";
import { PinSetupModal } from "../components/settings/PinSetupModal";
import { BudgetTargetSheet } from "../components/settings/BudgetTargetSheet";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: bills = [] } = useBills();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const { goals } = useGoals();
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { budgetTarget, setBudgetTarget } = useBudgetTarget();
  const { shortcuts } = useShortcuts();
  const {
    securitySettings,
    updateSettings: updateSecuritySettings,
    isBiometricSupported,
    enrollBiometric,
  } = useSecurityLock();

  const { allTxs } = useWalletBalances();

  // Profile Form state
  const [displayName, setDisplayName] = useState(() => {
    return (
      session?.user?.user_metadata?.display_name ||
      session?.user?.email?.split("@")[0] ||
      "User"
    );
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return (
      session?.user?.user_metadata?.avatar_url ||
      localStorage.getItem("trouvaille_avatar") ||
      ""
    );
  });

  // Modal open states
  const [profileOpen, setProfileOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [billListOpen, setBillListOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [budgetTargetOpen, setBudgetTargetOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultDefaultTab, setVaultDefaultTab] = useState<"export" | "restore">("export");

  // Safe Sync state
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    const saved = localStorage.getItem("trouvaille_last_synced");
    if (!saved) return "Just now";
    try {
      const d = new Date(saved);
      return isToday(d)
        ? `Today, ${format(d, "HH:mm")}`
        : format(d, "dd MMM, HH:mm");
    } catch {
      return "Just now";
    }
  });

  const handleSafeSync = async () => {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    triggerHaptic("light");

    try {
      // 1. Flush any pending local mutations first so no new data is lost
      await flushPendingMutations();

      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // 2. Fetch complete transaction dataset using multi-page chunked engine
      const freshTxs = await fetchAllTransactionsFromSupabase({ userId });

      // 3. Fetch fresh wallets, categories, and bills
      const [freshWallets, freshCategories, freshBills] = await Promise.all([
        supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId)
          .order("name"),
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", userId)
          .order("name"),
        supabase
          .from("bills")
          .select("*")
          .eq("user_id", userId)
          .order("due_date", { ascending: true }),
      ]);

      if (freshWallets.error) throw freshWallets.error;
      if (freshCategories.error) throw freshCategories.error;
      if (freshBills.error) throw freshBills.error;

      // 4. Refresh exact user-scoped caches without poisoning other query shapes
      queryClient.setQueryData(transactionKeys.all(userId), freshTxs);
      queryClient.setQueryData(walletKeys.all(userId), freshWallets.data ?? []);
      queryClient.setQueryData(
        categoryKeys.all(userId),
        freshCategories.data ?? [],
      );
      queryClient.setQueryData(["bills", userId], freshBills.data ?? []);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
      ]);

      const now = new Date();
      localStorage.setItem("trouvaille_last_synced", now.toISOString());
      setLastSyncedTime(`Today, ${format(now, "HH:mm")}`);
      setSyncStatus("success");
      triggerHaptic("medium");
      showToast(
        `Data synchronized (${freshTxs.length} records)`,
        "update",
        () => {},
      );

      setTimeout(() => {
        setSyncStatus("idle");
      }, 3500);
    } catch (err) {
      console.error("[handleSafeSync] Sync error:", err);
      setSyncStatus("error");
      showToast("Sync failed. Local data preserved.", "delete", () => {});
      setTimeout(() => {
        setSyncStatus("idle");
      }, 4000);
    }
  };

  const handleExportCSV = () => {
    if (allTxs.length === 0) {
      showToast("No transaction data to export", "delete", () => {});
      return;
    }
    const headers = ["Date,Type,Amount,Category,Note"];
    const rows = allTxs.map((t: any) => {
      const date = t.occurred_on;
      const type =
        t.type === "income"
          ? "Income"
          : t.type === "expense"
            ? "Expense"
            : "Transfer";
      const amount = t.amount;
      const cat = t.categories?.name || "General";
      const note = t.note || "";
      return `${date},${type},${amount},"${cat}","${note}"`;
    });
    const csvContent =
      "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `trouvaille_export_${format(new Date(), "yyyyMMdd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV exported successfully", "add", () => {});
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  return (
    <div className="px-5 py-6 space-y-6 pb-36">
      <h1
        className="text-[24px] font-extrabold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        Settings
      </h1>

      {/* ============================================================ */}
      {/* 1. PROFILE SECTION */}
      {/* ============================================================ */}
      <section className="glass-surface p-4 rounded-[24px] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 2px 8px var(--shadow-strength)",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon size={20} style={{ color: "var(--text-secondary)" }} />
            )}
          </div>
          <div>
            <p
              className="font-extrabold text-[16px] truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {displayName}
            </p>
            <p
              className="text-[11px] font-medium truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {session?.user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => setProfileOpen(true)}
          className="px-4 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        >
          Edit
        </button>
      </section>

      {/* ============================================================ */}
      {/* 2. FINANCIAL SETUP SECTION */}
      {/* ============================================================ */}
      <section>
        <h2
          className="text-[13px] font-bold mb-3 px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          Financial Setup
        </h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
          {/* Categories */}
          <button
            onClick={() => setCategoriesOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <LayoutGrid size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Manage Categories
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {categories.length}
              </span>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
          </button>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Accounts & Wallets */}
          <button
            onClick={() => setBudgetsOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <CreditCard size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Accounts & Wallets
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {wallets.length}
              </span>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
          </button>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Recurring Bills */}
          <button
            onClick={() => setBillListOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Bell size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Recurring Bills
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {bills.length}
              </span>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
          </button>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Financial Goals */}
          <button
            onClick={() => setGoalsOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Target size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Financial Goals
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {goals.length}
              </span>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
          </button>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Monthly Budget Target */}
          <button
            onClick={() => setBudgetTargetOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Target size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Monthly Budget Target
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {formatRupiah(budgetTarget)}
              </span>
              <ChevronRight
                size={18}
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. PREFERENCES SECTION */}
      {/* ============================================================ */}
      <section>
        <h2
          className="text-[13px] font-bold mb-3 px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          App Preferences
        </h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
          {/* Appearance Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Sun size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Light Appearance
              </span>
            </div>
            <label className="ios-toggle cursor-pointer">
              <input
                type="checkbox"
                checked={theme === "light"}
                onChange={toggleTheme}
              />
              <div className="ios-toggle-track"></div>
              <div className="ios-toggle-knob"></div>
            </label>
          </div>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Notifications */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Bell size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Bill Reminders
              </span>
            </div>
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission();
                if (granted)
                  showToast("Bill reminders enabled!", "add", () => {});
                else
                  showToast(
                    "Notification permission denied",
                    "delete",
                    () => {},
                  );
              }}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              Active
            </button>
          </div>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Quick Shortcuts */}
          <button
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Zap size={16} />
              </div>
              <span
                className="font-bold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              >
                Quick-Add Shortcuts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-bold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {shortcuts.length}
              </span>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. DATA & STORAGE SECTION */}
      {/* ============================================================ */}
      <section>
        <h2
          className="text-[13px] font-bold mb-3 px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          Data & Storage
        </h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
          {/* On-Device & Cloud Sync */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                On-Device Storage & Sync
              </span>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {syncStatus === "syncing"
                  ? "Synchronizing database records..."
                  : syncStatus === "error"
                    ? "Sync error · Local data safe"
                    : `${allTxs.length} records cached · Last synced ${lastSyncedTime}`}
              </p>
            </div>
            <button
              onClick={handleSafeSync}
              disabled={syncStatus === "syncing"}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shrink-0"
              style={{
                background:
                  syncStatus === "success"
                    ? "var(--accent)"
                    : "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color:
                  syncStatus === "success"
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
              }}
            >
              {syncStatus === "syncing" && (
                <Loader2 size={12} className="animate-spin" />
              )}
              {syncStatus === "success" && <Check size={12} />}
              <span>
                {syncStatus === "syncing"
                  ? "Syncing..."
                  : syncStatus === "success"
                    ? "Synced"
                    : syncStatus === "error"
                      ? "Retry"
                      : "Sync Now"}
              </span>
            </button>
          </div>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Unified Encrypted Vault (Backup & Restore) */}
          <button
            type="button"
            onClick={() => {
              setVaultDefaultTab("export");
              setVaultModalOpen(true);
              triggerHaptic("light");
            }}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
          >
            <div className="space-y-0.5">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                Encrypted Vault
              </span>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Export offline AES-256 backup or restore from .trouvaille file
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
          >
            <div className="space-y-0.5">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                Export to CSV
              </span>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Download unencrypted spreadsheet of all transactions
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div
            className="h-[1px] w-full"
            style={{ background: "var(--glass-border)" }}
          />

          {/* Reset Data */}
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
          >
            <div className="space-y-0.5">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                Reset Transaction Data
              </span>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Purge selected timeframes or clear all transaction records
              </p>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SECURITY & PRIVACY */}
      {/* ============================================================ */}
      <section>
        <h2
          className="text-[13px] font-bold mb-3 px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          Security & Privacy
        </h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
          {/* Toggle: Require Face ID / Passkey */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 pr-3">
              <span
                className="text-[13px] font-semibold block"
                style={{ color: "var(--text-primary)" }}
              >
                Require Face ID / Passkey
              </span>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Require biometric verification when resuming or opening the app
              </p>
            </div>
            {/* Apple iOS Switch - Zero Icons */}
            <button
              type="button"
              role="switch"
              aria-checked={securitySettings.enabled}
              onClick={async () => {
                if (!securitySettings.enabled) {
                  // Require backup PIN first to guarantee user is never locked out
                  if (!securitySettings.hasPin) {
                    showToast(
                      "Please set up a backup PIN first to enable app lock",
                      "info",
                      null,
                      3000,
                    );
                    setPinModalOpen(true);
                    return;
                  }

                  if (isBiometricSupported && !securitySettings.hasBiometric) {
                    try {
                      await enrollBiometric(session?.user?.email || undefined);
                      updateSecuritySettings({ enabled: true });
                      showToast(
                        "Face ID / Biometrics enabled",
                        "update",
                        () => {},
                      );
                    } catch (err: any) {
                      showToast(
                        err?.message ||
                          "Biometric setup failed. App lock enabled with PIN.",
                        "info",
                        null,
                        3000,
                      );
                      updateSecuritySettings({ enabled: true });
                    }
                  } else {
                    updateSecuritySettings({ enabled: true });
                    triggerHaptic("medium");
                    showToast("App lock enabled", "update", () => {});
                  }
                } else {
                  updateSecuritySettings({ enabled: false });
                  triggerHaptic("light");
                  showToast("App lock disabled", "update", () => {});
                }
              }}
              className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                securitySettings.enabled
                  ? "bg-white dark:bg-white"
                  : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full shadow-md transition-transform ${
                  securitySettings.enabled
                    ? "translate-x-4.5 bg-black dark:bg-black"
                    : "translate-x-0 bg-white"
                }`}
              />
            </button>
          </div>

          {securitySettings.enabled && (
            <>
              <div
                className="h-[1px] w-full"
                style={{ background: "var(--glass-border)" }}
              />

              {/* Timeout Preference */}
              <div className="p-4 space-y-2">
                <div>
                  <span
                    className="text-[13px] font-semibold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Lock Timeout
                  </span>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Automatically lock when inactive or backgrounded
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  {[
                    { label: "Immediately", value: 0 },
                    { label: "1 Minute", value: 1 },
                    { label: "5 Minutes", value: 5 },
                  ].map((opt) => {
                    const isSelected =
                      securitySettings.timeoutMinutes === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          updateSecuritySettings({ timeoutMinutes: opt.value });
                          triggerHaptic("light");
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer"
                        style={{
                          background: isSelected
                            ? "var(--bg-elevated)"
                            : "var(--glass-fill)",
                          border: isSelected
                            ? "1px solid var(--text-primary)"
                            : "1px solid var(--glass-border)",
                          color: isSelected
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="h-[1px] w-full"
                style={{ background: "var(--glass-border)" }}
              />

              {/* Security PIN Option */}
              <button
                type="button"
                onClick={() => {
                  setPinModalOpen(true);
                  triggerHaptic("light");
                }}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="space-y-0.5">
                  <span
                    className="text-[13px] font-semibold block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {securitySettings.hasPin
                      ? "Change Backup PIN"
                      : "Setup Backup Security PIN"}
                  </span>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {securitySettings.hasPin
                      ? "Backup PIN is active for device unlock"
                      : "Unlock using 4-6 digit numeric PIN"}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  style={{ color: "var(--text-tertiary)" }}
                />
              </button>
            </>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. LOGOUT */}
      {/* ============================================================ */}
      <button
        onClick={handleLogout}
        className="w-full p-4 rounded-[24px] font-semibold text-[13.5px] flex items-center justify-center gap-2 active:scale-98 transition-all mb-6 cursor-pointer"
        style={{
          background: "var(--glass-fill)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-secondary)",
        }}
      >
        <LogOut size={15} strokeWidth={1.75} /> Sign Out
      </button>

      {/* ============================================================ */}
      {/* MODULAR BOTTOM SHEETS / MODALS */}
      {/* ============================================================ */}

      <ProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        displayName={displayName}
        setDisplayName={setDisplayName}
      />

      <BillManagementSheets
        isOpen={billListOpen}
        onClose={() => setBillListOpen(false)}
      />

      <BudgetTargetSheet
        isOpen={budgetTargetOpen}
        onClose={() => setBudgetTargetOpen(false)}
        budgetTarget={budgetTarget}
        setBudgetTarget={setBudgetTarget}
      />

      <GoalManagementSheets
        isOpen={goalsOpen}
        onClose={() => setGoalsOpen(false)}
      />

      <CategoryManagementSheets
        isOpen={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />

      <WalletManagementSheets
        isOpen={budgetsOpen}
        onClose={() => setBudgetsOpen(false)}
      />

      <ShortcutManagementSheets
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <PinSetupModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
      />

      <ResetTransactionsSheet
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
      />

      <EncryptedVaultModal
        isOpen={vaultModalOpen}
        onClose={() => setVaultModalOpen(false)}
        defaultTab={vaultDefaultTab}
      />
    </div>
  );
}
