import { useState, useRef, useMemo } from "react"
import { triggerHaptic } from "../lib/haptics"
import { GoalDetailModal } from "../components/goals/GoalDetailModal"
import {
  Plus, Trash2, Calendar as CalendarIcon, LogOut, ChevronRight,
  CreditCard, LayoutGrid, Target, Sun, Camera, User as UserIcon, RotateCcw,
  Bell, Archive, Zap, MoreHorizontal, Scale, Check, Loader2
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useBills, useAddBill, useUpdateBill, useDeleteBill, useMarkBillPaid } from "../hooks/useBills"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { useCategories, useAddCategory, useDeleteCategory, useUpdateCategory } from "../hooks/useCategories"
import { useWallets, useAddWallet, useUpdateWallet, useDeleteWallet, DEFAULT_WALLETS, getWalletIcon } from "../hooks/useWallets"
import { useGoals } from "../hooks/useGoals"
import { useBudgetTarget } from "../hooks/useBudgetTarget"
import { useShortcuts } from "../hooks/useShortcuts"
import { formatRupiah } from "../lib/utils"
import { BottomSheet } from "../components/ui/BottomSheet"
import { GlassDatePicker } from "../components/ui/GlassDatePicker"
import { format, isToday } from "date-fns"
import { supabase } from "../lib/supabase"
import { useAddTransaction, fetchAllTransactionsFromSupabase } from "../hooks/useTransactions"
import { useWalletBalances } from "../hooks/useWalletBalances"
import { IconRenderer } from "../components/ui/IconRenderer"
import { ResetTransactionsSheet } from "../components/ui/ResetTransactionsSheet"
import { requestNotificationPermission } from "../lib/notifications"
import { syncAllFamfinaToSupabase } from "../lib/famfinaResolver"

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: bills = [] } = useBills()
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()
  const { goals, addGoal, updateGoal, deleteGoal, depositToGoal } = useGoals()
  const [selectedGoalSetting, setSelectedGoalSetting] = useState<any | null>(null)
  const { session } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const { budgetTarget, setBudgetTarget } = useBudgetTarget()
  const { shortcuts, saveShortcut, deleteShortcut } = useShortcuts()

  const activeWalletNames = useMemo(() => new Set(wallets.map(w => w.name.trim().toLowerCase())), [wallets])
  const availableDefaultWallets = useMemo(() => DEFAULT_WALLETS.filter(name => !activeWalletNames.has(name.toLowerCase())), [activeWalletNames])

  const addBill = useAddBill()
  const updateBill = useUpdateBill()
  const deleteBill = useDeleteBill()
  const markBillPaid = useMarkBillPaid()
  const addCategory = useAddCategory()
  const deleteCategory = useDeleteCategory()
  const updateCategory = useUpdateCategory()
  const addWallet = useAddWallet()
  const updateWallet = useUpdateWallet()
  const deleteWallet = useDeleteWallet()
  const addTx = useAddTransaction()

  // Centralized Live Wallet Balances (100% synchronized with Portfolio Breakdown)
  const { balancesById, balancesByName, allTxs } = useWalletBalances()

  // Editing states
  const [editingBill, setEditingBill] = useState<any>(null)
  const [editWallet, setEditWallet] = useState<{ id: string; name: string; icon: string } | null>(null)
  const [correctWallet, setCorrectWallet] = useState<{ id: string; name: string; icon: string; currentBalance: number } | null>(null)
  const [correctTargetBalance, setCorrectTargetBalance] = useState("")
  const [correctNote, setCorrectNote] = useState("")
  const [isSavingCorrection, setIsSavingCorrection] = useState(false)
  const [editCategory, setEditCategory] = useState<{ id: string; name: string; budget_amount?: number | null; type?: string } | null>(null)
  const [editCategoryBudget, setEditCategoryBudget] = useState("")

  // Modals state
  const [profileOpen, setProfileOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [budgetsOpen, setBudgetsOpen] = useState(false)
  const [addBudgetOpen, setAddBudgetOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [billListOpen, setBillListOpen] = useState(false)
  const [billSheetOpen, setBillSheetOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [budgetTargetOpen, setBudgetTargetOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [addShortcutOpen, setAddShortcutOpen] = useState(false)
  const [shortcutTitle, setShortcutTitle] = useState("")
  const [shortcutAmount, setShortcutAmount] = useState("")
  const [shortcutCategoryId, setShortcutCategoryId] = useState("")
  const [shortcutWalletId, setShortcutWalletId] = useState("")
  const [shortcutType, setShortcutType] = useState<"expense" | "income">("expense")
  const [shortcutMoreCatOpen, setShortcutMoreCatOpen] = useState(false)
  const [shortcutMoreWalletOpen, setShortcutMoreWalletOpen] = useState(false)

  // Safe Sync state
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    const saved = localStorage.getItem("trouvaille_last_synced")
    if (!saved) return "Just now"
    try {
      const d = new Date(saved)
      return isToday(d) ? `Today, ${format(d, "HH:mm")}` : format(d, "dd MMM, HH:mm")
    } catch {
      return "Just now"
    }
  })

  const handleSafeSync = async () => {
    if (syncStatus === "syncing") return
    setSyncStatus("syncing")
    triggerHaptic("light")

    try {
      // 1. Sync any missing Famfina dataset records to Supabase (non-destructive)
      await syncAllFamfinaToSupabase()

      // 2. Fetch complete transaction dataset using multi-page chunked engine
      const freshTxs = await fetchAllTransactionsFromSupabase()

      // 3. Fetch fresh wallets, categories, and bills
      const [freshWallets, freshCategories, freshBills] = await Promise.all([
        supabase.from("wallets").select("*").order("name"),
        supabase.from("categories").select("*").order("name"),
        supabase.from("bills").select("*").order("due_date", { ascending: true })
      ])

      if (freshWallets.error) throw freshWallets.error
      if (freshCategories.error) throw freshCategories.error
      if (freshBills.error) throw freshBills.error

      // 4. Atomically update and invalidate all queries
      queryClient.setQueriesData({ queryKey: ["transactions"] }, freshTxs)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
      ])

      const now = new Date()
      localStorage.setItem("trouvaille_last_synced", now.toISOString())
      setLastSyncedTime(`Today, ${format(now, "HH:mm")}`)
      setSyncStatus("success")
      triggerHaptic("medium")
      showToast(`Data synchronized (${freshTxs.length} records)`, "update", () => {})

      setTimeout(() => {
        setSyncStatus("idle")
      }, 3500)
    } catch (err) {
      console.error("[handleSafeSync] Sync error:", err)
      setSyncStatus("error")
      showToast("Sync failed. Local data preserved.", "delete", () => {})
      setTimeout(() => {
        setSyncStatus("idle")
      }, 4000)
    }
  }

  // Profile Form state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(() => {
    return session?.user?.user_metadata?.display_name || session?.user?.email?.split("@")[0] || "User"
  })
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return session?.user?.user_metadata?.avatar_url || localStorage.getItem("trouvaille_avatar") || ""
  })
  const [isUploading, setIsUploading] = useState(false)

  // Bill Form
  const [billTitle, setBillTitle] = useState("🎯")
  const [billAmount, setBillAmount] = useState("")
  const [billDate, setBillDate] = useState<Date>(new Date())
  const [billRepeat, setBillRepeat] = useState<"none" | "weekly" | "monthly" | "yearly">("monthly")
  const [billIsPaid, setBillIsPaid] = useState(false)

  // Goal Form
  const [goalTitle, setGoalTitle] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [goalSaved, setGoalSaved] = useState("")
  const [goalIcon, setGoalIcon] = useState("🎯")

  // Budget Form
  const [budgetName, setBudgetName] = useState("")

  // Category Form
  const [catName, setCatName] = useState("")
  const [catType, setCatType] = useState<"expense" | "income">("expense")
  const [manageCatTab, setManageCatTab] = useState<"expense" | "income">("expense")
  
  // Budget Target Form
  const [tempBudgetTarget, setTempBudgetTarget] = useState(String(budgetTarget))

  // ... (Upload & Action handlers)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const maxSize = 256
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height
            height = maxSize
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL("image/jpeg", 0.7)
        setAvatarUrl(compressed)
        setIsUploading(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleUpdateProfile = async () => {
    try {
      localStorage.setItem("trouvaille_avatar", avatarUrl)
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName, avatar_url: avatarUrl }
      })
      if (error) throw error
      setProfileOpen(false)
      showToast("Profile updated successfully", "update", () => {})
    } catch (e: any) {
      showToast(e.message || "Failed to update profile", "delete", () => {})
    }
  }

  const handleOpenAddBill = () => {
    setEditingBill(null)
    setBillTitle("")
    setBillAmount("")
    setBillDate(new Date())
    setBillRepeat("monthly")
    setBillIsPaid(false)
    setBillSheetOpen(true)
  }

  const handleOpenEditBill = (b: any) => {
    setEditingBill(b)
    setBillTitle(b.title || "")
    setBillAmount(b.amount ? String(b.amount) : "")
    setBillDate(b.due_date ? new Date(b.due_date) : new Date())
    setBillRepeat(b.repeat_rule || "monthly")
    setBillIsPaid(!!b.is_paid)
    setBillSheetOpen(true)
  }

  const handleSaveBill = () => {
    if (!billTitle) return
    const num = Number(billAmount)
    const payload = {
      title: billTitle,
      amount: num > 0 ? num : null,
      due_date: format(billDate, "yyyy-MM-dd"),
      repeat_rule: billRepeat,
      is_paid: billIsPaid
    }
    if (editingBill) {
      updateBill.mutate({ id: editingBill.id, ...payload }, {
        onSuccess: () => {
          setBillSheetOpen(false)
          setEditingBill(null)
          setBillTitle("")
          setBillAmount("")
          showToast("Bill updated", "update", () => {})
        }
      })
    } else {
      addBill.mutate(payload, {
        onSuccess: () => {
          setBillSheetOpen(false)
          setBillTitle("")
          setBillAmount("")
          showToast("Bill created", "add", () => {})
        }
      })
    }
  }

  const handleSaveGoal = () => {
    if (!goalTitle || !goalTarget) return
    addGoal({
      title: goalTitle,
      targetAmount: Number(goalTarget),
      currentAmount: Number(goalSaved || 0),
      icon: goalIcon,
      color: "#B8FA4E"
    })
    setAddGoalOpen(false)
    setGoalTitle("")
    setGoalTarget("")
    setGoalSaved("")
    showToast("Financial Goal created", "add", () => {})
  }

  const handleSaveBudget = () => {
    if (!budgetName.trim()) return
    const name = budgetName.trim()
    const autoIcon = getWalletIcon(name)
    const chosenIcon = autoIcon !== "/icons/Budgets/custom.png" ? autoIcon : "/icons/Budgets/custom.png"
    addWallet.mutate({ name, icon: chosenIcon }, {
      onSuccess: () => {
        setAddBudgetOpen(false)
        setBudgetName("")
        showToast("Account added", "add", () => {})
      }
    })
  }

  const handleSaveCategory = () => {
    if (!catName) return
    addCategory.mutate({ name: catName, emoji: "/icons/lainnya.png", type: catType }, {
      onSuccess: () => {
        setAddCatOpen(false)
        setCatName("")
        showToast("Category added", "add", () => {})
      }
    })
  }

  const handleExportCSV = () => {
    if (allTxs.length === 0) {
      showToast("No transaction data to export", "delete", () => {})
      return
    }
    const headers = ["Date,Type,Amount,Category,Note"]
    const rows = allTxs.map((t: any) => {
      const date = t.occurred_on
      const type = t.type === "income" ? "Income" : t.type === "expense" ? "Expense" : "Transfer"
      const amount = t.amount
      const cat = t.categories?.name || "General"
      const note = t.note || ""
      return `${date},${type},${amount},"${cat}","${note}"`
    })
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `trouvaille_export_${format(new Date(), "yyyyMMdd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("CSV exported successfully", "add", () => {})
  }

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut()
      window.location.reload()
    }
  }

  return (
    <div className="px-5 py-6 space-y-6 pb-36">
      <h1 className="text-[24px] font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>Settings</h1>
      
      {/* ============================================================ */}
      {/* 1. PROFILE SECTION */}
      {/* ============================================================ */}
      <section className="glass-surface p-4 rounded-[24px] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "0 2px 8px var(--shadow-strength)" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={20} style={{ color: "var(--text-secondary)" }} />
            )}
          </div>
          <div>
            <p className="font-extrabold text-[16px] truncate" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </p>
            <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-tertiary)" }}>
              {session?.user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => setProfileOpen(true)}
          className="px-4 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
        >
          Edit
        </button>
      </section>

      {/* ============================================================ */}
      {/* 2. FINANCIAL SETUP SECTION */}
      {/* ============================================================ */}
      <section>
        <h2 className="text-[13px] font-bold mb-3 px-1" style={{ color: "var(--text-tertiary)" }}>Financial Setup</h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
          {/* Categories */}
          <button onClick={() => setCategoriesOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <LayoutGrid size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Manage Categories</span>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />
          
          {/* Accounts & Wallets */}
          <button onClick={() => setBudgetsOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <CreditCard size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Accounts & Wallets</span>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Recurring Bills */}
          <button onClick={() => setBillListOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <CalendarIcon size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Recurring Bills</span>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Financial Goals */}
          <button onClick={() => setGoalsOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Target size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Financial Goals</span>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Monthly Budget Target */}
          <button onClick={() => setBudgetTargetOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Target size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Monthly Budget Target</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold" style={{ color: "var(--text-tertiary)" }}>{formatRupiah(budgetTarget)}</span>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. PREFERENCES SECTION */}
      {/* ============================================================ */}
      <section>
        <h2 className="text-[13px] font-bold mb-3 px-1" style={{ color: "var(--text-tertiary)" }}>App Preferences</h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
          {/* Appearance Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Sun size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Light Appearance</span>
            </div>
            <label className="ios-toggle cursor-pointer">
              <input type="checkbox" checked={theme === "light"} onChange={toggleTheme} />
              <div className="ios-toggle-track"></div>
              <div className="ios-toggle-knob"></div>
            </label>
          </div>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Notifications */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Bell size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Bill Reminders</span>
            </div>
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission()
                if (granted) showToast("Bill reminders enabled!", "add", () => {})
                else showToast("Notification permission denied", "delete", () => {})
              }}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              Active
            </button>
          </div>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Quick Shortcuts */}
          <button onClick={() => setShortcutsOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Zap size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Quick-Add Shortcuts</span>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. DATA & STORAGE SECTION */}
      {/* ============================================================ */}
      <section>
        <h2 className="text-[13px] font-bold mb-3 px-1" style={{ color: "var(--text-tertiary)" }}>Data & Storage</h2>
        <div className="glass-surface rounded-[24px] overflow-hidden flex flex-col">
                    {/* Offline Storage */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Archive size={16} />
              </div>
              <div>
                <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>On-Device Storage</span>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {syncStatus === "syncing"
                    ? "Synchronizing..."
                    : syncStatus === "error"
                    ? "Sync error · Local data safe"
                    : `${allTxs.length} records cached · Last synced ${lastSyncedTime}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleSafeSync}
              disabled={syncStatus === "syncing"}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60"
              style={{
                background: syncStatus === "success" ? "var(--accent)" : "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                color: syncStatus === "success" ? "var(--accent-ink)" : "var(--text-secondary)"
              }}
            >
              {syncStatus === "syncing" && <Loader2 size={12} className="animate-spin" />}
              {syncStatus === "success" && <Check size={12} />}
              <span>
                {syncStatus === "syncing"
                  ? "Syncing..."
                  : syncStatus === "success"
                  ? "Synced"
                  : syncStatus === "error"
                  ? "Retry"
                  : "Sync Now"}
              </span>
            </button>
          </div>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Export CSV */}
          <button onClick={handleExportCSV} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <Archive size={16} />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Export to CSV</span>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
          <div className="h-[1px] w-full" style={{ background: "var(--glass-border)" }} />

          {/* Reset Data */}
          <button onClick={() => setResetOpen(true)} className="flex items-center justify-between p-4 active:bg-black/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
                <RotateCcw size={16} />
              </div>
              <div>
                <p className="font-bold text-[14px]" style={{ color: "#ef4444" }}>Reset Data</p>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. LOGOUT */}
      {/* ============================================================ */}
      <button
        onClick={handleLogout}
        className="w-full p-4 rounded-[24px] font-bold text-[14px] flex items-center justify-center gap-2 active:scale-98 transition-transform mb-6"
        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444" }}
      >
        <LogOut size={16} /> Sign Out
      </button>
      
      <p className="text-center text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
        Trouvaille for iOS<br/>Version 2.0.0
      </p>

      {/* ============================================================ */}
      {/* BOTTOM SHEETS / MODALS */}
      {/* ============================================================ */}

      {/* Profile Sheet */}
      <BottomSheet isOpen={profileOpen} onClose={() => setProfileOpen(false)}>
        <div className="p-5 pb-10 space-y-5">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Edit Profile</h3>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-24 h-24 rounded-full overflow-hidden relative flex items-center justify-center shadow-lg"
              style={{ background: "var(--bg-elevated)", border: "2px solid var(--glass-border)" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} style={{ color: "var(--text-secondary)" }} />
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
              <Camera size={14} /> Change Photo
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full p-4 rounded-2xl outline-none font-bold text-[15px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <button onClick={handleUpdateProfile} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Profile</button>
        </div>
      </BottomSheet>

      {/* Bill List Sheet */}
      <BottomSheet isOpen={billListOpen} onClose={() => setBillListOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 pb-2">
            <div>
              <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Recurring Bills</h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {bills.filter((b: any) => !b.is_paid).length} unpaid · {bills.filter((b: any) => b.is_paid).length} paid
              </p>
            </div>
            <button onClick={() => { setBillListOpen(false); setTimeout(() => handleOpenAddBill(), 300) }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2 pb-6">
            {bills.map((b: any) => {
              const isPaid = !!b.is_paid
              return (
                <div key={b.id} onClick={() => { setBillListOpen(false); setTimeout(() => handleOpenEditBill(b), 300) }}
                  className="glass-surface p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
                  style={{ opacity: isPaid ? 0.75 : 1 }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isPaid ? "rgba(16, 185, 129, 0.15)" : "var(--bg-elevated)",
                        border: isPaid ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--glass-border)",
                        color: isPaid ? "#34d399" : "var(--text-tertiary)"
                      }}>
                      {isPaid ? <Check size={20} /> : <Bell size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-[14px] truncate ${isPaid ? "line-through text-neutral-400" : ""}`} style={{ color: isPaid ? "var(--text-tertiary)" : "var(--text-primary)" }}>
                          {b.title}
                        </p>
                        {isPaid && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        <span className="capitalize">{b.repeat_rule}</span> · Due {b.due_date} · {formatRupiah(Number(b.amount || 0))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        markBillPaid.mutate({ bill: b, paid: !isPaid })
                        triggerHaptic("medium")
                        showToast(isPaid ? `Marked ${b.title} as unpaid` : `Marked ${b.title} as paid`, "update", () => {})
                      }}
                      className="text-[11px] font-extrabold px-2.5 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                      style={{
                        background: isPaid ? "var(--glass-fill-strong)" : "var(--accent)",
                        color: isPaid ? "var(--text-secondary)" : "var(--accent-ink)",
                        border: isPaid ? "1px solid var(--glass-border)" : "none"
                      }}
                      title={isPaid ? "Tandai Belum Bayar" : "Tandai Sudah Bayar"}
                    >
                      <Check size={12} />
                      <span>{isPaid ? "Unmark" : "Paid"}</span>
                    </button>
                    <button onClick={() => { showToast("Bill deleted", "delete", () => deleteBill.mutate(b.id)) }}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95"
                      style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
            {bills.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>No recurring bills registered.</p>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Add/Edit Bill Sheet */}
      <BottomSheet isOpen={billSheetOpen} onClose={() => setBillSheetOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>
            {editingBill ? "Edit Recurring Bill" : "Add Recurring Bill"}
          </h3>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Bill Title</label>
            <input type="text" value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="e.g. Netflix, Gym, Internet"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[15px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Nominal Amount (IDR)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={billAmount ? formatRupiah(Number(billAmount)) : ""}
              onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setBillAmount(raw) }} placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Payment Status</label>
            <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <button type="button" onClick={() => setBillIsPaid(false)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: !billIsPaid ? "var(--accent)" : "transparent", color: !billIsPaid ? "var(--accent-ink)" : "var(--text-tertiary)" }}>
                Unpaid (Belum)
              </button>
              <button type="button" onClick={() => setBillIsPaid(true)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                style={{ background: billIsPaid ? "var(--accent)" : "transparent", color: billIsPaid ? "var(--accent-ink)" : "var(--text-tertiary)" }}>
                <Check size={12} />
                <span>Paid (Sudah Bayar)</span>
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Due Date</label>
            <button onClick={() => setPickerOpen(true)} className="w-full p-3.5 rounded-2xl flex justify-between items-center"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
              <span className="font-medium text-sm">Due Date: {format(billDate, "dd MMM yyyy")}</span>
              <CalendarIcon size={18} style={{ color: "var(--accent)" }} />
            </button>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Repeat Frequency</label>
            <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              {(["none", "weekly", "monthly", "yearly"] as const).map(r => (
                <button key={r} onClick={() => setBillRepeat(r)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                  style={{ background: billRepeat === r ? "var(--accent)" : "transparent", color: billRepeat === r ? "var(--accent-ink)" : "var(--text-tertiary)" }}>
                  {r === "none" ? "None" : r === "weekly" ? "Weekly" : r === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSaveBill} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] shadow-lg active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            {editingBill ? "Update Bill" : "Save Bill"}
          </button>
        </div>
      </BottomSheet>

      {/* Monthly Budget Target Sheet */}
      <BottomSheet isOpen={budgetTargetOpen} onClose={() => setBudgetTargetOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Set Monthly Budget</h3>
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Set a monthly spending limit to monitor your budget progress on the dashboard.</p>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Target Amount</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={tempBudgetTarget ? formatRupiah(Number(tempBudgetTarget)) : ""}
              onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setTempBudgetTarget(raw) }} placeholder="Rp 0"
              className="w-full p-4 rounded-2xl outline-none font-bold text-[18px] amount"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <button onClick={() => { setBudgetTarget(Number(tempBudgetTarget) || 0); setBudgetTargetOpen(false); showToast("Budget target saved", "add", () => {}) }} 
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Target</button>
        </div>
      </BottomSheet>

      {/* Date Picker Sheet for Bills */}
      <BottomSheet isOpen={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="p-5 pb-10 flex flex-col items-center">
          <h3 className="font-extrabold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Select Due Date</h3>
          <GlassDatePicker date={billDate} onChange={(d) => { setBillDate(d); setPickerOpen(false) }} />
        </div>
      </BottomSheet>

      {/* Reset Transactions Sheet */}
      <ResetTransactionsSheet isOpen={resetOpen} onClose={() => setResetOpen(false)} />

      <BottomSheet isOpen={goalsOpen} onClose={() => setGoalsOpen(false)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 pb-2">
            <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Financial Goals</h3>
            <button onClick={() => { setGoalsOpen(false); setTimeout(() => setAddGoalOpen(true), 300) }} className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Plus size={16} /></button>
          </div>
          <div className="space-y-2">
            {goals.map((g: any) => (
              <div key={g.id} onClick={() => { setSelectedGoalSetting(g); triggerHaptic("light"); }} className="p-3 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{g.icon === "dYZ_" ? "🎯" : g.icon}</div>
                  <div>
                    <p className="font-bold text-[13px]">{g.title}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{formatRupiah(g.currentAmount)} / {formatRupiah(g.targetAmount)}</p>
                  </div>
                </div>
                <button onClick={() => { if (confirm(`Delete goal ${g.title}?`)) deleteGoal(g.id) }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: "#ef4444" }}><Trash2 size={14} /></button>
              </div>
            ))}
            {goals.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>No financial goals yet.</p>}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={addGoalOpen} onClose={() => setAddGoalOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Goal</h3>
          <div className="flex gap-2">
            <input type="text" value={goalIcon} onChange={e => setGoalIcon(e.target.value)} className="w-14 p-3.5 rounded-2xl text-center text-xl outline-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }} />
            <input type="text" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Goal Name (e.g. MacBook)" className="flex-1 p-3.5 rounded-2xl outline-none font-semibold" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Target Amount (IDR)" className="w-full p-3.5 rounded-2xl outline-none font-semibold" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          <input type="number" value={goalSaved} onChange={e => setGoalSaved(e.target.value)} placeholder="Already Saved (IDR)" className="w-full p-3.5 rounded-2xl outline-none font-semibold" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          <button onClick={handleSaveGoal} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Goal</button>
        </div>
      </BottomSheet>

      {/* Manage Categories Sheet */}
      <BottomSheet isOpen={categoriesOpen} onClose={() => setCategoriesOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Categories</h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {categories.length} total categories · Tap card to edit
              </p>
            </div>
            <button onClick={() => { setCategoriesOpen(false); setTimeout(() => setAddCatOpen(true), 300) }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <Plus size={16} />
            </button>
          </div>

          {/* Segmented Filter Tab: Expense vs Income */}
          <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["expense", "income"] as const).map(t => {
              const count = categories.filter(c => c.type === t).length
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setManageCatTab(t)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all capitalize"
                  style={{
                    background: manageCatTab === t ? "var(--accent)" : "transparent",
                    color: manageCatTab === t ? "var(--accent-ink)" : "var(--text-tertiary)"
                  }}
                >
                  {t} ({count})
                </button>
              )
            })}
          </div>

          {/* 2-Column Responsive Compact Grid */}
          <div className="grid grid-cols-2 gap-2.5 pb-6">
            {categories.filter(c => c.type === manageCatTab).map(cat => (
              <div
                key={cat.id}
                onClick={() => {
                  setEditCategory({ id: cat.id, name: cat.name, budget_amount: cat.budget_amount, type: cat.type })
                  setEditCategoryBudget(cat.budget_amount ? String(cat.budget_amount) : "")
                }}
                className="p-3 rounded-2xl flex flex-col justify-between cursor-pointer active:scale-98 transition-all relative group"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
              >
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCategory({ id: cat.id, name: cat.name, budget_amount: cat.budget_amount, type: cat.type })
                        setEditCategoryBudget(cat.budget_amount ? String(cat.budget_amount) : "")
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--glass-fill-strong)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCategory.mutate(cat.id) }}
                      className="w-6 h-6 flex items-center justify-center rounded-full active:scale-95"
                      style={{ color: "#ef4444" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>
                    {cat.name}
                  </p>
                  <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                    {cat.budget_amount && cat.budget_amount > 0 ? (
                      <span className="text-emerald-400 font-bold">Limit {formatRupiah(cat.budget_amount)}</span>
                    ) : (
                      <span>No monthly limit</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!editCategory} onClose={() => setEditCategory(null)}>
        <div className="p-5 pb-16 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Edit Category</h3>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Category Name</label>
            <input
              type="text"
              value={editCategory?.name || ""}
              onChange={e => setEditCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
              placeholder="Category Name"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>

          {editCategory?.type === "expense" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
                Monthly Budget Target (Optional)
              </label>
              <input
                type="text"
                value={editCategoryBudget ? formatRupiah(Number(editCategoryBudget.replace(/\D/g, ""))) : ""}
                onChange={e => setEditCategoryBudget(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. Rp 1.000.000 (leave blank for no budget)"
                className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
              />
              <p className="text-[10px] font-medium mt-1 px-1" style={{ color: "var(--text-tertiary)" }}>
                Used to track category envelope progress in Statistics.
              </p>
            </div>
          )}

          <button
            onClick={() => {
              if (!editCategory?.name.trim()) return
              const numBudget = editCategoryBudget.trim() ? Number(editCategoryBudget.replace(/\D/g, "")) : null
              updateCategory.mutate({
                id: editCategory.id,
                name: editCategory.name.trim(),
                budget_amount: numBudget,
                emoji: categories.find(c => c.id === editCategory.id)?.emoji || "/icons/lainnya.png"
              }, {
                onSuccess: () => {
                  setEditCategory(null)
                  showToast("Category updated", "update", () => {})
                }
              })
            }}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Changes
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={addCatOpen} onClose={() => setAddCatOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Category</h3>
          <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["expense", "income"] as const).map(t => (
              <button key={t} onClick={() => setCatType(t)} className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all" style={{ background: catType === t ? "var(--accent)" : "transparent", color: catType === t ? "var(--accent-ink)" : "var(--text-tertiary)" }}>{t === "expense" ? "Expense" : "Income"}</button>
            ))}
          </div>
          <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category Name" className="w-full p-3.5 rounded-2xl outline-none font-semibold" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          <button onClick={handleSaveCategory} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Category</button>
        </div>
      </BottomSheet>

      {/* Manage Accounts & Wallets Sheet */}
      <BottomSheet isOpen={budgetsOpen} onClose={() => setBudgetsOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg leading-tight" style={{ color: "var(--text-primary)" }}>Accounts & Wallets</h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {wallets.length} active accounts · Tap card to edit
              </p>
            </div>
            <button onClick={() => { setBudgetsOpen(false); setTimeout(() => setAddBudgetOpen(true), 300) }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <Plus size={16} />
            </button>
          </div>

          {/* 2-Column Responsive Account Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 pb-6">
            {wallets.map(w => {
              const bal = balancesById[w.id] ?? balancesByName[w.name.toLowerCase()] ?? 0
              return (
                <div
                  key={w.id}
                  onClick={() => setEditWallet({ id: w.id, name: w.name, icon: w.icon || getWalletIcon(w.name) })}
                  className="p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer active:scale-98 transition-all relative group"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                      <IconRenderer icon={w.icon || getWalletIcon(w.name)} size="w-4.5 h-4.5" />
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setBudgetsOpen(false)
                          setTimeout(() => {
                            setCorrectWallet({ id: w.id, name: w.name, icon: w.icon || getWalletIcon(w.name), currentBalance: bal })
                            setCorrectTargetBalance(String(bal))
                            setCorrectNote("")
                          }, 300)
                        }}
                        className="flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-1 rounded-full active:scale-95 transition-all"
                        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                        title="Koreksi Saldo"
                      >
                        <Scale size={11} />
                        <span>Adjust</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Delete account "${w.name}"?`)) deleteWallet.mutate(w.id) }}
                        className="w-6 h-6 flex items-center justify-center rounded-full active:scale-95"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>
                      {w.name}
                    </p>
                    <p className="amount text-[12.5px] font-extrabold mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      {formatRupiah(bal)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Balance Correction Sheet */}
      <BottomSheet isOpen={!!correctWallet} onClose={() => { if (!isSavingCorrection) setCorrectWallet(null) }}>
        <div className="p-5 pb-10 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
              <IconRenderer icon={correctWallet?.icon || "/icons/wallet.png"} size="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight" style={{ color: "var(--text-primary)" }}>
                Adjust Balance ({correctWallet?.name})
              </h3>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Current Balance: <span className="amount font-bold text-[var(--text-primary)]">{formatRupiah(correctWallet?.currentBalance || 0)}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Actual / Correct Balance (IDR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={correctTargetBalance ? formatRupiah(Number(correctTargetBalance)) : ""}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g, "")
                setCorrectTargetBalance(raw)
              }}
              placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Difference Preview */}
          {correctWallet && (
            <div className="p-3.5 rounded-2xl flex items-center justify-between"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <span className="text-[12px] font-bold" style={{ color: "var(--text-tertiary)" }}>Adjustment Delta:</span>
              <span className="amount text-[13px] font-extrabold" style={{
                color: (Number(correctTargetBalance || 0) - correctWallet.currentBalance) > 0 ? "var(--text-primary)" : (Number(correctTargetBalance || 0) - correctWallet.currentBalance) < 0 ? "#ef4444" : "var(--text-tertiary)"
              }}>
                {(Number(correctTargetBalance || 0) - correctWallet.currentBalance) > 0 ? "+" : ""}
                {formatRupiah(Number(correctTargetBalance || 0) - correctWallet.currentBalance)}
                {" "}
                <span className="text-[10px] font-bold uppercase">
                  {(Number(correctTargetBalance || 0) - correctWallet.currentBalance) > 0 ? "(+)" : (Number(correctTargetBalance || 0) - correctWallet.currentBalance) < 0 ? "(-)" : "(No Change)"}
                </span>
              </span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              value={correctNote}
              onChange={e => setCorrectNote(e.target.value)}
              placeholder="e.g. Balance correction"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>

          <button
            disabled={isSavingCorrection}
            onClick={() => {
              if (!correctWallet || isSavingCorrection) return
              const target = Number(correctTargetBalance || 0)
              const diff = target - correctWallet.currentBalance
              if (diff === 0) {
                setCorrectWallet(null)
                showToast("No balance change", "update", () => {})
                return
              }

              setIsSavingCorrection(true)
              const matchingWallet = wallets.find(w => w.id === correctWallet.id || w.name.toLowerCase() === correctWallet.name.toLowerCase())
              const isValidUuid = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
              const walletIdToSave = isValidUuid(matchingWallet?.id) ? matchingWallet!.id : null

              const isPositive = diff > 0
              const noteToSave = correctNote.trim()
                ? `Correction (${isPositive ? "+" : "-"}) ${correctWallet.name}: ${correctNote.trim()}`
                : `Correction (${isPositive ? "+" : "-"}) ${correctWallet.name}`

              addTx.mutate({
                type: "adjustment",
                amount: Math.abs(diff),
                wallet_id: walletIdToSave,
                note: noteToSave,
                occurred_on: format(new Date(), "yyyy-MM-dd"),
                created_at: new Date().toISOString(),
                category_id: null
              }, {
                onSuccess: () => {
                  setIsSavingCorrection(false)
                  setCorrectWallet(null)
                  showToast(`Balance corrected to ${formatRupiah(target)}`, "update", () => {})
                },
                onError: (err: any) => {
                  setIsSavingCorrection(false)
                  console.error("Balance correction error:", err)
                  showToast(err?.message || "Failed to adjust balance", "delete", () => {})
                }
              })
            }}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {isSavingCorrection ? "Saving Correction..." : "Save Correction"}
          </button>
        </div>
      </BottomSheet>

      {/* Edit Account Modal */}
      <BottomSheet isOpen={!!editWallet} onClose={() => setEditWallet(null)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Edit Account</h3>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
              <IconRenderer icon={editWallet?.icon || getWalletIcon(editWallet?.name || "")} size="w-6 h-6" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Account Name
            </label>
            <input
              type="text"
              value={editWallet?.name || ""}
              onChange={e => setEditWallet(prev => prev ? { ...prev, name: e.target.value } : null)}
              placeholder="Account Name"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[14px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>

          <button
            onClick={() => {
              if (!editWallet?.name.trim()) return
              updateWallet.mutate({
                id: editWallet.id,
                name: editWallet.name.trim(),
                icon: editWallet.icon || getWalletIcon(editWallet.name)
              }, {
                onSuccess: () => {
                  setEditWallet(null)
                  showToast("Account updated", "update", () => {})
                }
              })
            }}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Changes
          </button>
        </div>
      </BottomSheet>

      {/* Add Account Modal with Available Defaults & Custom Creator */}
      <BottomSheet isOpen={addBudgetOpen} onClose={() => setAddBudgetOpen(false)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Account</h3>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
              <IconRenderer icon={budgetName.trim() ? getWalletIcon(budgetName) : "/icons/Budgets/custom.png"} size="w-6 h-6" />
            </div>
          </div>

          {/* Section 1: Quick Add Available Default Accounts */}
          {availableDefaultWallets.length > 0 && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider mb-2 block px-1" style={{ color: "var(--text-tertiary)" }}>
                Available Preset Accounts ({availableDefaultWallets.length})
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto p-1.5 rounded-2xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                {availableDefaultWallets.map(name => {
                  const icon = getWalletIcon(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        addWallet.mutate({ name, icon }, {
                          onSuccess: () => {
                            setAddBudgetOpen(false)
                            showToast(`${name} added`, "add", () => {})
                          }
                        })
                        triggerHaptic("medium")
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl active:scale-95 transition-all text-left"
                      style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-elevated)" }}>
                        <IconRenderer icon={icon} size="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section 2: Create Custom Account */}
          <div className="pt-2 border-t border-[var(--glass-border)] space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider block px-1" style={{ color: "var(--text-tertiary)" }}>
              Or Create Custom Account
            </label>
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--glass-fill)" }}>
                <IconRenderer icon="/icons/Budgets/custom.png" size="w-6 h-6" />
              </div>
              <input
                type="text"
                value={budgetName}
                onChange={e => setBudgetName(e.target.value)}
                placeholder="Account Name (e.g. Tabungan, Dompet Saku)"
                className="w-full bg-transparent outline-none font-semibold text-[14px]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <button
              onClick={handleSaveBudget}
              className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              Save Custom Account
            </button>
          </div>
        </div>
      </BottomSheet>
      
      {/* Shortcuts Modal */}
      <BottomSheet isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)}>
        <div className="p-5 pb-12 space-y-4">
          <div className="flex items-center justify-between sticky top-0 bg-transparent z-10 pb-2">
            <div>
              <div className="flex justify-between items-center w-full"><h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Quick-Add Shortcuts</h3><button onClick={() => { setShortcutsOpen(false); setTimeout(() => setAddShortcutOpen(true), 300) }} className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Plus size={16} /></button></div>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Tap chips on transaction form for fast entry</p>
            </div>
          </div>
          <div className="space-y-2">
            {shortcuts.map(s => (
              <div key={s.id} className="p-3 rounded-2xl flex items-center justify-between" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div>
                  <p className="font-bold text-[13px]">{s.title}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{formatRupiah(s.amount)}</p>
                </div>
                <button onClick={() => deleteShortcut(s.id)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: "#ef4444" }}><Trash2 size={14} /></button>
              </div>
            ))}
            {shortcuts.length === 0 && <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>No shortcuts yet. (Default ones apply if cleared)</p>}
          </div>
        </div>
      </BottomSheet>

      
      {/* Add Shortcut Sheet */}
      <BottomSheet isOpen={addShortcutOpen} onClose={() => setAddShortcutOpen(false)}>
        <div className="p-5 pb-12 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Shortcut</h3>
          
          <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["expense", "income"] as const).map(t => (
              <button key={t} onClick={() => setShortcutType(t)}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: shortcutType === t ? "var(--accent)" : "transparent", color: shortcutType === t ? "var(--accent-ink)" : "var(--text-tertiary)" }}>
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Shortcut Title & Emoji</label>
            <input type="text" value={shortcutTitle} onChange={e => setShortcutTitle(e.target.value)} placeholder="e.g. ☕ Coffee"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[15px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>Nominal Amount (IDR)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={shortcutAmount ? formatRupiah(Number(shortcutAmount)) : ""}
              onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setShortcutAmount(raw) }} placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          </div>
          
          
          <div>
            <div className="flex justify-between items-end mb-1.5 px-1">
              <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>Category</label>
              <button onClick={() => setShortcutMoreCatOpen(true)} className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95" style={{ color: "var(--text-secondary)" }}>
                More <MoreHorizontal size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-1">
              {categories.filter(c => c.type === shortcutType).slice(0, 3).map(cat => (
                <button key={cat.id} onClick={() => setShortcutCategoryId(cat.id)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: shortcutCategoryId === cat.id ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: shortcutCategoryId === cat.id ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)"
                  }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: shortcutCategoryId === cat.id ? "transparent" : "var(--glass-fill)" }}>
                    <IconRenderer icon={cat.emoji} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold truncate leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5 px-1">
              <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-tertiary)" }}>Account / Wallet</label>
              <button onClick={() => setShortcutMoreWalletOpen(true)} className="text-[11px] font-extrabold flex items-center gap-0.5 active:scale-95" style={{ color: "var(--text-secondary)" }}>
                More <MoreHorizontal size={12} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-1">
              {wallets.slice(0, 3).map(w => (
                <button key={w.id} onClick={() => setShortcutWalletId(w.id)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: shortcutWalletId === w.id ? "var(--glass-fill-strong)" : "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: shortcutWalletId === w.id ? "1.5px solid var(--accent)" : "1px solid var(--glass-border)"
                  }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: shortcutWalletId === w.id ? "transparent" : "var(--glass-fill)" }}>
                    <IconRenderer icon={w.icon} size="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold truncate leading-tight">{w.name}</span>
                </button>
              ))}
            </div>
          </div>
          
<button onClick={() => {
            if (!shortcutTitle || !shortcutAmount || !shortcutCategoryId || !shortcutWalletId) {
              showToast("Please fill all fields", "delete", () => {});
              return;
            }
            saveShortcut({
              id: Date.now().toString(),
              title: shortcutTitle,
              amount: Number(shortcutAmount),
              type: shortcutType,
              note: shortcutTitle.replace(/[🌀-🧿]/gu, '').trim(), // Remove emojis from note if any
              category_id: shortcutCategoryId,
              wallet_id: shortcutWalletId
            });
            setAddShortcutOpen(false);
            setShortcutTitle("");
            setShortcutAmount("");
            setShortcutCategoryId("");
            setShortcutWalletId("");
            showToast("Shortcut added", "add", () => {});
          }} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95 shadow-lg mt-2"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Save Shortcut</button>
        </div>
      </BottomSheet>


      {/* Shortcut More Categories Sheet */}
      <BottomSheet isOpen={shortcutMoreCatOpen} onClose={() => setShortcutMoreCatOpen(false)}>
        <div className="p-5 pb-12">
          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Category</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {categories.filter(c => c.type === shortcutType).map(cat => {
              const isSelected = shortcutCategoryId === cat.id
              return (
                <button key={cat.id} onClick={() => { setShortcutCategoryId(cat.id); setShortcutMoreCatOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={cat.emoji} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* Shortcut More Wallets Sheet */}
      <BottomSheet isOpen={shortcutMoreWalletOpen} onClose={() => setShortcutMoreWalletOpen(false)}>
        <div className="p-5 pb-12">
          <h3 className="font-extrabold text-lg mb-3" style={{ color: "var(--text-primary)" }}>Select Account</h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
            {wallets.map(w => {
              const isSelected = shortcutWalletId === w.id
              return (
                <button key={w.id} onClick={() => { setShortcutWalletId(w.id); setShortcutMoreWalletOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: isSelected ? "var(--glass-fill-strong)" : "transparent",
                    color: "var(--text-primary)",
                    border: isSelected ? "1.5px solid rgba(255, 255, 255, 0.45)" : "1px solid transparent"
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isSelected ? "rgba(255, 255, 255, 0.18)" : "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                    <IconRenderer icon={w.icon} size="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-center line-clamp-1">{w.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      <GoalDetailModal goal={selectedGoalSetting} isOpen={!!selectedGoalSetting} onClose={() => setSelectedGoalSetting(null)} onDeposit={depositToGoal} onUpdate={updateGoal} onDelete={deleteGoal} />
    </div>
  )
}

