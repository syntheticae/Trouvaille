import { createContext, useContext, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw } from "lucide-react"

type ActionType = "add" | "update" | "delete"

interface Toast {
  id: string
  message: string
  actionType: ActionType
  onUndo: () => void
}

interface ToastContextType {
  showToast: (message: string, actionType: ActionType, onExecute: () => void, delayMs?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((message: string, actionType: ActionType, onExecute: () => void, delayMs = 3000) => {
    const id = Math.random().toString(36)
    
    const timer = setTimeout(() => {
      onExecute()
      setToast(null)
    }, delayMs)

    const onUndo = () => {
      clearTimeout(timer)
      setToast(null)
    }

    setToast({ id, message, actionType, onUndo })
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-[100px] left-4 right-4 z-[100] flex items-center justify-between p-4 rounded-[22px]"
            style={{ 
              background: "var(--bg-elevated)", 
              border: "1px solid var(--glass-border)",
              boxShadow: "0 8px 32px var(--shadow-strength)"
            }}
          >
            <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)", fontFamily: "Urbanist, sans-serif" }}>
              {toast.message}
            </p>
            <button
              onClick={toast.onUndo}
              className="px-4 py-2 rounded-full text-[13px] font-extrabold flex items-center gap-1.5 active:scale-95 transition-transform"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <RotateCcw size={13} /> Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}
