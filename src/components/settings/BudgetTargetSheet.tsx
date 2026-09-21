import { useState, useEffect, useMemo } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { formatRupiah } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";
import { getBudgetPeriodInterval } from "../../lib/financialMath";
import { Calendar } from "lucide-react";

interface BudgetTargetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  budgetTarget: number;
  setBudgetTarget: (amount: number) => void;
  budgetPeriodStart?: number;
  setBudgetPeriodStart?: (day: number) => void;
}

export function BudgetTargetSheet({
  isOpen,
  onClose,
  budgetTarget,
  setBudgetTarget,
  budgetPeriodStart = 1,
  setBudgetPeriodStart,
}: BudgetTargetSheetProps) {
  const { showToast } = useToast();
  const [tempBudgetTarget, setTempBudgetTarget] = useState(String(budgetTarget || ""));
  const [tempPeriodStart, setTempPeriodStart] = useState<number>(budgetPeriodStart);
  const [isCustomDay, setIsCustomDay] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempBudgetTarget(String(budgetTarget || ""));
      setTempPeriodStart(budgetPeriodStart);
      setIsCustomDay(![1, 25, 27].includes(budgetPeriodStart));
    }
  }, [isOpen, budgetTarget, budgetPeriodStart]);

  const previewInterval = useMemo(() => {
    return getBudgetPeriodInterval(new Date(), tempPeriodStart);
  }, [tempPeriodStart]);

  const handleSave = () => {
    setBudgetTarget(Number(tempBudgetTarget) || 0);
    if (setBudgetPeriodStart) {
      setBudgetPeriodStart(tempPeriodStart);
    }
    onClose();
    showToast("Budget target & period saved", "add", () => {});
  };

  const presetDays = [
    { day: 1, label: "Day 1", desc: "Calendar" },
    { day: 25, label: "Day 25", desc: "Payroll" },
    { day: 27, label: "Day 27", desc: "Payroll" },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-10 space-y-5">
        <div>
          <h3
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Budget & Spending Cycle
          </h3>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Set your monthly limit and synchronize the spending cycle with your salary date.
          </p>
        </div>

        {/* Target Amount */}
        <div>
          <label
            className="text-[10px] font-semibold uppercase tracking-wider mb-1 block px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Monthly Spending Limit
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
            className="w-full px-3.5 py-2.5 rounded-xl outline-none font-semibold text-[16px] amount border border-[var(--glass-border)] bg-[var(--bg-elevated)]"
            style={{
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Budget Period Start Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label
              className="text-[10px] font-semibold uppercase tracking-wider block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Budget Period Start
            </label>
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Cycle begins Day {tempPeriodStart}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {presetDays.map((preset) => {
              const active = !isCustomDay && tempPeriodStart === preset.day;
              return (
                <button
                  key={preset.day}
                  type="button"
                  onClick={() => {
                    setTempPeriodStart(preset.day);
                    setIsCustomDay(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-center transition-all active:scale-95 cursor-pointer border ${
                    active
                      ? "bg-black/[0.08] dark:bg-white/[0.12] border-black/15 dark:border-white/25 shadow-xs"
                      : "bg-black/[0.02] dark:bg-white/[0.03] border-black/6 dark:border-white/8 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div
                    className={`text-[12px] font-semibold ${
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {preset.label}
                  </div>
                  <div className="text-[9.5px] text-[var(--text-tertiary)] truncate">
                    {preset.desc}
                  </div>
                </button>
              );
            })}

            {/* Custom Day Option */}
            <button
              type="button"
              onClick={() => setIsCustomDay(true)}
              className={`py-2 px-2 rounded-xl text-center transition-all active:scale-95 cursor-pointer border ${
                isCustomDay
                  ? "bg-black/[0.08] dark:bg-white/[0.12] border-black/15 dark:border-white/25 shadow-xs"
                  : "bg-black/[0.02] dark:bg-white/[0.03] border-black/6 dark:border-white/8 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              }`}
            >
              <div
                className={`text-[12px] font-semibold ${
                  isCustomDay ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                Custom
              </div>
              <div className="text-[9.5px] text-[var(--text-tertiary)] truncate">
                Day 1–28
              </div>
            </button>
          </div>

          {/* Custom Day Input */}
          {isCustomDay && (
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={tempPeriodStart}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setTempPeriodStart(Math.max(1, Math.min(28, val)));
                    }
                  }}
                  className="w-20 py-1.5 px-2.5 rounded-xl outline-none font-semibold text-center text-[13px] border border-[var(--glass-border)] bg-[var(--bg-elevated)]"
                  style={{
                    color: "var(--text-primary)",
                  }}
                />
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Day of every month (1 to 28)
                </span>
              </div>
            </div>
          )}

          {/* Interval Preview Card */}
          <div
            className="p-3 rounded-xl flex items-center gap-2.5 border border-[var(--glass-border)] bg-[var(--glass-fill)]"
          >
            <Calendar size={14} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">
                Active Cycle Range
              </div>
              <div className="text-[11.5px] font-medium text-[var(--text-primary)] mt-0.5">
                {previewInterval.label}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl font-semibold text-[13px] active:scale-98 transition-transform cursor-pointer"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Save Budget Settings
        </button>
      </div>
    </BottomSheet>
  );
}
