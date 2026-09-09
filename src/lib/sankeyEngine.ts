import type { Transaction, Category } from "./types";
import { resolveTransactionCategory } from "./categoryResolver";
import { getCategoryParent } from "../hooks/useCategories";

export interface SankeyNode {
  id: string;
  label: string;
  amount: number;
  percentage: number; // % of total gross cashflow
  column: 0 | 1 | 2; // 0 = Inflows, 1 = Central Hub, 2 = Destinations
  x: number;
  y: number;
  width: number;
  height: number;
  isSavings?: boolean;
  isDeficit?: boolean;
  isHub?: boolean;
  emoji?: string;
  color?: string;
}

export interface SankeyLink {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  value: number;
  percentage: number;
  sourceY0: number;
  sourceY1: number;
  targetY0: number;
  targetY1: number;
  pathD: string;
}

export interface SankeyTelemetry {
  totalInflow: number;
  totalOutflow: number;
  netSavings: number;
  savingsRatePct: number;
  isDeficit: boolean;
  essentialAmount: number;
  essentialPct: number;
  discretionaryAmount: number;
  discretionaryPct: number;
  topDestinationName: string;
  topDestinationAmount: number;
  topDestinationPct: number;
}

export interface SankeyLayoutResult {
  nodes: SankeyNode[];
  links: SankeyLink[];
  telemetry: SankeyTelemetry;
  viewBox: { width: number; height: number };
}

export interface SankeyEngineOptions {
  width?: number;
  height?: number;
  mode?: "macro" | "category";
  maxExpenseNodes?: number;
}

const ESSENTIAL_PARENTS = new Set([
  "papan",
  "pangan",
  "sandang",
  "transportasi",
  "komunikasi",
  "keluarga",
  "biaya",
]);

function isEssentialCategory(name: string, parentName: string): boolean {
  const p = parentName.toLowerCase();
  const n = name.toLowerCase();
  if (
    n.includes("kopi") ||
    n.includes("cafe") ||
    n.includes("liburan") ||
    n.includes("gadget") ||
    n.includes("nongkrong") ||
    n.includes("streaming") ||
    n.includes("game")
  ) {
    return false;
  }
  return ESSENTIAL_PARENTS.has(p);
}

export function calculateSankeyFlow(
  transactions: Transaction[],
  categories: Category[] = [],
  options: SankeyEngineOptions = {},
): SankeyLayoutResult {
  const width = options.width ?? 800;
  const height = options.height ?? 500;
  const mode = options.mode ?? "macro";
  const maxExpenseNodes = options.maxExpenseNodes ?? 6;

  // 1. Filter out internal transfers
  const validTxs = transactions.filter((t) => t.type !== "transfer");

  // 2. Aggregate Inflows
  const incomeMap = new Map<string, { label: string; amount: number; emoji?: string }>();
  let totalInflow = 0;

  validTxs
    .filter((t) => t.type === "income")
    .forEach((t) => {
      const amt = Number(t.amount || 0);
      if (amt <= 0) return;
      totalInflow += amt;
      const resolved = resolveTransactionCategory(t, categories);
      const name = resolved.name || "General Income";
      const ex = incomeMap.get(name) || { label: name, amount: 0, emoji: resolved.emoji };
      ex.amount += amt;
      incomeMap.set(name, ex);
    });

  // 3. Aggregate Outflows
  const expenseMap = new Map<string, { label: string; amount: number; emoji?: string; isEssential: boolean }>();
  let totalOutflow = 0;
  let essentialAmount = 0;

  validTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const amt = Number(t.amount || 0);
      if (amt <= 0) return;
      totalOutflow += amt;

      const resolved = resolveTransactionCategory(t, categories);
      const parentName = getCategoryParent(resolved.name);
      const isEssential = isEssentialCategory(resolved.name, parentName);
      if (isEssential) essentialAmount += amt;

      const key = mode === "macro" ? parentName : resolved.name;
      const ex = expenseMap.get(key) || {
        label: key,
        amount: 0,
        emoji: resolved.emoji,
        isEssential,
      };
      ex.amount += amt;
      expenseMap.set(key, ex);
    });

  const discretionaryAmount = Math.max(0, totalOutflow - essentialAmount);
  const netSavings = totalInflow - totalOutflow;
  const isDeficit = netSavings < 0;
  const savingsRatePct = totalInflow > 0 ? Math.max(0, Math.round((netSavings / totalInflow) * 100)) : 0;
  const essentialPct = totalOutflow > 0 ? Math.round((essentialAmount / totalOutflow) * 100) : 0;
  const discretionaryPct = totalOutflow > 0 ? 100 - essentialPct : 0;

  // Base gross flow for conservation of energy/balance
  const totalFlow = Math.max(totalInflow, totalOutflow, 1);

  // 4. Build Source Items (Column 0)
  interface RawNodeItem {
    id: string;
    label: string;
    amount: number;
    emoji?: string;
    isSavings?: boolean;
    isDeficit?: boolean;
    isHub?: boolean;
  }

  const rawSources: RawNodeItem[] = [];
  if (totalInflow === 0) {
    rawSources.push({
      id: "src-reserves",
      label: "Cash Reserves",
      amount: totalFlow,
    });
  } else {
    Array.from(incomeMap.values())
      .sort((a, b) => b.amount - a.amount)
      .forEach((inc, idx) => {
        rawSources.push({
          id: `src-${idx}`,
          label: inc.label,
          amount: inc.amount,
          emoji: inc.emoji,
        });
      });

    // If there's a deficit, add a source for the deficit funded by cash reserves
    if (isDeficit) {
      rawSources.push({
        id: "src-deficit-cushion",
        label: "Reserves Cushion",
        amount: Math.abs(netSavings),
        isDeficit: true,
      });
    }
  }

  // 5. Build Hub (Column 1)
  const rawHub: RawNodeItem = {
    id: "hub-inflow",
    label: "Total Cashflow",
    amount: totalFlow,
    isHub: true,
  };

  // 6. Build Destination Items (Column 2)
  const rawDestinations: RawNodeItem[] = [];
  const sortedExpenses = Array.from(expenseMap.values()).sort((a, b) => b.amount - a.amount);

  if (sortedExpenses.length <= maxExpenseNodes) {
    sortedExpenses.forEach((exp, idx) => {
      rawDestinations.push({
        id: `dest-${idx}`,
        label: exp.label,
        amount: exp.amount,
        emoji: exp.emoji,
      });
    });
  } else {
    const topExp = sortedExpenses.slice(0, maxExpenseNodes - 1);
    const restExp = sortedExpenses.slice(maxExpenseNodes - 1);
    const otherAmt = restExp.reduce((s, e) => s + e.amount, 0);

    topExp.forEach((exp, idx) => {
      rawDestinations.push({
        id: `dest-${idx}`,
        label: exp.label,
        amount: exp.amount,
        emoji: exp.emoji,
      });
    });
    if (otherAmt > 0) {
      rawDestinations.push({
        id: "dest-other",
        label: "Other Outflow",
        amount: otherAmt,
      });
    }
  }

  // If there is net savings surplus, add it to destinations
  if (netSavings > 0) {
    rawDestinations.push({
      id: "dest-savings",
      label: "Retained Savings",
      amount: netSavings,
      isSavings: true,
    });
  }

  // Top destination telemetry
  const topDest = [...sortedExpenses][0];
  const topDestinationName = topDest ? topDest.label : "None";
  const topDestinationAmount = topDest ? topDest.amount : 0;
  const topDestinationPct = totalOutflow > 0 && topDest ? Math.round((topDest.amount / totalOutflow) * 100) : 0;

  // 7. Coordinate Geometry Layout
  const paddingX = 24;
  const paddingY = 32;
  const colWidth = 150;
  const hubWidth = 120;
  const colGap = (width - 2 * paddingX - 2 * colWidth - hubWidth) / 2;

  const col0X = paddingX;
  const col1X = col0X + colWidth + colGap;
  const col2X = col1X + hubWidth + colGap;

  const availableHeight = height - 2 * paddingY;
  const minNodeHeight = 36;
  const gapY = 10;

  function layoutColumn(
    items: RawNodeItem[],
    column: 0 | 1 | 2,
    colX: number,
    nodeW: number,
  ): SankeyNode[] {
    const n = items.length;
    if (n === 0) return [];

    const totalGaps = (n - 1) * gapY;
    const usableH = Math.max(availableHeight - totalGaps, n * minNodeHeight);

    // Compute raw proportional heights
    const rawHeights = items.map((it) =>
      Math.max(minNodeHeight, Math.round((it.amount / totalFlow) * usableH)),
    );

    const sumH = rawHeights.reduce((s, h) => s + h, 0);
    const scale = sumH > 0 ? (usableH / sumH) : 1;

    // Normalizing heights
    const finalHeights = rawHeights.map((h) => Math.max(minNodeHeight, Math.round(h * scale)));
    const totalRenderedH = finalHeights.reduce((s, h) => s + h, 0) + totalGaps;

    // Center column vertically
    let currentY = paddingY + Math.max(0, (availableHeight - totalRenderedH) / 2);

    return items.map((it, idx) => {
      const h = finalHeights[idx];
      const node: SankeyNode = {
        id: it.id,
        label: it.label,
        amount: it.amount,
        percentage: Math.round((it.amount / totalFlow) * 100),
        column,
        x: colX,
        y: currentY,
        width: nodeW,
        height: h,
        emoji: it.emoji,
        isSavings: it.isSavings,
        isDeficit: it.isDeficit,
        isHub: it.isHub,
      };
      currentY += h + gapY;
      return node;
    });
  }

  const sourceNodes = layoutColumn(rawSources, 0, col0X, colWidth);
  const hubNodes = layoutColumn([rawHub], 1, col1X, hubWidth);
  const destNodes = layoutColumn(rawDestinations, 2, col2X, colWidth);

  const allNodes = [...sourceNodes, ...hubNodes, ...destNodes];
  const hubNode = hubNodes[0];

  function buildRibbonPath(
    x1: number,
    y1Top: number,
    y1Bottom: number,
    x2: number,
    y2Top: number,
    y2Bottom: number,
  ): string {
    const r = (v: number) => Math.round(v * 10) / 10;
    const dx = (x2 - x1) * 0.45;
    return `M ${r(x1)} ${r(y1Top)} C ${r(x1 + dx)} ${r(y1Top)}, ${r(x2 - dx)} ${r(y2Top)}, ${r(x2)} ${r(y2Top)} L ${r(x2)} ${r(y2Bottom)} C ${r(x2 - dx)} ${r(y2Bottom)}, ${r(x1 + dx)} ${r(y1Bottom)}, ${r(x1)} ${r(y1Bottom)} Z`;
  }

  // 8. Generate Ribbon Links (Bézier Curves)
  const links: SankeyLink[] = [];

  // Sources -> Hub with exact proportional partition of hubNode.height
  const totalSrcAmt = sourceNodes.reduce((s, n) => s + n.amount, 0) || totalFlow;
  let hubSourceOffset = 0;
  sourceNodes.forEach((src, idx) => {
    const isLast = idx === sourceNodes.length - 1;
    const linkFraction = src.amount / totalSrcAmt;
    const linkThicknessAtHub = isLast
      ? Math.max(2, hubNode.height - hubSourceOffset)
      : Math.max(2, Math.round(linkFraction * hubNode.height));

    const x1 = src.x + src.width;
    const y1Top = src.y;
    const y1Bottom = src.y + src.height;

    const x2 = hubNode.x;
    const y2Top = hubNode.y + hubSourceOffset;
    const y2Bottom = y2Top + linkThicknessAtHub;
    hubSourceOffset += linkThicknessAtHub;

    const pathD = buildRibbonPath(x1, y1Top, y1Bottom, x2, y2Top, y2Bottom);

    links.push({
      id: `link-${src.id}->${hubNode.id}`,
      sourceId: src.id,
      targetId: hubNode.id,
      label: `${src.label} → Total Flow`,
      value: src.amount,
      percentage: src.percentage,
      sourceY0: y1Top,
      sourceY1: y1Bottom,
      targetY0: y2Top,
      targetY1: y2Bottom,
      pathD,
    });
  });

  // Hub -> Destinations with exact proportional partition of hubNode.height
  const totalDestAmt = destNodes.reduce((s, n) => s + n.amount, 0) || totalFlow;
  let hubDestOffset = 0;
  destNodes.forEach((dest, idx) => {
    const isLast = idx === destNodes.length - 1;
    const linkFraction = dest.amount / totalDestAmt;
    const linkThicknessAtHub = isLast
      ? Math.max(2, hubNode.height - hubDestOffset)
      : Math.max(2, Math.round(linkFraction * hubNode.height));

    const x1 = hubNode.x + hubNode.width;
    const y1Top = hubNode.y + hubDestOffset;
    const y1Bottom = y1Top + linkThicknessAtHub;
    hubDestOffset += linkThicknessAtHub;

    const x2 = dest.x;
    const y2Top = dest.y;
    const y2Bottom = dest.y + dest.height;

    const pathD = buildRibbonPath(x1, y1Top, y1Bottom, x2, y2Top, y2Bottom);

    links.push({
      id: `link-${hubNode.id}->${dest.id}`,
      sourceId: hubNode.id,
      targetId: dest.id,
      label: `Total Flow → ${dest.label}`,
      value: dest.amount,
      percentage: dest.percentage,
      sourceY0: y1Top,
      sourceY1: y1Bottom,
      targetY0: y2Top,
      targetY1: y2Bottom,
      pathD,
    });
  });

  return {
    nodes: allNodes,
    links,
    telemetry: {
      totalInflow,
      totalOutflow,
      netSavings,
      savingsRatePct,
      isDeficit,
      essentialAmount,
      essentialPct,
      discretionaryAmount,
      discretionaryPct,
      topDestinationName,
      topDestinationAmount,
      topDestinationPct,
    },
    viewBox: { width, height },
  };
}
