import { useState, useEffect } from "react"

export function useBudgetTarget() {
  const [budgetTarget, setBudgetTarget] = useState<number>(() => {
    const saved = localStorage.getItem("trouvaille_budget_target")
    return saved ? Number(saved) : 5000000
  })

  const [budgetPeriodStart, setBudgetPeriodStart] = useState<number>(() => {
    const saved = localStorage.getItem("trouvaille_budget_period_start")
    const num = saved ? Number(saved) : 1
    return num >= 1 && num <= 28 ? num : 1
  })

  useEffect(() => {
    localStorage.setItem("trouvaille_budget_target", budgetTarget.toString())
  }, [budgetTarget])

  useEffect(() => {
    localStorage.setItem("trouvaille_budget_period_start", budgetPeriodStart.toString())
  }, [budgetPeriodStart])

  return { budgetTarget, setBudgetTarget, budgetPeriodStart, setBudgetPeriodStart }
}

