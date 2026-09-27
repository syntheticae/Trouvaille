import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Transaction, Category } from "../lib/types";
import {
  upsertTransactionAcrossCaches,
  removeTransactionFromCaches,
} from "./useTransactions";
import { categoryKeys } from "./useCategories";
import { useOptionalSpace } from "../contexts/SpaceContext";
import type { DynamicIslandHUDData } from "../components/transactions/DynamicIslandHUD";

export interface UseRealtimeSyncOptions {
  onPartnerTransaction?: (data: DynamicIslandHUDData) => void;
}

/**
 * Subscribes to Supabase Realtime WebSocket changes (postgres_changes)
 * for transactions and wallets across personal and all collaborative shared ledgers.
 * Guarantees instantaneous multi-user synchronization between partners/collaborators.
 */
export function useRealtimeSync(
  userId?: string | null,
  options?: UseRealtimeSyncOptions,
) {
  const queryClient = useQueryClient();
  const spaceContext = useOptionalSpace();
  const spaces = spaceContext?.spaces;

  // Stable reference to avoid unnecessary channel reconnections when parent re-renders
  const onPartnerTransactionRef = useRef(options?.onPartnerTransaction);
  useEffect(() => {
    onPartnerTransactionRef.current = options?.onPartnerTransaction;
  }, [options?.onPartnerTransaction]);

  // Extract all collaborative shared ledgers
  const sharedLedgers = useMemo(() => {
    if (!spaces) return [];
    return spaces.filter(
      (s) => s.is_shared && s.id !== "personal" && s.id !== "all",
    );
  }, [spaces]);

  const sharedLedgerIdsKey = useMemo(() => {
    return sharedLedgers
      .map((s) => s.id)
      .sort()
      .join(",");
  }, [sharedLedgers]);

  // 1. Personal User Channel (Personal transactions, wallets, categories, and membership invites)
  useEffect(() => {
    if (!userId || userId === "guest_local_user") return;

    const personalChannelName = `realtime-user-${userId}`;
    const channel = supabase
      .channel(personalChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const rawTx = payload.new as Transaction;
            if (!rawTx || !rawTx.id) return;

            // Preserve category details from local categories cache
            let categoryObj: Category | null = rawTx.categories || null;
            if (!categoryObj && rawTx.category_id) {
              const allCategories = queryClient.getQueryData<Category[]>(
                categoryKeys.all(userId),
              );
              categoryObj =
                allCategories?.find((c) => c.id === rawTx.category_id) || null;
            }

            const enrichedTx: Transaction = {
              ...rawTx,
              categories: categoryObj,
            };

            upsertTransactionAcrossCaches(queryClient, enrichedTx);
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              removeTransactionFromCaches(queryClient, deletedId);
              queryClient.invalidateQueries({ queryKey: ["wallets"] });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wallets"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ledger_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Cloud membership updated (e.g. joined ledger, role change)
          spaceContext?.refreshLedgers?.();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info(`[useRealtimeSync] Subscribed to personal channel: ${personalChannelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[useRealtimeSync] Channel error on ${personalChannelName}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, spaceContext]);

  // 2. Collaborative Shared Ledgers Channel (Live sync across all shared ledgers simultaneously)
  useEffect(() => {
    if (!userId || userId === "guest_local_user" || sharedLedgers.length === 0) {
      return;
    }

    const sharedChannelName = `realtime-shared-${userId}-${sharedLedgerIdsKey}`;
    let channel = supabase.channel(sharedChannelName);

    sharedLedgers.forEach((ledger) => {
      // Listen for transaction mutations in this shared ledger
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `ledger_id=eq.${ledger.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const rawTx = payload.new as Transaction;
            if (!rawTx || !rawTx.id) return;

            // Only trigger partner HUD if recorded by someone else
            const isByPartner =
              rawTx.user_id !== userId && rawTx.created_by_user_id !== userId;

            // Preserve category details from local categories cache
            let categoryObj: Category | null = rawTx.categories || null;
            if (!categoryObj && rawTx.category_id) {
              const allCategories = queryClient.getQueryData<Category[]>(
                categoryKeys.all(userId),
              );
              categoryObj =
                allCategories?.find((c) => c.id === rawTx.category_id) || null;
            }

            const enrichedTx: Transaction = {
              ...rawTx,
              categories: categoryObj,
            };

            upsertTransactionAcrossCaches(queryClient, enrichedTx);
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });

            if (isByPartner) {
              const partnerDisplayName =
                rawTx.created_by_name ||
                ledger.name;

              onPartnerTransactionRef.current?.({
                source: "partner_sync",
                amount: Number(rawTx.amount || 0),
                type: rawTx.type,
                categoryName:
                  categoryObj?.name ||
                  (rawTx.type === "income" ? "Pemasukan" : "Pengeluaran"),
                walletName: ledger.name,
                ledgerId: ledger.id,
                ledgerName: ledger.name,
                partnerName: partnerDisplayName,
                date: rawTx.occurred_on,
                note: rawTx.note || undefined,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const rawTx = payload.new as Transaction;
            if (!rawTx || !rawTx.id) return;

            let categoryObj: Category | null = rawTx.categories || null;
            if (!categoryObj && rawTx.category_id) {
              const allCategories = queryClient.getQueryData<Category[]>(
                categoryKeys.all(userId),
              );
              categoryObj =
                allCategories?.find((c) => c.id === rawTx.category_id) || null;
            }

            const enrichedTx: Transaction = {
              ...rawTx,
              categories: categoryObj,
            };

            upsertTransactionAcrossCaches(queryClient, enrichedTx);
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              removeTransactionFromCaches(queryClient, deletedId);
              queryClient.invalidateQueries({ queryKey: ["wallets"] });
              queryClient.invalidateQueries({ queryKey: ["transactions"] });
            }
          }
        },
      );

      // Listen for shared ledger metadata updates (name, icon, etc.)
      channel = channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ledgers",
          filter: `id=eq.${ledger.id}`,
        },
        () => {
          spaceContext?.refreshLedgers?.();
        },
      );

      // Listen for members joining or leaving this shared ledger
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ledger_members",
          filter: `ledger_id=eq.${ledger.id}`,
        },
        () => {
          spaceContext?.refreshLedgers?.();
        },
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.info(
          `[useRealtimeSync] Subscribed to shared channel: ${sharedChannelName} (${sharedLedgers.length} ledgers)`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.warn(`[useRealtimeSync] Channel error on ${sharedChannelName}`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, sharedLedgerIdsKey, sharedLedgers, queryClient, spaceContext]);
}
