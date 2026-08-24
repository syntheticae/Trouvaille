const fs = require("fs");
let content = fs.readFileSync("src/pages/StatisticsPage.tsx", "utf8").replace(/\r\n/g, "\n");

// Update healthScore formula with true 0-100 scale
const oldHealthRegex = /const healthScore = useMemo\(\(\) => \{[\s\S]*?\}, \[totalIncome, totalExpense\]\)/;

const newHealthCode = `const healthScore = useMemo(() => {
    // 1. Both 0 -> Neutral / Idle
    if (totalIncome === 0 && totalExpense === 0) return 75

    // 2. Outflow Only (No Inflow at all -> Pure Deficit) -> 0 pts
    if (totalIncome === 0 && totalExpense > 0) {
      return 0
    }

    // 3. Inflow Only (No Outflow at all) -> 100 pts
    if (totalIncome > 0 && totalExpense === 0) return 100

    // 4. Both exist -> Direct Cashflow Ratio
    const ratio = totalExpense / totalIncome

    // Heavy Deficit: Spent > 150% of income -> 5 to 15 pts
    if (ratio >= 2.0) return 5
    if (ratio >= 1.5) return Math.max(5, Math.round(15 - (ratio - 1.5) * 20))

    // Moderate Deficit: Spent 100% - 150% of income -> 16 to 45 pts
    if (ratio > 1.0) return Math.round(45 - (ratio - 1.0) * 58)

    // Break-even to mild surplus: Spent 80% - 100% of income -> 50 to 68 pts
    if (ratio >= 0.8) return Math.round(50 + (1.0 - ratio) * 90)

    // Healthy Surplus: Spent 40% - 80% of income -> 70 to 88 pts
    if (ratio >= 0.4) return Math.round(70 + (0.8 - ratio) * 45)

    // Super Surplus: Spent < 40% of income -> 90 to 100 pts
    return Math.min(100, Math.round(90 + (0.4 - ratio) * 25))
  }, [totalIncome, totalExpense])`;

content = content.replace(oldHealthRegex, newHealthCode);

// Update status badge
content = content.replace(
  '{healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Moderate" : "Low"}',
  '{healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : healthScore >= 50 ? "Moderate" : healthScore >= 16 ? "Deficit" : "Critical"}'
);

fs.writeFileSync("src/pages/StatisticsPage.tsx", content, "utf8");
console.log("Updated StatisticsPage.tsx with pure 0-100 scale (0 for outflow-only)");
