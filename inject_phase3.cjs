const fs = require('fs');
const path = '/workspace/src/lib/financialMath.ts';
let content = fs.readFileSync(path, 'utf8');

// Phase III implementation functions to append
const phase3Functions = `
// ==========================================
// PHASE III: CASHFLOW INTELLIGENCE & STRUCTURE IMPLEMENTATION
// ==========================================

/**
 * Normalizes merchant/note string for clustering
 */
export function normalizeMerchantTitle(note?: string | null, categoryName?: string | null): string {
  if (!note || note.trim().length === 0) {
    return (categoryName || "Unknown").trim().toLowerCase()
  }
  return note
    .toLowerCase()
    .replace(/[0-9\\/.:,#]/g, " ")
    .replace(/\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|bulan|bln|tagihan|iuran|bayar|tf|trf|via)\\b/g, " ")
    .replace(/\\s+/g, " ")
    .trim()
}

/**
 * System #1: Deterministic Recurring Transaction Detection
 */
export function detectRecurringTransactions(
  transactions: Transaction[],
  bills: Bill[] = [],
  categories: Category[] = [],
  now = new Date()
): DetectedRecurringItem[] {
  const result: DetectedRecurringItem[] = []
  const catMap = new Map<string, Category>()
  categories.forEach(c => catMap.set(c.id, c))
  const catNameMap = new Map<string, Category>()
  categories.forEach(c => catNameMap.set(c.name.toLowerCase().trim(), c))

  // Filter valid transactions (exclude transfers and balance corrections)
  const validTxs = transactions.filter(t => 
    t.occurred_on && 
    t.type !== "transfer" && 
    !isCorrectionTx(t) &&
    Number(t.amount) > 0
  )

  // 1. Group by type and normalized title/category signature
  const clusters = new Map<string, Transaction[]>()
  validTxs.forEach(t => {
    const catName = t.categories?.name || (t.category_id ? catMap.get(t.category_id)?.name : null) || ""
    const normTitle = normalizeMerchantTitle(t.note, catName)
    const key = \`\${t.type}:\${normTitle || catName.toLowerCase()}\`
    
    if (!clusters.has(key)) {
      clusters.set(key, [])
    }
    clusters.get(key)!.push(t)
  })

  const billTitles = new Set(bills.map(b => b.title.toLowerCase().trim()))

  // 2. Evaluate each cluster with >= 2 transactions
  clusters.forEach((txList, key) => {
    if (txList.length < 2) return

    // Sort chronologically ascending
    const sorted = [...txList].sort((a, b) => (a.occurred_on || "").localeCompare(b.occurred_on || ""))
    const amounts = sorted.map(t => Number(t.amount || 0))
    const medianAmt = calculateMedian(amounts)
    if (medianAmt <= 0) return

    // Amount tolerance: At least 70% of occurrences must be within 0.70M - 1.30M
    const tolerancePassCount = amounts.filter(a => a >= medianAmt * 0.70 && a <= medianAmt * 1.30).length
    if (tolerancePassCount / amounts.length < 0.65) return

    // Calculate day intervals between consecutive occurrences
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1].occurred_on + "T00:00:00Z")
      const d2 = new Date(sorted[i].occurred_on + "T00:00:00Z")
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24))
      if (diffDays > 0) {
        intervals.push(diffDays)
      }
    }

    if (intervals.length === 0) return
    const medianInterval = calculateMedian(intervals)

    // Detect frequency based on median interval
    let frequency: RecurringFrequency | null = null
    let expectedDays = 30

    if (medianInterval >= 5 && medianInterval <= 9) {
      frequency = "weekly"
      expectedDays = 7
    } else if (medianInterval >= 12 && medianInterval <= 17) {
      frequency = "biweekly"
      expectedDays = 14
    } else if (medianInterval >= 25 && medianInterval <= 36) {
      frequency = "monthly"
      expectedDays = 30
    } else if (medianInterval >= 75 && medianInterval <= 105) {
      frequency = "quarterly"
      expectedDays = 90
    } else if (medianInterval >= 340 && medianInterval <= 390) {
      frequency = "yearly"
      expectedDays = 365
    }

    if (!frequency) return

    // Check interval variance
    const maxAllowedVariance = expectedDays * 0.35
    const varianceCount = intervals.filter(iv => Math.abs(iv - expectedDays) <= maxAllowedVariance).length
    if (varianceCount / intervals.length < 0.60) return

    // Extract metadata
    const latestTx = sorted[sorted.length - 1]
    const catName = latestTx.categories?.name || (latestTx.category_id ? catMap.get(latestTx.category_id)?.name : null) || "Lainnya"
    const catEmoji = latestTx.categories?.emoji || (latestTx.category_id ? catMap.get(latestTx.category_id)?.emoji : null) || "/icons/lainnya.png"
    const displayTitle = latestTx.note?.trim() || catName

    // Next expected date calculation
    const lastDate = new Date(latestTx.occurred_on + "T00:00:00Z")
    const nextDate = new Date(lastDate.getTime() + expectedDays * 24 * 3600 * 1000)
    const nextExpectedDate = nextDate.toISOString().slice(0, 10)

    // Check lifecycle status
    const daysSinceLast = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24))
    const isAlreadyInBills = billTitles.has(displayTitle.toLowerCase()) || billTitles.has(key.split(":")[1].toLowerCase())

    let status: RecurringStatus = "detected"
    if (isAlreadyInBills) {
      status = "confirmed"
    } else if (daysSinceLast > expectedDays * 2.2 + 10) {
      status = "inactive"
    }

    // Confidence scoring
    let confidence: RecurringConfidence = "moderate"
    if (sorted.length >= 4 && varianceCount / intervals.length >= 0.8) {
      confidence = "strong"
    } else if (sorted.length < 2) {
      confidence = "insufficient"
    }

    if (confidence === "insufficient") return

    const minAmount = Math.min(...amounts)
    const maxAmount = Math.max(...amounts)

    result.push({
      id: \`rec-\${key.replace(/[^a-z0-9]/g, "-")}-\${frequency}\`,
      title: displayTitle,
      normalizedMerchant: key.split(":")[1],
      categoryId: latestTx.category_id || null,
      categoryName: catName,
      categoryEmoji: catEmoji,
      walletId: latestTx.wallet_id || null,
      type: latestTx.type as "expense" | "income",
      frequency,
      typicalAmount: medianAmt,
      amountRange: [minAmount, maxAmount],
      confidence,
      occurrencesCount: sorted.length,
      lastOccurrenceDate: latestTx.occurred_on,
      nextExpectedDate,
      status,
      matchingTransactionIds: sorted.map(t => t.id),
      explanation: \`Recurring \${frequency} pattern observed across \${sorted.length} occurrences (~Rp \${medianAmt.toLocaleString("id-ID")}/\${frequency === "monthly" ? "mo" : frequency}).\`
    })
  })

  return result.sort((a, b) => b.typicalAmount - a.typicalAmount)
}

/**
 * Standard classification mapping of Trouvaille categories
 */
export const DEFAULT_CATEGORY_STRUCTURE: Record<string, ExpenseClassification> = {
  // Fixed / Committed
  "hunian": "fixed",
  "papan": "fixed",
  "asuransi": "fixed",
  "pendidikan": "fixed",
  "internet": "fixed",
  "subscription": "fixed",
  "zakat": "fixed",
  "pajak & legal": "fixed",

  // Variable (Essential Everyday)
  "makanan": "variable",
  "groceries": "variable",
  "transportasi": "variable",
  "bensin": "variable",
  "parkir": "variable",
  "kesehatan": "variable",
  "peralatan": "variable",
  "reparasi": "variable",
  "laundry": "variable",
  "keluarga": "variable",
  "pets": "variable",
  "admin & fee": "variable",
  "jasa": "variable",

  // Discretionary (Flexible Lifestyle)
  "hiburan": "discretionary",
  "cafe": "discretionary",
  "kopi": "discretionary",
  "minuman": "discretionary",
  "fashion": "discretionary",
  "perawatan": "discretionary",
  "liburan": "discretionary",
  "gadget": "discretionary",
  "olahraga": "discretionary",
  "hadiah": "discretionary",
  "donasi": "discretionary",
  "karir": "discretionary",
  "kerugian": "discretionary",
}

/**
 * System #2: Fixed / Variable / Discretionary Expense Structure Calculation
 */
export function calculateExpenseStructure(
  transactions: Transaction[],
  recurringItems: DetectedRecurringItem[] = [],
  overrides: Record<string, ExpenseClassification> = {},
  _now = new Date()
): ExpenseStructureResult {
  const expenseTxs = transactions.filter(t => t.type === "expense" && !isCorrectionTx(t))
  const totalExpense = expenseTxs.reduce((s, t) => s + Number(t.amount || 0), 0)

  // Map category totals
  const catMap = new Map<string, { categoryId: string; name: string; emoji: string; amount: number }>()
  
  expenseTxs.forEach(t => {
    const catId = t.category_id || "uncategorized"
    const name = t.categories?.name || "Lainnya"
    const emoji = t.categories?.emoji || "/icons/lainnya.png"
    const amt = Number(t.amount || 0)

    const ex = catMap.get(name.toLowerCase().trim())
    if (ex) {
      ex.amount += amt
    } else {
      catMap.set(name.toLowerCase().trim(), { categoryId: catId, name, emoji, amount: amt })
    }
  })

  const recurringCategoryNames = new Set(
    recurringItems
      .filter(r => r.type === "expense" && (r.status === "confirmed" || r.status === "detected"))
      .map(r => r.categoryName.toLowerCase().trim())
  )

  const items: ExpenseStructureCategoryItem[] = []
  let fixedAmount = 0
  let variableAmount = 0
  let discretionaryAmount = 0
  let unclassifiedAmount = 0

  catMap.forEach((data, catKey) => {
    let classification: ExpenseClassification = "unclassified"
    let isUserOverridden = false

    if (overrides[catKey]) {
      classification = overrides[catKey]
      isUserOverridden = true
    } else if (DEFAULT_CATEGORY_STRUCTURE[catKey]) {
      classification = DEFAULT_CATEGORY_STRUCTURE[catKey]
    } else if (recurringCategoryNames.has(catKey)) {
      classification = "fixed"
    } else {
      classification = "variable"
    }

    const pct = totalExpense > 0 ? Number(((data.amount / totalExpense) * 100).toFixed(1)) : 0

    if (classification === "fixed") fixedAmount += data.amount
    else if (classification === "variable") variableAmount += data.amount
    else if (classification === "discretionary") discretionaryAmount += data.amount
    else unclassifiedAmount += data.amount

    items.push({
      categoryId: data.categoryId,
      name: data.name,
      emoji: data.emoji,
      classification,
      amount: data.amount,
      percentage: pct,
      isUserOverridden
    })
  })

  // Mathematical invariant check
  const reconciledSum = fixedAmount + variableAmount + discretionaryAmount + unclassifiedAmount
  const reconciliationCheck = reconciledSum === totalExpense

  const fixedPct = totalExpense > 0 ? Number(((fixedAmount / totalExpense) * 100).toFixed(1)) : 0
  const varPct = totalExpense > 0 ? Number(((variableAmount / totalExpense) * 100).toFixed(1)) : 0
  const discPct = totalExpense > 0 ? Number(((discretionaryAmount / totalExpense) * 100).toFixed(1)) : 0
  const unclassPct = totalExpense > 0 ? Number(((unclassifiedAmount / totalExpense) * 100).toFixed(1)) : 0

  const committedAmount = fixedAmount
  const flexibleAmount = variableAmount + discretionaryAmount
  const committedPercentage = fixedPct
  const flexiblePercentage = Number((varPct + discPct).toFixed(1))

  return {
    totalExpense,
    fixedAmount,
    fixedPercentage: fixedPct,
    variableAmount,
    variablePercentage: varPct,
    discretionaryAmount,
    discretionaryPercentage: discPct,
    unclassifiedAmount,
    unclassifiedPercentage: unclassPct,
    committedAmount,
    flexibleAmount,
    committedPercentage,
    flexiblePercentage,
    items: items.sort((a, b) => b.amount - a.amount),
    reconciliationCheck
  }
}

/**
 * System #3: Cashflow Calendar & Cashflow Floor Calculation
 */
export function calculateCashflowFloor(
  currentLiquidBalance: number,
  bills: Bill[] = [],
  recurringItems: DetectedRecurringItem[] = [],
  horizonDays = 14,
  now = new Date()
): CashflowFloorResult {
  const dailyPoints: CashflowCalendarDayPoint[] = []
  let runningBalance = currentLiquidBalance
  let lowestBalance = currentLiquidBalance
  let lowestBalanceDate = now.toISOString().slice(0, 10)
  let daysUntilLowest = 0
  let upcomingCommitmentsTotal = 0
  let upcomingInflowsTotal = 0

  const todayStr = now.toISOString().slice(0, 10)
  const todayTime = new Date(todayStr + "T00:00:00Z").getTime()

  // Track bills and recurring items
  const unpaidBills = bills.filter(b => !b.is_paid && b.due_date)
  const activeRecurring = recurringItems.filter(r => r.status === "confirmed" || r.status === "detected")

  for (let offset = 0; offset < horizonDays; offset++) {
    const pointDate = new Date(todayTime + offset * 24 * 3600 * 1000)
    const dateStr = pointDate.toISOString().slice(0, 10)
    const isToday = offset === 0
    const dayOfMonth = pointDate.getUTCDate()
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][pointDate.getUTCDay()]
    const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][pointDate.getUTCMonth()]
    const dayLabel = \`\${dayName}, \${monthName} \${dayOfMonth}\`

    const knownInflowItems: Array<{ title: string; amount: number }> = []
    const knownOutflowItems: Array<{ title: string; amount: number; isBill: boolean }> = []

    // 1. Check unpaid bills due on dateStr
    unpaidBills.forEach(b => {
      if (b.due_date === dateStr) {
        const amt = Number(b.amount || 0)
        knownOutflowItems.push({ title: b.title, amount: amt, isBill: true })
      }
    })

    // 2. Check recurring items expected on dateStr (avoiding duplicate titles already in bills)
    activeRecurring.forEach(r => {
      if (r.nextExpectedDate === dateStr && !knownOutflowItems.some(o => o.title.toLowerCase() === r.title.toLowerCase())) {
        if (r.type === "expense") {
          knownOutflowItems.push({ title: r.title, amount: r.typicalAmount, isBill: false })
        } else if (r.type === "income") {
          knownInflowItems.push({ title: r.title, amount: r.typicalAmount })
        }
      }
    })

    const dayInflow = knownInflowItems.reduce((s, i) => s + i.amount, 0)
    const dayOutflow = knownOutflowItems.reduce((s, o) => s + o.amount, 0)
    const netDaily = dayInflow - dayOutflow

    upcomingInflowsTotal += dayInflow
    upcomingCommitmentsTotal += dayOutflow

    runningBalance += netDaily

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance
      lowestBalanceDate = dateStr
      daysUntilLowest = offset
    }

    dailyPoints.push({
      date: dateStr,
      dayLabel,
      dayOfMonth,
      isToday,
      isPast: false,
      knownInflow: dayInflow,
      knownInflowItems,
      knownOutflow: dayOutflow,
      knownOutflowItems,
      netDailyCashflow: netDaily,
      projectedBalance: runningBalance
    })
  }

  const netProjectedChange = runningBalance - currentLiquidBalance

  return {
    lowestBalance,
    lowestBalanceDate,
    daysUntilLowest,
    currentBalance: currentLiquidBalance,
    netProjectedChange,
    forecastDaysCount: horizonDays,
    dailyPoints,
    upcomingCommitmentsTotal,
    upcomingInflowsTotal
  }
}

/**
 * System #4: Liquidity Horizon Calculation
 */
export function calculateLiquidityHorizon(
  liquidAssets: number,
  baselines: PersonalBaselineResult,
  expenseStructure?: ExpenseStructureResult,
  liquidAccounts: Array<{ name: string; balance: number; icon: string }> = []
): LiquidityHorizonResult {
  if (baselines.status === "insufficient" || liquidAssets < 0) {
    return {
      status: "insufficient",
      liquidAssets: Math.max(0, liquidAssets),
      liquidAccounts,
      typicalMonthlyOutflow: 0,
      typicalCommittedOutflow: 0,
      totalCoverageMonths: 0,
      committedCoverageMonths: 0,
      coverageText: "Insufficient historical baseline",
      committedCoverageText: "Insufficient historical baseline",
      resilienceTier: "MODERATE",
      explanation: "Build more spending history across at least two completed monthly cycles to establish reliable liquidity coverage."
    }
  }

  const typicalMonthlyOutflow = baselines.medianExpense > 0 ? baselines.medianExpense : 1
  const typicalCommittedOutflow = expenseStructure && expenseStructure.fixedAmount > 0
    ? expenseStructure.fixedAmount
    : Math.max(1, Math.round(typicalMonthlyOutflow * 0.45))

  const totalCoverageMonths = Number((liquidAssets / typicalMonthlyOutflow).toFixed(1))
  const committedCoverageMonths = Number((liquidAssets / typicalCommittedOutflow).toFixed(1))

  let resilienceTier: "CRITICAL" | "LOW" | "MODERATE" | "HEALTHY" | "STRONG" | "EXCEPTIONAL" = "HEALTHY"
  let explanation = \`Your current liquid cash of Rp \${liquidAssets.toLocaleString("id-ID")} covers \${totalCoverageMonths} months of typical spending.\`

  if (totalCoverageMonths < 1.0) {
    resilienceTier = "CRITICAL"
    explanation = \`Liquid reserves (Rp \${liquidAssets.toLocaleString("id-ID")}) cover less than 1 month of recent typical outflows (~Rp \${typicalMonthlyOutflow.toLocaleString("id-ID")}/mo).\`
  } else if (totalCoverageMonths < 2.0) {
    resilienceTier = "LOW"
    explanation = \`Liquid reserves cover \${totalCoverageMonths} months of typical spending. Building an additional cash buffer is recommended.\`
  } else if (totalCoverageMonths < 3.0) {
    resilienceTier = "MODERATE"
    explanation = \`Liquid reserves cover \${totalCoverageMonths} months of typical total spending (\${committedCoverageMonths} months of essential fixed costs).\`
  } else if (totalCoverageMonths < 6.0) {
    resilienceTier = "HEALTHY"
    explanation = \`Solid liquidity coverage. Current reserves support \${totalCoverageMonths} months of operations without new income.\`
  } else if (totalCoverageMonths < 12.0) {
    resilienceTier = "STRONG"
    explanation = \`High capital resilience. Liquid assets cover \${totalCoverageMonths} months of typical expenses.\`
  } else {
    resilienceTier = "EXCEPTIONAL"
    explanation = \`Exceptional liquidity runway (\${totalCoverageMonths} months total coverage, \${committedCoverageMonths} months committed coverage).\`
  }

  return {
    status: "sufficient",
    liquidAssets,
    liquidAccounts,
    typicalMonthlyOutflow,
    typicalCommittedOutflow,
    totalCoverageMonths,
    committedCoverageMonths,
    coverageText: \`\${totalCoverageMonths} months of typical spending\`,
    committedCoverageText: \`\${committedCoverageMonths} months of essential commitments\`,
    resilienceTier,
    explanation
  }
}
`;

if (!content.includes('System #1: Deterministic Recurring Transaction Detection')) {
  content += phase3Functions;
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully injected Phase III math engine into ' + path);
} else {
  console.log('Phase III already exists in financialMath.ts');
}
