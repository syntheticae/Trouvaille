# Trouvaille — Phase III Implementation Plan
## Cashflow Intelligence & Financial Structure

Phase III expands Trouvaille's financial engine beyond historical metrics and personal baselines into forward-looking cashflow intelligence, recurring transaction detection, structural spending classification, and mathematical liquidity analysis without introducing AI or external dependencies.

---

## Proposed Architectural Flow

```
RAW FINANCIAL DATA (Supabase PostgreSQL / TanStack Query)
   ↓
AUTHORITATIVE LIQUID BALANCES (calculateWalletBalances)
   ↓
SYSTEM 1: RECURRING TRANSACTION DETECTION (Rule-based / Statistical Interval & Tolerance)
   ↓
SYSTEM 2: EXPENSE STRUCTURE (Fixed/Committed vs Variable vs Discretionary & Flexibility Index)
   ↓
SYSTEM 3: CASHFLOW CALENDAR & CASHFLOW FLOOR (7/14/30 Day Timeline & Projected Minimum Balance)
   ↓
SYSTEM 4: LIQUIDITY HORIZON (Months of Coverage for Total & Committed Outflows)
   ↓
UNIFIED HOOK & ACTION CENTER INTEGRATION (useFinancialIntelligence)
   ↓
CLEAN MONOCHROME GLASSMORPHISM UI (HomePage, StatisticsPage, Bills / Settings, BottomSheets)
```

---

## 1. Central Financial Calculations Engine ([`src/lib/financialMath.ts`](file:///d:/Project/Trouvaille/src/lib/financialMath.ts))

### A. System #1: Recurring Transaction Detection
* **`detectRecurringTransactions(transactions, bills, categories, now)`**:
  * Clusters transactions by normalized note/merchant, category, and wallet.
  * Measures temporal interval consistency:
    * `weekly` (5–9 days)
    * `biweekly` (12–17 days)
    * `monthly` (25–35 days)
    * `quarterly` (75–105 days)
    * `yearly` (340–390 days)
  * Implements amount tolerance ($\pm 25\%$ of median for variable recurring items like electricity or utilities).
  * Confidence scoring: `strong` ($\ge 4$ consistent occurrences), `moderate` ($2–3$ occurrences), or `insufficient` (suppressed).
  * Recurring lifecycle: `detected`, `confirmed` (integrated with `Bills`), `ignored` (stored in local preference), `inactive` (no occurrences in $\ge 2$ expected cycles).

### B. System #2: Fixed / Variable / Discretionary Expense Structure
* **`calculateExpenseStructure(transactions, recurringItems, overrides, now)`**:
  * Classifies monthly spending into:
    1. **Fixed / Committed**: Recurring bills, strong detected recurring items, and structural categories (Hunian, Asuransi, Pendidikan, Internet/Listrik/Air, Zakat, Pajak).
    2. **Variable (Essential Everyday)**: Makanan, Groceries, Bensin, Transportasi harian, Kesehatan, Reparasi, Laundry, Keluarga.
    3. **Discretionary (Flexible Lifestyle)**: Hiburan, Cafe, Kopi, Fashion/Shopping, Liburan, Gadget, Olahraga, Hadiah.
    4. **Unclassified**: Uncertain / unmapped items.
  * Flexibility Ratio: $\text{Committed Spending}$ vs $\text{Flexible Spending}$ ($\text{Variable} + \text{Discretionary}$).
  * Mathematical Invariant: $\text{Fixed} + \text{Variable} + \text{Discretionary} + \text{Unclassified} \equiv \text{Total Expense}$ with zero double-counting.

### C. System #3: Cashflow Calendar & Cashflow Floor
* **`calculateCashflowFloor(currentLiquidBalance, bills, recurringItems, horizonDays, now)`**:
  * Authoritative starting point: current liquid balances (Cash + Bank Accounts + E-Wallets).
  * Generates projected daily balance timeline for 7, 14, or 30 days.
  * Inflow events: recurring salary/income.
  * Outflow events: unpaid upcoming bills & confirmed recurring commitments.
  * Calculates **Cashflow Floor**: exact lowest projected balance $\min_t \text{Projected}(t)$ and date of occurrence within the horizon.

### D. System #4: Liquidity Horizon
* **`calculateLiquidityHorizon(liquidAssets, baselines, expenseStructure)`**:
  * Gated by Data Sufficiency Rule ($\ge 2$ completed historical monthly cycles).
  * Dual coverage metrics:
    1. **Total Outflow Coverage**: $\text{Liquid Assets} / \text{Median Total Outflow}$ (e.g. 3.4 months).
    2. **Committed Outflow Coverage**: $\text{Liquid Assets} / \text{Median Committed Outflow}$ (e.g. 7.1 months).
  * Objective resilience classification (CRITICAL, LOW, MODERATE, HEALTHY, STRONG, EXCEPTIONAL).

---

## 2. UI Presentation & Integration

### A. Dashboard ([`src/pages/HomePage.tsx`](file:///d:/Project/Trouvaille/src/pages/HomePage.tsx))
1. **Liquidity Horizon Card**:
   * Compact metric card displaying coverage in months with tap-to-open **Liquidity Horizon Detail BottomSheet** (explaining liquid asset breakdown, monthly baseline outflow, and total vs committed coverage).
2. **Cashflow Outlook Section**:
   * Compact timeline with 7d / 14d / 30d horizon selector.
   * Visual indicator of upcoming bills, income events, daily projected balances, and the **Projected Low / Cashflow Floor** badge.

### B. Statistics Page ([`src/pages/StatisticsPage.tsx`](file:///d:/Project/Trouvaille/src/pages/StatisticsPage.tsx))
1. **Expense Structure Card**:
   * Monochrome glassmorphism card showing:
     * Recurring / Fixed ($X$ · $Y\%$)
     * Variable ($A$ · $B\%$)
     * Discretionary ($M$ · $N\%$)
     * Committed vs Flexible progress gauge.

### C. Bills & Recurring Commitments ([`src/components/bills/DetectedRecurringSection.tsx`](file:///d:/Project/Trouvaille/src/components/bills/DetectedRecurringSection.tsx))
* Section showing detected recurring spending with **Confirm** (creates official tracked bill in Supabase) and **Ignore** actions.

---

## 3. Verification & Testing Plan

### Automated Test Suite ([`tests/cashflowIntelligence.test.ts`](file:///d:/Project/Trouvaille/tests/cashflowIntelligence.test.ts))
1. **Recurring Detection Tests**:
   * Consistent intervals (weekly, monthly, yearly) and amount tolerance ($\pm 25\%$).
   * Inactive cycle detection and weak evidence suppression.
2. **Expense Structure Tests**:
   * Complete mathematical reconciliation: $\text{Fixed} + \text{Variable} + \text{Discretionary} \equiv \text{Total Expense}$.
   * Category override behavior.
3. **Cashflow Calendar & Cashflow Floor Tests**:
   * Authoritative balance projection over 7, 14, 30 days.
   * Accurate minimum balance identification and date handling.
4. **Liquidity Horizon Tests**:
   * Data sufficiency gating ($< 2$ months vs $\ge 2$ months).
   * Total vs Committed coverage math.
5. **Full Suite Execution**:
   * Run `npm test` across all 5 test files (`financialInvariants`, `financialMath`, `syncIntegrity`, `personalIntelligence`, `cashflowIntelligence`).
   * Run `npm run build` to verify clean TypeScript compilation and asset packaging.
