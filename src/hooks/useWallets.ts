import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Wallet, AccountClassification } from "../lib/types";

export const WALLET_CLASSIFICATION_STORAGE_KEY =
  "trouvaille_wallet_classifications_v1";

export function getDefaultWalletClassification(name: string): AccountClassification {
  if (!name) return "liquid";
  const n = name.trim().toLowerCase();
  if (
    n.includes("saham") ||
    n.includes("crypto") ||
    n.includes("investasi") ||
    n.includes("reksadana") ||
    n.includes("deposito") ||
    n.includes("stock") ||
    n.includes("emas")
  ) {
    return "investment";
  }
  if (
    n.includes("rumah") ||
    n.includes("tanah") ||
    n.includes("apartemen") ||
    n.includes("properti") ||
    n.includes("property") ||
    n.includes("real estate") ||
    n.includes("mobil") ||
    n.includes("motor") ||
    n.includes("kendaraan") ||
    n.includes("vehicle")
  ) {
    return "fixed_asset";
  }
  if (
    n.includes("piutang") ||
    n.includes("receivable") ||
    n.includes("pinjaman teman")
  ) {
    return "receivable";
  }
  if (
    n.includes("credit") ||
    n.includes("paylater") ||
    n.includes("cc") ||
    n.includes("kartu kredit") ||
    n.includes("spaylater") ||
    n.includes("gopaylater")
  ) {
    return "credit";
  }
  if (
    n.includes("liabilities") ||
    n.includes("loan") ||
    n.includes("kpr") ||
    n.includes("hutang") ||
    n.includes("pinjaman")
  ) {
    return "loan";
  }
  return "liquid";
}

export function getSavedWalletClassifications(): Record<string, AccountClassification> {
  try {
    const raw = localStorage.getItem(WALLET_CLASSIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveWalletClassification(
  walletIdOrName: string,
  classification: AccountClassification,
): void {
  try {
    const map = getSavedWalletClassifications();
    map[walletIdOrName.toLowerCase()] = classification;
    localStorage.setItem(WALLET_CLASSIFICATION_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to save wallet classification:", e);
  }
}

export function resolveWalletClassification(wallet: {
  id?: string;
  name: string;
  classification?: AccountClassification;
}): AccountClassification {
  const savedMap = getSavedWalletClassifications();
  if (wallet.id && savedMap[wallet.id.toLowerCase()]) {
    return savedMap[wallet.id.toLowerCase()];
  }
  if (wallet.name && savedMap[wallet.name.trim().toLowerCase()]) {
    return savedMap[wallet.name.trim().toLowerCase()];
  }
  if (wallet.classification) {
    return wallet.classification;
  }
  return getDefaultWalletClassification(wallet.name);
}

export const walletKeys = {
  all: (userId?: string) => ["wallets", userId ?? null] as const,
};

export function getWalletIcon(name: string): string {
  if (!name) return "Wallet";
  const n = name.trim().toLowerCase();
  if (
    n === "bca" ||
    n === "bri" ||
    n === "mandiri" ||
    n === "bni" ||
    n === "blu" ||
    n === "jago" ||
    n === "krom" ||
    n === "seabank" ||
    n === "superbank" ||
    n === "bank"
  ) {
    return "Landmark";
  }
  if (n === "cash" || n === "tunai") return "Banknote";
  if (n === "crypto" || n === "usdt" || n === "btc") return "Coins";
  if (
    n === "dana" ||
    n === "gopay" ||
    n === "ovo" ||
    n === "link" ||
    n === "linkaja" ||
    n === "shopeepay" ||
    n === "shopee"
  ) {
    return "Smartphone";
  }
  if (n === "tapcash" || n === "credit" || n === "kartu kredit") return "CreditCard";
  if (n === "saham" || n === "investasi" || n === "bibit" || n === "ajaib") return "TrendingUp";
  if (n === "piutang") return "HandCoins";
  if (n === "liabilities" || n === "hutang") return "Scale";
  if (n === "tabungan" || n === "saving") return "PiggyBank";
  return "Wallet";
}

export const DEFAULT_WALLETS = [
  "Cash",
  "BNI",
  "BCA",
  "BRI",
  "Mandiri",
  "Dana",
  "Gopay",
  "Ovo",
  "Link",
  "Shopeepay",
  "Jago",
  "BLU",
  "Krom",
  "Seabank",
  "Superbank",
  "Tapcash",
  "Crypto",
  "Saham",
  "Piutang",
  "Liabilities",
];

export const FALLBACK_WALLETS: Wallet[] = DEFAULT_WALLETS.map((name, i) => ({
  id: `fallback-${i}-${name.toLowerCase()}`,
  user_id: "default",
  name,
  icon: getWalletIcon(name),
  classification: resolveWalletClassification({ name }),
  created_at: new Date().toISOString(),
}));

export const AVAILABLE_WALLET_ICONS = [
  "Banknote",
  "Landmark",
  "Smartphone",
  "CreditCard",
  "Coins",
  "PiggyBank",
  "TrendingUp",
  "HandCoins",
  "Scale",
  "Vault",
  "Wallet",
  "Building2",
  "Receipt",
];

export function useEnsureDefaultWallets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const { data: existing } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        // Only seed on brand new user with 0 wallets. Never restore deleted wallets.
        if (!existing || existing.length === 0) {
          await supabase.from("wallets").insert(
            DEFAULT_WALLETS.map((name) => ({
              name,
              icon: getWalletIcon(name),
              user_id: user.id,
            })),
          );
        }
      } catch (e) {
        console.warn("useEnsureDefaultWallets caught error:", e);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallets"] }),
  });
}

import { useAuth } from "../contexts/AuthContext";

function withTimeout<T>(promise: PromiseLike<T>, ms = 6000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Wallets fetch timeout after ${ms}ms`)), ms),
    ),
  ]);
}

const WALLETS_BACKUP_STORAGE_KEY = "TROUVAILLE_WALLETS_BACKUP_V1";

export function useWallets() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: walletKeys.all(userId),
    queryFn: async () => {
      if (!userId) return [];
      if (userId === "guest_local_user") {
        try {
          const cached = localStorage.getItem(WALLETS_BACKUP_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((w: Wallet) => ({
                ...w,
                classification: resolveWalletClassification(w),
              }));
            }
          }
        } catch {}
        return FALLBACK_WALLETS;
      }
      try {
        const query = supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        const { data, error } = await withTimeout(query, 6000);
        if (error) throw error;

        const seen = new Set<string>();
        const unique: Wallet[] = [];
        ((data as Wallet[]) || []).forEach((w) => {
          const k = w.name.trim().toLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            const resolvedIcon =
              !w.icon || w.icon === "/icons/wallet.png"
                ? getWalletIcon(w.name)
                : w.icon;
            const resolvedClassification = resolveWalletClassification(w);
            unique.push({
              ...w,
              icon: resolvedIcon,
              classification: resolvedClassification,
            });
          }
        });

        if (unique.length > 0) {
          try {
            localStorage.setItem(WALLETS_BACKUP_STORAGE_KEY, JSON.stringify(unique));
          } catch {}
        }
        return unique;
      } catch (err) {
        console.warn("[useWallets] Fetch failed, restoring from backup/fallback:", err);
        try {
          const cached = localStorage.getItem(WALLETS_BACKUP_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((w: Wallet) => ({
                ...w,
                classification: resolveWalletClassification(w),
              }));
            }
          }
        } catch {}
        return FALLBACK_WALLETS;
      }
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useAddWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: {
      name: string;
      icon?: string;
      classification?: AccountClassification;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");
      const finalIcon = w.icon || getWalletIcon(w.name);
      const resolvedClassification =
        w.classification || resolveWalletClassification({ name: w.name });

      let created: Wallet;
      try {
        const { data, error } = await supabase
          .from("wallets")
          .insert({
            name: w.name,
            icon: finalIcon,
            user_id: user.id,
            classification: resolvedClassification,
          })
          .select()
          .single();
        if (error) throw error;
        created = data as Wallet;
      } catch {
        // Safe fallback if 'classification' column is not yet migrated in Supabase
        const { data, error } = await supabase
          .from("wallets")
          .insert({ name: w.name, icon: finalIcon, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        created = data as Wallet;
      }

      saveWalletClassification(created.id, resolvedClassification);
      saveWalletClassification(created.name, resolvedClassification);
      return { ...created, classification: resolvedClassification };
    },
    onSuccess: (newWallet) => {
      qc.setQueriesData<Wallet[]>({ queryKey: ["wallets"] }, (old) => {
        if (!old) return [newWallet];
        return [...old.filter((w) => w.id !== newWallet.id), newWallet];
      });
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useUpdateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      icon,
      classification,
    }: {
      id: string;
      name: string;
      icon?: string;
      classification?: AccountClassification;
    }) => {
      const payload: any = { name };
      if (icon) payload.icon = icon;
      else payload.icon = getWalletIcon(name);
      if (classification) payload.classification = classification;

      let updated: Wallet;
      try {
        const { data, error } = await supabase
          .from("wallets")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        updated = data as Wallet;
      } catch {
        // Safe fallback if 'classification' column does not exist yet
        delete payload.classification;
        const { data, error } = await supabase
          .from("wallets")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        updated = data as Wallet;
      }

      if (classification) {
        saveWalletClassification(id, classification);
        saveWalletClassification(name, classification);
      }
      const finalClassification =
        classification || resolveWalletClassification(updated);
      return { ...updated, classification: finalClassification };
    },
    onSuccess: (updated) => {
      qc.setQueriesData<Wallet[]>({ queryKey: ["wallets"] }, (old) => {
        if (!old) return [];
        return old.map((w) => (w.id === updated.id ? updated : w));
      });
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function useDeleteWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: refError } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .or(`wallet_id.eq.${id},to_wallet_id.eq.${id}`);

      if (refError) throw refError;
      if ((count || 0) > 0) {
        throw new Error(
          "Wallet masih dipakai oleh transaksi. Pindahkan atau hapus transaksinya dulu.",
        );
      }

      const { error } = await supabase.from("wallets").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.setQueriesData<Wallet[]>({ queryKey: ["wallets"] }, (old) => {
        if (!old) return [];
        return old.filter((w) => w.id !== deletedId);
      });
      qc.invalidateQueries({ queryKey: ["wallets"] });
    },
  });
}

export function resolveTransactionWallets(
  tx: { wallet_id?: string | null; to_wallet_id?: string | null },
  walletsOrMap: Wallet[] | Map<string, Wallet>,
): { from: string; to: string } {
  const isMap = walletsOrMap instanceof Map;
  const getWallet = (id: string): Wallet | undefined =>
    isMap ? walletsOrMap.get(id) : walletsOrMap.find((w) => w.id === id);

  let fromName: string | undefined;
  let toName: string | undefined;

  if (tx.wallet_id) {
    const found = getWallet(tx.wallet_id);
    if (found) fromName = found.name;
  }
  if (tx.to_wallet_id) {
    const found = getWallet(tx.to_wallet_id);
    if (found) toName = found.name;
  }

  return { from: fromName || "Cash", to: toName || "Cash" };
}
