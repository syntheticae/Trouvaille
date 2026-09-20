import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";
import { triggerHaptic } from "../../lib/haptics";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const { session, isGuest, signOut, exitGuestMode } = useAuth();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    triggerHaptic("heavy");

    try {
      // 1. If connected to Supabase account, attempt server-side record cleanup
      if (session?.user?.id && !isGuest) {
        const userId = session.user.id;
        try {
          await Promise.allSettled([
            supabase.from("transactions").delete().eq("user_id", userId),
            supabase.from("wallets").delete().eq("user_id", userId),
            supabase.from("categories").delete().eq("user_id", userId),
            supabase.from("bills").delete().eq("user_id", userId),
            supabase.from("goals").delete().eq("user_id", userId),
          ]);
        } catch (serverErr) {
          console.warn("[DeleteAccount] Server wipe warning:", serverErr);
        }
      }

      // 2. Wipe all local storage caches, vaults, onboarding tokens
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageErr) {
        console.warn("[DeleteAccount] LocalStorage clear error:", storageErr);
      }

      // 3. Clear auth session
      if (isGuest) {
        exitGuestMode();
      } else {
        await signOut();
      }

      showToast("Account and local vault deleted.", "delete", () => {});

      // 4. Force clean page reload to fresh welcome/login screen
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    } catch (err: any) {
      console.error("[DeleteAccount] Deletion failed:", err);
      showToast(err?.message || "Failed to complete account deletion.", "delete", () => {});
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText("");
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="p-5 pb-10 space-y-5">
        {/* Header Icon */}
        <div className="text-center">
          <div
            className="w-14 h-14 mx-auto rounded-3xl flex items-center justify-center mb-3 shadow-lg"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            <Trash2 size={24} strokeWidth={1.75} className="text-red-500" />
          </div>
          <h3
            className="font-semibold text-[20px] tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Delete Account & Reset Vault
          </h3>
          <p
            className="text-[12px] font-normal mt-1 max-w-xs mx-auto leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            This will permanently wipe all transactions, accounts, custom categories, and security keys.
          </p>
        </div>

        {/* Warning Callout */}
        <div
          className="p-4 rounded-[20px] space-y-2 border"
          style={{
            background: "rgba(239, 68, 68, 0.06)",
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={16} strokeWidth={1.75} />
            <span className="text-[12px] font-semibold">Irreversible Action</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Once deleted, your encrypted local vault cannot be recovered. Ensure you have exported a JSON backup if you wish to preserve your data.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label
            className="text-[11px] font-semibold tracking-wide uppercase block"
            style={{ color: "var(--text-tertiary)" }}
          >
            Type <span className="text-red-400 font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={isDeleting}
            className="w-full px-4 py-3 rounded-xl text-[14px] font-semibold outline-none tracking-wider text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            disabled={!isConfirmed || isDeleting}
            onClick={handleDelete}
            className={`w-full py-3.5 px-4 rounded-[22px] font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isConfirmed && !isDeleting
                ? "bg-red-500 text-white shadow-lg active:scale-[0.98] hover:bg-red-600"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Purging Vault & Account...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} strokeWidth={1.75} />
                <span>Permanently Delete Account</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={handleClose}
            className="w-full py-3 px-4 rounded-[22px] font-medium text-[13px] transition-all cursor-pointer text-center"
            style={{
              color: "var(--text-tertiary)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
