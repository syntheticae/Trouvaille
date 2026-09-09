import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSecuritySettings,
  saveSecuritySettings,
  isLockTimeoutExceeded,
  hashSecurityPin,
  setSecurityPin,
  verifySecurityPin,
  clearSecurityPin,
  saveBiometricLoginCredentials,
  getBiometricLoginCredentials,
} from "../src/lib/biometricAuth";

// Polyfill localStorage in node test environment
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
    for (const k in store) {
      delete store[k];
    }
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() {
    return Object.keys(store).length;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe("Biometric & Security Engine Test Suite", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns default security settings on cold start", () => {
    const settings = getSecuritySettings();
    expect(settings.enabled).toBe(false);
    expect(settings.timeoutMinutes).toBe(0);
    expect(settings.hasBiometric).toBe(false);
    expect(settings.hasPin).toBe(false);
  });

  it("persists updated security settings in localStorage", () => {
    saveSecuritySettings({ enabled: true, timeoutMinutes: 5 });
    const settings = getSecuritySettings();
    expect(settings.enabled).toBe(true);
    expect(settings.timeoutMinutes).toBe(5);
  });

  it("calculates lock timeout accurately", () => {
    // Disabled lock: never exceeds timeout
    saveSecuritySettings({ enabled: false, timeoutMinutes: 1, lastActiveTimestamp: Date.now() - 120000 });
    expect(isLockTimeoutExceeded()).toBe(false);

    // Enabled lock: immediate (timeout = 0)
    saveSecuritySettings({ enabled: true, timeoutMinutes: 0, lastActiveTimestamp: Date.now() - 500 });
    expect(isLockTimeoutExceeded()).toBe(true);

    // Enabled lock with 5 min timeout: active 2 min ago -> not exceeded
    saveSecuritySettings({ enabled: true, timeoutMinutes: 5, lastActiveTimestamp: Date.now() - 2 * 60 * 1000 });
    expect(isLockTimeoutExceeded()).toBe(false);

    // Enabled lock with 5 min timeout: active 6 min ago -> exceeded
    saveSecuritySettings({ enabled: true, timeoutMinutes: 5, lastActiveTimestamp: Date.now() - 6 * 60 * 1000 });
    expect(isLockTimeoutExceeded()).toBe(true);
  });

  it("hashes and validates security PIN accurately", async () => {
    const pin = "123456";
    const hash1 = await hashSecurityPin(pin);
    const hash2 = await hashSecurityPin(pin);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBeGreaterThan(10);

    // Enroll PIN
    await setSecurityPin("889900");
    const settings = getSecuritySettings();
    expect(settings.hasPin).toBe(true);

    // Verify correct PIN
    const isValid = await verifySecurityPin("889900");
    expect(isValid).toBe(true);

    // Verify wrong PIN
    const isInvalid = await verifySecurityPin("000000");
    expect(isInvalid).toBe(false);

    // Clear PIN
    clearSecurityPin();
    expect(getSecuritySettings().hasPin).toBe(false);
  });

  it("locks out verification after repeated failed attempts", async () => {
    await setSecurityPin("123456");

    // 4 failed attempts: not locked out yet
    for (let i = 0; i < 4; i++) {
      const res = await verifySecurityPin("000000");
      expect(res).toBe(false);
    }

    // 5th failed attempt: triggers lockout
    const fifthAttempt = await verifySecurityPin("000000");
    expect(fifthAttempt).toBe(false);

    // Even with correct PIN, verification is rejected during lockout
    const lockedAttempt = await verifySecurityPin("123456");
    expect(lockedAttempt).toBe(false);

    // Clean up
    clearSecurityPin();
  });

  it("auto-migrates legacy SHA-256 PIN to hardened PBKDF2 on successful verification", async () => {
    const legacyPin = "778899";
    const legacyHash = await hashSecurityPin(legacyPin);
    mockLocalStorage.setItem("trouvaille_security_pin_hash_v1", legacyHash);

    expect(getSecuritySettings().hasPin).toBe(true);
    expect(mockLocalStorage.getItem("trouvaille_security_pin_pbkdf2_v2")).toBeNull();

    // Verify correct PIN
    const isValid = await verifySecurityPin(legacyPin);
    expect(isValid).toBe(true);

    // Should now be upgraded to PBKDF2 and legacy key removed
    expect(mockLocalStorage.getItem("trouvaille_security_pin_pbkdf2_v2")).not.toBeNull();
    expect(mockLocalStorage.getItem("trouvaille_security_pin_hash_v1")).toBeNull();

    clearSecurityPin();
  });

  it("stores and retrieves biometric login hint", () => {
    saveBiometricLoginCredentials("owner@trouvaille.app");
    const hint = getBiometricLoginCredentials();
    expect(hint?.email).toBe("owner@trouvaille.app");
  });
});
