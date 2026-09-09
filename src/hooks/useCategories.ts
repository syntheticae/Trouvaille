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
  Pangan: "/icons/makanan.png",
  Transportasi: "/icons/transportasi.png",
  Papan: "/icons/hunian.png",
  Sandang: "/icons/fashion.png",
  Biaya: "/icons/admin.png",
  Sosial: "/icons/donasi.png",
  Hiburan: "/icons/hiburan.png",
  Komunikasi: "/icons/internet.png",
  Keluarga: "/icons/Keluarga.png",
  Olahraga: "/icons/olahraga.png",
  Keuangan: "/icons/investasi.png",
  Personal: "/icons/gadget.png",
  Pendapatan: "/icons/gaji.png",
  Lainnya: "/icons/lainnya.png",
};

export function getCategoryParent(categoryName: string): string {
  if (!categoryName) return "Lainnya";
  return CATEGORY_PARENT_MAP[categoryName.trim().toLowerCase()] || "Lainnya";
}

export function getParentIcon(parentName: string): string {
  return PARENT_ICON_MAP[parentName] || "/icons/lainnya.png";
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
  { name: "Gaji", emoji: "/icons/gaji.png", type: "income", is_default: true },
  {
    name: "Bonus",
    emoji: "/icons/Bonus.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Komisi",
    emoji: "/icons/Komisi.png",
    type: "income",
    is_default: true,
  },
  { name: "Saku", emoji: "/icons/Saku.png", type: "income", is_default: true },
  {
    name: "Cashback",
    emoji: "/icons/Cashback.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Refund",
    emoji: "/icons/Refund.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Penjualan",
    emoji: "/icons/Penjualan.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Investasi",
    emoji: "/icons/investasi.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Trading",
    emoji: "/icons/trading.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Side Job",
    emoji: "/icons/side job.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Bunga",
    emoji: "/icons/bunga.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Pemberian",
    emoji: "/icons/pemberian.png",
    type: "income",
    is_default: true,
  },
  {
    name: "Hadiah",
    emoji: "/icons/hadiah.png",
    type: "income",
    is_default: true,
  },

  // --- EXPENSE ---
  {
    name: "Makanan",
    emoji: "/icons/makanan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Minuman",
    emoji: "/icons/minuman.png",
    type: "expense",
    is_default: true,
  },
  { name: "Kopi", emoji: "/icons/kopi.png", type: "expense", is_default: true },
  { name: "Cafe", emoji: "/icons/cafe.png", type: "expense", is_default: true },
  {
    name: "Groceries",
    emoji: "/icons/Groceries.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Transportasi",
    emoji: "/icons/transportasi.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Bensin",
    emoji: "/icons/bensin.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Kendaraan",
    emoji: "/icons/kendaraan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Parkir",
    emoji: "/icons/parkir.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Fashion",
    emoji: "/icons/fashion.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Asuransi",
    emoji: "/icons/Asuransi.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Kesehatan",
    emoji: "/icons/kesehatan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Perawatan",
    emoji: "/icons/perawatan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Pendidikan",
    emoji: "/icons/pendidikan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Gadget",
    emoji: "/icons/gadget.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Elektronik",
    emoji: "/icons/Elektronik.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Peralatan",
    emoji: "/icons/Peralatan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Furnitur",
    emoji: "/icons/Furnitur.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Reparasi",
    emoji: "/icons/Reparasi.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Hunian",
    emoji: "/icons/hunian.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Laundry",
    emoji: "/icons/laundry.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Keluarga",
    emoji: "/icons/Keluarga.png",
    type: "expense",
    is_default: true,
  },
  { name: "Pets", emoji: "/icons/Pets.png", type: "expense", is_default: true },
  {
    name: "Olahraga",
    emoji: "/icons/olahraga.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Hiburan",
    emoji: "/icons/hiburan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Subscription",
    emoji: "/icons/subscription.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Liburan",
    emoji: "/icons/liburan.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Zakat",
    emoji: "/icons/Zakat.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Donasi",
    emoji: "/icons/donasi.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Internet",
    emoji: "/icons/internet.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Admin & Fee",
    emoji: "/icons/admin.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Pajak & Legal",
    emoji: "/icons/pajak-legal.png",
    type: "expense",
    is_default: true,
  },
  { name: "Jasa", emoji: "/icons/jasa.png", type: "expense", is_default: true },
  {
    name: "Karir",
    emoji: "/icons/Karir.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Kerugian",
    emoji: "/icons/kerugian.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Tabungan",
    emoji: "/icons/wallet.png",
    type: "expense",
    is_default: true,
  },
  {
    name: "Lainnya",
    emoji: "/icons/lainnya.png",
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
          "Kategori masih dipakai oleh transaksi. Pindahkan atau hapus transaksinya dulu.",
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
