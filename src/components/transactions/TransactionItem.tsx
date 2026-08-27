import React, { memo, useMemo } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import { ArrowLeftRight, Clock, Scale, Trash2, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { formatRupiah } from '../../lib/utils'
import { IconRenderer } from '../ui/IconRenderer'
import { getFamfinaMatch } from '../../lib/famfinaResolver'
import { triggerHaptic } from '../../lib/haptics'
import type { Transaction, Category } from '../../lib/types'
import { isCorrectionTx } from '../../lib/financialMath'

interface TransactionItemProps {
  tx: Transaction
  categories: Category[]
  fromWalletName: string
  toWalletName: string
  isUnusual?: boolean
  onClick: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
  onDuplicate?: (tx: Transaction) => void
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({
  tx,
  categories,
  fromWalletName,
  toWalletName,
  isUnusual,
  onClick,
  onDelete,
  onDuplicate
}) => {
  const isIncome = tx.type === "income"
  const isTransfer = tx.type === "transfer"
  const isCorrection = isCorrectionTx(tx)
  const isPositiveCorrection = isCorrection && (tx.note?.includes("(+)") || tx.type === "income")
  const timeLabel = tx.created_at ? format(new Date(tx.created_at), "HH:mm") : ""

  const resolvedCategory = useMemo(() => {
    if (tx.categories?.name) return tx.categories
    if (tx.category_id) {
      const found = categories.find(c => c.id === tx.category_id)
      if (found) return found
    }
    const match = getFamfinaMatch(tx)
    if (match?.categoryName) {
      const found = categories.find(c => c.name.toLowerCase() === match.categoryName.toLowerCase())
      if (found) return found
    }
    if (tx.note) {
      const noteLower = tx.note.toLowerCase()
      const found = categories.find(c => noteLower.includes(c.name.toLowerCase()))
      if (found) return found
    }
    return null
  }, [tx, categories])

  const categoryDisplayName = resolvedCategory?.name || (isIncome ? "Income" : "Expense")
  const categoryDisplayEmoji = resolvedCategory?.emoji || (isIncome ? "/icons/gaji.png" : "/icons/lainnya.png")

  const isDraggingRef = React.useRef(false)

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Swipe Left: Delete (Threshold -75px or velocity < -350)
    if (info.offset.x < -75 || info.velocity.x < -350) {
      triggerHaptic("heavy")
      onDelete?.(tx)
    }
    // Swipe Right: Duplicate (Threshold +75px or velocity > +350)
    else if (info.offset.x > 75 || info.velocity.x > 350) {
      triggerHaptic("medium")
      onDuplicate?.(tx)
    }
    setTimeout(() => {
      isDraggingRef.current = false
    }, 150)
  }

  const handleTapOrClick = () => {
    if (!isDraggingRef.current) {
      onClick(tx)
    }
  }

  return (
    <div className="relative rounded-[22px] overflow-hidden select-none touch-pan-y">
      {/* Background Actions Reveal Layer */}
      <div
        className="absolute inset-0 flex items-center justify-between px-5 rounded-[22px]"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
      >
        {/* Left Side: Duplicate (revealed on swipe right) */}
        <div className="flex items-center gap-1.5 text-blue-400 font-extrabold text-[12px]">
          <Copy size={16} />
          <span>Duplicate</span>
        </div>

        {/* Right Side: Delete (revealed on swipe left) */}
        <div className="flex items-center gap-1.5 text-red-500 font-extrabold text-[12px]">
          <span>Delete</span>
          <Trash2 size={16} />
        </div>
      </div>

      {/* Foreground Swipeable Card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragMomentum={false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        dragSnapToOrigin
        onDragStart={() => { isDraggingRef.current = true }}
        onDragEnd={handleDragEnd}
        onTap={handleTapOrClick}
        className="p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-98 transition-transform relative z-10"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)"
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative shrink-0"
            style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
            {isCorrection ? (
              <Scale size={18} style={{ color: "var(--text-primary)" }} />
            ) : isTransfer ? (
              <ArrowLeftRight size={18} style={{ color: "var(--text-primary)" }} />
            ) : (
              <IconRenderer icon={categoryDisplayEmoji} size="w-6 h-6" />
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow"
              style={{
                background: isCorrection ? "var(--text-primary)" : isTransfer ? "var(--text-primary)" : isIncome ? "var(--accent)" : "var(--bg-elevated)",
                color: isCorrection ? "var(--bg-base)" : isTransfer ? "var(--bg-base)" : isIncome ? "var(--accent-ink)" : "var(--text-tertiary)",
                border: "1.5px solid var(--bg-elevated)"
              }}>
              {isCorrection ? "⚖" : isTransfer ? "⇄" : isIncome ? "+" : "-"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-bold text-[14px] leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                {isCorrection
                  ? (tx.note || `Correction (${fromWalletName})`)
                  : isTransfer
                  ? `${fromWalletName} to ${toWalletName}`
                  : categoryDisplayName}
              </p>
              {isUnusual && (
                <span
                  className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "var(--glass-fill-strong)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--glass-border)"
                  }}
                >
                  Higher than usual
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
              {timeLabel && (
                <span className="flex items-center gap-0.5 font-bold amount">
                  <Clock size={10} />
                  {timeLabel} ·
                </span>
              )}
              <span className="truncate">
                {isCorrection ? fromWalletName : (tx.note || (isTransfer ? "Transfer" : fromWalletName))}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="amount font-extrabold text-[14px]"
            style={{
              color: isCorrection
                ? (isPositiveCorrection ? "var(--accent)" : "var(--text-primary)")
                : isTransfer
                ? "var(--text-primary)"
                : isIncome
                ? "var(--accent)"
                : "var(--text-primary)"
            }}>
            {isTransfer ? "" : (isCorrection ? (isPositiveCorrection ? "+" : "-") : (isIncome ? "+" : "-"))}{formatRupiah(Number(tx.amount))}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            {isCorrection ? "Correction" : isTransfer ? "Transfer" : isIncome ? "Inflow" : "Outflow"}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export const TransactionItem = memo(TransactionItemComponent, (prev, next) => {
  return prev.tx.id === next.tx.id && 
         prev.tx.amount === next.tx.amount &&
         prev.tx.note === next.tx.note &&
         prev.tx.category_id === next.tx.category_id &&
         prev.fromWalletName === next.fromWalletName &&
         prev.toWalletName === next.toWalletName &&
         prev.isUnusual === next.isUnusual
})

