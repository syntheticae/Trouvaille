const fs = require("fs");

// 1. Fix BalanceCard.tsx
let bc = fs.readFileSync("src/components/ui/BalanceCard.tsx", "utf8").replace(/\r\n/g, "\n");
const oldBcInit = `  const { items, accounts, totalAssets, isEmpty } = useMemo(() => {
    // 1. Initialize Map strictly from user's active wallets`;

const newBcInit = `  const { items, accounts, totalAssets, isEmpty } = useMemo(() => {
    // 1. Initialize Map strictly from user's active wallets
    const walletMap = new Map<string, { id: string; name: string; icon: string; balance: number; inflow: number; outflow: number }>()`;

bc = bc.replace(oldBcInit, newBcInit);
fs.writeFileSync("src/components/ui/BalanceCard.tsx", bc, "utf8");
console.log("Fixed BalanceCard.tsx walletMap definition");

// 2. Fix HomePage.tsx
let hp = fs.readFileSync("src/pages/HomePage.tsx", "utf8").replace(/\r\n/g, "\n");

// Replace top hooks in HomePage component
const oldHpHooks = `export function HomePage({ onOpenAdd: _onOpenAdd }: HomePageProps) {
  const now = new Date()
  const { session } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [stockRange, setStockRange] = useState<StockRange>("1W")
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem("trouvaille_hide_balance") === "true")

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev
      localStorage.setItem("trouvaille_hide_balance", String(next))
      triggerHaptic("medium")
      return next
    })
  }

  const upcomingBills = useUpcomingBills()
  const { budgetTarget } = useBudgetTarget()
  const { data: allTxs = [] } = useAllTransactions()
  const { data: categories = [] } = useCategories()`;

const newHpHooks = `export function HomePage({ onOpenAdd: _onOpenAdd }: HomePageProps) {
  const now = new Date()
  const { session } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [stockRange, setStockRange] = useState<StockRange>("1W")
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem("trouvaille_hide_balance") === "true")

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev
      localStorage.setItem("trouvaille_hide_balance", String(next))
      triggerHaptic("medium")
      return next
    })
  }

  const upcomingBills = useUpcomingBills()
  const { budgetTarget } = useBudgetTarget()
  const { data: allTxs = [], refetch: refetchAllTxs } = useAllTransactions()
  const { data: categories = [], refetch: refetchCategories } = useCategories()
  const { refetch: refetchWallets } = useWallets()
  const { refetch: refetchBills } = useBills()
  const { goals } = useGoals()

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetchAllTxs(),
        refetchWallets(),
        refetchCategories(),
        refetchBills(),
      ])
    }
  })`;

hp = hp.replace(oldHpHooks, newHpHooks);
fs.writeFileSync("src/pages/HomePage.tsx", hp, "utf8");
console.log("Fixed HomePage.tsx hooks and PTR integration");
