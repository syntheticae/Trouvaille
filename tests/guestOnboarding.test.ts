import { describe, it, expect, beforeEach } from "vitest";
import { GUEST_USER_ID, GUEST_USER } from "../src/contexts/AuthContext";
import { DEFAULT_HOME_WIDGETS } from "../src/lib/widgetLayoutTypes";
import { applyPresetToWidgets } from "../src/lib/widgetLayoutEngine";
import { parseDeepLink } from "../src/lib/deepLinkHandler";

describe("Batch 2: Guest Mode & Adaptive Onboarding System", () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage === "undefined") {
      const store: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      };
    } else {
      globalThis.localStorage.clear();
    }
  });

  it("defines consistent guest identity constants", () => {
    expect(GUEST_USER_ID).toBe("guest_local_user");
    expect(GUEST_USER.id).toBe(GUEST_USER_ID);
    expect(GUEST_USER.email).toBe("guest@trouvaille.local");
    expect(GUEST_USER.aud).toBe("authenticated");
  });

  it("applies 'pulse' preset when user selects Expense Only scope", () => {
    const pulseWidgets = applyPresetToWidgets(DEFAULT_HOME_WIDGETS, "pulse");
    const netPortfolio = pulseWidgets.find((w) => w.id === "net_portfolio");
    const cashflowPulse = pulseWidgets.find((w) => w.id === "cashflow_pulse");

    expect(netPortfolio?.isVisible).toBe(true);
    expect(cashflowPulse?.isVisible).toBe(true);
  });

  it("applies 'minimal' preset when user selects Expense & Income scope", () => {
    const minimalWidgets = applyPresetToWidgets(DEFAULT_HOME_WIDGETS, "minimal");
    const bills = minimalWidgets.find((w) => w.id === "upcoming_bills");
    const netPortfolio = minimalWidgets.find((w) => w.id === "net_portfolio");

    expect(bills?.isVisible).toBe(true);
    expect(netPortfolio?.isVisible).toBe(true);
  });

  it("applies 'executive' preset when user selects Full Net Worth scope", () => {
    const execWidgets = applyPresetToWidgets(DEFAULT_HOME_WIDGETS, "executive");
    const netPortfolio = execWidgets.find((w) => w.id === "net_portfolio");

    expect(netPortfolio?.isVisible).toBe(true);
  });

  it("dispatches voice and scan deep links for Apple Shortcuts automation", () => {
    const voiceRes = parseDeepLink("trouvaille://voice");
    expect(voiceRes.action).toBe("voice");

    const scanRes = parseDeepLink("trouvaille://scan");
    expect(scanRes.action).toBe("scan");

    const addRes = parseDeepLink("trouvaille://add?text=Makan%20siang%2050000%20BCA");
    expect(addRes.action).toBe("transaction");
    expect(addRes.prefilledValues?.amount).toBe(50000);
  });
});
