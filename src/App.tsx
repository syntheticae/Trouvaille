import { useEffect, useState } from "react"
import { Routes, Route } from "react-router-dom"
import { BottomTabBar } from "./components/layout/BottomTabBar"
import { HomePage } from "./pages/HomePage"
import { TransactionsPage } from "./pages/TransactionsPage"
import { CalendarPage } from "./pages/CalendarPage"
import { StatisticsPage } from "./pages/StatisticsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { LoginPage } from "./pages/LoginPage"
import { useAuth } from "./contexts/AuthContext"
import { TransactionSheet } from "./components/transactions/TransactionSheet"
import { useEnsureDefaultCategories } from "./hooks/useCategories"
import { useEnsureDefaultWallets } from "./hooks/useWallets"
import { useAllTransactions } from "./hooks/useTransactions"
import { LoadingScreen } from "./components/ui/LoadingScreen"
import { InitialSyncScreen } from "./components/ui/InitialSyncScreen"
import { useQueryClient } from "@tanstack/react-query"
import { syncAllFamfinaToSupabase } from "./lib/famfinaResolver"
import { supabase } from "./lib/supabase"

function AppShell() {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const { data: allTxs = [], isLoading: isLoadingTxs } = useAllTransactions()
  const [hasInitialSynced, setHasInitialSynced] = useState(() => {
    return localStorage.getItem("trouvaille_initial_synced") === "true"
  })
  const [isInitDone, setIsInitDone] = useState(false)
  
  const ensureCategories = useEnsureDefaultCategories()
  const ensureWallets = useEnsureDefaultWallets()
  const queryClient = useQueryClient()

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (user) {
          await ensureCategories.mutateAsync()
          await ensureWallets.mutateAsync()

          // Automatically sync all 887 Famfina records without duplicating or overwriting manual transactions
          console.log("Checking and syncing any missing Famfina transactions...")
          await syncAllFamfinaToSupabase()

          // Hydrate all critical queries into TanStack Query cache
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ["transactions"] }),
            queryClient.refetchQueries({ queryKey: ["wallets"] }),
            queryClient.refetchQueries({ queryKey: ["categories"] }),
            queryClient.refetchQueries({ queryKey: ["bills"] }),
          ])
        }
      } catch (err) {
        console.warn("Init error:", err)
      } finally {
        setIsInitDone(true)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!hasInitialSynced) {
    return (
      <InitialSyncScreen
        totalCount={allTxs.length}
        isDataReady={isInitDone && !isLoadingTxs}
        onComplete={() => {
          localStorage.setItem("trouvaille_initial_synced", "true")
          setHasInitialSynced(true)
        }}
      />
    )
  }

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div id="app-scroll-container" className="h-full overflow-y-auto overflow-x-hidden safe-area-top pb-[80px] overscroll-y-contain">
        <Routes>
          <Route path="/" element={<HomePage onOpenAdd={() => setAddSheetOpen(true)} />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/history" element={<TransactionsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/stats" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>

      {!addSheetOpen && (
        <BottomTabBar onOpenAdd={() => setAddSheetOpen(true)} />
      )}

      {addSheetOpen && (
        <TransactionSheet isOpen={addSheetOpen} onClose={() => setAddSheetOpen(false)} />
      )}
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  
  if (loading) {
    return <LoadingScreen />
  }

  if (!session) return <LoginPage />
  return <AppShell />
}
