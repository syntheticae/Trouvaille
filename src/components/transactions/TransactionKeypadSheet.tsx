import { motion, AnimatePresence } from "framer-motion";
import { Delete, Check } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { formatRupiah } from "../../lib/utils";
import { applyKeypadInput } from "../../lib/keypadHelper";
import { evaluateMathSafe } from "../../lib/evaluateMathSafe";

interface TransactionKeypadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  expression: string;
  onExpressionChange: (newExpr: string, numericVal: number) => void;
  onDone?: () => void;
}

export function TransactionKeypadSheet({
  isOpen,
  onClose,
  expression,
  onExpressionChange,
  onDone,
}: TransactionKeypadSheetProps) {
  if (!isOpen) return null;

  const currentVal = evaluateMathSafe(expression);
  const isExpression = /[+\-*/×÷]/.test(expression);

  const handleKey = (key: string) => {
    triggerHaptic("light");
    const res = applyKeypadInput(expression, key);
    onExpressionChange(res.expression, res.numericValue);
  };

  const handleDone = () => {
    triggerHaptic("medium");
    const res = applyKeypadInput(expression, "=");
    onExpressionChange(res.expression, res.numericValue);
    if (onDone) {
      onDone();
    } else {
      onClose();
    }
  };

  const handlePreset = (add: number) => {
    triggerHaptic("light");
    const nextVal = currentVal + add;
    const formatted = nextVal.toLocaleString("id-ID");
    onExpressionChange(formatted, nextVal);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        {/* Specular backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDone}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Apple Luxury Keypad Drawer */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-[440px] rounded-t-[32px] overflow-hidden select-none border-t border-white/10 shadow-2xl"
          style={{
            background: "linear-gradient(180deg, #16161a 0%, #0d0d10 100%)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)",
          }}
        >
          {/* Top Notch Pill */}
          <div className="pt-3 pb-2 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Current Expression & Live Evaluator Preview */}
          <div className="px-6 py-2.5 flex items-baseline justify-between border-b border-white/[0.06] mb-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[14px] font-semibold text-[var(--text-tertiary)]">
                Rp
              </span>
              <span className="text-[26px] font-semibold text-[var(--text-primary)] truncate amount">
                {expression || "0"}
              </span>
            </div>
            {isExpression && (
              <div className="text-right shrink-0">
                <span className="text-[12px] text-[var(--text-tertiary)] block">
                  Live Total
                </span>
                <span className="text-[14px] font-semibold text-[var(--accent)]">
                  = {formatRupiah(currentVal)}
                </span>
              </div>
            )}
          </div>

          {/* Quick Increment & Preset Strip */}
          <div className="px-4 py-1.5 flex items-center justify-between gap-1.5 mb-1.5">
            {[
              { label: "+10K", add: 10000 },
              { label: "+50K", add: 50000 },
              { label: "+100K", add: 100000 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.add)}
                className="flex-1 py-1.5 rounded-xl text-[11px] font-medium active:scale-95 transition-all text-center border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[var(--text-secondary)]"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKey("clear")}
              className="px-3 py-1.5 rounded-xl text-[11px] font-medium active:scale-95 transition-all text-center border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[var(--text-tertiary)]"
            >
              Clear
            </button>
          </div>

          {/* Keypad Grid: 4 columns */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2">
            {/* Row 1 */}
            <button
              type="button"
              onClick={() => handleKey("1")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleKey("2")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleKey("3")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleKey("÷")}
              className="h-14 rounded-2xl text-[20px] font-medium flex items-center justify-center bg-white/[0.08] active:bg-white/[0.18] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.08]"
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleKey("4")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleKey("5")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleKey("6")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleKey("×")}
              className="h-14 rounded-2xl text-[20px] font-medium flex items-center justify-center bg-white/[0.08] active:bg-white/[0.18] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.08]"
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => handleKey("7")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleKey("8")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleKey("9")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleKey("-")}
              className="h-14 rounded-2xl text-[20px] font-medium flex items-center justify-center bg-white/[0.08] active:bg-white/[0.18] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.08]"
            >
              -
            </button>

            {/* Row 4: 0, 000, ⌫, + */}
            <button
              type="button"
              onClick={() => handleKey("0")}
              className="h-14 rounded-2xl text-[22px] font-medium flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.04]"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKey("000")}
              className="h-14 rounded-2xl text-[17px] font-semibold flex items-center justify-center bg-white/[0.06] active:bg-white/[0.14] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.06]"
            >
              000
            </button>
            <button
              type="button"
              onClick={() => handleKey("backspace")}
              className="h-14 rounded-2xl flex items-center justify-center bg-white/[0.04] active:bg-white/[0.12] active:scale-95 transition-all text-[var(--text-secondary)] border border-white/[0.04]"
            >
              <Delete size={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => handleKey("+")}
              className="h-14 rounded-2xl text-[20px] font-medium flex items-center justify-center bg-white/[0.08] active:bg-white/[0.18] active:scale-95 transition-all text-[var(--text-primary)] border border-white/[0.08]"
            >
              +
            </button>
          </div>

          {/* Bottom Action: Done Button */}
          <div className="px-4 pt-2">
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-4 rounded-2xl font-semibold text-[15px] bg-white text-black active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check size={18} strokeWidth={2} />
              <span>Done</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
