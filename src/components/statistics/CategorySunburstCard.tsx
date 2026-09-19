import { useState, useMemo } from "react";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import type { Transaction, Category } from "../../lib/types";
import { formatRupiah } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import {
  SunburstChart,
  type SunburstParentNode,
  type SunburstChildNode,
} from "../charts/SunburstChart";
import { getCategoryParent } from "../../hooks/useCategories";
import { resolveTransactionCategory } from "../../lib/categoryResolver";
import { IconRenderer } from "../ui/IconRenderer";
import { isCorrectionTx } from "../../lib/financialMath";

interface CategorySunburstCardProps {
  transactions: Transaction[];
  categories: Category[];
  timeframeLabel?: string;
  defaultType?: "expense" | "income";
}

export function CategorySunburstCard({
  transactions,
  categories,
  timeframeLabel = "Current Period",
  defaultType = "expense",
}: CategorySunburstCardProps) {
  const [breakdownType, setBreakdownType] = useState<"expense" | "income">(defaultType);
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    name: string;
    value: number;
    tier: "parent" | "child" | "root";
    percentage: number;
    parentId?: string;
  } | null>(null);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // 1. Filter transactions by type & valid status
  const filteredTxs = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === breakdownType &&
        !isCorrectionTx(t) &&
        Number(t.amount || 0) > 0,
    );
  }, [transactions, breakdownType]);

  // 2. Aggregate into hierarchical two-tier data structure (Parent -> Child Categories)
  const {
    sunburstData,
    totalValue,
    dominantParent,
    largestChild,
    totalSubcategoriesCount,
  } = useMemo<{
    sunburstData: SunburstParentNode[];
    totalValue: number;
    dominantParent: SunburstParentNode | null;
    largestChild: { name: string; value: number; parent: string } | null;
    totalSubcategoriesCount: number;
  }>(() => {
      let total = 0;
      // parentName -> { id, name, value, childrenMap: Map<childName, childNode> }
      const parentMap = new Map<
        string,
        {
          id: string;
          name: string;
          value: number;
          childrenMap: Map<
            string,
            {
              id: string;
              name: string;
              value: number;
              count: number;
              emoji?: string;
            }
          >;
        }
      >();

      filteredTxs.forEach((t) => {
        const amt = Number(t.amount || 0);
        total += amt;

        const resolvedCat = resolveTransactionCategory(t, categories);
        const catName = resolvedCat.name || "Lainnya";
        const parentName = getCategoryParent(catName) || "Lainnya";

        let parentEntry = parentMap.get(parentName);
        if (!parentEntry) {
          parentEntry = {
            id: `parent-${parentName}`,
            name: parentName,
            value: 0,
            childrenMap: new Map(),
          };
          parentMap.set(parentName, parentEntry);
        }

        parentEntry.value += amt;

        let childEntry = parentEntry.childrenMap.get(catName);
        if (!childEntry) {
          childEntry = {
            id: `child-${parentName}-${catName}`,
            name: catName,
            value: 0,
            count: 0,
            emoji: resolvedCat.emoji,
          };
          parentEntry.childrenMap.set(catName, childEntry);
        }

        childEntry.value += amt;
        childEntry.count += 1;
      });

      // Transform to Sunburst data format sorted by volume descending
      const parents: SunburstParentNode[] = Array.from(parentMap.values())
        .map((p) => {
          const sortedChildren: SunburstChildNode[] = Array.from(
            p.childrenMap.values(),
          )
            .sort((a, b) => b.value - a.value)
            .map((c) => ({
              id: c.id,
              name: c.name,
              value: c.value,
              parentId: p.id,
              count: c.count,
              metadata: { emoji: c.emoji },
            }));

          return {
            id: p.id,
            name: p.name,
            value: p.value,
            children: sortedChildren,
            count: sortedChildren.reduce((s, c) => s + (c.count || 0), 0),
          };
        })
        .sort((a, b) => b.value - a.value);

      // Extract telemetry highlights
      const dominant = parents[0] || null;

      let topChild: { name: string; value: number; parent: string } | null = null;
      let totalChildren = 0;
      parents.forEach((p) => {
        p.children.forEach((c) => {
          totalChildren += 1;
          if (!topChild || c.value > topChild.value) {
            topChild = { name: c.name, value: c.value, parent: p.name };
          }
        });
      });

      return {
        sunburstData: parents,
        totalValue: total,
        dominantParent: dominant,
        largestChild: topChild,
        totalSubcategoriesCount: totalChildren,
      };
    }, [filteredTxs, categories]);

  const toggleParentExpand = (parentId: string) => {
    triggerHaptic("light");
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const handleSelectNode = (node: any) => {
    setSelectedNode(node);
    if (node && node.parentId) {
      // Auto-expand parent list if child is selected
      setExpandedParents((prev) => ({
        ...prev,
        [node.parentId]: true,
      }));
    }
  };

  return (
    <div className="p-5 rounded-[24px] glass-surface select-none space-y-4">
      {/* Header with Title & Outflow/Inflow Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} style={{ color: "var(--text-tertiary)" }} />
            <h2
              className="text-[14px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Capital Sunburst
            </h2>
            <span
              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border border-[var(--glass-border)]"
              style={{
                background: "var(--glass-fill)",
                color: "var(--text-tertiary)",
              }}
            >
              2-Tier Radial
            </span>
          </div>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Macro sectors (inner) to micro categories (outer) · {timeframeLabel}
          </p>
        </div>

        {/* Expense vs Income Mode Switch */}
        <div
          className="flex items-center p-1 rounded-xl self-start sm:self-auto"
          style={{
            background: "var(--glass-fill)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setBreakdownType("expense");
              setSelectedNode(null);
            }}
            className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background:
                breakdownType === "expense"
                  ? "var(--glass-fill-strong)"
                  : "transparent",
              color:
                breakdownType === "expense"
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setBreakdownType("income");
              setSelectedNode(null);
            }}
            className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background:
                breakdownType === "income"
                  ? "var(--glass-fill-strong)"
                  : "transparent",
              color:
                breakdownType === "income"
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
            }}
          >
            Income
          </button>
        </div>
      </div>

      {sunburstData.length > 0 ? (
        <>
          {/* Active Slice Inspection Pill or Reset Control */}
          <div className="flex items-center justify-between text-[11px] px-1">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] uppercase font-mono tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                {selectedNode ? "Inspecting" : "Tap slices to inspect"}
              </span>
              {selectedNode && (
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  · {selectedNode.name} ({selectedNode.percentage}%)
                </span>
              )}
            </div>

            {selectedNode && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedNode(null);
                }}
                className="flex items-center gap-1 text-[11px] font-medium hover:underline"
                style={{ color: "var(--text-secondary)" }}
              >
                <RotateCcw size={11} />
                <span>Reset view</span>
              </button>
            )}
          </div>

          {/* Core Interactive Sunburst Chart */}
          <div
            className="py-2 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <SunburstChart
              data={sunburstData}
              totalValue={totalValue}
              title="Total Flow"
              unitLabel={breakdownType === "expense" ? "Outflow" : "Inflow"}
              onSelectNode={handleSelectNode}
              height={300}
            />
          </div>

          {/* Executive Telemetry Pill Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div
              className="p-2.5 rounded-xl text-left"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9px] font-mono uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                DOMINANT SECTOR
              </span>
              <p
                className="text-[12px] font-bold truncate mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {dominantParent ? dominantParent.name : "N/A"}
              </p>
              {dominantParent && totalValue > 0 && (
                <p
                  className="text-[10px] font-medium mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {Math.round((dominantParent.value / totalValue) * 100)}% of{" "}
                  {breakdownType}
                </p>
              )}
            </div>

            <div
              className="p-2.5 rounded-xl text-left"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9px] font-mono uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                TOP CATEGORY
              </span>
              <p
                className="text-[12px] font-bold truncate mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {largestChild ? largestChild.name : "N/A"}
              </p>
              {largestChild && (
                <p
                  className="text-[10px] font-medium mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatRupiah(largestChild.value)}
                </p>
              )}
            </div>

            <div
              className="col-span-2 sm:col-span-1 p-2.5 rounded-xl text-left"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <span
                className="text-[9px] font-mono uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                TAXONOMY BREADTH
              </span>
              <p
                className="text-[12px] font-bold truncate mt-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {sunburstData.length} Sectors
              </p>
              <p
                className="text-[10px] font-medium mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {totalSubcategoriesCount} Subcategories
              </p>
            </div>
          </div>

          {/* Hierarchical Sector & Subcategory Explorer List */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center px-1">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Sector & Subcategory Hierarchy
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {sunburstData.length} Macro Groups
              </span>
            </div>

            <div className="space-y-1.5">
              {sunburstData.map((parent) => {
                const isExpanded = expandedParents[parent.id] ?? false;
                const isParentSelected =
                  selectedNode?.id === parent.id ||
                  selectedNode?.parentId === parent.id;
                const pctOfTotal =
                  totalValue > 0
                    ? Math.round((parent.value / totalValue) * 1000) / 10
                    : 0;

                return (
                  <div
                    key={parent.id}
                    className={`rounded-2xl transition-all ${
                      isParentSelected
                        ? "ring-1 ring-white/30"
                        : ""
                    }`}
                    style={{
                      background: isParentSelected
                        ? "var(--glass-fill-strong)"
                        : "var(--bg-elevated)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    {/* Parent Row */}
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform select-none"
                      onClick={() => toggleParentExpand(parent.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: isParentSelected
                              ? "#FFFFFF"
                              : "var(--text-tertiary)",
                          }}
                        />
                        <div className="min-w-0">
                          <p
                            className="text-[12px] font-bold truncate leading-snug"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {parent.name}
                          </p>
                          <p
                            className="text-[10px] font-medium leading-none mt-0.5"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {parent.children.length} subcategories · {parent.count} ops
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p
                            className="amount text-[12px] font-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {formatRupiah(parent.value)}
                          </p>
                          <p
                            className="text-[10px] font-mono font-medium mt-0.5"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {pctOfTotal}%
                          </p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-transform"
                          style={{
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subcategories Chip Breakdown */}
                    {isExpanded && parent.children.length > 0 && (
                      <div
                        className="px-3 pb-3 pt-1 border-t flex flex-wrap gap-1.5"
                        style={{ borderColor: "var(--glass-border)" }}
                      >
                        {parent.children.map((child) => {
                          const isChildSelected = selectedNode?.id === child.id;
                          const childPctOfParent =
                            parent.value > 0
                              ? Math.round((child.value / parent.value) * 100)
                              : 0;

                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic("light");
                                handleSelectNode({
                                  id: child.id,
                                  name: child.name,
                                  value: child.value,
                                  tier: "child",
                                  percentage:
                                    totalValue > 0
                                      ? Math.round(
                                          (child.value / totalValue) * 1000,
                                        ) / 10
                                      : 0,
                                  parentId: parent.id,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all active:scale-95"
                              style={{
                                background: isChildSelected
                                  ? "var(--text-primary)"
                                  : "var(--glass-fill)",
                                color: isChildSelected
                                  ? "var(--bg-canvas)"
                                  : "var(--text-primary)",
                                border: "1px solid var(--glass-border)",
                              }}
                            >
                              {child.metadata?.emoji && (
                                <IconRenderer
                                  icon={child.metadata.emoji}
                                  size="w-3 h-3"
                                />
                              )}
                              <span>{child.name}</span>
                              <span
                                className="font-mono text-[10px] opacity-75 ml-0.5"
                              >
                                {childPctOfParent}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div
          className="py-12 text-center rounded-2xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <p
            className="text-[13px] font-bold"
            style={{ color: "var(--text-secondary)" }}
          >
            No {breakdownType} recorded in {timeframeLabel}
          </p>
          <p
            className="text-[11px] mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Adjust filters or add transactions to inspect hierarchical flows
          </p>
        </div>
      )}
    </div>
  );
}
