import { useState, useMemo } from "react";
import { AlertTriangle, Trash2, RotateCcw } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useResetTransactions, type ResetPeriod } from "../../hooks/useResetTransactions";
import { useAllTransactions } from "../../hooks/useTransactions";
import { useToast } from "../../contexts/ToastContext";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";

interface ResetTransactionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetTransactionsSheet({ isOpen, onClose }: ResetTransactionsSheetProps) {
  const { mutate: resetTxs, isPending } = useResetTransactions();
  const { data: allTxs = [] } = useAllTransactions();
  const { showToast } = useToast();

  const [selectedPeriod, setSelectedPeriod] = useState<ResetPeriod>("today");
  const [confirmStep, setConfirmStep] = useState(false);

  const now = new Date();

  // Calculate count of transactions that will be deleted per period
  const periodCounts = useMemo(() => {
    const todayStr = format(now, "yyyy-MM-dd");
    const weekStart = format(subDays(now, 6), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const yearStart = format(startOfYear(now), "yyyy-MM-dd");
    const yearEnd = format(endOfYear(now), "yyyy-MM-dd");

    let today = 0;
    let week = 0;
    let month = 0;
    let year = 0;
    const all = allTxs.length;

    allTxs.forEach((t) => {
      if (!t.occurred_on) return;
      if (t.occurred_on === todayStr) today++;
      if (t.occurred_on >= weekStart && t.occurred_on <= todayStr) week++;
      if (t.occurred_on >= monthStart && t.occurred_on <= monthEnd) month++;
      if (t.occurred_on >= yearStart && t.occurred_on <= yearEnd) year++;
    });

    return { today, week, month, year, all };
  }, [allTxs]);

  const periodOptions: { key: ResetPeriod; title: string; subtitle: string; count: number }[] = [
    { key: "today", title: "Today", subtitle: format(now, "dd MMMM yyyy"), count: periodCounts.today },
    { key: "week", title: "This Week", subtitle: "Past 7 days", count: periodCounts.week },
    { key: "month", title: "This Month", subtitle: format(now, "MMMM yyyy"), count: periodCounts.month },
    { key: "year", title: "This Year", subtitle: `Year ${now.getFullYear()}`, count: periodCounts.year },
    { key: "all", title: "All Transactions", subtitle: "Full transaction history", count: periodCounts.all },
  ];

  const handleExecuteReset = () => {
    resetTxs(selectedPeriod, {
      onSuccess: () => {
        const opt = periodOptions.find((o) => o.key === selectedPeriod);
        showToast(`Transactions (${opt?.title}) reset successfully`, "delete", () => {});
        setConfirmStep(false);
        onClose();
      },
      onError: (err: any) => {
        showToast(err.message || "Failed to reset transactions", "delete", () => {});
      },
    });
  };

  const handleClose = () => {
    if (isPending) return;
    setConfirmStep(false);
    onClose();
  };

  const activeOption = periodOptions.find((o) => o.key === selectedPeriod);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="p-5 pb-12 space-y-5">
        <div className="text-center">
          <div
            className="w-14 h-14 mx-auto rounded-3xl flex items-center justify-center mb-3 shadow-lg"
            style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.25)" }}
          >
            <RotateCcw size={26} style={{ color: "#ef4444" }} />
          </div>
          <h3 className="font-semibold text-[20px] tracking-tight" style={{ color: "var(--text-primary)" }}>
            Reset Transaction Data
          </h3>
          <p className="text-[12px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
            Select the timeframe of transactions you wish to purge
          </p>
        </div>

        {!confirmStep ? (
          <>
            {/* Period Selection */}
            <div className="space-y-2.5">
              {periodOptions.map((opt) => {
                const isSelected = selectedPeriod === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedPeriod(opt.key)}
                    className="w-full p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer"
                    style={{
                      background: isSelected ? "var(--bg-elevated-2)" : "var(--bg-elevated)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--glass-border)"}`,
                      boxShadow: isSelected ? "0 4px 16px var(--shadow-strength)" : "none",
                    }}
                  >
                    <div>
                      <p className="font-semibold text-[14px]" style={{ color: "var(--text-primary)" }}>
                        {opt.title}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {opt.subtitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="amount font-semibold text-[14px]"
                        style={{ color: isSelected ? "var(--accent)" : "var(--text-secondary)" }}
                      >
                        {opt.count} txs
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setConfirmStep(true)}
              disabled={activeOption?.count === 0}
              className="w-full py-4 rounded-[20px] font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl disabled:opacity-40 cursor-pointer"
              style={{ background: "#ef4444", color: "#FFFFFF" }}
            >
              <Trash2 size={16} />
              <span>Proceed to Delete ({activeOption?.count ?? 0} Transactions)</span>
            </button>
          </>
        ) : (
          /* Confirmation Step */
          <div className="space-y-5">
            <div
              className="p-4 rounded-2xl flex items-start gap-3"
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)" }}
            >
              <AlertTriangle size={22} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <div>
                <p className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>
                  Confirm Deletion
                </p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  A total of <strong>{activeOption?.count} transactions</strong> in <strong>{activeOption?.title}</strong> (
                  {activeOption?.subtitle}) will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStep(false)}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-[18px] font-bold text-[14px] active:scale-95 transition-all cursor-pointer"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-[18px] font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                style={{ background: "#ef4444", color: "#FFFFFF" }}
              >
                <Trash2 size={16} />
                <span>{isPending ? "Deleting..." : "Yes, Delete"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
