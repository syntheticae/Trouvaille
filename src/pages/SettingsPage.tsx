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
  Calculator,
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
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
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
import { ResetTransactionsSheet } from "../components/settings/ResetTransactionsSheet";
import { LuxuryReportExportSheet } from "../components/export/LuxuryReportExportSheet";
import {
  requestNotificationPermission,
  syncBillNotifications,
  cancelAllBillNotifications,
  syncDailyStreakReminder,
  cancelDailyStreakReminder,
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
import { DeleteAccountModal } from "../components/settings/DeleteAccountModal";



interface SettingsPageProps {
  onOpenImport?: () => void;
}

export function SettingsPage({ onOpenImport }: SettingsPageProps = {}) {
  const queryClient = useQueryClient();
  const { data: bills = [] } = useBills();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const { goals } = useGoals();
  const { session, signOut, isGuest, exitGuestMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { budgetTarget, setBudgetTarget, budgetPeriodStart, setBudgetPeriodStart } =
    useBudgetTarget();
  const { shortcuts } = useShortcuts();
  const {
    securitySettings,
    updateSettings: updateSecuritySettings,
    isBiometricSupported,
    enrollBiometric,
  } = useSecurityLock();
  const { isPrivacyShieldEnabled, togglePrivacyShield } = usePrivacy();
  const { preferredCurrency, currencyMeta } = useCurrency();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Transaction Tags toggle
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

  // Save Attachments toggle
  const [saveAttachmentsEnabled, setSaveAttachmentsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("trouvaille_save_attachments");
    return saved !== null ? saved === "true" : false;
  });

  const handleToggleSaveAttachments = () => {
    const next = !saveAttachmentsEnabled;
    setSaveAttachmentsEnabled(next);
    localStorage.setItem("trouvaille_save_attachments", String(next));
    showToast(
      next
        ? "Receipt attachments will be saved"
        : "Receipt attachments will not be stored",
      "update",
      () => {},
    );
  };

  // Liquid Glass Custom Keypad toggle
  const [customKeypadEnabled, setCustomKeypadEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("trouvaille_keypad_mode");
    return saved !== "system";
  });

  const handleToggleCustomKeypad = () => {
    const next = !customKeypadEnabled;
    setCustomKeypadEnabled(next);
    localStorage.setItem("trouvaille_keypad_mode", next ? "custom" : "system");
    showToast(
      next ? "Liquid custom keypad active" : "Default system keyboard active",
      "update",
      () => {},
    );
  };

  // Profile state
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
  const [vaultDefaultTab, setVaultDefaultTab] = useState<"export" | "restore">(
    "export",
  );
  const [mediaPermissionsOpen, setMediaPermissionsOpen] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Notification toggles
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

  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(() => {
    return localStorage.getItem("trouvaille_daily_reminder_enabled") !== "false";
  });

  const handleToggleDailyReminder = async () => {
    triggerHaptic("light");
    if (dailyReminderEnabled) {
      setDailyReminderEnabled(false);
      localStorage.setItem("trouvaille_daily_reminder_enabled", "false");
      await cancelDailyStreakReminder();
      showToast("Daily streak reminder turned off", "delete", () => {});
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setDailyReminderEnabled(true);
        localStorage.setItem("trouvaille_daily_reminder_enabled", "true");
        await syncDailyStreakReminder(false);
        showToast("Daily streak reminder enabled", "add", () => {});
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
      await flushPendingMutations();

      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const freshTxs = await fetchAllTransactionsFromSupabase({ userId });

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

  const handleRerunCustomization = () => {
    triggerHaptic("medium");
    if (
      confirm(
        "Reset onboarding state? Your existing transaction ledger will remain safe, and you can re-experience the customization wizard immediately.",
      )
    ) {
      localStorage.removeItem("trouvaille_onboarded");
      localStorage.removeItem("trouvaille_onboarding_focus");
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOut();
    }
  };

  // Search filtering
  const matches = (title: string, keywords?: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      title.toLowerCase().includes(q) ||
      (keywords ? keywords.toLowerCase().includes(q) : false)
    );
  };

  // Section 1: Financial Architecture
  const showCategories = matches("Manage Categories", "expense income groups classifications");
  const showWallets = matches("Account & Wallets", "bank cash balance cards accounts");
  const showBudget = matches("Monthly Budget Target", "spending limit monthly budget");
  const showBills = matches("Recurring Bills", "subscriptions commitments due dates bills");
  const showGoals = matches("Financial Goals", "savings target milestone progress goals");
  const showValuation = matches("Asset Valuation", "crypto stock usdt holdings investment");
  const showCurrency = matches("Base Currency", "rates exchange valuation usd idr forex");
  const hasArchitecture =
    showCategories ||
    showWallets ||
    showBudget ||
    showBills ||
    showGoals ||
    showValuation ||
    showCurrency;

  // Section 2: Preferences
  const showTheme = matches("Light Appearance", "dark light obsidian theme appearance color");
  const showKeypad = matches("Liquid Numeric Keypad", "keypad keyboard input calculator custom number pad");
  const showTags = matches("Transaction Tags (#)", "tags hashtag work reimburse personal");
  const showSaveAttachments = matches("Save Attachment Files", "receipts camera slip images photos");
  const hasPreferences = showTheme || showKeypad || showTags || showSaveAttachments;

  // Section 3: Automations & Siri
  const showShortcuts = matches("Quick-Add Shortcuts", "fast entry quick voice 1-tap presets");
  const showBackTap = matches("iPhone Back Tap", "ios accessibility double tap shortcut");
  const hasAutomations = showShortcuts || showBackTap;

  // Section 4: Notifications
  const showDailyReminder = matches("Daily Streak Reminder", "streak 20:00 night notification alert");
  const showBillReminders = matches("Bill Due Alerts", "bill reminders scheduled commit due");
  const hasNotifications = showDailyReminder || showBillReminders;

  // Section 5: Security & Privacy
  const showPrivacyShield = matches("Privacy Shield", "mask hide numbers balance monetary figures");
  const showFaceID = matches("Require Face ID / PIN", "biometrics face id touch pin lock resume");
  const showTimeout = matches("Lock Timeout", "inactivity duration delay minutes");
  const showBackupPin = matches("Backup PIN Option", "passcode fallback pin change");
  const showMedia = matches("Camera & Photos Access", "permissions receipt scanner gallery");
  const hasSecurity =
    showPrivacyShield ||
    showFaceID ||
    showTimeout ||
    showBackupPin ||
    showMedia;

  // Section 6: Data & Vault
  const showCloudSync = matches("Cloud Sync", "backup database synchronization live");
  const showVault = matches("Encrypted Vault", "aes-256 file backup export restore offline");
  const showExport = matches("Report & Tax Export", "csv excel pdf statement tax ledger json");
  const showReset = matches("Reset Ledger Data", "wipe purge transactions reset ledger");
  const showRerunOnboarding = matches("Re-run Customization Wizard", "reset onboarding wizard setup test");
  const hasDataVault =
    showCloudSync ||
    showVault ||
    showExport ||
    showReset ||
    showRerunOnboarding;

  const hasAnyMatch =
    hasArchitecture ||
    hasPreferences ||
    hasAutomations ||
    hasNotifications ||
    hasSecurity ||
    hasDataVault;

  return (
    <div className="px-5 py-6 space-y-5 pb-36 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h1>
        <p className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
          Preferences, financial architecture & security
        </p>
      </div>

      {/* Search Bar */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <Search size={14} style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings, shortcuts & security..."
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
            <X size={12} />
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. PROFILE & ACCOUNT CARD */}
      {/* ============================================================ */}
      {!searchQuery.trim() && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setProfileOpen(true);
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
                  {isGuest ? "Local Guest" : displayName}
                </p>
                <p
                  className="text-[11px] font-medium truncate mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {isGuest ? "Offline Device Vault" : session?.user?.email}
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
                Edit
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
                Ledger stored offline · Connect to backup
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  exitGuestMode();
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 active:scale-95 transition-transform cursor-pointer border"
                style={{
                  background: "var(--accent)",
                  borderColor: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                Connect Cloud
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty Search State */}
      {!hasAnyMatch && searchQuery.trim() && (
        <div className="py-12 text-center space-y-2">
          <Search
            size={24}
            className="mx-auto text-[var(--text-tertiary)] opacity-50"
          />
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            No settings found
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            No options match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. FINANCIAL ARCHITECTURE */}
      {/* ============================================================ */}
      {hasArchitecture && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Financial Architecture
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Manage Categories */}
            {showCategories && (
              <button
                type="button"
                onClick={() => setCategoriesOpen(true)}
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
                    <FolderTree size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Manage Categories
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {categories.length}
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Account & Wallets */}
            {showWallets && (
              <button
                type="button"
                onClick={() => setBudgetsOpen(true)}
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
                    <CreditCard size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Accounts & Wallets
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {wallets.length}
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Monthly Budget Target */}
            {showBudget && (
              <button
                type="button"
                onClick={() => setBudgetTargetOpen(true)}
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
                    <Target size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Monthly Budget Target
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {budgetTarget > 0 ? formatRupiah(budgetTarget) : "Not Set"}
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Recurring Bills */}
            {showBills && (
              <button
                type="button"
                onClick={() => setBillListOpen(true)}
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
                    <Receipt size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Recurring Bills
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {bills.length} active
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Financial Goals */}
            {showGoals && (
              <button
                type="button"
                onClick={() => setGoalsOpen(true)}
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
                    <TrendingUp size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Financial Goals
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {goals.length} targets
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Asset Valuation */}
            {showValuation && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setValuationOpen(true);
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
                    <Coins size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Asset Valuation
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Crypto & Holdings
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Base Currency */}
            {showCurrency && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setCurrencySheetOpen(true);
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
                    <Coins size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Base Currency
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {preferredCurrency} ({currencyMeta.symbol})
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

      {/* ============================================================ */}
      {/* 3. PREFERENCES */}
      {/* ============================================================ */}
      {hasPreferences && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Preferences
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Light Appearance Toggle */}
            {showTheme && (
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
                    <Sun size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Light Appearance
                  </span>
                </div>
                <ToggleSwitch
                  checked={theme === "light"}
                  onChange={() => {
                    triggerHaptic("light");
                    toggleTheme();
                  }}
                  ariaLabel="Toggle light appearance"
                />
              </div>
            )}

            {/* Liquid Custom Keypad Toggle */}
            {showKeypad && (
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
                    <Calculator size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Liquid Numeric Keypad
                  </span>
                </div>
                <ToggleSwitch
                  checked={customKeypadEnabled}
                  onChange={handleToggleCustomKeypad}
                  ariaLabel="Toggle liquid numeric keypad"
                />
              </div>
            )}

            {/* Transaction Tags Toggle */}
            {showTags && (
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
                    <Tag size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Transaction Tags (#)
                  </span>
                </div>
                <ToggleSwitch
                  checked={tagsEnabled}
                  onChange={handleToggleTags}
                  ariaLabel="Toggle transaction tags"
                />
              </div>
            )}

            {/* Save Attachment Files Toggle */}
            {showSaveAttachments && (
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
                    <Camera size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Save Attachment Files
                  </span>
                </div>
                <ToggleSwitch
                  checked={saveAttachmentsEnabled}
                  onChange={handleToggleSaveAttachments}
                  ariaLabel="Toggle save attachments"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 4. AUTOMATIONS & SIRI */}
      {/* ============================================================ */}
      {hasAutomations && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Automations & Shortcuts
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Quick-Add Shortcuts */}
            {showShortcuts && (
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
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
                    <Zap size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Quick-Add Shortcuts
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {shortcuts.length} presets
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* iPhone Back Tap */}
            {showBackTap && (
              <button
                type="button"
                onClick={() => setBackTapGuideOpen(true)}
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
                    <Smartphone size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    iPhone Back Tap
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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

      {/* ============================================================ */}
      {/* 5. NOTIFICATIONS */}
      {/* ============================================================ */}
      {hasNotifications && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Notifications
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Daily Streak Reminder Toggle */}
            {showDailyReminder && (
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
                    <Clock size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Daily Streak Reminder (20:00)
                  </span>
                </div>
                <ToggleSwitch
                  checked={dailyReminderEnabled}
                  onChange={handleToggleDailyReminder}
                  ariaLabel="Toggle daily streak reminder"
                />
              </div>
            )}

            {/* Bill Reminders Toggle */}
            {showBillReminders && (
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
                    <BellRing size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Bill Due Alerts
                  </span>
                </div>
                <ToggleSwitch
                  checked={billRemindersEnabled}
                  onChange={handleToggleBillReminders}
                  ariaLabel="Toggle bill reminders"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 6. SECURITY & PRIVACY */}
      {/* ============================================================ */}
      {hasSecurity && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Security & Privacy
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Privacy Shield Toggle */}
            {showPrivacyShield && (
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
                    <EyeOff size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Privacy Shield (Mask Balances)
                  </span>
                </div>
                <ToggleSwitch
                  checked={isPrivacyShieldEnabled}
                  onChange={() => {
                    togglePrivacyShield();
                    showToast(
                      isPrivacyShieldEnabled
                        ? "Privacy Shield disabled"
                        : "Privacy Shield enabled",
                      "update",
                      () => {},
                    );
                  }}
                  ariaLabel="Toggle privacy shield"
                />
              </div>
            )}

            {/* Require Face ID / PIN Toggle */}
            {showFaceID && (
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
                    <ShieldCheck size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Require Face ID / PIN
                  </span>
                </div>
                <ToggleSwitch
                  checked={securitySettings.enabled}
                  onChange={async () => {
                    if (!securitySettings.enabled) {
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
                            saveBiometricLoginCredentials(
                              session.user?.email || "",
                              session,
                            );
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
                  ariaLabel="Toggle Face ID or PIN lock"
                />
              </div>
            )}

            {/* Lock Timeout & PIN (shown when Face ID enabled) */}
            {securitySettings.enabled && (
              <>
                {showTimeout && (
                  <div className="flex items-center justify-between py-2 px-3.5 min-h-[44px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <Clock size={14} strokeWidth={1.75} />
                      </div>
                      <span
                        className="text-[13px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Lock Timeout
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { label: "0m", value: 0 },
                        { label: "1m", value: 1 },
                        { label: "5m", value: 5 },
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
                            className="py-1 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                            style={{
                              background: isSelected
                                ? "var(--bg-elevated)"
                                : "var(--glass-fill)",
                              border: isSelected
                                ? "1px solid var(--text-primary)"
                                : "1px solid var(--glass-border)",
                              color: isSelected
                                ? "var(--text-primary)"
                                : "var(--text-tertiary)",
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showBackupPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinModalOpen(true);
                      triggerHaptic("light");
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
                        <KeyRound size={14} strokeWidth={1.75} />
                      </div>
                      <span
                        className="text-[13px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {securitySettings.hasPin ? "Change Backup PIN" : "Setup Backup PIN"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                        style={{
                          background: "var(--bg-elevated)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {securitySettings.hasPin ? "Configured" : "Setup"}
                      </span>
                      <ChevronRight
                        size={15}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    </div>
                  </button>
                )}
              </>
            )}

            {/* Camera & Photos Access */}
            {showMedia && (
              <button
                type="button"
                onClick={() => setMediaPermissionsOpen(true)}
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
                    <Camera size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Camera & Media Permissions
                  </span>
                </div>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 7. DATA & VAULT */}
      {/* ============================================================ */}
      {hasDataVault && (
        <section className="space-y-1.5">
          <h2
            className="text-[11px] font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Data & Vault
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
                      Cloud Sync
                    </span>
                    <span
                      className="text-[10px] font-normal block truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {syncStatus === "syncing"
                        ? "Syncing..."
                        : syncStatus === "error"
                          ? "Offline · Local preserved"
                          : `Synced ${lastSyncedTime}`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSafeSync}
                  disabled={syncStatus === "syncing"}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1 disabled:opacity-60 cursor-pointer shrink-0 border"
                  style={{
                    background:
                      syncStatus === "success"
                        ? "var(--accent)"
                        : "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color:
                      syncStatus === "success"
                        ? "var(--accent-ink)"
                        : "var(--text-secondary)",
                  }}
                >
                  {syncStatus === "syncing" && (
                    <Loader2 size={11} className="animate-spin" />
                  )}
                  {syncStatus === "success" && <Check size={11} />}
                  <span>
                    {syncStatus === "syncing"
                      ? "Syncing"
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
                    <FileLock2 size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Encrypted Vault
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    AES-256
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Report & Tax Export */}
            {showExport && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setReportExportOpen(true);
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
                    Report & Tax Export
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    PDF / CSV
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
                    Import Bank Statement
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    BCA / CSV
                  </span>
                  <ChevronRight
                    size={15}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
              </button>
            )}

            {/* Reset Ledger Data */}
            {showReset && (
              <button
                type="button"
                onClick={() => setResetOpen(true)}
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
                    <RotateCcw size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Reset Ledger Data
                  </span>
                </div>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </button>
            )}

            {/* Re-run Customization Wizard */}
            {showRerunOnboarding && (
              <button
                type="button"
                onClick={handleRerunCustomization}
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
                    <SlidersHorizontal size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Re-run Customization Wizard
                  </span>
                </div>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 8. SIGN OUT / EXIT GUEST */}
      {/* ============================================================ */}
      {!searchQuery.trim() && (
        <div className="pt-2">
          <button
            type="button"
            onClick={isGuest ? exitGuestMode : handleLogout}
            className="w-full py-3 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>{isGuest ? "Exit Guest Mode" : "Log Out"}</span>
          </button>
        </div>
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
        onOpenDeleteAccount={() => {
          setProfileOpen(false);
          setDeleteAccountOpen(true);
        }}
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

      <LuxuryReportExportSheet
        isOpen={reportExportOpen}
        onClose={() => setReportExportOpen(false)}
      />

      <DeleteAccountModal
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
      />
    </div>
  );
}
