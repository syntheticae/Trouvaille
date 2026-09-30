// ======================================================================
// TROUVAILLE PORTFOLIO INTELLIGENCE DECK
// Consolidated from Statistics to AssetsPage:
// 1. Unrealized Performance (Floating Yield & ROI)
// 2. Risk & Volatility Exposure Profile (Defensive vs Volatile Tiers)
// 3. Wealth Intelligence & Tactical Insights
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import { useState, useMemo } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  Scale,
  ArrowUpRight,
} from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { usePrivacy } from "../../contexts/PrivacyContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  getSavedUsdtPref,
  calculateHoldingValuation,
} from "../../lib/marketPriceService";
import type { InvestmentHolding, Wallet } from "../../lib/types";
import { useWalletBalances } from "../../hooks/useWalletBalances";

interface PortfolioIntelligenceDeckProps {
  holdings: InvestmentHolding[];
  wallets: Wallet[];
  netWorth: number;
  totalLiabilities?: number;
  monthlyBurnRate?: number;
}

export function PortfolioIntelligenceDeck({
  holdings = [],
  wallets = [],
  netWorth: _netWorth = 0,
  totalLiabilities = 0,
  monthlyBurnRate = 3500000,
}: PortfolioIntelligenceDeckProps) {
  const { isIndonesian } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { isStealthMode: hideBalance } = usePrivacy();
  const { user } = useAuth();
  const [activeTelemetryTab, setActiveTelemetryTab] = useState<"performance" | "risk">("performance");

  // 1. USDT & Recorded Wallet Balances
  const usdtPref = useMemo(() => getSavedUsdtPref(user?.id), [user?.id, holdings]);
  const usdtHolding = useMemo(
    () => holdings.find((h) => h.symbol?.toUpperCase() === "USDT"),
    [holdings],
  );
  const { balancesById } = useWalletBalances();

  const isCryptoOrInvWallet = (w: Wallet) => {
    const lower = (w.name || "").toLowerCase();
    return (
      w.classification === "investment" ||
      lower.includes("crypto") ||
      lower.includes("usdt") ||
      lower.includes("tether") ||
      lower.includes("binance") ||
      lower.includes("tokocrypto") ||
      lower.includes("bybit") ||
      lower.includes("indodax") ||
      lower.includes("pintu")
    );
  };

  const recordedCryptoBalance = useMemo(() => {
    return wallets
      .filter(isCryptoOrInvWallet)
      .reduce(
        (sum, w) => sum + Math.max(0, balancesById[w.id] ?? Number(w.balance || 0)),
        0,
      );
  }, [wallets, balancesById]);

  const usdtUnits = usdtHolding?.units || usdtPref.units || 0;
  const usdtRate = usdtHolding?.current_price || usdtPref.rate || 16300;
  const usdtCostBasis =
    usdtHolding?.avg_buy_price && usdtUnits > 0
      ? Math.round(usdtUnits * usdtHolding.avg_buy_price)
      : usdtPref.costBasis && usdtPref.costBasis > 0
        ? usdtPref.costBasis
        : recordedCryptoBalance > 0
          ? recordedCryptoBalance
          : 0;
  const usdtMarketValue =
    usdtUnits > 0 ? Math.round(usdtUnits * usdtRate) : recordedCryptoBalance;
  const usdtFloatingPnL = usdtMarketValue - usdtCostBasis;

  // 2. Other Holdings Valuations
  const otherValuations = useMemo(() => {
    return holdings
      .filter((h) => h.symbol?.toUpperCase() !== "USDT")
      .map((h) => {
        const val = calculateHoldingValuation(h);
        return {
          ...h,
          costBasis: val.costBasis,
          marketValue: val.marketValue,
          floatingPnL: val.floatingPnL,
        };
      });
  }, [holdings]);

  const totalOtherCostBasis = otherValuations.reduce((sum, h) => sum + h.costBasis, 0);
  const totalOtherMarketValue = otherValuations.reduce((sum, h) => sum + h.marketValue, 0);
  const totalOtherFloatingPnL = otherValuations.reduce((sum, h) => sum + h.floatingPnL, 0);

  // Total Invested Capital & Floating P&L
  const totalInvestedCostBasis = usdtCostBasis + totalOtherCostBasis;
  const totalMarketValuation = usdtMarketValue + totalOtherMarketValue;
  const totalFloatingPnL = usdtFloatingPnL + totalOtherFloatingPnL;
  const totalFloatingPct =
    totalInvestedCostBasis > 0 ? (totalFloatingPnL / totalInvestedCostBasis) * 100 : 0;

  // 3. Risk & Volatility Tiers
  // Tier 1: Defensive Liquid (Pure operating Cash, Bank, e-Money — excluding Crypto/USDT)
  const defensiveLiquid = useMemo(() => {
    return wallets
      .filter(
        (w) =>
          w.classification !== "credit" &&
          w.classification !== "loan" &&
          !isCryptoOrInvWallet(w),
      )
      .reduce(
        (sum, w) => sum + Math.max(0, balancesById[w.id] ?? Number(w.balance || 0)),
        0,
      );
  }, [wallets, balancesById]);

  // Tier 2: Stable / Fixed Income (Gold, Property, Fixed Assets)
  const stableFixed = otherValuations
    .filter((h) => h.asset_type === "fixed_asset" || h.asset_type === "gold")
    .reduce((sum, h) => sum + h.marketValue, 0);

  // Tier 3: Growth / Volatile (Equities, Crypto, USDT)
  const growthVolatile =
    usdtMarketValue +
    otherValuations
      .filter((h) => h.asset_type === "crypto" || h.asset_type === "stock")
      .reduce((sum, h) => sum + h.marketValue, 0);

  const grossPortfolioSum = Math.max(1, defensiveLiquid + stableFixed + growthVolatile);
  const defensiveShare = (defensiveLiquid / grossPortfolioSum) * 100;
  const stableShare = (stableFixed / grossPortfolioSum) * 100;
  const volatileShare = (growthVolatile / grossPortfolioSum) * 100;

  // Risk Profile Badge
  const riskProfile =
    volatileShare > 50
      ? { label: isIndonesian ? "Agresif" : "Aggressive", desc: isIndonesian ? "Fokus pada pertumbuhan tinggi & volatilitas" : "High growth & volatility bias" }
      : volatileShare > 25
        ? { label: isIndonesian ? "Moderat" : "Moderate", desc: isIndonesian ? "Keseimbangan seimbang antara stabilitas & pertumbuhan" : "Balanced growth with risk buffer" }
        : { label: isIndonesian ? "Defensif" : "Defensive", desc: isIndonesian ? "Didominasi modal likuid & lindung nilai modal" : "Capital preservation focus" };

  // 4. Emergency Runway & Tactical Insights Engine
  const emergencyRunwayMonths = monthlyBurnRate > 0 ? defensiveLiquid / monthlyBurnRate : 0;
  const leverageRatio = grossPortfolioSum > 0 ? (totalLiabilities / grossPortfolioSum) * 100 : 0;
  const usdtShare = grossPortfolioSum > 0 ? (usdtMarketValue / grossPortfolioSum) * 100 : 0;

  // Single-Asset Dominance / Concentration Analysis
  const allInvestmentsList = useMemo(() => {
    const list: Array<{ name: string; symbol: string; marketValue: number }> = otherValuations.map((h) => ({
      name: h.name || h.symbol || "Asset",
      symbol: h.symbol || "",
      marketValue: h.marketValue,
    }));
    if (usdtMarketValue > 0) {
      list.push({ name: "Tether USD", symbol: "USDT", marketValue: usdtMarketValue });
    }
    return list.sort((a, b) => b.marketValue - a.marketValue);
  }, [otherValuations, usdtMarketValue]);

  const largestAsset = allInvestmentsList[0];
  const largestAssetShare =
    largestAsset && grossPortfolioSum > 0 ? (largestAsset.marketValue / grossPortfolioSum) * 100 : 0;

  // Adaptive Multi-Scenario Tactical Insights Engine
  const tacticalInsights = useMemo(() => {
    interface InsightItem {
      id: string;
      tag: string;
      title: string;
      description: string;
      priority: number;
    }

    const pool: InsightItem[] = [];

    // --- CONDITION 1: LIQUIDITY & EMERGENCY RUNWAY ---
    if (emergencyRunwayMonths < 2.5 && monthlyBurnRate > 0) {
      pool.push({
        id: "runway_critical",
        tag: isIndonesian ? "Peringatan Likuiditas" : "Liquidity Alert",
        title: isIndonesian ? "Bantalan Kas Operasional Kritis" : "Critical Cash Runway Buffer",
        description: isIndonesian
          ? `Cadangan kas defensif hanya menopang ${emergencyRunwayMonths.toFixed(1)} bulan pengeluaran rutin. Dalam krisis tak terduga, Anda rentan terpaksa melikuidasi aset bertumbuh pada valuasi rendah. Prioritaskan ekspansi dana darurat minimal 3–6 bulan.`
          : `Defensive cash only covers ${emergencyRunwayMonths.toFixed(1)} months of burn. In unexpected crises, you risk forced liquidation of growth assets at market discounts. Prioritize building emergency reserves to 3-6 months.`,
        priority: 100,
      });
    } else if (emergencyRunwayMonths > 14) {
      pool.push({
        id: "runway_extended",
        tag: isIndonesian ? "Benteng Kas" : "Cash Fortress",
        title: isIndonesian ? "Surplus Landasan Kas Multi-Tahun" : "Multi-Year Survival Fortress",
        description: isIndonesian
          ? `Dengan ${emergencyRunwayMonths.toFixed(0)} bulan biaya hidup aman di kas likuid, benteng likuiditas Anda sangat kokoh. Surplus kas melebihi 12 bulan dapat dialokasikan bertahap ke instrumen produktif guna mencegah erosi inflasi.`
          : `Holding ${emergencyRunwayMonths.toFixed(0)} months of expenses in cash grants bulletproof stability. Idle cash beyond 12 months can be opportunistically deployed into productive compounding assets to prevent real inflation drag.`,
        priority: 65,
      });
    } else {
      pool.push({
        id: "runway_optimal",
        tag: isIndonesian ? "Ketangkasan Modal" : "Capital Agility",
        title: isIndonesian ? "Landasan Likuiditas Tangguh" : "Resilient Survival Agility",
        description: isIndonesian
          ? `Cadangan kas defensif Anda menopang ${emergencyRunwayMonths.toFixed(1)} bulan pengeluaran tanpa perlu mencairkan paksa aset portofolio, memberikan kebebasan waktu bagi tesis investasi Anda untuk matang.`
          : `Your defensive liquid cash provides ${emergencyRunwayMonths.toFixed(1)} months of burn protection without requiring forced asset sales, allowing your investments time to compound.`,
        priority: 60,
      });
    }

    // --- CONDITION 2: CONCENTRATION & SINGLE-ASSET RISK ---
    if (largestAsset && largestAssetShare >= 40 && grossPortfolioSum > 0) {
      pool.push({
        id: "concentration_risk",
        tag: isIndonesian ? "Konsentrasi" : "Concentration",
        title: isIndonesian ? "Dominasi Aset Tunggal Signifikan" : "Single Asset Dominance",
        description: isIndonesian
          ? `Instrumen ${largestAsset.name} menguasai ${largestAssetShare.toFixed(1)}% dari total kekayaan portofolio. Konsentrasi asimetris ini memperbesar risiko volatilitas tunggal; pertimbangkan diversifikasi bertahap ke sektor yang tidak berkorelasi.`
          : `${largestAsset.name} accounts for ${largestAssetShare.toFixed(1)}% of your total portfolio. This heavy weighting creates asymmetric dependency; consider trimming or diversifying into uncorrelated asset classes.`,
        priority: 95,
      });
    }

    // --- CONDITION 3: DEBT & LEVERAGE SOLVENCY ---
    if (leverageRatio >= 30) {
      pool.push({
        id: "leverage_warning",
        tag: isIndonesian ? "Peringatan Utang" : "Leverage Warning",
        title: isIndonesian ? "Rasio Liabilitas Mendekati Batas Risiko" : "Elevated Debt-to-Asset Ratio",
        description: isIndonesian
          ? `Total liabilitas mewakili ${leverageRatio.toFixed(1)}% dari nilai aset kotor (di atas ambang aman konservatif 30%). Prioritaskan akselerasi pelunasan utang sebelum memperbesar posisi spekulatif.`
          : `Liabilities represent ${leverageRatio.toFixed(1)}% of gross asset valuation (above the conservative 30% ceiling). Prioritize debt amortization to relieve monthly cashflow drag before taking on higher beta risks.`,
        priority: 90,
      });
    } else if (totalLiabilities === 0) {
      pool.push({
        id: "debt_free",
        tag: isIndonesian ? "Struktur Neraca" : "Balance Sheet",
        title: isIndonesian ? "Solvabilitas Ekuitas 100% Bebas Utang" : "Unencumbered Balance Sheet",
        description: isIndonesian
          ? `Neraca aset Anda beroperasi dengan nol liabilitas utang, memastikan seluruh imbal hasil pertumbuhan modal terakumulasi utuh tanpa tergerus beban bunga pinjaman.`
          : `Your balance sheet carries zero liabilities, ensuring 100% equity retention and zero recurring interest payments dragging on your monthly capital accumulation.`,
        priority: 50,
      });
    } else {
      pool.push({
        id: "leverage_prudent",
        tag: isIndonesian ? "Solvabilitas" : "Solvency",
        title: isIndonesian ? "Leverage Terkendali & Aman" : "Conservative Leverage Health",
        description: isIndonesian
          ? `Rasio utang terhadap aset tercatat ${leverageRatio.toFixed(1)}%, berada jauh di dalam batas aman 30% sehingga ketahanan solvabilitas portofolio tetap prima.`
          : `Liabilities stand at ${leverageRatio.toFixed(1)}% of gross asset value, comfortably within healthy benchmark thresholds (<30%) and preserving liquidity agility.`,
        priority: 52,
      });
    }

    // --- CONDITION 4: PERFORMANCE & FLOATING RETURN DYNAMICS ---
    if (totalFloatingPct >= 20 && totalFloatingPnL > 1000000) {
      pool.push({
        id: "pnl_harvest",
        tag: isIndonesian ? "Ekspansi Modal" : "Capital Gain",
        title: isIndonesian ? "Peluang Penguncian Keuntungan Siklikal" : "Profit Harvesting Window",
        description: isIndonesian
          ? `Keuntungan modal mengambang portofolio mencapai +${totalFloatingPct.toFixed(1)}% (+${formatRupiah(totalFloatingPnL)}). Pertimbangkan mengunci sebagian profit siklikal ke brankas defensif atau emas fisik guna memproteksi nilai kekayaan bersih.`
          : `Floating returns stand at +${totalFloatingPct.toFixed(1)}% (+${formatRupiah(totalFloatingPnL)}). Consider systematically harvesting a portion of cyclical gains into defensive vaults or gold to lock in baseline net worth.`,
        priority: 85,
      });
    } else if (totalFloatingPct <= -12) {
      pool.push({
        id: "pnl_drawdown",
        tag: isIndonesian ? "Mitigasi Risiko" : "Drawdown Strategy",
        title: isIndonesian ? "Manajemen Penurunan Modal & Valuasi Diskon" : "Drawdown Defense & Valuation Discount",
        description: isIndonesian
          ? `Portofolio mencatat kontraksi mengambang ${totalFloatingPct.toFixed(1)}% (${formatRupiah(totalFloatingPnL)}). Hindari panic selling; telaah kembali tesis dasar untuk mempertimbangkan cicil akumulasi (DCA) pada harga diskon.`
          : `Portfolio reflects an unrealized contraction of ${totalFloatingPct.toFixed(1)}% (${formatRupiah(totalFloatingPnL)}). Avoid panic liquidations; evaluate whether core fundamentals justify selective dollar-cost averaging at discount valuations.`,
        priority: 82,
      });
    }

    // --- CONDITION 5: ALLOCATION & RISK STANCE PROFILE ---
    if (volatileShare >= 65) {
      pool.push({
        id: "stance_aggressive",
        tag: isIndonesian ? "Profil Risiko" : "Risk Profile",
        title: isIndonesian ? "Alokasi Pertumbuhan Agresif Ber-Beta Tinggi" : "High Growth & Beta Stance",
        description: isIndonesian
          ? `Aset bertumbuh volatil (saham & kripto) mendominasi ${volatileShare.toFixed(1)}% dari total portofolio. Posisi ini memaksimalkan akselerasi modal di siklus bull run, namun siapkan aturan stop-loss atau rebalancing sistematis.`
          : `Growth and volatile assets comprise ${volatileShare.toFixed(1)}% of your capital. While maximizing upside in market expansions, establish disciplined rebalancing triggers to withstand cyclical retracements.`,
        priority: 78,
      });
    } else if (defensiveShare >= 65 && totalInvestedCostBasis > 0) {
      pool.push({
        id: "stance_defensive_drag",
        tag: isIndonesian ? "Efisiensi Modal" : "Capital Efficiency",
        title: isIndonesian ? "Potensi Hambatan Kas Defensif (Cash Drag)" : "Defensive Cash Drag & Inflation Risk",
        description: isIndonesian
          ? `Cadangan kas likuid mencapai ${defensiveShare.toFixed(1)}% dari portofolio. Walau risiko pasar minim, porsi kas mengendap yang terlalu besar rentan tergerus inflasi riil. Eksplorasi penempatan bertahap pada aset berimbal hasil stabil.`
          : `Liquid cash constitutes ${defensiveShare.toFixed(1)}% of your portfolio. While downside risk is zero, excessive uninvested cash risks real purchasing power erosion against inflation. Consider laddering into low-volatility yield instruments.`,
        priority: 76,
      });
    } else if (
      defensiveShare >= 15 &&
      defensiveShare <= 45 &&
      stableShare >= 10 &&
      volatileShare >= 25 &&
      volatileShare <= 55
    ) {
      pool.push({
        id: "stance_balanced",
        tag: isIndonesian ? "Arsitektur Modal" : "Portfolio Health",
        title: isIndonesian ? "Keseimbangan Institusional Multi-Musim" : "All-Weather Institutional Balance",
        description: isIndonesian
          ? `Alokasi modal Anda mencerminkan arsitektur institusional yang prima (${defensiveShare.toFixed(0)}% Defensif, ${stableShare.toFixed(0)}% Stabil, ${volatileShare.toFixed(0)}% Pertumbuhan), memberikan peredam kejut tanpa mengorbankan kecepatan imbal hasil.`
          : `Your capital split exhibits an exemplary all-weather balance (${defensiveShare.toFixed(0)}% Defensive, ${stableShare.toFixed(0)}% Stable, ${volatileShare.toFixed(0)}% Growth), offering robust shock absorption while sustaining steady compounding.`,
        priority: 72,
      });
    }

    // --- CONDITION 6: CURRENCY & GLOBAL HEDGING ---
    if (usdtShare >= 8) {
      pool.push({
        id: "fx_hedged",
        tag: isIndonesian ? "Ketahanan Makro" : "Macro Hedge",
        title: isIndonesian ? "Bantalan Valuta Global & Lindung Nilai Kurs" : "Currency Hedge & Foreign Resilience",
        description: isIndonesian
          ? `Instrumen valuta global & USDT mewakili ${usdtShare.toFixed(1)}% dari total aset Anda. Porsi ini menjadi bantalan lindung nilai alami terhadap pelemahan nilai tukar domestik dan inflasi makro.`
          : `Global currency & USDT instruments represent ${usdtShare.toFixed(1)}% of your portfolio, acting as a natural currency hedge against domestic exchange rate depreciation.`,
        priority: 68,
      });
    } else if (usdtShare === 0 && grossPortfolioSum > 10000000 && growthVolatile > 0) {
      pool.push({
        id: "fx_domestic_only",
        tag: isIndonesian ? "Eksposur Kurs" : "FX Exposure",
        title: isIndonesian ? "Konsentrasi Penuh pada Mata Uang Domestik" : "100% Domestic Currency Exposure",
        description: isIndonesian
          ? `Seluruh aset portofolio terikat pada mata uang domestik. Mempertimbangkan porsi 5–15% pada aset berdenominasi global atau emas fisik dapat menambah ketahanan terhadap pergeseran makroekonomi.`
          : `100% of your portfolio is denominated in domestic currency. Introducing a modest 5–15% allocation in global stablecoins or physical gold can enhance macroeconomic resilience.`,
        priority: 58,
      });
    }

    // Sort by priority descending and take top 3
    return pool.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }, [
    isIndonesian,
    emergencyRunwayMonths,
    monthlyBurnRate,
    largestAsset,
    largestAssetShare,
    grossPortfolioSum,
    leverageRatio,
    totalLiabilities,
    totalFloatingPct,
    totalFloatingPnL,
    volatileShare,
    defensiveShare,
    stableShare,
    totalInvestedCostBasis,
    usdtShare,
    growthVolatile,
  ]);

  return (
    <section className="space-y-4 select-none">
      {/* ── Unified Portfolio Performance & Risk Profile (Segmented) ── */}
      <div
        className="p-5 rounded-[24px] space-y-4 relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header with Segmented Switcher (Zero Text Cutoff) */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              {activeTelemetryTab === "performance" ? (
                <TrendingUp size={15} strokeWidth={1.75} />
              ) : (
                <Scale size={15} strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0">
              <h2
                className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight whitespace-nowrap"
              >
                {isIndonesian ? "Performa & Risiko" : "Performance & Risk"}
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] leading-tight mt-0.5 whitespace-nowrap">
                {activeTelemetryTab === "performance"
                  ? (isIndonesian
                      ? "Hasil modal mengambang"
                      : "Floating capital yield")
                  : (isIndonesian
                      ? "Alokasi jenjang risiko"
                      : "Risk tier allocation")}
              </p>
            </div>
          </div>

          {/* Segmented Switcher Pill (Apple Luxury Minimal) */}
          <div
            className="flex items-center p-0.5 rounded-full shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTelemetryTab("performance");
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer"
              style={
                activeTelemetryTab === "performance"
                  ? {
                      background: "var(--text-primary)",
                      color: "var(--bg-base)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    }
                  : {
                      color: "var(--text-secondary)",
                    }
              }
            >
              {isIndonesian ? "Performa" : "Performance"}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTelemetryTab("risk");
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 cursor-pointer"
              style={
                activeTelemetryTab === "risk"
                  ? {
                      background: "var(--text-primary)",
                      color: "var(--bg-base)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    }
                  : {
                      color: "var(--text-secondary)",
                    }
              }
            >
              {isIndonesian ? "Risiko" : "Risk"}
            </button>
          </div>
        </div>

        {/* Dynamic Tab 1: Unrealized Performance */}
        {activeTelemetryTab === "performance" && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Top Sub-Header Strip with ROI Badge (Strictly Monochrome - No Green/Red) */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Efisiensi Hasil Mengambang" : "Floating Yield Efficiency"}
              </span>

              <div
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <ArrowUpRight
                  size={12}
                  className={totalFloatingPnL < 0 ? "rotate-90 text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}
                />
                <span>
                  {totalFloatingPct >= 0 ? "+" : ""}
                  {totalFloatingPct.toFixed(1)}% ROI
                </span>
              </div>
            </div>

            {/* 2-Column Metric Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="p-3.5 rounded-2xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Floating P&amp;L
                </span>
                <p
                  className="text-[17px] font-semibold amount tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hideBalance
                    ? "••••"
                    : `${totalFloatingPnL >= 0 ? "+" : ""}${formatRupiah(totalFloatingPnL)}`}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {isIndonesian ? "Keuntungan modal bersih" : "Net floating return"}
                </p>
              </div>

              <div
                className="p-3.5 rounded-2xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Nilai Pasar Portofolio" : "Market Valuation"}
                </span>
                <p
                  className="text-[17px] font-semibold amount tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {hideBalance ? "••••" : formatRupiah(totalMarketValuation)}
                </p>
                <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
                  {isIndonesian ? "Modal Pokok:" : "Cost Basis:"}{" "}
                  {hideBalance ? "••••" : formatRupiah(totalInvestedCostBasis)}
                </p>
              </div>
            </div>

            {/* Capital Expansion Ratio Bar */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: "var(--text-tertiary)" }}>
                  {isIndonesian ? "Rasio Ekspansi Modal" : "Capital Expansion Ratio"}
                </span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {(1 + Math.max(0, totalFloatingPct) / 100).toFixed(2)}x
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.08] dark:bg-white/[0.08] overflow-hidden flex">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (100 / Math.max(100, 100 + totalFloatingPct)) * 100)}%`,
                    background: isDark ? "rgba(255,255,255,0.4)" : "rgba(24,24,27,0.4)",
                  }}
                  title="Cost Basis"
                />
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (Math.max(0, totalFloatingPct) / Math.max(100, 100 + totalFloatingPct)) * 100)}%`,
                    background: isDark ? "#FFFFFF" : "#18181B",
                    boxShadow: isDark && totalFloatingPnL > 0 ? "0 0 8px rgba(255,255,255,0.4)" : undefined,
                  }}
                  title="Floating Gain"
                />
              </div>
              <div className="flex justify-between text-[9px] pt-0.5" style={{ color: "var(--text-tertiary)" }}>
                <span>{isIndonesian ? "Modal Pokok (100%)" : "Invested Cost (100%)"}</span>
                <span>
                  {isIndonesian ? "Pertumbuhan" : "Gain"} ({totalFloatingPct >= 0 ? "+" : ""}
                  {totalFloatingPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Tab 2: Risk & Volatility Profile */}
        {activeTelemetryTab === "risk" && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Top Sub-Header Strip with Risk Profile Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                {isIndonesian ? "Kategori Toleransi Risiko" : "Risk Tolerance Stance"}
              </span>

              <div
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                {riskProfile.label}
              </div>
            </div>

            {/* 3-Segment Proportional Bar (Apple Battery / Health Style) */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-white/[0.08] dark:bg-white/[0.08] overflow-hidden flex gap-0.5 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${defensiveShare}%`,
                    background: isDark ? "#FFFFFF" : "#18181B",
                  }}
                  title={`Defensif: ${defensiveShare.toFixed(1)}%`}
                />
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stableShare}%`,
                    background: isDark ? "rgba(255,255,255,0.45)" : "rgba(24,24,27,0.45)",
                  }}
                  title={`Stabil: ${stableShare.toFixed(1)}%`}
                />
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${volatileShare}%`,
                    background: isDark ? "rgba(255,255,255,0.2)" : "rgba(24,24,27,0.2)",
                  }}
                  title={`Volatil: ${volatileShare.toFixed(1)}%`}
                />
              </div>
            </div>

            {/* 3-Tier Metric Breakdown */}
            <div className="grid grid-cols-3 gap-2">
              {/* Tier 1: Defensive Liquid */}
              <div
                className="p-3 rounded-xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-1">
                  <ShieldCheck size={11} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-tertiary)" }}>
                    {isIndonesian ? "Defensif" : "Defensive"}
                  </span>
                </div>
                <p className="text-[13px] font-semibold amount" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "••••" : formatRupiah(defensiveLiquid)}
                </p>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {defensiveShare.toFixed(1)}%
                </p>
              </div>

              {/* Tier 2: Stable / Fixed Assets */}
              <div
                className="p-3 rounded-xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-1">
                  <Scale size={11} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-tertiary)" }}>
                    {isIndonesian ? "Stabil" : "Stable"}
                  </span>
                </div>
                <p className="text-[13px] font-semibold amount" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "••••" : formatRupiah(stableFixed)}
                </p>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {stableShare.toFixed(1)}%
                </p>
              </div>

              {/* Tier 3: Growth / Volatile */}
              <div
                className="p-3 rounded-xl space-y-1"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-1">
                  <Zap size={11} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-tertiary)" }}>
                    {isIndonesian ? "Pertumbuhan" : "Growth"}
                  </span>
                </div>
                <p className="text-[13px] font-semibold amount" style={{ color: "var(--text-primary)" }}>
                  {hideBalance ? "••••" : formatRupiah(growthVolatile)}
                </p>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {volatileShare.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Mini Telemetry Footer (Monochrome, 1 Line) */}
        <div
          className="pt-2.5 border-t border-[var(--glass-border)] flex items-center justify-between text-[10.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>
            {isIndonesian ? "Profil:" : "Stance:"}{" "}
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {riskProfile.label} ({volatileShare.toFixed(1)}% {isIndonesian ? "Pertumbuhan" : "Growth"})
            </strong>
          </span>
          <span>
            {isIndonesian ? "Ekspansi:" : "Expansion:"}{" "}
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {(1 + Math.max(0, totalFloatingPct) / 100).toFixed(2)}x
            </strong>
          </span>
        </div>
      </div>

      {/* ── C. Wealth Intelligence & Actionable Insights ── */}
      <div
        className="p-4 rounded-[22px] space-y-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={15} strokeWidth={1.75} style={{ color: "var(--text-tertiary)" }} />
          <h3
            className="text-[12px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Wawasan Taktis Kekayaan" : "Wealth Tactical Insights"}
          </h3>
        </div>

        <div className="space-y-2.5 text-[11px] leading-relaxed">
          {tacticalInsights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: isDark ? "#FFFFFF" : "#09090C" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "var(--glass-fill)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {insight.tag}
                  </span>
                  <strong
                    className="text-[11.5px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {insight.title}:
                  </strong>
                </div>
                <p style={{ color: "var(--text-secondary)" }}>
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
