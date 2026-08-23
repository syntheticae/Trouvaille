const fs = require("fs");
let content = fs.readFileSync("src/hooks/useTransactions.ts", "utf8");

const header = `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { Transaction, TransactionType } from "../lib/types"
import { format } from "date-fns"

interface TransactionInput {
  type: TransactionType
  amount: number
  category_id: string | null
  wallet_id?: string | null
  to_wallet_id?: string | null
  note?: string | null
  occurred_on: string
  created_at?: string
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ["transactions", "recent", limit],
`;

if (!content.includes("import { useQuery")) {
  content = header + content;
}

fs.writeFileSync("src/hooks/useTransactions.ts", content, "utf8");
console.log("Restored useTransactions.ts");
