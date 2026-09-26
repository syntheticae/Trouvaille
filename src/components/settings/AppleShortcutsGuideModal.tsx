import { useState, useEffect } from "react";
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
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  AlertCircle,
  Download,
  Key,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCategories } from "../../hooks/useCategories";
import { useWallets } from "../../hooks/useWallets";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";

export type TabType =
  | "back_tap"
  | "action_button"
  | "ways_to_add"
  | "automation";
type BackTapSubMode = "instant_sheet" | "smart_nlp" | "glass_dialog";

interface AppleShortcutsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
}

export function AppleShortcutsGuideModal({
  isOpen,
  onClose,
  initialTab = "back_tap",
}: AppleShortcutsGuideModalProps) {
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const { session } = useAuth();
  const userToken = session?.user?.id || "";
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [backTapMode, setBackTapMode] =
    useState<BackTapSubMode>("instant_sheet");
  const [glassSaveMethod, setGlassSaveMethod] = useState<
    "background" | "url_scheme"
  >("background");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showManualSteps, setShowManualSteps] = useState<boolean>(false);

  const anonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxamNtcWtncmZtb3B6bnJmaWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODA0NzcsImV4cCI6MjEwMjg1NjQ3N30.ujfATs0huUkR9tCNB0Rs8JlqJG3dkz13EKtkr-eFiDg";
  const rpcEndpoint =
    "https://iqjcmqkgrfmopznrfikx.supabase.co/rest/v1/rpc/quick_add_transaction";

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const copyToClipboard = (text: string, label: string) => {
    triggerSuccessHaptic();
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(
      `${label} ${isIndonesian ? "berhasil disalin" : "copied to clipboard"}`,
      "add",
      () => {},
    );
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestDeepLink = (scheme: string) => {
    triggerHaptic("medium");
    window.location.href = scheme;
  };

  const copyCategoryList = () => {
    const list = categories
      .filter((c) => c.type !== "income")
      .map((c) => c.name)
      .join("\n");
    copyToClipboard(
      list || "Makanan\nTransportasi\nBelanja\nHiburan\nTagihan",
      isIndonesian ? "Daftar Kategori" : "Category List",
    );
  };

  const copyWalletList = () => {
    const list = wallets.map((w) => w.name).join("\n");
    copyToClipboard(
      list || "BCA\nMandiri\nGoPay\nTunai",
      isIndonesian ? "Daftar Akun / Dompet" : "Wallet List",
    );
  };

  const instantSchemeTemplate = "trouvaille://add";
  const smartNlpSchemeTemplate = isIndonesian
    ? "trouvaille://add?text=[Teks Terenkode]&autosave=true"
    : "trouvaille://add?text=[URL Encoded Text]&autosave=true";
  const glassSchemeTemplate = isIndonesian
    ? "trouvaille://add?nominal=[Nominal]&kategori=[Kategori]&rekening=[Rekening]&tanggal=[Tanggal]&catatan=[Teks Terenkode]&autosave=true"
    : "trouvaille://add?amount=[Amount]&category=[Category]&wallet=[Wallet]&date=[Date]&note=[URL Encoded Text]&autosave=true";

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-14 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04] text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mb-1">
            <Smartphone size={13} strokeWidth={1.5} />
            <span>
              {isIndonesian
                ? "Integrasi Ekosistem Apple iOS"
                : "Apple iOS Ecosystem Integration"}
            </span>
          </div>
          <h3
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {isIndonesian
              ? "Ketuk Belakang & Pintasan iOS"
              : "Back Tap & iOS Shortcuts"}
          </h3>
          <p
            className="text-[13px] leading-relaxed font-normal"
            style={{ color: "var(--text-secondary)" }}
          >
            {isIndonesian
              ? "Catat transaksi instan dengan mengetuk 2x bodi belakang iPhone, dialog kaca Dynamic Island, dikte suara, Tombol Aksi, atau otomatisasi Apple Pay."
              : "Instantly record expenses by double-tapping the back of your iPhone, Dynamic Island frosted glass dialogs, voice dictation, Action Button, or Apple Pay automations."}
          </p>
        </div>

        {/* QUICK 1-TAP DOWNLOAD CARD */}
        <div
          className="p-4 rounded-2xl border space-y-3.5"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Download
                  size={14}
                  strokeWidth={1.75}
                  className="text-[var(--text-primary)]"
                />
                <h4
                  className="text-[13px] font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian
                    ? "Unduh File Pintasan Siap Pakai (.shortcut)"
                    : "Download Ready-to-Use Shortcut (.shortcut)"}
                </h4>
              </div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {isIndonesian
                  ? "Unduh file pintasan resmi Trouvaille lalu buka di iPhone untuk langsung memasang seluruh urutan dialog kaca tanpa perlu menyusun tindakan manual satu per satu."
                  : "Download the official Trouvaille shortcut file and open it on your iPhone to install the full glass dialog sequence without manual setup."}
              </p>
            </div>
          </div>

          <a
            href="/shortcuts/Trouvaille_Glass_Dialog.shortcut"
            download="Trouvaille_Glass_Dialog.shortcut"
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--glass-border)] bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] text-[12px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Download size={14} strokeWidth={1.75} />
            <span>
              {isIndonesian
                ? "Unduh File Pintasan (.shortcut)"
                : "Download Shortcut File (.shortcut)"}
            </span>
          </a>

          {/* User Personal Token */}
          {userToken && (
            <div
              className="p-3 rounded-xl border text-[11px] space-y-1.5"
              style={{
                background: "var(--bg-base)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                  <Key size={12} strokeWidth={1.75} />
                  <span>
                    {isIndonesian
                      ? "Token Pengguna Pribadi Anda"
                      : "Your Personal User Token"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      userToken,
                      isIndonesian ? "Token Pengguna" : "User Token",
                    )
                  }
                  className="py-1 px-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[10px] font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedKey ===
                  (isIndonesian ? "Token Pengguna" : "User Token") ? (
                    <Check size={11} className="text-[var(--text-primary)]" />
                  ) : (
                    <Copy size={11} />
                  )}
                  <span>{isIndonesian ? "Salin Token" : "Copy Token"}</span>
                </button>
              </div>
              <div className="font-mono text-[10px] text-[var(--text-secondary)] truncate select-all">
                {userToken}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-normal">
                {isIndonesian
                  ? "Digunakan untuk otentikasi penyimpanan latar belakang agar transaksi tersimpan hening tanpa membuka aplikasi."
                  : "Used for silent background authentication so transactions save without opening the app."}
              </p>
            </div>
          )}
        </div>

        {/* 4-Way Segmented Tabs */}
        <div
          className="grid grid-cols-4 p-1 rounded-2xl border text-center gap-1"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("back_tap");
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "back_tap"
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isIndonesian ? "Ketuk Belakang" : "Back Tap"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("action_button");
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "action_button"
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isIndonesian ? "Tombol Aksi" : "Action Btn"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("ways_to_add");
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "ways_to_add"
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isIndonesian ? "Metode Catat" : "Ways"}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("automation");
            }}
            className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer truncate ${
              activeTab === "automation"
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isIndonesian ? "Otomatisasi" : "Apple Pay"}
          </button>
        </div>

        {/* SECTION 1: BACK TAP GLASS DIALOG TUTORIAL & VOICE */}
        {activeTab === "back_tap" && (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl border text-[11px]"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setBackTapMode("instant_sheet");
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  backTapMode === "instant_sheet"
                    ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Zap size={12} strokeWidth={1.5} />
                <span>{isIndonesian ? "1 Tindakan" : "1 Action"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setBackTapMode("smart_nlp");
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  backTapMode === "smart_nlp"
                    ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Sparkles size={12} strokeWidth={1.5} />
                <span>{isIndonesian ? "Kalimat Cerdas" : "Sentence"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setBackTapMode("glass_dialog");
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  backTapMode === "glass_dialog"
                    ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <SlidersHorizontal size={12} strokeWidth={1.5} />
                <span>
                  {isIndonesian ? "Dialog Bertingkat" : "Dialog Glass"}
                </span>
              </button>
            </div>

            {/* SUB-MODE 1: INSTANT SHEET (1 ACTION) */}
            {backTapMode === "instant_sheet" && (
              <div className="space-y-3">
                <div
                  className="p-3.5 rounded-2xl border space-y-2"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-[var(--text-primary)]" />
                    <h4
                      className="text-[13px] font-semibold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Metode Paling Praktis: Buka Lembar Transaksi Cepat"
                        : "Most Practical: Instant Transaction Sheet"}
                    </h4>
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian
                      ? "Cuma butuh 1 tindakan sederhana di aplikasi Pintasan iPhone! Saat bodi iPhone diketuk atau Tombol Aksi ditekan, Trouvaille seketika terbuka dengan lembar transaksi dan papan tombol angka siap diketik."
                      : "Requires only 1 single action in Apple Shortcuts! Tapping your iPhone or pressing the Action Button immediately opens Trouvaille with the numeric keypad ready."}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Step 1: Open URLs */}
                  <div
                    className="p-3 rounded-2xl border space-y-2"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          1
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Tindakan Buka URL"
                            : "Open URLs Action"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        URL
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Buka aplikasi Pintasan di iPhone, buat pintasan baru (+), lalu tambahkan satu tindakan saja yaitu 'Buka URL' dengan alamat tautan berikut:"
                        : "Open Apple Shortcuts app, create a new shortcut (+), and add just one action 'Open URLs' pointing to this address:"}
                    </p>
                    <div className="pl-7 space-y-2">
                      <code
                        className="block p-2 rounded-xl text-[11px] font-mono border break-all"
                        style={{
                          background: "var(--bg-base)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {instantSchemeTemplate}
                      </code>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              instantSchemeTemplate,
                              isIndonesian
                                ? "Tautan Buka Lembar"
                                : "Instant Sheet URL",
                            )
                          }
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedKey ===
                          (isIndonesian
                            ? "Tautan Buka Lembar"
                            : "Instant Sheet URL") ? (
                            <Check
                              size={12}
                              className="text-[var(--text-primary)]"
                            />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>
                            {isIndonesian ? "Salin Tautan" : "Copy URL"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTestDeepLink(instantSchemeTemplate)
                          }
                          className="py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Zap size={11} />
                          <span>
                            {isIndonesian ? "Uji Buka Lembar" : "Test Open"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Assign to Back Tap */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          2
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Tautkan ke Ketuk Belakang iPhone"
                            : "Assign to iPhone Back Tap"}
                        </span>
                      </div>
                      <Smartphone
                        size={13}
                        className="text-[var(--text-tertiary)]"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Buka Pengaturan iPhone > Aksesibilitas > Sentuh > Ketuk Bagian Belakang > Ketuk Dua Kali > Pilih pintasan yang baru Anda buat. Selesai! Cukup ketuk bodi belakang iPhone 2 kali kapan saja untuk langsung mencatat."
                        : "Open iPhone Settings > Accessibility > Touch > Back Tap > Double Tap > Select your shortcut. Done! Double-tap your phone back anytime to open the keypad."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-MODE 2: SMART NLP SENTENCE & VOICE (2 ACTIONS) */}
            {backTapMode === "smart_nlp" && (
              <div className="space-y-3">
                <div
                  className="p-3.5 rounded-2xl border space-y-2"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={14}
                      className="text-[var(--text-primary)]"
                    />
                    <h4
                      className="text-[13px] font-semibold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Pencatatan Cerdas 1 Kalimat (Ketik atau Suara)"
                        : "Smart 1-Sentence Logging (Text or Voice)"}
                    </h4>
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian
                      ? "Tidak perlu memilih kategori atau rekening satu per satu! Cukup masukkan satu kalimat alami (misal: 'Kopi 25rb BCA' atau 'Makan siang 50000 GoPay'). Mesin cerdas Trouvaille otomatis mendeteksi nominal, kategori, dan rekening, lalu langsung menyimpannya."
                      : "No need to pick categories or wallets manually! Type or dictate a single natural phrase (e.g. 'Coffee 25k BCA' or 'Lunch 50000 Cash'). Trouvaille automatically detects the amount, category, and wallet, and saves immediately."}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Action 1 */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          1
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Minta Masukan (atau Diktekan Teks)"
                            : "Ask for Input (or Dictate Text)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        Input
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Minta Masukan' dengan jenis Teks (atau tindakan 'Diktekan Teks' untuk suara). Tulis pertanyaan misalnya: \"Catat apa? (Contoh: Kopi 25rb BCA)\"."
                        : "Add 'Ask for Input' with Text type (or 'Dictate Text' for speech). Prompt: \"What did you spend? (e.g. Coffee 25k Cash)\"."}
                    </p>
                  </div>

                  {/* Action 2 */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          2
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian ? "Enkode URL" : "URL Encode"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        URL Encoded
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Enkode URL' dan masukkan teks dari tindakan sebelumnya agar spasi dan tanda baca aman."
                        : "Add 'URL Encode' action and pass the previous text input to safely encode spaces and symbols."}
                    </p>
                  </div>

                  {/* Action 3 */}
                  <div
                    className="p-3.5 rounded-2xl border space-y-2"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          3
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Buka URL & Simpan Otomatis"
                            : "Open URLs & Direct Auto-Save"}
                        </span>
                      </div>
                      <Zap size={13} className="text-[var(--text-primary)]" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Buka URL' dengan templat tautan berikut dan masukkan variabel hasil enkode URL:"
                        : "Add 'Open URLs' action with the following template using the URL encoded variable:"}
                    </p>
                    <div className="pl-7 space-y-2">
                      <code
                        className="block p-2 rounded-xl text-[10px] font-mono border break-all"
                        style={{
                          background: "var(--bg-base)",
                          borderColor: "var(--glass-border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {smartNlpSchemeTemplate}
                      </code>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              smartNlpSchemeTemplate,
                              isIndonesian
                                ? "Templat Kalimat Cerdas"
                                : "Smart Sentence Template",
                            )
                          }
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedKey ===
                          (isIndonesian
                            ? "Templat Kalimat Cerdas"
                            : "Smart Sentence Template") ? (
                            <Check
                              size={12}
                              className="text-[var(--text-primary)]"
                            />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>
                            {isIndonesian
                              ? "Salin Templat Tautan"
                              : "Copy Scheme Template"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTestDeepLink(
                              "trouvaille://add?text=Kopi%20susu%2025rb%20pakai%20BCA&autosave=true",
                            )
                          }
                          className="py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Zap size={11} />
                          <span>
                            {isIndonesian
                              ? "Uji Simpan Otomatis"
                              : "Test Auto-Save"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Examples */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5 text-[11px]"
                    style={{
                      background: "var(--bg-base)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <p className="font-semibold text-[var(--text-primary)]">
                      {isIndonesian
                        ? "Contoh Kalimat yang Dikenali Otomatis:"
                        : "Supported Sentence Examples:"}
                    </p>
                    <ul className="space-y-1 text-[var(--text-secondary)] pl-2">
                      {isIndonesian ? (
                        <>
                          <li>
                            • "Kopi 25 ribu pakai BCA" ➔ Rp 25.000, Kategori
                            Makanan & Minuman, Rekening BCA
                          </li>
                          <li>
                            • "Makan siang 50000 bayar GoPay" ➔ Rp 50.000,
                            Kategori Makanan, Rekening GoPay
                          </li>
                          <li>
                            • "Beli bensin 100rb Tunai" ➔ Rp 100.000, Kategori
                            Transportasi, Rekening Tunai
                          </li>
                          <li>
                            • "Makan malam bersama 150 ribu" ➔ Rp 150.000,
                            Kategori Makanan, Rekening Utama
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            • "Coffee 25k using Cash" ➔ 25,000, Food & Drinks,
                            Cash
                          </li>
                          <li>
                            • "Lunch 50000 with Apple Pay" ➔ 50,000, Food, Apple
                            Pay
                          </li>
                          <li>
                            • "Gasoline 100k checking account" ➔ 100,000,
                            Transport, Bank
                          </li>
                          <li>
                            • "Dinner with friends 150k" ➔ 150,000, Food,
                            Default Wallet
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-MODE 3: REVISED FAST GLASS DIALOG */}
            {backTapMode === "glass_dialog" && (
              <div className="space-y-3">
                <div
                  className="p-3.5 rounded-2xl border space-y-2"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={14}
                      className="text-[var(--text-primary)]"
                    />
                    <h4
                      className="text-[13px] font-semibold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Panduan Pintasan Dialog Bertingkat Sistem"
                        : "System Step-by-Step Dialog Guide"}
                    </h4>
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian
                      ? "Metode teks balok: Menggunakan tindakan Teks dan Pisahkan Teks agar Anda dapat menempel seluruh daftar kategori dan rekening sekaligus tanpa perlu menekan tombol tambah berulang kali."
                      : "Bulk text method: Uses Text and Split Text actions so you can paste all categories and accounts at once without repeatedly tapping add item."}
                  </p>
                </div>

                {/* 1-Tap Download Card for Glass Dialog */}
                <div
                  className="p-3.5 rounded-2xl border space-y-2.5"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-[12px] text-[var(--text-primary)]">
                      <Download size={13} strokeWidth={1.75} />
                      <span>
                        {isIndonesian
                          ? "Pasang 1-Ketukan (.shortcut) — Rekomendasi Utama"
                          : "1-Tap Install (.shortcut) — Recommended"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                      .shortcut
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {isIndonesian
                      ? "Tidak perlu repot menyusun 8 tindakan manual! Cukup unduh file pintasan resmi Trouvaille lalu buka di iPhone untuk langsung menggunakannya."
                      : "Skip building 8 manual actions! Download the official Trouvaille shortcut file and open it on iPhone to use it immediately."}
                  </p>
                  <a
                    href="/shortcuts/Trouvaille_Glass_Dialog.shortcut"
                    download="Trouvaille_Glass_Dialog.shortcut"
                    className="w-full py-2 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    <Download size={13} strokeWidth={1.75} />
                    <span>
                      {isIndonesian
                        ? "Unduh Pintasan Dialog Kaca"
                        : "Download Glass Dialog Shortcut"}
                    </span>
                  </a>
                </div>

                {/* Collapsible Manual Steps Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setShowManualSteps((prev) => !prev);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between cursor-pointer transition-colors shadow-xs"
                >
                  <span>
                    {showManualSteps
                      ? isIndonesian
                        ? "Sembunyikan Panduan Manual Teknis (8 Tindakan)"
                        : "Hide Technical Manual Steps (8 Actions)"
                      : isIndonesian
                        ? "Lihat Panduan Manual (Jika Ingin Merakit Sendiri)"
                        : "View Manual Steps (For Custom Assembly)"}
                  </span>
                  {showManualSteps ? (
                    <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                  )}
                </button>

                {showManualSteps && (
                  <div className="space-y-2.5 pt-1">
                    {/* Important Renaming Notice Box */}
                    <div
                      className="p-3 rounded-2xl border text-[11px] space-y-1"
                      style={{
                        background: "var(--bg-base)",
                        borderColor: "var(--glass-border)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                        <Sparkles size={12} strokeWidth={1.5} />
                        <span>
                          {isIndonesian
                            ? "Petunjuk Penting: Ganti Nama Variabel"
                            : "Critical Tip: Rename Variables"}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {isIndonesian
                          ? "Agar tidak tertukar pada langkah akhir, ketuk setiap variabel biru pada papan ketik iOS lalu pilih opsi 'Ganti Nama' sesuai urutan: Nominal, Kategori, Rekening, Tanggal, Catatan."
                          : "To avoid ambiguous variables, tap each blue variable on iOS keyboard and choose 'Rename' to: Amount, Category, Wallet, Date, Note."}
                      </p>
                    </div>

                    {/* 8 Action Cards */}
                    <div className="space-y-2.5">
                  {/* Action 1: Ask for Number */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          1
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Minta Masukan Nominal"
                            : "Ask for Input (Amount)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {isIndonesian ? "Nominal" : "Amount"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Minta Masukan', atur jenis masukan ke 'Angka' dengan pertanyaan: \"Berapa nominalnya?\". Ketuk variabel hasilnya lalu pilih opsi 'Ganti Nama' menjadi 'Nominal'."
                        : "Add action 'Ask for Input', set type to 'Number' with prompt: \"How much was it?\". Tap the output variable and select 'Rename' to 'Amount'."}
                    </p>
                  </div>

                  {/* Action 2: Text + Split Text + Choose from List - Kategori */}
                  <div
                    className="p-3 rounded-2xl border space-y-2"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          2
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Teks & Pisahkan Teks Kategori"
                            : "Text & Split Text (Category)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {isIndonesian ? "Kategori" : "Category"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Susun tiga tindakan berurutan berikut untuk memilih kategori:"
                        : "Arrange these 3 consecutive actions to select category:"}
                    </p>
                    <div className="pl-7 space-y-1 text-[11px] text-[var(--text-secondary)] font-mono">
                      {isIndonesian ? (
                        <>
                          <div>
                            a. <strong>Teks</strong> ➔ Tempel daftar kategori
                            Anda di bawah
                          </div>
                          <div>
                            b. <strong>Pisahkan Teks</strong> ➔ Berdasarkan
                            'Baris Baru'
                          </div>
                          <div>
                            c. <strong>Pilih dari Daftar</strong> ➔ Pilih dari
                            'Teks Terpisah', pertanyaan: "Kategori apa?"
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            a. <strong>Text</strong> ➔ Paste your category list
                            below
                          </div>
                          <div>
                            b. <strong>Split Text</strong> ➔ By 'New Lines'
                          </div>
                          <div>
                            c. <strong>Choose from List</strong> ➔ Select from
                            'Split Text', prompt: "Which category?"
                          </div>
                        </>
                      )}
                    </div>
                    <div className="pl-7">
                      <button
                        type="button"
                        onClick={copyCategoryList}
                        className="py-1 px-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedKey ===
                        (isIndonesian ? "Daftar Kategori" : "Category List") ? (
                          <Check
                            size={11}
                            className="text-[var(--text-primary)]"
                          />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>
                          {isIndonesian
                            ? "Salin Daftar Kategori Saya"
                            : "Copy My Categories"}
                        </span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] pl-7">
                      {isIndonesian
                        ? "Penting: Ketuk variabel 'Item yang Dipilih' lalu pilih opsi 'Ganti Nama' menjadi 'Kategori'."
                        : "Important: Tap 'Chosen Item' variable and select 'Rename' to 'Category'."}
                    </p>
                  </div>

                  {/* Action 3: Text + Split Text + Choose from List - Akun / Dompet */}
                  <div
                    className="p-3 rounded-2xl border space-y-2"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          3
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Teks & Pisahkan Teks Rekening"
                            : "Text & Split Text (Wallet)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {isIndonesian ? "Rekening" : "Wallet"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Sama seperti kategori, susun tiga tindakan berurutan berikut untuk rekening atau dompet:"
                        : "Just like category, arrange these 3 consecutive actions for wallets:"}
                    </p>
                    <div className="pl-7 space-y-1 text-[11px] text-[var(--text-secondary)] font-mono">
                      {isIndonesian ? (
                        <>
                          <div>
                            a. <strong>Teks</strong> ➔ Tempel daftar rekening
                            Anda di bawah
                          </div>
                          <div>
                            b. <strong>Pisahkan Teks</strong> ➔ Berdasarkan
                            'Baris Baru'
                          </div>
                          <div>
                            c. <strong>Pilih dari Daftar</strong> ➔ Pilih dari
                            'Teks Terpisah', pertanyaan: "Rekening mana?"
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            a. <strong>Text</strong> ➔ Paste your wallet list
                            below
                          </div>
                          <div>
                            b. <strong>Split Text</strong> ➔ By 'New Lines'
                          </div>
                          <div>
                            c. <strong>Choose from List</strong> ➔ Select from
                            'Split Text', prompt: "Which wallet?"
                          </div>
                        </>
                      )}
                    </div>
                    <div className="pl-7">
                      <button
                        type="button"
                        onClick={copyWalletList}
                        className="py-1 px-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedKey ===
                        (isIndonesian
                          ? "Daftar Akun / Dompet"
                          : "Wallet List") ? (
                          <Check
                            size={11}
                            className="text-[var(--text-primary)]"
                          />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>
                          {isIndonesian
                            ? "Salin Daftar Akun Saya"
                            : "Copy My Wallets"}
                        </span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] pl-7">
                      {isIndonesian
                        ? "Penting: Ketuk variabel 'Item yang Dipilih' lalu pilih opsi 'Ganti Nama' menjadi 'Rekening'."
                        : "Important: Tap 'Chosen Item' variable and select 'Rename' to 'Wallet'."}
                    </p>
                  </div>

                  {/* Action 4: Ask for Date and Time */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          4
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Minta Masukan Tanggal & Waktu"
                            : "Ask for Input (Date & Time)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {isIndonesian ? "Tanggal" : "Date"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Minta Masukan', atur jenis masukan ke 'Tanggal dan Waktu' dengan pertanyaan: \"Kapan transaksi terjadi?\". Ketuk variabel hasilnya lalu pilih opsi 'Ganti Nama' menjadi 'Tanggal'."
                        : "Add action 'Ask for Input', set type to 'Date and Time' with prompt: \"When was the transaction?\". Tap the variable and select 'Rename' to 'Date'."}
                    </p>
                  </div>

                  {/* Action 5: Ask for Text - Catatan */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          5
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Minta Masukan Catatan"
                            : "Ask for Input (Note / Description)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {isIndonesian ? "Catatan" : "Note"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Minta Masukan', atur jenis masukan ke 'Teks' dengan pertanyaan: \"Catatan transaksi apa?\". Ketuk variabel hasilnya lalu pilih opsi 'Ganti Nama' menjadi 'Catatan'."
                        : "Add action 'Ask for Input', set type to 'Text' with prompt: \"What was this transaction for?\". Tap variable and select 'Rename' to 'Note'."}
                    </p>
                  </div>

                  {/* Action 6: URL Encode for Note */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          6
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Enkode URL Catatan"
                            : "URL Encode (Sanitize Note Text)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {isIndonesian ? "Teks Terenkode" : "URL Encoded Text"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Enkode URL' lalu masukkan variabel 'Catatan'. Tindakan ini memastikan spasi dan tanda baca aman agar tautan tidak terpotong."
                        : "Add action 'URL Encode' and pass the 'Note' variable. This safely escapes spaces and symbols so the URL never breaks."}
                    </p>
                  </div>

                  {/* Action 7: Save Method (Background RPC vs URL Scheme) */}
                  <div
                    className="p-3.5 rounded-2xl border space-y-3"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          7
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {glassSaveMethod === "background"
                            ? isIndonesian
                              ? "Dapatkan Isi URL (Simpan Latar Belakang)"
                              : "Get Contents of URL (Background Save)"
                            : isIndonesian
                              ? "Buka URL & Simpan Otomatis"
                              : "Open URLs (Direct Auto-Save)"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-secondary)] font-semibold">
                        {glassSaveMethod === "background" ? "POST API" : "trouvaille://"}
                      </span>
                    </div>

                    {/* Method Toggle */}
                    <div
                      className="grid grid-cols-2 gap-1 p-1 rounded-xl border text-[11px]"
                      style={{
                        background: "var(--bg-base)",
                        borderColor: "var(--glass-border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setGlassSaveMethod("background");
                        }}
                        className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                          glassSaveMethod === "background"
                            ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <ShieldCheck size={12} strokeWidth={1.5} />
                        <span>
                          {isIndonesian
                            ? "Hening Latar Belakang"
                            : "Background Silent"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setGlassSaveMethod("url_scheme");
                        }}
                        className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                          glassSaveMethod === "url_scheme"
                            ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Zap size={12} strokeWidth={1.5} />
                        <span>
                          {isIndonesian ? "Skema URL" : "URL Scheme"}
                        </span>
                      </button>
                    </div>

                    {/* METHOD 1: BACKGROUND API (RECOMMENDED) */}
                    {glassSaveMethod === "background" && (
                      <div className="space-y-2.5 text-[11px]">
                        <p className="text-[var(--text-secondary)] pl-7 leading-relaxed">
                          {isIndonesian
                            ? "Tambahkan tindakan 'Dapatkan Isi URL'. Metode ini bekerja hening di latar belakang tanpa membuka aplikasi sama sekali, lalu diikuti tindakan notifikasi di bawah."
                            : "Add action 'Get Contents of URL'. This works silently in the background without opening the app at all, followed by the notification action below."}
                        </p>

                        <div className="pl-7 space-y-2">
                          <div
                            className="p-2.5 rounded-xl border space-y-1.5"
                            style={{
                              background: "var(--bg-base)",
                              borderColor: "var(--glass-border)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                                {isIndonesian ? "Alamat URL API:" : "API Endpoint URL:"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    rpcEndpoint,
                                    isIndonesian ? "URL API" : "API URL",
                                  )
                                }
                                className="py-0.5 px-2 rounded-md border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[10px] font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {copiedKey ===
                                (isIndonesian ? "URL API" : "API URL") ? (
                                  <Check
                                    size={10}
                                    className="text-[var(--text-primary)]"
                                  />
                                ) : (
                                  <Copy size={10} />
                                )}
                                <span>{isIndonesian ? "Salin" : "Copy"}</span>
                              </button>
                            </div>
                            <code className="block text-[10px] font-mono break-all text-[var(--text-primary)]">
                              {rpcEndpoint}
                            </code>
                          </div>

                          <div
                            className="p-2.5 rounded-xl border space-y-1.5"
                            style={{
                              background: "var(--bg-base)",
                              borderColor: "var(--glass-border)",
                            }}
                          >
                            <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block">
                              {isIndonesian
                                ? "Konfigurasi Tindakan di Pintasan:"
                                : "Shortcut Action Configuration:"}
                            </span>
                            <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                              <div>
                                • {isIndonesian ? "Metode:" : "Method:"}{" "}
                                <span className="font-semibold text-[var(--text-primary)]">
                                  POST
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  • {isIndonesian ? "Tajuk (Headers):" : "Headers:"}{" "}
                                  <span className="font-mono text-[10px] text-[var(--text-primary)]">
                                    apikey
                                  </span>{" "}
                                  &{" "}
                                  <span className="font-mono text-[10px] text-[var(--text-primary)]">
                                    Content-Type: application/json
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(
                                      anonKey,
                                      isIndonesian ? "Kunci Anon API" : "Anon API Key",
                                    )
                                  }
                                  className="py-0.5 px-2 rounded-md border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[10px] font-semibold text-[var(--text-primary)] shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  {copiedKey ===
                                  (isIndonesian
                                    ? "Kunci Anon API"
                                    : "Anon API Key") ? (
                                    <Check
                                      size={10}
                                      className="text-[var(--text-primary)]"
                                    />
                                  ) : (
                                    <Copy size={10} />
                                  )}
                                  <span>{isIndonesian ? "Salin Kunci" : "Copy Key"}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div
                            className="p-2.5 rounded-xl border space-y-1.5"
                            style={{
                              background: "var(--bg-base)",
                              borderColor: "var(--glass-border)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                                {isIndonesian
                                  ? "Badan Permintaan (JSON):"
                                  : "Request Body (JSON):"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    JSON.stringify(
                                      {
                                        p_user_token: userToken || "TOKEN_PENGGUNA",
                                        p_amount: 0,
                                        p_category_name: "Kategori",
                                        p_wallet_name: "Rekening",
                                        p_note: "Catatan",
                                        p_occurred_on: "Tanggal",
                                      },
                                      null,
                                      2,
                                    ),
                                    isIndonesian
                                      ? "Format JSON"
                                      : "JSON Format",
                                  )
                                }
                                className="py-0.5 px-2 rounded-md border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[10px] font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {copiedKey ===
                                (isIndonesian
                                  ? "Format JSON"
                                  : "JSON Format") ? (
                                  <Check
                                    size={10}
                                    className="text-[var(--text-primary)]"
                                  />
                                ) : (
                                  <Copy size={10} />
                                )}
                                <span>{isIndonesian ? "Salin JSON" : "Copy JSON"}</span>
                              </button>
                            </div>
                            <pre className="p-2 rounded-lg text-[10px] font-mono overflow-x-auto text-[var(--text-secondary)] bg-[var(--glass-fill)] border border-[var(--glass-border)]">
{`{
  "p_user_token": "${userToken ? userToken.slice(0, 8) + "..." : "TOKEN_PENGGUNA"}",
  "p_amount": [Nominal],
  "p_category_name": "[Kategori]",
  "p_wallet_name": "[Rekening]",
  "p_note": "[Catatan]",
  "p_occurred_on": "[Tanggal]"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* METHOD 2: URL SCHEME */}
                    {glassSaveMethod === "url_scheme" && (
                      <div className="space-y-2.5 text-[11px]">
                        <p className="text-[var(--text-secondary)] pl-7 leading-relaxed">
                          {isIndonesian
                            ? "Tambahkan tindakan 'Buka URL' lalu masukkan templat skema berikut dengan menyematkan variabel dari papan ketik iPhone (Catatan: Tindakan ini membuka Trouvaille ke layar depan saat menyimpan):"
                            : "Add action 'Open URLs' and paste the URL scheme template below, inserting Magic Variables from your keyboard (Note: This action brings Trouvaille to the foreground upon saving):"}
                        </p>

                        <div className="pl-7 space-y-1.5">
                          <div
                            className="p-2.5 rounded-xl border text-[11px] space-y-1"
                            style={{
                              background: "var(--bg-base)",
                              borderColor: "var(--glass-border)",
                            }}
                          >
                            <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] block">
                              {isIndonesian
                                ? "Panduan Variabel Papan Ketik (Bukan Ketik Manual):"
                                : "Keyboard Variable Picker Mapping:"}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                              <div>
                                • {isIndonesian ? "nominal=" : "amount="} ➔{" "}
                                <span className="font-semibold px-1 rounded bg-black/10 dark:bg-white/15 text-[var(--text-primary)]">
                                  {isIndonesian ? "Nominal" : "Amount"}
                                </span>
                              </div>
                              <div>
                                • {isIndonesian ? "&kategori=" : "&category="} ➔{" "}
                                <span className="font-semibold px-1 rounded bg-black/10 dark:bg-white/15 text-[var(--text-primary)]">
                                  {isIndonesian ? "Kategori" : "Category"}
                                </span>
                              </div>
                              <div>
                                • {isIndonesian ? "&rekening=" : "&wallet="} ➔{" "}
                                <span className="font-semibold px-1 rounded bg-black/10 dark:bg-white/15 text-[var(--text-primary)]">
                                  {isIndonesian ? "Rekening" : "Wallet"}
                                </span>
                              </div>
                              <div>
                                • {isIndonesian ? "&tanggal=" : "&date="} ➔{" "}
                                <span className="font-semibold px-1 rounded bg-black/10 dark:bg-white/15 text-[var(--text-primary)]">
                                  {isIndonesian ? "Tanggal" : "Date"}
                                </span>
                              </div>
                              <div className="sm:col-span-2">
                                • {isIndonesian ? "&catatan=" : "&note="} ➔{" "}
                                <span className="font-semibold px-1 rounded bg-black/10 dark:bg-white/15 text-[var(--text-primary)]">
                                  {isIndonesian
                                    ? "Teks Terenkode"
                                    : "URL Encoded Text"}
                                </span>
                              </div>
                              <div className="sm:col-span-2">
                                • &autosave=true ➔{" "}
                                <span className="text-[var(--text-secondary)]">
                                  {isIndonesian
                                    ? "Teks biasa (simpan langsung)"
                                    : "Plain text (instant auto-save)"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-1.5 p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[10px] text-[var(--text-secondary)] leading-relaxed">
                            <AlertCircle
                              size={13}
                              className="shrink-0 mt-0.5 text-[var(--text-primary)]"
                              strokeWidth={1.75}
                            />
                            <span>
                              {isIndonesian
                                ? "PERHATIAN: Jangan ketik tanda kurung siku '[ ]' secara manual! Tanda kurung siku menunjukkan variabel yang harus dipilih dari menu bilah papan ketik iPhone."
                                : "NOTE: Do not type square brackets '[ ]' manually! They represent dynamic Magic Variables to select from the iOS keyboard picker."}
                            </span>
                          </div>

                          <code
                            className="block p-2 rounded-xl text-[10px] font-mono border break-all"
                            style={{
                              background: "var(--bg-base)",
                              borderColor: "var(--glass-border)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {glassSchemeTemplate}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                glassSchemeTemplate,
                                isIndonesian
                                  ? "Templat Skema URL"
                                  : "Scheme Template",
                              )
                            }
                            className="w-full py-1.5 px-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {copiedKey ===
                            (isIndonesian
                              ? "Templat Skema URL"
                              : "Scheme Template") ? (
                              <Check
                                size={12}
                                className="text-[var(--text-primary)]"
                              />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>
                              {isIndonesian
                                ? "Salin Templat URL"
                                : "Copy Scheme Template"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Test Button */}
                    <div className="pl-7 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const testCat =
                            categories.find((c) => c.type !== "income")?.name ||
                            categories[0]?.name ||
                            (isIndonesian ? "Makanan" : "Food");
                          const testWal =
                            wallets[0]?.name ||
                            (isIndonesian ? "Dompet Utama" : "Default Wallet");
                          const testNote = isIndonesian
                            ? "Uji Coba Pintasan"
                            : "Shortcut Test";
                          handleTestDeepLink(
                            `trouvaille://add?${
                              isIndonesian ? "nominal" : "amount"
                            }=25000&${
                              isIndonesian ? "kategori" : "category"
                            }=${encodeURIComponent(testCat)}&${
                              isIndonesian ? "rekening" : "wallet"
                            }=${encodeURIComponent(testWal)}&${
                              isIndonesian ? "catatan" : "note"
                            }=${encodeURIComponent(testNote)}&autosave=true`,
                          );
                        }}
                        className="w-full py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Zap size={11} />
                        <span>
                          {isIndonesian
                            ? "Uji Simpan Otomatis (Rp 25.000)"
                            : "Test Auto-Save (25k)"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Action 8: Show Notification */}
                  <div
                    className="p-3 rounded-2xl border space-y-1.5"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)]">
                          8
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {isIndonesian
                            ? "Tampilkan Pemberitahuan"
                            : "Show Notification"}
                        </span>
                      </div>
                      <ShieldCheck
                        size={13}
                        className="text-[var(--text-tertiary)]"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan tindakan 'Tampilkan Pemberitahuan'. Judul: 'Trouvaille', Pesan: \"Transaksi Dicatat: Rp [Nominal] • [Kategori] • [Rekening]\". Jika Anda menggunakan metode Hening Latar Belakang (Dapatkan Isi URL), banner notifikasi Apple muncul seketika dan aplikasi Trouvaille tidak akan pernah terbuka kecuali banner tersebut ditekan."
                        : "Add action 'Show Notification'. Title: 'Trouvaille', Body: \"Transaction Recorded: Rp [Amount] • [Category] • [Wallet]\". When using the Background Silent method (Get Contents of URL), the Apple notification banner appears instantly and Trouvaille will never open unless you tap the banner."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {/* HOW TO ASSIGN TO IPHONE BACK TAP */}
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={14}
                  className="text-[var(--text-primary)]"
                />
                <h4
                  className="text-[13px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian
                    ? "Cara Menghubungkan ke Ketuk Belakang iPhone"
                    : "Assign to iPhone Back Tap"}
                </h4>
              </div>

              <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    1
                  </span>
                  <span>
                    {isIndonesian
                      ? "Buka aplikasi Pengaturan di iPhone Anda."
                      : "Open the Settings app on your iPhone."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    2
                  </span>
                  <span>
                    {isIndonesian
                      ? "Masuk ke menu Aksesibilitas > Sentuh."
                      : "Navigate to Accessibility > Touch."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    3
                  </span>
                  <span>
                    {isIndonesian
                      ? "Gulir ke bawah dan ketuk opsi Ketuk Bagian Belakang."
                      : "Scroll to the bottom and tap Back Tap."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    4
                  </span>
                  <span>
                    {isIndonesian
                      ? "Pilih Ketuk Dua Kali atau Ketuk Tiga Kali."
                      : "Select Double Tap or Triple Tap."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    5
                  </span>
                  <span>
                    {isIndonesian
                      ? "Gulir ke bawah ke bagian Pintasan, lalu pilih pintasan yang telah Anda buat ('Catat Trouvaille')."
                      : "Scroll down to the Shortcuts section and select your created shortcut ('Trouvaille Quick Log')."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: ACTION BUTTON */}
        {activeTab === "action_button" && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center gap-2">
                <Smartphone size={14} className="text-[var(--text-primary)]" />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {isIndonesian
                    ? "Konfigurasi Tombol Aksi (iPhone 15 / 16 Pro)"
                    : "Action Button Setup (iPhone 15 / 16 Pro)"}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {isIndonesian
                  ? "Tombol Aksi di sisi kiri iPhone dapat dihubungkan ke Pintasan Trouvaille untuk mencatat pengeluaran dalam satu kali pencetan fisik dari layar mana pun."
                  : "The Action Button on the left side of your iPhone can be linked to a Trouvaille shortcut to log transactions in a single physical press from anywhere."}
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-3 pt-1">
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
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {isIndonesian
                      ? "Buka Pengaturan Tombol Tindakan"
                      : "Open Action Button Settings"}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {isIndonesian
                      ? "Buka aplikasi Pengaturan di iPhone > Tombol Tindakan. Geser opsi hingga menemukan 'Pintasan'."
                      : "Go to Settings on iPhone > Action Button. Swipe through the options to find 'Shortcut'."}
                  </p>
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
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {isIndonesian
                      ? "Pilih Pintasan Trouvaille"
                      : "Assign Trouvaille Shortcut"}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {isIndonesian
                      ? "Ketuk tombol pemilih pintasan di bawahnya, lalu pilih pintasan Trouvaille yang telah Anda buat (misalnya 'Catat Trouvaille' atau 'Dikte Suara Cepat')."
                      : "Tap the shortcut selector button below and choose your Trouvaille shortcut (e.g. 'Trouvaille Quick Log' or 'Voice Quick-Add')."}
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
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {isIndonesian
                      ? "Tekan & Tahan Kapan Saja"
                      : "Press & Hold Anytime"}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {isIndonesian
                      ? "Cukup tekan dan tahan Tombol Tindakan saat berada di kasir, bayar QRIS, atau selesai makan. Jendela pencatatan langsung muncul seketika!"
                      : "Simply press and hold the Action Button at checkout, QRIS payment, or after dining. The logging modal appears instantly!"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Test Links */}
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
                <span>
                  {isIndonesian ? "Uji Aksi Suara" : "Test Voice Action"}
                </span>
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
                <span>
                  {isIndonesian ? "Uji Aksi Pemindai" : "Test Scan Action"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: WAYS TO ADD TRANSACTIONS */}
        {activeTab === "ways_to_add" && (
          <div className="space-y-3">
            {[
              {
                num: "1",
                icon: Mic,
                title: isIndonesian
                  ? "Pencatatan Suara Cepat (Siri)"
                  : "Voice Quick-Add (Siri)",
                desc: isIndonesian
                  ? "Bicara santai tanpa mengetik, contoh: 'Kopi 35 ribu pakai BCA'."
                  : "Speak naturally without typing, e.g., 'Coffee 35k with BCA'.",
                scheme: "trouvaille://voice",
                steps: isIndonesian
                  ? [
                      "Buka aplikasi Pintasan di iPhone, lalu ketuk tanda '+' untuk membuat pintasan baru.",
                      "Cari tindakan 'Buka URL', lalu masukkan skema 'trouvaille://voice'.",
                      "Beri nama pintasan 'Catat Pengeluaran' atau 'Suara Trouvaille'.",
                      "Kini cukup ucapkan 'Hai Siri, Catat Pengeluaran' — mikrofon langsung aktif mendengar!",
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
                title: isIndonesian
                  ? "Pintasan Apple & Layar Terkunci"
                  : "Apple Shortcuts & Lock Screen",
                desc: isIndonesian
                  ? "Buka jendela pencatatan instan dari Layar Terkunci atau Pusat Kontrol."
                  : "Trigger the instant logging modal directly from Lock Screen or Control Center.",
                scheme: "trouvaille://add",
                steps: isIndonesian
                  ? [
                      "Buat pintasan baru dengan tindakan 'Buka URL', lalu masukkan 'trouvaille://add'.",
                      "Tambahkan widget Pintasan ke Layar Terkunci atau Layar Utama iPhone Anda.",
                      "Ketuk widget satu kali kapan pun ingin membuka modal pencatatan tanpa navigasi berbelit.",
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
                title: isIndonesian
                  ? "Pemindai Struk AI (Struk Fisik)"
                  : "AI Receipt Scanner (Paper Receipts)",
                desc: isIndonesian
                  ? "Foto struk kasir atau struk QRIS; AI membedah rincian & nominal secara otomatis."
                  : "Snap physical receipts or QRIS slips; AI extracts items and amounts automatically.",
                scheme: "trouvaille://scan",
                steps: isIndonesian
                  ? [
                      "Buat pintasan baru dengan tindakan 'Buka URL' dan skema 'trouvaille://scan'.",
                      "Pasang pintasan ini di menu Ketuk Bagian Belakang atau Tombol Tindakan.",
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
                title: isIndonesian
                  ? "Tangkapan Layar & Bukti Transfer"
                  : "Screenshot & Transfer Proof",
                desc: isIndonesian
                  ? "Ekstrak bukti pembayaran m-banking langsung dari galeri foto iPhone."
                  : "Extract m-banking transaction confirmations directly from photo library.",
                scheme: "trouvaille://scan",
                steps: isIndonesian
                  ? [
                      "Setelah transfer di BCA, Mandiri, atau GoPay, simpan tangkapan layar bukti pembayaran.",
                      "Gunakan skema 'trouvaille://scan' untuk langsung membuka pemindai tangkapan layar.",
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
                title: isIndonesian
                  ? "Lembar Berbagi iOS (Teks Langsung)"
                  : "iOS Share Sheet (Direct Text)",
                desc: isIndonesian
                  ? "Bagikan teks tagihan dari WhatsApp atau SMS perbankan ke Trouvaille."
                  : "Share transaction text from WhatsApp or SMS banking directly to Trouvaille.",
                scheme: "trouvaille://add?text=[Shortcut Input]&autosave=true",
                steps: isIndonesian
                  ? [
                      "Di rincian pintasan, aktifkan opsi 'Tampilkan di Lembar Berbagi'.",
                      "Konfigurasikan tindakan URL: 'trouvaille://add?text=[Shortcut Input]&autosave=true'.",
                      "Saat menerima pesan tagihan atau mutasi, pilih Bagikan > Trouvaille untuk penguraian instan & simpan otomatis.",
                    ]
                  : [
                      "In Shortcut details, enable 'Show in Share Sheet'.",
                      "Configure the URL action as: 'trouvaille://add?text=[Shortcut Input]&autosave=true'.",
                      "When receiving an SMS or message, tap Share > Trouvaille for instant auto-parse & auto-save.",
                    ],
              },
              {
                num: "6",
                icon: PlusCircle,
                title: isIndonesian
                  ? "Papan Angka Ergonomis & Kalkulator"
                  : "Ergonomic Numpad & Math Calc",
                desc: isIndonesian
                  ? "Papan angka monokrom dengan tombol 000 dan perhitungan matematika langsung di kolom."
                  : "Monochrome keypad with triple-zero 000 and in-line mathematical calculation.",
                scheme: "trouvaille://add",
                steps: isIndonesian
                  ? [
                      "Buka Trouvaille di Safari iOS, lalu pilih 'Tambah ke Layar Utama' untuk mode aplikasi layar penuh.",
                      "Gunakan tombol '+' di bilah navigasi bawah atau buka melalui skema 'trouvaille://add'.",
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
                      {isIndonesian
                        ? "Panduan Langkah demi Langkah"
                        : "Step-by-Step Setup Guide"}
                    </p>
                    {item.steps.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]"
                      >
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
                            <Check
                              size={12}
                              className="text-[var(--text-primary)]"
                            />
                            <span>
                              {isIndonesian
                                ? "Skema Disalin!"
                                : "Scheme Copied!"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>
                              {isIndonesian
                                ? "Salin Skema URL"
                                : "Copy URL Scheme"}
                            </span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestDeepLink(item.scheme)}
                        className="py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-95 text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title={
                          isIndonesian
                            ? "Uji coba buka deep link langsung"
                            : "Test trigger deep link"
                        }
                      >
                        <Zap size={11} />
                        <span>{isIndonesian ? "Uji Tautan" : "Test Link"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 4: APPLE PAY AUTOMATION */}
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
                {isIndonesian
                  ? "Otomatisasi Ketukan Apple Pay"
                  : "Apple Pay Tap Automation"}
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
                      {isIndonesian
                        ? "Buka Pintasan > Otomatisasi"
                        : "Open Shortcuts > Automation"}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isIndonesian
                        ? "Ketuk Otomatisasi Baru (+), lalu pilih 'Transaksi' atau 'Saat Saya Mengetuk Kartu Dompet'."
                        : "Tap New Automation, then choose Transaction or When I Tap a Wallet Card."}
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
                      {isIndonesian
                        ? "Atur Jalankan Segera"
                        : "Set to Run Immediately"}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isIndonesian
                        ? "Pilih kartu utama Anda, lalu aktifkan 'Jalankan Segera' agar otomatis diproses di latar belakang tanpa pertanyaan konfirmasi."
                        : "Select your primary cards, then select Run Immediately so it executes automatically in the background."}
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
                      {isIndonesian
                        ? "Buka Skema URL Trouvaille"
                        : "Open Trouvaille URL"}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isIndonesian ? (
                        <>
                          Tambahkan tindakan <em>Buka URL</em> dengan alamat{" "}
                          <code>
                            trouvaille://add?text=Shortcut
                            Input&amp;autosave=true
                          </code>
                          .
                        </>
                      ) : (
                        <>
                          Add the action <em>Open URL</em> with{" "}
                          <code>
                            trouvaille://add?text=Shortcut
                            Input&amp;autosave=true
                          </code>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  "trouvaille://add?text=[Shortcut Input]&autosave=true",
                  isIndonesian ? "Skema Otomatisasi URL" : "URL Template",
                )
              }
              className="w-full py-3 px-4 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {copiedKey ===
              (isIndonesian ? "Skema Otomatisasi URL" : "URL Template") ? (
                <Check size={14} className="text-[var(--text-primary)]" />
              ) : (
                <Copy size={14} />
              )}
              <span>
                {isIndonesian
                  ? "Salin Skema Otomatisasi URL"
                  : "Copy Automation URL Scheme"}
              </span>
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
          {isIndonesian ? "Selesai" : "Done"}
        </button>
      </div>
    </BottomSheet>
  );
}
