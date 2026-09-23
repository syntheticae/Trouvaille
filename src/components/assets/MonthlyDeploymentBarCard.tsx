// ======================================================================
// TROUVAILLE MONTHLY INVESTMENT DEPLOYMENT BAR CARD
// shadcn/ui Inspired Minimalist Vertical Bar Chart
// Strictly ZERO DUMMY DATA: Computed from user transactions & wallet flows
// ======================================================================

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { formatRupiah } from "../../lib/utils";

export interface MonthlyDeploymentItem {
  key: string;
  label: string;
  deployed: number;
  txCount: number;
}

interface MonthlyDeploymentBarCardProps {
  data: MonthlyDeploymentItem[];
  isDark: boolean;
  isIndonesian: boolean;
  hideBalance?: boolean;
}

const CustomDeploymentTooltip = ({ active, payload, label, isIndonesian }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as MonthlyDeploymentItem;
  return (
    <div
      className="p-2.5 rounded-xl text-left pointer-events-none select-none"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-[13px] font-bold text-[var(--text-primary)] font-mono">
        {formatRupiah(item?.deployed || 0)}
      </p>
      <p className="text-[10.5px] text-[var(--text-secondary)] mt-0.5">
        {item?.txCount || 0} {isIndonesian ? "transaksi tercatat" : "recorded transactions"}
      </p>
    </div>
  );
};

export function MonthlyDeploymentBarCard({
  data,
  isDark,
  isIndonesian,
  hideBalance = false,
}: MonthlyDeploymentBarCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalDeployed = data.reduce((acc, curr) => acc + curr.deployed, 0);
  const activeMonths = data.filter((d) => d.deployed > 0);
  const avgMonthly =
    activeMonths.length > 0 ? Math.round(totalDeployed / activeMonths.length) : 0;
  const maxDeployed = Math.max(...data.map((d) => d.deployed), 1);

  return (
    <div
      className="p-5 rounded-[26px] space-y-4 relative overflow-hidden select-none transition-all"
      style={{
        background: isDark
          ? "var(--bg-elevated)"
          : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 45%, #f5f5f7 100%)",
        border: isDark
          ? "1px solid var(--glass-border)"
          : "1px solid rgba(15,23,42,0.06)",
        boxShadow: isDark
          ? "var(--shadow-card)"
          : "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(15,23,42,0.045)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <TrendingUp size={16} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
              {isIndonesian ? "Injeksi Modal Bulanan" : "Monthly Capital Deployment"}
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
              {isIndonesian
                ? "Mutasi modal ke aset investasi (6 bln)"
                : "Real capital inflow into investments (6 mo)"}
            </p>
          </div>
        </div>

        {/* Total Metric Pill */}
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            {isIndonesian ? "Total Injeksi" : "Total Deployed"}
          </span>
          <span className="font-mono text-[13px] font-bold text-[var(--text-primary)]">
            {hideBalance ? "••••••••" : formatRupiah(totalDeployed)}
          </span>
        </div>
      </div>

      {/* Bar Chart Section */}
      <div className="pt-1 pb-1">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 4, left: 4, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (typeof state?.activeTooltipIndex === "number") {
                  setActiveIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "var(--text-tertiary)",
                  fontSize: 10.5,
                  fontWeight: 600,
                  fontFamily: "'Urbanist', sans-serif",
                }}
              />
              <Tooltip
                content={<CustomDeploymentTooltip isIndonesian={isIndonesian} />}
                cursor={{
                  fill: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                  radius: 8,
                }}
              />
              <Bar
                dataKey="deployed"
                maxBarSize={30}
                radius={[6, 6, 0, 0]}
                animationDuration={600}
              >
                {data.map((entry, index) => {
                  const isHovered = activeIndex === index;
                  const isTop = entry.deployed === maxDeployed && entry.deployed > 0;
                  
                  let fill = isDark
                    ? "rgba(255, 255, 255, 0.28)"
                    : "rgba(24, 24, 27, 0.35)";

                  if (isHovered) {
                    fill = "var(--text-primary)";
                  } else if (isTop) {
                    fill = isDark
                      ? "rgba(255, 255, 255, 0.85)"
                      : "rgba(24, 24, 27, 0.85)";
                  }

                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Summary Metrics */}
      <div
        className="pt-2.5 border-t border-[var(--glass-border)] flex items-center justify-between text-[11px]"
      >
        <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
          <Calendar size={12} strokeWidth={1.75} />
          <span>
            {isIndonesian ? "Rata-rata / bln: " : "Avg / month: "}
            <strong className="font-mono font-bold text-[var(--text-secondary)]">
              {hideBalance ? "••••" : formatRupiah(avgMonthly)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[var(--text-secondary)] font-semibold">
          <ArrowUpRight size={13} strokeWidth={2} />
          <span>
            {activeMonths.length} {isIndonesian ? "bulan aktif" : "active months"}
          </span>
        </div>
      </div>
    </div>
  );
}
