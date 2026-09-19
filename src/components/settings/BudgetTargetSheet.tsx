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
            className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block px-1"
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
            className="w-full p-4 rounded-2xl outline-none font-semibold text-[18px] amount"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Budget Period Start Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <label
              className="text-[11px] font-semibold uppercase tracking-wider block"
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
                  className={`py-2.5 px-2 rounded-xl text-center transition-all active:scale-95 ${
                    active
                      ? "bg-white/[0.08] border border-white/20 shadow-sm"
                      : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`text-[13px] font-semibold ${
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                    {preset.desc}
                  </div>
                </button>
              );
            })}

            {/* Custom Day Option */}
            <button
              type="button"
              onClick={() => setIsCustomDay(true)}
              className={`py-2.5 px-2 rounded-xl text-center transition-all active:scale-95 ${
                isCustomDay
                  ? "bg-white/[0.08] border border-white/20 shadow-sm"
                  : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <div
                className={`text-[13px] font-semibold ${
                  isCustomDay ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                Custom
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] truncate">
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
                  className="w-24 p-3 rounded-xl outline-none font-semibold text-center text-[14px]"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
                <span className="text-[12px] text-[var(--text-tertiary)]">
                  Day of every month (1 to 28)
                </span>
              </div>
            </div>
          )}

          {/* Active Cycle Preview Box */}
          <div
            className="p-3.5 rounded-2xl flex items-center gap-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <Calendar size={15} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[var(--text-tertiary)]">Active Spend Window</div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {previewInterval.label}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                {previewInterval.daysRemaining} days left
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95 transition-all shadow-md"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Save Budget & Period
        </button>
      </div>
    </BottomSheet>
  );
}

