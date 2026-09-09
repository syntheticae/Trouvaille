// ======================================================================
// TROUVAILLE BIOMETRIC / PASKEY & SECURITY ENGINE
// Standard: WebAuthn FIDO2 Platform Authenticator (Face ID, Touch ID, Windows Hello)
// ======================================================================

export interface SecuritySettings {
  enabled: boolean;
  timeoutMinutes: number; // 0 = Immediately, 1 = 1 minute, 5 = 5 minutes
  hasBiometric: boolean;
  hasPin: boolean;
  lastActiveTimestamp: number;
}

const SECURITY_SETTINGS_KEY = "trouvaille_security_settings_v1";
const BIOMETRIC_CREDENTIAL_KEY = "trouvaille_biometric_cred_v1";
const SECURITY_PIN_HASH_KEY = "trouvaille_security_pin_hash_v1";
const SECURITY_PIN_PBKDF2_KEY = "trouvaille_security_pin_pbkdf2_v2";
const PIN_LOCKOUT_KEY = "trouvaille_pin_lockout_v1";
const BIOMETRIC_LOGIN_TOKEN_KEY = "trouvaille_biometric_login_token_v1";

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  enabled: false,
  timeoutMinutes: 0, // Immediately upon app switch
  hasBiometric: false,
  hasPin: false,
  lastActiveTimestamp: Date.now(),
};

// ======================================================================
// SETTINGS PERSISTENCE
// ======================================================================

export function getSecuritySettings(): SecuritySettings {
  try {
    const raw = localStorage.getItem(SECURITY_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...parsed,
      lastActiveTimestamp: parsed.lastActiveTimestamp || Date.now(),
      hasBiometric: !!localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY),
      hasPin:
        !!localStorage.getItem(SECURITY_PIN_PBKDF2_KEY) ||
        !!localStorage.getItem(SECURITY_PIN_HASH_KEY),
    };
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS, lastActiveTimestamp: Date.now() };
  }
}

export function saveSecuritySettings(settings: Partial<SecuritySettings>): SecuritySettings {
  try {
    const current = getSecuritySettings();
    const updated: SecuritySettings = {
      ...current,
      ...settings,
    };
    localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn("Failed to save security settings:", e);
    return { ...DEFAULT_SECURITY_SETTINGS, ...settings };
  }
}

export function updateLastActiveTimestamp(): void {
  try {
    const current = getSecuritySettings();
    current.lastActiveTimestamp = Date.now();
    localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(current));
  } catch {}
}

export function isLockTimeoutExceeded(): boolean {
  const settings = getSecuritySettings();
  if (!settings.enabled) return false;
  const now = Date.now();
  const elapsedMinutes = (now - settings.lastActiveTimestamp) / (1000 * 60);
  return elapsedMinutes >= settings.timeoutMinutes;
}

// ======================================================================
// WEBAUTHN PLATFORM BIOMETRIC ENGINE (FACE ID, TOUCH ID, WINDOWS HELLO)
// ======================================================================

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

// Helpers for buffer conversions
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  const globalBuffer = (
    globalThis as unknown as {
      Buffer?: {
        from: (data: string, enc: string) => { toString: (enc: string) => string };
      };
    }
  ).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(binary, "binary").toString("base64");
  }
  return "";
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const globalBuffer = (
    globalThis as unknown as {
      Buffer?: {
        from: (data: string, enc: string) => { toString: (enc: string) => string };
      };
    }
  ).Buffer;
  const binary =
    typeof atob === "function"
      ? atob(base64)
      : globalBuffer
      ? globalBuffer.from(base64, "base64").toString("binary")
      : "";
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function registerBiometricPasskey(
  userId = "trouvaille-user",
  userEmail = "user@trouvaille.app",
): Promise<boolean> {
  if (!navigator.credentials || !navigator.credentials.create) {
    throw new Error("Biometric authentication is not supported on this browser.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBytes = new TextEncoder().encode(userId);

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Trouvaille Financial Security",
      id: window.location.hostname || "localhost",
    },
    user: {
      id: userIdBytes,
      name: userEmail,
      displayName: userEmail.split("@")[0] || "Trouvaille User",
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    const rawIdBase64 = bufferToBase64(credential.rawId);
    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, rawIdBase64);

    saveSecuritySettings({ hasBiometric: true });
    return true;
  } catch (err: any) {
    console.error("Failed to register biometric credential:", err);
    throw err;
  }
}

export async function verifyBiometricPasskey(): Promise<boolean> {
  if (!navigator.credentials || !navigator.credentials.get) {
    throw new Error("Biometric authentication is not supported on this device.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const storedCredBase64 = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
  const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = storedCredBase64
    ? [
        {
          id: base64ToBuffer(storedCredBase64),
          type: "public-key",
          transports: ["internal"],
        },
      ]
    : undefined;

  const requestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    rpId: window.location.hostname || "localhost",
    userVerification: "required",
    allowCredentials,
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: requestOptions,
    });
    return !!assertion;
  } catch (err: any) {
    console.warn("Biometric verification rejected or cancelled:", err);
    return false;
  }
}

export function clearBiometricCredential(): void {
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
  localStorage.removeItem(BIOMETRIC_LOGIN_TOKEN_KEY);
  saveSecuritySettings({ hasBiometric: false });
}

// ======================================================================
// SECURITY PIN FALLBACK
// ======================================================================

export interface PinLockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
}

export function getPinLockoutState(): PinLockoutState {
  try {
    const raw = localStorage.getItem(PIN_LOCKOUT_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    const { attempts, lockedUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockedUntil && now < lockedUntil) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attempts: attempts || 0 };
    }
    return { isLocked: false, remainingSeconds: 0, attempts: attempts || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
}

export function recordFailedPinAttempt(): PinLockoutState {
  const current = getPinLockoutState();
  const nextAttempts = (current.attempts || 0) + 1;
  let lockedUntil: number | null = null;

  if (nextAttempts >= 5) {
    const durationMs = nextAttempts >= 7 ? 60_000 : 30_000;
    lockedUntil = Date.now() + durationMs;
  }

  localStorage.setItem(
    PIN_LOCKOUT_KEY,
    JSON.stringify({ attempts: nextAttempts, lockedUntil }),
  );

  return getPinLockoutState();
}

export function resetPinLockout(): void {
  localStorage.removeItem(PIN_LOCKOUT_KEY);
}

// Derive 256-bit PBKDF2 key hash with random salt (100,000 iterations)
async function derivePbkdf2PinHash(pin: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(derivedBits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashSecurityPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`trouvaille_salt_${pin}_salt`);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  return bufferToBase64(hashBuffer);
}

export async function setSecurityPin(pin: string): Promise<boolean> {
  if (!pin || pin.length < 4) {
    throw new Error("PIN must be at least 4 digits.");
  }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePbkdf2PinHash(pin, salt);
  const payload = {
    salt: Array.from(salt, (b) => b.toString(16).padStart(2, "0")).join(""),
    hash,
    iterations: 100_000,
  };
  localStorage.setItem(SECURITY_PIN_PBKDF2_KEY, JSON.stringify(payload));
  localStorage.removeItem(SECURITY_PIN_HASH_KEY); // Clean up legacy key
  resetPinLockout();
  saveSecuritySettings({ hasPin: true });
  return true;
}

export async function verifySecurityPin(pin: string): Promise<boolean> {
  const lockout = getPinLockoutState();
  if (lockout.isLocked) {
    return false;
  }

  // 1. Check PBKDF2 hardened PIN
  const pbkdf2Raw = localStorage.getItem(SECURITY_PIN_PBKDF2_KEY);
  if (pbkdf2Raw) {
    try {
      const { salt, hash } = JSON.parse(pbkdf2Raw);
      const saltBytes = new Uint8Array(
        salt.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [],
      );
      const calculatedHash = await derivePbkdf2PinHash(pin, saltBytes);
      if (calculatedHash === hash) {
        resetPinLockout();
        return true;
      }
    } catch (e) {
      console.warn("Failed to verify PBKDF2 PIN:", e);
    }
  }

  // 2. Fallback to legacy SHA-256 and auto-upgrade to PBKDF2
  const legacyHash = localStorage.getItem(SECURITY_PIN_HASH_KEY);
  if (legacyHash) {
    const inputHash = await hashSecurityPin(pin);
    if (legacyHash === inputHash) {
      resetPinLockout();
      // Auto-migrate legacy PIN to PBKDF2 in background
      await setSecurityPin(pin);
      return true;
    }
  }

  // Failed attempt
  recordFailedPinAttempt();
  return false;
}

export function clearSecurityPin(): void {
  localStorage.removeItem(SECURITY_PIN_PBKDF2_KEY);
  localStorage.removeItem(SECURITY_PIN_HASH_KEY);
  resetPinLockout();
  saveSecuritySettings({ hasPin: false });
}

// ======================================================================
// BIOMETRIC QUICK LOGIN SESSION HELPERS
// ======================================================================

export function saveBiometricLoginCredentials(email: string, sessionData?: any): void {
  try {
    const payload = {
      email,
      timestamp: Date.now(),
      session: sessionData,
    };
    localStorage.setItem(BIOMETRIC_LOGIN_TOKEN_KEY, JSON.stringify(payload));
  } catch {}
}

export function getBiometricLoginCredentials(): { email: string; session?: any } | null {
  try {
    const raw = localStorage.getItem(BIOMETRIC_LOGIN_TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
