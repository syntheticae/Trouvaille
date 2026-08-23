import { useState, useEffect } from "react"

export interface Goal {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  icon: string
  color: string
  targetDate?: string
}

const STORAGE_KEY = "trouvaille_financial_goals_v2"
const INITIALIZED_KEY = "trouvaille_goals_initialized_v2"

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const isInit = localStorage.getItem(INITIALIZED_KEY)
      if (isInit) {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
      }
      localStorage.setItem(INITIALIZED_KEY, "true")
      return []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
      localStorage.setItem(INITIALIZED_KEY, "true")
    } catch (e) {
      console.warn("Failed to persist goals:", e)
    }
  }, [goals])

  const addGoal = (goal: Omit<Goal, "id">) => {
    const newGoal: Goal = { ...goal, id: Math.random().toString(36).slice(2, 9) }
    setGoals(prev => [newGoal, ...prev])
  }

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const depositToGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
      }
      return g
    }))
  }

  return {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    depositToGoal
  }
}
