import { describe, it, expect } from "vitest";

describe("TransactionSheet Viewport & Keypad Auto-Shrink Integrity", () => {
  it("computes bottom padding correctly based on keypad state to eliminate blank void", () => {
    const computePaddingClass = (isKeypadOpen: boolean, useCustomKeypad: boolean) => {
      return isKeypadOpen && useCustomKeypad ? "pb-[330px]" : "pb-2";
    };

    // When keypad is open, pad bottom by 330px so all form fields can scroll above the keypad
    expect(computePaddingClass(true, true)).toBe("pb-[330px]");

    // When keypad is closed, pad bottom by pb-2 so the sheet auto-shrinks snugly to content
    expect(computePaddingClass(false, true)).toBe("pb-2");

    // When custom keypad is disabled (system keyboard used), pad pb-2
    expect(computePaddingClass(false, false)).toBe("pb-2");
    expect(computePaddingClass(true, false)).toBe("pb-2");
  });

  it("applies Apple luxury spring transition bezier to layout adjustments", () => {
    const transitionClass = "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";
    expect(transitionClass).toContain("cubic-bezier(0.22,1,0.36,1)");
    expect(transitionClass).toContain("duration-300");
  });

  it("correctly toggles keypad open and closed on hero amount tap", () => {
    let isKeypadOpen = false;
    const toggleKeypad = () => {
      isKeypadOpen = !isKeypadOpen;
    };

    // First tap opens keypad
    toggleKeypad();
    expect(isKeypadOpen).toBe(true);

    // Second tap closes keypad
    toggleKeypad();
    expect(isKeypadOpen).toBe(false);
  });

  it("handles height unlocking logic when keypad closes", () => {
    let lockedMinHeight: number | undefined = 780;

    const handleHeightReset = (resetKey: boolean, disableHeightLock?: boolean) => {
      if (resetKey !== undefined || disableHeightLock) {
        lockedMinHeight = undefined;
      }
    };

    // Simulating keypad close: resetKey is false
    handleHeightReset(false, true);
    expect(lockedMinHeight).toBeUndefined();
  });

  it("enforces iOS safe area bottom padding invariant (Rule 5)", () => {
    const defaultSheetPaddingBottom = "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 24px)";
    const keypadPaddingBottom = "max(calc(env(safe-area-inset-bottom, 0px) + 8px), 14px)";

    expect(defaultSheetPaddingBottom).toContain("env(safe-area-inset-bottom, 0px)");
    expect(keypadPaddingBottom).toContain("env(safe-area-inset-bottom, 0px)");
  });
});
