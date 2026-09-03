import { Camera, History } from "lucide-react";
import { format } from "date-fns";
import { formatRupiah } from "../../lib/utils";
import type { FinancialSnapshot } from "../../hooks/useFinancialSnapshots";

interface FinancialSnapshotCardProps {
  currentPreview: {
    periodLabel: string;
    totalLiquidAssets: number;
    netWorth: number;
    monthlyExpense: number;
    savingsRate: number;
    committedAmount: number;
    debtBalance: number;
  };
  snapshots: FinancialSnapshot[];
  hideBalance?: boolean;
  onSaveSnapshot: () => void;
}

export function FinancialSnapshotCard({
  currentPreview,
  snapshots,
  hideBalance = false,
  onSaveSnapshot,
}: FinancialSnapshotCardProps) {
  const visibleSnapshots = snapshots.slice(0, 3);

  return (
    <section className="glass-surface p-4 rounded-[24px] space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History size={14} style={{ color: "var(--text-tertiary)" }} />
            <p
              className="text-[11px] font-extrabold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              Financial Snapshot
            </p>
          </div>
          <p
            className="text-[14px] font-bold mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            Save a clean monthly state for later comparison
          </p>
        </div>
        <button
          type="button"
          onClick={onSaveSnapshot}
          className="px-3 py-2 rounded-2xl text-[11px] font-extrabold flex items-center gap-1.5 active:scale-95 transition-transform"
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
          }}
        >
          <Camera size={13} />
          <span>Save</span>
        </button>
      </div>

      <div
        className="p-3.5 rounded-[20px]"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
            {currentPreview.periodLabel}
          </p>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "var(--glass-fill)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            Live Preview
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Net Worth</p>
            <p className="amount font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "Rp ••••••••" : formatRupiah(currentPreview.netWorth)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Liquid Assets</p>
            <p className="amount font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {hideBalance
                ? "Rp ••••••••"
                : formatRupiah(currentPreview.totalLiquidAssets)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Monthly Expense</p>
            <p className="amount font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {hideBalance
                ? "Rp ••••••••"
                : formatRupiah(currentPreview.monthlyExpense)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: "var(--glass-fill)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Savings Rate</p>
            <p className="amount font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "••%" : `${currentPreview.savingsRate.toFixed(0)}%`}
            </p>
          </div>
        </div>

        {(currentPreview.committedAmount > 0 || currentPreview.debtBalance > 0) && (
          <div
            className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold mt-2.5 pt-2.5"
            style={{
              color: "var(--text-secondary)",
              borderTop: "1px solid var(--glass-border)",
            }}
          >
            {currentPreview.committedAmount > 0 && (
              <span>
                Commitments: {hideBalance ? "Rp ••••••" : formatRupiah(currentPreview.committedAmount)}
              </span>
            )}
            {currentPreview.debtBalance > 0 && (
              <span>
                Negative Balances: {hideBalance ? "Rp ••••••" : formatRupiah(currentPreview.debtBalance)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider px-0.5" style={{ color: "var(--text-tertiary)" }}>
          Saved States
        </p>
        {visibleSnapshots.length === 0 ? (
          <div
            className="p-3.5 rounded-2xl text-[12px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            No snapshot saved yet. Save one at month-end so you can compare cleanly later.
          </div>
        ) : (
          visibleSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="p-3 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                    {snapshot.periodLabel}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Saved {format(new Date(snapshot.capturedAt), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--glass-fill)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  Snapshot
                </span>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--text-secondary)" }}>
                Net Worth {hideBalance ? "Rp ••••••••" : formatRupiah(snapshot.netWorth)} · Expense{" "}
                {hideBalance ? "Rp ••••••••" : formatRupiah(snapshot.monthlyExpense)} · Savings{" "}
                {hideBalance ? "••%" : `${snapshot.savingsRate.toFixed(0)}%`}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
