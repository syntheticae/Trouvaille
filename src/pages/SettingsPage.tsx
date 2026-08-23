import { useState, useRef } from "react"
import {
  Plus, Trash2, Calendar as CalendarIcon, LogOut, ChevronRight,
  CreditCard, LayoutGrid, Target, Sun, Camera, User as UserIcon, RotateCcw,
  Bell, Archive, Edit2
} from "lucide-react"
import { useBills, useAddBill, useUpdateBill, useDeleteBill } from "../hooks/useBills"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { useCategories, useAddCategory, useDeleteCategory, useUpdateCategory } from "../hooks/useCategories"
import { useWallets, useAddWallet, useUpdateWallet, useDeleteWallet } from "../hooks/useWallets"
import { useGoals } from "../hooks/useGoals"
import { formatRupiah } from "../lib/utils"
import { BottomSheet } from "../components/ui/BottomSheet"
import { GlassDatePicker } from "../components/ui/GlassDatePicker"
import { format } from "date-fns"
import { supabase } from "../lib/supabase"
import { useAllTransactions } from "../hooks/useTransactions"
import { IconRenderer } from "../components/ui/IconRenderer"
import { ResetTransactionsSheet } from "../components/ui/ResetTransactionsSheet"
import { requestNotificationPermission } from "../lib/notifications"

export function SettingsPage() {
  const { data: bills = [] } = useBills()
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()
  const { goals, addGoal, deleteGoal, depositToGoal } = useGoals()
  const { data: allTxs = [] } = useAllTransactions()
  const { session } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()

  const addBill = useAddBill()
  const updateBill = useUpdateBill()
  const deleteBill = useDeleteBill()
  const addCategory = useAddCategory()
  const deleteCategory = useDeleteCategory()
  const updateCategory = useUpdateCategory()
  const addWallet = useAddWallet()
  const updateWallet = useUpdateWallet()
  const deleteWallet = useDeleteWallet()

  // Editing state
  const [editingBill, setEditingBill] = useState<{ id: string; title: string; amount: number | null; due_date: string; repeat_rule: "none" | "weekly" | "monthly" | "yearly" } | null>(null)
  const [editWallet, setEditWallet] = useState<{ id: string; name: string } | null>(null)
  const [editCategory, setEditCategory] = useState<{ id: string; name: string } | null>(null)

  // Modals state
  const [profileOpen, setProfileOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [budgetsOpen, setBudgetsOpen] = useState(false)
  const [addBudgetOpen, setAddBudgetOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [billSheetOpen, setBillSheetOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

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
  const [billTitle, setBillTitle] = useState("")
  const [billAmount, setBillAmount] = useState("")
  const [billDate, setBillDate] = useState<Date>(new Date())
  const [billRepeat, setBillRepeat] = useState<"none" | "weekly" | "monthly" | "yearly">("monthly")

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

  // Handle Image File Selection & Compression (Canvas 256x256)
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
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const base64 = canvas.toDataURL("image/jpeg", 0.85)
          setAvatarUrl(base64)
          localStorage.setItem("trouvaille_avatar", base64)
        }
        setIsUploading(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setAvatarUrl("")
    localStorage.removeItem("trouvaille_avatar")
  }

  const handleSaveProfile = async () => {
    try {
      await supabase.auth.updateUser({
        data: { display_name: displayName, avatar_url: avatarUrl }
      })
      if (avatarUrl) localStorage.setItem("trouvaille_avatar", avatarUrl)
      else localStorage.removeItem("trouvaille_avatar")
      
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
    setBillSheetOpen(true)
  }

  const handleOpenEditBill = (b: any) => {
    setEditingBill(b)
    setBillTitle(b.title || "")
    setBillAmount(b.amount ? String(b.amount) : "")
    setBillDate(b.due_date ? new Date(b.due_date) : new Date())
    setBillRepeat(b.repeat_rule || "monthly")
    setBillSheetOpen(true)
  }

  const handleSaveBill = () => {
    if (!billTitle) return
    const num = Number(billAmount)
    const payload = {
      title: billTitle,
      amount: num > 0 ? num : null,
      due_date: format(billDate, "yyyy-MM-dd"),
      repeat_rule: billRepeat
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
    if (!budgetName) return
    addWallet.mutate({
      name: budgetName,
      icon: "/icons/wallet.png"
    }, {
      onSuccess: () => {
        setAddBudgetOpen(false)
        setBudgetName("")
        showToast("Budget account added", "add", () => {})
      }
    })
  }

  const handleSaveCategory = () => {
    if (!catName) return
    addCategory.mutate({
      name: catName,
      emoji: "/icons/lainnya.png",
      type: catType
    }, {
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
      <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>Preferences & Account Controls</p>
      
      {/* Profile Card */}
      <section className="glass-surface p-4 rounded-[24px] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center relative shrink-0"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", boxShadow: "0 2px 8px var(--shadow-strength)" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={22} style={{ color: "var(--text-tertiary)" }} />
            )}
          </div>
          <div>
            <p className="font-extrabold text-[16px]" style={{ color: "var(--text-primary)" }}>{displayName}</p>
            <p className="text-[11px] truncate max-w-[170px]" style={{ color: "var(--text-tertiary)" }}>{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => setProfileOpen(true)}
          className="px-3.5 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-all"
          style={{ background: "var(--glass-fill-strong)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
        >
          Edit Profile
        </button>
      </section>

      {/* Financial Goals Overview */}
      <section className="glass-surface p-5 rounded-[24px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--glass-fill-strong)", color: "var(--text-primary)" }}>
              <Target size={16} />
            </div>
            <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
              Financial Goals
            </span>
          </div>
          <button
            onClick={() => setGoalsOpen(true)}
            className="text-[12px] font-bold flex items-center gap-1 active:scale-95"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage ({goals.length}) <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-2.5">
          {goals.slice(0, 2).map(goal => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
            return (
              <div key={goal.id} className="p-3.5 rounded-2xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span>{goal.icon}</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{goal.title}</span>
                  </div>
                  <span className="text-[12px] font-bold amount" style={{ color: "var(--text-primary)" }}>{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--bg-card)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--text-primary)" }} />
                </div>
                <div className="flex justify-between text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  <span>{formatRupiah(goal.currentAmount)}</span>
                  <span>Target: {formatRupiah(goal.targetAmount)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Main Settings Navigation */}
      <section className="glass-surface rounded-[24px] overflow-hidden">
        <button
          onClick={() => setBudgetsOpen(true)}
          className="w-full p-4 flex items-center justify-between active:bg-white/5 transition-colors text-left"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-fill-strong)", color: "var(--text-primary)" }}>
              <CreditCard size={18} />
            </div>
            <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>
              Manage Budgets ({wallets.length})
            </span>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
        </button>

        <button
          onClick={() => setCategoriesOpen(true)}
          className="w-full p-4 flex items-center justify-between active:bg-white/5 transition-colors text-left"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-fill-strong)", color: "var(--text-secondary)" }}>
              <LayoutGrid size={18} />
            </div>
            <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>
              Manage Categories ({categories.length})
            </span>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
        </button>

        <button
          onClick={handleExportCSV}
          className="w-full p-4 flex items-center justify-between active:bg-white/5 transition-colors text-left"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-fill-strong)", color: "var(--text-secondary)" }}>
              <LogOut size={18} className="rotate-90" />
            </div>
            <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>
              Export Data (CSV)
            </span>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
        </button>

        <button
          onClick={() => setResetOpen(true)}
          className="w-full p-4 flex items-center justify-between active:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <p className="font-bold text-[14px]" style={{ color: "#ef4444" }}>
                Reset Data Transaksi
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                Hapus transaksi per hari, minggu, bulan, atau tahun
              </p>
            </div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} />
        </button>
      </section>

      {/* Recurring Bills Management */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: "var(--text-tertiary)" }}>
              Recurring Bills
            </h2>
            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Tap any bill to edit details</p>
          </div>
          <button
            onClick={handleOpenAddBill}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md active:scale-95 transition-transform"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-2.5">
          {bills.map((b: any) => (
            <div
              key={b.id}
              onClick={() => handleOpenEditBill(b)}
              className="glass-surface p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  🧾
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[14px] truncate" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    <span className="capitalize">{b.repeat_rule}</span> · Due {b.due_date} · {formatRupiah(Number(b.amount || 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleOpenEditBill(b)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => {
                    showToast("Bill deleted", "delete", () => deleteBill.mutate(b.id))
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95"
                  style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {bills.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>
              No recurring bills registered.
            </p>
          )}
        </div>
      </section>

      {/* Push Notifications & Bill Reminders */}
      <section className="glass-surface p-4 rounded-[24px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
            <Bell size={18} />
          </div>
          <div>
            <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Bill Reminders</span>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Native iPhone notifications</p>
          </div>
        </div>
        <button
          onClick={async () => {
            const granted = await requestNotificationPermission()
            if (granted) {
              showToast("Bill reminders enabled!", "add", () => {})
            } else {
              showToast("Notification permission denied", "delete", () => {})
            }
          }}
          className="px-3.5 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-all"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Active
        </button>
      </section>

      {/* On-Device Persistent Storage */}
      <section className="glass-surface p-4 rounded-[24px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
            <Archive size={18} />
          </div>
          <div>
            <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>On-Device Storage</span>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{allTxs.length} records offline in iPhone (0ms load)</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("TROUVAILLE_OFFLINE_CACHE_V1")
            window.location.reload()
          }}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
        >
          Sync Now
        </button>
      </section>

      {/* Appearance */}
      <section className="glass-surface p-4 rounded-[24px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
            <Sun size={18} />
          </div>
          <div>
            <span className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>Light Appearance</span>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>High-contrast clean style</p>
          </div>
        </div>
        <label className="ios-toggle cursor-pointer">
          <input
            type="checkbox"
            checked={theme === "light"}
            onChange={toggleTheme}
          />
          <div className="ios-toggle-track"></div>
          <div className="ios-toggle-knob"></div>
        </label>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full p-4 rounded-[24px] font-bold text-[14px] flex items-center justify-center gap-2 active:scale-98 transition-transform"
        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444" }}
      >
        <LogOut size={16} /> Sign Out
      </button>

      {/* ============================================================ */}
      {/* BOTTOM SHEETS / MODALS */}
      {/* ============================================================ */}

      {/* 1. Profile Sheet with Photo Upload */}
      <BottomSheet isOpen={profileOpen} onClose={() => setProfileOpen(false)}>
        <div className="p-5 pb-10 space-y-5">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Edit Profile</h3>
          
          {/* Avatar Preview & Upload Controls */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-24 h-24 rounded-full overflow-hidden relative flex items-center justify-center shadow-lg"
              style={{ background: "var(--bg-elevated)", border: "2px solid var(--glass-border)" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={36} style={{ color: "var(--text-tertiary)" }} />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs text-white font-bold">
                  Loading...
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full text-[12px] font-bold flex items-center gap-1.5 active:scale-95"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                <Camera size={14} /> Upload Photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-2 rounded-full text-[12px] font-bold active:scale-95"
                  style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-bold mb-1.5 block" style={{ color: "var(--text-tertiary)" }}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full p-3.5 rounded-2xl outline-none font-semibold"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] shadow-lg active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Profile
          </button>
        </div>
      </BottomSheet>

      {/* 2. Financial Goals Sheet */}
      <BottomSheet isOpen={goalsOpen} onClose={() => setGoalsOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Financial Goals</h3>
            <button
              onClick={() => { setGoalsOpen(false); setAddGoalOpen(true) }}
              className="px-3 py-1.5 rounded-full font-bold text-[12px] flex items-center gap-1"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <Plus size={14} /> New Goal
            </button>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {goals.map(goal => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              return (
                <div key={goal.id} className="p-4 rounded-2xl space-y-2"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{goal.icon}</span>
                      <span className="font-bold text-[15px]" style={{ color: "var(--text-primary)" }}>{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const amt = prompt("Deposit amount (IDR):", "500000")
                          if (amt) depositToGoal(goal.id, Number(amt))
                        }}
                        className="px-2.5 py-1 rounded-full font-bold text-[11px]"
                        style={{ background: "var(--glass-fill-strong)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
                      >
                        + Deposit
                      </button>
                      <button onClick={() => deleteGoal(goal.id)} className="p-1" style={{ color: "#ef4444" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--bg-card)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                    <span>Saved: {formatRupiah(goal.currentAmount)} ({pct}%)</span>
                    <span>Target: {formatRupiah(goal.targetAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      {/* 3. Add Goal Sheet */}
      <BottomSheet isOpen={addGoalOpen} onClose={() => setAddGoalOpen(false)}>
        <div className="p-5 pb-10 space-y-3.5">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Create New Goal</h3>
          
          <div className="flex gap-2">
            {["🎯", "💻", "✈️", "🚗", "🏠", "🛡️"].map(ico => (
              <button
                key={ico}
                onClick={() => setGoalIcon(ico)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  goalIcon === ico ? "scale-105" : ""
                }`}
                style={{
                  background: goalIcon === ico ? "var(--accent)" : "var(--bg-elevated)",
                  border: `1px solid ${goalIcon === ico ? "transparent" : "var(--glass-border)"}`
                }}
              >
                {ico}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={goalTitle}
            onChange={e => setGoalTitle(e.target.value)}
            placeholder="Goal Title (e.g. Dream Trip)"
            className="w-full p-3.5 rounded-2xl outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          />
          <input
            type="number"
            value={goalTarget}
            onChange={e => setGoalTarget(e.target.value)}
            placeholder="Target Amount (IDR)"
            className="w-full p-3.5 rounded-2xl outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          />
          <input
            type="number"
            value={goalSaved}
            onChange={e => setGoalSaved(e.target.value)}
            placeholder="Initial Saved Amount (optional)"
            className="w-full p-3.5 rounded-2xl outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          />

          <button
            onClick={handleSaveGoal}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] mt-2 shadow-lg active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Goal
          </button>
        </div>
      </BottomSheet>

      {/* 4. Manage Budgets Sheet */}
      <BottomSheet isOpen={budgetsOpen} onClose={() => setBudgetsOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Manage Budgets</h3>
            <button onClick={() => setAddBudgetOpen(true)}
              className="px-3 py-1.5 rounded-full font-bold text-[12px] flex items-center gap-1"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {wallets.map(w => (
              <div key={w.id} className="p-3.5 rounded-2xl flex items-center gap-3"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                  <IconRenderer icon={w.icon} size="w-5 h-5" />
                </div>
                <span className="font-bold text-[14px] flex-1 truncate" style={{ color: "var(--text-primary)" }}>{w.name}</span>
                <button onClick={() => setEditWallet({ id: w.id, name: w.name })}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--glass-fill-strong)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
                  Rename
                </button>
                <button onClick={() => {
                  if (confirm(`Delete "${w.name}"? Transactions linked to it will remain.`)) {
                    deleteWallet.mutate(w.id, { onSuccess: () => showToast(`${w.name} removed`, "delete", () => {}) })
                  }
                }} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90"
                  style={{ color: "#ef4444" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* 4b. Rename Wallet Sheet */}
      <BottomSheet isOpen={!!editWallet} onClose={() => setEditWallet(null)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Rename Budget</h3>
          <input type="text" value={editWallet?.name || ""}
            onChange={e => setEditWallet(prev => prev ? { ...prev, name: e.target.value } : null)}
            className="w-full p-3.5 rounded-2xl outline-none font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          <button onClick={() => {
            if (!editWallet?.name.trim()) return
            updateWallet.mutate({ id: editWallet.id, name: editWallet.name.trim() }, {
              onSuccess: () => { setEditWallet(null); showToast("Renamed successfully", "update", () => {}) }
            })
          }} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            Save
          </button>
        </div>
      </BottomSheet>

      {/* 5. Add Budget Sheet */}
      <BottomSheet isOpen={addBudgetOpen} onClose={() => setAddBudgetOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Budget Account</h3>
          <input
            type="text"
            value={budgetName}
            onChange={e => setBudgetName(e.target.value)}
            placeholder="Budget Name (e.g. Bank Central, Crypto Wallet)"
            className="w-full p-3.5 rounded-2xl outline-none font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          />
          <button
            onClick={handleSaveBudget}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] shadow-lg active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Budget
          </button>
        </div>
      </BottomSheet>

      {/* 6. Manage Categories Sheet */}
      <BottomSheet isOpen={categoriesOpen} onClose={() => setCategoriesOpen(false)}>
        <div className="p-5 pb-16 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Manage Categories</h3>
            <button onClick={() => setAddCatOpen(true)}
              className="px-3 py-1.5 rounded-full font-bold text-[12px] flex items-center gap-1"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {categories.map(cat => (
              <div key={cat.id} className="p-3 rounded-2xl flex items-center gap-2.5"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                  <IconRenderer icon={cat.emoji} size="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>{cat.name}</p>
                  <p className="text-[10px] capitalize font-semibold" style={{ color: "var(--text-tertiary)" }}>{cat.type}</p>
                </div>
                <button onClick={() => setEditCategory({ id: cat.id, name: cat.name })}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: "var(--glass-fill-strong)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
                  Rename
                </button>
                <button onClick={() => {
                  if (confirm(`Delete "${cat.name}"?`)) {
                    deleteCategory.mutate(cat.id, { onSuccess: () => showToast(`${cat.name} removed`, "delete", () => {}) })
                  }
                }} className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ color: "#ef4444" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* 6b. Rename Category Sheet */}
      <BottomSheet isOpen={!!editCategory} onClose={() => setEditCategory(null)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Rename Category</h3>
          <input type="text" value={editCategory?.name || ""}
            onChange={e => setEditCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
            className="w-full p-3.5 rounded-2xl outline-none font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
          <button onClick={() => {
            if (!editCategory?.name.trim()) return
            updateCategory.mutate({ id: editCategory.id, name: editCategory.name.trim(), emoji: categories.find(c => c.id === editCategory.id)?.emoji || "/icons/lainnya.png" }, {
              onSuccess: () => { setEditCategory(null); showToast("Category renamed", "update", () => {}) }
            })
          }} className="w-full py-4 rounded-[20px] font-extrabold text-[15px] active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            Save
          </button>
        </div>
      </BottomSheet>

      {/* 7. Add Category Sheet */}
      <BottomSheet isOpen={addCatOpen} onClose={() => setAddCatOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>Add Category</h3>
          <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            {(["expense", "income"] as const).map(t => (
              <button
                key={t}
                onClick={() => setCatType(t)}
                className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all"
                style={{
                  background: catType === t ? "var(--accent)" : "transparent",
                  color: catType === t ? "var(--accent-ink)" : "var(--text-tertiary)"
                }}
              >
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            placeholder="Category Name"
            className="w-full p-3.5 rounded-2xl outline-none font-semibold"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
          />
          <button
            onClick={handleSaveCategory}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] shadow-lg active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Save Category
          </button>
        </div>
      </BottomSheet>

      {/* 8. Add/Edit Bill Sheet */}
      <BottomSheet isOpen={billSheetOpen} onClose={() => setBillSheetOpen(false)}>
        <div className="p-5 pb-10 space-y-4">
          <h3 className="font-extrabold text-lg" style={{ color: "var(--text-primary)" }}>
            {editingBill ? "Edit Recurring Bill" : "Add Recurring Bill"}
          </h3>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Bill Title
            </label>
            <input
              type="text"
              value={billTitle}
              onChange={e => setBillTitle(e.target.value)}
              placeholder="e.g. Netflix, Gym, Internet, Rent"
              className="w-full p-3.5 rounded-2xl outline-none font-semibold text-[15px]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Nominal Amount (IDR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={billAmount ? formatRupiah(Number(billAmount)) : ""}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g, "")
                setBillAmount(raw)
              }}
              placeholder="Rp 0"
              className="w-full p-3.5 rounded-2xl outline-none font-bold text-[16px] amount"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            />
          </div>
          
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Due Date
            </label>
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full p-3.5 rounded-2xl flex justify-between items-center"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            >
              <span className="font-medium text-sm">Due Date: {format(billDate, "dd MMM yyyy")}</span>
              <CalendarIcon size={18} style={{ color: "var(--accent)" }} />
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1" style={{ color: "var(--text-tertiary)" }}>
              Repeat Frequency
            </label>
            <div className="flex p-1 rounded-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
              {(["none", "weekly", "monthly", "yearly"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setBillRepeat(r)}
                  className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: billRepeat === r ? "var(--accent)" : "transparent",
                    color: billRepeat === r ? "var(--accent-ink)" : "var(--text-tertiary)"
                  }}
                >
                  {r === "none" ? "None" : r === "weekly" ? "Weekly" : r === "monthly" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleSaveBill}
            className="w-full py-4 rounded-[20px] font-extrabold text-[15px] shadow-lg active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {editingBill ? "Update Bill" : "Save Bill"}
          </button>
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
    </div>
  )
}
