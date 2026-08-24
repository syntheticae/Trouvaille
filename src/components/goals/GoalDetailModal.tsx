import { useState, useEffect } from "react"
import { BottomSheet } from "../ui/BottomSheet"
import type { Goal } from "../../hooks/useGoals"
import { formatRupiah } from "../../lib/utils"
import { Plus, Trash2, CheckCircle2, TrendingUp } from "lucide-react"
import { triggerHaptic } from "../../lib/haptics"
import { useToast } from "../../contexts/ToastContext"

interface GoalDetailModalProps {
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onDeposit: (id: string, amount: number) => void
  onUpdate: (id: string, updates: Partial<Goal>) => void
  onDelete: (id: string) => void
}

export function GoalDetailModal({
  goal,
  isOpen,
  onClose,
  onDeposit,
  onUpdate,
  onDelete,
}: GoalDetailModalProps) {
  const [depositAmount, setDepositAmount] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editTarget, setEditTarget] = useState("")
  const [editCurrent, setEditCurrent] = useState("")
  const { showToast } = useToast()

  useEffect(() => {
    if (goal) {
      setEditTitle(goal.title)
      setEditTarget(String(goal.targetAmount))
      setEditCurrent(String(goal.currentAmount))
      setDepositAmount("")
      setIsEditing(false)
    }
  }, [goal, isOpen])

  if (!goal) return null

  const progress = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100))
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  const handleQuickDeposit = (add: number) => {
    onDeposit(goal.id, add)
    triggerHaptic("medium")
    showToast(`+${formatRupiah(add)} ditambahkan ke ${goal.title}`, "add", () => {})
    onClose()
  }

  const handleCustomDeposit = () => {
    const amt = Number(depositAmount)
    if (amt <= 0) return
    onDeposit(goal.id, amt)
    triggerHaptic("medium")
    showToast(`+${formatRupiah(amt)} ditambahkan ke ${goal.title}`, "add", () => {})
    onClose()
  }

  const handleSaveEdit = () => {
    const target = Number(editTarget)
    const current = Number(editCurrent)
    if (!editTitle.trim() || target <= 0) return

    onUpdate(goal.id, {
      title: editTitle.trim(),
      targetAmount: target,
      currentAmount: current,
    })
    triggerHaptic("medium")
    showToast("Target finansial diperbarui", "update", () => {})
    setIsEditing(false)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-12 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
            >
              {goal.icon || "🎯"}
            </div>
            <div>
              <h3 className="font-extrabold text-[18px] leading-tight" style={{ color: "var(--text-primary)" }}>
                {goal.title}
              </h3>
              <p className="text-[12px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {progress >= 100 ? "🎉 Target Tercapai!" : `Tersisa ${formatRupiah(remaining)} lagi`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[12px] font-extrabold px-3 py-1.5 rounded-full"
            style={{
              background: isEditing ? "var(--accent)" : "var(--glass-fill)",
              color: isEditing ? "var(--accent-ink)" : "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {isEditing ? "Batal" : "Edit"}
          </button>
        </div>

        {/* Normal Mode: Progress & Top-Up */}
        {!isEditing ? (
          <>
            {/* Progress Card */}
            <div
              className="p-4 rounded-[22px] glass-surface space-y-2.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
            >
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Terkumpul
                </span>
                <span className="text-[13px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {progress}%
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="amount text-[22px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(goal.currentAmount)}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  dari {formatRupiah(goal.targetAmount)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: progress >= 100 ? "#22c55e" : "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Quick Top-Up Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 px-1">
                <TrendingUp size={13} style={{ color: "var(--text-tertiary)" }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Tambah Tabungan (Top Up)
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[100000, 250000, 500000, 1000000].map(val => (
                  <button
                    key={val}
                    onClick={() => handleQuickDeposit(val)}
                    className="py-2.5 px-2 rounded-2xl text-[11px] font-extrabold active:scale-95 transition-all text-center"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    +{val >= 1000000 ? `${val / 1000000} Jt` : `${val / 1000} Rb`}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Nominal custom (Rp)"
                  className="flex-1 px-4 py-3 rounded-2xl text-[13px] outline-none font-semibold"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  disabled={!depositAmount || Number(depositAmount) <= 0}
                  onClick={handleCustomDeposit}
                  className="px-5 py-3 rounded-2xl font-extrabold text-[13px] flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  <Plus size={15} /> Simpan
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Edit Mode */
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-tertiary)" }}>
                Nama Target
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[13px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-tertiary)" }}>
                Target Total (Rp)
              </label>
              <input
                type="number"
                value={editTarget}
                onChange={e => setEditTarget(e.target.value)}
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[13px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-tertiary)" }}>
                Saldo Tersimpan Saat Ini (Rp)
              </label>
              <input
                type="number"
                value={editCurrent}
                onChange={e => setEditCurrent(e.target.value)}
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[13px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (confirm(`Hapus target "${goal.title}"?`)) {
                    onDelete(goal.id)
                    triggerHaptic("medium")
                    showToast("Target finansial dihapus", "delete", () => {})
                    onClose()
                  }
                }}
                className="p-3.5 rounded-2xl flex items-center justify-center text-red-400 active:scale-95"
                style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.25)" }}
                title="Hapus Goal"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-[14px] flex items-center justify-center gap-1.5 active:scale-95"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                <CheckCircle2 size={16} /> Simpan Perubahan
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
