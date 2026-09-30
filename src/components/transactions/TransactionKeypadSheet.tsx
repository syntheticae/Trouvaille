import { motion, AnimatePresence } from "framer-motion";
import { Delete, Check, RotateCcw } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { formatRupiah } from "../../lib/utils";
import { applyKeypadInput } from "../../lib/keypadHelper";
import { evaluateMathSafe } from "../../lib/evaluateMathSafe";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";

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
  const { theme } = useTheme();
  const { isIndonesian } = useLanguage();
  const isDark = theme !== "light";

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

  const handleClear = () => {
    triggerHaptic("light");
    const res = applyKeypadInput(expression, "clear");
    onExpressionChange(res.expression, res.numericValue);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-auto">
        {/* Transparent click-outside backdrop: Leaves TransactionSheet nominal view 100% visible */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDone}
          className="absolute inset-0 bg-black/[0.04] dark:bg-black/[0.12]"
        />

        {/* Compact Apple Liquid Glass Keypad Dock */}
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="relative w-full max-w-[440px] rounded-t-[26px] overflow-hidden select-none"
          style={{
            background: isDark
              ? "rgba(18, 18, 24, 0.85)"
              : "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(36px) saturate(190%) brightness(1.06)",
            WebkitBackdropFilter: "blur(36px) saturate(190%) brightness(1.06)",
            borderTop: isDark
              ? "1px solid rgba(255, 255, 255, 0.16)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            borderLeft: isDark
              ? "1px solid rgba(255, 255, 255, 0.10)"
              : "1px solid rgba(0, 0, 0, 0.05)",
            borderRight: isDark
              ? "1px solid rgba(255, 255, 255, 0.10)"
              : "1px solid rgba(0, 0, 0, 0.05)",
            boxShadow: isDark
              ? "0 -12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.18)"
              : "0 -8px 30px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
            paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 8px), 12px)",
          }}
        >
          {/* Top Notch Pill */}
          <div className="pt-2 pb-1 flex justify-center">
            <div
              className="w-9 h-1 rounded-full cursor-pointer hover:opacity-100 transition-opacity"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.22)"
                  : "rgba(0, 0, 0, 0.18)",
              }}
              onClick={handleDone}
            />
          </div>

          {/* Slim Liquid Toolbar: Live Math Indicator & Actions */}
          <div className="px-4 py-1 flex items-center justify-between min-h-[34px]">
            {/* Left Action / Live Math Pill */}
            {isExpression ? (
              <button
                type="button"
                onClick={() => handleKey("=")}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                style={{
                  background: isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(0, 0, 0, 0.06)",
                  color: "var(--text-primary)",
                  border: isDark
                    ? "1px solid rgba(255, 255, 255, 0.16)"
                    : "1px solid rgba(0, 0, 0, 0.08)",
                }}
              >
                <span>= {formatRupiah(currentVal)}</span>
                <span className="text-[9.5px] opacity-70">
                  {isIndonesian ? "(Terapkan)" : "(Apply)"}
                </span>
              </button>
            ) : expression && expression !== "0" ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 active:scale-95 transition-all text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <RotateCcw size={11} strokeWidth={1.5} />
                <span>{isIndonesian ? "Hapus" : "Clear"}</span>
              </button>
            ) : (
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium pl-1">
                {isIndonesian ? "Papan Angka" : "Liquid Keypad"}
              </span>
            )}

            {/* Right Action: Done Button */}
            <button
              type="button"
              onClick={handleDone}
              className="px-3.5 py-1 rounded-full text-[12px] font-semibold active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.95)"
                  : "rgba(0, 0, 0, 0.9)",
                color: isDark ? "#000000" : "#ffffff",
              }}
            >
              <Check size={12} strokeWidth={2.5} />
              <span>{isIndonesian ? "Selesai" : "Done"}</span>
            </button>
          </div>

          {/* Keypad Grid: 4 columns x 4 rows */}
          <div className="grid grid-cols-4 gap-1.5 px-3.5 pt-1.5 pb-1">
            {/* Row 1 */}
            <button
              type="button"
              onClick={() => handleKey("1")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleKey("2")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleKey("3")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleKey("÷")}
              className="h-11 rounded-xl text-[18px] font-semibold flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.10)"
                  : "rgba(0, 0, 0, 0.07)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleKey("4")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleKey("5")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleKey("6")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleKey("×")}
              className="h-11 rounded-xl text-[18px] font-semibold flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.10)"
                  : "rgba(0, 0, 0, 0.07)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => handleKey("7")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleKey("8")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleKey("9")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleKey("-")}
              className="h-11 rounded-xl text-[18px] font-semibold flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.10)"
                  : "rgba(0, 0, 0, 0.07)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              -
            </button>

            {/* Row 4: 000, 0, ⌫, + */}
            <button
              type="button"
              onClick={() => handleKey("000")}
              className="h-11 rounded-xl text-[15px] font-semibold flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.07)"
                  : "rgba(0, 0, 0, 0.05)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              000
            </button>
            <button
              type="button"
              onClick={() => handleKey("0")}
              className="h-11 rounded-xl text-[20px] font-medium flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKey("backspace")}
              className="h-11 rounded-xl flex items-center justify-center active:scale-95 transition-transform text-[var(--text-secondary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <Delete size={18} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => handleKey("+")}
              className="h-11 rounded-xl text-[18px] font-semibold flex items-center justify-center active:scale-95 transition-transform text-[var(--text-primary)] cursor-pointer"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.10)"
                  : "rgba(0, 0, 0, 0.07)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              +
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
