// ======================================================================
// TROUVAILLE NET CAPITAL TRAJECTORY CARD
// Cumulative net worth line / area chart with Apple Glass aesthetics
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import React from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";

interface NetCapitalTrajectoryCardProps {
  netWorth: number;
  hideBalance: boolean;
  rangeTitle: string;
  netWorthData: any[];
  netTrajectoryExpanded: boolean;
  setNetTrajectoryExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  colors: {
    lineStroke: string;
    [key: string]: any;
  };
  isDark: boolean;
  isIndonesian: boolean;
  GlassTooltip: React.ComponentType<any>;
}

export function NetCapitalTrajectoryCard({
  netWorth,
  hideBalance,
  rangeTitle,
  netWorthData,
  netTrajectoryExpanded,
  setNetTrajectoryExpanded,
  colors,
  isDark,
  isIndonesian,
  GlassTooltip,
}: NetCapitalTrajectoryCardProps) {
  return (
    <div className="p-5 rounded-[24px] glass-surface">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => {
          setNetTrajectoryExpanded((v) => !v);
          triggerHaptic("light");
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: "var(--text-tertiary)" }} />
          <div>
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {isIndonesian ? "Trajektori Modal Bersih" : "Net Capital Trajectory"}
            </h2>
            <p
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? `Perubahan kekayaan bersih kumulatif (${rangeTitle})`
                : `Cumulative net worth change (${rangeTitle})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!netTrajectoryExpanded && (
            <span className="amount text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {hideBalance ? "••••••" : formatRupiah(netWorth)}
            </span>
          )}
          <button
            type="button"
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer active:scale-90 shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            aria-label={netTrajectoryExpanded ? (isIndonesian ? "Lipat" : "Collapse") : (isIndonesian ? "Bentangkan" : "Expand")}
            title={netTrajectoryExpanded ? (isIndonesian ? "Lipat" : "Collapse") : (isIndonesian ? "Bentangkan" : "Expand")}
          >
            <motion.div
              animate={{ rotate: netTrajectoryExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {netTrajectoryExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden pt-4"
          >
            <div className="h-[160px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={netWorthData}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="netG" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={colors.lineStroke}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={colors.lineStroke}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 10,
                      fill: "var(--text-tertiary)",
                      fontWeight: 600,
                    }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<GlassTooltip />}
                    cursor={{
                      stroke: colors.lineStroke,
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    name="net"
                    stroke={colors.lineStroke}
                    strokeWidth={2.5}
                    fill="url(#netG)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 4, fill: colors.lineStroke }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
