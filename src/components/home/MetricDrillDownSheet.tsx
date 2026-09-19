import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { formatRupiah } from "../../lib/utils";
import type { CategoryMoMShift } from "../../lib/financialMath";

interface MetricDrillDownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: "expense" | "income" | "budget_risk" | "snapshot" | null;
  data: {
    totalCurrent: number;
    totalPrevious: number;
    delta: number;
    pctChange: number;
    topContributors?: CategoryMoMShift[];
    budget?: number;
    consumedPct?: number;
    timePct?: number;
    budgetRisk?: string;
    budgetRiskReason?: string;
    title?: string;
    subtitle?: string;
    badge?: string;
    ctaLabel?: string;
  } | null;
}

export function MetricDrillDownSheet({
  isOpen,
  onClose,
  type,
  data,
}: MetricDrillDownSheetProps) {
  const navigate = useNavigate();

  if (!type || !data) return null;

  const isBudgetRisk = type === "budget_risk";
  const isSnapshot = type === "snapshot";
  const isExpense = type === "expense";

  const title = isBudgetRisk
    ? "Budget Risk Explanation"
    : isSnapshot
      ? data.title || "Current Period Snapshot"
      : isExpense
        ? "Why Outflow Changed"
        : "Why Inflow Changed";

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="px-5 space-y-4 pb-6 select-none">
        {isBudgetRisk ? (
          <>
            <div
              className="p-4 rounded-2xl flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--glass-fill)" }}
                >
                  {data.budgetRisk === "AT RISK" ? (
                    <ShieldAlert size={20} style={{ color: "var(--text-primary)" }} />
                  ) : data.budgetRisk === "WATCH" ? (
                    <AlertTriangle size={20} style={{ color: "var(--text-primary)" }} />
                  ) : (
                    <ShieldCheck size={20} style={{ color: "var(--text-primary)" }} />
                  )}
                </div>
                <div>
                  <h4
                    className="font-semibold text-[15px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Status: {data.budgetRisk || "SAFE"}
                  </h4>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {data.consumedPct?.toFixed(0)}% budget consumed vs{" "}
                    {data.timePct?.toFixed(0)}% time elapsed
                  </p>
                </div>
              </div>
            </div>

            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {data.budgetRiskReason}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 rounded-xl"
                style={{ background: "var(--glass-fill)" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Monthly Budget
                </p>
                <p
                  className="amount text-[14px] font-semibold mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(data.budget || 0)}
                </p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "var(--glass-fill)" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Current Spending
                </p>
                <p
                  className="amount text-[14px] font-semibold mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(data.totalCurrent)}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/settings");
                }}
                className="w-full py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <span>Adjust Budget Limit</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : isSnapshot ? (
          <>
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {data.badge || "Current Period"}
                  </p>
                  <h4
                    className="amount font-semibold text-[18px] mt-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {data.delta >= 0 ? "+" : ""}
                    {formatRupiah(data.totalCurrent)}
                  </h4>
                </div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--glass-fill)",
                    color:
                      data.delta >= 0
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {data.delta >= 0 ? "SURPLUS" : "DEFICIT"}
                </span>
              </div>
              {data.subtitle && (
                <p
                  className="text-[12px] leading-relaxed mt-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {data.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 rounded-xl"
                style={{ background: "var(--glass-fill)" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Current Total
                </p>
                <p
                  className="amount text-[14px] font-semibold mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(data.totalCurrent)}
                </p>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "var(--glass-fill)" }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Reference Change
                </p>
                <p
                  className="amount text-[14px] font-semibold mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {data.delta >= 0 ? "+" : ""}
                  {formatRupiah(data.delta)}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/statistics");
                }}
                className="w-full py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <span>{data.ctaLabel || "View Full Analytics Breakdown"}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="p-4 rounded-2xl flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div>
                <h4
                  className="font-semibold text-[15px]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {data.delta >= 0 ? "+" : ""}
                  {formatRupiah(data.delta)}
                </h4>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {data.delta >= 0 ? "Increased" : "Decreased"} vs previous
                  month
                </p>
              </div>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--glass-fill)",
                  color: "var(--text-primary)",
                }}
              >
                {data.delta >= 0 ? "↑" : "↓"} {Math.abs(data.pctChange)}% MoM
              </span>
            </div>

            {data.topContributors && data.topContributors.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-[var(--glass-border)]">
                <p
                  className="text-[11px] font-bold uppercase tracking-wider px-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Top Category Contributors
                </p>
                <div className="space-y-1.5">
                  {data.topContributors.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl flex items-center justify-between"
                      style={{ background: "var(--glass-fill)" }}
                    >
                      <span
                        className="font-bold text-[12px]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.name}
                      </span>
                      <div className="text-right">
                        <span
                          className="amount font-semibold text-[13px]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {c.deltaAmount >= 0 ? "+" : ""}
                          {formatRupiah(c.deltaAmount)}
                        </span>
                        <span
                          className="text-[10px] ml-1 font-bold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          ({c.deltaAmount >= 0 ? "↑" : "↓"} {c.pctChange}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/statistics");
                }}
                className="w-full py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                }}
              >
                <span>View Full Analytics Breakdown</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
