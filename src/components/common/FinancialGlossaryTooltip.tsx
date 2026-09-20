import { useState } from "react";
import { Info, X, BookOpen } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

export type GlossaryKey =
  | "solvency_runway"
  | "zero_based"
  | "monte_carlo"
  | "operating_cashflow"
  | "free_cashflow"
  | "savings_rate"
  | "volatility_score"
  | "fire_number";

export interface GlossaryDefinition {
  title: string;
  simpleExplanation: string;
  tip?: string;
}

export const FINANCIAL_GLOSSARY: Record<GlossaryKey, GlossaryDefinition> = {
  solvency_runway: {
    title: "Solvency Runway (Daya Tahan Dana)",
    simpleExplanation:
      "Perkiraan berapa bulan tabungan cair Anda bisa membiayai gaya hidup jika Anda berhenti bekerja hari ini.",
    tip: "Benchmark aman: minimal 3–6 bulan pengeluaran rutin.",
  },
  zero_based: {
    title: "Zero-Based Budgeting (Anggaran Nol)",
    simpleExplanation:
      "Sistem membagi setiap rupiah penghasilan ke pos belanja, tabungan, atau investasi hingga tidak ada saldo menganggur tanpa tujuan.",
    tip: "Bukan berarti rekening kosong, tapi seluruh uang punya pos tugasnya masing-masing.",
  },
  monte_carlo: {
    title: "Simulasi Monte Carlo",
    simpleExplanation:
      "Uji ketahanan finansial dengan mensimulasikan ribuan skenario ekonomi acak (inflasi, krisis pasar, kenaikan biaya).",
    tip: "Skor di atas 85% menandakan rencana keuangan Anda sangat tahan banting.",
  },
  operating_cashflow: {
    title: "Operating Cash Flow (Arus Kas Operasional)",
    simpleExplanation:
      "Arus kas bersih murni dari aktivitas hidup harian (gaji dikurangi makan, transport, tagihan).",
    tip: "Jika angka ini positif, fondasi keuangan Anda sehat tanpa perlu gali lubang tutup lubang.",
  },
  free_cashflow: {
    title: "Free Cash Flow (Kas Bebas)",
    simpleExplanation:
      "Uang sisa bersih setelah semua komitmen esensial dan tabungan wajib terpenuhi. Kas ini 100% aman dipakai liburan atau hobi.",
  },
  savings_rate: {
    title: "Savings Rate (Tingkat Tabungan)",
    simpleExplanation:
      "Persentase pemasukan yang berhasil Anda pertahankan dan tidak habis terbelanja dalam sebulan.",
    tip: "Standar emas finansial adalah menyisihkan minimal 20% dari total penghasilan bulanan.",
  },
  volatility_score: {
    title: "Volatility Score (Variasi Pengeluaran)",
    simpleExplanation:
      "Mengukur seberapa sering belanja harian Anda melonjak tiba-tiba dibandingkan pengeluaran rata-rata.",
    tip: "Skor variasi rendah menunjukkan kebiasaan belanja yang konsisten dan mudah diprediksi.",
  },
  fire_number: {
    title: "FIRE Number (Target Mandiri Finansial)",
    simpleExplanation:
      "Jumlah akumulasi aset yang dibutuhkan agar hasil investasinya dapat membiayai hidup Anda selamanya tanpa harus bekerja aktif.",
    tip: "Dihitung berdasarkan 25x pengeluaran tahunan (aturan 4% Rule).",
  },
};

export interface FinancialGlossaryTooltipProps {
  term: GlossaryKey;
  label?: string;
  showIconOnly?: boolean;
}

export function FinancialGlossaryTooltip({
  term,
  label,
  showIconOnly = false,
}: FinancialGlossaryTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const info = FINANCIAL_GLOSSARY[term];

  if (!info) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic("light");
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 cursor-pointer text-left group"
        title="Klik untuk melihat penjelasan istilah"
      >
        {!showIconOnly && label && (
          <span className="border-b border-dashed border-[var(--text-tertiary)] group-hover:border-[var(--text-primary)] transition-colors">
            {label}
          </span>
        )}
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors"
          style={{ background: "var(--glass-fill)" }}
        >
          <Info size={10} strokeWidth={1.5} />
        </span>
      </button>

      {/* Popover Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-5 glass-surface select-none shadow-2xl relative"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-secondary)]"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <BookOpen size={12} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Glosarium Keuangan
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
                  style={{ background: "var(--glass-fill)" }}
                >
                  <X size={12} />
                </button>
              </div>

              <div className="pt-3.5 space-y-2">
                <h4 className="text-[14px] font-semibold leading-snug">
                  {info.title}
                </h4>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  {info.simpleExplanation}
                </p>

                {info.tip && (
                  <div
                    className="p-3 rounded-2xl text-[11px] text-[var(--text-tertiary)] leading-relaxed mt-3"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <span className="font-semibold text-[var(--text-primary)]">
                      Tips Finansial:{" "}
                    </span>
                    {info.tip}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
