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
import { useLanguage } from "../../contexts/LanguageContext";
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
  const { isIndonesian } = useLanguage();
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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04] text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mb-1">
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
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
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
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
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
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
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
                title: isIndonesian ? "Voice Quick-Add (Siri)" : "Voice Quick-Add (Siri)",
                desc: isIndonesian
                  ? "Bicara santai tanpa mengetik, contoh: 'Kopi 35 ribu pakai BCA'."
                  : "Speak naturally without typing, e.g., 'Coffee 35k with BCA'.",
                scheme: "trouvaille://voice",
                steps: isIndonesian
                  ? [
                      "Buka aplikasi Shortcuts di iPhone, lalu ketuk tanda '+' untuk membuat Shortcut baru.",
                      "Cari tindakan 'Open URL' (Buka URL), lalu masukkan skema 'trouvaille://voice'.",
                      "Beri nama shortcut 'Catat Pengeluaran' atau 'Trouvaille Voice'.",
                      "Kini cukup ucapkan 'Hey Siri, Catat Pengeluaran' — mic langsung aktif mendengar!",
                    ]
                  : [
                      "Open the Apple Shortcuts app on iPhone, then tap '+' to create a new Shortcut.",
                      "Search for the 'Open URL' action, then paste the scheme 'trouvaille://voice'.",
                      "Name the shortcut 'Quick Expense' or 'Trouvaille Voice'.",
                      "Now simply say 'Hey Siri, Quick Expense' — the mic activates instantly!",
                    ],
              },
              {
                num: "2",
                icon: Zap,
                title: isIndonesian ? "Apple Shortcuts & Lock Screen" : "Apple Shortcuts & Lock Screen",
                desc: isIndonesian
                  ? "Buka jendela pencatatan instan dari Lock Screen atau Control Center."
                  : "Trigger the instant logging modal directly from Lock Screen or Control Center.",
                scheme: "trouvaille://add",
                steps: isIndonesian
                  ? [
                      "Buat Shortcut baru dengan tindakan 'Open URL', lalu masukkan 'trouvaille://add'.",
                      "Tambahkan widget Shortcuts ke Lock Screen atau Home Screen iPhone Anda.",
                      "Ketuk widget satu kali kapan pun ingin membuka modal pencatatan tanpa navigasi manual.",
                    ]
                  : [
                      "Create a new Shortcut with 'Open URL' action pointing to 'trouvaille://add'.",
                      "Add a Shortcuts widget to your iPhone Lock Screen or Home Screen.",
                      "Tap the widget anytime to launch the transaction entry modal in 1 tap.",
                    ],
              },
              {
                num: "3",
                icon: Camera,
                title: isIndonesian ? "AI Receipt Scanner (Struk Fisik)" : "AI Receipt Scanner (Paper Receipts)",
                desc: isIndonesian
                  ? "Foto struk kasir atau barcode QRIS; AI membedah item & nominal otomatis."
                  : "Snap physical receipts or QRIS slips; AI extracts items and amounts automatically.",
                scheme: "trouvaille://scan",
                steps: isIndonesian
                  ? [
                      "Buat Shortcut baru dengan tindakan 'Open URL' dan skema 'trouvaille://scan'.",
                      "Pasang shortcut ini di menu Back Tap (Ketuk Belakang) atau Action Button.",
                      "Arahkan kamera ke struk belanja; AI Trouvaille memproses merchant dan nominal belanja.",
                    ]
                  : [
                      "Create a new Shortcut with 'Open URL' action using scheme 'trouvaille://scan'.",
                      "Assign this shortcut to your iOS Back Tap or Action Button gesture.",
                      "Point the camera at any receipt; Trouvaille AI parses merchant and amount.",
                    ],
              },
              {
                num: "4",
                icon: Layers,
                title: isIndonesian ? "Screenshot Mutasi & Bukti Transfer" : "Screenshot & Transfer Proof",
                desc: isIndonesian
                  ? "Ekstrak bukti pembayaran m-banking langsung dari galeri foto iPhone."
                  : "Extract m-banking transaction confirmations directly from photo library.",
                scheme: "trouvaille://scan",
                steps: isIndonesian
                  ? [
                      "Setelah transfer di BCA, Mandiri, atau GoPay, simpan screenshot bukti pembayaran.",
                      "Gunakan skema 'trouvaille://scan' untuk langsung melompat ke pemindai screenshot.",
                      "Pilih foto dari galeri; OCR AI mengekstrak nominal dan tanggal dalam hitungan detik.",
                    ]
                  : [
                      "After completing a payment in your banking app, save the confirmation screenshot.",
                      "Trigger 'trouvaille://scan' to jump directly into the screenshot parser.",
                      "Select the photo from gallery; AI extracts nominal and date within seconds.",
                    ],
              },
              {
                num: "5",
                icon: Share2,
                title: isIndonesian ? "iOS Share Sheet (Bagikan Teks)" : "iOS Share Sheet (Direct Text)",
                desc: isIndonesian
                  ? "Bagikan teks tagihan dari WhatsApp atau SMS perbankan ke Trouvaille."
                  : "Share transaction text from WhatsApp or SMS banking directly to Trouvaille.",
                scheme: "trouvaille://add?text=",
                steps: isIndonesian
                  ? [
                      "Di detail Shortcut, aktifkan toggle 'Show in Share Sheet' (Tampilkan di Lembar Berbagi).",
                      "Konfigurasikan aksi URL: 'trouvaille://add?text=[Shortcut Input]'.",
                      "Saat menerima pesan tagihan atau mutasi, pilih Bagikan > Trouvaille untuk auto-parse.",
                    ]
                  : [
                      "In Shortcut details, enable 'Show in Share Sheet'.",
                      "Configure the URL action as: 'trouvaille://add?text=[Shortcut Input]'.",
                      "When receiving an SMS or message, tap Share > Trouvaille for instant auto-parse.",
                    ],
              },
              {
                num: "6",
                icon: PlusCircle,
                title: isIndonesian ? "Numpad Ergonomis & Kalkulator" : "Ergonomic Numpad & Math Calc",
                desc: isIndonesian
                  ? "Keypad monokrom dengan tombol 000 dan perhitungan matematika in-line."
                  : "Monochrome keypad with triple-zero 000 and in-line mathematical calculation.",
                scheme: "trouvaille://add",
                steps: isIndonesian
                  ? [
                      "Buka Trouvaille di Safari iOS, lalu pilih 'Add to Home Screen' untuk mode PWA fullscreen.",
                      "Gunakan tombol '+' di navbar bawah atau panggil via skema 'trouvaille://add'.",
                      "Ketik nominal dengan bantuan tombol '000' dan operator '+' atau '-' langsung di kolom.",
                    ]
                  : [
                      "Open Trouvaille in iOS Safari and tap 'Add to Home Screen' for standalone fullscreen mode.",
                      "Use the '+' bottom navbar button or launch via 'trouvaille://add'.",
                      "Type amounts with triple-zero '000' and in-line '+' or '-' arithmetic directly in-field.",
                    ],
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.num}
                  className="p-3.5 rounded-2xl border transition-all space-y-2.5"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-start gap-3">
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-tertiary)]">
                          #{item.num}
                        </span>
                        <p
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.title}
                        </p>
                      </div>
                      <p
                        className="text-[11px] leading-relaxed font-normal"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="pt-2 border-t border-[var(--glass-border)] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      {isIndonesian ? "Panduan Langkah demi Langkah" : "Step-by-Step Setup Guide"}
                    </p>
                    {item.steps.map((st, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                          {sIdx + 1}
                        </span>
                        <span className="leading-snug flex-1">{st}</span>
                      </div>
                    ))}

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.scheme, item.title)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:scale-95 text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedKey === item.title ? (
                          <>
                            <Check size={12} className="text-emerald-500" />
                            <span>{isIndonesian ? "URL Tersalin!" : "Scheme Copied!"}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>{isIndonesian ? "Salin URL Scheme" : "Copy URL Scheme"}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestDeepLink(item.scheme)}
                        className="py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-95 text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title={isIndonesian ? "Uji coba buka deep link langsung" : "Test trigger deep link"}
                      >
                        <Zap size={11} />
                        <span>{isIndonesian ? "Tes Link" : "Test Link"}</span>
                      </button>
                    </div>
                  </div>
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
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[var(--text-primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      {copiedKey === "Voice URL" ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
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
              className="w-full py-3 px-4 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {copiedKey === "URL Template" ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
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
