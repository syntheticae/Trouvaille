import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";
import {
  ChevronRight,
  FolderTree,
  CreditCard,
  TrendingUp,
  Receipt,
  Target,
  Zap,
  Smartphone,
  Clock,
  KeyRound,
  Camera,
  Search,
  X,
  Coins,
  Languages,
  Sun,
  Calculator,
  Tag,
  Paperclip,
  BellRing,
  CalendarClock,
  EyeOff,
  ShieldCheck,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSpace } from "../contexts/SpaceContext";
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
import { formatRupiah } from "../lib/utils";
import { format, isToday } from "date-fns";
import { supabase } from "../lib/supabase";
import {
  fetchAllTransactionsFromSupabase,
  useAllTransactions,
  transactionKeys,
  purgePendingMutationsAndSync,
} from "../hooks/useTransactions";
import {
  requestNotificationPermission,
  syncBillNotifications,
  cancelAllBillNotifications,
  syncDailyStreakReminder,
  cancelDailyStreakReminder,
  syncWeeklyDigestNotification,
  cancelWeeklyDigestNotification,
  syncMonthEndReviewNotification,
  cancelMonthEndReviewNotification,
} from "../lib/notifications";
import {
  flushPendingMutations,
  getPendingMutations,
  type PendingMutation,
} from "../lib/syncEngine";
import {
  getIncludeReceivableInLiquid,
  setIncludeReceivableInLiquid,
} from "../lib/financialMath";

// Code-split heavy modular sheets and exporters
const CurrencySwitcherSheet = lazy(() =>
  import("../components/currency/CurrencySwitcherSheet").then((m) => ({
    default: m.CurrencySwitcherSheet,
  })),
);
const LanguageSwitcherSheet = lazy(() =>
  import("../components/settings/LanguageSwitcherSheet").then((m) => ({
    default: m.LanguageSwitcherSheet,
  })),
);
import type { TabType } from "../components/settings/AppleShortcutsGuideModal";
const AppleShortcutsGuideModal = lazy(() =>
  import("../components/settings/AppleShortcutsGuideModal").then((m) => ({
    default: m.AppleShortcutsGuideModal,
  })),
);
const ResetTransactionsSheet = lazy(() =>
  import("../components/settings/ResetTransactionsSheet").then((m) => ({
    default: m.ResetTransactionsSheet,
  })),
);
const LuxuryReportExportSheet = lazy(() =>
  import("../components/export/LuxuryReportExportSheet").then((m) => ({
    default: m.LuxuryReportExportSheet,
  })),
);
const EncryptedVaultModal = lazy(() =>
  import("../components/security/EncryptedVaultModal").then((m) => ({
    default: m.EncryptedVaultModal,
  })),
);
const ProfileSheet = lazy(() =>
  import("../components/settings/ProfileSheet").then((m) => ({
    default: m.ProfileSheet,
  })),
);
const BillManagementSheets = lazy(() =>
  import("../components/settings/BillManagementSheets").then((m) => ({
    default: m.BillManagementSheets,
  })),
);
const CategoryManagementSheets = lazy(() =>
  import("../components/settings/CategoryManagementSheets").then((m) => ({
    default: m.CategoryManagementSheets,
  })),
);
const WalletManagementSheets = lazy(() =>
  import("../components/settings/WalletManagementSheets").then((m) => ({
    default: m.WalletManagementSheets,
  })),
);
const GoalManagementSheets = lazy(() =>
  import("../components/settings/GoalManagementSheets").then((m) => ({
    default: m.GoalManagementSheets,
  })),
);

const PinSetupModal = lazy(() =>
  import("../components/settings/PinSetupModal").then((m) => ({
    default: m.PinSetupModal,
  })),
);
const BudgetTargetSheet = lazy(() =>
  import("../components/settings/BudgetTargetSheet").then((m) => ({
    default: m.BudgetTargetSheet,
  })),
);
const MediaPermissionsSheet = lazy(() =>
  import("../components/settings/MediaPermissionsSheet").then((m) => ({
    default: m.MediaPermissionsSheet,
  })),
);
const AssetValuationSheet = lazy(() =>
  import("../components/settings/AssetValuationSheet").then((m) => ({
    default: m.AssetValuationSheet,
  })),
);
const ManageLedgersSheet = lazy(() =>
  import("../components/settings/ManageLedgersSheet").then((m) => ({
    default: m.ManageLedgersSheet,
  })),
);
const DeleteAccountModal = lazy(() =>
  import("../components/settings/DeleteAccountModal").then((m) => ({
    default: m.DeleteAccountModal,
  })),
);
const WebDashboardLinkModal = lazy(() =>
  import("../components/settings/WebDashboardLinkModal").then((m) => ({
    default: m.WebDashboardLinkModal,
  })),
);
const DataExportVaultModal = lazy(() =>
  import("../components/settings/DataExportVaultModal").then((m) => ({
    default: m.DataExportVaultModal,
  })),
);
const BillDailyReminderSheet = lazy(() =>
  import("../components/settings/BillDailyReminderSheet").then((m) => ({
    default: m.BillDailyReminderSheet,
  })),
);
const PeriodicDigestSettingsSheet = lazy(() =>
  import("../components/settings/PeriodicDigestSettingsSheet").then((m) => ({
    default: m.PeriodicDigestSettingsSheet,
  })),
);
const AppUpdateModal = lazy(() =>
  import("../components/settings/AppUpdateModal").then((m) => ({
    default: m.AppUpdateModal,
  })),
);
const ShortcutManagementSheet = lazy(() =>
  import("../components/settings/ShortcutManagementSheet").then((m) => ({
    default: m.ShortcutManagementSheet,
  })),
);

import { useShortcuts } from "../hooks/useShortcuts";
import { useNavigate } from "react-router-dom";
import {
  checkForAppUpdate,
  type AppReleaseInfo,
} from "../lib/appUpdateService";
import {
  SettingsProfileCard,
  SettingsDataVaultSection,
} from "../components/settings/SettingsDataVaultSection";

interface SettingsPageProps {
  onOpenImport?: () => void;
  onStartTour?: () => void;
}

export function SettingsPage({
  onOpenImport,
  onStartTour,
}: SettingsPageProps = {}) {
  const isAndroid = Capacitor.getPlatform() === "android";
  const queryClient = useQueryClient();
  const { data: bills = [] } = useBills();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const { data: allTxs = [] } = useAllTransactions();
  const { goals } = useGoals();
  const { session, signOut, isGuest, exitGuestMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const {
    budgetTarget,
    setBudgetTarget,
    budgetPeriodStart,
    setBudgetPeriodStart,
  } = useBudgetTarget();
  const { securitySettings, updateSettings: updateSecuritySettings } =
    useSecurityLock();
  const { isPrivacyShieldEnabled, togglePrivacyShield } = usePrivacy();
  const { preferredCurrency, currencyMeta } = useCurrency();
  const { language, isIndonesian, t } = useLanguage();

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
      next
        ? isIndonesian
          ? "Label transaksi diaktifkan"
          : "Transaction tags enabled"
        : isIndonesian
          ? "Label transaksi dinonaktifkan"
          : "Transaction tags disabled",
      "update",
      () => {},
    );
  };

  // Save Attachments toggle
  const [saveAttachmentsEnabled, setSaveAttachmentsEnabled] = useState<boolean>(
    () => {
      const saved = localStorage.getItem("trouvaille_save_attachments");
      return saved !== null ? saved === "true" : false;
    },
  );

  const handleToggleSaveAttachments = () => {
    const next = !saveAttachmentsEnabled;
    setSaveAttachmentsEnabled(next);
    localStorage.setItem("trouvaille_save_attachments", String(next));
    showToast(
      next
        ? isIndonesian
          ? "Lampiran struk akan disimpan"
          : "Receipt attachments will be saved"
        : isIndonesian
          ? "Lampiran struk tidak akan disimpan"
          : "Receipt attachments will not be stored",
      "update",
      () => {},
    );
  };

  // Include Receivables in Liquid Cash toggle
  const [includeReceivableInLiquid, setIncludeReceivableState] =
    useState<boolean>(() => getIncludeReceivableInLiquid());

  const handleToggleIncludeReceivable = () => {
    const next = !includeReceivableInLiquid;
    setIncludeReceivableState(next);
    setIncludeReceivableInLiquid(next);
    triggerHaptic("light");
    showToast(
      next
        ? isIndonesian
          ? "Piutang disertakan dalam Aset Likuid"
          : "Receivables included in Liquid Assets"
        : isIndonesian
          ? "Piutang dipisahkan dari Aset Likuid"
          : "Receivables excluded from Liquid Assets",
      "update",
      () => {},
    );
  };

  // Liquid Glass Custom Keypad toggle
  const [customKeypadEnabled, setCustomKeypadEnabled] = useState<boolean>(
    () => {
      const saved = localStorage.getItem("trouvaille_keypad_mode");
      return saved !== "system";
    },
  );

  const handleToggleCustomKeypad = () => {
    const next = !customKeypadEnabled;
    setCustomKeypadEnabled(next);
    localStorage.setItem("trouvaille_keypad_mode", next ? "custom" : "system");
    showToast(
      next
        ? isIndonesian
          ? "Keypad angka kustom aktif"
          : "Liquid custom keypad active"
        : isIndonesian
          ? "Papan ketik bawaan sistem aktif"
          : "Default system keyboard active",
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
  const [walletsOpen, setWalletsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [billListOpen, setBillListOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [budgetTargetOpen, setBudgetTargetOpen] = useState(false);
  const [backTapGuideOpen, setBackTapGuideOpen] = useState(false);
  const [shortcutsGuideTab, setShortcutsGuideTab] =
    useState<TabType>("back_tap");

  const openShortcutsWithTab = (tab: TabType) => {
    setShortcutsGuideTab(tab);
    setBackTapGuideOpen(true);
  };
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultDefaultTab, setVaultDefaultTab] = useState<"export" | "restore">(
    "export",
  );
  const [mediaPermissionsOpen, setMediaPermissionsOpen] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);
  const [manageLedgersOpen, setManageLedgersOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [dataExportVaultOpen, setDataExportVaultOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [webDashboardModalOpen, setWebDashboardModalOpen] = useState(false);
  const [shortcutSheetOpen, setShortcutSheetOpen] = useState(false);
  const { shortcuts } = useShortcuts();
  const navigate = useNavigate();
  const [appUpdateOpen, setAppUpdateOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<AppReleaseInfo | null>(null);

  const handleCheckForUpdate = async (openModal = true) => {
    setCheckingUpdate(true);
    triggerHaptic("medium");
    try {
      const info = await checkForAppUpdate();
      setReleaseInfo(info);
      if (openModal) {
        setAppUpdateOpen(true);
      }
    } catch (err) {
      console.warn("[Settings] App update check failed:", err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const { activeSpace, refreshLedgers } = useSpace();

  // Notification sheets state
  const [billDailyReminderSheetOpen, setBillDailyReminderSheetOpen] =
    useState(false);
  const [periodicDigestSheetOpen, setPeriodicDigestSheetOpen] = useState(false);

  // Notification toggles (Streamlined into 2 combined switches)
  const [billRemindersEnabled, setBillRemindersEnabled] = useState(() => {
    return (
      localStorage.getItem("trouvaille_bill_reminders_enabled") !== "false"
    );
  });
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(() => {
    return (
      localStorage.getItem("trouvaille_daily_reminder_enabled") !== "false"
    );
  });

  const handleToggleBillAndDailyReminders = async () => {
    triggerHaptic("light");
    const nextVal = !(billRemindersEnabled || dailyReminderEnabled);
    if (!nextVal) {
      setBillRemindersEnabled(false);
      setDailyReminderEnabled(false);
      localStorage.setItem("trouvaille_bill_reminders_enabled", "false");
      localStorage.setItem("trouvaille_daily_reminder_enabled", "false");
      await cancelAllBillNotifications();
      await cancelDailyStreakReminder();
      showToast(
        isIndonesian
          ? "Pengingat tagihan & catat harian dinonaktifkan"
          : "Bill & daily reminders turned off",
        "delete",
        () => {},
      );
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setBillRemindersEnabled(true);
        setDailyReminderEnabled(true);
        localStorage.setItem("trouvaille_bill_reminders_enabled", "true");
        localStorage.setItem("trouvaille_daily_reminder_enabled", "true");
        await syncBillNotifications(bills, isIndonesian);
        await syncDailyStreakReminder(false);
        showToast(
          isIndonesian
            ? "Pengingat tagihan & catat harian diaktifkan"
            : "Bill & daily reminders enabled",
          "add",
          () => {},
        );
      } else {
        showToast(
          isIndonesian
            ? "Izin notifikasi ditolak"
            : "Notification permission denied",
          "delete",
          () => {},
        );
      }
    }
  };

  // Periodic Financial Digests & Reviews
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(() => {
    return localStorage.getItem("trouvaille_weekly_digest_enabled") !== "false";
  });
  const [monthEndReviewEnabled, setMonthEndReviewEnabled] = useState(() => {
    return (
      localStorage.getItem("trouvaille_month_end_review_enabled") !== "false"
    );
  });

  const handleTogglePeriodicDigests = async () => {
    triggerHaptic("light");
    const nextVal = !(weeklyDigestEnabled || monthEndReviewEnabled);
    if (!nextVal) {
      setWeeklyDigestEnabled(false);
      setMonthEndReviewEnabled(false);
      localStorage.setItem("trouvaille_weekly_digest_enabled", "false");
      localStorage.setItem("trouvaille_month_end_review_enabled", "false");
      await cancelWeeklyDigestNotification();
      await cancelMonthEndReviewNotification();
      showToast(
        isIndonesian
          ? "Rekap & evaluasi berkala dinonaktifkan"
          : "Periodic digests turned off",
        "delete",
        () => {},
      );
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setWeeklyDigestEnabled(true);
        setMonthEndReviewEnabled(true);
        localStorage.setItem("trouvaille_weekly_digest_enabled", "true");
        localStorage.setItem("trouvaille_month_end_review_enabled", "true");
        await syncWeeklyDigestNotification(allTxs, isIndonesian);
        await syncMonthEndReviewNotification(isIndonesian);
        showToast(
          isIndonesian
            ? "Rekap & evaluasi berkala diaktifkan"
            : "Periodic financial digests enabled",
          "add",
          () => {},
        );
      } else {
        showToast(
          isIndonesian
            ? "Izin notifikasi ditolak"
            : "Notification permission denied",
          "delete",
          () => {},
        );
      }
    }
  };

  // Safe Sync state
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    const saved = localStorage.getItem("trouvaille_last_synced");
    if (!saved) return isIndonesian ? "Baru saja" : "Just now";
    try {
      const d = new Date(saved);
      return isToday(d)
        ? `${isIndonesian ? "Hari ini" : "Today"}, ${format(d, "HH:mm")}`
        : format(d, "dd MMM, HH:mm");
    } catch {
      return isIndonesian ? "Baru saja" : "Just now";
    }
  });

  const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>(
    () => getPendingMutations(),
  );

  const refreshPendingCount = useCallback(() => {
    setPendingMutations(getPendingMutations());
  }, []);

  useEffect(() => {
    refreshPendingCount();
    window.addEventListener("focus", refreshPendingCount);
    window.addEventListener("storage", refreshPendingCount);
    return () => {
      window.removeEventListener("focus", refreshPendingCount);
      window.removeEventListener("storage", refreshPendingCount);
    };
  }, [refreshPendingCount]);

  const handleDiscardPendingAndRestore = async () => {
    triggerHaptic("heavy");
    setSyncStatus("syncing");
    try {
      const userId = session?.user?.id;
      const cleanTxs = await purgePendingMutationsAndSync(userId);
      setPendingMutations([]);

      const [freshWalletsRes, freshCategoriesRes, freshBillsRes] =
        await Promise.allSettled([
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

      const freshWallets =
        freshWalletsRes.status === "fulfilled" && !freshWalletsRes.value.error
          ? freshWalletsRes.value.data
          : null;
      const freshCategories =
        freshCategoriesRes.status === "fulfilled" &&
        !freshCategoriesRes.value.error
          ? freshCategoriesRes.value.data
          : null;
      const freshBills =
        freshBillsRes.status === "fulfilled" && !freshBillsRes.value.error
          ? freshBillsRes.value.data
          : null;

      queryClient.setQueryData(transactionKeys.all(userId), cleanTxs);
      if (freshWallets)
        queryClient.setQueryData(walletKeys.all(userId), freshWallets);
      if (freshCategories)
        queryClient.setQueryData(categoryKeys.all(userId), freshCategories);
      if (freshBills) queryClient.setQueryData(["bills", userId], freshBills);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
        queryClient.invalidateQueries({ queryKey: ["monthSummary"] }),
      ]);

      if (refreshLedgers) {
        await refreshLedgers().catch(() => {});
      }

      setSyncStatus("success");
      triggerSuccessHaptic();
      showToast(
        isIndonesian
          ? "Antrean mutasi dibatalkan & saldo dompet dipulihkan!"
          : "Pending queue discarded & wallet balance restored!",
        "update",
        () => {},
      );
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      console.error("[handleDiscardPendingAndRestore] Error:", err);
      setSyncStatus("error");
      showToast(
        isIndonesian ? "Gagal memulihkan saldo" : "Failed to restore balance",
        "delete",
        () => {},
      );
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const handleSafeSync = async () => {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    triggerHaptic("light");

    try {
      try {
        await flushPendingMutations().catch(() => {});
      } catch {}

      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const freshTxs = await fetchAllTransactionsFromSupabase({ userId });

      const [freshWalletsRes, freshCategoriesRes, freshBillsRes] =
        await Promise.allSettled([
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

      const freshWallets =
        freshWalletsRes.status === "fulfilled" && !freshWalletsRes.value.error
          ? freshWalletsRes.value.data
          : null;
      const freshCategories =
        freshCategoriesRes.status === "fulfilled" &&
        !freshCategoriesRes.value.error
          ? freshCategoriesRes.value.data
          : null;
      const freshBills =
        freshBillsRes.status === "fulfilled" && !freshBillsRes.value.error
          ? freshBillsRes.value.data
          : null;

      queryClient.setQueryData(transactionKeys.all(userId), freshTxs);
      if (freshWallets)
        queryClient.setQueryData(walletKeys.all(userId), freshWallets);
      if (freshCategories)
        queryClient.setQueryData(categoryKeys.all(userId), freshCategories);
      if (freshBills) queryClient.setQueryData(["bills", userId], freshBills);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
      ]);

      if (refreshLedgers) {
        await refreshLedgers().catch(() => {});
      }

      const now = new Date();
      localStorage.setItem("trouvaille_last_synced", now.toISOString());
      setLastSyncedTime(
        `${isIndonesian ? "Hari ini" : "Today"}, ${format(now, "HH:mm")}`,
      );
      setSyncStatus("success");
      triggerHaptic("medium");
      showToast(
        isIndonesian
          ? `Data tersinkronisasi (${freshTxs.length} transaksi)`
          : `Data synchronized (${freshTxs.length} records)`,
        "update",
        () => {},
      );

      setTimeout(() => {
        setSyncStatus("idle");
      }, 3500);
    } catch (err: any) {
      console.error("[handleSafeSync] Sync error:", err);
      setSyncStatus("error");
      const isAuthErr = err?.message === "Not authenticated";
      showToast(
        isAuthErr
          ? isIndonesian
            ? "Sesi autentikasi berakhir. Silakan masuk kembali."
            : "Session expired. Please log in again."
          : isIndonesian
            ? "Sinkronisasi gagal. Data lokal aman."
            : "Sync failed. Local data preserved.",
        "delete",
        () => {},
      );
      setTimeout(() => {
        setSyncStatus("idle");
      }, 4000);
    }
  };

  const handleRerunCustomization = () => {
    triggerHaptic("medium");
    if (
      confirm(
        isIndonesian
          ? "Atur ulang konfigurasi awal? Catatan transaksi Anda akan tetap aman, dan Anda dapat mengonfigurasi ulang preferensi."
          : "Reset onboarding state? Your existing transaction records will remain safe, and you can re-experience the customization wizard immediately.",
      )
    ) {
      localStorage.removeItem("trouvaille_onboarded");
      localStorage.removeItem("trouvaille_onboarding_focus");
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    const confirmMsg = isIndonesian
      ? "Apakah Anda yakin ingin keluar dari akun?"
      : "Are you sure you want to sign out?";
    if (confirm(confirmMsg)) {
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
  const showCategories = matches(
    "Manage Categories",
    "expense income groups classifications",
  );
  const showWallets = matches(
    "Manage Accounts",
    "bank cash balance cards wallets dompet accounts akun rekening",
  );
  const showBudget = matches(
    "Monthly Spending Budget",
    "spending limit monthly budget anggaran belanja",
  );
  const showBills = matches(
    "Recurring Bills",
    "subscriptions commitments due dates bills tagihan",
  );
  const showGoals = matches(
    "Financial Goals",
    "savings target milestone progress goals tabungan",
  );
  const showValuation = matches(
    "Asset Valuation",
    "crypto stock usdt holdings investment",
  );
  const showCurrency = matches(
    "Base Currency",
    "rates exchange valuation usd idr forex",
  );
  const showLanguage = matches(
    "App Language",
    "language bahasa indonesia english locale localization",
  );
  const hasArchitecture =
    showCategories ||
    showWallets ||
    showBudget ||
    showBills ||
    showGoals ||
    showValuation ||
    showCurrency ||
    showLanguage;

  // Section 2: Preferences
  const showTheme = matches(
    "Light Appearance",
    "dark light obsidian theme appearance color",
  );
  const showKeypad = matches(
    "Liquid Numeric Keypad",
    "keypad keyboard input calculator custom number pad",
  );
  const showTags = matches(
    "Transaction Tags (#)",
    "tags hashtag work reimburse personal",
  );
  const showSaveAttachments = matches(
    "Save Attachment Files",
    "receipts camera slip images photos",
  );
  const showReceivableInLiquid = matches(
    "Include Receivables in Liquid Cash",
    "receivable piutang kas liquid cash aset likuid operasional balance",
  );
  const hasPreferences =
    showTheme ||
    showKeypad ||
    showTags ||
    showSaveAttachments ||
    showReceivableInLiquid;

  // Section 3: Automations & Shortcuts (Unified Single Setting)
  const showAutomations = matches(
    "Apple Shortcuts & Automations",
    "ios accessibility double tap shortcut back tap siri dynamic island glass action button quick presets 1-tap apple pay pintasan otomatisasi",
  );
  const hasAutomations = showAutomations;

  // Section 4: Notifications
  const showDailyReminder = matches(
    "Daily Streak Reminder",
    "streak 20:00 night notification alert",
  );
  const showBillReminders = matches(
    "Bill Due Alerts",
    "bill reminders scheduled commit due",
  );
  const showWeeklyDigest = matches(
    "Weekly Financial Digest",
    "rekap mingguan digest sunday performa",
  );
  const showBudgetAlerts = matches(
    "Budget Threshold Alerts",
    "peringatan batas anggaran 80% 100%",
  );
  const showMonthEndReview = matches(
    "Month-End Wealth Review",
    "evaluasi akhir bulan neraca arus kas",
  );
  const hasNotifications =
    showDailyReminder ||
    showBillReminders ||
    showWeeklyDigest ||
    showBudgetAlerts ||
    showMonthEndReview;

  // Section 5: Security & Privacy
  const showPrivacyShield = matches(
    "Privacy Shield",
    "mask hide numbers balance monetary figures",
  );
  const showPinLock = matches(
    "Kunci PIN Keamanan Security PIN Lock",
    "pin lock privacy sandi brankas security timeout passcode kunci aplikasi",
  );
  const showTimeout = matches(
    "Batas Waktu Kunci Lock Timeout",
    "inactivity duration delay minutes waktu durasi kunci",
  );
  const showPinConfig = matches(
    "Atur PIN Keamanan Setup Security PIN",
    "passcode pin change ubah atur sandi security",
  );
  const showMedia = matches(
    "Camera & Photos Access",
    "permissions receipt scanner gallery",
  );
  const hasSecurity =
    showPrivacyShield ||
    showPinLock ||
    showTimeout ||
    showPinConfig ||
    showMedia;

  // Section 6: Data & Vault
  const showCloudSync = matches(
    "Cloud Sync",
    "backup database synchronization live",
  );
  const showWebDashboard = matches(
    "Web Dashboard",
    "link web scan qr desktop laptop browser workstation tautkan",
  );
  const showExportVault = matches(
    "Report Export & Data Vault",
    "csv excel pdf statement space json aes-256 file backup export restore offline brankas laporan cadangan ekspor catatan transaksi",
  );
  const hasDataVault = showCloudSync || showWebDashboard || showExportVault;

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
          {isIndonesian ? "Pengaturan" : "Settings"}
        </h1>
        <p
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {isIndonesian
            ? "Preferensi, arsitektur keuangan & keamanan"
            : "Preferences, financial architecture & security"}
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
          placeholder={
            isIndonesian
              ? "Cari pengaturan, pintasan & keamanan..."
              : "Search settings, shortcuts & security..."
          }
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
        <SettingsProfileCard
          isGuest={isGuest}
          avatarUrl={avatarUrl}
          displayName={displayName}
          email={session?.user?.email}
          isIndonesian={isIndonesian}
          onOpenProfile={() => setProfileOpen(true)}
          onExitGuestMode={exitGuestMode}
        />
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
            {isIndonesian ? "Pengaturan tidak ditemukan" : "No settings found"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian
              ? `Tidak ada opsi yang cocok dengan "${searchQuery}"`
              : `No options match "${searchQuery}"`}
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
            {isIndonesian ? "Arsitektur Finansial" : "Financial Architecture"}
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Manage Ledgers */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setManageLedgersOpen(true);
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
                  <BookOpen size={14} strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Kelola Space" : "Manage Spaces"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[12px] "
                  style={{ color: "var(--text-secondary)" }}
                >
                  {activeSpace?.name ||
                    (isIndonesian ? "Space Pribadi" : "Personal Space")}
                </span>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </button>

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
                    {isIndonesian ? "Kelola Kategori" : "Manage Categories"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] "
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

            {/* Wallets */}
            {showWallets && (
              <button
                type="button"
                onClick={() => setWalletsOpen(true)}
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
                    {isIndonesian ? "Kelola Akun" : "Manage Accounts"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] "
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

            {/* Monthly Spending Budget */}
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
                    {isIndonesian
                      ? "Anggaran Belanja Bulanan"
                      : "Monthly Spending Budget"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] "
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {budgetTarget > 0
                      ? formatRupiah(budgetTarget)
                      : isIndonesian
                        ? "Belum Diatur"
                        : "Not Set"}
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
                    {isIndonesian ? "Tagihan Rutin" : "Recurring Bills"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] "
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {bills.length} {isIndonesian ? "aktif" : "active"}
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
                    {isIndonesian ? "Target Tabungan" : "Financial Goals"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] "
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {goals.length} {isIndonesian ? "target" : "targets"}
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
                    {isIndonesian ? "Valuasi Aset" : "Asset Valuation"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian ? "Assets & Portofolio" : "Wealth & Holdings"}
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
                    {isIndonesian ? "Mata Uang Utama" : "Base Currency"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] "
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

            {/* App Language Switcher Trigger */}
            {showLanguage && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setLanguageSheetOpen(true);
                }}
                className="w-full flex items-center justify-between py-2.5 px-3.5 min-h-[44px] text-left active:bg-white/[0.04] transition-colors cursor-pointer"
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
                    <Languages size={14} strokeWidth={1.75} />
                  </div>
                  <span
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("settings.appLanguage", "App Language")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {language === "id" ? "Bahasa Indonesia" : "English"}
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
            {isIndonesian ? "Preferensi" : "Preferences"}
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Light Appearance Toggle */}
            {showTheme && (
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Tampilan Terang" : "Light Appearance"}
                    </span>
                  </div>
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
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Keypad Angka Kustom"
                        : "Liquid Numeric Keypad"}
                    </span>
                  </div>
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
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Label Transaksi (#)"
                        : "Transaction Tags (#)"}
                    </span>
                  </div>
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
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Paperclip size={14} strokeWidth={1.75} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Simpan File Lampiran"
                        : "Save Attachment Files"}
                    </span>
                  </div>
                </div>
                <ToggleSwitch
                  checked={saveAttachmentsEnabled}
                  onChange={handleToggleSaveAttachments}
                  ariaLabel="Toggle save attachments"
                />
              </div>
            )}

            {/* Include Receivables in Liquid Cash Toggle */}
            {showReceivableInLiquid && (
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Sertakan Piutang ke Aset Likuid"
                        : "Receivables in Liquid Cash"}
                    </span>
                  </div>
                </div>
                <ToggleSwitch
                  checked={includeReceivableInLiquid}
                  onChange={handleToggleIncludeReceivable}
                  ariaLabel="Toggle include receivables in liquid cash"
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
            {isIndonesian
              ? "Otomatisasi & Pintasan"
              : "Automations & Shortcuts"}
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Quick Transaction Presets (In-App Shortcuts) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setShortcutSheetOpen(true);
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
                  <Zap size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold truncate block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian
                      ? "Pintasan Transaksi Cepat"
                      : "Quick Transaction Presets"}
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
                  {shortcuts.length}{" "}
                  {isIndonesian
                    ? "Preset"
                    : shortcuts.length === 1
                      ? "Preset"
                      : "Presets"}
                </span>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </button>

            {/* Apple Shortcuts & Automations (Unified Single Setting) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                openShortcutsWithTab("back_tap");
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
                  <Smartphone size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold truncate block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isAndroid
                      ? isIndonesian
                        ? "Pintasan URL & Otomatisasi"
                        : "URL Shortcuts & Automations"
                      : isIndonesian
                        ? "Pintasan & Otomatisasi"
                        : "Shortcuts & Automations"}
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
                  {isIndonesian ? "5 Mode" : "5 Modes"}
                </span>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </button>

            {/* Replay Interactive Product Tour */}
            <button
              type="button"
              onMouseEnter={() => {
                import("../components/onboarding/ProductTourOverlay");
              }}
              onTouchStart={() => {
                import("../components/onboarding/ProductTourOverlay");
              }}
              onClick={() => {
                triggerHaptic("medium");
                try {
                  localStorage.setItem("trouvaille_tour_pending", "true");
                } catch {}
                if (onStartTour) {
                  onStartTour();
                }
                window.dispatchEvent(new CustomEvent("trouvaille:start-tour"));
                navigate("/", { replace: true });
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
                  <Sparkles size={14} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold truncate block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian
                      ? "Panduan Fitur & Pengenalan Aplikasi"
                      : "Interactive Feature Tour"}
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
                  {isIndonesian ? "Putar" : "Replay"}
                </span>
                <ChevronRight
                  size={15}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </button>
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
            {isIndonesian ? "Notifikasi" : "Notifications"}
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Bar 1: Bill & Daily Log Reminders */}
            <div className="flex items-center justify-between py-2 px-3.5 min-h-[48px] group">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setBillDailyReminderSheetOpen(true);
                }}
                className="flex items-center gap-2.5 min-w-0 pr-2 flex-1 text-left cursor-pointer active:opacity-75 transition-opacity"
              >
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
                  className="text-[13px] font-semibold truncate flex-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian
                    ? "Pengingat Tagihan & Catat Harian"
                    : "Bill & Daily Log Reminders"}
                </span>
              </button>
              <div className="shrink-0 pl-1 ">
                <ToggleSwitch
                  checked={billRemindersEnabled || dailyReminderEnabled}
                  onChange={handleToggleBillAndDailyReminders}
                  ariaLabel="Toggle bill and daily log reminders"
                />
              </div>
            </div>

            {/* Bar 2: Periodic Financial Digests & Reviews */}
            <div className="flex items-center justify-between py-2 px-3.5 min-h-[48px] group">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setPeriodicDigestSheetOpen(true);
                }}
                className="flex items-center gap-2.5 min-w-0 pr-2 flex-1 text-left cursor-pointer active:opacity-75 transition-opacity"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <CalendarClock size={14} strokeWidth={1.75} />
                </div>
                <span
                  className="text-[13px] font-semibold truncate flex-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian
                    ? "Rekap & Evaluasi Berkala"
                    : "Periodic Financial Digests"}
                </span>
              </button>
              <div className="shrink-0 pl-1 ">
                <ToggleSwitch
                  checked={weeklyDigestEnabled || monthEndReviewEnabled}
                  onChange={handleTogglePeriodicDigests}
                  ariaLabel="Toggle periodic financial digests"
                />
              </div>
            </div>
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
            {isIndonesian ? "Keamanan & Privasi" : "Security & Privacy"}
          </h2>
          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Privacy Shield Toggle */}
            {showPrivacyShield && (
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Privasi Saldo" : "Privacy Shield"}
                    </span>
                  </div>
                </div>
                <ToggleSwitch
                  checked={isPrivacyShieldEnabled}
                  onChange={() => {
                    togglePrivacyShield();
                    showToast(
                      isPrivacyShieldEnabled
                        ? isIndonesian
                          ? "Privasi Saldo dinonaktifkan"
                          : "Privacy Shield disabled"
                        : isIndonesian
                          ? "Privasi Saldo diaktifkan"
                          : "Privacy Shield enabled",
                      "update",
                      () => {},
                    );
                  }}
                  ariaLabel="Toggle privacy shield"
                />
              </div>
            )}

            {/* Require Security PIN Lock Toggle */}
            {showPinLock && (
              <div className="flex items-center justify-between py-2.5 px-3.5 min-h-[52px]">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Kunci PIN Keamanan" : "Security PIN Lock"}
                    </span>
                    <span
                      className="text-[11px] truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {isIndonesian
                        ? "Kunci aplikasi dengan PIN saat beralih aplikasi"
                        : "Lock app with PIN when switching apps"}
                    </span>
                  </div>
                </div>
                <ToggleSwitch
                  checked={securitySettings.enabled}
                  onChange={async () => {
                    if (!securitySettings.enabled) {
                      if (!securitySettings.hasPin) {
                        showToast(
                          isIndonesian
                            ? "Harap atur PIN keamanan terlebih dahulu untuk mengaktifkan kunci aplikasi"
                            : "Please set up a security PIN first to enable app lock",
                          "info",
                          null,
                          3000,
                        );
                        setPinModalOpen(true);
                        return;
                      }
                      updateSecuritySettings({ enabled: true });
                      triggerHaptic("medium");
                      showToast(
                        isIndonesian
                          ? "Kunci PIN Keamanan diaktifkan"
                          : "Security PIN Lock enabled",
                        "update",
                        () => {},
                      );
                    } else {
                      updateSecuritySettings({ enabled: false });
                      triggerHaptic("light");
                      showToast(
                        isIndonesian
                          ? "Kunci PIN Keamanan dinonaktifkan"
                          : "Security PIN Lock disabled",
                        "update",
                        () => {},
                      );
                    }
                  }}
                  ariaLabel="Toggle Security PIN lock"
                />
              </div>
            )}

            {/* Lock Timeout & PIN Config (shown when lock enabled) */}
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
                        {isIndonesian ? "Batas Waktu Kunci" : "Lock Timeout"}
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
                              updateSecuritySettings({
                                timeoutMinutes: opt.value,
                              });
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

                {showPinConfig && (
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
                        {isIndonesian
                          ? securitySettings.hasPin
                            ? "Ubah PIN Keamanan"
                            : "Atur PIN Keamanan"
                          : securitySettings.hasPin
                            ? "Change Security PIN"
                            : "Set Up Security PIN"}
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
                        {isIndonesian
                          ? securitySettings.hasPin
                            ? "Terkonfigurasi"
                            : "Belum Diatur"
                          : securitySettings.hasPin
                            ? "Configured"
                            : "Not Set"}
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
                    {isIndonesian
                      ? "Izin Kamera & Media"
                      : "Camera & Media Permissions"}
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
      {/* 7. DATA & VAULT + 8. APP UPDATES + 9. SIGN OUT */}
      {/* ============================================================ */}
      <SettingsDataVaultSection
        hasDataVault={hasDataVault}
        showCloudSync={showCloudSync}
        showWebDashboard={showWebDashboard}
        showExportVault={showExportVault}
        searchQuery={searchQuery}
        isIndonesian={isIndonesian}
        isGuest={isGuest}
        hasAuthenticatedUser={Boolean(session?.user)}
        syncStatus={syncStatus}
        lastSyncedTime={lastSyncedTime}
        pendingMutationsCount={pendingMutations.length}
        onSafeSync={handleSafeSync}
        onDiscardPendingAndRestore={handleDiscardPendingAndRestore}
        onOpenWebDashboard={() => {
          triggerHaptic("light");
          setWebDashboardModalOpen(true);
        }}
        onOpenDataExportVault={() => {
          triggerHaptic("light");
          setDataExportVaultOpen(true);
        }}
        onOpenImport={onOpenImport}
        checkingUpdate={checkingUpdate}
        releaseInfo={releaseInfo}
        onCheckForUpdate={() => handleCheckForUpdate(true)}
        onSignOut={isGuest ? exitGuestMode : handleLogout}
      />

      {/* ============================================================ */}
      {/* MODULAR BOTTOM SHEETS / MODALS (LAZY LOADED) */}
      {/* ============================================================ */}

      <Suspense fallback={null}>
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
          onOpenResetTransactions={() => {
            setProfileOpen(false);
            setResetOpen(true);
          }}
          onReRunCustomization={() => {
            setProfileOpen(false);
            handleRerunCustomization();
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
          isOpen={walletsOpen}
          onClose={() => setWalletsOpen(false)}
        />

        <AppleShortcutsGuideModal
          isOpen={backTapGuideOpen}
          onClose={() => setBackTapGuideOpen(false)}
          initialTab={shortcutsGuideTab}
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

        <ManageLedgersSheet
          isOpen={manageLedgersOpen}
          onClose={() => setManageLedgersOpen(false)}
        />

        <CurrencySwitcherSheet
          isOpen={currencySheetOpen}
          onClose={() => setCurrencySheetOpen(false)}
        />

        <LanguageSwitcherSheet
          isOpen={languageSheetOpen}
          onClose={() => setLanguageSheetOpen(false)}
        />

        <LuxuryReportExportSheet
          isOpen={reportExportOpen}
          onClose={() => setReportExportOpen(false)}
        />

        <DeleteAccountModal
          isOpen={deleteAccountOpen}
          onClose={() => setDeleteAccountOpen(false)}
        />

        <WebDashboardLinkModal
          isOpen={webDashboardModalOpen}
          onClose={() => setWebDashboardModalOpen(false)}
        />

        <DataExportVaultModal
          isOpen={dataExportVaultOpen}
          onClose={() => setDataExportVaultOpen(false)}
          onOpenReportExport={() => setReportExportOpen(true)}
          onOpenVaultExport={() => {
            setVaultDefaultTab("export");
            setVaultModalOpen(true);
          }}
          onOpenVaultRestore={() => {
            setVaultDefaultTab("restore");
            setVaultModalOpen(true);
          }}
        />

        <BillDailyReminderSheet
          isOpen={billDailyReminderSheetOpen}
          onClose={() => setBillDailyReminderSheetOpen(false)}
          bills={bills}
          onSaved={() => {
            setBillRemindersEnabled(
              localStorage.getItem("trouvaille_bill_reminders_enabled") !==
                "false",
            );
            setDailyReminderEnabled(
              localStorage.getItem("trouvaille_daily_reminder_enabled") !==
                "false",
            );
          }}
        />

        <PeriodicDigestSettingsSheet
          isOpen={periodicDigestSheetOpen}
          onClose={() => setPeriodicDigestSheetOpen(false)}
          transactions={allTxs}
          onSaved={(wEnabled, mEnabled) => {
            setWeeklyDigestEnabled(wEnabled);
            setMonthEndReviewEnabled(mEnabled);
          }}
        />

        <AppUpdateModal
          isOpen={appUpdateOpen}
          onClose={() => setAppUpdateOpen(false)}
          releaseInfo={releaseInfo}
          checking={checkingUpdate}
          onCheckAgain={() => handleCheckForUpdate(false)}
        />

        <ShortcutManagementSheet
          isOpen={shortcutSheetOpen}
          onClose={() => setShortcutSheetOpen(false)}
        />
      </Suspense>
    </div>
  );
}
