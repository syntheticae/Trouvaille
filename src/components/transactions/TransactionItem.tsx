import React, { memo } from 'react'
import { ArrowLeftRight, Clock, Scale } from 'lucide-react'
import { format } from 'date-fns'
import { formatRupiah } from '../../lib/utils'
import { IconRenderer } from '../ui/IconRenderer'
import type { Transaction, Category } from '../../lib/types'

interface TransactionItemProps {
  tx: Transaction
  categories: Category[]
  fromWalletName: string
  toWalletName: string
  onClick: (tx: Transaction) => void
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({
  tx,
  categories,
  fromWalletName,
  toWalletName,
  onClick
}) => {
  const isIncome = tx.type === "income"
  const isTransfer = tx.type === "transfer"
  const isAdjustment = tx.note?.toLowerCase().includes("balance adjustment") || tx.note?.toLowerCase().includes("koreksi saldo")
  const timeLabel = tx.created_at ? format(new Date(tx.created_at), "HH:mm") : ""

  return (
    <div
      onClick={() => onClick(tx)}
      className="p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)"
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center relative shrink-0"
          style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
          {isAdjustment ? (
            <Scale size={18} style={{ color: "var(--text-primary)" }} />
          ) : isTransfer ? (
            <ArrowLeftRight size={18} style={{ color: "var(--text-primary)" }} />
          ) : (
            <IconRenderer icon={tx.categories?.emoji || categories.find(c => c.id === tx.category_id)?.emoji || "/icons/lainnya.png"} size="w-6 h-6" />
          )}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow"
            style={{
              background: isAdjustment ? "var(--text-primary)" : isTransfer ? "var(--text-primary)" : isIncome ? "var(--accent)" : "var(--bg-elevated)",
              color: isAdjustment ? "var(--bg-base)" : isTransfer ? "var(--bg-base)" : isIncome ? "var(--accent-ink)" : "var(--text-tertiary)",
              border: "1.5px solid var(--bg-elevated)"
            }}>
            {isAdjustment ? "⚖" : isTransfer ? "⇄" : isIncome ? "+" : "-"}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[14px] leading-tight truncate" style={{ color: "var(--text-primary)" }}>
            {isAdjustment
              ? (tx.note || `Adjustment (${fromWalletName})`)
              : isTransfer
              ? `${fromWalletName} to ${toWalletName}`
              : (tx.categories?.name || categories.find(c => c.id === tx.category_id)?.name || "General")}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
            {timeLabel && (
              <span className="flex items-center gap-0.5 font-bold amount">
                <Clock size={10} />
                {timeLabel} ·
              </span>
            )}
            <span className="truncate">
              {isAdjustment ? fromWalletName : (tx.note || (isTransfer ? "Transfer" : fromWalletName))}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="amount font-extrabold text-[14px]"
          style={{ color: isTransfer ? "var(--text-primary)" : isIncome ? "var(--accent)" : "var(--text-primary)" }}>
          {isTransfer ? "" : isIncome ? "+" : "-"}{formatRupiah(Number(tx.amount))}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          {isAdjustment ? "Adjustment" : isTransfer ? "Transfer" : isIncome ? "Inflow" : "Outflow"}
        </div>
      </div>
    </div>
  )
}

export const TransactionItem = memo(TransactionItemComponent, (prev, next) => {
  return prev.tx.id === next.tx.id && 
         prev.tx.amount === next.tx.amount &&
         prev.tx.note === next.tx.note &&
         prev.tx.category_id === next.tx.category_id &&
         prev.fromWalletName === next.fromWalletName &&
         prev.toWalletName === next.toWalletName
})
