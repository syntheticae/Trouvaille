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

function AppShell() {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  
  const ensureCategories = useEnsureDefaultCategories()
  const ensureWallets = useEnsureDefaultWallets()
  useEffect(() => {
    ensureCategories.mutate()
    ensureWallets.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-screen w-full relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div className="h-full overflow-y-auto overflow-x-hidden safe-area-top pb-[80px]">
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
        <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
          <BottomTabBar onOpenAdd={() => setAddSheetOpen(true)} />
        </div>
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
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
          <img src="/icon.png" alt="Trouvaille" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage />
  return <AppShell />
}
