import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import type { Transaction, FinancialDomain, FinancialLedger, LedgerMemberRole, LedgerMember } from "../types";
import { supabase } from "../lib/supabase";
import {
  generateInviteCode,
  joinLedgerWithCode,
  leaveSharedLedger,
  type JoinLedgerResult,
} from "../lib/sharedLedgerService";

export type { FinancialDomain, FinancialLedger, LedgerMemberRole, LedgerMember };
export type MoneySpace = FinancialDomain;

export const DEFAULT_MONEY_SPACES: FinancialDomain[] = [
  {
    id: "personal",
    name: "Personal Ledger",
    description: "Daily personal cashflow, necessities, shopping & personal savings",
    icon: "User",
    currency: "IDR",
    isDefault: true,
    is_default: true,
    is_shared: false,
    role: "owner",
  },
];

const ACTIVE_SPACE_KEY = "trouvaille_active_space_id";
const CUSTOM_SPACES_KEY = "trouvaille_custom_spaces_v1";
const LEDGERS_STORAGE_KEY = "trouvaille_ledgers_v1";

interface CreateSpaceInput {
  name: string;
  description?: string;
  tag?: string;
  icon?: string;
  currency?: string;
  is_shared?: boolean;
  invite_code?: string | null;
}

interface SpaceContextValue {
  activeSpaceId: string;
  activeSpace: MoneySpace;
  spaces: MoneySpace[];
  ledgers: MoneySpace[];
  isSharedSpace: boolean;
  currentUserRole: LedgerMemberRole;
  setActiveSpaceId: (id: string) => void;
  addCustomSpace: (space: CreateSpaceInput) => MoneySpace;
  updateCustomSpace: (id: string, space: Partial<CreateSpaceInput>) => void;
  deleteCustomSpace: (id: string, reassignToId?: string) => void;
  createLedger: (space: CreateSpaceInput) => MoneySpace;
  updateLedger: (id: string, space: Partial<CreateSpaceInput>) => void;
  deleteLedger: (id: string, reassignToId?: string) => void;
  joinSharedSpace: (code: string, displayName?: string) => Promise<JoinLedgerResult>;
  leaveSharedSpace: (ledgerId: string) => Promise<boolean>;
  refreshLedgers: () => Promise<void>;
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
      const savedLedgers = localStorage.getItem(LEDGERS_STORAGE_KEY);
      if (savedLedgers) {
        const parsed = JSON.parse(savedLedgers);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedSpaces = localStorage.getItem(CUSTOM_SPACES_KEY);
      return savedSpaces ? JSON.parse(savedSpaces) : [];
    } catch {
      return [];
    }
  });

  // Attempt to sync custom and shared ledgers from Supabase cloud
  const syncFromCloud = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || session.user.id === "guest_local_user") return;

      // First try fetching with ledger_members relation
      let rawData: any[] = [];
      const resWithMembers = await supabase
        .from("ledgers")
        .select("*, ledger_members(role, user_id, display_name)")
        .order("created_at", { ascending: true });

      if (!resWithMembers.error && resWithMembers.data) {
        rawData = resWithMembers.data;
      } else {
        // Fallback if ledger_members join isn't established yet
        const resSimple = await supabase
          .from("ledgers")
          .select("*")
          .order("created_at", { ascending: true });
        if (!resSimple.error && resSimple.data) {
          rawData = resSimple.data;
        }
      }

      if (rawData.length > 0) {
        const cloudSpaces: MoneySpace[] = rawData
          .filter((row: any) => row.id !== "personal" && row.id !== "all")
          .map((row: any) => {
            const isOwner = row.user_id === session.user.id;
            const myMembership = Array.isArray(row.ledger_members)
              ? row.ledger_members.find((m: any) => m.user_id === session.user.id)
              : null;
            const role: LedgerMemberRole = isOwner ? "owner" : (myMembership?.role || "editor");

            return {
              id: row.id,
              user_id: row.user_id,
              name: row.name,
              description: row.description || "",
              icon: row.icon || (row.is_shared ? "Users" : "BookOpen"),
              currency: row.currency || "IDR",
              isDefault: Boolean(row.is_default),
              is_default: Boolean(row.is_default),
              is_shared: Boolean(row.is_shared),
              invite_code: row.invite_code || null,
              role,
              tag: `#${row.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
              created_at: row.created_at,
            };
          });

        if (cloudSpaces.length > 0) {
          setCustomSpaces((prev) => {
            const mergedMap = new Map<string, MoneySpace>();
            prev.forEach((s) => mergedMap.set(s.id, s));
            cloudSpaces.forEach((s) => mergedMap.set(s.id, s));
            const merged = Array.from(mergedMap.values());
            try {
              localStorage.setItem(LEDGERS_STORAGE_KEY, JSON.stringify(merged));
              localStorage.setItem(CUSTOM_SPACES_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch {
      // Silently catch in case network is offline
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      syncFromCloud();
    }
    return () => {
      isMounted = false;
    };
  }, [syncFromCloud]);

  const spaces = useMemo(() => {
    const cleanCustom = customSpaces.filter(
      (s) => s.id !== "personal" && s.id !== "all",
    );
    const list: MoneySpace[] = [...DEFAULT_MONEY_SPACES, ...cleanCustom];
    if (cleanCustom.length > 0 && !list.some((s) => s.id === "all")) {
      list.push({
        id: "all",
        name: "All Ledgers",
        description: "Consolidated balance sheet across all financial ledgers",
        icon: "Layers",
        isDefault: false,
        is_default: false,
      });
    }
    return list;
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

  const addCustomSpace = useCallback((spaceData: CreateSpaceInput) => {
    const rawTag = spaceData.tag?.trim() || `#${spaceData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const formattedTag = rawTag.startsWith("#") ? rawTag.toLowerCase() : `#${rawTag.toLowerCase()}`;
    const isShared = Boolean(spaceData.is_shared);
    const inviteCode = isShared ? generateInviteCode() : undefined;

    const newSpace: MoneySpace = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: spaceData.name.trim(),
      description: spaceData.description?.trim() || `Dedicated ledger for ${spaceData.name.trim()}`,
      tag: formattedTag,
      icon: spaceData.icon || (isShared ? "Users" : "BookOpen"),
      currency: spaceData.currency || "IDR",
      isDefault: false,
      is_default: false,
      is_shared: isShared,
      invite_code: inviteCode,
      role: "owner",
      created_at: new Date().toISOString(),
    };

    setCustomSpaces((prev) => {
      const updated = [...prev, newSpace];
      try {
        localStorage.setItem(CUSTOM_SPACES_KEY, JSON.stringify(updated));
        localStorage.setItem(LEDGERS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Asynchronously synchronize to Supabase cloud if table exists
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && session.user.id !== "guest_local_user") {
          await supabase
            .from("ledgers")
            .upsert({
              id: newSpace.id,
              user_id: session.user.id,
              name: newSpace.name,
              description: newSpace.description,
              icon: newSpace.icon,
              currency: newSpace.currency || "IDR",
              is_default: false,
              is_shared: isShared,
              invite_code: inviteCode,
              created_at: newSpace.created_at,
            });

          if (isShared) {
            await supabase.from("ledger_members").upsert({
              ledger_id: newSpace.id,
              user_id: session.user.id,
              role: "owner",
              display_name: session.user.email?.split("@")[0] || "Owner",
              email: session.user.email,
            });
          }
        }
      } catch {}
    })();

    try {
      window.dispatchEvent(new CustomEvent("trouvaille_ledgers_updated"));
    } catch {}

    return newSpace;
  }, []);

  const updateCustomSpace = useCallback((id: string, spaceData: Partial<CreateSpaceInput>) => {
    const rawTag = spaceData.tag?.trim() || (spaceData.name ? `#${spaceData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}` : undefined);
    const formattedTag = rawTag ? (rawTag.startsWith("#") ? rawTag.toLowerCase() : `#${rawTag.toLowerCase()}`) : undefined;

    setCustomSpaces((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          name: spaceData.name ? spaceData.name.trim() : s.name,
          description: spaceData.description !== undefined ? spaceData.description.trim() : s.description,
          tag: formattedTag || s.tag,
          icon: spaceData.icon || s.icon,
          currency: spaceData.currency || s.currency || "IDR",
          is_shared: spaceData.is_shared !== undefined ? Boolean(spaceData.is_shared) : s.is_shared,
        };
      });

      try {
        localStorage.setItem(CUSTOM_SPACES_KEY, JSON.stringify(updated));
        localStorage.setItem(LEDGERS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Cloud update
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && session.user.id !== "guest_local_user") {
          const payload: any = {
            updated_at: new Date().toISOString(),
          };
          if (spaceData.name) payload.name = spaceData.name.trim();
          if (spaceData.description !== undefined) payload.description = spaceData.description.trim();
          if (spaceData.icon) payload.icon = spaceData.icon;
          if (spaceData.currency) payload.currency = spaceData.currency;
          if (spaceData.is_shared !== undefined) payload.is_shared = spaceData.is_shared;

          await supabase
            .from("ledgers")
            .update(payload)
            .eq("id", id)
            .eq("user_id", session.user.id);
        }
      } catch {}
    })();

    try {
      window.dispatchEvent(new CustomEvent("trouvaille_ledgers_updated"));
    } catch {}
  }, []);

  const deleteCustomSpace = useCallback((id: string, reassignToId: string = "personal") => {
    setCustomSpaces((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(CUSTOM_SPACES_KEY, JSON.stringify(updated));
        localStorage.setItem(LEDGERS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // If active space was deleted, revert to personal
    setActiveSpaceIdState((curr) => (curr === id ? "personal" : curr));

    // Cloud delete
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && session.user.id !== "guest_local_user") {
          await supabase
            .from("ledgers")
            .delete()
            .eq("id", id)
            .eq("user_id", session.user.id);

          // Reassign transactions in cloud if reassignToId is provided
          if (reassignToId) {
            await supabase
              .from("transactions")
              .update({ ledger_id: reassignToId, space_id: reassignToId })
              .eq("ledger_id", id)
              .eq("user_id", session.user.id);
          }
        }
      } catch {}
    })();

    try {
      window.dispatchEvent(new CustomEvent("trouvaille_ledgers_updated", { detail: { deletedId: id, reassignToId } }));
    } catch {}
  }, []);

  /**
   * Filter transactions belonging to a specific Money Space / Ledger.
   * Priority:
   * 1. If target is 'all', returns all transactions.
   * 2. Checks explicit `ledger_id` or `space_id`.
   * 3. Backward-compatible fallback: inspects hashtags in notes (#business, #kantor, #travel, #liburan, etc.)
   */
  const filterTransactionsBySpace = useCallback(
    (transactions: Transaction[], targetSpaceId?: string): Transaction[] => {
      const spaceId = targetSpaceId || activeSpaceId;

      if (spaceId === "all") {
        return transactions;
      }

      return transactions.filter((t) => {
        // 1. Explicit native ledger_id match
        if (t.ledger_id) {
          return t.ledger_id === spaceId;
        }

        // 2. Explicit legacy space_id match
        if (t.space_id) {
          return t.space_id === spaceId;
        }

        // 3. Fallback for legacy transactions without ledger_id
        const note = (t.note || "").toLowerCase();

        if (spaceId === "business") {
          return (
            note.includes("#business") ||
            note.includes("#kantor") ||
            note.includes("#proyek") ||
            note.includes("#freelance") ||
            note.includes("#work")
          );
        }

        if (spaceId === "travel") {
          return (
            note.includes("#travel") ||
            note.includes("#liburan") ||
            note.includes("#holiday") ||
            note.includes("#trip") ||
            note.includes("#vacation")
          );
        }

        if (spaceId === "personal") {
          // Personal space shows transactions that are NOT designated to business or travel
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

          // Also check if matches any custom space tag
          const matchesAnyCustom = customSpaces.some(
            (cs) => cs.tag && note.includes(cs.tag.toLowerCase()),
          );

          return !isBusiness && !isTravel && !matchesAnyCustom;
        }

        // Check custom space by its specific tag
        const custom = customSpaces.find((s) => s.id === spaceId);
        if (custom && custom.tag) {
          return note.includes(custom.tag.toLowerCase());
        }

        return false;
      });
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

  const isSharedSpace = Boolean(activeSpace?.is_shared);
  const currentUserRole: LedgerMemberRole =
    (activeSpace?.role as LedgerMemberRole) || (activeSpace?.id === "personal" ? "owner" : "editor");

  const joinSharedSpace = useCallback(
    async (code: string, displayName?: string): Promise<JoinLedgerResult> => {
      const result = await joinLedgerWithCode(code, displayName);
      if (result.success && result.ledger_id) {
        await syncFromCloud();
        setActiveSpaceId(result.ledger_id);
      }
      return result;
    },
    [syncFromCloud, setActiveSpaceId],
  );

  const leaveSharedSpace = useCallback(
    async (ledgerId: string): Promise<boolean> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const success = await leaveSharedLedger(ledgerId, session.user.id);
      if (success) {
        setCustomSpaces((prev) => prev.filter((s) => s.id !== ledgerId));
        if (activeSpaceId === ledgerId) {
          setActiveSpaceId("personal");
        }
        await syncFromCloud();
      }
      return success;
    },
    [activeSpaceId, setActiveSpaceId, syncFromCloud],
  );

  return (
    <SpaceContext.Provider
      value={{
        activeSpaceId,
        activeSpace,
        spaces,
        ledgers: spaces,
        isSharedSpace,
        currentUserRole,
        setActiveSpaceId,
        addCustomSpace,
        updateCustomSpace,
        deleteCustomSpace,
        createLedger: addCustomSpace,
        updateLedger: updateCustomSpace,
        deleteLedger: deleteCustomSpace,
        joinSharedSpace,
        leaveSharedSpace,
        refreshLedgers: syncFromCloud,
        filterTransactionsBySpace,
        calculateSpaceCashflow,
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
}

export function useOptionalSpace(): SpaceContextValue | null {
  return useContext(SpaceContext) || null;
}

export function useSpace(): SpaceContextValue {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error("useSpace must be used within a SpaceProvider");
  }
  return context;
}

export const useDomain = useSpace;
export const useLedger = useSpace;

