import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"
import { X } from "lucide-react"

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[70]"
            style={{
              background: "var(--bg-elevated)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid var(--glass-border)",
              borderRadius: "28px 28px 0 0",
              maxHeight: "92dvh",
              display: "flex",
              flexDirection: "column",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--text-tertiary)", opacity: 0.4 }} />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pb-4 shrink-0">
                <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
                <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
                  <X size={20} />
                </button>
              </div>
            )}
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
