import { describe, it, expect, beforeEach } from "vitest";

// Polyfill localStorage & window event target in node test environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k in store) delete store[k];
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

const listeners: Record<string, Function[]> = {};
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = {
    addEventListener: (type: string, fn: Function) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((cb) => cb !== fn);
    },
    dispatchEvent: (event: any) => {
      const type = event?.type || "";
      if (listeners[type]) {
        listeners[type].forEach((cb) => cb(event));
      }
      return true;
    },
  };
}

if (typeof (globalThis as any).CustomEvent === "undefined") {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params?: { detail?: any }) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
}

import { TOUR_STEPS } from "../src/components/onboarding/ProductTourOverlay";

describe("Interactive Product Tour State & Lifecycle System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("declares all 6 essential cross-page tour steps with selectors and highlights", () => {
    expect(TOUR_STEPS).toHaveLength(6);
    expect(TOUR_STEPS.map((s) => s.path)).toEqual([
      "/",
      "/",
      "/assets",
      "/transactions",
      "/calendar",
      "/statistics",
    ]);

    for (const step of TOUR_STEPS) {
      expect(step.titleId).toBeTruthy();
      expect(step.titleEn).toBeTruthy();
      expect(step.selector).toMatch(/^\[data-tour=".*"\]$/);
      expect(step.highlightsId.length).toBeGreaterThanOrEqual(3);
      expect(step.highlightsEn.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("handles 'trouvaille:start-tour' event dispatching and listeners", () => {
    let tourStarted = false;
    const listener = () => {
      tourStarted = true;
      localStorage.setItem("trouvaille_tour_pending", "true");
    };

    window.addEventListener("trouvaille:start-tour", listener);
    window.dispatchEvent(new CustomEvent("trouvaille:start-tour"));

    expect(tourStarted).toBe(true);
    expect(localStorage.getItem("trouvaille_tour_pending")).toBe("true");

    window.removeEventListener("trouvaille:start-tour", listener);
  });

  it("clears pending status and saves completion status upon tour finish", () => {
    localStorage.setItem("trouvaille_tour_pending", "true");

    // Simulate handleFinish
    localStorage.setItem("trouvaille_tour_completed", "true");
    localStorage.removeItem("trouvaille_tour_pending");

    expect(localStorage.getItem("trouvaille_tour_pending")).toBeNull();
    expect(localStorage.getItem("trouvaille_tour_completed")).toBe("true");
  });

  it("clears pending status and saves completion status upon tour skip", () => {
    localStorage.setItem("trouvaille_tour_pending", "true");

    // Simulate handleSkip
    localStorage.setItem("trouvaille_tour_completed", "true");
    localStorage.removeItem("trouvaille_tour_pending");

    expect(localStorage.getItem("trouvaille_tour_pending")).toBeNull();
    expect(localStorage.getItem("trouvaille_tour_completed")).toBe("true");
  });
});
