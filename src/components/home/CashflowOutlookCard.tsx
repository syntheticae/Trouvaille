import { useMemo, useState } from "react"
import { ArrowDownRight, ArrowUpRight, CalendarRange, ChevronRight } from "lucide-react"
import { BottomSheet } from "../ui/BottomSheet"
import { formatRupiah } from "../../lib/utils"
import type { CashflowFloorResult } from "../../hooks/useFinancialIntelligence"
import { useLanguage } from "../../contexts/LanguageContext"
import { useCurrency } from "../../contexts/CurrencyContext"

interface CashflowOutlookCardProps {
  defaultForecast: CashflowFloorResult
  getCashflowHorizon: (days?: number) => CashflowFloorResult
  hideBalance?: boolean
}

const HORIZONS = [7, 14, 30] as const

export function CashflowOutlookCard({ defaultForecast, getCashflowHorizon, hideBalance = false }: CashflowOutlookCardProps) {
  const { language } = useLanguage()
  useCurrency()
  const isIndonesian = language === "id"

  const [selectedHorizon, setSelectedHorizon] = useState<(typeof HORIZONS)[number]>(14)
  const [detailOpen, setDetailOpen] = useState(false)

  const forecast = useMemo(() => {
    return selectedHorizon === 14 ? defaultForecast : getCashflowHorizon(selectedHorizon)
  }, [defaultForecast, getCashflowHorizon, selectedHorizon])

  const eventDays = useMemo(() => {
    return forecast.dailyPoints.filter(point => point.knownInflow > 0 || point.knownOutflow > 0)
  }, [forecast])

  return (
    <>
      <section className="p-4 rounded-[24px] glass-surface mb-3 select-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Prospek Arus Kas" : "Cashflow Outlook"}
            </p>
            <p className="text-[13px] font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {isIndonesian ? "Proyeksi titik terendah & komitmen kas" : "Projected low & upcoming commitments"}
            </p>
          </div>
          <button
            onClick={() => setDetailOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            title={isIndonesian ? "Lihat prospek lengkap" : "View full outlook"}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          {HORIZONS.map(days => (
            <button
              key={days}
              onClick={() => setSelectedHorizon(days)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
              style={{
                background: selectedHorizon === days ? "var(--text-primary)" : "var(--glass-fill)",
                color: selectedHorizon === days ? "var(--bg-canvas)" : "var(--text-secondary)",
                border: "1px solid var(--glass-border)"
              }}
            >
              {days}{isIndonesian ? "hr" : "d"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-3 rounded-2xl" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Titik Terendah" : "Projected Low"}
            </p>
            <p className="amount text-[15px] mt-1" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "Rp ••••••••" : formatRupiah(forecast.lowestBalance)}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {forecast.daysUntilLowest === 0
                ? (isIndonesian ? "Hari ini" : "Today")
                : `${forecast.daysUntilLowest} ${isIndonesian ? "hari" : "days"} · ${forecast.lowestBalanceDate}`}
            </p>
          </div>
          <div className="p-3 rounded-2xl" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian ? "Perubahan Bersih" : "Net Change"}
            </p>
            <p className="amount text-[15px] mt-1" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "Rp ••••••••" : `${forecast.netProjectedChange >= 0 ? "+" : ""}${formatRupiah(forecast.netProjectedChange)}`}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {eventDays.length} {isIndonesian ? "agenda tercatat" : "known event days"}
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-3">
          {eventDays.length > 0 ? eventDays.slice(0, 4).map(point => (
            <div key={point.date} className="flex items-center justify-between p-3 rounded-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{point.dayLabel}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {point.knownOutflow > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--glass-fill)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
                      <ArrowDownRight size={10} className="inline mr-1" />{isIndonesian ? "Keluar" : "Out"} {hideBalance ? "••••" : formatRupiah(point.knownOutflow)}
                    </span>
                  )}
                  {point.knownInflow > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--glass-fill-strong)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}>
                      <ArrowUpRight size={10} className="inline mr-1" />{isIndonesian ? "Masuk" : "In"} {hideBalance ? "••••" : formatRupiah(point.knownInflow)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Saldo" : "Balance"}
                </p>
                <p className="amount text-[11px] mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "Rp ••••••••" : formatRupiah(point.projectedBalance)}
                </p>
              </div>
            </div>
          )) : (
            <div className="p-4 rounded-2xl text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <CalendarRange size={18} className="mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {isIndonesian ? "Belum ada tagihan atau pemasukan rutin" : "No known bills or recurring inflows"}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Horizon waktu yang dipilih belum memiliki jadwal agenda kas." : "The selected horizon has no scheduled cashflow events yet."}
              </p>
            </div>
          )}
        </div>
      </section>

      <BottomSheet isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="px-5 pb-10 space-y-4">
          <div>
            <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              {isIndonesian ? "Prospek Arus Kas" : "Cashflow Outlook"}
            </h3>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {isIndonesian
                ? `Proyeksi ${selectedHorizon} hari dari saldo likuid saat ini`
                : `${selectedHorizon}-day projection from current liquid balance`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Awal" : "Start"}
              </p>
              <p className="amount text-[12px] mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(forecast.currentBalance)}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Terendah" : "Low"}
              </p>
              <p className="amount text-[12px] mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : formatRupiah(forecast.lowestBalance)}
              </p>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Perubahan" : "Change"}
              </p>
              <p className="amount text-[12px] mt-1" style={{ color: "var(--text-primary)" }}>
                {hideBalance ? "Rp ••••••••" : `${forecast.netProjectedChange >= 0 ? "+" : ""}${formatRupiah(forecast.netProjectedChange)}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {forecast.dailyPoints.map(point => (
              <div key={point.date} className="p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: point.date === forecast.lowestBalanceDate ? "1px solid var(--text-primary)" : "1px solid var(--glass-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{point.dayLabel}</p>
                      {point.date === forecast.lowestBalanceDate && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--text-primary)", color: "var(--bg-canvas)" }}>
                          {isIndonesian ? "TERENDAH" : "FLOOR"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {point.knownOutflowItems.map(item => item.title).concat(point.knownInflowItems.map(item => item.title)).join(" · ") || (isIndonesian ? "Tidak ada agenda terjadwal" : "No scheduled events")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="amount text-[13px]" style={{ color: "var(--text-primary)" }}>
                      {hideBalance ? "Rp ••••••••" : formatRupiah(point.projectedBalance)}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: point.netDailyCashflow >= 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {hideBalance ? "••••" : `${point.netDailyCashflow >= 0 ? "+" : ""}${formatRupiah(point.netDailyCashflow)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
