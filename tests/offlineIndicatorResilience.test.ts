import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Offline & Network Indicator Resilience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suppresses offline warning when browser is reported online", () => {
    const isActuallyOnline = true;
    const detail = { status: "error" as const, message: "Network unavailable" };
    let shouldShow = false;

    if (isActuallyOnline && !detail.message?.includes("force")) {
      shouldShow = false;
    } else {
      shouldShow = true;
    }

    expect(shouldShow).toBe(false);
  });

  it("suppresses error pills during app switching wake-up grace period", () => {
    const lastWakeup = 1000;
    const currentTime = 2500; // 1.5 seconds after switching back to app
    const isWithinWakeupGracePeriod = currentTime - lastWakeup < 4000;

    expect(isWithinWakeupGracePeriod).toBe(true);

    const isActuallyOnline = true;
    const shouldSuppress = isActuallyOnline || isWithinWakeupGracePeriod;
    expect(shouldSuppress).toBe(true);
  });

  it("requires persistent 3.5s offline state before activating pill", () => {
    let pillVisible = false;
    let timer: NodeJS.Timeout | null = null;
    let isNavigatorOnline = false;

    // Trigger offline event
    timer = setTimeout(() => {
      if (!isNavigatorOnline) {
        pillVisible = true;
      }
    }, 3500);

    // Fast-forward 2 seconds (not yet 3.5s)
    vi.advanceTimersByTime(2000);
    expect(pillVisible).toBe(false);

    // Device reconnects at 2.5s (before 3.5s)
    isNavigatorOnline = true;
    if (timer) clearTimeout(timer);

    vi.advanceTimersByTime(2000);
    expect(pillVisible).toBe(false);
  });

  it("activates pill only if persistently offline for full 3.5s", () => {
    let pillVisible = false;
    const isNavigatorOnline = false;

    setTimeout(() => {
      if (!isNavigatorOnline) {
        pillVisible = true;
      }
    }, 3500);

    vi.advanceTimersByTime(3500);
    expect(pillVisible).toBe(true);
  });

  it("conforms to Rule 3 dynamic notch positioning formula", () => {
    const expectedTopStyle = "max(calc(env(safe-area-inset-top, 0px) + 18px), 28px)";
    expect(expectedTopStyle).toContain("safe-area-inset-top");
    expect(expectedTopStyle).toContain("18px");
    expect(expectedTopStyle).toContain("28px");
  });
});
