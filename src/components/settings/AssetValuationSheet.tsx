import { useState, useMemo, useEffect, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Search,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { BottomSheet } from "../ui/BottomSheet";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { IconRenderer } from "../ui/IconRenderer";
import { MonochromeIconPickerModal } from "../ui/MonochromeIconPickerModal";
import { AssetDetailSheet } from "./AssetDetailSheet";
import { StakingYieldModal } from "./StakingYieldModal";
import { autoSuggestIcon } from "../../lib/iconRegistry";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  useWallets,
  saveWalletClassification,
  resolveWalletClassification,
} from "../../hooks/useWallets";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useAuth } from "../../contexts/AuthContext";
import { useAllTransactions } from "../../hooks/useTransactions";
import {
  auditUsdtReconciliation,
  applyUsdtReconciliation,
  dismissReconciliationTxIds,
} from "../../lib/holdingSyncEngine";
import {
  fetchUsdtPriceInIDR,
  fetchCryptoPriceInIDR,
  fetchStockPriceInIDR,
  getSavedHoldings,
  getSavedUsdtPref,
  saveUsdtPref,
  upsertHolding,
  deleteHolding,
  calculateHoldingValuation,
  calculatePortfolioSummary,
  calculateAssetDepreciation,
  fetchHoldingsFromSupabase,
  refreshAllPortfolioPrices,
  USD_IDR_ESTIMATE,
} from "../../lib/marketPriceService";
import type { InvestmentHolding, AssetType } from "../../lib/types";
import type { UsdtValuationPref } from "../../lib/marketPriceService";

// ─── Asset Presets ─────────────────────────────────────────────────────────────

interface AssetPreset {
  symbol: string;
  name: string;
  type: AssetType;
}

const ASSET_PRESETS: AssetPreset[] = [
  // Fixed Assets (Property & Vehicles)
  { symbol: "PROPERTY", name: "Residential House / Property", type: "fixed_asset" },
  { symbol: "APARTMENT", name: "Apartment / Condominium", type: "fixed_asset" },
  { symbol: "LAND", name: "Land Plot / Tanah", type: "fixed_asset" },
  { symbol: "VEHICLE", name: "Car / Automobile", type: "fixed_asset" },
  { symbol: "MOTORCYCLE", name: "Motorcycle", type: "fixed_asset" },
  { symbol: "WATCH", name: "Luxury Watch / Collectible", type: "fixed_asset" },

  // IDX Blue-chip Stocks
  { symbol: "BBCA.JK", name: "Bank Central Asia", type: "stock" },
  { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", type: "stock" },
  { symbol: "BMRI.JK", name: "Bank Mandiri", type: "stock" },
  { symbol: "TLKM.JK", name: "Telkom Indonesia", type: "stock" },
  { symbol: "ASII.JK", name: "Astra International", type: "stock" },
  { symbol: "ANTM.JK", name: "Aneka Tambang", type: "stock" },
  { symbol: "GOTO.JK", name: "GoTo Gojek Tokopedia", type: "stock" },
  { symbol: "MDKA.JK", name: "Merdeka Copper Gold", type: "stock" },
  { symbol: "ICBP.JK", name: "Indofood CBP Sukses", type: "stock" },
  { symbol: "ADRO.JK", name: "Adaro Energy", type: "stock" },
  { symbol: "PTBA.JK", name: "Bukit Asam", type: "stock" },
  { symbol: "UNVR.JK", name: "Unilever Indonesia", type: "stock" },

  // US Equities
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "stock" },

  // Crypto
  { symbol: "BTC", name: "Bitcoin", type: "crypto" },
  { symbol: "ETH", name: "Ethereum", type: "crypto" },
  { symbol: "USDT", name: "Tether USD", type: "crypto" },
  { symbol: "SOL", name: "Solana", type: "crypto" },
  { symbol: "BNB", name: "BNB (Binance)", type: "crypto" },
  { symbol: "XRP", name: "Ripple XRP", type: "crypto" },
  { symbol: "DOGE", name: "Dogecoin", type: "crypto" },

  // Gold & Metals
  { symbol: "ANTAM-LM", name: "Logam Mulia Antam 24K", type: "gold" },
  { symbol: "UBS-GOLD", name: "UBS Gold 24K", type: "gold" },
  { symbol: "GOLD-SPOT", name: "Spot Gold (Gram)", type: "gold" },

  // Mutual Funds & Government Bonds
  { symbol: "BIBIT-RD", name: "Mutual Fund (Bibit)", type: "mutual_fund" },
  { symbol: "AJAIB-RD", name: "Mutual Fund (Ajaib)", type: "mutual_fund" },
  { symbol: "BAREKSA-RD", name: "Mutual Fund (Bareksa)", type: "mutual_fund" },
  { symbol: "SBN-ORI", name: "Obligasi Negara Ritel (ORI)", type: "bond" },
  { symbol: "SBN-SR", name: "Sukuk Ritel (SR)", type: "bond" },
  { symbol: "SBN-FR", name: "Fixed Rate Government Bond (FR)", type: "bond" },
];

const TYPE_LABELS: Record<string, string> = {
  all: "All",
  fixed_asset: "Fixed Asset",
  stock: "Stocks",
  crypto: "Crypto",
  gold: "Gold",
  mutual_fund: "Funds",
  bond: "Bonds",
};

interface AssetValuationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssetValuationSheet({ isOpen, onClose }: AssetValuationSheetProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { data: wallets = [], refetch: refetchWallets } = useWallets();
  const { balancesByName } = useWalletBalances();
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);

  // Find crypto wallet
  const cryptoWallet = useMemo(() => {
    return (
      wallets.find(
        (w) =>
          w.name.trim().toLowerCase() === "crypto" ||
          w.name.trim().toLowerCase() === "usdt",
      ) || null
    );
  }, [wallets]);

  const { user } = useAuth();

  // Current recorded capital in app
  const recordedCryptoBalance = useMemo(() => {
    if (!cryptoWallet) return 0;
    return balancesByName[cryptoWallet.name.toLowerCase()] || 0;
  }, [cryptoWallet, balancesByName]);

  // USDT Valuation State (Scoped to current user)
  const [usdtPref, setUsdtPref] = useState<UsdtValuationPref>(() => getSavedUsdtPref(user?.id));

  // Sync state when user changes
  useEffect(() => {
    setUsdtPref(getSavedUsdtPref(user?.id));
    setHoldings(getSavedHoldings(user?.id));
    if (user?.id && user.id !== "guest_local_user") {
      fetchHoldingsFromSupabase(user.id).then((cloudHoldings) => {
        setHoldings(cloudHoldings);
        setUsdtPref(getSavedUsdtPref(user.id));
      });
    }
  }, [user?.id]);

  // Automatically refresh live USDT rate and sync cloud holdings upon sheet open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    if (user?.id && user.id !== "guest_local_user") {
      fetchHoldingsFromSupabase(user.id).then((cloudHoldings) => {
        if (isMounted) {
          setHoldings(cloudHoldings);
          setUsdtPref(getSavedUsdtPref(user.id));
        }
      });
    }
    refreshAllPortfolioPrices(user?.id).then(({ usdtRate, updatedHoldings }) => {
      if (isMounted) {
        if (usdtRate > 5000 && usdtRate < 50000) {
          setUsdtPref((prev) => ({ ...prev, rate: usdtRate }));
        }
        if (updatedHoldings && updatedHoldings.length > 0) {
          setHoldings(updatedHoldings);
        }
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  // Check if crypto wallet is classified as liquid cash
  const isCryptoLiquid = useMemo(() => {
    if (!cryptoWallet) return false;
    const currentClass = resolveWalletClassification(cryptoWallet);
    return currentClass === "liquid";
  }, [cryptoWallet]);

  // Live Rate Fetching State
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [dismissedReconciliation, setDismissedReconciliation] = useState(false);

  const { data: allTxs = [] } = useAllTransactions();

  // Audit discrepancy between transactions and USDT units
  const reconciliationAudit = useMemo(() => {
    return auditUsdtReconciliation(allTxs, wallets, user?.id);
  }, [allTxs, wallets, user?.id, usdtPref.units, usdtPref.rate]);

  // Handle applying reconciliation
  const handleApplyReconciliation = () => {
    if (!reconciliationAudit.hasDiscrepancy) return;
    triggerHaptic("medium");
    const res = applyUsdtReconciliation(reconciliationAudit, user?.id);
    setUsdtPref((prev) => ({ ...prev, units: res.updatedUnits }));
    setDismissedReconciliation(true);
    showToast(
      `USDT holding synced to ${res.updatedUnits} USDT`,
      "update",
      () => {},
    );
  };

  // Staking Yield Quick Modal State
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false);

  // Other Market Holdings & Fixed Assets
  const [holdings, setHoldings] = useState<InvestmentHolding[]>(() => getSavedHoldings(user?.id));

  // ── Add Holding: Two-Phase Flow ──────────────────────────────────────────────
  // Phase 0 = closed, Phase 1 = searchable picker, Phase 2 = confirmation form
  const [addPhase, setAddPhase] = useState<0 | 1 | 2>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<AssetType | "all">("all");
  // selectedPreset removed
  const [formSymbol, setFormSymbol] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AssetType>("stock");
  const [formUnits, setFormUnits] = useState("1");
  const [formInvestedAmount, setFormInvestedAmount] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [selectedDetailHolding, setSelectedDetailHolding] = useState<InvestmentHolding | null>(null);
  const [isFetchingCurrentPrice, setIsFetchingCurrentPrice] = useState(false);
  const [formIcon, setFormIcon] = useState("TrendingUp");
  const [hasCustomPickedAssetIcon, setHasCustomPickedAssetIcon] = useState(false);
  const [isAssetIconPickerOpen, setIsAssetIconPickerOpen] = useState(false);
  const [formAnnualRate, setFormAnnualRate] = useState<string>("");
  const [formAnnualRateSign, setFormAnnualRateSign] = useState<"+" | "-">("-");
  const [formPurchaseDate, setFormPurchaseDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live calculation of compound depreciation / appreciation
  const dynamicValuationPreview = useMemo(() => {
    const buy = parseFloat(formBuyPrice);
    const rate = parseFloat(formAnnualRate);
    if (isNaN(buy) || buy <= 0 || isNaN(rate) || !formPurchaseDate) {
      return null;
    }
    const signedRate = formAnnualRateSign === "-" ? -Math.abs(rate) : Math.abs(rate);
    return calculateAssetDepreciation(buy, signedRate, formPurchaseDate);
  }, [formBuyPrice, formAnnualRate, formAnnualRateSign, formPurchaseDate]);

  // Open asset picker (Phase 1)
  const openAssetPicker = () => {
    triggerHaptic("light");
    setSearchQuery("");
    setFilterType("all");
    
    setAddPhase(1);
    setTimeout(() => searchInputRef.current?.focus(), 150);
  };

  // Select a preset → move to Phase 2 confirmation
  const handleSelectPreset = async (preset: AssetPreset) => {
    triggerHaptic("light");
    
    setFormSymbol(preset.symbol);
    setFormName(preset.name);
    setFormType(preset.type);
    setFormUnits(preset.type === "fixed_asset" ? "1" : "");
    setFormBuyPrice("");
    setFormCurrentPrice("");
    const defaultIcon =
      preset.symbol === "VEHICLE" || preset.symbol === "MOTORCYCLE"
        ? "Car"
        : preset.symbol === "PROPERTY" ||
          preset.symbol === "APARTMENT" ||
          preset.symbol === "LAND"
        ? "Home"
        : preset.symbol === "WATCH"
        ? "Watch"
        : preset.type === "crypto"
        ? "Coins"
        : preset.type === "gold"
        ? "Landmark"
        : preset.type === "bond"
        ? "FileText"
        : "TrendingUp";
    setFormIcon(defaultIcon);
    setHasCustomPickedAssetIcon(false);
    setFormPurchaseDate(format(new Date(), "yyyy-MM-dd"));
    if (preset.type === "fixed_asset") {
      if (preset.symbol === "VEHICLE" || preset.symbol === "MOTORCYCLE") {
        setFormAnnualRateSign("-");
        setFormAnnualRate("15");
      } else if (
        preset.symbol === "PROPERTY" ||
        preset.symbol === "APARTMENT" ||
        preset.symbol === "LAND"
      ) {
        setFormAnnualRateSign("+");
        setFormAnnualRate("5");
      } else {
        setFormAnnualRateSign("-");
        setFormAnnualRate("");
      }
    } else {
      setFormAnnualRateSign("+");
      setFormAnnualRate("");
    }
    setAddPhase(2);

    if (preset.type !== "fixed_asset") {
      setIsFetchingCurrentPrice(true);
      try {
        let price: number | null = null;
        if (preset.type === "crypto") {
          price = await fetchCryptoPriceInIDR(preset.symbol);
        } else if (preset.type === "stock") {
          price = await fetchStockPriceInIDR(preset.symbol);
        }
        if (price && price > 0) {
          setFormCurrentPrice(String(price));
        }
      } catch {
        // silently fallback
      } finally {
        setIsFetchingCurrentPrice(false);
      }
    }
  };

  // Direct Custom Asset Entry (Can be Fixed Asset, Stock, Crypto, etc.)
  const handleCustomAssetEntry = (type: AssetType = "fixed_asset") => {
    triggerHaptic("light");
    
    setFormType(type);
    setFormSymbol(type === "fixed_asset" ? `FIXED-${Date.now().toString().slice(-4)}` : searchQuery.trim().toUpperCase() || "CUSTOM");
    setFormName(searchQuery.trim() || "");
    setFormUnits(type === "fixed_asset" ? "1" : "1");
    setFormBuyPrice("");
    setFormCurrentPrice("");
    setFormPurchaseDate(format(new Date(), "yyyy-MM-dd"));
    if (type === "fixed_asset") {
      setFormAnnualRateSign("-");
      setFormAnnualRate("10");
    } else {
      setFormAnnualRateSign("+");
      setFormAnnualRate("");
    }
    const defaultIcon =
      type === "fixed_asset"
        ? "Home"
        : type === "crypto"
        ? "Coins"
        : type === "gold"
        ? "Landmark"
        : "TrendingUp";
    setFormIcon(defaultIcon);
    setHasCustomPickedAssetIcon(false);
    setAddPhase(2);
  };

  // Close add flow entirely
  const closeAddFlow = () => {
    setAddPhase(0);
    setSearchQuery("");
    setFormIcon("TrendingUp");
    setHasCustomPickedAssetIcon(false);
    setEditingHoldingId(null);
    setFormAnnualRate("");
    setFormAnnualRateSign("-");
    setFormPurchaseDate(format(new Date(), "yyyy-MM-dd"));
  };

  // Filtered presets for picker list
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ASSET_PRESETS.filter((p) => {
      const matchType = filterType === "all" || p.type === filterType;
      const matchSearch =
        !q ||
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [searchQuery, filterType]);


  // Calculations for USDT
  const usdtMarketValue = Math.round(usdtPref.units * usdtPref.rate);
  const usdtCostBasis = usdtPref.units > 0 ? (usdtPref.costBasis || recordedCryptoBalance) : 0;
  const usdtFloatingPnL = usdtPref.units > 0 ? usdtMarketValue - usdtCostBasis : 0;
  const usdtFloatingPnLPct =
    usdtCostBasis > 0 ? (usdtFloatingPnL / usdtCostBasis) * 100 : 0;

  const suggestedUsdtUnits = useMemo(() => {
    return usdtPref.rate > 0 ? Math.round((recordedCryptoBalance / usdtPref.rate) * 100) / 100 : 0;
  }, [recordedCryptoBalance, usdtPref.rate]);

  // Other Holdings Summary (exclude USDT from generic holdings to prevent duplication)
  const otherHoldingsSummary = useMemo(() => {
    const nonUsdtHoldings = holdings.filter((h) => h.symbol?.toUpperCase() !== "USDT");
    return calculatePortfolioSummary(nonUsdtHoldings);
  }, [holdings]);

  // Split holdings into Liquid Portfolios vs Fixed & Tangible Assets
  const liquidHoldings = useMemo(() => {
    return holdings.filter(
      (h) => h.symbol?.toUpperCase() !== "USDT" && h.asset_type !== "fixed_asset",
    );
  }, [holdings]);

  const fixedHoldings = useMemo(() => {
    return holdings.filter(
      (h) => h.symbol?.toUpperCase() !== "USDT" && h.asset_type === "fixed_asset",
    );
  }, [holdings]);

  // Subtotal for Liquid Portfolios (includes USDT)
  const liquidSubtotal = useMemo(() => {
    const liquidSummary = calculatePortfolioSummary(liquidHoldings);
    const totalMarketValue = usdtMarketValue + liquidSummary.totalMarketValue;
    const totalCostBasis = usdtCostBasis + liquidSummary.totalCostBasis;
    const floatingPnL = totalMarketValue - totalCostBasis;
    const floatingPnLPct = totalCostBasis > 0 ? (floatingPnL / totalCostBasis) * 100 : 0;
    const count = (usdtPref.units > 0 || recordedCryptoBalance > 0 ? 1 : 0) + liquidHoldings.length;
    return {
      totalMarketValue,
      totalCostBasis,
      floatingPnL,
      floatingPnLPct,
      count,
    };
  }, [liquidHoldings, usdtMarketValue, usdtCostBasis, usdtPref.units, recordedCryptoBalance]);

  // Subtotal for Fixed Assets
  const fixedSubtotal = useMemo(() => {
    const fixedSummary = calculatePortfolioSummary(fixedHoldings);
    return {
      totalMarketValue: fixedSummary.totalMarketValue,
      totalCostBasis: fixedSummary.totalCostBasis,
      floatingPnL: fixedSummary.totalFloatingPnL,
      floatingPnLPct: fixedSummary.totalFloatingPnLPct,
      count: fixedHoldings.length,
    };
  }, [fixedHoldings]);

  // Open USDT in AssetDetailSheet
  const openUsdtDetail = () => {
    triggerHaptic("light");
    const usdtHolding: InvestmentHolding = {
      id: `usdt-${user?.id || "guest"}`,
      symbol: "USDT",
      name: "Tether USD",
      asset_type: "crypto",
      units: usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits,
      avg_buy_price: usdtPref.units > 0 ? Math.round(usdtCostBasis / usdtPref.units) : usdtPref.rate,
      current_price: usdtPref.rate,
      currency: "IDR",
      icon: "Coins",
    };
    setSelectedDetailHolding(usdtHolding);
  };

  // Total Floating Profit across all assets
  const totalCostBasis = usdtCostBasis + otherHoldingsSummary.totalCostBasis;
  const totalMarketValuation = usdtMarketValue + otherHoldingsSummary.totalMarketValue;
  const totalFloatingProfit = totalMarketValuation - totalCostBasis;
  const totalFloatingProfitPct =
    totalCostBasis > 0 ? (totalFloatingProfit / totalCostBasis) * 100 : 0;

  // Toggle USDT as Liquid Cash
  const handleToggleCryptoLiquid = () => {
    triggerHaptic("medium");
    if (!cryptoWallet) {
      showToast("Crypto account not found", "delete", () => {});
      return;
    }
    const nextClass = isCryptoLiquid ? "investment" : "liquid";
    saveWalletClassification(cryptoWallet.id, nextClass);
    saveWalletClassification(cryptoWallet.name, nextClass);
    refetchWallets();
    showToast(
      nextClass === "liquid"
        ? "Crypto included in Liquid Cash"
        : "Crypto classified as Investment Asset",
      "update",
      () => {},
    );
  };

  // Fetch Live USDT Rate
  const handleFetchLiveRate = async () => {
    triggerHaptic("light");
    setIsFetchingRate(true);
    try {
      const rate = await fetchUsdtPriceInIDR();
      if (rate && rate > 5000 && rate < 50000) {
        const nextPref = { ...usdtPref, rate };
        setUsdtPref(nextPref);
        saveUsdtPref(nextPref, user?.id);
        showToast(`Live rate updated: ${formatRupiah(rate)}/USDT`, "add", () => {});
      } else {
        showToast("Failed to fetch live rate", "delete", () => {});
      }
    } catch {
      showToast("Failed to fetch live rate", "delete", () => {});
    } finally {
      setIsFetchingRate(false);
    }
  };

  // Save New or Edited Generic Holding / Fixed Asset
  const handleSaveNewHolding = () => {
    if (!formName.trim()) {
      showToast("Asset name is required", "delete", () => {});
      return;
    }

    const units = formType === "fixed_asset" ? 1 : parseFloat(formUnits);
    const buyPrice = parseFloat(formBuyPrice);
    const currentPrice = parseFloat(formCurrentPrice) || buyPrice;

    if (isNaN(units) || units <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
      showToast("Please enter valid amounts", "delete", () => {});
      return;
    }

    const symbol = formSymbol.trim() || (formType === "fixed_asset" ? "ASSET" : formName.slice(0, 5).toUpperCase());

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
      showToast("USDT holding saved successfully", "add", () => {});
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
      `${newH.name} ${editingHoldingId ? "updated" : "added"} successfully`,
      "add",
      () => {},
    );
  };

  const handleStartEditHolding = (h: InvestmentHolding) => {
    triggerHaptic("light");
    setEditingHoldingId(h.id);
    setFormSymbol(h.symbol);
    setFormName(h.name);
    setFormType(h.asset_type);
    setFormUnits(String(h.units));
    const invested = Math.round(h.units * h.avg_buy_price);
    setFormInvestedAmount(invested > 0 ? String(invested) : "");
    setFormBuyPrice(String(h.avg_buy_price));
    setFormCurrentPrice(String(h.current_price || h.avg_buy_price));
    setFormIcon(h.icon || getDefaultAssetIconName(h.asset_type));
    if (typeof h.annual_rate === "number" && h.annual_rate !== 0) {
      setFormAnnualRateSign(h.annual_rate >= 0 ? "+" : "-");
      setFormAnnualRate(String(Math.abs(h.annual_rate)));
    } else {
      setFormAnnualRateSign("+");
      setFormAnnualRate("");
    }
    setFormPurchaseDate(h.purchase_date || "");
    setAddPhase(2);
  };

  const handleDeleteHolding = (id: string, name: string) => {
    triggerHaptic("heavy");
    if (id.startsWith("usdt-") || id === "usdt-core-holding") {
      const cleared: UsdtValuationPref = { units: 0, costBasis: 0, rate: usdtPref.rate };
      setUsdtPref(cleared);
      saveUsdtPref(cleared, user?.id);
      showToast("USDT holding removed", "delete", () => {});
      return;
    }
    const updated = deleteHolding(id, user?.id);
    setHoldings(updated);
    showToast(`${name} removed`, "delete", () => {});
  };

  // Helper for default holding icon
  const getDefaultAssetIconName = (type: AssetType): string => {
    switch (type) {
      case "fixed_asset":
        return "Home";
      case "crypto":
        return "Coins";
      case "gold":
        return "Landmark";
      case "mutual_fund":
        return "TrendingUp";
      case "bond":
        return "FileText";
      default:
        return "TrendingUp";
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-10 space-y-4 max-h-[88vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--glass-border)]">
          <div>
            <h3
              className="text-[17px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Asset Valuation
            </h3>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              Real-time portfolio &amp; unrealized P&amp;L
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center glass-surface active:scale-90 cursor-pointer"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <X size={14} style={{ color: "var(--text-primary)" }} />
          </button>
        </div>

        {/* 1. Ultra-Minimalist Portfolio Hero Header (Consolidated, No Redundancy) */}
        <div
          className="p-4 rounded-2xl space-y-2.5 relative overflow-hidden"
          style={{
            background: isDark
              ? "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
              : "linear-gradient(145deg, rgba(0,0,0,0.035) 0%, rgba(0,0,0,0.01) 100%)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider min-w-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              Total Net Valuation
            </span>
            {/* Strictly Monochrome Luxury P&L Badge */}
            <div
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {totalFloatingProfit >= 0 ? (
                <ArrowUpRight size={12} strokeWidth={2.5} />
              ) : (
                <ArrowDownRight size={12} strokeWidth={2.5} />
              )}
              <span className="font-mono">
                {totalFloatingProfit >= 0 ? "+" : ""}
                {formatRupiah(totalFloatingProfit)} ({totalFloatingProfitPct >= 0 ? "+" : ""}
                {totalFloatingProfitPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <p
            className="amount text-[28px] font-semibold tracking-tight leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {formatRupiah(totalMarketValuation)}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)] text-[11px]">
            <span style={{ color: "var(--text-tertiary)" }}>
              Cost Basis:{" "}
              <strong className="font-bold" style={{ color: "var(--text-secondary)" }}>
                {formatRupiah(totalCostBasis)}
              </strong>
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>
              Live USD:{" "}
              <strong className="font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
                {formatRupiah(usdtPref.rate)}
              </strong>
            </span>
          </div>
        </div>

        {/* Quick Link Banner if USDT wallet has balance but units are 0 */}
        {usdtPref.units <= 0 && recordedCryptoBalance > 0 && (
          <div
            className="p-3.5 rounded-2xl flex items-center justify-between gap-3 border border-amber-500/20 bg-amber-500/[0.06]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20 bg-amber-500/10 text-amber-500">
                <Coins size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                  USDT Wallet Balance Detected
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                  {formatRupiah(recordedCryptoBalance)} (~{suggestedUsdtUnits} USDT)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                const updated = {
                  units: suggestedUsdtUnits,
                  rate: usdtPref.rate,
                  costBasis: recordedCryptoBalance,
                };
                setUsdtPref(updated);
                saveUsdtPref(updated, user?.id);
                showToast(`Linked ${suggestedUsdtUnits} USDT to portfolio`, "add", () => {});
              }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer shadow-sm"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              Link Units
            </button>
          </div>
        )}

        {/* 2. Unified Asset Deck Header & Actions */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Holdings ({((usdtPref.units > 0 || recordedCryptoBalance > 0) ? 1 : 0) + holdings.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFetchLiveRate}
              disabled={isFetchingRate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 cursor-pointer"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
              }}
              title="Refresh live exchange rate"
            >
              <RefreshCw size={11} className={isFetchingRate ? "animate-spin" : ""} />
              <span>{isFetchingRate ? "Fetching..." : "Live FX"}</span>
            </button>
            {addPhase === 0 && (
              <button
                type="button"
                onClick={openAssetPicker}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                <Plus size={11} />
                <span>Add Asset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Phase 1: Searchable & Categorized Asset Picker ───────────────── */}
        {addPhase === 1 && (
          <div
            className="rounded-2xl overflow-hidden animate-fadeIn space-y-2 p-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                Select or Create Asset
              </span>
              <button
                type="button"
                onClick={closeAddFlow}
                className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 cursor-pointer"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <X size={12} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>

            {/* Search Input */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
            >
              <Search size={13} style={{ color: "var(--text-tertiary)" }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol, property, or custom name..."
                className="flex-1 bg-transparent outline-none text-[12px] font-medium"
                style={{ color: "var(--text-primary)" }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="cursor-pointer">
                  <X size={11} style={{ color: "var(--text-tertiary)" }} />
                </button>
              )}
            </div>

            {/* Quick Action Pills: Fixed Asset & Custom Entry */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("fixed_asset")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 cursor-pointer shrink-0"
                style={{
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <IconRenderer icon="Home" size="w-3 h-3" />
                <span>+ Real Estate / Vehicle</span>
              </button>
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("stock")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 cursor-pointer shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <Plus size={12} />
                <span>+ Custom Asset</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {(["all", "fixed_asset", "stock", "crypto", "gold", "mutual_fund", "bond"] as const).map((t) => {
                const isActive = filterType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFilterType(t);
                    }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0"
                    style={{
                      background: isActive ? "var(--text-primary)" : "var(--glass-fill)",
                      color: isActive ? "var(--bg-base)" : "var(--text-tertiary)",
                      border: isActive ? "1px solid transparent" : "1px solid var(--glass-border)",
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>

            {/* Preset Items List */}
            <div className="overflow-y-auto no-scrollbar space-y-1 pt-1" style={{ maxHeight: "220px" }}>
              {filteredPresets.map((preset) => (
                <button
                  key={preset.symbol}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:scale-[0.99] transition-all cursor-pointer text-left"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <IconRenderer icon={getDefaultAssetIconName(preset.type)} size="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                        {preset.name}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {preset.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{
                        background: "var(--bg-elevated)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {TYPE_LABELS[preset.type]}
                    </span>
                    <ChevronRight size={13} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </button>
              ))}

              {filteredPresets.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    No presets found for "{searchQuery}".
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCustomAssetEntry("fixed_asset")}
                    className="mt-2 px-3 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 cursor-pointer"
                    style={{ background: "var(--text-primary)", color: "var(--bg-base)" }}
                  >
                    Add as Custom Asset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phase 2: Confirmation / Custom Asset Form ───────────────────── */}
        {addPhase === 2 && (
          <div
            className="p-4 rounded-2xl space-y-3 animate-fadeIn"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {formType === "fixed_asset" ? "Add Fixed Asset" : "Add Market Holding"}
                </p>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {formType === "fixed_asset" ? "Real estate, vehicle, land, or collectibles" : "Stock, crypto, gold, or fund position"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {TYPE_LABELS[formType]}
                </span>
                <button
                  type="button"
                  onClick={closeAddFlow}
                  className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 cursor-pointer"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                >
                  <X size={11} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>
            </div>

            {/* Asset Name & Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium block" style={{ color: "var(--text-tertiary)" }}>
                Asset Icon & Name
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsAssetIconPickerOpen(true);
                  }}
                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                  title="Choose Icon"
                >
                  <IconRenderer icon={formIcon} size="w-4 h-4" />
                  <span className="text-[8px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Change
                  </span>
                </button>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(val);
                    if (!hasCustomPickedAssetIcon) {
                      const suggested = autoSuggestIcon(val);
                      if (suggested) setFormIcon(suggested);
                    }
                  }}
                  placeholder={formType === "fixed_asset" ? "e.g. Rumah BSD, Honda Civic 2023" : "e.g. Bank Central Asia"}
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-bold outline-none"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* For market securities, show Ticker and Units */}
            {formType !== "fixed_asset" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Symbol / Ticker
                    </label>
                    <input
                      type="text"
                      value={formSymbol}
                      onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                      placeholder="BBCA.JK"
                      className="w-full px-2.5 py-1.5 rounded-xl text-[12px] font-bold outline-none font-mono"
                      style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Invested Amount (IDR)
                    </label>
                    <input
                      type="number"
                      value={formInvestedAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormInvestedAmount(val);
                        const nominal = parseFloat(val);
                        const price = parseFloat(formBuyPrice) || parseFloat(formCurrentPrice);
                        if (!isNaN(nominal) && nominal > 0 && price > 0) {
                          const dec = formType === "crypto" ? 8 : formType === "gold" ? 4 : 2;
                          setFormUnits(Number((nominal / price).toFixed(dec)).toString());
                        }
                      }}
                      placeholder="e.g. 500000"
                      className="w-full px-2.5 py-1.5 rounded-xl text-[12px] font-bold outline-none font-mono"
                      style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                      Estimated Received Units / Shares
                    </label>
                    <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                      Auto-calculated
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={formUnits}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormUnits(val);
                      const units = parseFloat(val);
                      const price = parseFloat(formBuyPrice) || parseFloat(formCurrentPrice);
                      if (!isNaN(units) && units > 0 && price > 0) {
                        setFormInvestedAmount(String(Math.round(units * price)));
                      }
                    }}
                    placeholder="e.g. 0.05"
                    className="w-full px-2.5 py-1.5 rounded-xl text-[12px] font-bold outline-none font-mono"
                    style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </>
            )}

            {/* Acquisition Date & Cost */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                  Purchase / Acquired Date
                </label>
                <input
                  type="date"
                  value={formPurchaseDate}
                  onChange={(e) => setFormPurchaseDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl text-[12px] font-semibold outline-none"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                  {formType === "fixed_asset" ? "Acquisition Cost (Rp)" : "Buy Price / Unit (Rp)"}
                </label>
                <input
                  type="number"
                  value={formBuyPrice}
                  onChange={(e) => setFormBuyPrice(e.target.value)}
                  placeholder="1000000"
                  className="w-full px-2.5 py-2 rounded-xl text-[12px] font-bold outline-none"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* Annual Depreciation or Growth Rate */}
            <div className="p-3 rounded-2xl space-y-2" style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-primary)" }}>
                  Annual Depreciation / Growth Rate
                </label>
                {dynamicValuationPreview && (
                  <span className="text-[10px] font-mono font-medium text-[var(--text-tertiary)]">
                    {dynamicValuationPreview.yearsElapsed.toFixed(1)} yrs holding
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sign Selector */}
                <div
                  className="flex items-center p-0.5 rounded-xl shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFormAnnualRateSign("-");
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      formAnnualRateSign === "-"
                        ? "bg-white text-black shadow-sm"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    - Deprec.
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFormAnnualRateSign("+");
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      formAnnualRateSign === "+"
                        ? "bg-white text-black shadow-sm"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    + Growth
                  </button>
                </div>

                {/* Percentage input */}
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formAnnualRate}
                    onChange={(e) => setFormAnnualRate(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full pl-2.5 pr-7 py-1.5 rounded-xl text-[12px] font-bold outline-none font-mono"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <span
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--text-tertiary)]"
                  >
                    %/yr
                  </span>
                </div>
              </div>

              {/* Preset Rate Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {[
                  { label: "-15% Vehicle", rate: "15", sign: "-" as const },
                  { label: "-20% Tech", rate: "20", sign: "-" as const },
                  { label: "+5% House", rate: "5", sign: "+" as const },
                  { label: "+8% Land", rate: "8", sign: "+" as const },
                  { label: "0% Fixed", rate: "0", sign: "-" as const },
                ].map((p) => {
                  const isActive = formAnnualRate === p.rate && formAnnualRateSign === p.sign;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setFormAnnualRateSign(p.sign);
                        setFormAnnualRate(p.rate);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 transition-all cursor-pointer border ${
                        isActive
                          ? "bg-white text-black font-semibold border-white"
                          : "bg-white/[0.04] text-[var(--text-secondary)] border-white/[0.08] hover:bg-white/[0.08]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Compound Valuation Result */}
              {dynamicValuationPreview && (
                <div
                  className="mt-2 p-2 rounded-xl text-[11px] space-y-1 border border-white/[0.08]"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-tertiary)]">Estimated Value Today:</span>
                    <span className="font-mono font-semibold text-[var(--text-primary)]">
                      {formatRupiah(dynamicValuationPreview.currentPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--text-tertiary)]">Total Valuation Drift:</span>
                    <span className="font-mono font-medium text-[var(--text-secondary)]">
                      {dynamicValuationPreview.totalChange >= 0 ? "+" : ""}
                      {formatRupiah(dynamicValuationPreview.totalChange)} (
                      {dynamicValuationPreview.totalChangePct >= 0 ? "+" : ""}
                      {dynamicValuationPreview.totalChangePct.toFixed(1)}%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFormCurrentPrice(String(dynamicValuationPreview.currentPrice));
                    }}
                    className="w-full mt-1 py-1 rounded-lg text-[10px] font-semibold text-center cursor-pointer transition-all active:scale-98"
                    style={{
                      background: "var(--glass-fill-strong)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Apply Compound Price to Field
                  </button>
                </div>
              )}
            </div>

            {/* Current Price / Valuation Input */}
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                {formType === "fixed_asset" ? "Current Estimated Valuation (Rp)" : "Current Price per Unit (Rp)"}
                {isFetchingCurrentPrice && <RefreshCw size={9} className="inline ml-1 animate-spin" />}
              </label>
              <input
                type="number"
                value={formCurrentPrice}
                onChange={(e) => setFormCurrentPrice(e.target.value)}
                placeholder={
                  dynamicValuationPreview
                    ? String(dynamicValuationPreview.currentPrice)
                    : isFetchingCurrentPrice
                    ? "Fetching..."
                    : "1200000"
                }
                disabled={isFetchingCurrentPrice}
                className="w-full px-2.5 py-2 rounded-xl text-[12px] font-bold outline-none"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: isFetchingCurrentPrice ? "var(--text-tertiary)" : "var(--text-primary)",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeAddFlow}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold active:scale-95 cursor-pointer"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewHolding}
                className="flex-[2] py-2 rounded-xl text-[11px] font-semibold active:scale-95 cursor-pointer"
                style={{ background: "var(--text-primary)", color: "var(--bg-base)" }}
              >
                Save Holding
              </button>
            </div>
          </div>
        )}

        {/* 3. Holdings Sections Deck */}
        <div className="space-y-4">
          {/* A. Liquid Market Portfolios Section */}
          {liquidSubtotal.count > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Liquid Portfolios
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-tertiary)] border border-[var(--glass-border)]">
                    {liquidSubtotal.count}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatRupiah(liquidSubtotal.totalMarketValue)}
                  </span>
                </div>
              </div>

              {/* Core USDT Holding Row with Quick Toggle */}
              {(usdtPref.units > 0 || recordedCryptoBalance > 0) && (
                <div
                  className="p-3.5 rounded-2xl space-y-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div
                    onClick={openUsdtDetail}
                    className="flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                      >
                        <Coins size={17} style={{ color: "var(--text-primary)" }} />
                      </div>
                      <div className="min-w-0">
                        <span
                          className="font-semibold font-mono text-[12px] tracking-wide block leading-none"
                          style={{ color: "var(--text-primary)" }}
                        >
                          USDT
                        </span>
                        <p
                          className="text-[11px] font-medium truncate mt-1 leading-tight"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {usdtPref.units > 0 ? "Tether USD" : `Wallet linked · ${suggestedUsdtUnits} USDT`}
                        </p>
                      </div>
                    </div>

                    {/* Amount & Strictly Monochrome P&L */}
                    <div className="text-right shrink-0">
                      <span className="text-[14px] font-semibold amount leading-none block whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                        {usdtPref.units > 0 ? formatRupiah(usdtMarketValue) : `~${formatRupiah(recordedCryptoBalance)}`}
                      </span>
                      <span
                        className="text-[10px] font-bold mt-1 inline-block whitespace-nowrap font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {usdtPref.units > 0
                          ? `${usdtFloatingPnL >= 0 ? "+" : ""}${formatRupiah(usdtFloatingPnL)} (${usdtFloatingPnLPct >= 0 ? "+" : ""}${usdtFloatingPnLPct.toFixed(1)}%)`
                          : `Tap to calibrate (${suggestedUsdtUnits} USDT)`}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Reconciliation Alert Banner (e.g. tgl 18 P2P withdrawal to SeaBank) */}
                  {/* Auto-Reconciliation Alert Banner (Specific recent P2P transfer) */}
                  {reconciliationAudit.hasDiscrepancy && !dismissedReconciliation && (
                    <div
                      className="p-3 rounded-xl space-y-2 animate-fadeIn border"
                      style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        borderColor: "var(--glass-border)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={13} style={{ color: "var(--text-primary)" }} />
                            <span className="text-[11px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                              Recent P2P Transfer Sync
                            </span>
                          </div>
                          <p className="text-[10px] leading-tight" style={{ color: "var(--text-secondary)" }}>
                            Recent P2P withdrawal ({reconciliationAudit.unreconciledTxs[0]?.date || "Sep 18"} · {formatRupiah(reconciliationAudit.unreconciledTxs[0]?.amount || 89624)}) has not been deducted from holding units yet.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDismissedReconciliation(true);
                            const txIds = reconciliationAudit.unreconciledTxs.map((t) => t.id).filter(Boolean);
                            if (txIds.length > 0) {
                              dismissReconciliationTxIds(txIds, user?.id);
                            }
                          }}
                          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5 transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[var(--glass-border)]/40">
                        <span style={{ color: "var(--text-tertiary)" }}>
                          Current: <span style={{ color: "var(--text-primary)" }}>{reconciliationAudit.currentUnits} USDT</span>
                        </span>
                        <span style={{ color: "var(--text-primary)" }}>
                          → Reconcile: {reconciliationAudit.suggestedReconciledUnits} USDT
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyReconciliation}
                        className="w-full py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        style={{
                          background: "var(--text-primary)",
                          color: "var(--bg-elevated)",
                        }}
                      >
                        <CheckCircle2 size={12} strokeWidth={2} />
                        <span>Adjust to {reconciliationAudit.suggestedReconciledUnits} USDT</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Actions & Liquid Cash Switch */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--glass-border)]">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setIsStakingModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold active:scale-95 cursor-pointer"
                      style={{
                        background: "var(--glass-fill)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <Plus size={12} strokeWidth={2} />
                      <span>Staking Yield</span>
                    </button>

                    {/* Apple Luxury Switch for Liquid Cash */}
                    <div
                      onClick={handleToggleCryptoLiquid}
                      className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
                      title="Toggle counting USDT as liquid operating cash"
                    >
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                        {isCryptoLiquid ? "Liquid Cash: On" : "Liquid Cash: Off"}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ToggleSwitch
                          checked={isCryptoLiquid}
                          onChange={handleToggleCryptoLiquid}
                          size="sm"
                          ariaLabel="Toggle USDT as liquid operating cash"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Liquid Holdings (Crypto, Stocks, Gold, Mutual Funds, Bonds) */}
              {liquidHoldings.map((h) => {
                const val = calculateHoldingValuation(h);
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedDetailHolding(h);
                    }}
                    className="p-3.5 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform select-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                      >
                        <IconRenderer icon={h.icon || getDefaultAssetIconName(h.asset_type)} size="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-semibold font-mono text-[12px] tracking-wide block leading-none"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {h.symbol}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-[var(--text-tertiary)]">
                            {TYPE_LABELS[h.asset_type] || h.asset_type}
                          </span>
                        </div>
                        <p
                          className="text-[11px] font-medium truncate mt-1 leading-tight"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {h.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[14px] font-semibold amount leading-none block whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(val.marketValue)}
                      </span>
                      <span
                        className="text-[10px] font-bold mt-1 inline-block whitespace-nowrap font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {val.floatingPnL >= 0 ? "+" : ""}
                        {formatRupiah(val.floatingPnL)} ({val.floatingPnLPct >= 0 ? "+" : ""}
                        {val.floatingPnLPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* B. Fixed & Tangible Assets Section */}
          {fixedHoldings.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Fixed &amp; Tangible Assets
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-tertiary)] border border-[var(--glass-border)]">
                    {fixedHoldings.length}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatRupiah(fixedSubtotal.totalMarketValue)}
                  </span>
                </div>
              </div>

              {fixedHoldings.map((h) => {
                const val = calculateHoldingValuation(h);
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedDetailHolding(h);
                    }}
                    className="p-3.5 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform select-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                      >
                        <IconRenderer icon={h.icon || getDefaultAssetIconName(h.asset_type)} size="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-semibold font-mono text-[12px] tracking-wide block leading-none"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {h.symbol}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-[var(--text-tertiary)]">
                            {TYPE_LABELS[h.asset_type] || h.asset_type}
                          </span>
                        </div>
                        <p
                          className="text-[11px] font-medium truncate mt-1 leading-tight"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {h.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[14px] font-semibold amount leading-none block whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(val.marketValue)}
                      </span>
                      <span
                        className="text-[10px] font-bold mt-1 inline-block whitespace-nowrap font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {val.floatingPnL >= 0 ? "+" : ""}
                        {formatRupiah(val.floatingPnL)} ({val.floatingPnLPct >= 0 ? "+" : ""}
                        {val.floatingPnLPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {liquidSubtotal.count === 0 && fixedHoldings.length === 0 && (
            <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-[var(--glass-border)] bg-black/[0.01] dark:bg-white/[0.01] space-y-2">
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.05] border border-[var(--glass-border)] text-[var(--text-tertiary)]">
                <Coins size={18} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                No Asset Holdings Tracked
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-[240px] mx-auto leading-relaxed">
                Your portfolio is currently empty. Tap &ldquo;+ Add Asset&rdquo; above to track USDT, stocks, funds, gold, or property.
              </p>
            </div>
          )}
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="w-full py-3 rounded-xl text-[13px] font-semibold active:scale-98 transition-transform cursor-pointer mt-1"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-base)",
          }}
        >
          Done
        </button>
      </div>

      {/* Universal Monochrome Icon Picker Modal for Assets */}
      <MonochromeIconPickerModal
        isOpen={isAssetIconPickerOpen}
        onClose={() => setIsAssetIconPickerOpen(false)}
        selectedIcon={formIcon}
        onSelectIcon={(iconName) => {
          setFormIcon(iconName);
          setHasCustomPickedAssetIcon(true);
        }}
        title="Choose Asset Icon"
      />

      {/* ── Trouvaille Investment Ecosystem: Modern Asset Detail Sheet ──── */}
      <AssetDetailSheet
        isOpen={!!selectedDetailHolding}
        onClose={() => setSelectedDetailHolding(null)}
        holding={selectedDetailHolding}
        onHoldingUpdated={() => {
          const freshHoldings = getSavedHoldings(user?.id);
          setHoldings(freshHoldings);
          const freshUsdt = getSavedUsdtPref(user?.id);
          setUsdtPref(freshUsdt);
          if (user?.id && user.id !== "guest_local_user") {
            fetchHoldingsFromSupabase(user.id).then(setHoldings);
          }
          if (selectedDetailHolding) {
            if (selectedDetailHolding.symbol?.toUpperCase() === "USDT") {
              setSelectedDetailHolding({
                ...selectedDetailHolding,
                units: freshUsdt.units,
                avg_buy_price:
                  freshUsdt.units > 0
                    ? Math.round(freshUsdt.costBasis / freshUsdt.units)
                    : freshUsdt.rate,
                current_price: freshUsdt.rate,
              });
            } else {
              const refreshed = freshHoldings.find((x) => x.id === selectedDetailHolding.id);
              if (refreshed) setSelectedDetailHolding(refreshed);
            }
          }
        }}
        onDeleteHolding={(id, name) => {
          handleDeleteHolding(id, name);
          setSelectedDetailHolding(null);
        }}
        onStartEditHolding={(h) => {
          setSelectedDetailHolding(null);
          handleStartEditHolding(h);
        }}
      />

      {/* Rich Staking Yield Logger Modal */}
      <StakingYieldModal
        isOpen={isStakingModalOpen}
        onClose={() => setIsStakingModalOpen(false)}
        holdingSymbol="USDT"
        holdingUnits={usdtPref.units}
        liveRate={usdtPref.rate || USD_IDR_ESTIMATE}
        wallets={wallets}
        defaultWalletId={cryptoWallet?.id}
        userId={user?.id}
        onSuccess={() => {
          const freshUsdt = getSavedUsdtPref(user?.id);
          setUsdtPref(freshUsdt);
        }}
      />
    </BottomSheet>
  );
}
