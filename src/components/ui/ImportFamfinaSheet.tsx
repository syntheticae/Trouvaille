import { useState } from "react"
import { FileSpreadsheet, CheckCircle2, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { BottomSheet } from "./BottomSheet"
import { useImportFamfina } from "../../hooks/useImportFamfina"
import { useToast } from "../../contexts/ToastContext"

interface ImportFamfinaSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportFamfinaSheet({ isOpen, onClose }: ImportFamfinaSheetProps) {
  const { mutate: doImport, isPending, progress, totalRecords } = useImportFamfina()
  const { showToast } = useToast()
  const [successResult, setSuccessResult] = useState<{ count: number; alreadyExisted: boolean } | null>(null)

  const handleStartImport = () => {
    doImport(undefined, {
      onSuccess: (result) => {
        setSuccessResult({ count: result.importedCount, alreadyExisted: result.alreadyExisted })
        if (result.alreadyExisted) {
          showToast("Data sudah pernah dimigrasi sebelumnya", "add", () => {})
        } else {
          showToast(`Berhasil mengimpor ${result.importedCount} transaksi!`, "add", () => {})
        }
      },
      onError: (err: any) => {
        showToast(err.message || "Gagal mengimpor data", "delete", () => {})
      }
    })
  }

  const handleClose = () => {
    if (isPending) return
    setSuccessResult(null)
    onClose()
  }

  const pct = Math.round((progress.current / Math.max(1, progress.total)) * 100)

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="p-5 pb-12 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-3xl flex items-center justify-center mb-3 shadow-lg"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <FileSpreadsheet size={28} style={{ color: "var(--text-primary)" }} />
          </div>
          <h3 className="font-extrabold text-[20px] tracking-tight" style={{ color: "var(--text-primary)" }}>
            Migrasi Data Excel (Famfina)
          </h3>
          <p className="text-[12px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
            Pindahkan riwayat catatan keuangan lama ke akun Trouvaille kamu
          </p>
        </div>

        {/* Info card */}
        <div className="glass-surface p-4 rounded-[22px] space-y-3">
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>Total Transaksi</span>
            <span className="text-[13px] font-extrabold amount" style={{ color: "var(--text-primary)" }}>{totalRecords} Transaksi</span>
          </div>
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>Rentang Waktu</span>
            <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>01 Jan 2026 - 31 Agu 2026</span>
          </div>
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>Rekening Terdeteksi</span>
            <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>12 Rekening (BNI, Seabank, ShopeePay, dll)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>Kategori & Transfer</span>
            <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>33 Kategori + 229 Transfer</span>
          </div>
        </div>

        {/* Progress display */}
        {isPending && (
          <div className="space-y-2 p-4 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <div className="flex justify-between text-[12px] font-bold">
              <span style={{ color: "var(--text-primary)" }} className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> {progress.stage}
              </span>
              <span className="amount" style={{ color: "var(--text-primary)" }}>{pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated-2)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: "var(--accent)" }} />
            </div>
          </div>
        )}

        {/* Success result */}
        {successResult && (
          <div className="p-4 rounded-2xl flex items-center gap-3"
            style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.25)" }}>
            <CheckCircle2 size={24} style={{ color: "#22c55e" }} />
            <div>
              <p className="font-extrabold text-[14px]" style={{ color: "var(--text-primary)" }}>
                {successResult.alreadyExisted ? "Data Sudah Lengkap" : "Migrasi Berhasil Sempurna!"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {successResult.alreadyExisted
                  ? "Semua 887 transaksi sudah tersinkronisasi di akun kamu."
                  : `${successResult.count} transaksi telah tersimpan di Supabase.`}
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!successResult ? (
          <button
            onClick={handleStartImport}
            disabled={isPending}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 8px 24px var(--shadow-strength)" }}
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Sedang Memproses...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Mulai Migrasi {totalRecords} Transaksi</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleClose}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 transition-all shadow-xl"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Selesai & Lihat Ringkasan
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
