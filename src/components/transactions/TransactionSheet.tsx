import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics"
import { getFamfinaMatch } from "../../lib/famfinaResolver"

function getTop3Slots<T extends { id: string }>(items: T[], selectedId: string | null): T[] {
  if (items.length <= 3) return items
  const idx = items.findIndex(item => item.id === selectedId)
  if (idx === -1 || idx < 3) {
    return items.slice(0, 3)
  }
  return [items[0], items[1], items[idx]]
}

﻿import { useState, useEffect, useMemo, useRef } from "react"
import { Calendar as CalendarIcon, Clock, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Delete, MoreHorizontal, Trash2, Zap } from "lucide-react"
import { BottomSheet } from "../ui/BottomSheet"
import { useCategories } from "../../hooks/useCategories"
import { useWallets } from "../../hooks/useWallets"
import { useAddTransaction, useUpdateTransaction, useDeleteTransaction, useAllTransactions } from "../../hooks/useTransactions"
import { useCategorySuggestions } from "../../hooks/useCategorySuggestions"
import { useToast } from "../../contexts/ToastContext"
import { formatRupiah } from "../../lib/utils"
import { format, isToday } from "date-fns"
import { IconRenderer } from "../ui/IconRenderer"
import { GlassDatePicker } from "../ui/GlassDatePicker"
import type { Transaction, TransactionType } from "../../lib/types"
import { useShortcuts } from "../../hooks/useShortcuts"

interface TransactionSheetProps {
  isOpen: boolean
  onClose: () => void
  transaction?: Transaction | null
}

export function TransactionSheet({ isOpen, onClose, transaction }: TransactionSheetProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type || "expense")
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "0")
  const [note, setNote] = useState(transaction?.note || "")
  const [date, setDate] = useState<Date>(transaction ? new Date(transaction.occurred_on) : new Date())
  const [time, setTime] = useState<string>(transaction?.created_at ? format(new Date(transaction.created_at), "HH:mm") : format(new Date(), "HH:mm"))
  const [isSaving, setIsSaving] = useState(false)
  
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category_id || null)
  const [walletId, setWalletId] = useState<string | null>(transaction?.wallet_id || null)
  const [toWalletId, setToWalletId] = useState<string | null>(transaction?.to_wallet_id || null)
  const { shortcuts } = useShortcuts()

  const [moreCatOpen, setMoreCatOpen] = useState(false)
  const [moreWalletOpen, setMoreWalletOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const [walletTarget, setWalletTarget] = useState<"from" | "to">("from")

  const { data: allCategories = [] } = useCategories()
  const categories = useMemo(() => {
    if (type === "transfer") return allCategories
    return allCategories.filter(c => c.type === type)
  }, [allCategories, type])
  const { data: wallets = [] } = useWallets()
  const { data: allTxs = [] } = useAllTransactions()
  
  const addTx = useAddTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  const { showToast } = useToast()

  // Smart Contextual & Recency Category Ranking
  const suggestedCategories = useCategorySuggestions({
    categories,
    transactions: allTxs,
    type,
    selectedWalletId: walletId
  })

  const topCategories = useMemo(() => {
    const list = [...suggestedCategories]
    if (categoryId) {
      const idx = list.findIndex(c => c.id === categoryId)
      if (idx > -1) {
        const item = list.splice(idx, 1)[0]
        list.unshift(item)
      }
    }
    return list.slice(0, 3)
  }, [suggestedCategories, categoryId])

  // Keep track of when modal opens or incoming transaction changes
  const prevOpenRef = useRef(false)
  const prevTxIdRef = useRef<string | null>(null)

  useEffect(() => {
    const isOpening = isOpen && !prevOpenRef.current
    const isTxChanged = transaction && transaction.id !== prevTxIdRef.current

    if (isOpen && (isOpening || isTxChanged)) {
      setIsSaving(false)
      if (transaction) {
        setType(transaction.type)
        setAmount(String(transaction.amount || "0"))
        setNote(transaction.note || "")
        setDate(transaction.occurred_on ? new Date(transaction.occurred_on) : new Date())
        setTime(transaction.created_at ? format(new Date(transaction.created_at), "HH:mm") : format(new Date(), "HH:mm"))

        // 1. Resolve Category accurately without resetting
        if (transaction.category_id) {
          setCategoryId(transaction.category_id)
        } else if (transaction.categories?.name) {
          const foundCat = allCategories.find(c => c.name.toLowerCase() === transaction.categories!.name.toLowerCase())
          if (foundCat) setCategoryId(foundCat.id)
        } else {
          const match = getFamfinaMatch(transaction)
          if (match?.categoryName) {
            const foundCat = allCategories.find(c => c.name.toLowerCase() === match.categoryName.toLowerCase())
            setCategoryId(foundCat ? foundCat.id : (categories.length > 0 ? categories[0].id : null))
          } else {
            let foundByNote = null
            if (transaction.note) {
              const noteLower = transaction.note.toLowerCase()
              foundByNote = allCategories.find(c => noteLower.includes(c.name.toLowerCase()))
            }
            setCategoryId(foundByNote ? foundByNote.id : (categories.length > 0 ? categories[0].id : null))
          }
        }

        // 2. Resolve Wallet (From Account)
        if (transaction.wallet_id) {
          setWalletId(transaction.wallet_id)
        } else {
          const match = getFamfinaMatch(transaction)
          if (match?.fromWallet) {
            const foundWallet = wallets.find(w => w.name.toLowerCase() === match.fromWallet.toLowerCase())
            setWalletId(foundWallet ? foundWallet.id : (wallets.length > 0 ? wallets[0].id : null))
          } else {
            setWalletId(wallets.length > 0 ? wallets[0].id : null)
          }
        }

        // 3. Resolve To Wallet (Transfer)
        if (transaction.to_wallet_id) {
          setToWalletId(transaction.to_wallet_id)
        } else {
          const match = getFamfinaMatch(transaction)
          const toW = match?.toWallet
          if (toW) {
            const foundTo = wallets.find(w => w.name.toLowerCase() === toW.toLowerCase())
            setToWalletId(foundTo ? foundTo.id : (wallets.length > 1 ? wallets[1].id : null))
          } else {
            setToWalletId(wallets.length > 1 ? wallets[1].id : null)
          }
        }
      } else {
        setType("expense")
        setAmount("0")
        setNote("")
        setDate(new Date())
        setTime(format(new Date(), "HH:mm"))
        setCategoryId(categories.length > 0 ? categories[0].id : null)
        setWalletId(wallets.length > 0 ? wallets[0].id : null)
        setToWalletId(wallets.length > 1 ? wallets[1].id : null)
      }
    }

    prevOpenRef.current = isOpen
    prevTxIdRef.current = transaction?.id || null
  }, [isOpen, transaction, allCategories, categories, wallets])

  // Ensure valid toWalletId when type is transfer
  useEffect(() => {
    if (type === "transfer") {
      if (!toWalletId && wallets.length > 1) {
        const other = wallets.find(w => w.id !== walletId)
        setToWalletId(other ? other.id : wallets[1].id)
      } else if (toWalletId && toWalletId === walletId && wallets.length > 1) {
        const other = wallets.find(w => w.id !== walletId)
        if (other) setToWalletId(other.id)
      }
    }
  }, [type, wallets, walletId, toWalletId])

  const handleNum = (num: string) => {
    if (amount === "0") setAmount(num)
    else if (amount.length < 11) setAmount(amount + num)
  }
  const handleDel = () => {
    if (amount.length > 1) setAmount(amount.slice(0, -1))
    else setAmount("0")
  }

  const handleSave = () => {
    const isUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    const numAmount = Number(amount)
    if (numAmount <= 0 || isSaving || addTx.isPending || updateTx.isPending) return
    setIsSaving(true)

    const effectiveWalletId = walletId || (wallets.length > 0 ? wallets[0].id : null)
    const effectiveToWalletId = toWalletId || (wallets.length > 1 ? wallets[1].id : null)
    const effectiveCatId = categoryId || (categories.length > 0 ? categories[0].id : null)

    

    // Build timestamp with selected time
    const [h, m] = time.split(":").map(Number)
    const txDate = new Date(date)
    if (!isNaN(h) && !isNaN(m)) {
      txDate.setHours(h, m, 0, 0)
    }

    const payload = {
      type,
      amount: numAmount,
      note,
      occurred_on: format(date, "yyyy-MM-dd"),
      created_at: txDate.toISOString(),
      category_id: type === "transfer" ? null : (isUUID(effectiveCatId) ? effectiveCatId : null),
      wallet_id: isUUID(effectiveWalletId) ? effectiveWalletId : null,
      to_wallet_id: type === "transfer" && isUUID(effectiveToWalletId) ? effectiveToWalletId : null
    }

    // Close sheet immediately for instant response
    onClose()

    if (transaction && transaction.id) {
      updateTx.mutate({ id: transaction.id, ...payload }, {
        onSuccess: () => {
          triggerSuccessHaptic(); showToast("Transaction updated", "update", () => {})
        },
        onError: () => {
          showToast("Failed to update transaction", "delete", () => {})
        }
      })
    } else {
      // Compute transient contextual feedback (Priority 8)
      const cat = allCategories.find(c => c.id === effectiveCatId)
      let contextMsg = "Transaction saved"
      if (type === "expense" && cat) {
        const currentMonthKey = format(date, "yyyy-MM")
        const categoryMonthSpent = allTxs
          .filter(t => t.type === "expense" && t.occurred_on?.startsWith(currentMonthKey) && (t.category_id === cat.id || t.categories?.name.toLowerCase() === cat.name.toLowerCase()))
          .reduce((s, t) => s + Number(t.amount || 0), 0) + numAmount

        contextMsg = `${cat.name} · ${formatRupiah(numAmount)} (${formatRupiah(categoryMonthSpent)} spent this mo)`
      } else if (type === "income") {
        contextMsg = `Inflow ${formatRupiah(numAmount)} recorded`
      } else if (type === "transfer") {
        contextMsg = `Transfer ${formatRupiah(numAmount)} recorded`
      }

      addTx.mutate(payload, {
        onSuccess: () => {
          triggerSuccessHaptic()
          showToast(contextMsg, "add", () => {})
        },
        onError: () => {
          showToast("Failed to save transaction", "delete", () => {})
        }
      })
    }
  }

  const handleDelete = () => {
    if (!transaction) return
    deleteTx.mutate(transaction.id, {
      onSuccess: () => {
        showToast("Transaction deleted", "delete", () => {})
        onClose()
      }
    })
  }

  const renderWalletRow = (selectedId: string | null, onSelect: (id: string) => void, label: string, isTo = false) => {
    const top3 = getTop3Slots(wallets, selectedId)
    return (
      <div className="mb-3">
        <div className="flex justify-between items-end mb-1.5 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            {label}
          </span>
          <button
            onClick={() => { setWalletTarget(isTo ? "to" : "from"); setMoreWalletOpen(true) }}
            className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95"
            style={{ color: "var(--text-secondary)" }}
          >
            More <MoreHorizontal size={12} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {top3.map(w => {
            const isSelected = selectedId === w.id
            return (
              <button
                key={w.id}
                onClick={() => onSelect(w.id)}
                className="flex items-center gap-2 p-2.5 rounded-2xl transition-all active:scale-95"
                style={{
                  background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                  boxShadow: isSelected ? "0 0 0 1px var(--accent-glow)" : "none"
                }}
              >
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isSelected ? "var(--glass-fill-strong)" : "var(--glass-fill)" }}>
                  <IconRenderer icon={w.icon} size="w-4 h-4" />
                </div>
                <span className="text-[12px] font-bold truncate leading-tight">{w.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-2 pb-8">
{/* Header Segmented Tabs */}
        <div className="flex p-1 rounded-full mb-5 glass-surface" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {(["expense", "income", "transfer"] as TransactionType[]).map(t => {
            const isSelected = type === t
            return (
              <button
                key={t}
                onClick={() => { setType(t); triggerHaptic("light"); }}
                className="flex-1 py-2 rounded-full text-[12px] font-extrabold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--accent-ink)" : "var(--text-secondary)",
                }}
              >
                {t === "expense" && <ArrowDownCircle size={14} />}
                {t === "income" && <ArrowUpCircle size={14} />}
                {t === "transfer" && <RefreshCcw size={14} />}
                {t === "expense" ? "Expense" : t === "income" ? "Income" : "Transfer"}
              </button>
            )
          })}
        </div>

                {/* Quick Add Shortcuts (Moved below tabs) */}
        {shortcuts.length > 0 && !transaction && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1 mt-3">
            {shortcuts.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setType(s.type);
                  setAmount(String(s.amount));
                  setNote(s.note);
                  if (s.category_id) setCategoryId(s.category_id);
                  if (s.wallet_id) setWalletId(s.wallet_id);
                }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-transform active:scale-95 flex items-center gap-1.5"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
              >
                <Zap size={12} fill="currentColor" />
                {s.title}
              </button>
            ))}
          </div>
        )}

        {/* Hero Amount Input */}
        <div className="text-center py-2 mb-4">
          <p className="text-[40px] font-extrabold amount tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>
            {formatRupiah(Number(amount))}
          </p>
        </div>

        {/* Selectors */}
        <div className="space-y-2 mb-3">
          {type !== "transfer" && (
            <div className="mb-3">
              <div className="flex justify-between items-end mb-1.5 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Category
                </span>
                <button
                  onClick={() => setMoreCatOpen(true)}
                  className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95"
                  style={{ color: "var(--text-secondary)" }}
                >
                  More <MoreHorizontal size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {topCategories.map(cat => {
                  const isSelected = categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className="flex items-center gap-2 p-2.5 rounded-2xl transition-all active:scale-95"
                      style={{
                        background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)",
                        boxShadow: isSelected ? "0 0 0 1px var(--accent-glow)" : "none"
                      }}
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: isSelected ? "var(--glass-fill-strong)" : "var(--glass-fill)" }}>
                        <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                      </div>
                      <span className="text-[12px] font-bold truncate leading-tight">{cat.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          
          {type === "transfer" ? (
            <>
              {renderWalletRow(walletId, setWalletId, "From Account")}
              {renderWalletRow(toWalletId, setToWalletId, "To Account", true)}
            </>
          ) : (
            renderWalletRow(walletId, setWalletId, "Account")
          )}

          {/* Note Input, Date Pill & Time Pill */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-2xl px-3.5 py-2.5 flex items-center gap-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="bg-transparent text-[14px] font-semibold w-full outline-none"
                style={{ color: "var(--text-primary)", fontFamily: "Urbanist, sans-serif" }}
              />
            </div>
            <button
              onClick={() => setDateOpen(true)}
              className="rounded-2xl px-3 py-2.5 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            >
              <CalendarIcon size={14} style={{ color: "var(--text-secondary)" }} />
              <span className="text-[12px] font-bold">{isToday(date) ? "Today" : format(date, "dd/MM")}</span>
            </button>
            <button
              onClick={() => setTimeOpen(true)}
              className="rounded-2xl px-3 py-2.5 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            >
              <Clock size={14} style={{ color: "var(--text-secondary)" }} />
              <span className="text-[12px] font-bold amount">{time}</span>
            </button>
          </div>
        </div>

        {/* Frosted Glass Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {["1","2","3","4","5","6","7","8","9","00","0"].map(n => (
            <button
              key={n}
              onClick={() => handleNum(n)}
              className="rounded-2xl py-3 text-2xl font-extrabold amount active:scale-95 transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)"
              }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleDel}
            className="rounded-2xl py-3 text-2xl font-bold amount flex items-center justify-center active:scale-95 transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)"
            }}
          >
            <Delete size={22} />
          </button>
                </div>

        {/* Action Button Bar */}
        <div className="flex gap-2 mt-3 mb-2">
          {transaction && (
            <button
              onClick={handleDelete}
              className="w-[52px] rounded-[20px] flex items-center justify-center active:scale-95 shrink-0"
              style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || Number(amount) <= 0}
            className="flex-1 font-extrabold text-[15px] rounded-[20px] py-3.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
              border: "1px solid var(--dock-border)"
            }}
          >
            {isSaving ? "Saving..." : (transaction ? "Update Transaction" : "Save Transaction")}
          </button>
        </div>
      </div>

      {/* More Categories Glass Sheet (4-Columns Fullscreen Layout) */}
      <BottomSheet isOpen={moreCatOpen} onClose={() => setMoreCatOpen(false)}>
        <div className="p-5 flex flex-col max-h-[82vh] h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="font-extrabold text-[18px] leading-tight" style={{ color: "var(--text-primary)" }}>
                Select Category
              </h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {categories.length} categories available
              </p>
            </div>
            <button
              onClick={() => setMoreCatOpen(false)}
              className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-3 content-start overflow-y-auto pr-1 flex-1 pb-[max(env(safe-area-inset-bottom,0px),36px)]">
            {suggestedCategories.map(cat => {
              const isSelected = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setMoreCatOpen(false); triggerHaptic("light"); }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl active:scale-95 transition-all text-center"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--glass-border)",
                    boxShadow: isSelected ? "0 4px 16px rgba(255, 255, 255, 0.08)" : "none"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                  </div>
                  <span className="text-[10.5px] font-bold text-center line-clamp-1 truncate w-full px-0.5">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* More Accounts Glass Sheet (Tall 3-Column Layout with pb-16) */}
      <BottomSheet isOpen={moreWalletOpen} onClose={() => setMoreWalletOpen(false)}>
        <div className="p-5 flex flex-col max-h-[82vh] h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="font-extrabold text-[18px] leading-tight" style={{ color: "var(--text-primary)" }}>
                Select Account / Wallet
              </h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {walletTarget === "from" ? "Source Account" : "Destination Account"} · {wallets.length} accounts
              </p>
            </div>
            <button
              onClick={() => setMoreWalletOpen(false)}
              className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 content-start overflow-y-auto pr-1 flex-1 pb-[max(env(safe-area-inset-bottom,0px),36px)]">
            {wallets.map(w => {
              const isSelected = (walletTarget === "from" ? walletId : toWalletId) === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (walletTarget === "from") setWalletId(w.id)
                    else setToWalletId(w.id)
                    setMoreWalletOpen(false)
                    triggerHaptic("light")
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl active:scale-95 transition-all text-center"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--glass-border)",
                    boxShadow: isSelected ? "0 4px 16px rgba(255, 255, 255, 0.08)" : "none"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shrink-0"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={w.icon} size="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-center">
                    {w.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Date Picker Sheet */}
      <BottomSheet isOpen={dateOpen} onClose={() => setDateOpen(false)}>
        <div className="p-5 pb-10 flex flex-col items-center">
          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Date</h3>
          <GlassDatePicker date={date} onChange={(d) => { setDate(d); setDateOpen(false) }} />
        </div>
      </BottomSheet>

      {/* Glass Time Picker Sheet */}
      <BottomSheet isOpen={timeOpen} onClose={() => setTimeOpen(false)}>
        <div className="p-5 pb-12 flex flex-col items-center">
          <h3 className="font-extrabold text-lg mb-1" style={{ color: "var(--text-primary)" }}>Select Time</h3>
          <p className="text-[12px] font-medium mb-5" style={{ color: "var(--text-tertiary)" }}>Transaction timestamp</p>
          
          <div className="p-4 rounded-3xl w-full max-w-[280px] flex items-center justify-center gap-3 glass-surface"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-3xl font-extrabold amount text-center outline-none cursor-pointer"
              style={{ color: "var(--text-primary)", colorScheme: "dark" }}
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2 mt-5">
            {["Morning (08:00)", "Noon (12:30)", "Evening (17:00)", "Night (20:00)"].map(preset => {
              const t = preset.match(/\((.*?)\)/)?.[1] || "12:00"
              return (
                <button
                  key={preset}
                  onClick={() => { setTime(t); setTimeOpen(false) }}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
                >
                  {preset.split(" ")[0]}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setTimeOpen(false)}
            className="w-full max-w-[280px] py-3 mt-6 rounded-2xl font-bold text-[14px] active:scale-95 transition-all"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Done
          </button>
        </div>
      </BottomSheet>
    </BottomSheet>
  )
}



