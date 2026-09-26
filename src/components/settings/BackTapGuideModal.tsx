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
import { useLanguage } from "../../contexts/LanguageContext";

interface BackTapGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackTapGuideModal({ isOpen, onClose }: BackTapGuideModalProps) {
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const [copiedScheme, setCopiedScheme] = useState(false);

  const urlSchemeExample = "trouvaille://add?text=";

  const handleCopyScheme = () => {
    navigator.clipboard.writeText(urlSchemeExample);
    setCopiedScheme(true);
    showToast(
      isIndonesian ? "Skema URL berhasil disalin" : "URL Scheme copied to clipboard",
      "add",
      () => {}
    );
    setTimeout(() => setCopiedScheme(false), 2000);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-12 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04] text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mb-1">
            <Smartphone size={13} strokeWidth={1.5} />
            <span>{isIndonesian ? "Otomatisasi Bawaan iOS" : "iOS Native Automation"}</span>
          </div>
          <h3
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian ? "Ketuk Belakang & Pintasan iPhone" : "iPhone Back Tap & Shortcuts"}
          </h3>
          <p
            className="text-[13px] leading-relaxed font-normal"
            style={{ color: "var(--text-secondary)" }}
          >
            {isIndonesian
              ? "Catat transaksi dalam waktu singkat dengan mengetuk dua kali bodi belakang iPhone Anda pada bukti transfer perbankan atau layar QRIS."
              : "Record transactions in under one second by double-tapping the back of your iPhone on any m-Banking receipt or QRIS screen."}
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
            {isIndonesian ? "Resep Pintasan Apple 3 Langkah" : "The 3-Step Apple Shortcut Recipe"}
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
                {isIndonesian ? "Ambil Tangkapan Layar" : "Take Screenshot"}
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {isIndonesian
                  ? "Tindakan: Ambil Tangkapan Layar. Mengambil gambar layar bukti pembayaran Anda."
                  : "Action: Take Screenshot. Captures your current banking receipt."}
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
                {isIndonesian ? "Ekstrak Teks dengan Apple Vision" : "Extract Text with Apple Vision"}
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {isIndonesian
                  ? "Tindakan: Ekstrak Teks dari Gambar. Pemindaian OCR instan di perangkat tanpa internet."
                  : "Action: Extract Text from Image. 100% on-device OCR, instantaneous (<0.2s) and private."}
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
                {isIndonesian ? "Buka Skema URL Trouvaille" : "Open Trouvaille URL Scheme"}
              </p>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {isIndonesian
                  ? "Tindakan: Buka URL dengan skema tujuan di bawah."
                  : "Action: Open URL with the target scheme below."}
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
              {isIndonesian ? "Skema URL Sasaran" : "Shortcut Target URL"}
            </span>
            <button
              type="button"
              onClick={handleCopyScheme}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all active:scale-95 cursor-pointer border"
              style={{
                background: copiedScheme ? "var(--text-primary)" : "var(--bg-elevated)",
                color: copiedScheme ? "var(--bg-canvas)" : "var(--text-primary)",
                borderColor: "var(--glass-border)",
              }}
            >
              {copiedScheme ? (
                <>
                  <Check size={12} strokeWidth={2} />
                  <span>{isIndonesian ? "Disalin" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy size={12} strokeWidth={1.5} />
                  <span>{isIndonesian ? "Salin" : "Copy"}</span>
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
            {isIndonesian
              ? "Ganti [Text] dengan variabel dinamis dari tindakan Ekstrak Teks."
              : "Replace [Text] with the magic variable from the Extract Text action."}
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
              {isIndonesian ? "Cara Mengaktifkan Ketuk Belakang iPhone" : "How to enable iPhone Back Tap"}
            </span>
          </div>
          <ol
            className="text-[12px] space-y-1.5 list-decimal list-inside leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {isIndonesian ? (
              <>
                <li>Buka iPhone <span className="font-semibold text-[var(--text-primary)]">Pengaturan</span> &gt; <span className="font-semibold text-[var(--text-primary)]">Aksesibilitas</span>.</li>
                <li>Ketuk <span className="font-semibold text-[var(--text-primary)]">Sentuh</span>, lalu gulir ke bawah ke <span className="font-semibold text-[var(--text-primary)]">Ketuk Bagian Belakang</span>.</li>
                <li>Pilih <span className="font-semibold text-[var(--text-primary)]">Ketuk Dua Kali</span> dan tentukan pintasan yang telah dibuat!</li>
              </>
            ) : (
              <>
                <li>Open iPhone <span className="font-semibold text-[var(--text-primary)]">Settings</span> &gt; <span className="font-semibold text-[var(--text-primary)]">Accessibility</span>.</li>
                <li>Tap <span className="font-semibold text-[var(--text-primary)]">Touch</span>, then scroll down to <span className="font-semibold text-[var(--text-primary)]">Back Tap</span>.</li>
                <li>Select <span className="font-semibold text-[var(--text-primary)]">Double Tap</span> and pick your created shortcut!</li>
              </>
            )}
          </ol>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2.5 px-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          <Info size={14} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <span>
            {isIndonesian
              ? "Trouvaille secara cerdas mendeteksi nominal transaksi, merchant (BCA, Mandiri, GoPay, QRIS, dll.), dan kategori secara privat langsung di perangkat."
              : "Trouvaille automatically detects amounts, merchants (BCA, Mandiri, GoPay, QRIS, etc.), and categories without sending your data to any external server."}
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}
