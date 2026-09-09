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
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { IconRenderer } from "../ui/IconRenderer";

interface CashflowSankeySectionProps {
  transactions: Transaction[];
  categories: Category[];
  wallets?: Wallet[];
  periodLabel?: string;
}

export function CashflowSankeySection({
  transactions,
  categories,
  periodLabel = "Current Period",
}: CashflowSankeySectionProps) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  const [mode, setMode] = useState<"macro" | "category">("macro");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const sankeyData = useMemo(() => {
    return calculateSankeyFlow(transactions, categories, {
      width: 800,
      height: 520,
      mode,
      maxExpenseNodes: 7,
    });
  }, [transactions, categories, mode]);

  const { nodes, links, telemetry, viewBox } = sankeyData;

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
    <div className="space-y-6">
      {/* Header & Granularity Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-[18px] font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Cashflow Allocation
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
            Inflow distribution to expenses, debt, and retained capital.
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
            By Macro Group
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
            By Category
          </button>
        </div>
      </div>

      {/* Cashflow Telemetry Bento Banner */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Metric 1: Capital Retention Rate */}
        <div
          className="glass-surface p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Retention Rate
            </span>
            <ShieldCheck size={13} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <p
              className="text-[15px] font-extrabold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {telemetry.isDeficit ? "Deficit" : `${telemetry.savingsRatePct}% Saved`}
            </p>
            <p
              className="text-[10px] mt-0.5 truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {telemetry.isDeficit
                ? `${formatRupiah(Math.abs(telemetry.netSavings))} over`
                : `${formatRupiah(telemetry.netSavings)} retained`}
            </p>
          </div>
        </div>

        {/* Metric 2: Needs vs Wants Ratio */}
        <div
          className="glass-surface p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Needs / Wants
            </span>
            <Scale size={13} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <p
              className="text-[15px] font-extrabold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {telemetry.essentialPct}% / {telemetry.discretionaryPct}%
            </p>
            <p
              className="text-[10px] mt-0.5 truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatRupiah(telemetry.essentialAmount)} essentials
            </p>
          </div>
        </div>

        {/* Metric 3: Top Flow Sink */}
        <div
          className="glass-surface p-3.5 rounded-2xl flex flex-col justify-between"
          style={{ border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Top Flow Sink
            </span>
            <TrendingDown size={13} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <p
              className="text-[15px] font-extrabold tracking-tight truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {telemetry.topDestinationName}
            </p>
            <p
              className="text-[10px] mt-0.5 truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {formatRupiah(telemetry.topDestinationAmount)} ({telemetry.topDestinationPct}%)
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
        <div className="space-y-0.5">
          <h4
            className="text-[12px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Flow Summary
          </h4>
          <p
            className="text-[11.5px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {telemetry.totalInflow > 0 ? (
              <>
                From total income of{" "}
                <span className="font-extrabold text-[var(--text-primary)]">
                  {formatRupiah(telemetry.totalInflow)}
                </span>
                ,{" "}
                <span className="font-extrabold text-[var(--text-primary)]">
                  {telemetry.essentialPct}%
                </span>{" "}
                routes to essentials,{" "}
                <span className="font-extrabold text-[var(--text-primary)]">
                  {telemetry.discretionaryPct}%
                </span>{" "}
                to discretionary, and{" "}
                <span className="font-extrabold text-[var(--text-primary)]">
                  {telemetry.savingsRatePct}% ({formatRupiah(Math.max(0, telemetry.netSavings))})
                </span>{" "}
                is retained as net savings.
              </>
            ) : (
              <>
                Period expenditure of{" "}
                <span className="font-extrabold text-[var(--text-primary)]">
                  {formatRupiah(telemetry.totalOutflow)}
                </span>{" "}
                is funded from available liquidity reserves.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Main Luxury Interactive Sankey Canvas */}
      <div
        className="glass-surface p-4 sm:p-6 rounded-[24px] relative overflow-hidden"
        style={{
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-card)",
        }}
        onClick={clearSelection}
      >
        {/* Sub-header step labels */}
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-4 px-2">
          <span>1. Inflow</span>
          <span>2. Allocation</span>
          <span>3. Expenses & Savings</span>
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
                          {formatRupiah(node.amount)}
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
                      ? `${activeLink.percentage}% of gross cashflow`
                      : activeNode?.isSavings
                      ? "Net surplus retained in liquid wealth"
                      : activeNode?.isDeficit
                      ? "Excess spending funded from reserves"
                      : `${activeNode?.percentage}% of total allocations`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-[14px] font-extrabold amount"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatRupiah(activeLink ? activeLink.value : activeNode?.amount ?? 0)}
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
          <h3
            className="text-[13px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Capital Allocation Breakdown
          </h3>
          <span
            className="text-[11px] font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            {periodLabel}
          </span>
        </div>

        <div className="space-y-2">
          {nodes
            .filter((n) => !n.isHub)
            .map((item) => (
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
                <div className="flex items-center gap-3">
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
                  <div>
                    <p
                      className="text-[13px] font-bold leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.label}
                    </p>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {item.column === 0
                        ? "Inflow Stream"
                        : item.isSavings
                        ? "Wealth Retention"
                        : "Outflow Allocation"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
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
                    {formatRupiah(item.amount)}
                  </p>
                  <span
                    className="text-[10px] font-extrabold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
