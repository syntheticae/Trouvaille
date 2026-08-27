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
import { fetchAllTransactionsFromSupabase } from "./hooks/useTransactions"
import { supabase } from "./lib/supabase"

function AppShell() {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const { data: allTxs = [] } = useAllTransactions()
  const [hasInitialSynced, setHasInitialSynced] = useState(() => {
    return localStorage.getItem("trouvaille_initial_synced") === "true"
  })
  const [isInitDone, setIsInitDone] = useState(false)
  const [syncProgress, setSyncProgress] = useState(25)
  const [syncStatusText, setSyncStatusText] = useState("Preparing financial categories & wallets...")
  
  const ensureCategories = useEnsureDefaultCategories()
  const ensureWallets = useEnsureDefaultWallets()
  const queryClient = useQueryClient()

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (user) {
          // Stage 1: Categories & Wallets (25%)
          setSyncStatusText("Setting up accounts & categories...")
          setSyncProgress(25)
          try {
            await ensureCategories.mutateAsync()
            await ensureWallets.mutateAsync()
          } catch (e) {
            console.warn("Ensure categories/wallets non-fatal error:", e)
          }

          // Stage 2: Sync transactions (50% -> 75%)
          setSyncStatusText("Syncing transactions with Supabase...")
          setSyncProgress(50)
          try {
            await syncAllFamfinaToSupabase((current, total) => {
              const pct = Math.round(50 + (current / total) * 25)
              setSyncProgress(pct)
              setSyncStatusText(`Syncing record ${current} of ${total}...`)
            })
          } catch (e) {
            console.warn("Sync Famfina non-fatal error:", e)
          }

          // Stage 3: Fetch & Hydrate portfolio (85% -> 95%)
          setSyncStatusText("Hydrating portfolio & financial intelligence...")
          setSyncProgress(85)
          try {
            const freshTxs = await fetchAllTransactionsFromSupabase({ userId: user.id })
            queryClient.setQueriesData({ queryKey: ["transactions"] }, freshTxs)

            await Promise.all([
              queryClient.refetchQueries({ queryKey: ["wallets"] }),
              queryClient.refetchQueries({ queryKey: ["categories"] }),
              queryClient.refetchQueries({ queryKey: ["bills"] }),
            ])
            setSyncProgress(95)
          } catch (e) {
            console.warn("Hydrate queries non-fatal error:", e)
          }

          // Stage 4: 100% Ready
          setSyncProgress(100)
          setSyncStatusText("Ready! Welcome to Trouvaille...")
          await new Promise(r => setTimeout(r, 600))
        }
      } catch (err) {
        console.warn("Init error:", err)
      } finally {
        setSyncProgress(100)
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
        progress={syncProgress}
        statusText={syncStatusText}
        isDataReady={isInitDone}
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
