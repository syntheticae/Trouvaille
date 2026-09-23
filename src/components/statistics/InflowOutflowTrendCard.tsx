// ======================================================================
// TROUVAILLE INFLOW VS OUTFLOW TREND CARD
// Bi-directional bar chart comparing operational inflows and outflows
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import React from "react";
import { ChevronDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../../lib/haptics";

interface InflowOutflowTrendCardProps {
  rangeTitle: string;
  trendData: any[];
  range: string;
  longitudinal: any;
  inflowOutflowExpanded: boolean;
  setInflowOutflowExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  colors: {
    barHigh: string;
    barMid: string;
    barLow: string;
    cursorFill: string;
    [key: string]: any;
  };
  isDark: boolean;
  isIndonesian: boolean;
  GlassTooltip: React.ComponentType<any>;
}

export function InflowOutflowTrendCard({
  rangeTitle,
  trendData,
  range,
  longitudinal,
  inflowOutflowExpanded,
  setInflowOutflowExpanded,
  colors,
  isDark,
  isIndonesian,
  GlassTooltip,
}: InflowOutflowTrendCardProps) {
  return (
    <div className="p-4 rounded-[22px] glass-surface">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => {
          setInflowOutflowExpanded((v) => !v);
          triggerHaptic("light");
        }}
      >
        <div>
          <h2
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Tren Masuk vs Keluar" : "Inflow vs Outflow Trend"}
          </h2>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {isIndonesian ? `Perbandingan ${rangeTitle}` : `${rangeTitle} comparison`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 text-[10px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.barHigh }}
              />
              Inflow
            </div>
            <div
              className="flex items-center gap-1.5 text-[10px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.barMid }}
              />
              Outflow
            </div>
          </div>

          <button
            type="button"
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer active:scale-90 shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            aria-label={inflowOutflowExpanded ? (isIndonesian ? "Lipat" : "Collapse") : (isIndonesian ? "Bentangkan" : "Expand")}
            title={inflowOutflowExpanded ? (isIndonesian ? "Lipat" : "Collapse") : (isIndonesian ? "Bentangkan" : "Expand")}
          >
            <motion.div
              animate={{ rotate: inflowOutflowExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {inflowOutflowExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden pt-3"
          >
            <div className="h-[145px] -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                  barSize={range === "year" || range === "all" ? 5 : 6}
                  barGap={2}
                >
                  <defs>
                    <linearGradient id="inflowG" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={colors.barHigh}
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="100%"
                        stopColor={colors.barMid}
                        stopOpacity={0.7}
                      />
                    </linearGradient>
                    <linearGradient id="outflowG" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={colors.barMid}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="100%"
                        stopColor={colors.barLow}
                        stopOpacity={0.5}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 2"
                    stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9.5,
                      fill: "var(--text-tertiary)",
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                    dy={4}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<GlassTooltip />}
                    cursor={{ fill: colors.cursorFill, radius: 4 }}
                  />
                  <Bar
                    dataKey="income"
                    name="income"
                    fill="url(#inflowG)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="expense"
                    fill="url(#outflowG)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Longitudinal Trajectory Factual Interpretation */}
            {(range === "year" || range === "all") && longitudinal?.trajectoryInterpretation && (
              <div className="mt-3.5 pt-3 border-t border-[var(--glass-border)] text-center">
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {longitudinal.trajectoryInterpretation}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
