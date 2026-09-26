import { useState, lazy, Suspense } from "react";
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
  Zap,
  Smartphone,
  Cloud,
  FileLock2,
  FileSpreadsheet,
  RotateCcw,
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
  Laptop,
  QrCode,
  Landmark,
} from "lucide-react";
import { BottomSheet } from "../components/ui/BottomSheet";
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
import { useShortcuts } from "../hooks/useShortcuts";
import { formatRupiah } from "../lib/utils";
import { format, isToday } from "date-fns";
import { supabase } from "../lib/supabase";
import {
  fetchAllTransactionsFromSupabase,
  transactionKeys,
} from "../hooks/useTransactions";
import {
  requestNotificationPermission,
  syncBillNotifications,
  cancelAllBillNotifications,
  syncDailyStreakReminder,
  cancelDailyStreakReminder,
  getDailyStreakReminderTime,
  setDailyStreakReminderTime,
} from "../lib/notifications";
import { flushPendingMutations } from "../lib/syncEngine";
import { saveBiometricLoginCredentials } from "../lib/biometricAuth";

// Code-split heavy modular sheets and exporters
const CurrencySwitcherSheet = lazy(() =>
  import("../components/currency/CurrencySwitcherSheet").then((m) => ({
    default: m.CurrencySwitcherSheet,
  }))
);
const LanguageSwitcherSheet = lazy(() =>
  import("../components/settings/LanguageSwitcherSheet").then((m) => ({
    default: m.LanguageSwitcherSheet,
  }))
);
import type { TabType } from "../components/settings/AppleShortcutsGuideModal";
const AppleShortcutsGuideModal = lazy(() =>
  import("../components/settings/AppleShortcutsGuideModal").then((m) => ({
    default: m.AppleShortcutsGuideModal,
  }))
);
const ResetTransactionsSheet = lazy(() =>
  import("../components/settings/ResetTransactionsSheet").then((m) => ({
    default: m.ResetTransactionsSheet,
  }))
);
const LuxuryReportExportSheet = lazy(() =>
  import("../components/export/LuxuryReportExportSheet").then((m) => ({
    default: m.LuxuryReportExportSheet,
  }))
);
const EncryptedVaultModal = lazy(() =>
  import("../components/security/EncryptedVaultModal").then((m) => ({
    default: m.EncryptedVaultModal,
  }))
);
const ProfileSheet = lazy(() =>
  import("../components/settings/ProfileSheet").then((m) => ({
    default: m.ProfileSheet,
  }))
);
const BillManagementSheets = lazy(() =>
  import("../components/settings/BillManagementSheets").then((m) => ({
    default: m.BillManagementSheets,
  }))
);
const CategoryManagementSheets = lazy(() =>
  import("../components/settings/CategoryManagementSheets").then((m) => ({
    default: m.CategoryManagementSheets,
  }))
);
const WalletManagementSheets = lazy(() =>
  import("../components/settings/WalletManagementSheets").then((m) => ({
    default: m.WalletManagementSheets,
  }))
);
const GoalManagementSheets = lazy(() =>
  import("../components/settings/GoalManagementSheets").then((m) => ({
    default: m.GoalManagementSheets,
  }))
);
const ShortcutManagementSheets = lazy(() =>
  import("../components/settings/ShortcutManagementSheets").then((m) => ({
    default: m.ShortcutManagementSheets,
  }))
);
const PinSetupModal = lazy(() =>
  import("../components/settings/PinSetupModal").then((m) => ({
    default: m.PinSetupModal,
  }))
);
const BudgetTargetSheet = lazy(() =>
  import("../components/settings/BudgetTargetSheet").then((m) => ({
    default: m.BudgetTargetSheet,
  }))
);
const MediaPermissionsSheet = lazy(() =>
  import("../components/settings/MediaPermissionsSheet").then((m) => ({
    default: m.MediaPermissionsSheet,
  }))
);
const AssetValuationSheet = lazy(() =>
  import("../components/settings/AssetValuationSheet").then((m) => ({
    default: m.AssetValuationSheet,
  }))
);
const ManageLedgersSheet = lazy(() =>
  import("../components/settings/ManageLedgersSheet").then((m) => ({
    default: m.ManageLedgersSheet,
  }))
);
const DeleteAccountModal = lazy(() =>
  import("../components/settings/DeleteAccountModal").then((m) => ({
    default: m.DeleteAccountModal,
  }))
);
const WebDashboardLinkModal = lazy(() =>
  import("../components/settings/WebDashboardLinkModal").then((m) => ({
    default: m.WebDashboardLinkModal,
  }))
);

type BentoHubType = "finance" | "shortcuts" | "security" | "preferences";

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
  const { language, isIndonesian } = useLanguage();
  const { activeSpace } = useSpace();

  // Active Bento Hub Sheet
  const [activeHub, setActiveHub] = useState<BentoHubType | null>(null);

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
        ? (isIndonesian ? "Label transaksi (#) diaktifkan" : "Transaction tags enabled")
        : (isIndonesian ? "Label transaksi (#) dinonaktifkan" : "Transaction tags disabled"),
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
        ? (isIndonesian ? "Lampiran foto struk akan disimpan" : "Receipt attachments will be saved")
        : (isIndonesian ? "Lampiran foto struk tidak akan disimpan" : "Receipt attachments will not be stored"),
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
      next
        ? (isIndonesian ? "Papan tombol angka kustom aktif" : "Liquid custom keypad active")
        : (isIndonesian ? "Keyboard sistem bawaan aktif" : "Default system keyboard active"),
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
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [webDashboardModalOpen, setWebDashboardModalOpen] = useState(false);

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
      showToast(
        isIndonesian ? "Peringatan tagihan dimatikan" : "Bill reminders turned off",
        "delete",
        () => {},
      );
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setBillRemindersEnabled(true);
        localStorage.setItem("trouvaille_bill_reminders_enabled", "true");
        await syncBillNotifications(bills);
        showToast(
          isIndonesian ? "Peringatan tagihan aktif" : "Bill reminders enabled",
          "add",
          () => {},
        );
      } else {
        showToast(
          isIndonesian ? "Izin notifikasi ditolak" : "Notification permission denied",
          "delete",
          () => {},
        );
      }
    }
  };

  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(() => {
    return localStorage.getItem("trouvaille_daily_reminder_enabled") !== "false";
  });
  const [dailyReminderTime, setDailyReminderTime] = useState<string>(() => {
    return getDailyStreakReminderTime();
  });

  const handleReminderTimeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newTime = e.target.value;
    if (!newTime) return;
    setDailyReminderTime(newTime);
    setDailyStreakReminderTime(newTime);
    triggerHaptic("light");
    if (dailyReminderEnabled) {
      await syncDailyStreakReminder(false);
      showToast(
        isIndonesian
          ? `Pengingat streak diatur ke jam ${newTime}`
          : `Streak reminder set to ${newTime}`,
        "update",
        () => {},
      );
    }
  };

  const handleToggleDailyReminder = async () => {
    triggerHaptic("light");
    if (dailyReminderEnabled) {
      setDailyReminderEnabled(false);
      localStorage.setItem("trouvaille_daily_reminder_enabled", "false");
      await cancelDailyStreakReminder();
      showToast(
        isIndonesian
          ? "Pengingat streak harian dinonaktifkan"
          : "Daily streak reminder turned off",
        "delete",
        () => {},
      );
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setDailyReminderEnabled(true);
        localStorage.setItem("trouvaille_daily_reminder_enabled", "true");
        await syncDailyStreakReminder(false);
        showToast(
          isIndonesian
            ? `Pengingat streak harian aktif (${dailyReminderTime})`
            : `Daily streak reminder enabled (${dailyReminderTime})`,
          "add",
          () => {},
        );
      } else {
        showToast(
          isIndonesian
            ? "Izin notifikasi belum diberikan"
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
      setLastSyncedTime(`${isIndonesian ? "Hari ini" : "Today"}, ${format(now, "HH:mm")}`);
      setSyncStatus("success");
      triggerHaptic("medium");
      showToast(
        isIndonesian
          ? `Data berhasil disinkronkan (${freshTxs.length} catatan)`
          : `Data synchronized (${freshTxs.length} records)`,
        "update",
        () => {},
      );

      setTimeout(() => {
        setSyncStatus("idle");
      }, 3500);
    } catch (err) {
      console.error("[handleSafeSync] Sync error:", err);
      setSyncStatus("error");
      showToast(
        isIndonesian
          ? "Gagal sinkronisasi. Data lokal tetap aman."
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
          ? "Atur ulang konfigurasi pengenalan? Seluruh catatan buku kas Anda tetap aman, dan Anda dapat menjalankan kembali wizard kustomisasi segera."
          : "Reset onboarding state? Your existing transaction ledger will remain safe, and you can re-experience the customization wizard immediately.",
      )
    ) {
      localStorage.removeItem("trouvaille_onboarded");
      localStorage.removeItem("trouvaille_onboarding_focus");
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    if (
      confirm(
        isIndonesian
          ? "Apakah Anda yakin ingin keluar dari akun?"
          : "Are you sure you want to sign out?",
      )
    ) {
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

  // Search Filter Items
  const showLedgers = matches(
    isIndonesian ? "Kelola Buku Kas" : "Manage Ledgers",
    "ledgers buku kas spaces personal workspace multi-ledger",
  );
  const showCategories = matches(
    isIndonesian ? "Kategori Pengeluaran & Pemasukan" : "Manage Categories",
    "expense income groups classifications kategori pos",
  );
  const showWallets = matches(
    isIndonesian ? "Akun & Dompet" : "Account & Wallets",
    "bank cash balance cards accounts dompet rekening saldo",
  );
  const showBudget = matches(
    isIndonesian ? "Target Anggaran Bulanan" : "Monthly Budget Target",
    "spending limit monthly budget anggaran limit belanja",
  );
  const showBills = matches(
    isIndonesian ? "Tagihan Rutin" : "Recurring Bills",
    "subscriptions commitments due dates bills tagihan langganan tempo",
  );
  const showGoals = matches(
    isIndonesian ? "Target Finansial & FIRE" : "Financial Goals",
    "savings target milestone progress goals impian tabungan target",
  );
  const showValuation = matches(
    isIndonesian ? "Valuasi Portofolio & Aset" : "Asset Valuation",
    "crypto stock usdt holdings investment investasi saham reksadana aset",
  );
  const showImport =
    onOpenImport &&
    matches(
      isIndonesian ? "Impor Rekening Koran" : "Import Bank Statement",
      "import bca csv statement bank rekening koran mutasi",
    );

  const showBackTap = matches(
    isIndonesian ? "Pintasan Ketuk Belakang (Kaca & Dikte)" : "Back Tap Glass & Voice Log",
    "ios accessibility double tap shortcut back tap siri dynamic island glass modal ketuk belakang kaca suara dikte",
  );
  const showActionButton = matches(
    isIndonesian ? "Pintasan Tombol Aksi" : "Action Button Shortcut",
    "iphone 15 pro 16 pro hardware button action button tombol aksi tindakan pintasan",
  );
  const showShortcuts = matches(
    isIndonesian ? "Preset Pintasan Cepat" : "Quick-Add Shortcuts",
    "fast entry quick voice 1-tap presets pintasan cepat preset bawaan satu ketukan",
  );
  const showApplePay = matches(
    isIndonesian ? "Otomatisasi Apple Pay" : "Apple Pay Automations",
    "apple pay nfc contactless card tap automation transaction otomatisasi kartu tap pembayaran",
  );

  const showPrivacyShield = matches(
    isIndonesian ? "Perisai Privasi (Sensor Saldo)" : "Privacy Shield",
    "mask hide numbers balance monetary figures sensor samarkan saldo privasi angka",
  );
  const showFaceID = matches(
    isIndonesian ? "Kunci Aplikasi (Biometrik / PIN)" : "Require Face ID / PIN",
    "biometrics face id touch pin lock resume kunci biometrik sandi",
  );
  const showMedia = matches(
    isIndonesian ? "Izin Kamera & Berkas" : "Camera & Photos Access",
    "permissions receipt scanner gallery kamera foto izin media struk",
  );
  const showCloudSync = matches(
    isIndonesian ? "Sinkronisasi Cloud" : "Cloud Sync",
    "backup database synchronization live sinkron cadangan cloud awan",
  );
  const showWebDashboard = matches(
    isIndonesian ? "Tautkan Web Dashboard" : "Web Dashboard",
    "link web scan qr desktop laptop browser workstation tautkan pindai komputer",
  );
  const showVault = matches(
    isIndonesian ? "Vault Terenkripsi (AES-256)" : "Encrypted Vault",
    "aes-256 file backup export restore offline brankas enkripsi cadangan",
  );
  const showExport = matches(
    isIndonesian ? "Ekspor Laporan & Pajak" : "Report & Tax Export",
    "csv excel pdf statement tax ledger json ekspor laporan pajak cetak",
  );
  const showReset = matches(
    isIndonesian ? "Reset Data Pembukuan" : "Reset Ledger Data",
    "wipe purge transactions reset ledger hapus bersih atur ulang data",
  );

  const showTheme = matches(
    isIndonesian ? "Tampilan Terang" : "Light Appearance",
    "dark light obsidian alabaster theme appearance color tema terang gelap tampilan",
  );
  const showCurrency = matches(
    isIndonesian ? "Mata Uang Utama" : "Base Currency",
    "rates exchange valuation usd idr forex mata uang valuta kurs simbol",
  );
  const showLanguage = matches(
    isIndonesian ? "Bahasa Aplikasi" : "App Language",
    "language bahasa indonesia english locale localization bahasa pengaturan",
  );
  const showKeypad = matches(
    isIndonesian ? "Papan Tombol Angka Kustom" : "Liquid Numeric Keypad",
    "keypad keyboard input calculator custom number pad papan tombol kalkulator haptik",
  );
  const showTags = matches(
    isIndonesian ? "Label Transaksi (#)" : "Transaction Tags (#)",
    "tags hashtag work reimburse personal label tagar kategori kustom",
  );
  const showSaveAttachments = matches(
    isIndonesian ? "Simpan File Lampiran" : "Save Attachment Files",
    "receipts camera slip images photos simpan lampiran berkas foto struk gambar",
  );
  const showDailyReminder = matches(
    isIndonesian ? "Pengingat Streak Harian" : "Daily Streak Reminder",
    "streak 20:00 night notification alert pengingat streak harian alarm notifikasi",
  );
  const showBillReminders = matches(
    isIndonesian ? "Peringatan Tagihan Jatuh Tempo" : "Bill Due Alerts",
    "bill reminders scheduled commit due pengingat tagihan jatuh tempo jatuh tempo",
  );
  const showRerunOnboarding = matches(
    isIndonesian ? "Ulangi Wizard Kustomisasi" : "Re-run Customization Wizard",
    "reset onboarding wizard setup test ulangi wizard konfigurasi awal panduan",
  );

  const hasAnyMatch =
    showLedgers ||
    showCategories ||
    showWallets ||
    showBudget ||
    showBills ||
    showGoals ||
    showValuation ||
    showImport ||
    showBackTap ||
    showActionButton ||
    showShortcuts ||
    showApplePay ||
    showPrivacyShield ||
    showFaceID ||
    showMedia ||
    showCloudSync ||
    showWebDashboard ||
    showVault ||
    showExport ||
    showReset ||
    showTheme ||
    showCurrency ||
    showLanguage ||
    showKeypad ||
    showTags ||
    showSaveAttachments ||
    showDailyReminder ||
    showBillReminders ||
    showRerunOnboarding;

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
        <p className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {isIndonesian
            ? "Pusat kendali, arsitektur finansial & keamanan"
            : "Control center, financial architecture & security"}
        </p>
      </div>

      {/* Search Bar */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <Search size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isIndonesian
              ? "Cari pengaturan, pintasan & keamanan..."
              : "Search settings, shortcuts & security..."
          }
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)] font-medium"
          style={{ color: "var(--text-primary)" }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setSearchQuery("");
            }}
            className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-transform cursor-pointer"
          >
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODE 1: BENTO HUBS OVERVIEW (WHEN SEARCH IS EMPTY) */}
      {/* ============================================================ */}
      {!searchQuery.trim() && (
        <div className="space-y-4">
          {/* Apple ID-Style Profile Hero Banner */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setProfileOpen(true);
              }}
              className="w-full glass-surface p-4 rounded-3xl flex items-center justify-between border border-[var(--glass-border)] active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center relative shrink-0 shadow-sm"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {isGuest ? (
                    <Zap size={20} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                  ) : avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon
                      size={20}
                      strokeWidth={1.75}
                      style={{ color: "var(--text-secondary)" }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="font-semibold text-[15px] truncate tracking-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isGuest ? (isIndonesian ? "Tamu Lokal" : "Local Guest") : displayName}
                  </p>
                  <p
                    className="text-[11.5px] font-medium truncate mt-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isGuest
                      ? (isIndonesian ? "Brankas Perangkat Offline" : "Offline Device Vault")
                      : session?.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isIndonesian ? "Kelola" : "Manage"}
                </span>
                <ChevronRight
                  size={16}
                  strokeWidth={1.75}
                  style={{ color: "var(--text-tertiary)" }}
                />
              </div>
            </button>

            {/* Offline Cloud Connect Pill if Guest */}
            {isGuest && (
              <div
                className="px-4 py-2.5 rounded-2xl border flex items-center justify-between gap-3 text-left"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <p className="text-[11px] font-medium text-[var(--text-tertiary)] truncate">
                  {isIndonesian
                    ? "Data tersimpan offline · Cadangkan ke cloud"
                    : "Ledger stored offline · Connect to backup"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    exitGuestMode();
                  }}
                  className="px-3 py-1 rounded-xl text-[11px] font-semibold shrink-0 active:scale-95 transition-transform cursor-pointer border"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {isIndonesian ? "Tautkan Cloud" : "Connect Cloud"}
                </button>
              </div>
            )}
          </div>

          {/* 4 Apple Luxury Bento Hub Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Hub 1: Financial Architecture */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub("finance");
              }}
              className="glass-surface rounded-3xl p-4 border border-[var(--glass-border)] flex flex-col justify-between min-h-[160px] text-left active:scale-[0.985] transition-all cursor-pointer relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Landmark size={17} strokeWidth={1.75} />
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <h3
                  className="text-[15px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Arsitektur Finansial" : "Financial Architecture"}
                </h3>
                <p
                  className="text-[11px] font-medium mt-0.5 line-clamp-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian
                    ? "Buku kas, akun dompet, kategori & komitmen tagihan"
                    : "Ledgers, wallets, categories & recurring bills"}
                </p>
              </div>

              {/* Dynamic Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-auto">
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {wallets.length} {isIndonesian ? "Dompet" : "Wallets"}
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {categories.length} {isIndonesian ? "Kategori" : "Categories"}
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {bills.length} {isIndonesian ? "Tagihan" : "Bills"}
                </span>
              </div>
            </button>

            {/* Hub 2: Automations & Shortcuts */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub("shortcuts");
              }}
              className="glass-surface rounded-3xl p-4 border border-[var(--glass-border)] flex flex-col justify-between min-h-[160px] text-left active:scale-[0.985] transition-all cursor-pointer relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Zap size={17} strokeWidth={1.75} />
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <h3
                  className="text-[15px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Pintasan & Ekosistem iOS" : "Automations & Shortcuts"}
                </h3>
                <p
                  className="text-[11px] font-medium mt-0.5 line-clamp-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian
                    ? "Ketuk Belakang iPhone, Tombol Aksi & dialog kaca"
                    : "iPhone Back Tap, Action Button & glass dialog"}
                </p>
              </div>

              {/* Dynamic Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-auto">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isIndonesian ? "Ketuk Belakang Aktif" : "Back Tap Ready"}
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {shortcuts.length} {isIndonesian ? "Preset" : "Presets"}
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isIndonesian ? "1-Ketukan" : "1-Tap"}
                </span>
              </div>
            </button>

            {/* Hub 3: Security & Data Vault */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub("security");
              }}
              className="glass-surface rounded-3xl p-4 border border-[var(--glass-border)] flex flex-col justify-between min-h-[160px] text-left active:scale-[0.985] transition-all cursor-pointer relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <ShieldCheck size={17} strokeWidth={1.75} />
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <h3
                  className="text-[15px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Privasi, Keamanan & Vault" : "Security & Data Vault"}
                </h3>
                <p
                  className="text-[11px] font-medium mt-0.5 line-clamp-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian
                    ? "Sensor saldo, Face ID, enkripsi AES-256 & cadangan cloud"
                    : "Masked balance, Face ID, AES-256 & cloud backups"}
                </p>
              </div>

              {/* Dynamic Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-auto">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {securitySettings.enabled
                    ? isBiometricSupported
                      ? "Face ID"
                      : "PIN"
                    : (isIndonesian ? "Kunci Nonaktif" : "Unlocked")}
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isPrivacyShieldEnabled
                    ? (isIndonesian ? "Sensor Aktif" : "Shield On")
                    : (isIndonesian ? "Sensor Mati" : "Shield Off")}
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  AES-256
                </span>
              </div>
            </button>

            {/* Hub 4: Preferences & Experience */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub("preferences");
              }}
              className="glass-surface rounded-3xl p-4 border border-[var(--glass-border)] flex flex-col justify-between min-h-[160px] text-left active:scale-[0.985] transition-all cursor-pointer relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <SlidersHorizontal size={17} strokeWidth={1.75} />
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <h3
                  className="text-[15px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Preferensi & Tampilan" : "Preferences & Experience"}
                </h3>
                <p
                  className="text-[11px] font-medium mt-0.5 line-clamp-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian
                    ? "Tema tampilan, mata uang utama, bahasa & keypad"
                    : "Display theme, base currency, language & keypad"}
                </p>
              </div>

              {/* Dynamic Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-auto">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {theme === "light" ? "Alabaster" : "Obsidian"}
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {preferredCurrency}
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {language === "id" ? "Bahasa Indonesia" : "English"}
                </span>
              </div>
            </button>
          </div>

          {/* Sign Out / Exit Guest Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={isGuest ? exitGuestMode : handleLogout}
              className="w-full py-3.5 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <LogOut size={15} strokeWidth={1.75} />
              <span>
                {isGuest
                  ? (isIndonesian ? "Keluar Mode Tamu" : "Exit Guest Mode")
                  : (isIndonesian ? "Keluar Akun" : "Log Out")}
              </span>
            </button>

            <div className="text-center pt-3">
              <p
                className="text-[10.5px] font-mono tracking-wider opacity-60"
                style={{ color: "var(--text-tertiary)" }}
              >
                Trouvaille Luxury · v1.0.0
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 2: INSTANT SEARCH RESULTS OVERLAY (WHEN SEARCH ACTIVE) */}
      {/* ============================================================ */}
      {searchQuery.trim() !== "" && (
        <div className="space-y-4">
          {!hasAnyMatch ? (
            <div className="py-14 text-center space-y-2">
              <Search
                size={26}
                strokeWidth={1.5}
                className="mx-auto text-[var(--text-tertiary)] opacity-50"
              />
              <p
                className="text-[14px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Pengaturan Tidak Ditemukan" : "No Settings Found"}
              </p>
              <p className="text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian
                  ? `Tidak ada opsi yang cocok dengan "${searchQuery}"`
                  : `No options match "${searchQuery}"`}
              </p>
            </div>
          ) : (
            <div className="glass-surface rounded-3xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
              {/* Financial Items */}
              {showLedgers && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setManageLedgersOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <BookOpen size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Kelola Buku Kas" : "Manage Ledgers"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {activeSpace?.name || (isIndonesian ? "Buku Kas Utama" : "Personal Ledger")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showCategories && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setCategoriesOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <FolderTree size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Kategori Pengeluaran & Pemasukan" : "Manage Categories"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {categories.length} {isIndonesian ? "kategori terdaftar" : "categories configured"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showWallets && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setBudgetsOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <CreditCard size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Akun & Dompet" : "Account & Wallets"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {wallets.length} {isIndonesian ? "dompet aktif" : "accounts tracked"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showBudget && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setBudgetTargetOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Target size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Target Anggaran Bulanan" : "Monthly Budget Target"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {budgetTarget > 0 ? formatRupiah(budgetTarget) : (isIndonesian ? "Belum diatur" : "Not Set")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showBills && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setBillListOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Receipt size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Tagihan Rutin" : "Recurring Bills"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {bills.length} {isIndonesian ? "tagihan aktif" : "active bills"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showGoals && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setGoalsOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <TrendingUp size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Target Finansial & FIRE" : "Financial Goals"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {goals.length} {isIndonesian ? "target tersimpan" : "targets defined"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showValuation && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setValuationOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Coins size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Valuasi Portofolio & Aset" : "Asset Valuation"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Kripto & saham real-time" : "Crypto & holdings"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showImport && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onOpenImport();
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <FileSpreadsheet size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Impor Rekening Koran" : "Import Bank Statement"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        BCA / CSV
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {/* Automations Items */}
              {showBackTap && (
                <button
                  type="button"
                  onClick={() => openShortcutsWithTab("back_tap")}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Smartphone size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Pintasan Ketuk Belakang (Kaca & Dikte)" : "Back Tap (Glass Dialog & Voice)"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Ketuk 2x iPhone & Dynamic Island" : "Double-tap iPhone back"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showActionButton && (
                <button
                  type="button"
                  onClick={() => openShortcutsWithTab("action_button")}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <SlidersHorizontal size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Pintasan Tombol Aksi" : "Action Button Shortcut"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        iPhone 15 / 16 Pro
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showShortcuts && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setShortcutsOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Zap size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Preset Pintasan Cepat" : "Quick-Add Shortcuts"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {shortcuts.length} {isIndonesian ? "preset tersimpan" : "presets configured"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showApplePay && (
                <button
                  type="button"
                  onClick={() => openShortcutsWithTab("automation")}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <CreditCard size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Otomatisasi Apple Pay" : "Apple Pay Automations"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Pencatatan otomatis kartu tap" : "Auto-log on card tap"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {/* Security & Vault Items */}
              {showPrivacyShield && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <EyeOff size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Perisai Privasi (Sensor Saldo)" : "Privacy Shield"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Samarkan nominal angka di seluruh tampilan" : "Mask balance figures across app"}
                      </span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={isPrivacyShieldEnabled}
                    onChange={() => {
                      togglePrivacyShield();
                      showToast(
                        isPrivacyShieldEnabled
                          ? (isIndonesian ? "Perisai Privasi dinonaktifkan" : "Privacy Shield disabled")
                          : (isIndonesian ? "Perisai Privasi diaktifkan" : "Privacy Shield enabled"),
                        "update",
                        () => {},
                      );
                    }}
                    ariaLabel="Toggle privacy shield"
                  />
                </div>
              )}

              {showFaceID && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <ShieldCheck size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Kunci Aplikasi (Face ID / PIN)" : "Require Face ID / PIN"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Wajibkan otentikasi saat buka" : "Enforce verification on launch"}
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
                              ? "Silakan atur PIN cadangan terlebih dahulu"
                              : "Please set up a backup PIN first",
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
                              isIndonesian ? "Face ID aktif" : "Face ID enabled",
                              "update",
                              () => {},
                            );
                          } catch (err: any) {
                            showToast(
                              err?.message ||
                                (isIndonesian
                                  ? "Gagal mengatur biometrik. Kunci PIN aktif."
                                  : "Biometric setup failed. App lock enabled with PIN."),
                              "info",
                              null,
                              3000,
                            );
                            updateSecuritySettings({ enabled: true });
                          }
                        } else {
                          updateSecuritySettings({ enabled: true });
                          triggerHaptic("medium");
                          showToast(
                            isIndonesian ? "Kunci aplikasi aktif" : "App lock enabled",
                            "update",
                            () => {},
                          );
                        }
                      } else {
                        updateSecuritySettings({ enabled: false });
                        triggerHaptic("light");
                        showToast(
                          isIndonesian ? "Kunci aplikasi dinonaktifkan" : "App lock disabled",
                          "update",
                          () => {},
                        );
                      }
                    }}
                    ariaLabel="Toggle app lock"
                  />
                </div>
              )}

              {showMedia && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setMediaPermissionsOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Camera size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Izin Kamera & Berkas" : "Camera & Photos Access"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Izin pemindai struk & galeri" : "Receipt scanner permissions"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showCloudSync && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Cloud size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Sinkronisasi Cloud" : "Cloud Sync"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {syncStatus === "syncing"
                          ? (isIndonesian ? "Menyinkronkan..." : "Syncing...")
                          : syncStatus === "error"
                            ? (isIndonesian ? "Offline · Data lokal aman" : "Offline · Local preserved")
                            : `${isIndonesian ? "Tersinkron" : "Synced"} ${lastSyncedTime}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSafeSync}
                    disabled={syncStatus === "syncing"}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shrink-0 border"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {syncStatus === "syncing" && <Loader2 size={11} className="animate-spin" />}
                    {syncStatus === "success" && <Check size={11} />}
                    <span>
                      {syncStatus === "syncing"
                        ? (isIndonesian ? "Menyinkronkan" : "Syncing")
                        : syncStatus === "success"
                          ? (isIndonesian ? "Tersinkron" : "Synced")
                          : syncStatus === "error"
                            ? (isIndonesian ? "Coba Lagi" : "Retry")
                            : (isIndonesian ? "Sinkronkan" : "Sync Now")}
                    </span>
                  </button>
                </div>
              )}

              {showWebDashboard && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setWebDashboardModalOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Laptop size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Tautkan Web Dashboard" : "Link Web Dashboard"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Pindai QR untuk akses desktop" : "Scan QR code for desktop login"}
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
                    <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </button>
              )}

              {showVault && (
                <button
                  type="button"
                  onClick={() => {
                    setVaultDefaultTab("export");
                    setVaultModalOpen(true);
                    triggerHaptic("light");
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <FileLock2 size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Vault Terenkripsi (AES-256)" : "Encrypted Vault"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Cadangan offline berkas aman" : "AES-256 offline file backup"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showExport && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setReportExportOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <FileSpreadsheet size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Ekspor Laporan & Pajak" : "Report & Tax Export"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        PDF / CSV / JSON
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showReset && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setResetOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <RotateCcw size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Reset Data Pembukuan" : "Reset Ledger Data"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Hapus seluruh transaksi lokal" : "Purge transactions safely"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {/* Preferences Items */}
              {showTheme && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Sun size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Tampilan Terang" : "Light Appearance"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Monokrom alabaster bersih" : "Clean alabaster luxury monochrome"}
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

              {showCurrency && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setCurrencySheetOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Coins size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Mata Uang Utama" : "Base Currency"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {preferredCurrency} ({currencyMeta.symbol})
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showLanguage && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setLanguageSheetOpen(true);
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <Languages size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Bahasa Aplikasi" : "App Language"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {language === "id" ? "Bahasa Indonesia" : "English"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}

              {showKeypad && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Calculator size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Papan Tombol Angka Kustom" : "Liquid Numeric Keypad"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Keypad floating haptik khusus nominal" : "Tactile haptic numpad"}
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

              {showTags && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Tag size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Label Transaksi (#)" : "Transaction Tags (#)"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Kelompokkan transaksi dengan tagar" : "Multi-tag categorization"}
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

              {showSaveAttachments && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Paperclip size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Simpan File Lampiran" : "Save Attachment Files"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Simpan foto struk di memori lokal" : "Store receipt images on device"}
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

              {showDailyReminder && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <BellRing size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Pengingat Streak Harian" : "Daily Streak Reminder"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? `Setiap pukul ${dailyReminderTime}` : `Every day at ${dailyReminderTime}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {dailyReminderEnabled && (
                      <div className="relative">
                        <input
                          type="time"
                          value={dailyReminderTime}
                          onChange={handleReminderTimeChange}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                          aria-label={isIndonesian ? "Pilih Jam Pengingat" : "Select Reminder Time"}
                        />
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Clock size={11} strokeWidth={1.75} className="text-[var(--text-tertiary)]" />
                          <span>{dailyReminderTime}</span>
                        </button>
                      </div>
                    )}
                    <ToggleSwitch
                      checked={dailyReminderEnabled}
                      onChange={handleToggleDailyReminder}
                      ariaLabel="Toggle daily streak reminder"
                    />
                  </div>
                </div>
              )}

              {showBillReminders && (
                <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <CalendarClock size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Peringatan Tagihan Jatuh Tempo" : "Bill Due Alerts"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Peringatan proaktif sebelum jatuh tempo" : "Proactive bill reminders"}
                      </span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={billRemindersEnabled}
                    onChange={handleToggleBillReminders}
                    ariaLabel="Toggle bill reminders"
                  />
                </div>
              )}

              {showRerunOnboarding && (
                <button
                  type="button"
                  onClick={handleRerunCustomization}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                      <SlidersHorizontal size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-[13px] font-semibold block truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {isIndonesian ? "Ulangi Wizard Kustomisasi" : "Re-run Customization Wizard"}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                        {isIndonesian ? "Jalankan kembali wizard tanpa hapus transaksi" : "Reset onboarding experience safely"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4 SLIDING BOTTOM SHEETS FOR THE BENTO HUBS */}
      {/* ============================================================ */}

      {/* Sheet 1: Financial Architecture */}
      <BottomSheet
        isOpen={activeHub === "finance"}
        onClose={() => setActiveHub(null)}
        title={isIndonesian ? "Arsitektur Finansial" : "Financial Architecture"}
      >
        <div className="px-5 py-2 space-y-4">
          <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian
              ? "Kelola struktur pembukuan, rekening, dompet, pengelompokan transaksi & target keuangan."
              : "Manage bookkeeping structure, wallets, accounts, transaction groups & goals."}
          </p>

          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Manage Ledgers */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setManageLedgersOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <BookOpen size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Kelola Buku Kas" : "Manage Ledgers"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Pemisahan multi-buku kas independen" : "Independent multi-ledger spaces"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11.5px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {activeSpace?.name || (isIndonesian ? "Buku Utama" : "Personal")}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Manage Categories */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setCategoriesOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <FolderTree size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Kategori Pengeluaran & Pemasukan" : "Manage Categories"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Struktur klasifikasi & ikon kustom" : "Custom icons & classification hierarchy"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11.5px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {categories.length}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Account & Wallets */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setBudgetsOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <CreditCard size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Akun & Dompet" : "Account & Wallets"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Bank, e-wallet, uang tunai & kartu kredit" : "Banks, cash, e-wallets & credit cards"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11.5px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {wallets.length}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Monthly Budget Target */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setBudgetTargetOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Target size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Target Anggaran Bulanan" : "Monthly Budget Target"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Batas maksimal belanja & siklus gajian" : "Spending limit & salary anchor day"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11.5px] font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {budgetTarget > 0 ? formatRupiah(budgetTarget) : (isIndonesian ? "Belum Diatur" : "Not Set")}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Recurring Bills */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setBillListOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Receipt size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Tagihan Rutin & Komitmen" : "Recurring Bills"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Langganan rutin, cicilan & jatuh tempo" : "Subscriptions, dues & scheduled commitments"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11.5px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {bills.length} {isIndonesian ? "aktif" : "active"}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Financial Goals */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setGoalsOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <TrendingUp size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Target Finansial & FIRE" : "Financial Goals & FIRE"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Dana darurat, pensiun & milestone impian" : "Emergency fund, early retirement & milestones"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11.5px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {goals.length} {isIndonesian ? "target" : "targets"}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Asset Valuation */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setValuationOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Coins size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Valuasi Portofolio & Aset" : "Asset Valuation"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Kripto, saham, emas & kepemilikan aset" : "Crypto, stocks, gold & investment holdings"}
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
            </button>

            {/* Import Statement */}
            {onOpenImport && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveHub(null);
                  onOpenImport();
                }}
                className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                    <FileSpreadsheet size={15} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-[13px] font-semibold block truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Impor Rekening Koran" : "Import Bank Statement"}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                      {isIndonesian ? "Pencernaan mutasi otomatis BCA / CSV" : "Automated BCA / CSV ingestion parser"}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  BCA / CSV
                </span>
              </button>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Sheet 2: Automations & Shortcuts */}
      <BottomSheet
        isOpen={activeHub === "shortcuts"}
        onClose={() => setActiveHub(null)}
        title={isIndonesian ? "Pintasan & Ekosistem iOS" : "Automations & Shortcuts"}
      >
        <div className="px-5 py-2 space-y-4">
          <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian
              ? "Integrasi perangkat keras iOS: ketukan bodi belakang, Tombol Aksi, Siri & pencatatan tap otomatis."
              : "Hardware-level iOS integrations: Back Tap, Action Button, Siri & automated card tap logging."}
          </p>

          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Back Tap */}
            <button
              type="button"
              onClick={() => {
                setActiveHub(null);
                openShortcutsWithTab("back_tap");
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Smartphone size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian
                      ? "Pintasan Ketuk Belakang (Kaca & Dikte)"
                      : "Back Tap (Glass Dialog & Voice)"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Ketuk 2x bodi belakang iPhone & dialog Dynamic Island"
                      : "Double-tap iPhone back & Dynamic Island dialog"}
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
                  {isIndonesian ? "Kaca" : "Glass UI"}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                setActiveHub(null);
                openShortcutsWithTab("action_button");
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <SlidersHorizontal size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Pintasan Tombol Aksi" : "Action Button Shortcut"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Tombol fisik iPhone 15 Pro & 16 Pro"
                      : "iPhone 15 & 16 Pro hardware button"}
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
                  {isIndonesian ? "1-Ketuk" : "1-Tap"}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Quick-Add Shortcuts */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setShortcutsOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Zap size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Preset Pintasan Cepat" : "Quick-Add Shortcuts"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Pencatatan nominal rutin sekali ketuk"
                      : "Routine 1-tap rapid expense presets"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span
                  className="text-[11.5px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: "var(--glass-border)",
                    color: "var(--text-secondary)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  {shortcuts.length} {isIndonesian ? "preset" : "presets"}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Apple Pay Automations */}
            <button
              type="button"
              onClick={() => {
                setActiveHub(null);
                openShortcutsWithTab("automation");
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <CreditCard size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Otomatisasi Apple Pay" : "Apple Pay Automations"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Pencatatan otomatis saat transaksi kartu tap"
                      : "Auto-log on contactless card tap & terminal"}
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
                  {isIndonesian ? "Otomatis" : "Auto"}
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Sheet 3: Security & Data Vault */}
      <BottomSheet
        isOpen={activeHub === "security"}
        onClose={() => setActiveHub(null)}
        title={isIndonesian ? "Privasi, Keamanan & Vault" : "Security & Data Vault"}
      >
        <div className="px-5 py-2 space-y-4">
          <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian
              ? "Perlindungan data biometrik, penyamaran saldo, sinkronisasi cloud & enkripsi brankas tingkat militer."
              : "Biometric protection, balance obfuscation, cloud synchronization & military-grade vault encryption."}
          </p>

          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Privacy Shield */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <EyeOff size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Perisai Privasi (Sensor Saldo)" : "Privacy Shield (Mask Balances)"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Samarkan angka saldo di seluruh kartu dan laporan"
                      : "Obfuscate currency balances across cards and reports"}
                  </span>
                </div>
              </div>
              <ToggleSwitch
                checked={isPrivacyShieldEnabled}
                onChange={() => {
                  togglePrivacyShield();
                  showToast(
                    isPrivacyShieldEnabled
                      ? (isIndonesian ? "Perisai Privasi dinonaktifkan" : "Privacy Shield disabled")
                      : (isIndonesian ? "Perisai Privasi diaktifkan" : "Privacy Shield enabled"),
                    "update",
                    () => {},
                  );
                }}
                ariaLabel="Toggle privacy shield"
              />
            </div>

            {/* Face ID / PIN */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <ShieldCheck size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Kunci Aplikasi (Biometrik / PIN)" : "Require Face ID / PIN"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Wajibkan otentikasi biometrik atau PIN saat membuka aplikasi"
                      : "Enforce biometric verification or passcode on launch"}
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
                          ? "Silakan atur PIN cadangan terlebih dahulu untuk mengaktifkan kunci"
                          : "Please set up a backup PIN first to enable app lock",
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
                          isIndonesian ? "Face ID / Biometrik aktif" : "Face ID / Biometrics enabled",
                          "update",
                          () => {},
                        );
                      } catch (err: any) {
                        showToast(
                          err?.message ||
                            (isIndonesian
                              ? "Gagal mengatur biometrik. Kunci aplikasi aktif dengan PIN."
                              : "Biometric setup failed. App lock enabled with PIN."),
                          "info",
                          null,
                          3000,
                        );
                        updateSecuritySettings({ enabled: true });
                      }
                    } else {
                      updateSecuritySettings({ enabled: true });
                      triggerHaptic("medium");
                      showToast(
                        isIndonesian ? "Kunci aplikasi aktif" : "App lock enabled",
                        "update",
                        () => {},
                      );
                    }
                  } else {
                    updateSecuritySettings({ enabled: false });
                    triggerHaptic("light");
                    showToast(
                      isIndonesian ? "Kunci aplikasi dinonaktifkan" : "App lock disabled",
                      "update",
                      () => {},
                    );
                  }
                }}
                ariaLabel="Toggle Face ID or PIN lock"
              />
            </div>

            {/* Lock Timeout & PIN options if enabled */}
            {securitySettings.enabled && (
              <>
                <div className="flex items-center justify-between py-2.5 px-4 min-h-[48px] bg-white/[0.01]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Clock size={15} strokeWidth={1.75} />
                    </div>
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Batas Waktu Terkunci" : "Lock Timeout"}
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
                          className="py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
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

                <button
                  type="button"
                  onClick={() => {
                    setPinModalOpen(true);
                    triggerHaptic("light");
                  }}
                  className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full bg-white/[0.01]"
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
                      <KeyRound size={15} strokeWidth={1.75} />
                    </div>
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? (securitySettings.hasPin ? "Ubah PIN Cadangan" : "Atur PIN Cadangan")
                        : (securitySettings.hasPin ? "Change Backup PIN" : "Setup Backup PIN")}
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
                        ? (securitySettings.hasPin ? "Terkonfigurasi" : "Belum Diatur")
                        : (securitySettings.hasPin ? "Configured" : "Setup")}
                    </span>
                    <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </button>
              </>
            )}

            {/* Camera & Photos Access */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setMediaPermissionsOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Camera size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Izin Kamera & Berkas" : "Camera & Media Permissions"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Pengaturan akses pemindai struk & galeri" : "Receipt scanner & gallery permissions"}
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
            </button>

            {/* Cloud Sync */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Cloud size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Sinkronisasi Cloud" : "Cloud Sync"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {syncStatus === "syncing"
                      ? (isIndonesian ? "Menyinkronkan..." : "Syncing...")
                      : syncStatus === "error"
                        ? (isIndonesian ? "Offline · Data lokal aman" : "Offline · Local preserved")
                        : `${isIndonesian ? "Tersinkron" : "Synced"} ${lastSyncedTime}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSafeSync}
                disabled={syncStatus === "syncing"}
                className="px-3 py-1 rounded-full text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shrink-0 border"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                {syncStatus === "syncing" && <Loader2 size={11} className="animate-spin" />}
                {syncStatus === "success" && <Check size={11} />}
                <span>
                  {syncStatus === "syncing"
                    ? (isIndonesian ? "Menyinkronkan" : "Syncing")
                    : syncStatus === "success"
                      ? (isIndonesian ? "Tersinkron" : "Synced")
                      : syncStatus === "error"
                        ? (isIndonesian ? "Coba Lagi" : "Retry")
                        : (isIndonesian ? "Sinkronkan" : "Sync Now")}
                </span>
              </button>
            </div>

            {/* Link Web Dashboard */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setWebDashboardModalOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Laptop size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Tautkan Web Dashboard" : "Link Web Dashboard"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Pindai QR untuk masuk di Mac atau PC" : "Scan QR code to log in on Mac or PC"}
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
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Encrypted Vault */}
            <button
              type="button"
              onClick={() => {
                setVaultDefaultTab("export");
                setActiveHub(null);
                setVaultModalOpen(true);
                triggerHaptic("light");
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <FileLock2 size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Vault Terenkripsi (AES-256)" : "Encrypted Vault (AES-256)"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Cadangan berkas offline dengan kata sandi pribadi"
                      : "Offline encrypted file backup with master passcode"}
                  </span>
                </div>
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
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Report & Tax Export */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setReportExportOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <FileSpreadsheet size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Ekspor Laporan & Pajak" : "Report & Tax Export"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Cetak PDF mewah, lembar kerja CSV & JSON" : "Luxury PDF, CSV statement & JSON format"}
                  </span>
                </div>
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
                  PDF / CSV
                </span>
                <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>

            {/* Reset Ledger Data */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setResetOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <RotateCcw size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Reset Data Pembukuan" : "Reset Ledger Data"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian ? "Kosongkan riwayat mutasi tanpa hapus akun" : "Wipe transaction ledger while keeping setup"}
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Sheet 4: Preferences & Experience */}
      <BottomSheet
        isOpen={activeHub === "preferences"}
        onClose={() => setActiveHub(null)}
        title={isIndonesian ? "Preferensi & Tampilan" : "Preferences & Experience"}
      >
        <div className="px-5 py-2 space-y-4">
          <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian
              ? "Kustomisasi estetika visual, mata uang, bahasa aplikasi, input angka haptik & pengingat notifikasi."
              : "Customize visual aesthetic, base currency, language, haptic numeric input & daily reminder alerts."}
          </p>

          <div className="glass-surface rounded-2xl overflow-hidden border border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Sun size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Tampilan Terang" : "Light Appearance"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Gunakan estetika monokrom alabaster"
                      : "Use clean alabaster luxury monochrome"}
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

            {/* Base Currency */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setCurrencySheetOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Coins size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Mata Uang Utama" : "Base Currency"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {preferredCurrency} ({currencyMeta.symbol})
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
            </button>

            {/* App Language */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveHub(null);
                setLanguageSheetOpen(true);
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <Languages size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Bahasa Aplikasi" : "App Language"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {language === "id" ? "Bahasa Indonesia" : "English"}
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
            </button>

            {/* Custom Keypad */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Calculator size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Papan Tombol Angka Kustom" : "Liquid Numeric Keypad"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Keypad floating haptik khusus input nominal"
                      : "Tactile haptic numpad for seamless transaction entry"}
                  </span>
                </div>
              </div>
              <ToggleSwitch
                checked={customKeypadEnabled}
                onChange={handleToggleCustomKeypad}
                ariaLabel="Toggle liquid numeric keypad"
              />
            </div>

            {/* Transaction Tags */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Tag size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Label Transaksi (#)" : "Transaction Tags (#)"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Kelompokkan transaksi dengan tagar kustom"
                      : "Organize transactions with multi-tag hashtags"}
                  </span>
                </div>
              </div>
              <ToggleSwitch
                checked={tagsEnabled}
                onChange={handleToggleTags}
                ariaLabel="Toggle transaction tags"
              />
            </div>

            {/* Save Attachments */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Paperclip size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Simpan File Lampiran" : "Save Attachment Files"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Simpan foto struk langsung ke penyimpanan lokal"
                      : "Store receipt photo attachments locally on device"}
                  </span>
                </div>
              </div>
              <ToggleSwitch
                checked={saveAttachmentsEnabled}
                onChange={handleToggleSaveAttachments}
                ariaLabel="Toggle save attachments"
              />
            </div>

            {/* Daily Streak Reminder */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <BellRing size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Pengingat Streak Harian" : "Daily Streak Reminder"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? `Notifikasi harian pukul ${dailyReminderTime} untuk konsistensi kas`
                      : `Daily reminder at ${dailyReminderTime} to keep your ledger active`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {dailyReminderEnabled && (
                  <div className="relative">
                    <input
                      type="time"
                      value={dailyReminderTime}
                      onChange={handleReminderTimeChange}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      aria-label={isIndonesian ? "Pilih Jam Pengingat" : "Select Reminder Time"}
                    />
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Clock size={12} strokeWidth={1.75} className="text-[var(--text-tertiary)]" />
                      <span>{dailyReminderTime}</span>
                    </button>
                  </div>
                )}
                <ToggleSwitch
                  checked={dailyReminderEnabled}
                  onChange={handleToggleDailyReminder}
                  ariaLabel="Toggle daily streak reminder"
                />
              </div>
            </div>

            {/* Bill Due Alerts */}
            <div className="flex items-center justify-between py-3 px-4 min-h-[52px]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <CalendarClock size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Peringatan Tagihan Jatuh Tempo" : "Bill Due Alerts"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Peringatan proaktif sebelum tanggal tagihan rutin"
                      : "Proactive reminders before recurring payment due dates"}
                  </span>
                </div>
              </div>
              <ToggleSwitch
                checked={billRemindersEnabled}
                onChange={handleToggleBillReminders}
                ariaLabel="Toggle bill reminders"
              />
            </div>

            {/* Re-run Customization Wizard */}
            <button
              type="button"
              onClick={() => {
                setActiveHub(null);
                handleRerunCustomization();
              }}
              className="flex items-center justify-between py-3 px-4 min-h-[52px] active:bg-white/[0.04] transition-colors cursor-pointer text-left w-full"
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
                  <SlidersHorizontal size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="text-[13px] font-semibold block truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {isIndonesian ? "Ulangi Wizard Kustomisasi" : "Re-run Customization Wizard"}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
                    {isIndonesian
                      ? "Atur ulang konfigurasi onboarding tanpa menghapus data kas"
                      : "Re-experience the initial configuration onboarding wizard"}
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
        </div>
      </BottomSheet>

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
      </Suspense>
    </div>
  );
}
