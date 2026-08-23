const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// 1. Add useBudgetTarget import if missing
if (!content.includes("useBudgetTarget")) {
  content = 'import { useBudgetTarget } from "../hooks/useBudgetTarget"\n' + content;
}

// 2. Add budgetTarget to component
if (!content.includes("const { budgetTarget } = useBudgetTarget()")) {
  content = content.replace(
    'const [monthOffset, setMonthOffset] = useState(0)',
    'const [monthOffset, setMonthOffset] = useState(0)\n  const { budgetTarget } = useBudgetTarget()'
  );
}

// 3. String-based ISO date bounds for rangeTxs
const oldRangeTxsRegex = /\/\/ 1\. Filter by range[\s\S]*?\}, \[allTxs, range, monthOffset\]\)/;

const newRangeTxsCode = `// 1. Filter by range with exact ISO string boundaries
  const rangeTxs = useMemo(() => {
    let startStr: string
    let endStr: string
    if (range === "week") {
      startStr = format(subDays(now, 6), "yyyy-MM-dd")
      endStr = format(now, "yyyy-MM-dd")
    } else if (range === "month") {
      const targetMonth = subMonths(now, monthOffset)
      startStr = format(startOfMonth(targetMonth), "yyyy-MM-dd")
      endStr = format(endOfMonth(targetMonth), "yyyy-MM-dd")
    } else if (range === "year") {
      startStr = format(startOfYear(now), "yyyy-MM-dd")
      endStr = format(endOfYear(now), "yyyy-MM-dd")
    } else {
      // All time
      return allTxs
    }
    return allTxs.filter(t => {
      if (!t.occurred_on) return false
      return t.occurred_on >= startStr && t.occurred_on <= endStr
    })
  }, [allTxs, range, monthOffset])`;

content = content.replace(oldRangeTxsRegex, newRangeTxsCode);

// 4. Context-aware Health Score
const oldHealthScoreRegex = /const healthScore = useMemo\(\(\) => \{[\s\S]*?\}, \[totalIncome, totalExpense\]\)/;

const newHealthScoreCode = `const healthScore = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return 85

    if (range === "week") {
      // Weekly benchmark based on weekly budget (budgetTarget / 4)
      const weeklyBudget = Math.max(500000, budgetTarget / 4)
      if (totalIncome > 0) {
        const ratio = totalExpense / totalIncome
        if (ratio <= 0.4) return Math.min(100, Math.round(92 + (0.4 - ratio) * 20))
        if (ratio <= 0.8) return Math.round(80 + (0.8 - ratio) * 30)
        if (ratio <= 1.0) return Math.round(65 + (1.0 - ratio) * 75)
        return Math.max(20, Math.round(60 - (ratio - 1.0) * 40))
      } else {
        // Normal weekly spending evaluation against budget
        const usage = totalExpense / weeklyBudget
        if (usage <= 0.4) return Math.min(98, Math.round(90 + (0.4 - usage) * 20))
        if (usage <= 0.8) return Math.round(80 + (0.8 - usage) * 25)
        if (usage <= 1.0) return Math.round(68 + (1.0 - usage) * 60)
        if (usage <= 1.4) return Math.round(45 - (usage - 1.0) * 40)
        return Math.max(20, Math.round(30 - Math.min(15, (usage - 1.4) * 10)))
      }
    }

    if (range === "month") {
      if (totalIncome > 0) {
        const ratio = totalExpense / totalIncome
        if (ratio <= 0.3) return Math.min(100, Math.round(95 + (0.3 - ratio) * 16))
        if (ratio <= 0.6) return Math.round(85 + (0.6 - ratio) * 33)
        if (ratio <= 0.9) return Math.round(70 + (0.9 - ratio) * 50)
        if (ratio <= 1.0) return Math.round(60 + (1.0 - ratio) * 100)
        if (ratio <= 1.3) return Math.round(45 - (ratio - 1.0) * 50)
        return Math.max(15, Math.round(30 - Math.min(15, (ratio - 1.3) * 10)))
      } else {
        const usage = totalExpense / (budgetTarget || 5000000)
        if (usage <= 0.5) return Math.min(95, Math.round(85 + (0.5 - usage) * 20))
        if (usage <= 0.8) return Math.round(75 + (0.8 - usage) * 33)
        if (usage <= 1.0) return Math.round(60 + (1.0 - usage) * 75)
        return Math.max(20, Math.round(45 - (usage - 1.0) * 35))
      }
    }

    // Year or All Time
    if (totalIncome > 0) {
      const ratio = totalExpense / totalIncome
      if (ratio <= 0.5) return Math.min(100, Math.round(92 + (0.5 - ratio) * 16))
      if (ratio <= 0.8) return Math.round(80 + (0.8 - ratio) * 40)
      if (ratio <= 1.0) return Math.round(65 + (1.0 - ratio) * 75)
      return Math.max(20, Math.round(50 - (ratio - 1.0) * 40))
    }
    return 75
  }, [range, totalIncome, totalExpense, budgetTarget])`;

content = content.replace(oldHealthScoreRegex, newHealthScoreCode);

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Updated StatisticsPage.tsx with context-aware weekly and monthly health score");
