// ======================================================================
// TROUVAILLE CORE DOMAIN TYPES & INTERFACES
// Centralized type definitions for accounts, ledger, assets, and forecasting
// ======================================================================

export type TransactionType = "income" | "expense" | "transfer" | "adjustment";
export type RepeatRule = "none" | "weekly" | "monthly" | "yearly";

export type AccountClassification =
  | "liquid"
  | "investment"
  | "fixed_asset"
  | "receivable"
  | "credit"
  | "loan";

export type AssetType =
  | "stock"
  | "crypto"
  | "mutual_fund"
  | "gold"
  | "bond"
  | "fixed_asset";

export interface InvestmentHolding {
  id: string;
  wallet_id?: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  units: number;
  avg_buy_price: number;
  current_price: number;
  currency?: string;
  last_price_updated_at?: string;
  notes?: string;
  icon?: string;
  annual_rate?: number; // Estimated annual appreciation (+) or depreciation (-) rate in percent
  purchase_date?: string; // YYYY-MM-DD
}

export type CashflowNature = "operating" | "investing" | "financing";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  type: TransactionType;
  is_default: boolean;
  created_at: string;
  budget_amount?: number | null;
  cashflow_nature?: CashflowNature;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  created_at: string;
  classification?: AccountClassification;
  balance?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  wallet_id: string | null;
  to_wallet_id: string | null;
  type: TransactionType;
  amount: number;
  note: string | null;
  occurred_on: string;
  created_at: string;
  categories?: Category | null;
  space_id?: string | null;
}

export interface Bill {
  id: string;
  user_id: string;
  title: string;
  amount: number | null;
  due_date: string;
  repeat_rule: RepeatRule;
  is_paid: boolean;
  note: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  icon?: string;
  color?: string;
  targetDate?: string;
}
