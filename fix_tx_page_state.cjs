const fs = require("fs");

let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8").replace(/\r\n/g, "\n");

const oldTop = `export function TransactionsPage() {
  const { data: allTxs = [], isLoading, refetch: refetchTxs } = useAllTransactions()
  const { data: wallets = [], refetch: refetchWallets } = useWallets()
  const { data: categories = [], refetch: refetchCategories } = useCategories()

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetchTxs(),
        refetchWallets(),
        refetchCategories(),
      ])
    }
  })

  const { data: wallets = [] } = useWallets()`;

const newTop = `export function TransactionsPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRangeType>("this_month")
  const [selectedCustomMonth, setSelectedCustomMonth] = useState<string>(format(new Date(), "yyyy-MM"))
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear())
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [accountPickerOpen, setAccountPickerOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [visibleCount, setVisibleCount] = useState(25)

  const { data: allTxs = [], isLoading, refetch: refetchTxs } = useAllTransactions()
  const { data: wallets = [], refetch: refetchWallets } = useWallets()
  const { data: categories = [], refetch: refetchCategories } = useCategories()

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetchTxs(),
        refetchWallets(),
        refetchCategories(),
      ])
    }
  })`;

content = content.replace(oldTop, newTop);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Fixed state in TransactionsPage.tsx");
