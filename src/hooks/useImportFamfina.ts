import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import famfinaData from "../data/famfina_transactions.json";
import { categoryKeys } from "./useCategories";
import { walletKeys } from "./useWallets";
import {
  transactionKeys,
  fetchAllTransactionsFromSupabase,
} from "./useTransactions";
import { syncAllFamfinaToSupabase } from "../lib/famfinaResolver";

export interface FamfinaRecord {
  file: string;
  occurred_on: string;
  created_at: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  fromWallet: string;
  toWallet: string | null;
  categoryName: string;
  note: string | null;
}

export function mapCategoryName(name: string): string {
  const n = name.trim();
  if (n === "BBM") return "Bensin";
  if (n === "Biaya Admin") return "Admin & Fee";
  if (n === "Tagihan" || n === "Langganan") return "Subscription";
  if (n === "Sampingan" || n === "Bonus") return "Side Job";
  if (n === "Kopi") return "Kopi";
  if (n === "Cafe") return "Cafe";
  if (n === "Lain-lain" || n === "Koreksi Saldo") return "Lainnya";
  if (n === "Groceries") return "Makanan";
  if (n === "Pajak/Legal") return "Pajak & Legal";
  if (n === "Peralatan") return "Lainnya";
  if (n === "Hilang") return "Hilang";
  return n;
}

export function normalizeWalletName(w: string): string {
  if (!w) return "Cash";
  const lw = w.toLowerCase();
  if (lw.includes("shopee")) return "Shopeepay";
  if (lw.includes("krom")) return "Krom";
  if (lw.includes("blu")) return "Blu";
  if (lw.includes("super")) return "Superbank";
  if (lw.includes("sea")) return "Seabank";
  if (lw.includes("tap")) return "Tapcash";
  if (lw.includes("piutang")) return "Piutang";
  if (lw.includes("crypto")) return "Crypto";
  if (lw.includes("bni")) return "BNI";
  if (lw.includes("bca")) return "BCA";
  if (lw.includes("dana")) return "Dana";
  if (lw.includes("jago")) return "Jago";
  if (lw.includes("cash")) return "Cash";
  return w;
}

export function useImportFamfina() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    stage: string;
  }>({
    current: 0,
    total: famfinaData.length,
    stage: "idle",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        throw new Error("Silakan masuk terlebih dahulu untuk mengimpor data.");

      setProgress({
        current: 0,
        total: famfinaData.length,
        stage: "Menyelaraskan data Famfina ke cloud...",
      });

      const result = await syncAllFamfinaToSupabase((current, total) => {
        setProgress({
          current,
          total: total || famfinaData.length,
          stage: `Menyinkronkan ${current} dari ${total || famfinaData.length} transaksi...`,
        });
      });

      setProgress({
        current: result.total,
        total: result.total,
        stage: result.alreadySynced
          ? "Semua data sudah sinkron."
          : "Sinkronisasi selesai!",
      });

      const freshTxs = await fetchAllTransactionsFromSupabase({
        userId: user.id,
      });
      const [freshWallets, freshCategories] = await Promise.all([
        supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name"),
      ]);

      if (freshWallets.error) throw freshWallets.error;
      if (freshCategories.error) throw freshCategories.error;

      qc.setQueryData(transactionKeys.all(user.id), freshTxs);
      qc.setQueryData(walletKeys.all(user.id), freshWallets.data ?? []);
      qc.setQueryData(categoryKeys.all(user.id), freshCategories.data ?? []);

      return {
        importedCount: result.alreadySynced ? 0 : result.inserted,
        alreadyExisted: result.alreadySynced,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return {
    ...mutation,
    progress,
    totalRecords: famfinaData.length,
  };
}
