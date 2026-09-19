// ======================================================================
// TROUVAILLE WIDGET CUSTOMIZATION BAR
// Floating iOS Springboard control pill with Done, Reset, and Unhide drawer
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Plus, Sparkles } from "lucide-react";
import type { CardWidgetConfig } from "../../lib/widgetLayoutTypes";
import { BottomSheet } from "../ui/BottomSheet";
import { triggerHaptic } from "../../lib/haptics";

interface WidgetCustomizationBarProps {
  isEditMode: boolean;
  onDone: () => void;
  onReset: () => void;
  hiddenCards: CardWidgetConfig[];
  onUnhideCard: (id: string) => void;
}

export function WidgetCustomizationBar({
  isEditMode,
  onDone,
  onReset,
  hiddenCards,
  onUnhideCard,
}: WidgetCustomizationBarProps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-24 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto flex items-center gap-2 p-1.5 pl-3.5 rounded-full shadow-2xl backdrop-blur-2xl"
              style={{
                background: "rgba(18, 18, 22, 0.88)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)",
              }}
            >
              <div className="flex items-center gap-1.5 pr-1">
                <Sparkles size={12} className="text-white/80 animate-pulse" />
                <span className="text-[11px] font-semibold text-white/90">
                  Editing Layout
                </span>
              </div>

              {hiddenCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setAddSheetOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-transform"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Plus size={12} />
                  <span>Add ({hiddenCards.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset card layout and sizes to default?")) {
                    onReset();
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
                title="Reset layout to default"
              >
                <RotateCcw size={12} />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  onDone();
                }}
                className="px-4 py-1.5 rounded-full text-[12px] font-semibold bg-white text-black active:scale-95 transition-transform flex items-center gap-1 shadow-md"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>Done</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Cards Bottom Sheet */}
      <BottomSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="Add Hidden Cards"
      >
        <div className="p-4 space-y-2.5 pb-8">
          <p className="text-[11px] text-[var(--text-tertiary)] px-1 mb-2">
            Tap any card below to restore it to your active dashboard.
          </p>
          {hiddenCards.map((card) => (
            <div
              key={card.id}
              className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div>
                <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {card.title}
                </h4>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {card.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onUnhideCard(card.id);
                  if (hiddenCards.length <= 1) {
                    setAddSheetOpen(false);
                  }
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-transform"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <Plus size={12} />
                <span>Add</span>
              </button>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
