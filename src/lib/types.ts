export type TransactionType = "income" | "expense" | "transfer" | "adjustment"
export type RepeatRule = "none" | "weekly" | "monthly" | "yearly"

export interface Category {
  id: string; user_id: string; name: string; emoji: string
  type: TransactionType; is_default: boolean; created_at: string
  budget_amount?: number | null
}

export interface Wallet {
  id: string; user_id: string; name: string; icon: string; created_at: string
}

export interface Transaction {
  id: string; user_id: string; category_id: string | null; wallet_id: string | null; to_wallet_id: string | null
  type: TransactionType; amount: number; note: string | null
  occurred_on: string; created_at: string
  categories?: Category | null
}

export interface Bill {
  id: string; user_id: string; title: string
  amount: number | null; due_date: string
  repeat_rule: RepeatRule; is_paid: boolean
  note: string | null; created_at: string
}



