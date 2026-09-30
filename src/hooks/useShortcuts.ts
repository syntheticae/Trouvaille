import { useState, useEffect, useCallback } from "react";

export interface Shortcut {
  id: string;
  title: string;
  amount: number;
  wallet_id: string;
  category_id: string;
  type: "expense" | "income";
  note: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [];
const SHORTCUTS_STORAGE_KEY = "trouvaille_shortcuts";
const SHORTCUTS_SYNC_EVENT = "trouvaille_shortcuts_updated";

function isLegacyDefaultShortcut(s: Shortcut): boolean {
  return (
    (s.id === "s1" && s.title === "Coffee" && s.amount === 25000 && !s.wallet_id && !s.category_id) ||
    (s.id === "s2" && s.title === "Fuel & Gas" && s.amount === 30000 && !s.wallet_id && !s.category_id) ||
    (s.id === "s3" && s.title === "Parking" && s.amount === 5000 && !s.wallet_id && !s.category_id)
  );
}

function readSavedShortcuts(): Shortcut[] {
  try {
    const saved = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!saved) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_SHORTCUTS;
    const cleaned = parsed.filter((s: Shortcut) => s && !isLegacyDefaultShortcut(s));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => readSavedShortcuts());

  useEffect(() => {
    const handleSync = () => {
      setShortcuts(readSavedShortcuts());
    };
    window.addEventListener(SHORTCUTS_SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SHORTCUTS_SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const persistShortcuts = useCallback((next: Shortcut[]) => {
    setShortcuts(next);
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SHORTCUTS_SYNC_EVENT));
    } catch {}
  }, []);

  const saveShortcut = useCallback((shortcut: Shortcut) => {
    const current = readSavedShortcuts();
    const exists = current.some((s) => s.id === shortcut.id);
    const next = exists
      ? current.map((s) => (s.id === shortcut.id ? shortcut : s))
      : [...current, shortcut];
    persistShortcuts(next);
  }, [persistShortcuts]);

  const deleteShortcut = useCallback((id: string) => {
    const current = readSavedShortcuts();
    const next = current.filter((s) => s.id !== id);
    persistShortcuts(next);
  }, [persistShortcuts]);

  return { shortcuts, saveShortcut, deleteShortcut };
}
