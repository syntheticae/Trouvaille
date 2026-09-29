// ======================================================================
// TROUVAILLE SESSION CLEANUP & TEARDOWN PIPELINE
// Purges all cached session data, local storage snapshots, IndexedDB vaults,
// pending mutations, and React Query caches to prevent cross-session leakage.
// ======================================================================

import type { QueryClient } from "@tanstack/react-query";
import { clearLocalTransactionsCache } from "../hooks/useTransactions";
import { clearAllVaultItems } from "./indexedDbStorage";
import {
  clearPersistentSession,
  clearBiometricLoginCredentials,
} from "./biometricAuth";

export interface SessionCleanupOptions {
  /** If true, preserves 'trouvaille_guest_mode' flag so user stays in guest state */
  preserveGuestFlag?: boolean;
}

/**
 * Standard list of local storage keys holding user-scoped, offline or financial state.
 */
export const USER_SESSION_STORAGE_KEYS = [
  "TROUVAILLE_OFFLINE_CACHE_V1",
  "TROUVAILLE_TX_BACKUP_V1",
  "TROUVAILLE_WALLETS_BACKUP_V1",
  "TROUVAILLE_CATEGORIES_BACKUP_V1",
  "TROUVAILLE_PENDING_MUTATIONS_V2",
  "trouvaille_shortcuts",
  "trouvaille_linked_web_sessions",
  "trouvaille_merchant_category_memory",
  "trouvaille_draft_transactions",
  "trouvaille_financial_goals_v2",
  "trouvaille_onboarded",
  "trouvaille_user_name",
  "trouvaille_preset_mode",
  "trouvaille_onboarding_focus",
  "trouvaille_active_space_id",
  "trouvaille_spaces_cache",
  "trouvaille_selected_ledger_account_id",
  "trouvaille_wallet_classifications_v1",
  "trouvaille_streak_reminder_enabled",
  "trouvaille_streak_reminder_hour",
  "trouvaille_sync_initial_done",
  "trouvaille_holdings_v1",
  "trouvaille_holdings_guest_v1",
  "trouvaille_usdt_valuation_guest_v1",
  "trouvaille_usdt_valuation_v1",
  "trouvaille_usdt_valuation_v2",
  "trouvaille_market_quotes_cache_v2",
] as const;

/**
 * Completely purges all local state, offline caches, IndexedDB snapshots,
 * and memory representations to guarantee 100% data isolation between sessions.
 */
export async function clearAllLocalUserSessionData(
  queryClient?: QueryClient | null,
  options?: SessionCleanupOptions,
): Promise<void> {
  // 1. Cancel in-flight background requests and clear TanStack QueryCache
  if (queryClient) {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch (qcErr) {
      console.warn("[SessionCleanup] QueryClient clear warning:", qcErr);
    }
  }

  // 2. Wipe explicit session and financial storage keys
  const storage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : typeof globalThis !== "undefined" && (globalThis as any).localStorage
        ? (globalThis as any).localStorage
        : null;

  if (storage) {
    for (const key of USER_SESSION_STORAGE_KEYS) {
      try {
        storage.removeItem(key);
      } catch {}
    }

    if (!options?.preserveGuestFlag) {
      try {
        storage.removeItem("trouvaille_guest_mode");
      } catch {}
    }

    // 3. Scan and wipe any dynamic user/guest tenant keys
    try {
      const keysToRemove: string[] = [];
      const len = storage.length ?? 0;
      for (let i = 0; i < len; i++) {
        const k = storage.key(i);
        if (
          k &&
          (k.startsWith("trouvaille_migrated_guest_") ||
            k.startsWith("trouvaille:usr_") ||
            k.startsWith("trouvaille:guest_") ||
            k.startsWith("trouvaille_holdings_") ||
            k.startsWith("trouvaille_usdt_") ||
            k.startsWith("trouvaille_market_quotes_") ||
            k.startsWith("trouvaille_custom_category_"))
        ) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    } catch {}
  }

  // 4. Clear in-memory transaction snapshots & offline transaction files
  try {
    await clearLocalTransactionsCache();
  } catch (txErr) {
    console.warn("[SessionCleanup] clearLocalTransactionsCache warning:", txErr);
  }

  // 5. Clear IndexedDB snapshot vault
  try {
    await clearAllVaultItems();
  } catch (idbErr) {
    console.warn("[SessionCleanup] clearAllVaultItems warning:", idbErr);
  }

  // 6. Clear biometric login tokens and session vaults
  try {
    clearPersistentSession();
    clearBiometricLoginCredentials();
  } catch (bioErr) {
    console.warn("[SessionCleanup] Biometric teardown warning:", bioErr);
  }
}
