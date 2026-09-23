import {
  motion,
  AnimatePresence,
  type PanInfo,
  useDragControls,
} from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  const dragControls = useDragControls();

  /**
   * Lock the underlying page while the sheet is open.
   * Keep the existing app-scroll-container behavior so the sheet
   * does not cause the background page to move underneath it.
   */
  useEffect(() => {
    const scrollEl = document.getElementById("app-scroll-container");

    if (isOpen) {
      document.body.style.overflow = "hidden";

      if (scrollEl) {
        scrollEl.style.overflow = "hidden";
      }
    } else {
      document.body.style.overflow = "";

      if (scrollEl) {
        scrollEl.style.overflow = "";
      }
    }

    return () => {
      document.body.style.overflow = "";

      if (scrollEl) {
        scrollEl.style.overflow = "";
      }
    };
  }, [isOpen]);

  /**
   * Dismiss when the sheet is pulled down far enough
   * or released with a strong downward velocity.
   */
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 350) {
      onClose();
    }
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="sync">
      {isOpen && (
        <>
          {/* =========================================================
              BACKDROP
              ========================================================= */}
          <motion.div
            className="fixed inset-0 z-[998]"
            style={{
              background: "rgba(0, 0, 0, 0.64)",
              backdropFilter: "blur(7px)",
              WebkitBackdropFilter: "blur(7px)",
              willChange: "opacity, backdrop-filter",
            }}
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            onClick={onClose}
          />

          {/* =========================================================
              BOTTOM SHEET
              ========================================================= */}
          <motion.div
            className="
              fixed
              bottom-0
              left-0
              right-0
              z-[999]
              flex
              flex-col
              overflow-hidden
              shadow-2xl
            "
            style={{
              background: "var(--bg-base)",

              borderTop: "1px solid var(--glass-border)",
              borderLeft: "1px solid var(--glass-border)",
              borderRight: "1px solid var(--glass-border)",

              borderRadius: "28px 28px 0 0",

              /*
               * Important:
               * Keep the height constraint on the sheet itself,
               * while allowing the inner scroll area to shrink.
               */
              maxHeight: "92dvh",

              /*
               * Prevent browser from trying to repaint the entire
               * application during the sheet animation.
               */
              willChange: "transform, opacity",
            }}
            initial={{
              y: "100%",
              opacity: 0,
              scale: 0.985,
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              y: "100%",
              opacity: 0,
              scale: 0.985,
            }}
            transition={{
              y: {
                type: "spring",
                stiffness: 380,
                damping: 34,
                mass: 0.78,
              },
              opacity: {
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1],
              },
              scale: {
                duration: 0.26,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{
              top: 0,
            }}
            dragElastic={{
              top: 0.035,
              bottom: 0.72,
            }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
          >
            {/* =======================================================
                SUBTLE TOP GLASS HIGHLIGHT
                ======================================================= */}
            <div
              className="
                absolute
                top-0
                left-6
                right-6
                h-12
                rounded-full
                pointer-events-none
                z-0
              "
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.045), transparent 75%)",
              }}
            />

            {/* =======================================================
                HEADER / DRAG HANDLE
                ======================================================= */}
            <div
              className="
                relative
                z-10
                flex
                flex-col
                shrink-0
                w-full
                select-none
                touch-none
                cursor-grab
                active:cursor-grabbing
              "
              onPointerDown={(e) => {
                dragControls.start(e);
              }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2.5 w-full">
                <motion.div
                  initial={{
                    opacity: 0,
                    scaleX: 0.65,
                  }}
                  animate={{
                    opacity: 1,
                    scaleX: 1,
                  }}
                  transition={{
                    delay: 0.06,
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    width: 40,
                    height: 5,
                    borderRadius: 999,
                    background: "var(--text-tertiary)",
                    opacity: 0.45,
                    transformOrigin: "center",
                  }}
                />
              </div>

              {/* Title */}
              {title && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.055,
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="
                    flex
                    items-center
                    justify-between
                    px-5
                    pb-4
                  "
                >
                  <h2
                    className="text-xl font-semibold pointer-events-none"
                    style={{
                      color: "var(--text-primary)",
                    }}
                  >
                    {title}
                  </h2>

                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    whileHover={{
                      scale: 1.035,
                    }}
                    whileTap={{
                      scale: 0.9,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 550,
                      damping: 28,
                    }}
                    style={{
                      color: "var(--text-tertiary)",
                    }}
                    className="
                      p-1.5
                      rounded-full
                      active:scale-90
                      cursor-pointer
                      pointer-events-auto
                    "
                    aria-label="Close"
                  >
                    <X size={20} />
                  </motion.button>
                </motion.div>
              )}
            </div>

            {/* =======================================================
                SCROLLABLE CONTENT
                =======================================================

                `min-h-0` is important here.

                Without it, a flex child can preserve the minimum
                height dictated by its content and cause the lower
                portion of large grids to appear clipped.

                Bottom safe-area padding lives INSIDE the scroll area
                so the final row can actually scroll above it.
                ======================================================= */}
            <div
              className="
                relative
                z-10
                min-h-0
                flex-1
                overflow-y-auto
                overscroll-contain
              "
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                overscrollBehaviorY: "contain",
              }}
            >
              <div
                className="min-h-full"
                style={{
                  paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
                }}
              >
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
