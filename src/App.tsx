import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { useAuth } from "./contexts/AuthContext";
import {
  useEnsureDefaultCategories,
  useCategories,
  categoryKeys,
} from "./hooks/useCategories";
import {
  useEnsureDefaultWallets,
  useWallets,
  walletKeys,
} from "./hooks/useWallets";
import { useAllTransactions, useAddTransaction, transactionKeys } from "./hooks/useTransactions";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { InitialSyncScreen } from "./components/ui/InitialSyncScreen";
import { SyncStatusPill } from "./components/ui/SyncStatusPill";
import { ClipboardTransactionBanner } from "./components/common/ClipboardTransactionBanner";
import { App as CapApp } from "@capacitor/app";
import { parseDeepLink } from "./lib/deepLinkHandler";
import { useLanguage } from "./contexts/LanguageContext";
import { triggerSuccessHaptic, triggerHaptic } from "./lib/haptics";
import { format } from "date-fns";
import { formatRupiah } from "./lib/utils";
import {
  showNativeLocalNotification,
  syncWeeklyDigestNotification,
  syncMonthEndReviewNotification,
  checkBudgetThresholdAlerts,
} from "./lib/notifications";
import {
  DynamicIslandHUD,
  type ShortcutRecordedTxData,
} from "./components/transactions/DynamicIslandHUD";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAllTransactionsFromSupabase } from "./hooks/useTransactions";
import { supabase } from "./lib/supabase";
import { flushPendingMutations } from "./lib/syncEngine";
import {
  migrateGuestDataToCloud,
  hasGuestData,
  discardGuestData,
} from "./lib/guestMigration";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { usePrivacy } from "./contexts/PrivacyContext";
import { useSpace } from "./contexts/SpaceContext";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);
const TransactionsPage = lazy(() =>
  import("./pages/TransactionsPage").then((module) => ({
    default: module.TransactionsPage,
  })),
);
const CalendarPage = lazy(() =>
  import("./pages/CalendarPage").then((module) => ({
    default: module.CalendarPage,
  })),
);
const StatisticsPage = lazy(() =>
  import("./pages/StatisticsPage").then((module) => ({
    default: module.StatisticsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const AssetsPage = lazy(() =>
  import("./pages/AssetsPage").then((module) => ({
    default: module.AssetsPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const TransactionSheet = lazy(() =>
  import("./components/transactions/TransactionSheet").then((module) => ({
    default: module.TransactionSheet,
  })),
);
const VoiceQuickAddModal = lazy(() =>
  import("./components/transactions/VoiceQuickAddModal").then((module) => ({
    default: module.VoiceQuickAddModal,
  })),
);
const ReceiptScanModal = lazy(() =>
  import("./components/transactions/ReceiptScanModal").then((module) => ({
    default: module.ReceiptScanModal,
  })),
);
const StatementImportModal = lazy(() =>
  import("./components/transactions/StatementImportModal").then((module) => ({
    default: module.StatementImportModal,
  })),
);
const OnboardingModal = lazy(() =>
  import("./components/onboarding/OnboardingModal").then((module) => ({
    default: module.OnboardingModal,
  })),
);
const JoinLedgerModal = lazy(() =>
  import("./components/settings/JoinLedgerModal").then((module) => ({
    default: module.JoinLedgerModal,
  })),
);
const ResetPasswordModal = lazy(() =>
  import("./components/auth/ResetPasswordModal").then((module) => ({
    default: module.ResetPasswordModal,
  })),
);

import { useTheme } from "./contexts/ThemeContext";

function AppShell() {
  const { user, isGuest, exitGuestMode } = useAuth();
  const { activeSpaceId, setActiveSpaceId } = useSpace();
  const navigate = useNavigate();

  useRealtimeSync(user?.id, {
    onPartnerTransaction: (data) => {
      setRecordedShortcutTx(data);
    },
  });

  const { theme } = useTheme();
  const isDark = theme !== "light";
  const queryClient = useQueryClient();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [receiptScanOpen, setReceiptScanOpen] = useState(false);
  const [statementImportOpen, setStatementImportOpen] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return (
      localStorage.getItem("trouvaille_onboarded") === "true" &&
      localStorage.getItem("trouvaille_onboarding_focus") !== null
    );
  });
  const [prefilledValues, setPrefilledValues] = useState<any>(null);
  const syncStorageKey = user
    ? `trouvaille_initial_synced:${user.id}`
    : "trouvaille_initial_synced";
  const [hasInitialSynced, setHasInitialSynced] = useState(() => {
    return localStorage.getItem(syncStorageKey) === "true";
  });
  const { data: allTxs = [] } = useAllTransactions(undefined, {
    enabled: hasInitialSynced,
  });
  const [isInitDone, setIsInitDone] = useState(false);
  const [syncProgress, setSyncProgress] = useState(8);
  const [syncStatusText, setSyncStatusText] = useState(
    "Preparing financial categories & wallets...",
  );
  const [syncedTxCount, setSyncedTxCount] = useState(0);
  const { isPrivacyShieldEnabled, isPrivacyShieldActive, setIsPrivacyShieldActive } =
    usePrivacy();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const addTxMutation = useAddTransaction();
  const { isIndonesian } = useLanguage();
  const [recordedShortcutTx, setRecordedShortcutTx] = useState<ShortcutRecordedTxData | null>(null);
  const [joinLedgerOpen, setJoinLedgerOpen] = useState(false);
  const [joinLedgerCode, setJoinLedgerCode] = useState("");
  // Queue for deep links that arrive before categories/wallets have loaded (cold-launch race condition fix)
  const pendingDeepLinkRef = useRef<string | null>(null);
  const [showGuestMigrationModal, setShowGuestMigrationModal] = useState(false);
  const [isPreviewingInitialSync, setIsPreviewingInitialSync] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("preview") === "initial-sync" || params.get("preview") === "sync";
  });

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("join") || searchParams.get("code");
      if (code) {
        setJoinLedgerCode(code);
        setJoinLedgerOpen(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleTriggerPreview = () => {
      setIsPreviewingInitialSync(true);
    };
    window.addEventListener("trouvaille:preview-initial-sync", handleTriggerPreview);
    return () => {
      window.removeEventListener("trouvaille:preview-initial-sync", handleTriggerPreview);
    };
  }, []);

  useEffect(() => {
    const handleTestHud = (e: any) => {
      const detail = e?.detail;
      setRecordedShortcutTx({
        amount: detail?.amount || 75000,
        type: detail?.type || "expense",
        categoryName: detail?.categoryName || (isIndonesian ? "Makanan" : "Food"),
        walletName: detail?.walletName || "BCA",
        date: format(new Date(), "d MMM yyyy"),
        note: detail?.note || (isIndonesian ? "Kopi Kenangan" : "Coffee"),
      });
    };
    window.addEventListener("trouvaille:test-hud", handleTestHud);
    return () => {
      window.removeEventListener("trouvaille:test-hud", handleTestHud);
    };
  }, [isIndonesian]);


  // Handle iOS Custom URL Scheme (trouvaille://...), Back Tap Shortcuts, and Web Share Target
  // Two-stage design to fix cold-launch race condition:
  //   Stage 1 (this effect): register listeners, queue URL if categories/wallets not yet loaded
  // Handle iOS Custom URL Scheme (trouvaille://...), Back Tap Shortcuts, and Web Share Target
  const handleUrlDispatch = useRef<((rawUrl: string) => void) | null>(null);

  useEffect(() => {
    // Keep the dispatch function up-to-date with fresh categories/wallets/state closures
    handleUrlDispatch.current = (rawUrl: string) => {
      if (!rawUrl) return;

      if (rawUrl.includes("join") || rawUrl.includes("code=")) {
        try {
          const urlObj = new URL(rawUrl.replace("trouvaille://", "https://trouvaille.app/"));
          const code = urlObj.searchParams.get("code") || urlObj.searchParams.get("join");
          if (code) {
            setJoinLedgerCode(code);
            setJoinLedgerOpen(true);
            return;
          }
        } catch {}
      }

      const res = parseDeepLink(rawUrl, categories, wallets);

      // Direct tab navigation routing (e.g. trouvaille://reports, trouvaille://bills)
      if (res.action === "navigate" && res.path) {
        triggerHaptic("light");
        navigate(res.path);
        return;
      }

      if (res.action === "transaction") {
        if (res.autoSave && res.prefilledValues?.amount && res.prefilledValues.amount > 0) {
          const targetAmount = res.prefilledValues.amount;
          const targetType: "income" | "expense" | "transfer" =
            res.prefilledValues.type === "income"
              ? "income"
              : res.prefilledValues.type === "transfer"
              ? "transfer"
              : "expense";
          const targetCatId =
            res.prefilledValues.category_id ||
            categories.find((c) => c.type !== "income")?.id ||
            categories[0]?.id ||
            "";
          const targetWalletId =
            res.prefilledValues.wallet_id || wallets[0]?.id || "";
          const targetToWalletId =
            targetType === "transfer"
              ? res.prefilledValues.to_wallet_id ||
                wallets.find((w) => w.id !== targetWalletId)?.id ||
                null
              : null;
          const txDate = res.prefilledValues.date || new Date();
          const occurred_on = format(txDate, "yyyy-MM-dd");
          const note = res.prefilledValues.note || "";
          const targetSpaceId = activeSpaceId && activeSpaceId !== "all" ? activeSpaceId : "personal";

          addTxMutation.mutate(
            {
              amount: targetAmount,
              type: targetType,
              category_id: targetType === "transfer" ? null : targetCatId,
              wallet_id: targetWalletId,
              to_wallet_id: targetToWalletId,
              occurred_on,
              note: note || undefined,
              ledger_id: targetSpaceId,
              space_id: targetSpaceId,
            } as any,
            {
              onSuccess: () => {
                triggerSuccessHaptic();
                const catObj = categories.find((c) => c.id === targetCatId);
                const walObj = wallets.find((w) => w.id === targetWalletId);
                const toWalObj = wallets.find((w) => w.id === targetToWalletId);

                const catName =
                  catObj?.name || res.matchedCategoryName || (isIndonesian ? "Pengeluaran" : "Expense");
                const walName =
                  walObj?.name || res.matchedWalletName || (isIndonesian ? "Akun Utama" : "Default Account");
                const toWalName =
                  toWalObj?.name || res.matchedToWalletName || "";

                // 1. In-App Dynamic Island HUD
                setRecordedShortcutTx({
                  amount: targetAmount,
                  type: targetType,
                  categoryName:
                    targetType === "transfer"
                      ? (isIndonesian ? "Transfer" : "Transfer")
                      : catName,
                  walletName:
                    targetType === "transfer"
                      ? `${walName} → ${toWalName || (isIndonesian ? "Tujuan" : "Destination")}`
                      : walName,
                  date: format(txDate, "d MMM yyyy"),
                  note: note,
                });

                // 2. Native iOS Local Notification (Notification Center / Lock Screen)
                const notifTitle = isIndonesian ? "Transaksi Berhasil Dicatat" : "Transaction Recorded";
                const notifBody =
                  targetType === "transfer"
                    ? `${formatRupiah(targetAmount)} • ${walName} → ${toWalName || (isIndonesian ? "Tujuan" : "Destination")}`
                    : `${formatRupiah(targetAmount)} • ${catName} • ${walName}`;
                showNativeLocalNotification({
                  title: notifTitle,
                  body: notifBody,
                }).catch(() => {});

                // 3. Immediately refresh transactions and wallets query cache
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                queryClient.invalidateQueries({ queryKey: ["wallets"] });
              },
              onError: (err) => {
                console.error("Auto-save failed, fallback to modal:", err);
                if (res.prefilledValues) {
                  setPrefilledValues(res.prefilledValues);
                }
                setAddSheetOpen(true);
              },
            }
          );
        } else {
          if (res.prefilledValues) {
            setPrefilledValues(res.prefilledValues);
          }
          setAddSheetOpen(true);
        }
      } else if (res.action === "voice") {
        setVoiceModalOpen(true);
      } else if (res.action === "scan") {
        setReceiptScanOpen(true);
      } else if (res.action === "import") {
        setStatementImportOpen(true);
      }
    };
  }, [
    categories,
    wallets,
    addTxMutation,
    isIndonesian,
    activeSpaceId,
    navigate,
    queryClient,
  ]);

  const tryDispatch = useCallback((rawUrl: string) => {
    if (!rawUrl) return;
    const lower = rawUrl.toLowerCase();
    // Fast path: if the deep link is for direct modal or tab navigation, dispatch immediately without waiting for category cache
    if (
      lower.includes("voice") ||
      lower.includes("scan") ||
      lower.includes("import") ||
      lower.includes("calendar") ||
      lower.includes("bills") ||
      lower.includes("reports") ||
      lower.includes("report") ||
      lower.includes("settings") ||
      lower.includes("assets") ||
      lower.includes("wealth") ||
      lower.includes("transactions") ||
      lower.includes("history") ||
      lower.includes("home")
    ) {
      handleUrlDispatch.current?.(rawUrl);
      return;
    }

    if (categories.length > 0 || wallets.length > 0) {
      pendingDeepLinkRef.current = null;
      handleUrlDispatch.current?.(rawUrl);
    } else {
      pendingDeepLinkRef.current = rawUrl;
    }
  }, [categories.length, wallets.length]);

  // Stage 1: Register Capacitor URL listener + cold-launch URL inspection
  useEffect(() => {
    let isSubscribed = true;
    let urlListenerHandle: { remove: () => void } | null = null;

    // 1. Cold launch URL capture via CapApp.getLaunchUrl() (Critical for iOS Shortcuts from terminated state)
    CapApp.getLaunchUrl()
      .then((launch) => {
        if (isSubscribed && launch?.url) {
          tryDispatch(launch.url);
        }
      })
      .catch(() => {});

    // 2. Web / PWA URL params on load (e.g. ?text=...)
    if (typeof window !== "undefined" && window.location.search) {
      tryDispatch(window.location.href);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 3. Warm launch / running background URL scheme events
    CapApp.addListener("appUrlOpen", (event) => {
      if (isSubscribed && event?.url) {
        tryDispatch(event.url);
      }
    })
      .then((handle) => {
        urlListenerHandle = handle;
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
      if (urlListenerHandle) {
        urlListenerHandle.remove();
      }
    };
  }, [tryDispatch]);

  // Dedicated Android Hardware/Gesture Back Button listener (isolated from URL listeners)
  useEffect(() => {
    let isSubscribed = true;
    let backListenerHandle: { remove: () => void } | null = null;

    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (!isSubscribed) return;

      // Priority 1: Close active modal or bottom sheet first
      if (statementImportOpen) {
        setStatementImportOpen(false);
        triggerHaptic("light");
        return;
      }
      if (receiptScanOpen) {
        setReceiptScanOpen(false);
        triggerHaptic("light");
        return;
      }
      if (voiceModalOpen) {
        setVoiceModalOpen(false);
        triggerHaptic("light");
        return;
      }
      if (addSheetOpen) {
        setAddSheetOpen(false);
        triggerHaptic("light");
        return;
      }
      if (recordedShortcutTx) {
        setRecordedShortcutTx(null);
        triggerHaptic("light");
        return;
      }
      if (showGuestMigrationModal) {
        setShowGuestMigrationModal(false);
        triggerHaptic("light");
        return;
      }
      if (isPreviewingInitialSync) {
        setIsPreviewingInitialSync(false);
        triggerHaptic("light");
        return;
      }

      // Priority 2: Navigate back in history if not at root
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    })
      .then((handle) => {
        backListenerHandle = handle;
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
    };
  }, [
    statementImportOpen,
    receiptScanOpen,
    voiceModalOpen,
    addSheetOpen,
    recordedShortcutTx,
    showGuestMigrationModal,
    isPreviewingInitialSync,
  ]);

  // Stage 2: Drain queued deep link once categories/wallets have loaded
  useEffect(() => {
    if ((categories.length > 0 || wallets.length > 0) && pendingDeepLinkRef.current) {
      const queued = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      handleUrlDispatch.current?.(queued);
    }
  }, [categories, wallets]);

  // Sync smart notifications (Weekly Financial Digest, Month-End Wealth Review, Budget Threshold Alerts)
  useEffect(() => {
    if (allTxs.length > 0) {
      syncWeeklyDigestNotification(allTxs, isIndonesian).catch(() => {});
      syncMonthEndReviewNotification(isIndonesian).catch(() => {});
      if (categories.length > 0) {
        checkBudgetThresholdAlerts(allTxs, categories, isIndonesian).catch(() => {});
      }
    }
  }, [allTxs, categories, isIndonesian]);



  // Flush pending offline mutations when user returns to active app from privacy shield
  useEffect(() => {
    if (!isPrivacyShieldActive && user?.id) {
      flushPendingMutations().catch(() => {});
    }
  }, [isPrivacyShieldActive, user?.id]);

  const ensureCategories = useEnsureDefaultCategories();
  const ensureWallets = useEnsureDefaultWallets();

  useEffect(() => {
    const isAlreadySynced = localStorage.getItem(syncStorageKey) === "true";
    setHasInitialSynced(isAlreadySynced);
    if (isAlreadySynced) {
      setIsInitDone(true);
    }
    if (user?.id && !isGuest) {
      const migrationKey = `trouvaille_migrated_guest_${user.id}`;
      const isAlreadyHandled = localStorage.getItem(migrationKey) === "true";
      if (!isAlreadyHandled && hasGuestData()) {
        setShowGuestMigrationModal(true);
      } else if (!isAlreadyHandled) {
        localStorage.setItem(migrationKey, "true");
      }

      flushPendingMutations().catch((e) =>
        console.warn("[App] Background flush warning:", e),
      );
    }
  }, [syncStorageKey, user?.id, isGuest, queryClient]);

  // Auto-bypass onboarding trap if user already has categories, wallets, or synced transactions
  useEffect(() => {
    if (user && !isGuest && !isOnboarded && (categories.length > 0 || wallets.length > 0 || syncedTxCount > 0)) {
      localStorage.setItem("trouvaille_onboarded", "true");
      if (!localStorage.getItem("trouvaille_onboarding_focus")) {
        localStorage.setItem("trouvaille_onboarding_focus", "expenses");
      }
      setIsOnboarded(true);
    }
  }, [user, isGuest, isOnboarded, categories.length, wallets.length, syncedTxCount]);

  useEffect(() => {
    const handleOnline = () => {
      if (user?.id) {
        flushPendingMutations()
          .then((res) => {
            if (res.flushedCount > 0) {
              queryClient.invalidateQueries({ queryKey: ["transactions"] });
              queryClient.invalidateQueries({ queryKey: ["wallets"] });
            }
          })
          .catch((e) => console.warn("[App] Online reconnect flush warning:", e));
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user?.id, queryClient]);

  useEffect(() => {
    async function init() {
      if (hasInitialSynced) {
        setIsInitDone(true);
        return;
      }

      // Guest / Offline local mode: smooth fluid progression without Supabase calls
      if (isGuest || user?.id === "guest_local_user") {
        setSyncStatusText("Initializing private encryption vault...");
        setSyncProgress(35);
        await new Promise((r) => setTimeout(r, 220));

        setSyncStatusText("Configuring offline intelligence engine...");
        setSyncProgress(75);
        await new Promise((r) => setTimeout(r, 280));

        setSyncStatusText("Vault ready. Welcome to Trouvaille.");
        setSyncProgress(100);
        await new Promise((r) => setTimeout(r, 300));

        setIsInitDone(true);
        setHasInitialSynced(true);
        try {
          localStorage.setItem(syncStorageKey, "true");
        } catch {}
        return;
      }

      if (!user?.id) {
        setIsInitDone(true);
        return;
      }

      try {
        if (user) {
          let transactionsReady = false;

          setSyncStatusText("Fetching authoritative transactions & accounts...");
          setSyncProgress(25);

          try {
            const [freshTxs, walletsRes, categoriesRes, billsRes] = await Promise.all([
              fetchAllTransactionsFromSupabase(
                { userId: user.id },
                (current, total) => {
                  setSyncedTxCount(current);
                  if (total && total > 0) {
                    const pct = Math.round(25 + (current / total) * 60);
                    setSyncProgress(Math.min(88, pct));
                    setSyncStatusText(
                      `Loading ${current} of ${total} transactions...`,
                    );
                  } else {
                    const pct = Math.min(88, 25 + Math.round(current / 10));
                    setSyncProgress(pct);
                    setSyncStatusText(`Loading ${current} transactions...`);
                  }
                },
              ),
              supabase
                .from("wallets")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true }),
              supabase
                .from("categories")
                .select("*")
                .eq("user_id", user.id)
                .order("name"),
              supabase
                .from("bills")
                .select("*")
                .eq("user_id", user.id)
                .order("due_date", { ascending: true }),
            ]);

            setSyncedTxCount(freshTxs.length);
            queryClient.setQueryData(transactionKeys.all(user.id), freshTxs);

            if (!walletsRes.error) {
              const walletsData = walletsRes.data ?? [];
              queryClient.setQueryData(walletKeys.all(user.id), walletsData);
              if (walletsData.length === 0) {
                ensureWallets.mutate();
              }
            }
            if (!categoriesRes.error) {
              const categoriesData = categoriesRes.data ?? [];
              queryClient.setQueryData(categoryKeys.all(user.id), categoriesData);
              if (categoriesData.length === 0) {
                ensureCategories.mutate();
              }
            }
            if (!billsRes.error) {
              queryClient.setQueryData(["bills", user.id], billsRes.data ?? []);
            }

            transactionsReady = true;
            setSyncProgress(98);

            // Cloud Data Detection & Auto-Onboard Bypass:
            // Existing cloud users should never be forced through the onboarding modal
            const hasCloudLedger =
              freshTxs.length > 0 ||
              (walletsRes.data && walletsRes.data.length > 0) ||
              (categoriesRes.data && categoriesRes.data.length > 0);
            if (hasCloudLedger) {
              localStorage.setItem("trouvaille_onboarded", "true");
              if (!localStorage.getItem("trouvaille_onboarding_focus")) {
                localStorage.setItem("trouvaille_onboarding_focus", "expenses");
              }
              setIsOnboarded(true);
            }
          } catch (e) {
            console.warn("Hydrate queries error:", e);
            const cachedTxs = queryClient.getQueryData(
              transactionKeys.all(user.id),
            ) as unknown;
            if (Array.isArray(cachedTxs)) {
              transactionsReady = true;
              setSyncedTxCount(cachedTxs.length);
              setSyncStatusText(
                "Using cached transactions while background sync recovers...",
              );
              setSyncProgress(96);
            }
          }

          setSyncProgress(100);
          setSyncStatusText(
            transactionsReady
              ? "Ready! Welcome to Trouvaille..."
              : "Opening with limited data...",
          );
          await new Promise((r) => setTimeout(r, 500));
          setIsInitDone(true);
        } else {
          setIsInitDone(true);
        }
      } catch (err) {
        console.warn("Init error:", err);
        setIsInitDone(true);
        setSyncProgress(100);
        setSyncStatusText("Unable to complete full sync. Opening app...");
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasInitialSynced]);

  if (isPreviewingInitialSync) {
    return (
      <InitialSyncScreen
        isPreview={true}
        totalCount={syncedTxCount || allTxs.length || 24}
        isDataReady={true}
        onComplete={() => {
          setIsPreviewingInitialSync(false);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("preview");
            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
          }
        }}
      />
    );
  }

  if (!hasInitialSynced) {
    return (
      <InitialSyncScreen
        totalCount={syncedTxCount || allTxs.length}
        progress={syncProgress}
        statusText={syncStatusText}
        isDataReady={isInitDone}
        onComplete={() => {
          localStorage.setItem(syncStorageKey, "true");
          setHasInitialSynced(true);
        }}
      />
    );
  }

  // Guest Data Migration Intercept Dialog
  if (showGuestMigrationModal && user?.id) {
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 select-none"
        style={{
          background: isDark ? "rgba(6, 6, 8, 0.85)" : "rgba(244, 244, 247, 0.85)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`w-full max-w-sm rounded-[32px] p-6 border flex flex-col items-center text-center shadow-2xl relative ${
            isDark
              ? "bg-[#121216] border-white/16 text-white"
              : "bg-white border-black/10 text-zinc-950"
          }`}
          style={{
            boxShadow: isDark
              ? "0 24px 60px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.2)"
              : "0 20px 50px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,1)",
          }}
        >
          <div
            className={`w-12 h-12 rounded-[18px] flex items-center justify-center border mb-3.5 ${
              isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
            }`}
          >
            <ArrowRight size={20} strokeWidth={1.75} className={isDark ? "text-white" : "text-zinc-900"} />
          </div>

          <h3 className="text-[17px] font-semibold tracking-tight">
            {isIndonesian ? "Pindahkan Data Tamu?" : "Migrate Guest Data?"}
          </h3>
          <p
            className={`text-[12.5px] mt-1.5 mb-6 leading-relaxed ${
              isDark ? "text-white/60" : "text-zinc-600"
            }`}
          >
            {isIndonesian
              ? "Ditemukan catatan transaksi lokal dari sesi tamu. Apakah Anda ingin menyinkronkannya ke akun baru Anda atau memulai dari awal?"
              : "Found local ledger records from your guest session. Would you like to sync them into your authenticated account or start fresh?"}
          </p>

          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={async () => {
                triggerSuccessHaptic();
                await migrateGuestDataToCloud(user.id);
                localStorage.setItem("trouvaille_onboarded", "true");
                setIsOnboarded(true);
                setShowGuestMigrationModal(false);
                queryClient.invalidateQueries({ queryKey: ["wallets"] });
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                queryClient.invalidateQueries({ queryKey: ["categories"] });
              }}
              className={`w-full py-3.5 rounded-[22px] font-semibold text-[13.5px] active:scale-[0.98] transition-all cursor-pointer ${
                isDark
                  ? "bg-white text-zinc-950 hover:bg-zinc-100 shadow-md"
                  : "bg-zinc-950 text-white hover:bg-zinc-900 shadow-md"
              }`}
            >
              {isIndonesian ? "Pindahkan ke Akun" : "Transfer to Account"}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                discardGuestData(user.id);
                setShowGuestMigrationModal(false);
              }}
              className={`w-full py-3 rounded-[22px] font-medium text-[12.5px] active:scale-[0.98] transition-all cursor-pointer ${
                isDark ? "text-white/50 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {isIndonesian ? "Mulai dari Awal (Hapus Data Tamu)" : "Start Fresh (Discard Guest Data)"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Dedicated Full-Screen Customization Step:
  // User MUST complete customization before Home is ever rendered.
  if (!isOnboarded) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OnboardingModal
          isOpen={true}
          onComplete={() => {
            localStorage.setItem("trouvaille_onboarded", "true");
            setIsOnboarded(true);
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          }}
        />
      </Suspense>
    );
  }

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Floating Smart Clipboard Notification Sniffer */}
      <div
        className="fixed left-4 right-4 z-[75] max-w-md mx-auto pointer-events-none"
        style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 18px), 28px)" }}
      >
        <ClipboardTransactionBanner
          categories={categories}
          wallets={wallets}
          onAddTransaction={(detected) => {
            setPrefilledValues({
              amount: detected.amount,
              type: detected.type,
              note: detected.merchantOrNote,
              category_id: detected.suggestedCategoryId || "",
              wallet_id: detected.suggestedWalletId || "",
            });
            setAddSheetOpen(true);
          }}
        />
      </div>

      <div
        id="app-scroll-container"
        className="h-full overflow-y-auto overflow-x-hidden safe-area-top pb-[80px] overscroll-y-contain"
      >
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  onOpenAdd={() => setAddSheetOpen(true)}
                  onOpenScan={() => setReceiptScanOpen(true)}
                />
              }
            />
            <Route
              path="/transactions"
              element={
                <TransactionsPage
                  onOpenScan={() => setReceiptScanOpen(true)}
                  onOpenImport={() => setStatementImportOpen(true)}
                  onOpenVoiceAdd={() => setVoiceModalOpen(true)}
                />
              }
            />
            <Route
              path="/history"
              element={
                <TransactionsPage
                  onOpenScan={() => setReceiptScanOpen(true)}
                  onOpenImport={() => setStatementImportOpen(true)}
                  onOpenVoiceAdd={() => setVoiceModalOpen(true)}
                />
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/bills" element={<CalendarPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/stats" element={<StatisticsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/investments" element={<AssetsPage />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  onOpenImport={() => setStatementImportOpen(true)}
                />
              }
            />
            <Route path="/categories" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {!addSheetOpen && (
        <BottomTabBar
          onOpenAdd={() => {
            setPrefilledValues(null);
            setAddSheetOpen(true);
          }}
          onOpenVoiceAdd={() => setVoiceModalOpen(true)}
          onOpenScan={() => setReceiptScanOpen(true)}
        />
      )}

      {voiceModalOpen && (
        <Suspense fallback={null}>
          <VoiceQuickAddModal
            isOpen={voiceModalOpen}
            onClose={() => setVoiceModalOpen(false)}
            onOpenScan={() => {
              setVoiceModalOpen(false);
              setReceiptScanOpen(true);
            }}
            onOpenForm={(values) => {
              setPrefilledValues(values);
              setVoiceModalOpen(false);
              setAddSheetOpen(true);
            }}
          />
        </Suspense>
      )}

      {receiptScanOpen && (
        <Suspense fallback={null}>
          <ReceiptScanModal
            isOpen={receiptScanOpen}
            onClose={() => setReceiptScanOpen(false)}
            onOpenImport={() => {
              setReceiptScanOpen(false);
              setStatementImportOpen(true);
            }}
            onOpenForm={(values) => {
              setPrefilledValues(values);
              setReceiptScanOpen(false);
              setAddSheetOpen(true);
            }}
          />
        </Suspense>
      )}

      {statementImportOpen && (
        <Suspense fallback={null}>
          <StatementImportModal
            isOpen={statementImportOpen}
            onClose={() => setStatementImportOpen(false)}
          />
        </Suspense>
      )}

      {addSheetOpen && (
        <Suspense fallback={<LoadingScreen />}>
          <TransactionSheet
            isOpen={addSheetOpen}
            onClose={() => {
              setAddSheetOpen(false);
              setPrefilledValues(null);
            }}
            initialValues={prefilledValues}
            onOpenScan={() => {
              setAddSheetOpen(false);
              setReceiptScanOpen(true);
            }}
            onOpenVoiceAdd={() => {
              setAddSheetOpen(false);
              setVoiceModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* Dynamic Notch Subtle Floating Frosted Glass Background Sync Status Indicator */}
      <SyncStatusPill isBlocked={!!recordedShortcutTx} />

      {/* Dynamic Island Floating Glass HUD Capsule for Auto-saved Shortcut & Live Partner Transactions */}
      <DynamicIslandHUD
        data={recordedShortcutTx}
        onClose={() => setRecordedShortcutTx(null)}
        onEdit={() => {
          if (recordedShortcutTx) {
            setPrefilledValues({
              amount: recordedShortcutTx.amount,
              type: recordedShortcutTx.type,
              note: recordedShortcutTx.note,
            });
            setRecordedShortcutTx(null);
            setAddSheetOpen(true);
          }
        }}
        onViewLedger={(ledgerId) => {
          setActiveSpaceId(ledgerId);
        }}
      />

      {/* Join Shared Ledger Modal */}
      {joinLedgerOpen && (
        <Suspense fallback={null}>
          <JoinLedgerModal
            isOpen={joinLedgerOpen}
            initialCode={joinLedgerCode}
            onClose={() => {
              setJoinLedgerOpen(false);
              setJoinLedgerCode("");
            }}
            onOpenLogin={exitGuestMode}
          />
        </Suspense>
      )}


      {/* iOS App Switcher / Multitasking Privacy Screen Shield */}
      {isPrivacyShieldEnabled && isPrivacyShieldActive && (
        <div
          onClick={() => setIsPrivacyShieldActive(false)}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-8 sm:p-12 overflow-hidden cursor-pointer select-none transition-colors duration-300"
          style={{
            fontFamily: "'Urbanist', sans-serif",
            backgroundColor: isDark ? "#09090c" : "#f4f4f7",
          }}
        >
          {/* 3-4 Color Monochrome Fluid Mesh Gradient Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0 transition-all duration-500"
              style={{
                background: isDark
                  ? "radial-gradient(ellipse at 50% 40%, #15161c 0%, #09090c 85%)"
                  : "radial-gradient(ellipse at 50% 40%, #ffffff 0%, #e5e5ea 85%)",
              }}
            />
            {/* Color 1: Cool Mist (Top Right) */}
            <div
              className={`absolute -top-16 -right-16 w-[420px] h-[420px] rounded-full blur-[110px] ${
                isDark ? "bg-white/[0.08]" : "bg-white/90"
              }`}
            />
            {/* Color 2: Graphite / Platinum Slate (Center Left) */}
            <div
              className={`absolute top-1/3 -left-28 w-[450px] h-[450px] rounded-full blur-[130px] ${
                isDark ? "bg-zinc-600/[0.22]" : "bg-zinc-300/[0.45]"
              }`}
            />
            {/* Color 3: Soft Pearl Glow (Bottom Center) */}
            <div
              className={`absolute -bottom-20 left-1/4 w-[480px] h-[480px] rounded-full blur-[120px] ${
                isDark ? "bg-zinc-400/[0.12]" : "bg-zinc-200/[0.6]"
              }`}
            />
            {/* Color 4: Charcoal Shadow / Accent (Bottom Right) */}
            <div
              className={`absolute bottom-10 -right-20 w-[380px] h-[380px] rounded-full blur-[100px] ${
                isDark ? "bg-black/70" : "bg-zinc-400/[0.25]"
              }`}
            />

            {/* Apple Fractal Glass Fine Ribbed Slat Texture */}
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: isDark
                  ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 38px)"
                  : "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 38px)",
              }}
            />
          </div>

          {/* Spacer top (logo removed per user request) */}
          <div className="h-6" />

          {/* Center: Apple Staggered Typography (Reference Matching) */}
          <div className="relative z-10 text-center max-w-sm mx-auto space-y-3 px-4 my-auto">
            <h1 className="text-[34px] sm:text-[40px] leading-[1.14] tracking-tight">
              <span
                className={`font-semibold ${
                  isDark ? "text-white" : "text-zinc-950"
                }`}
              >
                Your wealth
              </span>{" "}
              <span
                className={`font-light ${
                  isDark ? "text-white/35" : "text-zinc-950/35"
                }`}
              >
                is
              </span>
              <br />
              <span
                className={`font-light ${
                  isDark ? "text-white/35" : "text-zinc-950/35"
                }`}
              >
                camera shy
              </span>{" "}
              <span
                className={`font-semibold ${
                  isDark ? "text-white" : "text-zinc-950"
                }`}
              >
                for you
              </span>
            </h1>
            <p
              className={`text-[13px] tracking-wide font-normal ${
                isDark ? "text-white/50" : "text-zinc-950/50"
              }`}
            >
              Eyes on your own screen · Private by default
            </p>
          </div>

          {/* Bottom: Minimalist Apple Privacy Pill */}
          <div className="relative z-10 pb-4">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${
                isDark
                  ? "bg-white/[0.06] border border-white/10 text-white/70"
                  : "bg-black/[0.05] border border-black/10 text-zinc-900/70"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isDark ? "bg-white/90" : "bg-zinc-900/90"
                }`}
              />
              <span className="text-[11px] font-medium tracking-wide">
                Privacy Shield Active
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { BiometricLockOverlay } from "./components/security/BiometricLockOverlay";

export default function App() {
  const { session, loading, isGuest, isPasswordRecovery, setIsPasswordRecovery } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session && !isGuest) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage />
        <ResetPasswordModal
          isOpen={isPasswordRecovery}
          onClose={() => setIsPasswordRecovery(false)}
        />
      </Suspense>
    );
  }
  return (
    <>
      <AppShell />
      <BiometricLockOverlay />
      <Suspense fallback={null}>
        <ResetPasswordModal
          isOpen={isPasswordRecovery}
          onClose={() => setIsPasswordRecovery(false)}
        />
      </Suspense>
    </>
  );
}
