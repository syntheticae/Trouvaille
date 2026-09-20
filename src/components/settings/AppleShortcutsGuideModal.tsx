import { useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  Mic,
  Camera,
  Layers,
  Share2,
  PlusCircle,
  Zap,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useToast } from "../../contexts/ToastContext";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";

interface AppleShortcutsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "ways_to_add" | "back_tap" | "automation";

export function AppleShortcutsGuideModal({
  isOpen,
  onClose,
}: AppleShortcutsGuideModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("ways_to_add");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    triggerSuccessHaptic();
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(`${label} copied to clipboard`, "add", () => {});
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestDeepLink = (scheme: string) => {
    triggerHaptic("medium");
    window.location.href = scheme;
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-12 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mb-1">
            <Smartphone size={13} strokeWidth={1.5} />
            <span>Apple iOS Ecosystem Integration</span>
          </div>
          <h3
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Shortcuts & iOS Automation
          </h3>
          <p
            className="text-[13px] leading-relaxed font-normal"
            style={{ color: "var(--text-secondary)" }}
          >
            Seamlessly record transactions in seconds using the Action Button, Back Tap, or automated Apple Pay triggers.
          </p>
        </div>

        {/* 3-Way Segmented Tabs */}
        <div
          className="flex items-center p-1 rounded-2xl border"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("ways_to_add");
            }}
            className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === "ways_to_add"
                ? "bg-white/[0.1] text-white shadow-sm border border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Ways to Add
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("back_tap");
            }}
            className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === "back_tap"
                ? "bg-white/[0.1] text-white shadow-sm border border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Action Button
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("automation");
            }}
            className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === "automation"
                ? "bg-white/[0.1] text-white shadow-sm border border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Apple Pay
          </button>
        </div>

        {/* TAB 1: WAYS TO ADD TRANSACTIONS */}
        {activeTab === "ways_to_add" && (
          <div className="space-y-3">
            {[
              {
                num: "1",
                icon: Mic,
                title: "Voice Quick-Add",
                desc: "Tap the mic and speak naturally, e.g., 'Kopi 35 ribu pakai BCA'.",
                scheme: "trouvaille://voice",
              },
              {
                num: "2",
                icon: Zap,
                title: "Apple Shortcuts",
                desc: "Trigger Voice or Screen Scanner directly via Siri, Widget, or Action Button.",
                scheme: "trouvaille://add",
              },
              {
                num: "3",
                icon: Camera,
                title: "Scan Receipt",
                desc: "Snap a physical paper receipt or QRIS printout to parse items with AI.",
                scheme: "trouvaille://scan",
              },
              {
                num: "4",
                icon: Layers,
                title: "Attach Screenshot",
                desc: "Select a payment proof or bank mutation screenshot from your photo library.",
                scheme: "trouvaille://scan",
              },
              {
                num: "5",
                icon: Share2,
                title: "iOS Share Sheet",
                desc: "Share transaction text or receipts from WhatsApp, BCA, or Grab to Trouvaille.",
                scheme: "trouvaille://add?text=",
              },
              {
                num: "6",
                icon: PlusCircle,
                title: "Manual Keypad",
                desc: "Ergonomic triple-zero 000 keypad with in-line math calculation.",
                scheme: "trouvaille://add",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.num}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      background: "var(--bg-base)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 space-y-0.5 pr-1">
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="text-[11px] leading-relaxed font-normal"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.scheme, item.title)}
                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[var(--text-tertiary)] hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
                    title="Copy URL Scheme"
                  >
                    {copiedKey === item.title ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: BACK TAP & ACTION BUTTON STEP-BY-STEP */}
        {activeTab === "back_tap" && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Action Button & Back Tap Setup
              </span>

              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  1
                </div>
                <div className="space-y-1">
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Create or Open Apple Shortcut
                  </p>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    In iOS <strong>Shortcuts</strong> app, add action <strong>Open URLs</strong> and paste the URL scheme below:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <code
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono border"
                      style={{
                        background: "var(--bg-base)",
                        borderColor: "var(--glass-border)",
                        color: "var(--accent)",
                      }}
                    >
                      trouvaille://voice
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("trouvaille://voice", "Voice URL")}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      {copiedKey === "Voice URL" ? <Check size={11} /> : <Copy size={11} />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 pt-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  2
                </div>
                <div className="space-y-1">
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Assign to Action Button or Back Tap
                  </p>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <strong>iPhone 15/16 Pro:</strong> Go to <em>Settings &gt; Action Button</em>, choose <em>Shortcut</em>, and pick your Trouvaille shortcut.
                    <br />
                    <strong>Any iPhone:</strong> Go to <em>Settings &gt; Accessibility &gt; Touch &gt; Back Tap</em>, select <em>Double Tap</em> or <em>Triple Tap</em>, and assign the shortcut.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 pt-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                  style={{
                    background: "var(--bg-base)",
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
                    Instant Trigger Anywhere
                  </p>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Press the Action Button or double tap the back of your phone from any app (banking receipt, QRIS, coffee shop checkout) to immediately log your transaction.
                  </p>
                </div>
              </div>
            </div>

            {/* Test deep links */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestDeepLink("trouvaille://voice")}
                className="flex-1 py-3 px-3 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Mic size={14} />
                <span>Test Voice Scheme</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestDeepLink("trouvaille://scan")}
                className="flex-1 py-3 px-3 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <Camera size={14} />
                <span>Test Scan Scheme</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: APPLE PAY AUTOMATION */}
        {activeTab === "automation" && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Apple Pay Tap Automation
              </span>

              <div className="space-y-3 text-[12px]">
                <div className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                    style={{
                      background: "var(--bg-base)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-[13px] text-[var(--text-primary)]">
                      Open Shortcuts &gt; Automation
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Tap <em>New Automation</em>, then choose <em>Transaction</em> or <em>When I Tap a Wallet Card</em>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                    style={{
                      background: "var(--bg-base)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-[13px] text-[var(--text-primary)]">
                      Set to Run Immediately
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Select your primary cards, then select <em>Run Immediately</em> so it executes automatically in the background without prompting.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold border"
                    style={{
                      background: "var(--bg-base)",
                      borderColor: "var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-[13px] text-[var(--text-primary)]">
                      Open Trouvaille URL
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Add the action <em>Open URL</em> with <code>trouvaille://add?text=Shortcut Input</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard("trouvaille://add?text=", "URL Template")}
              className="w-full py-3.5 px-4 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 transition-colors cursor-pointer"
            >
              {copiedKey === "URL Template" ? <Check size={14} /> : <Copy size={14} />}
              <span>Copy Automation URL Scheme</span>
            </button>
          </div>
        )}

        {/* Bottom Done Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14px] transition-all active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-canvas)",
          }}
        >
          Done
        </button>
      </div>
    </BottomSheet>
  );
}
