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
  Sparkles,
  Volume2,
  Calendar,
  ListFilter,
  CreditCard,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";
import { useWallets } from "../../hooks/useWallets";
import { triggerHaptic, triggerSuccessHaptic } from "../../lib/haptics";

interface AppleShortcutsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "back_tap" | "ways_to_add" | "automation";
type BackTapSubMode = "glass_dialog" | "voice_speak" | "app_intent";

export function AppleShortcutsGuideModal({
  isOpen,
  onClose,
}: AppleShortcutsGuideModalProps) {
  const { showToast } = useToast();
  const { isIndonesian } = useLanguage();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();

  const [activeTab, setActiveTab] = useState<TabType>("back_tap");
  const [backTapMode, setBackTapMode] = useState<BackTapSubMode>("glass_dialog");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    triggerSuccessHaptic();
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(`${label} ${isIndonesian ? "berhasil disalin" : "copied to clipboard"}`, "add", () => {});
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
    copyToClipboard(list || "Makanan\nTransportasi\nBelanja\nHiburan\nTagihan", isIndonesian ? "Daftar Kategori" : "Category List");
  };

  const copyWalletList = () => {
    const list = wallets.map((w) => w.name).join("\n");
    copyToClipboard(list || "BCA\nMandiri\nGoPay\nTunai", isIndonesian ? "Daftar Akun / Dompet" : "Wallet List");
  };

  const glassSchemeTemplate =
    "trouvaille://add?amount=[Provided Input 1]&category=[Chosen Category]&wallet=[Chosen Wallet]&date=[Provided Date]&note=[Provided Note]";
  const voiceSchemeTemplate = "trouvaille://add?text=[Dictated Text]";

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-14 space-y-6 max-w-lg mx-auto">
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
            {isIndonesian ? "Back Tap & iOS Shortcuts" : "Back Tap & iOS Shortcuts"}
          </h3>
          <p
            className="text-[13px] leading-relaxed font-normal"
            style={{ color: "var(--text-secondary)" }}
          >
            {isIndonesian
              ? "Catat transaksi instan dengan mengetuk 2x belakang iPhone (Back Tap), dialog frosted glass Dynamic Island, dikte suara, atau Action Button."
              : "Instantly record expenses by double-tapping the back of your iPhone, Dynamic Island frosted glass dialogs, voice dictation, or Action Button."}
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
              setActiveTab("back_tap");
            }}
            className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === "back_tap"
                ? "bg-black/[0.08] text-black dark:bg-white/[0.1] dark:text-white shadow-sm border border-black/10 dark:border-white/15"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isIndonesian ? "Back Tap Glass" : "Back Tap Glass"}
          </button>
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
            {isIndonesian ? "Semua Skema" : "All Schemes"}
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

        {/* TAB 1: BACK TAP GLASS DIALOG TUTORIAL & VOICE */}
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
                  setBackTapMode("glass_dialog");
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                  backTapMode === "glass_dialog"
                    ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isIndonesian ? "Dialog Glass (5 Langkah)" : "Glass Dialog (5 Steps)"}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setBackTapMode("voice_speak");
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  backTapMode === "voice_speak"
                    ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Volume2 size={12} strokeWidth={1.5} />
                <span>{isIndonesian ? "Versi Suara" : "Voice / Speak"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setBackTapMode("app_intent");
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                  backTapMode === "app_intent"
                    ? "bg-black/[0.08] text-black dark:bg-white/[0.12] dark:text-white shadow-xs border border-black/10 dark:border-white/20"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Native Swift
              </button>
            </div>

            {/* SUB-MODE 1: 5-STEP GLASS DIALOG */}
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
                    <Sparkles size={14} className="text-[var(--text-primary)]" />
                    <h4
                      className="text-[13px] font-semibold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian
                        ? "Cara Buat Shortcut Dialog Glass (Sesuai Video Showcase)"
                        : "How to Build the Glass Dialog Shortcut (Showcase Style)"}
                    </h4>
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian
                      ? "Buka aplikasi Shortcuts (Pintasan) di iPhone, ketuk tanda '+' untuk membuat Shortcut baru bernama 'Catat Trouvaille', lalu susun 6 aksi berikut:"
                      : "Open Apple Shortcuts app on your iPhone, tap '+' to create a new shortcut named 'Trouvaille Quick Log', then arrange these 6 actions:"}
                  </p>
                </div>

                {/* 5 Actions Cards */}
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
                          Ask for Input (Nominal)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-fill)] text-[var(--text-tertiary)]">
                        Number
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7">
                      {isIndonesian
                        ? "Pilih aksi 'Ask for Input', ubah tipe jadi 'Number' dengan teks prompt: \"How much was it?\" atau \"Berapa nominalnya?\""
                        : "Add action 'Ask for Input', set input type to 'Number' with prompt text: \"How much was it?\""}
                    </p>
                  </div>

                  {/* Action 2: Choose from List - Kategori */}
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
                          Choose from List (Kategori)
                        </span>
                      </div>
                      <ListFilter size={13} className="text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7">
                      {isIndonesian
                        ? "Tambahkan aksi 'List' lalu isi daftar kategori pengeluaran Anda. Sambungkan dengan aksi 'Choose from List' dengan prompt: \"What kind of expense is it?\""
                        : "Add a 'List' action filled with your categories. Follow with 'Choose from List' action with prompt: \"What kind of expense is it?\""}
                    </p>
                    <div className="pl-7">
                      <button
                        type="button"
                        onClick={copyCategoryList}
                        className="py-1 px-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedKey === (isIndonesian ? "Daftar Kategori" : "Category List") ? (
                          <Check size={11} className="text-emerald-500" />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{isIndonesian ? "Salin Daftar Kategori Saya" : "Copy My Categories"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Action 3: Choose from List - Akun / Dompet */}
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
                          Choose from List (Akun / Dompet)
                        </span>
                      </div>
                      <CreditCard size={13} className="text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7">
                      {isIndonesian
                        ? "Tambahkan aksi 'List' berisi nama dompet/rekening Anda (misal BCA, GoPay, Cash). Sambungkan dengan 'Choose from List' dengan prompt: \"Which account or wallet?\""
                        : "Add a 'List' action containing your accounts (e.g. BCA, GoPay, Cash). Follow with 'Choose from List' with prompt: \"Which account or wallet?\""}
                    </p>
                    <div className="pl-7">
                      <button
                        type="button"
                        onClick={copyWalletList}
                        className="py-1 px-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedKey === (isIndonesian ? "Daftar Akun / Dompet" : "Wallet List") ? (
                          <Check size={11} className="text-emerald-500" />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{isIndonesian ? "Salin Daftar Akun Saya" : "Copy My Wallets"}</span>
                      </button>
                    </div>
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
                          Ask for Input (Tanggal & Waktu)
                        </span>
                      </div>
                      <Calendar size={13} className="text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7">
                      {isIndonesian
                        ? "Tambahkan aksi 'Ask for Input', pilih tipe 'Date and Time' dengan prompt: \"What day was it?\" — ini akan menampilkan kalender glass native iOS."
                        : "Add 'Ask for Input', select type 'Date and Time' with prompt: \"What day was it?\" — this displays the native iOS frosted calendar sheet."}
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
                          Ask for Input (Catatan / Note)
                        </span>
                      </div>
                      <FileText size={13} className="text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7">
                      {isIndonesian
                        ? "Tambahkan aksi 'Ask for Input', pilih tipe 'Text' dengan prompt: \"What did you buy?\" untuk mencatat nama barang/merchant."
                        : "Add 'Ask for Input', select type 'Text' with prompt: \"What did you buy?\" to record merchant or description."}
                    </p>
                  </div>

                  {/* Action 6: Open URL */}
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
                          6
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          Open URLs (Kirim ke Trouvaille)
                        </span>
                      </div>
                      <Zap size={13} className="text-amber-500" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan aksi 'Open URLs' lalu masukkan URL Scheme di bawah ini dengan menyematkan variabel dari aksi 1 hingga 5:"
                        : "Add action 'Open URLs' and paste the URL Scheme below, inserting variables from steps 1 to 5:"}
                    </p>
                    <div className="pl-7 space-y-2">
                      <code
                        className="block p-2 rounded-xl text-[10px] font-mono border break-all"
                        style={{
                          background: "var(--bg-base)",
                          borderColor: "var(--glass-border)",
                          color: "var(--accent)",
                        }}
                      >
                        {glassSchemeTemplate}
                      </code>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(glassSchemeTemplate, "Glass Scheme Template")}
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedKey === "Glass Scheme Template" ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{isIndonesian ? "Salin Template URL" : "Copy Scheme Template"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTestDeepLink(
                              `trouvaille://add?amount=50000&category=${encodeURIComponent(
                                categories[0]?.name || "Makanan"
                              )}&wallet=${encodeURIComponent(
                                wallets[0]?.name || "BCA"
                              )}&note=Test%20Back%20Tap`
                            )
                          }
                          className="py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Zap size={11} />
                          <span>{isIndonesian ? "Tes Link" : "Test Link"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-MODE 2: VOICE / SPEAK BACK TAP */}
            {backTapMode === "voice_speak" && (
              <div className="space-y-3">
                <div
                  className="p-3.5 rounded-2xl border space-y-2"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Mic size={14} className="text-[var(--text-primary)]" />
                    <h4
                      className="text-[13px] font-semibold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Versi Dikte Suara (Speak Quick-Add)" : "Voice Dictation Quick-Add"}
                    </h4>
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian
                      ? "Cukup ketuk 2x belakang iPhone lalu langsung ucapkan transaksi Anda tanpa mengetik. AI Trouvaille membedah nominal, dompet, dan kategori secara otomatis!"
                      : "Double tap your iPhone back and speak your expense naturally without typing. Trouvaille AI parses amount, wallet, and category automatically!"}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Step 1: Dictate Text */}
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
                          Aksi 'Dictate Text' (Diktekan Teks)
                        </span>
                      </div>
                      <Mic size={13} className="text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Di Shortcuts iPhone, tambahkan aksi 'Dictate Text' (Diktekan Teks). Atur bahasa ke Bahasa Indonesia atau English. Mic Siri akan mendengar saat bodi iPhone diketuk."
                        : "In Apple Shortcuts, add 'Dictate Text' action. Set language to English or Indonesian. Siri microphone listens immediately upon back-tap."}
                    </p>
                  </div>

                  {/* Step 2: Open URLs */}
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
                          2
                        </span>
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          Aksi 'Open URLs' (Kirim ke AI Parser)
                        </span>
                      </div>
                      <Zap size={13} className="text-amber-500" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                      {isIndonesian
                        ? "Tambahkan aksi 'Open URLs' dengan skema berikut dan masukkan variabel 'Dictated Text':"
                        : "Add 'Open URLs' action with the following scheme using the 'Dictated Text' variable:"}
                    </p>
                    <div className="pl-7 space-y-2">
                      <code
                        className="block p-2 rounded-xl text-[10px] font-mono border break-all"
                        style={{
                          background: "var(--bg-base)",
                          borderColor: "var(--glass-border)",
                          color: "var(--accent)",
                        }}
                      >
                        {voiceSchemeTemplate}
                      </code>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(voiceSchemeTemplate, "Voice Scheme Template")}
                          className="flex-1 py-1.5 px-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-fill)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedKey === "Voice Scheme Template" ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{isIndonesian ? "Salin Skema Suara" : "Copy Voice Scheme"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestDeepLink("trouvaille://add?text=Kopi%20susu%2025rb%20pakai%20BCA")}
                          className="py-1.5 px-3 rounded-xl border border-[var(--glass-border)] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Zap size={11} />
                          <span>{isIndonesian ? "Tes Contoh" : "Test Sample"}</span>
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
                      {isIndonesian ? "Contoh Kalimat yang Dikenali:" : "Supported Voice Phrases:"}
                    </p>
                    <ul className="space-y-1 text-[var(--text-secondary)] pl-2">
                      <li>• "Kopi tuku 25 ribu pakai BCA"</li>
                      <li>• "Makan siang 50000 bayar GoPay"</li>
                      <li>• "Beli bensin 100rb Cash"</li>
                      <li>• "Dinner with friends 150k"</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-MODE 3: NATIVE SWIFT APP INTENT */}
            {backTapMode === "app_intent" && (
              <div className="space-y-3">
                <div
                  className="p-3.5 rounded-2xl border space-y-2"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <h4
                      className="text-[13px] font-semibold tracking-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {isIndonesian ? "Native iOS 16+ App Intent & Shortcuts Provider" : "Native iOS 16+ App Intent & Shortcuts Provider"}
                    </h4>
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {isIndonesian
                      ? "Untuk build native iOS (Xcode/TestFlight), Trouvaille telah dilengkapi modul QuickLogIntent.swift yang otomatis mendaftarkan App Shortcuts tanpa perlu perakitan manual."
                      : "For native iOS builds (Xcode/TestFlight), Trouvaille includes QuickLogIntent.swift which automatically registers App Shortcuts without manual assembly."}
                  </p>
                </div>

                <div
                  className="p-3.5 rounded-2xl border space-y-2 text-[11px]"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--glass-border)",
                  }}
                >
                  <p className="font-semibold text-[var(--text-primary)]">
                    {isIndonesian ? "Fitur Native Intent:" : "Native Intent Features:"}
                  </p>
                  <ul className="space-y-1.5 text-[var(--text-secondary)]">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        <strong>openAppWhenRun = false:</strong> {isIndonesian ? "Berjalan 100% di latar belakang daemon iOS tanpa membuka jendela aplikasi penuh." : "Executes 100% in background iOS daemon without launching the full web window."}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        <strong>App Group Storage:</strong> {isIndonesian ? "Tersimpan aman di shared UserDefaults untuk disinkronkan langsung ke database saat Trouvaille aktif." : "Securely buffered in shared UserDefaults and synced directly upon app resume."}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        <strong>Auto Siri Registration:</strong> {isIndonesian ? "Langsung dapat dipanggil via 'Hey Siri, Quick log in Trouvaille'." : "Can be invoked immediately via 'Hey Siri, Quick log in Trouvaille'."}
                      </span>
                    </li>
                  </ul>
                </div>
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
                <SlidersHorizontal size={14} className="text-[var(--text-primary)]" />
                <h4
                  className="text-[13px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isIndonesian ? "Cara Pasang ke Back Tap iPhone" : "Assign to iPhone Back Tap"}
                </h4>
              </div>

              <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    1
                  </span>
                  <span>
                    {isIndonesian
                      ? "Buka aplikasi Pengaturan (Settings) di iPhone Anda."
                      : "Open the Settings app on your iPhone."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    2
                  </span>
                  <span>
                    {isIndonesian
                      ? "Masuk ke menu Aksesibilitas (Accessibility) > Sentuh (Touch)."
                      : "Navigate to Accessibility > Touch."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    3
                  </span>
                  <span>
                    {isIndonesian
                      ? "Gulir ke bawah dan ketuk Ketuk Bagian Belakang (Back Tap)."
                      : "Scroll to the bottom and tap Back Tap."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    4
                  </span>
                  <span>
                    {isIndonesian
                      ? "Pilih Ketuk Dua Kali (Double Tap) atau Ketuk Tiga Kali (Triple Tap)."
                      : "Select Double Tap or Triple Tap."}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border border-[var(--glass-border)] bg-[var(--bg-base)] text-[var(--text-primary)] mt-0.5">
                    5
                  </span>
                  <span>
                    {isIndonesian
                      ? "Gulir ke bawah ke bagian Pintasan (Shortcuts), lalu pilih Shortcut yang telah Anda buat ('Catat Trouvaille')."
                      : "Scroll down to the Shortcuts section and select your created shortcut ('Trouvaille Quick Log')."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WAYS TO ADD TRANSACTIONS */}
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
                      {isIndonesian
                        ? "Ketuk Otomatisasi Baru (New Automation), lalu pilih Transaksi (Transaction) atau Kartu Dompet."
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
                      Set to Run Immediately
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {isIndonesian
                        ? "Pilih kartu Anda, lalu aktifkan 'Jalankan Segera' (Run Immediately) agar otomatis berjalan tanpa konfirmasi."
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
              {copiedKey === "URL Template" ? (
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
              <span>{isIndonesian ? "Salin Skema Otomatisasi URL" : "Copy Automation URL Scheme"}</span>
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
