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
import { BottomSheet } from "../ui/BottomSheet";
import { IconRenderer } from "../ui/IconRenderer";
import { MonochromeIconPickerModal } from "../ui/MonochromeIconPickerModal";
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
import {
  fetchUsdtPriceInIDR,
  fetchCryptoPriceInIDR,
  fetchStockPriceInIDR,
  getSavedHoldings,
  upsertHolding,
  deleteHolding,
  calculateHoldingValuation,
  calculatePortfolioSummary,
} from "../../lib/marketPriceService";
import type { InvestmentHolding, AssetType } from "../../lib/types";

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

const USDT_PREFS_STORAGE_KEY = "trouvaille_usdt_valuation_v2";

interface UsdtValuationPref {
  units: number;
  rate: number;
  costBasis: number;
}

export function AssetValuationSheet({ isOpen, onClose }: AssetValuationSheetProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { data: wallets = [], refetch: refetchWallets } = useWallets();
  const { balancesByName } = useWalletBalances();

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

  // Current recorded capital in app
  const recordedCryptoBalance = useMemo(() => {
    if (!cryptoWallet) return 14860559;
    return balancesByName[cryptoWallet.name.toLowerCase()] || 14860559;
  }, [cryptoWallet, balancesByName]);

  // USDT Valuation State (Safely migrates past any old stale 15980 rates)
  const [usdtPref, setUsdtPref] = useState<UsdtValuationPref>(() => {
    try {
      const savedV2 = localStorage.getItem(USDT_PREFS_STORAGE_KEY);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (parsed.rate && parsed.rate >= 17000) return parsed;
      }
      const savedV1 = localStorage.getItem("trouvaille_usdt_valuation_v1");
      if (savedV1) {
        const parsed = JSON.parse(savedV1);
        return {
          units: Number(parsed.units) || 1057,
          rate: parsed.rate >= 17000 ? parsed.rate : 17725,
          costBasis: Number(parsed.costBasis) || 14860559,
        };
      }
    } catch {}
    return {
      units: 1057,
      rate: 17725,
      costBasis: 14860559,
    };
  });

  // Automatically refresh live USDT rate upon sheet open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetchUsdtPriceInIDR().then((liveRate) => {
      if (isMounted && liveRate && liveRate >= 17000) {
        setUsdtPref((prev) => {
          const updated = { ...prev, rate: liveRate };
          localStorage.setItem(USDT_PREFS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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
  const [holdings, setHoldings] = useState<InvestmentHolding[]>(() => getSavedHoldings());

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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const usdtCostBasis = usdtPref.costBasis || recordedCryptoBalance;
  const usdtFloatingPnL = usdtMarketValue - usdtCostBasis;
  const usdtFloatingPnLPct =
    usdtCostBasis > 0 ? (usdtFloatingPnL / usdtCostBasis) * 100 : 0;

  // Other Holdings Summary
  const otherHoldingsSummary = useMemo(() => {
    return calculatePortfolioSummary(holdings);
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
      if (rate && rate >= 17000) {
        const nextPref = { ...usdtPref, rate };
        setUsdtPref(nextPref);
        localStorage.setItem(USDT_PREFS_STORAGE_KEY, JSON.stringify(nextPref));
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
      costBasis: !isNaN(cost) && cost > 0 ? cost : recordedCryptoBalance,
    };
    setUsdtPref(nextPref);
    localStorage.setItem(USDT_PREFS_STORAGE_KEY, JSON.stringify(nextPref));
    setIsEditingUsdt(false);
    triggerHaptic("medium");
    showToast("USDT valuation saved", "update", () => {});
  };

  // Save New Generic Holding / Fixed Asset
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

    const newH: InvestmentHolding = {
      id: `h_${Date.now()}`,
      symbol: symbol.toUpperCase(),
      name: formName.trim(),
      asset_type: formType,
      units,
      avg_buy_price: buyPrice,
      current_price: currentPrice,
      last_price_updated_at: new Date().toISOString(),
      icon: formIcon,
    };

    const updated = upsertHolding(newH);
    setHoldings(updated);
    closeAddFlow();
    triggerHaptic("medium");
    showToast(`${newH.name} added successfully`, "add", () => {});
  };

  const handleDeleteHolding = (id: string, name: string) => {
    triggerHaptic("heavy");
    const updated = deleteHolding(id);
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
              className="text-[17px] font-extrabold tracking-tight"
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
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 whitespace-nowrap"
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
            className="amount text-[28px] font-extrabold tracking-tight leading-none"
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

        {/* 2. Unified Asset Deck Header & Actions */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Holdings ({holdings.length + 1})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFetchLiveRate}
              disabled={isFetchingRate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold active:scale-95 cursor-pointer"
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold active:scale-95 cursor-pointer"
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
              <span className="text-[12.5px] font-bold" style={{ color: "var(--text-primary)" }}>
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
                className="flex-1 bg-transparent outline-none text-[12.5px] font-medium"
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
                  <p className="text-[11.5px] font-medium" style={{ color: "var(--text-tertiary)" }}>
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
                <p className="text-[13px] font-extrabold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {formType === "fixed_asset" ? "Add Fixed Asset" : "Add Market Holding"}
                </p>
                <p className="text-[10.5px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {formType === "fixed_asset" ? "Real estate, vehicle, land, or collectibles" : "Stock, crypto, gold, or fund position"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase"
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
                  <span className="text-[7.5px] font-bold mt-0.5" style={{ color: "var(--text-tertiary)" }}>
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
                  className="w-full px-3 py-2 rounded-xl text-[12.5px] font-bold outline-none"
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

            {/* Valuation Inputs: Purchase Cost vs Current Valuation */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                  {formType === "fixed_asset" ? "Acquisition Cost (Rp)" : "Buy Price per Unit (Rp)"}
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
              <div>
                <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-tertiary)" }}>
                  {formType === "fixed_asset" ? "Estimated Value (Rp)" : "Current Price per Unit (Rp)"}
                  {isFetchingCurrentPrice && <RefreshCw size={9} className="inline ml-1 animate-spin" />}
                </label>
                <input
                  type="number"
                  value={formCurrentPrice}
                  onChange={(e) => setFormCurrentPrice(e.target.value)}
                  placeholder={isFetchingCurrentPrice ? "Fetching..." : "1200000"}
                  disabled={isFetchingCurrentPrice}
                  className="w-full px-2.5 py-2 rounded-xl text-[12px] font-bold outline-none"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                    color: isFetchingCurrentPrice ? "var(--text-tertiary)" : "var(--text-primary)",
                  }}
                />
              </div>
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
                className="flex-[2] py-2 rounded-xl text-[11.5px] font-extrabold active:scale-95 cursor-pointer"
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
          <div
            className="p-3.5 rounded-2xl space-y-3"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                >
                  <Coins size={17} style={{ color: "var(--text-primary)" }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10.5px] font-bold uppercase shrink-0 font-mono"
                      style={{
                        background: "var(--glass-fill-strong)",
                        color: "var(--text-primary)",
                      }}
                    >
                      USDT
                    </span>
                    <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                      Tether USD
                    </span>
                  </div>
                  <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                    {usdtPref.units.toLocaleString()} units · Cost: {formatRupiah(usdtCostBasis)}
                  </p>
                </div>
              </div>

              {/* Amount & Strictly Monochrome P&L */}
              <div className="text-right shrink-0">
                <span className="text-[14.5px] font-extrabold amount leading-none block whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(usdtMarketValue)}
                </span>
                <span
                  className="text-[10px] font-bold mt-1 inline-block whitespace-nowrap font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {usdtFloatingPnL >= 0 ? "+" : ""}
                  {formatRupiah(usdtFloatingPnL)} ({usdtFloatingPnLPct >= 0 ? "+" : ""}
                  {usdtFloatingPnLPct.toFixed(1)}%)
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold active:scale-95 cursor-pointer"
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
                <div
                  className="w-8 h-4.5 rounded-full transition-colors duration-200 flex items-center p-0.5 shrink-0"
                  style={{
                    background: isCryptoLiquid ? "var(--text-primary)" : isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full shadow transition-transform duration-200 ${
                      isCryptoLiquid ? "translate-x-3.5" : "translate-x-0"
                    }`}
                    style={{
                      background: isCryptoLiquid ? "var(--bg-base)" : isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.4)",
                    }}
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
                    <label className="text-[9.5px] font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
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
                    <label className="text-[9.5px] font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
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
                  <label className="text-[9.5px] font-medium block mb-0.5" style={{ color: "var(--text-tertiary)" }}>
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
                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-[var(--text-tertiary)] active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUsdt}
                    className="px-3 py-1 rounded-lg text-[10.5px] font-bold active:scale-95 cursor-pointer"
                    style={{ background: "var(--text-primary)", color: "var(--bg-base)" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. Generic & Fixed Assets List */}
          {holdings.map((h) => {
            const val = calculateHoldingValuation(h);
            return (
              <div
                key={h.id}
                className="p-3.5 rounded-2xl flex items-center justify-between gap-2.5"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--glass-fill)", border: "1px solid var(--glass-border)" }}
                  >
                    <IconRenderer icon={h.icon || getDefaultAssetIconName(h.asset_type)} size="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10.5px] font-bold uppercase shrink-0 font-mono"
                        style={{
                          background: "var(--glass-fill-strong)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {h.symbol}
                      </span>
                      <span className="text-[13px] font-bold truncate max-w-[130px]" style={{ color: "var(--text-primary)" }}>
                        {h.name}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                      {h.asset_type === "fixed_asset"
                        ? `Cost: ${formatRupiah(val.costBasis)}`
                        : `${h.units} units · Buy: ${formatRupiah(h.avg_buy_price)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Amount & Strictly Monochrome P&L */}
                  <div className="text-right">
                    <span className="text-[13.5px] font-extrabold amount leading-none block whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(val.marketValue)}
                    </span>
                    <span
                      className="text-[9.5px] font-bold mt-1 inline-block whitespace-nowrap font-mono"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {val.floatingPnL >= 0 ? "+" : ""}
                      {formatRupiah(val.floatingPnL)} ({val.floatingPnLPct >= 0 ? "+" : ""}
                      {val.floatingPnLPct.toFixed(1)}%)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteHolding(h.id, h.name)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                    title="Delete Asset"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="w-full py-3 rounded-xl text-[13px] font-extrabold active:scale-98 transition-transform cursor-pointer mt-1"
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
    </BottomSheet>
  );
}
