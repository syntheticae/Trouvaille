import { describe, it, expect } from "vitest";
import {
  loadStoredWidgets,
  reorderWidgets,
  cycleWidgetSize,
  setWidgetSize,
  toggleWidgetVisibility,
  filterVisibleWidgets,
  swapWidgetPosition,
  applyPresetToWidgets,
} from "../src/lib/widgetLayoutEngine";
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_STATISTICS_WIDGETS,
  CardWidgetConfig,
} from "../src/lib/widgetLayoutTypes";

describe("Widget Layout Engine", () => {
  it("loads default widgets when storage JSON is null or empty", () => {
    const loaded = loadStoredWidgets(null);
    expect(loaded.length).toBe(DEFAULT_HOME_WIDGETS.length);
    expect(loaded[0].id).toBe(DEFAULT_HOME_WIDGETS[0].id);
  });

  it("merges stored layout and preserves new default widgets", () => {
    const custom = JSON.stringify([
      { id: "net_portfolio", size: "full", order: 2, isVisible: true },
      { id: "spending_stability", size: "half", order: 0, isVisible: false },
    ]);
    const loaded = loadStoredWidgets(custom);
    expect(loaded.length).toBe(DEFAULT_HOME_WIDGETS.length);
    
    const spending = loaded.find((w) => w.id === "spending_stability");
    expect(spending?.size).toBe("half");
    expect(spending?.isVisible).toBe(false);
  });

  it("cycles widget size between supported sizes correctly", () => {
    const widgets: CardWidgetConfig[] = [
      {
        id: "spending_stability",
        title: "Stability",
        subtitle: "Variance",
        page: "home",
        category: "telemetry",
        size: "full",
        supportedSizes: ["full", "half"],
        order: 0,
        isVisible: true,
      },
    ];

    const cycled = cycleWidgetSize(widgets, "spending_stability");
    expect(cycled[0].size).toBe("half");

    const cycledBack = cycleWidgetSize(cycled, "spending_stability");
    expect(cycledBack[0].size).toBe("full");
  });

  it("does not change size if card only supports full size", () => {
    const widgets: CardWidgetConfig[] = [
      {
        id: "net_portfolio",
        title: "Net Portfolio",
        subtitle: "Wealth",
        page: "home",
        category: "portfolio",
        size: "full",
        supportedSizes: ["full"],
        order: 0,
        isVisible: true,
      },
    ];

    const cycled = cycleWidgetSize(widgets, "net_portfolio");
    expect(cycled[0].size).toBe("full");
  });

  it("sets widget size explicitly when supported", () => {
    const widgets = [...DEFAULT_HOME_WIDGETS];
    const updated = setWidgetSize(widgets, "spending_stability", "half");
    expect(updated.find((w) => w.id === "spending_stability")?.size).toBe("half");
  });

  it("toggles widget visibility and filters visible list", () => {
    const widgets = [...DEFAULT_HOME_WIDGETS];
    const cardId = "activity_heatmap";
    
    const toggled = toggleWidgetVisibility(widgets, cardId);
    expect(toggled.find((w) => w.id === cardId)?.isVisible).toBe(false);

    const visible = filterVisibleWidgets(toggled);
    expect(visible.length).toBe(DEFAULT_HOME_WIDGETS.length - 1);
    expect(visible.some((w) => w.id === cardId)).toBe(false);
  });

  it("reorders widgets accurately based on id sequence", () => {
    const widgets = [...DEFAULT_HOME_WIDGETS];
    const newOrder = ["split_bill", "upcoming_bills", "net_portfolio"];
    
    const reordered = reorderWidgets(widgets, newOrder);
    expect(reordered[0].id).toBe("split_bill");
    expect(reordered[1].id).toBe("upcoming_bills");
    expect(reordered[2].id).toBe("net_portfolio");
  });

  it("swaps horizontal position between adjacent half widgets correctly", () => {
    const widgets: CardWidgetConfig[] = [
      {
        id: "hero",
        title: "Hero",
        subtitle: "",
        page: "home",
        category: "telemetry",
        size: "full",
        supportedSizes: ["full"],
        order: 0,
        isVisible: true,
      },
      {
        id: "half_a",
        title: "Half A",
        subtitle: "",
        page: "home",
        category: "telemetry",
        size: "half",
        supportedSizes: ["half", "full"],
        order: 1,
        isVisible: true,
      },
      {
        id: "half_b",
        title: "Half B",
        subtitle: "",
        page: "home",
        category: "telemetry",
        size: "half",
        supportedSizes: ["half", "full"],
        order: 2,
        isVisible: true,
      },
    ];

    // Swapping half_a (which is in left column, col 0) with direction "right"
    const swappedRight = swapWidgetPosition(widgets, "half_a", "right");
    const visible = filterVisibleWidgets(swappedRight);
    expect(visible[1].id).toBe("half_b");
    expect(visible[2].id).toBe("half_a");

    // Toggle swap on half_b when it is in left column (col 0)
    const toggled = swapWidgetPosition(swappedRight, "half_b", "toggle");
    const visibleToggled = filterVisibleWidgets(toggled);
    expect(visibleToggled[1].id).toBe("half_a");
    expect(visibleToggled[2].id).toBe("half_b");
  });

  describe("Statistics Presets & Layout Engine", () => {
    it("loads default statistics widgets properly", () => {
      const loaded = loadStoredWidgets(null, DEFAULT_STATISTICS_WIDGETS);
      expect(loaded.length).toBe(DEFAULT_STATISTICS_WIDGETS.length);
      expect(loaded.map((w) => w.id)).toContain("health_score");
      expect(loaded.map((w) => w.id)).toContain("monte_carlo");
      expect(loaded.map((w) => w.id)).toContain("fire_planner");
    });

    it("applies 'executive' preset to statistics widgets correctly", () => {
      const updated = applyPresetToWidgets(DEFAULT_STATISTICS_WIDGETS, "executive");
      const visible = filterVisibleWidgets(updated);

      expect(visible.some((w) => w.id === "health_score")).toBe(true);
      expect(visible.some((w) => w.id === "cashflow_outlook")).toBe(true);
      expect(visible.some((w) => w.id === "liquidity_horizon")).toBe(true);
      expect(visible.some((w) => w.id === "monte_carlo")).toBe(true);
      expect(visible.some((w) => w.id === "fire_planner")).toBe(true);
      expect(visible.some((w) => w.id === "spending_patterns")).toBe(true);
      expect(visible.some((w) => w.id === "personal_financial_model")).toBe(true);
      expect(visible.some((w) => w.id === "what_if_simulator")).toBe(true);

      // Hidden in executive
      expect(visible.some((w) => w.id === "zero_based_envelopes")).toBe(false);
      expect(visible.some((w) => w.id === "debt_payoff")).toBe(false);
      expect(visible.some((w) => w.id === "spending_density_heatmap")).toBe(false);
    });

    it("applies 'telemetry' preset with operational focus", () => {
      const updated = applyPresetToWidgets(DEFAULT_STATISTICS_WIDGETS, "telemetry");
      const visible = filterVisibleWidgets(updated);

      expect(visible.some((w) => w.id === "health_score")).toBe(true);
      expect(visible.some((w) => w.id === "cashflow_outlook")).toBe(true);
      expect(visible.some((w) => w.id === "liquidity_horizon")).toBe(true);
      expect(visible.some((w) => w.id === "spending_patterns")).toBe(true);
      expect(visible.some((w) => w.id === "spending_density_heatmap")).toBe(true);

      // Planning models hidden
      expect(visible.some((w) => w.id === "monte_carlo")).toBe(false);
      expect(visible.some((w) => w.id === "fire_planner")).toBe(false);
      expect(visible.some((w) => w.id === "personal_financial_model")).toBe(false);
    });

    it("applies 'planning' preset with wealth and retirement focus", () => {
      const updated = applyPresetToWidgets(DEFAULT_STATISTICS_WIDGETS, "planning");
      const visible = filterVisibleWidgets(updated);

      expect(visible.some((w) => w.id === "fire_planner")).toBe(true);
      expect(visible.some((w) => w.id === "monte_carlo")).toBe(true);
      expect(visible.some((w) => w.id === "personal_financial_model")).toBe(true);
      expect(visible.some((w) => w.id === "what_if_simulator")).toBe(true);
      expect(visible.some((w) => w.id === "debt_payoff")).toBe(true);
      expect(visible.some((w) => w.id === "zero_based_envelopes")).toBe(true);
      expect(visible.some((w) => w.id === "liquidity_horizon")).toBe(true);

      // Operational telemetry hidden
      expect(visible.some((w) => w.id === "health_score")).toBe(false);
      expect(visible.some((w) => w.id === "spending_patterns")).toBe(false);
      expect(visible.some((w) => w.id === "spending_density_heatmap")).toBe(false);
    });

    it("applies 'essential' preset with minimal cards across all sections", () => {
      const updated = applyPresetToWidgets(DEFAULT_STATISTICS_WIDGETS, "essential");
      const visible = filterVisibleWidgets(updated);

      expect(visible.length).toBe(6);
      expect(visible.map((w) => w.id)).toEqual([
        "health_score",
        "cashflow_outlook",
        "liquidity_horizon",
        "financial_report",
        "cashflow_summary",
        "asset_analytics",
      ]);
      // Verify every section has at least one card
      expect(visible.some((w) => ["financial_report", "monthly_review", "personal_baseline", "expense_structure"].includes(w.id))).toBe(true);
      expect(visible.some((w) => ["health_score", "cashflow_outlook", "liquidity_horizon"].includes(w.id))).toBe(true);
      expect(visible.some((w) => ["cashflow_summary", "cashflow_sankey"].includes(w.id))).toBe(true);
      expect(visible.some((w) => w.id === "asset_analytics")).toBe(true);
    });

    it("ensures every preset has at least one card in each of the 4 analytics sections", () => {
      const presets = ["executive", "telemetry", "planning", "essential"] as const;
      const reportCards = ["financial_report", "monthly_review", "personal_baseline", "expense_structure"];
      const intelligenceCards = ["health_score", "cashflow_outlook", "liquidity_horizon", "monte_carlo", "fire_planner", "spending_patterns", "spending_density_heatmap", "zero_based_envelopes", "debt_payoff", "what_if_simulator", "personal_financial_model"];
      const cashflowCards = ["cashflow_summary", "cashflow_sankey"];
      const assetCards = ["asset_analytics"];

      for (const presetKey of presets) {
        const updated = applyPresetToWidgets(DEFAULT_STATISTICS_WIDGETS, presetKey);
        const visible = filterVisibleWidgets(updated);

        const hasReport = visible.some((w) => reportCards.includes(w.id));
        const hasIntel = visible.some((w) => intelligenceCards.includes(w.id));
        const hasCashflow = visible.some((w) => cashflowCards.includes(w.id));
        const hasAsset = visible.some((w) => assetCards.includes(w.id));

        expect(hasReport, `Preset ${presetKey} must have at least one report card`).toBe(true);
        expect(hasIntel, `Preset ${presetKey} must have at least one intelligence card`).toBe(true);
        expect(hasCashflow, `Preset ${presetKey} must have at least one cashflow card`).toBe(true);
        expect(hasAsset, `Preset ${presetKey} must have at least one asset card`).toBe(true);
      }
    });
  });
});
