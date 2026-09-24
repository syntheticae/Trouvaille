import { createContext, useContext, useState, useCallback, useRef } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Check, RotateCcw, Trash2, Plus, Info } from "lucide-react"

export type ToastActionType = "add" | "update" | "delete" | "info"

interface Toast {
  id: string
  message: string
  actionType: ToastActionType
  onUndo?: () => void
}

interface ToastContextType {
  showToast: (
    message: string,
    actionType?: ToastActionType,
    onExecuteOrUndo?: (() => void) | null,
    delayMs?: number,
    onCancel?: () => void
  ) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<any>(null)

  const showToast = useCallback(
    (
      message: string,
      actionType: ToastActionType = "info",
      onExecuteOrUndo?: (() => void) | null,
      delayMs = 3500,
      onCancel?: () => void
    ) => {
      const id = Math.random().toString(36)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        if (onCancel && typeof onExecuteOrUndo === "function") {
          onExecuteOrUndo()
        }
        setToast(null)
      }, delayMs)

      let onUndo: (() => void) | undefined
      if (onCancel) {
        onUndo = () => {
          if (timerRef.current) clearTimeout(timerRef.current)
          onCancel()
          setToast(null)
        }
      } else if (
        typeof onExecuteOrUndo === "function" &&
        onExecuteOrUndo.length === 0 &&
        onExecuteOrUndo.toString() !== "() => {}" &&
        onExecuteOrUndo.toString() !== "()=>{}"
      ) {
        onUndo = () => {
          if (timerRef.current) clearTimeout(timerRef.current)
          onExecuteOrUndo()
          setToast(null)
        }
      }

      setToast({ id, message, actionType, onUndo })
    },
    []
  )

  const getIcon = (type: ToastActionType) => {
    switch (type) {
      case "add":
        return <Plus size={14} className="stroke-[3]" />
      case "update":
        return <Check size={14} className="stroke-[3]" />
      case "delete":
        return <Trash2 size={13} />
      default:
        return <Info size={14} />
    }
  }

  const getIconBg = (type: ToastActionType) => {
    switch (type) {
      case "delete":
        return { bg: "rgba(239, 68, 68, 0.18)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }
      case "add":
      case "update":
        return { bg: "var(--accent)", color: "var(--accent-ink)", border: "none" }
      default:
        return { bg: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }
    }
  }

  const toastContent = (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 35, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed bottom-[calc(92px+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[999999] max-w-md mx-auto flex items-center justify-between p-3.5 px-4 rounded-[24px] pointer-events-auto"
          style={{ 
            background: "var(--bg-elevated)", 
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card), 0 12px 32px var(--shadow-strength)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)"
          }}
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              style={getIconBg(toast.actionType)}
            >
              {getIcon(toast.actionType)}
            </div>
            <p className="text-[13px] font-bold truncate leading-tight" style={{ color: "var(--text-primary)" }}>
              {toast.message}
            </p>
          </div>

          {toast.onUndo && (
            <button
              onClick={toast.onUndo}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <RotateCcw size={12} /> Undo
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined" ? createPortal(toastContent, document.body) : toastContent}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}
