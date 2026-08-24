const fs = require("fs");

let content = fs.readFileSync("src/pages/TransactionsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Add imports
if (!content.includes("usePullToRefresh")) {
  content = `import { usePullToRefresh } from "../hooks/usePullToRefresh"\nimport { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator"\n` + content;
}

// Add hook
const targetHook = 'export function TransactionsPage() {';
const hookCode = `export function TransactionsPage() {
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
`;

// Replace hook declarations
content = content.replace(
  /export function TransactionsPage\(\) \{[\s\S]*?const \{ data: categories = \[\] \} = useCategories\(\)/,
  hookCode
);

// Add indicator to JSX root
content = content.replace(
  'return (\n    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>',
  'return (\n    <div className="min-h-screen relative" style={{ background: "var(--bg-base)" }}>\n      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} threshold={threshold} />'
);

fs.writeFileSync("src/pages/TransactionsPage.tsx", content, "utf8");
console.log("Updated TransactionsPage.tsx with PullToRefresh");
