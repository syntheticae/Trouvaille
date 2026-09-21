// ======================================================================
// TROUVAILLE WIDGET LAYOUT HOOK
// Reactive iOS Springboard layout management with LocalStorage persistence
// Strictly compliant with GEMINI.md: Monochrome Apple Luxury Theme
// ======================================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  CardWidgetConfig,
  WidgetSize,
  HomePresetKey,
  StatisticsPresetKey,
} from "../lib/widgetLayoutTypes";
import { DEFAULT_HOME_WIDGETS } from "../lib/widgetLayoutTypes";
import {
  STORAGE_KEY,
  loadStoredWidgets,
  reorderWidgets,
  cycleWidgetSize,
  setWidgetSize,
  toggleWidgetVisibility,
  filterVisibleWidgets,
  applyPresetToWidgets,
  swapWidgetPosition,
} from "../lib/widgetLayoutEngine";
import { triggerHaptic } from "../lib/haptics";

interface UseWidgetLayoutOptions {
  storageKey?: string;
  defaultWidgets?: CardWidgetConfig[];
}

export function useWidgetLayout(options?: UseWidgetLayoutOptions) {
  const storageKey = options?.storageKey || STORAGE_KEY;
  const defaultWidgets = options?.defaultWidgets || DEFAULT_HOME_WIDGETS;

  const [isEditMode, setIsEditModeState] = useState(false);
  const [widgets, setWidgets] = useState<CardWidgetConfig[]>(() => {
    return loadStoredWidgets(
      typeof window !== "undefined" ? localStorage.getItem(storageKey) : null,
      defaultWidgets
    );
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgets));
    } catch (e) {
      console.warn("[useWidgetLayout] Failed to write layout to storage:", e);
    }
  }, [storageKey, widgets]);

  const setIsEditMode = useCallback((active: boolean) => {
    triggerHaptic("medium");
    setIsEditModeState(active);
  }, []);

  const reorderCards = useCallback((newOrderedIds: string[]) => {
    setWidgets((prev) => reorderWidgets(prev, newOrderedIds));
  }, []);

  const cycleCardSizeHandler = useCallback((cardId: string) => {
    triggerHaptic("light");
    setWidgets((prev) => cycleWidgetSize(prev, cardId));
  }, []);

  const setCardSizeHandler = useCallback((cardId: string, size: WidgetSize) => {
    triggerHaptic("light");
    setWidgets((prev) => setWidgetSize(prev, cardId, size));
  }, []);

  const toggleCardVisibilityHandler = useCallback((cardId: string) => {
    triggerHaptic("medium");
    setWidgets((prev) => toggleWidgetVisibility(prev, cardId));
  }, []);

  const resetLayout = useCallback(() => {
    triggerHaptic("heavy");
    setWidgets(defaultWidgets);
  }, [defaultWidgets]);

  const applyPreset = useCallback((presetKey: HomePresetKey | StatisticsPresetKey) => {
    triggerHaptic("medium");
    setWidgets((prev) => applyPresetToWidgets(prev, presetKey));
  }, []);

  const swapCardPositionHandler = useCallback(
    (cardId: string, direction: "left" | "right" | "toggle" = "toggle") => {
      triggerHaptic("medium");
      setWidgets((prev) => swapWidgetPosition(prev, cardId, direction));
    },
    [],
  );

  const visibleCards = useMemo(() => {
    return filterVisibleWidgets(widgets);
  }, [widgets]);

  const hiddenCards = useMemo(() => {
    return widgets.filter((w) => !w.isVisible);
  }, [widgets]);

  return {
    widgets,
    visibleCards,
    hiddenCards,
    isEditMode,
    setIsEditMode,
    reorderCards,
    swapCardPosition: swapCardPositionHandler,
    cycleCardSize: cycleCardSizeHandler,
    setCardSize: setCardSizeHandler,
    toggleCardVisibility: toggleCardVisibilityHandler,
    resetLayout,
    applyPreset,
  };
}
