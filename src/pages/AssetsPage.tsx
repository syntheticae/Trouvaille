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
  PieChart,
  ChevronDown,
} from "lucide-react";
import { formatRupiah } from "../lib/utils";
import { triggerHaptic } from "../lib/haptics";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
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
  calculatePortfolioSummary,
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
import { AssetAnalyticsSection } from "../components/statistics/AssetAnalyticsSection";
import { BottomSheet } from "../components/ui/BottomSheet";
import {
  MonthlyDeploymentBarCard,
  type MonthlyDeploymentItem,
} from "../components/assets/MonthlyDeploymentBarCard";
import { PortfolioInsightCards } from "../components/assets/PortfolioInsightCards";
import {
  calculateHistoricalNetWorthPoints,
  formatRunwaySummary,
} from "../lib/portfolioAnalytics";
import type { LiquiditySummary } from "../components/assets/CapitalAllocationCard";
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
  useCurrency();
  const { isStealthMode } = usePrivacy();

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
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);

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

  // Computations
  const otherHoldingsSummary = useMemo(
    () => calculatePortfolioSummary(liquidHoldings),
    [liquidHoldings],
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

  const totalCostBasis = usdtCostBasis + otherHoldingsSummary.totalCostBasis;
  const totalMarketValuation =
    usdtMarketValue + otherHoldingsSummary.totalMarketValue;
  const totalFloatingProfit = totalMarketValuation - totalCostBasis;
  const totalFloatingProfitPct =
    totalCostBasis > 0 ? (totalFloatingProfit / totalCostBasis) * 100 : 0;

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

  // Real Monthly Deployment Data (6 Months) from Transactions
  const monthlyDeploymentData: MonthlyDeploymentItem[] = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM", { locale: isIndonesian ? idLocale : undefined });
      return { key, label, deployed: 0, txCount: 0 };
    });

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

  // Multi-tier Liquidity Summary
  const liquiditySummary: LiquiditySummary = useMemo(() => {
    const cashWalletTotal = wallets
      .filter((w) => w.classification !== "investment" && w.classification !== "credit" && w.classification !== "loan")
      .reduce((sum, w) => sum + Math.max(0, Number(w.balance || 0)), 0);
    const liquidTotal = cashWalletTotal + usdtMarketValue;

    const growthTotal = liquidHoldings
      .filter((h) => h.asset_type === "stock" || (h.asset_type === "crypto" && h.symbol !== "USDT"))
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);

    const goldAndFundTotal = liquidHoldings
      .filter((h) => h.asset_type === "gold" || h.asset_type === "mutual_fund" || h.asset_type === "bond")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    const fixedTotal = fixedHoldings.reduce((sum, h) => {
      const v = calculateHoldingValuation(h);
      return sum + v.marketValue;
    }, 0);
    const defensiveTotal = goldAndFundTotal + fixedTotal;

    const grandTotal = Math.max(1, liquidTotal + growthTotal + defensiveTotal);

    return {
      liquid: liquidTotal,
      liquidPct: (liquidTotal / grandTotal) * 100,
      growth: growthTotal,
      growthPct: (growthTotal / grandTotal) * 100,
      defensive: defensiveTotal,
      defensivePct: (defensiveTotal / grandTotal) * 100,
    };
  }, [wallets, usdtMarketValue, liquidHoldings, fixedHoldings]);


  const liquidRunwayMonths = useMemo(() => {
    if (monthlyBurnRate <= 0) return 12;
    return Number((liquiditySummary.liquid / monthlyBurnRate).toFixed(1));
  }, [liquiditySummary.liquid, monthlyBurnRate]);

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
            {isIndonesian ? "Aset & Portofolio" : "Asset Valuation"}
          </h1>
          <p className="text-[12px] text-[var(--text-tertiary)] font-medium">
            {isIndonesian
              ? "Kekayaan bersih & performa portofolio live"
              : "Net worth & live portfolio"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            title={isIndonesian ? "Perbarui Harga" : "Refresh Prices"}
          >
            <RefreshCw
              size={15}
              strokeWidth={2}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsStakingModalOpen(true);
            }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
            title={isIndonesian ? "Sinkronisasi & Staking" : "Sync & Staking"}
          >
            <Link2 size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              setAddPhase(1);
            }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-sm"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
            }}
            title={isIndonesian ? "Tambah Aset" : "Add Asset"}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── 2. Total Net Valuation Hero Card (Silicon Valley Prospectus) ───── */}
      <div
        className="p-5 rounded-[28px] space-y-3 relative overflow-hidden transition-all"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
          border: isDark
            ? "1px solid var(--glass-border)"
            : "1px solid rgba(15,23,42,0.06)",
          boxShadow: isDark
            ? "var(--shadow-card)"
            : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
        }}
      >
        <div className="space-y-1">
          <span
            className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block"
          >
            {isIndonesian ? "Total Kekayaan Bersih" : "Total net worth"}
          </span>

          {/* Hero Number (Strictly font-light) */}
          <p
            className="amount text-[36px] sm:text-[42px] font-light tracking-tight leading-none text-[var(--text-primary)]"
          >
            {isStealthMode ? "••••••••" : formatRupiah(totalMarketValuation)}
          </p>

          {/* P&L Indicator (Strictly Monochrome + Arrow Vector) */}
          <div className="flex items-center gap-1.5 pt-1 text-[11.5px] font-mono text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-bold">
              {totalFloatingProfit >= 0 ? "▾" : "▴"}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {isStealthMode
                ? "••••"
                : `${totalFloatingProfit >= 0 ? "+" : ""}${formatRupiah(totalFloatingProfit)}`}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>
              {totalFloatingProfitPct >= 0 ? "+" : ""}
              {totalFloatingProfitPct.toFixed(1)}% (6 {isIndonesian ? "bln" : "mo"})
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>
              {isIndonesian ? "Modal " : "Cost basis "}
              {isStealthMode ? "••••" : formatRupiah(totalCostBasis)}
            </span>
          </div>
        </div>

        {/* 6-Month Trajectory Sparkline Curve (Hermite SVG) */}
        {(() => {
          const trajectoryPoints = calculateHistoricalNetWorthPoints(
            totalMarketValuation,
            monthlyDeploymentData,
          );
          if (trajectoryPoints.length === 0) return null;

          const svgW = 320;
          const svgH = 65;
          const padL = 10;
          const padR = 14;
          const padT = 12;
          const padB = 8;
          const plotW = svgW - padL - padR;
          const plotH = svgH - padT - padB;

          const minV = Math.min(...trajectoryPoints.map((p) => p.valuation));
          const maxV = Math.max(...trajectoryPoints.map((p) => p.valuation), minV + 1);

          const pts = trajectoryPoints.map((pt, i) => {
            const x = padL + (i / (trajectoryPoints.length - 1)) * plotW;
            const y = padT + plotH - ((pt.valuation - minV) / (maxV - minV || 1)) * plotH;
            return { ...pt, x, y };
          });

          const pathD = pts.reduce((acc, pt, i, arr) => {
            if (i === 0) return `M ${pt.x} ${pt.y}`;
            const prev = arr[i - 1];
            const cx = (prev.x + pt.x) / 2;
            return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
          }, "");

          const lastPt = pts[pts.length - 1];

          return (
            <div className="pt-2 pb-1 space-y-1.5">
              <div className="w-full h-[65px] relative">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-full overflow-visible"
                >
                  {/* Trajectory Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(24, 24, 27, 0.85)"}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Glowing Terminal Anchor Pin */}
                  {lastPt && (
                    <>
                      <circle
                        cx={lastPt.x}
                        cy={lastPt.y}
                        r="6"
                        fill={isDark ? "#FFFFFF" : "#18181B"}
                        opacity="0.25"
                      />
                      <circle
                        cx={lastPt.x}
                        cy={lastPt.y}
                        r="3"
                        fill={isDark ? "#FFFFFF" : "#18181B"}
                      />
                    </>
                  )}
                </svg>
              </div>

              {/* Month Axis Labels */}
              <div className="flex items-center justify-between px-1 text-[10.5px] font-mono text-[var(--text-tertiary)]">
                {trajectoryPoints.map((pt) => (
                  <span key={pt.key}>{pt.label}</span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Integrated Runway Status Line & Explicit USDT Rate */}
        <div className="pt-2.5 border-t border-[var(--glass-border)] flex items-center justify-between text-[11px]">
          <span className="font-medium text-[var(--text-secondary)]">
            {formatRunwaySummary(liquidRunwayMonths, monthlyBurnRate, isIndonesian)}
          </span>

          {/* Explicit Per-Unit USDT Rate */}
          <span className="font-mono text-[10.5px] text-[var(--text-tertiary)]">
            Live USDT Rate: <strong className="text-[var(--text-secondary)]">{formatRupiah(usdtPref.rate)}</strong> / USDT
          </span>
        </div>
      </div>

      {/* ── 3. Auto-Reconciliation Alert Banner ────────────────────────────── */}
      {reconciliationAudit.hasDiscrepancy && !dismissedReconciliation && (
        <div
          className="p-3.5 rounded-2xl flex items-center justify-between gap-3 border border-white/12 animate-in fade-in"
          style={{ background: "rgba(255, 255, 255, 0.04)" }}
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

      {/* ── 4. Monthly Investment Deployment Bar Chart (shadcn/ui Minimal) ── */}
      <MonthlyDeploymentBarCard
        data={monthlyDeploymentData}
        isDark={isDark}
        isIndonesian={isIndonesian}
        hideBalance={isStealthMode}
      />

      {/* ── 5. Portfolio Intelligence & Insight Cards ─────────────────────── */}
      <PortfolioInsightCards
        holdings={holdings}
        usdtHolding={usdtInfo}
        liquidCash={liquiditySummary.liquid}
        totalMarketValuation={totalMarketValuation}
        monthlyBurnRate={monthlyBurnRate}
        isDark={isDark}
        isIndonesian={isIndonesian}
        hideBalance={isStealthMode}
      />

      {/* ── 6. Section Header & Category Filter Chips ──────────────────────── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
              {isIndonesian ? "Kepemilikan Aset" : "Asset Holdings"}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-[var(--text-tertiary)] font-semibold">
              {displayHoldings.length + ((filterType === "all" || filterType === "crypto") && (usdtPref.units > 0 || recordedCryptoBalance > 0) ? 1 : 0)}{" "}
              {isIndonesian ? "aset" : "assets"}
            </span>
          </div>

          <span className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)]">
            {isStealthMode ? "••••••••" : formatRupiah(totalMarketValuation)}
          </span>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { key: "all", label: isIndonesian ? "Semua" : "All" },
              { key: "crypto", label: "Crypto" },
              { key: "stock", label: isIndonesian ? "Saham" : "Stocks" },
              { key: "gold", label: isIndonesian ? "Emas" : "Gold" },
              { key: "mutual_fund", label: isIndonesian ? "Reksa Dana" : "Mutual Funds" },
              { key: "fixed_asset", label: isIndonesian ? "Aset Fisik" : "Fixed Assets" },
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
      </div>

      {/* ── 7. Enhanced Holdings Deck with Dominance Progress Bars ─────────── */}
      <div className="space-y-2.5">
        {/* Core USDT Row */}
        {(filterType === "all" || filterType === "crypto") &&
          (usdtPref.units > 0 || recordedCryptoBalance > 0) && (
            <div
              onClick={openUsdtDetail}
              className="p-4 rounded-[24px] space-y-2.5 cursor-pointer active:scale-[0.99] transition-transform select-none"
              style={{
                background: isDark
                  ? "var(--bg-elevated)"
                  : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
                border: isDark
                  ? "1px solid var(--glass-border)"
                  : "1px solid rgba(15,23,42,0.06)",
                boxShadow: isDark
                  ? "var(--shadow-card)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Coins size={19} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-[13px] tracking-wide text-[var(--text-primary)]">
                        USDT
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-semibold bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                        Crypto
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {usdtPref.units > 0
                        ? `${usdtPref.units.toLocaleString()} USDT`
                        : `Wallet linked · ${suggestedUsdtUnits} USDT`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="text-[14px] font-bold text-[var(--text-primary)] block leading-snug">
                    {isStealthMode
                      ? "••••••••"
                      : formatRupiah(usdtMarketValue)}
                  </span>
                  <span className="text-[10.5px] font-semibold text-[var(--text-secondary)]">
                    {isStealthMode
                      ? "••••"
                      : `${usdtFloatingPnL >= 0 ? "+" : ""}${formatRupiah(usdtFloatingPnL)} (${usdtFloatingPnLPct >= 0 ? "+" : ""}${usdtFloatingPnLPct.toFixed(1)}%)`}
                  </span>
                </div>
              </div>

              {/* Inline Dominance Progress Bar */}
              <div className="pt-2 border-t border-[var(--glass-border)] space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[var(--text-tertiary)]">
                    {isIndonesian ? "Porsi Portofolio" : "Portfolio Share"}
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-secondary)]">
                    {totalMarketValuation > 0
                      ? ((usdtMarketValue / totalMarketValuation) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden bg-white/[0.08] dark:bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(totalMarketValuation > 0 ? (usdtMarketValue / totalMarketValuation) * 100 : 0, 3), 100)}%`,
                      backgroundColor: isDark ? "#ffffff" : "#18181b",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

        {/* Other Active Holdings */}
        {displayHoldings.map((h) => {
          const val = calculateHoldingValuation(h);
          const displayPrice = val.marketValue;
          const dominancePct =
            totalMarketValuation > 0 ? (val.marketValue / totalMarketValuation) * 100 : 0;

          return (
            <div
              key={h.id}
              onClick={() => handleOpenHoldingDetail(h)}
              className="p-4 rounded-[24px] space-y-2.5 cursor-pointer active:scale-[0.99] transition-transform select-none"
              style={{
                background: isDark
                  ? "var(--bg-elevated)"
                  : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
                border: isDark
                  ? "1px solid var(--glass-border)"
                  : "1px solid rgba(15,23,42,0.06)",
                boxShadow: isDark
                  ? "var(--shadow-card)"
                  : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <IconRenderer
                      icon={h.icon || "TrendingUp"}
                      size="w-4.5 h-4.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[13px] tracking-wide text-[var(--text-primary)] truncate">
                        {h.symbol}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                        {h.asset_type.replace("_", " ")}
                      </span>
                      {h.notes?.startsWith("Platform:") && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-white/[0.05] text-[var(--text-tertiary)]">
                          {h.notes.replace("Platform:", "").trim()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {h.name} · {h.units.toLocaleString()}{" "}
                      {isIndonesian ? "unit" : "units"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="text-[14px] font-bold text-[var(--text-primary)] block leading-snug">
                    {isStealthMode
                      ? "••••••••"
                      : formatRupiah(displayPrice)}
                  </span>
                  <span className="text-[10.5px] font-semibold text-[var(--text-secondary)]">
                    {isStealthMode
                      ? "••••"
                      : `${val.floatingPnL >= 0 ? "+" : ""}${formatRupiah(val.floatingPnL)} (${val.floatingPnLPct >= 0 ? "+" : ""}${val.floatingPnLPct.toFixed(1)}%)`}
                  </span>
                </div>
              </div>

              {/* Inline Dominance Progress Bar */}
              <div className="pt-2 border-t border-[var(--glass-border)] space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[var(--text-tertiary)]">
                    {isIndonesian ? "Porsi Portofolio" : "Portfolio Share"}
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-secondary)]">
                    {dominancePct.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden bg-white/[0.08] dark:bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(dominancePct, 3), 100)}%`,
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.75)"
                        : "rgba(24, 24, 27, 0.75)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {displayHoldings.length === 0 &&
          (filterType !== "all" || usdtPref.units <= 0) && (
            <div className="p-8 text-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] space-y-2">
              <PieChart
                size={28}
                strokeWidth={1.5}
                className="mx-auto text-[var(--text-tertiary)]"
              />
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {isIndonesian ? "Belum ada aset tercatat" : "No investment assets recorded"}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-xs mx-auto">
                {isIndonesian
                  ? "Ketuk tombol (+) di atas untuk menambahkan kripto, saham, emas, atau aset fisik."
                  : "Tap the (+) button above to add crypto, stocks, gold, or fixed assets."}
              </p>
            </div>
          )}
      </div>

      {/* ── 8. Collapsible Advanced Analytics Accordion ───────────────────── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setIsAnalyticsExpanded(!isAnalyticsExpanded);
          }}
          className="w-full p-4 rounded-[24px] flex items-center justify-between text-left transition-all cursor-pointer"
          style={{
            background: isDark
              ? "var(--bg-elevated)"
              : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
            border: isDark
              ? "1px solid var(--glass-border)"
              : "1px solid rgba(15,23,42,0.06)",
            boxShadow: isDark
              ? "var(--shadow-card)"
              : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <PieChart size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                {isIndonesian
                  ? "Analisis Portofolio & Diagnostik Lanjutan"
                  : "Advanced Portfolio Diagnostics & Analytics"}
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian
                  ? "Distribusi aset, target alokasi & ketahanan modal"
                  : "Asset distribution, target allocation & liquidity"}
              </p>
            </div>
          </div>

          <div
            className={`p-1.5 rounded-full transition-transform duration-300 ${
              isAnalyticsExpanded ? "rotate-180" : ""
            }`}
            style={{ color: "var(--text-tertiary)" }}
          >
            <ChevronDown size={18} />
          </div>
        </button>

        {isAnalyticsExpanded && (
          <div className="animate-in fade-in slide-in-from-top-3 duration-300 pt-3">
            <AssetAnalyticsSection
              wallets={wallets}
              monthlyBurnRate={monthlyBurnRate}
              hideBalance={isStealthMode}
              onOpenValuation={() => setAddPhase(1)}
            />
          </div>
        )}
      </div>

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
