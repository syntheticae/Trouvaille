// ======================================================================
// TROUVAILLE WIDGET LAYOUT ENGINE
// Pure state calculation engine for widget ordering, sizing, and persistence
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import type {
  CardWidgetConfig,
  WidgetSize,
} from "./widgetLayoutTypes";
import { DEFAULT_HOME_WIDGETS } from "./widgetLayoutTypes";

export const HOME_STORAGE_KEY = "trouvaille_home_widget_layout_v1";
export const STATS_STORAGE_KEY = "trouvaille_statistics_widget_layout_v1";
export const STORAGE_KEY = HOME_STORAGE_KEY;

export function loadStoredWidgets(
  storedJson: string | null,
  defaultWidgets: CardWidgetConfig[] = DEFAULT_HOME_WIDGETS,
): CardWidgetConfig[] {
  if (!storedJson) return defaultWidgets;
  try {
    const parsed: CardWidgetConfig[] = JSON.parse(storedJson);
    if (!Array.isArray(parsed)) return defaultWidgets;

    // Merge stored items with defaultWidgets to ensure forward compatibility
    const merged = defaultWidgets.map((def) => {
      const found = parsed.find((p) => p.id === def.id);
      if (!found) return def;
      return {
        ...def,
        size: (found.size && def.supportedSizes.includes(found.size) ? found.size : def.size),
        order: typeof found.order === "number" ? found.order : def.order,
        isVisible: typeof found.isVisible === "boolean" ? found.isVisible : def.isVisible,
      };
    });

    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return defaultWidgets;
  }
}

export function reorderWidgets(
  widgets: CardWidgetConfig[],
  newOrderIds: string[]
): CardWidgetConfig[] {
  const map = new Map(newOrderIds.map((id, index) => [id, index]));
  let nextIdx = newOrderIds.length;
  return [...widgets]
    .map((w) => {
      if (map.has(w.id)) {
        return { ...w, order: map.get(w.id)! };
      }
      return { ...w, order: nextIdx++ };
    })
    .sort((a, b) => a.order - b.order);
}

export function cycleWidgetSize(
  widgets: CardWidgetConfig[],
  cardId: string
): CardWidgetConfig[] {
  return widgets.map((w) => {
    if (w.id !== cardId) return w;
    if (w.supportedSizes.length <= 1) return w;
    const currentIdx = w.supportedSizes.indexOf(w.size);
    const nextIdx = (currentIdx + 1) % w.supportedSizes.length;
    return {
      ...w,
      size: w.supportedSizes[nextIdx],
    };
  });
}

export function setWidgetSize(
  widgets: CardWidgetConfig[],
  cardId: string,
  size: WidgetSize
): CardWidgetConfig[] {
  return widgets.map((w) => {
    if (w.id !== cardId) return w;
    if (!w.supportedSizes.includes(size)) return w;
    return { ...w, size };
  });
}

export function toggleWidgetVisibility(
  widgets: CardWidgetConfig[],
  cardId: string
): CardWidgetConfig[] {
  return widgets.map((w) => {
    if (w.id !== cardId) return w;
    return { ...w, isVisible: !w.isVisible };
  });
}

export function filterVisibleWidgets(
  widgets: CardWidgetConfig[]
): CardWidgetConfig[] {
  return [...widgets]
    .filter((w) => w.isVisible)
    .sort((a, b) => a.order - b.order);
}
