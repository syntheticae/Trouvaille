import { useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  Layers,
  Info,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useToast } from "../../contexts/ToastContext";

interface BackTapGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackTapGuideModal({ isOpen, onClose }: BackTapGuideModalProps) {
  const { showToast } = useToast();
  const [copiedScheme, setCopiedScheme] = useState(false);

  const urlSchemeExample = "trouvaille://add?text=";

  const handleCopyScheme = () => {
    navigator.clipboard.writeText(urlSchemeExample);
    setCopiedScheme(true);
    showToast("URL Scheme copied to clipboard", "add", () => {});
    setTimeout(() => setCopiedScheme(false), 2000);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-12 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mb-1">
            <Smartphone size={13} strokeWidth={1.5} />
            <span>iOS Native Automation</span>
          </div>
          <h3
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            iPhone Back Tap & Shortcuts
          </h3>
          <p
            className="text-[13px] leading-relaxed font-normal"
            style={{ color: "var(--text-tertiary)" }}
          >
            Record transactions in under one second by double-tapping the back of
            your iPhone on any m-Banking receipt or QRIS screen.
          </p>
        </div>

        {/* How It Works Flow */}
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-wider block"
            style={{ color: "var(--text-tertiary)" }}
          >
            The 3-Step Apple Shortcut Recipe
          </span>

          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              1
            </div>
            <div className="space-y-0.5">
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Take Screenshot
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Action: <span className="font-mono">Ambil Tangkapan Layar</span>. Captures your current banking receipt.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              2
            </div>
            <div className="space-y-0.5">
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Extract Text with Apple Vision
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Action: <span className="font-mono">Ekstrak Teks dari Gambar</span>. 100% on-device OCR, instantaneous (&lt;0.2s) and private.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              3
            </div>
            <div className="space-y-0.5">
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Open Trouvaille URL Scheme
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Action: <span className="font-mono">Buka URL</span> with the target scheme below.
              </p>
            </div>
          </div>
        </div>

        {/* URL Scheme Copy Card */}
        <div
          className="p-4 rounded-2xl border space-y-2.5"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Shortcut Target URL
            </span>
            <button
              onClick={handleCopyScheme}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all active:scale-95 cursor-pointer border"
              style={{
                background: copiedScheme ? "var(--accent)" : "var(--bg-elevated)",
                color: copiedScheme ? "var(--accent-ink)" : "var(--text-primary)",
                borderColor: "var(--glass-border)",
              }}
            >
              {copiedScheme ? (
                <>
                  <Check size={12} strokeWidth={2} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} strokeWidth={1.5} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div
            className="p-2.5 rounded-xl font-mono text-[12px] break-all select-all border"
            style={{
              background: "rgba(0,0,0,0.25)",
              borderColor: "var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            trouvaille://add?text=[Text]
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            Replace <span className="font-mono">[Text]</span> with the magic variable from the Extract Text action.
          </p>
        </div>

        {/* Setting up Back Tap */}
        <div
          className="p-4 rounded-2xl border space-y-2"
          style={{
            background: "var(--glass-fill)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Layers size={14} strokeWidth={1.5} style={{ color: "var(--text-primary)" }} />
            <span
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              How to enable iPhone Back Tap
            </span>
          </div>
          <ol
            className="text-[12px] space-y-1.5 list-decimal list-inside leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>Open iPhone <span className="font-semibold text-[var(--text-primary)]">Settings</span> &gt; <span className="font-semibold text-[var(--text-primary)]">Accessibility</span>.</li>
            <li>Tap <span className="font-semibold text-[var(--text-primary)]">Touch</span>, then scroll down to <span className="font-semibold text-[var(--text-primary)]">Back Tap</span>.</li>
            <li>Select <span className="font-semibold text-[var(--text-primary)]">Double Tap</span> and pick your created shortcut!</li>
          </ol>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2.5 px-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          <Info size={14} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <span>
            Trouvaille automatically detects amounts, merchants (BCA, Mandiri, GoPay, QRIS, etc.), and categories without sending your data to any external server.
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}
