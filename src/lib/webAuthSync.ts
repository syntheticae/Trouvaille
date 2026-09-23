import { supabase } from "./supabase";

export interface WebDashboardQrPayload {
  app: string;
  version: string;
  action: string;
  sessionId: string;
  channel: string;
  origin: string;
  createdAt: number;
}

export interface LinkedWebSession {
  sessionId: string;
  origin: string;
  channel: string;
  linkedAt: number;
  userEmail: string;
}

const LINKED_SESSIONS_STORAGE_KEY = "trouvaille_linked_web_sessions";

/**
 * Validates and parses the QR Code string emitted by Trouvaille Web Dashboard.
 */
export function parseWebDashboardQr(qrContent: string): {
  valid: boolean;
  payload?: WebDashboardQrPayload;
  error?: string;
} {
  try {
    if (!qrContent || typeof qrContent !== "string") {
      return { valid: false, error: "QR code content is empty" };
    }

    const data = JSON.parse(qrContent.trim());

    if (data.app !== "trouvaille") {
      return {
        valid: false,
        error: "QR Code ini bukan untuk aplikasi Trouvaille",
      };
    }

    if (data.action !== "login" || !data.sessionId) {
      return {
        valid: false,
        error: "Payload QR Code tidak valid atau format sesi rusak",
      };
    }

    // Check expiration: reject QR codes older than 10 minutes (600,000 ms)
    if (data.createdAt && Date.now() - data.createdAt > 600000) {
      return {
        valid: false,
        error: "QR Code telah kedaluwarsa. Silakan muat ulang di Web Dashboard",
      };
    }

    return {
      valid: true,
      payload: {
        app: data.app,
        version: data.version || "1.0",
        action: data.action,
        sessionId: data.sessionId,
        channel: data.channel || `trouvaille-qr-${data.sessionId}`,
        origin: data.origin || "",
        createdAt: data.createdAt || Date.now(),
      },
    };
  } catch {
    return {
      valid: false,
      error: "Format QR Code tidak dikenali (bukan JSON Trouvaille)",
    };
  }
}

/**
 * Authorizes a Trouvaille Web Dashboard session via Supabase Realtime broadcast.
 * Sends the active user's access & refresh tokens to the channel.
 */
export async function authorizeWebDashboardSession(
  qrContent: string,
  options?: { timeoutMs?: number }
): Promise<{ success: boolean; error?: string; sessionInfo?: LinkedWebSession }> {
  try {
    const parseResult = parseWebDashboardQr(qrContent);
    if (!parseResult.valid || !parseResult.payload) {
      return {
        success: false,
        error: parseResult.error || "QR Code tidak valid",
      };
    }

    const { sessionId, channel: channelName, origin } = parseResult.payload;

    // 1. Check if user is authenticated in mobile app
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      return {
        success: false,
        error: "Anda belum login di aplikasi mobile. Silakan masuk terlebih dahulu.",
      };
    }

    // 2. Connect to the ephemeral Realtime broadcast channel
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    const timeoutLimit = options?.timeoutMs || 12000;

    await new Promise<void>((resolve, reject) => {
      let isSettled = false;

      const timeoutTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            supabase.removeChannel(channel);
          } catch {}
          reject(
            new Error(
              "Koneksi sinkronisasi ke Web Dashboard timeout. Pastikan koneksi internet stabil dan Web Dashboard masih aktif."
            )
          );
        }
      }, timeoutLimit);

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.send({
              type: "broadcast",
              event: "session-granted",
              payload: {
                session: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                },
                user: session.user,
              },
            });

            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeoutTimer);
              resolve();
            }
          } catch (sendErr: any) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeoutTimer);
              reject(
                new Error(
                  sendErr?.message || "Gagal memancarkan sesi ke Web Dashboard"
                )
              );
            }
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutTimer);
            reject(
              new Error(
                "Gagal terhubung ke saluran sinkronisasi Supabase Realtime"
              )
            );
          }
        }
      });
    });

    // 3. Clean up the Realtime channel after broadcast
    setTimeout(() => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }, 1500);

    // 4. Record linked session history locally
    const linkedSession: LinkedWebSession = {
      sessionId,
      origin: origin || "Trouvaille Web Dashboard",
      channel: channelName,
      linkedAt: Date.now(),
      userEmail: session.user?.email || "Unknown User",
    };
    saveLinkedWebSession(linkedSession);

    return {
      success: true,
      sessionInfo: linkedSession,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal memproses otorisasi Web Dashboard",
    };
  }
}

/**
 * Retrieves the list of historically linked web dashboard sessions.
 */
export function getLinkedWebSessions(): LinkedWebSession[] {
  try {
    const raw = localStorage.getItem(LINKED_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists a new linked web session to local storage.
 */
export function saveLinkedWebSession(session: LinkedWebSession): void {
  try {
    const current = getLinkedWebSessions();
    const filtered = current.filter((s) => s.sessionId !== session.sessionId);
    const updated = [session, ...filtered].slice(0, 10); // keep last 10
    localStorage.setItem(
      LINKED_SESSIONS_STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch (e) {
    console.warn("[webAuthSync] Failed to save linked web session:", e);
  }
}

/**
 * Removes a linked web session from history.
 */
export function removeLinkedWebSession(sessionId: string): void {
  try {
    const current = getLinkedWebSessions();
    const updated = current.filter((s) => s.sessionId !== sessionId);
    localStorage.setItem(
      LINKED_SESSIONS_STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch (e) {
    console.warn("[webAuthSync] Failed to remove linked web session:", e);
  }
}

/**
 * Clears all linked web sessions from history.
 */
export function clearAllLinkedWebSessions(): void {
  try {
    localStorage.removeItem(LINKED_SESSIONS_STORAGE_KEY);
  } catch (e) {
    console.warn("[webAuthSync] Failed to clear linked web sessions:", e);
  }
}
