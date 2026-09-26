import { useState, useMemo, useEffect, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Search,
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
import { useLanguage } from "../../contexts/LanguageContext";
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
  getStandardUsdtHoldingId,
  saveUsdtPref,
  upsertHolding,
  deleteHolding,
  calculateHoldingValuation,
  calculatePortfolioSummary,
  fetchHoldingsFromSupabase,
  refreshAllPortfolioPrices,
  USD_IDR_ESTIMATE,
} from "../../lib/marketPriceService";
import type { InvestmentHolding, AssetType } from "../../lib/types";
import type { UsdtValuationPref } from "../../lib/marketPriceService";
import {
  PRESET_ASSETS,
  type PresetAsset,
  type PresetCategory,
} from "../../lib/assetPresets";

const getTypeLabel = (type: string, isIndonesian: boolean): string => {
  const labels: Record<string, { en: string; id: string }> = {
    all: { en: "All", id: "Semua" },
    fixed_asset: { en: "Fixed Asset", id: "Aset Tetap" },
    stock: { en: "Stocks", id: "Saham" },
    crypto: { en: "Crypto", id: "Kripto" },
    gold: { en: "Gold", id: "Emas" },
    mutual_fund: { en: "Funds", id: "Reksadana" },
    bond: { en: "Bonds", id: "Obligasi" },
  };
  const item = labels[type];
  if (!item) return type.replace("_", " ");
  return isIndonesian ? item.id : item.en;
};

interface AssetValuationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssetValuationSheet({ isOpen, onClose }: AssetValuationSheetProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
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
  const [holdings, setHoldings] = useState<InvestmentHolding[]>(() => getSavedHoldings(user?.id));

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
  }, [allTxs, wallets, user?.id]);

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

  // ── Add Holding: Two-Phase Flow ──────────────────────────────────────────────
  // Phase 0 = closed, Phase 1 = searchable picker, Phase 2 = confirmation form
  const [addPhase, setAddPhase] = useState<0 | 1 | 2>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [presetCategory, setPresetCategory] = useState<PresetCategory>("all");
  const [formSymbol, setFormSymbol] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AssetType>("stock");
  const [formCurrency, setFormCurrency] = useState<"IDR" | "USD">("IDR");
  const [formPlatform, setFormPlatform] = useState<string>("");
  const [formUnits, setFormUnits] = useState("1");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [selectedDetailHolding, setSelectedDetailHolding] = useState<InvestmentHolding | null>(null);
  const [isFetchingCurrentPrice, setIsFetchingCurrentPrice] = useState(false);
  const [formIcon, setFormIcon] = useState("TrendingUp");
  const [hasCustomPickedAssetIcon, setHasCustomPickedAssetIcon] = useState(false);
  const [isAssetIconPickerOpen, setIsAssetIconPickerOpen] = useState(false);
  const [formPurchaseDate, setFormPurchaseDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (addPhase === 1) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [addPhase]);

  // Open asset picker (Phase 1)
  const openAssetPicker = () => {
    triggerHaptic("light");
    setSearchQuery("");
    setPresetCategory("all");
    setAddPhase(1);
  };

  // Select a preset → move to Phase 2 confirmation
  const handleSelectPreset = async (preset: PresetAsset) => {
    triggerHaptic("medium");
    setFormSymbol(preset.symbol);
    setFormName(preset.name);
    setFormType(preset.type);
    setFormIcon(preset.icon || "TrendingUp");
    setFormCurrency(preset.suggestedCurrency || "IDR");
    setFormPlatform("");
    setFormUnits(preset.type === "fixed_asset" ? "1" : "");
    setFormBuyPrice("");
    setFormCurrentPrice("");
    setFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setAddPhase(2);

    if (preset.type !== "fixed_asset") {
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
        // silently fallback
      } finally {
        setIsFetchingCurrentPrice(false);
      }
    }
  };

  // Direct Custom Asset Entry (Can be Fixed Asset, Stock, Crypto, etc.)
  const handleCustomAssetEntry = (type: AssetType = "fixed_asset") => {
    triggerHaptic("medium");
    setFormType(type);
    setFormSymbol(type === "fixed_asset" ? `FIXED-${Date.now().toString().slice(-4)}` : searchQuery.trim().toUpperCase() || "CUSTOM");
    setFormName(searchQuery.trim() || "");
    setFormCurrency("IDR");
    setFormPlatform("");
    setFormIcon(type === "fixed_asset" ? "Home" : "TrendingUp");
    setFormUnits(type === "fixed_asset" ? "1" : "");
    setFormBuyPrice("");
    setFormCurrentPrice("");
    setFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setAddPhase(2);
  };

  // Close add flow entirely
  const closeAddFlow = () => {
    setAddPhase(0);
    setSearchQuery("");
    setFormIcon("TrendingUp");
    setHasCustomPickedAssetIcon(false);
    setEditingHoldingId(null);
    setFormPlatform("");
    setFormCurrency("IDR");
    setFormPurchaseDate(format(new Date(), "yyyy-MM-dd"));
  };

  // Filtered presets for picker list
  const filteredPresets = useMemo(() => {
    return PRESET_ASSETS.filter((preset) => {
      const matchCategory =
        presetCategory === "all" || preset.category === presetCategory;
      const matchQuery =
        !searchQuery ||
        preset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [searchQuery, presetCategory]);


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
      activities: existingUsdt?.activities && existingUsdt.activities.length > 0 ? existingUsdt.activities : undefined,
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
      showToast(
        isIndonesian ? "Masukkan nama aset" : "Asset name is required",
        "delete",
        () => {},
      );
      return;
    }

    const units = formType === "fixed_asset" ? 1 : parseFloat(formUnits);
    const rawBuy = parseFloat(formBuyPrice);
    const rawCurrent = parseFloat(formCurrentPrice) || rawBuy;

    if (isNaN(units) || units <= 0 || isNaN(rawBuy) || rawBuy <= 0) {
      showToast(
        isIndonesian ? "Masukkan nominal yang valid" : "Please enter valid amounts",
        "delete",
        () => {},
      );
      return;
    }

    const liveRate = usdtPref.rate > 0 ? usdtPref.rate : 16000;
    const buyPrice = formCurrency === "USD" ? rawBuy * liveRate : rawBuy;
    const currentPrice =
      formCurrency === "USD" ? rawCurrent * liveRate : rawCurrent;

    const symbol =
      formSymbol.trim() ||
      (formType === "fixed_asset"
        ? "ASSET"
        : formName.slice(0, 5).toUpperCase());

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
      last_price_updated_at: new Date().toISOString(),
      icon: formIcon,
      purchase_date: formPurchaseDate || undefined,
      notes: formPlatform ? `Platform: ${formPlatform}` : undefined,
    };

    const updated = upsertHolding(newH, user?.id);
    setHoldings(updated);
    closeAddFlow();
    triggerHaptic("medium");
    showToast(
      isIndonesian ? "Aset berhasil disimpan" : "Asset saved successfully",
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
    const isUsd = h.currency === "USD";
    const liveRate = usdtPref.rate > 0 ? usdtPref.rate : 16000;
    setFormCurrency(isUsd ? "USD" : "IDR");
    setFormBuyPrice(isUsd ? String(parseFloat((h.avg_buy_price / liveRate).toFixed(2))) : String(h.avg_buy_price));
    setFormCurrentPrice(isUsd ? String(parseFloat(((h.current_price || h.avg_buy_price) / liveRate).toFixed(2))) : String(h.current_price || h.avg_buy_price));
    setFormIcon(h.icon || getDefaultAssetIconName(h.asset_type));
    setFormPlatform(h.notes?.startsWith("Platform: ") ? h.notes.replace("Platform: ", "") : "");
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
      <div className="p-5 pb-10 space-y-4">
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
                showToast(
                  isIndonesian
                    ? `Berhasil menghubungkan ${suggestedUsdtUnits} USDT ke portofolio`
                    : `Linked ${suggestedUsdtUnits} USDT to portfolio`,
                  "add",
                  () => {},
                );
              }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer shadow-sm"
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              {isIndonesian ? "Hubungkan Unit" : "Link Units"}
            </button>
          </div>
        )}

        {/* 2. Unified Asset Deck Header & Actions */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Kepemilikan" : "Holdings"} ({((usdtPref.units > 0 || recordedCryptoBalance > 0) ? 1 : 0) + holdings.length})
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
              title={isIndonesian ? "Perbarui kurs langsung" : "Refresh live exchange rate"}
            >
              <RefreshCw size={11} className={isFetchingRate ? "animate-spin" : ""} />
              <span>{isFetchingRate ? (isIndonesian ? "Memuat..." : "Fetching...") : (isIndonesian ? "Kurs Langsung" : "Live FX")}</span>
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
                <span>{isIndonesian ? "Tambah Aset" : "Add Asset"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Holdings Sections Deck */}
        <div className="space-y-4">
          {/* A. Liquid Market Portfolios Section */}
          {liquidSubtotal.count > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    {isIndonesian ? "Portofolio Likuid" : "Liquid Portfolios"}
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
                          {usdtPref.units > 0 ? "Tether USD" : (isIndonesian ? `Dompet terhubung · ${suggestedUsdtUnits} USDT` : `Wallet linked · ${suggestedUsdtUnits} USDT`)}
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
                          : (isIndonesian ? `Ketuk untuk kalibrasi (${suggestedUsdtUnits} USDT)` : `Tap to calibrate (${suggestedUsdtUnits} USDT)`)}
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
                              {isIndonesian ? "Sinkronisasi Transfer P2P Terbaru" : "Recent P2P Transfer Sync"}
                            </span>
                          </div>
                          <p className="text-[10px] leading-tight" style={{ color: "var(--text-secondary)" }}>
                            {isIndonesian
                              ? `Penarikan P2P terbaru (${reconciliationAudit.unreconciledTxs[0]?.date || "18 Sep"} · ${formatRupiah(reconciliationAudit.unreconciledTxs[0]?.amount || 89624)}) belum dikurangkan dari unit kepemilikan.`
                              : `Recent P2P withdrawal (${reconciliationAudit.unreconciledTxs[0]?.date || "Sep 18"} · ${formatRupiah(reconciliationAudit.unreconciledTxs[0]?.amount || 89624)}) has not been deducted from holding units yet.`}
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
                          title={isIndonesian ? "Tutup" : "Dismiss"}
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[var(--glass-border)]/40">
                        <span style={{ color: "var(--text-tertiary)" }}>
                          {isIndonesian ? "Saat Ini:" : "Current:"} <span style={{ color: "var(--text-primary)" }}>{reconciliationAudit.currentUnits} USDT</span>
                        </span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {isIndonesian ? "→ Rekonsiliasi:" : "→ Reconcile:"} {reconciliationAudit.suggestedReconciledUnits} USDT
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
                        <span>{isIndonesian ? `Sesuaikan ke ${reconciliationAudit.suggestedReconciledUnits} USDT` : `Adjust to ${reconciliationAudit.suggestedReconciledUnits} USDT`}</span>
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
                      <span>{isIndonesian ? "Imbal Hasil Staking" : "Staking Yield"}</span>
                    </button>

                    {/* Apple Luxury Switch for Liquid Cash */}
                    <div
                      onClick={handleToggleCryptoLiquid}
                      className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
                      title={isIndonesian ? "Alihkan USDT sebagai kas likuid operasional" : "Toggle counting USDT as liquid operating cash"}
                    >
                      <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                        {isIndonesian
                          ? (isCryptoLiquid ? "Kas Likuid: Aktif" : "Kas Likuid: Nonaktif")
                          : (isCryptoLiquid ? "Liquid Cash: On" : "Liquid Cash: Off")}
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
                            {getTypeLabel(h.asset_type, isIndonesian)}
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
                    {isIndonesian ? "Aset Tetap & Berwujud" : "Fixed & Tangible Assets"}
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
                            {getTypeLabel(h.asset_type, isIndonesian)}
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
                {isIndonesian ? "Belum Ada Aset yang Dilacak" : "No Asset Holdings Tracked"}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-[240px] mx-auto leading-relaxed">
                {isIndonesian
                  ? "Portofolio Anda saat ini kosong. Ketuk \"+ Tambah Aset\" di atas untuk melacak USDT, saham, reksadana, emas, atau properti."
                  : "Your portfolio is currently empty. Tap \"+ Add Asset\" above to track USDT, stocks, funds, gold, or property."}
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
          {isIndonesian ? "Selesai" : "Done"}
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
        title={isIndonesian ? "Pilih Ikon Aset" : "Choose Asset Icon"}
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
              const freshMatchingUsdt = freshHoldings.find(
                (h) => h.symbol?.toUpperCase() === "USDT" || h.id.startsWith("usdt-"),
              );
              setSelectedDetailHolding({
                ...selectedDetailHolding,
                units: freshUsdt.units,
                avg_buy_price:
                  freshUsdt.units > 0
                    ? Math.round(freshUsdt.costBasis / freshUsdt.units)
                    : freshUsdt.rate,
                current_price: freshUsdt.rate,
                activities: freshMatchingUsdt?.activities || selectedDetailHolding.activities,
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
      {/* ── Preset Picker Sheet (Standard BottomSheet) ─────────────────── */}
      <BottomSheet
        isOpen={addPhase === 1}
        onClose={closeAddFlow}
        title={
          isIndonesian ? "Pilih Aset Investasi" : "Select Investment Asset"
        }
      >
        <div className="p-5 space-y-4 select-none">
          {/* Search Bar */}
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-[var(--glass-border)]"
            style={{ background: "var(--glass-fill)" }}
          >
            <Search
              size={15}
              className="text-[var(--text-tertiary)] shrink-0"
            />
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
                {
                  key: "stock_us",
                  label: isIndonesian ? "Saham AS" : "US Stocks",
                },
                {
                  key: "stock_id",
                  label: isIndonesian ? "Saham IDX" : "IDX Stocks",
                },
                { key: "gold", label: isIndonesian ? "Emas" : "Gold" },
                {
                  key: "mutual_fund",
                  label: isIndonesian ? "Reksa Dana" : "Mutual Funds",
                },
                {
                  key: "fixed_asset",
                  label: isIndonesian ? "Aset Fisik" : "Fixed Assets",
                },
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
                  style={
                    isActive
                      ? {
                          background: isDark
                            ? "rgba(255, 255, 255, 0.10)"
                            : "rgba(0, 0, 0, 0.08)",
                          borderColor: isDark
                            ? "rgba(255, 255, 255, 0.18)"
                            : "rgba(0, 0, 0, 0.14)",
                          boxShadow: isDark
                            ? "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.25)"
                            : "0 1px 2px rgba(0, 0, 0, 0.05)",
                          color: "var(--text-primary)",
                        }
                      : {
                          background: "var(--glass-fill)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-tertiary)",
                          opacity: 0.7,
                        }
                  }
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border hover:opacity-100 hover:text-[var(--text-primary)]"
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Presets List */}
          <div className="space-y-1.5 pb-6">
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
                      <span className="font-semibold text-[13px] text-[var(--text-primary)]">
                        {preset.symbol}
                      </span>
                      {preset.suggestedCurrency && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-white/[0.08] text-[var(--text-secondary)]">
                          {preset.suggestedCurrency}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate block mt-0.5">
                      {preset.name}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-lg bg-white/[0.06] text-[var(--text-tertiary)]">
                  {getTypeLabel(preset.type, isIndonesian)}
                </span>
              </button>
            ))}

            {filteredPresets.length === 0 && (
              <p className="text-center text-[12px] text-[var(--text-tertiary)] py-6">
                {isIndonesian
                  ? "Tidak ada preset yang cocok"
                  : "No presets matched your search"}
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

      {/* ── Asset Details Form Sheet (Standard BottomSheet) ───────────── */}
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
                style={
                  formCurrency === "IDR"
                    ? {
                        background: isDark
                          ? "rgba(255, 255, 255, 0.12)"
                          : "rgba(0, 0, 0, 0.08)",
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.20)"
                          : "rgba(0, 0, 0, 0.14)",
                        boxShadow: isDark
                          ? "inset 0 1px 0 rgba(255, 255, 255, 0.10)"
                          : "0 1px 2px rgba(0,0,0,0.05)",
                        color: "var(--text-primary)",
                      }
                    : {
                        color: "var(--text-tertiary)",
                      }
                }
                className="flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer hover:text-[var(--text-primary)]"
              >
                IDR (Rp)
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setFormCurrency("USD");
                }}
                style={
                  formCurrency === "USD"
                    ? {
                        background: isDark
                          ? "rgba(255, 255, 255, 0.12)"
                          : "rgba(0, 0, 0, 0.08)",
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.20)"
                          : "rgba(0, 0, 0, 0.14)",
                        boxShadow: isDark
                          ? "inset 0 1px 0 rgba(255, 255, 255, 0.10)"
                          : "0 1px 2px rgba(0,0,0,0.05)",
                        color: "var(--text-primary)",
                      }
                    : {
                        color: "var(--text-tertiary)",
                      }
                }
                className="flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer hover:text-[var(--text-primary)]"
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
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                {isIndonesian ? "Nama Aset" : "Asset Name"}
              </label>
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
              {[
                "Binance",
                "Indodax",
                "Ajaib",
                "Stockbit",
                "Bibit",
                "Bank",
                "Fisik/Brankas",
              ].map((plat) => {
                const isSelected = formPlatform === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setFormPlatform(isSelected ? "" : plat);
                    }}
                    style={
                      isSelected
                        ? {
                            background: isDark
                              ? "rgba(255, 255, 255, 0.10)"
                              : "rgba(0, 0, 0, 0.08)",
                            borderColor: isDark
                              ? "rgba(255, 255, 255, 0.18)"
                              : "rgba(0, 0, 0, 0.14)",
                            boxShadow: isDark
                              ? "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.25)"
                              : "0 1px 2px rgba(0, 0, 0, 0.05)",
                            color: "var(--text-primary)",
                          }
                        : {
                            background: "var(--glass-fill)",
                            borderColor: "var(--glass-border)",
                            color: "var(--text-tertiary)",
                            opacity: 0.7,
                          }
                    }
                    className="px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer hover:opacity-100 hover:text-[var(--text-primary)]"
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
                inputMode="decimal"
                value={formUnits}
                onChange={(e) =>
                  setFormUnits(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="100"
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
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
                inputMode="decimal"
                value={formBuyPrice}
                onChange={(e) =>
                  setFormBuyPrice(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder={formCurrency === "USD" ? "$0.00" : "Rp"}
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
              {formCurrency === "USD" && formBuyPrice && (
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  ≈{" "}
                  {formatRupiah(
                    parseFloat(formBuyPrice || "0") * usdtPref.rate,
                  )}
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
              inputMode="decimal"
              value={formCurrentPrice}
              onChange={(e) =>
                setFormCurrentPrice(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder={
                isFetchingCurrentPrice
                  ? isIndonesian
                    ? "Mengambil harga live..."
                    : "Fetching live price..."
                  : formCurrency === "USD"
                    ? "$0.00"
                    : "Rp"
              }
              className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
            />
            {formCurrency === "USD" && formCurrentPrice && (
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                ≈{" "}
                {formatRupiah(
                  parseFloat(formCurrentPrice || "0") * usdtPref.rate,
                )}
              </p>
            )}
          </div>

          {/* Bottom Action Dock */}
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
              className="flex-1 py-3 rounded-2xl text-[12.5px] font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
            >
              {isIndonesian ? "Batal" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSaveNewHolding}
              className="flex-2 py-3 rounded-2xl text-[12.5px] font-semibold bg-[var(--text-primary)] text-[var(--bg-base)] active:scale-95 transition-all cursor-pointer shadow-lg text-center"
            >
              {editingHoldingId
                ? isIndonesian
                  ? "Perbarui Aset"
                  : "Update Holding"
                : isIndonesian
                  ? "Simpan Aset"
                  : "Save Holding"}
            </button>
          </div>
        </div>
      </BottomSheet>

    </BottomSheet>
  );
}
