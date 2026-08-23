import { useState, useEffect } from "react"

export function useBudgetTarget() {
  const [budgetTarget, setBudgetTarget] = useState<number>(() => {
    const saved = localStorage.getItem("trouvaille_budget_target")
    return saved ? Number(saved) : 5000000
  })

  useEffect(() => {
    localStorage.setItem("trouvaille_budget_target", budgetTarget.toString())
  }, [budgetTarget])

  return { budgetTarget, setBudgetTarget }
}
