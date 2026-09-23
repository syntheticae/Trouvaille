import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
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
import { useAllTransactions, transactionKeys } from "./hooks/useTransactions";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { InitialSyncScreen } from "./components/ui/InitialSyncScreen";
import { ClipboardTransactionBanner } from "./components/common/ClipboardTransactionBanner";
import { App as CapApp } from "@capacitor/app";
import { parseDeepLink } from "./lib/deepLinkHandler";
import { useQueryClient } from "@tanstack/react-query";
import { fetchAllTransactionsFromSupabase } from "./hooks/useTransactions";
import { supabase } from "./lib/supabase";
import { flushPendingMutations } from "./lib/syncEngine";
import { migrateGuestDataToCloud } from "./lib/guestMigration";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { usePrivacy } from "./contexts/PrivacyContext";

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

import { useTheme } from "./contexts/ThemeContext";

function AppShell() {
  const { user, isGuest } = useAuth();
  useRealtimeSync(user?.id);

  const { theme } = useTheme();
  const isDark = theme !== "light";
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
  const { isPrivacyShieldEnabled } = usePrivacy();
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState(false);
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();

  // Handle iOS Custom URL Scheme (trouvaille://...), Back Tap Shortcuts, and Web Share Target
  useEffect(() => {
    const handleUrlDispatch = (rawUrl: string) => {
      if (!rawUrl) return;
      const res = parseDeepLink(rawUrl, categories, wallets);
      if (res.action === "transaction") {
        if (res.prefilledValues) {
          setPrefilledValues(res.prefilledValues);
        }
        setAddSheetOpen(true);
      } else if (res.action === "voice") {
        setVoiceModalOpen(true);
      } else if (res.action === "scan") {
        setReceiptScanOpen(true);
      } else if (res.action === "import") {
        setStatementImportOpen(true);
      }
    };

    // 1. Web / PWA URL params on load (e.g. ?text=...)
    if (window.location.search) {
      handleUrlDispatch(window.location.href);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Native iOS URL scheme (trouvaille://...) via Capacitor App plugin
    let isSubscribed = true;
    let urlListenerHandle: { remove: () => void } | null = null;

    CapApp.addListener("appUrlOpen", (event) => {
      if (isSubscribed && event?.url) {
        handleUrlDispatch(event.url);
      }
    })
      .then((handle) => {
        urlListenerHandle = handle;
      })
      .catch(() => {
        // Safe fallback in standard browser environment
      });

    return () => {
      isSubscribed = false;
      if (urlListenerHandle) {
        urlListenerHandle.remove();
      }
    };
  }, [categories, wallets]);

  useEffect(() => {
    if (!isPrivacyShieldEnabled) {
      setIsPrivacyShieldActive(false);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPrivacyShieldActive(true);
      } else {
        setTimeout(() => setIsPrivacyShieldActive(false), 120);
        if (user?.id) {
          flushPendingMutations().catch(() => {});
        }
      }
    };
    const handleBlur = () => {
      setIsPrivacyShieldActive(true);
    };
    const handleFocus = () => {
      setIsPrivacyShieldActive(false);
      if (user?.id) {
        flushPendingMutations().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.id, isPrivacyShieldEnabled]);

  const ensureCategories = useEnsureDefaultCategories();
  const ensureWallets = useEnsureDefaultWallets();
  const queryClient = useQueryClient();

  useEffect(() => {
    const isAlreadySynced = localStorage.getItem(syncStorageKey) === "true";
    setHasInitialSynced(isAlreadySynced);
    if (isAlreadySynced) {
      setIsInitDone(true);
    }
    if (user?.id && !isGuest) {
      migrateGuestDataToCloud(user.id)
        .then(({ walletsMigrated, transactionsMigrated }) => {
          if (walletsMigrated > 0 || transactionsMigrated > 0) {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          }
        })
        .catch(() => {});
      flushPendingMutations().catch((e) =>
        console.warn("[App] Background flush warning:", e),
      );
    }
  }, [syncStorageKey, user?.id, isGuest, queryClient]);

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
      <div className="fixed top-3 left-4 right-4 z-[75] max-w-md mx-auto pointer-events-auto">
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
                />
              }
            />
            <Route
              path="/history"
              element={
                <TransactionsPage
                  onOpenScan={() => setReceiptScanOpen(true)}
                  onOpenImport={() => setStatementImportOpen(true)}
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
  const { session, loading, isGuest } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session && !isGuest) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage />
      </Suspense>
    );
  }
  return (
    <>
      <AppShell />
      <BiometricLockOverlay />
    </>
  );
}
