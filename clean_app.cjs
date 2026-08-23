const fs = require("fs");

const fullAppCode = `import { useEffect, useState } from "react"
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
import { LoadingScreen } from "./components/ui/LoadingScreen"

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
`;

fs.writeFileSync("src/App.tsx", fullAppCode, "utf8");
console.log("Cleaned App.tsx");
