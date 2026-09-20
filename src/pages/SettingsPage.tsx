import { useState } from "react";
import { triggerHaptic } from "../lib/haptics";
import {
  ChevronRight,
  User as UserIcon,
  Check,
  Loader2,
  LogOut,
  FolderTree,
  CreditCard,
  TrendingUp,
  Receipt,
  Target,
  SlidersHorizontal,
  Sun,
  BellRing,
  Zap,
  Smartphone,
  Cloud,
  FileLock2,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  Clock,
  KeyRound,
  Camera,
  Search,
  X,
  EyeOff,
  Tag,
  Coins,
} from "lucide-react";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { CurrencySwitcherSheet } from "../components/currency/CurrencySwitcherSheet";
import { AppleShortcutsGuideModal } from "../components/settings/AppleShortcutsGuideModal";
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
import { ResetTransactionsSheet } from "../components/settings/ResetTransactionsSheet";
import {
  requestNotificationPermission,
  syncBillNotifications,
  cancelAllBillNotifications,
} from "../lib/notifications";
import { flushPendingMutations } from "../lib/syncEngine";
import { EncryptedVaultModal } from "../components/security/EncryptedVaultModal";
import { saveBiometricLoginCredentials } from "../lib/biometricAuth";

import { ProfileSheet } from "../components/settings/ProfileSheet";
import { BillManagementSheets } from "../components/settings/BillManagementSheets";
import { CategoryManagementSheets } from "../components/settings/CategoryManagementSheets";
import { WalletManagementSheets } from "../components/settings/WalletManagementSheets";
import { GoalManagementSheets } from "../components/settings/GoalManagementSheets";
import { ShortcutManagementSheets } from "../components/settings/ShortcutManagementSheets";
import { PinSetupModal } from "../components/settings/PinSetupModal";
import { BudgetTargetSheet } from "../components/settings/BudgetTargetSheet";
import { MediaPermissionsSheet } from "../components/settings/MediaPermissionsSheet";
import { AssetValuationSheet } from "../components/settings/AssetValuationSheet";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: bills = [] } = useBills();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const { goals } = useGoals();
  const { session, signOut, isGuest, exitGuestMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { budgetTarget, setBudgetTarget, budgetPeriodStart, setBudgetPeriodStart } = useBudgetTarget();
  const { shortcuts } = useShortcuts();
  const { securitySettings, updateSettings: updateSecuritySettings, isBiometricSupported, enrollBiometric } = useSecurityLock();
  const { isPrivacyShieldEnabled, togglePrivacyShield } = usePrivacy();

  const [tagsEnabled, setTagsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("trouvaille_enable_tags");
    return saved !== null ? saved === "true" : true;
  });

  const handleToggleTags = () => {
    const next = !tagsEnabled;
    setTagsEnabled(next);
    localStorage.setItem("trouvaille_enable_tags", String(next));
    showToast(
      next ? "Transaction tags enabled" : "Transaction tags disabled",
      "update",
      () => {},
    );
  };

  const [saveAttachmentsEnabled, setSaveAttachmentsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("trouvaille_save_attachments");
    return saved !== null ? saved === "true" : false;
  });

  const handleToggleSaveAttachments = () => {
    const next = !saveAttachmentsEnabled;
    setSaveAttachmentsEnabled(next);
    localStorage.setItem("trouvaille_save_attachments", String(next));
    showToast(
      next ? "Receipt attachments will be saved" : "Receipt attachments will not be stored",
      "update",
      () => {},
    );
  };

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
  const [backTapGuideOpen, setBackTapGuideOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultDefaultTab, setVaultDefaultTab] = useState<"export" | "restore">("export");
  const [mediaPermissionsOpen, setMediaPermissionsOpen] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const { preferredCurrency, currencyMeta } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");

  const matches = (title: string, desc?: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return title.toLowerCase().includes(q) || (desc ? desc.toLowerCase().includes(q) : false);
  };

  // Bill Reminders toggle state & handler
  const [billRemindersEnabled, setBillRemindersEnabled] = useState(() => {
    return localStorage.getItem("trouvaille_bill_reminders_enabled") !== "false";
  });

  const handleToggleBillReminders = async () => {
    triggerHaptic("light");
    if (billRemindersEnabled) {
      setBillRemindersEnabled(false);
      localStorage.setItem("trouvaille_bill_reminders_enabled", "false");
      await cancelAllBillNotifications();
      showToast("Bill reminders turned off", "delete", () => {});
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setBillRemindersEnabled(true);
        localStorage.setItem("trouvaille_bill_reminders_enabled", "true");
        await syncBillNotifications(bills);
        showToast("Bill reminders enabled", "add", () => {});
      } else {
        showToast("Notification permission denied", "delete", () => {});
      }
    }
  };

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
      await signOut();
    }
  };

  // Search filtering checks
  const showCategories = matches("Manage Categories", "Expense and income classifications");
  const showWallets = matches("Account & Wallets", "Bank accounts, e-wallets, and cash");
  const showBills = matches("Recurring Bills", "Subscriptions and scheduled commitments");
  const showGoals = matches("Financial Goals", "Savings targets and milestone progress");
  const showBudget = matches("Monthly Budget Target", "Target monthly spending limit");
  const showValuation = matches("Asset Valuation", "USDT, crypto, and investment holdings");
  const hasSection1 = showCategories || showWallets || showBills || showGoals || showBudget || showValuation;

  const showTheme = matches("Light Appearance", "Toggle light or obsidian luxury theme");
  const showBillReminders = matches("Bill Reminders", "Local notifications for scheduled bills");
  const showShortcuts = matches("Quick-Add Shortcuts", "Fast entry shortcuts and voice input");
  const showBackTap = matches("iPhone Back Tap", "iOS accessibility shortcuts integration");
  const showTags = matches("Transaction Tags (#)", "Categorize with #reimburse, #work, #personal");
  const hasSection2 = showTheme || showBillReminders || showShortcuts || showBackTap || showTags;

  const showCloudSync = matches("Cloud Sync", "Safely backup data to private vault");
  const showVault = matches("Encrypted Vault", "Local AES-256 encrypted file backup");
  const showExport = matches("Export CSV", "Download transactions as spreadsheet");
  const showReset = matches("Reset Data", "Wipe transaction ledger while keeping accounts");
  const hasSection3 = showCloudSync || showVault || showExport || showReset;

  const showPrivacyShield = matches("Privacy Shield", "Mask balances and monetary figures across all pages");
  const showFaceID = matches("Require Face ID / PIN", "Protect app with biometric authentication");
  const showTimeout = matches("Lock Timeout", "Duration before app automatically locks");
  const showBackupPin = matches("Backup PIN Option", "Passcode fallback when biometrics fail");
  const showMedia = matches("Camera & Photos Access", "Permissions for receipt scanning and slips");
  const showSaveAttachments = matches("Save Attachment Files", "Turn off to read receipts without storing images");
  const hasSection4 = showPrivacyShield || showFaceID || showTimeout || showBackupPin || showMedia || showSaveAttachments;

  const hasAnyMatch = hasSection1 || hasSection2 || hasSection3 || hasSection4;

  return (
    <div className="px-5 py-6 space-y-6 pb-36">
      <h1
        className="text-[22px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        Settings
      </h1>

      {/* Search Settings Bar */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <Search size={15} style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings, preferences & security..."
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
          style={{ color: "var(--text-primary)" }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setSearchQuery("");
            }}
            className="p-1 rounded-full text-[var(--text-tertiary)] active:scale-90 cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. PROFILE SECTION */}
      {/* ============================================================ */}
      {!searchQuery.trim() && (
        <section className="glass-surface p-4 rounded-[24px] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 2px 8px var(--shadow-strength)",
                }}
              >
                {isGuest ? (
                  <Zap size={20} style={{ color: "var(--text-secondary)" }} />
                ) : avatarUrl ? (
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
                  className="font-semibold text-[15px] truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isGuest ? "Local Guest" : displayName}
                </p>
                <p
                  className="text-[11px] font-normal truncate"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isGuest ? "Free · On-device storage" : session?.user?.email}
                </p>
              </div>
            </div>
            {isGuest ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  exitGuestMode();
                }}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => setProfileOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                Edit
              </button>
            )}
          </div>

          {isGuest && (
            <div
              className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="space-y-0.5">
                <p
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Enable Cloud Sync & Backup
                </p>
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Sign in with Google, Apple, or Email to backup transactions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  exitGuestMode();
                }}
                className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 active:scale-95 transition-transform cursor-pointer border"
                style={{
                  background: "var(--glass-fill)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                Connect
              </button>
            </div>
          )}
        </section>
      )}

      {/* Empty Search State */}
      {!hasAnyMatch && searchQuery.trim() && (
        <div className="py-12 text-center space-y-2">
          <Search size={26} className="mx-auto text-[var(--text-tertiary)] opacity-50" />
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
            No settings found
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            No settings match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. FINANCIAL SETUP SECTION */}
      {/* ============================================================ */}
      {hasSection1 && (
        <section>
          <h2
            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Financial Setup
          </h2>
          <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col divide-y divide-[var(--glass-border)]">
            {/* 1. Manage Categories */}
            {showCategories && (
              <button
                onClick={() => setCategoriesOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FolderTree size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Manage Categories
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Expense & income groups
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[12px] font-medium font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {categories.length}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            )}

            {/* 2. Account & Wallets */}
            {showWallets && (
              <button
                onClick={() => setBudgetsOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <CreditCard size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Account & Wallets
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Bank accounts, cards & cash
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[12px] font-medium font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {wallets.length}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            )}

            {/* 3. Recurring Bills */}
            {showBills && (
              <button
                onClick={() => setBillListOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Receipt size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Recurring Bills
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Subscriptions & recurring bills
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[12px] font-medium font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {bills.length}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            )}

            {/* 4. Financial Goals */}
            {showGoals && (
              <button
                onClick={() => setGoalsOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Target size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Financial Goals
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Milestones & savings targets
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[12px] font-medium font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {goals.length}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            )}

            {/* 5. Monthly Budget Target */}
            {showBudget && (
              <button
                onClick={() => setBudgetTargetOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <SlidersHorizontal size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Monthly Budget Target
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Monthly spending ceiling
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[12px] font-semibold font-mono amount"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatRupiah(budgetTarget)} · Day {budgetPeriodStart}
                  </span>
                  <ChevronRight
                    size={18}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
              </button>
            )}

            {/* Asset Valuation */}
            {showValuation && (
              <button
                onClick={() => setValuationOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <TrendingUp size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Asset Valuation
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Crypto & investments
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 3. PREFERENCES SECTION */}
      {/* ============================================================ */}
      {hasSection2 && (
        <section>
          <h2
            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            App Preferences
          </h2>
          <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col divide-y divide-[var(--glass-border)]">
            {/* Base Currency & Exchange Rates */}
            {matches("Base Currency", "Active valuation currency & live rates") && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setCurrencySheetOpen(true);
                }}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Coins size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Base Currency & Rates
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Valuation currency & live quotes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[var(--glass-border)] flex items-center gap-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span className="font-mono font-bold text-[10px] opacity-70">
                      {currencyMeta.countryCode}
                    </span>
                    <span>{preferredCurrency} ({currencyMeta.symbol})</span>
                  </span>
                  <ChevronRight
                    size={18}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
              </button>
            )}

            {/* Appearance Toggle */}
            {showTheme && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Sun size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Light Appearance
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Light or obsidian luxury theme
                    </p>
                  </div>
                </div>
                <label className="ios-toggle cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={theme === "light"}
                    onChange={toggleTheme}
                  />
                  <div className="ios-toggle-track"></div>
                  <div className="ios-toggle-knob"></div>
                </label>
              </div>
            )}

            {/* Bill Reminders Toggle */}
            {showBillReminders && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <BellRing size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Bill Reminders
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Alert before & on due date
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={billRemindersEnabled}
                  onClick={handleToggleBillReminders}
                  className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                    billRemindersEnabled
                      ? "bg-white dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full shadow-md transition-transform ${
                      billRemindersEnabled
                        ? "translate-x-4.5 bg-black dark:bg-black"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Quick Shortcuts */}
            {showShortcuts && (
              <button
                onClick={() => setShortcutsOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Zap size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Quick-Add Shortcuts
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      1-tap quick logging presets
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[12px] font-medium font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {shortcuts.length}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            )}

            {/* iPhone Back Tap */}
            {showBackTap && (
              <button
                onClick={() => setBackTapGuideOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Smartphone size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      iPhone Back Tap
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Double-tap back to quick record
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: "var(--glass-border)",
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    Setup
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            )}

            {/* Transaction Tags (#) Toggle */}
            {showTags && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Tag size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Transaction Tags (#)
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Categorize with #reimburse, #work, #personal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tagsEnabled}
                  onClick={handleToggleTags}
                  className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                    tagsEnabled
                      ? "bg-white dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full shadow-md transition-transform ${
                      tagsEnabled
                        ? "translate-x-4.5 bg-black dark:bg-black"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 4. DATA & STORAGE SECTION */}
      {/* ============================================================ */}
      {hasSection3 && (
        <section>
          <h2
            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Data & Storage
          </h2>
          <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col divide-y divide-[var(--glass-border)]">
            {/* Cloud Sync */}
            {showCloudSync && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Cloud size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Cloud Sync
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
                </div>
                <button
                  onClick={handleSafeSync}
                  disabled={syncStatus === "syncing"}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shrink-0"
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
            )}

            {/* Encrypted Vault */}
            {showVault && (
              <button
                type="button"
                onClick={() => {
                  setVaultDefaultTab("export");
                  setVaultModalOpen(true);
                  triggerHaptic("light");
                }}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileLock2 size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
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
                      Offline AES-256 backup & restore
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}

            {/* Export CSV */}
            {showExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <FileSpreadsheet size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Export CSV
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Download spreadsheet ledger
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}

            {/* Reset Data */}
            {showReset && (
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <RotateCcw size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Reset Data
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Purge transactions or period data
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 5. SECURITY & PRIVACY */}
      {/* ============================================================ */}
      {hasSection4 && (
        <section>
          <h2
            className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Security & Privacy
          </h2>
          <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col divide-y divide-[var(--glass-border)]">
            {/* Privacy Shield Toggle */}
            {showPrivacyShield && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <EyeOff size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Privacy Shield
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Hide balances across all pages
                    </p>
                  </div>
                </div>
                {/* Apple iOS Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivacyShieldEnabled}
                  onClick={() => {
                    togglePrivacyShield();
                    showToast(
                      isPrivacyShieldEnabled
                        ? "Privacy Shield disabled"
                        : "Privacy Shield enabled",
                      "update",
                      () => {},
                    );
                  }}
                  className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                    isPrivacyShieldEnabled
                      ? "bg-white dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full shadow-md transition-transform ${
                      isPrivacyShieldEnabled
                        ? "translate-x-4.5 bg-black dark:bg-black"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Toggle: Require Face ID / PIN */}
            {showFaceID && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <ShieldCheck size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Require Face ID / PIN
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Biometric app lock on resume
                    </p>
                  </div>
                </div>
                {/* Apple iOS Switch */}
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
                          if (session) {
                            saveBiometricLoginCredentials(session.user?.email || "", session);
                          }
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
            )}

            {securitySettings.enabled && (
              <>
                {/* Timeout Preference */}
                {showTimeout && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <Clock size={16} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
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
                          Lock after period of inactivity
                        </p>
                      </div>
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
                            className="flex-1 py-2 px-2.5 rounded-xl text-[11px] font-semibold transition-all text-center cursor-pointer"
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
                )}

                {/* Security PIN Option */}
                {showBackupPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalOpen(true);
                      triggerHaptic("light");
                    }}
                    className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <KeyRound size={16} strokeWidth={1.75} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span
                          className="text-[13px] font-semibold block"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {securitySettings.hasPin
                            ? "Change Backup PIN"
                            : "Setup Backup PIN"}
                        </span>
                        <p
                          className="text-[11px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {securitySettings.hasPin
                            ? "Backup passcode active for unlock"
                            : "Unlock using 4-6 digit PIN"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </button>
                )}
              </>
            )}

            {/* Camera & Gallery Access (Moved to Security & Privacy!) */}
            {showMedia && (
              <button
                type="button"
                onClick={() => setMediaPermissionsOpen(true)}
                className="flex items-center justify-between p-4 active:bg-black/5 transition-colors cursor-pointer text-left w-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Camera size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Camera & Photos Access
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Receipt scanner & photo access
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}

            {/* Save Attachment Files Toggle */}
            {showSaveAttachments && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Camera size={16} strokeWidth={1.75} />
                  </div>
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <span
                      className="text-[13px] font-semibold block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Save Attachment Files
                    </span>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Turn off to read receipts without storing images
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={saveAttachmentsEnabled}
                  onClick={handleToggleSaveAttachments}
                  className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                    saveAttachmentsEnabled
                      ? "bg-white dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full shadow-md transition-transform ${
                      saveAttachmentsEnabled
                        ? "translate-x-4.5 bg-black dark:bg-black"
                        : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 6. LOGOUT */}
      {/* ============================================================ */}
      {!searchQuery.trim() && (
        <button
          onClick={isGuest ? exitGuestMode : handleLogout}
          className="w-full p-4 rounded-[24px] font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-98 transition-all mb-6 cursor-pointer"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span>{isGuest ? "Exit Guest Mode" : "Log Out"}</span>
        </button>
      )}

      {/* ============================================================ */}
      {/* MODULAR BOTTOM SHEETS / MODALS */}
      {/* ============================================================ */}

      <ProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        setDisplayName={setDisplayName}
        setAvatarUrl={setAvatarUrl}
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
        budgetPeriodStart={budgetPeriodStart}
        setBudgetPeriodStart={setBudgetPeriodStart}
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

      <AppleShortcutsGuideModal
        isOpen={backTapGuideOpen}
        onClose={() => setBackTapGuideOpen(false)}
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

      <MediaPermissionsSheet
        isOpen={mediaPermissionsOpen}
        onClose={() => setMediaPermissionsOpen(false)}
      />

      <AssetValuationSheet
        isOpen={valuationOpen}
        onClose={() => setValuationOpen(false)}
      />

      <CurrencySwitcherSheet
        isOpen={currencySheetOpen}
        onClose={() => setCurrencySheetOpen(false)}
      />
    </div>
  );
}
