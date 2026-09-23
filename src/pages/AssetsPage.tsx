import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Coins,
  Search,
  RefreshCw,
  X,
  Sparkles,
  PieChart,
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
import {
  CapitalAllocationHeroCard,
  type AssetAllocationItem,
} from "../components/assets/CapitalAllocationHeroCard";
import { MonthlyDeploymentBarCard } from "../components/assets/MonthlyDeploymentBarCard";
import { AssetBentoMicroCards } from "../components/assets/AssetBentoMicroCards";
import type { InvestmentHolding, AssetType } from "../lib/types";

export type PresetCategory =
  | "all"
  | "crypto"
  | "stock_id"
  | "stock_us"
  | "gold"
  | "mutual_fund"
  | "fixed_asset";

interface PresetAsset {
  symbol: string;
  name: string;
  type: AssetType;
  category: PresetCategory;
  icon?: string;
  defaultCurrency: "IDR" | "USD";
}

const PRESET_ASSETS: PresetAsset[] = [
  // Crypto
  { symbol: "BTC", name: "Bitcoin", type: "crypto", category: "crypto", icon: "Coins", defaultCurrency: "USD" },
  { symbol: "ETH", name: "Ethereum", type: "crypto", category: "crypto", icon: "Coins", defaultCurrency: "USD" },
  { symbol: "SOL", name: "Solana", type: "crypto", category: "crypto", icon: "Coins", defaultCurrency: "USD" },
  { symbol: "BNB", name: "Binance Coin", type: "crypto", category: "crypto", icon: "Coins", defaultCurrency: "USD" },

  // US Equities
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", category: "stock_us", icon: "TrendingUp", defaultCurrency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", category: "stock_us", icon: "TrendingUp", defaultCurrency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", category: "stock_us", icon: "TrendingUp", defaultCurrency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", category: "stock_us", icon: "TrendingUp", defaultCurrency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", category: "stock_us", icon: "TrendingUp", defaultCurrency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", category: "stock_us", icon: "TrendingUp", defaultCurrency: "USD" },

  // IDX Stocks
  { symbol: "BBCA", name: "Bank Central Asia", type: "stock", category: "stock_id", icon: "TrendingUp", defaultCurrency: "IDR" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", type: "stock", category: "stock_id", icon: "TrendingUp", defaultCurrency: "IDR" },
  { symbol: "BMRI", name: "Bank Mandiri", type: "stock", category: "stock_id", icon: "TrendingUp", defaultCurrency: "IDR" },
  { symbol: "TLKM", name: "Telkom Indonesia", type: "stock", category: "stock_id", icon: "TrendingUp", defaultCurrency: "IDR" },
  { symbol: "ASII", name: "Astra International", type: "stock", category: "stock_id", icon: "TrendingUp", defaultCurrency: "IDR" },

  // Gold & Commodities
  { symbol: "XAU", name: "Gold Antam (per gram)", type: "gold", category: "gold", icon: "Landmark", defaultCurrency: "IDR" },

  // Mutual Funds
  { symbol: "RD-PASAR-UANG", name: "Reksa Dana Pasar Uang", type: "mutual_fund", category: "mutual_fund", icon: "TrendingUp", defaultCurrency: "IDR" },
  { symbol: "RD-PENDAPATAN-TETAP", name: "Reksa Dana Pendapatan Tetap", type: "mutual_fund", category: "mutual_fund", icon: "FileText", defaultCurrency: "IDR" },
  { symbol: "RD-SAHAM", name: "Reksa Dana Saham", type: "mutual_fund", category: "mutual_fund", icon: "TrendingUp", defaultCurrency: "IDR" },
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
  const [formCurrency, setFormCurrency] = useState<"IDR" | "USD">("IDR");
  const [formUnits, setFormUnits] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
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

  // Refresh Prices Action
  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    triggerHaptic("medium");
    try {
      const { usdtRate, updatedHoldings } = await refreshAllPortfolioPrices(
        user?.id,
      );
      if (usdtRate > 5000 && usdtRate < 50000) {
        setUsdtPref((prev: UsdtValuationPref) => ({ ...prev, rate: usdtRate }));
      }
      if (updatedHoldings && updatedHoldings.length > 0) {
        setHoldings(updatedHoldings);
      }
      showToast(
        isIndonesian
          ? "Harga pasar portofolio berhasil diperbarui"
          : "Portfolio market prices updated",
        "update",
        () => {},
      );
    } catch {
      showToast(
        isIndonesian ? "Gagal memperbarui harga" : "Failed to update prices",
        "delete",
        () => {},
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteHolding = (id: string, name: string) => {
    triggerHaptic("heavy");
    if (id.startsWith("usdt-") || id === "usdt-core-holding") {
      const cleared: UsdtValuationPref = {
        units: 0,
        rate: usdtPref.rate,
        costBasis: 0,
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
    showToast(
      isIndonesian ? `${name} berhasil dihapus` : `${name} removed`,
      "delete",
      () => {},
    );
  };

  // ── Portofolio Calculations ──────────────────────────────────────────────
  const cryptoWallet = useMemo(() => {
    return wallets.find(
      (w) =>
        w.name.toLowerCase().includes("usdt") ||
        w.name.toLowerCase().includes("crypto") ||
        w.classification === "investment",
    );
  }, [wallets]);

  const recordedCryptoBalance = cryptoWallet?.balance ?? 0;

  const suggestedUsdtUnits = useMemo(() => {
    if (usdtPref.rate <= 0) return 0;
    return Math.round((recordedCryptoBalance / usdtPref.rate) * 100) / 100;
  }, [recordedCryptoBalance, usdtPref.rate]);

  const usdtMarketValue = useMemo(() => {
    const units = usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits;
    return units * usdtPref.rate;
  }, [usdtPref.units, suggestedUsdtUnits, usdtPref.rate]);

  // USDT Cost Basis
  const usdtCostBasis = useMemo(() => {
    const cryptoHolding = holdings.find(
      (h) => h.symbol?.toUpperCase() === "USDT" || h.id.startsWith("usdt-"),
    );
    if (cryptoHolding?.avg_buy_price && cryptoHolding.avg_buy_price > 0) {
      return (
        (usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits) *
        cryptoHolding.avg_buy_price
      );
    }
    const initialTxs = allTxs.filter(
      (tx) =>
        tx.note?.toLowerCase().includes("initial usdt position") ||
        (tx.note?.toLowerCase().includes("initial") &&
          tx.wallet_id &&
          wallets.find((w) => w.id === tx.wallet_id)?.classification === "investment"),
    );
    if (initialTxs.length > 0) {
      return initialTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    }
    return usdtMarketValue;
  }, [holdings, usdtPref.units, suggestedUsdtUnits, allTxs, wallets, usdtMarketValue]);

  const usdtFloatingPnL = usdtMarketValue - usdtCostBasis;
  const usdtFloatingPnLPct =
    usdtCostBasis > 0 ? (usdtFloatingPnL / usdtCostBasis) * 100 : 0;

  // Other Holdings Split
  const liquidHoldings = useMemo(
    () =>
      holdings.filter(
        (h) =>
          h.asset_type !== "fixed_asset" &&
          h.symbol?.toUpperCase() !== "USDT" &&
          !h.id.startsWith("usdt-"),
      ),
    [holdings],
  );

  const fixedHoldings = useMemo(
    () => holdings.filter((h) => h.asset_type === "fixed_asset"),
    [holdings],
  );

  const displayHoldings = useMemo(() => {
    if (filterType === "all") return [...liquidHoldings, ...fixedHoldings];
    return holdings.filter(
      (h) =>
        h.asset_type === filterType &&
        h.symbol?.toUpperCase() !== "USDT" &&
        !h.id.startsWith("usdt-"),
    );
  }, [holdings, liquidHoldings, fixedHoldings, filterType]);

  const portfolioSummary = useMemo(() => {
    return calculatePortfolioSummary(liquidHoldings);
  }, [liquidHoldings]);

  const fixedValuationTotal = useMemo(() => {
    return fixedHoldings.reduce((sum, h) => {
      const val = calculateHoldingValuation(h);
      return sum + val.marketValue;
    }, 0);
  }, [fixedHoldings]);

  const fixedCostBasisTotal = useMemo(() => {
    return fixedHoldings.reduce((sum, h) => {
      return sum + h.units * (h.avg_buy_price || 0);
    }, 0);
  }, [fixedHoldings]);

  const totalMarketValuation =
    usdtMarketValue + portfolioSummary.totalMarketValue + fixedValuationTotal;

  const totalCostBasis =
    usdtCostBasis + portfolioSummary.totalCostBasis + fixedCostBasisTotal;

  const totalFloatingProfit = totalMarketValuation - totalCostBasis;
  const totalFloatingProfitPct =
    totalCostBasis > 0 ? (totalFloatingProfit / totalCostBasis) * 100 : 0;

  // Asset Class Allocation Breakdown
  const allocationBreakdown = useMemo<AssetAllocationItem[]>(() => {
    if (totalMarketValuation <= 0) return [];
    const classes: AssetAllocationItem[] = [];

    // 1. Crypto (USDT + Other Crypto)
    const otherCryptoVal = liquidHoldings
      .filter((h) => h.asset_type === "crypto")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    const cryptoTotal = usdtMarketValue + otherCryptoVal;
    if (cryptoTotal > 0) {
      classes.push({
        type: "crypto",
        label: "Crypto",
        value: cryptoTotal,
        pct: (cryptoTotal / totalMarketValuation) * 100,
        color: isDark ? "#ffffff" : "#111827",
      });
    }

    // 2. Stocks
    const stockValue = liquidHoldings
      .filter((h) => h.asset_type === "stock")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    if (stockValue > 0) {
      classes.push({
        type: "stock",
        label: isIndonesian ? "Saham" : "Stocks",
        value: stockValue,
        pct: (stockValue / totalMarketValuation) * 100,
        color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)",
      });
    }

    // 3. Gold & Commodities
    const goldValue = liquidHoldings
      .filter((h) => h.asset_type === "gold")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    if (goldValue > 0) {
      classes.push({
        type: "gold",
        label: isIndonesian ? "Emas" : "Gold",
        value: goldValue,
        pct: (goldValue / totalMarketValuation) * 100,
        color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
      });
    }

    // 4. Mutual Funds & Bonds
    const fundValue = liquidHoldings
      .filter((h) => h.asset_type === "mutual_fund" || h.asset_type === "bond")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    if (fundValue > 0) {
      classes.push({
        type: "fund",
        label: isIndonesian ? "Reksa Dana" : "Funds",
        value: fundValue,
        pct: (fundValue / totalMarketValuation) * 100,
        color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.25)",
      });
    }

    // 5. Fixed Assets / Property
    const fixedValue = fixedHoldings.reduce((sum, h) => {
      const val = calculateHoldingValuation(h);
      return sum + val.marketValue;
    }, 0);
    if (fixedValue > 0) {
      classes.push({
        type: "fixed",
        label: isIndonesian ? "Aset Fisik" : "Fixed Assets",
        value: fixedValue,
        pct: (fixedValue / totalMarketValuation) * 100,
        color: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)",
      });
    }

    return classes;
  }, [totalMarketValuation, usdtMarketValue, liquidHoldings, fixedHoldings, isDark, isIndonesian]);

  // Dynamic Monthly Burn Rate for Emergency Runway Coverage
  const monthlyBurnRate = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentExpenses = allTxs.filter(
      (tx) => tx.type === "expense" && tx.occurred_on && new Date(tx.occurred_on) >= threeMonthsAgo,
    );
    const sum = recentExpenses.reduce((s, tx) => s + Number(tx.amount || 0), 0);
    return sum > 0 ? Math.round(sum / 3) : 3500000;
  }, [allTxs]);

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

  // Preset Filtering by Category & Search Query
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_ASSETS.filter((p) => {
      const matchCat = presetCategory === "all" || p.category === presetCategory;
      const matchQuery =
        !q ||
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [searchQuery, presetCategory]);

  // Handle Preset Selection
  const handleSelectPreset = async (preset: PresetAsset) => {
    triggerHaptic("medium");
    setFormSymbol(preset.symbol);
    setFormName(preset.name);
    setFormType(preset.type);
    setFormCurrency(preset.defaultCurrency || "IDR");
    setFormIcon(preset.icon || "TrendingUp");
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
        if (preset.defaultCurrency === "USD" && usdtPref.rate > 0) {
          const inUsd = (livePrice / usdtPref.rate).toFixed(2);
          setFormCurrentPrice(inUsd);
          setFormBuyPrice(inUsd);
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
    setFormCurrency(type === "fixed_asset" ? "IDR" : "IDR");
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
    setPresetCategory("all");
  };

  // Save New Holding
  const handleSaveNewHolding = () => {
    const rawUnits = parseFloat(formUnits);
    const rawBuyPrice = parseFloat(formBuyPrice);
    const rawCurrentPrice = parseFloat(formCurrentPrice) || rawBuyPrice;

    if (!formName.trim()) {
      showToast(isIndonesian ? "Masukkan nama aset" : "Please enter asset name", "delete", () => {});
      return;
    }

    if (isNaN(rawUnits) || rawUnits <= 0 || isNaN(rawBuyPrice) || rawBuyPrice <= 0) {
      showToast(isIndonesian ? "Masukkan nominal yang valid" : "Please enter valid numbers", "delete", () => {});
      return;
    }

    // Live conversion if USD
    const rate = usdtPref.rate > 0 ? usdtPref.rate : 16200;
    const buyPrice = formCurrency === "USD" ? Math.round(rawBuyPrice * rate) : rawBuyPrice;
    const currentPrice = formCurrency === "USD" ? Math.round(rawCurrentPrice * rate) : rawCurrentPrice;

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

    const holdingToSave: InvestmentHolding = {
      id: editingHoldingId || `holding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol,
      name: formName.trim(),
      asset_type: formType,
      units: rawUnits,
      avg_buy_price: buyPrice,
      current_price: currentPrice,
      currency: "IDR",
      icon: formIcon,
      annual_rate: signedRate,
      purchase_date: formPurchaseDate || new Date().toISOString().split("T")[0],
    };

    upsertHolding(holdingToSave, user?.id);
    setHoldings(getSavedHoldings(user?.id));
    triggerHaptic("heavy");
    closeAddFlow();

    showToast(
      isIndonesian ? `Aset ${symbol} berhasil disimpan` : `Asset ${symbol} saved successfully`,
      "add",
      () => {},
    );
  };

  // Category filter presets for modal
  const PRESET_CATEGORIES: { id: PresetCategory; label: string }[] = [
    { id: "all", label: isIndonesian ? "Semua" : "All" },
    { id: "crypto", label: "Crypto" },
    { id: "stock_id", label: "Saham IDX" },
    { id: "stock_us", label: "Saham AS" },
    { id: "gold", label: isIndonesian ? "Emas" : "Gold" },
    { id: "mutual_fund", label: isIndonesian ? "Reksa Dana" : "Funds" },
    { id: "fixed_asset", label: isIndonesian ? "Aset Fisik" : "Fixed" },
  ];

  return (
    <div
      className="min-h-screen select-none pb-28 pt-[calc(env(safe-area-inset-top,0px)+12px)] px-4 max-w-lg mx-auto space-y-4"
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Aset & Portofolio" : "Asset Valuation"}
          </h1>
          <p className="text-[12px] text-[var(--text-tertiary)] font-medium">
            {isIndonesian
              ? "Kekayaan bersih & performa portofolio live"
              : "Net worth telemetry & live valuation"}
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
            title={isIndonesian ? "Catat Staking Yield" : "Record Staking Yield"}
          >
            <Coins size={16} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("medium");
              setAddPhase(1);
            }}
            className="h-9 px-3 rounded-2xl flex items-center gap-1.5 font-semibold text-[12px] active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-base)",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>{isIndonesian ? "Tambah" : "Add"}</span>
          </button>
        </div>
      </div>

      {/* 2. Capital Allocation Hero Card (Apple Donut + Interactive Segment Breakdown) */}
      <CapitalAllocationHeroCard
        totalMarketValuation={totalMarketValuation}
        totalCostBasis={totalCostBasis}
        totalFloatingProfit={totalFloatingProfit}
        totalFloatingProfitPct={totalFloatingProfitPct}
        usdtRate={usdtPref.rate}
        allocationBreakdown={allocationBreakdown}
        isDark={isDark}
        isIndonesian={isIndonesian}
        hideBalance={isStealthMode}
      />

      {/* 3. Monthly Capital Deployment & Performance Bar Chart (shadcn/ui Recharts) */}
      <MonthlyDeploymentBarCard
        transactions={allTxs}
        totalMarketValuation={totalMarketValuation}
        totalFloatingProfit={totalFloatingProfit}
        isDark={isDark}
        isIndonesian={isIndonesian}
        hideBalance={isStealthMode}
      />

      {/* 4. Asset Bento Micro-Cards (Asset Return, Liquidity Runway, Passive Stream) */}
      <AssetBentoMicroCards
        holdings={holdings}
        usdtUnits={usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits}
        usdtMarketValue={usdtMarketValue}
        usdtRate={usdtPref.rate}
        monthlyBurnRate={monthlyBurnRate}
        isDark={isDark}
        isIndonesian={isIndonesian}
        hideBalance={isStealthMode}
      />

      {/* 5. Auto-Reconciliation Alert Banner (e.g. SeaBank P2P Transfer) */}
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
                  : "USDT Transaction Discrepancy"}
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

      {/* 6. Holdings Category Filter Chips */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {(
            [
              { key: "all", label: isIndonesian ? "Semua Aset" : "All Assets" },
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
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent"
                    : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Holdings Deck (Apple Stock List format) */}
      <div className="space-y-2">
        {/* Core USDT Row */}
        {(filterType === "all" || filterType === "crypto") &&
          (usdtPref.units > 0 || recordedCryptoBalance > 0) && (
            <div
              onClick={openUsdtDetail}
              className="p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform select-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
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
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-white/[0.08] text-[var(--text-tertiary)]">
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
          )}

        {/* Other Active Holdings */}
        {displayHoldings.map((h) => {
          const val = calculateHoldingValuation(h);
          const displayPrice = val.marketValue;

          return (
            <div
              key={h.id}
              onClick={() => handleOpenHoldingDetail(h)}
              className="p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform select-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] tracking-wide text-[var(--text-primary)] truncate">
                      {h.symbol}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-medium bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                      {h.asset_type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                    {h.name} · {h.units.toLocaleString()} unit
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
                {isIndonesian ? "Belum ada aset tercatat" : "No assets recorded"}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-xs mx-auto">
                {isIndonesian
                  ? "Ketuk tombol (+) di atas untuk menambahkan kripto, saham, emas, atau aset tetap."
                  : "Tap (+) button above to add crypto, stocks, gold, or fixed assets."}
              </p>
            </div>
          )}
      </div>

      {/* ── Two-Phase Add Holding Modal ────────────────────────────────────── */}
      {/* Phase 1: Categorized Preset Asset Picker */}
      {addPhase === 1 && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none pb-[max(calc(env(safe-area-inset-bottom,0px)+16px),20px)] sm:pb-4 animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-[28px] sm:rounded-2xl p-5 pb-8 sm:pb-6 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {isIndonesian ? "Pilih Aset Investasi" : "Select Investment Asset"}
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {isIndonesian
                    ? "Pilih kategori atau cari simbol aset"
                    : "Filter by category or search asset symbol"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddFlow}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 transition-all cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Search Input */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--glass-border)]"
              style={{ background: "var(--glass-fill)" }}
            >
              <Search size={14} className="text-[var(--text-tertiary)] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isIndonesian ? "Cari BTC, BBCA, Apple, Emas..." : "Search BTC, BBCA, Gold, Apple..."}
                className="flex-1 bg-transparent text-[12.5px] outline-none font-medium"
                style={{ color: "var(--text-primary)" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="cursor-pointer text-[var(--text-tertiary)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {PRESET_CATEGORIES.map((cat) => {
                const isActive = presetCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setPresetCategory(cat.id);
                    }}
                    className={`px-3 py-1 rounded-full text-[10.5px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      isActive
                        ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent"
                        : "bg-[var(--glass-fill)] text-[var(--text-secondary)] border-[var(--glass-border)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("fixed_asset")}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
              >
                + {isIndonesian ? "Properti / Fisik" : "Fixed Asset"}
              </button>
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("stock")}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
              >
                + {isIndonesian ? "Aset Kustom" : "Custom Asset"}
              </button>
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pt-1 max-h-[320px]">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.symbol}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer text-left hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                      <IconRenderer
                        icon={preset.icon || "TrendingUp"}
                        size="w-4 h-4"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[12.5px] text-[var(--text-primary)]">
                          {preset.symbol}
                        </span>
                        <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/[0.08] text-[var(--text-tertiary)]">
                          {preset.defaultCurrency}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-[var(--text-tertiary)] truncate block">
                        {preset.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[var(--text-tertiary)]">
                    {preset.category.replace("_", " ")}
                  </span>
                </button>
              ))}

              {filteredPresets.length === 0 && (
                <div className="p-6 text-center text-[var(--text-tertiary)] text-[11.5px]">
                  {isIndonesian ? "Tidak ada aset yang cocok" : "No matching assets found"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Details Form Modal (With Dual-Currency IDR/USD & Anti-Navbar Blocking) */}
      {addPhase === 2 && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none pb-[max(calc(env(safe-area-inset-bottom,0px)+20px),24px)] sm:pb-4 animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-[28px] sm:rounded-2xl p-5 pb-8 sm:pb-6 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[85vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {formName || "Asset Details"}
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {formSymbol} · {formType.replace("_", " ").toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddFlow}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-90 cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Currency Selector Pill */}
            <div className="flex items-center justify-between p-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)]">
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-primary)] block">
                  {isIndonesian ? "Mata Uang Input" : "Input Currency"}
                </span>
                <span className="text-[9.5px] text-[var(--text-tertiary)]">
                  Live USD: {formatRupiah(usdtPref.rate)}
                </span>
              </div>

              <div
                className="flex items-center p-0.5 rounded-full border border-[var(--glass-border)]"
                style={{ background: "var(--bg-elevated)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setFormCurrency("IDR");
                  }}
                  className={`px-3 py-1 rounded-full text-[10.5px] font-bold font-mono transition-all cursor-pointer ${
                    formCurrency === "IDR"
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm"
                      : "text-[var(--text-tertiary)]"
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
                  className={`px-3 py-1 rounded-full text-[10.5px] font-bold font-mono transition-all cursor-pointer ${
                    formCurrency === "USD"
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>

            {/* Inputs: Name & Symbol */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl text-[12.5px] font-bold font-mono outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-[12.5px] font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Units & Buy Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                  Units / Amount
                </label>
                <input
                  type="text"
                  value={formUnits}
                  onChange={(e) => setFormUnits(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 rounded-xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                    Buy Price / Unit
                  </label>
                  <span className="text-[9.5px] font-bold text-[var(--text-secondary)] font-mono">
                    {formCurrency}
                  </span>
                </div>
                <input
                  type="text"
                  value={formBuyPrice}
                  onChange={(e) => setFormBuyPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={formCurrency === "USD" ? "$ 225.00" : "Rp"}
                  className="w-full px-3 py-2 rounded-xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
                />
                {formBuyPrice && (
                  <span className="text-[9px] font-mono text-[var(--text-tertiary)] block mt-0.5 truncate">
                    {formCurrency === "USD"
                      ? `≈ Rp ${formatRupiah(Math.round(parseFloat(formBuyPrice || "0") * usdtPref.rate))}`
                      : `≈ $ ${(parseFloat(formBuyPrice || "0") / (usdtPref.rate || 16000)).toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>

            {/* Current Price */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                  Current Market Price / Unit
                </label>
                <span className="text-[9.5px] font-bold text-[var(--text-secondary)] font-mono">
                  {formCurrency}
                </span>
              </div>
              <input
                type="text"
                value={formCurrentPrice}
                onChange={(e) => setFormCurrentPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={isFetchingCurrentPrice ? "Fetching live price..." : formCurrency === "USD" ? "$ 230.00" : "Rp"}
                className="w-full px-3 py-2 rounded-xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
              {formCurrentPrice && (
                <span className="text-[9px] font-mono text-[var(--text-tertiary)] block mt-0.5 truncate">
                  {formCurrency === "USD"
                    ? `≈ Rp ${formatRupiah(Math.round(parseFloat(formCurrentPrice || "0") * usdtPref.rate))}`
                    : `≈ $ ${(parseFloat(formCurrentPrice || "0") / (usdtPref.rate || 16000)).toFixed(2)}`}
                </span>
              )}
            </div>

            {/* Fixed Asset Specific Fields */}
            {formType === "fixed_asset" && (
              <div className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-[var(--text-primary)]">
                    {isIndonesian ? "Depresiasi / Apresiasi Tahunan" : "Annual Value Shift"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFormAnnualRateSign("+")}
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold ${
                        formAnnualRateSign === "+"
                          ? "bg-[var(--text-primary)] text-[var(--bg-base)]"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormAnnualRateSign("-")}
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold ${
                        formAnnualRateSign === "-"
                          ? "bg-[var(--text-primary)] text-[var(--bg-base)]"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      -
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formAnnualRate}
                    onChange={(e) => setFormAnnualRate(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="10"
                    className="w-20 px-3 py-1.5 rounded-lg text-[12px] font-mono font-bold outline-none border border-[var(--glass-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  />
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    % / {isIndonesian ? "tahun" : "year"}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons: Elevated, Unobstructed, Safe from Navbar */}
            <div className="flex gap-2.5 pt-3 border-t border-[var(--glass-border)]">
              <button
                type="button"
                onClick={closeAddFlow}
                className="flex-1 py-3 rounded-2xl text-[12.5px] font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] active:scale-95 transition-transform cursor-pointer text-center"
              >
                {isIndonesian ? "Batal" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveNewHolding}
                className="flex-1 py-3 rounded-2xl text-[12.5px] font-semibold bg-[var(--text-primary)] text-[var(--bg-base)] active:scale-95 transition-transform cursor-pointer shadow-lg text-center"
              >
                {editingHoldingId
                  ? isIndonesian
                    ? "Simpan Perubahan"
                    : "Save Changes"
                  : isIndonesian
                    ? "Simpan Aset"
                    : "Save Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        onStartEditHolding={(h: InvestmentHolding) => {
          setSelectedDetailHolding(null);
          setEditingHoldingId(h.id);
          setFormSymbol(h.symbol);
          setFormName(h.name);
          setFormType(h.asset_type);
          setFormCurrency("IDR");
          setFormUnits(String(h.units));
          setFormBuyPrice(String(h.avg_buy_price));
          setFormCurrentPrice(String(h.current_price || h.avg_buy_price));
          setFormIcon(h.icon || "TrendingUp");
          setFormAnnualRate(
            h.annual_rate ? String(Math.abs(h.annual_rate)) : "",
          );
          setFormAnnualRateSign((h.annual_rate || 0) < 0 ? "-" : "+");
          setFormPurchaseDate(
            h.purchase_date || new Date().toISOString().split("T")[0],
          );
          setAddPhase(2);
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
        onSelectIcon={(iconName) => {
          setFormIcon(iconName);
          setIsIconPickerOpen(false);
        }}
        title={isIndonesian ? "Pilih Ikon Aset" : "Choose Asset Icon"}
      />
    </div>
  );
}
