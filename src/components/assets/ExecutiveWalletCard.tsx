import { useState, useRef, useMemo } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import type { Wallet as WalletType, InvestmentHolding } from "../../lib/types";

interface ExecutiveWalletCardProps {
  netWorth: number;
  totalGrossAssets: number;
  liabilitiesTotal: number;
  solvencyScore: number;
  isStealthMode: boolean;
  toggleStealthMode: () => void;
  isIndonesian: boolean;
  isDark: boolean;
  wallets?: WalletType[];
  holdings?: InvestmentHolding[];
  onDetailAsset?: (holdingOrId?: InvestmentHolding | string) => void;
  userName?: string;
  usdtRate?: number;
  usdtUnits?: number;
}

export function ExecutiveWalletCard({
  netWorth,
  totalGrossAssets,
  liabilitiesTotal,
  solvencyScore,
  isStealthMode,
  toggleStealthMode,
  isIndonesian,
  isDark,
  wallets = [],
  holdings = [],
  onDetailAsset,
  usdtRate = 15850,
  usdtUnits = 0,
}: ExecutiveWalletCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // ── DYNAMIC ZERO-DUMMY REAL ASSET CARDS ─────────────────────────────
  // Only display real assets actually owned by the user (USDT, real holdings, real cash wallets, and consolidated equity)
  const rawCards = useMemo(() => {
    const list: Array<{
      id: string;
      holdingRef?: InvestmentHolding;
      walletRef?: WalletType;
      name: string;
      category: string;
      balance: number;
      allocation: number;
      metadata: string;
      trendText: string;
      livePrice: string;
      sparklinePoints: string;
      sparklineArea: string;
      sparklinePeakY: number;
    }> = [];

    // 1. USDT Holding Card (If user owns USDT)
    const effectiveUsdtUnits = usdtUnits;
    const usdtHolding = holdings.find((h) => h.symbol?.toUpperCase() === "USDT");
    const finalUsdtUnits = effectiveUsdtUnits > 0 ? effectiveUsdtUnits : (usdtHolding?.units ?? 0);

    if (finalUsdtUnits > 0) {
      const usdtBalance = finalUsdtUnits * usdtRate;
      const alloc = totalGrossAssets > 0 ? Math.min(100, Math.round((usdtBalance / totalGrossAssets) * 100)) : 100;
      const usdtObj: InvestmentHolding = usdtHolding || {
        id: "usdt-card",
        symbol: "USDT",
        name: "Tether USD",
        asset_type: "crypto",
        units: finalUsdtUnits,
        avg_buy_price: usdtRate,
        current_price: usdtRate,
        currency: "IDR",
        icon: "Coins",
      };

      list.push({
        id: "card-usdt",
        holdingRef: usdtObj,
        name: "Tether USD (USDT)",
        category: "CRYPTO · STABLECOIN",
        balance: usdtBalance,
        allocation: alloc,
        metadata: `${finalUsdtUnits.toLocaleString()} USDT • ${isIndonesian ? "Aktif" : "Active"}`,
        trendText: "▲ 0.0%",
        livePrice: `${formatRupiah(usdtRate)} / USDT`,
        sparklinePoints: "M 0 16 Q 25 14 50 16 T 80 15 T 100 16",
        sparklineArea: "M 0 16 Q 25 14 50 16 T 80 15 T 100 16 L 100 32 L 0 32 Z",
        sparklinePeakY: 16,
      });
    }

    // 2. Real Non-USDT Holdings (BTC, Equities, Gold, etc. with positive units)
    const realHoldings = holdings.filter(
      (h) => h.symbol?.toUpperCase() !== "USDT" && Number(h.units || 0) > 0,
    );
    realHoldings.forEach((h) => {
      const val = h.units * (h.current_price || h.avg_buy_price);
      const alloc = totalGrossAssets > 0 ? Math.min(100, Math.round((val / totalGrossAssets) * 100)) : 0;
      list.push({
        id: `card-${h.id}`,
        holdingRef: h,
        name: `${h.name} (${h.symbol})`,
        category: h.asset_type.toUpperCase().replace("_", " "),
        balance: val,
        allocation: alloc,
        metadata: `${h.units.toLocaleString()} ${h.symbol} • ${isIndonesian ? "Aktif" : "Active"}`,
        trendText: h.annual_rate ? `${h.annual_rate >= 0 ? "▲" : "▼"} ${Math.abs(h.annual_rate)}%` : "▲ Aktif",
        livePrice: `${formatRupiah(h.current_price || h.avg_buy_price)} / ${h.symbol}`,
        sparklinePoints: "M 0 20 Q 25 8 50 22 T 80 6 T 100 10",
        sparklineArea: "M 0 20 Q 25 8 50 22 T 80 6 T 100 10 L 100 32 L 0 32 Z",
        sparklinePeakY: 10,
      });
    });

    // 3. User's Real Cash Wallets (Wallets with positive balance, not investment/crypto)
    const realCashWallets = wallets.filter(
      (w) =>
        Number(w.balance || 0) > 0 &&
        w.classification !== "credit" &&
        w.classification !== "loan" &&
        w.classification !== "investment" &&
        !w.name.toLowerCase().includes("crypto") &&
        !w.name.toLowerCase().includes("usdt"),
    );
    realCashWallets.forEach((w) => {
      const bal = Number(w.balance || 0);
      const alloc = totalGrossAssets > 0 ? Math.min(100, Math.round((bal / totalGrossAssets) * 100)) : 0;
      list.push({
        id: `card-${w.id}`,
        walletRef: w,
        name: w.name,
        category: isIndonesian ? "KAS & BANK" : "CASH & BANK",
        balance: bal,
        allocation: alloc,
        metadata: isIndonesian ? "Rekening Kas Aktif" : "Active Cash Account",
        trendText: "▲ Kas",
        livePrice: formatRupiah(bal),
        sparklinePoints: "M 0 24 Q 25 28 45 16 T 80 12 T 100 4",
        sparklineArea: "M 0 24 Q 25 28 45 16 T 80 12 T 100 4 L 100 32 L 0 32 Z",
        sparklinePeakY: 4,
      });
    });

    // 4. Consolidated Equity Vault Card (Only shown if user has multiple diverse assets, or as single fallback)
    if (list.length > 1 || list.length === 0) {
      list.push({
        id: "card-equity",
        name: isIndonesian ? "Ekuitas Bersih Konsolidasi" : "Consolidated Equity Vault",
        category: isIndonesian ? "EKUITAS MODAL" : "CAPITAL VAULT",
        balance: netWorth,
        allocation: 100,
        metadata:
          solvencyScore >= 100
            ? isIndonesian
              ? "100% Bebas Utang • Unencumbered"
              : "100% Debt-Free • Unencumbered"
            : isIndonesian
              ? `Solvabilitas: ${solvencyScore}%`
              : `Solvency: ${solvencyScore}%`,
        trendText: "▲ Solven",
        livePrice: formatRupiah(netWorth),
        sparklinePoints: "M 0 26 Q 30 24 60 14 T 100 4",
        sparklineArea: "M 0 26 Q 30 24 60 14 T 100 4 L 100 32 L 0 32 Z",
        sparklinePeakY: 4,
      });
    }

    return list;
  }, [holdings, wallets, usdtUnits, usdtRate, netWorth, totalGrossAssets, solvencyScore, isIndonesian]);

  const cardCount = rawCards.length;
  const safeActiveIndex = cardCount > 0 ? activeCardIndex % cardCount : 0;

  // Swipe navigation touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - (touchStartY.current || 0);

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      triggerHaptic("light");
      if (deltaX < 0) {
        // Swiped left -> next card
        setActiveCardIndex((prev) => (prev + 1) % cardCount);
      } else {
        // Swiped right -> previous card
        setActiveCardIndex((prev) => (prev - 1 + cardCount) % cardCount);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="relative w-full max-w-[370px] mx-auto select-none pt-20 pb-1 transition-all duration-300"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setHoveredCardIndex(null);
      }}
      onClick={() => {
        triggerHaptic("light");
        setIsExpanded((prev) => !prev);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Outer Artisanal Wallet Holder Body (Backplate) ── */}
      <div
        className="absolute inset-x-0 bottom-1 top-6 rounded-[28px] pointer-events-none transition-all duration-300"
        style={{
          background: isDark
            ? "linear-gradient(180deg, #18181c 0%, #0d0d10 100%)"
            : "linear-gradient(180deg, #e4e6eb 0%, #d8dbe0 100%)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.12)"
            : "1px solid rgba(0, 0, 0, 0.16)",
          boxShadow: isDark
            ? "0 20px 48px -10px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)"
            : "0 16px 36px -8px rgba(0,0,0,0.12), inset 0 1.5px 0 #ffffff",
        }}
      >
        {/* Top Header Embossed Title */}
        <div className="absolute top-2.5 inset-x-0 text-center">
          <span
            className="text-[8.5px] font-mono font-bold tracking-[0.22em] uppercase"
            style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)" }}
          >
            {isIndonesian ? "NERACA AKUN EKSEKUTIF" : "EXECUTIVE BALANCE VAULT"}
          </span>
        </div>

        {/* Deep Pocket Slit Cavity — Authentic Leather Interior Depth */}
        <div
          className="absolute inset-x-3 top-7 bottom-12 rounded-2xl"
          style={{
            background: isDark
              ? "radial-gradient(ellipse at 50% 20%, #030304 0%, #0a0a0d 100%)"
              : "radial-gradient(ellipse at 50% 20%, #a2a8b3 0%, #b8bec9 100%)",
            boxShadow: isDark
              ? "inset 0 16px 24px -6px rgba(0,0,0,0.99)"
              : "inset 0 12px 18px -4px rgba(0,0,0,0.25)",
          }}
        />
      </div>

      {/* ── Cards Stacking Slot (Terselip Di Balik Saku Depan) ── */}
      {/* Kartu ditaruh di slot absolute dengan z-20 di belakang saku depan (z-30) */}

      {/* ── Cards Stacking Slot (Terselip Di Balik Saku Depan) ── */}
      {/* Kartu ditaruh di slot absolute dengan z-20 di belakang saku depan (z-30) */}
      <div className="absolute inset-x-2 bottom-3 z-20 flex justify-center items-end pointer-events-auto">
        {rawCards.map((card, index) => {
          const isHovered = hoveredCardIndex === index;
          const offset = (index - safeActiveIndex + cardCount) % cardCount;
          const isFront = offset === 0;

          // Dynamic bottom, tilt & depth based on cyclic distance from the front card
          let baseBottom = "54px";
          let tilt = "-rotate-[1.5deg]";
          let hoverTilt = "-rotate-[3deg]";
          let expandedYOffset = "-translate-y-[92px]";
          let zIndex = 22;

          if (offset === 0) {
            baseBottom = "54px";
            tilt = "-rotate-[1.5deg]";
            hoverTilt = "-rotate-[3deg]";
            expandedYOffset = "-translate-y-[92px]";
            zIndex = isHovered ? 35 : 24;
          } else if (offset === 1) {
            baseBottom = "45px";
            tilt = "rotate-[2.5deg]";
            hoverTilt = "rotate-[4deg]";
            expandedYOffset = "-translate-y-[104px]";
            zIndex = isHovered ? 35 : 18;
          } else if (offset === 2) {
            baseBottom = "38px";
            tilt = "-rotate-[3deg]";
            hoverTilt = "-rotate-[5deg]";
            expandedYOffset = "-translate-y-[116px]";
            zIndex = isHovered ? 35 : 14;
          } else {
            baseBottom = "32px";
            tilt = "rotate-0";
            hoverTilt = "rotate-0";
            expandedYOffset = "-translate-y-[124px]";
            zIndex = isHovered ? 35 : 10;
          }

          const currentTransform = isExpanded
            ? `${expandedYOffset} ${isHovered ? "-translate-y-[115px] scale-[1.02]" : hoverTilt}`
            : `translate-y-0 ${tilt}`;

          const isWhite = !isDark;

          return (
            <div
              key={card.id}
              onMouseEnter={() => setHoveredCardIndex(index)}
              onMouseLeave={() => setHoveredCardIndex(null)}
              onClick={(e) => {
                if (!isFront) {
                  e.stopPropagation();
                  triggerHaptic("light");
                  setActiveCardIndex(index);
                }
              }}
              className={`absolute w-[92%] h-[126px] rounded-xl p-3 transition-all duration-480 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none ${currentTransform}`}
              style={{
                bottom: baseBottom,
                zIndex,
                background: isWhite
                  ? "linear-gradient(155deg, #ffffff 0%, #f6f6f9 55%, #eaeaf0 100%)"
                  : isFront
                    ? "linear-gradient(155deg, #2e2f38 0%, #1e1f26 60%, #131418 100%)"
                    : offset === 1
                      ? "linear-gradient(155deg, #25262e 0%, #18191e 60%, #0e0f12 100%)"
                      : "linear-gradient(155deg, #1c1c22 0%, #121215 70%, #0a0a0c 100%)",
                border: isWhite
                  ? "1px solid rgba(0, 0, 0, 0.14)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                color: isWhite ? "#09090b" : "#ffffff",
                boxShadow: isWhite
                  ? "0 10px 26px -4px rgba(0,0,0,0.22), inset 0 1.5px 0 #ffffff"
                  : "0 14px 34px -4px rgba(0,0,0,0.85), inset 0 1.2px 0 rgba(255,255,255,0.25)",
              }}
            >
              <div className="flex flex-col justify-between h-full relative z-10">
                {/* Top Row: Selalu terlihat utuh dengan napas lega (+14px) di atas saku */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span
                      className="text-[11.5px] font-bold tracking-tight truncate"
                      style={{ color: isWhite ? "#000000" : "#ffffff" }}
                    >
                      {card.name}
                    </span>
                    <span
                      className="text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0"
                      style={{
                        background: isWhite
                          ? "rgba(0, 0, 0, 0.08)"
                          : "rgba(255, 255, 255, 0.12)",
                        color: isWhite ? "#18181b" : "#e4e4e7",
                        border: isWhite
                          ? "1px solid rgba(0, 0, 0, 0.12)"
                          : "1px solid rgba(255, 255, 255, 0.18)",
                      }}
                    >
                      {card.category}
                    </span>
                  </div>

                  {/* Titanium Apple Chip */}
                  <div
                    className="w-5 h-3.5 rounded-[3px] border relative flex items-center justify-center shrink-0"
                    style={{
                      background: isWhite ? "#e2e2e7" : "#2a2a30",
                      borderColor: isWhite
                        ? "rgba(0, 0, 0, 0.25)"
                        : "rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    <div
                      className="w-[8px] h-[4px] border-y"
                      style={{
                        borderColor: isWhite
                          ? "rgba(0,0,0,0.3)"
                          : "rgba(255,255,255,0.35)",
                      }}
                    />
                    <div
                      className="absolute w-[3px] h-full border-x"
                      style={{
                        borderColor: isWhite
                          ? "rgba(0,0,0,0.3)"
                          : "rgba(255,255,255,0.35)",
                      }}
                    />
                  </div>
                </div>

                {/* Middle Row: Nominal & Sparkline (Terbuka saat card ditarik keluar saku) */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="space-y-0.2 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-[17px] sm:text-[19px] font-light tracking-tight font-mono leading-none truncate"
                        style={{ color: isWhite ? "#000000" : "#ffffff" }}
                      >
                        {isStealthMode ? "••••••••" : formatRupiah(card.balance)}
                      </span>
                      <span
                        className="text-[8px] font-mono font-bold px-1 py-0.2 rounded shrink-0"
                        style={{
                          background: isWhite
                            ? "rgba(0,0,0,0.08)"
                            : "rgba(255,255,255,0.12)",
                          color: isWhite ? "#18181b" : "#f4f4f5",
                        }}
                      >
                        {card.allocation}%
                      </span>
                    </div>
                    <div
                      className="text-[9px] font-medium truncate flex items-center gap-1"
                      style={{ color: isWhite ? "#52525b" : "#a1a1aa" }}
                    >
                      <span className="truncate">{card.metadata}</span>
                      <span>•</span>
                      <span className="font-mono font-semibold shrink-0">
                        {card.trendText}
                      </span>
                    </div>
                  </div>

                  {/* Strict Monochrome Sparkline Line Chart SVG */}
                  <div className="w-24 h-7 relative flex items-center justify-end shrink-0">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 32">
                      <defs>
                        <linearGradient
                          id={`monoSpark-${card.id}`}
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={isWhite ? "#000000" : "#ffffff"}
                            stopOpacity={isWhite ? 0.16 : 0.24}
                          />
                          <stop
                            offset="100%"
                            stopColor={isWhite ? "#000000" : "#ffffff"}
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d={card.sparklineArea}
                        fill={`url(#monoSpark-${card.id})`}
                      />
                      <path
                        d={card.sparklinePoints}
                        fill="none"
                        stroke={isWhite ? "#000000" : "#ffffff"}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="100"
                        cy={card.sparklinePeakY}
                        r="2.5"
                        fill={isWhite ? "#000000" : "#ffffff"}
                      />
                    </svg>
                  </div>
                </div>

                {/* Bottom Row: Detail Action Pill & Live Market Price */}
                <div
                  className="flex items-center justify-between pt-1 border-t"
                  style={{
                    borderColor: isWhite
                      ? "rgba(0, 0, 0, 0.1)"
                      : "rgba(255, 255, 255, 0.12)",
                  }}
                >
                  {/* Single High-Contrast Monochrome Detail Action Button */}
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic("light");
                        if (card.holdingRef) {
                          onDetailAsset?.(card.holdingRef);
                        } else {
                          onDetailAsset?.(card.id);
                        }
                      }}
                      className="px-3 py-1 rounded-md text-[9px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                      style={{
                        background: isWhite ? "#09090b" : "#ffffff",
                        color: isWhite ? "#ffffff" : "#09090b",
                      }}
                    >
                      Detail
                    </button>
                  </div>

                  {/* Live Market Price in Monochrome */}
                  <div className="text-right">
                    <span
                      className="text-[9.5px] font-mono font-bold tracking-tight flex items-center gap-1 justify-end"
                      style={{ color: isWhite ? "#09090b" : "#ffffff" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isWhite ? "#09090b" : "#ffffff",
                        }}
                      />
                      {card.livePrice}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Front Artisanal Leather / Milky Glass Pocket Sleeve ── */}
      {/* 100% Monochrome Obsidian (Dark Mode) / Milky Alabaster Glass (Light Mode) — Zero Red Accent */}
      <div
        className="relative z-30 w-full rounded-[24px] p-3 transition-all duration-300"
        style={{
          background: isDark
            ? "linear-gradient(165deg, rgba(26, 26, 32, 0.96) 0%, rgba(16, 16, 20, 0.98) 60%, #0a0a0d 100%)"
            : "linear-gradient(150deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 247, 251, 0.94) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.14)"
            : "1px solid rgba(0, 0, 0, 0.15)",
          boxShadow: isDark
            ? "0 -6px 22px rgba(0,0,0,0.85), 0 14px 32px -6px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.22)"
            : "0 -4px 14px rgba(0,0,0,0.08), 0 10px 24px -4px rgba(0,0,0,0.12), inset 0 1.5px 0 #ffffff",
        }}
      >
        {/* Authentic Saddle Stitching Inset */}
        <div
          className="absolute inset-[3px] rounded-[21px] pointer-events-none border border-dashed"
          style={{
            borderColor: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.18)",
            strokeDasharray: "4 3",
          }}
        />

        {/* Pocket Content Layer */}
        <div className="relative z-10 space-y-1">
          {/* Top Row: Total Balance Label & Stealth Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9.5px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "TOTAL SALDO & EKUITAS" : "TOTAL BALANCE"}
              </span>
            </div>

            {/* Stealth Eye Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                toggleStealthMode();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-all border"
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
                color: isDark ? "var(--text-secondary)" : "var(--text-primary)",
              }}
              title={
                isStealthMode
                  ? isIndonesian
                    ? "Tampilkan Saldo"
                    : "Show Balance"
                  : isIndonesian
                    ? "Sembunyikan Saldo"
                    : "Hide Balance"
              }
            >
              {isStealthMode ? <EyeOff size={11.5} /> : <Eye size={11.5} />}
            </button>
          </div>

          {/* Hero Net Worth Amount */}
          <div>
            <p
              className="amount text-[27px] sm:text-[30px] font-light tracking-tight leading-tight"
              style={{ color: isDark ? "#ffffff" : "#09090c" }}
            >
              {isStealthMode ? "••••••••" : formatRupiah(netWorth)}
            </p>
          </div>

          {/* Micro 3-Column Balance Sheet Strip */}
          <div
            className="grid grid-cols-3 gap-1 py-1.5 px-2 rounded-lg text-center"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <div>
              <span
                className="text-[8px] font-mono uppercase block font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "TOTAL ASET" : "GROSS ASSETS"}
              </span>
              <span
                className="text-[9.5px] font-mono font-bold block mt-0.5"
                style={{ color: isDark ? "#ffffff" : "#09090c" }}
              >
                {isStealthMode ? "••••••" : formatRupiah(totalGrossAssets)}
              </span>
            </div>

            <div
              className="border-x"
              style={{
                borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
              }}
            >
              <span
                className="text-[8px] font-mono uppercase block font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "LIABILITAS" : "LIABILITIES"}
              </span>
              <span
                className="text-[9.5px] font-mono font-bold block mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isStealthMode ? "••••••" : formatRupiah(liabilitiesTotal)}
              </span>
            </div>

            <div>
              <span
                className="text-[8px] font-mono uppercase block font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian ? "SOLVABILITAS" : "SOLVENCY"}
              </span>
              <span
                className="text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 mt-0.5"
                style={{ color: isDark ? "#ffffff" : "#09090c" }}
              >
                {solvencyScore}%
                <ShieldCheck size={10} className="shrink-0" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
