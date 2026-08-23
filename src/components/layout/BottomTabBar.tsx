import { NavLink, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { Home, History, Plus, PieChart, Settings } from "lucide-react"

interface BottomTabBarProps {
  onOpenAdd?: () => void
}

export function BottomTabBar({ onOpenAdd }: BottomTabBarProps) {
  const location = useLocation()
  
  const tabs = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/transactions", icon: History, label: "Transactions" },
    { action: "add", icon: Plus, label: "Add" },
    { path: "/statistics", icon: PieChart, label: "Analytics" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pointer-events-none flex justify-center">
      <div
        className="w-full max-w-[370px] rounded-full p-1.5 flex items-center justify-between pointer-events-auto transition-all"
        style={{
          background: "var(--dock-bg)",
          border: "1px solid var(--dock-border)",
          boxShadow: "none",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          borderRadius: "9999px"
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          
          if (tab.action === "add") {
            return (
              <button 
                key="add"
                onClick={onOpenAdd}
                className="w-10 h-10 flex items-center justify-center relative rounded-full active:scale-95 transition-transform"
                style={{ 
                  background: "var(--accent)", 
                  color: "var(--accent-ink)",
                  boxShadow: "none"
                }}
              >
                <Icon size={20} strokeWidth={2.5} />
              </button>
            )
          }

          const isActive = location.pathname === tab.path
          
          return (
            <NavLink 
              key={tab.path} 
              to={tab.path!} 
              className="w-10 h-10 flex items-center justify-center relative rounded-full"
            >
              {isActive && (
                <motion.div 
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--dock-active-pill)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon 
                size={19} 
                className="relative z-10 transition-colors duration-200" 
                style={{ color: isActive ? "var(--text-primary)" : "var(--text-tertiary)" }} 
              />
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
