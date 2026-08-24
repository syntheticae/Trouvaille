const fs = require("fs");

let content = fs.readFileSync("src/pages/HomePage.tsx", "utf8").replace(/\r\n/g, "\n");

// 1. Add imports
if (!content.includes("usePullToRefresh")) {
  content = `import { usePullToRefresh } from "../hooks/usePullToRefresh"\nimport { PullToRefreshIndicator } from "../components/ui/PullToRefreshIndicator"\nimport { useGoals } from "../hooks/useGoals"\nimport { useWallets } from "../hooks/useWallets"\nimport { useBills } from "../hooks/useBills"\nimport { CalendarDays, Target } from "lucide-react"\n` + content;
}

// 2. Add hooks to HomePage component
const hookTarget = 'export function HomePage({ onOpenAdd }: HomePageProps) {';
const hookAdditions = `export function HomePage({ onOpenAdd }: HomePageProps) {
  const { refetch: refetchAllTxs } = useAllTransactions()
  const { refetch: refetchWallets } = useWallets()
  const { refetch: refetchCategories } = useCategories()
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
  })
`;

content = content.replace(hookTarget, hookAdditions);

// 3. Add PullToRefreshIndicator right inside root JSX
content = content.replace(
  'return (\n    <div className="px-5 pt-3 pb-8 max-w-lg mx-auto">',
  'return (\n    <div className="px-5 pt-3 pb-8 max-w-lg mx-auto relative">\n      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} threshold={threshold} />'
);

// 4. Add Upcoming Bills Total Amount
const oldUpcomingMap = `<div className="text-right">
                    <p className="amount text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>{formatRupiah(Number(bill.amount))}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>`;

const newUpcomingMap = `<div className="text-right">
                    <p className="amount text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>{formatRupiah(Number(bill.amount))}</p>
                  </div>
                </div>
              )
            })}
            
            {/* Total Kebutuhan Tagihan */}
            <div
              className="p-3.5 rounded-2xl glass-surface flex items-center justify-between mt-2.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}>
                  <CalendarDays size={13} />
                </div>
                <span className="text-[12px] font-bold" style={{ color: "var(--text-tertiary)" }}>Total Kebutuhan Tagihan</span>
              </div>
              <span className="amount text-[14px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(upcomingBills.reduce((s: number, b: any) => s + Number(b.amount || 0), 0))}
              </span>
            </div>
          </div>
        </section>`;

content = content.replace(oldUpcomingMap, newUpcomingMap);

// 5. Add Financial Goals section before Upcoming Bills
const oldUpcomingSection = `{/* 6. UPCOMING BILLS (MOVED ABOVE CALENDAR) */}`;

const newGoalsSection = `{/* 5.5 FINANCIAL GOALS */}
      {goals.length > 0 && (
        <section className="mb-6">
          <div className="flex justify-between items-center px-1 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              Financial Goals
            </span>
            <span className="text-[11px] font-bold" style={{ color: "var(--text-tertiary)" }}>
              {goals.length} Target
            </span>
          </div>

          <div className="space-y-2.5">
            {goals.map((g: any) => {
              const pct = Math.min(100, Math.round((g.currentAmount / (g.targetAmount || 1)) * 100))
              return (
                <div
                  key={g.id}
                  className="p-4 rounded-[22px] glass-surface"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[15px]"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
                        <Target size={16} style={{ color: "var(--text-primary)" }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{g.title}</p>
                        <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                          {formatRupiah(g.currentAmount)} dari {formatRupiah(g.targetAmount)}
                        </p>
                      </div>
                    </div>
                    <span className="amount text-[12px] font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--glass-fill)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: \`\${pct}%\`, background: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 6. UPCOMING BILLS (MOVED ABOVE CALENDAR) */}`;

content = content.replace(oldUpcomingSection, newGoalsSection);

fs.writeFileSync("src/pages/HomePage.tsx", content, "utf8");
console.log("Updated HomePage.tsx: PTR, upcoming bills total, and financial goals card");
