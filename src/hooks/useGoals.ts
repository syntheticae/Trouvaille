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

const DEFAULT_GOALS: Goal[] = [
  {
    id: "1",
    title: "Emergency Fund",
    targetAmount: 50000000,
    currentAmount: 32500000,
    icon: "🛡️",
    color: "#B8FA4E",
    targetDate: "2026-12-31"
  },
  {
    id: "2",
    title: "New MacBook Pro",
    targetAmount: 30000000,
    currentAmount: 18000000,
    icon: "💻",
    color: "#305CFF",
    targetDate: "2026-10-15"
  },
  {
    id: "3",
    title: "Japan Vacation",
    targetAmount: 40000000,
    currentAmount: 12000000,
    icon: "✈️",
    color: "#84A6FF",
    targetDate: "2027-04-01"
  }
]

const STORAGE_KEY = "trouvaille_financial_goals"

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : DEFAULT_GOALS
    } catch {
      return DEFAULT_GOALS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
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
