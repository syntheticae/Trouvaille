import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Coins,
  Search,
  RefreshCw,
  X,
  ArrowUpRight,
  ArrowDownRight,
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
import { NetCapitalTrajectoryCard } from "../components/statistics/NetCapitalTrajectoryCard";
import { AssetAnalyticsSection } from "../components/statistics/AssetAnalyticsSection";
import { format, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type {
  InvestmentHolding,
  AssetType,
} from "../lib/types";

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: "8px 12px",
        boxShadow: "0 8px 24px var(--shadow-strength)",
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
};

interface PresetAsset {
  symbol: string;
  name: string;
  type: AssetType;
  icon?: string;
}

const PRESET_ASSETS: PresetAsset[] = [
  // Crypto
  { symbol: "BTC", name: "Bitcoin", type: "crypto", icon: "Coins" },
  { symbol: "ETH", name: "Ethereum", type: "crypto", icon: "Coins" },
  { symbol: "SOL", name: "Solana", type: "crypto", icon: "Coins" },
  { symbol: "BNB", name: "Binance Coin", type: "crypto", icon: "Coins" },
  // US Equities
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", icon: "TrendingUp" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", icon: "TrendingUp" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", icon: "TrendingUp" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", icon: "TrendingUp" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", icon: "TrendingUp" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", icon: "TrendingUp" },
  // IDX Stocks
  { symbol: "BBCA", name: "Bank Central Asia", type: "stock", icon: "TrendingUp" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", type: "stock", icon: "TrendingUp" },
  { symbol: "BMRI", name: "Bank Mandiri", type: "stock", icon: "TrendingUp" },
  { symbol: "TLKM", name: "Telkom Indonesia", type: "stock", icon: "TrendingUp" },
  { symbol: "ASII", name: "Astra International", type: "stock", icon: "TrendingUp" },
  // Gold & Commodities
  { symbol: "XAU", name: "Gold Antam (per gram)", type: "gold", icon: "Landmark" },
  // Mutual Funds
  { symbol: "RD-PASAR-UANG", name: "Reksa Dana Pasar Uang", type: "mutual_fund", icon: "TrendingUp" },
  { symbol: "RD-PENDAPATAN-TETAP", name: "Reksa Dana Pendapatan Tetap", type: "mutual_fund", icon: "FileText" },
  { symbol: "RD-SAHAM", name: "Reksa Dana Saham", type: "mutual_fund", icon: "TrendingUp" },
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
  const [netTrajectoryExpanded, setNetTrajectoryExpanded] = useState(true);

  // Add Holding Flow State
  // 0: closed, 1: preset picker, 2: details form
  const [addPhase, setAddPhase] = useState<0 | 1 | 2>(0);
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
      showToast("Gagal memperbarui harga live", "delete", () => {});
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

  const totalCostBasis = usdtCostBasis + otherHoldingsSummary.totalCostBasis;
  const totalMarketValuation =
    usdtMarketValue + otherHoldingsSummary.totalMarketValue;
  const totalFloatingProfit = totalMarketValuation - totalCostBasis;
  const totalFloatingProfitPct =
    totalCostBasis > 0 ? (totalFloatingProfit / totalCostBasis) * 100 : 0;

  // Asset Class Allocation Breakdown for Mini Bar
  const allocationBreakdown = useMemo(() => {
    if (totalMarketValuation <= 0) return [];
    const classes: {
      type: string;
      label: string;
      value: number;
      pct: number;
      color: string;
    }[] = [];

    // 1. Crypto (USDT + other cryptos)
    const cryptoValue =
      usdtMarketValue +
      liquidHoldings
        .filter((h) => h.asset_type === "crypto")
        .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    if (cryptoValue > 0) {
      classes.push({
        type: "crypto",
        label: "Crypto / USDT",
        value: cryptoValue,
        pct: (cryptoValue / totalMarketValuation) * 100,
        color: isDark ? "#ffffff" : "#18181b",
      });
    }

    // 2. Stocks / Saham
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

    // 3. Gold & Precious Metals
    const goldValue = liquidHoldings
      .filter((h) => h.asset_type === "gold")
      .reduce((sum, h) => sum + h.units * (h.current_price || h.avg_buy_price), 0);
    if (goldValue > 0) {
      classes.push({
        type: "gold",
        label: isIndonesian ? "Emas" : "Gold",
        value: goldValue,
        pct: (goldValue / totalMarketValuation) * 100,
        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
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
        color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
      });
    }

    // 5. Fixed Assets / Properti
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
        color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
      });
    }

    return classes;
  }, [totalMarketValuation, usdtMarketValue, liquidHoldings, fixedHoldings, isDark, isIndonesian]);

  // Longitudinal Net Capital Trajectory Data (6 Months)
  const netWorthData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM", { locale: isIndonesian ? idLocale : undefined });
      return { key, label };
    });

    const monthlyNet = new Map<string, number>();
    allTxs.forEach((tx) => {
      if (!tx.occurred_on) return;
      const key = tx.occurred_on.slice(0, 7);
      const amt = Number(tx.amount || 0);
      const current = monthlyNet.get(key) || 0;
      if (tx.type === "income") {
        monthlyNet.set(key, current + amt);
      } else if (tx.type === "expense") {
        monthlyNet.set(key, current - amt);
      }
    });

    const netChanges = months.map((m) => monthlyNet.get(m.key) || 0);
    const totalChangeInWindow = netChanges.reduce((a, b) => a + b, 0);
    let runningVal = Math.max(0, totalMarketValuation - totalChangeInWindow);

    return months.map((m, idx) => {
      runningVal += netChanges[idx];
      return {
        label: m.label,
        net: Math.max(0, runningVal),
      };
    });
  }, [allTxs, totalMarketValuation, isIndonesian]);

  // Dynamic Monthly Burn Rate for Emergency Runway Coverage
  const monthlyBurnRate = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const recentExpenses = allTxs.filter(
      (tx) => tx.type === "expense" && tx.occurred_on && new Date(tx.occurred_on) >= threeMonthsAgo
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

  // Preset Filtering
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_ASSETS.filter((p) => {
      const matchType = filterType === "all" || p.type === filterType;
      const matchQuery =
        !q ||
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [searchQuery, filterType]);

  // Handle Preset Selection
  const handleSelectPreset = async (preset: PresetAsset) => {
    triggerHaptic("medium");
    setFormSymbol(preset.symbol);
    setFormName(preset.name);
    setFormType(preset.type);
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
        setFormCurrentPrice(String(livePrice));
        setFormBuyPrice(String(livePrice));
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
    const buyPrice = parseFloat(formBuyPrice);
    const currentPrice = parseFloat(formCurrentPrice) || buyPrice;

    if (!formName.trim()) {
      showToast(isIndonesian ? "Masukkan nama aset" : "Please enter asset name", "delete", () => {});
      return;
    }

    if (isNaN(units) || units <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
      showToast(isIndonesian ? "Masukkan nominal yang valid" : "Please enter valid numbers", "delete", () => {});
      return;
    }

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
      showToast("USDT holding removed", "delete", () => {});
      return;
    }
    const updated = deleteHolding(id, user?.id);
    setHoldings(updated);
    showToast(`${name} removed`, "delete", () => {});
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

      {/* 2. Scalable Total Net Valuation Hero Card */}
      <div
        className="p-5 rounded-[26px] space-y-3 relative overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(145deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.015) 100%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10.5px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian ? "Total Valuasi Bersih" : "Total Net Valuation"}
          </span>

          {/* Monochrome Luxury P&L Badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap font-mono"
            style={{
              background: isDark
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.08)",
              color: "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {totalFloatingProfit >= 0 ? (
              <ArrowUpRight size={12} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={12} strokeWidth={2.5} />
            )}
            <span>
              {isStealthMode
                ? "••••••••"
                : `${totalFloatingProfit >= 0 ? "+" : ""}${formatRupiah(totalFloatingProfit)} (${totalFloatingProfitPct >= 0 ? "+" : ""}${totalFloatingProfitPct.toFixed(1)}%)`}
            </span>
          </div>
        </div>

        <p
          className="amount text-[32px] font-bold tracking-tight leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {isStealthMode ? "••••••••" : formatRupiah(totalMarketValuation)}
        </p>

        {/* Scalable Asset Allocation Storage Bar */}
        {allocationBreakdown.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/[0.06] border border-white/10">
              {allocationBreakdown.map((item) => (
                <div
                  key={item.type}
                  style={{
                    width: `${Math.max(item.pct, 3)}%`,
                    backgroundColor: item.color,
                  }}
                  className="h-full transition-all duration-300"
                  title={`${item.label}: ${item.pct.toFixed(1)}%`}
                />
              ))}
            </div>

            {/* Allocation Legend */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-[10.5px]">
              {allocationBreakdown.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center gap-1 shrink-0 text-[var(--text-tertiary)]"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                  <span className="font-mono font-semibold text-[var(--text-secondary)]">
                    {item.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Basis & Live USD Indicator */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[var(--glass-border)] text-[11px]">
          <span style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian ? "Modal Terinvestasi: " : "Cost Basis: "}
            <strong
              className="font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              {isStealthMode ? "••••••••" : formatRupiah(totalCostBasis)}
            </strong>
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>
            Live USD:{" "}
            <strong
              className="font-mono font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatRupiah(usdtPref.rate)}
            </strong>
          </span>
        </div>
      </div>

      {/* 3. Auto-Reconciliation Alert Banner (e.g. SeaBank P2P Transfer) */}
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

      {/* 4. Category Filter Chips & Search Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
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

      {/* 5. Holdings Deck (Apple Stock List format) */}
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

      {/* 6. Net Capital Trajectory Growth Section */}
      <NetCapitalTrajectoryCard
        netWorth={totalMarketValuation}
        hideBalance={isStealthMode}
        rangeTitle={isIndonesian ? "6 Bulan Terakhir" : "Last 6 Months"}
        netWorthData={netWorthData}
        netTrajectoryExpanded={netTrajectoryExpanded}
        setNetTrajectoryExpanded={setNetTrajectoryExpanded}
        colors={{ lineStroke: isDark ? "#ffffff" : "#111827" }}
        isDark={isDark}
        isIndonesian={isIndonesian}
        GlassTooltip={GlassTooltip}
      />

      {/* 7. In-Depth Asset Allocation & Runway Analytics */}
      <AssetAnalyticsSection
        wallets={wallets}
        monthlyBurnRate={monthlyBurnRate}
        hideBalance={isStealthMode}
        onOpenValuation={() => setAddPhase(1)}
      />

      {/* ── Two-Phase Add Holding Modal ────────────────────────────────────── */}
      {addPhase === 1 && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-[28px] sm:rounded-2xl p-5 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {isIndonesian ? "Pilih Aset Investasi" : "Select Investment Asset"}
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {isIndonesian
                    ? "Cari preset atau buat aset kustom"
                    : "Search presets or create custom asset"}
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
                placeholder={isIndonesian ? "Cari kode saham, koin, emas..." : "Search BTC, BBCA, Gold..."}
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

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("fixed_asset")}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
              >
                + {isIndonesian ? "Properti / Kendaraan" : "Fixed Asset"}
              </button>
              <button
                type="button"
                onClick={() => handleCustomAssetEntry("stock")}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[11.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
              >
                + {isIndonesian ? "Aset Kustom" : "Custom Asset"}
              </button>
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pt-1 max-h-[300px]">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.symbol}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                      <IconRenderer
                        icon={preset.icon || "TrendingUp"}
                        size="w-4 h-4"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[12.5px] text-[var(--text-primary)] block">
                        {preset.symbol}
                      </span>
                      <span className="text-[10.5px] text-[var(--text-tertiary)] truncate block">
                        {preset.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-tertiary)]">
                    {preset.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Details Form Modal */}
      {addPhase === 2 && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-t-[28px] sm:rounded-2xl p-5 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[88vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
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

            {/* Inputs: Name & Symbol */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
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
                <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
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
                <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
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
                <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                  Buy Price / Unit
                </label>
                <input
                  type="text"
                  value={formBuyPrice}
                  onChange={(e) => setFormBuyPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Rp"
                  className="w-full px-3 py-2 rounded-xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Current Price */}
            <div>
              <label className="text-[10.5px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
                Current Market Price / Unit
              </label>
              <input
                type="text"
                value={formCurrentPrice}
                onChange={(e) => setFormCurrentPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={isFetchingCurrentPrice ? "Fetching live price..." : "Rp"}
                className="w-full px-3 py-2 rounded-xl text-[13px] font-mono font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={closeAddFlow}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] active:scale-95 cursor-pointer"
              >
                {isIndonesian ? "Batal" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveNewHolding}
                className="flex-[2] py-2.5 rounded-xl text-[12px] font-semibold active:scale-95 cursor-pointer"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-base)",
                }}
              >
                {isIndonesian ? "Simpan Aset" : "Save Holding"}
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
        title="Pilih Ikon Aset"
      />
    </div>
  );
}
