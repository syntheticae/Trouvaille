import { useMemo } from "react";
import { Layers } from "lucide-react";
import { formatRupiah } from "../../lib/utils";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useTheme } from "../../contexts/ThemeContext";

export function DesktopAssetBar() {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const { allAccounts, wallets } = useWalletBalances();

  const allocation = useMemo(() => {
    let liquid = 0;
    let investment = 0;
    let receivable = 0;
    let liabilities = 0;

    const map = new Map<string, string>();
    wallets.forEach((w) => {
      if (w.classification) {
        map.set(w.id, w.classification);
        map.set(w.name.toLowerCase(), w.classification);
      }
    });

    allAccounts.forEach((acc) => {
      const cls = map.get(acc.id) || map.get(acc.name.toLowerCase()) || "liquid";
      if (cls === "investment") {
        investment += Math.max(0, acc.balance);
      } else if (cls === "receivable") {
        receivable += Math.max(0, acc.balance);
      } else if (cls === "loan" || cls === "credit") {
        liabilities += Math.abs(acc.balance);
      } else {
        if (acc.balance >= 0) liquid += acc.balance;
        else liabilities += Math.abs(acc.balance);
      }
    });

    const totalGross = liquid + investment + receivable;
    const calcPct = (val: number) =>
      totalGross > 0 ? Math.round((val / totalGross) * 100) : 0;

    return {
      liquid: { amount: liquid, pct: calcPct(liquid) },
      investment: { amount: investment, pct: calcPct(investment) },
      receivable: { amount: receivable, pct: calcPct(receivable) },
      liabilities: {
        amount: liabilities,
        pct: totalGross > 0 ? Math.round((liabilities / totalGross) * 100) : 0,
      },
      totalGross,
    };
  }, [allAccounts, wallets]);

  const categories = [
    {
      key: "liquid",
      label: "Liquid Cash & Bank",
      amount: allocation.liquid.amount,
      pct: allocation.liquid.pct,
      // Solid white / high contrast
      barStyle: {
        background: isDark ? "#ffffff" : "#09090c",
      },
      badgeStyle: {
        background: isDark ? "#ffffff" : "#09090c",
      },
    },
    {
      key: "investment",
      label: "Investment Portfolio",
      amount: allocation.investment.amount,
      pct: allocation.investment.pct,
      // Graphite/slate
      barStyle: {
        background: isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.5)",
      },
      badgeStyle: {
        background: isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.5)",
      },
    },
    {
      key: "receivable",
      label: "Receivables (Piutang)",
      amount: allocation.receivable.amount,
      pct: allocation.receivable.pct,
      // Frosted translucent
      barStyle: {
        background: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.25)",
      },
      badgeStyle: {
        background: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.25)",
      },
    },
  ];

  return (
    <div
      className="rounded-[28px] p-6 flex flex-col justify-between select-none relative overflow-hidden transition-all duration-300 h-full min-h-[360px]"
      style={{
        background: isDark ? "rgba(18, 18, 22, 0.65)" : "rgba(255, 255, 255, 0.72)",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(24px)",
        boxShadow: isDark ? "var(--shadow-card)" : "0 12px 36px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              color: "var(--text-primary)",
            }}
          >
            <Layers size={15} strokeWidth={1.75} />
          </div>
          <div>
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Portfolio Composition
            </h3>
            <span
              className="text-[10.5px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Asset Allocation & Capital Drift
            </span>
          </div>
        </div>

        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[var(--glass-border)]"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            color: "var(--text-secondary)",
          }}
        >
          Gross Assets: {formatRupiah(allocation.totalGross)}
        </span>
      </div>

      {/* Segmented Horizontal Composition Bar (Inspired by Meridial Image 2) */}
      <div className="space-y-2 my-auto">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span style={{ color: "var(--text-tertiary)" }}>Allocation Spread</span>
          <span style={{ color: "var(--text-primary)" }}>
            {allocation.liquid.pct}% Liquid · {allocation.investment.pct}% Invest
          </span>
        </div>

        {/* Stacked Multi-tone Bar */}
        <div
          className="w-full h-7 rounded-2xl overflow-hidden flex p-1 gap-1"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          {categories.map((cat) => {
            if (cat.pct <= 0) return null;
            return (
              <div
                key={cat.key}
                style={{
                  width: `${cat.pct}%`,
                  ...cat.barStyle,
                  transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                className="h-full rounded-xl flex items-center justify-center relative group/bar cursor-pointer"
                title={`${cat.label}: ${cat.pct}% (${formatRupiah(cat.amount)})`}
              >
                {cat.pct >= 15 && (
                  <span className="text-[11px] font-black tracking-tight text-zinc-900 dark:text-zinc-900 mix-blend-difference">
                    {cat.pct}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown Legend Cards (Bento Sub-Cards) */}
      <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/[0.06]">
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="p-3 rounded-2xl transition-all"
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.04)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={cat.badgeStyle}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider block truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {cat.key}
              </span>
            </div>
            <p
              className="text-[13px] font-extrabold amount tracking-tight block truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {formatRupiah(cat.amount)}
            </p>
            <span
              className="text-[10px] font-semibold opacity-70 block"
              style={{ color: "var(--text-secondary)" }}
            >
              {cat.pct}% of wealth
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
