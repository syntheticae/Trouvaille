import { useState, useEffect, useMemo } from "react"
import { BottomSheet } from "../ui/BottomSheet"
import type { Goal } from "../../hooks/useGoals"
import { formatRupiah } from "../../lib/utils"
import { Plus, Trash2, CheckCircle2, TrendingUp, Compass } from "lucide-react"
import { triggerHaptic } from "../../lib/haptics"
import { useToast } from "../../contexts/ToastContext"
import { useAllTransactions } from "../../hooks/useTransactions"
import { calculatePersonalBaselines, calculateGoalPlanning } from "../../lib/financialMath"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (goal) {
      setEditTitle(goal.title)
      setEditTarget(String(goal.targetAmount))
      setEditCurrent(String(goal.currentAmount))
      setDepositAmount("")
      setIsEditing(false)
      setIsSubmitting(false)
    }
  }, [goal, isOpen])

  const { data: allTxs = [] } = useAllTransactions()

  const planning = useMemo(() => {
    if (!goal) return null
    const baselines = calculatePersonalBaselines(allTxs)
    return calculateGoalPlanning(goal, baselines)
  }, [goal, allTxs])

  if (!goal) return null

  const progress = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100))
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  const handleQuickDeposit = (add: number) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    onDeposit(goal.id, add)
    triggerHaptic("medium")
    showToast(`+${formatRupiah(add)} added to ${goal.title}`, "add", () => {})
    onClose()
  }

  const handleCustomDeposit = () => {
    const amt = Number(depositAmount)
    if (amt <= 0 || isSubmitting) return
    setIsSubmitting(true)
    onDeposit(goal.id, amt)
    triggerHaptic("medium")
    showToast(`+${formatRupiah(amt)} added to ${goal.title}`, "add", () => {})
    onClose()
  }

  const handleSaveEdit = () => {
    const target = Number(editTarget)
    const current = Number(editCurrent)
    if (!editTitle.trim() || target <= 0 || isSubmitting) return

    setIsSubmitting(true)
    onUpdate(goal.id, {
      title: editTitle.trim(),
      targetAmount: target,
      currentAmount: current,
    })
    triggerHaptic("medium")
    showToast("Financial goal updated", "update", () => {})
    setIsEditing(false)
    setIsSubmitting(false)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-12 space-y-4">
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
                {progress >= 100 ? "🎉 Goal Reached!" : `${formatRupiah(remaining)} remaining`}
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
            {isEditing ? "Cancel" : "Edit"}
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
                  Collected
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
                  of {formatRupiah(goal.targetAmount)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Planning Trajectory Card (Phase II) */}
            {planning && (
              <div
                className="p-3.5 rounded-[22px] space-y-2.5"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Compass size={13} style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      Planning Trajectory
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{
                      background: planning.trajectoryStatus === "ON TRACK" || planning.trajectoryStatus === "AHEAD OF TARGET" ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {planning.trajectoryStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl" style={{ background: "var(--glass-fill)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Required Pace</p>
                    <p className="amount font-extrabold text-[13px] mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(planning.requiredMonthlyContribution)} <span className="text-[9px] font-normal" style={{ color: "var(--text-secondary)" }}>/ mo</span>
                    </p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ background: "var(--glass-fill)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Retained Cash</p>
                    <p className="amount font-extrabold text-[13px] mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(planning.historicalRetainedCash)} <span className="text-[9px] font-normal" style={{ color: "var(--text-secondary)" }}>/ mo</span>
                    </p>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed pt-1 border-t border-[var(--glass-border)]" style={{ color: "var(--text-secondary)" }}>
                  {planning.trajectoryExplanation}
                </p>
              </div>
            )}

            {/* Quick Top-Up Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 px-1">
                <TrendingUp size={13} style={{ color: "var(--text-tertiary)" }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Add Funds (Top Up)
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
                    +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Custom amount (Rp)"
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
                  <Plus size={15} /> Save
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Edit Mode */
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-tertiary)" }}>
                Goal Name
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
                Target Amount (Rp)
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
                Current Saved Balance (Rp)
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
                  if (confirm(`Delete goal "${goal.title}"?`)) {
                    onDelete(goal.id)
                    triggerHaptic("medium")
                    showToast("Financial goal deleted", "delete", () => {})
                    onClose()
                  }
                }}
                className="p-3.5 rounded-2xl flex items-center justify-center text-red-400 active:scale-95"
                style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.25)" }}
                title="Delete Goal"
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-[14px] flex items-center justify-center gap-1.5 active:scale-95"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                <CheckCircle2 size={16} /> Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
