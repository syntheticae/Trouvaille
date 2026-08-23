import { getFamfinaMatch } from "../../lib/famfinaResolver"

function getTop3Slots<T extends { id: string }>(items: T[], selectedId: string | null): T[] {
  if (items.length <= 3) return items
  const idx = items.findIndex(item => item.id === selectedId)
  if (idx === -1 || idx < 3) {
    return items.slice(0, 3)
  }
  return [items[0], items[1], items[idx]]
}

﻿import { useState, useEffect, useMemo } from "react"
import { Calendar as CalendarIcon, Clock, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Delete, MoreHorizontal, Trash2, Zap } from "lucide-react"
import { BottomSheet } from "../ui/BottomSheet"
import { useCategories } from "../../hooks/useCategories"
import { useWallets } from "../../hooks/useWallets"
import { useAddTransaction, useUpdateTransaction, useDeleteTransaction } from "../../hooks/useTransactions"
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

  const { data: categories = [] } = useCategories(type === "transfer" ? undefined : type)
  const { data: wallets = [] } = useWallets()
  
  const addTx = useAddTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  const { showToast } = useToast()

  const topCategories = useMemo(() => {
    const list = [...categories]
    if (categoryId) {
      const idx = list.findIndex(c => c.id === categoryId)
      if (idx > -1) {
        const item = list.splice(idx, 1)[0]
        list.unshift(item)
      }
    }
    return list.slice(0, 3)
  }, [categories, categoryId])

  // Sync state whenever transaction or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setIsSaving(false)
      if (transaction) {
        setType(transaction.type)
        setAmount(String(transaction.amount || "0"))
        setNote(transaction.note || "")
        setDate(transaction.occurred_on ? new Date(transaction.occurred_on) : new Date())
        setTime(transaction.created_at ? format(new Date(transaction.created_at), "HH:mm") : format(new Date(), "HH:mm"))

        const match = getFamfinaMatch(transaction)

        // 1. Resolve Category
        if (transaction.category_id) {
          setCategoryId(transaction.category_id)
        } else if (match?.categoryName) {
          const foundCat = categories.find(c => c.name.toLowerCase() === match.categoryName.toLowerCase())
          setCategoryId(foundCat ? foundCat.id : null)
        } else {
          setCategoryId(categories.length > 0 ? categories[0].id : null)
        }

        // 2. Resolve Wallet (From Account)
        if (transaction.wallet_id) {
          setWalletId(transaction.wallet_id)
        } else if (match?.fromWallet) {
          const foundWallet = wallets.find(w => w.name.toLowerCase() === match.fromWallet.toLowerCase())
          setWalletId(foundWallet ? foundWallet.id : (wallets.length > 0 ? wallets[0].id : null))
        } else {
          setWalletId(wallets.length > 0 ? wallets[0].id : null)
        }

        // 3. Resolve To Wallet (Transfer)
        if (transaction.to_wallet_id) {
          setToWalletId(transaction.to_wallet_id)
        } else if (match?.toWallet) {
          const toW = match?.toWallet
          const foundTo = toW ? wallets.find(w => w.name.toLowerCase() === toW.toLowerCase()) : null
          setToWalletId(foundTo ? foundTo.id : (wallets.length > 1 ? wallets[1].id : null))
        } else {
          setToWalletId(wallets.length > 1 ? wallets[1].id : null)
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
  }, [transaction, isOpen, categories, wallets])

  useEffect(() => {
    if (!categoryId && type !== "transfer" && categories.length > 0) {
      setCategoryId(categories[0].id)
    }
    if (!walletId && wallets.length > 0) {
      setWalletId(wallets[0].id)
    }
    if (type === "transfer") {
      if (!toWalletId && wallets.length > 1) {
        const other = wallets.find(w => w.id !== walletId)
        setToWalletId(other ? other.id : wallets[1].id)
      } else if (toWalletId && toWalletId === walletId && wallets.length > 1) {
        const other = wallets.find(w => w.id !== walletId)
        if (other) setToWalletId(other.id)
      }
    }
  }, [type, categories, wallets, categoryId, walletId, toWalletId])

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

    if (transaction) {
      updateTx.mutate({ id: transaction.id, ...payload }, {
        onSuccess: () => {
          showToast("Transaksi diperbarui", "update", () => {})
        },
        onError: () => {
          showToast("Gagal memperbarui transaksi", "delete", () => {})
        }
      })
    } else {
      addTx.mutate(payload, {
        onSuccess: () => {
          showToast("Transaksi berhasil disimpan", "add", () => {})
        },
        onError: () => {
          showToast("Gagal menyimpan transaksi", "delete", () => {})
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
                onClick={() => setType(t)}
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
            {isSaving ? "Menyimpan..." : (transaction ? "Update Transaction" : "Save Transaction")}
          </button>
                </div>
      </div>

      {/* More Categories Glass Sheet */}
      <BottomSheet isOpen={moreCatOpen} onClose={() => setMoreCatOpen(false)}>
        <div className="p-5 pb-12">
          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Category</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
            {categories.map(cat => {
              const isSelected = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setMoreCatOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* More Accounts Glass Sheet */}
      <BottomSheet isOpen={moreWalletOpen} onClose={() => setMoreWalletOpen(false)}>
        <div className="p-5 pb-12">
          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Account</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
            {wallets.map(w => {
              const isSelected = (walletTarget === "from" ? walletId : toWalletId) === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (walletTarget === "from") setWalletId(w.id)
                    else setToWalletId(w.id)
                    setMoreWalletOpen(false)
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid var(--glass-border)",
                    boxShadow: isSelected ? "0 0 0 1px rgba(255, 255, 255, 0.15)" : "none"
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--glass-fill)" }}>
                    <IconRenderer icon={w.icon} size="w-4 h-4" />
                  </div>
                  <span className="text-[12px] font-bold truncate">
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
          <h3 className="font-extrabold text-lg mb-1" style={{ color: "var(--text-primary)" }}>Pilih Jam Transaksi</h3>
          <p className="text-[12px] font-medium mb-5" style={{ color: "var(--text-tertiary)" }}>Waktu pencatatan transaksi</p>
          
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
            {["Pagi (08:00)", "Siang (12:30)", "Sore (17:00)", "Malam (20:00)"].map(preset => {
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
            Selesai
          </button>
        </div>
      </BottomSheet>
    </BottomSheet>
  )
}



