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

export const GOALS_STORAGE_KEY = "trouvaille_financial_goals_v2"
export const GOALS_INITIALIZED_KEY = "trouvaille_goals_initialized_v2"
export const GOALS_UPDATED_EVENT = "trouvaille_goals_updated"

export function deductGoalFromStorage(goalIdOrTag: string, amount: number) {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return;
    const goals: Goal[] = JSON.parse(raw);
    if (!Array.isArray(goals)) return;

    let matched = false;
    const cleanTag = goalIdOrTag.trim();
    const updated = goals.map((g) => {
      const matchesId = g.id === cleanTag || cleanTag.includes(g.id);
      const matchesTitle =
        cleanTag.toLowerCase().includes(g.title.toLowerCase()) ||
        g.title.toLowerCase().includes(cleanTag.toLowerCase());
      if (!matched && (matchesId || matchesTitle)) {
        matched = true;
        return {
          ...g,
          currentAmount: Math.max(0, (g.currentAmount || 0) - amount),
        };
      }
      return g;
    });

    if (matched) {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(GOALS_UPDATED_EVENT));
    }
  } catch (err) {
    console.warn("[deductGoalFromStorage] Error:", err);
  }
}

export function addGoalToStorage(goalIdOrTag: string, amount: number) {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return;
    const goals: Goal[] = JSON.parse(raw);
    if (!Array.isArray(goals)) return;

    let matched = false;
    const cleanTag = goalIdOrTag.trim();
    const updated = goals.map((g) => {
      const matchesId = g.id === cleanTag || cleanTag.includes(g.id);
      const matchesTitle =
        cleanTag.toLowerCase().includes(g.title.toLowerCase()) ||
        g.title.toLowerCase().includes(cleanTag.toLowerCase());
      if (!matched && (matchesId || matchesTitle)) {
        matched = true;
        return {
          ...g,
          currentAmount: Math.min(g.targetAmount, (g.currentAmount || 0) + amount),
        };
      }
      return g;
    });

    if (matched) {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(GOALS_UPDATED_EVENT));
    }
  } catch (err) {
    console.warn("[addGoalToStorage] Error:", err);
  }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const isInit = localStorage.getItem(GOALS_INITIALIZED_KEY);
      if (isInit) {
        const stored = localStorage.getItem(GOALS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      }
      localStorage.setItem(GOALS_INITIALIZED_KEY, "true");
      return [];
    } catch {
      return [];
    }
  });

  const persistGoals = (nextGoals: Goal[]) => {
    setGoals(nextGoals);
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(nextGoals));
      localStorage.setItem(GOALS_INITIALIZED_KEY, "true");
      window.dispatchEvent(new CustomEvent(GOALS_UPDATED_EVENT));
    } catch (e) {
      console.warn("Failed to persist goals:", e);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(GOALS_STORAGE_KEY);
        if (stored) {
          setGoals(JSON.parse(stored));
        }
      } catch (e) {
        console.warn("Failed to sync goals:", e);
      }
    };
    window.addEventListener(GOALS_UPDATED_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(GOALS_UPDATED_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const addGoal = (goal: Omit<Goal, "id">) => {
    const newGoal: Goal = { ...goal, id: Math.random().toString(36).slice(2, 9) };
    persistGoals([newGoal, ...goals]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    const next = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
    persistGoals(next);
  };

  const deleteGoal = (id: string) => {
    const next = goals.filter((g) => g.id !== id);
    persistGoals(next);
  };

  const depositToGoal = (id: string, amount: number) => {
    const next = goals.map((g) => {
      if (g.id === id) {
        return {
          ...g,
          currentAmount: Math.min(g.targetAmount, (g.currentAmount || 0) + amount),
        };
      }
      return g;
    });
    persistGoals(next);
  };

  return {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    depositToGoal,
  };
}
