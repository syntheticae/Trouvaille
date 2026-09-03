import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { useAuth } from "./contexts/AuthContext";
import {
  useEnsureDefaultCategories,
  categoryKeys,
} from "./hooks/useCategories";
import { useEnsureDefaultWallets, walletKeys } from "./hooks/useWallets";
import { useAllTransactions, transactionKeys } from "./hooks/useTransactions";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { InitialSyncScreen } from "./components/ui/InitialSyncScreen";
import { useQueryClient } from "@tanstack/react-query";
import { syncAllFamfinaToSupabase } from "./lib/famfinaResolver";
import { fetchAllTransactionsFromSupabase } from "./hooks/useTransactions";
import { supabase } from "./lib/supabase";

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

function AppShell() {
  const { user } = useAuth();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
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

  const ensureCategories = useEnsureDefaultCategories();
  const ensureWallets = useEnsureDefaultWallets();
  const queryClient = useQueryClient();

  useEffect(() => {
    setHasInitialSynced(localStorage.getItem(syncStorageKey) === "true");
  }, [syncStorageKey]);

  useEffect(() => {
    async function init() {
      if (hasInitialSynced) {
        setIsInitDone(true);
        return;
      }

      if (!user?.id) {
        setIsInitDone(true);
        return;
      }

      try {
        if (user) {
          let transactionsReady = false;

          setSyncStatusText("Setting up accounts & categories...");
          setSyncProgress(12);
          try {
            await ensureCategories.mutateAsync();
            setSyncProgress(18);
            await ensureWallets.mutateAsync();
            setSyncProgress(24);
          } catch (e) {
            console.warn("Ensure categories/wallets non-fatal error:", e);
          }

          setSyncStatusText("Reconciling cloud transactions...");
          setSyncProgress(28);
          try {
            await syncAllFamfinaToSupabase((current, total) => {
              const safeTotal = Math.max(1, total);
              const pct = Math.round(28 + (current / safeTotal) * 28);
              setSyncProgress(Math.min(56, pct));
              setSyncStatusText(
                `Reconciling transaction ${current} of ${total}...`,
              );
            });
          } catch (e) {
            console.warn("Sync Famfina non-fatal error:", e);
          }

          setSyncStatusText("Fetching authoritative transaction ledger...");
          setSyncProgress(60);
          try {
            const freshTxs = await fetchAllTransactionsFromSupabase(
              { userId: user.id },
              (current, total) => {
                setSyncedTxCount(current);
                if (total && total > 0) {
                  const pct = Math.round(60 + (current / total) * 28);
                  setSyncProgress(Math.min(88, pct));
                  setSyncStatusText(
                    `Loading ${current} of ${total} transactions...`,
                  );
                } else {
                  const pct = Math.min(88, 60 + Math.round(current / 100));
                  setSyncProgress(pct);
                  setSyncStatusText(`Loading ${current} transactions...`);
                }
              },
            );

            setSyncedTxCount(freshTxs.length);
            queryClient.setQueryData(transactionKeys.all(user.id), freshTxs);

            setSyncStatusText("Hydrating wallets, categories, and bills...");
            setSyncProgress(90);
            const [walletsRes, categoriesRes, billsRes] = await Promise.all([
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

            if (!walletsRes.error)
              queryClient.setQueryData(
                walletKeys.all(user.id),
                walletsRes.data ?? [],
              );
            if (!categoriesRes.error)
              queryClient.setQueryData(
                categoryKeys.all(user.id),
                categoriesRes.data ?? [],
              );
            if (!billsRes.error)
              queryClient.setQueryData(["bills", user.id], billsRes.data ?? []);

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

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        id="app-scroll-container"
        className="h-full overflow-y-auto overflow-x-hidden safe-area-top pb-[80px] overscroll-y-contain"
      >
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={<HomePage onOpenAdd={() => setAddSheetOpen(true)} />}
            />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/history" element={<TransactionsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/stats" element={<StatisticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </div>

      {!addSheetOpen && (
        <BottomTabBar onOpenAdd={() => setAddSheetOpen(true)} />
      )}

      {addSheetOpen && (
        <Suspense fallback={<LoadingScreen />}>
          <TransactionSheet
            isOpen={addSheetOpen}
            onClose={() => setAddSheetOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage />
      </Suspense>
    );
  }
  return <AppShell />;
}
