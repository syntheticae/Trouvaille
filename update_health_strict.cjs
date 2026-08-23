const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Replace healthScore with strict cashflow-based formula
const oldHealthScoreRegex = /const healthScore = useMemo\(\(\) => \{[\s\S]*?\}, \[range, totalIncome, totalExpense, budgetTarget\]\)/;

const newHealthScoreCode = `const healthScore = useMemo(() => {
    // 1. Both 0 -> Neutral
    if (totalIncome === 0 && totalExpense === 0) return 80

    // 2. Outflow Only (No Inflow at all) -> Strictly Low / Deficit
    if (totalIncome === 0 && totalExpense > 0) {
      if (totalExpense > 5000000) return 15
      if (totalExpense > 2000000) return 20
      if (totalExpense > 1000000) return 25
      if (totalExpense > 500000) return 30
      return Math.max(20, Math.round(38 - (totalExpense / 500000) * 8))
    }

    // 3. Inflow Only (No Outflow) -> Near Perfect
    if (totalIncome > 0 && totalExpense === 0) return 99

    // 4. Inflow & Outflow exists -> Direct Cashflow Ratio
    const ratio = totalExpense / totalIncome

    // Heavy Deficit (Spent > 150% of income)
    if (ratio >= 1.5) return Math.max(15, Math.round(30 - Math.min(15, (ratio - 1.5) * 10)))
    // Moderate Deficit (Spent 100% - 150% of income)
    if (ratio > 1.0) return Math.round(45 - (ratio - 1.0) * 30)
    // Break-even (Spent ~100% of income)
    if (ratio >= 0.9) return Math.round(55 + (1.0 - ratio) * 50)
    // Healthy (Spent 60% - 90% of income)
    if (ratio >= 0.6) return Math.round(70 + (0.9 - ratio) * 40)
    // Very Healthy (Spent 30% - 60% of income)
    if (ratio >= 0.3) return Math.round(85 + (0.6 - ratio) * 40)
    // Super Surplus (Spent < 30% of income)
    return Math.min(99, Math.round(95 + (0.3 - ratio) * 13))
  }, [totalIncome, totalExpense])`;

content = content.replace(oldHealthScoreRegex, newHealthScoreCode);

// Update badge status text for low scores
content = content.replace(
  '{healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "Moderate"}',
  '{healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Moderate" : "Low"}'
);

// Clean up unused useBudgetTarget from StatisticsPage if no longer needed
content = content.replace('const { budgetTarget } = useBudgetTarget()\n', '');
content = content.replace('import { useBudgetTarget } from "../hooks/useBudgetTarget"\n', '');

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Updated StatisticsPage.tsx with strict cashflow-based health score");
