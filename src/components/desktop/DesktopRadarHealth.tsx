import { useMemo } from "react";
import { Activity } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useMonthSummary } from "../../hooks/useTransactions";
import { useBudgetTarget } from "../../hooks/useBudgetTarget";

interface RadarMetric {
  key: string;
  label: string;
  score: number; // 0 to 100
  rawValue: string;
}

export function DesktopRadarHealth() {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const now = new Date();
  const { netWorth, liquidAssets, allAccounts, wallets } = useWalletBalances();

  const liabilities = useMemo(() => {
    let debt = 0;
    const map = new Map<string, string>();
    wallets.forEach((w) => {
      if (w.classification) {
        map.set(w.id, w.classification);
        map.set(w.name.toLowerCase(), w.classification);
      }
    });
    allAccounts.forEach((acc) => {
      const cls = map.get(acc.id) || map.get(acc.name.toLowerCase());
      if (cls === "loan" || cls === "credit" || acc.balance < 0) {
        debt += Math.abs(acc.balance);
      }
    });
    return debt;
  }, [allAccounts, wallets]);

  const { totalExpense, totalIncome, savingsRate } = useMonthSummary(
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const { budgetTarget } = useBudgetTarget();

  // Compute 5 Financial Health Dimensions
  const metrics: RadarMetric[] = useMemo(() => {
    // 1. Liquidity Runway (Target: 6 months of living expenses)
    const monthlyBurn = totalExpense > 0 ? totalExpense : 3000000;
    const runwayMonths = liquidAssets > 0 ? liquidAssets / monthlyBurn : 0;
    const runwayScore = Math.min(100, Math.round((runwayMonths / 6) * 100));

    // 2. Savings Efficiency (Target: >= 30% savings rate)
    const actualSavingsRate = savingsRate || 0;
    const savingsScore = Math.max(
      15,
      Math.min(100, Math.round((actualSavingsRate / 35) * 100)),
    );

    // 3. Debt Solvency (Ratio of debt to net worth. 0 debt = 100)
    const debtRatio = netWorth > 0 ? liabilities / (netWorth + liabilities) : 0;
    const debtScore = Math.max(15, Math.round(100 - debtRatio * 100));

    // 4. Budget Discipline (Staying under budget)
    let budgetScore = 75;
    if (budgetTarget > 0) {
      const budgetUsedRatio = totalExpense / budgetTarget;
      budgetScore =
        budgetUsedRatio <= 1
          ? Math.round(100 - budgetUsedRatio * 25)
          : Math.max(15, Math.round(75 - (budgetUsedRatio - 1) * 75));
    }

    // 5. Cashflow Net Health (Positive net cashflow)
    const netCashflow = totalIncome - totalExpense;
    const cashflowScore =
      netCashflow > 0
        ? Math.min(100, 60 + Math.round((netCashflow / (totalIncome || 1)) * 40))
        : Math.max(20, 50 - Math.round((Math.abs(netCashflow) / (monthlyBurn || 1)) * 30));

    return [
      {
        key: "runway",
        label: "Liquidity Runway",
        score: Math.max(15, runwayScore),
        rawValue: `${runwayMonths.toFixed(1)} Mo`,
      },
      {
        key: "savings",
        label: "Savings Velocity",
        score: Math.max(15, savingsScore),
        rawValue: `${actualSavingsRate.toFixed(0)}%`,
      },
      {
        key: "debt",
        label: "Solvency & Debt",
        score: Math.max(15, debtScore),
        rawValue: liabilities === 0 ? "0 Debt" : `${(debtRatio * 100).toFixed(0)}% Debt`,
      },
      {
        key: "discipline",
        label: "Budget Control",
        score: Math.max(15, budgetScore),
        rawValue: budgetTarget > 0 ? `${Math.round((totalExpense / budgetTarget) * 100)}% Used` : "N/A",
      },
      {
        key: "cashflow",
        label: "Net Cashflow",
        score: Math.max(15, cashflowScore),
        rawValue: netCashflow >= 0 ? "+ Positive" : "- Outflow",
      },
    ];
  }, [liquidAssets, totalExpense, totalIncome, savingsRate, liabilities, netWorth, budgetTarget]);

  // Calculate Overall Composite Score
  const overallScore = Math.round(
    metrics.reduce((acc, m) => acc + m.score, 0) / metrics.length,
  );

  // SVG Geometry Constants
  const size = 260;
  const center = size / 2;
  const radius = 90;
  const count = metrics.length;
  const angleStep = (Math.PI * 2) / count;

  // Web levels (25%, 50%, 75%, 100%)
  const webLevels = [0.25, 0.5, 0.75, 1];

  // Calculate coordinates for a given angle and ratio
  const getCoords = (index: number, ratio: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = radius * ratio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Build polygon points for data
  const dataPoints = metrics.map((m, idx) => getCoords(idx, m.score / 100));
  const polygonPointsStr = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              color: "var(--text-primary)",
            }}
          >
            <Activity size={15} strokeWidth={1.75} />
          </div>
          <div>
            <h3
              className="text-[13px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Financial Health Matrix
            </h3>
            <span
              className="text-[10.5px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              5-Axis Holistic Solvency
            </span>
          </div>
        </div>

        {/* Composite Score Pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--glass-border)]"
          style={{
            background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Score
          </span>
          <span className="text-[13px] font-black amount text-[var(--text-primary)]">
            {overallScore}/100
          </span>
        </div>
      </div>

      {/* Center Radar SVG */}
      <div className="relative flex items-center justify-center my-auto">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          {/* Concentric Polygonal Web Grid */}
          {webLevels.map((level, lIdx) => {
            const levelPoints = Array.from({ length: count }, (_, idx) => {
              const { x, y } = getCoords(idx, level);
              return `${x},${y}`;
            }).join(" ");

            return (
              <polygon
                key={lIdx}
                points={levelPoints}
                fill="none"
                stroke={
                  isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.06)"
                }
                strokeWidth={lIdx === webLevels.length - 1 ? "1.2" : "0.75"}
                strokeDasharray={lIdx === webLevels.length - 1 ? undefined : "3 3"}
              />
            );
          })}

          {/* Radial Axis Lines */}
          {metrics.map((_, idx) => {
            const { x, y } = getCoords(idx, 1);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={
                  isDark ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.08)"
                }
                strokeWidth="1"
              />
            );
          })}

          {/* Data Filled Polygon (Obsidian Apple Monochrome) */}
          <polygon
            points={polygonPointsStr}
            fill={
              isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.08)"
            }
            stroke={isDark ? "#ffffff" : "#09090c"}
            strokeWidth="1.8"
            strokeLinejoin="round"
            style={{
              filter: isDark
                ? "drop-shadow(0 0 12px rgba(255, 255, 255, 0.2))"
                : "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.1))",
              transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {/* Vertex Circles and Label Badges */}
          {dataPoints.map((p, idx) => {
            return (
              <g key={idx}>
                {/* Data Vertex Point */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill={isDark ? "#ffffff" : "#09090c"}
                  stroke={isDark ? "#121215" : "#ffffff"}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Metric Pills Footer */}
      <div className="grid grid-cols-5 gap-1.5 pt-3 border-t border-white/[0.06]">
        {metrics.map((m) => (
          <div key={m.key} className="text-center">
            <span
              className="text-[9px] font-semibold block truncate"
              style={{ color: "var(--text-tertiary)" }}
              title={m.label}
            >
              {m.label.split(" ")[0]}
            </span>
            <span
              className="text-[10.5px] font-extrabold amount block truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {m.rawValue}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
