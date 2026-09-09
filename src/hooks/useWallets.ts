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
  if (wallet.classification && wallet.classification !== "liquid") {
    return wallet.classification;
  }
  const naturalClass = getDefaultWalletClassification(wallet.name);
  if (naturalClass !== "liquid") {
    return naturalClass;
  }
  return wallet.classification || "liquid";
}

export const walletKeys = {
  all: (userId?: string) => ["wallets", userId ?? null] as const,
};

export function getWalletIcon(name: string): string {
  if (!name) return "/icons/Budgets/custom.png";
  const n = name.trim().toLowerCase();
  if (n === "bca") return "/icons/Budgets/BCA.png";
  if (n === "bri") return "/icons/Budgets/BRI.png";
  if (n === "mandiri") return "/icons/Budgets/Mandiri.png";
  if (n === "link" || n === "linkaja") return "/icons/Budgets/Link.png";
  if (n === "ovo") return "/icons/Budgets/Ovo.png";
  if (n === "blu") return "/icons/Budgets/BLU.png";
  if (n === "bni") return "/icons/Budgets/BNI.png";
  if (n === "cash") return "/icons/Budgets/Cash.png";
  if (n === "crypto") return "/icons/Budgets/Crypto.png";
  if (n === "dana") return "/icons/Budgets/Dana.png";
  if (n === "gopay") return "/icons/Budgets/Gopay.png";
  if (n === "jago") return "/icons/Budgets/Jago.png";
  if (n === "krom") return "/icons/Budgets/Krom.png";
  if (n === "liabilities") return "/icons/Budgets/Liabilities.png";
  if (n === "piutang") return "/icons/Budgets/Piutang.png";
  if (n === "saham") return "/icons/Budgets/Saham.png";
  if (n === "seabank") return "/icons/Budgets/Seabank.png";
  if (n === "shopeepay" || n === "shopee")
    return "/icons/Budgets/Shopeepay.png";
  if (n === "superbank") return "/icons/Budgets/Superbank.png";
  if (n === "tapcash") return "/icons/Budgets/Tapcash.png";
  return "/icons/Budgets/custom.png";
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
  "/icons/Budgets/Cash.png",
  "/icons/Budgets/BCA.png",
  "/icons/Budgets/BNI.png",
  "/icons/Budgets/BRI.png",
  "/icons/Budgets/Mandiri.png",
  "/icons/Budgets/Dana.png",
  "/icons/Budgets/Gopay.png",
  "/icons/Budgets/Ovo.png",
  "/icons/Budgets/Link.png",
  "/icons/Budgets/Shopeepay.png",
  "/icons/Budgets/Jago.png",
  "/icons/Budgets/BLU.png",
  "/icons/Budgets/Krom.png",
  "/icons/Budgets/Seabank.png",
  "/icons/Budgets/Superbank.png",
  "/icons/Budgets/Tapcash.png",
  "/icons/Budgets/Crypto.png",
  "/icons/Budgets/Saham.png",
  "/icons/Budgets/Piutang.png",
  "/icons/Budgets/Liabilities.png",
  "/icons/tabungan.png",
  "/icons/investasi.png",
  "/icons/trading.png",
  "/icons/wallet.png",
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
  wallets: Wallet[],
): { from: string; to: string } {
  let fromName: string | undefined;
  let toName: string | undefined;

  if (tx.wallet_id) {
    const found = wallets.find((w) => w.id === tx.wallet_id);
    if (found) fromName = found.name;
  }
  if (tx.to_wallet_id) {
    const found = wallets.find((w) => w.id === tx.to_wallet_id);
    if (found) toName = found.name;
  }

  return { from: fromName || "Cash", to: toName || "Cash" };
}
