// ======================================================================
// TROUVAILLE CATEGORY BREAKDOWN CARD
// Outflow & Inflow distribution with Pie Chart, Parent grouping, & Envelopes
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import React from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { IconRenderer } from "../ui/IconRenderer";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useCurrency } from "../../contexts/CurrencyContext";

interface CategoryBreakdownCardProps {
  breakdownType: "expense" | "income";
  setBreakdownType: (type: "expense" | "income") => void;
  categoryStats: any[];
  activeBreakdownData: any[];
  groupMode: "category" | "parent";
  setGroupMode: (mode: "category" | "parent") => void;
  rangeTitle: string;
  categoryBreakdownExpanded: boolean;
  setCategoryBreakdownExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  totalBreakdownAmount: number;
  colors: {
    donut: string[];
    [key: string]: any;
  };
  renderCustomizedLabel: (props: any) => React.ReactNode;
  GlassTooltip: React.ComponentType<any>;
  range: string;
  intel: any;
  setSelectedCategoryShift: (shift: any) => void;
  categoryMoMShifts: any;
  frequencyStats: any;
  isDark: boolean;
  isIndonesian: boolean;
  setAllDetailsOpen: (open: boolean) => void;
}

export function CategoryBreakdownCard({
  breakdownType,
  setBreakdownType,
  categoryStats,
  activeBreakdownData,
  groupMode,
  setGroupMode,
  rangeTitle,
  categoryBreakdownExpanded,
  setCategoryBreakdownExpanded,
  totalBreakdownAmount,
  colors,
  renderCustomizedLabel,
  GlassTooltip,
  range,
  intel,
  setSelectedCategoryShift,
  categoryMoMShifts,
  frequencyStats,
  isDark,
  isIndonesian,
  setAllDetailsOpen,
}: CategoryBreakdownCardProps) {
  useCurrency();

  return (
    <div className="p-5 rounded-[24px] glass-surface">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {breakdownType === "expense"
                ? (isIndonesian ? "Rincian Pengeluaran" : "Expense Breakdown")
                : (isIndonesian ? "Rincian Pemasukan" : "Income Breakdown")}
            </h2>
            {categoryStats.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAllDetailsOpen(true);
                  triggerHaptic("light");
                }}
                className="w-5 h-5 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
                aria-label={isIndonesian ? "Detail Rincian" : "All Details"}
                title={isIndonesian ? "Detail Rincian" : "All Details"}
              >
                <Info size={11} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <p
            className="text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {activeBreakdownData.length}{" "}
            {groupMode === "parent"
              ? isIndonesian ? "grup induk" : "parent groups"
              : isIndonesian ? "kategori" : "categories"} ·{" "}
            {rangeTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex p-1 rounded-full"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() => setBreakdownType("expense")}
              className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              style={{
                background:
                  breakdownType === "expense" ? "var(--accent)" : "transparent",
                color:
                  breakdownType === "expense"
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
              }}
            >
              <ArrowDownCircle size={11} /> {isIndonesian ? "Keluar" : "Out"}
            </button>
            <button
              type="button"
              onClick={() => setBreakdownType("income")}
              className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              style={{
                background:
                  breakdownType === "income" ? "var(--accent)" : "transparent",
                color:
                  breakdownType === "income"
                    ? "var(--accent-ink)"
                    : "var(--text-secondary)",
              }}
            >
              <ArrowUpCircle size={11} /> {isIndonesian ? "Masuk" : "In"}
            </button>
          </div>

          {/* Fold/Unfold Toggle Button (>) */}
          <button
            type="button"
            onClick={() => {
              setCategoryBreakdownExpanded((v) => !v);
              triggerHaptic("light");
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform shrink-0"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            aria-label={categoryBreakdownExpanded ? (isIndonesian ? "Lipat" : "Collapse") : (isIndonesian ? "Bentangkan" : "Expand")}
            title={categoryBreakdownExpanded ? (isIndonesian ? "Lipat" : "Collapse") : (isIndonesian ? "Bentangkan" : "Expand")}
          >
            <motion.div
              animate={{ rotate: categoryBreakdownExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* When folded: Sleek minimal summary row */}
      {!categoryBreakdownExpanded && (
        <div
          onClick={() => {
            setCategoryBreakdownExpanded(true);
            triggerHaptic("light");
          }}
          className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--glass-border)] cursor-pointer text-[12px] select-none active:opacity-75 transition-opacity"
        >
          <span style={{ color: "var(--text-tertiary)" }}>
            {breakdownType === "expense"
              ? (isIndonesian ? "Total Pengeluaran" : "Total Outflow")
              : (isIndonesian ? "Total Pemasukan" : "Total Inflow")}
          </span>
          <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)" }}>
            <span className="amount">{formatRupiah(totalBreakdownAmount)}</span>
            <span className="text-[10px] font-normal" style={{ color: "var(--text-tertiary)" }}>
              ({activeBreakdownData.length} {groupMode === "parent" ? (isIndonesian ? "grup" : "groups") : (isIndonesian ? "kategori" : "categories")})
            </span>
            <ChevronRight size={13} style={{ color: "var(--text-tertiary)" }} />
          </div>
        </div>
      )}

      {/* When expanded: Full Breakdown Details */}
      <AnimatePresence initial={false}>
        {categoryBreakdownExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-4 pt-1"
          >
            {/* Sub-toggle: By Category vs By Parent (Induk) */}
            <div
              className="flex items-center gap-1.5 mb-4 p-1 rounded-xl w-fit"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <button
                onClick={() => setGroupMode("category")}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background:
                    groupMode === "category"
                      ? "var(--glass-fill-strong)"
                      : "transparent",
                  color:
                    groupMode === "category"
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                }}
              >
                {isIndonesian ? "Per Kategori" : "By Category"}
              </button>
              <button
                onClick={() => setGroupMode("parent")}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                style={{
                  background:
                    groupMode === "parent"
                      ? "var(--glass-fill-strong)"
                      : "transparent",
                  color:
                    groupMode === "parent"
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                }}
              >
                <Layers size={10} />
                {isIndonesian ? "Per Induk" : "By Parent (Induk)"}
              </button>
            </div>

            {activeBreakdownData.length > 0 ? (
              <>
                <div className="flex justify-center mb-5">
                  <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                    <PieChart width={200} height={200}>
                      <Pie
                        data={activeBreakdownData.map((c, i) => ({
                          name: c.name,
                          value: c.total,
                          fill: colors.donut[i % colors.donut.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={92}
                        dataKey="value"
                        paddingAngle={3}
                        stroke="none"
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {activeBreakdownData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={colors.donut[i % colors.donut.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<GlassTooltip />} />
                    </PieChart>
                    <div className="absolute text-center pointer-events-none">
                      <p
                        className="amount text-[18px]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {totalBreakdownAmount >= 1000000
                          ? (totalBreakdownAmount / 1000000).toFixed(1) + "M"
                          : (totalBreakdownAmount / 1000).toFixed(0) + "K"}
                      </p>
                      <p
                        className="text-[9px] font-semibold mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {breakdownType === "expense"
                          ? (isIndonesian ? "Total Keluar" : "Total Out")
                          : (isIndonesian ? "Total Masuk" : "Total In")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activeBreakdownData.slice(0, 6).map((cat, i) => {
                    const pct =
                      totalBreakdownAmount > 0
                        ? Math.round((cat.total / totalBreakdownAmount) * 100)
                        : 0;
                    const avgCat =
                      cat.count > 0 ? Math.round(cat.total / cat.count) : 0;
                    const shift =
                      range === "month"
                        ? intel.categoryShifts.find(
                            (s: any) => s.name.toLowerCase() === cat.name.toLowerCase(),
                          )
                        : null;
                    return (
                      <div
                        key={cat.name}
                        onClick={() => {
                          if (range === "month" && shift) {
                            setSelectedCategoryShift(shift);
                            triggerHaptic("light");
                          }
                        }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer active:scale-95 transition-transform select-none"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              background: colors.donut[i % colors.donut.length],
                            }}
                          />
                          <div className="min-w-0">
                            <p
                              className="text-[11px] font-semibold truncate max-w-[65px]"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {cat.name}
                            </p>
                            <p
                              className="text-[9px] font-medium"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {range === "month" && shift
                                ? `${shift.isIncrease ? "↑" : "↓"}${shift.pctChange}% MoM`
                                : `${isIndonesian ? "Rerata" : "Avg"} ${formatRupiah(avgCat)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className="amount text-[11px]"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Largest Category Change & Frequency Insights */}
                {range === "month" &&
                  (categoryMoMShifts.biggestIncrease ||
                    categoryMoMShifts.biggestDecrease) && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
                      {categoryMoMShifts.biggestIncrease && (
                        <div
                          onClick={() => {
                            const shift = intel.categoryShifts.find(
                              (s: any) =>
                                s.name.toLowerCase() ===
                                categoryMoMShifts.biggestIncrease?.name.toLowerCase(),
                            );
                            if (shift) {
                              setSelectedCategoryShift(shift);
                              triggerHaptic("light");
                            }
                          }}
                          className="p-2.5 rounded-xl cursor-pointer active:scale-95 transition-transform select-none"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <p
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {isIndonesian ? "Kenaikan Terbesar" : "Biggest Increase"}
                          </p>
                          <p
                            className="text-[12px] font-semibold truncate mt-0.5"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {categoryMoMShifts.biggestIncrease.name}
                          </p>
                          <p
                            className="text-[10px] font-medium mt-0.5"
                            style={{ color: "var(--text-primary)" }}
                          >
                            ↑ {categoryMoMShifts.biggestIncrease.pct}% (+
                            {formatRupiah(categoryMoMShifts.biggestIncrease.diff)})
                          </p>
                        </div>
                      )}
                      {categoryMoMShifts.biggestDecrease ? (
                        <div
                          onClick={() => {
                            const shift = intel.categoryShifts.find(
                              (s: any) =>
                                s.name.toLowerCase() ===
                                categoryMoMShifts.biggestDecrease?.name.toLowerCase(),
                            );
                            if (shift) {
                              setSelectedCategoryShift(shift);
                              triggerHaptic("light");
                            }
                          }}
                          className="p-2.5 rounded-xl cursor-pointer active:scale-95 transition-transform select-none"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          <p
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {isIndonesian ? "Penurunan Terbesar" : "Biggest Decrease"}
                          </p>
                          <p
                            className="text-[12px] font-semibold truncate mt-0.5"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {categoryMoMShifts.biggestDecrease.name}
                          </p>
                          <p
                            className="text-[10px] font-medium mt-0.5"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            ↓ {Math.abs(categoryMoMShifts.biggestDecrease.pct)}% (-
                            {formatRupiah(
                              Math.abs(categoryMoMShifts.biggestDecrease.diff),
                            )}
                            )
                          </p>
                        </div>
                      ) : (
                        frequencyStats?.mostFrequent && (
                          <div
                            className="p-2.5 rounded-xl"
                            style={{
                              background: "var(--bg-elevated)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            <p
                              className="text-[9px] font-semibold uppercase tracking-wider"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {isIndonesian ? "Paling Sering" : "Most Frequent"}
                            </p>
                            <p
                              className="text-[12px] font-semibold truncate mt-0.5"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {frequencyStats.mostFrequent.name}
                            </p>
                            <p
                              className="text-[10px] font-medium"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {frequencyStats.mostFrequent.count} {isIndonesian ? "trx" : "txs"} · {isIndonesian ? "Rerata" : "Avg"}{" "}
                              {formatRupiah(
                                Math.round(
                                  frequencyStats.mostFrequent.total /
                                    frequencyStats.mostFrequent.count,
                                ),
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                {/* Category Envelope Budgets Progress with Budget Risk Badges */}
                {range === "month" &&
                  breakdownType === "expense" &&
                  categoryStats.some(
                    (c) => c.budget_amount && c.budget_amount > 0,
                  ) && (
                    <div className="mt-4 pt-3 border-t border-[var(--glass-border)] space-y-2.5">
                      <div className="flex justify-between items-center px-1">
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian ? "Progres Anggaran Kategori" : "Category Budget Progress"}
                        </span>
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isIndonesian ? "Pelacakan Pos Anggaran" : "Envelope Tracking"}
                        </span>
                      </div>
                      {categoryStats
                        .filter((c) => c.budget_amount && c.budget_amount > 0)
                        .map((cat) => {
                          const budget = cat.budget_amount!;
                          const spent = cat.total;
                          const pct = Math.round((spent / budget) * 100);
                          const timePct =
                            (intel.daysElapsed / intel.totalDays) * 100;
                          let catRisk: "SAFE" | "WATCH" | "AT RISK" = "SAFE";
                          if (pct >= 95 || pct > timePct + 20) catRisk = "AT RISK";
                          else if (pct > timePct + 5) catRisk = "WATCH";

                          const catRiskLabel =
                            catRisk === "AT RISK"
                              ? isIndonesian ? "BERISIKO" : "AT RISK"
                              : catRisk === "WATCH"
                                ? isIndonesian ? "PANTAU" : "WATCH"
                                : isIndonesian ? "AMAN" : "SAFE";

                          return (
                            <div
                              key={cat.name}
                              className="p-3 rounded-2xl"
                              style={{
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--glass-border)",
                              }}
                            >
                              <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                  <IconRenderer icon={cat.emoji} size="w-4 h-4" />
                                  <span
                                    className="text-[12px] font-semibold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {cat.name}
                                  </span>
                                  <span
                                    className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{
                                      background:
                                        catRisk === "AT RISK"
                                          ? "var(--text-primary)"
                                          : "var(--glass-fill-strong)",
                                      color:
                                        catRisk === "AT RISK"
                                          ? "var(--bg-canvas)"
                                          : "var(--text-primary)",
                                      border: "1px solid var(--glass-border)",
                                    }}
                                  >
                                    {catRiskLabel}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span
                                    className="amount text-[12px]"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {formatRupiah(spent)} / {formatRupiah(budget)}
                                  </span>
                                  <span
                                    className="text-[11px] font-semibold ml-1.5"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                              <div
                                className="w-full h-1 rounded-full overflow-hidden"
                                style={{
                                  background: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.05)",
                                }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, pct)}%`,
                                    background: isDark ? "rgba(255,255,255,0.85)" : "rgba(18,18,18,0.85)",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
              </>
            ) : (
              <div
                className="py-10 text-center rounded-2xl"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {isIndonesian
                    ? `Belum ada ${breakdownType === "expense" ? "pengeluaran" : "pemasukan"} tercatat`
                    : `No ${breakdownType} recorded`}
                </p>
                <p
                  className="text-[11px] mt-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian ? "Coba rentang waktu lain" : "Try another timeframe"}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
