import { useState, useMemo, useEffect, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Search,
  ChevronRight,
} from "lucide-react";
import { format, subMinutes } from "date-fns";
import { BottomSheet } from "../ui/BottomSheet";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { IconRenderer } from "../ui/IconRenderer";
import { MonochromeIconPickerModal } from "../ui/MonochromeIconPickerModal";
import { autoSuggestIcon } from "../../lib/iconRegistry";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useToast } from "../../contexts/ToastContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useCategories } from "../../hooks/useCategories";
import { useAddTransaction } from "../../hooks/useTransactions";
import {
  useWallets,
  saveWalletClassification,
  resolveWalletClassification,
} from "../../hooks/useWallets";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useAuth } from "../../contexts/AuthContext";
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

interface DetailHoldingItem {
  isUsdt: boolean;
  holding?: InvestmentHolding;
  symbol: string;
  name: string;
  units: number;
  rate: number;
  costBasis: number;
  marketValue: number;
  floatingPnL: number;
  floatingPnLPct: number;
  icon: string;
  asset_type: AssetType;
}

export function AssetValuationSheet({ isOpen, onClose }: AssetValuationSheetProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { data: wallets = [], refetch: refetchWallets } = useWallets();
  const { balancesByName } = useWalletBalances();
  const { data: categories = [] } = useCategories();
  const addTx = useAddTransaction();

  // Detail Pop Card & Realization States
  const [detailHolding, setDetailHolding] = useState<DetailHoldingItem | null>(null);
  const [realizeModalOpen, setRealizeModalOpen] = useState(false);
  const [realizeType, setRealizeType] = useState<"income" | "expense">("income");
  const [realizeAmount, setRealizeAmount] = useState<string>("");
  const [realizeDate, setRealizeDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [realizeTime, setRealizeTime] = useState<string>(() => format(new Date(), "HH:mm"));
  const [realizeWalletId, setRealizeWalletId] = useState<string>("");
  const [realizeNote, setRealizeNote] = useState<string>("");
  const [isRealizing, setIsRealizing] = useState(false);
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
  const [isEditingUsdt, setIsEditingUsdt] = useState(false);
  const [editUnits, setEditUnits] = useState(String(usdtPref.units));
  const [editRate, setEditRate] = useState(String(usdtPref.rate));
  const [editCostBasis, setEditCostBasis] = useState(String(usdtPref.costBasis || recordedCryptoBalance));

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
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
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

  // Sync edit state if pref changes
  useEffect(() => {
    setEditUnits(String(usdtPref.units));
    setEditRate(String(usdtPref.rate));
    setEditCostBasis(String(usdtPref.costBasis || recordedCryptoBalance));
  }, [usdtPref, recordedCryptoBalance]);

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

  // Save USDT Edits
  const handleSaveUsdt = () => {
    const units = parseFloat(editUnits);
    const rate = parseFloat(editRate);
    const cost = parseFloat(editCostBasis);

    if (isNaN(units) || units < 0 || isNaN(rate) || rate <= 0) {
      showToast("Please enter valid numbers", "delete", () => {});
      return;
    }

    const nextPref: UsdtValuationPref = {
      units,
      rate,
      costBasis: !isNaN(cost) && cost >= 0 ? cost : recordedCryptoBalance,
    };
    setUsdtPref(nextPref);
    saveUsdtPref(nextPref, user?.id);
    setIsEditingUsdt(false);
    triggerHaptic("medium");
    showToast("USDT valuation saved", "update", () => {});
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
    setFormBuyPrice(String(h.avg_buy_price));
    setFormCurrentPrice(String(h.current_price));
    setFormIcon(h.icon || getDefaultAssetIconName(h.asset_type));
    if (typeof h.annual_rate === "number" && h.annual_rate !== 0) {
      setFormAnnualRateSign(h.annual_rate >= 0 ? "+" : "-");
      setFormAnnualRate(String(Math.abs(h.annual_rate)));
    } else {
      setFormAnnualRateSign("+");
      setFormAnnualRate("");
    }
    setFormPurchaseDate(h.purchase_date || "");
    setDetailHolding(null);
    setAddPhase(2);
  };

  const handleOpenRealizeModal = (item: DetailHoldingItem) => {
    triggerHaptic("light");
    const isProfit = item.floatingPnL >= 0;
    setRealizeType(isProfit ? "income" : "expense");
    setRealizeAmount(String(Math.abs(item.floatingPnL) || item.marketValue));
    setRealizeDate(format(new Date(), "yyyy-MM-dd"));
    setRealizeTime(format(new Date(), "HH:mm"));
    setRealizeWalletId(cryptoWallet?.id || wallets[0]?.id || "");
    setRealizeNote(`Realized ${isProfit ? "Profit" : "Loss"} ${item.symbol}`);
    setRealizeModalOpen(true);
  };

  const handleConfirmRealization = async () => {
    if (!detailHolding) return;
    const amt = parseFloat(realizeAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid amount", "delete", () => {});
      return;
    }

    setIsRealizing(true);
    try {
      const targetCategory =
        categories.find(
          (c) =>
            c.type === realizeType &&
            (c.name.toLowerCase().includes("investasi") ||
              c.name.toLowerCase().includes("trading")),
        ) ||
        categories.find((c) => c.type === realizeType) ||
        null;

      const combinedDateTime = new Date(`${realizeDate}T${realizeTime}:00`);
      const isoOccurredOn = isNaN(combinedDateTime.getTime())
        ? new Date().toISOString()
        : combinedDateTime.toISOString();

      await addTx.mutateAsync({
        amount: amt,
        type: realizeType,
        occurred_on: isoOccurredOn,
        wallet_id: realizeWalletId || null,
        category_id: targetCategory?.id || null,
        note:
          realizeNote.trim() ||
          `Realized ${realizeType === "income" ? "Profit" : "Loss"}: ${detailHolding.symbol}`,
      });

      if (detailHolding.isUsdt) {
        const newCostBasis =
          realizeType === "income"
            ? usdtCostBasis + amt
            : Math.max(0, usdtCostBasis - amt);
        const nextPref = { ...usdtPref, costBasis: newCostBasis };
        setUsdtPref(nextPref);
        saveUsdtPref(nextPref, user?.id);
      } else if (detailHolding.holding) {
        const currentTotalCost = detailHolding.costBasis;
        const newTotalCost =
          realizeType === "income"
            ? currentTotalCost + amt
            : Math.max(0, currentTotalCost - amt);
        const newAvgBuy =
          detailHolding.units > 0 ? newTotalCost / detailHolding.units : 0;
        const updatedHolding: InvestmentHolding = {
          ...detailHolding.holding,
          avg_buy_price: newAvgBuy,
        };
        const updatedList = upsertHolding(updatedHolding, user?.id);
        setHoldings(updatedList);
      }

      triggerHaptic("medium");
      showToast(
        `Recorded ${realizeType === "income" ? "profit" : "loss"} of ${formatRupiah(amt)} as ${realizeType === "income" ? "Income" : "Expense"}`,
        "add",
        () => {},
      );
      setRealizeModalOpen(false);
      setDetailHolding(null);
    } catch (err: any) {
      showToast(
        err?.message || "Failed to record realization transaction",
        "delete",
        () => {},
      );
    } finally {
      setIsRealizing(false);
    }
  };

  const handleDeleteHolding = (id: string, name: string) => {
    triggerHaptic("heavy");
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
                    Units / Shares
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formUnits}
                    onChange={(e) => setFormUnits(e.target.value)}
                    placeholder="100"
                    className="w-full px-2.5 py-1.5 rounded-xl text-[12px] font-bold outline-none"
                    style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
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

        {/* 3. Holdings List Deck */}
        <div className="space-y-2.5">
          {/* A. Core USDT Holding Row with Quick Toggle */}
          {(usdtPref.units > 0 || recordedCryptoBalance > 0) && (
            <div
              className="p-3.5 rounded-2xl space-y-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              onClick={() => {
                triggerHaptic("light");
                setDetailHolding({
                  isUsdt: true,
                  symbol: "USDT",
                  name: "Tether USD",
                  units: usdtPref.units > 0 ? usdtPref.units : suggestedUsdtUnits,
                  rate: usdtPref.rate,
                  costBasis: usdtCostBasis || recordedCryptoBalance,
                  marketValue: usdtMarketValue || recordedCryptoBalance,
                  floatingPnL: usdtFloatingPnL,
                  floatingPnLPct: usdtFloatingPnLPct,
                  icon: "Coins",
                  asset_type: "crypto",
                });
              }}
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

            {/* Quick Actions & Liquid Cash Switch */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--glass-border)]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setIsEditingUsdt(!isEditingUsdt);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold active:scale-95 cursor-pointer"
                style={{
                  background: isEditingUsdt ? "var(--text-primary)" : "var(--glass-fill)",
                  color: isEditingUsdt ? "var(--bg-base)" : "var(--text-secondary)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Edit3 size={11} />
                <span>{isEditingUsdt ? "Close Editor" : "Edit USDT"}</span>
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

            {/* Inline Quick Editor for USDT */}
            {isEditingUsdt && (
              <div
                className="p-3 rounded-xl space-y-2.5 animate-fadeIn mt-1"
                style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                      USDT Balance ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editUnits}
                      onChange={(e) => setEditUnits(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-[12px] font-bold outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                      USD Rate (IDR)
                    </label>
                    <input
                      type="number"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-[12px] font-bold outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Total Cost Basis (IDR)
                  </label>
                  <input
                    type="number"
                    value={editCostBasis}
                    onChange={(e) => setEditCostBasis(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-[12px] font-bold outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="flex justify-end gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingUsdt(false)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--text-tertiary)] active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUsdt}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold active:scale-95 cursor-pointer"
                    style={{ background: "var(--text-primary)", color: "var(--bg-base)" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            </div>
          )}

          {/* B. Generic & Fixed Assets List */}
          {holdings
            .filter((h) => h.symbol?.toUpperCase() !== "USDT")
            .map((h) => {
            const val = calculateHoldingValuation(h);
            return (
              <div
                key={h.id}
                onClick={() => {
                  triggerHaptic("light");
                  setDetailHolding({
                    isUsdt: false,
                    holding: h,
                    symbol: h.symbol,
                    name: h.name,
                    units: h.units,
                    rate: h.current_price || h.avg_buy_price,
                    costBasis: val.costBasis,
                    marketValue: val.marketValue,
                    floatingPnL: val.floatingPnL,
                    floatingPnLPct: val.floatingPnLPct,
                    icon: h.icon || getDefaultAssetIconName(h.asset_type),
                    asset_type: h.asset_type,
                  });
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

          {usdtPref.units <= 0 && holdings.length === 0 && (
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

      {/* ── Apple Luxury Detail Pop Card ─────────────────────────────────── */}
      {detailHolding && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-slideUp"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {/* Pop Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                >
                  <IconRenderer icon={detailHolding.icon} size="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[12px] font-semibold font-mono px-1.5 py-0.5 rounded"
                      style={{ background: "var(--glass-fill-strong)", color: "var(--text-primary)" }}
                    >
                      {detailHolding.symbol}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      {TYPE_LABELS[detailHolding.asset_type] || detailHolding.asset_type}
                    </span>
                  </div>
                  <p className="text-[14px] font-bold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {detailHolding.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailHolding(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Market Valuation Hero Readout */}
            <div
              className="p-4 rounded-2xl text-center space-y-1"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Current Market Valuation
              </span>
              <p className="text-[26px] font-semibold amount tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(detailHolding.marketValue)}
              </p>
              <div className="pt-1 flex justify-center">
                <span
                  className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: detailHolding.floatingPnL >= 0 ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {detailHolding.floatingPnL >= 0 ? "+" : ""}
                  {formatRupiah(detailHolding.floatingPnL)} ({detailHolding.floatingPnLPct >= 0 ? "+" : ""}
                  {detailHolding.floatingPnLPct.toFixed(1)}%) Floating P&L
                </span>
              </div>
            </div>

            {/* 2x2 Metric Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="p-3 rounded-xl space-y-0.5"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Holding Units
                </span>
                <p className="text-[13px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {detailHolding.units.toLocaleString()} {detailHolding.symbol}
                </p>
              </div>

              <div
                className="p-3 rounded-xl space-y-0.5"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Initial Investment (Cost)
                </span>
                <p className="text-[13px] font-bold font-mono amount" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(detailHolding.costBasis)}
                </p>
              </div>

              <div
                className="p-3 rounded-xl space-y-0.5"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Live Market Rate
                </span>
                <p className="text-[13px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(detailHolding.rate)}
                </p>
              </div>

              <div
                className="p-3 rounded-xl space-y-0.5"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Avg Buy / Cost Rate
                </span>
                <p className="text-[13px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {detailHolding.units > 0
                    ? formatRupiah(Math.round(detailHolding.costBasis / detailHolding.units))
                    : "-"}
                </p>
              </div>
            </div>

            {/* Annual Valuation Model & Acquisition Date Banner */}
            {detailHolding.holding && (detailHolding.holding.annual_rate !== undefined || detailHolding.holding.purchase_date) && (
              <div
                className="p-3 rounded-xl flex items-center justify-between text-[11px]"
                style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
              >
                <div>
                  <span className="font-medium block text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    Annual Valuation Model
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {typeof detailHolding.holding.annual_rate === "number"
                      ? `${detailHolding.holding.annual_rate >= 0 ? "+" : ""}${detailHolding.holding.annual_rate}% / year (${detailHolding.holding.annual_rate >= 0 ? "Appreciation" : "Depreciation"})`
                      : "Fixed Valuation"}
                  </span>
                </div>
                {detailHolding.holding.purchase_date && (
                  <div className="text-right">
                    <span className="font-medium block text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      Acquisition Date
                    </span>
                    <span className="font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                      {detailHolding.holding.purchase_date}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions: Instant Realize P&L, Quick Edit & Delete */}
            <div className="space-y-2 pt-1">
              {/* Realize Profit / Loss Instant Button */}
              <button
                type="button"
                onClick={() => handleOpenRealizeModal(detailHolding)}
                className="w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                {detailHolding.floatingPnL >= 0 ? (
                  <>
                    <ArrowUpRight size={16} strokeWidth={2.5} />
                    Realize Profit ({formatRupiah(Math.abs(detailHolding.floatingPnL))})
                  </>
                ) : (
                  <>
                    <ArrowDownRight size={16} strokeWidth={2.5} />
                    Realize Loss ({formatRupiah(Math.abs(detailHolding.floatingPnL))})
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (detailHolding.isUsdt) {
                      setIsEditingUsdt(true);
                      setDetailHolding(null);
                    } else if (detailHolding.holding) {
                      handleStartEditHolding(detailHolding.holding);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Edit3 size={13} />
                  Edit Holding
                </button>

                {detailHolding.isUsdt ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("heavy");
                      const cleared: UsdtValuationPref = { units: 0, costBasis: 0, rate: usdtPref.rate };
                      setUsdtPref(cleared);
                      saveUsdtPref(cleared, user?.id);
                      setDetailHolding(null);
                      showToast("USDT holding removed", "delete", () => {});
                    }}
                    className="py-2.5 px-3 rounded-xl text-[12px] font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer text-red-500 hover:bg-red-500/10 border border-[var(--glass-border)] bg-[var(--glass-fill)]"
                    title="Remove USDT from holdings"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : detailHolding.holding && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteHolding(detailHolding.holding!.id, detailHolding.name);
                      setDetailHolding(null);
                    }}
                    className="py-2.5 px-3 rounded-xl text-[12px] font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Instant Realize Profit / Loss Modal ──────────────────────────── */}
      {realizeModalOpen && detailHolding && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[92vh] overflow-y-auto animate-slideUp"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Realize Floating {realizeType === "income" ? "Profit" : "Loss"}
                </h3>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Record directly into Trouvaille ledger without broker sync
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRealizeModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                style={{ background: "var(--glass-fill)", color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Realize Type Switcher: Income (Profit) vs Expense (Loss) */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl border border-[var(--glass-border)]"
              style={{ background: "var(--glass-fill)" }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setRealizeType("income");
                }}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                style={{
                  background: realizeType === "income" ? "var(--bg-elevated)" : "transparent",
                  color: realizeType === "income" ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: realizeType === "income" ? "0 1px 3px var(--shadow-strength)" : "none",
                }}
              >
                <ArrowUpRight size={13} />
                Income (Profit)
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setRealizeType("expense");
                }}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                style={{
                  background: realizeType === "expense" ? "var(--bg-elevated)" : "transparent",
                  color: realizeType === "expense" ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: realizeType === "expense" ? "0 1px 3px var(--shadow-strength)" : "none",
                }}
              >
                <ArrowDownRight size={13} />
                Expense (Loss)
              </button>
            </div>

            {/* Realized Amount */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                Realized Amount (IDR)
              </label>
              <input
                type="number"
                value={realizeAmount}
                onChange={(e) => setRealizeAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl text-[16px] font-semibold font-mono outline-none amount"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Date & Time with Quick Offsets */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium block" style={{ color: "var(--text-tertiary)" }}>
                Realization Date & Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={realizeDate}
                  onChange={(e) => setRealizeDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-bold outline-none"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  type="time"
                  value={realizeTime}
                  onChange={(e) => setRealizeTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-[12px] font-bold outline-none font-mono"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Quick Time Offsets */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[
                  { label: "Just now", mins: 0 },
                  { label: "5m ago", mins: 5 },
                  { label: "15m ago", mins: 15 },
                  { label: "1h ago", mins: 60 },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      const target = pill.mins === 0 ? new Date() : subMinutes(new Date(), pill.mins);
                      setRealizeDate(format(target, "yyyy-MM-dd"));
                      setRealizeTime(format(target, "HH:mm"));
                    }}
                    className="flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold active:scale-95 transition-all text-center cursor-pointer"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Wallet Selection */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                {realizeType === "income" ? "Receive into Account" : "Deduct from Account"}
              </label>
              <select
                value={realizeWalletId}
                onChange={(e) => setRealizeWalletId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-[12px] font-bold outline-none cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                {wallets.map((w) => (
                  <option
                    key={w.id}
                    value={w.id}
                    style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                  >
                    {w.name} ({formatRupiah(balancesByName[w.name.toLowerCase()] || 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                Ledger Note
              </label>
              <input
                type="text"
                value={realizeNote}
                onChange={(e) => setRealizeNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-[12px] font-medium outline-none"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Confirm Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmRealization}
                  disabled={isRealizing}
                  className="w-full py-3 rounded-xl text-[13px] font-semibold active:scale-98 transition-transform cursor-pointer disabled:opacity-50"
                  style={{
                    background: "var(--text-primary)",
                    color: "var(--bg-base)",
                  }}
                >
                  {isRealizing ? "Recording Transaction..." : "Confirm & Record Transaction"}
                </button>
              </div>
            </div>
          </div>
        )}
    </BottomSheet>
  );
}
