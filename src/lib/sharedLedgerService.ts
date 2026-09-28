// ======================================================================
// TROUVAILLE SHARED LEDGER SERVICE
// Backend integration, RPC invocation, and resilient offline caching
// ======================================================================

import { supabase } from "./supabase";
import type { LedgerMember, LedgerMemberRole } from "../types";

const SHARED_MEMBERS_CACHE_PREFIX = "trouvaille_shared_members_";

/**
 * Generates an Apple-style, easily readable 6-character alphanumeric invite code.
 * Excludes ambiguous characters (0, O, 1, I, L) for voice dictation and visual clarity.
 */
export function generateInviteCode(): string {
  // Excludes 0, 1, I, O, L to prevent any ambiguity
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  // Format as TRV-XXX or XXX-XXX
  return `TRV-${result.slice(0, 3)}${result.slice(3)}`;
}

/**
 * Normalizes an invite code: removes hyphens, spaces, and forces uppercase.
 */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Fetches members belonging to a specific ledger from Supabase with offline fallback.
 */
export async function fetchLedgerMembers(ledgerId: string): Promise<LedgerMember[]> {
  const cacheKey = `${SHARED_MEMBERS_CACHE_PREFIX}${ledgerId}`;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || session.user.id === "guest_local_user") {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }

    const { data, error } = await supabase
      .from("ledger_members")
      .select("id, ledger_id, user_id, role, display_name, email, joined_at")
      .eq("ledger_id", ledgerId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.warn("[fetchLedgerMembers] Supabase warning:", error.message);
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }

    const members: LedgerMember[] = (data || []).map((row) => ({
      id: row.id,
      ledger_id: row.ledger_id,
      user_id: row.user_id,
      role: row.role as LedgerMemberRole,
      display_name: row.display_name,
      email: row.email,
      joined_at: row.joined_at,
    }));

    try {
      localStorage.setItem(cacheKey, JSON.stringify(members));
    } catch {}

    return members;
  } catch (err) {
    console.error("[fetchLedgerMembers] Error fetching members:", err);
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}

export interface JoinLedgerResult {
  success: boolean;
  ledger_id?: string;
  ledger_name?: string;
  role?: LedgerMemberRole;
  message: string;
}

/**
 * Joins a shared ledger using its unique invite code.
 */
export async function joinLedgerWithCode(
  rawCode: string,
  displayName?: string,
): Promise<JoinLedgerResult> {
  const cleanCode = normalizeInviteCode(rawCode);
  if (!cleanCode) {
    return {
      success: false,
      message: "Kode undangan tidak boleh kosong.",
    };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || session.user.id === "guest_local_user") {
      return {
        success: false,
        message: "Silakan masuk ke akun Trouvaille terlebih dahulu untuk bergabung ke ledger bersama.",
      };
    }

    // Call Supabase RPC
    const { data, error } = await supabase.rpc("join_ledger_by_invite_code", {
      p_invite_code: cleanCode,
      p_display_name: displayName || session.user.email?.split("@")[0] || "Anggota",
    });

    if (error) {
      console.warn("[joinLedgerWithCode] RPC error:", error.message);
      return {
        success: false,
        message: error.message || "Gagal memproses kode undangan.",
      };
    }

    return {
      success: Boolean(data?.success),
      ledger_id: data?.ledger_id,
      ledger_name: data?.ledger_name,
      role: data?.role as LedgerMemberRole,
      message: data?.message || (data?.success ? "Berhasil bergabung!" : "Kode tidak valid."),
    };
  } catch (err: any) {
    console.error("[joinLedgerWithCode] Unexpected error:", err);
    return {
      success: false,
      message: err.message || "Terjadi kesalahan saat memproses permintaan bergabung.",
    };
  }
}

/**
 * Updates a member's role (Owner only).
 */
export async function updateMemberRole(
  ledgerId: string,
  targetUserId: string,
  newRole: LedgerMemberRole,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ledger_members")
      .update({ role: newRole })
      .eq("ledger_id", ledgerId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("[updateMemberRole] Supabase error:", error);
      return false;
    }

    // Invalidate local cache
    const cacheKey = `${SHARED_MEMBERS_CACHE_PREFIX}${ledgerId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: LedgerMember[] = JSON.parse(cached);
        const updated = parsed.map((m) =>
          m.user_id === targetUserId ? { ...m, role: newRole } : m,
        );
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }
    } catch {}

    return true;
  } catch (err) {
    console.error("[updateMemberRole] Error:", err);
    return false;
  }
}

/**
 * Removes a member from a shared ledger (Owner only).
 */
export async function removeMemberFromLedger(
  ledgerId: string,
  targetUserId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ledger_members")
      .delete()
      .eq("ledger_id", ledgerId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("[removeMemberFromLedger] Supabase error:", error);
      return false;
    }

    // Invalidate local cache
    const cacheKey = `${SHARED_MEMBERS_CACHE_PREFIX}${ledgerId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: LedgerMember[] = JSON.parse(cached);
        const updated = parsed.filter((m) => m.user_id !== targetUserId);
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }
    } catch {}

    return true;
  } catch (err) {
    console.error("[removeMemberFromLedger] Error:", err);
    return false;
  }
}

/**
 * Leaves a shared ledger (Member action).
 */
export async function leaveSharedLedger(
  ledgerId: string,
  currentUserId: string,
): Promise<boolean> {
  return removeMemberFromLedger(ledgerId, currentUserId);
}

/**
 * Regenerates an invite code for a shared ledger (Owner only).
 */
export async function regenerateInviteCode(ledgerId: string): Promise<string | null> {
  const newCode = generateInviteCode();
  try {
    const { data, error } = await supabase.rpc("regenerate_ledger_invite_code", {
      p_ledger_id: ledgerId,
      p_new_code: newCode,
    });

    if (error) {
      // Fallback: direct update ONLY if user is the authenticated owner
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error("[regenerateInviteCode] Unauthorized:", error);
        return null;
      }

      const { error: updateError } = await supabase
        .from("ledgers")
        .update({ invite_code: newCode, updated_at: new Date().toISOString() })
        .eq("id", ledgerId)
        .eq("user_id", session.user.id);

      if (updateError) {
        console.error("[regenerateInviteCode] Fallback error:", updateError);
        return null;
      }
      return newCode;
    }

    return data?.invite_code || newCode;
  } catch (err) {
    console.error("[regenerateInviteCode] Unexpected error:", err);
    return null;
  }
}
