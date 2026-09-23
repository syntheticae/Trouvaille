// ======================================================================
// TROUVAILLE ASSETS & PORTFOLIO VALUATION PAGE (RESOLUSI 2)
// The Silicon Valley Wealth Bento:
// [1] Hero Net Valuation (Compact)
// [2] Bento Matrix 2x2 (Inflow Velocity, Liquid Runway, Dominance, 3-Tier Liquidity)
// [3] Monthly Capital Deployment Bar Chart (shadcn/ui minimal)
// [4] Enhanced Holdings Deck with Inline Dominance Progress Bars
// [5] Collapsible Advanced Portfolio Analytics Accordion
// [6] Standard BottomSheet for Preset Picker & Asset Details
// Strictly ZERO DUMMY DATA: All telemetry computed directly from real user state
// Strictly Non-Mixed Localization (100% Pure English / Indonesian)
// ======================================================================

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Coins,
  Link2,
  Search,
  RefreshCw,
  X,
  Sparkles,
  ChevronRight,
  Wallet,
  TrendingUp,
  Landmark,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowUpRight,
} from "lucide-react";
import { formatRupiah } from "../lib/utils";
import { triggerHaptic } from "../lib/haptics";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useAuth } from "../contexts/AuthContext";
import { useWallets } from "../hooks/useWallets";
import { useAllTransactions } from "../hooks/useTransactions";
import {
  fetchCryptoPriceInIDR,
  fetchStockPriceInIDR,
  getSavedHoldings,
  getSavedUsdtPref,
  getStandardUsdtHoldingId,
  saveUsdtPref,
  upsertHolding,
  deleteHolding,
  calculateHoldingValuation,
  fetchHoldingsFromSupabase,
  refreshAllPortfolioPrices,
  type UsdtValuationPref,
} from "../lib/marketPriceService";
import {
  auditUsdtReconciliation,
  applyUsdtReconciliation,
} from "../lib/holdingSyncEngine";
import { IconRenderer } from "../components/ui/IconRenderer";
import { MonochromeIconPickerModal } from "../components/ui/MonochromeIconPickerModal";
import { AssetDetailSheet } from "../components/settings/AssetDetailSheet";
import { StakingYieldModal } from "../components/settings/StakingYieldModal";
import { BottomSheet } from "../components/ui/BottomSheet";
import { PortfolioInsightCards } from "../components/assets/PortfolioInsightCards";
import {
  calculateHistoricalCandlesticks,
  formatRunwaySummary,
  type CandlestickData,
} from "../lib/portfolioAnalytics";
import { format, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type {
  InvestmentHolding,
  AssetType,
} from "../lib/types";

export type PresetCategory =
  | "all"
  | "crypto"
  | "stock_us"
  | "stock_id"
  | "gold"
  | "mutual_fund"
  | "fixed_asset";

export type BalanceSheetRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

interface PresetAsset {
  symbol: string;
  name: string;
  type: AssetType;
  category: PresetCategory;
  suggestedCurrency?: "IDR" | "USD";
  icon?: string;
}

const PRESET_ASSETS: PresetAsset[] = [
  // Crypto
  { symbol: "BTC", name: "Bitcoin", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },
  { symbol: "ETH", name: "Ethereum", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },
  { symbol: "SOL", name: "Solana", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },
  { symbol: "BNB", name: "Binance Coin", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },
  { symbol: "XRP", name: "Ripple", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },
  { symbol: "ADA", name: "Cardano", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },
  { symbol: "DOGE", name: "Dogecoin", type: "crypto", category: "crypto", suggestedCurrency: "USD", icon: "Coins" },

  // US Equities
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },
  { symbol: "META", name: "Meta Platforms", type: "stock", category: "stock_us", suggestedCurrency: "USD", icon: "TrendingUp" },

  // IDX Equities
  { symbol: "BBCA", name: "Bank Central Asia", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "BMRI", name: "Bank Mandiri", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "BBNI", name: "Bank Negara Indonesia", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "TLKM", name: "Telkom Indonesia", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "ASII", name: "Astra International", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "ICBP", name: "Indofood CBP", type: "stock", category: "stock_id", suggestedCurrency: "IDR", icon: "TrendingUp" },

  // Gold & Commodities
  { symbol: "XAU", name: "Gold Antam (per gram)", type: "gold", category: "gold", suggestedCurrency: "IDR", icon: "Landmark" },
  { symbol: "UBS", name: "Gold UBS (per gram)", type: "gold", category: "gold", suggestedCurrency: "IDR", icon: "Landmark" },
  { symbol: "XAG", name: "Silver Pure (per gram)", type: "gold", category: "gold", suggestedCurrency: "IDR", icon: "Landmark" },

  // Mutual Funds
  { symbol: "RD-PASAR-UANG", name: "Money Market Fund", type: "mutual_fund", category: "mutual_fund", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "RD-PENDAPATAN-TETAP", name: "Fixed Income Fund", type: "mutual_fund", category: "mutual_fund", suggestedCurrency: "IDR", icon: "FileText" },
  { symbol: "RD-SAHAM", name: "Equity Fund", type: "mutual_fund", category: "mutual_fund", suggestedCurrency: "IDR", icon: "TrendingUp" },
  { symbol: "RD-CAMPURAN", name: "Balanced Fund", type: "mutual_fund", category: "mutual_fund", suggestedCurrency: "IDR", icon: "TrendingUp" },

  // Fixed Assets
  { symbol: "RUMAH", name: "Residential Property", type: "fixed_asset", category: "fixed_asset", suggestedCurrency: "IDR", icon: "Home" },
  { symbol: "TANAH", name: "Land / Real Estate", type: "fixed_asset", category: "fixed_asset", suggestedCurrency: "IDR", icon: "Landmark" },
  { symbol: "MOBIL", name: "Vehicle / Automobile", type: "fixed_asset", category: "fixed_asset", suggestedCurrency: "IDR", icon: "Shield" },
  { symbol: "LOGAM", name: "Physical Precious Metals", type: "fixed_asset", category: "fixed_asset", suggestedCurrency: "IDR", icon: "Coins" },
];

export function AssetsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const { isStealthMode, toggleStealthMode } = usePrivacy();
  const [bsRange, setBsRange] = useState<BalanceSheetRange>("6M");
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(null);

  const { data: wallets = [] } = useWallets();
  const { data: allTxs = [] } = useAllTransactions();

  // USDT State
  const [usdtPref, setUsdtPref] = useState<UsdtValuationPref>(() =>
    getSavedUsdtPref(user?.id),
  );

  // Other Holdings State
  const [holdings, setHoldings] = useState<InvestmentHolding[]>(() =>
    getSavedHoldings(user?.id),
  );

  // Modals & Sheets State
  const [selectedDetailHolding, setSelectedDetailHolding] =
    useState<InvestmentHolding | null>(null);
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedReconciliation, setDismissedReconciliation] = useState(false);
  const [isHoldingsModalOpen, setIsHoldingsModalOpen] = useState(false);

  // Add Holding Flow State
  // 0: closed, 1: preset picker, 2: details form
  const [addPhase, setAddPhase] = useState<0 | 1 | 2>(0);
  const [presetCategory, setPresetCategory] = useState<PresetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<AssetType | "all">("all");
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);

  // Form Fields
  const [formSymbol, setFormSymbol] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AssetType>("stock");
  const [formUnits, setFormUnits] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState<"IDR" | "USD">("IDR");
  const [formPlatform, setFormPlatform] = useState("");
  const [formIcon, setFormIcon] = useState("TrendingUp");
  const [formAnnualRate, setFormAnnualRate] = useState("");
  const [formAnnualRateSign, setFormAnnualRateSign] = useState<"+" | "-">("+");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [isFetchingCurrentPrice, setIsFetchingCurrentPrice] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (addPhase === 1) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [addPhase]);

  // Initial Sync from Supabase & live rates
  useEffect(() => {
    let isMounted = true;
    if (user?.id && user.id !== "guest_local_user") {
      fetchHoldingsFromSupabase(user.id).then((cloudHoldings) => {
        if (isMounted) {
          setHoldings(cloudHoldings);
          setUsdtPref(getSavedUsdtPref(user.id));
        }
      });
    }
    refreshAllPortfolioPrices(user?.id)
      .then(({ usdtRate, updatedHoldings }) => {
        if (isMounted) {
          if (usdtRate > 5000 && usdtRate < 50000) {
            setUsdtPref((prev: UsdtValuationPref) => ({ ...prev, rate: usdtRate }));
          }
          if (updatedHoldings && updatedHoldings.length > 0) {
            setHoldings(updatedHoldings);
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Manual Refresh action
  const handleRefreshPrices = async () => {
    triggerHaptic("medium");
    setIsRefreshing(true);
    try {
      const res = await refreshAllPortfolioPrices(user?.id);
      if (res.usdtRate > 0) {
        setUsdtPref((prev: UsdtValuationPref) => ({ ...prev, rate: res.usdtRate }));
      }
      if (res.updatedHoldings && res.updatedHoldings.length > 0) {
        setHoldings(res.updatedHoldings);
      }
      showToast(
        isIndonesian
          ? "Harga portofolio berhasil diperbarui"
          : "Portfolio prices refreshed",
        "update",
        () => {},
      );
    } catch {
      showToast(
        isIndonesian ? "Gagal memperbarui harga live" : "Failed to refresh live prices",
        "delete",
        () => {},
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Find crypto wallet
  const cryptoWallet = useMemo(() => {
    return wallets.find(
      (w) =>
        w.name.toLowerCase().includes("usdt") ||
        w.name.toLowerCase().includes("crypto") ||
        w.classification === "investment",
    );
  }, [wallets]);

  const recordedCryptoBalance = cryptoWallet?.balance ?? 0;
  const suggestedUsdtUnits =
    usdtPref.rate > 0
      ? parseFloat((recordedCryptoBalance / usdtPref.rate).toFixed(2))
      : 0;

  // Split holdings: Liquid vs Fixed
  const liquidHoldings = useMemo(
    () => holdings.filter((h) => h.asset_type !== "fixed_asset"),
    [holdings],
  );
  const fixedHoldings = useMemo(
    () => holdings.filter((h) => h.asset_type === "fixed_asset"),
    [holdings],
  );

  const usdtCostBasis = usdtPref.costBasis;
  const usdtMarketValue =
    usdtPref.units > 0
      ? usdtPref.units * usdtPref.rate
      : recordedCryptoBalance;
  const usdtFloatingPnL = usdtMarketValue - usdtCostBasis;
  const usdtFloatingPnLPct =
    usdtCostBasis > 0 ? (usdtFloatingPnL / usdtCostBasis) * 100 : 0;

  const usdtInfo = useMemo(() => {
    return {
      symbol: "USDT",
      name: "Tether USD",
      units: usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits,
      costBasis: usdtCostBasis,
      marketValue: usdtMarketValue,
    };
  }, [usdtPref.units, suggestedUsdtUnits, usdtCostBasis, usdtMarketValue]);

  // Dynamic Monthly Burn Rate for Emergency Runway Coverage
  const monthlyBurnRate = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const recentExpenses = allTxs.filter(
      (tx) => tx.type === "expense" && tx.occurred_on && new Date(tx.occurred_on) >= threeMonthsAgo,
    );
    const sum = recentExpenses.reduce((s, tx) => s + Number(tx.amount || 0), 0);
    return sum > 0 ? Math.round(sum / 3) : 3500000;
  }, [allTxs]);

  // Real Monthly Deployment Data (12 Months) from Transactions (used for candlestick trajectory)
  const monthlyDeploymentData = useMemo(() => {
    const now = new Date();
    const months: Array<{ key: string; label: string; deployed: number; txCount: number }> = Array.from(
      { length: 12 },
      (_, i) => {
        const d = subMonths(now, 11 - i);
        const key = format(d, "yyyy-MM");
        const label = format(d, "MMM", { locale: isIndonesian ? idLocale : undefined });
        return { key, label, deployed: 0, txCount: 0 };
      },
    );

    const map = new Map(months.map((m) => [m.key, m]));

    allTxs.forEach((tx) => {
      if (!tx.occurred_on) return;
      const key = tx.occurred_on.slice(0, 7);
      const entry = map.get(key);
      if (!entry) return;

      const amt = Number(tx.amount || 0);
      const cat = (tx.categories?.name || "").toLowerCase();
      const note = (tx.note || "").toLowerCase();
      const destWallet = wallets.find((w) => w.id === tx.to_wallet_id);
      const isDestInvest =
        destWallet?.classification === "investment" ||
        destWallet?.name.toLowerCase().includes("crypto") ||
        destWallet?.name.toLowerCase().includes("usdt") ||
        destWallet?.name.toLowerCase().includes("saham") ||
        destWallet?.name.toLowerCase().includes("bibit") ||
        destWallet?.name.toLowerCase().includes("ajaib");

      const isInvestCategory =
        cat.includes("invest") ||
        cat.includes("saham") ||
        cat.includes("crypto") ||
        cat.includes("kripto") ||
        cat.includes("emas") ||
        cat.includes("reksa") ||
        note.includes("invest") ||
        note.includes("saham") ||
        note.includes("crypto") ||
        note.includes("usdt") ||
        note.includes("beli ") ||
        note.includes("topup");

      if ((tx.type === "expense" && isInvestCategory) || (tx.type === "transfer" && isDestInvest)) {
        entry.deployed += amt;
        entry.txCount += 1;
      }
    });

    return months;
  }, [allTxs, wallets, isIndonesian]);

  // Real Weekly Deployment Data for Current Month (1M Range)
  const weeklyDeploymentData = useMemo(() => {
    const currentMonthPrefix = format(new Date(), "yyyy-MM");
    const weeks: Array<{ label: string; deployed: number }> = [
      { label: isIndonesian ? "Mgg 1" : "W1", deployed: 0 },
      { label: isIndonesian ? "Mgg 2" : "W2", deployed: 0 },
      { label: isIndonesian ? "Mgg 3" : "W3", deployed: 0 },
      { label: isIndonesian ? "Mgg 4" : "W4", deployed: 0 },
    ];

    allTxs.forEach((tx) => {
      if (!tx.occurred_on || !tx.occurred_on.startsWith(currentMonthPrefix)) return;
      const day = parseInt(tx.occurred_on.slice(8, 10), 10);
      const wIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
      const amt = Number(tx.amount || 0);
      const cat = (tx.categories?.name || "").toLowerCase();
      const note = (tx.note || "").toLowerCase();
      const destWallet = wallets.find((w) => w.id === tx.to_wallet_id);
      const isDestInvest =
        destWallet?.classification === "investment" ||
        destWallet?.name.toLowerCase().includes("crypto") ||
        destWallet?.name.toLowerCase().includes("usdt") ||
        destWallet?.name.toLowerCase().includes("saham") ||
        destWallet?.name.toLowerCase().includes("bibit") ||
        destWallet?.name.toLowerCase().includes("ajaib");

      const isInvestCategory =
        cat.includes("invest") ||
        cat.includes("saham") ||
        cat.includes("crypto") ||
        cat.includes("kripto") ||
        cat.includes("emas") ||
        cat.includes("reksa") ||
        note.includes("invest") ||
        note.includes("saham") ||
        note.includes("crypto") ||
        note.includes("usdt") ||
        note.includes("beli ") ||
        note.includes("topup");

      if ((tx.type === "expense" && isInvestCategory) || (tx.type === "transfer" && isDestInvest)) {
        weeks[wIdx].deployed += amt;
      }
    });

    return weeks;
  }, [allTxs, wallets, isIndonesian]);

  // ── Executive Balance Sheet & 4-Pillar Capital Breakdown ──────────
  // Pillar 1: Liquid & Current Assets (Operating Cash, Banks, e-Wallets, USDT Reserve)
  const liquidWalletCash = useMemo(() => {
    return wallets
      .filter(
        (w) =>
          w.classification !== "credit" &&
          w.classification !== "loan" &&
          w.classification !== "investment",
      )
      .reduce((sum, w) => sum + Math.max(0, Number(w.balance || 0)), 0);
  }, [wallets]);
  const liquidAssetsTotal = liquidWalletCash + usdtMarketValue;

  // Pillar 2: Market & Growth Assets (Equities, Growth Crypto, Mutual Funds)
  const growthAssetsTotal = useMemo(() => {
    return liquidHoldings
      .filter(
        (h) =>
          h.asset_type === "stock" ||
          (h.asset_type === "crypto" && h.symbol !== "USDT") ||
          h.asset_type === "mutual_fund" ||
          h.asset_type === "bond",
      )
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
  }, [liquidHoldings]);

  // Pillar 3: Fixed & Tangible Assets (Property, Physical Gold, Vehicles)
  const fixedAssetsTotal = useMemo(() => {
    const fixedTangibles = fixedHoldings.reduce((sum, h) => {
      const v = calculateHoldingValuation(h);
      return sum + v.marketValue;
    }, 0);
    const physicalGold = liquidHoldings
      .filter((h) => h.asset_type === "gold")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    return fixedTangibles + physicalGold;
  }, [fixedHoldings, liquidHoldings]);

  // Pillar 4: Total Liabilities & Obligations (Credit Cards, PayLater, Loans, Overdrafts)
  const liabilitiesTotal = useMemo(() => {
    return wallets
      .filter(
        (w) =>
          w.classification === "credit" ||
          w.classification === "loan" ||
          Number(w.balance || 0) < 0,
      )
      .reduce((sum, w) => {
        const bal = Number(w.balance || 0);
        return sum + Math.abs(bal < 0 ? bal : (w.classification === "credit" || w.classification === "loan" ? bal : 0));
      }, 0);
  }, [wallets]);

  // Balance Sheet Totals & Solvency Metrics
  const totalGrossAssets = liquidAssetsTotal + growthAssetsTotal + fixedAssetsTotal;
  const netWorth = totalGrossAssets - liabilitiesTotal;
  const debtToAssetRatio = totalGrossAssets > 0 ? (liabilitiesTotal / totalGrossAssets) * 100 : 0;
  const solvencyScore = Math.max(0, Math.min(100, Math.round(100 - debtToAssetRatio)));

  const liquidPct = totalGrossAssets > 0 ? (liquidAssetsTotal / totalGrossAssets) * 100 : 0;
  const growthPct = totalGrossAssets > 0 ? (growthAssetsTotal / totalGrossAssets) * 100 : 0;
  const fixedPct = totalGrossAssets > 0 ? (fixedAssetsTotal / totalGrossAssets) * 100 : 0;

  const liquidRunwayMonths = useMemo(() => {
    if (monthlyBurnRate <= 0) return 12;
    return Number((liquidAssetsTotal / monthlyBurnRate).toFixed(1));
  }, [liquidAssetsTotal, monthlyBurnRate]);

  // Active History for Candlesticks based on bsRange
  const activeHistoryData = useMemo(() => {
    if (bsRange === "1M") return weeklyDeploymentData;
    if (bsRange === "3M") return monthlyDeploymentData.slice(9);
    if (bsRange === "6M") return monthlyDeploymentData.slice(6);
    return monthlyDeploymentData;
  }, [bsRange, weeklyDeploymentData, monthlyDeploymentData]);

  // Real Monochromatic Candlestick Data
  const candlesticks = useMemo(() => {
    return calculateHistoricalCandlesticks(netWorth, activeHistoryData);
  }, [netWorth, activeHistoryData]);

  // Change stats across active period
  const periodStats = useMemo(() => {
    if (candlesticks.length === 0) {
      return { change: 0, pct: 0 };
    }
    const first = candlesticks[0];
    const last = candlesticks[candlesticks.length - 1];
    const change = last.close - first.open;
    const pct = first.open > 0 ? (change / first.open) * 100 : 0;
    return { change, pct };
  }, [candlesticks]);

  const bsRangeLabels: Record<BalanceSheetRange, string> = {
    "1M": isIndonesian ? "1 Bulan" : "1 Month",
    "3M": isIndonesian ? "3 Bulan" : "3 Months",
    "6M": isIndonesian ? "6 Bulan" : "6 Months",
    "1Y": isIndonesian ? "1 Tahun" : "1 Year",
    ALL: isIndonesian ? "Semua Waktu" : "All Time",
  };

  // Reconciliation Audit
  const reconciliationAudit = useMemo(() => {
    return auditUsdtReconciliation(allTxs, wallets, user?.id);
  }, [allTxs, wallets, user?.id, usdtPref.units, usdtPref.rate]);

  const handleApplyReconciliation = () => {
    if (!reconciliationAudit.hasDiscrepancy) return;
    triggerHaptic("medium");
    const res = applyUsdtReconciliation(reconciliationAudit, user?.id);
    setUsdtPref((prev: UsdtValuationPref) => ({ ...prev, units: res.updatedUnits }));
    setDismissedReconciliation(true);
    showToast(
      isIndonesian
        ? `Holding USDT disinkronkan ke ${res.updatedUnits} USDT`
        : `USDT holding synced to ${res.updatedUnits} USDT`,
      "update",
      () => {},
    );
  };

  // Open USDT in Detail Sheet
  const openUsdtDetail = () => {
    triggerHaptic("light");
    const existingUsdt = holdings.find(
      (h) => h.symbol?.toUpperCase() === "USDT" || h.id.startsWith("usdt-"),
    );
    const usdtHolding: InvestmentHolding = {
      id: existingUsdt?.id || getStandardUsdtHoldingId(user?.id),
      symbol: "USDT",
      name: "Tether USD",
      asset_type: "crypto",
      units: usdtPref.units > 0 ? usdtPref.units : (existingUsdt?.units || suggestedUsdtUnits),
      avg_buy_price:
        usdtPref.units > 0
          ? Math.round(usdtCostBasis / usdtPref.units)
          : (existingUsdt?.avg_buy_price || usdtPref.rate),
      current_price: usdtPref.rate,
      currency: "IDR",
      icon: "Coins",
      activities:
        existingUsdt?.activities && existingUsdt.activities.length > 0
          ? existingUsdt.activities
          : undefined,
    };
    setSelectedDetailHolding(usdtHolding);
  };

  // Open any Holding in Detail Sheet
  const handleOpenHoldingDetail = (h: InvestmentHolding) => {
    triggerHaptic("light");
    setSelectedDetailHolding(h);
  };

  // Preset Filtering by Category & Search
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_ASSETS.filter((p) => {
      const matchCategory = presetCategory === "all" || p.category === presetCategory;
      const matchQuery =
        !q ||
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [searchQuery, presetCategory]);

  // Handle Preset Selection
  const handleSelectPreset = async (preset: PresetAsset) => {
    triggerHaptic("medium");
    setFormSymbol(preset.symbol);
    setFormName(preset.name);
    setFormType(preset.type);
    setFormIcon(preset.icon || "TrendingUp");
    setFormCurrency(preset.suggestedCurrency || "IDR");
    setFormPlatform("");
    setFormUnits("");
    setFormBuyPrice("");
    setFormCurrentPrice("");
    setFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setAddPhase(2);

    setIsFetchingCurrentPrice(true);
    try {
      let livePrice: number | null = null;
      if (preset.type === "crypto") {
        livePrice = await fetchCryptoPriceInIDR(preset.symbol);
      } else if (preset.type === "stock") {
        livePrice = await fetchStockPriceInIDR(preset.symbol);
      }
      if (livePrice && livePrice > 0) {
        if (preset.suggestedCurrency === "USD" && usdtPref.rate > 0) {
          const usdPrice = parseFloat((livePrice / usdtPref.rate).toFixed(2));
          setFormCurrentPrice(String(usdPrice));
          setFormBuyPrice(String(usdPrice));
        } else {
          setFormCurrentPrice(String(livePrice));
          setFormBuyPrice(String(livePrice));
        }
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsFetchingCurrentPrice(false);
    }
  };

  const handleCustomAssetEntry = (type: AssetType) => {
    triggerHaptic("medium");
    setFormSymbol("");
    setFormName("");
    setFormType(type);
    setFormCurrency("IDR");
    setFormPlatform("");
    setFormIcon(type === "fixed_asset" ? "Home" : "TrendingUp");
    setFormUnits(type === "fixed_asset" ? "1" : "");
    setFormBuyPrice("");
    setFormCurrentPrice("");
    setFormAnnualRate(type === "fixed_asset" ? "10" : "");
    setFormAnnualRateSign(type === "fixed_asset" ? "-" : "+");
    setFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setAddPhase(2);
  };

  const closeAddFlow = () => {
    setAddPhase(0);
    setEditingHoldingId(null);
    setSearchQuery("");
  };

  // Save New Holding
  const handleSaveNewHolding = () => {
    const units = parseFloat(formUnits);
    const rawBuy = parseFloat(formBuyPrice);
    const rawCurrent = parseFloat(formCurrentPrice) || rawBuy;

    if (!formName.trim()) {
      showToast(isIndonesian ? "Masukkan nama aset" : "Please enter asset name", "delete", () => {});
      return;
    }

    if (isNaN(units) || units <= 0 || isNaN(rawBuy) || rawBuy <= 0) {
      showToast(isIndonesian ? "Masukkan nominal yang valid" : "Please enter valid numbers", "delete", () => {});
      return;
    }

    const liveRate = usdtPref.rate > 0 ? usdtPref.rate : 16000;
    const buyPrice = formCurrency === "USD" ? rawBuy * liveRate : rawBuy;
    const currentPrice = formCurrency === "USD" ? rawCurrent * liveRate : rawCurrent;

    const symbol =
      formSymbol.trim() ||
      (formType === "fixed_asset" ? "ASSET" : formName.slice(0, 5).toUpperCase());

    const rawRate = parseFloat(formAnnualRate);
    const signedRate =
      !isNaN(rawRate) && rawRate !== 0
        ? formAnnualRateSign === "-"
          ? -Math.abs(rawRate)
          : Math.abs(rawRate)
        : undefined;

    if (symbol.toUpperCase() === "USDT") {
      const updatedPref: UsdtValuationPref = {
        units,
        costBasis: buyPrice * units,
        rate: currentPrice || usdtPref.rate,
      };
      setUsdtPref(updatedPref);
      saveUsdtPref(updatedPref, user?.id);
      closeAddFlow();
      triggerHaptic("medium");
      showToast(
        isIndonesian ? "Holding USDT berhasil disimpan" : "USDT holding saved successfully",
        "add",
        () => {},
      );
      return;
    }

    const newH: InvestmentHolding = {
      id: editingHoldingId || `h_${Date.now()}`,
      symbol: symbol.toUpperCase(),
      name: formName.trim(),
      asset_type: formType,
      units,
      avg_buy_price: buyPrice,
      current_price: currentPrice,
      currency: formCurrency,
      notes: formPlatform ? `Platform: ${formPlatform}` : undefined,
      last_price_updated_at: new Date().toISOString(),
      icon: formIcon,
      annual_rate: signedRate,
      purchase_date: formPurchaseDate || undefined,
    };

    const updated = upsertHolding(newH, user?.id);
    setHoldings(updated);
    closeAddFlow();
    triggerHaptic("medium");
    showToast(
      `${newH.name} ${editingHoldingId ? (isIndonesian ? "berhasil diperbarui" : "updated successfully") : (isIndonesian ? "berhasil disimpan" : "saved successfully")}`,
      "add",
      () => {},
    );
  };

  const handleDeleteHolding = (id: string, name: string) => {
    triggerHaptic("heavy");
    if (id.startsWith("usdt-") || id === "usdt-core-holding") {
      const cleared: UsdtValuationPref = {
        units: 0,
        costBasis: 0,
        rate: usdtPref.rate,
      };
      setUsdtPref(cleared);
      saveUsdtPref(cleared, user?.id);
      showToast(
        isIndonesian ? "Holding USDT dihapus" : "USDT holding removed",
        "delete",
        () => {},
      );
      return;
    }
    const updated = deleteHolding(id, user?.id);
    setHoldings(updated);
    showToast(`${name} ${isIndonesian ? "dihapus" : "removed"}`, "delete", () => {});
  };

  // Filter user's active holdings list
  const displayHoldings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return holdings.filter((h) => {
      const matchType = filterType === "all" || h.asset_type === filterType;
      const matchQuery =
        !q ||
        h.symbol.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [holdings, filterType, searchQuery]);

  return (
    <div
      className="min-h-screen select-none pb-28 pt-[calc(env(safe-area-inset-top,0px)+12px)] px-4 max-w-lg mx-auto space-y-4"
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* ── 1. Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Neraca Keuangan" : "Executive Balance Sheet"}
          </h1>
          <p className="text-[12px] text-[var(--text-tertiary)] font-medium">
            {isIndonesian
              ? "Matriks solvabilitas & struktur modal lengkap"
              : "Solvency matrix & capital breakdown"}
          </p>
        </div>
      </div>

      {/* ── 2. Executive Balance Sheet & Solvency Matrix Hero Card ── */}
      <div className="card-contrast-hero p-4 sm:p-5 pb-3.5 relative overflow-hidden rounded-3xl space-y-3.5">
        {/* Top Header: Floating MTM indicator & Solvency status + Balance eye toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {isIndonesian
                ? "Valuasi Pasar Berjalan (Floating MTM)"
                : "Floating Mark-to-Market Valuation"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[9.5px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                color: "var(--text-secondary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {liabilitiesTotal === 0
                ? isIndonesian ? "100% Solven" : "100% Solvent"
                : `Leverage: ${debtToAssetRatio.toFixed(1)}%`}
            </span>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                toggleStealthMode();
              }}
              className={`p-1 -mr-1 cursor-pointer active:scale-90 transition-all ${
                isDark
                  ? "text-white/60 hover:text-white"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
              title={isStealthMode ? "Show Balance" : "Hide Balance"}
            >
              {isStealthMode ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Hero Number: Net Capital Equity (Strictly font-light) */}
        <div className="space-y-0.5">
          <span className="text-[11px] text-[var(--text-tertiary)] block font-medium">
            {isIndonesian ? "Total Ekuitas Modal Bersih" : "Total Net Capital Equity"}
          </span>
          <p className="amount text-[32px] sm:text-[38px] font-light tracking-tight leading-none text-[var(--text-primary)]">
            {isStealthMode ? "••••••••" : formatRupiah(netWorth)}
          </p>
        </div>

        {/* Change Line + Time Label Side by Side */}
        <div className="flex items-center justify-between gap-2">
          {hoveredCandle ? (
            <div className="flex items-center gap-2 text-[10.5px] font-mono text-[var(--text-secondary)] truncate">
              <span>O: <strong className="text-[var(--text-primary)]">{isStealthMode ? "••••" : formatRupiah(hoveredCandle.open)}</strong></span>
              <span>H: <strong className="text-[var(--text-primary)]">{isStealthMode ? "••••" : formatRupiah(hoveredCandle.high)}</strong></span>
              <span>L: <strong className="text-[var(--text-primary)]">{isStealthMode ? "••••" : formatRupiah(hoveredCandle.low)}</strong></span>
              <span>C: <strong className="text-[var(--text-primary)]">{isStealthMode ? "••••" : formatRupiah(hoveredCandle.close)}</strong></span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 text-[12px] font-semibold"
              style={{
                color: isDark
                  ? periodStats.change >= 0 ? "#FFFFFF" : "#A1A1AA"
                  : periodStats.change >= 0 ? "#121214" : "#71717a",
              }}
            >
              <ArrowUpRight
                size={13}
                className={periodStats.change < 0 ? "rotate-90" : ""}
              />
              <span>
                {isStealthMode
                  ? "••••"
                  : `${periodStats.change >= 0 ? "+" : ""}${formatRupiah(periodStats.change)}`}
              </span>
              <span className="opacity-80">
                ({isStealthMode ? "••••" : `${periodStats.pct >= 0 ? "+" : ""}${periodStats.pct.toFixed(2)}%`})
              </span>
            </div>
          )}

          <span className="text-[11px] font-semibold shrink-0 text-[var(--text-tertiary)]">
            {bsRangeLabels[bsRange]} · MTM
          </span>
        </div>

        {/* Range Pill Selector (1M, 3M, 6M, 1Y, ALL) */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
          {(["1M", "3M", "6M", "1Y", "ALL"] as BalanceSheetRange[]).map((r) => {
            const isActive = bsRange === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setBsRange(r);
                  triggerHaptic("light");
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-all cursor-pointer select-none"
                style={{
                  background: isActive
                    ? isDark
                      ? "rgba(255,255,255,0.25)"
                      : "#18181b"
                    : isDark
                      ? "transparent"
                      : "#f4f4f7",
                  color: isActive
                    ? "#FFFFFF"
                    : isDark
                      ? "rgba(255,255,255,0.55)"
                      : "#52525b",
                  border: isActive
                    ? isDark
                      ? "1px solid rgba(255,255,255,0.35)"
                      : "1px solid #18181b"
                    : isDark
                      ? "1px solid transparent"
                      : "1px solid rgba(0,0,0,0.04)",
                  boxShadow: isActive
                    ? isDark
                      ? "none"
                      : "0 2px 6px rgba(0,0,0,0.18)"
                    : "none",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Monochromatic Candlestick Chart (SVG) */}
        {(() => {
          if (candlesticks.length === 0) return null;

          const svgW = 320;
          const svgH = 88;
          const padL = 12;
          const padR = 12;
          const padT = 8;
          const padB = 6;
          const plotW = svgW - padL - padR;
          const plotH = svgH - padT - padB;

          const minPrice = Math.min(...candlesticks.map((c) => c.low));
          const maxPrice = Math.max(...candlesticks.map((c) => c.high), minPrice + 1);
          const rangeDiff = maxPrice - minPrice || 1;

          const getY = (val: number) => {
            return padT + plotH - ((val - minPrice) / rangeDiff) * plotH;
          };

          const slotWidth = plotW / candlesticks.length;
          const bodyWidth = Math.max(7, Math.min(22, slotWidth * 0.52));

          return (
            <div className="space-y-1">
              <div className="w-full h-[88px] relative">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-full overflow-visible"
                  onMouseLeave={() => setHoveredCandle(null)}
                >
                  {/* Dotted Grid Lines */}
                  <line
                    x1={padL}
                    y1={padT + plotH * 0.25}
                    x2={svgW - padR}
                    y2={padT + plotH * 0.25}
                    stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={padL}
                    y1={padT + plotH * 0.5}
                    x2={svgW - padR}
                    y2={padT + plotH * 0.5}
                    stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={padL}
                    y1={padT + plotH * 0.75}
                    x2={svgW - padR}
                    y2={padT + plotH * 0.75}
                    stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
                    strokeDasharray="2 3"
                  />

                  {/* Candlesticks */}
                  {candlesticks.map((c, i) => {
                    const cx = padL + i * slotWidth + slotWidth / 2;
                    const yHigh = getY(c.high);
                    const yLow = getY(c.low);
                    const yOpen = getY(c.open);
                    const yClose = getY(c.close);
                    const topBody = Math.min(yOpen, yClose);
                    const botBody = Math.max(yOpen, yClose);
                    const bodyHeight = Math.max(2.5, botBody - topBody);

                    return (
                      <g
                        key={c.key}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onMouseEnter={() => setHoveredCandle(c)}
                        onTouchStart={() => setHoveredCandle(c)}
                      >
                        {/* Vertical Wick (High to Low) */}
                        <line
                          x1={cx}
                          y1={yHigh}
                          x2={cx}
                          y2={yLow}
                          stroke={
                            isDark
                              ? "rgba(255, 255, 255, 0.45)"
                              : "rgba(24, 24, 27, 0.45)"
                          }
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />

                        {/* Candle Body: Solid if Bullish, Hollow with Border if Bearish */}
                        <rect
                          x={cx - bodyWidth / 2}
                          y={topBody}
                          width={bodyWidth}
                          height={bodyHeight}
                          rx="1.5"
                          fill={
                            c.isBullish
                              ? isDark
                                ? "#FFFFFF"
                                : "#18181B"
                              : isDark
                                ? "rgba(255, 255, 255, 0.06)"
                                : "rgba(0, 0, 0, 0.04)"
                          }
                          stroke={
                            c.isBullish
                              ? isDark
                                ? "#FFFFFF"
                                : "#18181B"
                              : isDark
                                ? "rgba(255, 255, 255, 0.85)"
                                : "rgba(24, 24, 27, 0.85)"
                          }
                          strokeWidth={c.isBullish ? "0.8" : "1.2"}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Candlestick Period Axis Labels */}
              <div className="flex items-center justify-between px-2 text-[9.5px] font-mono text-[var(--text-tertiary)]">
                {candlesticks.map((c) => (
                  <span key={c.key} className="text-center truncate">
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Equation Balance Strip: Gross Assets - Liabilities = Net Worth */}
        <div
          className="grid grid-cols-3 gap-2 p-3 rounded-2xl text-center"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.025)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div>
            <span className="text-[10px] text-[var(--text-tertiary)] block">
              {isIndonesian ? "Total Aset" : "Gross Assets"}
            </span>
            <span className="font-mono text-[12px] font-medium text-[var(--text-primary)] truncate block mt-0.5">
              {isStealthMode ? "••••" : formatRupiah(totalGrossAssets)}
            </span>
          </div>

          <div className="border-x border-[var(--glass-border)]">
            <span className="text-[10px] text-[var(--text-tertiary)] block">
              {isIndonesian ? "Liabilitas" : "Liabilities"}
            </span>
            <span className="font-mono text-[12px] font-medium text-[var(--text-secondary)] truncate block mt-0.5">
              {isStealthMode ? "••••" : formatRupiah(liabilitiesTotal)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-tertiary)] block">
              {isIndonesian ? "Solvabilitas" : "Solvency"}
            </span>
            <span className="font-mono text-[12px] font-medium text-[var(--text-primary)] truncate block mt-0.5">
              {solvencyScore}%
            </span>
          </div>
        </div>

        {/* Integrated Runway Status Line & Explicit USDT Rate */}
        <div className="pt-2.5 border-t border-[var(--glass-border)] flex items-center justify-between text-[11px]">
          <span className="font-medium text-[var(--text-secondary)]">
            {formatRunwaySummary(liquidRunwayMonths, monthlyBurnRate, isIndonesian)}
          </span>

          <span className="font-mono text-[10.5px] text-[var(--text-tertiary)]">
            Live USDT: <strong className="text-[var(--text-secondary)]">{formatRupiah(usdtPref.rate)}</strong> / unit
          </span>
        </div>
      </div>

      {/* ── Relocated Minimalist Quick Action Bar ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. Refresh Prices */}
        <button
          type="button"
          onClick={handleRefreshPrices}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-[11.5px] font-semibold glass-surface border border-[var(--glass-border)] active:scale-[0.98] transition-transform cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <RefreshCw
            size={13}
            strokeWidth={2}
            className={isRefreshing ? "animate-spin" : ""}
          />
          <span className="truncate">{isIndonesian ? "Perbarui" : "Refresh"}</span>
        </button>

        {/* 2. Sync & Staking */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setIsStakingModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-[11.5px] font-semibold glass-surface border border-[var(--glass-border)] active:scale-[0.98] transition-transform cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Link2 size={14} strokeWidth={1.75} />
          <span className="truncate">{isIndonesian ? "Staking" : "Staking"}</span>
        </button>

        {/* 3. Add Asset */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            setAddPhase(1);
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-[11.5px] font-semibold active:scale-[0.98] transition-transform cursor-pointer"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-base)",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span className="truncate">{isIndonesian ? "Tambah Aset" : "Add Asset"}</span>
        </button>
      </div>

      {/* ── 3. Auto-Reconciliation Alert Banner ────────────────────────────── */}
      {reconciliationAudit.hasDiscrepancy && !dismissedReconciliation && (
        <div
          className="p-3.5 rounded-3xl glass-surface flex items-center justify-between gap-3 border border-[var(--glass-border)] animate-in fade-in"
          style={{ background: "var(--bg-elevated)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-[var(--text-primary)]" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                {isIndonesian
                  ? "Sinkronisasi Mutasi USDT Terdeteksi"
                  : "USDT Discrepancy Detected"}
              </p>
              <p className="text-[10.5px] text-[var(--text-secondary)] leading-tight">
                {isIndonesian
                  ? `Transaksi transfer keluar (${formatRupiah(reconciliationAudit.unreconciledTxs[0]?.amount || 0)}) belum dikurangkan dari unit holding.`
                  : "A recent transfer has not yet been reflected in holding units."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyReconciliation}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
            }}
          >
            {isIndonesian ? "Sinkronkan" : "Sync Now"}
          </button>
        </div>
      )}

      {/* ── 4. 4-Pillar Capital Hierarchy Matrix (2x2 Grid) ───────────────── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-[13.5px] font-bold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Struktur Neraca & Alokasi Modal" : "Balance Sheet Breakdown"}
          </h3>
          <span className="text-[11px] font-mono text-[var(--text-tertiary)] font-medium">
            4 Pillars
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Pillar 1: Liquid & Current */}
          <div
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <Wallet size={16} strokeWidth={1.75} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] font-semibold">
                {liquidPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Aset Lancar & Kas" : "Liquid & Current"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian ? "Bank, dompet & kas" : "Cash, banks & stablecoins"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)]">
              <span className="font-mono text-[13px] font-bold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(liquidAssetsTotal)}
              </span>
            </div>
          </div>

          {/* Pillar 2: Market & Growth */}
          <div
            onClick={() => {
              triggerHaptic("light");
              setIsHoldingsModalOpen(true);
            }}
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-transform"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <TrendingUp size={16} strokeWidth={1.75} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] font-semibold">
                {growthPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Pasar & Pertumbuhan" : "Market & Growth"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian ? "Saham, kripto & reksa dana" : "Equities, crypto & funds"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className="font-mono text-[13px] font-bold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(growthAssetsTotal)}
              </span>
              <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Pillar 3: Fixed & Tangibles */}
          <div
            onClick={() => {
              triggerHaptic("light");
              setIsHoldingsModalOpen(true);
            }}
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-transform"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <Landmark size={16} strokeWidth={1.75} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] font-semibold">
                {fixedPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Aset Tetap & Riil" : "Fixed & Tangibles"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian ? "Properti, emas & kendaraan" : "Real estate, gold & vehicles"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className="font-mono text-[13px] font-bold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(fixedAssetsTotal)}
              </span>
              <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Pillar 4: Liabilities & Debt */}
          <div
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <ShieldAlert size={16} strokeWidth={1.75} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] font-semibold">
                {debtToAssetRatio.toFixed(1)}% D/A
              </span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Liabilitas & Utang" : "Liabilities & Debt"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian ? "Kartu kredit, paylater & utang" : "Cards, paylater & loans"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)]">
              <span className="font-mono text-[13px] font-bold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(liabilitiesTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* View All Holdings Pill Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setIsHoldingsModalOpen(true);
          }}
          className="w-full py-2.5 px-4 rounded-2xl flex items-center justify-between text-[11.5px] font-semibold transition-all active:scale-[0.99] cursor-pointer"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-[var(--text-primary)]" />
            <span>
              {isIndonesian ? "Detail Kepemilikan & Aset Riil" : "View Asset Holdings & Ledger"}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-tertiary)]">
            <span>
              {holdings.length + (usdtPref.units > 0 || recordedCryptoBalance > 0 ? 1 : 0)}{" "}
              {isIndonesian ? "aset" : "assets"}
            </span>
            <ChevronRight size={13} />
          </div>
        </button>
      </div>

      {/* ── 5. Portfolio Intelligence & Insight Cards ─────────────────────── */}
      <PortfolioInsightCards
        holdings={holdings}
        usdtHolding={usdtInfo}
        liquidCash={liquidAssetsTotal}
        totalMarketValuation={totalGrossAssets}
        monthlyBurnRate={monthlyBurnRate}
        isDark={isDark}
        isIndonesian={isIndonesian}
        hideBalance={isStealthMode}
        onSelectHolding={(symbolOrId) => {
          triggerHaptic("light");
          if (symbolOrId.toUpperCase() === "USDT") {
            openUsdtDetail();
            return;
          }
          const found = holdings.find(
            (h) => h.id === symbolOrId || h.symbol.toUpperCase() === symbolOrId.toUpperCase(),
          );
          if (found) {
            handleOpenHoldingDetail(found);
          }
        }}
      />

      {/* ── 6. Holdings Ledger Sheet (Interactive Drawer) ─────────────────── */}
      <BottomSheet
        isOpen={isHoldingsModalOpen}
        onClose={() => setIsHoldingsModalOpen(false)}
        title={isIndonesian ? "Daftar Kepemilikan Aset" : "Asset Holdings Ledger"}
      >
        <div className="p-5 space-y-3.5 select-none pb-12">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(
              [
                { key: "all", label: isIndonesian ? "Semua" : "All" },
                { key: "crypto", label: "Crypto" },
                { key: "stock", label: isIndonesian ? "Saham" : "Stocks" },
                { key: "gold", label: isIndonesian ? "Emas" : "Gold" },
                { key: "mutual_fund", label: isIndonesian ? "Reksa Dana" : "Mutual Funds" },
                { key: "fixed_asset", label: isIndonesian ? "Aset Tetap" : "Fixed Assets" },
              ] as const
            ).map((t) => {
              const isActive = filterType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setFilterType(t.key);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent shadow-sm"
                      : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Core USDT Row */}
          {(filterType === "all" || filterType === "crypto") &&
            (usdtPref.units > 0 || recordedCryptoBalance > 0) && (
            <div
              onClick={() => {
                setIsHoldingsModalOpen(false);
                openUsdtDetail();
              }}
              className="p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)]"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0">
                  <Coins size={17} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] text-[var(--text-primary)]">USDT</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                      CRYPTO
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {usdtPref.units > 0
                      ? `${usdtPref.units.toLocaleString()} USDT`
                      : `Wallet linked · ${suggestedUsdtUnits} USDT`}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono shrink-0">
                <span className="text-[13px] font-bold text-[var(--text-primary)] block leading-tight">
                  {isStealthMode ? "••••••••" : formatRupiah(usdtMarketValue)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {usdtFloatingPnLPct >= 0 ? "+" : ""}{usdtFloatingPnLPct.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Other Holdings */}
          {displayHoldings.map((h) => {
            const val = calculateHoldingValuation(h);
            return (
              <div
                key={h.id}
                onClick={() => {
                  setIsHoldingsModalOpen(false);
                  handleOpenHoldingDetail(h);
                }}
                className="p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)]"
                style={{ background: "var(--bg-elevated)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0">
                    <IconRenderer icon={h.icon || "TrendingUp"} size="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13px] text-[var(--text-primary)] truncate">{h.symbol}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                        {h.asset_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {h.name} · {h.units.toLocaleString()} {isIndonesian ? "unit" : "units"}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono shrink-0">
                  <span className="text-[13px] font-bold text-[var(--text-primary)] block leading-tight">
                    {isStealthMode ? "••••••••" : formatRupiah(val.marketValue)}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {val.floatingPnLPct >= 0 ? "+" : ""}{val.floatingPnLPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}

          {displayHoldings.length === 0 && usdtPref.units <= 0 && recordedCryptoBalance <= 0 && (
            <div className="py-8 text-center space-y-1 text-[var(--text-tertiary)]">
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {isIndonesian ? "Belum ada aset tercatat" : "No investment assets recorded"}
              </p>
              <p className="text-[11px]">
                {isIndonesian
                  ? "Ketuk tombol (+) di atas untuk menambahkan portofolio."
                  : "Tap the (+) button above to add investment assets."}
              </p>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── 9. Preset Picker Sheet (Standard BottomSheet) ─────────────────── */}
      <BottomSheet
        isOpen={addPhase === 1}
        onClose={closeAddFlow}
        title={isIndonesian ? "Pilih Aset Investasi" : "Select Investment Asset"}
      >
        <div className="p-5 space-y-4 select-none">
          {/* Search Bar */}
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-[var(--glass-border)]"
            style={{ background: "var(--glass-fill)" }}
          >
            <Search size={15} className="text-[var(--text-tertiary)] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isIndonesian
                  ? "Cari simbol atau nama (BTC, AAPL, BBCA, Emas)..."
                  : "Search symbol or name (BTC, AAPL, BBCA, Gold)..."
              }
              className="flex-1 bg-transparent text-[13px] outline-none font-medium"
              style={{ color: "var(--text-primary)" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(
              [
                { key: "all", label: isIndonesian ? "Semua" : "All" },
                { key: "crypto", label: "Crypto" },
                { key: "stock_us", label: isIndonesian ? "Saham AS" : "US Stocks" },
                { key: "stock_id", label: isIndonesian ? "Saham IDX" : "IDX Stocks" },
                { key: "gold", label: isIndonesian ? "Emas" : "Gold" },
                { key: "mutual_fund", label: isIndonesian ? "Reksa Dana" : "Mutual Funds" },
                { key: "fixed_asset", label: isIndonesian ? "Aset Fisik" : "Fixed Assets" },
              ] as const
            ).map((cat) => {
              const isActive = presetCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setPresetCategory(cat.key);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent shadow-sm"
                      : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Presets List */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar">
            {filteredPresets.map((preset) => (
              <button
                key={preset.symbol}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="w-full p-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-center justify-between active:scale-[0.99] hover:border-white/20 transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
                    <IconRenderer
                      icon={preset.icon || "TrendingUp"}
                      size="w-4.5 h-4.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-[13px] text-[var(--text-primary)]">
                        {preset.symbol}
                      </span>
                      {preset.suggestedCurrency && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-semibold bg-white/[0.08] text-[var(--text-secondary)]">
                          {preset.suggestedCurrency}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate block mt-0.5">
                      {preset.name}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-lg bg-white/[0.06] text-[var(--text-tertiary)]">
                  {preset.type.replace("_", " ")}
                </span>
              </button>
            ))}

            {filteredPresets.length === 0 && (
              <p className="text-center text-[12px] text-[var(--text-tertiary)] py-6">
                {isIndonesian ? "Tidak ada preset yang cocok" : "No presets matched your search"}
              </p>
            )}
          </div>

          {/* Quick Custom Actions */}
          <div className="pt-2 border-t border-[var(--glass-border)] space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {isIndonesian ? "Aset Lainnya / Kustom" : "Custom Assets"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("fixed_asset")}
                className="flex-1 py-2.5 px-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
              >
                {isIndonesian ? "+ Properti / Fisik" : "+ Fixed Asset"}
              </button>
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("stock")}
                className="flex-1 py-2.5 px-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
              >
                {isIndonesian ? "+ Saham / Kripto Kustom" : "+ Custom Asset"}
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* ── 10. Asset Details Form Sheet (Standard BottomSheet) ───────────── */}
      <BottomSheet
        isOpen={addPhase === 2}
        onClose={closeAddFlow}
        title={formName || (isIndonesian ? "Detail Aset" : "Asset Details")}
      >
        <div className="p-5 space-y-4 select-none relative">
          {/* Currency Toggle */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
              {isIndonesian ? "Mata Uang Input" : "Input Currency"}
            </label>
            <div className="flex items-center gap-1 p-1 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setFormCurrency("IDR");
                }}
                className={`flex-1 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  formCurrency === "IDR"
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                IDR (Rp)
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setFormCurrency("USD");
                }}
                className={`flex-1 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  formCurrency === "USD"
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* Inputs: Symbol & Name */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                {isIndonesian ? "Simbol" : "Symbol"}
              </label>
              <input
                type="text"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                placeholder="BTC"
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-bold font-mono outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                {isIndonesian ? "Nama Aset" : "Asset Name"}
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Bitcoin / Apple"
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Platform / Custodian Tag Selector */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block">
              {isIndonesian ? "Platform / Kustodian" : "Platform / Custodian"}
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["Binance", "Indodax", "Ajaib", "Stockbit", "Bibit", "Bank", "Fisik/Brankas"].map((plat) => {
                const isSelected = formPlatform === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFormPlatform(isSelected ? "" : plat);
                    }}
                    className={`px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent shadow-sm"
                        : "border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {plat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Units & Buy Price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                {isIndonesian ? "Jumlah / Unit" : "Units / Amount"}
              </label>
              <input
                type="text"
                value={formUnits}
                onChange={(e) => setFormUnits(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="100"
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1 truncate">
                {isIndonesian
                  ? `Harga Beli (${formCurrency})`
                  : `Buy Price (${formCurrency})`}
              </label>
              <input
                type="text"
                value={formBuyPrice}
                onChange={(e) => setFormBuyPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={formCurrency === "USD" ? "$0.00" : "Rp"}
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
              {formCurrency === "USD" && formBuyPrice && (
                <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-1">
                  ≈ {formatRupiah(parseFloat(formBuyPrice || "0") * usdtPref.rate)}
                </p>
              )}
            </div>
          </div>

          {/* Current Market Price */}
          <div>
            <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
              {isIndonesian
                ? `Harga Pasar Terkini (${formCurrency})`
                : `Current Market Price (${formCurrency})`}
            </label>
            <input
              type="text"
              value={formCurrentPrice}
              onChange={(e) => setFormCurrentPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={
                isFetchingCurrentPrice
                  ? (isIndonesian ? "Mengambil harga live..." : "Fetching live price...")
                  : formCurrency === "USD"
                    ? "$0.00"
                    : "Rp"
              }
              className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
            />
            {formCurrency === "USD" && formCurrentPrice && (
              <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-1">
                ≈ {formatRupiah(parseFloat(formCurrentPrice || "0") * usdtPref.rate)}
              </p>
            )}
          </div>

          {/* Sticky Bottom Action Dock - GUARANTEED NOT TO BE COVERED BY NAVBAR */}
          <div
            className="sticky bottom-0 left-0 right-0 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,16px))] -mx-5 px-5 flex gap-2.5 z-20 mt-6"
            style={{
              background: isDark
                ? "var(--bg-base)"
                : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, #fcfcfd 100%)",
              borderTop: "1px solid var(--glass-border)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <button
              type="button"
              onClick={closeAddFlow}
              className="flex-1 py-3 rounded-2xl text-[12.5px] font-bold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
            >
              {isIndonesian ? "Batal" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSaveNewHolding}
              className="flex-[2] py-3 rounded-2xl text-[12.5px] font-bold active:scale-95 transition-all cursor-pointer shadow-md text-center"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-base)",
              }}
            >
              {isIndonesian ? "Simpan Aset" : "Save Asset"}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Asset Detail Sheet with Transaction Bridge */}
      <AssetDetailSheet
        isOpen={!!selectedDetailHolding}
        onClose={() => setSelectedDetailHolding(null)}
        holding={selectedDetailHolding}
        onHoldingUpdated={() => {
          const freshHoldings = getSavedHoldings(user?.id);
          setHoldings(freshHoldings);
          const freshUsdt = getSavedUsdtPref(user?.id);
          setUsdtPref(freshUsdt);
          if (selectedDetailHolding) {
            const refreshed = freshHoldings.find(
              (x) => x.id === selectedDetailHolding.id,
            );
            if (refreshed) setSelectedDetailHolding(refreshed);
          }
        }}
        onDeleteHolding={(id, name) => {
          handleDeleteHolding(id, name);
          setSelectedDetailHolding(null);
        }}
      />

      {/* Staking Yield Modal */}
      <StakingYieldModal
        isOpen={isStakingModalOpen}
        onClose={() => setIsStakingModalOpen(false)}
        holdingUnits={usdtPref.units}
        liveRate={usdtPref.rate}
        wallets={wallets}
        userId={user?.id}
        onSuccess={() => {
          setUsdtPref(getSavedUsdtPref(user?.id));
          setHoldings(getSavedHoldings(user?.id));
        }}
      />

      {/* Icon Picker */}
      <MonochromeIconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={formIcon}
        onSelectIcon={(iconName) => setFormIcon(iconName)}
        title={isIndonesian ? "Pilih Ikon Aset" : "Select Asset Icon"}
      />
    </div>
  );
}
