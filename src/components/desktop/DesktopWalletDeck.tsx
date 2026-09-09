import { useState } from "react";
import { Eye, EyeOff, CreditCard, ChevronRight } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useTheme } from "../../contexts/ThemeContext";
import { triggerHaptic } from "../../lib/haptics";

interface DesktopWalletDeckProps {
  onOpenAddWallet?: () => void;
  onSelectWallet?: (walletId: string) => void;
}

export function DesktopWalletDeck({
  onOpenAddWallet,
  onSelectWallet,
}: DesktopWalletDeckProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { positiveAccounts, liquidAssets, wallets } = useWalletBalances();

  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);

  const classificationMap = new Map<string, string>();
  wallets.forEach((w) => {
    if (w.classification) {
      classificationMap.set(w.id, w.classification);
      classificationMap.set(w.name.toLowerCase(), w.classification);
    }
  });

  // Take top 4 prominent accounts for the 3D stack
  const stackAccounts = positiveAccounts.slice(0, 4);

  // Aesthetic monochrome card backgrounds
  const cardThemes = [
    {
      // Primary Titanium Glass Card
      bg: isDark
        ? "linear-gradient(135deg, rgba(38, 38, 45, 0.95), rgba(20, 20, 24, 0.95))"
        : "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 240, 245, 0.98))",
      border: isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.12)",
      textPrimary: "var(--text-primary)",
      textSecondary: "var(--text-secondary)",
      chipBg: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
    },
    {
      // Graphite Obsidian Card
      bg: isDark
        ? "linear-gradient(135deg, rgba(28, 28, 32, 0.95), rgba(14, 14, 16, 0.95))"
        : "linear-gradient(135deg, rgba(245, 245, 248, 0.98), rgba(225, 225, 232, 0.98))",
      border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
      textPrimary: "var(--text-primary)",
      textSecondary: "var(--text-secondary)",
      chipBg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
    },
    {
      // Deep Slate Card
      bg: isDark
        ? "linear-gradient(135deg, rgba(22, 22, 26, 0.95), rgba(10, 10, 12, 0.95))"
        : "linear-gradient(135deg, rgba(235, 235, 240, 0.98), rgba(215, 215, 222, 0.98))",
      border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
      textPrimary: "var(--text-primary)",
      textSecondary: "var(--text-secondary)",
      chipBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
    },
    {
      // Matte Onyx Card
      bg: isDark
        ? "linear-gradient(135deg, rgba(16, 16, 18, 0.95), rgba(8, 8, 10, 0.95))"
        : "linear-gradient(135deg, rgba(225, 225, 230, 0.98), rgba(205, 205, 215, 0.98))",
      border: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
      textPrimary: "var(--text-primary)",
      textSecondary: "var(--text-secondary)",
      chipBg: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
    },
  ];

  return (
    <div
      className="rounded-[28px] p-6 flex flex-col justify-between select-none relative overflow-hidden transition-all duration-300 group/deck h-full min-h-[360px]"
      style={{
        background: isDark ? "rgba(18, 18, 22, 0.65)" : "rgba(255, 255, 255, 0.72)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(24px)",
        boxShadow: isDark ? "var(--shadow-card)" : "0 12px 36px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 z-20 relative">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              color: "var(--text-primary)",
            }}
          >
            <CreditCard size={15} strokeWidth={1.75} />
          </div>
          <div>
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Vault Card Deck
            </h3>
            <span
              className="text-[10.5px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {positiveAccounts.length} Active Accounts
            </span>
          </div>
        </div>

        {/* Eye Toggle & Details Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsBalanceRevealed((prev) => !prev);
            }}
            aria-label="Toggle balance visibility"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.08] active:scale-90 cursor-pointer"
            style={{
              color: "var(--text-tertiary)",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
            }}
            title={isBalanceRevealed ? "Hide Balances" : "Reveal Balances"}
          >
            {isBalanceRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* 3D Physical Wallet Stacking Container */}
      <div
        className="relative w-full h-[220px] flex items-center justify-center my-auto cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        {/* Physical Leather/Titanium Backplate Pocket */}
        <div
          className="absolute bottom-0 w-[290px] h-[150px] rounded-[24px] pointer-events-none transition-all duration-500"
          style={{
            background: isDark
              ? "linear-gradient(180deg, #18181c 0%, #0d0d10 100%)"
              : "linear-gradient(180deg, #f0f0f4 0%, #e2e2e8 100%)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: isDark
              ? "inset 0 16px 28px rgba(0, 0, 0, 0.6), inset 0 2px 6px rgba(0,0,0,0.4)"
              : "inset 0 12px 24px rgba(0, 0, 0, 0.05)",
            zIndex: 1,
          }}
        />

        {/* Cards Stack (Max 3 to 4 cards peek out on hover) */}
        {stackAccounts.map((account, idx) => {
          const cardStyle = cardThemes[idx % cardThemes.length];
          const isHovered = activeCardIndex === idx;

          // Default position in pocket (cascading bottom-up)
          const baseBottom = 20 + idx * 24;
          const baseRotate = (idx - 1) * -1.5;

          // Interactive elevation on deck hover
          const hoverElevation = (stackAccounts.length - idx) * 22;

          return (
            <div
              key={account.id}
              onMouseEnter={() => setActiveCardIndex(idx)}
              onMouseLeave={() => setActiveCardIndex(null)}
              onClick={() => {
                triggerHaptic("light");
                if (onSelectWallet) onSelectWallet(account.id);
              }}
              className="absolute w-[270px] h-[135px] rounded-[18px] p-3.5 flex flex-col justify-between transition-all duration-500 select-none shadow-xl cursor-pointer group/card"
              style={{
                background: cardStyle.bg,
                border: `1px solid ${cardStyle.border}`,
                bottom: isHovered
                  ? `${baseBottom + hoverElevation + 20}px`
                  : `${baseBottom}px`,
                transform: isHovered
                  ? "scale(1.04) rotate(0deg)"
                  : `rotate(${baseRotate}deg)`,
                zIndex: isHovered ? 50 : 10 + idx,
                boxShadow: isHovered
                  ? isDark
                    ? "0 24px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.2)"
                    : "0 24px 48px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)"
                  : isDark
                    ? "0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
              }}
            >
              {/* Card Top: EMV Chip & Account Brand */}
              <div className="flex items-center justify-between">
                {/* Chip */}
                <div
                  className="w-7 h-5 rounded-md flex items-center justify-center border"
                  style={{
                    background: cardStyle.chipBg,
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="w-3.5 h-2.5 rounded-[2px] border border-white/20" />
                </div>

                {/* Account Name & Classification Pill */}
                <div className="text-right flex items-center gap-1.5">
                  <span
                    className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      color: cardStyle.textSecondary,
                    }}
                  >
                    {classificationMap.get(account.id) ||
                      classificationMap.get(account.name.toLowerCase()) ||
                      "liquid"}
                  </span>
                  <span
                    className="text-[12px] font-extrabold tracking-tight"
                    style={{ color: cardStyle.textPrimary }}
                  >
                    {account.name}
                  </span>
                </div>
              </div>

              {/* Card Center: Hidden Card Digits / Stars */}
              <div className="my-auto">
                <span
                  className="text-[13px] font-mono tracking-[3px] opacity-75"
                  style={{ color: cardStyle.textSecondary }}
                >
                  •••• •••• •••• {account.name.slice(0, 3).toUpperCase()}
                </span>
              </div>

              {/* Card Bottom: Balance */}
              <div className="flex items-end justify-between">
                <div>
                  <span
                    className="text-[8.5px] uppercase font-bold tracking-wider block"
                    style={{ color: cardStyle.textSecondary }}
                  >
                    Balance
                  </span>
                  <p
                    className="text-[14px] font-extrabold amount tracking-tight leading-tight"
                    style={{ color: cardStyle.textPrimary }}
                  >
                    {isBalanceRevealed ? formatRupiah(account.balance) : "Rp ••••••••"}
                  </p>
                </div>
                <span className="text-[10px] opacity-60 font-semibold">Trouvaille</span>
              </div>
            </div>
          );
        })}

        {/* Front Pocket Lip (Clips the bottom cards like a luxury leather wallet) */}
        <div
          className="absolute bottom-0 w-[290px] h-[90px] rounded-b-[24px] rounded-t-[14px] flex flex-col justify-end p-4 pointer-events-none transition-all duration-300"
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(22, 22, 26, 0.88) 0%, rgba(14, 14, 18, 0.96) 100%)"
              : "linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(240, 240, 246, 0.96) 100%)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
            borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.18)" : "1px solid rgba(0, 0, 0, 0.12)",
            boxShadow: isDark
              ? "0 -6px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
              : "0 -4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            zIndex: 40,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span style={{ color: "var(--text-tertiary)" }}>Total Liquid Assets</span>
            <span
              className="amount font-extrabold text-[13px]"
              style={{ color: "var(--text-primary)" }}
            >
              {isBalanceRevealed ? formatRupiah(liquidAssets) : "Rp ••••••••"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Hint */}
      <div className="flex items-center justify-between pt-3 text-[11px] font-medium z-20 border-t border-white/[0.06]">
        <span style={{ color: "var(--text-tertiary)" }}>
          Hover card stack to expand & inspect
        </span>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            if (onOpenAddWallet) onOpenAddWallet();
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer"
          style={{ color: "var(--text-primary)" }}
        >
          <span>Manage Wallets</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
