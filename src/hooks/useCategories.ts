import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Category, TransactionType, CashflowNature } from "../lib/types";

export const categoryKeys = {
  all: (userId?: string) => ["categories", userId ?? null, null] as const,
  byType: (userId?: string, type?: TransactionType) =>
    ["categories", userId ?? null, type ?? null] as const,
};

// ======================================================================
// DEFAULT CATEGORIES — using PNG icons from public/icons/
// Income: gaji, bunga, pemberian, trading, side job, investasi, hadiah
// Expense: everything else
// ======================================================================
export const CATEGORY_PARENT_MAP: Record<string, string> = {
  // Expense Parents
  kerugian: "Biaya",
  karir: "Biaya",
  "admin & fee": "Biaya",
  "pajak & legal": "Biaya",
  jasa: "Biaya",
  keluarga: "Keluarga",
  pets: "Keluarga",
  groceries: "Papan",
  peralatan: "Papan",
  furnitur: "Papan",
  reparasi: "Papan",
  elektronik: "Papan",
  laundry: "Papan",
  hunian: "Papan",
  asuransi: "Sandang",
  fashion: "Sandang",
  perawatan: "Sandang",
  kesehatan: "Sandang",
  pendidikan: "Sandang",
  zakat: "Sosial",
  hadiah: "Sosial",
  donasi: "Sosial",
  hiburan: "Hiburan",
  subscription: "Hiburan",
  liburan: "Hiburan",
  tabungan: "Keuangan",
  internet: "Komunikasi",
  lainnya: "Lainnya",
  olahraga: "Olahraga",
  makanan: "Pangan",
  minuman: "Pangan",
  kopi: "Pangan",
  cafe: "Pangan",
  gadget: "Personal",
  transportasi: "Transportasi",
  bensin: "Transportasi",
  parkir: "Transportasi",
  kendaraan: "Transportasi",

  // Income Parents
  bonus: "Pendapatan",
  komisi: "Pendapatan",
  saku: "Pendapatan",
  cashback: "Pendapatan",
  refund: "Pendapatan",
  penjualan: "Pendapatan",
  gaji: "Pendapatan",
  "side job": "Pendapatan",
  bunga: "Pendapatan",
  pemberian: "Pendapatan",
  investasi: "Keuangan",
  trading: "Keuangan",
};

export const PARENT_ICON_MAP: Record<string, string> = {
  Pangan: "Utensils",
  Transportasi: "Car",
  Papan: "Home",
  Sandang: "Shirt",
  Biaya: "Receipt",
  Sosial: "HeartHandshake",
  Hiburan: "Gamepad2",
  Komunikasi: "Wifi",
  Keluarga: "Users",
  Olahraga: "Dumbbell",
  Keuangan: "TrendingUp",
  Personal: "Sparkles",
  Pendapatan: "Briefcase",
  Lainnya: "Tag",
};

export function getCategoryParent(categoryName: string): string {
  if (!categoryName) return "Lainnya";
  return CATEGORY_PARENT_MAP[categoryName.trim().toLowerCase()] || "Lainnya";
}

export function getParentIcon(parentName: string): string {
  return PARENT_ICON_MAP[parentName] || "Tag";
}

export const CATEGORY_CASHFLOW_MAP: Record<string, CashflowNature> = {
  investasi: "investing",
  trading: "investing",
  saham: "investing",
  crypto: "investing",
  reksadana: "investing",
  deposito: "investing",
  emas: "investing",
  gadget: "investing",
  elektronik: "investing",
  furnitur: "investing",
  peralatan: "investing",
  cicilan: "financing",
  hutang: "financing",
  pinjaman: "financing",
  liabilitas: "financing",
  "kartu kredit": "financing",
  paylater: "financing",
};

export function getCategoryCashflowNature(
  categoryName?: string | null,
  customNature?: CashflowNature,
): CashflowNature {
  if (customNature) return customNature;
  if (!categoryName) return "operating";
  const k = categoryName.trim().toLowerCase();
  return CATEGORY_CASHFLOW_MAP[k] || "operating";
}

// ======================================================================
// DEFAULT CATEGORIES — using PNG icons from public/icons/
// ======================================================================
export const DEFAULT_CATEGORIES: Omit<
  Category,
  "id" | "user_id" | "created_at"
>[] = [
  // --- INCOME ---
  { name: "Gaji", emoji: "Briefcase", type: "income", is_default: true },
  {
    name: "Bonus",
    emoji: "Gift",
    type: "income",
    is_default: true,
  },
  {
    name: "Komisi",
    emoji: "BadgePercent",
    type: "income",
    is_default: true,
  },
  { name: "Saku", emoji: "Coins", type: "income", is_default: true },
  {
    name: "Cashback",
    emoji: "Percent",
    type: "income",
    is_default: true,
  },
  {
    name: "Refund",
    emoji: "RotateCcw",
    type: "income",
    is_default: true,
  },
  {
    name: "Penjualan",
    emoji: "Store",
    type: "income",
    is_default: true,
  },
  {
    name: "Investasi",
    emoji: "TrendingUp",
    type: "income",
    is_default: true,
  },
  {
    name: "Trading",
    emoji: "CandlestickChart",
    type: "income",
    is_default: true,
  },
  {
    name: "Side Job",
    emoji: "Briefcase",
    type: "income",
    is_default: true,
  },
  {
    name: "Bunga",
    emoji: "Percent",
    type: "income",
    is_default: true,
  },
  {
    name: "Pemberian",
    emoji: "Gift",
    type: "income",
    is_default: true,
  },
  {
    name: "Hadiah",
    emoji: "Trophy",
    type: "income",
    is_default: true,
  },

  // --- EXPENSE ---
  {
    name: "Makanan",
    emoji: "Utensils",
    type: "expense",
    is_default: true,
  },
  {
    name: "Minuman",
    emoji: "CupSoda",
    type: "expense",
    is_default: true,
  },
  { name: "Kopi", emoji: "Coffee", type: "expense", is_default: true },
  { name: "Cafe", emoji: "Coffee", type: "expense", is_default: true },
  {
    name: "Groceries",
    emoji: "ShoppingBag",
    type: "expense",
    is_default: true,
  },
  {
    name: "Transportasi",
    emoji: "Car",
    type: "expense",
    is_default: true,
  },
  {
    name: "Bensin",
    emoji: "Fuel",
    type: "expense",
    is_default: true,
  },
  {
    name: "Kendaraan",
    emoji: "Car",
    type: "expense",
    is_default: true,
  },
  {
    name: "Parkir",
    emoji: "ParkingCircle",
    type: "expense",
    is_default: true,
  },
  {
    name: "Fashion",
    emoji: "Shirt",
    type: "expense",
    is_default: true,
  },
  {
    name: "Asuransi",
    emoji: "ShieldCheck",
    type: "expense",
    is_default: true,
  },
  {
    name: "Kesehatan",
    emoji: "HeartPulse",
    type: "expense",
    is_default: true,
  },
  {
    name: "Perawatan",
    emoji: "Sparkles",
    type: "expense",
    is_default: true,
  },
  {
    name: "Pendidikan",
    emoji: "GraduationCap",
    type: "expense",
    is_default: true,
  },
  {
    name: "Gadget",
    emoji: "Smartphone",
    type: "expense",
    is_default: true,
  },
  {
    name: "Elektronik",
    emoji: "Tv",
    type: "expense",
    is_default: true,
  },
  {
    name: "Peralatan",
    emoji: "Wrench",
    type: "expense",
    is_default: true,
  },
  {
    name: "Furnitur",
    emoji: "Armchair",
    type: "expense",
    is_default: true,
  },
  {
    name: "Reparasi",
    emoji: "Hammer",
    type: "expense",
    is_default: true,
  },
  {
    name: "Hunian",
    emoji: "Home",
    type: "expense",
    is_default: true,
  },
  {
    name: "Laundry",
    emoji: "Shirt",
    type: "expense",
    is_default: true,
  },
  {
    name: "Keluarga",
    emoji: "Users",
    type: "expense",
    is_default: true,
  },
  { name: "Pets", emoji: "Dog", type: "expense", is_default: true },
  {
    name: "Olahraga",
    emoji: "Dumbbell",
    type: "expense",
    is_default: true,
  },
  {
    name: "Hiburan",
    emoji: "Gamepad2",
    type: "expense",
    is_default: true,
  },
  {
    name: "Subscription",
    emoji: "CreditCard",
    type: "expense",
    is_default: true,
  },
  {
    name: "Liburan",
    emoji: "Plane",
    type: "expense",
    is_default: true,
  },
  {
    name: "Zakat",
    emoji: "HeartHandshake",
    type: "expense",
    is_default: true,
  },
  {
    name: "Donasi",
    emoji: "HeartHandshake",
    type: "expense",
    is_default: true,
  },
  {
    name: "Internet",
    emoji: "Wifi",
    type: "expense",
    is_default: true,
  },
  {
    name: "Admin & Fee",
    emoji: "Receipt",
    type: "expense",
    is_default: true,
  },
  {
    name: "Pajak & Legal",
    emoji: "Scale",
    type: "expense",
    is_default: true,
  },
  { name: "Jasa", emoji: "Briefcase", type: "expense", is_default: true },
  {
    name: "Karir",
    emoji: "TrendingUp",
    type: "expense",
    is_default: true,
  },
  {
    name: "Kerugian",
    emoji: "TrendingDown",
    type: "expense",
    is_default: true,
  },
  {
    name: "Tabungan",
    emoji: "Wallet",
    type: "expense",
    is_default: true,
  },
  {
    name: "Lainnya",
    emoji: "Tag",
    type: "expense",
    is_default: true,
  },
];

import { useAuth } from "../contexts/AuthContext";

function withTimeout<T>(promise: PromiseLike<T>, ms = 6000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Categories fetch timeout after ${ms}ms`)), ms),
    ),
  ]);
}

const CATEGORIES_BACKUP_STORAGE_KEY = "TROUVAILLE_CATEGORIES_BACKUP_V1";

export function useCategories(type?: TransactionType) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: categoryKeys.byType(userId, type),
    queryFn: async () => {
      if (userId === "guest_local_user") {
        try {
          const cached = localStorage.getItem(CATEGORIES_BACKUP_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as Category[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              return type ? parsed.filter((c) => c.type === type) : parsed;
            }
          }
        } catch {}

        const fallbackList: Category[] = DEFAULT_CATEGORIES.filter(
          (c) => !type || c.type === type,
        ).map((c, i) => ({
          id: `fallback-cat-${i}-${c.name.toLowerCase()}`,
          user_id: "guest_local_user",
          name: c.name,
          emoji: c.emoji,
          type: c.type,
          is_default: true,
          created_at: new Date().toISOString(),
        }));
        return fallbackList;
      }
      try {
        let query = supabase
          .from("categories")
          .select("*")
          .order("is_default", { ascending: false })
          .order("name");
        if (userId) query = query.eq("user_id", userId);
        if (type) query = query.eq("type", type);
        const { data, error } = await withTimeout(query, 6000);
        if (error) throw error;

        // Deduplicate by name (case-insensitive) per type to prevent any duplicate categories
        const seen = new Set<string>();
        const uniqueList: Category[] = [];
        ((data as Category[]) || []).forEach((cat) => {
          const key = `${cat.type}_${cat.name.trim().toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueList.push(cat);
          }
        });

        if (uniqueList.length > 0 && !type) {
          try {
            localStorage.setItem(
              CATEGORIES_BACKUP_STORAGE_KEY,
              JSON.stringify(uniqueList),
            );
          } catch {}
        }
        return uniqueList;
      } catch (err) {
        console.warn("[useCategories] Fetch failed, restoring from backup/defaults:", err);
        try {
          const cached = localStorage.getItem(CATEGORIES_BACKUP_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as Category[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              return type ? parsed.filter((c) => c.type === type) : parsed;
            }
          }
        } catch {}

        // Fallback to DEFAULT_CATEGORIES
        const fallbackList: Category[] = DEFAULT_CATEGORIES.filter(
          (c) => !type || c.type === type,
        ).map((c, i) => ({
          id: `fallback-cat-${i}-${c.name.toLowerCase()}`,
          user_id: userId || "default",
          name: c.name,
          emoji: c.emoji,
          type: c.type,
          is_default: c.is_default,
          created_at: new Date().toISOString(),
        }));
        return fallbackList;
      }
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useEnsureDefaultCategories() {
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
          .from("categories")
          .select("id, name, type")
          .eq("user_id", user.id);

        const existingMap = new Set(
          (existing || []).map(
            (c) => `${c.type}_${c.name.trim().toLowerCase()}`,
          ),
        );

        const missing = DEFAULT_CATEGORIES.filter(
          (c) => !existingMap.has(`${c.type}_${c.name.trim().toLowerCase()}`),
        );

        if (missing.length > 0) {
          await supabase
            .from("categories")
            .insert(missing.map((c) => ({ ...c, user_id: user.id })));
        }
      } catch (err) {
        console.warn("useEnsureDefaultCategories error:", err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useResetDefaultCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      // Delete all default categories
      await supabase
        .from("categories")
        .delete()
        .eq("user_id", user.id)
        .eq("is_default", true);
      // Re-insert with new PNG icons
      await supabase
        .from("categories")
        .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: {
      name: string;
      emoji: string;
      type: TransactionType;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("categories")
        .insert({ ...cat, user_id: user.id, is_default: false })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (newCat) => {
      qc.setQueriesData<Category[]>({ queryKey: ["categories"] }, (old) => {
        if (!old) return [newCat];
        return [...old.filter((c) => c.id !== newCat.id), newCat];
      });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: refError } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id);

      if (refError) throw refError;
      if ((count || 0) > 0) {
        throw new Error(
          "Category is currently used by transactions. Please reassign or delete its transactions first.",
        );
      }

      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.setQueriesData<Category[]>({ queryKey: ["categories"] }, (old) => {
        if (!old) return [];
        return old.filter((c) => c.id !== deletedId);
      });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      emoji,
      budget_amount,
    }: {
      id: string;
      name?: string;
      emoji?: string;
      budget_amount?: number | null;
    }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (emoji !== undefined) updates.emoji = emoji;
      if (budget_amount !== undefined) updates.budget_amount = budget_amount;
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (updated) => {
      qc.setQueriesData<Category[]>({ queryKey: ["categories"] }, (old) => {
        if (!old) return [];
        return old.map((c) => (c.id === updated.id ? updated : c));
      });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
