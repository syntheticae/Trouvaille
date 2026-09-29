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
import { useNavigate } from "react-router-dom";
import {
  Plus,
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
  Layers,
  Eye,
  EyeOff,
  ArrowUpRight,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatRupiah, formatHoldingUnits } from "../lib/utils";
import { triggerHaptic } from "../lib/haptics";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePrivacy } from "../contexts/PrivacyContext";
import { useAuth } from "../contexts/AuthContext";
import { useWallets } from "../hooks/useWallets";
import { useWalletBalances } from "../hooks/useWalletBalances";
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
import { ExecutiveWalletCard } from "../components/assets/ExecutiveWalletCard";
import { ConsolidatedBalanceSheetDrawer } from "../components/assets/ConsolidatedBalanceSheetDrawer";
import { PortfolioIntelligenceDeck } from "../components/assets/PortfolioIntelligenceDeck";
import {
  AssetMetricDrillDownSheet,
  type MetricDrillDownData,
} from "../components/assets/AssetMetricDrillDownSheet";
import { calculateAssetTrend } from "../lib/financialMath";
import { startOfMonth } from "date-fns";
import type { InvestmentHolding, AssetType } from "../lib/types";
import {
  PRESET_ASSETS,
  type PresetAsset,
  type PresetCategory,
} from "../lib/assetPresets";

export type { PresetCategory, PresetAsset };

export type BalanceSheetRange = "1D" | "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";

function formatAxisY(val: number): string {
  if (Math.abs(val) >= 1000000000) return (val / 1000000000).toFixed(1) + "B";
  if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + "M";
  if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + "K";
  return String(val);
}

interface GlassTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isStealthMode?: boolean;
}

const GlassTooltip = ({
  active,
  payload,
  label,
  isStealthMode,
}: GlassTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        borderRadius: 12,
        padding: "6px 10px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p
        style={{
          color: "var(--text-tertiary)",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {isStealthMode ? "••••••••" : formatRupiah(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
};

export function AssetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme !== "light";
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const { isStealthMode, toggleStealthMode } = usePrivacy();
  const [bsRange, setBsRange] = useState<BalanceSheetRange>("7D");

  const { data: wallets = [] } = useWallets();
  const { balancesById } = useWalletBalances();
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

  // Consolidated Balance Sheet Drawer & Metric Drill Down State
  const [isConsolidatedDrawerOpen, setIsConsolidatedDrawerOpen] =
    useState(false);
  const [selectedMetricDrillDown, setSelectedMetricDrillDown] =
    useState<MetricDrillDownData | null>(null);

  // Add Holding Flow State
  // 0: closed, 1: preset picker, 2: details form
  const [addPhase, setAddPhase] = useState<0 | 1 | 2>(0);
  const [presetCategory, setPresetCategory] = useState<PresetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
            setUsdtPref((prev: UsdtValuationPref) => ({
              ...prev,
              rate: usdtRate,
            }));
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
        setUsdtPref((prev: UsdtValuationPref) => ({
          ...prev,
          rate: res.usdtRate,
        }));
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
        isIndonesian
          ? "Gagal memperbarui harga live"
          : "Failed to refresh live prices",
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
    usdtPref.units > 0 ? usdtPref.units * usdtPref.rate : recordedCryptoBalance;
  const usdtFloatingPnL = usdtMarketValue - usdtCostBasis;
  const usdtFloatingPnLPct =
    usdtCostBasis > 0 ? (usdtFloatingPnL / usdtCostBasis) * 100 : 0;

  // ── Executive Balance Sheet & 4-Pillar Capital Breakdown ──────────
  // Pillar 1: Liquid & Current Assets (Operating Cash, Banks, e-Wallets, USDT Reserve)
  const liquidWalletCash = useMemo(() => {
    return wallets
      .filter(
        (w) =>
          w.classification !== "credit" &&
          w.classification !== "loan" &&
          w.classification !== "investment" &&
          w.id !== cryptoWallet?.id,
      )
      .reduce((sum, w) => sum + (balancesById[w.id] ?? 0), 0);
  }, [wallets, cryptoWallet, balancesById]);
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
      .reduce(
        (sum, h) => sum + h.units * (h.current_price || h.avg_buy_price),
        0,
      );
  }, [liquidHoldings]);

  // Pillar 3: Fixed & Tangible Assets (Property, Physical Gold, Vehicles)
  const fixedAssetsTotal = useMemo(() => {
    const fixedTangibles = fixedHoldings.reduce((sum, h) => {
      const v = calculateHoldingValuation(h);
      return sum + v.marketValue;
    }, 0);
    const physicalGold = liquidHoldings
      .filter((h) => h.asset_type === "gold")
      .reduce(
        (sum, h) => sum + h.units * (h.current_price || h.avg_buy_price),
        0,
      );
    return fixedTangibles + physicalGold;
  }, [fixedHoldings, liquidHoldings]);

  // Pillar 4: Total Liabilities & Obligations (Credit Cards, PayLater, Loans, Overdrafts)
  const liabilitiesTotal = useMemo(() => {
    return wallets
      .filter(
        (w) =>
          w.classification === "credit" ||
          w.classification === "loan" ||
          (balancesById[w.id] ?? 0) < 0,
      )
      .reduce((sum, w) => {
        const bal = balancesById[w.id] ?? 0;
        return (
          sum +
          Math.abs(
            bal < 0
              ? bal
              : w.classification === "credit" || w.classification === "loan"
                ? bal
                : 0,
          )
        );
      }, 0);
  }, [wallets, balancesById]);

  // Balance Sheet Totals & Solvency Metrics
  const totalGrossAssets =
    liquidAssetsTotal + growthAssetsTotal + fixedAssetsTotal;
  const netWorth = totalGrossAssets - liabilitiesTotal;
  const debtToAssetRatio =
    totalGrossAssets > 0 ? (liabilitiesTotal / totalGrossAssets) * 100 : 0;
  const solvencyScore = Math.max(
    0,
    Math.min(100, Math.round(100 - debtToAssetRatio)),
  );

  const liquidPct =
    totalGrossAssets > 0 ? (liquidAssetsTotal / totalGrossAssets) * 100 : 0;
  const growthPct =
    totalGrossAssets > 0 ? (growthAssetsTotal / totalGrossAssets) * 100 : 0;
  const fixedPct =
    totalGrossAssets > 0 ? (fixedAssetsTotal / totalGrossAssets) * 100 : 0;

  // Top Exposure & Capital Deployment Memos
  const topExposure = useMemo(() => {
    let maxName = "";
    let maxValue = 0;
    if (usdtMarketValue > 0) {
      maxName = "USDT";
      maxValue = usdtMarketValue;
    }
    for (const h of holdings) {
      const val = calculateHoldingValuation(h).marketValue;
      if (val > maxValue) {
        maxName = h.symbol || h.name;
        maxValue = val;
      }
    }
    const pct = totalGrossAssets > 0 ? (maxValue / totalGrossAssets) * 100 : 0;
    return { name: maxName, value: maxValue, pct };
  }, [holdings, usdtMarketValue, totalGrossAssets]);

  const capitalDeployment = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    return allTxs
      .filter(
        (tx) =>
          tx.occurred_on &&
          new Date(tx.occurred_on) >= thisMonthStart &&
          (tx.categories?.name?.toLowerCase().includes("invest") ||
            tx.note?.toLowerCase().includes("invest") ||
            tx.type === "transfer"),
      )
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [allTxs]);

  const assetTrend = useMemo(() => {
    return calculateAssetTrend(allTxs, netWorth, bsRange);
  }, [allTxs, netWorth, bsRange]);

  const chartPeak = useMemo(() => {
    if (!assetTrend.chartData || assetTrend.chartData.length === 0)
      return netWorth;
    return Math.max(...assetTrend.chartData.map((d) => d.balance));
  }, [assetTrend.chartData, netWorth]);

  const chartTrough = useMemo(() => {
    if (!assetTrend.chartData || assetTrend.chartData.length === 0)
      return netWorth;
    return Math.min(...assetTrend.chartData.map((d) => d.balance));
  }, [assetTrend.chartData, netWorth]);

  const bsRangeLabels: Record<BalanceSheetRange, string> = {
    "1D": isIndonesian ? "Hari Ini" : "Today",
    "7D": isIndonesian ? "7 Hari" : "7 Days",
    "1M": isIndonesian ? "1 Bulan" : "1 Month",
    "3M": isIndonesian ? "3 Bulan" : "3 Months",
    "6M": isIndonesian ? "6 Bulan" : "6 Months",
    "1Y": isIndonesian ? "1 Tahun" : "1 Year",
    ALL: isIndonesian ? "Semua Waktu" : "All Time",
  };

  // Reconciliation Audit
  const reconciliationAudit = useMemo(() => {
    return auditUsdtReconciliation(allTxs, wallets, user?.id);
  }, [allTxs, wallets, user?.id]);

  const handleApplyReconciliation = () => {
    if (!reconciliationAudit.hasDiscrepancy) return;
    triggerHaptic("medium");
    const res = applyUsdtReconciliation(reconciliationAudit, user?.id);
    setUsdtPref((prev: UsdtValuationPref) => ({
      ...prev,
      units: res.updatedUnits,
    }));
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
      units:
        usdtPref.units > 0
          ? usdtPref.units
          : existingUsdt?.units || suggestedUsdtUnits,
      avg_buy_price:
        usdtPref.units > 0
          ? Math.round(usdtCostBasis / usdtPref.units)
          : existingUsdt?.avg_buy_price || usdtPref.rate,
      current_price:
        existingUsdt?.is_custom_price && existingUsdt.custom_price
          ? existingUsdt.custom_price
          : usdtPref.rate,
      currency: "IDR",
      icon: "Coins",
      activities:
        existingUsdt?.activities && existingUsdt.activities.length > 0
          ? existingUsdt.activities
          : undefined,
      is_custom_price: existingUsdt?.is_custom_price,
      custom_price: existingUsdt?.custom_price,
    };
    setSelectedDetailHolding(usdtHolding);
  };

  // Open any Holding in Detail Sheet
  const handleOpenHoldingDetail = (h: InvestmentHolding) => {
    triggerHaptic("light");
    setSelectedDetailHolding(h);
  };

  // 6 Metric Drill Down Openers (Interactive Half Cards)
  const openLiquidDetail = () => {
    triggerHaptic("light");
    const items: any[] = [];
    if (usdtMarketValue > 0 || usdtPref.units > 0) {
      items.push({
        label: "Tether USD (USDT)",
        sublabel: `${formatHoldingUnits(usdtPref.units)} USDT · @${formatRupiah(usdtPref.rate)}`,
        amount: usdtMarketValue,
        detail: isIndonesian
          ? "Stablecoin cadangan di akun"
          : "Stablecoin reserve",
        onClick: () => {
          setSelectedMetricDrillDown(null);
          openUsdtDetail();
        },
      });
    }
    wallets
      .filter(
        (w) =>
          (balancesById[w.id] ?? 0) > 0 &&
          w.classification !== "credit" &&
          w.classification !== "loan" &&
          w.classification !== "investment" &&
          !w.name.toLowerCase().includes("crypto") &&
          !w.name.toLowerCase().includes("usdt"),
      )
      .forEach((w) => {
        items.push({
          label: w.name,
          sublabel: isIndonesian
            ? "Kas & Rekening Operasional"
            : "Cash & Bank Account",
          amount: balancesById[w.id] ?? 0,
          detail: "IDR",
        });
      });

    setSelectedMetricDrillDown({
      title: isIndonesian
        ? "Aset Lancar & Kas (Tier 1)"
        : "Liquid & Current Assets (Tier 1)",
      badge: `${liquidPct.toFixed(1)}% ${isIndonesian ? "Alokasi" : "Allocation"}`,
      icon: "Wallet",
      amount: liquidAssetsTotal,
      narrative: isIndonesian
        ? "Aset likuid adalah modal yang dapat dicairkan seketika dalam < 24 jam tanpa penalti pasar. Cadangan ini menjaga stabilitas arus kas dan ketahanan dana darurat."
        : "Liquid assets can be accessed immediately within 24h without capital loss penalty, maintaining operational liquidity.",
      items,
      ctaLabel: isIndonesian
        ? "Buka Neraca Lengkap"
        : "View Full Balance Sheet",
      onCta: () => {
        setSelectedMetricDrillDown(null);
        setIsConsolidatedDrawerOpen(true);
      },
    });
  };

  const openGrowthDetail = () => {
    triggerHaptic("light");
    const growthHoldings = liquidHoldings.filter(
      (h) =>
        h.asset_type === "stock" ||
        (h.asset_type === "crypto" && h.symbol?.toUpperCase() !== "USDT") ||
        h.asset_type === "mutual_fund" ||
        h.asset_type === "bond",
    );
    const items = growthHoldings.map((h) => {
      const val = calculateHoldingValuation(h);
      return {
        label: `${h.name} (${h.symbol})`,
        sublabel: `${formatHoldingUnits(h.units)} ${h.symbol} · ${h.asset_type.toUpperCase().replace("_", " ")}`,
        amount: val.marketValue,
        detail: `${val.floatingPnLPct >= 0 ? "+" : ""}${val.floatingPnLPct.toFixed(1)}% PnL`,
        onClick: () => {
          setSelectedMetricDrillDown(null);
          handleOpenHoldingDetail(h);
        },
      };
    });

    setSelectedMetricDrillDown({
      title: isIndonesian
        ? "Pasar & Pertumbuhan (Tier 2)"
        : "Market & Growth Assets (Tier 2)",
      badge: `${growthPct.toFixed(1)}% ${isIndonesian ? "Alokasi" : "Allocation"}`,
      icon: "TrendingUp",
      amount: growthAssetsTotal,
      narrative: isIndonesian
        ? growthHoldings.length === 0
          ? "Tier 2 ditujukan untuk instrumen bertumbuh berimbal hasil tinggi seperti saham, reksa dana, dan kripto. Belum ada instrumen pasar terdaftar."
          : `Terdapat ${growthHoldings.length} aset pasar aktif untuk pertumbuhan modal jangka panjang di atas inflasi.`
        : "Higher-yielding, fluctuating market holdings including equities, crypto, and funds.",
      items,
      ctaLabel: isIndonesian ? "Tambah Aset Pasar" : "Add Market Asset",
      onCta: () => {
        setSelectedMetricDrillDown(null);
        setAddPhase(1);
      },
    });
  };

  const openFixedDetail = () => {
    triggerHaptic("light");
    const items: any[] = [];
    liquidHoldings
      .filter((h) => h.asset_type === "gold")
      .forEach((h) => {
        const val = calculateHoldingValuation(h);
        items.push({
          label: `${h.name} (${h.symbol})`,
          sublabel: `${formatHoldingUnits(h.units)} gram · ${isIndonesian ? "Logam Mulia" : "Precious Metal"}`,
          amount: val.marketValue,
          detail: formatRupiah(val.marketValue),
          onClick: () => {
            setSelectedMetricDrillDown(null);
            handleOpenHoldingDetail(h);
          },
        });
      });
    fixedHoldings.forEach((h) => {
      const val = calculateHoldingValuation(h);
      items.push({
        label: h.name,
        sublabel: h.asset_type.toUpperCase().replace("_", " "),
        amount: val.marketValue,
        detail: formatRupiah(val.marketValue),
        onClick: () => {
          setSelectedMetricDrillDown(null);
          handleOpenHoldingDetail(h);
        },
      });
    });

    setSelectedMetricDrillDown({
      title: isIndonesian
        ? "Aset Tetap & Riil (Tier 3)"
        : "Fixed & Tangibles (Tier 3)",
      badge: `${fixedPct.toFixed(1)}% ${isIndonesian ? "Alokasi" : "Allocation"}`,
      icon: "Landmark",
      amount: fixedAssetsTotal,
      narrative: isIndonesian
        ? items.length === 0
          ? "Tier 3 mencakup aset riil fisik berwujud seperti Emas Batangan Antam/UBS, properti, dan kendaraan bermotor sebagai penyimpan nilai fisik jangka panjang."
          : `Terdapat ${items.length} kepemilikan aset riil fisik sebagai pelindung kekayaan dari depresiasi nilai mata uang.`
        : "Physical and hard tangible assets preserving generational purchasing power.",
      items,
      ctaLabel: isIndonesian ? "Catat Aset Riil" : "Record Tangible Asset",
      onCta: () => {
        setSelectedMetricDrillDown(null);
        setAddPhase(1);
      },
    });
  };

  const openDebtDetail = () => {
    triggerHaptic("light");
    const debtWallets = wallets.filter(
      (w) =>
        w.classification === "credit" ||
        w.classification === "loan" ||
        (balancesById[w.id] ?? 0) < 0,
    );
    const items = debtWallets.map((w) => {
      const bal = balancesById[w.id] ?? 0;
      const debtAmt = Math.abs(
        bal < 0
          ? bal
          : w.classification === "credit" || w.classification === "loan"
            ? bal
            : 0,
      );
      return {
        label: w.name,
        sublabel: (w.classification || "debt").toUpperCase(),
        amount: debtAmt,
        detail: isIndonesian ? "Kewajiban aktif" : "Active liability",
      };
    });

    setSelectedMetricDrillDown({
      title: isIndonesian
        ? "Liabilitas & Kewajiban Utang"
        : "Liabilities & Debt Obligations",
      badge: `${debtToAssetRatio.toFixed(1)}% Debt-to-Asset`,
      icon: "ShieldAlert",
      amount: liabilitiesTotal,
      narrative: isIndonesian
        ? liabilitiesTotal === 0
          ? "Neraca keuangan Anda bebas utang. Rasio utang terhadap aset (D/A) adalah 0.0%, memberikan fleksibilitas penuh terhadap arus kas bulanan."
          : `Total kewajiban tercatat sebesar ${formatRupiah(liabilitiesTotal)}. Rasio D/A Anda adalah ${debtToAssetRatio.toFixed(1)}% (batas aman < 30%).`
        : "Active liabilities, loans and credit cards measured against total gross assets.",
      items,
      ctaLabel: isIndonesian ? "Buka Neraca Lengkap" : "View Balance Sheet",
      onCta: () => {
        setSelectedMetricDrillDown(null);
        setIsConsolidatedDrawerOpen(true);
      },
    });
  };

  const openDeployedDetail = () => {
    triggerHaptic("light");
    setSelectedMetricDrillDown({
      title: isIndonesian
        ? "Alokasi Modal Bulan Berjalan (MTD)"
        : "Capital Deployed (MTD)",
      badge: "MTD",
      icon: "ArrowUpRight",
      amount: capitalDeployment,
      narrative: isIndonesian
        ? capitalDeployment === 0
          ? "Belum ada injeksi modal segar ke instrumen investasi sepanjang bulan berjalan ini."
          : `Total ${formatRupiah(capitalDeployment)} telah dialokasikan ke instrumen aset sepanjang bulan berjalan ini.`
        : "Capital injected into investment holdings or asset purchases this month.",
      items: [
        {
          label: isIndonesian
            ? "Injeksi Portofolio MTD"
            : "MTD Inflow Injection",
          amount: capitalDeployment,
          detail: isIndonesian
            ? "Transfer & pembelian aset"
            : "Investments & transfers",
        },
      ],
      ctaLabel: isIndonesian ? "Buka Neraca Lengkap" : "View Full Portfolio",
      onCta: () => {
        setSelectedMetricDrillDown(null);
        setIsConsolidatedDrawerOpen(true);
      },
    });
  };

  const openExposureDetail = () => {
    triggerHaptic("light");
    const ranked: any[] = [];
    if (usdtMarketValue > 0) {
      const pct =
        totalGrossAssets > 0 ? (usdtMarketValue / totalGrossAssets) * 100 : 0;
      ranked.push({
        label: "Tether USD (USDT)",
        sublabel: `${pct.toFixed(1)}% ${isIndonesian ? "dari seluruh aset" : "of gross assets"}`,
        amount: usdtMarketValue,
        detail: `${pct.toFixed(1)}%`,
        onClick: () => {
          setSelectedMetricDrillDown(null);
          openUsdtDetail();
        },
      });
    }
    holdings.forEach((h) => {
      const val = calculateHoldingValuation(h);
      const pct =
        totalGrossAssets > 0 ? (val.marketValue / totalGrossAssets) * 100 : 0;
      ranked.push({
        label: `${h.name} (${h.symbol})`,
        sublabel: `${pct.toFixed(1)}% ${isIndonesian ? "dari seluruh aset" : "of gross assets"}`,
        amount: val.marketValue,
        detail: `${pct.toFixed(1)}%`,
        onClick: () => {
          setSelectedMetricDrillDown(null);
          handleOpenHoldingDetail(h);
        },
      });
    });
    ranked.sort((a, b) => (b.amount || 0) - (a.amount || 0));

    setSelectedMetricDrillDown({
      title: isIndonesian
        ? "Konsentrasi Eksposur Portofolio"
        : "Portfolio Concentration",
      badge: `${topExposure.pct.toFixed(1)}% ${isIndonesian ? "Bobot Puncak" : "Peak Weight"}`,
      icon: "Coins",
      amount: topExposure.value,
      narrative: isIndonesian
        ? `Aset berbobot terbesar Anda adalah ${topExposure.name || "USDT"} (${topExposure.pct.toFixed(1)}%). ${
            topExposure.pct > 70
              ? "Konsentrasi sangat tinggi pada 1 aset. Pertimbangkan diversifikasi ke kelas aset lain bila ingin mengurangi risiko pihak ketiga."
              : "Diversifikasi portofolio terpantau seimbang."
          }`
        : `Your largest single asset exposure is ${topExposure.name} (${topExposure.pct.toFixed(1)}%).`,
      items: ranked,
      ctaLabel: isIndonesian ? "Buka Neraca Lengkap" : "View Full Portfolio",
      onCta: () => {
        setSelectedMetricDrillDown(null);
        setIsConsolidatedDrawerOpen(true);
      },
    });
  };

  // Preset Filtering by Category & Search
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_ASSETS.filter((p) => {
      const matchCategory =
        presetCategory === "all" || p.category === presetCategory;
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
      showToast(
        isIndonesian ? "Masukkan nama aset" : "Please enter asset name",
        "delete",
        () => {},
      );
      return;
    }

    if (isNaN(units) || units <= 0 || isNaN(rawBuy) || rawBuy <= 0) {
      showToast(
        isIndonesian
          ? "Masukkan nominal yang valid"
          : "Please enter valid numbers",
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
        isIndonesian
          ? "Holding USDT berhasil disimpan"
          : "USDT holding saved successfully",
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
      `${newH.name} ${editingHoldingId ? (isIndonesian ? "berhasil diperbarui" : "updated successfully") : isIndonesian ? "berhasil disimpan" : "saved successfully"}`,
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
    showToast(
      `${name} ${isIndonesian ? "dihapus" : "removed"}`,
      "delete",
      () => {},
    );
  };

  // User's active holdings list (excluding USDT since Core USDT has its own primary hero row), sorted by market value
  const displayHoldings = useMemo(() => {
    return holdings
      .filter((h) => h.symbol?.toUpperCase() !== "USDT")
      .map((h) => ({
        ...h,
        valuation: calculateHoldingValuation(h),
      }))
      .sort((a, b) => b.valuation.marketValue - a.valuation.marketValue);
  }, [holdings]);

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
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            {isIndonesian ? "Neraca Keuangan" : "Executive Balance Sheet"}
          </h1>
          <p className="text-[12px] text-[var(--text-tertiary)] font-medium">
            {isIndonesian
              ? "Matriks solvabilitas & struktur modal lengkap"
              : "Solvency matrix & capital breakdown"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              toggleTheme();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer select-none"
            title={
              theme === "light"
                ? isIndonesian
                  ? "Beralih ke Mode Gelap"
                  : "Switch to Dark Mode"
                : isIndonesian
                  ? "Beralih ke Mode Terang"
                  : "Switch to Light Mode"
            }
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--text-primary)" }}
              />
            ) : (
              <Sun
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--text-primary)" }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/settings");
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center glass-surface border border-[var(--glass-border)] active:scale-95 transition-transform cursor-pointer"
            title={isIndonesian ? "Pengaturan" : "Settings"}
            aria-label="Settings"
          >
            <Settings
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--text-primary)" }}
            />
          </button>
        </div>
      </div>

      {/* ── 2. Executive Balance Sheet Statement Hero Wallet Card ── */}
      <ExecutiveWalletCard
        netWorth={netWorth}
        totalGrossAssets={totalGrossAssets}
        liabilitiesTotal={liabilitiesTotal}
        solvencyScore={solvencyScore}
        isStealthMode={isStealthMode}
        toggleStealthMode={toggleStealthMode}
        isIndonesian={isIndonesian}
        isDark={isDark}
        wallets={wallets}
        holdings={holdings}
        usdtRate={usdtPref.rate}
        usdtUnits={usdtPref.units}
        onDetailAsset={(item) => {
          triggerHaptic("light");
          if (typeof item === "object" && item !== null) {
            setSelectedDetailHolding(item as InvestmentHolding);
          } else if (
            item === "card-usdt" ||
            (typeof item === "string" && item.includes("usdt"))
          ) {
            openUsdtDetail();
          } else {
            const found = holdings.find(
              (h) => h.id === item || `card-${h.id}` === item,
            );
            if (found) {
              setSelectedDetailHolding(found);
            } else {
              openUsdtDetail();
            }
          }
        }}
        userName={
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.email?.split("@")[0] ||
          (isIndonesian ? "Anggota Trouvaille" : "Trouvaille Member")
        }
      />

      {/* ── Relocated Minimalist Quick Action Bar (Compact) ────────────────── */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* 1. Refresh Prices */}
        <button
          type="button"
          onClick={handleRefreshPrices}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10.5px] font-medium glass-surface border border-[var(--glass-border)] active:scale-[0.98] transition-transform cursor-pointer h-7.5"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <RefreshCw
            size={11.5}
            strokeWidth={2}
            className={isRefreshing ? "animate-spin" : ""}
          />
          <span className="truncate">
            {isIndonesian ? "Perbarui" : "Refresh"}
          </span>
        </button>

        {/* 2. Sync & Staking */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setIsStakingModalOpen(true);
          }}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10.5px] font-medium glass-surface border border-[var(--glass-border)] active:scale-[0.98] transition-transform cursor-pointer h-7.5"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Link2 size={12} strokeWidth={1.75} />
          <span className="truncate">
            {isIndonesian ? "Staking" : "Staking"}
          </span>
        </button>

        {/* 3. Add Asset */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            setAddPhase(1);
          }}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10.5px] font-semibold active:scale-[0.98] transition-transform cursor-pointer h-7.5"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-base)",
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          <span className="truncate">
            {isIndonesian ? "Tambah Aset" : "Add Asset"}
          </span>
        </button>
      </div>

      {/* ── 3. Auto-Reconciliation Alert Banner ────────────────────────────── */}
      {reconciliationAudit.hasDiscrepancy && !dismissedReconciliation && (
        <div
          className="p-3.5 rounded-3xl glass-surface flex items-center justify-between gap-3 border border-[var(--glass-border)] animate-in fade-in"
          style={{
            background: "var(--bg-elevated)",
            boxShadow: "var(--shadow-card)",
          }}
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
          <h3 className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)]">
            {isIndonesian
              ? "Struktur Neraca & Alokasi Modal"
              : "Balance Sheet Breakdown"}
          </h3>
          <span className="text-[11px]  text-[var(--text-tertiary)] font-medium">
            4 Pillars
          </span>
        </div>

        {/* 3-Tier Capital Allocation Summary Strip */}
        <div
          className="p-3 rounded-2xl border border-[var(--glass-border)] space-y-2"
          style={{
            background: "var(--bg-elevated)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-secondary)]">
                {isIndonesian
                  ? "Alokasi Modal 3-Tier"
                  : "3-Tier Capital Allocation"}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setIsConsolidatedDrawerOpen(true);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-strong)] text-[var(--text-primary)] border border-[var(--glass-border)] text-[10px] font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                title={
                  isIndonesian
                    ? "Buka seluruh aset & liabilitas"
                    : "View all assets & debt"
                }
              >
                <Layers size={11} strokeWidth={2} />
                <span>{isIndonesian ? "Lihat Semua" : "View All"}</span>
              </button>
            </div>
            <span className=" text-[10.5px] text-[var(--text-tertiary)]">
              {isStealthMode ? "••••••••" : formatRupiah(totalGrossAssets)}
            </span>
          </div>

          {/* Multi-segment thin progress bar */}
          <div className="h-2 w-full rounded-full overflow-hidden flex bg-[var(--glass-fill)] border border-[var(--glass-border)]">
            {totalGrossAssets > 0 ? (
              <>
                <div
                  style={{
                    width: `${liquidPct}%`,
                    background: isDark ? "#FFFFFF" : "#18181b",
                  }}
                  className="h-full transition-all duration-300"
                />
                <div
                  style={{
                    width: `${growthPct}%`,
                    background: isDark ? "#A1A1AA" : "#71717a",
                  }}
                  className="h-full transition-all duration-300"
                />
                <div
                  style={{
                    width: `${fixedPct}%`,
                    background: isDark ? "#3F3F46" : "#d4d4d8",
                  }}
                  className="h-full transition-all duration-300"
                />
              </>
            ) : (
              <div className="w-full h-full bg-white/[0.08]" />
            )}
          </div>

          {/* 3 Tier Percentage Pill Chips */}
          <div className="flex items-center justify-between gap-1 text-[10.5px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: isDark ? "#FFFFFF" : "#18181b" }}
              />
              <span className="text-[var(--text-secondary)] truncate">
                {isIndonesian ? "Kas / Likuid" : "Liquid"}
              </span>
              <span className=" font-semibold text-[var(--text-primary)]">
                {liquidPct.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: isDark ? "#A1A1AA" : "#71717a" }}
              />
              <span className="text-[var(--text-secondary)] truncate">
                {isIndonesian ? "Pasar / Tumbuh" : "Growth"}
              </span>
              <span className=" font-semibold text-[var(--text-primary)]">
                {growthPct.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: isDark ? "#3F3F46" : "#d4d4d8" }}
              />
              <span className="text-[var(--text-secondary)] truncate">
                {isIndonesian ? "Aset Riil" : "Fixed"}
              </span>
              <span className=" font-semibold text-[var(--text-primary)]">
                {fixedPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Pillar 1: Liquid & Current */}
          <div
            onClick={openLiquidDetail}
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] hover:border-white/20 transition-all group"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Wallet
                  size={16}
                  strokeWidth={1.75}
                  className="text-[var(--text-primary)]"
                />
              </div>
              <span className=" text-[10.5px] text-[var(--text-tertiary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors">
                {liquidPct.toFixed(1)}% &gt;
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                  {isIndonesian ? "Aset Lancar & Kas" : "Liquid & Current"}
                </p>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian
                  ? "Kas, bank & cadangan USDT"
                  : "Cash, banks & stablecoin reserve"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className=" text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(liquidAssetsTotal)}
              </span>
              <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Pillar 2: Market & Growth */}
          <div
            onClick={openGrowthDetail}
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] hover:border-white/20 transition-all group"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <TrendingUp
                  size={16}
                  strokeWidth={1.75}
                  className="text-[var(--text-primary)]"
                />
              </div>
              <span className=" text-[10.5px] text-[var(--text-tertiary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors">
                {growthPct.toFixed(1)}% &gt;
              </span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Pasar & Pertumbuhan" : "Market & Growth"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian
                  ? "Saham, kripto & reksa dana"
                  : "Equities, crypto & funds"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className=" text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(growthAssetsTotal)}
              </span>
              <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Pillar 3: Fixed & Tangibles */}
          <div
            onClick={openFixedDetail}
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] hover:border-white/20 transition-all group"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Landmark
                  size={16}
                  strokeWidth={1.75}
                  className="text-[var(--text-primary)]"
                />
              </div>
              <span className=" text-[10.5px] text-[var(--text-tertiary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors">
                {fixedPct.toFixed(1)}% &gt;
              </span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Aset Tetap & Riil" : "Fixed & Tangibles"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian
                  ? "Properti, emas & kendaraan"
                  : "Real estate, gold & vehicles"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className=" text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(fixedAssetsTotal)}
              </span>
              <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Pillar 4: Liabilities & Debt */}
          <div
            onClick={openDebtDetail}
            className="p-4 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] hover:border-white/20 transition-all group"
            style={{
              background: "var(--bg-elevated)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <ShieldAlert
                  size={16}
                  strokeWidth={1.75}
                  className="text-[var(--text-primary)]"
                />
              </div>
              <span className=" text-[10.5px] text-[var(--text-tertiary)] font-semibold group-hover:text-[var(--text-primary)] transition-colors">
                {debtToAssetRatio.toFixed(1)}% D/A &gt;
              </span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                {isIndonesian ? "Liabilitas & Utang" : "Liabilities & Debt"}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
                {isIndonesian
                  ? "Kartu kredit, paylater & utang"
                  : "Cards, paylater & loans"}
              </p>
            </div>
            <div className="pt-1.5 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className=" text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                {isStealthMode ? "••••••••" : formatRupiah(liabilitiesTotal)}
              </span>
              <ChevronRight size={13} className="text-[var(--text-tertiary)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Secondary Bento: Capital Deployment & Top Exposure ────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={openDeployedDetail}
          className="p-3.5 rounded-2xl glass-surface border border-[var(--glass-border)] space-y-1.5 cursor-pointer active:scale-[0.99] hover:border-white/20 transition-all group"
          style={{
            background: "var(--bg-elevated)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {isIndonesian ? "Alokasi Modal" : "Capital Deployed"}
            </span>
            <span className="text-[9px]  px-1.5 py-0.5 rounded bg-[var(--glass-fill)] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
              MTD &gt;
            </span>
          </div>
          <p className=" text-[13px] font-semibold text-[var(--text-primary)]">
            {isStealthMode ? "••••••••" : formatRupiah(capitalDeployment)}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
            {isIndonesian
              ? "Injeksi modal ke portofolio"
              : "Capital injected into assets"}
          </p>
        </div>

        <div
          onClick={openExposureDetail}
          className="p-3.5 rounded-2xl glass-surface border border-[var(--glass-border)] space-y-1.5 cursor-pointer active:scale-[0.99] hover:border-white/20 transition-all group"
          style={{
            background: "var(--bg-elevated)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {isIndonesian ? "Eksposur Terbesar" : "Top Exposure"}
            </span>
            <span className="text-[9px]  px-1.5 py-0.5 rounded bg-[var(--glass-fill)] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
              {topExposure.pct.toFixed(1)}% &gt;
            </span>
          </div>
          <p className=" text-[13px] font-semibold text-[var(--text-primary)] truncate">
            {topExposure.name || (isIndonesian ? "Belum ada aset" : "No asset")}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">
            {isIndonesian
              ? "Konsentrasi portofolio tertinggi"
              : "Highest single asset weight"}
          </p>
        </div>
      </div>

      {/* ── 5. Holdings Deck ─────────────────────────────────────────────── */}
      <section
        id="holdings-deck"
        className="p-4 sm:p-5 rounded-3xl glass-surface border border-[var(--glass-border)] space-y-3.5 select-none"
        style={{
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <Layers
                size={15}
                strokeWidth={1.75}
                className="text-[var(--text-primary)]"
              />
            </div>
            <div>
              <h4 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                {isIndonesian
                  ? "Daftar Kepemilikan Portofolio"
                  : "Portfolio Holdings"}
              </h4>
              <p className="text-[10.5px] text-[var(--text-tertiary)]">
                {isIndonesian
                  ? "Valuasi pasar real-time & alokasi aset"
                  : "Valuation & asset allocation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10.5px]  font-semibold px-2 py-0.5 rounded-full bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
              {holdings.length +
                (usdtPref.units > 0 || recordedCryptoBalance > 0 ? 1 : 0)}{" "}
              {isIndonesian ? "aset" : "assets"}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                setAddPhase(1);
              }}
              className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--text-primary)] text-[var(--bg-base)] active:scale-95 transition-transform cursor-pointer"
              title={isIndonesian ? "Tambah Aset" : "Add Asset"}
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Compact List of Top 3 Assets */}
        <div className="space-y-2">
          {/* Core USDT Row */}
          {(usdtPref.units > 0 || recordedCryptoBalance > 0) && (
            <div
              onClick={openUsdtDetail}
              className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)] hover:bg-[var(--glass-fill-strong)]"
              style={{ background: "var(--glass-fill)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0  font-semibold text-xs">
                  ₮
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[13px] text-[var(--text-primary)]">
                      USDT
                    </span>
                    <span className="text-[8.5px] px-1.5 py-0.5 rounded  font-semibold bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                      STABLECOIN
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5 ">
                    {usdtPref.units > 0
                      ? `${formatHoldingUnits(usdtPref.units)} USDT · @${formatRupiah(usdtPref.rate)}`
                      : `Wallet linked · ${formatHoldingUnits(suggestedUsdtUnits)} USDT`}
                  </p>
                </div>
              </div>
              <div className="text-right  shrink-0 pl-2">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                  {isStealthMode ? "••••••••" : formatRupiah(usdtMarketValue)}
                </span>
                <div className="flex items-center justify-end gap-1.5 text-[10px] mt-0.5">
                  <span
                    style={{
                      color:
                        usdtFloatingPnLPct >= 0
                          ? "var(--accent)"
                          : "var(--text-tertiary)",
                    }}
                  >
                    {usdtFloatingPnLPct >= 0 ? "+" : ""}
                    {usdtFloatingPnLPct.toFixed(1)}%
                  </span>
                  <span className="text-[var(--text-tertiary)] opacity-60">
                    ·
                  </span>
                  <span className="text-[var(--text-tertiary)]">
                    {(
                      (usdtMarketValue / (totalGrossAssets || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Other Holdings (Top 3 in inline view) */}
          {displayHoldings.slice(0, 3).map((h) => {
            const val = h.valuation;
            const weight =
              totalGrossAssets > 0
                ? (val.marketValue / totalGrossAssets) * 100
                : 0;
            return (
              <div
                key={h.id}
                onClick={() => handleOpenHoldingDetail(h)}
                className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform border border-[var(--glass-border)] hover:bg-[var(--glass-fill-strong)]"
                style={{ background: "var(--glass-fill)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--glass-fill)] border border-[var(--glass-border)] text-[var(--text-primary)] shrink-0">
                    <IconRenderer
                      icon={h.icon || "TrendingUp"}
                      size="w-4 h-4"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[13px] text-[var(--text-primary)] truncate">
                        {h.symbol}
                      </span>
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded  font-medium bg-white/[0.08] text-[var(--text-tertiary)] uppercase">
                        {h.asset_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-tertiary)] truncate mt-0.5">
                      {h.name} · {formatHoldingUnits(h.units)}{" "}
                      {isIndonesian ? "unit" : "units"}
                    </p>
                  </div>
                </div>
                <div className="text-right  shrink-0 pl-2">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)] block leading-tight">
                    {isStealthMode ? "••••••••" : formatRupiah(val.marketValue)}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] mt-0.5">
                    <span
                      style={{
                        color:
                          val.floatingPnLPct >= 0
                            ? "var(--accent)"
                            : "var(--text-tertiary)",
                      }}
                    >
                      {val.floatingPnLPct >= 0 ? "+" : ""}
                      {val.floatingPnLPct.toFixed(1)}%
                    </span>
                    <span className="text-[var(--text-tertiary)] opacity-60">
                      ·
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      {weight.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Button to Open Consolidated Balance Sheet Drawer */}
          {(displayHoldings.length > 0 ||
            usdtPref.units > 0 ||
            recordedCryptoBalance > 0) && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIsConsolidatedDrawerOpen(true);
              }}
              className="w-full py-2.5 rounded-2xl bg-[var(--glass-fill)] hover:bg-[var(--glass-fill-strong)] border border-[var(--glass-border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all mt-1"
            >
              <Layers size={13} strokeWidth={2} />
              <span>
                {isIndonesian
                  ? `Buka Neraca Lengkap (${holdings.length + (usdtPref.units > 0 || recordedCryptoBalance > 0 ? 1 : 0)} Aset & Liabilitas)`
                  : `Open Consolidated Balance Sheet (${holdings.length + (usdtPref.units > 0 || recordedCryptoBalance > 0 ? 1 : 0)} Assets & Debt)`}
              </span>
              <ChevronRight size={13} strokeWidth={2} />
            </button>
          )}

          {displayHoldings.length === 0 &&
            usdtPref.units <= 0 &&
            recordedCryptoBalance <= 0 && (
              <div className="py-6 text-center space-y-1 text-[var(--text-tertiary)]">
                <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                  {isIndonesian
                    ? "Belum ada aset terdaftar"
                    : "No registered assets"}
                </p>
                <p className="text-[10.5px]">
                  {isIndonesian
                    ? "Ketuk tombol (+) di atas untuk menambahkan portofolio."
                    : "Tap the (+) button above to add investment assets."}
                </p>
              </div>
            )}
        </div>
      </section>

      {/* ── 6. Wealth History Card — Quiet Wealth × Liquid Island ── */}
      <section className="card-contrast-hero relative overflow-hidden select-none p-4 pb-3">
        {/* ─────────────────────────────────────────────
      Header
  ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <h2
            className={`
        text-[11px]
        font-semibold
        uppercase
        tracking-[0.075em]
        leading-none
        ${isDark ? "text-white/60" : "text-[var(--text-secondary)]"}
      `}
          >
            {isIndonesian ? "Riwayat Akumulasi Kekayaan" : "Wealth History"}
          </h2>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              toggleStealthMode();
            }}
            className={`
        -mr-1
        p-1.5
        rounded-full
        cursor-pointer
        transition-all
        duration-200
        active:scale-90
        ${
          isDark
            ? "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.035]"
        }
      `}
            title={isStealthMode ? "Show Balance" : "Hide Balance"}
            aria-label={isStealthMode ? "Show Balance" : "Hide Balance"}
          >
            {isStealthMode ? (
              <EyeOff size={15} strokeWidth={1.8} />
            ) : (
              <Eye size={15} strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* ─────────────────────────────────────────────
      Primary Wealth Value
      The visual hero of the card.
  ───────────────────────────────────────────── */}
        <div className="mb-2">
          <span
            className={`
        amount
        block
        text-[25px]
        leading-[1.05]
        font-medium
        tracking-[-0.028em]
        tabular-nums
        ${isDark ? "text-white" : "text-[var(--text-primary)]"}
      `}
          >
            {isStealthMode ? "Rp ••••••••" : formatRupiah(netWorth)}
          </span>
        </div>

        {/* ─────────────────────────────────────────────
      Performance / Period
      Quiet secondary information.
  ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div
            className={`
        flex
        min-w-0
        items-center
        gap-1
        text-[11px]
        font-semibold
        leading-none
        tracking-[-0.005em]
        tabular-nums
        ${isDark ? "text-white/72" : "text-[var(--text-secondary)]"}
      `}
          >
            <ArrowUpRight
              size={13}
              strokeWidth={2.1}
              className={`
          shrink-0
          transition-transform
          ${assetTrend.diff < 0 ? "rotate-90" : ""}
        `}
            />

            <span className="truncate">
              {isStealthMode
                ? "••••"
                : `${assetTrend.diff >= 0 ? "+" : ""}${formatRupiah(
                    assetTrend.diff,
                  )}`}
            </span>

            <span
              className={`
          shrink-0
          font-medium
          ${isDark ? "text-white/40" : "text-[var(--text-tertiary)]"}
        `}
            >
              (
              {isStealthMode
                ? "••••"
                : `${assetTrend.percent > 0 ? "+" : ""}${assetTrend.percent.toFixed(
                    2,
                  )}%`}
              )
            </span>
          </div>

          <span
            className={`
        shrink-0
        text-[10px]
        font-medium
        leading-none
        tracking-[0.01em]
        ${isDark ? "text-white/38" : "text-[var(--text-tertiary)]"}
      `}
          >
            {bsRangeLabels[bsRange]} · IDR
          </span>
        </div>

        {/* ─────────────────────────────────────────────
      Liquid Island Range Selector

      One surface, one active state.
      The selector should feel like a control
      rather than seven individual buttons.
  ───────────────────────────────────────────── */}
        <div
          className={`
      relative
      flex
      items-center
      w-full
      h-[30px]
      p-[3px]
      rounded-full
      overflow-hidden
      ${
        isDark
          ? "bg-white/[0.045] border border-white/[0.055]"
          : "bg-black/[0.025] border border-black/[0.045]"
      }
    `}
          style={{
            boxShadow: isDark
              ? "inset 0 1px 0 rgba(255,255,255,0.035)"
              : "inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {(
            ["1D", "7D", "1M", "3M", "6M", "1Y", "ALL"] as BalanceSheetRange[]
          ).map((r) => {
            const isActive = bsRange === r;

            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setBsRange(r);
                  triggerHaptic("light");
                }}
                className={`
            relative
            z-10
            flex-1
            h-full
            min-w-0
            rounded-full
            text-[10px]
            font-semibold
            leading-none
            tracking-[-0.005em]
            cursor-pointer
            select-none
            transition-all
            duration-200
            active:scale-[0.94]
            ${
              isActive
                ? isDark
                  ? "text-white"
                  : "text-[var(--bg-base)]"
                : isDark
                  ? "text-white/42 hover:text-white/68"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }
          `}
                style={{
                  background: isActive
                    ? isDark
                      ? "rgba(255,255,255,0.14)"
                      : "var(--text-primary)"
                    : "transparent",

                  border: isActive
                    ? isDark
                      ? "1px solid rgba(255,255,255,0.10)"
                      : "1px solid var(--text-primary)"
                    : "1px solid transparent",

                  boxShadow: isActive
                    ? isDark
                      ? "0 1px 3px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
                      : "0 1px 4px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.10)"
                    : "none",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Chart with Right Y-Axis & Dotted Grid */}
        <div className="h-[120px] w-full mt-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={assetTrend.chartData}
              margin={{ top: 4, right: 0, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="wealthHeroGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={isDark ? "#FFFFFF" : "#18181b"}
                    stopOpacity={isDark ? 0.25 : 0.12}
                  />
                  <stop
                    offset="100%"
                    stopColor={isDark ? "#FFFFFF" : "#18181b"}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 3"
                stroke={isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}
                vertical={true}
                horizontal={true}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 9,
                  fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
                  fontFamily: "Urbanist",
                  fontWeight: 600,
                }}
                axisLine={false}
                tickLine={false}
                dy={3}
              />
              <YAxis
                orientation="right"
                width={34}
                domain={["auto", "auto"]}
                tick={{
                  fontSize: 9,
                  fill: isDark ? "rgba(255,255,255,0.5)" : "#71717a",
                  fontFamily: "Urbanist",
                  fontWeight: 700,
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisY}
                dx={-2}
              />
              <Tooltip
                content={<GlassTooltip isStealthMode={isStealthMode} />}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={isDark ? "#FFFFFF" : "#18181b"}
                strokeWidth={2}
                fill="url(#wealthHeroGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: isDark ? "#FFFFFF" : "#18181b",
                  stroke: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
                  strokeWidth: 1.5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stocks-Style Summary Footer (4 columns: Tertinggi, Terendah, Injeksi MTD, Pasar Δ) */}
        <div
          className={`grid grid-cols-4 gap-1.5 pt-2.5 mt-1 border-t text-center ${
            isDark ? "border-white/10" : "border-black/[0.06]"
          }`}
        >
          <div>
            <p
              className={`text-[9px] font-semibold uppercase tracking-wider ${
                isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
              }`}
            >
              {isIndonesian ? "Tertinggi" : "High"}
            </p>
            <p
              className={`text-[11px] font-semibold amount mt-0.5 ${
                isDark ? "text-white" : "text-[var(--text-primary)]"
              }`}
            >
              {isStealthMode
                ? "••••"
                : chartPeak >= 1000
                  ? "Rp " + formatAxisY(chartPeak)
                  : formatRupiah(chartPeak)}
            </p>
          </div>
          <div>
            <p
              className={`text-[9px] font-semibold uppercase tracking-wider ${
                isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
              }`}
            >
              {isIndonesian ? "Terendah" : "Low"}
            </p>
            <p
              className={`text-[11px] font-semibold amount mt-0.5 ${
                isDark ? "text-white" : "text-[var(--text-primary)]"
              }`}
            >
              {isStealthMode
                ? "••••"
                : chartTrough >= 1000
                  ? "Rp " + formatAxisY(chartTrough)
                  : formatRupiah(chartTrough)}
            </p>
          </div>
          <div>
            <p
              className={`text-[9px] font-semibold uppercase tracking-wider ${
                isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
              }`}
            >
              {isIndonesian ? "Injeksi MTD" : "Inflow MTD"}
            </p>
            <p
              className={`text-[11px] font-semibold amount mt-0.5 ${
                isDark ? "text-white" : "text-[var(--text-primary)]"
              }`}
            >
              {isStealthMode
                ? "••••"
                : capitalDeployment > 0
                  ? "+Rp " + formatAxisY(capitalDeployment)
                  : "Rp 0"}
            </p>
          </div>
          <div>
            <p
              className={`text-[9px] font-semibold uppercase tracking-wider ${
                isDark ? "text-white/45" : "text-[var(--text-tertiary)]"
              }`}
            >
              {isIndonesian ? "Ekuitas Δ" : "Equity Δ"}
            </p>
            <p
              className={`text-[11px] font-semibold amount mt-0.5 ${
                isDark ? "text-white" : "text-[var(--text-primary)]"
              }`}
            >
              {isStealthMode
                ? "••••"
                : `${assetTrend.diff >= 0 ? "+" : "-"}Rp ${formatAxisY(Math.abs(assetTrend.diff))}`}
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. Portfolio Health & Risk Intelligence Deck ── */}
      <PortfolioIntelligenceDeck
        holdings={holdings}
        wallets={wallets}
        netWorth={netWorth}
        totalLiabilities={liabilitiesTotal}
      />

      {/* ── 9. Preset Picker Sheet (Standard BottomSheet) ─────────────────── */}
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
              [\n                { key: "all", label: isIndonesian ? "Semua" : "All" },
                { key: "crypto", label: "Crypto" },
                {
                  key: "valas",
                  label: isIndonesian ? "Valas" : "FX / Valas",
                },
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
                      <span className="font-semibold  text-[13px] text-[var(--text-primary)]">
                        {preset.symbol}
                      </span>
                      {preset.suggestedCurrency && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded  font-semibold bg-white/[0.08] text-[var(--text-secondary)]">
                          {preset.suggestedCurrency}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate block mt-0.5">
                      {preset.name}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase  font-semibold px-2 py-0.5 rounded-lg bg-white/[0.06] text-[var(--text-tertiary)]">
                  {preset.type.replace("_", " ")}
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
                className="w-full px-3 py-2.5 rounded-2xl text-[13px] font-semibold  outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
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
                className="w-full px-3 py-2.5 rounded-2xl text-[13px]  font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
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
                className="w-full px-3 py-2.5 rounded-2xl text-[13px]  font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
              />
              {formCurrency === "USD" && formBuyPrice && (
                <p className="text-[10px] text-[var(--text-tertiary)]  mt-1">
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
              className="w-full px-3 py-2.5 rounded-2xl text-[13px]  font-semibold outline-none border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-primary)]"
            />
            {formCurrency === "USD" && formCurrentPrice && (
              <p className="text-[10px] text-[var(--text-tertiary)]  mt-1">
                ≈{" "}
                {formatRupiah(
                  parseFloat(formCurrentPrice || "0") * usdtPref.rate,
                )}
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
              className="flex-1 py-3 rounded-2xl text-[12.5px] font-semibold border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer text-center"
            >
              {isIndonesian ? "Batal" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSaveNewHolding}
              className="flex-[2] py-3 rounded-2xl text-[12.5px] font-semibold active:scale-95 transition-all cursor-pointer shadow-md text-center"
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

      {/* ── Consolidated Balance Sheet Drawer (All Assets & Liabilities) ── */}
      <ConsolidatedBalanceSheetDrawer
        isOpen={isConsolidatedDrawerOpen}
        onClose={() => setIsConsolidatedDrawerOpen(false)}
        netWorth={netWorth}
        totalGrossAssets={totalGrossAssets}
        liabilitiesTotal={liabilitiesTotal}
        liquidAssetsTotal={liquidAssetsTotal}
        growthAssetsTotal={growthAssetsTotal}
        fixedAssetsTotal={fixedAssetsTotal}
        usdtPref={usdtPref}
        usdtMarketValue={usdtMarketValue}
        usdtFloatingPnLPct={usdtFloatingPnLPct}
        suggestedUsdtUnits={suggestedUsdtUnits}
        recordedCryptoBalance={recordedCryptoBalance}
        wallets={wallets}
        liquidHoldings={liquidHoldings}
        fixedHoldings={fixedHoldings}
        onOpenUsdtDetail={openUsdtDetail}
        onOpenHoldingDetail={handleOpenHoldingDetail}
        isStealthMode={isStealthMode}
        isIndonesian={isIndonesian}
        isDark={isDark}
      />

      {/* ── Metric Telemetry Drill-Down Sheet (6 Half-Cards) ── */}
      <AssetMetricDrillDownSheet
        data={selectedMetricDrillDown}
        onClose={() => setSelectedMetricDrillDown(null)}
        isStealthMode={isStealthMode}
        isIndonesian={isIndonesian}
      />
    </div>
  );
}
