import { motion, AnimatePresence, type PanInfo, useDragControls } from "framer-motion"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const dragControls = useDragControls()

  useEffect(() => {
    const scrollEl = document.getElementById("app-scroll-container")
    if (isOpen) {
      document.body.style.overflow = "hidden"
      if (scrollEl) scrollEl.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      if (scrollEl) scrollEl.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
      if (scrollEl) scrollEl.style.overflow = ""
    }
  }, [isOpen])

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If pulled down by more than 80px or with high downward velocity, dismiss the sheet
    if (info.offset.y > 80 || info.velocity.y > 350) {
      onClose()
    }
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[998]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[999] shadow-2xl"
            style={{
              background: "var(--bg-base)",
              borderTop: "1px solid var(--glass-border)",
              borderLeft: "1px solid var(--glass-border)",
              borderRight: "1px solid var(--glass-border)",
              borderRadius: "28px 28px 0 0",
              maxHeight: "92dvh",
              display: "flex",
              flexDirection: "column",
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle header area - exclusively handles swipe down gesture */}
            <div
              className="flex flex-col shrink-0 cursor-grab active:cursor-grabbing w-full select-none touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex justify-center pt-3 pb-2 w-full">
                <div style={{ width: 40, height: 5, borderRadius: 3, background: "var(--text-tertiary)", opacity: 0.45 }} />
              </div>
              {title && (
                <div className="flex items-center justify-between px-5 pb-4">
                  <h2 className="text-xl font-semibold pointer-events-none" style={{ color: "var(--text-primary)" }}>{title}</h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    style={{ color: "var(--text-tertiary)" }}
                    className="p-1 active:scale-90 transition-transform cursor-pointer pointer-events-auto"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
            {/* Scrollable content - uninterrupted native scrolling */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
