import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Mic,
  ScanFace,
  Sparkles,
  Shield,
  Lock,
  Check,
  Layers,
  User,
  Activity,
} from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import type { ShowcaseSlide } from "./loginAuthHelpers";

export interface DynamicShowcaseCapsuleProps {
  currentSlide: ShowcaseSlide;
  isDark: boolean;
  isIndonesian: boolean;
  chartGradientId: string;
  onNext: () => void;
  onPrev: () => void;
}

export function DynamicShowcaseCapsule({
  currentSlide,
  isDark,
  isIndonesian,
  chartGradientId,
  onNext,
  onPrev,
}: DynamicShowcaseCapsuleProps) {
  const [isInteracted, setIsInteracted] = useState(false);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      onDragEnd={(_, info) => {
        if (info.offset.x < -40) {
          triggerHaptic("light");
          onNext();
        } else if (info.offset.x > 40) {
          triggerHaptic("light");
          onPrev();
        }
      }}
      onClick={() => {
        triggerHaptic("light");
        setIsInteracted((prev) => !prev);
      }}
      className="relative w-full max-w-[340px] sm:max-w-[365px] min-h-[165px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      <AnimatePresence mode="wait">
        {/* SLIDE 0: MINIMALIST OPEN GLASS HORIZON & LIVE SPLINE */}
        {currentSlide.visual === "chart" && (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`w-full rounded-[26px] p-3.5 border flex flex-col gap-2.5 backdrop-blur-2xl transition-all duration-300 ${
              isDark
                ? "bg-[#121216]/75 border-white/[0.1] shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.18)]"
                : "bg-white/80 border-black/[0.07] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.06),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <TrendingUp
                    size={11}
                    strokeWidth={2}
                    className={isDark ? "text-white" : "text-zinc-900"}
                  />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Trajektori Arus Kas" : "Cashflow Trajectory"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "bg-black/[0.05] border-black/10 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                }`}
              >
                {isIndonesian ? "+28.4% Bersih" : "+28.4% Net Inflow"}
              </div>
            </div>

            <div className="relative h-18 w-full flex items-center justify-center overflow-hidden rounded-xl">
              <svg
                viewBox="0 0 320 80"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`${chartGradientId}-spline`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isDark ? "#ffffff" : "#000000"}
                      stopOpacity={isDark ? 0.22 : 0.12}
                    />
                    <stop
                      offset="100%"
                      stopColor={isDark ? "#ffffff" : "#000000"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 65 Q 40 45, 80 50 T 160 30 T 240 16 T 320 28 L 320 80 L 0 80 Z"
                  fill={`url(#${chartGradientId}-spline)`}
                />
                <path
                  d="M 0 65 Q 40 45, 80 50 T 160 30 T 240 16 T 320 28"
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.85)" : "rgba(18,18,22,0.85)"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle
                  cx="240"
                  cy="16"
                  r="4"
                  fill={isDark ? "#ffffff" : "#121216"}
                  className="animate-pulse"
                />
                <circle
                  cx="240"
                  cy="16"
                  r="8"
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div
              className={`flex items-center justify-between text-[9.5px] font-mono tracking-wider px-1 pt-0.5 border-t ${
                isDark ? "border-white/[0.06] text-white/40" : "border-black/[0.06] text-zinc-400"
              }`}
            >
              <span>{isIndonesian ? "Jan" : "Jan"}</span>
              <span>{isIndonesian ? "Apr" : "Apr"}</span>
              <span>{isIndonesian ? "Jul" : "Jul"}</span>
              <span>{isIndonesian ? "Okt" : "Oct"}</span>
              <span>{isIndonesian ? "Des" : "Dec"}</span>
            </div>
          </motion.div>
        )}

        {/* SLIDE 1: 3 STAGGERED CASCADING LIQUID GLASS PILLS */}
        {currentSlide.visual === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full flex flex-col gap-2.5 items-center justify-center py-1"
          >
            <motion.div
              animate={{
                x: isInteracted ? -16 : -10,
                y: isInteracted ? -2 : 0,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`w-[92%] rounded-full py-2 px-3.5 border flex items-center justify-between backdrop-blur-2xl shadow-md ${
                isDark
                  ? "bg-white/[0.07] border-white/14 shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] text-white"
                  : "bg-white/90 border-black/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Mic size={11} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold tracking-tight">
                  {isIndonesian ? "Dikte Suara" : "Voice Dictation"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {[10, 16, 22, 14, 20, 12].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isInteracted ? [h * 0.6, h * 1.3, h] : [h * 0.8, h, h * 0.9],
                    }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.6 + i * 0.1 }}
                    className={`w-0.5 rounded-full ${isDark ? "bg-white/70" : "bg-zinc-800"}`}
                    style={{ height: `${h}px` }}
                  />
                ))}
                <span
                  className={`text-[9.5px] font-mono ml-1.5 px-1.5 py-0.5 rounded-md ${
                    isDark ? "bg-white/10 text-white/80" : "bg-black/5 text-zinc-700"
                  }`}
                >
                  {isIndonesian ? '"Kopi 35rb"' : '"$4.50 Coffee"'}
                </span>
              </div>
            </motion.div>

            <motion.div
              animate={{
                x: isInteracted ? 18 : 12,
                scale: isInteracted ? 1.02 : 1,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.04 }}
              className={`w-[95%] rounded-full py-2.5 px-4 border flex items-center justify-between backdrop-blur-2xl shadow-xl z-10 ${
                isDark
                  ? "bg-[#18181e]/90 border-white/18 shadow-[0_12px_28px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] text-white"
                  : "bg-white border-black/[0.1] shadow-[0_12px_28px_rgba(0,0,0,0.08),inset_0_1.5px_2px_rgba(255,255,255,1)] text-zinc-950"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/12 border-white/20" : "bg-black/6 border-black/12"
                  }`}
                >
                  <ScanFace size={13} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[11.5px] font-bold tracking-tight leading-none">
                    {isIndonesian ? "Pindai Bukti Bayar" : "Receipt Camera Scan"}
                  </div>
                  <div
                    className={`text-[8.5px] mt-0.5 font-medium ${
                      isDark ? "text-white/50" : "text-zinc-500"
                    }`}
                  >
                    {isIndonesian ? "Ekstraksi OCR Otomatis" : "Instant OCR Engine"}
                  </div>
                </div>
              </div>

              <div
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/10 border-white/15 text-white"
                    : "bg-black/5 border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "< 1 Detik" : "< 1s Engine"}
              </div>
            </motion.div>

            <motion.div
              animate={{
                x: isInteracted ? -6 : -2,
                y: isInteracted ? 2 : 0,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.08 }}
              className={`w-[88%] rounded-full py-1.5 px-3.5 border flex items-center justify-between backdrop-blur-2xl shadow-md ${
                isDark
                  ? "bg-white/[0.05] border-white/10 shadow-[0_6px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] text-white/90"
                  : "bg-white/85 border-black/[0.06] shadow-[0_6px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] text-zinc-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/12" : "bg-black/4 border-black/8"
                  }`}
                >
                  <Sparkles size={10} strokeWidth={2} />
                </div>
                <span className="text-[10.5px] font-medium">
                  {isIndonesian ? "Preset Cepat 1-Ketuk" : "1-Tap Preset"}
                </span>
              </div>

              <span className="text-[11px] font-bold font-mono tracking-tight">
                {isIndonesian ? "Rp 50.000" : "$50.00"}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* SLIDE 2: CRYPTOGRAPHIC CRYSTALLINE PLATE WITH 3 DIES */}
        {currentSlide.visual === "vault" && (
          <motion.div
            key="vault"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`w-full rounded-[26px] p-3.5 border flex flex-col gap-2.5 backdrop-blur-2xl ${
              isDark
                ? "bg-[#121216]/80 border-white/[0.12] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                : "bg-white/90 border-black/[0.08] shadow-[0_14px_32px_-8px_rgba(0,0,0,0.07),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Shield size={11} strokeWidth={2} className={isDark ? "text-white" : "text-zinc-900"} />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Brankas Kriptografi Klien" : "Client Cryptographic Vault"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white"
                    : "bg-black/[0.05] border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "Terkunci" : "Sealed"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-0.5">
              <div
                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 ${
                  isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
                }`}
              >
                <Lock size={12} className={isDark ? "text-white/80" : "text-zinc-800"} />
                <span className="text-[10px] font-bold tracking-tight">AES-256</span>
                <span className={`text-[8.5px] leading-tight ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                  {isIndonesian ? "Klien GCM" : "Client GCM"}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 ${
                  isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
                }`}
              >
                <Check size={12} className={isDark ? "text-white/80" : "text-zinc-800"} />
                <span className="text-[10px] font-bold tracking-tight">Zero-Log</span>
                <span className={`text-[8.5px] leading-tight ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                  {isIndonesian ? "Privasi Nol" : "Zero Trace"}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 ${
                  isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
                }`}
              >
                <ScanFace size={12} className={isDark ? "text-white/80" : "text-zinc-800"} />
                <span className="text-[10px] font-bold tracking-tight">Enclave</span>
                <span className={`text-[8.5px] leading-tight ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                  {isIndonesian ? "Kunci Lokal" : "Device Key"}
                </span>
              </div>
            </div>

            <div
              className={`text-center py-1 rounded-xl text-[9px] font-medium border ${
                isDark ? "border-white/6 text-white/45" : "border-black/6 text-zinc-500"
              }`}
            >
              {isIndonesian
                ? "Kunci dekripsi tidak pernah meninggalkan memori perangkat"
                : "Decryption keys strictly confined to local device memory"}
            </div>
          </motion.div>
        )}

        {/* SLIDE 3: ASYMMETRIC SPLIT FLOATING SLABS */}
        {currentSlide.visual === "domain" && (
          <motion.div
            key="domain"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full flex flex-col gap-2 items-center"
          >
            <div className="w-full flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Layers size={11} strokeWidth={2} className={isDark ? "text-white" : "text-zinc-900"} />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Pemisahan Space" : "Space Isolation"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white"
                    : "bg-black/[0.05] border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "Partisi Tegas" : "Strict Partition"}
              </div>
            </div>

            <div className="w-full flex items-center justify-between gap-2.5 pt-0.5">
              <motion.div
                animate={{ y: isInteracted ? -4 : -1 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`flex-1 rounded-[22px] p-3 border flex flex-col justify-between backdrop-blur-2xl shadow-lg ${
                  isDark
                    ? "bg-[#141418]/85 border-white/12 shadow-[0_10px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "bg-white/90 border-black/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)]"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                      isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                    }`}
                  >
                    <User size={10} className={isDark ? "text-white/80" : "text-zinc-800"} />
                  </div>
                  <span className="text-[10.5px] font-semibold tracking-tight">
                    {isIndonesian ? "Pribadi" : "Personal"}
                  </span>
                </div>
                <div className="text-[13.5px] font-bold font-mono tracking-tight">
                  {isIndonesian ? "Rp 64,5 Jt" : "$4,250.00"}
                </div>
                <span
                  className={`text-[8.5px] mt-1 ${isDark ? "text-white/45" : "text-zinc-500"}`}
                >
                  {isIndonesian ? "Gaya hidup & keluarga" : "Household & Living"}
                </span>
              </motion.div>

              <motion.div
                animate={{ y: isInteracted ? 4 : 2 }}
                transition={{ type: "spring", stiffness: 350, damping: 25, delay: 0.04 }}
                className={`flex-1 rounded-[22px] p-3 border flex flex-col justify-between backdrop-blur-2xl shadow-lg ${
                  isDark
                    ? "bg-[#16161c]/90 border-white/15 shadow-[0_12px_26px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.22)]"
                    : "bg-white/95 border-black/[0.09] shadow-[0_10px_22px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,1)]"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                      isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                    }`}
                  >
                    <Activity size={10} className={isDark ? "text-white/80" : "text-zinc-800"} />
                  </div>
                  <span className="text-[10.5px] font-semibold tracking-tight">
                    {isIndonesian ? "Usaha" : "Venture"}
                  </span>
                </div>
                <div className="text-[13.5px] font-bold font-mono tracking-tight">
                  {isIndonesian ? "Rp 285 Jt" : "$18,920.00"}
                </div>
                <span
                  className={`text-[8.5px] mt-1 ${isDark ? "text-white/45" : "text-zinc-500"}`}
                >
                  {isIndonesian ? "Operasional & faktur" : "Operations & Invoices"}
                </span>
              </motion.div>
            </div>

            <div
              className={`w-full text-center py-1 rounded-xl text-[9px] font-medium border ${
                isDark ? "border-white/6 text-white/40" : "border-black/6 text-zinc-500"
              }`}
            >
              {isIndonesian
                ? "Batas isolasi mencegah kontaminasi saldo antar space"
                : "Strict firewall prevents cross-space contamination"}
            </div>
          </motion.div>
        )}

        {/* SLIDE 4: AEROSPACE RUNWAY DIAL & PROGRESS ARC */}
        {currentSlide.visual === "runway" && (
          <motion.div
            key="runway"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`w-full rounded-[26px] p-3.5 border flex flex-col gap-2.5 backdrop-blur-2xl ${
              isDark
                ? "bg-[#121216]/80 border-white/[0.12] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                : "bg-white/90 border-black/[0.08] shadow-[0_14px_32px_-8px_rgba(0,0,0,0.07),inset_0_1.5px_2px_rgba(255,255,255,0.95)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isDark ? "bg-white/10 border-white/15" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Sparkles size={11} strokeWidth={2} className={isDark ? "text-white" : "text-zinc-900"} />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight ${
                    isDark ? "text-white/80" : "text-zinc-800"
                  }`}
                >
                  {isIndonesian ? "Ketahanan Finansial" : "Runway Telemetry"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                  isDark
                    ? "bg-white/[0.08] border-white/15 text-white"
                    : "bg-black/[0.05] border-black/10 text-zinc-900"
                }`}
              >
                {isIndonesian ? "Aman" : "Safe Zone"}
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                isDark ? "bg-white/[0.04] border-white/10" : "bg-black/[0.03] border-black/8"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[22px] font-bold tracking-tight">8.4</span>
                  <span
                    className={`text-[11px] font-medium ${isDark ? "text-white/60" : "text-zinc-600"}`}
                  >
                    {isIndonesian ? "bulan cadangan" : "months runway"}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono ${isDark ? "text-white/45" : "text-zinc-500"}`}
                >
                  {isIndonesian ? "Target: 6 Bln" : "Target: 6 Mo"}
                </span>
              </div>

              <div
                className={`h-2 w-full rounded-full overflow-hidden p-0.5 border ${
                  isDark ? "bg-black/40 border-white/10" : "bg-zinc-200 border-black/10"
                }`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "70%" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isDark ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "bg-zinc-950"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div
                className={`flex-1 text-center py-1 rounded-xl text-[9px] font-semibold border ${
                  isDark
                    ? "bg-white/[0.04] border-white/8 text-white/60"
                    : "bg-black/[0.03] border-black/6 text-zinc-600"
                }`}
              >
                {isIndonesian ? "Pengeluaran: Aman" : "Burn Rate: Stable"}
              </div>
              <div
                className={`flex-1 text-center py-1 rounded-xl text-[9px] font-semibold border ${
                  isDark
                    ? "bg-white/[0.04] border-white/8 text-white/60"
                    : "bg-black/[0.03] border-black/6 text-zinc-600"
                }`}
              >
                {isIndonesian ? "Dana Darurat: 140%" : "Emergency Reserve: 140%"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
