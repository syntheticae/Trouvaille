import { useState, useEffect } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { formatRupiah } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";

interface BudgetTargetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  budgetTarget: number;
  setBudgetTarget: (amount: number) => void;
}

export function BudgetTargetSheet({
  isOpen,
  onClose,
  budgetTarget,
  setBudgetTarget,
}: BudgetTargetSheetProps) {
  const { showToast } = useToast();
  const [tempBudgetTarget, setTempBudgetTarget] = useState(String(budgetTarget || ""));

  useEffect(() => {
    if (isOpen) {
      setTempBudgetTarget(String(budgetTarget || ""));
    }
  }, [isOpen, budgetTarget]);

  const handleSave = () => {
    setBudgetTarget(Number(tempBudgetTarget) || 0);
    onClose();
    showToast("Budget target saved", "add", () => {});
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-10 space-y-4">
        <h3
          className="font-semibold text-lg"
          style={{ color: "var(--text-primary)" }}
        >
          Set Monthly Budget
        </h3>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Set a monthly spending limit to monitor your budget progress on the
          dashboard.
        </p>
        <div>
          <label
            className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Target Amount
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={
              tempBudgetTarget ? formatRupiah(Number(tempBudgetTarget)) : ""
            }
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              setTempBudgetTarget(raw);
            }}
            placeholder="Rp 0"
            className="w-full p-4 rounded-2xl outline-none font-bold text-[18px] amount"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Save Target
        </button>
      </div>
    </BottomSheet>
  );
}
