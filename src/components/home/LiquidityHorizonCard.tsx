import { useState } from "react"
import { ChevronRight, Droplets, ShieldCheck } from "lucide-react"
import { BottomSheet } from "../ui/BottomSheet"
import { formatRupiah } from "../../lib/utils"
import type { LiquidityHorizonResult } from "../../hooks/useFinancialIntelligence"
import { useLanguage } from "../../contexts/LanguageContext"
import { useCurrency } from "../../contexts/CurrencyContext"

interface LiquidityHorizonCardProps {
  liquidityHorizon: LiquidityHorizonResult
  hideBalance?: boolean
}

export function LiquidityHorizonCard({ liquidityHorizon, hideBalance = false }: LiquidityHorizonCardProps) {
  const { language } = useLanguage()
  useCurrency()
  const isIndonesian = language === "id"

  const [detailOpen, setDetailOpen] = useState(false)

  const localizedTier = (tier: string) => {
    if (!isIndonesian) return tier
    switch (tier.toLowerCase()) {
      case "fortress": return "Cadangan Kuat"
      case "comfortable": return "Aman & Nyaman"
      case "watch": return "Perlu Pemantauan"
      case "critical": return "Kritis"
      case "low": return "Rendah"
      case "moderate": return "Moderat"
      case "healthy": return "Sehat"
      case "strong": return "Kuat"
      case "exceptional": return "Sangat Tangguh"
      default: return tier
    }
  }

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
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Horizon Likuiditas" : "Liquidity Horizon"}
                </p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {liquidityHorizon.status === "sufficient"
                    ? localizedTier(liquidityHorizon.resilienceTier)
                    : isIndonesian ? "Menunggu Garis Dasar" : "Awaiting Baseline"}
                </p>
              </div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
        </div>

        {liquidityHorizon.status === "sufficient" ? (
          <>
            <div className="flex items-end gap-2 mt-3">
              <span className="amount text-[28px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "•••" : `${liquidityHorizon.totalCoverageMonths.toFixed(1)} ${isIndonesian ? "bln" : "mo"}`}
              </span>
              <span className="text-[11px] font-semibold pb-1" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "cakupan total" : "total coverage"}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {hideBalance
                ? "•••"
                : isIndonesian
                  ? `cakupan pengeluaran rutin ${liquidityHorizon.committedCoverageMonths.toFixed(1)} bln`
                  : `${liquidityHorizon.committedCoverageMonths.toFixed(1)} mo committed coverage`}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Aset Likuid" : "Liquid Assets"}
                </p>
                <p className="amount text-[12px] mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.liquidAssets)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Pengeluaran Tipikal" : "Typical Outflow"}
                </p>
                <p className="amount text-[12px] mt-0.5" style={{ color: "var(--text-primary)" }}>
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
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {isIndonesian ? "Horizon Likuiditas" : "Liquidity Horizon"}
                </h3>
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Cakupan pengeluaran total vs rutin/komitmen" : "Total vs committed outflow coverage"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Aset Likuid" : "Liquid Assets"}
              </p>
              <p className="amount text-[15px] mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.liquidAssets)}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Tingkat Ketahanan" : "Resilience Tier"}
              </p>
              <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                {liquidityHorizon.status === "sufficient" ? localizedTier(liquidityHorizon.resilienceTier) : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Pengeluaran Tipikal" : "Typical Outflow"}
              </p>
              <p className="amount text-[15px] mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.typicalMonthlyOutflow)}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Pengeluaran Rutin" : "Committed Outflow"}
              </p>
              <p className="amount text-[15px] mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(liquidityHorizon.typicalCommittedOutflow)}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <div className="flex justify-between items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Horizon Cakupan" : "Coverage Horizon"}
                </p>
                <p className="amount text-[22px] mt-1" style={{ color: "var(--text-primary)" }}>
                  {liquidityHorizon.status === "sufficient" && !hideBalance
                    ? `${liquidityHorizon.totalCoverageMonths.toFixed(1)} ${isIndonesian ? "bulan" : "months"}`
                    : hideBalance ? "••••" : (isIndonesian ? "Belum siap" : "Not ready")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Komitmen" : "Committed"}
                </p>
                <p className="amount text-[16px] mt-1" style={{ color: "var(--text-primary)" }}>
                  {liquidityHorizon.status === "sufficient" && !hideBalance
                    ? `${liquidityHorizon.committedCoverageMonths.toFixed(1)} ${isIndonesian ? "bulan" : "months"}`
                    : hideBalance ? "••••" : (isIndonesian ? "Belum siap" : "Not ready")}
                </p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed mt-3" style={{ color: "var(--text-secondary)" }}>
              {liquidityHorizon.explanation}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Rincian Akun Likuid" : "Liquid Account Breakdown"}
            </p>
            {liquidityHorizon.liquidAccounts.length > 0 ? liquidityHorizon.liquidAccounts.map(account => (
              <div key={account.name} className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{account.name}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    {isIndonesian ? "Termasuk dalam cakupan likuid" : "Included in liquid coverage"}
                  </p>
                </div>
                <span className="amount text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "Rp ••••••••" : formatRupiah(account.balance)}
                </span>
              </div>
            )) : (
              <div className="p-4 rounded-2xl text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Belum ada rincian akun likuid tersedia." : "No liquid account breakdown available yet."}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
