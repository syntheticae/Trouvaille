import { describe, it, expect } from "vitest";
import {
  loadStoredWidgets,
  reorderWidgets,
  cycleWidgetSize,
  setWidgetSize,
  toggleWidgetVisibility,
  filterVisibleWidgets,
} from "../src/lib/widgetLayoutEngine";
import { DEFAULT_HOME_WIDGETS, CardWidgetConfig } from "../src/lib/widgetLayoutTypes";

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
});
