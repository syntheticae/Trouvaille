import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  Scale,
  Sparkles,
  PieChart,
  Info,
} from "lucide-react";
import type { Transaction, Category, Wallet } from "../../lib/types";
import {
  calculateSankeyFlow,
  type SankeyNode,
  type SankeyLink,
} from "../../lib/sankeyEngine";
import { triggerHaptic } from "../../lib/haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { IconRenderer } from "../ui/IconRenderer";
import { BottomSheet } from "../ui/BottomSheet";

interface CashflowSankeySectionProps {
  transactions: Transaction[];
  categories: Category[];
  wallets?: Wallet[];
  periodLabel?: string;
  className?: string;
  hideTitle?: boolean;
}

export function CashflowSankeySection({
  transactions,
  categories,
  periodLabel = "Current Period",
  className = "",
  hideTitle = false,
}: CashflowSankeySectionProps) {
  const { theme } = useTheme();
  const { isIndonesian } = useLanguage();
  const { formatWithPreferred, formatCompactWithPreferred } = useCurrency();
  const isDark = theme !== "light";

  const [mode, setMode] = useState<"macro" | "category">("macro");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [allAllocationsOpen, setAllAllocationsOpen] = useState(false);

  const sankeyData = useMemo(() => {
    return calculateSankeyFlow(transactions, categories, {
      width: 800,
      height: 520,
      mode,
      maxExpenseNodes: 7,
      language: isIndonesian ? "id" : "en",
    });
  }, [transactions, categories, mode, isIndonesian]);

  const { nodes, links, telemetry, viewBox } = sankeyData;

  const allocationNodes = useMemo(() => nodes.filter((n) => !n.isHub), [nodes]);

  // Find active element for tooltip details
  const activeLink = useMemo(
    () => (selectedLinkId ? links.find((l) => l.id === selectedLinkId) : null),
    [links, selectedLinkId],
  );

  const activeNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null),
    [nodes, selectedNodeId],
  );

  const handleNodeClick = (node: SankeyNode) => {
    triggerHaptic("light");
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
      setSelectedLinkId(null);
    }
  };

  const handleLinkClick = (link: SankeyLink) => {
    triggerHaptic("light");
    if (selectedLinkId === link.id) {
      setSelectedLinkId(null);
    } else {
      setSelectedLinkId(link.id);
      setSelectedNodeId(null);
    }
  };

  const clearSelection = () => {
    if (selectedNodeId || selectedLinkId) {
      setSelectedNodeId(null);
      setSelectedLinkId(null);
    }
  };

  // Helper to determine ribbon highlight opacity
  const getLinkOpacity = (link: SankeyLink) => {
    if (selectedLinkId) {
      return selectedLinkId === link.id ? 0.75 : 0.08;
    }
    if (selectedNodeId) {
      const isConnected =
        link.sourceId === selectedNodeId || link.targetId === selectedNodeId;
      return isConnected ? 0.75 : 0.08;
    }
    return 0.38;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Granularity Mode Switcher */}
      {!hideTitle ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-[17px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Alokasi Arus Kas" : "Cashflow Allocation"}
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                Sankey
              </span>
            </div>
            <p
              className="text-[12px] font-medium mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian
                ? "Distribusi transmisi pemasukan ke pos beban, utang, dan tabungan."
                : "Inflow distribution to expenses, debt, and retained capital."}
            </p>
          </div>

          {/* Granularity Toggle Pill */}
          <div
            className="flex p-1 rounded-2xl glass-surface shrink-0 self-start sm:self-auto"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => {
                setMode("macro");
                triggerHaptic("light");
                setSelectedNodeId(null);
                setSelectedLinkId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === "macro"
                  ? isDark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-zinc-900 text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Layers size={12} strokeWidth={1.75} />
              {isIndonesian ? "Grup Makro" : "By Macro Group"}
            </button>
            <button
              onClick={() => {
                setMode("category");
                triggerHaptic("light");
                setSelectedNodeId(null);
                setSelectedLinkId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === "category"
                  ? isDark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-zinc-900 text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <PieChart size={12} strokeWidth={1.75} />
              {isIndonesian ? "Kategori" : "By Category"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          <p
            className="text-[12px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isIndonesian
              ? `Transmisi alur dana · ${periodLabel}`
              : `Fund flow pathways · ${periodLabel}`}
          </p>

          {/* Granularity Toggle Pill */}
          <div
            className="flex p-1 rounded-2xl glass-surface shrink-0 self-start sm:self-auto"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => {
                setMode("macro");
                triggerHaptic("light");
                setSelectedNodeId(null);
                setSelectedLinkId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === "macro"
                  ? isDark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-zinc-900 text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Layers size={12} strokeWidth={1.75} />
              {isIndonesian ? "Grup Makro" : "By Macro Group"}
            </button>
            <button
              onClick={() => {
                setMode("category");
                triggerHaptic("light");
                setSelectedNodeId(null);
                setSelectedLinkId(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === "category"
                  ? isDark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-zinc-900 text-white shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <PieChart size={12} strokeWidth={1.75} />
              {isIndonesian ? "Kategori" : "By Category"}
            </button>
          </div>
        </div>
      )}

      {/* Cashflow Telemetry Bento Banner */}
      <div className="grid grid-cols-3 gap-2">
        {/* Metric 1: Capital Retention Rate */}
        <div
          className="glass-surface p-3 rounded-2xl flex flex-col justify-between min-w-0"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Retensi Kas" : "Retention"}
            </span>
            <ShieldCheck size={12} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[13px] font-semibold tracking-tight truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {telemetry.isDeficit
                ? isIndonesian
                  ? "Defisit"
                  : "Deficit"
                : `${telemetry.savingsRatePct}% ${isIndonesian ? "Tersimpan" : "Saved"}`}
            </p>
            <p
              className="text-[10px] mt-0.5 font-medium truncate tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {telemetry.isDeficit
                ? `${formatCompactWithPreferred(telemetry.netSavings)} ${isIndonesian ? "defisit" : "over"}`
                : `${formatCompactWithPreferred(telemetry.netSavings)} ${isIndonesian ? "tersimpan" : "saved"}`}
            </p>
          </div>
        </div>

        {/* Metric 2: Needs vs Wants Ratio */}
        <div
          className="glass-surface p-3 rounded-2xl flex flex-col justify-between min-w-0"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Kebutuhan / Gaya" : "Needs / Wants"}
            </span>
            <Scale size={12} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[13px] font-semibold tracking-tight truncate tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {telemetry.essentialPct}% · {telemetry.discretionaryPct}%
            </p>
            <p
              className="text-[10px] mt-0.5 font-medium truncate tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatCompactWithPreferred(telemetry.essentialAmount)} {isIndonesian ? "primer" : "needs"}
            </p>
          </div>
        </div>

        {/* Metric 3: Top Flow Sink */}
        <div
          className="glass-surface p-3 rounded-2xl flex flex-col justify-between min-w-0"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Pos Terbesar" : "Top Sink"}
            </span>
            <TrendingDown size={12} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[13px] font-semibold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
              title={telemetry.topDestinationName}
            >
              {telemetry.topDestinationName || (isIndonesian ? "Tidak Ada" : "None")}
            </p>
            <p
              className="text-[10px] mt-0.5 font-medium truncate tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatCompactWithPreferred(telemetry.topDestinationAmount)} · {telemetry.topDestinationPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Layman-Friendly Human Narrative Banner */}
      <div
        className="p-3.5 rounded-2xl glass-surface flex items-start gap-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Sparkles size={14} style={{ color: "var(--text-primary)" }} />
        </div>
        <div className="space-y-0.5 min-w-0">
          <h4
            className="text-[12px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Ringkasan Alur Dana" : "Flow Summary"}
          </h4>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {telemetry.totalInflow > 0 ? (
              isIndonesian ? (
                <>
                  Dari total pemasukan{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatWithPreferred(telemetry.totalInflow)}
                  </span>
                  ,{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {telemetry.essentialPct}%
                  </span>{" "}
                  teralokasi untuk kebutuhan primer,{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {telemetry.discretionaryPct}%
                  </span>{" "}
                  untuk kebutuhan fleksibel, dan{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {telemetry.savingsRatePct}% ({formatWithPreferred(Math.max(0, telemetry.netSavings))})
                  </span>{" "}
                  berhasil dipertahankan sebagai saldo bersih.
                </>
              ) : (
                <>
                  From total income of{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatWithPreferred(telemetry.totalInflow)}
                  </span>
                  ,{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {telemetry.essentialPct}%
                  </span>{" "}
                  routes to essentials,{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {telemetry.discretionaryPct}%
                  </span>{" "}
                  to discretionary, and{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {telemetry.savingsRatePct}% ({formatWithPreferred(Math.max(0, telemetry.netSavings))})
                  </span>{" "}
                  is retained as net savings.
                </>
              )
            ) : (
              isIndonesian ? (
                <>
                  Pengeluaran periode sebesar{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatWithPreferred(telemetry.totalOutflow)}
                  </span>{" "}
                  didanai dari cadangan likuiditas kas yang tersedia.
                </>
              ) : (
                <>
                  Period expenditure of{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatWithPreferred(telemetry.totalOutflow)}
                  </span>{" "}
                  is funded from available liquidity reserves.
                </>
              )
            )}
          </p>
        </div>
      </div>

      {/* Main Luxury Interactive Sankey Canvas */}
      <div
        className="glass-surface p-4 sm:p-6 rounded-[24px] relative overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
        onClick={clearSelection}
      >
        {/* Sub-header step labels */}
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-4 px-2">
          <span>{isIndonesian ? "1. Pemasukan" : "1. Inflow"}</span>
          <span>{isIndonesian ? "2. Alokasi" : "2. Allocation"}</span>
          <span>{isIndonesian ? "3. Beban & Retensi" : "3. Expenses & Savings"}</span>
        </div>

        {/* SVG Viewport */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            className="w-full h-auto select-none"
            style={{ minWidth: "680px" }}
          >
            {/* Gradients */}
            <defs>
              {/* Monochromatic Apple Luxury Link Gradients */}
              <linearGradient id="link-grad-source" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDark ? "#FFFFFF" : "#18181B"} stopOpacity="0.4" />
                <stop offset="100%" stopColor={isDark ? "#AEAEB2" : "#71717A"} stopOpacity="0.2" />
              </linearGradient>

              <linearGradient id="link-grad-dest" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDark ? "#AEAEB2" : "#71717A"} stopOpacity="0.2" />
                <stop offset="100%" stopColor={isDark ? "#FFFFFF" : "#18181B"} stopOpacity="0.4" />
              </linearGradient>

              <linearGradient id="link-grad-savings" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDark ? "#E4E4E7" : "#71717A"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isDark ? "#FFFFFF" : "#18181B"} stopOpacity="0.55" />
              </linearGradient>

              <linearGradient id="link-grad-deficit" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDark ? "#71717A" : "#A1A1AA"} stopOpacity="0.35" />
                <stop offset="100%" stopColor={isDark ? "#52525B" : "#71717A"} stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Links / Ribbons Layer */}
            <g className="sankey-links">
              {links.map((link) => {
                const isSavingsLink = link.targetId.includes("savings");
                const isDeficitLink = link.sourceId.includes("deficit");
                const gradId = isSavingsLink
                  ? "url(#link-grad-savings)"
                  : isDeficitLink
                  ? "url(#link-grad-deficit)"
                  : link.targetId === "hub-inflow"
                  ? "url(#link-grad-source)"
                  : "url(#link-grad-dest)";

                const opacity = getLinkOpacity(link);
                const isSelected = selectedLinkId === link.id;

                return (
                  <path
                    key={link.id}
                    d={link.pathD}
                    fill={gradId}
                    stroke={
                      isSelected
                        ? isDark
                          ? "#FFFFFF"
                          : "#18181B"
                        : "none"
                    }
                    strokeWidth={isSelected ? 1.5 : 0}
                    opacity={opacity}
                    className="transition-all duration-300 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLinkClick(link);
                    }}
                  />
                );
              })}
            </g>

            {/* Nodes Layer */}
            <g className="sankey-nodes">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                let strokeColor = isDark
                  ? "rgba(255, 255, 255, 0.14)"
                  : "rgba(0, 0, 0, 0.1)";
                let fillColor = isDark ? "#141417" : "#FFFFFF";

                if (node.isSavings) {
                  fillColor = isDark ? "#27272a" : "#f4f4f5";
                  strokeColor = isDark
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(0, 0, 0, 0.25)";
                } else if (node.isDeficit) {
                  fillColor = isDark ? "#18181b" : "#fafafa";
                  strokeColor = isDark
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.15)";
                } else if (node.isHub) {
                  fillColor = isDark ? "#1f1f24" : "#F4F4F5";
                }

                if (isSelected) {
                  strokeColor = isDark ? "#FFFFFF" : "#18181B";
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer select-none group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeClick(node);
                    }}
                  >
                    {/* Node Container Card */}
                    <rect
                      width={node.width}
                      height={node.height}
                      rx={12}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 1.75 : 1}
                      className="transition-all duration-200"
                    />

                    {/* Node Text & Values */}
                    <g transform="translate(10, 0)">
                      {/* Label line */}
                      <text
                        x={0}
                        y={Math.min(18, node.height * 0.45)}
                        fontSize={node.isHub ? 11 : 10}
                        fontWeight="700"
                        fill={isDark ? "#FFFFFF" : "#18181B"}
                      >
                        {node.label.length > 18
                          ? `${node.label.slice(0, 16)}…`
                          : node.label}
                      </text>

                      {/* Amount line */}
                      {node.height >= 32 && (
                        <text
                          x={0}
                          y={node.height - 8}
                          fontSize={10}
                          fontWeight="600"
                          fill={isDark ? "#A1A1AA" : "#71717A"}
                        >
                          {formatWithPreferred(node.amount)}
                        </text>
                      )}

                      {/* Percentage Badge */}
                      {node.height >= 32 && !node.isHub && (
                        <text
                          x={node.width - 24}
                          y={node.height - 8}
                          fontSize={9}
                          fontWeight="800"
                          textAnchor="end"
                          fill={isDark ? "#71717A" : "#A1A1AA"}
                        >
                          {node.percentage}%
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Interactive Floating Info Tooltip */}
        <AnimatePresence>
          {(activeLink || activeNode) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-4 p-3.5 rounded-2xl glass-surface flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--glass-fill)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <Info size={14} style={{ color: "var(--text-secondary)" }} />
                </div>
                <div>
                  <p
                    className="text-[13px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {activeLink
                      ? activeLink.label
                      : activeNode?.label}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {activeLink
                      ? `${activeLink.percentage}% ${isIndonesian ? "dari arus kas bruto" : "of gross cashflow"}`
                      : activeNode?.isSavings
                      ? isIndonesian ? "Surplus bersih disimpan sebagai aset likuid" : "Net surplus retained in liquid wealth"
                      : activeNode?.isDeficit
                      ? isIndonesian ? "Pengeluaran berlebih didanai dari cadangan" : "Excess spending funded from reserves"
                      : `${activeNode?.percentage}% ${isIndonesian ? "dari total alokasi" : "of total allocations"}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-[14px] font-semibold amount"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatWithPreferred(activeLink ? activeLink.value : activeNode?.amount ?? 0)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Itemized Flow Allocation Table */}
      <div
        className="glass-surface p-5 rounded-[24px]"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <h3
              className="text-[13px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {isIndonesian ? "Rincian Alokasi Modal" : "Capital Allocation Breakdown"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setAllAllocationsOpen(true);
                triggerHaptic("light");
              }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors active:scale-90 cursor-pointer"
              title={isIndonesian ? "Lihat semua alokasi" : "View all allocations"}
            >
              <Info size={13} />
            </button>
          </div>
          <span
            className="text-[11px] font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            {periodLabel}
          </span>
        </div>

        {/* Top 3 Allocation Stream Cards */}
        <div className="space-y-2">
          {allocationNodes.slice(0, 3).map((item) => (
            <div
              key={item.id}
              onClick={() => handleNodeClick(item)}
              className={`p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                selectedNodeId === item.id ? "ring-1 ring-white/30" : ""
              }`}
              style={{
                background: "var(--glass-fill)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  {item.emoji ? (
                    <IconRenderer icon={item.emoji} size="w-4 h-4" />
                  ) : item.isSavings ? (
                    <Sparkles size={14} style={{ color: "var(--text-primary)" }} />
                  ) : item.column === 0 ? (
                    <TrendingUp size={14} style={{ color: "var(--text-secondary)" }} />
                  ) : (
                    <TrendingDown size={14} style={{ color: "var(--text-secondary)" }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[13px] font-bold leading-tight truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.label}
                  </p>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.column === 0
                      ? isIndonesian ? "Aliran Pemasukan" : "Inflow Stream"
                      : item.isSavings
                      ? isIndonesian ? "Retensi Kekayaan" : "Wealth Retention"
                      : isIndonesian ? "Alokasi Pengeluaran" : "Outflow Allocation"}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className="text-[13px] font-bold amount leading-tight"
                  style={{
                    color: item.isSavings
                      ? "var(--accent)"
                      : item.column === 0
                      ? "var(--text-primary)"
                      : "var(--text-primary)",
                  }}
                >
                  {item.column === 0 || item.isSavings ? "+" : "-"}
                  {formatWithPreferred(item.amount)}
                </p>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View All Details Button */}
        {allocationNodes.length > 3 && (
          <button
            type="button"
            onClick={() => {
              setAllAllocationsOpen(true);
              triggerHaptic("light");
            }}
            className="w-full mt-3 py-2.5 rounded-xl text-center text-[11px] font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer select-none"
            style={{
              background: "var(--glass-fill)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <Info size={13} />
            <span>{isIndonesian ? `Lihat Semua (${allocationNodes.length}) Alokasi` : `View All (${allocationNodes.length}) Allocations`}</span>
          </button>
        )}
      </div>

      {/* Comprehensive Allocation Breakdown BottomSheet */}
      <BottomSheet
        isOpen={allAllocationsOpen}
        onClose={() => setAllAllocationsOpen(false)}
      >
        <div className="p-5 pb-20 space-y-3.5 safe-area-bottom">
          <div className="flex justify-between items-start">
            <div>
              <h3
                className="font-semibold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                {isIndonesian ? "Rincian Alokasi Modal" : "Capital Allocation Breakdown"}
              </h3>
              <p
                className="text-[12px] font-medium mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {isIndonesian
                  ? `${allocationNodes.length} aliran alokasi · ${periodLabel}`
                  : `${allocationNodes.length} allocation streams · ${periodLabel}`}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1 pb-6">
            {allocationNodes.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl flex items-center justify-between"
                style={{
                  background: "var(--glass-fill)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {item.emoji ? (
                      <IconRenderer icon={item.emoji} size="w-4 h-4" />
                    ) : item.isSavings ? (
                      <Sparkles size={14} style={{ color: "var(--text-primary)" }} />
                    ) : item.column === 0 ? (
                      <TrendingUp size={14} style={{ color: "var(--text-secondary)" }} />
                    ) : (
                      <TrendingDown size={14} style={{ color: "var(--text-secondary)" }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-bold leading-tight truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.label}
                    </p>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {item.column === 0
                        ? isIndonesian ? "Aliran Pemasukan" : "Inflow Stream"
                        : item.isSavings
                        ? isIndonesian ? "Retensi Kekayaan" : "Wealth Retention"
                        : isIndonesian ? "Alokasi Pengeluaran" : "Outflow Allocation"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className="text-[13px] font-bold amount leading-tight"
                    style={{
                      color: item.isSavings
                        ? "var(--accent)"
                        : "var(--text-primary)",
                    }}
                  >
                    {item.column === 0 || item.isSavings ? "+" : "-"}
                    {formatWithPreferred(item.amount)}
                  </p>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
