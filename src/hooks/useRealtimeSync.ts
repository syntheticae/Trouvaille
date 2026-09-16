import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Transaction, Category } from "../lib/types";
import {
  upsertTransactionAcrossCaches,
  removeTransactionFromCaches,
} from "./useTransactions";
import { categoryKeys } from "./useCategories";

/**
 * Subscribes to Supabase Realtime WebSocket changes (postgres_changes)
 * for transactions and wallets belonging to the current user.
 * Guarantees zero latency synchronization between Web Dashboard and Mobile App.
 */
export function useRealtimeSync(userId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channelName = `realtime-user-${userId}`;
    const channel = supabase
      .channel(channelName)
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info(`[useRealtimeSync] Subscribed to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[useRealtimeSync] Channel error on ${channelName}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
