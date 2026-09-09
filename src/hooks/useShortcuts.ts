import { useState, useEffect } from "react"

export interface Shortcut {
  id: string
  title: string
  amount: number
  wallet_id: string
  category_id: string
  type: "expense" | "income"
  note: string
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "s1", title: "Coffee", amount: 25000, wallet_id: "", category_id: "", type: "expense", note: "Coffee" },
  { id: "s2", title: "Fuel & Gas", amount: 30000, wallet_id: "", category_id: "", type: "expense", note: "Fuel" },
  { id: "s3", title: "Parking", amount: 5000, wallet_id: "", category_id: "", type: "expense", note: "Parking" },
]

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const saved = localStorage.getItem("trouvaille_shortcuts")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return DEFAULT_SHORTCUTS
      }
    }
    return DEFAULT_SHORTCUTS
  })

  useEffect(() => {
    localStorage.setItem("trouvaille_shortcuts", JSON.stringify(shortcuts))
  }, [shortcuts])

  const saveShortcut = (shortcut: Shortcut) => {
    setShortcuts(prev => {
      const exists = prev.find(s => s.id === shortcut.id)
      if (exists) {
        return prev.map(s => s.id === shortcut.id ? shortcut : s)
      }
      return [...prev, shortcut]
    })
  }

  const deleteShortcut = (id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id))
  }

  return { shortcuts, saveShortcut, deleteShortcut }
}
