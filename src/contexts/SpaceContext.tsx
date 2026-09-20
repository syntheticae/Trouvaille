import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { Transaction } from "../types";

export interface FinancialDomain {
  id: string;
  name: string;
  description: string;
  tag?: string;
  icon: string;
  isDefault?: boolean;
}

// Backward-compatible alias for existing codebase
export type MoneySpace = FinancialDomain;

export const DEFAULT_MONEY_SPACES: FinancialDomain[] = [
  {
    id: "personal",
    name: "Domain Pribadi",
    description: "Keuangan harian, kebutuhan hidup, belanja & tabungan pribadi",
    icon: "User",
    isDefault: true,
  },
  {
    id: "business",
    name: "Domain Bisnis",
    description: "Proyek klien, operasional usaha, faktur & beban bisnis",
    tag: "#business",
    icon: "Briefcase",
    isDefault: true,
  },
  {
    id: "travel",
    name: "Domain Perjalanan",
    description: "Tiket, hotel, kuliner & anggaran rencana perjalanan khusus",
    tag: "#travel",
    icon: "Plane",
    isDefault: true,
  },
  {
    id: "all",
    name: "Seluruh Domain",
    description: "Neraca konsolidasi lintas seluruh domain finansial",
    icon: "Layers",
    isDefault: true,
  },
];

const ACTIVE_SPACE_KEY = "trouvaille_active_space_id";
const CUSTOM_SPACES_KEY = "trouvaille_custom_spaces_v1";

interface SpaceContextValue {
  activeSpaceId: string;
  activeSpace: MoneySpace;
  spaces: MoneySpace[];
  setActiveSpaceId: (id: string) => void;
  addCustomSpace: (space: { name: string; description?: string; tag?: string; icon?: string }) => MoneySpace;
  deleteCustomSpace: (id: string) => void;
  filterTransactionsBySpace: (transactions: Transaction[], targetSpaceId?: string) => Transaction[];
  calculateSpaceCashflow: (transactions: Transaction[], targetSpaceId?: string) => { income: number; expense: number; net: number };
}

const SpaceContext = createContext<SpaceContextValue | undefined>(undefined);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SPACE_KEY);
      return saved || "personal";
    } catch {
      return "personal";
    }
  });

  const [customSpaces, setCustomSpaces] = useState<MoneySpace[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_SPACES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const spaces = useMemo(() => {
    return [...DEFAULT_MONEY_SPACES, ...customSpaces];
  }, [customSpaces]);

  const activeSpace = useMemo(() => {
    return spaces.find((s) => s.id === activeSpaceId) || DEFAULT_MONEY_SPACES[0];
  }, [spaces, activeSpaceId]);

  const setActiveSpaceId = useCallback((id: string) => {
    setActiveSpaceIdState(id);
    try {
      localStorage.setItem(ACTIVE_SPACE_KEY, id);
    } catch {}
  }, []);

  const addCustomSpace = useCallback((spaceData: { name: string; description?: string; tag?: string; icon?: string }) => {
    const rawTag = spaceData.tag?.trim() || `#${spaceData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const formattedTag = rawTag.startsWith("#") ? rawTag.toLowerCase() : `#${rawTag.toLowerCase()}`;

    const newSpace: MoneySpace = {
      id: `space-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: spaceData.name.trim(),
      description: spaceData.description?.trim() || `Dedicated money space for ${spaceData.name}`,
      tag: formattedTag,
      icon: spaceData.icon || "Compass",
      isDefault: false,
    };

    setCustomSpaces((prev) => {
      const updated = [...prev, newSpace];
      try {
        localStorage.setItem(CUSTOM_SPACES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    return newSpace;
  }, []);

  const deleteCustomSpace = useCallback((id: string) => {
    setCustomSpaces((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(CUSTOM_SPACES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // If active space was deleted, revert to personal
    setActiveSpaceIdState((curr) => (curr === id ? "personal" : curr));
  }, []);

  /**
   * Filter transactions belonging to a specific Money Space.
   * Utilizes non-breaking tag hashtags in notes (#business, #kantor, #travel, #liburan, etc.)
   */
  const filterTransactionsBySpace = useCallback(
    (transactions: Transaction[], targetSpaceId?: string): Transaction[] => {
      const spaceId = targetSpaceId || activeSpaceId;

      if (spaceId === "all") {
        return transactions;
      }

      if (spaceId === "business") {
        return transactions.filter((t) => {
          const note = (t.note || "").toLowerCase();
          return (
            note.includes("#business") ||
            note.includes("#kantor") ||
            note.includes("#proyek") ||
            note.includes("#freelance") ||
            note.includes("#work")
          );
        });
      }

      if (spaceId === "travel") {
        return transactions.filter((t) => {
          const note = (t.note || "").toLowerCase();
          return (
            note.includes("#travel") ||
            note.includes("#liburan") ||
            note.includes("#holiday") ||
            note.includes("#trip") ||
            note.includes("#vacation")
          );
        });
      }

      if (spaceId === "personal") {
        // Personal space shows transactions that are NOT designated to business or travel
        return transactions.filter((t) => {
          const note = (t.note || "").toLowerCase();
          const isBusiness =
            note.includes("#business") ||
            note.includes("#kantor") ||
            note.includes("#proyek") ||
            note.includes("#freelance") ||
            note.includes("#work");
          const isTravel =
            note.includes("#travel") ||
            note.includes("#liburan") ||
            note.includes("#holiday") ||
            note.includes("#trip") ||
            note.includes("#vacation");
          return !isBusiness && !isTravel;
        });
      }

      // Check custom space by its specific tag
      const custom = customSpaces.find((s) => s.id === spaceId);
      if (custom && custom.tag) {
        const tag = custom.tag.toLowerCase();
        return transactions.filter((t) => {
          const note = (t.note || "").toLowerCase();
          return note.includes(tag);
        });
      }

      return transactions;
    },
    [activeSpaceId, customSpaces]
  );

  const calculateSpaceCashflow = useCallback(
    (transactions: Transaction[], targetSpaceId?: string) => {
      const filtered = filterTransactionsBySpace(transactions, targetSpaceId);
      let income = 0;
      let expense = 0;

      filtered.forEach((t) => {
        if (t.type === "income") income += Number(t.amount || 0);
        else if (t.type === "expense") expense += Number(t.amount || 0);
      });

      return {
        income,
        expense,
        net: income - expense,
      };
    },
    [filterTransactionsBySpace]
  );

  return (
    <SpaceContext.Provider
      value={{
        activeSpaceId,
        activeSpace,
        spaces,
        setActiveSpaceId,
        addCustomSpace,
        deleteCustomSpace,
        filterTransactionsBySpace,
        calculateSpaceCashflow,
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace(): SpaceContextValue {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error("useSpace must be used within a SpaceProvider");
  }
  return context;
}

export const useDomain = useSpace;
