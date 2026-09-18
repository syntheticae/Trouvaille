import { useState } from "react"
import { ChevronRight, Droplets, ShieldCheck } from "lucide-react"
import { BottomSheet } from "../ui/BottomSheet"
import { formatRupiah } from "../../lib/utils"
import type { LiquidityHorizonResult } from "../../hooks/useFinancialIntelligence"

interface LiquidityHorizonCardProps {
  liquidityHorizon: LiquidityHorizonResult
  hideBalance?: boolean
}

export function LiquidityHorizonCard({ liquidityHorizon, hideBalance = false }: LiquidityHorizonCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <>
      <section
        onClick={() => setDetailOpen(true)}
        className="p-4 rounded-[24px] glass-surface cursor-pointer active:scale-[0.99] transition-transform mb-3 select-none"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Droplets size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Liquidity Horizon</p>
                <p className="text-[13px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {liquidityHorizon.status === "sufficient" ? liquidityHorizon.resilienceTier : "Awaiting Baseline"}
                </p>
              </div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
        </div>

        {liquidityHorizon.status === "sufficient" ? (
          <>
            <div className="flex items-end gap-2 mt-3">
              <span className="amount text-[28px] font-extrabold leading-none" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "•••" : `${liquidityHorizon.totalCoverageMonths.toFixed(1)} mo`}
              </span>
              <span className="text-[11px] font-semibold pb-1" style={{ color: "var(--text-tertiary)" }}>
                total coverage
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {hideBalance ? "•••" : `${liquidityHorizon.committedCoverageMonths.toFixed(1)} mo committed coverage`}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Liquid Assets</p>
                <p className="amount text-[12px] font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.liquidAssets)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Typical Outflow</p>
                <p className="amount text-[12px] font-extrabold mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.typicalMonthlyOutflow)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12px] font-semibold mt-3" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.liquidAssets)}
            </p>
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {liquidityHorizon.explanation}
            </p>
          </>
        )}
      </section>

      <BottomSheet isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="px-5 pb-10 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>Liquidity Horizon</h3>
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  Total vs committed outflow coverage
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Liquid Assets</p>
              <p className="amount text-[15px] font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.liquidAssets)}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Resilience Tier</p>
              <p className="text-[15px] font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
                {liquidityHorizon.status === "sufficient" ? liquidityHorizon.resilienceTier : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Typical Outflow</p>
              <p className="amount text-[15px] font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.typicalMonthlyOutflow)}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Committed Outflow</p>
              <p className="amount text-[15px] font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.typicalCommittedOutflow)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <div className="flex justify-between items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Coverage Horizon</p>
                <p className="amount text-[22px] font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
                  {liquidityHorizon.status === "sufficient" && !hideBalance ? `${liquidityHorizon.totalCoverageMonths.toFixed(1)} months` : hideBalance ? "••••" : "Not ready"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Committed</p>
                <p className="amount text-[16px] font-extrabold mt-1" style={{ color: "var(--text-primary)" }}>
                  {liquidityHorizon.status === "sufficient" && !hideBalance ? `${liquidityHorizon.committedCoverageMonths.toFixed(1)} months` : hideBalance ? "••••" : "Not ready"}
                </p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed mt-3" style={{ color: "var(--text-secondary)" }}>
              {liquidityHorizon.explanation}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-tertiary)" }}>Liquid Account Breakdown</p>
            {liquidityHorizon.liquidAccounts.length > 0 ? liquidityHorizon.liquidAccounts.map(account => (
              <div key={account.name} className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{account.name}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Included in liquid coverage</p>
                </div>
                <span className="amount text-[13px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "Rp ••••••••" : formatRupiah(account.balance)}
                </span>
              </div>
            )) : (
              <div className="p-4 rounded-2xl text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)" }}>
                No liquid account breakdown available yet.
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
