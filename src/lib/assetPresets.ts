import type { AssetType } from "./types";

export type PresetCategory =
  | "all"
  | "crypto"
  | "stock_us"
  | "stock_id"
  | "gold"
  | "mutual_fund"
  | "fixed_asset"
  | "valas";

export interface PresetAsset {
  symbol: string;
  name: string;
  type: AssetType;
  category: PresetCategory;
  suggestedCurrency?: "IDR" | "USD";
  icon?: string;
}

export const PRESET_ASSETS: PresetAsset[] = [
  // Crypto
  {
    symbol: "USDT",
    name: "Tether USD (Stablecoin)",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "SOL",
    name: "Solana",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "BNB",
    name: "Binance Coin",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "XRP",
    name: "Ripple",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "ADA",
    name: "Cardano",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    type: "crypto",
    category: "crypto",
    suggestedCurrency: "USD",
    icon: "Coins",
  },

  // US Equities
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    type: "stock",
    category: "stock_us",
    suggestedCurrency: "USD",
    icon: "TrendingUp",
  },

  // IDX Equities
  {
    symbol: "BBCA",
    name: "Bank Central Asia",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "BBRI",
    name: "Bank Rakyat Indonesia",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "BMRI",
    name: "Bank Mandiri",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "BBNI",
    name: "Bank Negara Indonesia",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "TLKM",
    name: "Telkom Indonesia",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "ASII",
    name: "Astra International",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "ICBP",
    name: "Indofood CBP",
    type: "stock",
    category: "stock_id",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },

  // Gold & Commodities
  {
    symbol: "XAU",
    name: "Gold Antam (per gram)",
    type: "gold",
    category: "gold",
    suggestedCurrency: "IDR",
    icon: "Landmark",
  },
  {
    symbol: "UBS",
    name: "Gold UBS (per gram)",
    type: "gold",
    category: "gold",
    suggestedCurrency: "IDR",
    icon: "Landmark",
  },
  {
    symbol: "XAG",
    name: "Silver Pure (per gram)",
    type: "gold",
    category: "gold",
    suggestedCurrency: "IDR",
    icon: "Landmark",
  },

  // Mutual Funds
  {
    symbol: "RD-PASAR-UANG",
    name: "Money Market Fund",
    type: "mutual_fund",
    category: "mutual_fund",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "RD-PENDAPATAN-TETAP",
    name: "Fixed Income Fund",
    type: "mutual_fund",
    category: "mutual_fund",
    suggestedCurrency: "IDR",
    icon: "FileText",
  },
  {
    symbol: "RD-SAHAM",
    name: "Equity Fund",
    type: "mutual_fund",
    category: "mutual_fund",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },
  {
    symbol: "RD-CAMPURAN",
    name: "Balanced Fund",
    type: "mutual_fund",
    category: "mutual_fund",
    suggestedCurrency: "IDR",
    icon: "TrendingUp",
  },

  // Fixed Assets
  {
    symbol: "RUMAH",
    name: "Residential Property",
    type: "fixed_asset",
    category: "fixed_asset",
    suggestedCurrency: "IDR",
    icon: "Home",
  },
  {
    symbol: "TANAH",
    name: "Land / Real Estate",
    type: "fixed_asset",
    category: "fixed_asset",
    suggestedCurrency: "IDR",
    icon: "Landmark",
  },
  {
    symbol: "MOBIL",
    name: "Vehicle / Automobile",
    type: "fixed_asset",
    category: "fixed_asset",
    suggestedCurrency: "IDR",
    icon: "Shield",
  },
  {
    symbol: "LOGAM",
    name: "Physical Precious Metals",
    type: "fixed_asset",
    category: "fixed_asset",
    suggestedCurrency: "IDR",
    icon: "Coins",
  },

  // Valas (Foreign Currency Holdings)
  {
    symbol: "USD",
    name: "US Dollar",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "EUR",
    name: "Euro",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "SGD",
    name: "Singapore Dollar",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "JPY",
    name: "Japanese Yen",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "GBP",
    name: "British Pound",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "AUD",
    name: "Australian Dollar",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "CNY",
    name: "Chinese Yuan",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
  {
    symbol: "MYR",
    name: "Malaysian Ringgit",
    type: "crypto",
    category: "valas",
    suggestedCurrency: "USD",
    icon: "Banknote",
  },
];
